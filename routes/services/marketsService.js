const settings = require('../../config/settings');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');
const userModel = require('../../routes/model/userModel');
const exchangeService = require('./exchangeService');
const selectionService = require('./selectionService');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
let resultdb = globalFunction.resultdb;
const { poolPromise, sql } = require('../../db');
const { kebabCase } = require('lodash');
const SALT_WORK_FACTOR = 10;
let makeFavouriteMarket = async (data) => {
	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('id', sql.VarChar(50), data.id)
			.input('market_id', sql.VarChar(50), data.market_id)
			.input('match_id', sql.VarChar(50), data.match_id)
			.query('select * from favourites where  user_id = @id and market_id =@market_id and match_id =@match_id   ');
		//console.log(data.ip_address);
		if (result.recordsets[0].length <= 0 && data.isFav === true) { //Insert recored
			let currentdate = Math.floor(Date.now() / 1000);

			await pool.request()
				.input('id', sql.VarChar(50), data.id)
				.input('market_id', sql.VarChar(50), data.market_id)
				.input('match_id', sql.VarChar(50), data.match_id)
				.input('ipaddress', sql.VarChar(50), data.ip_address)
				.input('currentdate', sql.VarChar(50), currentdate)
				.query("insert into favourites (user_id, market_id, match_id,created_by,created_at,created_ip,updated_by,updated_at) values(@id,@market_id,@match_id,@id,@currentdate,@ipaddress,@id,@currentdate)");

			// 	let resLast = await pool.request()
			// 	.query("SELECT  IDENT_CURRENT('favourites')");
			// console.log('avinash---',resLast.recordsets[0]);
			return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);
		} else if (result.recordsets[0].length > 0 && data.isFav === true) { //Already
			return resultdb(CONSTANTS.ALREADY_EXISTS, CONSTANTS.DATA_NULL);
		} else if (result.recordsets[0].length > 0 && data.isFav === false) { //Delete record
			const result = await pool.request()
				.input('id', sql.VarChar(50), data.id)
				.input('market_id', sql.VarChar(50), data.market_id)
				.input('match_id', sql.VarChar(50), data.match_id)
				.query('DELETE FROM favourites WHERE  user_id = @id and market_id =@market_id  and match_id =@match_id  ');
			return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);
		} else if (result.recordsets[0].length <= 0 && data.isFav === false) { //Not available
			return resultdb(CONSTANTS.ALREADY_DELETED, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SERVER_ERROR, result.recordsets[0][0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

function randomString(length, chars) {
	var result = '';
	for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
	return result;
}
function decryptBackLayValue(decryptValue) {
	let randomNumber = randomString(32, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
	//let buff = new Buffer(decryptValue);// Buffer.alloc(decryptValue);
	decryptValue = Number(decryptValue).toFixed(2);
	let buff = new Buffer(decryptValue);
	let text = buff.toString('base64');
	let fristText = text.substring(0, 1);
	let secondText = text.substring(1, text.length);
	text = (fristText + '' + randomNumber + '' + secondText);

	return text;
}


function base64Decode(mainUserId) {

	let fristUserId = mainUserId.substring(0, 1);
	let secondUserId = mainUserId.substring(33, mainUserId.length);
	let data = fristUserId + secondUserId;
	let buff = new Buffer(data, 'base64');
	//let buff = Buffer.alloc(data, 'base64');		
	return buff.toString('ascii');

}
let getMatchDetailMarketList = async (data) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.Int, data.match_id)
			.input('sport_id', sql.Int, data.sport_id)
			.query("SELECT (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore,mkts.isbetalowaftermatchodds, spt.name as SportName,ISNULL(fav.match_id ,0) as favMatchID,ISNULL(CASE WHEN (disable.user_id IS NOT NULL OR disable.user_id !=0) THEN 'BET SUSPENDED' ELSE mkts.market_admin_message END,'') as adminMessage,mkts.market_type,(CASE WHEN mkts.min_stack > 0 THEN mkts.min_stack ELSE usptset.min_match_stack END) AS marketMinStack,(CASE WHEN mkts.max_stack > 0  THEN mkts.max_stack ELSE usptset.max_match_stack END) AS marketMaxStack,(CASE WHEN mkts.max_market_profit >0 THEN mkts.max_market_profit ELSE usptset.max_profit END) AS marketMaxProfit, (CASE WHEN mkts.min_loss > 0 THEN mkts.min_loss ELSE usptset.max_loss END) AS marketMaxLoss,(CASE WHEN mkts.max_market_liability > 0 THEN mkts.max_market_liability ELSE usptset.max_exposure END) AS marketMaxExposure,(CASE WHEN mkts.min_liability > usptset.min_exposure THEN mkts.min_liability ELSE usptset.min_exposure END) AS marketMinExposure,(CASE WHEN (select count(*) from markets where match_id=mtch.match_id AND status='Y' AND is_result_declared='N' AND ( name='Book Maker') AND (result_id IS NULL OR result_id=0)) > 0 THEN 'OPEN' ELSE 'CLOSE' END) AS InplayStatus, ISNULL(mtch.maintv,'') AS MainTV,'' AS PlayTv1,'' AS PlayTv2,'' AS PlayTv3,'' AS PlayTv4,'' AS graphics,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, (CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,(CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) AS  backRateDiff, (CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) as layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json,mkts.tv_id, ser.name as seriesName FROM matches as mtch with(nolock) JOIN sports spt with(nolock) ON spt.sport_id=mtch.sport_id  JOIN markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name='Match Odds' AND mkts.status='Y' INNER JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = spt.sport_id AND usptset.user_id=@user_id LEFT JOIN favourites as fav with(nolock) ON fav.match_id=mtch.match_id AND fav.market_id= mkts.market_id AND fav.user_id=@user_id LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id and dspt.user_id= @user_id LEFT JOIN user_deactive_matches as udmtch with(nolock) ON udmtch.match_id= mtch.match_id AND  udmtch.match_id=@match_id and udmtch.user_id=@user_id LEFT JOIN disable_match_markets as disable with(nolock) ON disable.market_id= mkts.market_id AND disable.user_id=@user_id LEFT JOIN series as ser with(nolock) ON ser.series_id= mtch.series_id where spt.sport_id =@sport_id AND ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND ( udmtch.match_id  IS NULL OR udmtch.match_id=0) AND mtch.match_id=@match_id  AND mtch.status='Y' AND mkts.is_result_declared='N' AND mkts.winner_name IS NULL AND spt.status='Y' AND mtch.is_completed='N'")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let matchMarkets = result.recordset;

			let marketID = result.recordset.map((data) => (data.market_id));
			let match_id = result.recordset.map((data) => (data.match_id));


			let backRateDiff = result.recordset[0].backRateDiff;//result.recordset.map((data)=>(data.backRateDiff));	
			let layRateDiff = result.recordset[0].layRateDiff; //result.recordset.map((data)=>(data.layRateDiff));		
			let matchVolumn = result.recordset[0].matchVolumn > 0 ? result.recordset[0].matchVolumn : 1; //result.recordset.map((data)=>(data.matchVolumn));	

			result.recordset[0].bxyz = await decryptBackLayValue(backRateDiff);
			result.recordset[0].lxyz = await decryptBackLayValue(layRateDiff);
			result.recordset[0].vxyz = await decryptBackLayValue(matchVolumn);


			let oddsData = await exchangeService.getOddsByMarketIds(marketID);
			let matchTV = await exchangeService.getmatchTV(match_id);
			result.recordset[0].MainTV = matchTV.data;

			let MarketSelection = await exchangeService.getMarketSelection(match_id, marketID, data.id);
			try {
				let MarketSelectionDb = []
				if (MarketSelection.data[0] != null) {
					MarketSelectionDb = MarketSelection.data;
				}
				if (oddsData.data[marketID] != null) {
					oddsData.data[marketID].runners.map(function (dbdata, i) {
						if (dbdata != null) {
							let indexOfFancyData = '';
							if (MarketSelectionDb != null) {
								indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
							} else {
								indexOfFancyData = -1;
							}
							dbdata.ex.availableToBack.map(function (BackPriceSize) {
								BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
								BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});
							dbdata.ex.availableToLay.map(function (LayPriceSize) {
								LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
								LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});

							if (indexOfFancyData === -1) {
								dbdata.WinAndLoss = 0;
							} else {
								dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
								dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
								dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
							}
						}
					});
				} else {
					if (matchMarkets[0].runner_json != null) {
						let runner_json2 = JSON.parse(matchMarkets[0].runner_json);
						runner_json2.map(function (dbdata, i) {
							if (dbdata != null) {

								dbdata.ex.availableToBack.map(function (BackPriceSize) {
									BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
									BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});
								dbdata.ex.availableToLay.map(function (LayPriceSize) {
									LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
									LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});

								let indexOfFancyData = '';
								if (MarketSelectionDb != null) {
									indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
								} else {
									indexOfFancyData = -1;
								}

								if (indexOfFancyData === -1) {
									dbdata.WinAndLoss = 0;
								} else {
									dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
									dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
									dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
								}
							}
						});
						matchMarkets[0].runner_json = JSON.stringify(runner_json2);
					}
				}

			}
			catch (e) {
				console.log(e);
				return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
			}
			let newdata = matchMarkets.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE', PlayTv1: matchTV.data, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + (settings.GET_GRAPHICS_MATCH_MARKET == 'MARKET' ? data.market_id : data.match_id) } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, PlayTv1: settings.GET_MATCH_TV1_URL, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + (settings.GET_GRAPHICS_MATCH_MARKET == 'MARKET' ? data.market_id : data.match_id) }
			));
			if (newdata === null || newdata.length == 0) {
				return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);

			} else {
				return resultdb(CONSTANTS.SUCCESS, newdata[0]);
			}

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};

let getMatchDetailMarketListNew = async (data) => {
	try {
		const pool = await poolPromise;
		let inplayDate = Math.floor(Date.now() / 1000);
		let sportId = data.sport_id;
		const result = await pool.request()
			//.input('input_parameter', sql.VarChar(50),inplayDate)
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.Int, data.match_id)
			.input('sport_id', sql.Int, data.sport_id)
			.query("SELECT (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore,mkts.isbetalowaftermatchodds, spt.name as SportName,ISNULL(fav.match_id ,0) as favMatchID,ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET SUSPENDED' ELSE mkts.market_admin_message END,'') as adminMessage,(CASE WHEN mkts.min_stack > usptset.min_match_stack THEN mkts.min_stack ELSE usptset.min_match_stack END) AS marketMinStack,(CASE WHEN mkts.max_stack > usptset.max_match_stack THEN mkts.max_stack ELSE usptset.max_match_stack END) AS marketMaxStack,(CASE WHEN usptset.max_profit > mkts.max_market_profit THEN mkts.max_market_profit ELSE usptset.max_profit END) AS marketMaxProfit, (CASE WHEN mkts.min_loss > usptset.max_loss THEN mkts.min_loss ELSE usptset.max_loss END) AS marketMaxLoss,(CASE WHEN mkts.max_market_liability < usptset.max_exposure THEN mkts.max_market_liability ELSE usptset.max_exposure END) AS marketMaxExposure,(CASE WHEN mkts.min_liability > usptset.min_exposure THEN mkts.min_liability ELSE usptset.min_exposure END) AS marketMinExposure,'' AS InplayStatus, ISNULL(mtch.maintv,'') AS MainTV,'' AS PlayTv1,'' AS PlayTv2,'' AS PlayTv3,'' AS PlayTv4,'' AS graphics,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, (CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END )  as SportminOddsLimt, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV, (CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) as backRateDiff, (CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) as layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id  JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name='Match Odds' AND mkts.status='Y' INNER JOIN user_setting_sport_wise as usptset ON usptset.sport_id = spt.sport_id AND usptset.user_id=@user_id LEFT JOIN favourites as fav ON fav.match_id=mtch.match_id AND fav.market_id= mkts.market_id AND fav.user_id=@user_id where NOT EXISTS (SELECT 1  from user_deactive_matches WHERE user_deactive_matches.match_id = mtch.match_id AND user_deactive_matches.user_id = @user_id) AND NOT EXISTS (SELECT 1 from deactive_sports WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id = @user_id) AND spt.sport_id =@sport_id  AND mtch.match_id=@match_id  AND mtch.status='Y' AND mkts.is_result_declared='N' AND mkts.winner_name IS NULL AND spt.status='Y' AND mtch.is_completed='N'")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let matchMarkets = result.recordset;

			let marketID = result.recordset.map((data) => (data.market_id));
			let match_id = result.recordset.map((data) => (data.match_id));

			let backRateDiff = result.recordset[0].backRateDiff;//result.recordset.map((data)=>(data.backRateDiff));	
			let layRateDiff = result.recordset[0].layRateDiff; //result.recordset.map((data)=>(data.layRateDiff));		
			let matchVolumn = result.recordset[0].matchVolumn > 0 ? result.recordset[0].matchVolumn : 1; //result.recordset.map((data)=>(data.matchVolumn));		
			let oddsData = await exchangeService.getOddsByMarketIds(marketID);
			let MarketSelection = await exchangeService.getMarketSelection(match_id, marketID, data.id);
			try {
				let MarketSelectionDb = []
				if (MarketSelection.data[0] != null) {
					MarketSelectionDb = MarketSelection.data;
				}
				if (oddsData.data[marketID] != null) {
					oddsData.data[marketID].runners.map(function (dbdata, i) {
						if (dbdata != null) {
							let indexOfFancyData = '';
							if (MarketSelectionDb != null) {
								indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
							} else {
								indexOfFancyData = -1;
							}
							dbdata.ex.availableToBack.map(function (BackPriceSize) {
								BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
								BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});
							dbdata.ex.availableToLay.map(function (LayPriceSize) {
								LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
								LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});

							if (indexOfFancyData === -1) {
								dbdata.WinAndLoss = 0;
							} else {
								dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
								dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
								dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
							}
						}
					});
				} else {
					if (matchMarkets[0].runner_json != null) {
						let runner_json2 = JSON.parse(matchMarkets[0].runner_json);
						runner_json2.map(function (dbdata, i) {
							if (dbdata != null) {

								dbdata.ex.availableToBack.map(function (BackPriceSize) {
									BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
									BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});
								dbdata.ex.availableToLay.map(function (LayPriceSize) {
									LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
									LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});

								let indexOfFancyData = '';
								if (MarketSelectionDb != null) {
									indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
								} else {
									indexOfFancyData = -1;
								}

								if (indexOfFancyData === -1) {
									dbdata.WinAndLoss = 0;
								} else {
									dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
									dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
									dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
								}
							}
						});
						matchMarkets[0].runner_json = JSON.stringify(runner_json2);
					}
				}

			}
			catch (e) {
				console.log(e);
				return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
			}
			let newdata = matchMarkets.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE', PlayTv1: settings.GET_MATCH_TV1_URL, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + (settings.GET_GRAPHICS_MATCH_MARKET == 'MARKET' ? data.market_id : data.match_id) } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, InplayStatus: 'CLOSE', PlayTv1: settings.GET_MATCH_TV1_URL, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + (settings.GET_GRAPHICS_MATCH_MARKET == 'MARKET' ? data.market_id : data.match_id) }
			));
			if (newdata === null || newdata.length == 0) {
				return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);

			} else {
				return resultdb(CONSTANTS.SUCCESS, newdata[0]);
			}

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};


