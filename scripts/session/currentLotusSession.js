let axios = require('axios');
axios.defaults.timeout = 4000;
const interval = require('interval-promise');
let i = 0;
let errorInAPI = false;
const redis = require('redis');
const client = redis.createClient(6379, '127.0.0.1');
let arrayOfMatchId=[];

let getMatchListFromBetdip = async () => {
	let cricketMatch = 'http://139.162.242.237:3011/api/v1/allActiveCricketMatchCricketCurrent';
	try {
		//console.log('getMatchListFromBetdip  try');
		let response = await axios.get(cricketMatch);
		if (response.status > 200) {
			client.get('CURRENT_SESSION_MATCH', function (err, value) {
				arrayOfMatchId=JSON.parse(value);
				if (i==0 || i >= 4) {
					i=0;
					errorInAPI=true;
					start();
				}
			});
		} else {
			errorInAPI=false;
			arrayOfMatchId=response.data;
			if (response.data.length>0) {
				await client.set('CURRENT_SESSION_MATCH', JSON.stringify(response.data));
			}
			return response.data;
		}
	} catch (error) {
		client.get('CURRENT_SESSION_MATCH', function (err, value) {
			arrayOfMatchId=JSON.parse(value);
			if (i==0 || i >= 9) {
				i=0;
				errorInAPI=true;
				start();
			}
		});
		//console.log('Error getMatchListFromBetdip to get makrket id ',arrayOfMatchId);
	}
    
};
let getMathActiveMatchData = async (responseMatchList) => {
	let  mid = '';
	let arr = [];
	for (let i = 1;  i <responseMatchList.length; i++){
		let obj = new Object();
		let market =responseMatchList[i]  ;
		if(i==1)             
			mid = market.id;
		let status = market.statusLabel;
		let  btype = market.btype ;
		let index  = mid.indexOf('-') ;
		if(index!= -1)
			mid = mid.split('-')[0];
		let  mtype = market.mtype ;
		if(mtype){
			if(btype == 'ODDS' && mtype == 'TIED_MATCH' && 1 ==2){
				client.set(mid, market, redis.print);
				continue;

			}}
		if(btype=='LINE'){
			if(market.runners.length > 0){
				let runners = market.runners[0];
				let SelectionId = runners.id;
				let RunnerName = runners.name;
 
				let BackPrice1 = (runners.back.length > 0 ? runners.back[0].line : 0);
				let  BackSize1  =  (runners.back.length > 0 ? runners.back[0].price : 0);
				let LayPrice1 =  (runners.lay.length > 0  ? runners.lay[0].line : 0);
				let  LaySize1  = ( runners.lay.length > 0 ? runners.lay[0].price : 0);


				let keyback = mid+'_s'+SelectionId+'_back' ;
				let backvlaue =BackPrice1 + ',' +BackSize1;
				client.set(keyback, backvlaue, redis.print);

				let keylay = mid+'_s'+SelectionId+'_lay' ;
				let layvlaue =LayPrice1 + ',' +LaySize1;
				client.set(keylay, layvlaue, redis.print);


				obj.SelectionId= SelectionId.toString();
				obj.RunnerName= RunnerName;
				obj.BackPrice1= BackPrice1;
				obj.BackSize1= BackSize1;
				obj.LayPrice1= LayPrice1;
				obj.LaySize1= LaySize1;
				obj.GameStatus = status;
				arr.push(obj);
			}
		}
	}
	let session={
		'session':arr
	};
	let mainobj = {market_id : mid,value : session};
	client.set(mid +'_s', JSON.stringify(mainobj));
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
       
		if (arrayOfMatchId.length > 0) {
			interval(async (iteration, stop) => {
				//console.log('Gettting latest matchid  ', i);
				i++;
				if (i >= 10) {
					//console.log('Stooooooooooooooooooooop');
					stop();
				}

				if (arrayOfMatchId) {

					try {
                        
						for (let matchindex = 0; matchindex < arrayOfMatchId.length; matchindex++) {
							const matchId = arrayOfMatchId[matchindex];
							let matchData=await axios.get('http://178.79.178.166:8086/fancyApiLiveNitin?eventid='+matchId);
							//console.log(matchData.data);
							if (matchData && matchData.data && matchData.data.result && matchData.data.result.length>0) {
								//console.log("matchData.data.result  ",matchData.data.result.length);
								await getMathActiveMatchData(matchData.data.result);
							}
						}
					} catch (error) {
						//console.log(error);
					}
				}
			}, 1000);
		}
	} catch (error) {
		//console.log(error);

	}
}