let axios = require('axios');
axios.defaults.timeout = 4000;
const interval = require('interval-promise');
//let i = 0;
const redis = require('redis');
const client = redis.createClient(6379, '127.0.0.1');
let arrayOfMarketId=[];
let getMatchListFromBetdip = async () => {
	let cricketMatch = 'http://139.162.242.237:3011/api/v1/getallprematchmarket';
	try {
		//console.log('getMatchListFromBetdip  try;;;;;;');
		let response = await axios.get(cricketMatch);
		if (response.status > 200) {
			//
		} else {
			//console.log(response.data);
			arrayOfMarketId=response.data;
			return response.data;
		}
	} catch (error) {
		//console.log('Error getMatchListFromBetdip to get makrket id ', error);
	}
    
};
let getMathActiveMatchData = async (responseDataList) => {
                
	for (let index = 0; index < responseDataList.length; index++) {
		let responseData = responseDataList[index];
		if (responseData && responseData.marketId) {
			let marketId=responseData.marketId;
			let sessionData=responseData.session;
			let dataToWriteOnRedis={
				market_id:responseData.marketId,
				value:{
					session:responseData.session
				}
			};
			if (sessionData) {
				for (let i = 0; i < sessionData.length; i++) {
					const session = sessionData[i];
                    
					let LayPrice1    = session.LayPrice1?session.LayPrice1:'0';
					let  LaySize1    = session.LaySize1?session.LaySize1:'0';
					let BackPrice1   = session.BackPrice1?session.BackPrice1:'0';
					let  BackSize1   = session.BackSize1?session.BackSize1:'0';
					let  SelectionId   = session.SelectionId?session.SelectionId:'0';
					//let  RunnerName   = session.RunnerName?session.RunnerName:'';

					let keyback = marketId+'_s'+SelectionId+'_back' ;
					let backvlaue =BackPrice1 + ',' +BackSize1;
					if (BackPrice1==='0') {
						await client.del(keyback);
					}else{
						await client.set(keyback, backvlaue);
					}

					let keylay = marketId+'_s'+SelectionId+'_lay' ;
					let layvlaue =LayPrice1 + ',' +LaySize1;
					if (LayPrice1==='0') {
						await client.del(keylay);
					} else {
						await client.set(keylay, layvlaue);
					}
                    
				}
			}
			if (dataToWriteOnRedis) {
				//console.log('Data write : ',marketId);
				await client.set(marketId +'_s', JSON.stringify(dataToWriteOnRedis));
			}   
		}
	}
};
(async () => {
	await getMatchListFromBetdip();
	//await start()
	try {
		interval(async () => {
			await getMatchListFromBetdip();
		}, 10000);// after 5 sec
	}
	catch (error) {
		//console.log(error);
	}

	try {
		interval(async () => {
            
			if (arrayOfMarketId) {
				try {
					let arr=[];  
					for (let index = 0; index < arrayOfMarketId.length; index++) {
						let element = arrayOfMarketId[index];
						//console.log('element  ',element);
						arr.push(axios.get('http://178.79.178.166:8086/daimondApiLive?marketid='+element));
					}
					let result = await axios.all(arr);

					let marketIdData = result.map(function (elem,index) {
						//console.log('index  ',index);
                        
						return  {...elem.data,marketId:arrayOfMarketId[index]};
					});
					await getMathActiveMatchData(marketIdData);
				} catch (error) {
					//console.log(error);
				}
			}
		}, 50000);
	}
	catch (error) {
		//console.log(error);
	}
})();
