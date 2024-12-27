let axios = require('axios');
const interval = require('interval-promise');
const redis = require('redis');
const client = redis.createClient(6379, '127.0.0.1');
let i=0;

const getCricketDataOdds = async (marketid) => {
	try {
		const urlcricket = 'http://178.79.178.166/api/?marketid=' + marketid + '&apikey=ieyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6InNoYWt0aXNoYXJtYSIsImlhd';
		const response = await axios.get(urlcricket);
		const data = response.data;
		return data;

	} catch (error) {
		//console.log(error);
	}
};

async function getAllMarketDataAndSendToServer(marketIdList, marketIdDataFromAPI) {
	try {
		if (marketIdDataFromAPI.length > 0) {
			for (let i = 0; i < marketIdDataFromAPI.length; i++) {

				const marketIdDataDetails = marketIdDataFromAPI[i];
				////console.log("i  ===== ", i);
				//console.log(" marketIdDataDetails.marketId   ::: ", marketIdDataDetails.marketId);
				let runnersAll = marketIdDataDetails.runners;

				let mid = marketIdDataDetails.marketId;
				let marketIdFromJsonObjNameAndID = marketIdList.filter(
					(obj) => {
						return obj.id === mid;
					}
				);

				let btype = marketIdDataDetails.btype;
				var index = mid.indexOf('-');
				if (index != -1)
					mid = mid.split('-')[0];

				console.log(mid +'  '+marketIdDataDetails.status+'  '+marketIdDataDetails.isMarketDataDelayed);

				if (marketIdDataDetails.status === 'CLOSED' || marketIdDataDetails.isMarketDataDelayed === true) {
					client.keys(mid + '_*',async function (err, keys) {
						if (err) return console.log(err);
						for(let ll = 0, len = keys.length; ll < len; ll++) {
							console.log('Keys ::: ',keys[ll]);
							await client.del(keys[ll]);
						}
					});
					await client.del(mid);

				} else {
					//   console.log("333333333333333333333333333");
					let arrayOfRunner = [];
					if (runnersAll.length > 0) {
						for (let j = 0; j < runnersAll.length; j++) {
							if (runnersAll[j].selectionId) {
								let lastPriceTraded = runnersAll[j].lastPriceTraded;
								let selectionId = runnersAll[j].selectionId;
								let handicap = runnersAll[j].handicap;
								let status = runnersAll[j].status;
								let objecterunnerback = runnersAll[j].ex.availableToBack.length > 0 ? runnersAll[j].ex.availableToBack : [];
								let objecterunnerlay = runnersAll[j].ex.availableToLay.length > 0 ? runnersAll[j].ex.availableToLay : [];
								let objectOfBackAndLay = {
									'lastPriceTraded': lastPriceTraded,
									'selectionId': selectionId,
									'id': selectionId,
									'handicap': handicap,
									'status': status,
									'back': objecterunnerback,
									'lay': objecterunnerlay
								};
								arrayOfRunner.push(objectOfBackAndLay);
							}
						}
					}

					let sendDataToRedisReslt = {
						version: marketIdDataDetails.version,
						marketId: marketIdDataDetails.marketId,
						id: marketIdDataDetails.marketId,
						marketName: marketIdFromJsonObjNameAndID[0] &&  marketIdFromJsonObjNameAndID[0].name?marketIdFromJsonObjNameAndID[0].name:'',
						btype: 'ODDS',
						name:  marketIdFromJsonObjNameAndID[0] && marketIdFromJsonObjNameAndID[0].name?marketIdFromJsonObjNameAndID[0].name:'',
						mtype: 'MATCH_ODDS',
						eventTypeId: 4,
						totalMatched: marketIdDataDetails.totalMatched,
						numberOfWinners: marketIdDataDetails.numberOfWinners,
						inplay: marketIdDataDetails.inplay,
						inPlay: marketIdDataDetails.inplay,
						lastMatchTime: marketIdDataDetails.lastMatchTime,
						betDelay: marketIdDataDetails.betDelay,
						isMarketDataDelayed: marketIdDataDetails.isMarketDataDelayed,
						complete: marketIdDataDetails.complete,
						bspReconciled: marketIdDataDetails.bspReconciled,
						numberOfActiveRunners: marketIdDataDetails.numberOfActiveRunners,
						status: marketIdDataDetails.status,
						ggstatus: marketIdDataDetails.status,
						numberOfRunners: marketIdDataDetails.numberOfRunners.status,
						runners: arrayOfRunner
					};
					try {
						console.log('now write server');

						await client.set(mid, JSON.stringify(sendDataToRedisReslt));
					} catch (error) {
						console.log(error);

					}

					var runners = '';
					var selectionId = '';
					var backdata = '';
					var laydata = '';
					try {
						if (arrayOfRunner.length > 0) {
							for (let j = 0; j < arrayOfRunner.length; j++) {
								runners = arrayOfRunner[j];
								selectionId = runners.selectionId;
								if (runners.back.length > 0) {
									backdata = runners.back[0];
									var backdataprice = (backdata.price) ? backdata.price : 0;
									var backdatasize = (backdata.size) ? backdata.size : 0;
									await client.set(mid + '_' + selectionId + '_back', (backdataprice + ',' + backdatasize+ ',' + marketIdDataDetails.status));
								}
								if (runners.lay.length > 0) {
									laydata = runners.lay[0];
									var laydataprice = (laydata.price) ? laydata.price : 0;
									var laydatasize = (laydata.size) ? laydata.size : 0;
									//  console.log("selectionId  ", selectionId);
									await client.set(mid + '_' + selectionId + '_lay', (laydataprice + ',' + laydatasize+ ',' + marketIdDataDetails.status));
								}
							}
						}

					} catch (error) {
						console.log(error);

					}


				}
			}
		}

	} catch (error) {
		//console.log('====================================');
		//console.log(error);
		//console.log('====================================');
	}
}
// receive message from master process
process.on('message', async (message) => {
	if (message.arrayOfMarketId) {
		interval(async (iteration, stop) => {
			i++;
			if (i >= 10) {
				//process.kill(process.pid, 'SIGHUP');
				//console.log("Stooooooooooooooooooooop");
				//stop()

			}
			//console.log(message.arrayOfMarketId);
			let listOfMarketIdCommaSeperated = message.arrayOfMarketId.map(function (elem) {
				return elem.id;
			}).join(',');

			let marketIdDataFromAPI = await getCricketDataOdds(listOfMarketIdCommaSeperated);
			await getAllMarketDataAndSendToServer(message.arrayOfMarketId,marketIdDataFromAPI);
			process.send({ data: listOfMarketIdCommaSeperated,index:message.index });
		}, 1000);
	}
});
