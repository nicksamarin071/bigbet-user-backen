
const interval = require('interval-promise');
const MysqlPool = require('../db');
let axios = require('axios');

let matchDetails=[];

async function getMatchDetails() {
	let query='SELECT market_id as id,match_id, name FROM markets where is_active="1"  ';
	let marketList = await MysqlPool.query(query);
	//console.log("dkkkkkkkkkkkk  ",marketList);
	matchDetails=JSON.parse(JSON.stringify(marketList));
	interval(async () => {
		let query='SELECT market_id as id,match_id, name FROM markets where is_active="1"';
		let marketList = await MysqlPool.query(query);

		matchDetails=JSON.parse(JSON.stringify(marketList));
		//console.log("dkkkkkkkkkkkk  ",matchDetails);
	}, 1000);
}

async function oddsGlobal() {
	await  getMatchDetails();
	interval(async () => {
		if (matchDetails && matchDetails.length>0){
			let commaSeperatedId=matchDetails.map(function(elem){
				return elem.id;
			}).join(",");

		}
	}, 5000);
}

module.exports = oddsGlobal;