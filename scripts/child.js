let axios = require('axios');
const interval = require('interval-promise');
const redis = require('redis');
const client = redis.createClient(6379, '127.0.0.1');
let i=0;

const getCricketDataOdds = async (marketid) => {
	try {
		//console.log('marketidmarketid  ',marketid);
		
		const urlcricket = 'http://178.79.178.166/api/?marketid=' + marketid + '&apikey=ieyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6InNoYWt0aXNoYXJtYSIsImlhd';
		const response = await axios.get(urlcricket);
		const data = response.data;
		//console.log('response.dataresponse.data ',response.data);
		
		return data;

	} catch (error) {
		//console.log(error);
	}
};

async function getAllMarketDataAndSendToServer(marketIdList, marketIdDataFromAPI) {
	//  //console.log(activeMatchId + " Enter into getAllMarketDataAndSendToServer   ");
	try {
		if (marketIdDataFromAPI.length > 0) {
			for (let i = 0; i < marketIdDataFromAPI.length; i++) {
				let marketIdDataDetails = marketIdDataFromAPI[i];
				let marketId = marketIdDataDetails.marketId;
				await client.set('ODDS_'+marketId, JSON.stringify(marketIdDataDetails));
				//console.log('Writeing data........');
				
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
	//console.log('message==============>>>',message.arrayOfMarketId);
	if (message.arrayOfMarketId) {
		interval(async () => {
			i++;
			if (i >= 10) {
				//process.kill(process.pid, 'SIGHUP');
				//console.log("Stooooooooooooooooooooop");
				//stop()
                    
			}
			//console.log('message',message.arrayOfMarketId);
			let listOfMarketIdCommaSeperated = message.arrayOfMarketId.map(function (elem) {
				return elem.id;
			}).join(',');

			let marketIdDataFromAPI = await getCricketDataOdds(listOfMarketIdCommaSeperated);
			await getAllMarketDataAndSendToServer(message.arrayOfMarketId,marketIdDataFromAPI);
			process.send({ data: listOfMarketIdCommaSeperated,index:message.index });
		}, 1000);
	}
});
