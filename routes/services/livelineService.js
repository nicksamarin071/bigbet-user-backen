//const MysqlPool = require('../../db');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');
const userModel = require('../../routes/model/userModel');
const exchangeService = require('./exchangeService');
let resultdb = globalFunction.resultdb;
const { poolPromise, sql } = require('../../db')

let getMatchListBySportSeriesIdInPlay = async (data) => {
	try {
		let userData = userModel.getUserData();
		let userId = userData.id;
		let sportId = data.sport_id;
		let inplayDate = Math.floor(Date.now() / 1000);
		const pool = await poolPromise;
		let query = "SELECT ISNULL(mtch.stadium_location,'') as stadium_location,mtch.team_one_image,mtch.team_two_image,mtch.match_number, spt.name as SportName,ser.series_id as SeriesId,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_tv as sportShowTV, ser.name as SeriesName, mtch.match_id, mtch.name, mtch.start_date, mtch.sport_id, mkts.market_id as market_id,(select name from market_selections as sel where sel.match_id=mtch.match_id AND sel.market_id=mkts.market_id AND sel.sort_priority=1) as team_one_name,(select name from market_selections as sel where sel.match_id=mtch.match_id AND sel.market_id=mkts.market_id AND sel.sort_priority=2) as team_two_name FROM matches as mtch JOIN sports as spt ON spt.sport_id = mtch.sport_id LEFT JOIN series as ser ON ser.series_id = mtch.series_id  JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' where NOT EXISTS (SELECT 1  from user_deactive_matches WHERE user_deactive_matches.match_id = mtch.match_id AND user_deactive_matches.user_id =" + userId + " )  AND  NOT EXISTS (SELECT 1 from deactive_sports WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id =" + userId + ") AND spt.status='Y' AND mtch.status='Y' AND mtch.is_cup='N' AND mtch.start_date <= " + inplayDate + " AND mtch.is_completed='N' AND mtch.sport_id=" + data.sport_id + "";

		if (data.series_id != 0) {
			query += ' AND mtch.series_id=' + data.series_id;
		}
		query += 'ORDER BY mtch.start_date ASC';
		const result = await pool.request()
			.query(query)
		if (result.recordset === null || result.recordset.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {

			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}

	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getMatchListBySportSeriesIdUpcomming = async (data) => {
	try {
		let userData = userModel.getUserData();
		let userId = userData.id;
		let inplayDate = Math.floor(Date.now() / 1000);
		const pool = await poolPromise;
		let query = "SELECT ISNULL(mtch.stadium_location,'') as stadium_location,mtch.team_one_image,mtch.team_two_image,mtch.match_number, spt.name as SportName,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_tv as sportShowTV, ser.series_id as SeriesId, ser.name as SeriesName, mtch.match_id, mtch.name, mtch.start_date,mtch.sport_id, mkts.market_id as market_id, (select name from market_selections as sel where sel.match_id=mtch.match_id AND sel.market_id=mkts.market_id AND sel.sort_priority=1) as team_one_name,(select name from market_selections as sel where sel.match_id=mtch.match_id AND sel.market_id=mkts.market_id AND sel.sort_priority=2) as team_two_name FROM matches as mtch JOIN sports as spt ON spt.sport_id = mtch.sport_id LEFT JOIN series as ser ON ser.series_id = mtch.series_id  JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' where NOT EXISTS (SELECT 1  from user_deactive_matches WHERE user_deactive_matches.match_id = mtch.match_id AND user_deactive_matches.user_id =" + userId + " )  AND NOT EXISTS (SELECT 1 from deactive_sports WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id =" + userId + ") AND spt.status='Y' AND mtch.status='Y' AND mtch.is_cup='N' AND mtch.start_date >= " + inplayDate + " AND mtch.is_completed='N' AND mtch.sport_id=" + data.sport_id + "";

		if (data.series_id != 0) {
			query += ' AND mtch.series_id=' + data.series_id;
		}
		query += 'ORDER BY mtch.start_date ASC';
		const result = await pool.request()
			.query(query)
		if (result.recordset === null || result.recordset.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {

			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}

	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getLiveLineMatchDetailMarketList = async (data) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('match_id', sql.Int, data.match_id)
			.input('sport_id', sql.Int, data.sport_id)
			.input('market_id', sql.VarChar(150), data.market_id)
			.query("SELECT ISNULL(mkts.market_admin_message,'') as adminMessage,'' AS InplayStatus, (CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt, (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.odd_limit_back as backRateDiff,mkts.market_type,spt.odd_limit_lay as layRateDiff, mtch.match_id, spt.volume_limit as matchVolumn,spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id  JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.market_id=@market_id AND mkts.status='Y' where spt.sport_id =@sport_id  AND mtch.match_id=@match_id  AND mtch.status='Y' AND mkts.is_result_declared='N' AND mkts.winner_name IS NULL AND spt.status='Y' AND mtch.is_completed='N'")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let matchMarkets = result.recordset;
			let marketID = result.recordset.map((data) => (data.market_id));
			let match_id = result.recordset.map((data) => (data.match_id));
			let market_type = result.recordset.map((data) => (data.market_type));

			let backRateDiff = result.recordset[0].backRateDiff;//result.recordset.map((data)=>(data.backRateDiff));	
			let layRateDiff = result.recordset[0].layRateDiff; //result.recordset.map((data)=>(data.layRateDiff));		
			let matchVolumn = result.recordset[0].matchVolumn > 0 ? result.recordset[0].matchVolumn : 1; //result.recordset.map((data)=>(data.matchVolumn));	

		
			let oddsData = await exchangeService.getOddsByMarketIds(marketID,market_type);
			let MarketSelection = await exchangeService.getMarketSelectionLiveLine(match_id, marketID);
			let SearchArray = [];
			try {
				let MarketSelectionDb = []
				if (MarketSelection.data[0] != null) {
					MarketSelectionDb = MarketSelection.data;
				}
				if (oddsData.data[marketID] != null) {
					oddsData.data[marketID].runners.map(function (dbdata, i) {
						if (dbdata != null) {
							let indexOfFancyData = '';							
							SearchArray.push({ [dbdata.selectionId]: dbdata.ex.availableToBack[0].price });	
							
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
					console.log(' avainsh SearchArray other markets',SearchArray);
						let favouritSelection = SearchArray.reduce(function (res, obj) {
							var keysp = Object.keys(res);
							var keysv = Object.keys(obj);
							return (res[keysp] != 0 && res[keysp] < obj[keysv]) ? res : obj;
						});
	
						favouritSelection = Object.keys(favouritSelection)[0];
						 
						oddsData.data[matchMarkets[0].market_id].runners.map(function (dbdata, i) {
	
							if (dbdata != null) { 							 
								if (favouritSelection == dbdata.selectionId) {								 
									matchMarkets[0].fav_team_name = dbdata.selectionName;
									matchMarkets[0].fav_team_back = dbdata.ex.availableToBack[0].price;//MarketSelectionDb[indexOfFancyData].SelectionName;
									matchMarkets[0].fav_team_lay =dbdata.ex.availableToLay[0].price;// dbdata.selectionId;
									matchMarkets[0].fav_seletion_id = dbdata.selectionId;
									dbdata.GameStatus="";
									//dbdata.GameStatus="SUSPENDED";
									//dbdata.ex = CONSTANTS.BACK_LAY_BLANK_ARRAY;	
								} 
							}
						});
				} else {
					if (matchMarkets[0].runner_json != null) {
						let runner_json2 = JSON.parse(matchMarkets[0].runner_json);
						runner_json2.map(function (dbdata, i) {
							if (dbdata != null) {
								SearchArray.push({ [dbdata.selectionId]: dbdata.ex.availableToBack[0].price });

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
						//console.log(' avainsh SearchArray other markets',SearchArray);
						let favouritSelection = SearchArray.reduce(function (res, obj) {
							var keysp = Object.keys(res);
							var keysv = Object.keys(obj);
							return (res[keysp] < obj[keysv]) ? res : obj;
						});
	
						favouritSelection = Object.keys(favouritSelection)[0];
						console.log('matchMarkets[0].market_id ---------------- ',matchMarkets[0].market_id);
						runner_json2.map(function (dbdata, i) {
	
							if (dbdata != null) {
								if (favouritSelection == dbdata.selectionId) {
									matchMarkets[0].fav_team_name = dbdata.selectionName;
									matchMarkets[0].fav_team_back = dbdata.ex.availableToBack[0].price;//MarketSelectionDb[indexOfFancyData].SelectionName;
									matchMarkets[0].fav_team_lay =dbdata.ex.availableToLay[0].price;// dbdata.selectionId;
									matchMarkets[0].fav_seletion_id = dbdata.selectionId;
									dbdata.GameStatus="";
									//dbdata.GameStatus="SUSPENDED";
									//dbdata.ex = CONSTANTS.BACK_LAY_BLANK_ARRAY;
	
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
				oddsData.data[data.market_id] ? { ...data, runner_json:'', InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE' } : { ...data, runner_json: '', InplayStatus: 'CLOSE' }
			));
			if (newdata === null || newdata.length == 0) {
				return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);

			} else {
				return resultdb(CONSTANTS.SUCCESS, newdata[0]);
			}
	 
			/* for (let i in matchMarkets) {
				let matchMarketsDetails = matchMarkets[i];
				let MarketSelection = await exchangeService.getMarketSelectionLiveLine(matchMarketsDetails.match_id, matchMarketsDetails.market_id);
				try {

					if (oddsData.data[matchMarketsDetails.market_id] !== undefined && MarketSelection.data.length > 0) {
						for (let j in MarketSelection.data) {
							if (MarketSelection.data[j].selection_id == oddsData.data[matchMarketsDetails.market_id].runners[j].selectionId) {
								oddsData.data[matchMarketsDetails.market_id].runners[j]['selectionName'] = MarketSelection.data[j].SelectionName;
								oddsData.data[matchMarketsDetails.market_id].runners[j]['sort_priority'] = MarketSelection.data[j].sort_priority;
							} else {
								oddsData.data[matchMarketsDetails.market_id].runners[j]['selectionName'] = "";
								oddsData.data[matchMarketsDetails.market_id].runners[j]['sort_priority'] = "";
							}
						}
					} else {

						if (matchMarketsDetails.runner_json && matchMarketsDetails.runner_json !== null) {
							let runner_json2 = JSON.parse(matchMarkets[i].runner_json);
							for (let j in MarketSelection.data) {
								if (MarketSelection.data[j].selection_id == runner_json2[j].selectionId) {
									runner_json2[j]['selectionName'] = MarketSelection.data[j].SelectionName;
									runner_json2[j]['sort_priority'] = MarketSelection.data[j].sort_priority;
								} else {
									runner_json2[j]['selectionName'] = "";
									runner_json2[j]['sort_priority'] = "";

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
			if (newdata === null || newdata.length == 0) {
				return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);

			} else {
				return resultdb(CONSTANTS.SUCCESS, newdata[0]);
			} */

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};

module.exports = {
	getMatchListBySportSeriesIdInPlay,
	getMatchListBySportSeriesIdUpcomming,
	getLiveLineMatchDetailMarketList,
};