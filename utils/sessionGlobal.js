
const interval = require('interval-promise');
const MysqlPool = require('../db');
let axios = require('axios');

let matchDetails=[];

async function getMatchDetails() {
	let query='SELECT market_id as id,match_id, name FROM markets where is_active="1" and name="Match Odds" ';
	let marketList = await MysqlPool.query(query);
	//console.log("dkkkkkkkkkkkk  ",marketList);
	matchDetails=JSON.parse(JSON.stringify(marketList));
	interval(async () => {
		let query='SELECT market_id as id,match_id, name FROM markets where is_active="1" and name="Match Odds" ';
		let marketList = await MysqlPool.query(query);
		//console.log("dkkkkkkkkkkkk  ",marketList);
		matchDetails=JSON.parse(JSON.stringify(marketList));
	}, 1000*1000);
}

async function sessionGlobal() {
	await  getMatchDetails();
	interval(async () => {
		if (matchDetails && matchDetails.length>0){
			let arr=[];
			for (let index = 0; index < matchDetails.length; index++) {
				let element = matchDetails[index].id;
				arr.push(axios.get('http://178.79.178.166:8086/daimondApiLive?marketid='+element));
			}
			let result = await axios.all(arr);
			// let marketIdData = result.map(function (elem,index) {
			// 	return  {session:elem.data.session,marketId:matchDetails[index].id,match_id:matchDetails[index].match_id};
			// });
			//console.log("marketIdData  ",JSON.stringify(marketIdData));
			let marketIdData ={};
			for (let i = 0; i < result.length; i++) {
				let elem=result[i];
				let session=elem.data.session;
				let marketId=matchDetails[i].id;
				let match_id=matchDetails[i].match_id;

				marketIdData['session_'+match_id]=session,marketId,match_id


			}
			global._sessionData=marketIdData;
			//console.log("marketddd =========>>>>> ");

		}
	}, 5000*1000);
}

module.exports = sessionGlobal;