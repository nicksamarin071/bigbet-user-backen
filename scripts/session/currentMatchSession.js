let axios = require('axios');
axios.defaults.timeout = 4000;
const interval = require('interval-promise');
let i = 0;
let errorInAPI = false;
const redis = require('redis');
const client = redis.createClient(6379, '127.0.0.1');
let arrayOfMarketId=[];

let getMatchListFromBetdip = async () => {
	let cricketMatch = 'http://localhost:3003/api/v1/getMarketSession';
	try {
		console.log('getMatchListFromBetdip  try');
		let response = await axios.get(cricketMatch);
		if (response.status > 200) {
			client.get('CURRENT_SESSION_MARKETID', function (err, value) {
				arrayOfMarketId=JSON.parse(value);
				if (i==0 || i >= 4) {
					i=0;
					errorInAPI=true;
					start();
				}
			});
		} else {
			errorInAPI=false;
			arrayOfMarketId=response.data.data;
			if (response.data.length>0) {
				await client.set('CURRENT_SESSION_MARKETID', JSON.stringify(response.data.data));
			}
			return response.data.data;
		}
	} catch (error) {
		client.get('CURRENT_SESSION_MARKETID', function (err, value) {
			arrayOfMarketId=JSON.parse(value);
			if (i==0 || i >= 9) {
				i=0;
				errorInAPI=true;
				start();
			}
		});
	}
};
let getMathActiveMatchData = async (responseDataList) => {
                
	for (let index = 0; index < responseDataList.length; index++) {
		let responseData = responseDataList[index];
		console.log("responseData  ",responseData);
		
		if (responseData && responseData.marketId) {
			let marketId=responseData.marketId;
			let match_id=responseData.match_id;
			let sessionData=responseData.session;
			// let dataToWriteOnRedis={
			// 	market_id:responseData.marketId,
			// 	value:{
			// 		session:responseData.session
			// 	}
			// };
			if (sessionData) {
				for (let i = 0; i < sessionData.length; i++) {
					const session = sessionData[i];
                    console.log("session  ",session);
					let key=match_id+'_'+session.SelectionId;
					await client.set(key, JSON.stringify(session));
				}
			}
			// if (dataToWriteOnRedis) {
			// 	console.log('Data write : ',marketId);
			// 	await client.set(match_id +'_s', JSON.stringify(dataToWriteOnRedis));
			// }   
		}
	}
};
(async () => {
	await getMatchListFromBetdip();
	await start();
	

	try {
		interval(async () => {
            
			if (i >= 9) {
				i = 0;
				if (errorInAPI===true) {
					await getMatchListFromBetdip();
				}else{
					await getMatchListFromBetdip();
					await start();
				}
                
			}
		}, 1000);
	}
	catch (error) {
		//console.log(error);
	}
})();
async function start() {
	try {

		if (arrayOfMarketId.length > 0) {
			interval(async (iteration, stop) => {
				//console.log('Gettting latest matchid  ', i);
				i++;
				if (i >= 10) {
					console.log('Stooooooooooooooooooooop');
					stop();
				}
				if (arrayOfMarketId) {
					try {
						let arr=[];  
						for (let index = 0; index < arrayOfMarketId.length; index++) {
							let element = arrayOfMarketId[index].id;
							arr.push(axios.get('http://178.79.178.166:8086/daimondApiLive?marketid='+element));
						}
						let result = await axios.all(arr);

						let marketIdData = result.map(function (elem,index) {
							return  {...elem.data,marketId:arrayOfMarketId[index].id,match_id:arrayOfMarketId[index].match_id};
						});
						await getMathActiveMatchData(marketIdData);
					} catch (error) {
						console.log(error);
					}
				}
			}, 1000);
		}
	} catch (error) {
		console.log(error);
	}
}