let getMatchBookmakerMarket = async (data) => {
	try {
		const pool = await poolPromise;

		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.Int, data.match_id)
			.input('sport_id', sql.Int, data.sport_id)
			.query("SELECT (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore,mkts.isbetalowaftermatchodds,mkts.market_type, spt.name as SportName,ISNULL(CASE WHEN (disable.user_id IS NOT NULL OR disable.user_id !=0) THEN 'BET SUSPENDED' ELSE mkts.market_admin_message END,'') as adminMessage, (CASE WHEN mkts.min_stack > 0  THEN mkts.min_stack ELSE usptset.min_match_stack END) AS marketMinStack,(CASE WHEN mkts.max_stack > 0 THEN mkts.max_stack ELSE usptset.max_match_stack END) AS marketMaxStack,(CASE WHEN  mkts.max_market_profit > 0 THEN mkts.max_market_profit ELSE usptset.max_profit END) AS marketMaxProfit, (CASE WHEN mkts.min_loss > 0 THEN mkts.min_loss ELSE usptset.max_loss END) AS marketMaxLoss,(CASE WHEN mkts.max_market_liability > 0 THEN mkts.max_market_liability ELSE usptset.max_exposure END) AS marketMaxExposure,(CASE WHEN mkts.min_liability > 0 THEN mkts.min_liability ELSE usptset.min_exposure END) AS marketMinExposure,'' AS InplayStatus,'' AS MainTV,'' AS PlayTv1,'' AS PlayTv2,'' AS PlayTv3,'' AS PlayTv4,'' AS graphics,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, (CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,(CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) AS  backRateDiff,(CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) AS  layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch with(nolock) JOIN sports spt with(nolock) ON spt.sport_id=mtch.sport_id  JOIN markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name ='Book Maker'  AND mkts.status='Y' INNER JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = spt.sport_id AND usptset.user_id=@user_id  LEFT JOIN disable_match_markets as disable with(nolock) ON disable.market_id= mkts.market_id AND disable.user_id=@user_id  where mtch.match_id=@match_id  AND mtch.status='Y' AND mkts.is_result_declared='N' AND mkts.winner_name IS NULL AND spt.status='Y' AND mtch.is_completed='N' ORDER BY mkts.market_runner_count ASC")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let matchMarkets = result.recordset;
			//let MarketSelections=Array();
			//let oddRunneer = Array();
			let marketID = result.recordset.map((data) => (data.market_id));
			let market_type = result.recordset.map((data) => (data.market_type));

			let match_id = result.recordset.map((data) => (data.match_id));
			let backRateDiff = result.recordset[0].backRateDiff;//result.recordset.map((data)=>(data.backRateDiff));	
			let layRateDiff = result.recordset[0].layRateDiff; //result.recordset.map((data)=>(data.layRateDiff));		
			let matchVolumn = result.recordset[0].matchVolumn > 0 ? result.recordset[0].matchVolumn : 1; //result.recordset.map((data)=>(data.matchVolumn));	

			result.recordset[0].bxyz = await decryptBackLayValue(backRateDiff);
			result.recordset[0].lxyz = await decryptBackLayValue(layRateDiff);
			result.recordset[0].vxyz = await decryptBackLayValue(matchVolumn);

			let oddsData = await exchangeService.getOddsByMarketIds(marketID, market_type);
			let MarketSelection = await exchangeService.getMarketSelection(match_id, marketID, data.id);


			//let oddsData = await exchangeService.getOddsByMarketIds(marketID);
			//console.log(oddsData);

			try {
				let MarketSelectionDb = []
				if (MarketSelection.data[0] != null) {
					MarketSelectionDb = MarketSelection.data;
				}
				if (oddsData.data[marketID] != null) {
					oddsData.data[marketID].runners.map(function (dbdata, i) {
						if (dbdata != null) {
							let indexOfFancyData = '';
							if (MarketSelectionDb != null) {
								indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
							} else {
								indexOfFancyData = -1;
							}
							dbdata.ex.availableToBack.map(function (BackPriceSize) {
								BackPriceSize.price = (parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
								BackPriceSize.size = (parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});
							dbdata.ex.availableToLay.map(function (LayPriceSize) {
								LayPriceSize.price = (parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
								LayPriceSize.size = (parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});

							if (indexOfFancyData === -1) {
								dbdata.WinAndLoss = 0;
							} else {
								dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
								dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
								dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
							}
						}
					});
				} else {
					if (matchMarkets[0].runner_json != null) {
						let runner_json2 = JSON.parse(matchMarkets[0].runner_json);
						runner_json2.map(function (dbdata, i) {
							if (dbdata != null) {

								dbdata.ex.availableToBack.map(function (BackPriceSize) {
									BackPriceSize.price = (parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
									BackPriceSize.size = (parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});
								dbdata.ex.availableToLay.map(function (LayPriceSize) {
									LayPriceSize.price = (parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
									LayPriceSize.size = (parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});

								let indexOfFancyData = '';
								if (MarketSelectionDb != null) {
									indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
								} else {
									indexOfFancyData = -1;
								}

								if (indexOfFancyData === -1) {
									dbdata.WinAndLoss = 0;
								} else {
									dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
									dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
									dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
								}
							}
						});
						matchMarkets[0].runner_json = JSON.stringify(runner_json2);
					}
				}
			}
			catch (e) {
				console.log(e);
				return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
			}

			let newdata = matchMarkets.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE' } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: 'CLOSE' }
			));

			return resultdb(CONSTANTS.SUCCESS, newdata[0]);

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getMatchBookmakerOthers = async (data) => {
	try {
		const pool = await poolPromise;

		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.Int, data.match_id)
			.input('sport_id', sql.Int, data.sport_id)
			.query("SELECT (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore,mkts.isbetalowaftermatchodds,mkts.market_type, spt.name as SportName,ISNULL(CASE WHEN (disable.user_id IS NOT NULL OR disable.user_id !=0) THEN 'BET SUSPENDED' ELSE mkts.market_admin_message END,'') as adminMessage, (CASE WHEN mkts.min_stack > 0  THEN mkts.min_stack ELSE usptset.min_match_stack END) AS marketMinStack,(CASE WHEN mkts.max_stack > 0 THEN mkts.max_stack ELSE usptset.max_match_stack END) AS marketMaxStack,(CASE WHEN  mkts.max_market_profit > 0 THEN mkts.max_market_profit ELSE usptset.max_profit END) AS marketMaxProfit, (CASE WHEN mkts.min_loss > 0 THEN mkts.min_loss ELSE usptset.max_loss END) AS marketMaxLoss,(CASE WHEN mkts.max_market_liability > 0 THEN mkts.max_market_liability ELSE usptset.max_exposure END) AS marketMaxExposure,(CASE WHEN mkts.min_liability > 0 THEN mkts.min_liability ELSE usptset.min_exposure END) AS marketMinExposure,'' AS InplayStatus,'' AS MainTV,'' AS PlayTv1,'' AS PlayTv2,'' AS PlayTv3,'' AS PlayTv4,'' AS graphics,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, (CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,(CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) AS  backRateDiff,(CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) AS  layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch with(nolock) JOIN sports spt with(nolock) ON spt.sport_id=mtch.sport_id  JOIN markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name ='Book Maker 2'  AND mkts.status='Y' INNER JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = spt.sport_id AND usptset.user_id=@user_id  LEFT JOIN disable_match_markets as disable with(nolock) ON disable.market_id= mkts.market_id AND disable.user_id=@user_id  where mtch.match_id=@match_id  AND mtch.status='Y' AND mkts.is_result_declared='N' AND mkts.winner_name IS NULL AND spt.status='Y' AND mtch.is_completed='N' ORDER BY mkts.market_runner_count ASC")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let matchMarkets = result.recordset;
			//let MarketSelections=Array();
			//let oddRunneer = Array();
			let marketID = result.recordset.map((data) => (data.market_id));
			let market_type = result.recordset.map((data) => (data.market_type));

			let match_id = result.recordset.map((data) => (data.match_id));
			let backRateDiff = result.recordset[0].backRateDiff;//result.recordset.map((data)=>(data.backRateDiff));	
			let layRateDiff = result.recordset[0].layRateDiff; //result.recordset.map((data)=>(data.layRateDiff));		
			let matchVolumn = result.recordset[0].matchVolumn > 0 ? result.recordset[0].matchVolumn : 1; //result.recordset.map((data)=>(data.matchVolumn));	
			let SearchArray = [];
			result.recordset[0].bxyz = await decryptBackLayValue(backRateDiff);
			result.recordset[0].lxyz = await decryptBackLayValue(layRateDiff);
			result.recordset[0].vxyz = await decryptBackLayValue(matchVolumn);

			let oddsData = await exchangeService.getOddsByMarketIds(marketID, market_type);
			let MarketSelection = await exchangeService.getMarketSelection(match_id, marketID, data.id);

			try {
				let MarketSelectionDb = []
				if (MarketSelection.data[0] != null) {
					MarketSelectionDb = MarketSelection.data;
				}
				if (oddsData.data[marketID] != null) {
					oddsData.data[marketID].runners.map(function (dbdata, i) {
						if (dbdata != null) {
							if (dbdata.ex.availableToBack.length == 0) {
								dbdata.ex.availableToBack.push({ 'price': 0, 'size': 0 });
								dbdata.ex.availableToBack.push({ 'price': 0, 'size': 0 });
								dbdata.ex.availableToBack.push({ 'price': 0, 'size': 0 });
							}
							SearchArray.push({ [dbdata.selectionId]: dbdata.ex.availableToBack[0].price });

							let indexOfFancyData = '';
							if (MarketSelectionDb != null) {
								indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
							} else {
								indexOfFancyData = -1;
							}
							//console.log(JSON.stringify(dbdata.ex.availableToBack));
							dbdata.ex.availableToBack.map(function (BackPriceSize) {
								BackPriceSize.price = (parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
								BackPriceSize.size = (parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});
							dbdata.ex.availableToLay.map(function (LayPriceSize) {
								LayPriceSize.price = (parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
								LayPriceSize.size = (parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});
							//console.log(JSON.stringify(dbdata.ex.availableToBack));

							if (indexOfFancyData === -1) {
								dbdata.WinAndLoss = 0;
							} else {
								dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
								dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
								dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
							}
						}
					});
					console.log(market_type);
					if (market_type != 'M' && market_type != 'BM') {
						let favouritSelection = SearchArray.reduce(function (res, obj) {
							var keysp = Object.keys(res);
							var keysv = Object.keys(obj);
							return (res[keysp] < obj[keysv]) ? res : obj;
						});

						favouritSelection = Object.keys(favouritSelection)[0];

						oddsData.data[marketID].runners.map(function (dbdata, i) {

							if (dbdata != null) {
								if (favouritSelection != dbdata.selectionId) {
									dbdata.GameStatus = "SUSPENDED";
									dbdata.ex = CONSTANTS.BACK_LAY_BLANK_ARRAY;

								} else {
									dbdata.GameStatus = "";
								}
							}
						});
					}

				} else {
					if (matchMarkets[0].runner_json != null) {
						let runner_json2 = JSON.parse(matchMarkets[0].runner_json);
						runner_json2.map(function (dbdata, i) {
							if (dbdata != null) {

								dbdata.ex.availableToBack.map(function (BackPriceSize) {
									BackPriceSize.price = (parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
									BackPriceSize.size = (parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});
								dbdata.ex.availableToLay.map(function (LayPriceSize) {
									LayPriceSize.price = (parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
									LayPriceSize.size = (parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});

								let indexOfFancyData = '';
								if (MarketSelectionDb != null) {
									indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
								} else {
									indexOfFancyData = -1;
								}

								if (indexOfFancyData === -1) {
									dbdata.WinAndLoss = 0;
								} else {
									dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
									dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
									dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
								}
							}
						});
						matchMarkets[0].runner_json = JSON.stringify(runner_json2);
					}
				}
			}
			catch (e) {
				console.log(e);
				return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
			}

			let newdata = matchMarkets.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE' } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: 'CLOSE' }
			));

			return resultdb(CONSTANTS.SUCCESS, newdata[0]);

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};



let getMatchWithoutMatchOddsMarketList = async (data) => {
	try {

		const pool = await poolPromise;

		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.Int, data.match_id)
			.input('sport_id', sql.Int, data.sport_id)
			.query("SELECT (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore,mkts.isbetalowaftermatchodds,mkts.market_type, spt.name as SportName,ISNULL(CASE WHEN (disable.user_id IS NOT NULL OR disable.user_id !=0) THEN 'BET SUSPENDED' ELSE mkts.market_admin_message END,'') as adminMessage,(CASE WHEN mkts.min_stack > 0  THEN mkts.min_stack ELSE usptset.min_match_stack  END) AS marketMinStack,(CASE WHEN mkts.max_stack > 0  THEN mkts.max_stack ELSE usptset.max_match_stack END) AS marketMaxStack,(CASE WHEN mkts.max_market_profit > 0 THEN mkts.max_market_profit ELSE usptset.max_profit END) AS marketMaxProfit, (CASE WHEN mkts.min_loss > 0 THEN mkts.min_loss ELSE usptset.max_loss END) AS marketMaxLoss,(CASE WHEN mkts.max_market_liability > 0 THEN mkts.max_market_liability ELSE usptset.max_exposure END) AS marketMaxExposure,(CASE WHEN mkts.min_liability >0 THEN mkts.min_liability ELSE usptset.min_exposure END) AS marketMinExposure,'' AS InplayStatus,'' AS MainTV,'' AS PlayTv1,'' AS PlayTv2,'' AS PlayTv3,'' AS PlayTv4,'' AS graphics,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, (CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,(CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END)  as backRateDiff, (CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) as layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch with(nolock) JOIN sports spt with(nolock) ON spt.sport_id=mtch.sport_id  JOIN markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name !='Match Odds' AND mkts.name !='Book Maker' AND mkts.name !='Book Maker 2' AND mkts.status='Y' INNER JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = spt.sport_id AND usptset.user_id=@user_id LEFT JOIN disable_match_markets as disable with(nolock) ON disable.market_id= mkts.market_id AND disable.user_id=@user_id   where mtch.match_id=@match_id  AND mtch.status='Y' AND mkts.is_result_declared='N' AND mkts.winner_name IS NULL AND spt.status='Y' AND mtch.is_completed='N' ORDER BY mkts.market_runner_count ASC")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let matchMarkets = result.recordset;
			//let MarketSelections=Array();
			//let oddRunneer = Array();
			let marketID = result.recordset.map((data) => (data.market_id));
			let market_type = result.recordset.map((data) => (data.market_type));

			let oddsData = await exchangeService.getOddsByMarketIds(marketID, market_type);

			for (let i in matchMarkets) {

				let matchMarketsDetails = matchMarkets[i];

				let backRateDiff = matchMarketsDetails.backRateDiff;//result.recordset.map((data)=>(data.backRateDiff));	
				let layRateDiff = matchMarketsDetails.layRateDiff; //result.recordset.map((data)=>(data.layRateDiff));		
				let matchVolumn = matchMarketsDetails.matchVolumn > 0 ? matchMarketsDetails.matchVolumn : 1;
				if (settings.TOSS_MARKET_SUPENDED_PARTICULAR_USER_YES_NO == 'YES' && settings.TOSS_MARKET_SUPENDED_PARTICULAR_USER_ID.includes(data.id) && matchMarketsDetails.marketName == "To Win the Toss") {
					matchMarkets[i].adminMessage = "SUSPENDED";
				}

				matchMarkets[i].bxyz = await decryptBackLayValue(backRateDiff);
				matchMarkets[i].lxyz = await decryptBackLayValue(layRateDiff);
				matchMarkets[i].vxyz = await decryptBackLayValue(matchVolumn);


				let MarketSelection = await exchangeService.getMarketSelection(matchMarketsDetails.match_id, matchMarketsDetails.market_id, data.id);

				//let MarketSelection = await exchangeService.getMarketSelection(matchMarketsDetails.match_id, matchMarketsDetails.market_id, data.id);
				try {
					let MarketSelectionDb = []
					if (MarketSelection.data[0] != null) {
						MarketSelectionDb = MarketSelection.data;
					}
					if (oddsData.data[matchMarketsDetails.market_id] != null) {
						oddsData.data[matchMarketsDetails.market_id].runners.map(function (dbdata, i) {
							if (dbdata != null) {
								let indexOfFancyData = '';
								if (MarketSelectionDb != null) {
									indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
								} else {
									indexOfFancyData = -1;
								}
								//console.log('dbdata.ex.availableToBack',dbdata.ex.availableToBack);
								dbdata.ex.availableToBack.map(function (BackPriceSize) {
									BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
									BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));
									//console.log('avinash---------------- BackPriceSize.price --------------- ',BackPriceSize.price);

								});
								dbdata.ex.availableToLay.map(function (LayPriceSize) {
									LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
									LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});

								if (indexOfFancyData === -1) {
									dbdata.WinAndLoss = 0;
								} else {
									dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
									dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
									dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
								}
							}
						});
					} else {
						//if (matchMarkets[0].runner_json != null) {
						if (matchMarketsDetails.runner_json && matchMarketsDetails.runner_json !== null) {
							let runner_json2 = JSON.parse(matchMarkets[i].runner_json);
							runner_json2.map(function (dbdata, i) {
								if (dbdata != null) {

									dbdata.ex.availableToBack.map(function (BackPriceSize) {
										BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
										BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

									});
									dbdata.ex.availableToLay.map(function (LayPriceSize) {
										LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
										LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

									});

									let indexOfFancyData = '';
									if (MarketSelectionDb != null) {
										indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
									} else {
										indexOfFancyData = -1;
									}

									if (indexOfFancyData === -1) {
										dbdata.WinAndLoss = 0;
									} else {
										dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
										dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
										dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
									}
								}
							});
							matchMarkets[i].runner_json = JSON.stringify(runner_json2);
						}
					}

					/* if (oddsData.data[matchMarketsDetails.market_id] !== undefined && MarketSelection.data.length > 0) {
						for (let j in MarketSelection.data) {
							if (MarketSelection.data[j].selection_id == oddsData.data[matchMarketsDetails.market_id].runners[j].selectionId) {
								oddsData.data[matchMarketsDetails.market_id].runners[j]['selectionName'] = MarketSelection.data[j].SelectionName;
								oddsData.data[matchMarketsDetails.market_id].runners[j]['sort_priority'] = MarketSelection.data[j].sort_priority;
								oddsData.data[matchMarketsDetails.market_id].runners[j]['WinAndLoss'] = MarketSelection.data[j].win_loss_value;
							} else {
								oddsData.data[matchMarketsDetails.market_id].runners[j]['selectionName'] = "";
								oddsData.data[matchMarketsDetails.market_id].runners[j]['sort_priority'] = "";
								oddsData.data[matchMarketsDetails.market_id].runners[j]['WinAndLoss'] = 0;
							}
						}
					} else {

						if (matchMarketsDetails.runner_json && matchMarketsDetails.runner_json !== null) {
							let runner_json2 = JSON.parse(matchMarkets[i].runner_json);
							for (let j in MarketSelection.data) {
								if (MarketSelection.data[j].selection_id == runner_json2[j].selectionId) {
									runner_json2[j]['selectionName'] = MarketSelection.data[j].SelectionName;
									runner_json2[j]['sort_priority'] = MarketSelection.data[j].sort_priority;
									runner_json2[j]['WinAndLoss'] = MarketSelection.data[j].win_loss_value;
								} else {
									runner_json2[j]['selectionName'] = "";
									runner_json2[j]['sort_priority'] = "";
									runner_json2[j]['WinAndLoss'] = 0;
								}
							}
							matchMarkets[i].runner_json = JSON.stringify(runner_json2);
						}

					} */
				}
				catch (e) {
					console.log(e);
					return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
				}
			}
			let newdata = matchMarkets.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE' } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: 'CLOSE' }
			));

			return resultdb(CONSTANTS.SUCCESS, newdata);

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getCupsMatchDetails = async (data) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.Int, data.match_id)
			.input('sport_id', sql.Int, data.sport_id)
			.query("SELECT TOP 1 spt.name as SportName,ISNULL(CASE WHEN (disable.user_id IS NOT NULL OR disable.user_id !=0) AND mkts.market_admin_message IS NULL THEN 'BET SUSPENDED' ELSE mkts.market_admin_message END,'') as adminMessage,(CASE WHEN mkts.min_stack > usptset.min_match_stack THEN mkts.min_stack ELSE usptset.min_match_stack END) AS marketMinStack,(CASE WHEN mkts.max_stack > usptset.max_match_stack THEN mkts.max_stack ELSE usptset.max_match_stack END) AS marketMaxStack,(CASE WHEN usptset.max_profit > mkts.max_market_profit THEN mkts.max_market_profit ELSE usptset.max_profit END) AS marketMaxProfit, (CASE WHEN mkts.min_loss > usptset.max_loss THEN mkts.min_loss ELSE usptset.max_loss END) AS marketMaxLoss,(CASE WHEN mkts.max_market_liability < usptset.max_exposure THEN mkts.max_market_liability ELSE usptset.max_exposure END) AS marketMaxExposure,(CASE WHEN mkts.min_liability > usptset.min_exposure THEN mkts.min_liability ELSE usptset.min_exposure END) AS marketMinExposure,'' AS InplayStatus, ISNULL(mtch.maintv,'') AS MainTV,'' AS PlayTv1,'' AS PlayTv2,'' AS PlayTv3,'' AS PlayTv4,'' as graphics,(CASE  WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore, 0 as favMatchID, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,(CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV, (CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) as backRateDiff,(CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) as layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch with(nolock) JOIN sports spt with(nolock) ON spt.sport_id=mtch.sport_id  JOIN markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id INNER JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = spt.sport_id AND usptset.user_id=@user_id  LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id AND  dspt.sport_id=@sport_id and dspt.user_id = @user_id LEFT JOIN user_deactive_matches as udmtch with(nolock) ON udmtch.match_id= mtch.match_id AND  udmtch.match_id=@match_id and udmtch.user_id = @user_id LEFT JOIN disable_match_markets as disable with(nolock) ON disable.market_id= mkts.market_id AND disable.user_id=@user_id  where ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND ( udmtch.match_id  IS NULL OR udmtch.match_id=0) AND spt.status='Y' AND spt.sport_id=@sport_id AND mtch.match_id=@match_id  AND mtch.status='Y' AND mkts.is_result_declared='N' AND mkts.winner_name IS NULL AND mtch.is_completed='N'")

		if (result.request === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let matchMarkets = result.recordset;
			let marketID = result.recordset.map((data) => (data.market_id));
			let match_id = result.recordset.map((data) => (data.match_id));

			let backRateDiff = result.recordset[0].backRateDiff;//result.recordset.map((data)=>(data.backRateDiff));	
			let layRateDiff = result.recordset[0].layRateDiff; //result.recordset.map((data)=>(data.layRateDiff));		
			let matchVolumn = result.recordset[0].matchVolumn > 0 ? result.recordset[0].matchVolumn : 1; //result.recordset.map((data)=>(data.matchVolumn));	

			result.recordset[0].bxyz = await decryptBackLayValue(backRateDiff);
			result.recordset[0].lxyz = await decryptBackLayValue(layRateDiff);
			result.recordset[0].vxyz = await decryptBackLayValue(matchVolumn);

			let oddsData = await exchangeService.getOddsByMarketIds(marketID);
			let MarketSelection = await exchangeService.getMarketSelection(match_id, marketID, data.id);
			try {
				let MarketSelectionDb = []
				if (MarketSelection.data[0] != null) {
					MarketSelectionDb = MarketSelection.data;
				}
				if (oddsData.data[marketID] != null) {
					oddsData.data[marketID].runners.map(function (dbdata, i) {
						if (dbdata != null) {
							let indexOfFancyData = '';
							if (MarketSelectionDb != null) {
								indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
							} else {
								indexOfFancyData = -1;
							}
							dbdata.ex.availableToBack.map(function (BackPriceSize) {
								BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
								BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});
							dbdata.ex.availableToLay.map(function (LayPriceSize) {
								LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
								LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});

							if (indexOfFancyData === -1) {
								dbdata.WinAndLoss = 0;
							} else {
								dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
								dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
								dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
							}
						}
					});
				} else {
					if (matchMarkets[0].runner_json != null) {
						let runner_json2 = JSON.parse(matchMarkets[0].runner_json);
						runner_json2.map(function (dbdata, i) {
							if (dbdata != null) {

								dbdata.ex.availableToBack.map(function (BackPriceSize) {
									BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
									BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});
								dbdata.ex.availableToLay.map(function (LayPriceSize) {
									LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
									LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});

								let indexOfFancyData = '';
								if (MarketSelectionDb != null) {
									indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
								} else {
									indexOfFancyData = -1;
								}

								if (indexOfFancyData === -1) {
									dbdata.WinAndLoss = 0;
								} else {
									dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
									dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
									dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
								}
							}
						});
						matchMarkets[0].runner_json = JSON.stringify(runner_json2);
					}
				}

			}
			catch (e) {
				console.log(e);
				return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
			}

			let newdata = matchMarkets.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE', PlayTv1: settings.GET_MATCH_TV1_URL, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + (settings.GET_GRAPHICS_MATCH_MARKET == 'MARKET' ? data.market_id : data.match_id) } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: 'CLOSE', PlayTv1: settings.GET_MATCH_TV1_URL, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + (settings.GET_GRAPHICS_MATCH_MARKET == 'MARKET' ? data.market_id : data.match_id) }
			));

			return resultdb(CONSTANTS.SUCCESS, newdata[0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};

let getHorseRacingMatchDetails = async (data) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.BigInt, data.match_id)
			.input('sport_id', sql.Int, data.sport_id)
			.input('market_id', sql.VarChar(150), data.market_id)
			.query("SELECT (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore, spt.name as SportName,ISNULL(fav.match_id ,0) as favMatchID,ISNULL(CASE WHEN (disable.user_id IS NOT NULL OR disable.user_id !=0) AND mkts.market_admin_message IS NULL THEN 'BET SUSPENDED' ELSE mkts.market_admin_message END,'') as adminMessage,(CASE WHEN mkts.min_stack > usptset.min_match_stack THEN mkts.min_stack ELSE usptset.min_match_stack END) AS marketMinStack,(CASE WHEN mkts.max_stack > usptset.max_match_stack THEN mkts.max_stack ELSE usptset.max_match_stack END) AS marketMaxStack,(CASE WHEN usptset.max_profit > mkts.max_market_profit THEN mkts.max_market_profit ELSE usptset.max_profit END) AS marketMaxProfit, (CASE WHEN mkts.min_loss > usptset.max_loss THEN mkts.min_loss ELSE usptset.max_loss END) AS marketMaxLoss,(CASE WHEN mkts.max_market_liability < usptset.max_exposure THEN mkts.max_market_liability ELSE usptset.max_exposure END) AS marketMaxExposure,(CASE WHEN mkts.min_liability > usptset.min_exposure THEN mkts.min_liability ELSE usptset.min_exposure END) AS marketMinExposure,'' AS InplayStatus, ISNULL(mtch.maintv,'') AS MainTV,'' AS PlayTv1,'' AS PlayTv2,'' AS PlayTv3,'' AS PlayTv4,'' AS graphics,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, (CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,(CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) AS  backRateDiff,(CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) AS  layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch  with(nolock) JOIN sports spt  with(nolock) ON spt.sport_id=mtch.sport_id  JOIN markets mkts  with(nolock) ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.market_id=@market_id AND mkts.status='Y' INNER JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = spt.sport_id AND usptset.user_id=@user_id LEFT JOIN favourites as fav  with(nolock) ON fav.match_id=mtch.match_id AND fav.market_id= mkts.market_id AND fav.user_id=@user_id LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id AND  dspt.sport_id=@sport_id and dspt.user_id = @user_id LEFT JOIN user_deactive_matches as udmtch with(nolock) ON udmtch.match_id= mtch.match_id AND  udmtch.match_id=@match_id and udmtch.user_id = @user_id LEFT JOIN disable_match_markets as disable with(nolock) ON disable.market_id= mkts.market_id AND disable.user_id=@user_id where ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND ( udmtch.match_id  IS NULL OR udmtch.match_id=0) AND spt.sport_id =@sport_id  AND mtch.match_id=@match_id  AND mtch.status='Y' AND mkts.is_result_declared='N' AND mkts.winner_name IS NULL AND spt.status='Y' AND mtch.is_completed='N'")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {

			let matchMarkets = result.recordset;
			let marketID = result.recordset.map((data) => (data.market_id));
			let match_id = result.recordset.map((data) => (data.match_id));

			let backRateDiff = result.recordset[0].backRateDiff;//result.recordset.map((data)=>(data.backRateDiff));	
			let layRateDiff = result.recordset[0].layRateDiff; //result.recordset.map((data)=>(data.layRateDiff));		
			let matchVolumn = result.recordset[0].matchVolumn > 0 ? result.recordset[0].matchVolumn : 1; //result.recordset.map((data)=>(data.matchVolumn));	

			result.recordset[0].bxyz = await decryptBackLayValue(backRateDiff);
			result.recordset[0].lxyz = await decryptBackLayValue(layRateDiff);
			result.recordset[0].vxyz = await decryptBackLayValue(matchVolumn);

			let oddsData = await exchangeService.getOddsByMarketIds(marketID);
			let MarketSelection = await exchangeService.getMarketSelection(match_id, marketID, data.id);
			try {
				let MarketSelectionDb = []
				if (MarketSelection.data[0] != null) {
					MarketSelectionDb = MarketSelection.data;
				}
				if (oddsData.data[marketID] != null) {
					oddsData.data[marketID].runners.map(function (dbdata, i) {
						if (dbdata != null) {
							let indexOfFancyData = '';
							if (MarketSelectionDb != null) {
								indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
							} else {
								indexOfFancyData = -1;
							}
							dbdata.ex.availableToBack.map(function (BackPriceSize) {
								BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
								BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});
							dbdata.ex.availableToLay.map(function (LayPriceSize) {
								LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
								LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});

							if (indexOfFancyData === -1) {
								dbdata.WinAndLoss = 0;
							} else {
								dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
								dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
								dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
							}
						}
					});
				} else {
					if (matchMarkets[0].runner_json != null) {
						let runner_json2 = JSON.parse(matchMarkets[0].runner_json);
						runner_json2.map(function (dbdata, i) {
							if (dbdata != null) {

								dbdata.ex.availableToBack.map(function (BackPriceSize) {
									BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
									BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});
								dbdata.ex.availableToLay.map(function (LayPriceSize) {
									LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
									LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});

								let indexOfFancyData = '';
								if (MarketSelectionDb != null) {
									indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
								} else {
									indexOfFancyData = -1;
								}

								if (indexOfFancyData === -1) {
									dbdata.WinAndLoss = 0;
								} else {
									dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
									dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
									dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
								}
							}
						});
						matchMarkets[0].runner_json = JSON.stringify(runner_json2);
					}
				}

			}
			catch (e) {
				console.log(e);
				return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
			}


			let newdata = matchMarkets.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE', PlayTv1: settings.GET_MATCH_TV1_URL, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + (settings.GET_GRAPHICS_MATCH_MARKET == 'MARKET' ? data.market_id : data.match_id) } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: 'CLOSE', PlayTv1: settings.GET_MATCH_TV1_URL, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + (settings.GET_GRAPHICS_MATCH_MARKET == 'MARKET' ? data.market_id : data.match_id) }
			));

			return resultdb(CONSTANTS.SUCCESS, newdata[0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};




let getHorseRacingMatchDetailsOtherMarket = async (data) => {
	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.BigInt, data.match_id)
			.input('sport_id', sql.Int, data.sport_id)
			.input('market_id', sql.VarChar(150), data.market_id)
			.query("SELECT (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore, spt.name as SportName,ISNULL(fav.match_id ,0) as favMatchID,ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET SUSPENDED' ELSE mkts.market_admin_message END,'') as adminMessage,(CASE WHEN mkts.min_stack > usptset.min_match_stack THEN mkts.min_stack ELSE usptset.min_match_stack END) AS marketMinStack,(CASE WHEN mkts.max_stack > usptset.max_match_stack THEN mkts.max_stack ELSE usptset.max_match_stack END) AS marketMaxStack,(CASE WHEN usptset.max_profit > mkts.max_market_profit THEN mkts.max_market_profit ELSE usptset.max_profit END) AS marketMaxProfit, (CASE WHEN mkts.min_loss > usptset.max_loss THEN mkts.min_loss ELSE usptset.max_loss END) AS marketMaxLoss,(CASE WHEN mkts.max_market_liability < usptset.max_exposure THEN mkts.max_market_liability ELSE usptset.max_exposure END) AS marketMaxExposure,(CASE WHEN mkts.min_liability > usptset.min_exposure THEN mkts.min_liability ELSE usptset.min_exposure END) AS marketMinExposure,'' AS InplayStatus, ISNULL(mtch.maintv,'') AS MainTV,'' AS PlayTv1,'' AS PlayTv2,'' AS PlayTv3,'' AS PlayTv4,'' AS graphics,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,(CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END )  as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,(CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) AS  backRateDiff,(CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) AS  layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id  JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.market_id !=@market_id AND mkts.status='Y' INNER JOIN user_setting_sport_wise as usptset ON usptset.sport_id = spt.sport_id AND usptset.user_id=@user_id LEFT JOIN favourites as fav ON fav.match_id=mtch.match_id AND fav.market_id= mkts.market_id AND fav.user_id=@user_id where NOT EXISTS (SELECT 1  from user_deactive_matches WHERE user_deactive_matches.match_id = mtch.match_id AND user_deactive_matches.user_id =@user_id) AND NOT EXISTS (SELECT 1 from deactive_sports WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id =@user_id) AND spt.sport_id =@sport_id  AND mtch.match_id=@match_id  AND mtch.status='Y' AND mkts.is_result_declared='N' AND mkts.winner_name IS NULL AND spt.status='Y' AND mtch.is_completed='N'")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let matchMarkets = result.recordset;
			let marketID = result.recordset.map((data) => (data.market_id));
			let oddsData = await exchangeService.getOddsByMarketIds(marketID);


			let newdata = matchMarkets.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE', PlayTv1: settings.GET_MATCH_TV1_URL, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + (settings.GET_GRAPHICS_MATCH_MARKET == 'MARKET' ? data.market_id : data.match_id) } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, InplayStatus: 'CLOSE', PlayTv1: settings.GET_MATCH_TV1_URL, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + (settings.GET_GRAPHICS_MATCH_MARKET == 'MARKET' ? data.market_id : data.match_id) }
			));

			return resultdb(CONSTANTS.SUCCESS, newdata[0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};

let getGreyHoundRacingMatchDetails = async (data) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.Int, data.match_id)
			.input('sport_id', sql.Int, data.sport_id)
			.input('market_id', sql.VarChar(150), data.market_id)
			.query("SELECT (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore, spt.name as SportName,ISNULL(fav.match_id ,0) as favMatchID,ISNULL(CASE WHEN (disable.user_id IS NOT NULL OR disable.user_id !=0) AND mkts.market_admin_message IS NULL THEN 'BET SUSPENDED' ELSE mkts.market_admin_message END,'') as adminMessage,(CASE WHEN mkts.min_stack > usptset.min_match_stack THEN mkts.min_stack ELSE usptset.min_match_stack END) AS marketMinStack,(CASE WHEN mkts.max_stack > usptset.max_match_stack THEN mkts.max_stack ELSE usptset.max_match_stack END) AS marketMaxStack,(CASE WHEN usptset.max_profit > mkts.max_market_profit THEN mkts.max_market_profit ELSE usptset.max_profit END) AS marketMaxProfit, (CASE WHEN mkts.min_loss > usptset.max_loss THEN mkts.min_loss ELSE usptset.max_loss END) AS marketMaxLoss,(CASE WHEN mkts.max_market_liability < usptset.max_exposure THEN mkts.max_market_liability ELSE usptset.max_exposure END) AS marketMaxExposure,(CASE WHEN mkts.min_liability > usptset.min_exposure THEN mkts.min_liability ELSE usptset.min_exposure END) AS marketMinExposure,'' AS InplayStatus, ISNULL(mtch.maintv,'') AS MainTV,'' AS PlayTv1,'' AS PlayTv2,'' AS PlayTv3,'' AS PlayTv4,'' AS graphics,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, (CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,(CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) AS  backRateDiff,(CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) AS  layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch  with(nolock) JOIN sports spt  with(nolock) ON spt.sport_id=mtch.sport_id  JOIN markets mkts  with(nolock) ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.market_id=@market_id AND mkts.status='Y' INNER JOIN user_setting_sport_wise as usptset  with(nolock) ON usptset.sport_id = spt.sport_id AND usptset.user_id=@user_id LEFT JOIN favourites as fav  with(nolock) ON fav.match_id=mtch.match_id AND fav.market_id= mkts.market_id AND fav.user_id=@user_id  LEFT JOIN disable_match_markets as disable with(nolock) ON disable.market_id= mkts.market_id AND disable.user_id=@user_id LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id AND  dspt.sport_id=@sport_id and dspt.user_id = @user_id LEFT JOIN user_deactive_matches as udmtch with(nolock) ON udmtch.match_id= mtch.match_id AND  udmtch.match_id=@match_id and udmtch.user_id = @user_id  where ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND ( udmtch.match_id  IS NULL OR udmtch.match_id=0) AND spt.sport_id =@sport_id  AND mtch.match_id=@match_id  AND mtch.status='Y' AND mkts.is_result_declared='N' AND mkts.winner_name IS NULL AND spt.status='Y' AND mtch.is_completed='N'")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {


			let matchMarkets = result.recordset;
			let marketID = result.recordset.map((data) => (data.market_id));
			let match_id = result.recordset.map((data) => (data.match_id));

			let backRateDiff = result.recordset[0].backRateDiff;//result.recordset.map((data)=>(data.backRateDiff));	
			let layRateDiff = result.recordset[0].layRateDiff; //result.recordset.map((data)=>(data.layRateDiff));		
			let matchVolumn = result.recordset[0].matchVolumn > 0 ? result.recordset[0].matchVolumn : 1; //result.recordset.map((data)=>(data.matchVolumn));	
			result.recordset[0].bxyz = await decryptBackLayValue(backRateDiff);
			result.recordset[0].lxyz = await decryptBackLayValue(layRateDiff);
			result.recordset[0].vxyz = await decryptBackLayValue(matchVolumn);

			let oddsData = await exchangeService.getOddsByMarketIds(marketID);
			let MarketSelection = await exchangeService.getMarketSelection(match_id, marketID, data.id);
			try {
				let MarketSelectionDb = []
				if (MarketSelection.data[0] != null) {
					MarketSelectionDb = MarketSelection.data;
				}
				if (oddsData.data[marketID] != null) {
					oddsData.data[marketID].runners.map(function (dbdata, i) {
						if (dbdata != null) {
							let indexOfFancyData = '';
							if (MarketSelectionDb != null) {
								indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
							} else {
								indexOfFancyData = -1;
							}

							dbdata.ex.availableToBack.map(function (BackPriceSize) {
								BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
								BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});
							dbdata.ex.availableToLay.map(function (LayPriceSize) {
								LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
								LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});

							if (indexOfFancyData === -1) {
								dbdata.WinAndLoss = 0;
							} else {
								dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
								dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
								dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
							}
						}
					});
				} else {
					if (matchMarkets[0].runner_json != null) {
						let runner_json2 = JSON.parse(matchMarkets[0].runner_json);
						runner_json2.map(function (dbdata, i) {
							if (dbdata != null) {


								dbdata.ex.availableToBack.map(function (BackPriceSize) {
									BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
									BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});
								dbdata.ex.availableToLay.map(function (LayPriceSize) {
									LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
									LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});

								let indexOfFancyData = '';
								if (MarketSelectionDb != null) {
									indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
								} else {
									indexOfFancyData = -1;
								}

								if (indexOfFancyData === -1) {
									dbdata.WinAndLoss = 0;
								} else {
									dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
									dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
									dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
								}
							}
						});
						matchMarkets[0].runner_json = JSON.stringify(runner_json2);
					}
				}

			}
			catch (e) {
				console.log(e);
				return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
			}


			let newdata = matchMarkets.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE', PlayTv1: settings.GET_MATCH_TV1_URL, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + (settings.GET_GRAPHICS_MATCH_MARKET == 'MARKET' ? data.market_id : data.match_id) } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: 'CLOSE', PlayTv1: settings.GET_MATCH_TV1_URL, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + (settings.GET_GRAPHICS_MATCH_MARKET == 'MARKET' ? data.market_id : data.match_id) }
			));

			return resultdb(CONSTANTS.SUCCESS, newdata[0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};


let getMatchSoccerMarketList = async (data) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.Int, data.match_id)
			.input('sport_id', sql.Int, data.sport_id)
			.query("SELECT (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore, spt.name as SportName,ISNULL(fav.match_id ,0) as favMatchID,ISNULL(CASE WHEN (disable.user_id IS NOT NULL OR disable.user_id !=0) AND mkts.market_admin_message IS NULL THEN 'BET SUSPENDED' ELSE mkts.market_admin_message END,'')as adminMessage,(CASE WHEN mkts.min_stack > 0 THEN mkts.min_stack ELSE usptset.min_match_stack END) AS marketMinStack,(CASE WHEN mkts.max_stack > 0 THEN mkts.max_stack ELSE usptset.max_match_stack END) AS marketMaxStack,(CASE WHEN mkts.max_market_profit > 0 THEN mkts.max_market_profit ELSE usptset.max_profit END) AS marketMaxProfit, (CASE WHEN mkts.min_loss > 0 THEN mkts.min_loss ELSE usptset.max_loss END) AS marketMaxLoss,(CASE WHEN mkts.max_market_liability > 0 THEN mkts.max_market_liability ELSE usptset.max_exposure END) AS marketMaxExposure,(CASE WHEN mkts.min_liability > 0 THEN mkts.min_liability ELSE usptset.min_exposure END) AS marketMinExposure,'' AS InplayStatus, ISNULL(mtch.maintv,'') AS MainTV,'' AS PlayTv1,'' AS PlayTv2,'' AS PlayTv3,'' AS PlayTv4,'' AS graphics,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, (CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END )  as SportminOddsLimt, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,(CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) AS  backRateDiff,(CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) AS  layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json,mkts.tv_id, ser.name as seriesName FROM matches as mtch with(nolock) JOIN sports spt with(nolock) ON spt.sport_id=mtch.sport_id  JOIN markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name='Match Odds' AND mkts.status='Y' INNER JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = spt.sport_id AND usptset.user_id=@user_id LEFT JOIN favourites as fav with(nolock) ON fav.match_id=mtch.match_id AND fav.market_id= mkts.market_id AND fav.user_id=@user_id LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id AND  dspt.sport_id=@sport_id and dspt.user_id = @user_id LEFT JOIN user_deactive_matches as udmtch with(nolock) ON udmtch.match_id= mtch.match_id AND  udmtch.match_id=@match_id and udmtch.user_id = @user_id LEFT JOIN disable_match_markets as disable with(nolock) ON disable.market_id= mkts.market_id AND disable.user_id=@user_id LEFT JOIN series as ser with(nolock) ON ser.series_id= mtch.series_id where ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND ( udmtch.match_id  IS NULL OR udmtch.match_id=0) AND spt.sport_id =@sport_id  AND mtch.match_id=@match_id  AND mtch.status='Y' AND mkts.is_result_declared='N' AND mkts.winner_name IS NULL AND spt.status='Y' AND mtch.is_completed='N'")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {


			let matchMarkets = result.recordset;
			let marketID = result.recordset.map((data) => (data.market_id));
			let match_id = result.recordset.map((data) => (data.match_id));

			let backRateDiff = result.recordset[0].backRateDiff;//result.recordset.map((data)=>(data.backRateDiff));	
			let layRateDiff = result.recordset[0].layRateDiff; //result.recordset.map((data)=>(data.layRateDiff));		
			let matchVolumn = result.recordset[0].matchVolumn > 0 ? result.recordset[0].matchVolumn : 1; //result.recordset.map((data)=>(data.matchVolumn));	
			result.recordset[0].bxyz = await decryptBackLayValue(backRateDiff);
			result.recordset[0].lxyz = await decryptBackLayValue(layRateDiff);
			result.recordset[0].vxyz = await decryptBackLayValue(matchVolumn);
			let matchTV = await exchangeService.getmatchTV(match_id);
			result.recordset[0].MainTV = matchTV.data;

			let oddsData = await exchangeService.getOddsByMarketIds(marketID);
			let MarketSelection = await exchangeService.getMarketSelection(match_id, marketID, data.id);
			try {
				let MarketSelectionDb = []
				if (MarketSelection.data[0] != null) {
					MarketSelectionDb = MarketSelection.data;
				}
				if (oddsData.data[marketID] != null) {
					oddsData.data[marketID].runners.map(function (dbdata, i) {
						if (dbdata != null) {
							let indexOfFancyData = '';
							if (MarketSelectionDb != null) {
								indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
							} else {
								indexOfFancyData = -1;
							}

							dbdata.ex.availableToBack.map(function (BackPriceSize) {
								BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
								BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});
							dbdata.ex.availableToLay.map(function (LayPriceSize) {
								LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
								LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});

							if (indexOfFancyData === -1) {
								dbdata.WinAndLoss = 0;
							} else {
								dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
								dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
								dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
							}
						}
					});
				} else {
					if (matchMarkets[0].runner_json != null) {
						let runner_json2 = JSON.parse(matchMarkets[0].runner_json);
						runner_json2.map(function (dbdata, i) {
							if (dbdata != null) {

								dbdata.ex.availableToBack.map(function (BackPriceSize) {
									BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
									BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});
								dbdata.ex.availableToLay.map(function (LayPriceSize) {
									LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
									LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});

								let indexOfFancyData = '';
								if (MarketSelectionDb != null) {
									indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
								} else {
									indexOfFancyData = -1;
								}

								if (indexOfFancyData === -1) {
									dbdata.WinAndLoss = 0;
								} else {
									dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
									dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
									dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
								}
							}
						});
						matchMarkets[0].runner_json = JSON.stringify(runner_json2);
					}
				}

			}
			catch (e) {
				console.log(e);
				return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
			}

			let newdata = matchMarkets.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE', PlayTv1: matchTV.data, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + (settings.GET_GRAPHICS_MATCH_MARKET == 'MARKET' ? data.market_id : data.match_id) } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: 'CLOSE', PlayTv1: settings.GET_MATCH_TV1_URL, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + (settings.GET_GRAPHICS_MATCH_MARKET == 'MARKET' ? data.market_id : data.match_id) }
			));
			return resultdb(CONSTANTS.SUCCESS, newdata[0]);

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};


let getMatchTennisMarketList = async (data) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.Int, data.match_id)
			.input('sport_id', sql.Int, data.sport_id)
			.query("SELECT (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore, spt.name as SportName,ISNULL(fav.match_id ,0) as favMatchID,ISNULL(CASE WHEN (disable.user_id IS NOT NULL OR disable.user_id !=0) AND mkts.market_admin_message IS NULL THEN 'BET SUSPENDED' ELSE mkts.market_admin_message END,'')as adminMessage,(CASE WHEN mkts.min_stack > 0 THEN mkts.min_stack ELSE usptset.min_match_stack END) AS marketMinStack,(CASE WHEN mkts.max_stack > 0 THEN mkts.max_stack ELSE usptset.max_match_stack END) AS marketMaxStack,(CASE WHEN usptset.max_profit > 0 THEN mkts.max_market_profit ELSE usptset.max_profit END) AS marketMaxProfit, (CASE WHEN mkts.min_loss > 0 THEN mkts.min_loss ELSE usptset.max_loss END) AS marketMaxLoss,(CASE WHEN mkts.max_market_liability > 0  THEN mkts.max_market_liability ELSE usptset.max_exposure END) AS marketMaxExposure,(CASE WHEN mkts.min_liability > 0 THEN mkts.min_liability ELSE usptset.min_exposure END) AS marketMinExposure,'' AS InplayStatus, ISNULL(mtch.maintv,'') AS MainTV,'' AS PlayTv1,'' AS PlayTv2,'' AS PlayTv3,'' AS PlayTv4,'' AS graphics,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, (CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,(CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) AS  backRateDiff,(CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) AS  layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json,mkts.tv_id, ser.name as seriesName FROM matches as mtch with(nolock) JOIN sports spt with(nolock) ON spt.sport_id=mtch.sport_id  JOIN markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name='Match Odds' AND mkts.status='Y' INNER JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = spt.sport_id AND usptset.user_id=@user_id LEFT JOIN favourites as fav with(nolock) ON fav.match_id=mtch.match_id AND fav.market_id= mkts.market_id AND fav.user_id=@user_id LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id AND  dspt.sport_id=@sport_id and dspt.user_id =@user_id LEFT JOIN user_deactive_matches as udmtch with(nolock) ON udmtch.match_id= mtch.match_id AND  udmtch.match_id=@match_id and udmtch.user_id =@user_id LEFT JOIN disable_match_markets as disable with(nolock) ON disable.market_id= mkts.market_id AND disable.user_id=@user_id LEFT JOIN series as ser with(nolock) ON ser.series_id= mtch.series_id  where ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND ( udmtch.match_id  IS NULL OR udmtch.match_id=0) AND spt.sport_id =@sport_id  AND mtch.match_id=@match_id  AND mtch.status='Y' AND mkts.is_result_declared='N' AND mkts.winner_name IS NULL AND spt.status='Y' AND mtch.is_completed='N'")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {

			let matchMarkets = result.recordset;
			let marketID = result.recordset.map((data) => (data.market_id));
			let match_id = result.recordset.map((data) => (data.match_id));

			let backRateDiff = result.recordset[0].backRateDiff;//result.recordset.map((data)=>(data.backRateDiff));	
			let layRateDiff = result.recordset[0].layRateDiff; //result.recordset.map((data)=>(data.layRateDiff));		
			let matchVolumn = result.recordset[0].matchVolumn > 0 ? result.recordset[0].matchVolumn : 1; //result.recordset.map((data)=>(data.matchVolumn));	
			console.log(backRateDiff);
			result.recordset[0].bxyz = await decryptBackLayValue(backRateDiff);
			result.recordset[0].lxyz = await decryptBackLayValue(layRateDiff);
			result.recordset[0].vxyz = await decryptBackLayValue(matchVolumn);
			let matchTV = await exchangeService.getmatchTV(match_id);
			result.recordset[0].MainTV = matchTV.data;

			let oddsData = await exchangeService.getOddsByMarketIds(marketID);

			let MarketSelection = await exchangeService.getMarketSelection(match_id, marketID, data.id);
			try {
				let MarketSelectionDb = []
				if (MarketSelection.data[0] != null) {
					MarketSelectionDb = MarketSelection.data;
				}
				if (oddsData.data[marketID] != null) {
					oddsData.data[marketID].runners.map(function (dbdata, i) {
						if (dbdata != null) {
							let indexOfFancyData = '';
							if (MarketSelectionDb != null) {
								indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
							} else {
								indexOfFancyData = -1;
							}
							dbdata.ex.availableToBack.map(function (BackPriceSize) {
								BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
								BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});
							dbdata.ex.availableToLay.map(function (LayPriceSize) {
								LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
								LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});

							if (indexOfFancyData === -1) {
								dbdata.WinAndLoss = 0;
							} else {
								dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
								dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
								dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
							}
						}
					});
				} else {
					if (matchMarkets[0].runner_json != null) {
						let runner_json2 = JSON.parse(matchMarkets[0].runner_json);
						runner_json2.map(function (dbdata, i) {
							if (dbdata != null) {

								dbdata.ex.availableToBack.map(function (BackPriceSize) {
									BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
									BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});
								dbdata.ex.availableToLay.map(function (LayPriceSize) {
									LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
									LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});


								let indexOfFancyData = '';
								if (MarketSelectionDb != null) {
									indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
								} else {
									indexOfFancyData = -1;
								}

								if (indexOfFancyData === -1) {
									dbdata.WinAndLoss = 0;
								} else {
									dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
									dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
									dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
								}
							}
						});
						matchMarkets[0].runner_json = JSON.stringify(runner_json2);
					}
				}

			}
			catch (e) {
				console.log(e);
				return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
			}

			let newdata = matchMarkets.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE', PlayTv1: matchTV.data, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + (settings.GET_GRAPHICS_MATCH_MARKET == 'MARKET' ? data.market_id : data.match_id) } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: 'CLOSE', PlayTv1: settings.GET_MATCH_TV1_URL, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + (settings.GET_GRAPHICS_MATCH_MARKET == 'MARKET' ? data.market_id : data.match_id) }
			));

			return resultdb(CONSTANTS.SUCCESS, newdata[0]);

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};

let getMatchCasinoMarketList = async (data) => {
	try {
		const pool = await poolPromise;
		let conditionMatchid = "";

		let matchNewQuery = "select TOP 1 match_id from cassino_matches where match_id  >=" + data.match_id + " AND sport_id=" + data.sport_id + " ORDER BY id DESC";

		const newRecord = await pool.request().query(matchNewQuery);
		let matchIDNew = newRecord.recordset[0].match_id;
		conditionMatchid = matchIDNew;

		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.BigInt, conditionMatchid)
			.input('sport_id', sql.Int, data.sport_id)
			.query("SELECT  '' as timer, '' as indexCard, mkts.display_name as displayName , (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore, spt.name as SportName,0 as favMatchID,ISNULL(mkts.market_admin_message,'') as adminMessage,(CASE WHEN mkts.min_stack > usptset.min_match_stack THEN mkts.min_stack ELSE usptset.min_match_stack END) AS marketMinStack,(CASE WHEN mkts.max_stack > usptset.max_match_stack THEN mkts.max_stack ELSE usptset.max_match_stack END) AS marketMaxStack,(CASE WHEN usptset.max_profit > mkts.max_market_profit THEN mkts.max_market_profit ELSE usptset.max_profit END) AS marketMaxProfit, (CASE WHEN mkts.min_loss > usptset.max_loss THEN mkts.min_loss ELSE usptset.max_loss END) AS marketMaxLoss,(CASE WHEN mkts.max_market_liability < usptset.max_exposure THEN mkts.max_market_liability ELSE usptset.max_exposure END) AS marketMaxExposure,(CASE WHEN mkts.min_liability > usptset.min_exposure THEN mkts.min_liability ELSE usptset.min_exposure END) AS marketMinExposure,'' AS InplayStatus, '' AS MainTV,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,(CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END )  as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,(CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) AS  backRateDiff,(CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) AS  layRateDiff,mtch.series_id, mtch.match_id, mtch.name,mtch.is_completed, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM cassino_matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id  JOIN cassino_markets mkts ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name='Match Odds' INNER JOIN user_setting_sport_wise as usptset ON usptset.sport_id = spt.sport_id AND usptset.user_id=@user_id where NOT EXISTS (SELECT 1 from deactive_sports WHERE deactive_sports.sport_id =@sport_id  AND deactive_sports.user_id =@user_id) AND spt.sport_id =@sport_id  AND mtch.match_id=@match_id  AND mtch.status='Y' AND spt.status='Y'")


		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			let matchMarkets = result.recordset;

			let marketID = data.sport_id + matchMarkets[0].market_id;

			let oddsData = await exchangeService.getCasinoOddsByMarketIds([marketID]);
			let matinTv = await exchangeService.getCasinoLiveTv(data.sport_id);

			let marketRunnerJson = [];

			let matchMarketsDetails = matchMarkets[0];
			let compairMarketid = matchMarketsDetails.market_id;
			matchMarketsDetails.errorMessage = "";

			let MarketSelection = await exchangeService.getCasinoMarketSelection(matchMarketsDetails.match_id, matchMarketsDetails.market_id, data.id);

			if (matchMarketsDetails.runner_json !== null && (oddsData.data == null || oddsData.data.length == undefined || oddsData.data.length == 0)) {

				let runnerJson = JSON.parse(matchMarketsDetails.runner_json);


				let marktRunner = runnerJson[0].marketRunner;

				matchMarkets[0].indexCard = [];
				matchMarkets[0].timer = 0;
				matchMarkets[0].errorMessage = CONSTANTS.CASION_ERROR_MESSAGE;

				for (let k in marktRunner) {

					let selectionID = marktRunner[k].id;
					selectionMatch = MarketSelection.data.filter(function (data) {
						if (data.selection_id == selectionID) {
							marktRunner[k].WinAndLoss = data.win_loss_value;
							marktRunner[k].back = [];
							marktRunner[k].lay = [];
							marktRunner[k].cards = [];
							//marktRunner[k].superStatus = 'CLOSE';
						}
					});
					let runnerJs = marktRunner[k];
					runnerJs.superStatus = 'SUSPENDED';
					//runnerJs.superStatus= 'CLOSE';//runnerJson[i].status;
					marketRunnerJson.push(runnerJs);
				}
			}
			else {

				let runnerJson = oddsData.data;
				let roundId = runnerJson[0].roundId;
				let backRateDiff = matchMarketsDetails.backRateDiff;
				let layRateDiff = matchMarketsDetails.layRateDiff;
				let matchVolumn = matchMarketsDetails.matchVolumn > 0 ? matchMarketsDetails.matchVolumn : 1;

				matchMarkets[0].indexCard = runnerJson[0].indexCard;
				matchMarkets[0].timer = runnerJson[0].timer;
				if (roundId != compairMarketid) {
					matchMarkets[0].errorMessage = CONSTANTS.CASION_ERROR_MESSAGE;
					matchMarkets[0].indexCard = [];
					matchMarkets[0].timer = 0;
				}

				let marktRunner = runnerJson[0].marketRunner;
				for (let k in marktRunner) {

					let selectionID = marktRunner[k].id;
					selectionMatch = MarketSelection.data.filter(function (data) {
						if (data.selection_id == selectionID) {
							marktRunner[k].WinAndLoss = data.win_loss_value;
							if (marktRunner[k].back.length > 0) {
								marktRunner[k].back[0].price = Number(parseFloat(parseFloat(marktRunner[k].back[0].price) + parseFloat(backRateDiff)).toFixed(2));
								marktRunner[k].back[0].size = Number(parseFloat(parseFloat(marktRunner[k].back[0].size) * parseFloat(matchVolumn)).toFixed(2));
							}
							if (marktRunner[k].lay.length > 0) {
								marktRunner[k].lay[0].price = Number(parseFloat(parseFloat(marktRunner[k].lay[0].price) + parseFloat(layRateDiff)).toFixed(2));
								marktRunner[k].lay[0].size = Number(parseFloat(parseFloat(marktRunner[k].lay[0].size) * parseFloat(matchVolumn)).toFixed(2));
							}
						}

						if (roundId != compairMarketid) {
							marktRunner[k].back = [];
							marktRunner[k].lay = [];
							marktRunner[k].cards = [];
						}
					});

					let runnerJs = marktRunner[k];
					if (roundId === compairMarketid) {
						runnerJs.superStatus = runnerJson[0].status;
					} else {
						runnerJs.superStatus = 'SUSPENDED';//runnerJson[i].status;
					}
					marketRunnerJson.push(runnerJs);
				}
			}
			matchMarkets[0].runner_json = marketRunnerJson;
			matchMarkets[0].InplayStatus = 'CLOSE';
			matchMarkets[0].MainTV = matinTv.data;

			return resultdb(CONSTANTS.SUCCESS, matchMarkets[0]);
		}

	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getMatchCasinoMarketListAnderBahar = async (data) => {
	try {
		const pool = await poolPromise;
		let conditionMatchid = "";


		let matchNewQuery = "select TOP 1 match_id from cassino_matches where match_id  >=" + data.match_id + " AND sport_id=" + data.sport_id + " ORDER BY id DESC";

		const newRecord = await pool.request().query(matchNewQuery);
		let matchIDNew = newRecord.recordset[0].match_id;
		conditionMatchid = matchIDNew;


		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.BigInt, conditionMatchid)
			.input('sport_id', sql.Int, data.sport_id)
			.query("SELECT  0 as timer, '' as indexCard,'' as indexCard2, mkts.display_name as displayName , (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore, spt.name as SportName,0 as favMatchID,ISNULL(mkts.market_admin_message,'') as adminMessage,(CASE WHEN mkts.min_stack > usptset.min_match_stack THEN mkts.min_stack ELSE usptset.min_match_stack END) AS marketMinStack,(CASE WHEN mkts.max_stack > usptset.max_match_stack THEN mkts.max_stack ELSE usptset.max_match_stack END) AS marketMaxStack,(CASE WHEN usptset.max_profit > mkts.max_market_profit THEN mkts.max_market_profit ELSE usptset.max_profit END) AS marketMaxProfit, (CASE WHEN mkts.min_loss > usptset.max_loss THEN mkts.min_loss ELSE usptset.max_loss END) AS marketMaxLoss,(CASE WHEN mkts.max_market_liability < usptset.max_exposure THEN mkts.max_market_liability ELSE usptset.max_exposure END) AS marketMaxExposure,(CASE WHEN mkts.min_liability > usptset.min_exposure THEN mkts.min_liability ELSE usptset.min_exposure END) AS marketMinExposure,'' AS InplayStatus, '' AS MainTV,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, (CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END )  as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,'' as runner_jsonA, '' as runner_jsonB,(CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) AS  backRateDiff,(CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) AS  layRateDiff,mtch.series_id, mtch.match_id, mtch.name,mtch.is_completed, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id FROM cassino_matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id  JOIN cassino_markets mkts ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name='Match Odds' INNER JOIN user_setting_sport_wise as usptset ON usptset.sport_id = spt.sport_id AND usptset.user_id=@user_id where  (SELECT COUNT(*) from deactive_sports WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id= @user_id)=0 AND spt.sport_id =@sport_id  AND mtch.match_id=@match_id  AND mtch.status='Y' AND spt.status='Y'")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			let matchMarkets = result.recordset;

			let marketID = data.sport_id + matchMarkets[0].market_id;
			let oddsData = await exchangeService.getCasinoOddsByMarketIds([marketID]);
			oddsData = oddsData.data;
			let matinTv = await exchangeService.getCasinoLiveTv(data.sport_id);
			let marketRunnerJsonA = [];
			let marketRunnerJsonB = [];

			if (oddsData != null && oddsData.length > 0) {
				matchMarkets[0].indexCard = oddsData[0].indexCard;
				matchMarkets[0].indexCard2 = oddsData[0].indexCard2;
				matchMarkets[0].timer = oddsData[0].timer;
				for (let i in oddsData) {
					marketRunnerJsonA.push(oddsData[i].marketRunner[0]);
					marketRunnerJsonB.push(oddsData[i].marketRunner[1]);

				}
			} else {
				matchMarkets[0].indexCard = [];
				matchMarkets[0].indexCard2 = [];
				matchMarkets[0].errorMessage = CONSTANTS.CASION_ERROR_MESSAGE;
			}
			matchMarkets[0].runner_jsonA = marketRunnerJsonA;
			matchMarkets[0].runner_jsonB = marketRunnerJsonB;



			matchMarkets[0].InplayStatus = 'CLOSE';
			matchMarkets[0].MainTV = matchMarkets[0].MainTV = matinTv.data;


			return resultdb(CONSTANTS.SUCCESS, matchMarkets[0]);

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getMatchWithoutMatchOddsMarketListNew = async (data) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.Int, data.match_id)
			.input('sport_id', sql.Int, data.sport_id)
			.query("SELECT (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore,mkts.isbetalowaftermatchodds, spt.name as SportName,ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET SUSPENDED' ELSE mkts.market_admin_message END,'') as adminMessage,(CASE WHEN mkts.min_stack > usptset.min_match_stack THEN mkts.min_stack ELSE usptset.min_match_stack END) AS marketMinStack,(CASE WHEN mkts.max_stack > usptset.max_match_stack THEN mkts.max_stack ELSE usptset.max_match_stack END) AS marketMaxStack,(CASE WHEN usptset.max_profit > mkts.max_market_profit THEN mkts.max_market_profit ELSE usptset.max_profit END) AS marketMaxProfit, (CASE WHEN mkts.min_loss > usptset.max_loss THEN mkts.min_loss ELSE usptset.max_loss END) AS marketMaxLoss,(CASE WHEN mkts.max_market_liability < usptset.max_exposure THEN mkts.max_market_liability ELSE usptset.max_exposure END) AS marketMaxExposure,(CASE WHEN mkts.min_liability > usptset.min_exposure THEN mkts.min_liability ELSE usptset.min_exposure END) AS marketMinExposure,'' AS InplayStatus,'' AS MainTV,'' AS PlayTv1,'' AS PlayTv2,'' AS PlayTv3,'' AS PlayTv4,'' AS graphics,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, (CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,(CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) AS  backRateDiff,(CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) AS  layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id  JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name !='Match Odds' AND mkts.name !='Book Maker' AND mkts.name !='Book Maker 2' AND mkts.status='Y' INNER JOIN user_setting_sport_wise as usptset ON usptset.sport_id = spt.sport_id AND usptset.user_id=@user_id  where NOT EXISTS (SELECT 1  from user_deactive_matches WHERE user_deactive_matches.match_id = mtch.match_id AND user_deactive_matches.user_id = @user_id) AND NOT EXISTS (SELECT 1 from deactive_sports WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id =@user_id) AND mtch.match_id=@match_id  AND mtch.status='Y' AND mkts.is_result_declared='N' AND mkts.winner_name IS NULL AND spt.status='Y' AND mtch.is_completed='N' ORDER BY mkts.market_runner_count ASC")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let matchMarkets = result.recordset;
			//let MarketSelections=Array();
			//let oddRunneer = Array();
			let marketID = result.recordset.map((data) => (data.market_id));
			let oddsData = await exchangeService.getOddsByMarketIds(marketID);

			for (let i in matchMarkets) {

				let matchMarketsDetails = matchMarkets[i];

				let MarketSelection = await exchangeService.getMarketSelection(matchMarketsDetails.match_id, matchMarketsDetails.market_id, data.id);
				try {

					if (oddsData.data[matchMarketsDetails.market_id] !== undefined && MarketSelection.data.length > 0) {
						for (let j in MarketSelection.data) {
							if (MarketSelection.data[j].selection_id == oddsData.data[matchMarketsDetails.market_id].runners[j].selectionId) {
								oddsData.data[matchMarketsDetails.market_id].runners[j]['selectionName'] = MarketSelection.data[j].SelectionName;
								oddsData.data[matchMarketsDetails.market_id].runners[j]['sort_priority'] = MarketSelection.data[j].sort_priority;
								oddsData.data[matchMarketsDetails.market_id].runners[j]['WinAndLoss'] = MarketSelection.data[j].win_loss_value;
							} else {
								oddsData.data[matchMarketsDetails.market_id].runners[j]['selectionName'] = "";
								oddsData.data[matchMarketsDetails.market_id].runners[j]['sort_priority'] = "";
								oddsData.data[matchMarketsDetails.market_id].runners[j]['WinAndLoss'] = 0;
							}
						}
					} else {

						if (matchMarketsDetails.runner_json && matchMarketsDetails.runner_json !== null) {
							let runner_json2 = JSON.parse(matchMarkets[i].runner_json);
							for (let j in MarketSelection.data) {
								if (MarketSelection.data[j].selection_id == runner_json2[j].selectionId) {
									runner_json2[j]['selectionName'] = MarketSelection.data[j].SelectionName;
									runner_json2[j]['sort_priority'] = MarketSelection.data[j].sort_priority;
									runner_json2[j]['WinAndLoss'] = MarketSelection.data[j].win_loss_value;
								} else {
									runner_json2[j]['selectionName'] = "";
									runner_json2[j]['sort_priority'] = "";
									runner_json2[j]['WinAndLoss'] = 0;
								}
							}
							matchMarkets[i].runner_json = JSON.stringify(runner_json2);
						}

					}
				}
				catch (e) {
					console.log(e);
					return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
				}
			}
			let newdata = matchMarkets.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE' } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, InplayStatus: 'CLOSE' }
			));

			return resultdb(CONSTANTS.SUCCESS, newdata);

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getMatchBookmakerMarketNew = async (data) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.Int, data.match_id)
			.input('sport_id', sql.Int, data.sport_id)
			.query("SELECT (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore,mkts.isbetalowaftermatchodds, spt.name as SportName,ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET SUSPENDED' ELSE mkts.market_admin_message END,'')  as adminMessage,(CASE WHEN mkts.min_stack > usptset.min_match_stack THEN mkts.min_stack ELSE usptset.min_match_stack END) AS marketMinStack,(CASE WHEN mkts.max_stack > usptset.max_match_stack THEN mkts.max_stack ELSE usptset.max_match_stack END) AS marketMaxStack,(CASE WHEN usptset.max_profit > mkts.max_market_profit THEN mkts.max_market_profit ELSE usptset.max_profit END) AS marketMaxProfit, (CASE WHEN mkts.min_loss > usptset.max_loss THEN mkts.min_loss ELSE usptset.max_loss END) AS marketMaxLoss,(CASE WHEN mkts.max_market_liability < usptset.max_exposure THEN mkts.max_market_liability ELSE usptset.max_exposure END) AS marketMaxExposure,(CASE WHEN mkts.min_liability > usptset.min_exposure THEN mkts.min_liability ELSE usptset.min_exposure END) AS marketMinExposure,'' AS InplayStatus,'' AS MainTV,'' AS PlayTv1,'' AS PlayTv2,'' AS PlayTv3,'' AS PlayTv4,'' AS graphics,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, (CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,(CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) AS  backRateDiff,(CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) AS  layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id  JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name ='Book Maker'  AND mkts.status='Y' INNER JOIN user_setting_sport_wise as usptset ON usptset.sport_id = spt.sport_id AND usptset.user_id=@user_id  where NOT EXISTS (SELECT 1  from user_deactive_matches WHERE user_deactive_matches.match_id = mtch.match_id AND user_deactive_matches.user_id=@user_id)  AND NOT EXISTS (SELECT 1 from deactive_sports WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id=@user_id) AND mtch.match_id=@match_id  AND mtch.status='Y' AND mkts.is_result_declared='N' AND mkts.winner_name IS NULL AND spt.status='Y' AND mtch.is_completed='N' ORDER BY mkts.market_runner_count ASC")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let matchMarkets = result.recordset;
			//let MarketSelections=Array();
			//let oddRunneer = Array();
			let marketID = result.recordset.map((data) => (data.market_id));
			let oddsData = await exchangeService.getOddsByMarketIds(marketID);
			//console.log(oddsData);
			for (let i in matchMarkets) {

				let matchMarketsDetails = matchMarkets[i];

				let MarketSelection = await exchangeService.getMarketSelection(matchMarketsDetails.match_id, matchMarketsDetails.market_id, data.id);

				try {

					if (oddsData.data[matchMarketsDetails.market_id] !== undefined && MarketSelection.data.length > 0) {
						for (let j in MarketSelection.data) {
							if (MarketSelection.data[j].selection_id == oddsData.data[matchMarketsDetails.market_id].runners[j].selectionId) {
								oddsData.data[matchMarketsDetails.market_id].runners[j]['selectionName'] = MarketSelection.data[j].SelectionName;
								oddsData.data[matchMarketsDetails.market_id].runners[j]['sort_priority'] = MarketSelection.data[j].sort_priority;
								oddsData.data[matchMarketsDetails.market_id].runners[j]['WinAndLoss'] = MarketSelection.data[j].win_loss_value;
							} else {
								oddsData.data[matchMarketsDetails.market_id].runners[j]['selectionName'] = "";
								oddsData.data[matchMarketsDetails.market_id].runners[j]['sort_priority'] = "";
								oddsData.data[matchMarketsDetails.market_id].runners[j]['WinAndLoss'] = 0;
							}
						}
					} else {

						if (matchMarketsDetails.runner_json && matchMarketsDetails.runner_json !== null) {
							let runner_json2 = JSON.parse(matchMarkets[i].runner_json);
							for (let j in MarketSelection.data) {
								if (MarketSelection.data[j].selection_id == runner_json2[j].selectionId) {
									runner_json2[j]['selectionName'] = MarketSelection.data[j].SelectionName;
									runner_json2[j]['sort_priority'] = MarketSelection.data[j].sort_priority;
									runner_json2[j]['WinAndLoss'] = MarketSelection.data[j].win_loss_value;
								} else {
									runner_json2[j]['selectionName'] = "";
									runner_json2[j]['sort_priority'] = "";
									runner_json2[j]['WinAndLoss'] = 0;
								}
							}
							matchMarkets[i].runner_json = JSON.stringify(runner_json2);
						}

					}
				}
				catch (e) {
					console.log(e);
					return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
				}
			}
			let newdata = matchMarkets.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE' } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, InplayStatus: 'CLOSE' }
			));

			return resultdb(CONSTANTS.SUCCESS, newdata[0]);

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let gatDataByMarketId = async (data) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.VarChar(50), data.id)
			.input('marketId', sql.VarChar(50), data.market_id)
			.input('matchId', sql.VarChar(50), data.match_id)
			.query("select mkts.market_type,spt.sport_id, CASE WHEN (disable.user_id IS NOT NULL OR disable.user_id !=0) THEN 'N' ELSE 'Y' END  as matchBetAllow, (CASE WHEN mkts.bet_delay > spt.bet_delay THEN mkts.bet_delay ELSE spt.bet_delay END ) AS bet_delay,(CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) AS  backRateDiff,(CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) AS  layRateDiff,  (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, CASE  WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END AS BetAllowTimeBefore,(CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as min_odds_limit, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as max_odss_limit, mkts.series_id,mkts.match_id,mkts.market_id,mtch.start_date,mkts.name as marketName,mkts.max_bet_liability,mkts.is_result_declared,mkts.status,mkts.is_visible  from markets mkts with(nolock) INNER JOIN  matches mtch with(nolock)  ON mtch.match_id=mkts.match_id and mtch.match_id=@matchId INNER JOIN sports spt with(nolock)  ON mkts.sport_id = spt.sport_id LEFT JOIN disable_match_markets as disable with(nolock) ON disable.market_id= mkts.market_id AND disable.user_id=@user_id LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id and dspt.user_id = @user_id LEFT JOIN user_deactive_matches as udmtch with(nolock) ON udmtch.match_id= mtch.match_id AND  udmtch.match_id=@matchId and udmtch.user_id = @user_id   WHERE mkts.market_id=@marketId AND mkts.match_id=@matchId AND ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND ( udmtch.match_id  IS NULL OR udmtch.match_id=0)	AND mtch.status='Y' AND mtch.is_completed='N' AND spt.status='Y'")

		if (result.recordset === null || result.recordset.length == 0) {

			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset[0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let gatDataByCasinoMarketId = async (data) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.VarChar(50), data.id)
			.input('marketId', sql.VarChar(50), data.market_id)
			.input('matchId', sql.VarChar(50), data.match_id)
			.query("select spt.sport_id,(CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) AS  backRateDiff, (CASE WHEN mkts.bet_delay > spt.bet_delay THEN mkts.bet_delay ELSE spt.bet_delay END ) AS bet_delay,(CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) AS  layRateDiff, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, CASE  WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END AS BetAllowTimeBefore, (CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as min_odds_limit, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as max_odss_limit, mkts.series_id,mkts.match_id,mkts.market_id,mtch.start_date,mkts.name as marketName,mkts.max_bet_liability,mkts.is_result_declared,mkts.status,mkts.is_visible  from cassino_markets mkts INNER JOIN  cassino_matches mtch ON mtch.match_id=mkts.match_id and mtch.match_id=@matchId INNER JOIN sports spt ON mkts.sport_id = spt.sport_id WHERE mkts.market_id=@marketId AND mkts.match_id=@matchId AND NOT EXISTS (SELECT 1  from user_deactive_matches WHERE user_deactive_matches.match_id = mkts.match_id AND user_deactive_matches.user_id =@user_id) AND NOT EXISTS (SELECT 1 from deactive_sports WHERE deactive_sports.sport_id =spt.sport_id AND deactive_sports.user_id =@user_id) AND mtch.status='Y' AND mtch.is_completed='N' AND spt.status='Y'")

		if (result.recordset === null || result.recordset.length == 0) {

			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset[0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getMarketSettingById = async (market_id) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('marketId', sql.VarChar(50), market_id)
			.query("select market_type,is_bet_allow,bet_allow_time_before,bet_delay,min_stack,market_admin_message,max_stack,min_liability,max_market_liability,max_market_profit,min_loss,max_bet_liability,liability_type from markets where market_id=@marketId and status='Y'")

		if (result.recordset === null || result.recordset.length == 0) {

			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset[0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getCasinoMarketSettingById = async (market_id) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('marketId', sql.VarChar(50), market_id)
			.query("select is_bet_allow,bet_allow_time_before,bet_delay,min_stack,market_admin_message,max_stack,min_liability,max_market_liability,max_market_profit,min_loss,max_bet_liability,liability_type from cassino_markets where market_id=@marketId and status='Y'")

		if (result.recordset === null || result.recordset.length == 0) {

			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset[0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getTeamPosition = async (user_id, market_id, user_type = null) => {
	try {

		let selectSring;
		let condition = " where market_id='" + market_id + "'  ";
		switch (user_type) {
			case 1:
				condition += " and super_admin_id=" + user_id + "";
				selectSring = " ,sum(super_admin_win_loss)  as win_loss_value";
				break;
			case 2:
				condition += " and admin_id= " + user_id + "";
				selectSring = " ,sum(admin_win_loss)  as win_loss_value";
				break;
			case 3:
				condition += " and super_master_id= " + user_id + "";
				selectSring = " ,sum(super_master_win_loss)  as win_loss_value";
				break;
			case 4:
				condition += " and master_id= " + user_id + "";
				selectSring = " ,sum(master_win_loss)  as win_loss_value";
				break;
			case 5:
				condition += " and agent_id= " + user_id + "";
				selectSring = " ,sum(agent_win_loss)  as win_loss_value";
				break;
			default:
				condition += " and user_id= " + user_id + "";
				selectSring = " ,unmatch_win_loss_value,sum(win_loss_value) as win_loss_value"
		}
		let query = 'select market_id,selection_id,selection_name,sort_priority ' + selectSring + ' from odds_profit_loss ' + condition + ' group by market_id,selection_id,selection_name,sort_priority,unmatch_win_loss_value,win_loss_value';
		//console.log(query);
		const pool = await poolPromise;
		const teamPositions = await pool.request()
			.query(query)

		if (teamPositions === null) {

			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {

			if (teamPositions.recordset.length > 0) {

				return resultdb(CONSTANTS.SUCCESS, teamPositions.recordset);
			} else {
				let selectionsData = await selectionService.getSelectionByMarketId(market_id);
				selectionsData.data.map(function (data) {
					data.market_id = data.market_id;
					data.selection_id = data.selection_id;
					data.selection_name = data.name;
					data.sort_priority = data.sort_priority;
					data.unmatch_win_loss_value = 0;
					data.win_loss_value = 0;
				});
				return resultdb(CONSTANTS.SUCCESS, selectionsData.data);
			}

		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getCasinoTeamPosition = async (user_id, market_id, user_type = null) => {
	try {

		let selectSring;
		let condition = " where market_id='" + market_id + "'  ";
		switch (user_type) {
			case 1:
				condition += " and super_admin_id=" + user_id + "";
				selectSring = " ,sum(super_admin_win_loss)  as win_loss_value";
				break;
			case 2:
				condition += " and admin_id= " + user_id + "";
				selectSring = " ,sum(admin_win_loss)  as win_loss_value";
				break;
			case 3:
				condition += " and super_master_id= " + user_id + "";
				selectSring = " ,sum(super_master_win_loss)  as win_loss_value";
				break;
			case 4:
				condition += " and master_id= " + user_id + "";
				selectSring = " ,sum(master_win_loss)  as win_loss_value";
				break;
			case 5:
				condition += " and agent_id= " + user_id + "";
				selectSring = " ,sum(agent_win_loss)  as win_loss_value";
				break;
			default:
				condition += " and user_id= " + user_id + "";
				selectSring = " ,unmatch_win_loss_value,sum(win_loss_value) as win_loss_value"
		}
		let query = 'select market_id,selection_id,selection_name,sort_priority ' + selectSring + ' from odds_profit_loss ' + condition + ' group by market_id,selection_id,selection_name,sort_priority,unmatch_win_loss_value,win_loss_value';
		//console.log(query);
		const pool = await poolPromise;
		const teamPositions = await pool.request()
			.query(query)

		if (teamPositions === null) {

			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {

			if (teamPositions.recordset.length > 0) {

				return resultdb(CONSTANTS.SUCCESS, teamPositions.recordset);
			} else {
				let selectionsData = await selectionService.getCasinoSelectionByMarketId(market_id);
				//console.log('hhahah',selectionsData);
				selectionsData.data.map(function (data) {
					data.market_id = data.market_id;
					data.selection_id = data.selection_id;
					data.selection_name = data.name;
					data.sort_priority = data.sort_priority;
					data.unmatch_win_loss_value = 0;
					data.win_loss_value = 0;
				});
				return resultdb(CONSTANTS.SUCCESS, selectionsData.data);
			}

		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getFancySettingById = async (selection_id, match_id) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('selection_id', sql.VarChar(50), selection_id)
			.input('match_id', sql.VarChar(50), match_id)
			.query("select is_bet_allow,bet_allow_time_before,ISNULL(session_delay,0) as session_delay,min_stack,market_admin_message,max_stack,session_max_profit,session_max_loss  from fancies where selection_id=@selection_id and match_id=@match_id AND status='A'")

		if (result.recordset === null || result.recordset.length == 0) {

			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset[0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getMatchIndiaFancy = async (data) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.Int, data.match_id)
			.query("SELECT fanc.fancyStatus,fanc.fancy_category, fanc.selection_id as SelectionId,mtch.start_date, ISNULL(CASE WHEN (disable.user_id IS NOT NULL OR disable.user_id !=0) AND fanc.market_admin_message IS NULL THEN 'BET SUSPENDED' ELSE fanc.market_admin_message END,'') as adminMessage,(CASE WHEN spt.is_bet_allow = fanc.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, 0 AS BetAllowTimeBefore, (CASE WHEN fanc.min_stack > 0 THEN fanc.min_stack ELSE usptset.min_session_stack  END) AS minStack,(CASE WHEN fanc.max_stack > 0 THEN fanc.max_stack ELSE usptset.max_session_stack END) AS maxStack, (CASE WHEN fanc.session_max_profit > 0 THEN fanc.session_max_profit ELSE usptset.session_max_profit END) AS maxProfit, fanc.name as RunnerName, fanc.session_value_yes as BackPrice1,fanc.session_size_yes as BackSize1, fanc.session_value_no as LayPrice1, fanc.session_size_no as LaySize1,'' AS inplayStatus,( SELECT fancy_score_position_json from fancy_score_positions with(nolock)  WHERE match_id=@match_id AND user_id=@user_id AND fancy_id=fanc.selection_id AND position_status ='A') as scorePostion FROM fancies fanc with(nolock) INNER JOIN matches as mtch with(nolock) ON mtch.match_id=fanc.match_id AND mtch.match_id=@match_id AND mtch.status='Y' INNER LOOP JOIN sports spt with(nolock) ON spt.sport_id=fanc.sport_id INNER LOOP JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = fanc.sport_id AND usptset.user_id=@user_id LEFT JOIN disable_match_fancies as disable with(nolock) ON disable.match_id= mtch.match_id AND disable.user_id=@user_id LEFT JOIN deactive_fancies as dfancy with(nolock) ON dfancy.match_id= mtch.match_id and dfancy.user_id = @user_id WHERE fanc.match_id=@match_id AND (fanc.status='A' OR fanc.status='C') AND fanc.result IS NULL AND fanc.fancyStatus='A' AND (dfancy.id IS NULL OR dfancy.id=0) ")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let fancyData = result.recordset;

			let fancyRedis = await exchangeService.getIndianFancyByMatchId(data.match_id);

			let fancyRedisMatch = []
			if (fancyRedis.data[0] != null) {
				fancyRedisMatch = fancyRedis.data[0].value.session;
			}
			fancyData.map(function (dbdata, i) {
				if (dbdata != null) {
					let indexOfFancyData = '';

					if (fancyRedisMatch != null) {
						indexOfFancyData = fancyRedisMatch.findIndex(x => (x.SelectionId && x.SelectionId == dbdata.SelectionId));
					} else {
						indexOfFancyData = -1;
					}

					dbdata.scorePostion = JSON.parse(dbdata.scorePostion)
					if (indexOfFancyData === -1) {
						dbdata.inplayStatus = 'CLOSE';
					} else {
						dbdata.inplayStatus = fancyRedisMatch[indexOfFancyData].GameStatus;
						dbdata.BackPrice1 = fancyRedisMatch[indexOfFancyData].BackPrice1;
						dbdata.BackSize1 = fancyRedisMatch[indexOfFancyData].BackSize1;
						dbdata.LayPrice1 = fancyRedisMatch[indexOfFancyData].LayPrice1;
						dbdata.LaySize1 = fancyRedisMatch[indexOfFancyData].LaySize1;
					}
				}
			});

			if (fancyData === null) {
				return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
			} else {
				return resultdb(CONSTANTS.SUCCESS, fancyData);
			}

		}
	} catch (error) {
		console.log("get indian session ---------------------", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getMatchIndiaFancyManual = async (data) => {
	try {
		const pool = await poolPromise;


		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.Int, data.match_id)
			.query("SELECT fanc.fancyStatus, fanc.selection_id as SelectionId,mtch.start_date, ISNULL(CASE WHEN(disable.user_id IS NOT NULL OR disable.user_id !=0) AND fanc.market_admin_message IS NULL THEN 'BET SUSPENDED' ELSE fanc.market_admin_message END,'') as adminMessage,(CASE WHEN spt.is_bet_allow = fanc.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, 0 AS BetAllowTimeBefore, (CASE WHEN fanc.min_stack > 0 THEN fanc.min_stack ELSE usptset.min_session_stack END) AS minStack,(CASE WHEN fanc.max_stack > 0 THEN fanc.max_stack ELSE  usptset.max_session_stack END) AS maxStack, (CASE WHEN fanc.session_max_profit > 0 THEN fanc.session_max_profit ELSE usptset.session_max_profit END) AS maxProfit, fanc.name as RunnerName, fanc.session_value_yes as BackPrice1,fanc.session_size_yes as BackSize1, fanc.session_value_no as LayPrice1, fanc.session_size_no as LaySize1,'' AS inplayStatus,( SELECT fancy_score_position_json from fancy_score_positions with(nolock) WHERE match_id=@match_id AND user_id=@user_id AND fancy_id=fanc.selection_id AND position_status ='A') as scorePostion FROM fancies fanc with(nolock) INNER JOIN matches as mtch with(nolock) ON mtch.match_id=fanc.match_id AND mtch.match_id=@match_id AND mtch.status='Y' INNER LOOP JOIN sports spt with(nolock) ON spt.sport_id=fanc.sport_id INNER LOOP JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = fanc.sport_id AND usptset.user_id=@user_id LEFT JOIN disable_match_fancies as disable with(nolock) ON disable.match_id= mtch.match_id AND disable.user_id=@user_id LEFT JOIN deactive_fancies as dfancy with(nolock) ON dfancy.match_id= mtch.match_id and dfancy.user_id =  @user_id WHERE fanc.match_id=@match_id AND (fanc.status='A' OR fanc.status='C') AND fanc.result IS NULL AND fanc.fancyStatus IN('M','MM','MK','ML') AND (dfancy.id IS NULL OR dfancy.id=0)")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let fancyData = result.recordset;

			let fancyRedis = await exchangeService.getManualIndianFancyByMatchId(data.match_id);
			let fancyRedisMatch = []
			if (fancyRedis.data[0] != null) {
				fancyRedisMatch = fancyRedis.data[0].value.session;
			}

			fancyData.map(function (dbdata, i) {
				if (dbdata != null) {
					let indexOfFancyData = '';
					if (fancyRedisMatch != null) {
						indexOfFancyData = fancyRedisMatch.findIndex(x => (x.SelectionId && x.SelectionId == dbdata.SelectionId));
					} else {
						indexOfFancyData = -1;
					}
					dbdata.scorePostion = JSON.parse(dbdata.scorePostion)
					if (indexOfFancyData === -1) {
						dbdata.inplayStatus = 'CLOSE';
					} else {
						dbdata.inplayStatus = fancyRedisMatch[indexOfFancyData].GameStatus;
						dbdata.BackPrice1 = fancyRedisMatch[indexOfFancyData].BackPrice1;
						dbdata.BackSize1 = fancyRedisMatch[indexOfFancyData].BackSize1;
						dbdata.LayPrice1 = fancyRedisMatch[indexOfFancyData].LayPrice1;
						dbdata.LaySize1 = fancyRedisMatch[indexOfFancyData].LaySize1;
					}
				}
			});

			if (fancyData === null) {
				return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
			} else {
				return resultdb(CONSTANTS.SUCCESS, fancyData);
			}

		}
	} catch (error) {
		console.log("manual session error ------------------------------------", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let matchResult = async (data) => {
	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('sport_id', sql.Int, data.sport_id)
			.input('match_id', sql.BigInt, data.match_id)
			.query("select TOP 1 mrkt.card_data from cassino_matches as mtch join cassino_markets as mrkt ON mrkt.match_id=mtch.match_id where mtch.sport_id=@sport_id AND mtch.match_id=@match_id and mtch.is_completed='Y' AND mrkt.card_data IS NOT NULL order by mtch.id desc");
		if (result.recordsets.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			let tempData = [];
			let selectionsData = result.recordsets[0];
			for (let i in selectionsData) {
				let cardData = JSON.parse(selectionsData[i].card_data);
				delete selectionsData[i].card_data;
				for (let j in cardData) {
					selectionsData[i].match_id = cardData[0].roundId;
					selectionsData[i].indexCard = cardData[0].indexCard;
					if (data.sport_id == CONSTANTS.BETFAIR_SPORT_ANDER_BAHAR_D) {
						selectionsData[i].indexCard2 = cardData[0].indexCard2;
					}

					let marketRunner = cardData[0].marketRunner;


					for (let k in marketRunner) {
						let winnerName = marketRunner[k].name;

						selectionsData[i].winner_desc = marketRunner[k].resDesc ? marketRunner[k].resDesc : '';


						delete marketRunner[k].type;
						delete marketRunner[k].back;
						delete marketRunner[k].lay;
						delete marketRunner[k].sortPriority;
						delete marketRunner[k].pl;
						let status = marketRunner[k].status;

						if (status == 'WINNER') {
							let winnerString = '';

							if (winnerName == 'Andar') {
								winnerString = winnerName.replace('Andar', 'A');
							} else if (winnerName == 'Bahar') {
								winnerString = winnerName.replace('Bahar', 'B');
							}
							else if (winnerName == 'HIGHER') {
								winnerString = winnerName.replace('HIGHER', 'H');
							}
							else if (winnerName == 'SNAP') {
								winnerString = winnerName.replace('SNAP', 'S');
							}
							else if (winnerName == 'LOWER') {
								winnerString = winnerName.replace('LOWER', 'L');
							}
							else if (winnerName == '7Up') {
								winnerString = winnerName.replace('7Up', 'U');
							}
							else if (winnerName == '7Down') {
								winnerString = winnerName.replace('7Down', 'D');
							}
							else if (winnerName == 'Under Pasa') {
								winnerString = winnerName.replace('Under Pasa', 'U');
							}
							else if (winnerName == 'Over Pasa') {
								winnerString = winnerName.replace('Over Pasa', 'O');
							}
							else if (winnerName == 'Tiger') {
								winnerString = winnerName.replace('Tiger', 'T');
							}
							else if (winnerName == 'Dragon') {
								winnerString = winnerName.replace('Dragon', 'D');
							}
							else if (winnerName == 'Lion') {
								winnerString = winnerName.replace('Lion', 'L');
							}
							else if (data.sport_id == 6669 && winnerName == 'Player') {
								winnerString = winnerName.replace('Player', 'P');
							}
							else if (winnerName == 'Banker') {
								winnerString = winnerName.replace('Banker', 'B');
							}
							else if (!isNaN(winnerName)) {
								winnerString = winnerName;
							}
							else {
								winnerString = winnerName.replace('Player ', '');
							}

							selectionsData[i].winner = winnerString;
							marketRunner[k].win = 1;
						} else {
							marketRunner[k].win = 0;
						}
					}
					selectionsData[i].marketRunner = JSON.stringify(marketRunner);
					//console.log(marketRunner); 
				}
			}
			for (let i in selectionsData) {
				//console.log(i);
				selectionsData[i].runners = JSON.parse(selectionsData[i].marketRunner);
				delete selectionsData[i].marketRunner;
			}

			// console.log(selectionsData);
			return resultdb(CONSTANTS.SUCCESS, selectionsData[0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getMatchMarketOdds = async (data) => {
	try {
		//console.log(data);
		if (data == null || data == '') {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		}
		//console.log(data);
		let oddsData = await exchangeService.getOddsByMarketIds([data.id], data.mxyz);

		//console.log(oddsData);
		if (oddsData.data[data.id] == undefined || oddsData.data.length < 0 || oddsData.data[data.id] === null) {

			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);

		} else {
			let marketID = data.id;
			let backRateDiff = await base64Decode(data.bxyz);
			let layRateDiff = await base64Decode(data.lxyz);
			let matchVolumn = await base64Decode(data.vxyz);

			if (oddsData.data[marketID] != null) {
				oddsData.data[marketID].runners.map(function (dbdata, i) {
					if (dbdata != null) {

						dbdata.ex.availableToBack.map(function (BackPriceSize) {
							BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
							BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

						});
						dbdata.ex.availableToLay.map(function (LayPriceSize) {
							LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
							LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

						});
					}
				});
				oddsData.data[marketID].market_id = oddsData.data[marketID].marketId;
				oddsData.data[marketID].InplayStatus = oddsData.data[marketID].status ? oddsData.data[marketID].status : 'CLOSE';
				oddsData.data[marketID].runner_json = oddsData.data[marketID].runners;
				delete oddsData.data[marketID].runners;
				delete oddsData.data[marketID].marketId;
			}
			return resultdb(CONSTANTS.SUCCESS, oddsData.data[marketID]);
		}
	} catch (e) {
		console.log(e);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}


}


let getMatchOtherMarketOdds = async (data) => {
	try {
		let marketIds = [];
		let marketType = [];
		if (data.length <= 0 || data == null || data == '') {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		}
		data.forEach(function (data) {
			marketIds.push(data.id);
			marketType.push(data.mxyz);
		});

		let oddsData = await exchangeService.getOddsByMarketIds(marketIds, marketType);

		let marketResult = [];

		for (let i in data) {

			let marketID = data[i].id;

			let backRateDiff = await base64Decode(data[i].bxyz);
			let layRateDiff = await base64Decode(data[i].lxyz);
			let matchVolumn = await base64Decode(data[i].vxyz);

			if (oddsData.data[marketID] != null) {
				oddsData.data[marketID].runners.map(function (dbdata, i) {
					if (dbdata != null) {

						dbdata.ex.availableToBack.map(function (BackPriceSize) {
							BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
							BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

						});
						dbdata.ex.availableToLay.map(function (LayPriceSize) {
							LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
							LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

						});
					}
				});
				oddsData.data[marketID].market_id = oddsData.data[marketID].marketId;
				oddsData.data[marketID].InplayStatus = oddsData.data[marketID].status ? oddsData.data[marketID].status : 'CLOSE';
				oddsData.data[marketID].runner_json = oddsData.data[marketID].runners;
				delete oddsData.data[marketID].runners;
				delete oddsData.data[marketID].marketId;

				marketResult.push(oddsData.data[marketID]);
			}

		}

		return resultdb(CONSTANTS.SUCCESS, marketResult);

	} catch (e) {
		console.log(e);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}

let getMatchMatkaMarketList = async (data) => {
	try {
		const pool = await poolPromise;
		let conditionMatchid = "";

		console.log("SELECT  mkts.display_name as displayName , spt.name as SportName,ISNULL(mkts.market_admin_message,'') as adminMessage,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,mtch.min_bet_amount as minBetAmount,mtch.max_bet_amount as maxBetAmount, mtch.series_id, mtch.match_id, mtch.name,mtch.is_completed, mtch.start_time as start_date, mtch.end_time as end_date, mtch.draw_time as draw_date, mkts.name as marketName,spt.sport_id, (select runner_json from matka_markets where name = 'OPEN' and match_id=" + data.match_id + ") as open_runner_json, (select runner_json from matka_markets where name = 'CLOSE' and match_id=" + data.match_id + ") as close_runner_json, (select runner_json from matka_markets where name = 'JODI' and match_id=" + data.match_id + ") as jodi_runner_json, (select market_id from matka_markets where name = 'OPEN' and match_id=" + data.match_id + ") as openMarketID, (select market_id from matka_markets where name = 'CLOSE' and match_id=" + data.match_id + ") as closeMarketID, (select market_id from matka_markets where name = 'JODI' and match_id=" + data.match_id + ") as jodiMarketID, (select min_stack from matka_markets where patti_type = 'JODI' and match_id=" + data.match_id + ") as minBetAmountJodi, (select max_stack from matka_markets where patti_type = 'JODI' and match_id=" + data.match_id + ") as maxBetAmountJodi, (select top 1 min_stack from matka_markets where patti_type = 'SINGLE_AKDA' and match_id=" + data.match_id + ") as minBetAmountHaroof, (select top 1 max_stack from matka_markets where patti_type = 'SINGLE_AKDA' and match_id=" + data.match_id + ") as maxBetAmountHaroof, (select top 1 min_stack from matka_markets where patti_type = 'LOTTERY_SINGLE_AKDA' and match_id=" + data.match_id + ") as minBetAmountLottery, (select top 1 max_stack from matka_markets where patti_type = 'LOTTERY_SINGLE_AKDA' and match_id=" + data.match_id + ") as maxBetAmountLottery FROM matka_matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id  JOIN matka_markets mkts ON mkts.match_id=mtch.match_id AND mkts.match_id=" + data.match_id + " AND spt.sport_id =" + data.sport_id + "  AND mtch.match_id=" + data.match_id + "  AND mtch.status='Y' AND mtch.is_completed='N' AND spt.status='Y'");

		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.BigInt, data.match_id)
			.input('sport_id', sql.Int, data.sport_id)
			.query("SELECT  mkts.display_name as displayName , spt.name as SportName,ISNULL(mkts.market_admin_message,'') as adminMessage,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,mtch.min_bet_amount as minBetAmount,mtch.max_bet_amount as maxBetAmount, mtch.series_id, mtch.match_id, mtch.name,mtch.is_completed, mtch.start_time as start_date, mtch.end_time as end_date, mtch.draw_time as draw_date, mkts.name as marketName,spt.sport_id, (select runner_json from matka_markets where name = 'OPEN' and match_id=@match_id) as open_runner_json, (select runner_json from matka_markets where name = 'CLOSE' and match_id=@match_id) as close_runner_json, (select runner_json from matka_markets where name = 'JODI' and match_id=@match_id) as jodi_runner_json, (select market_id from matka_markets where name = 'OPEN' and match_id=@match_id) as openMarketID, (select market_id from matka_markets where name = 'CLOSE' and match_id=@match_id) as closeMarketID, (select market_id from matka_markets where name = 'JODI' and match_id=@match_id) as jodiMarketID, (select min_stack from matka_markets where patti_type = 'JODI' and match_id=@match_id) as minBetAmountJodi, (select max_stack from matka_markets where patti_type = 'JODI' and match_id=@match_id) as maxBetAmountJodi, (select top 1 min_stack from matka_markets where patti_type = 'SINGLE_AKDA' and match_id=@match_id) as minBetAmountHaroof, (select top 1 max_stack from matka_markets where patti_type = 'SINGLE_AKDA' and match_id=@match_id) as maxBetAmountHaroof, (select top 1 min_stack from matka_markets where patti_type = 'LOTTERY_SINGLE_AKDA' and match_id=@match_id) as minBetAmountLottery, (select top 1 max_stack from matka_markets where patti_type = 'LOTTERY_SINGLE_AKDA' and match_id=@match_id) as maxBetAmountLottery FROM matka_matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id  JOIN matka_markets mkts ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND spt.sport_id =@sport_id  AND mtch.match_id=@match_id  AND mtch.status='Y' AND mtch.is_completed='N' AND spt.status='Y'")
		//console.log(result.recordset);
		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			let matchMarkets = result.recordset;

			let marketID = result.recordset.map((data) => (data.sport_id));

			//let oddsData = await exchangeService.getMatkaOddsByMarketIds(marketID);
			//console.log('betfoxissue',oddsData);
			let marketRunnerJson = [];
			let selectionMatch = [];
			let openRunnerJson = [];

			for (let i in matchMarkets) {

				let matchMarketsDetails = matchMarkets[i];
				let compairMarketid = matchMarketsDetails.market_id;
				matchMarketsDetails.errorMessage = "";


				if (matchMarketsDetails.open_runner_json !== null) {
					openMarketRunnerJson = JSON.parse(matchMarketsDetails.open_runner_json);
				}
				if (matchMarketsDetails.close_runner_json !== null) {
					closeMarketRunnerJson = JSON.parse(matchMarketsDetails.close_runner_json);
				}

				if (matchMarketsDetails.jodi_runner_json !== null) {
					jodiMarketRunnerJson = JSON.parse(matchMarketsDetails.jodi_runner_json);
				}
				//hrrofRunner = openMarketRunnerJson.push(closeMarketRunnerJson);
				matchMarkets[i].open_market = { ...data, runner_json: openMarketRunnerJson, marketId: matchMarketsDetails.openMarketID };
				matchMarkets[i].close_market = { ...data, runner_json: closeMarketRunnerJson, marketId: matchMarketsDetails.closeMarketID };
				matchMarkets[i].jodi_market = { ...data, runner_json: jodiMarketRunnerJson, marketId: matchMarketsDetails.jodiMarketID };
				delete matchMarketsDetails.openMarketID;
				delete matchMarketsDetails.closeMarketID;
				delete matchMarketsDetails.jodiMarketID;
				delete matchMarketsDetails.open_runner_json;
				delete matchMarketsDetails.close_runner_json;
				delete matchMarketsDetails.jodi_runner_json;
			}
			//console.log(matchMarkets);
			// let newdata = matchMarkets.map((data) => (
			// 	{ ...data, open_runner_json: data.open_runner_json, marketId: data.openMarketID, close_runner_json: data.close_runner_json, marketId: data.closeMarketID, jodi_runner_json: data.jodi_runner_json, marketId: data.jodiMarketID }
			// ));
			return resultdb(CONSTANTS.SUCCESS, matchMarkets[0]);

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getMatchTitliMarketList = async (data) => {
	try {
		const pool = await poolPromise;
		let currentTime = Math.floor(Date.now() / 1000);

		console.log("SELECT  mkts.display_name as displayName , spt.name as SportName,ISNULL(mkts.market_admin_message,'') as adminMessage,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,spt.match_stack,mkts.min_stack as minBetAmount,mkts.max_stack as maxBetAmount, mtch.series_id, mtch.match_id, mtch.name,mtch.is_completed, mtch.start_time as start_date, mtch.end_time as end_date, mtch.draw_time as draw_date, mtdi.id as drawId, mkts.name as marketName,spt.sport_id, mkts.market_id, mkts.runner_json as titli_runner_json FROM matka_matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id JOIN matka_titli_draw_images as mtdi ON mtdi.image = mtch.winner_name JOIN matka_markets mkts ON mkts.match_id=mtch.match_id AND spt.sport_id =" + data.sport_id + " WHERE mtch.status='Y' AND mtch.is_completed='N' AND mtch.start_time <= " + currentTime + " AND mtch.end_time >= " + currentTime + "  AND spt.status='Y'");

		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('sport_id', sql.Int, data.sport_id)
			.input('startTime', sql.Int, currentTime)
			.input('endTime', sql.Int, currentTime)
			.query("SELECT 1 as showTimer, mkts.display_name as displayName , spt.name as SportName,ISNULL(mkts.market_admin_message,'') as adminMessage,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,spt.match_stack,mkts.min_stack as minBetAmount,mkts.max_stack as maxBetAmount, mtch.series_id, mtch.match_id, mtch.name,mtch.is_completed, mtch.start_time as start_date, mtch.end_time as end_date, mtch.draw_time as draw_date, mtdi.id as drawId, mkts.name as marketName,spt.sport_id, mkts.market_id, mkts.runner_json as titli_runner_json FROM matka_matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id JOIN matka_titli_draw_images as mtdi ON mtdi.image = mtch.winner_name JOIN matka_markets mkts ON mkts.match_id=mtch.match_id AND spt.sport_id =@sport_id WHERE mtch.status='Y' AND mtch.is_completed='N' AND mtch.start_time <= @startTime AND mtch.end_time >= @endTime  AND spt.status='Y'")

		if (result.recordset === null || result.recordset.length == 0) {

			//return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
			let lastRecodQueyr = "SELECT TOP 1  mtch.match_id FROM matka_matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id  JOIN matka_markets mkts ON mkts.match_id=mtch.match_id AND spt.sport_id =2225  order by  mtch.id desc";
			const latRecord = await pool.request().query(lastRecodQueyr);

			if (latRecord.recordset[0] === null || latRecord.recordset[0].length == 0) {
				return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
			} else {

				let getLastMatchId = latRecord.recordset;
				getLastMatchId = getLastMatchId[0].match_id

				const result2 = await pool.request()
					.input('user_id', sql.Int, data.id)
					.input('sport_id', sql.Int, data.sport_id)
					.input('match_id', sql.BigInt, getLastMatchId)
					.query("SELECT 0 as showTimer, mkts.display_name as displayName , spt.name as SportName,ISNULL(mkts.market_admin_message,'') as adminMessage,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,spt.match_stack,mkts.min_stack as minBetAmount,mkts.max_stack as maxBetAmount, mtch.series_id, mtch.match_id, mtch.name,mtch.is_completed, mtch.start_time as start_date, mtch.end_time as end_date, mtch.draw_time as draw_date, mtdi.id as drawId, mkts.name as marketName,spt.sport_id, mkts.market_id, mkts.runner_json as titli_runner_json FROM matka_matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id JOIN matka_titli_draw_images as mtdi ON mtdi.image = mtch.winner_name JOIN matka_markets mkts ON mkts.match_id=mtch.match_id AND spt.sport_id =@sport_id WHERE mtch.match_id=@match_id AND spt.status='Y'");


				let matchMarkets = result2.recordset;

				let matchMarketsDetails = matchMarkets[0];
				matchMarketsDetails.errorMessage = "";
				let MarketSelection = await exchangeService.getMarketTitliSelection(matchMarketsDetails.match_id, matchMarketsDetails.market_id, data.id, matchMarketsDetails.drawId);

				let MarketSelectionDb = SearchArray = [];
				if (MarketSelection.data[0] != null) {
					MarketSelectionDb = MarketSelection.data;
				}

				if (matchMarketsDetails.titli_runner_json !== null) {
					let titliMarketRunnerJson = JSON.parse(matchMarketsDetails.titli_runner_json);

					titliMarketRunnerJson.map(function (dbdata, i) {
						if (dbdata != null) {

							let indexOfFancyData = '';
							if (MarketSelectionDb != null) {
								indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
							} else {
								indexOfFancyData = -1;
							}

							if (indexOfFancyData === -1) {
								dbdata.totalStake = 0;
							} else {
								dbdata.totalStake = MarketSelectionDb[indexOfFancyData].totalStack;
								dbdata.winLossAmount = MarketSelectionDb[indexOfFancyData].winLossAmount;
							}
						}
					});

					matchMarkets[0].runner_json = titliMarketRunnerJson;
				}
				matchMarkets[0].drawId = matchMarketsDetails.drawId;
				matchMarkets[0].open_market = { ...data, marketId: matchMarketsDetails.market_id };

				delete matchMarketsDetails.titliMarketID;
				delete matchMarketsDetails.titli_runner_json;

				return resultdb(CONSTANTS.SUCCESS, matchMarkets[0]);
			}
		} else {
			let matchMarkets = result.recordset;

			let matchMarketsDetails = matchMarkets[0];
			matchMarketsDetails.errorMessage = "";
			let MarketSelection = await exchangeService.getMarketTitliSelection(matchMarketsDetails.match_id, matchMarketsDetails.market_id, data.id, matchMarketsDetails.drawId);

			//let MarketSelection = await exchangeService.getMarketTitliSelectionPL(matchMarketsDetails.match_id, matchMarketsDetails.market_id, data.id, matchMarketsDetails.drawId);

			let MarketSelectionDb = SearchArray = [];
			if (MarketSelection.data[0] != null) {
				MarketSelectionDb = MarketSelection.data;
			}


			if (matchMarketsDetails.titli_runner_json !== null) {
				let titliMarketRunnerJson = JSON.parse(matchMarketsDetails.titli_runner_json);

				titliMarketRunnerJson.map(function (dbdata, i) {
					if (dbdata != null) {

						let indexOfFancyData = '';
						if (MarketSelectionDb != null) {
							indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
						} else {
							indexOfFancyData = -1;
						}

						if (indexOfFancyData === -1) {
							dbdata.totalStake = 0;
						} else {
							//dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
							//dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
							dbdata.totalStake = MarketSelectionDb[indexOfFancyData].totalStack;
							dbdata.winLossAmount = MarketSelectionDb[indexOfFancyData].winLossAmount;
						}
					}
				});

				matchMarkets[0].runner_json = titliMarketRunnerJson;
			}
			matchMarkets[0].drawId = matchMarketsDetails.drawId;
			matchMarkets[0].open_market = { ...data, marketId: matchMarketsDetails.market_id };

			delete matchMarketsDetails.titliMarketID;
			delete matchMarketsDetails.titli_runner_json;

			return resultdb(CONSTANTS.SUCCESS, matchMarkets[0]);

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getMatkaTempBets = async (match_id, id) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int(10), id)
			.input('match_id', sql.VarChar(50), match_id)
			.query("select mtb.id,mtb.user_id,mtb.match_id,mtb.market_name,mtb.stack,mtb.selection_id,mtb.selection_name as selectionName,patti_type from matka_temp_bet as mtb where mtb.user_id=@user_id and mtb.match_id=@match_id ORDER BY mtb.id DESC")

		if (result.recordset === null || result.recordset.length == 0) {

			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}

let getMatkaBets = async (match_id, id) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int(10), id)
			.input('match_id', sql.VarChar(50), match_id)
			.query("select id,user_id,match_id,market_name,stack,selection_id,selection_name as selectionName,patti_type from matka_bets_odds where user_id=@user_id and match_id=@match_id ORDER BY id desc")
		console.log(result.recordset);
		if (result.recordset === null || result.recordset.length == 0) {

			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}


let deleteMatkaTempBets = async (tempbetid, amount, id) => {

	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('pUserId', sql.Int(10), id)
			.input('pBetId', sql.BigInt(20), tempbetid)
			.input('pLiabilityForBlance', sql.Int(10), amount)
			.input('pAllBets', sql.Int(10), 0)
			.execute('SP_DELETE_MATKA_TEMP_BET');
		//.query("delete matka_temp_bet where user_id=@user_id and id =@tempbetid ")
		//console.log(result);
		if (result === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}

let deleteMatkaAllTempBets = async (match_id, amount, id) => {

	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('pUserId', sql.Int(10), id)
			.input('pBetId', sql.BigInt(20), match_id)
			.input('pLiabilityForBlance', sql.Int(10), amount)
			.input('pAllBets', sql.Int(10), 1)
			.execute('SP_DELETE_MATKA_TEMP_BET');
		//.query("delete matka_temp_bet where user_id=@user_id and match_id =@match_id ")

		if (result === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}

let getTitliBets = async (match_id, market_id, sport_id, id) => {
	try {
		const pool = await poolPromise;
		console.log("select id,user_id,match_id,market_name,stack,selection_id,selection_name as selectionName,patti_type from matka_bets_odds where user_id=84 and match_id=1606957410880 and sport_id=2225");
		const result = await pool.request()
			.input('user_id', sql.Int(10), id)
			.input('match_id', sql.VarChar(50), match_id)
			.input('market_id', sql.VarChar(50), market_id)
			.input('sport_id', sql.VarChar(50), sport_id)
			.query("select selection_id, sum(stack) as totalStack from matka_bets_odds where user_id=@user_id and match_id=@match_id and sport_id=@sport_id GROUP BY selection_id")
		console.log(result.recordset);
		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}

let getTitliResult = async (sport_id, id) => {
	try {
		const pool = await poolPromise;
		let todayTime = new Date(new Date().setHours(0, 0, 0, 0));
		let startTime = todayTime.getTime() / 1000;
		let endTime = Math.floor(Date.now() / 1000);
		const result = await pool.request()
			.input('user_id', sql.Int(10), id)
			.input('sport_id', sql.VarChar(50), sport_id)
			.query("select name,  mtdi.id as drawId, winner_name, start_time, draw_time from matka_matches  as mtch JOIN matka_titli_draw_images as mtdi ON mtdi.image = mtch.winner_name where sport_id=@sport_id AND start_time >=" + startTime + " AND end_time <= " + endTime + " order by mtch.id desc")
		///console.log("select name, mtdi.id as drawId, winner_name, start_time, draw_time from matka_matches  as mtch JOIN matka_titli_draw_images as mtdi ON mtdi.image = mtch.winner_name where sport_id="+sport_id+" AND start_time >=" + startTime + " AND end_time <= " + endTime + " order by id desc");
		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}

let titliResultDeclare = async (sport_id, market_id, match_id, id, matchDetail) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('pSportsID', sql.Int, sport_id)
			.input('pMatchID', sql.VarChar(50), match_id)
			.input('pMarketID', sql.VarChar(50), market_id)
			.input('pSelectionID', sql.Int, matchDetail.selection_id - 1)
			.input('pSportsNM', sql.VarChar(50), matchDetail.sportName)
			.input('pMatchNM', sql.VarChar(50), matchDetail.matchName)
			.input('pMarketNM', sql.VarChar(50), matchDetail.marketName)
			.input('pSelectionNM', sql.VarChar(50), matchDetail.winner_name)
			.input('pSuperAdminCommissionType', sql.Int, 0)
			.input('pSeriesID', sql.Int, matchDetail.series_id)
			.execute('SP_SET_RESULT_MATKA_MARKETS');
		//console.log(result.recordset);
		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}

let thimbleUserLog = async (stack, id) => {
	try {
		const pool = await poolPromise;
		let matchId = globalFunction.currentDateTimeStamp();
		let currentdate = globalFunction.currentDateTimeStamp();
		let status = 'P';
		let resultId = Math.floor(1 + Math.random() * 3);
		let marketId = Math.floor(1000000000000 + Math.random() * 9000000000000)
		const saveMatkaBets = await pool.request()
			.input('pUserid', sql.Int, id)
			.input('pResultId', sql.VarChar(50), resultId)
			.input('pMarketId', sql.VarChar(50), '1.' + marketId)
			.input('pStack', sql.Int, stack)
			.input('pMatchId', sql.Int, matchId)
			.input('pStatus', sql.VarChar(50), status)
			.input('currentdate', sql.VarChar(50), currentdate)
			.query(" insert into thimble_user_log (user_id, match_id, market_id,result_id,stack, status, created_at) VALUES(@pUserid, @pMatchId, @pMarketId, @pResultId, @pStack, @pStatus, @currentdate)");

		return resultdb(CONSTANTS.SUCCESS, { 'match_id': matchId, 'result_id': resultId });

	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getThimbleBetData = async (match_id) => {

	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('match_id', sql.Int(10), match_id)
			.query("select * from thimble_user_log where match_id=@match_id")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset[0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}
let saveThimbleBet = async (result_id, stack, id) => {
	try {
		const pool = await poolPromise;
		let matchId = globalFunction.currentDateTimeStamp();
		let currentdate = globalFunction.currentDateTimeStamp();
		const saveMatkaBets = await pool.request()
			.input('pUserid', sql.Int, id)
			.input('pResultId', sql.VarChar(50), result_id)
			.input('pStack', sql.Int, stack)
			.input('pMatchId', sql.Int, matchId)
			.input('pStatus', sql.VarChar(50), status)
			.input('currentdate', sql.VarChar(50), currentdate)
			.query(" insert into thimble_user_log (user_id, match_id,result_id,stack, status, created_at) VALUES(@pUserid, @pMatchId, @pResultId, @pStack, @pStatus, @currentdate)");

		return resultdb(CONSTANTS.SUCCESS, { 'match_id': matchId });

	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let saveThimbleMatchMarketSelectionData = async (getThimbleBetData) => {
	try {
		const pool = await poolPromise;
		let market_id = getThimbleBetData.data.market_id;
		let result_id = getThimbleBetData.data.result_id;
		let matchId = getThimbleBetData.data.match_id;
		let amount = getThimbleBetData.data.stack;
		let sport_id = 444;
		let series_id = 4444444;
		let matka_match_type = 'Thimble';
		let match_name = 'Thimble';

		const getThimbleStack = await pool.request()
			.input('match_id', sql.Int(10), matchId)
			.query("select * from user_default_settings where sport_id=" + sport_id + " ")

		const getThimbleBhav = await pool.request()
			.input('match_id', sql.Int(10), matchId)
			.query("select * from matka_bhavs where sport_id=" + sport_id + " ")

		let marketBhav = getThimbleBhav.recordset[0].bhav;
		let minStack = getThimbleStack.recordset[0].min_match_stack;
		let maxStack = getThimbleStack.recordset[0].max_match_stack;
		let currentdate = globalFunction.currentDateTimeStamp();

		const saveThimbleMatch = await pool.request()
			.input('pSportId', sql.Int(10), sport_id)
			.input('pSeriesId', sql.Int(10), series_id)
			.input('pMatchId', sql.Int(10), matchId)
			.input('pMatchType', sql.VarChar(50), matka_match_type)
			.input('pMatchName', sql.VarChar(50), match_name)
			.input('pMinStack', sql.Int(10), minStack)
			.input('pMaxStack', sql.Int(10), maxStack)
			.input('currentdate', sql.VarChar(50), currentdate)
			.query(" insert into matka_matches (sport_id, series_id, match_id, matka_match_type, name, match_date, start_time, end_time, draw_time, min_bet_amount, max_bet_amount, created_by, created_at, updated_at) VALUES(@pSportId, @pSeriesId, @pMatchId, @pMatchType, @pMatchName, @currentdate, @currentdate, @currentdate, @currentdate, @pMinStack, @pMaxStack, 1, @currentdate, @currentdate)");


		let selectionData = [{ "selectionId": "1", "SelectionName": "Glass One", "type": "main", "back": [{ "price": "" + marketBhav + "", "size": 0 }], "sortPriority": 1, "pl": 0, "status": "THIMBLE", "resDesc": "" }, { "selectionId": "2", "SelectionName": "Glass Two", "type": "main", "back": [{ "price": "" + marketBhav + "", "size": 0 }], "sortPriority": 1, "pl": 0, "status": "THIMBLE", "resDesc": "" }, { "selectionId": "3", "SelectionName": "Glass Three", "type": "main", "back": [{ "price": "" + marketBhav + "", "size": 0 }], "sortPriority": 1, "pl": 0, "status": "THIMBLE", "resDesc": "" }];

		const saveThimbleMarket = await pool.request()
			.input('pSportId', sql.Int(10), sport_id)
			.input('pSeriesId', sql.Int(10), series_id)
			.input('pMatchId', sql.Int(10), matchId)
			.input('pMarketId', sql.VarChar(50), market_id)
			.input('pMatchName', sql.VarChar(50), match_name)
			.input('pMarketBhav', sql.Int(10), marketBhav)
			.input('pMinStack', sql.Int(10), minStack)
			.input('pMaxStack', sql.Int(10), maxStack)
			.input('pRunnerJson', sql.Text, JSON.stringify(selectionData))
			.input('pResultId', sql.Int(10), result_id)
			.input('currentdate', sql.VarChar(50), currentdate)
			.query(" insert into matka_markets (sport_id, series_id, match_id, market_id, name, display_name, patti_type, market_bhav, match_date, runner_json, market_runner_count, bet_allow_time_before, min_stack, max_stack, created_by, created_at, updated_at) VALUES(@pSportId, @pSeriesId, @pMatchId, @pMarketId, @pMatchName, @pMatchName, 'THIMBLE', @pMarketBhav, @currentdate, @pRunnerJson, 3, '10', @pMinStack, @pMaxStack, 1, @currentdate, @currentdate)");



		for (let s = 0; s < 3; s++) {
			let selectionName = '';
			let selectionId = '';
			if (s == 0) {
				selectionName = 'Glass One';
				selectionId = 1;
			} else if (s == 1) {
				selectionName = 'Glass Two';
				selectionId = 2;
			} else if (s == 2) {
				selectionName = 'Glass Three';
				selectionId = 3;
			}

			console.log("insert into matka_market_selections (match_id, market_id, name, selection_id, sort_priority, created_at, updated_at) VALUES(@pMatchId, @pMarketId, " + selectionName + ", " + s + ", " + s + ", @currentdate, @currentdate)");

			const saveThimbleSelection = await pool.request()
				.input('pMatchId', sql.Int(10), matchId)
				.input('pMarketId', sql.VarChar(50), market_id)
				.input('currentdate', sql.VarChar(50), currentdate)
				.query("insert into matka_market_selections (match_id, market_id, name, selection_id, sort_priority, created_at, updated_at) VALUES(@pMatchId, @pMarketId, '" + selectionName + "', '" + selectionId + "', " + selectionId + ", @currentdate, @currentdate)");
		}

		return resultdb(CONSTANTS.SUCCESS, { 'match_id': matchId });

	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getTitliLastResult = async (sport_id, match_id, market_id, id) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('id', sql.Int(10), id)
			.input('market_id', sql.VarChar(50), market_id)
			.input('match_id', sql.VarChar(50), match_id)
			.input('sport_id', sql.Int(10), sport_id)
			.query("select sum(amount) as winLossAmount from account_statements where user_id=@id AND match_id=@match_id AND market_id=@market_id")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset[0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getMatkaTeamPosition = async (user_id, market_id, user_type = null) => {
	try {

		let selectSring;
		let condition = " where market_id='" + market_id + "'  ";
		switch (user_type) {
			case 1:
				condition += " and super_admin_id=" + user_id + "";
				selectSring = " ,sum(super_admin_win_loss)  as win_loss_value";
				break;
			case 2:
				condition += " and admin_id= " + user_id + "";
				selectSring = " ,sum(admin_win_loss)  as win_loss_value";
				break;
			case 3:
				condition += " and super_master_id= " + user_id + "";
				selectSring = " ,sum(super_master_win_loss)  as win_loss_value";
				break;
			case 4:
				condition += " and master_id= " + user_id + "";
				selectSring = " ,sum(master_win_loss)  as win_loss_value";
				break;
			case 5:
				condition += " and agent_id= " + user_id + "";
				selectSring = " ,sum(agent_win_loss)  as win_loss_value";
				break;
			default:
				condition += " and user_id= " + user_id + "";
				selectSring = " ,unmatch_win_loss_value,sum(win_loss_value) as win_loss_value"
		}
		let query = 'select market_id,selection_id,selection_name,sort_priority ' + selectSring + ' from odds_profit_loss ' + condition + ' group by market_id,selection_id,selection_name,sort_priority,unmatch_win_loss_value,win_loss_value';
		//console.log(query);
		const pool = await poolPromise;
		const teamPositions = await pool.request()
			.query(query)

		if (teamPositions === null) {

			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {

			if (teamPositions.recordset.length > 0) {

				return resultdb(CONSTANTS.SUCCESS, teamPositions.recordset);
			} else {
				let selectionsData = await selectionService.getCasinoSelectionByMarketId(market_id);
				//console.log('hhahah',selectionsData);
				selectionsData.data.map(function (data) {
					data.market_id = data.market_id;
					data.selection_id = data.selection_id;
					data.selection_name = data.name;
					data.sort_priority = data.sort_priority;
					data.unmatch_win_loss_value = 0;
					data.win_loss_value = 0;
				});
				return resultdb(CONSTANTS.SUCCESS, selectionsData.data);
			}

		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let gatDataByMatkaMarketId = async (data) => {
	try {
		const pool = await poolPromise;

		const result = await pool.request()
			.input('user_id', sql.VarChar(50), data.id)
			.input('marketId', sql.VarChar(50), data.market_id)
			.input('matchId', sql.VarChar(50), data.match_id)
			.query("select mkts.patti_type,ISNULL(mkts.market_bhav,0) as odds, spt.sport_id,(CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) AS  backRateDiff,mtch.is_bet_allow as matchBetAllow, (CASE WHEN mkts.bet_delay > spt.bet_delay THEN mkts.bet_delay ELSE spt.bet_delay END ) AS bet_delay,(CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) AS  layRateDiff, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, CASE  WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END AS BetAllowTimeBefore,spt.min_odds_limit,spt.max_odss_limit,mtch.start_time as start_date, mtch.draw_time as drawTime, mkts.series_id,mkts.match_id,mkts.market_id,mkts.name as marketName,ISNULL(mkts.max_bet_liability,0) as max_bet_liability,mkts.is_result_declared,mkts.status,mkts.is_visible  from matka_markets mkts INNER JOIN  matka_matches mtch ON mtch.match_id=mkts.match_id and mtch.match_id=@matchId INNER JOIN sports spt ON mkts.sport_id = spt.sport_id WHERE mkts.market_id=@marketId AND mkts.match_id=@matchId AND (Select dbo.check_match_deactive_for_user(mkts.match_id,@user_id))=0 AND (select dbo.check_sports_deactive_for_user(spt.sport_id,@user_id))=0 AND mtch.status='Y' AND mtch.is_completed='N' AND spt.status='Y'")
		//.query("select spt.sport_id,mtch.is_bet_allow as matchBetAllow,mtch.min_bet_amount as minBetAllowAmount,mtch.max_bet_amount as maxBetAllowAmount, (CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) AS  layRateDiff, (CASE WHEN mkts.bet_delay > spt.bet_delay THEN mkts.bet_delay ELSE spt.bet_delay END ) AS bet_delay, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, (CASE WHEN mtch.min_bet_amount <= @betamount THEN 'Y' ELSE 'N' END) AS minBetAllow, (CASE WHEN mtch.max_bet_amount >= @betamount THEN 'Y' ELSE 'N' END) AS maxBetAllow,spt.min_odds_limit,spt.max_odss_limit, mkts.series_id,mkts.match_id,mkts.market_id,mtch.start_time,mtch.end_time,mkts.name as marketName,mkts.max_bet_liability,mkts.is_result_declared,mkts.status,mkts.is_visible from matka_markets mkts INNER JOIN  matka_matches mtch ON mtch.match_id=mkts.match_id and mtch.match_id=@matchId INNER JOIN sports spt ON mkts.sport_id = spt.sport_id WHERE mkts.market_id=@marketId AND mkts.match_id=@matchId AND mtch.status='A' AND mtch.is_completed='N' AND spt.status='Y'")
		//console.log(result);

		if (result.recordset === null || result.recordset.length == 0) {

			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset[0]);
		}

	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getSportIdByMatchId = async (match_id) => {

	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('matchId', sql.VarChar(50), match_id)
			.query("select sport_id from matka_matches where match_id=@matchId")

		if (result === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset[0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getMatchCasinoMarketListWorliMatka = async (data) => {
	try {
		const pool = await poolPromise;
		let conditionMatchid = "";


		let matchNewQuery = "select TOP 1 match_id from cassino_matches where match_id  >=" + data.match_id + " AND sport_id=" + data.sport_id + " ORDER BY id DESC";

		const newRecord = await pool.request().query(matchNewQuery);
		let matchIDNew = newRecord.recordset[0].match_id;
		conditionMatchid = matchIDNew;


		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.BigInt, conditionMatchid)
			.input('sport_id', sql.Int, data.sport_id)
			.query("SELECT  '' as timer, '' as indexCard, mkts.display_name as displayName , (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore, spt.name as SportName,0 as favMatchID,ISNULL(mkts.market_admin_message,'') as adminMessage,(CASE WHEN mkts.min_stack > usptset.min_match_stack THEN mkts.min_stack ELSE usptset.min_match_stack END) AS marketMinStack,(CASE WHEN mkts.max_stack > usptset.max_match_stack THEN mkts.max_stack ELSE usptset.max_match_stack END) AS marketMaxStack,(CASE WHEN usptset.max_profit > mkts.max_market_profit THEN mkts.max_market_profit ELSE usptset.max_profit END) AS marketMaxProfit, (CASE WHEN mkts.min_loss > usptset.max_loss THEN mkts.min_loss ELSE usptset.max_loss END) AS marketMaxLoss,(CASE WHEN mkts.max_market_liability < usptset.max_exposure THEN mkts.max_market_liability ELSE usptset.max_exposure END) AS marketMaxExposure,(CASE WHEN mkts.min_liability > usptset.min_exposure THEN mkts.min_liability ELSE usptset.min_exposure END) AS marketMinExposure,'' AS InplayStatus, '' AS MainTV,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,(CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END )  as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,(CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) AS  backRateDiff,(CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) AS  layRateDiff,mtch.series_id, mtch.match_id, mtch.name,mtch.is_completed, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM cassino_matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id  JOIN cassino_markets mkts ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name !='Match Odds' INNER JOIN user_setting_sport_wise as usptset ON usptset.sport_id = spt.sport_id AND usptset.user_id=@user_id where NOT EXISTS (SELECT 1 from deactive_sports WHERE deactive_sports.sport_id =@sport_id  AND deactive_sports.user_id =@user_id) AND spt.sport_id =@sport_id  AND mtch.match_id=@match_id  AND mtch.status='Y' AND spt.status='Y'")

		if (result.recordsets[0] === null || result.recordsets[0].length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			let matchMarkets = result.recordsets[0];
			for (let k = 0; k < matchMarkets.length; k++) {

				let marketID = data.sport_id + matchMarkets[k].market_id;
				let marketId = matchMarkets[k].market_id;
				marketID = marketID.split('_');
				marketID = marketID[0];

				let oddsData = await exchangeService.getCasinoOddsByMarketIds([marketID]);

				let marketRunnerJson = [];

				let matchMarketsDetails = matchMarkets[k];
				let compairMarketid = matchMarketsDetails.market_id;
				matchMarketsDetails.errorMessage = "";

				let MarketSelection = await exchangeService.getCasinoMarketSelection(matchMarketsDetails.match_id, matchMarketsDetails.market_id, data.id);
				if (matchMarketsDetails.runner_json !== null && (oddsData.data == null || oddsData.data.length == undefined || oddsData.data.length == 0)) {

					let runnerJson = JSON.parse(matchMarketsDetails.runner_json);

					let marktRunner = runnerJson[0].marketRunner;

					matchMarkets[k].indexCard = [];
					matchMarkets[k].timer = 0;
					matchMarkets[k].errorMessage = CONSTANTS.CASION_ERROR_MESSAGE;
					for (let o in marktRunner) {

						let selectionID = marktRunner[o].id;
						selectionMatch = MarketSelection.data.filter(function (data) {
							if (data.selection_id == selectionID) {
								marktRunner[o].WinAndLoss = data.win_loss_value;
								marktRunner[o].back = [];
								marktRunner[o].lay = [];
								marktRunner[o].cards = [];
							}
						});
						let runnerJs = marktRunner[o];
						runnerJs.superStatus = 'SUSPENDED';
						marketRunnerJson.push(runnerJs);
					}
				}
				else {

					let runnerJson = oddsData.data;
					runnerJson = runnerJson.find(({ roundId }) => roundId === marketId);


					/* runnerJson.map(function (dbdata, i) {
						if (dbdata != null) {
							if (dbdata.roundId === marketId ) {
								dbdata =dbdata;
							} else{
								dbdata = null;
							}
						}
					});
					 */
					console.log('roundId ----- ', marketId);
					let roundId = runnerJson.roundId;
					let backRateDiff = matchMarketsDetails.backRateDiff;
					let layRateDiff = matchMarketsDetails.layRateDiff;
					let matchVolumn = matchMarketsDetails.matchVolumn > 0 ? matchMarketsDetails.matchVolumn : 1;

					matchMarkets[k].indexCard = runnerJson.indexCard;
					matchMarkets[k].timer = runnerJson.timer;
					if (roundId != compairMarketid) {
						matchMarkets[k].errorMessage = CONSTANTS.CASION_ERROR_MESSAGE;
						matchMarkets[k].indexCard = [];
						matchMarkets[k].timer = 0;
					}

					let marktRunner = runnerJson.marketRunner;
					for (let o in marktRunner) {

						let selectionID = marktRunner[o].id;
						selectionMatch = MarketSelection.data.filter(function (data) {
							if (data.selection_id == selectionID) {
								marktRunner[o].WinAndLoss = data.win_loss_value;
								if (marktRunner[o].back.length > 0) {
									marktRunner[o].back[0].price = Number(parseFloat(parseFloat(marktRunner[o].back[0].price) + parseFloat(backRateDiff)).toFixed(2));
									marktRunner[o].back[0].size = Number(parseFloat(parseFloat(marktRunner[o].back[0].size) * parseFloat(matchVolumn)).toFixed(2));
								}
								if (marktRunner[o].lay.length > 0) {
									marktRunner[o].lay[0].price = Number(parseFloat(parseFloat(marktRunner[o].lay[0].price) + parseFloat(layRateDiff)).toFixed(2));
									marktRunner[o].lay[0].size = Number(parseFloat(parseFloat(marktRunner[o].lay[0].size) * parseFloat(matchVolumn)).toFixed(2));
								}
							}

							if (roundId != compairMarketid) {
								marktRunner[o].back = [];
								marktRunner[o].lay = [];
								marktRunner[o].cards = [];
							}
						});

						let runnerJs = marktRunner[o];
						if (roundId === compairMarketid) {
							runnerJs.superStatus = runnerJson.status;
						} else {
							runnerJs.superStatus = 'SUSPENDED';//runnerJson[i].status;
						}
						marketRunnerJson.push(runnerJs);
					}
				}
				matchMarkets[k].runner_json = marketRunnerJson;
				matchMarkets[k].InplayStatus = 'CLOSE';
			}

			return resultdb(CONSTANTS.SUCCESS, matchMarkets);

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getMatchElectionMarketList = async (data) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.Int, data.match_id)
			.input('sport_id', sql.Int, data.sport_id)
			.query("SELECT (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore,mkts.isbetalowaftermatchodds, spt.name as SportName,ISNULL(fav.match_id ,0) as favMatchID,ISNULL(CASE WHEN (disable.user_id IS NOT NULL OR disable.user_id !=0) THEN 'BET SUSPENDED' ELSE mkts.market_admin_message END,'') as adminMessage,mkts.market_type,(CASE WHEN mkts.min_stack > 0 THEN mkts.min_stack ELSE usptset.min_match_stack END) AS marketMinStack,(CASE WHEN mkts.max_stack > 0  THEN mkts.max_stack ELSE usptset.max_match_stack END) AS marketMaxStack,(CASE WHEN mkts.max_market_profit >0 THEN mkts.max_market_profit ELSE usptset.max_profit END) AS marketMaxProfit, (CASE WHEN mkts.min_loss > 0 THEN mkts.min_loss ELSE usptset.max_loss END) AS marketMaxLoss,(CASE WHEN mkts.max_market_liability > 0 THEN mkts.max_market_liability ELSE usptset.max_exposure END) AS marketMaxExposure,(CASE WHEN mkts.min_liability > usptset.min_exposure THEN mkts.min_liability ELSE usptset.min_exposure END) AS marketMinExposure,(CASE WHEN (select count(*) from markets where match_id=mtch.match_id AND status='Y' AND is_result_declared='N' AND ( name='Book Maker') AND (result_id IS NULL OR result_id=0)) > 0 THEN 'OPEN' ELSE 'CLOSE' END) AS InplayStatus, ISNULL(mtch.maintv,'') AS MainTV,'' AS PlayTv1,'' AS PlayTv2,'' AS PlayTv3,'' AS PlayTv4,'' AS graphics,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, (CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,(CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) AS  backRateDiff,(CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) AS  layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch with(nolock) JOIN sports spt with(nolock) ON spt.sport_id=mtch.sport_id  JOIN markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name='Match Odds' AND mkts.status='Y' INNER JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = spt.sport_id AND usptset.user_id=@user_id LEFT JOIN favourites as fav with(nolock) ON fav.match_id=mtch.match_id AND fav.market_id= mkts.market_id AND fav.user_id=@user_id LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id and dspt.user_id= @user_id LEFT JOIN user_deactive_matches as udmtch with(nolock) ON udmtch.match_id= mtch.match_id AND  udmtch.match_id=@match_id and udmtch.user_id=@user_id LEFT JOIN disable_match_markets as disable with(nolock) ON disable.market_id= mkts.market_id AND disable.user_id=@user_id where spt.sport_id =@sport_id AND ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND ( udmtch.match_id  IS NULL OR udmtch.match_id=0) AND mtch.match_id=@match_id  AND mtch.status='Y' AND mkts.is_result_declared='N' AND mkts.winner_name IS NULL AND spt.status='Y' AND mtch.is_completed='N'")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let matchMarkets = result.recordset;

			let marketID = result.recordset.map((data) => (data.market_id));
			let match_id = result.recordset.map((data) => (data.match_id));


			let backRateDiff = result.recordset[0].backRateDiff;//result.recordset.map((data)=>(data.backRateDiff));	
			let layRateDiff = result.recordset[0].layRateDiff; //result.recordset.map((data)=>(data.layRateDiff));		
			let matchVolumn = result.recordset[0].matchVolumn > 0 ? result.recordset[0].matchVolumn : 1; //result.recordset.map((data)=>(data.matchVolumn));	

			result.recordset[0].bxyz = await decryptBackLayValue(backRateDiff);
			result.recordset[0].lxyz = await decryptBackLayValue(layRateDiff);
			result.recordset[0].vxyz = await decryptBackLayValue(matchVolumn);


			let oddsData = await exchangeService.getOddsByMarketIds(marketID);

			let MarketSelection = await exchangeService.getMarketSelection(match_id, marketID, data.id);
			try {
				let MarketSelectionDb = []
				if (MarketSelection.data[0] != null) {
					MarketSelectionDb = MarketSelection.data;
				}
				if (oddsData.data[marketID] != null) {
					oddsData.data[marketID].runners.map(function (dbdata, i) {
						if (dbdata != null) {
							let indexOfFancyData = '';
							if (MarketSelectionDb != null) {
								indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
							} else {
								indexOfFancyData = -1;
							}
							dbdata.ex.availableToBack.map(function (BackPriceSize) {
								BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
								BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});
							dbdata.ex.availableToLay.map(function (LayPriceSize) {
								LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
								LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});

							if (indexOfFancyData === -1) {
								dbdata.WinAndLoss = 0;
							} else {
								dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
								dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
								dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
							}
						}
					});
				} else {
					if (matchMarkets[0].runner_json != null) {
						let runner_json2 = JSON.parse(matchMarkets[0].runner_json);
						runner_json2.map(function (dbdata, i) {
							if (dbdata != null) {

								dbdata.ex.availableToBack.map(function (BackPriceSize) {
									BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
									BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});
								dbdata.ex.availableToLay.map(function (LayPriceSize) {
									LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
									LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});

								let indexOfFancyData = '';
								if (MarketSelectionDb != null) {
									indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
								} else {
									indexOfFancyData = -1;
								}

								if (indexOfFancyData === -1) {
									dbdata.WinAndLoss = 0;
								} else {
									dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
									dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
									dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
								}
							}
						});
						matchMarkets[0].runner_json = JSON.stringify(runner_json2);
					}
				}

			}
			catch (e) {
				console.log(e);
				return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
			}
			let newdata = matchMarkets.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE', PlayTv1: settings.GET_MATCH_TV1_URL, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + (settings.GET_GRAPHICS_MATCH_MARKET == 'MARKET' ? data.market_id : data.match_id) } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, PlayTv1: settings.GET_MATCH_TV1_URL, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + (settings.GET_GRAPHICS_MATCH_MARKET == 'MARKET' ? data.market_id : data.match_id) }
			));
			if (newdata === null || newdata.length == 0) {
				return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);

			} else {
				return resultdb(CONSTANTS.SUCCESS, newdata[0]);
			}

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};

let getCricketMatchDetail = async (data) => {
	try {
		const pool = await poolPromise;

		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.Int, data.match_id)
			.input('sport_id', sql.Int, data.sport_id)
			.query("SELECT ISNULL(mtch.score_key,0) as scorekey, (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore,mkts.isbetalowaftermatchodds, spt.name as SportName, 0 as favMatchID,ISNULL(CASE WHEN mtch.is_bet_allow='N' AND mkts.market_type !='BM' AND '" + settings.BOOK_MAKER_MANUAL_MARKET_BET_OPEN_CLOSE + "' = 'OPEN' THEN 'BET SUSPENDED' ELSE mkts.market_admin_message END,'') as adminMessage,mkts.market_type, mkts.min_stack AS marketMinStack,  mkts.max_stack AS marketMaxStack, mkts.max_market_profit AS marketMaxProfit, mkts.min_loss AS marketMaxLoss, mkts.max_market_liability AS marketMaxExposure, mkts.min_liability AS marketMinExposure,(CASE WHEN (select count(*) from markets where match_id=mtch.match_id AND status='Y' AND is_result_declared='N' AND ( name='Book Maker') AND (result_id IS NULL OR result_id=0)) > 0 THEN 'OPEN' ELSE 'CLOSE' END) AS InplayStatus, ISNULL(mtch.maintv,'') AS MainTV,'' AS PlayTv1,'' AS PlayTv2,'' AS PlayTv3,'' AS PlayTv4,'' AS graphics,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, (CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,(CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) AS  backRateDiff,(CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) AS  layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json, ser.name as seriesName FROM matches as mtch INNER JOIN series as ser ON ser.series_id=mtch.series_id JOIN sports spt ON spt.sport_id=mtch.sport_id  JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name='Match Odds' AND mkts.status='Y' WHERE  spt.sport_id =@sport_id  AND mtch.match_id=@match_id  AND mtch.status='Y' AND mkts.is_result_declared='N' AND mkts.winner_name IS NULL AND spt.status='Y' AND mtch.is_completed='N'")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let matchMarkets = result.recordset;

			let marketID = result.recordset.map((data) => (data.market_id));
			let match_id = result.recordset.map((data) => (data.match_id));


			let backRateDiff = result.recordset[0].backRateDiff; //result.recordset.map((data)=>(data.backRateDiff));	
			let layRateDiff = result.recordset[0].layRateDiff; //result.recordset.map((data)=>(data.layRateDiff));		
			let matchVolumn = result.recordset[0].matchVolumn > 0 ? result.recordset[0].matchVolumn : 1; //result.recordset.map((data)=>(data.matchVolumn));	

			/*  result.recordset[0].bxyz = await decryptBackLayValue(backRateDiff);
			  result.recordset[0].lxyz = await decryptBackLayValue(layRateDiff);
			  result.recordset[0].vxyz = await decryptBackLayValue(matchVolumn);*/


			let oddsData = await exchangeService.getOddsByMarketIds(marketID);

			let MarketSelection = await exchangeService.getMarketSelection(match_id, marketID, data.id);
			try {
				let MarketSelectionDb = []
				if (MarketSelection.data[0] != null) {
					MarketSelectionDb = MarketSelection.data;
				}
				if (oddsData.data[marketID] != null) {
					oddsData.data[marketID].runners.map(function (dbdata, i) {
						if (dbdata != null) {
							let indexOfFancyData = '';
							if (MarketSelectionDb != null) {
								indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
							} else {
								indexOfFancyData = -1;
							}
							dbdata.ex.availableToBack.map(function (BackPriceSize) {
								BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
								BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});
							dbdata.ex.availableToLay.map(function (LayPriceSize) {
								LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
								LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});

							if (indexOfFancyData === -1) {
								dbdata.WinAndLoss = 0;
							} else {
								dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
								dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
								dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
							}
						}
					});
				} else {
					if (matchMarkets[0].runner_json != null) {
						let runner_json2 = JSON.parse(matchMarkets[0].runner_json);
						runner_json2.map(function (dbdata, i) {
							if (dbdata != null) {

								dbdata.ex.availableToBack.map(function (BackPriceSize) {
									BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
									BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});
								dbdata.ex.availableToLay.map(function (LayPriceSize) {
									LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
									LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});

								let indexOfFancyData = '';
								if (MarketSelectionDb != null) {
									indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
								} else {
									indexOfFancyData = -1;
								}

								if (indexOfFancyData === -1) {
									dbdata.WinAndLoss = 0;
								} else {
									dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
									dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
									dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
								}
							}
						});
						matchMarkets[0].runner_json = JSON.stringify(runner_json2);
					}
				}

			} catch (e) {
				console.log(e);
				return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
			}
			let newdata = matchMarkets.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE', PlayTv1: settings.GET_MATCH_TV1_URL + "" + data.match_id, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + data.match_id } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, PlayTv1: settings.GET_MATCH_TV1_URL + "" + data.match_id, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + data.match_id }
			));
			if (newdata === null || newdata.length == 0) {
				return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);

			} else {
				return resultdb(CONSTANTS.SUCCESS, newdata[0]);
			}

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};

let getMatchBookmakerMarketwithoutLogin = async (data) => {
	try {
		const pool = await poolPromise;

		const result = await pool.request()
			.input('match_id', sql.Int, data.match_id)
			.input('sport_id', sql.Int, data.sport_id)
			.query("SELECT (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore,mkts.isbetalowaftermatchodds,mkts.market_type, spt.name as SportName,ISNULL(CASE WHEN mtch.is_bet_allow='N' AND mkts.market_type !='BM' AND '" + settings.BOOK_MAKER_MANUAL_MARKET_BET_OPEN_CLOSE + "' = 'OPEN' THEN 'BET SUSPENDED' ELSE mkts.market_admin_message END,'')  as adminMessage, mkts.min_stack AS marketMinStack, mkts.max_stack AS marketMaxStack,mkts.max_market_profit AS marketMaxProfit, mkts.min_loss AS marketMaxLoss,mkts.max_market_liability AS marketMaxExposure,mkts.min_liability AS marketMinExposure,'' AS InplayStatus,'' AS MainTV,'' AS PlayTv1,'' AS PlayTv2,'' AS PlayTv3,'' AS PlayTv4,'' AS graphics,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, (CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,(CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) AS  backRateDiff,(CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) AS  layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id  JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name ='Book Maker'  AND mkts.status='Y' where mtch.match_id=@match_id  AND mtch.status='Y' AND mkts.is_result_declared='N' AND mkts.winner_name IS NULL AND spt.status='Y' AND mtch.is_completed='N' ORDER BY mkts.market_runner_count ASC")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let matchMarkets = result.recordset;
			//let MarketSelections=Array();
			//let oddRunneer = Array();
			let marketID = result.recordset.map((data) => (data.market_id));
			let market_type = result.recordset.map((data) => (data.market_type));

			let match_id = result.recordset.map((data) => (data.match_id));
			let backRateDiff = result.recordset[0].backRateDiff; //result.recordset.map((data)=>(data.backRateDiff));	
			let layRateDiff = result.recordset[0].layRateDiff; //result.recordset.map((data)=>(data.layRateDiff));		
			let matchVolumn = result.recordset[0].matchVolumn > 0 ? result.recordset[0].matchVolumn : 1; //result.recordset.map((data)=>(data.matchVolumn));	

			result.recordset[0].bxyz = await decryptBackLayValue(backRateDiff);
			result.recordset[0].lxyz = await decryptBackLayValue(layRateDiff);
			result.recordset[0].vxyz = await decryptBackLayValue(matchVolumn);

			let oddsData = await exchangeService.getOddsByMarketIds(marketID, market_type);
			let MarketSelection = await exchangeService.getMarketSelection(match_id, marketID, data.id);


			//let oddsData = await exchangeService.getOddsByMarketIds(marketID);
			//console.log(oddsData);

			try {
				let MarketSelectionDb = []
				if (MarketSelection.data[0] != null) {
					MarketSelectionDb = MarketSelection.data;
				}
				if (oddsData.data[marketID] != null) {
					oddsData.data[marketID].runners.map(function (dbdata, i) {
						if (dbdata != null) {
							let indexOfFancyData = '';
							if (MarketSelectionDb != null) {
								indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
							} else {
								indexOfFancyData = -1;
							}
							dbdata.ex.availableToBack.map(function (BackPriceSize) {
								BackPriceSize.price = (parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
								BackPriceSize.size = (parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});
							dbdata.ex.availableToLay.map(function (LayPriceSize) {
								LayPriceSize.price = (parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
								LayPriceSize.size = (parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});

							if (indexOfFancyData === -1) {
								dbdata.WinAndLoss = 0;
							} else {
								dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
								dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
								dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
							}
						}
					});
				} else {
					if (matchMarkets[0].runner_json != null) {
						let runner_json2 = JSON.parse(matchMarkets[0].runner_json);
						runner_json2.map(function (dbdata, i) {
							if (dbdata != null) {

								dbdata.ex.availableToBack.map(function (BackPriceSize) {
									BackPriceSize.price = (parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
									BackPriceSize.size = (parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});
								dbdata.ex.availableToLay.map(function (LayPriceSize) {
									LayPriceSize.price = (parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
									LayPriceSize.size = (parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});

								let indexOfFancyData = '';
								if (MarketSelectionDb != null) {
									indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
								} else {
									indexOfFancyData = -1;
								}

								if (indexOfFancyData === -1) {
									dbdata.WinAndLoss = 0;
								} else {
									dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
									dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
									dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
								}
							}
						});
						matchMarkets[0].runner_json = JSON.stringify(runner_json2);
					}
				}
			} catch (e) {
				console.log(e);
				return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
			}

			let newdata = matchMarkets.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE' } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: 'CLOSE' }
			));

			return resultdb(CONSTANTS.SUCCESS, newdata[0]);

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getMatchBookmakerOtherMarketwithoutLogin = async (data) => {
	try {
		const pool = await poolPromise;

		const result = await pool.request()
			.input('match_id', sql.Int, data.match_id)
			.input('sport_id', sql.Int, data.sport_id)
			.query("SELECT (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore,mkts.isbetalowaftermatchodds,mkts.market_type, spt.name as SportName,ISNULL(CASE WHEN mtch.is_bet_allow='N' AND mkts.market_type !='BM' AND '" + settings.BOOK_MAKER_MANUAL_MARKET_BET_OPEN_CLOSE + "' = 'OPEN' THEN 'BET SUSPENDED' ELSE mkts.market_admin_message END,'')  as adminMessage, mkts.min_stack AS marketMinStack, mkts.max_stack AS marketMaxStack,mkts.max_market_profit AS marketMaxProfit, mkts.min_loss AS marketMaxLoss,mkts.max_market_liability AS marketMaxExposure,mkts.min_liability AS marketMinExposure,'' AS InplayStatus,'' AS MainTV,'' AS PlayTv1,'' AS PlayTv2,'' AS PlayTv3,'' AS PlayTv4,'' AS graphics,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, (CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,(CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) AS  backRateDiff,(CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) AS  layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id  JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name ='Book Maker 2'  AND mkts.status='Y' where mtch.match_id=@match_id  AND mtch.status='Y' AND mkts.is_result_declared='N' AND mkts.winner_name IS NULL AND spt.status='Y' AND mtch.is_completed='N' ORDER BY mkts.market_runner_count ASC")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let matchMarkets = result.recordset;
			//let MarketSelections=Array();
			//let oddRunneer = Array();
			let marketID = result.recordset.map((data) => (data.market_id));
			let market_type = result.recordset.map((data) => (data.market_type));
			let SearchArray = [];

			let match_id = result.recordset.map((data) => (data.match_id));
			let backRateDiff = result.recordset[0].backRateDiff; //result.recordset.map((data)=>(data.backRateDiff));	
			let layRateDiff = result.recordset[0].layRateDiff; //result.recordset.map((data)=>(data.layRateDiff));		
			let matchVolumn = result.recordset[0].matchVolumn > 0 ? result.recordset[0].matchVolumn : 1; //result.recordset.map((data)=>(data.matchVolumn));	

			result.recordset[0].bxyz = await decryptBackLayValue(backRateDiff);
			result.recordset[0].lxyz = await decryptBackLayValue(layRateDiff);
			result.recordset[0].vxyz = await decryptBackLayValue(matchVolumn);

			let oddsData = await exchangeService.getOddsByMarketIds(marketID, market_type);
			let MarketSelection = await exchangeService.getMarketSelection(match_id, marketID, data.id);


			//let oddsData = await exchangeService.getOddsByMarketIds(marketID);
			//console.log(oddsData);

			try {
				let MarketSelectionDb = []
				if (MarketSelection.data[0] != null) {
					MarketSelectionDb = MarketSelection.data;
				}
				if (oddsData.data[marketID] != null) {
					oddsData.data[marketID].runners.map(function (dbdata, i) {
						if (dbdata != null) {

							if (dbdata.ex.availableToBack.length == 0) {
								dbdata.ex.availableToBack.push({ 'price': 0, 'size': 0 });
								dbdata.ex.availableToBack.push({ 'price': 0, 'size': 0 });
								dbdata.ex.availableToBack.push({ 'price': 0, 'size': 0 });
							}
							SearchArray.push({ [dbdata.selectionId]: dbdata.ex.availableToBack[0].price });

							let indexOfFancyData = '';
							if (MarketSelectionDb != null) {
								indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
							} else {
								indexOfFancyData = -1;
							}
							dbdata.ex.availableToBack.map(function (BackPriceSize) {
								BackPriceSize.price = (parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
								BackPriceSize.size = (parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});
							dbdata.ex.availableToLay.map(function (LayPriceSize) {
								LayPriceSize.price = (parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
								LayPriceSize.size = (parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});

							if (indexOfFancyData === -1) {
								dbdata.WinAndLoss = 0;
							} else {
								dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
								dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
								dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
							}
						}
					});

					let favouritSelection = SearchArray.reduce(function (res, obj) {
						var keysp = Object.keys(res);
						var keysv = Object.keys(obj);
						return (res[keysp] < obj[keysv]) ? res : obj;
					});

					favouritSelection = Object.keys(favouritSelection)[0];

					oddsData.data[marketID].runners.map(function (dbdata, i) {

						if (dbdata != null) {
							if (favouritSelection != dbdata.selectionId) {
								dbdata.GameStatus = "SUSPENDED";
								dbdata.ex = CONSTANTS.BACK_LAY_BLANK_ARRAY;

							} else {
								dbdata.GameStatus = "";
							}
						}
					});
				} else {
					if (matchMarkets[0].runner_json != null) {
						let runner_json2 = JSON.parse(matchMarkets[0].runner_json);
						runner_json2.map(function (dbdata, i) {
							if (dbdata != null) {

								dbdata.ex.availableToBack.map(function (BackPriceSize) {
									BackPriceSize.price = (parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
									BackPriceSize.size = (parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});
								dbdata.ex.availableToLay.map(function (LayPriceSize) {
									LayPriceSize.price = (parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
									LayPriceSize.size = (parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});

								let indexOfFancyData = '';
								if (MarketSelectionDb != null) {
									indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
								} else {
									indexOfFancyData = -1;
								}

								if (indexOfFancyData === -1) {
									dbdata.WinAndLoss = 0;
								} else {
									dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
									dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
									dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
								}
							}
						});
						matchMarkets[0].runner_json = JSON.stringify(runner_json2);
					}
				}
			} catch (e) {
				console.log(e);
				return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
			}

			let newdata = matchMarkets.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE' } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: 'CLOSE' }
			));

			return resultdb(CONSTANTS.SUCCESS, newdata[0]);

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getMatchWithoutMatchOddsMarketListwithoutLogin = async (data) => {
	try {

		const pool = await poolPromise;

		const result = await pool.request()
			.input('match_id', sql.Int, data.match_id)
			.input('sport_id', sql.Int, data.sport_id)
			.query("SELECT (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore,mkts.isbetalowaftermatchodds,mkts.market_type, spt.name as SportName,ISNULL(CASE WHEN mtch.is_bet_allow='N' AND mkts.market_type !='BM' AND '" + settings.BOOK_MAKER_MANUAL_MARKET_BET_OPEN_CLOSE + "' = 'OPEN' THEN 'BET SUSPENDED' ELSE mkts.market_admin_message END,'') as adminMessage,mkts.min_stack AS marketMinStack,mkts.max_stack AS marketMaxStack,mkts.max_market_profit AS marketMaxProfit, mkts.min_loss AS marketMaxLoss,mkts.max_market_liability AS marketMaxExposure,mkts.min_liability AS marketMinExposure,'' AS InplayStatus,'' AS MainTV,'' AS PlayTv1,'' AS PlayTv2,'' AS PlayTv3,'' AS PlayTv4,'' AS graphics,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, (CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,(CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) AS  backRateDiff,(CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) AS  layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id  JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name !='Match Odds' AND mkts.name !='Book Maker'  AND mkts.name !='Book Maker 2' AND mkts.status='Y'  where  mtch.match_id=@match_id  AND mtch.status='Y' AND mkts.is_result_declared='N' AND mkts.winner_name IS NULL AND spt.status='Y' AND mtch.is_completed='N' ORDER BY mkts.market_runner_count ASC")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let matchMarkets = result.recordset;
			//let MarketSelections=Array();
			//let oddRunneer = Array();
			let marketID = result.recordset.map((data) => (data.market_id));
			let market_type = result.recordset.map((data) => (data.market_type));
			console.log('other markets --------- ', market_type);
			let oddsData = await exchangeService.getOddsByMarketIds(marketID, market_type);

			for (let i in matchMarkets) {

				let matchMarketsDetails = matchMarkets[i];

				let backRateDiff = matchMarketsDetails.backRateDiff; //result.recordset.map((data)=>(data.backRateDiff));	
				let layRateDiff = matchMarketsDetails.layRateDiff; //result.recordset.map((data)=>(data.layRateDiff));		
				let matchVolumn = matchMarketsDetails.matchVolumn > 0 ? matchMarketsDetails.matchVolumn : 1;

				matchMarkets[i].bxyz = await decryptBackLayValue(backRateDiff);
				matchMarkets[i].lxyz = await decryptBackLayValue(layRateDiff);
				matchMarkets[i].vxyz = await decryptBackLayValue(matchVolumn);


				let MarketSelection = await exchangeService.getMarketSelection(matchMarketsDetails.match_id, matchMarketsDetails.market_id, data.id);

				//let MarketSelection = await exchangeService.getMarketSelection(matchMarketsDetails.match_id, matchMarketsDetails.market_id, data.id);
				try {
					let MarketSelectionDb = []
					if (MarketSelection.data[0] != null) {
						MarketSelectionDb = MarketSelection.data;
					}
					if (oddsData.data[matchMarketsDetails.market_id] != null) {
						oddsData.data[matchMarketsDetails.market_id].runners.map(function (dbdata, i) {
							if (dbdata != null) {
								let indexOfFancyData = '';
								if (MarketSelectionDb != null) {
									indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
								} else {
									indexOfFancyData = -1;
								}
								//console.log('dbdata.ex.availableToBack',dbdata.ex.availableToBack);
								dbdata.ex.availableToBack.map(function (BackPriceSize) {
									BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
									BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));
									//console.log('avinash---------------- BackPriceSize.price --------------- ',BackPriceSize.price);

								});
								dbdata.ex.availableToLay.map(function (LayPriceSize) {
									LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
									LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});

								if (indexOfFancyData === -1) {
									dbdata.WinAndLoss = 0;
								} else {
									dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
									dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
									dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
								}
							}
						});
					} else {
						//if (matchMarkets[0].runner_json != null) {
						if (matchMarketsDetails.runner_json && matchMarketsDetails.runner_json !== null) {
							let runner_json2 = JSON.parse(matchMarkets[i].runner_json);
							runner_json2.map(function (dbdata, i) {
								if (dbdata != null) {

									dbdata.ex.availableToBack.map(function (BackPriceSize) {
										BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
										BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

									});
									dbdata.ex.availableToLay.map(function (LayPriceSize) {
										LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
										LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

									});

									let indexOfFancyData = '';
									if (MarketSelectionDb != null) {
										indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
									} else {
										indexOfFancyData = -1;
									}

									if (indexOfFancyData === -1) {
										dbdata.WinAndLoss = 0;
									} else {
										dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
										dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
										dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
									}
								}
							});
							matchMarkets[i].runner_json = JSON.stringify(runner_json2);
						}
					}

					/* if (oddsData.data[matchMarketsDetails.market_id] !== undefined && MarketSelection.data.length > 0) {
						for (let j in MarketSelection.data) {
							if (MarketSelection.data[j].selection_id == oddsData.data[matchMarketsDetails.market_id].runners[j].selectionId) {
								oddsData.data[matchMarketsDetails.market_id].runners[j]['selectionName'] = MarketSelection.data[j].SelectionName;
								oddsData.data[matchMarketsDetails.market_id].runners[j]['sort_priority'] = MarketSelection.data[j].sort_priority;
								oddsData.data[matchMarketsDetails.market_id].runners[j]['WinAndLoss'] = MarketSelection.data[j].win_loss_value;
							} else {
								oddsData.data[matchMarketsDetails.market_id].runners[j]['selectionName'] = "";
								oddsData.data[matchMarketsDetails.market_id].runners[j]['sort_priority'] = "";
								oddsData.data[matchMarketsDetails.market_id].runners[j]['WinAndLoss'] = 0;
							}
						}
					} else {

						if (matchMarketsDetails.runner_json && matchMarketsDetails.runner_json !== null) {
							let runner_json2 = JSON.parse(matchMarkets[i].runner_json);
							for (let j in MarketSelection.data) {
								if (MarketSelection.data[j].selection_id == runner_json2[j].selectionId) {
									runner_json2[j]['selectionName'] = MarketSelection.data[j].SelectionName;
									runner_json2[j]['sort_priority'] = MarketSelection.data[j].sort_priority;
									runner_json2[j]['WinAndLoss'] = MarketSelection.data[j].win_loss_value;
								} else {
									runner_json2[j]['selectionName'] = "";
									runner_json2[j]['sort_priority'] = "";
									runner_json2[j]['WinAndLoss'] = 0;
								}
							}
							matchMarkets[i].runner_json = JSON.stringify(runner_json2);
						}

					} */
				} catch (e) {
					console.log(e);
					return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
				}
			}
			let newdata = matchMarkets.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE' } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: 'CLOSE' }
			));

			return resultdb(CONSTANTS.SUCCESS, newdata);

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getSoccerMatchDetailWithoutLogin = async (data) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.Int, data.match_id)
			.input('sport_id', sql.Int, data.sport_id)
			.query("SELECT (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore, spt.name as SportName,0 as favMatchID,ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET SUSPENDED' ELSE mkts.market_admin_message END,'')as adminMessage,mkts.min_stack AS marketMinStack,mkts.max_stack AS marketMaxStack,mkts.max_market_profit AS marketMaxProfit, mkts.min_loss AS marketMaxLoss,mkts.max_market_liability AS marketMaxExposure, mkts.min_liability AS marketMinExposure,'' AS InplayStatus, ISNULL(mtch.maintv,'') AS MainTV,'' AS PlayTv1,'' AS PlayTv2,'' AS PlayTv3,'' AS PlayTv4,'' AS graphics,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, (CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END )  as SportminOddsLimt, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,(CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) AS  backRateDiff,(CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) AS  layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id  JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name='Match Odds' AND mkts.status='Y' where spt.sport_id =@sport_id  AND mtch.match_id=@match_id  AND mtch.status='Y' AND mkts.is_result_declared='N' AND mkts.winner_name IS NULL AND spt.status='Y' AND mtch.is_completed='N'")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let matchMarkets = result.recordset;
			let marketID = result.recordset.map((data) => (data.market_id));
			let match_id = result.recordset.map((data) => (data.match_id));

			let backRateDiff = result.recordset[0].backRateDiff;
			let layRateDiff = result.recordset[0].layRateDiff;
			let matchVolumn = result.recordset[0].matchVolumn > 0 ? result.recordset[0].matchVolumn : 1;
			result.recordset[0].bxyz = await decryptBackLayValue(backRateDiff);
			result.recordset[0].lxyz = await decryptBackLayValue(layRateDiff);
			result.recordset[0].vxyz = await decryptBackLayValue(matchVolumn);

			let oddsData = await exchangeService.getOddsByMarketIds(marketID);
			let MarketSelection = await exchangeService.getMarketSelection(match_id, marketID, data.id);
			try {
				let MarketSelectionDb = []
				if (MarketSelection.data[0] != null) {
					MarketSelectionDb = MarketSelection.data;
				}
				if (oddsData.data[marketID] != null) {
					oddsData.data[marketID].runners.map(function (dbdata, i) {
						if (dbdata != null) {
							let indexOfFancyData = '';
							if (MarketSelectionDb != null) {
								indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
							} else {
								indexOfFancyData = -1;
							}

							dbdata.ex.availableToBack.map(function (BackPriceSize) {
								BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
								BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});
							dbdata.ex.availableToLay.map(function (LayPriceSize) {
								LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
								LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});

							if (indexOfFancyData === -1) {
								dbdata.WinAndLoss = 0;
							} else {
								dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
								dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
								dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
							}
						}
					});
				} else {
					if (matchMarkets[0].runner_json != null) {
						let runner_json2 = JSON.parse(matchMarkets[0].runner_json);
						runner_json2.map(function (dbdata, i) {
							if (dbdata != null) {

								dbdata.ex.availableToBack.map(function (BackPriceSize) {
									BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
									BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});
								dbdata.ex.availableToLay.map(function (LayPriceSize) {
									LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
									LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});

								let indexOfFancyData = '';
								if (MarketSelectionDb != null) {
									indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
								} else {
									indexOfFancyData = -1;
								}

								if (indexOfFancyData === -1) {
									dbdata.WinAndLoss = 0;
								} else {
									dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
									dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
									dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
								}
							}
						});
						matchMarkets[0].runner_json = JSON.stringify(runner_json2);
					}
				}

			} catch (e) {
				console.log(e);
				return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
			}

			let newdata = matchMarkets.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE', PlayTv1: settings.GET_MATCH_TV1_URL + "" + data.match_id, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + data.match_id } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: 'CLOSE', PlayTv1: settings.GET_MATCH_TV1_URL + "" + data.match_id, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + data.match_id }
			));
			return resultdb(CONSTANTS.SUCCESS, newdata[0]);

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};

let getTennisMatchDetailWithoutLogin = async (data) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.Int, data.match_id)
			.input('sport_id', sql.Int, data.sport_id)
			.query("SELECT (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore, spt.name as SportName,0 as favMatchID,ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET SUSPENDED' ELSE mkts.market_admin_message END,'')as adminMessage,mkts.min_stack AS marketMinStack,mkts.max_stack AS marketMaxStack,mkts.max_market_profit AS marketMaxProfit, mkts.min_loss AS marketMaxLoss,mkts.max_market_liability AS marketMaxExposure,mkts.min_liability AS marketMinExposure,'' AS InplayStatus, ISNULL(mtch.maintv,'') AS MainTV,'' AS PlayTv1,'' AS PlayTv2,'' AS PlayTv3,'' AS PlayTv4,'' AS graphics,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, (CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,(CASE WHEN mkts.odd_limit_back != 0 THEN mkts.odd_limit_back ELSE spt.odd_limit_back END) AS  backRateDiff,(CASE WHEN mkts.odd_limit_lay != 0 THEN mkts.odd_limit_lay ELSE spt.odd_limit_lay END) AS  layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id  JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name='Match Odds' AND mkts.status='Y' where spt.sport_id =@sport_id  AND mtch.match_id=@match_id  AND mtch.status='Y' AND mkts.is_result_declared='N' AND mkts.winner_name IS NULL AND spt.status='Y' AND mtch.is_completed='N'")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {

			let matchMarkets = result.recordset;
			let marketID = result.recordset.map((data) => (data.market_id));
			let match_id = result.recordset.map((data) => (data.match_id));

			let backRateDiff = result.recordset[0].backRateDiff;
			let layRateDiff = result.recordset[0].layRateDiff;
			let matchVolumn = result.recordset[0].matchVolumn > 0 ? result.recordset[0].matchVolumn : 1;

			result.recordset[0].bxyz = await decryptBackLayValue(backRateDiff);
			result.recordset[0].lxyz = await decryptBackLayValue(layRateDiff);
			result.recordset[0].vxyz = await decryptBackLayValue(matchVolumn);

			let oddsData = await exchangeService.getOddsByMarketIds(marketID);

			let MarketSelection = await exchangeService.getMarketSelection(match_id, marketID, data.id);
			try {
				let MarketSelectionDb = []
				if (MarketSelection.data[0] != null) {
					MarketSelectionDb = MarketSelection.data;
				}
				if (oddsData.data[marketID] != null) {
					oddsData.data[marketID].runners.map(function (dbdata, i) {
						if (dbdata != null) {
							let indexOfFancyData = '';
							if (MarketSelectionDb != null) {
								indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
							} else {
								indexOfFancyData = -1;
							}
							dbdata.ex.availableToBack.map(function (BackPriceSize) {
								BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
								BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});
							dbdata.ex.availableToLay.map(function (LayPriceSize) {
								LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
								LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

							});

							if (indexOfFancyData === -1) {
								dbdata.WinAndLoss = 0;
							} else {
								dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
								dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
								dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
							}
						}
					});
				} else {
					if (matchMarkets[0].runner_json != null) {
						let runner_json2 = JSON.parse(matchMarkets[0].runner_json);
						runner_json2.map(function (dbdata, i) {
							if (dbdata != null) {

								dbdata.ex.availableToBack.map(function (BackPriceSize) {
									BackPriceSize.price = Number(parseFloat(parseFloat(BackPriceSize.price) + parseFloat(backRateDiff)).toFixed(2));
									BackPriceSize.size = Number(parseFloat(parseFloat(BackPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});
								dbdata.ex.availableToLay.map(function (LayPriceSize) {
									LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
									LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});


								let indexOfFancyData = '';
								if (MarketSelectionDb != null) {
									indexOfFancyData = MarketSelectionDb.findIndex(x => (x.selection_id && x.selection_id == dbdata.selectionId));
								} else {
									indexOfFancyData = -1;
								}

								if (indexOfFancyData === -1) {
									dbdata.WinAndLoss = 0;
								} else {
									dbdata.selectionName = MarketSelectionDb[indexOfFancyData].SelectionName;
									dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
									dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
								}
							}
						});
						matchMarkets[0].runner_json = JSON.stringify(runner_json2);
					}
				}

			} catch (e) {
				console.log(e);
				return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
			}

			let newdata = matchMarkets.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE', PlayTv1: settings.GET_MATCH_TV1_URL + "" + data.match_id, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + data.match_id } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, backRateDiff: 0, layRateDiff: 0, matchVolumn: 0, InplayStatus: 'CLOSE', PlayTv1: settings.GET_MATCH_TV1_URL + "" + data.match_id, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + data.match_id }
			));

			return resultdb(CONSTANTS.SUCCESS, newdata[0]);

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};
let getMatchIndiaFancyWithoutAuth = async (data) => {
	try {
		const pool = await poolPromise;

		const result = await pool.request()
			.input('match_id', sql.Int, data.match_id)
			.query("SELECT fanc.fancyStatus, fanc.selection_id as SelectionId,mtch.start_date, ISNULL(CASE WHEN mtch.is_fancy_bet_allow='N' THEN 'BET SUSPENDED' ELSE fanc.market_admin_message END,'') as adminMessage,(CASE WHEN spt.is_bet_allow = fanc.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, CASE  WHEN fanc.bet_allow_time_before > spt.bet_allow_time_before THEN fanc.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END AS BetAllowTimeBefore, ISNULL(fanc.min_stack,0) AS minStack,ISNULL(fanc.max_stack, 0) AS maxStack, ISNULL(fanc.session_max_profit, 0) AS maxProfit, fanc.name as RunnerName, fanc.session_value_yes as BackPrice1,fanc.session_size_yes as BackSize1, fanc.session_value_no as LayPrice1, fanc.session_size_no as LaySize1,'' AS inplayStatus,0 as scorePostion FROM fancies fanc INNER JOIN matches as mtch ON mtch.match_id=fanc.match_id AND mtch.match_id=@match_id AND mtch.status='Y' INNER LOOP JOIN sports spt ON spt.sport_id=fanc.sport_id where fanc.match_id=@match_id AND (fanc.status='A' OR fanc.status='C') AND fanc.result IS NULL AND fanc.fancyStatus='A'")



		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let fancyData = result.recordset;

			let fancyRedis = await exchangeService.getIndianFancyByMatchId(data.match_id);

			let fancyRedisMatch = []
			if (fancyRedis.data[0] != null) {
				fancyRedisMatch = fancyRedis.data[0].value.session;
			}

			fancyData.map(function (dbdata, i) {
				if (dbdata != null) {
					let indexOfFancyData = '';
					if (fancyRedisMatch != null) {
						indexOfFancyData = fancyRedisMatch.findIndex(x => (x.SelectionId && x.SelectionId == dbdata.SelectionId));
					} else {
						indexOfFancyData = -1;
					}

					dbdata.scorePostion = JSON.parse(dbdata.scorePostion)
					if (indexOfFancyData === -1) {
						dbdata.inplayStatus = 'CLOSE';
					} else {
						dbdata.inplayStatus = fancyRedisMatch[indexOfFancyData].GameStatus;
						dbdata.BackPrice1 = fancyRedisMatch[indexOfFancyData].BackPrice1;
						dbdata.BackSize1 = fancyRedisMatch[indexOfFancyData].BackSize1;
						dbdata.LayPrice1 = fancyRedisMatch[indexOfFancyData].LayPrice1;
						dbdata.LaySize1 = fancyRedisMatch[indexOfFancyData].LaySize1;
					}
				}
			});

			if (fancyData === null) {
				return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
			} else {
				return resultdb(CONSTANTS.SUCCESS, fancyData);
			}

		}
	} catch (error) {
		console.log("get indian session ---------------------", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getMatchIndiaFancyManualWithoutAuth = async (data) => {
	try {
		const pool = await poolPromise;

		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.Int, data.match_id)
			.query("SELECT fanc.fancyStatus, fanc.selection_id as SelectionId,mtch.start_date, ISNULL(CASE WHEN mtch.is_fancy_bet_allow='N' THEN 'BET SUSPENDED' ELSE fanc.market_admin_message END,'') as adminMessage,(CASE WHEN spt.is_bet_allow = fanc.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, CASE  WHEN fanc.bet_allow_time_before > spt.bet_allow_time_before THEN fanc.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END AS BetAllowTimeBefore, ISNULL(fanc.min_stack, 0) AS minStack,ISNULL(fanc.max_stack ,0) AS maxStack, ISNULL(fanc.session_max_profit, 0) AS maxProfit, fanc.name as RunnerName, fanc.session_value_yes as BackPrice1,fanc.session_size_yes as BackSize1, fanc.session_value_no as LayPrice1, fanc.session_size_no as LaySize1,'' AS inplayStatus,0 as scorePostion FROM fancies fanc INNER JOIN matches as mtch ON mtch.match_id=fanc.match_id AND mtch.match_id=@match_id AND mtch.status='Y' INNER LOOP JOIN sports spt ON spt.sport_id=fanc.sport_id  where fanc.match_id=@match_id AND (fanc.status='A' OR fanc.status='C') AND fanc.result IS NULL AND fanc.fancyStatu IN('M','MM','MK','ML')")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let fancyData = result.recordset;

			let fancyRedis = await exchangeService.getManualIndianFancyByMatchId(data.match_id);
			let fancyRedisMatch = []
			if (fancyRedis.data[0] != null) {
				fancyRedisMatch = fancyRedis.data[0].value.session;
			}

			fancyData.map(function (dbdata, i) {
				if (dbdata != null) {
					let indexOfFancyData = '';
					if (fancyRedisMatch != null) {
						indexOfFancyData = fancyRedisMatch.findIndex(x => (x.SelectionId && x.SelectionId == dbdata.SelectionId));
					} else {
						indexOfFancyData = -1;
					}
					dbdata.scorePostion = JSON.parse(dbdata.scorePostion)
					if (indexOfFancyData === -1) {
						dbdata.inplayStatus = 'CLOSE';
					} else {
						dbdata.inplayStatus = fancyRedisMatch[indexOfFancyData].GameStatus;
						dbdata.BackPrice1 = fancyRedisMatch[indexOfFancyData].BackPrice1;
						dbdata.BackSize1 = fancyRedisMatch[indexOfFancyData].BackSize1;
						dbdata.LayPrice1 = fancyRedisMatch[indexOfFancyData].LayPrice1;
						dbdata.LaySize1 = fancyRedisMatch[indexOfFancyData].LaySize1;
					}
				}
			});

			if (fancyData === null) {
				return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
			} else {
				return resultdb(CONSTANTS.SUCCESS, fancyData);
			}

		}
	} catch (error) {
		console.log("manual session error ------------------------------------", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getSearchExchange = async (data) => {
	try {

		let limit = 50;
		let offset = (data.page - 1) * limit;
		const pool = await poolPromise;

		let whereName = "";
		if (data.team_name != '') {
			whereName += " mtch.name LIKE '%" + data.team_name + "%'";
		}

		console.log("SELECT  * from (SELECT spt.order_by,spt.name as SportName,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, mtch.series_id, mtch.match_id, mtch.name, mtch.sport_id FROM matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' AND mtch.status='Y' AND mtch.is_completed='N' AND mtch.is_cup='N' AND " + whereName + " ) as mtchss");

		const result = await pool.request()
			.query("SELECT  * from (SELECT spt.order_by,spt.name as SportName,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, mtch.series_id, mtch.match_id, mtch.name, mtch.sport_id FROM matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' AND mtch.status='Y' AND mtch.is_completed='N' AND mtch.is_cup='N' AND " + whereName + " ) as mtchss")

		console.log('----------------MATCHESSSS------------------', result.recordsets);
		if (result.recordsets[0].length === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}
module.exports = {
	makeFavouriteMarket,
	getMatchDetailMarketList,
	getMatchBookmakerMarket,
	getMatchSoccerMarketList,
	getMatchTennisMarketList,
	getCupsMatchDetails,
	getHorseRacingMatchDetails,
	getHorseRacingMatchDetailsOtherMarket,
	getGreyHoundRacingMatchDetails,
	getMatchWithoutMatchOddsMarketList,
	gatDataByMarketId,
	getMarketSettingById,
	getCasinoMarketSettingById,
	getTeamPosition,
	getCasinoTeamPosition,
	getFancySettingById,
	getMatchIndiaFancy,
	getMatchCasinoMarketList,
	getMatchCasinoMarketListAnderBahar,
	getMatchCasinoMarketListWorliMatka,
	gatDataByCasinoMarketId,
	matchResult,
	getMatchDetailMarketListNew,
	getMatchBookmakerMarketNew,
	getMatchWithoutMatchOddsMarketListNew,
	getMatchIndiaFancyManual,
	getMatchMarketOdds,
	getMatchOtherMarketOdds,
	getMatchMatkaMarketList,
	getMatchTitliMarketList,

	gatDataByMatkaMarketId,
	getSportIdByMatchId,
	getMatkaTeamPosition,
	getMatkaTempBets,
	deleteMatkaTempBets,
	deleteMatkaAllTempBets,
	getMatkaBets,
	getTitliBets,
	getTitliResult,
	titliResultDeclare,
	thimbleUserLog,
	saveThimbleBet,
	getThimbleBetData,
	saveThimbleMatchMarketSelectionData,
	getTitliLastResult,
	getMatchCasinoMarketListAnderBahar,
	getMatchElectionMarketList, getCricketMatchDetail,
	getMatchBookmakerMarketwithoutLogin,
	getMatchWithoutMatchOddsMarketListwithoutLogin,
	getSoccerMatchDetailWithoutLogin,
	getTennisMatchDetailWithoutLogin,
	getMatchIndiaFancyWithoutAuth,
	getMatchIndiaFancyManualWithoutAuth,
	getSearchExchange,
	getMatchBookmakerOthers,
	getMatchBookmakerOtherMarketwithoutLogin
};
