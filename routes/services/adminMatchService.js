const settings = require('../../config/settings');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');
const axios = require('axios');
const exchangeService = require('./exchangeService');
let resultdb = globalFunction.resultdb;
const { poolPromise, sql } = require('../../db');
const connConfig = require('../../db/indexTest');
const SALT_WORK_FACTOR = 10;

let getMatchDetailsOdds = async (data) => {
	try {
		const pool = await poolPromise;

		const result = await pool.request()
			.input('user_id', sql.Int, data.user_id)
			.input('role_id', sql.Int, data.role_id)
			.input('match_id', sql.Int, data.match_id)
			.query("SELECT ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=102 and permission_role.role_id=@role_id ),0) as setting,spt.sport_id,(CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore, ( CASE WHEN disable.user_id IS NULL OR disable.user_id=0 THEN 'Y' ELSE 'N' END ) as matchBetAllow,mtch.is_fancy_bet_allow as matchFancyBetAllow,mkts.min_stack AS marketMinStack,mkts.max_stack AS marketMaxStack, spt.name as SportName,ISNULL(CASE WHEN (disable.user_id IS NOT NULL OR disable.user_id !=0) AND mkts.market_admin_message IS NULL THEN 'BET LOCKED' ELSE mkts.market_admin_message END,'') as adminMessage,(CASE WHEN (select count(*) from markets with(nolock) where match_id=mtch.match_id AND status='Y' AND is_result_declared='N' AND (isbetalowaftermatchodds='Y' OR name='Book Maker') AND (result_id IS NULL OR result_id=0)) > 0 THEN 'OPEN' ELSE 'CLOSE' END) AS InplayStatus,'' AS MainTV,'' AS PlayTv1,'' AS PlayTv2,'' AS PlayTv3,'' AS PlayTv4,'' AS graphics,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,(CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit END ) as SportminOddsLimt,(CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,mkts.market_id as marketId,mkts.runner_json FROM matches as mtch with(nolock) JOIN sports spt with(nolock) ON spt.sport_id=mtch.sport_id  JOIN markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name='Match Odds' AND mkts.status='Y' LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id AND  dspt.sport_id=mtch.sport_id and dspt.user_id =@user_id LEFT JOIN user_deactive_matches as udmtch with(nolock) ON udmtch.match_id= mtch.match_id AND  udmtch.match_id=@match_id and udmtch.user_id =@user_id LEFT JOIN disable_match_markets as disable with(nolock) ON disable.market_id = mkts.market_id and disable.user_id =@user_id   where spt.sport_id =mtch.sport_id AND ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND ( udmtch.match_id  IS NULL OR udmtch.match_id=0)  AND mtch.match_id=@match_id  AND mtch.status='Y' AND mkts.is_result_declared='N' AND mkts.winner_name IS NULL AND spt.status='Y' AND mtch.is_completed='N'")

		if (result.recordset === null || result.recordset == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			let matchMarkets = result.recordset;

			let marketID = result.recordset.map((data) => (data.marketId));
			let match_id = result.recordset.map((data) => (data.match_id));

			let backRateDiff = result.recordset[0].backRateDiff;//result.recordset.map((data)=>(data.backRateDiff));	
			let layRateDiff = result.recordset[0].layRateDiff; //result.recordset.map((data)=>(data.layRateDiff));		
			let matchVolumn = result.recordset[0].matchVolumn > 0 ? result.recordset[0].matchVolumn : 1; //result.recordset.map((data)=>(data.matchVolumn));	



			let oddsData = await exchangeService.getOddsByMarketIds(marketID);

			let MarketSelection = await exchangeService.admin_getMarketSelection(match_id, marketID, data.user_id, data.role_id);

			/* for (let i in matchMarkets) {
				let matchMarketsDetails = matchMarkets[i];
				let MarketSelection = await exchangeService.admin_getMarketSelection(matchMarketsDetails.match_id, matchMarketsDetails.marketId, data.user_id, data.role_id); */

			try {
				let MarketSelectionDb = []
				if (MarketSelection.data[0] != null) {
					MarketSelectionDb = MarketSelection.data;
				}

				if (oddsData.data[marketID] != null && oddsData.data[marketID].runners != null) {
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
								dbdata.selectionName = MarketSelectionDb[indexOfFancyData].selectionName;
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
									dbdata.selectionName = MarketSelectionDb[indexOfFancyData].selectionName;
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
				oddsData.data[data.marketId] ? { ...data, runner_json: oddsData.data[data.marketId].runners, InplayStatus: oddsData.data[data.marketId].status ? oddsData.data[data.marketId].status : 'CLOSE', MainTV: settings.GET_MATCH_TV_MAIN_URL, PlayTv1: settings.GET_MATCH_TV1_URL, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + data.match_id } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, MainTV: settings.GET_MATCH_TV_MAIN_URL, PlayTv1: settings.GET_MATCH_TV1_URL, PlayTv2: settings.GET_MATCH_TV2_URL, PlayTv3: settings.GET_MATCH_TV3_URL, PlayTv4: settings.GET_MATCH_TV4_URL, graphics: settings.GET_GRAPHICS_URL + "" + data.match_id }
			));

			if (newdata === null || newdata.length == 0) {
				return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);

			} else {
				return resultdb(CONSTANTS.SUCCESS, newdata[0]);
			}

			//   let matchData = result.recordset;
			//   try{
			//       for(let i in matchData)
			//       {
			//           let matchDataDetails = matchData[i];
			//           let runnerJson=await exchangeService.admin_getMarketSelection(matchDataDetails.match_id,matchDataDetails.marketId,data.user_id,data.role_id);
			//           matchData[i].runners=runnerJson.data;
			//        }
			//   }catch(e)
			//   {
			//       console.log(e);
			//       return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
			//   }           
			//   return resultdb(CONSTANTS.SUCCESS, matchData);
		}

	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getCasinoMatchDetailsOdds = async (data) => {
	try {
		const pool = await poolPromise;
		let conditionMatchid = data.match_id;

		const result = await pool.request()
			.input('user_id', sql.Int, data.user_id)
			.input('role_id', sql.Int, data.role_id)
			.input('match_id', sql.BigInt, conditionMatchid)
			.query("SELECT (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore, spt.name as SportName,ISNULL(mkts.market_admin_message,'') as adminMessage,'' AS InplayStatus,'' AS MainTV,'' AS graphics,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,(CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt,(CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM cassino_matches as mtch with(nolock) JOIN sports spt with(nolock) ON spt.sport_id=mtch.sport_id  JOIN cassino_markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name='Match Odds' LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id AND  dspt.sport_id=mtch.sport_id and dspt.user_id =@user_id where spt.sport_id =mtch.sport_id AND ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND mtch.match_id=@match_id  AND mtch.status='Y' AND spt.status='Y'")

		if (result.recordset === null || result.recordset == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {

			let matchMarkets = result.recordset;

			let marketID = data.sport_id + matchMarkets[0].market_id;
			let oddsData = await exchangeService.getCasinoOddsByMarketIds([marketID]);
			let matinTv = await exchangeService.getCasinoLiveTv(data.sport_id);
			let marketRunnerJson = [];
			let selectionMatch = [];

			let matchMarketsDetails = matchMarkets[0];
			let compairMarketid = matchMarketsDetails.market_id;
			matchMarketsDetails.errorMessage = "";
			let MarketSelection = await exchangeService.admin_getCasinoMarketSelection(matchMarketsDetails.match_id, matchMarketsDetails.market_id, data.user_id, data.role_id);
			console.log(MarketSelection);
			//let MarketSelection = await exchangeService.admin_getMarketSelection(match_id, marketID, data.user_id, data.role_id);

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
				console.log('roundId', roundId);
				console.log('compairMarketid', compairMarketid);
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
			/* for (let i in matchMarkets) {
				let matchMarketsDetails = matchMarkets[i];

				let MarketSelection = await exchangeService.getCasinoMarketSelection(matchMarketsDetails.match_id, matchMarketsDetails.market_id, data.id);

				if (matchMarketsDetails.runner_json !== null && (oddsData === null || oddsData === undefined)) {
					let runnerJson = JSON.parse(matchMarketsDetails.runner_json);
					 
					let marktRunner = runnerJson[i].marketRunner;				 
					for (let k in marktRunner) {
						let selectionID = marktRunner[k].id;
						selectionMatch = MarketSelection.data.filter(function (data) {
							if (data.selection_id == selectionID) {
								marktRunner[k].WinAndLoss = data.win_loss_value;
							}
						});
						let runnerJs = marktRunner[k];
						runnerJs.superStatus = runnerJson[i].status;
						marketRunnerJson.push(runnerJs);
					}
				}
				else {

					let runnerJson = oddsData.data;
				 
					matchMarkets[i].indexCard = runnerJson[i].indexCard;
					matchMarkets[i].timer = runnerJson[i].timer;
					let marktRunner = runnerJson[i].marketRunner;
					for (let k in marktRunner) {
						let selectionID = marktRunner[k].id;
						selectionMatch = MarketSelection.data.filter(function (data) {
							if (data.selection_id == selectionID) {
								marktRunner[k].WinAndLoss = data.win_loss_value;
							}
						});
						let runnerJs = marktRunner[k];
						runnerJs.superStatus = runnerJson[i].status;
						marketRunnerJson.push(runnerJs);
					}
				}
				matchMarkets[i].runner_json = JSON.stringify(marketRunnerJson);
			} */
			/* let newdata = matchMarkets.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE', MainTV: CONSTANTS.GET_CASION_TV_URL[oddsData.data[data.sport_id]] } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, InplayStatus: 'CLOSE', MainTV: CONSTANTS.GET_CASION_TV_URL[data.sport_id] }
			)); */
			//return resultdb(CONSTANTS.SUCCESS, newdata[0]);
		}

	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getMatchDetailsOthers = async (data) => {
	try {
		const pool = await poolPromise;

		const result = await pool.request()
			.input('user_id', sql.Int, data.user_id)
			.input('role_id', sql.Int, data.role_id)
			.input('match_id', sql.Int, data.match_id)
			.query("SELECT (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore, ( CASE WHEN disable.user_id IS NULL OR disable.user_id=0 THEN 'Y' ELSE 'N' END ) as matchBetAllow, spt.name as SportName,ISNULL(CASE WHEN (disable.user_id IS NOT NULL OR disable.user_id !=0) AND mkts.market_admin_message IS NULL THEN 'BET LOCKED' ELSE mkts.market_admin_message END,'') as adminMessage, '' AS InplayStatus,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,(CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt,(CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,mkts.min_stack AS marketMinStack,mkts.max_stack AS marketMaxStack, mkts.market_type,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as marketId,mkts.runner_json FROM matches as mtch with(nolock) JOIN sports spt with(nolock) ON spt.sport_id=mtch.sport_id  JOIN markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name !='Match Odds' AND mkts.status='Y'  LEFT JOIN disable_match_markets as disable with(nolock) ON disable.market_id = mkts.market_id and disable.user_id =@user_id  LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id AND  dspt.sport_id=mtch.sport_id and dspt.user_id =@user_id LEFT JOIN user_deactive_matches as udmtch with(nolock) ON udmtch.match_id= mtch.match_id AND  udmtch.match_id=@match_id and udmtch.user_id =@user_id  where mtch.match_id=@match_id AND ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND ( udmtch.match_id  IS NULL OR udmtch.match_id=0) AND mtch.status='Y' AND mkts.is_result_declared='N' AND mkts.winner_name IS NULL AND spt.status='Y' AND mtch.is_completed='N'")
		if (result.recordset === null || result.recordset == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let matchMarkets = result.recordset;
			let marketID = result.recordset.map((data) => (data.marketId));
			let market_type = result.recordset.map((data) => (data.market_type));
			let oddsData = await exchangeService.getOddsByMarketIds(marketID, market_type);
			//let oddsData = await exchangeService.getOddsByMarketIds(marketID);
			for (let i in matchMarkets) {
				let matchMarketsDetails = matchMarkets[i];

				let backRateDiff = matchMarketsDetails.backRateDiff;//result.recordset.map((data)=>(data.backRateDiff));	
				let layRateDiff = matchMarketsDetails.layRateDiff; //result.recordset.map((data)=>(data.layRateDiff));		
				let matchVolumn = matchMarketsDetails.matchVolumn; //result.recordset.map((data)=>(data.matchVolumn));

				let MarketSelection = await exchangeService.admin_getMarketSelection(matchMarketsDetails.match_id, matchMarketsDetails.marketId, data.user_id, data.role_id);
				try {
					let MarketSelectionDb = []
					if (MarketSelection.data[0] != null) {
						MarketSelectionDb = MarketSelection.data;
					}
					if (oddsData.data[matchMarketsDetails.marketId] != null && oddsData.data[matchMarketsDetails.marketId].runners != null) {

						oddsData.data[matchMarketsDetails.marketId].runners.map(function (dbdata, i) {
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
									//console.log('avinash---------------- BackPriceSize.price --------------- ',BackPriceSize.price);

								});
								dbdata.ex.availableToLay.map(function (LayPriceSize) {
									LayPriceSize.price = Number(parseFloat(parseFloat(LayPriceSize.price) + parseFloat(layRateDiff)).toFixed(2));
									LayPriceSize.size = Number(parseFloat(parseFloat(LayPriceSize.size) * parseFloat(matchVolumn)).toFixed(2));

								});

								if (indexOfFancyData === -1) {
									dbdata.WinAndLoss = 0;
								} else {
									dbdata.selectionName = MarketSelectionDb[indexOfFancyData].selectionName;
									dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
									dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
								}
							}
						});

						/* if (oddsData.data[matchMarketsDetails.marketId] !== undefined && MarketSelection.data.length > 0) {
							for (let j in MarketSelection.data) {
								if (MarketSelection.data[j].selection_id == oddsData.data[matchMarketsDetails.marketId].runners[j].selectionId) {
									oddsData.data[matchMarketsDetails.marketId].runners[j]['selectionName'] = MarketSelection.data[j].selectionName;
									oddsData.data[matchMarketsDetails.marketId].runners[j]['sort_priority'] = MarketSelection.data[j].sort_priority;
									oddsData.data[matchMarketsDetails.marketId].runners[j]['WinAndLoss'] = MarketSelection.data[j].win_loss_value;
								} else {
									let getSelectionID = oddsData.data[matchMarketsDetails.marketId].runners[j].selectionId;
	
									let getDBSelectionData = await exchangeService.admin_getMarketSelectionWithSelectionId(matchMarketsDetails.match_id, matchMarketsDetails.marketId, data.user_id, getSelectionID, data.role_id);
	
									if (getDBSelectionData) {
										oddsData.data[matchMarketsDetails.marketId].runners[j]['selectionName'] = getDBSelectionData.data[0].selectionName;
										oddsData.data[matchMarketsDetails.marketId].runners[j]['sort_priority'] = getDBSelectionData.data[0].sort_priority;
										oddsData.data[matchMarketsDetails.marketId].runners[j]['WinAndLoss'] = getDBSelectionData.data[0].win_loss_value;
									} else {
										oddsData.data[matchMarketsDetails.marketId].runners[j]['selectionName'] = "";
										oddsData.data[matchMarketsDetails.marketId].runners[j]['sort_priority'] = "";
										oddsData.data[matchMarketsDetails.marketId].runners[j]['WinAndLoss'] = 0;
									}
								}
							} */
					} else {

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
										dbdata.selectionName = MarketSelectionDb[indexOfFancyData].selectionName;
										dbdata.sort_priority = MarketSelectionDb[indexOfFancyData].sort_priority;
										dbdata.WinAndLoss = MarketSelectionDb[indexOfFancyData].win_loss_value;
									}
								}
							});
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
				oddsData.data[data.marketId] ? { ...data, runner_json: oddsData.data[data.marketId].runners, InplayStatus: oddsData.data[data.marketId].status ? oddsData.data[data.marketId].status : 'CLOSE' } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, InplayStatus: 'CLOSE' }
			));
			return resultdb(CONSTANTS.SUCCESS, newdata);
		}

	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getMatchDetailsCompleted = async (data) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, data.user_id)
			.input('match_id', sql.Int, data.match_id)
			.query("select  markets.is_result_declared,markets.winner_name, matches.name as matchName,matches.sport_id as sportId,markets.market_id as marketId,markets.name as marketName,matches.match_date as matchDate,matches.status,matches.match_id,markets.runner_json from matches with(nolock) join markets with(nolock) on markets.match_id = matches.match_id  where (matches.match_id =@match_id AND markets.is_result_declared ='Y' AND markets.status='N') and  NOT EXISTS (SELECT 1  from user_deactive_matches with(nolock) WHERE user_deactive_matches.match_id = matches.match_id AND user_deactive_matches.user_id =@user_id)")

		if (result.recordset === null || result.recordset == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let matchMarkets = result.recordset;
			let marketID = result.recordset.map((data) => (data.marketId));
			let oddsData = await exchangeService.getOddsByMarketIds(marketID);
			for (let i in matchMarkets) {
				let matchMarketsDetails = matchMarkets[i];
				let MarketSelection = await exchangeService.admin_getMarketSelection(matchMarketsDetails.match_id, matchMarketsDetails.marketId, data.user_id, data.role_id);
				//let MarketSelection=await exchangeService.getMarketSelection(matchMarketsDetails.match_id,matchMarketsDetails.marketId,data.user_id);	

				try {
					if (matchMarketsDetails.runner_json && matchMarketsDetails.runner_json !== null) {
						let runner_json2 = JSON.parse(matchMarkets[i].runner_json);
						for (let j in MarketSelection.data) {
							if (MarketSelection.data[j].selection_id == runner_json2[j].selectionId) {
								runner_json2[j]['selectionName'] = MarketSelection.data[j].selectionName;
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


					// if(oddsData.data[matchMarketsDetails.marketId] !== undefined && MarketSelection.data.length > 0){
					// 	for(let j in MarketSelection.data){	
					// 		if(MarketSelection.data[j].selection_id == oddsData.data[matchMarketsDetails.marketId].runners[j].selectionId)
					// 		{ 		
					// 			oddsData.data[matchMarketsDetails.marketId].runners[j]['selectionName']=MarketSelection.data[j].selectionName;	
					// 			oddsData.data[matchMarketsDetails.marketId].runners[j]['sort_priority']=MarketSelection.data[j].sort_priority;	
					// 			oddsData.data[matchMarketsDetails.marketId].runners[j]['WinAndLoss']=MarketSelection.data[j].win_loss_value;				
					// 		}else{
					// 			let getSelectionID = oddsData.data[matchMarketsDetails.marketId].runners[j].selectionId;

					// 			let getDBSelectionData=await exchangeService.admin_getMarketSelectionWithSelectionId(matchMarketsDetails.match_id,matchMarketsDetails.marketId,data.user_id,getSelectionID,data.role_id);

					// 		 if(getDBSelectionData){  
					// 		 	oddsData.data[matchMarketsDetails.marketId].runners[j]['selectionName']=getDBSelectionData.data[0].selectionName;	
					// 		 	oddsData.data[matchMarketsDetails.marketId].runners[j]['sort_priority']=getDBSelectionData.data[0].sort_priority;	
					// 		 	oddsData.data[matchMarketsDetails.marketId].runners[j]['WinAndLoss']=getDBSelectionData.data[0].win_loss_value;
					// 		 }else{
					// 			oddsData.data[matchMarketsDetails.marketId].runners[j]['selectionName']="";
					// 			oddsData.data[matchMarketsDetails.marketId].runners[j]['sort_priority']="";	
					// 			oddsData.data[matchMarketsDetails.marketId].runners[j]['WinAndLoss']=0;
					// 		 }	
					// 		}
					//  }					
					// }else{						



					// }					
				}
				catch (e) {
					console.log(e);
					return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
				}
			}
			let newdata = matchMarkets.map((data) => (
				oddsData.data[data.marketId] ? { ...data, runner_json: oddsData.data[data.marketId].runners, InplayStatus: oddsData.data[data.marketId].status ? oddsData.data[data.marketId].status : 'CLOSE' } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, InplayStatus: 'CLOSE' }
			));
			return resultdb(CONSTANTS.SUCCESS, newdata);
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
			.input('user_id', sql.Int, data.user_id)
			.input('match_id', sql.Int, data.match_id)
			.query("SELECT fanc.selection_id as SelectionId,mtch.start_date,ISNULL(CASE WHEN(disable.user_id IS NOT NULL OR disable.user_id !=0) AND fanc.market_admin_message IS NULL THEN 'BET SUSPENDED' ELSE fanc.market_admin_message END,'') as adminMessage, (CASE WHEN spt.is_bet_allow = fanc.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, CASE  WHEN fanc.bet_allow_time_before > spt.bet_allow_time_before THEN fanc.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END AS BetAllowTimeBefore, fanc.name as RunnerName, fanc.session_value_yes as BackPrice1,fanc.session_size_yes as BackSize1, fanc.session_value_no as LayPrice1, fanc.session_size_no as LaySize1,'' AS inplayStatus, ( SELECT fancy_score_position_json from fancy_score_positions with(nolock) WHERE match_id=@match_id AND user_id=@user_id AND fancy_id=fanc.selection_id AND position_status ='A' ) as scorePostion FROM fancies fanc with(nolock) INNER JOIN matches as mtch with(nolock) ON mtch.match_id=fanc.match_id AND mtch.match_id=@match_id AND mtch.status='Y' INNER LOOP JOIN sports spt with(nolock) ON spt.sport_id=fanc.sport_id LEFT JOIN deactive_fancies as dfancy with(nolock) ON dfancy.match_id= fanc.match_id AND  dfancy.match_id=@match_id and dfancy.user_id =@user_id LEFT JOIN disable_match_fancies as disable with(nolock) ON disable.match_id= mtch.match_id AND disable.user_id=@user_id	WHERE fanc.match_id=@match_id AND (fanc.status='A' OR fanc.status='C') AND fanc.fancyStatus='A' AND fanc.result IS NULL AND ( dfancy.match_id  IS NULL OR dfancy.match_id=0)")

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
			// return resultdb(CONSTANTS.SUCCESS, result.recordset);	
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};

let getMatchIndiaFancyManual = async (data) => {
	try {
		const pool = await poolPromise;

		const result = await pool.request()
			.input('user_id', sql.Int, data.user_id)
			.input('match_id', sql.Int, data.match_id)
			.query("SELECT fanc.selection_id as SelectionId,mtch.start_date,ISNULL(CASE WHEN (disable.user_id IS NOT NULL OR disable.user_id !=0) AND fanc.market_admin_message IS NULL THEN 'BET SUSPENDED' ELSE fanc.market_admin_message END,'') as adminMessage, (CASE WHEN spt.is_bet_allow = fanc.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, CASE  WHEN fanc.bet_allow_time_before > spt.bet_allow_time_before THEN fanc.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END AS BetAllowTimeBefore, fanc.name as RunnerName, fanc.session_value_yes as BackPrice1,fanc.session_size_yes as BackSize1, fanc.session_value_no as LayPrice1, fanc.session_size_no as LaySize1,'' AS inplayStatus, ( SELECT fancy_score_position_json from fancy_score_positions with(nolock) WHERE match_id=@match_id AND user_id=@user_id AND fancy_id=fanc.selection_id AND position_status ='A' ) as scorePostion FROM fancies fanc with(nolock) INNER JOIN matches as mtch with(nolock) ON mtch.match_id=fanc.match_id AND mtch.match_id=@match_id AND mtch.status='Y' INNER LOOP JOIN sports spt with(nolock) ON spt.sport_id=fanc.sport_id LEFT JOIN deactive_fancies as dfancy with(nolock) ON dfancy.match_id= fanc.match_id AND  dfancy.match_id=@match_id and dfancy.user_id = @user_id LEFT JOIN disable_match_fancies as disable with(nolock) ON disable.match_id= mtch.match_id AND disable.user_id=@user_id WHERE fanc.match_id=@match_id AND (fanc.status='A' OR fanc.status='C') AND fanc.fancyStatus='M' AND fanc.result IS NULL AND ( dfancy.match_id  IS NULL OR dfancy.match_id=0)")

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
				return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
			} else {
				return resultdb(CONSTANTS.SUCCESS, fancyData);
			}
			// return resultdb(CONSTANTS.SUCCESS, result.recordset);	
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};




let admin_getMatchAndMarketBets = async (data) => {
	try {
		const pool = await poolPromise;
		let inplayDate = Math.floor(Date.now() / 1000);
		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('match_id', sql.Int, data.match_id)
			.query("SELECT fanc.user_id,fanc.selection_id as SelectionId,ISNULL(fanc.market_admin_message,'') as adminMessage, fanc.name as RunnerName,fanc.status FROM fancies fanc with(nolock) where fanc.match_id=@match_id AND (fanc.status='A' OR fanc.status='C') AND fanc.result IS NULL AND  NOT EXISTS (SELECT 1  from deactive_fancies with(nolock) WHERE deactive_fancies.match_id = @match_id AND deactive_fancies.user_id= @user_id)")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
function isFloat(n) {
	if (n.match(/^-?\d*(\.\d+)?$/) && !isNaN(parseFloat(n)) && (n % 1 != 0))
		return true;
	return false;
}
let getMyBetFairMarketBets = async (data) => {
	try {
		let condition = "";
		if (data.role_id === CONSTANTS.USER_TYPE_SUPER_ADMIN) {
			condition = 'super_admin_id';
		} else if (data.role_id === CONSTANTS.USER_TYPE_ADMIN) {
			condition = 'admin_id';
		}
		else if (data.role_id === CONSTANTS.USER_TYPE_SUPER_MASTER) {
			condition = 'super_master_id';
		}
		else if (data.role_id === CONSTANTS.USER_TYPE_MASTER) {
			condition = 'master_id';
		}
		else if (data.role_id === CONSTANTS.USER_TYPE_AGENT) {
			condition = 'agent_id';
		} else if (data.role_id === CONSTANTS.USER_TYPE_USER) {
			condition = 'user_id';
		}


		let searchQuery = "";
		let backLay = "";

		if (data.search.length >= 1) {

			searchQuery += " AND ( selection.name ='" + data.search + "'";
			if (isFloat(data.search)) {
				searchQuery += " OR bet.odds = CAST('" + data.search + "' AS FLOAT)";
			}
			if (isNumeric(data.search)) {
				searchQuery += " OR bet.stack =CAST('" + data.search + "' AS FLOAT)";
			}

			if (data.search == 'Back' || data.search == 'back') {
				backLay += " AND bet.is_back='1'";
			}
			if (data.search == 'Lay' || data.search == 'lay') {
				backLay += " AND bet.is_back='0'";
			}
			searchQuery += " OR 1=CASE WHEN EXISTS(SELECT id FROM users with(nolock) WHERE user_name='" + data.search + "') THEN  CASE WHEN bet.user_id= (SELECT id FROM users with(nolock) WHERE user_name='" + data.search + "') THEN 1 ELSE 0 END ELSE  0  END";

			searchQuery += " OR bet.created_ip = '" + data.search + "')";
		}
		let offset = (data.page - 1) * data.limit;

		const pool = await poolPromise;
		let query = "SELECT ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=111 and permission_role.role_id=" + data.role_id + "),0) as betDelete,ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=112 and permission_role.role_id=" + data.role_id + "),0) as betVoid,ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=113 and permission_role.role_id=" + data.role_id + "),0) as betRollback, 'B' as completed, bet.user_id,bet.market_id, bet.id,(select dbo.FN_GET_PARENT_USER_LEVEL(" + data.role_id + ",bet.user_id) ) as user_hierarchical,bet.sport_id,bet.match_id, bet.delete_status as status , (CASE WHEN bet.delete_status=1 THEN 'D' ELSE CASE WHEN bet.delete_status=2 THEN 'V' ELSE '' END END ) as betStatus,selection.selection_id as selectionId,selection.name as selectionName,bet.odds,bet.stack,bet.is_back,ROUND((CASE WHEN bet.is_back=1 THEN bet.p_l ELSE bet.liability END),2) AS p_l,bet.created_ip,bet.created_at from bets_odds as bet with(nolock) INNER JOIN market_selections as selection with(nolock) ON selection.selection_id = bet.selection_id AND selection.match_id=" + data.match_id + " AND  selection.market_id=bet.market_id JOIN users as usr with(nolock) ON usr.id=" + data.user_id + " where bet." + condition + "=" + data.user_id + " AND bet.match_id=" + data.match_id + " AND (bet.delete_status = ((CASE WHEN usr.role_id IN " + settings.SHOW_ALL_BETS_USER_ROLE_ID + " THEN 1 ELSE 0 END )) OR bet.delete_status = ((CASE WHEN usr.role_id IN " + settings.SHOW_ALL_BETS_USER_ROLE_ID + " THEN 0 ELSE 0 END )) OR bet.delete_status = ((CASE WHEN usr.role_id IN " + settings.SHOW_ALL_BETS_USER_ROLE_ID + " THEN 2 ELSE 2 END ))) AND selection.match_id=" + data.match_id + " AND (bet.bet_result_id=0 AND bet.winner_name IS NULL) " + searchQuery + "  " + backLay + "";
		if (data.market_id != 0) {
			query += " AND bet.market_id=" + data.market_id + " AND  selection.market_id=" + data.market_id + "";
		}
		query += ' ORDER BY id DESC OFFSET  ' + offset + ' ROWS FETCH NEXT ' + data.limit + ' ROWS ONLY';


		//console.log(query);
		const result = await pool.request()
			.query(query)
		if (result === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}

	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getCasinoMyBetFairMarketBets = async (data) => {
	try {
		let condition = "";
		if (data.role_id === CONSTANTS.USER_TYPE_SUPER_ADMIN) {
			condition = 'super_admin_id';
		} else if (data.role_id === CONSTANTS.USER_TYPE_ADMIN) {
			condition = 'admin_id';
		}
		else if (data.role_id === CONSTANTS.USER_TYPE_SUPER_MASTER) {
			condition = 'super_master_id';
		}
		else if (data.role_id === CONSTANTS.USER_TYPE_MASTER) {
			condition = 'master_id';
		}
		else if (data.role_id === CONSTANTS.USER_TYPE_AGENT) {
			condition = 'agent_id';
		} else if (data.role_id === CONSTANTS.USER_TYPE_USER) {
			condition = 'user_id';
		}

		const pool = await poolPromise;
		let query = "SELECT ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=111 and permission_role.role_id=" + data.role_id + "),0) as betDelete,ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=112 and permission_role.role_id=" + data.role_id + "),0) as betVoid,ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=113 and permission_role.role_id=" + data.role_id + "),0) as betRollback, 'B' as completed, bet.user_id,bet.market_id, bet.id,(select dbo.FN_GET_PARENT_USER_LEVEL(" + data.role_id + ",bet.user_id) ) as user_hierarchical,bet.sport_id,bet.match_id, bet.delete_status as status ,  (CASE WHEN bet.delete_status=1 THEN 'D' ELSE CASE WHEN bet.delete_status=2 THEN 'V' ELSE '' END END ) as betStatus,selection.selection_id as selectionId,selection.name as selectionName,bet.odds,bet.stack,bet.is_back,ROUND((CASE WHEN bet.is_back=1 THEN bet.p_l ELSE bet.liability END),2) AS p_l,bet.created_ip,bet.created_at from cassino_bets_odds as bet with(nolock) INNER JOIN cassino_market_selections as selection with(nolock) ON selection.selection_id = bet.selection_id AND selection.match_id=" + data.match_id + " AND  selection.market_id=bet.market_id JOIN users as usr with(nolock) ON usr.id=" + data.user_id + "  where bet." + condition + "=" + data.user_id + " AND bet.match_id=" + data.match_id + " AND (bet.delete_status = ((CASE WHEN usr.role_id IN " + settings.SHOW_ALL_BETS_USER_ROLE_ID + " THEN 1 ELSE 0 END )) OR bet.delete_status = ((CASE WHEN usr.role_id IN " + settings.SHOW_ALL_BETS_USER_ROLE_ID + " THEN 0 ELSE 0 END )) OR bet.delete_status = ((CASE WHEN usr.role_id IN " + settings.SHOW_ALL_BETS_USER_ROLE_ID + " THEN 2 ELSE 2 END ))) AND selection.match_id=" + data.match_id + " AND (bet.bet_result_id=0 AND bet.winner_name IS NULL)";
		if (data.market_id != 0) {
			query += " AND bet.market_id=" + data.market_id + " AND  selection.market_id=" + data.market_id + "";
		}
		query += ' ORDER BY id DESC';
		//console.log(query);
		const result = await pool.request().query(query);
		if (result === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}

	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getCompletedBetFairMarketBets = async (data) => {
	try {
		let condition = "";
		if (data.role_id === CONSTANTS.USER_TYPE_SUPER_ADMIN) {
			condition = 'super_admin_id';
		} else if (data.role_id === CONSTANTS.USER_TYPE_ADMIN) {
			condition = 'admin_id';
		}
		else if (data.role_id === CONSTANTS.USER_TYPE_SUPER_MASTER) {
			condition = 'super_master_id';
		}
		else if (data.role_id === CONSTANTS.USER_TYPE_MASTER) {
			condition = 'master_id';
		}
		else if (data.role_id === CONSTANTS.USER_TYPE_AGENT) {
			condition = 'agent_id';
		} else if (data.role_id === CONSTANTS.USER_TYPE_USER) {
			condition = 'user_id';
		}

		let searchQuery = "";
		let backLay = "";

		if (data.search.length >= 1) {

			searchQuery += " AND ( selection.name ='" + data.search + "'";
			if (isFloat(data.search)) {
				searchQuery += " OR bet.odds = CAST('" + data.search + "' AS FLOAT)";
			}
			if (isNumeric(data.search)) {
				searchQuery += " OR bet.stack =CAST('" + data.search + "' AS FLOAT)";
			}

			if (data.search == 'Back' || data.search == 'back') {
				backLay += " AND bet.is_back='1'";
			}
			if (data.search == 'Lay' || data.search == 'lay') {
				backLay += " AND bet.is_back='0'";
			}
			searchQuery += " OR 1=CASE WHEN EXISTS(SELECT id FROM users with(nolock) WHERE user_name='" + data.search + "') THEN  CASE WHEN bet.user_id= (SELECT id FROM users with(nolock) WHERE user_name='" + data.search + "') THEN 1 ELSE 0 END ELSE  0  END";

			searchQuery += " OR bet.created_ip = '" + data.search + "')";
		}

		let offset = (data.page - 1) * data.limit;
		const pool = await poolPromise;
		let query = "SELECT 'C' as completed, bet.user_id,bet.market_id, bet.id,(select dbo.FN_GET_PARENT_USER_LEVEL(" + data.role_id + ",bet.user_id) ) as user_hierarchical,bet.sport_id,bet.match_id, bet.delete_status as status,(CASE WHEN bet.delete_status=1 THEN 'D' ELSE CASE WHEN bet.delete_status=2 THEN 'V' ELSE '' END END ) as betStatus, selection.selection_id as selectionId,selection.name as selectionName,bet.odds,bet.stack,bet.is_back,ROUND((CASE WHEN bet.is_back=1 THEN bet.p_l ELSE bet.liability END),2) AS p_l,bet.created_ip,bet.created_at from bets_odds as bet with(nolock) INNER JOIN market_selections as selection with(nolock) ON selection.selection_id = bet.selection_id AND selection.match_id=" + data.match_id + " AND  selection.market_id=bet.market_id where bet." + condition + "=" + data.user_id + " AND bet.match_id=" + data.match_id + " AND (bet.delete_status = ((CASE WHEN (select role_id from users with(nolock) where id=" + data.user_id + ")=1 THEN 1 ELSE 0 END )) OR bet.delete_status = ((CASE WHEN (select role_id from users with(nolock) where id=" + data.user_id + ")=1 THEN 0 ELSE 0 END )) OR bet.delete_status = ((CASE WHEN (select role_id from users with(nolock) where id=" + data.user_id + ")=1 THEN 2 ELSE 0 END ))) AND selection.match_id=" + data.match_id + " AND (bet.bet_result_id !=0 AND bet.winner_name IS NOT NULL) " + searchQuery + "  " + backLay + "";
		if (data.market_id != 0) {
			query += " AND bet.market_id=" + data.market_id + " AND  selection.market_id=" + data.market_id + "";
		}
		query += ' ORDER BY id DESC OFFSET  ' + offset + ' ROWS FETCH NEXT ' + data.limit + ' ROWS ONLY';
		//console.log('complate market query ------ ------- ', query);
		const result = await pool.request()
			.query(query)
		if (result === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}

	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
function isNumeric(value) {
	return /^-?\d+$/.test(value);
}
let getMatchFacnyBets = async (data) => {
	try {
		let condition = "";
		if (data.role_id === CONSTANTS.USER_TYPE_SUPER_ADMIN) {
			condition = 'super_admin_id';
		} else if (data.role_id === CONSTANTS.USER_TYPE_ADMIN) {
			condition = 'admin_id';
		}
		else if (data.role_id === CONSTANTS.USER_TYPE_SUPER_MASTER) {
			condition = 'super_master_id';
		}
		else if (data.role_id === CONSTANTS.USER_TYPE_MASTER) {
			condition = 'master_id';
		}
		else if (data.role_id === CONSTANTS.USER_TYPE_AGENT) {
			condition = 'agent_id';
		} else if (data.role_id === CONSTANTS.USER_TYPE_USER) {
			condition = 'user_id';
		}
		let searchQuery = "";
		let backLay = "";

		if (data.search.length >= 1) {

			searchQuery += " AND ( bet.fancy_name ='" + data.search + "'";
			if (isNumeric(data.search)) {
				searchQuery += " OR bet.run = CAST('" + data.search + "' AS INT)";
			}
			if (isNumeric(data.search)) {
				searchQuery += " OR bet.stack =CAST('" + data.search + "' AS INT)";
			}

			if (data.search == 'Back' || data.search == 'back') {
				backLay += " AND bet.is_back='1'";
			}
			if (data.search == 'Lay' || data.search == 'lay') {
				backLay += " AND bet.is_back='0'";
			}
			searchQuery += " OR 1=CASE WHEN EXISTS(SELECT id FROM users with(nolock) WHERE user_name='" + data.search + "') THEN  CASE WHEN bet.user_id= (SELECT id FROM users with(nolock) WHERE user_name='" + data.search + "') THEN 1 ELSE 0 END ELSE  0  END";

			searchQuery += " OR bet.created_ip = '" + data.search + "')";

		}
		let offset = (data.page - 1) * data.limit;
		const pool = await poolPromise;
		let query = "SELECT  ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=114 and permission_role.role_id=" + data.role_id + "),0) as betDelete,ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=115 and permission_role.role_id=" + data.role_id + "),0) as betVoid,ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=116 and permission_role.role_id=" + data.role_id + "),0) as betRollback,bet.user_id,bet.delete_status as status,(CASE WHEN bet.delete_status=1 THEN 'D' ELSE CASE WHEN bet.delete_status=2 THEN 'V' ELSE '' END END ) as betStatus, bet.id,(select dbo.FN_GET_PARENT_USER_LEVEL(" + data.role_id + ",bet.user_id) ) as user_hierarchical,bet.sport_id,bet.match_id,bet.fancy_id as selectionId,bet.stack,bet.is_back,bet.run as odds,bet.size ,bet.liability,(CASE WHEN bet.is_back=1 THEN bet.profit ELSE bet.liability END) AS p_l,bet.fancy_name as selectionName,bet.created_ip,bet.created_at from bets_fancy as bet with(nolock) where bet." + condition + "= " + data.user_id + " AND (bet.delete_status = ((CASE WHEN (select role_id from users with(nolock) where id=" + data.user_id + ")=1 THEN 1 ELSE 0 END )) OR bet.delete_status = ((CASE WHEN (select role_id from users with(nolock) where id=" + data.user_id + ")=1 THEN 0 ELSE 0 END )) OR bet.delete_status = ((CASE WHEN (select role_id from users with(nolock) where id=" + data.user_id + ")=1 THEN 2 ELSE 0 END ))) AND bet.match_id= " + data.match_id + " AND (bet.bet_result_id=0 OR bet.bet_result_id IS NULL) " + searchQuery + " " + backLay + "";
		if (data.fancy_id != 0) {
			query += " AND bet.fancy_id=" + data.fancy_id;
		}
		//query += 'ORDER BY id DESC';
		query += ' ORDER BY id DESC OFFSET  ' + offset + ' ROWS FETCH NEXT ' + data.limit + ' ROWS ONLY';
		//console.log('fancy bet query ---------- ', query);
		const result = await pool.request()
			.query(query)
		if (result === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}

	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let myDashboard = async (data) => {
	try {
		const pool = await poolPromise;
		let query = "select matches.is_cup,ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=53 and permission_role.role_id=" + data.role_id + "),0) as status_matches, ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=78 and permission_role.role_id=" + data.role_id + " ),0) as selection_fancy_matches, ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=79 and permission_role.role_id=" + data.role_id + " ),0) as fancy_active_deactive_matches, ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=49 and permission_role.role_id=" + data.role_id + " ),0) as read_matches, ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=102 and permission_role.role_id=" + data.role_id + " ),0) as setting_matches, ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=81 and permission_role.role_id=" + data.role_id + " ),0) as browse_markets, ISNULL((select top 1 [match_id] from [user_deactive_matches] with(nolock) where ([match_id] = [matches].[match_id]  and [user_id] = " + data.user_id + ")),0)as get_match_status, (Select dbo.FN_DEACTIVE_FANCY_FOR_USERS([matches].[match_id]," + data.user_id + ")) as get_deactive_fancy_for_users,ISNULL((select top 1 [match_id] from [deactive_fancies] with(nolock) where ([match_id] = [matches].[match_id]  and [user_id] = " + data.user_id + ")),0) as get_deactive_fancy_status, matches.name as MatchName,series.series_id,matches.sport_id as SportID,markets.market_id as MarketID,matches.match_date as MatchDate,matches.status,matches.match_id,series.name as seriesName from [matches] with(nolock) join [markets] with(nolock) on [markets].[match_id] = [matches].[match_id] join [series] with(nolock) on [series].[series_id] = [matches].[series_id] LEFT JOIN user_deactive_matches as udmtch with(nolock) ON udmtch.match_id= matches.match_id and udmtch.user_id =" + data.user_id + " where ([matches].[sport_id] = " + data.sport_id + " and [markets].[name] ='Match Odds' and [matches].[is_completed] = 'N' and [matches].[status] = 'Y') and [matches].[winner_name] is null and ( udmtch.match_id  IS NULL OR udmtch.match_id=0)  order by [matches].[match_date] ASC";
		//console.log(query);
		const result = await pool.request().query(query)
		if (result === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}

	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let ownDataInSettlementReport = async (user_id, user_type_id) => {
	try {

		let query = '';

		switch (user_type_id) {
			case 1:
				query = 'SELECT ROUND(ISNULL(SUM(super_admin_commission), 0.00), 2) AS own_commission, 0.00 AS own_super_admin_commission, ROUND(ISNULL(SUM(super_admin_pl),0.00) + ISNULL(SUM(super_admin_commission),0.00), 2) AS own_pl, 0.00 AS parent_commission,  0.00 AS parent_super_admin_commission, 0.00 AS parent_ac FROM user_profit_loss with(nolock) WHERE super_admin_id =' + user_id;
				break;
			case 2:
				query = 'SELECT ROUND(ISNULL(SUM(admin_commission), 0.00), 2) AS own_commission, 0.00 AS own_super_admin_commission, ROUND(ISNULL(SUM(admin_pl),0.00) + ISNULL(SUM(admin_commission),0.00), 2) AS own_pl, ROUND(ISNULL(SUM(super_admin_commission), 0.00), 2) AS parent_commission, 0.00 AS parent_super_admin_commission, ROUND(ISNULL(SUM(super_admin_commission), 0.00) + ISNULL(SUM(super_admin_pl), 0.00), 2) AS parent_ac FROM user_profit_loss with(nolock) WHERE admin_id =' + user_id;
				break;
			case 3:
				query = 'SELECT ROUND(ISNULL(SUM(super_master_commission), 0.00), 2) AS own_commission,0.00 AS own_super_admin_commission, ROUND(ISNULL(SUM(super_master_pl),0.00) + ISNULL(SUM(super_master_commission),0.00), 2) AS own_pl, ROUND(ISNULL(SUM(super_admin_commission),0.00) + ISNULL(SUM(admin_commission),0.00), 2) AS parent_commission,0.00 AS parent_super_admin_commission, ROUND(ISNULL(SUM(super_admin_pl),0.00) + ISNULL(SUM(admin_pl),0.00) + ISNULL(SUM(admin_commission),0.00) + ISNULL(SUM(super_admin_commission),0.00), 2) AS parent_ac FROM user_profit_loss with(nolock) WHERE super_master_id = ' + user_id;
				break;
			case 4:
				query = 'SELECT ROUND(ISNULL(SUM(master_commission), 0.00), 2) AS own_commission, 0.00 AS own_super_admin_commission, ROUND(ISNULL(SUM(master_pl),0.00) + ISNULL(SUM(master_commission),0.00), 2) AS own_pl, ROUND(ISNULL(SUM(super_admin_commission),0.00) + ISNULL(SUM(admin_commission),0.00) + ISNULL(SUM(super_master_commission),0.00), 2) AS parent_commission, 0.00 AS parent_super_admin_commission, ROUND(ISNULL(SUM(super_admin_pl),0.00) + ISNULL(SUM(super_admin_commission),0.00) + ISNULL(SUM(admin_pl),0.00) + ISNULL(SUM(admin_commission),0.00) + ISNULL(SUM(super_master_commission),0.00) + ISNULL(SUM(super_master_pl),0.00), 2) AS parent_ac FROM user_profit_loss with(nolock) WHERE master_id =' + user_id;
				break;
			case 5:
				query = 'SELECT ROUND(ISNULL(SUM(agent_commission), 0.00), 2) AS own_commission, 0.00 AS own_super_admin_commission, ROUND(ISNULL(SUM(agent_pl),0.00) + ISNULL(SUM(agent_commission),0.00), 2) AS own_pl, ROUND(ISNULL(SUM(super_admin_commission),0.00) + ISNULL(SUM(admin_commission),0.00) + ISNULL(SUM(super_master_commission),0.00) + ISNULL(SUM(master_commission),0.00), 2) AS parent_commission, 0.00 AS parent_super_admin_commission, ROUND(ISNULL(SUM(super_admin_pl),0.00) + ISNULL(SUM(super_admin_commission),0.00) + ISNULL(SUM(admin_pl),0.00) + ISNULL(SUM(admin_commission),0.00) + ISNULL(SUM(super_master_commission),0.00) + ISNULL(SUM(super_master_pl),0.00) + ISNULL(SUM(master_commission),0.00) + ISNULL(SUM(master_pl),0.00), 2) AS parent_ac FROM user_profit_loss with(nolock) WHERE agent_id =' + user_id;
				break;
			default:
				query = 'SELECT ROUND(ISNULL(SUM(user_commission), 0.00), 2) AS own_commission, 0.00 AS own_super_admin_commission, ROUND(ISNULL(SUM(user_pl),0.00) + ISNULL(SUM(user_commission),0.00), 2) AS own_pl, ROUND(ISNULL(SUM(super_admin_commission),0.00) + ISNULL(SUM(admin_commission),0.00) + ISNULL(SUM(super_master_commission),0.00) + ISNULL(SUM(master_commission),0.00) + ISNULL(SUM(agent_commission),0.00), 2) AS parent_commission,  0.00  AS parent_super_admin_commission, ROUND(ISNULL(SUM(super_admin_pl),0.00) + ISNULL(SUM(super_admin_commission),0.00) + ISNULL(SUM(admin_pl),0.00) + ISNULL(SUM(admin_commission),0.00) + ISNULL(SUM(super_master_commission),0.00) + ISNULL(SUM(super_master_pl),0.00) + ISNULL(SUM(master_commission),0.00) + ISNULL(SUM(master_pl),0.00) + ISNULL(SUM(agent_commission),0.00) + ISNULL(SUM(agent_pl),0.00), 2) AS parent_ac FROM user_profit_loss with(nolock) WHERE user_id =' + user_id;
		}

		console.log("ownDataInSettlementReport top ---------------------- ", query);
		const pool = await poolPromise;
		const result = await pool.request().query(query);
		let qry = "SELECT MIN(ISNULL(b.name,'')) AS parent_name, MIN(ISNULL(b.user_name, '')) AS parent_user_name, ROUND(ISNULL(SUM((CASE WHEN(a.id = " + user_id + ") THEN ISNULL(a.total_settled_amount, 0.00) ELSE 0.00 END) -	(CASE WHEN(a.parent_id = " + user_id + ") THEN ISNULL(a.total_settled_amount, 0.00) ELSE 0.00 END) ), 0.00), 2) AS total_cash,ROUND(ISNULL(SUM((CASE WHEN(a.id = " + user_id + ") THEN ISNULL(a.total_settled_amount, 0.00) ELSE 0.00 END)), 0.00), 2) AS own_total_settled_amount	FROM users AS a with(nolock)  LEFT JOIN users AS b with(nolock) ON(a.parent_id = b.id) WHERE a.id = " + user_id + " OR a.parent_id = " + user_id + "";

		console.log("ownDataInSettlementReport bottom ---------------------- ", qry);
		const result2 = await pool.request().query(qry);

		let parent_ac = result.recordset[0].parent_ac + result2.recordset[0].own_total_settled_amount;
		let plusData = [];
		let minusData = [];
		let totalPlus = 0; 2
		let totalMinus = 0;

		if (user_type_id == CONSTANTS.USER_TYPE_SUPER_ADMIN) {
			if (parent_ac >= 0) {
				plusData.push({ description: `Parent Account`, amount: parent_ac.toFixed(2) });
				totalPlus = totalPlus + parent_ac;
			} else {
				minusData.push({ description: `Parent Account`, amount: Math.abs(parent_ac).toFixed(2) });
				totalMinus = totalMinus + parent_ac;
			}
		} else {
			if (result.recordset[0].parent_commission >= 0) {
				//plusData.push({description: `${result2.recordset[0].parent_name}(${result2.recordset[0].parent_user_name}) Commission`, amount: result.recordset[0].parent_commission.toFixed(2)});
				plusData.push({ description: `Parent Commission`, amount: result.recordset[0].parent_commission.toFixed(2) });
			} else {
				minusData.push({
					//description: `${result2.recordset[0].parent_name}(${result2.recordset[0].parent_user_name}) Commission`, amount: Math.abs(result.recordset[0].parent_commission).toFixed(2)
					description: `Parent Commission`, amount: Math.abs(result.recordset[0].parent_commission).toFixed(2)
				});
			}

			if (parent_ac >= 0) {
				//plusData.push({description: `${result2.recordset[0].parent_name}(${result2.recordset[0].parent_user_name}) Account`, amount: parent_ac.toFixed(2)});
				plusData.push({ description: `Parent Account`, amount: parent_ac.toFixed(2) });
				totalPlus = totalPlus + parent_ac;
			} else {
				//minusData.push({description: `${result2.recordset[0].parent_name}(${result2.recordset[0].parent_user_name}) Account`, amount: Math.abs(parent_ac).toFixed(2)});
				minusData.push({ description: `Parent Account`, amount: Math.abs(parent_ac).toFixed(2) });
				totalMinus = totalMinus + parent_ac;
			}
		}

		if (result.recordset[0].own_commission >= 0) {
			plusData.push({ description: "Own Commission", amount: result.recordset[0].own_commission.toFixed(2) });
		} else {
			minusData.push({ description: "Own Commission", amount: Math.abs(result.recordset[0].own_commission).toFixed(2) });
		}

		if (result.recordset[0].own_pl >= 0) {
			plusData.push({ description: "Own", amount: result.recordset[0].own_pl.toFixed(2) });
			totalPlus = totalPlus + result.recordset[0].own_pl;
		} else {
			minusData.push({ description: "Own", amount: Math.abs(result.recordset[0].own_pl).toFixed(2) });
			totalMinus = totalMinus + result.recordset[0].own_pl;
		}

		if (result2.recordset[0].total_cash > 0) {
			minusData.push({ description: "Cash", amount: result2.recordset[0].total_cash.toFixed(2) });
			totalMinus = totalMinus - result2.recordset[0].total_cash;
		}
		else if (result2.recordset[0].total_cash < 0) {
			plusData.push({ description: "Cash", amount: Math.abs(result2.recordset[0].total_cash).toFixed(2) });
			totalPlus = totalPlus + Math.abs(result2.recordset[0].total_cash);
		}

		let data = {
			plusData: plusData,
			minusData: minusData,
			totalPlus: totalPlus,
			totalMinus: totalMinus
		};

		return resultdb(CONSTANTS.SUCCESS, data);
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let ProfitLoss = async (user_id, user_type_id, fromdate, twodate) => {
	try {

		let condition = "";
		if (fromdate > 0) {
			condition += "  AND user_profit_loss.created_at >=" + fromdate + "";
		}
		if (twodate > 0) {
			condition += " AND user_profit_loss.created_at <= " + twodate + " ";
		}

		let query = "";
		let permission = "ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=109 and permission_role.role_id=" + user_type_id + "),0) as settlement,ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=110 and permission_role.role_id=" + user_type_id + "),0) as settlementHistory,";
		switch (user_type_id) {
			case 1:
				query = "SELECT " + permission + " u.id AS user_id, 1 as role_id, 1 as backrole, 1 as backuser, AVG(u.role_id) as roleId, MIN(u.name) as name, MIN(u.user_name) as user_name, AVG(u.parent_id) as parent_id,  ROUND(ISNULL(SUM(super_admin_pl),0),2) + ROUND(ISNULL(SUM(super_admin_commission),0),2)  AS superAdminPL, ROUND(ISNULL(SUM(admin_commission),0),2) + ROUND(ISNULL(SUM(admin_pl),0),2)  AS AdminPL, ROUND(ISNULL(SUM(super_master_commission),0),2) + ROUND(ISNULL(SUM(super_master_pl),0),2)  AS superMasterPL,ROUND(ISNULL(SUM(master_commission),0),2) + ROUND(ISNULL(SUM(master_pl),0),2)  AS MasterPL,ROUND(ISNULL(SUM(agent_commission),0),2) + ROUND(ISNULL(SUM(agent_pl),0),2)   AS AgentPL,ROUND(ISNULL(SUM(user_commission),0),2) + ROUND(ISNULL(SUM(user_pl),0),2)  AS userPL FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON u.id=user_profit_loss.admin_id WHERE u.parent_id = " + user_id + "  " + condition + " GROUP BY u.id";// ORDER BY settlement_amount";// ORDER BY u.name, u.user_name";
				break;

			case 2:
				query = "SELECT " + permission + " u.id AS user_id,2 as role_id, 1 as backrole, MIN(u.super_admin_id) as backuser, AVG(u.role_id) as roleId, MIN(u.name) as name, MIN(u.user_name) as user_name, AVG(u.parent_id) as parent_id,0 as superAdminPL,  ROUND(ISNULL(SUM(admin_commission),0),2) + ROUND(ISNULL(SUM(admin_pl),0),2)  AS AdminPL, ROUND(ISNULL(SUM(super_master_commission),0),2) + ROUND(ISNULL(SUM(super_master_pl),0),2)  AS superMasterPL,ROUND(ISNULL(SUM(master_commission),0),2) + ROUND(ISNULL(SUM(master_pl),0),2)  AS MasterPL,ROUND(ISNULL(SUM(agent_commission),0),2) + ROUND(ISNULL(SUM(agent_pl),0),2) AS AgentPL,ROUND(ISNULL(SUM(user_commission),0),2) + ROUND(ISNULL(SUM(user_pl),0),2) AS userPL FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON u.id=user_profit_loss.super_master_id WHERE u.parent_id = " + user_id + " " + condition + "  GROUP BY u.id";// ORDER BY settlement_amount";//ORDER BY u.name, u.user_name";
				break;
			case 3:
				query = "SELECT " + permission + " u.id AS user_id, 3 as role_id,2 as backrole, MIN(u.admin_id) as backuser, AVG(u.role_id) as roleId, MIN(u.name) as name, MIN(u.user_name) as user_name, AVG(u.parent_id) as parent_id, 0 as superAdminPL, 0 AS AdminPL, ROUND(ISNULL(SUM(super_master_commission),0),2) + ROUND(ISNULL(SUM(super_master_pl),0),2) AS superMasterPL,ROUND(ISNULL(SUM(master_commission),0),2) + ROUND(ISNULL(SUM(master_pl),0),2) AS MasterPL,ROUND(ISNULL(SUM(agent_commission),0),2) + ROUND(ISNULL(SUM(agent_pl),0),2) AS AgentPL,ROUND(ISNULL(SUM(user_commission),0),2) + ROUND(ISNULL(SUM(user_pl),0),2) AS userPL FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON u.id = user_profit_loss.master_id WHERE u.parent_id =" + user_id + " " + condition + " GROUP BY u.id";// ORDER BY settlement_amount";//ORDER BY u.name, u.user_name";
				break;
			case 4:
				query = "SELECT " + permission + " u.id AS user_id, 4 as role_id, 3 as backrole, MIN(u.super_id) as backuser, AVG(u.role_id) as roleId, MIN(u.name) as name, MIN(u.user_name) as user_name, AVG(u.parent_id) as parent_id, 0 as superAdminPL, 0 AS AdminPL, 0 AS superMasterPL, ROUND(ISNULL(SUM(master_commission),0),2) + ROUND(ISNULL(SUM(master_pl),0),2) AS MasterPL,ROUND(ISNULL(SUM(agent_commission),0),2) + ROUND(ISNULL(SUM(agent_pl),0),2) AS AgentPL,ROUND(ISNULL(SUM(user_commission),0),2) + ROUND(ISNULL(SUM(user_pl),0),2) AS userPL FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON u.id=user_profit_loss.agent_id WHERE u.parent_id = " + user_id + "  " + condition + " GROUP BY u.id";// ORDER BY settlement_amount"; //ORDER BY u.name, u.user_name";
				break;
			case 5:
				query = "SELECT " + permission + " u.id AS user_id, 5 as role_id,4 as backrole, MIN(u.master_id) as backuser, AVG(u.role_id) as roleId, MIN(u.name) as name, MIN(u.user_name) as user_name, AVG(u.parent_id) as parent_id,0 as superAdminPL, 0 AS AdminPL, 0 AS superMasterPL,0 AS MasterPL, ROUND(ISNULL(SUM(agent_commission),0),2) + ROUND(ISNULL(SUM(agent_pl),0),2) AS AgentPL,ROUND(ISNULL(SUM(user_commission),0),2) + ROUND(ISNULL(SUM(user_pl),0),2) AS userPL FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON u.id=user_profit_loss.user_id WHERE u.parent_id = " + user_id + "  " + condition + " GROUP BY u.id";// ORDER BY settlement_amount"; //ORDER BY u.name, u.user_name";
				break;
			default:
				query = "SELECT " + permission + " u.id AS user_id, 6 as role_id, 5 as backrole, MIN(u.agent_id) as backuser, AVG(u.role_id) as roleId, MIN(u.name) as name, MIN(u.user_name) as user_name, AVG(u.parent_id) as parent_id,0 as superAdminPL, 0 AS AdminPL, 0 AS superMasterPL,0 AS MasterPL, 0 AS AgentPL, ROUND(ISNULL(SUM(user_commission),0),2) + ROUND(ISNULL(SUM(user_pl),0),2) AS userPL FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON u.id=user_profit_loss.user_id WHERE u.parent_id = " + user_id + "  " + condition + " GROUP BY u.id";// ORDER BY settlement_amount"; //ORDER BY u.name, u.user_name";
		}
		console.log("ProfitLoss response query -------------------- ", query);
		const pool = await poolPromise;
		const resFromDB = await pool.request().query(query);
		//let resFromDB = await MysqlPool.query(query, values);

		return resultdb(CONSTANTS.SUCCESS, resFromDB.recordset);
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let ProfitLossCommission = async (requestData) => {


	let user_id = requestData.user_id;
	let user_type_id = requestData.role_id;
	let fromdate = requestData.fromdate;
	let twodate = requestData.twodate;
	let sport_id = requestData.sport_id;
	let type = requestData.type;

	try {

		let condition = "";
		if (fromdate > 0) {
			condition += "  AND user_profit_loss.created_at >=" + fromdate + "";
		}
		if (twodate > 0) {
			condition += " AND user_profit_loss.created_at <= " + twodate + " ";
		}
		if (sport_id > 0) {
			condition += " AND user_profit_loss.sport_id = " + sport_id + " ";
		}
		if (type > 0) {
			condition += " AND user_profit_loss.type = " + type + " ";
		}

		let query = "";

		switch (user_type_id) {
			case 1:
				query = "SELECT u.id AS user_id, 1 as role_id, 1 as backrole, 1 as backuser, (u.role_id) as roleId, (u.name) as name, (u.user_name) as user_name, (u.parent_id) as parent_id, ROUND(ISNULL(SUM(super_admin_pl),0),2) as profitLoss, ROUND(ISNULL(SUM(super_admin_commission),0),2) as commission, ROUND(ISNULL(SUM(stack),0),2) as total_stack  FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON (u.id=user_profit_loss.admin_id OR u.id=user_profit_loss.super_master_id OR u.id=user_profit_loss.master_id OR u.id=user_profit_loss.agent_id OR u.id=user_profit_loss.user_id )WHERE u.parent_id = " + user_id + " AND  u.self_close_account='N' AND u.parent_close_account='N' " + condition + " GROUP BY u.id, u.role_id , u.name, u.user_name, u.parent_id ORDER BY u.name, u.user_name";
				break;

			case 2:
				query = "SELECT  u.id AS user_id,2 as role_id, 1 as backrole, MIN(u.super_admin_id) as backuser, (u.role_id) as roleId, (u.name) as name, (u.user_name) as user_name, (u.parent_id) as parent_id, ROUND(ISNULL(SUM(super_admin_pl),0.00),2) + ROUND(ISNULL(SUM(admin_pl),0.00),2) as profitLoss,  ROUND(ISNULL(SUM(super_admin_commission),0.00),2) + ROUND(ISNULL(SUM(admin_commission),0.00),2) as commission, ROUND(ISNULL(SUM(stack),0),2) as total_stack FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON (u.id=user_profit_loss.super_master_id OR u.id=user_profit_loss.master_id OR u.id=user_profit_loss.agent_id OR u.id=user_profit_loss.user_id ) WHERE u.parent_id = " + user_id + " AND  u.self_close_account='N' AND u.parent_close_account='N' " + condition + "  GROUP BY u.id, u.role_id , u.name, u.user_name, u.parent_id ORDER BY u.name, u.user_name";

				break;
			case 3:
				query = "SELECT u.id AS user_id, 3 as role_id,2 as backrole, MIN(u.admin_id) as backuser, (u.role_id) as roleId, (u.name) as name, (u.user_name) as user_name, (u.parent_id) as parent_id, ROUND(ISNULL(SUM(super_admin_pl),0.00),2)+ ROUND(ISNULL(SUM(admin_pl),0.00),2) + ROUND(ISNULL(SUM(super_master_pl),0.00),2) as profitLoss , ROUND(ISNULL(SUM(super_admin_commission),0.00),2) + ROUND(ISNULL(SUM(admin_commission),0.00),2) + ROUND(ISNULL(SUM(super_master_commission),0.00),2) as commission, ROUND(ISNULL(SUM(stack),0),2) as total_stack FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON (u.id = user_profit_loss.master_id OR u.id=user_profit_loss.agent_id OR u.id=user_profit_loss.user_id ) WHERE u.parent_id =" + user_id + " AND  u.self_close_account='N' AND u.parent_close_account='N' " + condition + " GROUP BY u.id, u.role_id , u.name, u.user_name, u.parent_id ORDER BY u.name, u.user_name";
				break;
			case 4:
				query = "SELECT u.id AS user_id, 4 as role_id, 3 as backrole, MIN(u.super_id) as backuser, (u.role_id) as roleId, (u.name) as name, (u.user_name) as user_name, (u.parent_id) as parent_id, ROUND(ISNULL(SUM(master_pl),0.00),2) + ROUND(ISNULL(SUM(super_master_pl),0.00),2) + ROUND(ISNULL(SUM(admin_pl),0.00),2) + ROUND(ISNULL(SUM(super_admin_pl),0.00),2) as profitLoss, ROUND(ISNULL(SUM(master_commission),0.00),2) + ROUND(ISNULL(SUM(super_master_commission),0.00),2) + ROUND(ISNULL(SUM(admin_commission),0.00),2)  + ROUND(ISNULL(SUM(super_admin_commission),0.00) as commission, ROUND(ISNULL(SUM(stack),0),2) as total_stack FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON (u.id=user_profit_loss.agent_id OR u.id=user_profit_loss.user_id) WHERE u.parent_id = " + user_id + " AND  u.self_close_account='N' AND u.parent_close_account='N' " + condition + " GROUP BY u.id, u.role_id , u.name, u.user_name, u.parent_id  ORDER BY u.name, u.user_name";
				break;
			case 5:
				query = "SELECT u.id AS user_id, 5 as role_id,4 as backrole, MIN(u.master_id) as backuser, (u.role_id) as roleId, (u.name) as name, (u.user_name) as user_name, (u.parent_id) as parent_id, ROUND(ISNULL(SUM(agent_pl),0.00),2) + ROUND(ISNULL(SUM(master_pl),0.00),2) + ROUND(ISNULL(SUM(super_master_pl),0.00),2) + ROUND(ISNULL(SUM(admin_pl),0.00),2) + ROUND(ISNULL(SUM(super_admin_pl),0.00),2) as profitLoss, ROUND(ISNULL(SUM(agent_commission),0.00),2) + ROUND(ISNULL(SUM(master_commission),0.00),2) + ROUND(ISNULL(SUM(super_master_commission),0.00),2) + ROUND(ISNULL(SUM(admin_commission),0.00),2) + ROUND(ISNULL(SUM(super_admin_commission),0.00),2) as commission, ROUND(ISNULL(SUM(stack),0),2) as total_stack FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON u.id=user_profit_loss.user_id WHERE u.parent_id = " + user_id + " AND  u.self_close_account='N' AND u.parent_close_account='N' " + condition + " GROUP BY u.id ,u.role_id , u.name, u.user_name, u.parent_id ORDER BY u.name, u.user_name";
				break;
			default:
				query = "SELECT " + permission + " u.id AS user_id, 6 as role_id, 5 as backrole, MIN(u.agent_id) as backuser, (u.role_id) as roleId, (u.name) as name, (u.user_name) as user_name, (u.parent_id) as parent_id, ROUND(ISNULL(SUM(user_pl),0.00),2) + ROUND(ISNULL(SUM(agent_pl),0.00),2) + ROUND(ISNULL(SUM(master_pl),0.00),2) + ROUND(ISNULL(SUM(super_master_pl),0.00),2) + ROUND(ISNULL(SUM(admin_pl),0.00),2) + ROUND(ISNULL(SUM(super_admin_pl),0.00),2) as profitLoss, ROUND(ISNULL(SUM(user_commission),0.00),2) + ROUND(ISNULL(SUM(agent_commission),0.00),2) + ROUND(ISNULL(SUM(master_commission),0.00),2) + ROUND(ISNULL(SUM(super_master_commission),0.00),2) + ROUND(ISNULL(SUM(admin_commission),0.00),2) + ROUND(ISNULL(SUM(super_admin_commission),0.00),2) as commission, ROUND(ISNULL(SUM(stack),0),2) as total_stack FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON u.id=user_profit_loss.user_id WHERE u.parent_id = " + user_id + " AND  u.self_close_account='N' AND u.parent_close_account='N' " + condition + " GROUP BY u.id, u.role_id , u.name, u.user_name, u.parent_id ORDER BY u.name, u.user_name";
		}


		console.log("ProfitLoss response query -------------------- ", query);
		const pool = await poolPromise;
		const resFromDB = await pool.request().query(query);
		//let resFromDB = await MysqlPool.query(query, values);

		return resultdb(CONSTANTS.SUCCESS, resFromDB.recordset);
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let settlementReport = async (user_id, user_type_id, search = '') => {
	try {

		let condition = "";
		if (search != '') {
			condition = " AND (u.name LIKE %" + search + "% OR u.user_name LIKE  %" + search + "%) ";
		}

		let query = "";
		let permission = "ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=109 and permission_role.role_id=" + user_type_id + "),0) as settlement,ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=110 and permission_role.role_id=" + user_type_id + "),0) as settlementHistory,";
		switch (user_type_id) {
			case 1:
				query = "SELECT " + permission + " u.id AS user_id, 1 as role_id, 1 as backrole, 1 as backuser, (u.role_id) as roleId, (u.name) as name, (u.user_name) as user_name, (u.parent_id) as parent_id, ROUND(ISNULL(SUM(super_admin_pl),0),2) + ROUND(ISNULL(SUM(super_admin_commission),0),2) + ROUND(AVG(u.total_settled_amount), 2) AS settlement_amount FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON (u.id=user_profit_loss.admin_id OR u.id=user_profit_loss.super_master_id OR u.id=user_profit_loss.master_id OR u.id=user_profit_loss.agent_id OR u.id=user_profit_loss.user_id )WHERE u.parent_id = " + user_id + " AND  u.self_close_account='N' AND u.parent_close_account='N' " + condition + " GROUP BY u.id, u.role_id , u.name, u.user_name, u.parent_id ORDER BY settlement_amount";// ORDER BY u.name, u.user_name";
				break;

			case 2:
				query = "SELECT " + permission + " u.id AS user_id,2 as role_id, 1 as backrole, MIN(u.super_admin_id) as backuser, (u.role_id) as roleId, (u.name) as name, (u.user_name) as user_name, (u.parent_id) as parent_id, ROUND(ISNULL(SUM(super_admin_pl),0.00),2) + ROUND(ISNULL(SUM(super_admin_commission),0.00),2) + ROUND(ISNULL(SUM(admin_pl),0.00),2) + ROUND(ISNULL(SUM(admin_commission),0.00),2) + ROUND(AVG(u.total_settled_amount), 2) AS settlement_amount FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON (u.id=user_profit_loss.super_master_id OR u.id=user_profit_loss.master_id OR u.id=user_profit_loss.agent_id OR u.id=user_profit_loss.user_id )WHERE u.parent_id = " + user_id + " AND  u.self_close_account='N' AND u.parent_close_account='N' " + condition + "  GROUP BY u.id , u.role_id , u.name, u.user_name, u.parent_id ORDER BY settlement_amount";//ORDER BY u.name, u.user_name";
				break;
			case 3:
				query = "SELECT " + permission + " u.id AS user_id, 3 as role_id,2 as backrole, MIN(u.admin_id) as backuser, (u.role_id) as roleId, (u.name) as name, (u.user_name) as user_name, (u.parent_id) as parent_id, ROUND(ISNULL(SUM(super_master_pl),0.00),2)+ ROUND(ISNULL(SUM(admin_pl),0.00),2) + ROUND(ISNULL(SUM(super_master_commission),0.00),2) + ROUND(ISNULL(SUM(admin_commission),0.00),2) + ROUND(ISNULL(SUM(super_admin_commission),0.00),2) + ROUND(ISNULL(SUM(super_admin_pl),0.00),2) + ROUND(AVG(u.total_settled_amount), 2) AS settlement_amount FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON (u.id = user_profit_loss.master_id OR u.id=user_profit_loss.agent_id OR u.id=user_profit_loss.user_id ) WHERE u.parent_id =" + user_id + " AND  u.self_close_account='N' AND u.parent_close_account='N' " + condition + " GROUP BY u.id, u.role_id , u.name, u.user_name, u.parent_id  ORDER BY settlement_amount";//ORDER BY u.name, u.user_name";
				break;
			case 4:
				query = "SELECT " + permission + " u.id AS user_id, 4 as role_id, 3 as backrole, MIN(u.super_id) as backuser, (u.role_id) as roleId, (u.name) as name, (u.user_name) as user_name, (u.parent_id) as parent_id, ROUND(ISNULL(SUM(master_pl),0.00),2) + ROUND(ISNULL(SUM(super_master_pl),0.00),2) + ROUND(ISNULL(SUM(admin_pl),0.00),2) + ROUND(ISNULL(SUM(super_admin_pl),0.00),2) + ROUND(ISNULL(SUM(master_commission),0.00),2) + ROUND(ISNULL(SUM(super_master_commission),0.00),2) + ROUND(ISNULL(SUM(admin_commission),0.00),2)  + ROUND(ISNULL(SUM(super_admin_commission),0.00),2) + ROUND(AVG(u.total_settled_amount), 2) AS settlement_amount FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON (u.id=user_profit_loss.agent_id OR u.id=user_profit_loss.user_id) WHERE u.parent_id = " + user_id + " AND  u.self_close_account='N' AND u.parent_close_account='N' " + condition + " GROUP BY u.id, u.role_id , u.name, u.user_name, u.parent_id  ORDER BY settlement_amount"; //ORDER BY u.name, u.user_name";
				break;
			case 5:
				query = "SELECT " + permission + " u.id AS user_id, 5 as role_id,4 as backrole, MIN(u.master_id) as backuser, (u.role_id) as roleId, (u.name) as name, (u.user_name) as user_name, (u.parent_id) as parent_id, ROUND(ISNULL(SUM(agent_pl),0.00),2) + ROUND(ISNULL(SUM(master_pl),0.00),2) + ROUND(ISNULL(SUM(super_master_pl),0.00),2) + ROUND(ISNULL(SUM(admin_pl),0.00),2) + ROUND(ISNULL(SUM(super_admin_pl),0.00),2) + ROUND(ISNULL(SUM(agent_commission),0.00),2) + ROUND(ISNULL(SUM(master_commission),0.00),2) + ROUND(ISNULL(SUM(super_master_commission),0.00),2) + ROUND(ISNULL(SUM(admin_commission),0.00),2) + ROUND(ISNULL(SUM(super_admin_commission),0.00),2) + ROUND(AVG(u.total_settled_amount), 2) AS settlement_amount FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON u.id=user_profit_loss.user_id WHERE u.parent_id = " + user_id + " AND  u.self_close_account='N' AND u.parent_close_account='N' " + condition + " GROUP BY u.id ,u.role_id , u.name, u.user_name, u.parent_id  ORDER BY settlement_amount"; //ORDER BY u.name, u.user_name";
				break;
			default:
				query = "SELECT " + permission + " u.id AS user_id, 6 as role_id, 5 as backrole, MIN(u.agent_id) as backuser, (u.role_id) as roleId, (u.name) as name, (u.user_name) as user_name, (u.parent_id) as parent_id, ROUND((0 + AVG(u.total_settled_amount)), 2) AS settlement_amount FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON u.id=user_profit_loss.user_id WHERE u.parent_id = " + user_id + " AND  u.self_close_account='N' AND u.parent_close_account='N' " + condition + " GROUP BY u.id, u.role_id , u.name, u.user_name, u.parent_id  ORDER BY settlement_amount"; //ORDER BY u.name, u.user_name";
		}
		console.log("settlement repost query -------------------- ", query);
		const pool = await poolPromise;
		const resFromDB = await pool.request().query(query);
		//let resFromDB = await MysqlPool.query(query, values);

		return resultdb(CONSTANTS.SUCCESS, resFromDB.recordset);
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let makeSettlement = async (user_id, user_type_id, parent_id, amount, type, comment = '') => {

	try {

		let query = '';

		switch (user_type_id) {
			case 2:
				query = "SELECT u.id AS user_id, AVG(u.role_id) as roleId, MIN(u.name) as name, MIN(u.user_name) as user_name, AVG(u.parent_id) as parent_id, ROUND(ISNULL(SUM(super_admin_pl),0),2) + ROUND(ISNULL(SUM(super_admin_commission), 0),2) + ROUND(AVG(u.total_settled_amount),2) AS settlement_amount FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON (u.id=user_profit_loss.admin_id) WHERE u.parent_id = " + parent_id + " AND u.id =" + user_id + " GROUP BY u.id "; //ORDER BY u.name, u.user_name";
				break;
			case 3:
				query = "SELECT u.id AS user_id,  AVG(u.role_id) as roleId, MIN(u.name) as name, MIN(u.user_name) as user_name, AVG(u.parent_id) as parent_id, ROUND(ISNULL(SUM(  super_admin_pl),0),2) + ROUND(ISNULL(SUM(admin_pl),0),2) +  ROUND(ISNULL(SUM(admin_commission),0),2) + ROUND(ISNULL(SUM(super_admin_commission ), 0),2) +  ROUND(AVG(u.total_settled_amount),2) AS settlement_amount FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON u.id=user_profit_loss.super_master_id WHERE u.parent_id = " + parent_id + " AND u.id =" + user_id + " GROUP BY u.id"; // ORDER BY u.name, u.user_name`;
				break;
			case 4:
				query = "SELECT u.id AS user_id,  AVG(u.role_id) as roleId, MIN(u.name) as name, MIN(u.user_name) as user_name, AVG(u.parent_id) as parent_id, ROUND(ISNULL(SUM(super_master_pl),0),2) + ROUND(ISNULL(SUM(admin_pl),0),2) + ROUND(ISNULL(SUM(super_admin_pl),0),2) + ROUND(ISNULL(SUM(super_master_commission),0),2) + ROUND(ISNULL(SUM(admin_commission),0),2) + ROUND(ISNULL(SUM(super_admin_commission), 0),2) + ROUND(AVG(u.total_settled_amount),2) AS settlement_amount FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON u.id=user_profit_loss.master_id WHERE u.parent_id = " + parent_id + " AND u.id = " + user_id + " GROUP BY u.id"; // ORDER BY u.name, u.user_name";
				break;
			case 5:
				query = "SELECT u.id AS user_id,  AVG(u.role_id) as roleId, MIN(u.name) as name, MIN(u.user_name) as user_name, AVG(u.parent_id) as parent_id, ROUND(ISNULL(SUM(master_pl),0),2) +  ROUND(ISNULL(SUM(super_master_pl),0),2) + ROUND(ISNULL(SUM(admin_pl),0),2) + ROUND(ISNULL(SUM(super_admin_pl),0),2) + ROUND(ISNULL(SUM(master_commission),0),2) + ROUND(ISNULL(SUM(super_master_commission),0),2) + ROUND(ISNULL(SUM(admin_commission),0),2)  + ROUND(ISNULL(SUM(super_admin_commission ), 0),2) + ROUND(AVG(u.total_settled_amount),2) AS settlement_amount FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON u.id=user_profit_loss.agent_id WHERE u.parent_id = " + parent_id + " AND u.id = " + user_id + " GROUP BY u.id"; // ORDER BY u.name, u.user_name`;
				break;
			case 6:
				query = "SELECT u.id AS user_id,  AVG(u.role_id) as roleId, MIN(u.name) as name, MIN(u.user_name) as user_name, AVG(u.parent_id) as parent_id, ROUND(ISNULL(SUM(agent_pl),0),2) + ROUND(ISNULL(SUM(master_pl),0),2) + ROUND(ISNULL(SUM(super_master_pl),0),2) + ROUND(ISNULL(SUM(admin_pl),0),2) +  ROUND(ISNULL(SUM(super_admin_pl),0),2) + ROUND(ISNULL(SUM(agent_commission),0),2) + ROUND(ISNULL(SUM(master_commission),0),2) + ROUND(ISNULL(SUM(super_master_commission),0),2) + ROUND(ISNULL(SUM(admin_commission),0),2) + ROUND(ISNULL(SUM(super_admin_commission ), 0),2) + ROUND(AVG(u.total_settled_amount),2) AS settlement_amount FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON u.id=user_profit_loss.user_id WHERE u.parent_id = " + parent_id + " AND u.id = " + user_id + " GROUP BY u.id"; // ORDER BY u.name, u.user_name`;
				break;
			default:
				query = "SELECT u.id AS user_id,  AVG(u.role_id) as roleId, MIN(u.name) as name, MIN(u.user_name) as user_name, AVG(u.parent_id) as parent_id, 0 + ROUND(AVG(u.total_settled_amount),2) AS settlement_amount FROM user_profit_loss with(nolock) INNER JOIN users u with(nolock) ON u.id=user_profit_loss.user_id WHERE u.parent_id = " + parent_id + " AND u.id = " + user_id + "  GROUP BY u.id"; // ORDER BY u.name, u.user_name`;
		}
		const pool = await poolPromise;
		const result = await pool.request().query(query);
		console.log(query);
		//let resFromDB = await conn.query(query,[parent_id, user_id]);
		resFromDB = result.recordset;

		if (resFromDB.length > 0) {
			let settlement_amount = resFromDB[0].settlement_amount;
			settlement_amount = parseFloat(settlement_amount).toFixed(2);
			console.log('settlement_amount', settlement_amount);
			amount = parseFloat(amount).toFixed(2);
			console.log('amount', amount);

			if (settlement_amount != 0) {

				if (amount > 0 && amount <= Math.abs(settlement_amount)) {

					//when settlement_amount > 0 then debit and when amount < 0 then credit
					if (settlement_amount > 0 && type == 1) {
						//await conn.rollback();
						//await conn.release();
						return resultdb(CONSTANTS.SUCCESS, 'Please Debit Amount For Settlement !');
					}
					else if (settlement_amount < 0 && type == 2) {
						//await conn.rollback();
						//await conn.release();
						return resultdb(CONSTANTS.SUCCESS, 'Please Credit Amount For Settlement !');
					} else {

						if (type == 2) {
							acamount = -amount;
						} else {
							acamount = amount;
						}
						if (type == 1) {
							amount = -amount;
						}
						let balance = amount;
						if (settings.USER_SETTLEMENT_AMOUNT_ADD_OR_NOT_IN_BLANCE == 'NOT') {
							let partentBalance = "SELECT id,balance FROM users with(nolock) where id=" + parent_id + "";
							let parentBalanceRes = await pool.request().query(partentBalance);
							//console.log('parentBalanceRes ----- ',parentBalanceRes.recordset[0].balance);
							if (parentBalanceRes.recordset[0].balance < amount) {
								return resultdb(CONSTANTS.SUCCESS, 'Insufficient  Balance To Settlement !');
							}
							if (type == 2) {
								balance = 0;
							} else {
								balance = amount;
							}
						}

						let inplayDate = Math.floor(Date.now() / 1000);

						let collectionQry = "INSERT INTO settlement_collections (user_id, parent_id, amount, type, comment, created_at) VALUES (" + user_id + ", " + parent_id + ", " + acamount + "," + type + ",'" + comment + "'," + inplayDate + " )";
						await pool.request().query(collectionQry);



						if (user_type_id == 6) {

							let accountStatementQry = "INSERT INTO account_statements (user_id, parent_id, description, statement_type, amount, available_balance, created_at) SELECT id, parent_id, CONCAT('Settlement: ', '" + comment + "'), 6, " + amount + ", balance + " + amount + ", " + inplayDate + " FROM users with(nolock) WHERE id =" + user_id + " ";
							await pool.request().query(accountStatementQry);

							let updateSettlementAmountQry = "UPDATE users SET total_settled_amount = total_settled_amount - " + amount + ", balance = balance + " + balance + ", profit_loss = profit_loss + " + amount + " WHERE id = " + user_id + "";
							await pool.request().query(updateSettlementAmountQry);

						} else {
							//let updateSettlementAmountQry2 = 'UPDATE users SET total_settled_amount = total_settled_amount + ? WHERE id = ? LIMIT 1;';


							let updateSettlementAmountQry2 = "UPDATE users SET total_settled_amount = total_settled_amount - " + amount + "  WHERE id = " + user_id + " ";
							await pool.request().query(updateSettlementAmountQry2);

							//let accountStatementQry = "INSERT INTO account_statements (user_id, parent_id, description, statement_type, amount, available_balance, created_at) SELECT id, parent_id, CONCAT('Settlement: ', '"+comment+"'), 6, "+amount+", balance + "+amount+", "+inplayDate+" FROM users with(nolock) WHERE id ="+user_id+" ";

							//await pool.request().query(accountStatementQry);

						}

						return resultdb(CONSTANTS.SUCCESS, 'Settlement Success');
					}
				} else {

					return resultdb(CONSTANTS.NOT_FOUND, 'Maximum amount ' + Math.abs(settlement_amount) + ' allowed !');
				}
			} else {

				return resultdb(CONSTANTS.NOT_FOUND, 'Already Settled !');
			}

		} else {

			return resultdb(CONSTANTS.NOT_FOUND, 'Invalid Input !');
		}

	} catch (error) {
		console.log(error);

		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let settlementCollectionHistory = async (user_id, user_type_id, parent_id, page, opening_balance = 0) => {
	try {

		let limit = 10000;
		let offset = (page - 1) * limit;
		const pool = await poolPromise;
		if (page == 1) {
			let query = '';
			switch (user_type_id) {
				case 2:
					query = "SELECT u.id AS user_id, AVG(u.role_id) as roleId, MIN(u.name) as name, MIN(u.user_name) as user_name, AVG(u.parent_id) as parent_id, ROUND(ISNULL(SUM(super_admin_pl + super_admin_commission ), 0), 2) AS settlement_amount FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON u.id=user_profit_loss.admin_id WHERE u.parent_id =" + parent_id + " AND u.id = " + user_id + " GROUP BY u.id"; // ORDER BY u.name, u.user_name";
					break;
				case 3:
					query = "SELECT u.id AS user_id, AVG(u.role_id) as roleId, MIN(u.name) as name, MIN(u.user_name) as user_name, AVG(u.parent_id) as parent_id, ROUND(ISNULL(SUM(admin_pl + admin_commission + super_admin_pl + super_admin_commission), 0), 2) AS settlement_amount FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON u.id=user_profit_loss.super_master_id WHERE u.parent_id =" + parent_id + " AND u.id = " + user_id + " GROUP BY u.id";// ORDER BY u.name, u.user_name";
					break;
				case 4:
					query = "SELECT u.id AS user_id, AVG(u.role_id) as roleId, MIN(u.name) as name, MIN(u.user_name) as user_name, AVG(u.parent_id) as parent_id, ROUND(ISNULL(SUM(super_master_pl + super_master_commission + admin_pl + admin_commission + super_admin_pl + super_admin_commission), 0), 2) AS settlement_amount FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON u.id=user_profit_loss.master_id WHERE u.parent_id = " + parent_id + " AND u.id =" + user_id + " GROUP BY u.id "; // ORDER BY u.name, u.user_name`;
					break;
				case 5:
					query = "SELECT u.id AS user_id, AVG(u.role_id) as roleId, MIN(u.name) as name, MIN(u.user_name) as user_name, AVG(u.parent_id) as parent_id, ROUND(ISNULL(SUM(master_pl + master_commission + super_master_pl + super_master_commission + admin_pl + admin_commission + super_admin_pl + super_admin_commission), 0), 2) AS settlement_amount FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON u.id=user_profit_loss.agent_id WHERE u.parent_id =" + parent_id + " AND u.id = " + user_id + " GROUP BY u.id";// ORDER BY u.name, u.user_name`;
					break;
				case 6:
					query = "SELECT u.id AS user_id, AVG(u.role_id) as roleId, MIN(u.name) as name, MIN(u.user_name) as user_name, AVG(u.parent_id) as parent_id, ROUND(ISNULL(SUM(agent_pl + agent_commission + master_pl + master_commission + super_master_pl + super_master_commission + admin_pl + admin_commission + super_admin_pl + super_admin_commission), 0), 2) AS settlement_amount FROM users u with(nolock) LEFT JOIN user_profit_loss with(nolock) ON u.id=user_profit_loss.user_id WHERE u.parent_id =" + parent_id + " AND u.id = " + user_id + " GROUP BY u.id";// ORDER BY u.name, u.user_name`;
					break;
				default:
					query = "SELECT u.id AS user_id, AVG(u.role_id) as roleId, MIN(u.name) as name, MIN(u.user_name) as user_name, AVG(u.parent_id) as parent_id, 0 AS settlement_amount FROM user_profit_loss with(nolock) INNER JOIN users u with(nolock) ON u.id=user_profit_loss.user_id WHERE u.parent_id = " + parent_id + " AND u.id = " + user_id + " GROUP BY u.id";// ORDER BY u.name, u.user_name`;
			}
			console.log(query);
			const result = await pool.request().query(query);
			let resFromDB = result.recordset;
			if (resFromDB.length > 0) {
				opening_balance = resFromDB[0].settlement_amount;
			}

		}

		const resFromDB12 = await pool.request()
			.input('UserID', sql.Int, user_id)
			.input('OpeningBalance', sql.Decimal, opening_balance)
			.input('LIMIT', sql.Int, limit)
			.input('OFFSETS', sql.Int, offset)
			.execute('GET_USER_SETTLEMENT_HISTORY');

		let resFromDB2 = resFromDB12.recordset;
		resFromDB2.push({ "opening_balance": opening_balance });
		//resFromDB2[2] = {"opening_balance" : opening_balance};
		//console.log(resFromDB2);
		return resultdb(CONSTANTS.SUCCESS, resFromDB2);
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};



let historyList = async (user_id, user_type_id, parent_id, page) => {
	try {

		let limit = 10000;
		let offset = (page - 1) * limit;
		const pool = await poolPromise;
		let querUser = "";

		if (user_id > 0) {
			querUser = " AND usr.id = " + user_id + "";
		}
		query = "SELECT setlment.amount,setlment.comment,setlment.created_at, usr.user_name, usr.name FROM settlement_collections setlment with(nolock) JOIN users usr with(nolock) on usr.id=setlment.user_id where (usr.parent_id=" + parent_id + " OR usr.id = " + parent_id + ") " + querUser + " ";

		const result = await pool.request().query(query);

		if (result.recordset == null || result.recordset.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}

	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getChildUserList = async (parent_id) => {
	try {


		const pool = await poolPromise;
		let query = "SELECT CONCAT(name ,' (', user_name,')') as userName,id as uid FROM users with(nolock) where parent_id=" + parent_id;

		const result = await pool.request().query(query);

		if (result.recordset == null || result.recordset.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}

	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let settlementHistoryByParent = async (user_id, page) => {
	try {

		let limit = CONSTANTS.LIMIT;
		let offset = (page - 1) * limit;

		let calc = '';
		if (page == 1) {
			calc += ' SQL_CALC_FOUND_ROWS ';
		}

		let qry = ` SELECT SQL_CALC_FOUND_ROWS a.*,  (@ii := @ii + 1) as s_num FROM settlement_collections a with(nolock)  , (SELECT @ii:=?) d WHERE a.user_id = ? ORDER BY a.id ASC LIMIT ?, ?; SELECT FOUND_ROWS() AS total;`;

		let resFromDB = await MysqlPool.query(qry, [offset, user_id, offset, limit]);


		let returnRes = {
			list: resFromDB[0],
			total: resFromDB[1][0].total
		};
		return resultdb(CONSTANTS.SUCCESS, returnRes);

	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let userPosition = async (user_id, user_type_id, match_id, market_id) => {
	try {

		let query = '';

		switch (user_type_id) {
			case 1:
				query = "SELECT MIN(selection_name) as Account,ROUND(ISNULL(SUM(super_admin_win_loss),0.00) , 2) AS Own, 0.00 AS Parent, (ROUND(ISNULL(SUM(super_admin_win_loss),0.00) , 2)) as Total FROM odds_profit_loss with(nolock)  WHERE odds_profit_loss.super_admin_id =" + user_id + " AND odds_profit_loss.market_id='" + market_id + "' group by selection_id ORDER BY selection_id ASC";
				break;
			case 2:
				query = "SELECT MIN(selection_name) as Account,ROUND(ISNULL(SUM(admin_win_loss),0.00) , 2) AS Own, ROUND(ISNULL(SUM(super_admin_win_loss),0.00) , 2) AS Parent,(ROUND(ISNULL(SUM(admin_win_loss),0.00) , 2) + ROUND(ISNULL(SUM(super_admin_win_loss),0.00), 2) ) as Total FROM odds_profit_loss with(nolock) WHERE odds_profit_loss.admin_id =" + user_id + " AND odds_profit_loss.market_id='" + market_id + "' group by selection_id ORDER BY selection_id ASC";
				break;
			case 3:
				query = "SELECT MIN(selection_name) as Account,ROUND(ISNULL(SUM(super_master_win_loss),0.00) , 2) AS Own, ROUND(ISNULL(SUM(super_admin_win_loss),0.00) + ISNULL(SUM(admin_win_loss),0.00) , 2) AS Parent,(ROUND(ISNULL(SUM(super_master_win_loss),0.00) , 2) + ROUND(ISNULL(SUM(super_admin_win_loss),0.00) + ISNULL(SUM(admin_win_loss),0.00), 2) ) as Total FROM odds_profit_loss with(nolock) WHERE odds_profit_loss.super_master_id =" + user_id + " AND odds_profit_loss.market_id='" + market_id + "' group by selection_id ORDER BY selection_id ASC";
				break;
			case 4:
				query = "SELECT MIN(selection_name) as Account,ROUND(ISNULL(SUM(master_win_loss),0.00) , 2) AS Own, ROUND(ISNULL(SUM(super_admin_win_loss),0.00) + ISNULL(SUM(admin_win_loss),0.00) + ISNULL(SUM(super_master_win_loss),0.00) , 2) AS Parent,(ROUND(ISNULL(SUM(master_win_loss),0.00) , 2) + ROUND(ISNULL(SUM(super_admin_win_loss),0.00) + ISNULL(SUM(admin_win_loss),0.00) + ISNULL(SUM(super_master_win_loss),0.00), 2) ) as Total FROM odds_profit_loss with(nolock) WHERE odds_profit_loss.master_id =" + user_id + " AND odds_profit_loss.market_id='" + market_id + "' group by selection_id ORDER BY selection_id ASC";
				break;
			case 5:
				query = "SELECT MIN(selection_name) as Account,ROUND(ISNULL(SUM(agent_win_loss),0.00) , 2) AS Own, ROUND(ISNULL(SUM(super_admin_win_loss),0.00) + ISNULL(SUM(admin_win_loss),0.00) + ISNULL(SUM(super_master_win_loss),0.00) + ISNULL(SUM(master_win_loss),0.00), 2) AS Parent, (ROUND(ISNULL(SUM(agent_win_loss),0.00) , 2) + ROUND(ISNULL(SUM(super_admin_win_loss),0.00) + ISNULL(SUM(admin_win_loss),0.00) + ISNULL(SUM(super_master_win_loss),0.00) + ISNULL(SUM(master_win_loss),0.00), 2) ) as Total FROM odds_profit_loss with(nolock) WHERE odds_profit_loss.agent_id =" + user_id + " AND odds_profit_loss.market_id='" + market_id + "' group by selection_id ORDER BY selection_id ASC";
				break;
			default:
				query = "SELECT MIN(selection_name) as Account,ROUND(ISNULL(SUM(win_loss_value),0.00) , 2) AS Own, ROUND(ISNULL(SUM(super_admin_win_loss),0.00) + ISNULL(SUM(admin_win_loss),0.00) + ISNULL(SUM(super_master_win_loss),0.00) + ISNULL(SUM(master_win_loss),0.00) + ISNULL(SUM(agent_win_loss),0.00), 2) AS Parent, (ROUND(ISNULL(SUM(win_loss_value),0.00) , 2) + ROUND(ISNULL(SUM(agent_win_loss),0.00) , 2) + ROUND(ISNULL(SUM(super_admin_win_loss),0.00) + ISNULL(SUM(admin_win_loss),0.00) + ISNULL(SUM(super_master_win_loss),0.00) + ISNULL(SUM(master_win_loss),0.00), 2) ) as Total FROM odds_profit_loss with(nolock) WHERE odds_profit_loss.user_id =" + user_id + " AND odds_profit_loss.market_id='" + market_id + "' group by selection_id ORDER BY selection_id ASC";
		}
		console.log('ownData user position ------------ ', query);
		const pool = await poolPromise;
		const result = await pool.request().query(query);

		let data = {
			Account: [],
			Own: [],
			Parent: [],
			Total: [],
		};
		for (let i in result.recordset) {
			let element = result.recordset[i];
			data['Account'].push(element.Account)
			data['Own'].push(element.Own)
			data['Parent'].push(element.Parent)
			data['Total'].push(element.Total)
		}

		return resultdb(CONSTANTS.SUCCESS, data);
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let ourUserPosition = async (user_id, user_type_id, match_id, market_id) => {
	try {

		let user_search = "";

		let query = '';

		switch (user_type_id) {
			case 1:
				query = "SELECT 1 as role_id, MIN(usr.parent_id) as parent_id, 1 as backrole, 1 as backuser, MIN(usr.id) as id, MIN(usr.role_id) as roleId,MIN(odds_profit_loss.market_id) as market_id,MIN(odds_profit_loss.match_id) as match_id, MIN(CONCAT(usr.name, ' ( ', usr.user_name,' )') ) as userName,STUFF((SELECT '_' + CAST( sum(odds_profit_loss.super_admin_win_loss) AS varchar(1000)) from odds_profit_loss with(nolock) where odds_profit_loss.admin_id = MIN(usr.id)  AND odds_profit_loss.market_id='" + market_id + "' group by selection_id ORDER BY selection_id ASC  FOR XML PATH('')), 1, 1, '' ) AS [winloss] FROM odds_profit_loss with(nolock) join users as usr with(nolock) ON usr.id=odds_profit_loss.admin_id  WHERE odds_profit_loss.super_admin_id =" + user_id + " AND odds_profit_loss.market_id='" + market_id + "' group by odds_profit_loss.admin_id";
				break;
			case 2:
				query = "SELECT 2 as role_id,MIN(usr.parent_id) as parent_id, 1 as backrole, MIN(usr.super_admin_id) as backuser, MIN(usr.id) as id, MIN(usr.role_id) as roleId,MIN(odds_profit_loss.market_id) as market_id,MIN(odds_profit_loss.match_id) as match_id, MIN(CONCAT(usr.name, ' ( ', usr.user_name,' )') ) as userName,STUFF((SELECT '_' + CAST( sum(odds_profit_loss.admin_win_loss) AS varchar(1000)) from odds_profit_loss with(nolock) where odds_profit_loss.super_master_id = MIN(usr.id)  AND odds_profit_loss.market_id='" + market_id + "' group by selection_id ORDER BY selection_id ASC  FOR XML PATH('')), 1, 1, '' ) AS [winloss] FROM odds_profit_loss with(nolock) join users as usr with(nolock) ON usr.id=odds_profit_loss.super_master_id  WHERE odds_profit_loss.admin_id =" + user_id + " AND odds_profit_loss.market_id='" + market_id + "' group by odds_profit_loss.super_master_id";
				break;
			case 3:
				query = "SELECT 3 as role_id, MIN(usr.parent_id) as parent_id,2 as backrole, MIN(usr.admin_id) as backuser, MIN(usr.id) as id, MIN(usr.role_id) as roleId,MIN(odds_profit_loss.market_id) as market_id,MIN(odds_profit_loss.match_id) as match_id, MIN(CONCAT(usr.name, ' ( ', usr.user_name,' )') ) as userName,STUFF((SELECT '_' + CAST( sum(odds_profit_loss.super_master_win_loss) AS varchar(1000)) from odds_profit_loss with(nolock) where odds_profit_loss.master_id = MIN(usr.id)  AND odds_profit_loss.market_id='" + market_id + "' group by selection_id ORDER BY selection_id ASC  FOR XML PATH('')), 1, 1, '' ) AS [winloss] FROM odds_profit_loss with(nolock) join users as usr with(nolock) ON usr.id=odds_profit_loss.master_id  WHERE odds_profit_loss.super_master_id =" + user_id + " AND odds_profit_loss.market_id='" + market_id + "' group by odds_profit_loss.master_id";
				break;
			case 4:
				query = "SELECT 4 as role_id, MIN(usr.parent_id) as parent_id, 3 as backrole, MIN(usr.super_id) as backuser, MIN(usr.id) as id, MIN(usr.role_id) as roleId,MIN(odds_profit_loss.market_id) as market_id,MIN(odds_profit_loss.match_id) as match_id, MIN(CONCAT(usr.name, ' ( ', usr.user_name,' )') ) as userName,STUFF((SELECT '_' + CAST( sum(odds_profit_loss.master_win_loss) AS varchar(1000)) from odds_profit_loss with(nolock) where odds_profit_loss.agent_id = MIN(usr.id)  AND odds_profit_loss.market_id='" + market_id + "' group by selection_id ORDER BY selection_id ASC  FOR XML PATH('')), 1, 1, '' ) AS [winloss] FROM odds_profit_loss with(nolock) join users as usr with(nolock) ON usr.id=odds_profit_loss.agent_id  WHERE odds_profit_loss.master_id =" + user_id + " AND odds_profit_loss.market_id='" + market_id + "'  group by odds_profit_loss.agent_id";
				break;
			case 5:
				query = "SELECT 5 as role_id, MIN(usr.parent_id) as parent_id,4 as backrole, MIN(usr.master_id) as backuser, MIN(usr.id) as id, MIN(usr.role_id) as roleId,MIN(odds_profit_loss.market_id) as market_id,MIN(odds_profit_loss.match_id) as match_id, MIN(CONCAT(usr.name, ' ( ', usr.user_name,' )') ) as userName,STUFF((SELECT '_' + CAST( sum(odds_profit_loss.win_loss_value) AS varchar(1000)) from odds_profit_loss with(nolock) where odds_profit_loss.user_id = MIN(usr.id)  AND odds_profit_loss.market_id='" + market_id + "' group by selection_id ORDER BY selection_id ASC  FOR XML PATH('')), 1, 1, '' ) AS [winloss] FROM odds_profit_loss with(nolock) join users as usr with(nolock) ON usr.id=odds_profit_loss.user_id  WHERE odds_profit_loss.agent_id =" + user_id + " AND odds_profit_loss.market_id='" + market_id + "'  group by user_id";
				break;
			default:
				query = "SELECT 6 as role_id, MIN(usr.parent_id) as parent_id , 5 as backrole, MIN(usr.agent_id) as backuser, MIN(usr.id) as id, MIN(usr.role_id) as roleId,MIN(odds_profit_loss.market_id) as market_id,MIN(odds_profit_loss.match_id) as match_id, MIN(CONCAT(usr.name, ' ( ', usr.user_name,' )') ) as userName,STUFF((SELECT '_' + CAST( sum(odds_profit_loss.win_loss_value) AS varchar(1000)) from odds_profit_loss with(nolock) where odds_profit_loss.user_id = MIN(usr.id)  AND odds_profit_loss.market_id='" + market_id + "' group by selection_id ORDER BY selection_id ASC  FOR XML PATH('')), 1, 1, '' ) AS [winloss] FROM odds_profit_loss with(nolock) join users as usr with(nolock) ON usr.id=odds_profit_loss.user_id  WHERE odds_profit_loss.user_id =" + user_id + " AND odds_profit_loss.market_id='" + market_id + "'  group by user_id";
		}
		console.log('ourUserPosition ---------- ', query);
		const pool = await poolPromise;
		const result = await pool.request().query(query);
		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);

		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}

	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getMyMarketList = async (data) => {
	try {
		const pool = await poolPromise;
		let query = "";
		switch (data.role_id) {
			case 1:
				query = "SELECT  spt.name as SportName,ser.name as seriesName,ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=49 and permission_role.role_id=" + data.role_id + " ),0) as read_matches,ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=102 and permission_role.role_id=" + data.role_id + " ),0) as setting_matches, mtch.is_bet_allow as matchBetAllow,mtch.is_fancy_bet_allow as matchFancyBetAllow,ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET LOCKED' ELSE mkts.market_admin_message END,'')  as adminMessage,'' AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before >0 THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id, mtch.match_id, mtch.name, (CASE WHEN  NOT EXISTS (SELECT 1  from deactive_fancies with(nolock) WHERE deactive_fancies.match_id = mtch.match_id AND deactive_fancies.user_id=" + data.user_id + ") THEN 'Y' ELSE 'N' END) AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, mtch.sport_id, mkts.market_id as market_id,STUFF((SELECT MIN(selection_name) , '===' + CAST( round(sum(odds_profit_loss.super_admin_win_loss),2) AS varchar(8000)),'@@@' from odds_profit_loss with(nolock) where match_id=mtch.match_id and market_id=mkts.market_id and super_admin_id=" + data.user_id + " group by selection_id ORDER BY selection_id ASC  FOR XML PATH('')), 1, 0, '' ) as winloss FROM matches as mtch with(nolock) JOIN series as ser with(nolock) ON ser.series_id=mtch.series_id JOIN sports as spt with(nolock) ON spt.sport_id = mtch.sport_id  JOIN markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' where NOT EXISTS (SELECT 1  from user_deactive_matches with(nolock) WHERE user_deactive_matches.match_id = mtch.match_id AND user_deactive_matches.user_id =" + data.user_id + ")  AND (mtch.match_id=(select TOP 1  match_id from odds_profit_loss with(nolock) where super_admin_id=" + data.user_id + " AND match_id=mtch.match_id ) OR mtch.match_id=(select TOP 1  match_id from fancy_score_positions with(nolock) where super_admin_id=" + data.user_id + " AND match_id=mtch.match_id ) ) AND NOT EXISTS (SELECT 1 from deactive_sports with(nolock) WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id=" + data.user_id + ") AND spt.status='Y' AND mtch.status='Y' AND mtch.is_completed='N' ";
				break;
			case 2:
				query = "SELECT  spt.name as SportName,ser.name as seriesName,ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=49 and permission_role.role_id=" + data.role_id + " ),0) as read_matches,ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=102 and permission_role.role_id=" + data.role_id + " ),0) as setting_matches, mtch.is_bet_allow as matchBetAllow,mtch.is_fancy_bet_allow as matchFancyBetAllow,ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET LOCKED' ELSE mkts.market_admin_message END,'') as adminMessage,'' AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before >0 THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id, mtch.match_id, mtch.name, (CASE WHEN NOT EXISTS (SELECT 1  from deactive_fancies with(nolock) WHERE deactive_fancies.match_id = mtch.match_id AND deactive_fancies.user_id =" + data.user_id + ")  THEN 'Y' ELSE 'N' END) AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, mtch.sport_id, mkts.market_id as market_id,STUFF((SELECT MIN(selection_name) , '===' + CAST( round(sum(odds_profit_loss.admin_win_loss),2) AS varchar(8000)),'@@@' from odds_profit_loss with(nolock) where match_id=mtch.match_id and market_id=mkts.market_id and admin_id=" + data.user_id + " group by selection_id ORDER BY selection_id ASC  FOR XML PATH('')), 1, 0, '' ) as winloss FROM matches as mtch with(nolock) JOIN series as ser with(nolock) ON ser.series_id=mtch.series_id JOIN sports as spt with(nolock) ON spt.sport_id = mtch.sport_id  JOIN markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' where NOT EXISTS (SELECT 1  from user_deactive_matches with(nolock) WHERE user_deactive_matches.match_id = mtch.match_id AND user_deactive_matches.user_id =" + data.user_id + ") AND (mtch.match_id=(select TOP 1  match_id from odds_profit_loss with(nolock) where admin_id=" + data.user_id + " AND match_id=mtch.match_id ) OR mtch.match_id=(select TOP 1  match_id from fancy_score_positions with(nolock) where admin_id=" + data.user_id + " AND match_id=mtch.match_id ) ) AND NOT EXISTS (SELECT 1 from deactive_sports with(nolock) WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id =" + data.user_id + ") AND spt.status='Y' AND mtch.status='Y' AND mtch.is_completed='N' ";
				break;
			case 3:
				query = "SELECT  spt.name as SportName,ser.name as seriesName,ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=49 and permission_role.role_id=" + data.role_id + " ),0) as read_matches,ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=102 and permission_role.role_id=" + data.role_id + " ),0) as setting_matches,mtch.is_bet_allow as matchBetAllow,mtch.is_fancy_bet_allow as matchFancyBetAllow, ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET LOCKED' ELSE mkts.market_admin_message END,'') as adminMessage,'' AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before >0 THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id, mtch.match_id, mtch.name, (CASE WHEN NOT EXISTS (SELECT 1  from deactive_fancies with(nolock) WHERE deactive_fancies.match_id = mtch.match_id AND deactive_fancies.user_id =" + data.user_id + ") THEN 'Y' ELSE 'N' END) AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, mtch.sport_id, mkts.market_id as market_id ,STUFF((SELECT MIN(selection_name) , '===' + CAST( round(sum(odds_profit_loss.super_master_win_loss),2) AS varchar(8000)),'@@@' from odds_profit_loss with(nolock) where match_id=mtch.match_id and market_id=mkts.market_id and super_master_id=" + data.user_id + " group by selection_id ORDER BY selection_id ASC  FOR XML PATH('')), 1, 0, '' ) as winloss FROM matches as mtch with(nolock) JOIN series as ser with(nolock) ON ser.series_id=mtch.series_id JOIN sports as spt with(nolock) ON spt.sport_id = mtch.sport_id  JOIN markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' where NOT EXISTS (SELECT 1  from user_deactive_matches with(nolock) WHERE user_deactive_matches.match_id = mtch.match_id AND user_deactive_matches.user_id =" + data.user_id + ") AND (mtch.match_id=(select TOP 1  match_id from odds_profit_loss with(nolock) where super_master_id=" + data.user_id + " AND match_id=mtch.match_id ) OR mtch.match_id=(select TOP 1  match_id from fancy_score_positions with(nolock) where super_master_id=" + data.user_id + " AND match_id=mtch.match_id ) ) AND NOT EXISTS (SELECT 1 from deactive_sports with(nolock) WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id =" + data.user_id + ") AND spt.status='Y' AND mtch.status='Y' AND mtch.is_completed='N' ";
				break;
			case 4:
				query = "SELECT  spt.name as SportName,ser.name as seriesName,ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=49 and permission_role.role_id=" + data.role_id + " ),0) as read_matches,ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=102 and permission_role.role_id=" + data.role_id + " ),0) as setting_matches,mtch.is_bet_allow as matchBetAllow,mtch.is_fancy_bet_allow as matchFancyBetAllow, ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET LOCKED' ELSE mkts.market_admin_message END,'') as adminMessage,'' AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before >0 THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id, mtch.match_id, mtch.name, (CASE WHEN NOT EXISTS (SELECT 1  from deactive_fancies with(nolock) WHERE deactive_fancies.match_id = mtch.match_id AND deactive_fancies.user_id =" + data.user_id + ") THEN 'Y' ELSE 'N' END) AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, mtch.sport_id, mkts.market_id as market_id ,STUFF((SELECT MIN(selection_name) , '===' + CAST( round(sum(odds_profit_loss.master_win_loss),2) AS varchar(8000)),'@@@' from odds_profit_loss with(nolock) where match_id=mtch.match_id and market_id=mkts.market_id and master_id=" + data.user_id + " group by selection_id ORDER BY selection_id ASC  FOR XML PATH('')), 1, 0, '' ) as winloss FROM matches as mtch with(nolock) JOIN series as ser with(nolock) ON ser.series_id=mtch.series_id JOIN sports as spt with(nolock) ON spt.sport_id = mtch.sport_id  JOIN markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' where NOT EXISTS (SELECT 1  from user_deactive_matches with(nolock) WHERE user_deactive_matches.match_id = mtch.match_id AND user_deactive_matches.user_id =" + data.user_id + " ) AND (mtch.match_id=(select TOP 1  match_id from odds_profit_loss with(nolock) where master_id=" + data.user_id + " AND match_id=mtch.match_id ) OR mtch.match_id=(select TOP 1  match_id from fancy_score_positions with(nolock) where master_id=" + data.user_id + " AND match_id=mtch.match_id ) ) AND NOT EXISTS (SELECT 1 from deactive_sports with(nolock) WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id =" + data.user_id + ") AND spt.status='Y' AND mtch.status='Y' AND mtch.is_completed='N' ";
				break;
			case 5:
				query = "SELECT  spt.name as SportName,ser.name as seriesName,ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=49 and permission_role.role_id=" + data.role_id + " ),0) as read_matches,ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=102 and permission_role.role_id=" + data.role_id + " ),0) as setting_matches,mtch.is_bet_allow as matchBetAllow,mtch.is_fancy_bet_allow as matchFancyBetAllow, ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET LOCKED' ELSE mkts.market_admin_message END,'') as adminMessage,'' AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before >0 THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id, mtch.match_id, mtch.name, (CASE WHEN NOT EXISTS (SELECT 1  from deactive_fancies with(nolock) WHERE deactive_fancies.match_id = mtch.match_id AND deactive_fancies.user_id =" + data.user_id + " ) THEN 'Y' ELSE 'N' END) AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, mtch.sport_id, mkts.market_id as market_id ,STUFF((SELECT MIN(selection_name) , '===' + CAST( round(sum(odds_profit_loss.agent_win_loss),2) AS varchar(8000)),'@@@' from odds_profit_loss with(nolock) where match_id=mtch.match_id and market_id=mkts.market_id and agent_id=" + data.user_id + " group by selection_id ORDER BY selection_id ASC  FOR XML PATH('')), 1, 0, '' ) as winloss FROM matches as mtch with(nolock) JOIN series as ser with(nolock) ON ser.series_id=mtch.series_id JOIN sports as spt with(nolock) ON spt.sport_id = mtch.sport_id  JOIN markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' where NOT EXISTS (SELECT 1  from user_deactive_matches with(nolock) WHERE user_deactive_matches.match_id = mtch.match_id AND user_deactive_matches.user_id =" + data.user_id + ") AND (mtch.match_id=(select TOP 1  match_id from odds_profit_loss with(nolock) where agent_id=" + data.user_id + " AND match_id=mtch.match_id ) OR mtch.match_id=(select TOP 1  match_id from fancy_score_positions with(nolock) where agent_id=" + data.user_id + " AND match_id=mtch.match_id ) ) AND NOT EXISTS (SELECT 1 from deactive_sports with(nolock) WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id =" + data.user_id + ") AND spt.status='Y' AND mtch.status='Y' AND mtch.is_completed='N' ";
				break;
			default:
				query = "SELECT  spt.name as SportName,ser.name as seriesName,ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=49 and permission_role.role_id=" + data.role_id + " ),0) as read_matches,ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=102 and permission_role.role_id=" + data.role_id + " ),0) as setting_matches,mtch.is_bet_allow as matchBetAllow,mtch.is_fancy_bet_allow as matchFancyBetAllow,ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET LOCKED' ELSE mkts.market_admin_message END,'') as adminMessage,'' AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before >0 THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id, mtch.match_id, mtch.name, (CASE WHEN NOT EXISTS (SELECT 1  from deactive_fancies with(nolock) WHERE deactive_fancies.match_id = mtch.match_id AND deactive_fancies.user_id = " + data.user_id + ") THEN 'Y' ELSE 'N' END) AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, mtch.sport_id, mkts.market_id as market_id ,STUFF((SELECT MIN(selection_name) , '===' + CAST( round(sum(odds_profit_loss.win_loss_value),2) AS varchar(8000)),'@@@' from odds_profit_loss with(nolock) where match_id=mtch.match_id and market_id=mkts.market_id and user_id=" + data.user_id + " group by selection_id ORDER BY selection_id ASC  FOR XML PATH('')), 1, 0, '' ) as winloss FROM matches as mtch with(nolock) JOIN series as ser with(nolock) ON ser.series_id=mtch.series_id JOIN sports as spt with(nolock) ON spt.sport_id = mtch.sport_id  JOIN markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' where NOT EXISTS (SELECT 1  from user_deactive_matches with(nolock) WHERE user_deactive_matches.match_id = mtch.match_id AND user_deactive_matches.user_id =" + data.user_id + " ) AND (mtch.match_id=(select TOP 1  match_id from odds_profit_loss with(nolock) where user_id=" + data.user_id + " AND match_id=mtch.match_id ) OR mtch.match_id=(select TOP 1  match_id from fancy_score_positions with(nolock) where user_id=" + data.user_id + " AND match_id=mtch.match_id ) ) AND NOT EXISTS (SELECT 1 from deactive_sports with(nolock) WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id =" + data.user_id + " )  AND spt.status='Y' AND mtch.status='Y' AND mtch.is_completed='N' ";
		}

		if (data.sport_id > 0 && data.sport_id != 0) {
			query += " AND mtch.sport_id=" + data.sport_id + "";
		}
		console.log('query---- ', query);
		const result = await pool.request()
			.query(query)
		if (result.recordset === null || result.recordset.length === 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			// let marketData=result.recordset.map((data)=>(data.market_id));
			// let oddsData=await exchangeService.getOddsByMarketIds(marketData);
			// let newdata=result.recordset.map((data)=>(
			// 	oddsData.data[data.market_id]?{...data,runner_json:oddsData.data[data.market_id].runners,InplayStatus:oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status:'CLOSE'}:{...data,runner_json:data.runner_json?JSON.parse(data.runner_json):data.runner_json,InplayStatus:'CLOSE'}
			// )); 
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getInplayMatchesList = async (data) => {
	try {
		let userId = data.user_id;
		let GetAllSportMatch = "";
		let inplayDate = Math.floor(Date.now() / 1000);
		const pool = await poolPromise;
		if (data.sport_id > 0) {
			GetAllSportMatch = " AND spt.sport_id=" + data.sport_id + ""
		}
		let query = "SELECT  spt.name as SportName,ser.name as seriesName, ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=49 and permission_role.role_id=" + data.role_id + " ),0) as read_matches, ISNULL((select 1 from permission_role with(nolock) where permission_role.permission_id=102 and permission_role.role_id=" + data.role_id + " ),0) as setting_matches, mtch.is_bet_allow as matchBetAllow,mtch.is_fancy_bet_allow as matchFancyBetAllow, ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET LOCKED' ELSE mkts.market_admin_message END,'') as adminMessage,(CASE WHEN (select count(*) from markets with(nolock) where match_id=mtch.match_id AND status='Y' AND is_result_declared='N' AND isbetalowaftermatchodds='Y' AND (result_id IS NULL OR result_id=0)) > 0 THEN 'OPEN' ELSE 'CLOSE' END) AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id, mtch.match_id, mtch.name,(CASE WHEN NOT EXISTS (SELECT 1  from deactive_fancies with(nolock) WHERE deactive_fancies.match_id = mtch.match_id AND deactive_fancies.user_id =" + userId + " )  THEN 'Y' ELSE 'N' END) AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, mtch.sport_id, mkts.market_id as market_id,STUFF((SELECT MIN(selection_name) , '===' + CAST( round(sum(odds_profit_loss.super_admin_win_loss),2) AS varchar(8000)),'@@@' from odds_profit_loss with(nolock) where match_id=mtch.match_id and market_id=mkts.market_id and super_admin_id=" + data.user_id + " group by selection_id ORDER BY selection_id ASC  FOR XML PATH('')), 1, 0, '' ) as winloss FROM matches as mtch with(nolock) JOIN series as ser with(nolock) ON ser.series_id=mtch.series_id JOIN sports as spt with(nolock) ON spt.sport_id = mtch.sport_id  JOIN markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds'  where NOT EXISTS (SELECT 1  from user_deactive_matches with(nolock) WHERE user_deactive_matches.match_id = mtch.match_id AND user_deactive_matches.user_id = " + userId + ") AND NOT EXISTS (SELECT 1 from deactive_sports with(nolock) WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id = " + userId + " ) AND spt.status='Y' " + GetAllSportMatch + " AND mtch.status='Y' AND mtch.start_date <= " + inplayDate + " AND mtch.is_completed='N' AND mtch.is_cup='N' ORDER BY   spt.order_by ASC, mtch.start_date ASC";
		//console.log('query ----------- get inplay match', query);
		const result = await pool.request()
			.query(query)

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let userFancyPosition = async (user_id, match_id, fancy_id, user_type_id) => {
	try {

		let data;
		let fancyList = await getFancyBetForUserPosition(user_id, match_id, fancy_id, user_type_id, notInArray = []);
		//console.log('fancyList',fancyList.data);
		let fancyListData = [];
		if (fancyList.statusCode === CONSTANTS.SUCCESS) {
			fancyListData = fancyList.data;
			if (fancyListData.length > 0) {
				let run = [];
				let resultValues = [];
				let orgRun = [];
				let lastPosition = 0;
				let max_exposure = 0;
				for (let i in fancyListData) {
					let fancy = fancyListData[i];
					run.push(fancy.run - 1);
				}
				run.push(fancyListData[fancyListData.length - 1].run);

				orgRun = run;

				run = [...new Set(run)];
				//console.log('run run',run);
				run.map(function (r, ind) {
					let tempTotal = 0;
					//console.log('111111111111--rrr',r);
					fancyListData.map(async function (f) {

						let stack = (f.stack * f.per) / 100;
						if (f.is_back == 1) {
							if (f.run <= r) {

								tempTotal -= stack * (f.size / 100);
							} else {
								tempTotal += stack;
							}

						} else {

							if (f.run > r) {

								tempTotal -= stack;

							} else {
								tempTotal += stack * (f.size / 100);
							}

						}

					});
					//console.log('lastPosition',lastPosition);
					//console.log('rrrrr',r);
					if ((orgRun.length) - 1 === ind) {
						resultValues.push({ "key": lastPosition + '+', "value": tempTotal.toFixed(2) });
					} else {
						if (lastPosition == r) {
							//console.log('aivnash if');
							resultValues.push({ "key": lastPosition, "value": tempTotal.toFixed(2) });
						} else {
							//console.log('aivnash else');
							resultValues.push({ "key": lastPosition + '-' + r, "value": tempTotal.toFixed(2) });

						}

					}
					//console.log('resultValues',resultValues);
					lastPosition = r + 1;
					if (max_exposure > tempTotal) {
						max_exposure = tempTotal;
					}

				});
				data = { "fancy_position": resultValues, "liability": max_exposure };
			} else {
				data = { "fancy_position": [], "liability": 0 };
			}
		} else {
			data = { "fancy_position": [], "liability": 0 };
		}
		return resultdb(CONSTANTS.SUCCESS, data);

	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getFancyBetForUserPosition = async (user_id, match_id, fancy_id, user_type_id = null, notInIds = []) => {
	try {
		let condition;
		let selectioName;
		switch (user_type_id) {
			case 1:
				condition = " and super_admin_id=" + user_id;
				selectioName = " ,super_admin as per ";
				break;
			case 2:
				condition = " and admin_id=" + user_id;;
				selectioName = " ,admin as per ";
				break;
			case 3:
				condition = " and super_master_id=" + user_id;
				selectioName = " ,super_master as per  ";
				break;
			case 4:
				condition = " and master_id=" + user_id;
				selectioName = " ,master as per ";
				break;
			case 5:
				condition = " and agent_id=" + user_id;;
				selectioName = " ,agent as per ";
				break;
			default:
				condition = " and user_id=" + user_id;;
				selectioName = " , 100 as per ";
		}

		if (notInIds.length > 0) {
			condition += " and id not in (?) "
		}
		let sql = "select run,is_back,size,sum(stack) as stack " + selectioName + " from bets_fancy with(nolock) where delete_status='0' and fancy_id='" + fancy_id + "' " + condition + " AND match_id=" + match_id + " group by run,is_back,size,super_admin,admin,master,super_master,agent order by run";
		console.log(sql);
		const pool = await poolPromise;
		const result = await pool.request()
			.query(sql)
		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}

	} catch (e) {
		//console.log(e);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let deleteSettlement = async (settlement_id) => {
	const pool = await poolPromise;

	try {
		//await conn.beginTransaction();
		let query = "SELECT TOP 1 a.*, b.role_id FROM settlement_collections AS a with(nolock) INNER JOIN users b with(nolock) ON(a.user_id = b.id) WHERE a.id = " + settlement_id + "";
		const result = await pool.request()
			.query(query)
		resFromDB = result.recordset;
		if (resFromDB.length > 0) {
			let amount = -(resFromDB[0].amount);
			let user_id = resFromDB[0].user_id;
			let user_type_id = resFromDB[0].role_id;
			let comment = resFromDB[0].comment;
			let inplayDate = Math.floor(Date.now() / 1000);

			if (user_type_id == 6) {

				let updateSettlementAmountQry = "UPDATE users SET total_settled_amount = total_settled_amount + " + amount + ", balance = balance - " + amount + ", profit_loss = profit_loss - " + amount + " WHERE id = " + user_id + "";
				await pool.request().query(updateSettlementAmountQry);
				console.log('4343434343');
				let accountStatementQry = "INSERT INTO account_statements (user_id, parent_id, description, statement_type, amount, available_balance, created_at) SELECT id, parent_id, CONCAT('Settlement Deleted: ', '" + comment + "'), 6, " + amount + ",  balance - " + amount + ", " + inplayDate + " FROM users with(nolock) WHERE id =" + user_id + " ";
				await pool.request().query(accountStatementQry);
				console.log('helehehehehehe');

			} else {

				let updateSettlementAmountQry2 = "UPDATE users SET total_settled_amount = total_settled_amount + " + amount + " WHERE id = " + user_id + " ";
				await pool.request().query(updateSettlementAmountQry2);

			}
			let collectionQry = "DELETE FROM settlement_collections with(nolock) WHERE id = " + settlement_id + " ";
			await pool.request().query(collectionQry);


			//	await conn.commit();
			//await conn.release();
			return resultdb(CONSTANTS.SUCCESS, 'Settlement Deleted');

		} else {
			//await conn.rollback();
			//await conn.release();
			return resultdb(CONSTANTS.NOT_FOUND, 'Invalid Input !');
		}

	} catch (error) {
		//await conn.rollback();
		//await conn.release();
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getCasinoSports = async () => {
	const pool = await poolPromise;

	try {

		let qry = "SELECT sport_id from sports with(nolock) where parent_id=" + CONSTANTS.BETFAIR_SPORT_CASINO + "";
		const result = await pool.request()
			.query(qry)

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}

	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
/*Save Casino Matches */

let saveCasinoMatches = async (sportsID) => {
	const pool = await poolPromise;
	try {
		let sportNewID = sportsID;
		let sprtsarray = [];
		sprtsarray.push(sportsID);
		let oddsData = await exchangeService.getCasinoOddsByMarketIds(sprtsarray);
		console.log(oddsData);
		let matchDetailRedis = oddsData.data;

		if (matchDetailRedis === null) {
			return resultdb(CONSTANTS.SUCCESS, CONSTANTS.BLANK_ARRAY);
		} else {

			let startDate = Math.round(new Date(matchDetailRedis[0].createdAt).getTime() / 1000);

			let matchExist = "select count(*) as count from cassino_matches with(nolock) where match_id=" + matchDetailRedis[0].matchId + " AND is_completed='N' AND series_id=" + sportNewID + "" + CONSTANTS.BETFAIR_SPORT_CASINO + "";
			const resFromDBr = await pool.request()
				.query(matchExist);

			let matchCount = resFromDBr.recordset[0].count;
			let runnerCound = matchDetailRedis[0].marketRunner.length;

			let matchStatus = matchDetailRedis[0].status;
			let matchId = matchDetailRedis[0].matchId;
			let marketId = matchDetailRedis[0].roundId;

			let matchoddsRunner = matchDetailRedis[0].marketRunner;

			if (matchStatus == 'CLOSED') {

				let resultQuery = "SELECT TOP 1 spt.sport_id,spt.name as sportName,mrkt.name,mtch.name as matchName,mrkt.series_id,mtch.match_id,mrkt.market_id FROM cassino_markets as mrkt with(nolock) JOIN sports as spt with(nolock) ON spt.sport_id=mrkt.sport_id JOIN cassino_matches as mtch with(nolock) ON mtch.match_id=mrkt.match_id AND mtch.sport_id=spt.sport_id WHERE mrkt.market_id='" + marketId + "' AND mrkt.card_data IS NULL";
				const autoResult = await pool.request().query(resultQuery);
				if (autoResult.recordset === null || autoResult.recordset.length == 0) {
					//console.log('66666666666666666666666');
					return resultdb(CONSTANTS.SUCCESS, CONSTANTS.BLANK_ARRAY);
				} else {
					console.log('avinash 1212121212');
					let matchDeclearQuery = "update cassino_matches set score_board_json='" + JSON.stringify(matchDetailRedis) + "' where match_id=" + matchId + " and sport_id=" + sportNewID + "";
					const declearResult = await pool.request()
						.query(matchDeclearQuery);

					let markeQueryUPdate = "update cassino_markets set card_data='" + JSON.stringify(matchDetailRedis) + "' where match_id=" + matchId + " and market_id='" + marketId + "' AND sport_id=" + sportNewID + "";
					await pool.request().query(markeQueryUPdate);

					let sportID = autoResult.recordset[0].sport_id;
					let sportName = autoResult.recordset[0].sportName;
					let matchName = autoResult.recordset[0].matchName;
					let marketName = autoResult.recordset[0].name;
					let seriesID = autoResult.recordset[0].series_id;
					let MatchId = autoResult.recordset[0].match_id;
					let rMarketID = autoResult.recordset[0].market_id;

					let selectionID = '';
					let selectionName = '';
					let removedselectionID = '';
					let removedselectionName = '';
					for (let s in matchoddsRunner) {
						let oddsRunner = matchoddsRunner[s];
						let selectionStatus = oddsRunner.status;
						if (selectionStatus == 'WINNER') {
							selectionID = oddsRunner.id;
							selectionName = oddsRunner.name;
						}
						/* if(selectionStatus=='REMOVED'){
							removedselectionID = oddsRunner.id;
							removedselectionName = oddsRunner.name;
						} */
					}
					let pSuperAdminCommissionType = 0;
					let pIsRollback = 0;
					if (selectionID === null || selectionID == '') {
						const abandoned = await pool.request()
							.input('pMatchID', sql.BigInt, MatchId)
							.input('pMarketID', sql.VarChar(50), rMarketID)
							.input('pIsRollback', sql.VarChar(50), pIsRollback)
							.input('pMarketNM', sql.VarChar(50), marketName)
							.input('pSeriesID', sql.Int, seriesID)
							.execute('SP_SET_ABANDONED_CASINO_MARKETS');

						return resultdb(CONSTANTS.SUCCESS, CONSTANTS.BLANK_ARRAY);

					} else {
						console.log('avinash result decalar');
						const result = await pool.request()
							.input('pSportsID', sql.VarChar(50), sportID)
							.input('pMatchID', sql.BigInt, MatchId)
							.input('pMarketID', sql.VarChar(50), rMarketID)
							.input('pSelectionID', sql.VarChar(50), selectionID)
							.input('pSportsNM', sql.VarChar(50), sportName)
							.input('pMatchNM', sql.VarChar(50), matchName)
							.input('pMarketNM', sql.VarChar(50), marketName)
							.input('pSelectionNM', sql.VarChar(50), selectionName)
							.input('pSuperAdminCommissionType', sql.Int, pSuperAdminCommissionType)
							.input('pSeriesID', sql.Int, seriesID)
							.execute('SP_SET_RESULT_CASINO_MARKETS');

						return resultdb(CONSTANTS.SUCCESS, CONSTANTS.BLANK_ARRAY);
					}

				}
			}



			if (matchCount === 0) {


				//console.log('avias5454545454');
				let query = "insert into cassino_matches (series_id,match_id,name,match_date,start_date,sport_id,is_completed, winner_name,score_key,cassino_match_type,is_bet_allow,score_board_json) values(" + sportNewID + "" + CONSTANTS.BETFAIR_SPORT_CASINO + "," + matchDetailRedis[0].matchId + ",'" + matchDetailRedis[0].matchName + "'," + startDate + "," + startDate + ",'" + sportNewID + "','N',NULL, NULL,0,'Y','[]')";
				//console.log('match query ', query);
				const matchInsert = await pool.request()
					.query(query);


				let marketInsertQuery = "insert into cassino_markets (series_id,match_id,market_id,name,runner_json,sport_id,market_runner_count,max_bet_liability,max_market_liability,max_market_profit, min_stack,max_stack,is_bet_allow,bet_allow_time_before,isbetalowaftermatchodds,display_name,match_date,status) values(" + sportNewID + "" + CONSTANTS.BETFAIR_SPORT_CASINO + "," + matchDetailRedis[0].matchId + ",'" + matchDetailRedis[0].roundId + "','Match Odds','" + JSON.stringify(matchDetailRedis) + "','" + sportNewID + "'," + runnerCound + ",0,0,0,0,0,'Y',0,'N','" + matchDetailRedis[0].marketHeader + "'," + startDate + ",'Y')";
				//console.log('market query ', marketInsertQuery);
				const marketInsert = await pool.request()
					.query(marketInsertQuery);



				let marktRunner = matchDetailRedis[0].marketRunner;
				let marketId = matchDetailRedis[0].roundId;

				let matchId = matchDetailRedis[0].matchId;

				for (let k in marktRunner) {
					let runnerJs = marktRunner[k];
					let runnerInsertQuery = "insert into cassino_market_selections (match_id,market_id,selection_id,name,sort_priority) values(" + matchId + ",'" + marketId + "'," + runnerJs.id + ",'" + runnerJs.name + "'," + runnerJs.sortPriority + ")";
					console.log('selection query ', runnerInsertQuery);
					const RunnerInsert = await pool.request()
						.query(runnerInsertQuery);
				}

				return resultdb(CONSTANTS.SUCCESS, matchInsert.recordsets);
			} else {
				let matchStatus = matchDetailRedis[0].status;
				let matchId = matchDetailRedis[0].matchId;

				if (matchStatus === 'CLOSED') {
					let matchDeclearQuery = "update cassino_matches set card_data='" + JSON.stringify(matchDetailRedis) + "' is_completed='Y' where match_id=" + matchId + "";
					const declearResult = await pool.request()
						.query(matchDeclearQuery);
				}
				return resultdb(CONSTANTS.SUCCESS, CONSTANTS.BLANK_ARRAY);
				/* let matchDeclearQuery="update cassino_matches set is_completed='Y' where match_id !="+matchId+" AND sport_id="+sportNewID+"";		
					await pool.request().query(matchDeclearQuery);
				return resultdb(CONSTANTS.SUCCESS, CONSTANTS.BLANK_ARRAY);	 */
			}


		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

/*Save Casino Matches */

let saveCasinoUpMatkaMatches = async (sportsID) => {
	const pool = await poolPromise;
	try {
		let sportNewID = sportsID;
		let sprtsarray = [];
		sprtsarray.push(sportsID);
		let oddsData = await exchangeService.getCasinoOddsByMarketIds(sprtsarray);

		let matchDetailRedis = oddsData.data;

		if (matchDetailRedis === null) {
			return resultdb(CONSTANTS.SUCCESS, CONSTANTS.BLANK_ARRAY);
		} else {

			let startDate = Math.round(new Date(matchDetailRedis[0].createdAt).getTime() / 1000);

			let matchExist = "select count(*) as count from cassino_matches with(nolock) where match_id=" + matchDetailRedis[0].matchId + " AND is_completed='N' AND series_id=" + sportNewID + "" + CONSTANTS.BETFAIR_SPORT_CASINO + "";
			const resFromDBr = await pool.request()
				.query(matchExist);

			let matchCount = resFromDBr.recordset[0].count;
			let runnerCound = matchDetailRedis[0].marketRunner.length;

			let matchStatus = matchDetailRedis[0].status;
			let matchId = matchDetailRedis[0].matchId;
			let marketId = matchDetailRedis[0].roundId;

			let matchoddsRunner = matchDetailRedis[0].marketRunner;

			if (matchStatus == 'CLOSED') {
				let resultQuery = "SELECT TOP 1 spt.sport_id,spt.name as sportName,mrkt.name,mtch.name as matchName,mrkt.series_id,mtch.match_id,mrkt.market_id FROM cassino_markets as mrkt with(nolock) JOIN sports as spt with(nolock) ON spt.sport_id=mrkt.sport_id JOIN cassino_matches as mtch with(nolock) ON mtch.match_id=mrkt.match_id AND mtch.sport_id=spt.sport_id WHERE mrkt.market_id='" + marketId + "' AND mrkt.card_data IS NULL";
				const autoResult = await pool.request().query(resultQuery);
				if (autoResult.recordset === null || autoResult.recordset.length == 0) {
					//console.log('66666666666666666666666');
					return resultdb(CONSTANTS.SUCCESS, CONSTANTS.BLANK_ARRAY);
				} else {
					console.log('avinash 1212121212');
					let matchDeclearQuery = "update cassino_matches set score_board_json='[" + JSON.stringify(matchDetailRedis[0]) + "]' where match_id=" + matchId + " and sport_id=" + sportNewID + "";
					const declearResult = await pool.request()
						.query(matchDeclearQuery);

					let markeQueryUPdate = "update cassino_markets set card_data='[" + JSON.stringify(matchDetailRedis[0]) + "]' where match_id=" + matchId + " and market_id='" + marketId + "' AND sport_id=" + sportNewID + "";
					await pool.request().query(markeQueryUPdate);

					let sportID = autoResult.recordset[0].sport_id;
					let sportName = autoResult.recordset[0].sportName;
					let matchName = autoResult.recordset[0].matchName;
					let marketName = autoResult.recordset[0].name;
					let seriesID = autoResult.recordset[0].series_id;
					let MatchId = autoResult.recordset[0].match_id;
					let rMarketID = autoResult.recordset[0].market_id;

					let selectionID = '';
					let selectionName = '';
					let removedselectionID = '';
					let removedselectionName = '';
					for (let s in matchoddsRunner) {
						let oddsRunner = matchoddsRunner[s];
						let selectionStatus = oddsRunner.status;
						if (selectionStatus == 'WINNER') {
							selectionID = oddsRunner.id;
							selectionName = oddsRunner.name;
						}
						/* if(selectionStatus=='REMOVED'){
							removedselectionID = oddsRunner.id;
							removedselectionName = oddsRunner.name;
						} */
					}
					let pSuperAdminCommissionType = 0;
					let pIsRollback = 0;
					if (selectionID === null || selectionID == '') {
						const abandoned = await pool.request()
							.input('pMatchID', sql.BigInt, MatchId)
							.input('pMarketID', sql.VarChar(50), rMarketID)
							.input('pIsRollback', sql.VarChar(50), pIsRollback)
							.input('pMarketNM', sql.VarChar(50), marketName)
							.input('pSeriesID', sql.Int, seriesID)
							.execute('SP_SET_ABANDONED_CASINO_MARKETS');

						return resultdb(CONSTANTS.SUCCESS, CONSTANTS.BLANK_ARRAY);

					} else {
						console.log('avinash result decalar');
						const result = await pool.request()
							.input('pSportsID', sql.VarChar(50), sportID)
							.input('pMatchID', sql.BigInt, MatchId)
							.input('pMarketID', sql.VarChar(50), rMarketID)
							.input('pSelectionID', sql.VarChar(50), selectionID)
							.input('pSportsNM', sql.VarChar(50), sportName)
							.input('pMatchNM', sql.VarChar(50), matchName)
							.input('pMarketNM', sql.VarChar(50), marketName)
							.input('pSelectionNM', sql.VarChar(50), selectionName)
							.input('pSuperAdminCommissionType', sql.Int, pSuperAdminCommissionType)
							.input('pSeriesID', sql.Int, seriesID)
							.execute('SP_SET_RESULT_CASINO_MARKETS');

						return resultdb(CONSTANTS.SUCCESS, CONSTANTS.BLANK_ARRAY);
					}

				}
			}



			if (matchCount === 0) {
				try {

					console.log('redis data', matchDetailRedis);

					/* let matchDeclearQuery="update cassino_matches set is_completed='Y' where match_id !="+matchDetailRedis[0].roundId+" AND sport_id="+sportNewID+"";		
					await pool.request().query(matchDeclearQuery); */

					let query = "insert into cassino_matches (series_id,match_id,name,match_date,start_date,sport_id,is_completed, winner_name,score_key,cassino_match_type,is_bet_allow,score_board_json) values(" + sportNewID + "" + CONSTANTS.BETFAIR_SPORT_CASINO + "," + matchDetailRedis[0].matchId + ",'" + matchDetailRedis[0].matchName + "'," + startDate + "," + startDate + ",'" + sportNewID + "','N',NULL, NULL,0,'Y','[]')";
					console.log('match query ', query);
					const matchInsert = await pool.request().query(query);

					/*  let marketCheckExist = "select count(*) as Mcount from cassino_markets with(nolock) where match_id="+matchDetailRedis[0].roundId+" AND  market_id="+matchDetailRedis[0].roundId+"";
					const marketExist =  await pool.request()		
					.query(marketCheckExist);
					let MarketCount = marketExist.recordset[0].Mcount;
					  */
					// if(MarketCount===0){

					let marketInsertQuery = "insert into cassino_markets (series_id,match_id,market_id,name,sport_id,market_runner_count,max_bet_liability,max_market_liability,max_market_profit, min_stack,max_stack,is_bet_allow,bet_allow_time_before,isbetalowaftermatchodds,display_name,match_date,status) values(" + sportNewID + "" + CONSTANTS.BETFAIR_SPORT_CASINO + "," + matchDetailRedis[0].matchId + "," + matchDetailRedis[0].roundId + ",'Match Odds','" + sportNewID + "'," + runnerCound + ",0,0,0,0,0,'Y',0,'N','" + matchDetailRedis[0].marketHeader + "'," + startDate + ",'Y')";
					console.log('market query ', marketInsertQuery);
					console.log('redis data marktRunner', matchDetailRedis[0].marketRunner);
					const marketInsert = await pool.request().query(marketInsertQuery);
					//} 
					console.log('marketInsert', marketInsert);
					//for(let j in matchDetailRedis){


					let marktRunner = matchDetailRedis[0].marketRunner;
					let marketId = matchDetailRedis[0].roundId;
					let matchId = matchDetailRedis[0].matchId;
					for (let k in marktRunner) {
						let runnerJs = marktRunner[k];
						let runnerInsertQuery = "insert into cassino_market_selections (match_id,market_id,selection_id,name,sort_priority) values(" + matchId + "," + marketId + "," + runnerJs.id + ",'" + runnerJs.name + "'," + runnerJs.sortPriority + ")";
						console.log('selection query ', runnerInsertQuery);
						const RunnerInsert = await pool.request().query(runnerInsertQuery);
					}
					//	} 
					return resultdb(CONSTANTS.SUCCESS, matchInsert.recordsets);
				} catch (error) {
					console.log('error save match', error);
					return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
				}
			} else {
				let matchStatus = matchDetailRedis[0].status;
				let marketID = matchDetailRedis[0].roundId;
				let matchId = matchDetailRedis[0].matchId;
				console.log('avinash', matchDetailRedis);
				let matchDeclearQuery = "update cassino_markets set runner_json='[" + JSON.stringify(matchDetailRedis[0]) + "]' where match_id =" + matchId + " AND market_id=" + marketID + "";
				await pool.request().query(matchDeclearQuery)


				if (matchStatus === 'CLOSED') {
					console.log('closed market');
					let matchDeclearQuery = "update cassino_matches set score_board_json='[" + JSON.stringify(matchDetailRedis[0]) + "]'  where match_id=" + matchId + "";
					const declearResult = await pool.request()
						.query(matchDeclearQuery);
				}
				return resultdb(CONSTANTS.SUCCESS, CONSTANTS.BLANK_ARRAY);
				/* let matchDeclearQuery="update cassino_matches set is_completed='Y' where match_id !="+matchId+" AND sport_id="+sportNewID+"";		
					await pool.request().query(matchDeclearQuery);
				return resultdb(CONSTANTS.SUCCESS, CONSTANTS.BLANK_ARRAY);	 */
			}


		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


/*Clear Login Data */

let clearUserLogsData = async () => {
	const pool = await poolPromise;
	try {
		let lastOneMonth = new Date();
		lastOneMonth.setMonth(lastOneMonth.getMonth() - 1);
		console.log(lastOneMonth);

		let deleteOneMonth = Math.round(new Date(lastOneMonth).getTime() / 1000);
		console.log(deleteOneMonth);

		let userRemainingBalance = "DELETE from user_remaining_balances with(nolock) where created_at <= " + deleteOneMonth + "";
		await pool.request().query(userRemainingBalance);
		let userLoginLogs = "DELETE from user_login_logs with(nolock) where created_at <= " + deleteOneMonth + "";
		await pool.request().query(userLoginLogs);

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.BLANK_ARRAY);

	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

/*Clear Login Data */

let casinoResultRecord = async (data) => {
	const pool = await poolPromise;
	try {
		let dbSportID = data.db_sport_id;
		let sportID = data.sport_id;

		let currentdate = globalFunction.currentDateTimeStamp();
		let response = await axios.get(settings.GET_CASINO_LAST_RESULT_URL + "" + sportID);

		let lastTenResult = response.data.result;
		//console.log(lastTenResult); 
		for (let i in lastTenResult) {
			let matchID = lastTenResult[i].marketId.roundId;
			let winnerName = lastTenResult[i].rName;
			let winnerDesc = lastTenResult[i].runnerName;

			let matchResultExit = "SELECT count(*) as resultCount FROM cassino_market_results with(nolock) where match_id=" + matchID + " AND market_id=" + matchID + "";
			const declearResult = await pool.request().query(matchResultExit);
			if (declearResult.recordset[0].resultCount <= 0) {
				let matchResultInsert = "INSERT INTO cassino_market_results ( sport_id, match_id,market_id,winner_name,winner_desc,card_data,created_at,updated_at) VALUES (" + dbSportID + "," + matchID + "," + matchID + ",'" + winnerName + "','" + winnerDesc + "','" + JSON.stringify(lastTenResult[i].marketId) + "'," + currentdate + "," + currentdate + ")";
				console.log(matchResultInsert);
				await pool.request().query(matchResultInsert);
			}

		}

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.BLANK_ARRAY);

	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let setResultBySportId = async (sport_id) => {
	const pool = await poolPromise;
	try {
		let resultQuery = "SELECT TOP 500 spt.sport_id,spt.name as sportName,mrkt.name,mtch.name as matchName,mrkt.series_id,mtch.match_id,mrkt.market_id FROM cassino_markets as mrkt with(nolock) JOIN sports as spt with(nolock) ON spt.sport_id=mrkt.sport_id JOIN cassino_matches as mtch with(nolock) ON mtch.match_id=mrkt.match_id AND mtch.sport_id=spt.sport_id WHERE mrkt.sport_id='" + sport_id + "' AND mtch.is_completed='N'";

		const autoResult = await pool.request().query(resultQuery);
		let result = autoResult.recordset;
		for (let i in result) {
			let activeMatches = result[i];
			let marketName = activeMatches.name;
			let seriesID = activeMatches.series_id;
			let MatchId = activeMatches.match_id;
			let rMarketID = activeMatches.market_id;
			let pIsRollback = 0;
			const abandoned = await pool.request()
				.input('pMatchID', sql.VarChar(50), MatchId)
				.input('pMarketID', sql.VarChar(50), rMarketID)
				.input('pIsRollback', sql.VarChar(50), pIsRollback)
				.input('pMarketNM', sql.VarChar(50), marketName)
				.input('pSeriesID', sql.Int, seriesID)
				.execute('SP_SET_ABANDONED_CASINO_MARKETS');
		}
		return resultdb(CONSTANTS.SUCCESS, autoResult.recordset);

	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
/* Save Casino match by curl */

let addcasinomatchbycurl = async (sportId, data) => {

	try {
		const pool = await poolPromise;
		let sportNewID = sportId;
		let matchDetailRedis = data.result;

		let startDate = Math.round(new Date(matchDetailRedis[0].createdAt).getTime() / 1000);

		let matchExist = "select count(*) as count from cassino_matches with(nolock) where match_id=" + matchDetailRedis[0].matchId + "  AND series_id=" + sportNewID + "" + CONSTANTS.BETFAIR_SPORT_CASINO + "";
		const resFromDBr = await pool.request().query(matchExist);

		let matchCount = resFromDBr.recordset[0].count;
		let runnerCound = matchDetailRedis[0].marketRunner.length;

		let matchStatus = matchDetailRedis[0].status;
		let matchId = matchDetailRedis[0].matchId;
		let marketId = matchDetailRedis[0].roundId;

		let matchoddsRunner = matchDetailRedis[0].marketRunner;

		if (matchStatus == 'CLOSED') {

			let resultQuery = "SELECT TOP 1 spt.sport_id,spt.name as sportName,mrkt.name,mtch.name as matchName,mrkt.series_id,mtch.match_id,mrkt.market_id FROM cassino_markets as mrkt with(nolock) JOIN sports as spt with(nolock) ON spt.sport_id=mrkt.sport_id JOIN cassino_matches as mtch with(nolock) ON mtch.match_id=mrkt.match_id AND mtch.sport_id=spt.sport_id WHERE mrkt.market_id='" + marketId + "' AND mrkt.card_data IS NULL";
			const autoResult = await pool.request().query(resultQuery);
			if (autoResult.recordset === null || autoResult.recordset.length == 0) {

				return resultdb(CONSTANTS.MATCH_NOT_ADDED_DECLEAR, CONSTANTS.BLANK_ARRAY);
			} else {

				let matchDeclearQuery = "update cassino_matches set score_board_json='" + JSON.stringify(matchDetailRedis) + "' where match_id=" + matchId + " and sport_id=" + sportNewID + "";
				const declearResult = await pool.request()
					.query(matchDeclearQuery);

				let markeQueryUPdate = "update cassino_markets set card_data='" + JSON.stringify(matchDetailRedis) + "' where match_id=" + matchId + " and market_id='" + marketId + "' AND sport_id=" + sportNewID + "";
				await pool.request().query(markeQueryUPdate);

				let sportID = autoResult.recordset[0].sport_id;
				let sportName = autoResult.recordset[0].sportName;
				let matchName = autoResult.recordset[0].matchName;
				let marketName = autoResult.recordset[0].name;
				let seriesID = autoResult.recordset[0].series_id;
				let MatchId = autoResult.recordset[0].match_id;
				let rMarketID = autoResult.recordset[0].market_id;

				let selectionID = '';
				let selectionName = '';
				for (let s in matchoddsRunner) {
					let oddsRunner = matchoddsRunner[s];
					let selectionStatus = oddsRunner.status;
					if (selectionStatus == 'WINNER') {
						selectionID = oddsRunner.id;
						selectionName = oddsRunner.name;
					}

				}
				let pSuperAdminCommissionType = 0;
				let pIsRollback = 0;
				if (selectionID === null || selectionID == '') {
					const abandoned = await pool.request()
						.input('pMatchID', sql.BigInt, MatchId)
						.input('pMarketID', sql.VarChar(50), rMarketID)
						.input('pIsRollback', sql.VarChar(50), pIsRollback)
						.input('pMarketNM', sql.VarChar(50), marketName)
						.input('pSeriesID', sql.Int, seriesID)
						.execute('SP_SET_ABANDONED_CASINO_MARKETS');

					return resultdb(CONSTANTS.MATCH_ABANDONED, CONSTANTS.BLANK_ARRAY);

				} else {
					//console.log('avinash result decalar');			
					const result = await pool.request()
						.input('pSportsID', sql.VarChar(50), sportID)
						.input('pMatchID', sql.BigInt, MatchId)
						.input('pMarketID', sql.VarChar(50), rMarketID)
						.input('pSelectionID', sql.VarChar(50), selectionID)
						.input('pSportsNM', sql.VarChar(50), sportName)
						.input('pMatchNM', sql.VarChar(50), matchName)
						.input('pMarketNM', sql.VarChar(50), marketName)
						.input('pSelectionNM', sql.VarChar(50), selectionName)
						.input('pSuperAdminCommissionType', sql.Int, pSuperAdminCommissionType)
						.input('pSeriesID', sql.Int, seriesID)
						.execute('SP_SET_RESULT_CASINO_MARKETS');

					return resultdb(CONSTANTS.MATCH_DECLEAR, CONSTANTS.BLANK_ARRAY);
				}

			}
		}

		if (matchCount === 0) {

			await pool.request()
				.input('sport_id', sql.Int, sportNewID)
				.query("update cassino_markets set is_sports_active='N' where is_sports_active='Y' and sport_id=@sport_id");

			let query = "insert into cassino_matches (series_id,match_id,name,match_date,start_date,sport_id,is_completed, winner_name,score_key,cassino_match_type,is_bet_allow,score_board_json) values(" + sportNewID + "" + CONSTANTS.BETFAIR_SPORT_CASINO + "," + matchDetailRedis[0].matchId + ",'" + matchDetailRedis[0].matchName + "'," + startDate + "," + startDate + ",'" + sportNewID + "','N',NULL, NULL,0,'Y','[]')";
			const matchInsert = await pool.request().query(query);

			let runner_json = JSON.stringify(matchDetailRedis);
			let seriesId = sportNewID + CONSTANTS.BETFAIR_SPORT_CASINO;
			let marketName = 'Match Odds';
			let zeroValue = 0;
			let is_bet_allow = 'Y';
			let is_sports_active = 'Y';
			let isbetalowaftermatchodds = 'N';

			

			const marketInsert = await pool.request()
				.input('seriesId', sql.Int, seriesId)
				.input('matchId', sql.BigInt, matchDetailRedis[0].matchId)
				.input('marketId', sql.VarChar(150), matchDetailRedis[0].roundId)
				.input('marketName', sql.VarChar(150), marketName)
				.input('runner_json', sql.Text, runner_json)
				.input('sport_id', sql.Int, sportNewID)
				.input('runnerCound', sql.Int, runnerCound)
				.input('max_bet_liability', sql.Int, zeroValue)
				.input('max_market_liability', sql.Int, zeroValue)
				.input('max_market_profit', sql.Int, zeroValue)
				.input('min_stack', sql.Int, zeroValue)
				.input('max_stack', sql.Int, zeroValue)
				.input('is_bet_allow', sql.VarChar(50), is_bet_allow)
				.input('is_sports_active', sql.VarChar(50), is_sports_active)
				.input('bet_allow_time_before', sql.Int, zeroValue)
				.input('isbetalowaftermatchodds', sql.VarChar(50), isbetalowaftermatchodds)
				.input('display_name', sql.VarChar(150), matchDetailRedis[0].marketHeader)
				.input('match_date', sql.BigInt, startDate)
				.input('status', sql.VarChar(50), is_bet_allow)
				.query("insert into cassino_markets (series_id,match_id,market_id,name,runner_json,sport_id,market_runner_count,max_bet_liability,max_market_liability,max_market_profit, min_stack,max_stack,is_bet_allow,is_sports_active,bet_allow_time_before,isbetalowaftermatchodds,display_name,match_date,status) values(@seriesId,@matchId,@marketId,@marketName,@runner_json,@sport_id,@runnerCound,@max_bet_liability,@max_market_liability,@max_market_profit,@min_stack,@max_stack,@is_bet_allow,@is_sports_active,@bet_allow_time_before,@isbetalowaftermatchodds,@display_name,@match_date,@status)");

			let marktRunner = matchDetailRedis[0].marketRunner;
			let marketId = matchDetailRedis[0].roundId;

			let matchId = matchDetailRedis[0].matchId;

			for (let k in marktRunner) {
				let runnerJs = marktRunner[k];
				let runnerInsertQuery = "insert into cassino_market_selections (match_id,market_id,selection_id,name,sort_priority) values(" + matchId + ",'" + marketId + "'," + runnerJs.id + ",'" + runnerJs.name + "'," + runnerJs.sortPriority + ")";
				//console.log('selection query ', runnerInsertQuery);
				const RunnerInsert = await pool.request()
					.query(runnerInsertQuery);
			}


			return resultdb(CONSTANTS.SUCCESS, matchInsert.recordsets);
		} else {

			if (matchStatus === 'CLOSED') {
				let matchStatus = matchDetailRedis[0].status;
				let matchId = matchDetailRedis[0].matchId;
				let matchDeclearQuery = "update cassino_matches set card_data='" + JSON.stringify(matchDetailRedis) + "' is_completed='Y' where match_id=" + matchId + "";
				const declearResult = await pool.request()
					.query(matchDeclearQuery);
			}
			return resultdb(CONSTANTS.ALREADY_EXISTS, CONSTANTS.BLANK_ARRAY);
		}
	} catch (error) {
		console.log('log error ', error);
		return resultdb(CONSTANTS.SERVER_ERROR, error);
	}
};

/*
** Add Casion Ander Bhar Match
*/

let addcasinoMatchAnderBhar = async (sportId, data) => {

	try {
		const pool = await poolPromise;
		let sportNewID = sportId;
		let matchDetailRedis = data.result;

		let startDate = Math.round(new Date(matchDetailRedis[0].createdAt).getTime() / 1000);

		let matchExist = "select count(*) as count from cassino_matches with(nolock) where match_id=" + matchDetailRedis[0].matchId + "  AND series_id=" + sportNewID + "" + CONSTANTS.BETFAIR_SPORT_CASINO + "";

		const resFromDBr = await pool.request().query(matchExist);
		let matchCount = resFromDBr.recordset[0].count;

		let matchStatus = matchDetailRedis[0].status;
		if (matchStatus == 'CLOSED') {

			let baharFirstCard = matchDetailRedis[0].baharFirstCard;

			if (baharFirstCard != null) {

				let profit25SelectionId = matchDetailRedis[0].baharFirstCard.sid;
				let profit25marketId = matchDetailRedis[0].baharFirstCard.marketid;

				let update25ProfitQuery = "update cassino_bets_odds set p_l = (p_l*25/100) where market_id='" + profit25marketId + "' and selection_id=" + profit25SelectionId + "";
				await pool.request().query(update25ProfitQuery);

				let updateOddPL = "update odds_profit_loss set is_first_card ='Y' where market_id='" + profit25marketId + "' and selection_id=" + profit25SelectionId + "";
				await pool.request().query(updateOddPL);

			}


			for (let i in matchDetailRedis) {

				let matchId = matchDetailRedis[i].matchId;
				let marketId = matchDetailRedis[i].roundId;

				let resultQuery = "SELECT TOP 1 spt.sport_id,spt.name as sportName,mrkt.name,mtch.name as matchName,mrkt.series_id,mtch.match_id,mrkt.market_id FROM cassino_markets as mrkt with(nolock) JOIN sports as spt with(nolock) ON spt.sport_id=mrkt.sport_id JOIN cassino_matches as mtch with(nolock) ON mtch.match_id=mrkt.match_id AND mtch.sport_id=spt.sport_id WHERE mrkt.market_id='" + marketId + "' AND mrkt.card_data IS NULL";
				const autoResult = await pool.request().query(resultQuery);

				if (autoResult.recordset === null || autoResult.recordset.length == 0) {
					console.log(resultQuery);
					console.log('andar  bahar market not found in database');
					return resultdb(CONSTANTS.MATCH_NOT_ADDED_DECLEAR, CONSTANTS.BLANK_ARRAY);
				} else {

					let matchDeclearQuery = "update cassino_matches set score_board_json='" + JSON.stringify([matchDetailRedis[i]]) + "' where match_id=" + matchId + " and sport_id=" + sportNewID + "";
					await pool.request().query(matchDeclearQuery);

					let markeQueryUPdate = "update cassino_markets set is_sports_active='N', card_data='" + JSON.stringify([matchDetailRedis[i]]) + "' where match_id=" + matchId + " and market_id='" + marketId + "' AND sport_id=" + sportNewID + "";
					await pool.request().query(markeQueryUPdate);

					let sportID = autoResult.recordset[0].sport_id;
					let sportName = autoResult.recordset[0].sportName;
					let matchName = autoResult.recordset[0].matchName;
					let marketName = autoResult.recordset[0].name;
					let seriesID = autoResult.recordset[0].series_id;
					let MatchId = autoResult.recordset[0].match_id;
					let rMarketID = autoResult.recordset[0].market_id;

					let selectionID = '';
					let selectionName = '';
					let matchoddsRunner = matchDetailRedis[i].marketRunner;
					for (let s in matchoddsRunner) {
						let oddsRunner = matchoddsRunner[s];
						let selectionStatus = oddsRunner.status;
						if (selectionStatus == 'WINNER') {
							selectionID = oddsRunner.id;
							selectionName = oddsRunner.name;
						}

					}

					let pSuperAdminCommissionType = 0;
					let pIsRollback = 0;
					if (selectionID === null || selectionID == '') {
						const abandoned = await pool.request()
							.input('pMatchID', sql.BigInt, MatchId)
							.input('pMarketID', sql.VarChar(50), rMarketID)
							.input('pIsRollback', sql.VarChar(50), pIsRollback)
							.input('pMarketNM', sql.VarChar(50), marketName)
							.input('pSeriesID', sql.Int, seriesID)
							.execute('SP_SET_ABANDONED_CASINO_MARKETS');
					} else {

						const result = await pool.request()
							.input('pSportsID', sql.VarChar(50), sportID)
							.input('pMatchID', sql.BigInt, MatchId)
							.input('pMarketID', sql.VarChar(50), rMarketID)
							.input('pSelectionID', sql.VarChar(50), selectionID)
							.input('pSportsNM', sql.VarChar(50), sportName)
							.input('pMatchNM', sql.VarChar(50), matchName)
							.input('pMarketNM', sql.VarChar(50), marketName)
							.input('pSelectionNM', sql.VarChar(50), selectionName)
							.input('pSuperAdminCommissionType', sql.Int, pSuperAdminCommissionType)
							.input('pSeriesID', sql.Int, seriesID)
							.execute('SP_SET_RESULT_CASINO_MARKETS');
					}
				}
			}
		}

		if (matchCount === 0) {

			let query = "insert into cassino_matches (series_id,match_id,name,match_date,start_date,sport_id,is_completed, winner_name,score_key,cassino_match_type,is_bet_allow,score_board_json) values(" + sportNewID + "" + CONSTANTS.BETFAIR_SPORT_CASINO + "," + matchDetailRedis[0].matchId + ",'" + matchDetailRedis[0].matchName + "'," + startDate + "," + startDate + ",'" + sportNewID + "','N',NULL, NULL,0,'Y','[]')";
			await pool.request().query(query);


			for (let i in matchDetailRedis) {

				let runnerCound = matchDetailRedis[i].marketRunner.length;
				let matchStatus = matchDetailRedis[i].status;
				let matchId = matchDetailRedis[i].matchId;
				let marketId = matchDetailRedis[i].roundId;
				let matchName = matchDetailRedis[i].matchName;

				let runner_json = JSON.stringify([matchDetailRedis[i]]);
				let seriesId = sportNewID + "" + CONSTANTS.BETFAIR_SPORT_CASINO;

				let zeroValue = 0;
				let is_bet_allow = 'Y';
				let is_sports_active = 'Y';
				let isbetalowaftermatchodds = 'N';

				await pool.request()
					.input('sport_id', sql.Int, sportNewID)
					.query("update cassino_markets set is_sports_active='N' where is_sports_active='Y' and sport_id=@sport_id");

				if (matchStatus != 'CLOSED') {

					await pool.request()
						.input('seriesId', sql.Int, seriesId)
						.input('matchId', sql.BigInt, matchId)
						.input('marketId', sql.VarChar(150), marketId)
						.input('marketName', sql.VarChar(150), matchDetailRedis[i].marketHeader)
						.input('runner_json', sql.Text, runner_json)
						.input('sport_id', sql.Int, sportNewID)
						.input('runnerCound', sql.Int, runnerCound)
						.input('max_bet_liability', sql.Int, zeroValue)
						.input('max_market_liability', sql.Int, zeroValue)
						.input('max_market_profit', sql.Int, zeroValue)
						.input('min_stack', sql.Int, zeroValue)
						.input('max_stack', sql.Int, zeroValue)
						.input('is_bet_allow', sql.VarChar(50), is_bet_allow)
						.input('is_sports_active', sql.VarChar(50), is_sports_active)
						.input('bet_allow_time_before', sql.Int, zeroValue)
						.input('isbetalowaftermatchodds', sql.VarChar(50), isbetalowaftermatchodds)
						.input('display_name', sql.VarChar(150), matchDetailRedis[i].marketHeader)
						.input('match_date', sql.BigInt, startDate)
						.input('status', sql.VarChar(50), is_bet_allow)
						.query("insert into cassino_markets (series_id,match_id,market_id,name,runner_json,sport_id,market_runner_count,max_bet_liability,max_market_liability,max_market_profit, min_stack,max_stack,is_bet_allow,is_sports_active,bet_allow_time_before,isbetalowaftermatchodds,display_name,match_date,status) values(@seriesId,@matchId,@marketId,@marketName,@runner_json,@sport_id,@runnerCound,@max_bet_liability,@max_market_liability,@max_market_profit,@min_stack,@max_stack,@is_bet_allow,@is_sports_active, @bet_allow_time_before,@isbetalowaftermatchodds,@display_name,@match_date,@status)");

					let marktRunner = matchDetailRedis[i].marketRunner;

					for (let k in marktRunner) {
						let runnerJs = marktRunner[k];
						let runnerInsertQuery = "insert into cassino_market_selections (match_id,market_id,selection_id,name,sort_priority) values(" + matchId + ",'" + marketId + "'," + runnerJs.id + ",'" + runnerJs.name + "'," + runnerJs.sortPriority + ")";
						await pool.request().query(runnerInsertQuery);
					}
				}
			}
		}
		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);
	} catch (error) {
		console.log('log error avinash', error);
		return resultdb(CONSTANTS.SERVER_ERROR, error);
	}
};

/*
** Add Casion Worli Matka
*/

let addcasinoMatchWorliMatka = async (sportId, data) => {

	try {
		const pool = await poolPromise;
		let sportNewID = sportId;
		let matchDetailRedis = data.result;

		let startDate = Math.round(new Date(matchDetailRedis[0].createdAt).getTime() / 1000);

		let matchExist = "select count(*) as count from cassino_matches with(nolock) where match_id=" + matchDetailRedis[0].matchId + "  AND series_id=" + sportNewID + "" + CONSTANTS.BETFAIR_SPORT_CASINO + "";

		const resFromDBr = await pool.request().query(matchExist);
		let matchCount = resFromDBr.recordset[0].count;

		let matchStatus = matchDetailRedis[0].status;
		if (matchStatus == 'CLOSED') {

			for (let i in matchDetailRedis) {

				let matchId = matchDetailRedis[i].matchId;
				let marketId = matchDetailRedis[i].roundId;

				let resultQuery = "SELECT TOP 1 spt.sport_id,spt.name as sportName,mrkt.name,mtch.name as matchName,mrkt.series_id,mtch.match_id,mrkt.market_id FROM cassino_markets as mrkt with(nolock) JOIN sports as spt with(nolock) ON spt.sport_id=mrkt.sport_id JOIN cassino_matches as mtch with(nolock) ON mtch.match_id=mrkt.match_id AND mtch.sport_id=spt.sport_id WHERE mrkt.market_id='" + marketId + "' AND mrkt.card_data IS NULL";
				const autoResult = await pool.request().query(resultQuery);

				if (autoResult.recordset === null || autoResult.recordset.length == 0) {
					console.log(resultQuery);
					console.log('worli matka market not found in database');
					return resultdb(CONSTANTS.MATCH_NOT_ADDED_DECLEAR, CONSTANTS.BLANK_ARRAY);
				} else {

					let matchDeclearQuery = "update cassino_matches set score_board_json='" + JSON.stringify([matchDetailRedis[i]]) + "' where match_id=" + matchId + " and sport_id=" + sportNewID + "";
					await pool.request().query(matchDeclearQuery);

					let markeQueryUPdate = "update cassino_markets set is_sports_active='N', card_data='" + JSON.stringify([matchDetailRedis[i]]) + "' where match_id=" + matchId + " and market_id='" + marketId + "' AND sport_id=" + sportNewID + "";
					await pool.request().query(markeQueryUPdate);

					let sportID = autoResult.recordset[0].sport_id;
					let sportName = autoResult.recordset[0].sportName;
					let matchName = autoResult.recordset[0].matchName;
					let marketName = autoResult.recordset[0].name;
					let seriesID = autoResult.recordset[0].series_id;
					let MatchId = autoResult.recordset[0].match_id;
					let rMarketID = autoResult.recordset[0].market_id;

					let selectionID = '';
					let selectionName = '';
					let matchoddsRunner = matchDetailRedis[i].marketRunner;
					for (let s in matchoddsRunner) {
						let oddsRunner = matchoddsRunner[s];
						let selectionStatus = oddsRunner.status;
						if (selectionStatus == 'WINNER') {
							selectionID = oddsRunner.id;
							selectionName = oddsRunner.name;
						}
					}

					/*let marketType = matchDetailRedis[i].runnerType;
					if (marketType == 'line' || marketType == 'oddeven') {
						let profit25SelectionId = selectionID;
						let profit25marketId = rMarketID;
						let update25ProfitQuery = "update cassino_bets_odds set p_l = CASE WHEN selection_id = "+profit25SelectionId+" THEN (stack*0.8) ELSE stack END where market_id='" + profit25marketId + "' and selection_id=" + profit25SelectionId + "";
						await pool.request().query(update25ProfitQuery);
					/* 	let updateOddPL = "update odds_profit_loss set is_first_card ='Y' where market_id='" + profit25marketId + "' and selection_id=" + profit25SelectionId + "";
						await pool.request().query(updateOddPL); *
					}*/



					let pSuperAdminCommissionType = 0;
					let pIsRollback = 0;
					if (selectionID === null || selectionID == '') {
						const abandoned = await pool.request()
							.input('pMatchID', sql.BigInt, MatchId)
							.input('pMarketID', sql.VarChar(50), rMarketID)
							.input('pIsRollback', sql.VarChar(50), pIsRollback)
							.input('pMarketNM', sql.VarChar(50), marketName)
							.input('pSeriesID', sql.Int, seriesID)
							.execute('SP_SET_ABANDONED_CASINO_MARKETS');
					} else {

						const result = await pool.request()
							.input('pSportsID', sql.VarChar(50), sportID)
							.input('pMatchID', sql.BigInt, MatchId)
							.input('pMarketID', sql.VarChar(50), rMarketID)
							.input('pSelectionID', sql.VarChar(50), selectionID)
							.input('pSportsNM', sql.VarChar(50), sportName)
							.input('pMatchNM', sql.VarChar(50), matchName)
							.input('pMarketNM', sql.VarChar(50), marketName)
							.input('pSelectionNM', sql.VarChar(50), selectionName)
							.input('pSuperAdminCommissionType', sql.Int, pSuperAdminCommissionType)
							.input('pSeriesID', sql.Int, seriesID)
							.execute('SP_SET_RESULT_CASINO_MARKETS');
					}
				}
			}
		}

		if (matchCount === 0) {

			let query = "insert into cassino_matches (series_id,match_id,name,match_date,start_date,sport_id,is_completed, winner_name,score_key,cassino_match_type,is_bet_allow,score_board_json) values(" + sportNewID + "" + CONSTANTS.BETFAIR_SPORT_CASINO + "," + matchDetailRedis[0].matchId + ",'" + matchDetailRedis[0].matchName + "'," + startDate + "," + startDate + ",'" + sportNewID + "','N',NULL, NULL,0,'Y','[]')";
			await pool.request().query(query);


			for (let i in matchDetailRedis) {

				let runnerCound = matchDetailRedis[i].marketRunner.length;
				let matchStatus = matchDetailRedis[i].status;
				let matchId = matchDetailRedis[i].matchId;
				let marketId = matchDetailRedis[i].roundId;
				let matchName = matchDetailRedis[i].matchName;

				let runner_json = JSON.stringify([matchDetailRedis[i]]);
				let seriesId = sportNewID + "" + CONSTANTS.BETFAIR_SPORT_CASINO;

				let zeroValue = 0;
				let is_bet_allow = 'Y';
				let is_sports_active = 'Y';
				let isbetalowaftermatchodds = 'N';

				await pool.request()
					.input('sport_id', sql.Int, sportNewID)
					.query("update cassino_markets set is_sports_active='N' where is_sports_active='Y' and sport_id=@sport_id AND match_id != "+matchDetailRedis[0].matchId);

				if (matchStatus != 'CLOSED') {

					await pool.request()
						.input('seriesId', sql.Int, seriesId)
						.input('matchId', sql.BigInt, matchId)
						.input('marketId', sql.VarChar(150), marketId)
						.input('marketName', sql.VarChar(150), matchDetailRedis[i].marketHeader)
						.input('runner_json', sql.Text, runner_json)
						.input('sport_id', sql.Int, sportNewID)
						.input('runnerCound', sql.Int, runnerCound)
						.input('max_bet_liability', sql.Int, zeroValue)
						.input('max_market_liability', sql.Int, zeroValue)
						.input('max_market_profit', sql.Int, zeroValue)
						.input('min_stack', sql.Int, zeroValue)
						.input('max_stack', sql.Int, zeroValue)
						.input('is_bet_allow', sql.VarChar(50), is_bet_allow)
						.input('is_sports_active', sql.VarChar(50), is_sports_active)
						.input('bet_allow_time_before', sql.Int, zeroValue)
						.input('isbetalowaftermatchodds', sql.VarChar(50), isbetalowaftermatchodds)
						.input('display_name', sql.VarChar(150), matchDetailRedis[i].marketHeader)
						.input('match_date', sql.BigInt, startDate)
						.input('status', sql.VarChar(50), is_bet_allow)
						.query("insert into cassino_markets (series_id,match_id,market_id,name,runner_json,sport_id,market_runner_count,max_bet_liability,max_market_liability,max_market_profit, min_stack,max_stack,is_bet_allow,is_sports_active,bet_allow_time_before,isbetalowaftermatchodds,display_name,match_date,status) values(@seriesId,@matchId,@marketId,@marketName,@runner_json,@sport_id,@runnerCound,@max_bet_liability,@max_market_liability,@max_market_profit,@min_stack,@max_stack,@is_bet_allow,@is_sports_active, @bet_allow_time_before,@isbetalowaftermatchodds,@display_name,@match_date,@status)");

					let marktRunner = matchDetailRedis[i].marketRunner;

					for (let k in marktRunner) {
						let runnerJs = marktRunner[k];
						let runnerInsertQuery = "insert into cassino_market_selections (match_id,market_id,selection_id,name,sort_priority) values(" + matchId + ",'" + marketId + "'," + runnerJs.id + ",'" + runnerJs.name + "'," + runnerJs.sortPriority + ")";
						await pool.request().query(runnerInsertQuery);
					}
				}
			}
		}
		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);
	} catch (error) {
		console.log('log error avinash', error);
		return resultdb(CONSTANTS.SERVER_ERROR, error);
	}
};



let createFancyPosition = async (user_id, match_id, fancy_id) => {
	try {
		/* let DataOject  = {
			"run": 140,
			"is_back": 0,
			"size":0,
			"stack":0
		}; */
		//console.log('DataOject---',DataOject);

		let fancyList = await getFancyBetForUserPosition(user_id, match_id, fancy_id);
		//console.log('fancyList---',fancyList.data);
		let fancyListData = [];
		if (fancyList.statusCode === CONSTANTS.SUCCESS) {
			fancyListData = fancyList.data;
			// fancyListData.push(DataOject);
		}/* else {
                fancyListData.push(DataOject);
            } */
		fancyListData.sort(function (run1, run2) {
			if (run1.run > run2.run) return 1;
		});
		console.log('fancyList---', fancyListData);
		let run = [];
		let resultValues = [];
		let orgRun = [];
		let lastPosition = 0;
		let max_exposure = 0;
		let max_profit = 0;
		for (let i in fancyListData) {
			let fancy = fancyListData[i];
			run.push(fancy.run - 1);
		}
		run.push(fancyListData[fancyListData.length - 1].run);
		orgRun = run;
		console.log('run 12121---', run);
		console.log('run orgRun 12121---', orgRun);
		run = [...new Set(run)];
		console.log('run  666666---', run);
		run.map(function (r, ind) {
			console.log('r', r);
			let tempTotal = 0;
			fancyListData.map(function (f) {
				console.log('f', f)
				if (f.is_back == 1) {

					if (r < f.run) {

						tempTotal -= f.stack;

					} else {
						tempTotal += f.stack * (f.size / 100);
					}

				} else {
					//console.log("layeeee",f.run);
					if (r >= f.run) {
						tempTotal -= f.stack * (f.size / 100);

					} else {
						tempTotal += f.stack;
					}
				}
			});
			// console.log('run  tempTotal---',tempTotal);
			// console.log('run  lengthd ---',orgRun.length);
			if ((orgRun.length) - 1 == ind) {
				resultValues.push({ "key": lastPosition + '+', "value": tempTotal.toFixed(2) });
			} else {
				if (lastPosition == r) {
					resultValues.push({ "key": lastPosition, "value": tempTotal.toFixed(2) });
				} else {
					resultValues.push({ "key": lastPosition + '-' + r, "value": tempTotal.toFixed(2) });

				}

			}
			// console.log('run  resultValues---',resultValues);
			lastPosition = r + 1;
			if (max_exposure > tempTotal) {
				max_exposure = tempTotal;
			}
			if (max_profit < tempTotal) {
				max_profit = tempTotal;
			}

		});

		let data = { "fancy_position": resultValues, "liability": max_exposure, "profit": max_profit };

		return resultdb(CONSTANTS.SUCCESS, data);

	} catch (e) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};




let getMatchUsers = async (data) => {
	const pool = await poolPromise;
	try {
		const getUserRecord = await pool.request()
			.query("SELECT id,CONCAT(user_name, ' ( ', name,' )') as user_name  FROM users with(nolock) Where role_id=" + CONSTANTS.USER_TYPE_USER + " AND ( user_name LIKE '%" + data.user_name + "%' OR name LIKE '%" + data.user_name + "%')");

		if (getUserRecord.recordsets[0] === null || getUserRecord.recordset[0].length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, getUserRecord.recordsets[0]);
		}

	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getMatchCasinoMarketListAnderBahar = async (data) => {
	try {
		const pool = await poolPromise;
		let conditionMatchid = data.match_id;


		/* let matchNewQuery = "select TOP 1 match_id from cassino_matches with(nolock) where match_id  >=" + data.match_id + " AND sport_id=" + data.sport_id + " ORDER BY id DESC";

		const newRecord = await pool.request().query(matchNewQuery);
		let matchIDNew = newRecord.recordset[0].match_id;
		conditionMatchid = matchIDNew; */


		const result = await pool.request()
			.input('user_id', sql.Int, data.user_id)
			.input('role_id', sql.Int, data.role_id)
			.input('match_id', sql.BigInt, conditionMatchid)
			.query("SELECT  0 as timer, '' as indexCard,'' as indexCard2, (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore, spt.name as SportName,ISNULL(mkts.market_admin_message,'') as adminMessage,'' AS InplayStatus,'' AS MainTV,'' AS graphics,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,(CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt,(CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM cassino_matches as mtch with(nolock) JOIN sports spt with(nolock) ON spt.sport_id=mtch.sport_id  JOIN cassino_markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name='Match Odds' where NOT EXISTS (SELECT 1  from user_deactive_matches with(nolock) WHERE user_deactive_matches.match_id = mtch.match_id AND user_deactive_matches.user_id =@user_id ) AND NOT EXISTS (SELECT 1 from deactive_sports with(nolock) WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id =@user_id ) AND spt.sport_id =mtch.sport_id  AND mtch.match_id=@match_id  AND mtch.status='Y' AND spt.status='Y'")

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
			matchMarkets[0].MainTV = matinTv.data;


			return resultdb(CONSTANTS.SUCCESS, matchMarkets[0]);

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getMatchCasinoliveMarketListAnderBahar = async (data) => {
	try {
		const pool = await poolPromise;
		let conditionMatchid = "";


		let matchNewQuery = "select TOP 1 match_id from cassino_matches with(nolock) where match_id  >=" + data.match_id + " AND sport_id=" + data.sport_id + " ORDER BY id DESC";

		const newRecord = await pool.request().query(matchNewQuery);
		let matchIDNew = newRecord.recordset[0].match_id;
		conditionMatchid = matchIDNew;


		const result = await pool.request()
			.input('user_id', sql.Int, data.user_id)
			.input('role_id', sql.Int, data.role_id)
			.input('match_id', sql.BigInt, conditionMatchid)
			.query("SELECT  0 as timer, '' as indexCard,'' as indexCard2, (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore, spt.name as SportName,ISNULL(mkts.market_admin_message,'') as adminMessage,'' AS InplayStatus,'' AS MainTV,'' AS graphics,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,(CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt,(CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM cassino_matches as mtch with(nolock) JOIN sports spt with(nolock) ON spt.sport_id=mtch.sport_id  JOIN cassino_markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name='Match Odds' where NOT EXISTS (SELECT 1  from user_deactive_matches with(nolock) WHERE user_deactive_matches.match_id = mtch.match_id AND user_deactive_matches.user_id =@user_id ) AND NOT EXISTS (SELECT 1 from deactive_sports with(nolock) WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id =@user_id ) AND spt.sport_id =mtch.sport_id  AND mtch.match_id=@match_id  AND mtch.status='Y' AND spt.status='Y'")
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
			matchMarkets[0].MainTV = matinTv.data;


			return resultdb(CONSTANTS.SUCCESS, matchMarkets[0]);

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getCasinoliveMatchDetailsOdds = async (data) => {
	try {
		const pool = await poolPromise;
		let conditionMatchid = "";

		let matchNewQuery = "select TOP 1 match_id from cassino_matches with(nolock) where match_id  >=" + data.match_id + " AND sport_id=" + data.sport_id + " ORDER BY id DESC";

		const newRecord = await pool.request().query(matchNewQuery);
		let matchIDNew = newRecord.recordset[0].match_id;
		conditionMatchid = matchIDNew;

		const result = await pool.request()
			.input('user_id', sql.Int, data.user_id)
			.input('role_id', sql.Int, data.role_id)
			.input('match_id', sql.BigInt, conditionMatchid)
			.query("SELECT (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END ) AS BetAllowTimeBefore, spt.name as SportName,ISNULL(mkts.market_admin_message,'') as adminMessage,'' AS InplayStatus,'' AS MainTV,'' AS graphics,(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,(CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as SportminOddsLimt,(CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as SportmaxOddsLimt,spt.score as sportScore,spt.graphic as sportGraphic,spt.is_show_last_result as sportShowLastResult,spt.is_show_tv as sportShowTV,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id, mtch.match_id, mtch.name, mtch.start_date, spt.volume_limit as matchVolumn,mkts.market_runner_count as marketCount, mkts.name as marketName,spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM cassino_matches as mtch with(nolock) JOIN sports spt with(nolock) ON spt.sport_id=mtch.sport_id  JOIN cassino_markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.match_id=@match_id AND mkts.name='Match Odds' where NOT EXISTS (SELECT 1  from user_deactive_matches with(nolock) WHERE user_deactive_matches.match_id = mtch.match_id AND user_deactive_matches.user_id =@user_id ) AND NOT EXISTS (SELECT 1 from deactive_sports with(nolock) WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id =@user_id) AND spt.sport_id =mtch.sport_id  AND mtch.match_id=@match_id  AND mtch.status='Y' AND spt.status='Y'")

		if (result.recordset === null || result.recordset == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {

			let matchMarkets = result.recordset;
			let marketID = data.sport_id + matchMarkets[0].market_id;
			let oddsData = await exchangeService.getCasinoOddsByMarketIds([marketID]);
			let matinTv = await exchangeService.getCasinoLiveTv(data.sport_id);
			let marketRunnerJson = [];
			let selectionMatch = [];
			let matchMarketsDetails = matchMarkets[0];
			let compairMarketid = matchMarketsDetails.market_id;
			matchMarketsDetails.errorMessage = "";
			let MarketSelection = await exchangeService.admin_getCasinoMarketSelection(matchMarketsDetails.match_id, matchMarketsDetails.market_id, data.user_id, data.role_id);

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
			/* for (let i in matchMarkets) {
				let matchMarketsDetails = matchMarkets[i];

				let MarketSelection = await exchangeService.getCasinoMarketSelection(matchMarketsDetails.match_id, matchMarketsDetails.market_id, data.id);

				if (matchMarketsDetails.runner_json !== null && (oddsData === null || oddsData === undefined)) {
					let runnerJson = JSON.parse(matchMarketsDetails.runner_json);
					 
					let marktRunner = runnerJson[i].marketRunner;				 
					for (let k in marktRunner) {
						let selectionID = marktRunner[k].id;
						selectionMatch = MarketSelection.data.filter(function (data) {
							if (data.selection_id == selectionID) {
								marktRunner[k].WinAndLoss = data.win_loss_value;
							}
						});
						let runnerJs = marktRunner[k];
						runnerJs.superStatus = runnerJson[i].status;
						marketRunnerJson.push(runnerJs);
					}
				}
				else {

					let runnerJson = oddsData.data;
				 
					matchMarkets[i].indexCard = runnerJson[i].indexCard;
					matchMarkets[i].timer = runnerJson[i].timer;
					let marktRunner = runnerJson[i].marketRunner;
					for (let k in marktRunner) {
						let selectionID = marktRunner[k].id;
						selectionMatch = MarketSelection.data.filter(function (data) {
							if (data.selection_id == selectionID) {
								marktRunner[k].WinAndLoss = data.win_loss_value;
							}
						});
						let runnerJs = marktRunner[k];
						runnerJs.superStatus = runnerJson[i].status;
						marketRunnerJson.push(runnerJs);
					}
				}
				matchMarkets[i].runner_json = JSON.stringify(marketRunnerJson);
			} */
			/* let newdata = matchMarkets.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE', MainTV: CONSTANTS.GET_CASION_TV_URL[oddsData.data[data.sport_id]] } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, InplayStatus: 'CLOSE', MainTV: CONSTANTS.GET_CASION_TV_URL[data.sport_id] }
			)); */
			//return resultdb(CONSTANTS.SUCCESS, newdata[0]);
		}

	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};



let clearLiabilityAllUsers = async () => {
	const pool = await poolPromise;
	try {
		let resultQuery = "update users set liability=0,balance  -=liability where id NOT IN( select users.id as user_id  from bets_odds with(nolock) left join users with(nolock) on users.id=bets_odds.user_id  where user_id IN(select id from users with(nolock) where (ROUND(liability,2) < 0 or ROUND(liability,2) > 0) AND ROUND(liability,2) !=0) AND (bet_result_id=0 or bet_result_id IS NULL) UNION ALL select users.id as user_id  from cassino_bets_odds with(nolock) left join users with(nolock) on users.id=cassino_bets_odds.user_id  where user_id IN(select id from users with(nolock) where (ROUND(liability,2) < 0 or ROUND(liability,2) > 0) AND ROUND(liability,2) !=0) AND (bet_result_id=0 or bet_result_id IS NULL) UNION ALL select users.id as user_id from bets_fancy with(nolock) left join users with(nolock) on users.id=bets_fancy.user_id  where user_id IN(select id from users with(nolock) where (ROUND(liability,2) < 0 or ROUND(liability,2) > 0) AND ROUND(liability,2) !=0) AND (bet_result_id=0 or bet_result_id IS NULL) ) AND (ROUND(liability,2) < 0 or ROUND(liability,2) > 0) AND ROUND(liability,2) !=0 ";

		const liability = await pool.request().query(resultQuery);

		if (liability.recordset === null || liability.recordset == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, liability.recordset);
		}

	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let setCasinoTvUrl = async () => {
	try {
		let matinTv = await exchangeService.setCasinoTvUrl();
		if (matinTv.recordset === null || matinTv.recordset == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);
		}

	} catch (error) {
		//console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let addSLOTEGRATORMatches = async() =>{
	const pool = await poolPromise;
	try {
			let nonce_string = globalFunction.generateRandoString(32);
			let timeStamp = globalFunction.currentDateTimeStamp();
			let perPage = 200;
			let getString = {'X-Merchant-Id':settings.SLOTEGRATOR_INTEGRATION_MERCHANT_ID, 'X-Nonce':nonce_string,'X-Timestamp':timeStamp,'perPage':perPage};
			getString = new URLSearchParams(getString).toString();		
			let generateHash = globalFunction.GenerateSLOTEGRATOR_HashKey(getString);
			let lobby_url=settings.SLOTEGRATOR_INTEGRATION_LOBBY_URL+'games?perPage='+perPage;			
			let headers ={};
			headers['X-Merchant-Id']	= settings.SLOTEGRATOR_INTEGRATION_MERCHANT_ID;
			headers['X-Timestamp']		= timeStamp;
			headers['X-Nonce']			= nonce_string;
			headers['X-Sign']			= generateHash;
			let response2 = await axios.get(lobby_url, {headers: headers});	
			await pool.request()
			.input('sportID', sql.Int,  CONSTANTS.BETFAIR_SPORT_CASINO_SLOTEGRATOR)
			.query("UPDATE slotegrator_games SET status='N' WHERE sport_id=@sportID"); 
			if(response2.data !== null && response2.data._meta != null ){
				let getMetaArray = response2.data._meta;	
				for (let page = getMetaArray.currentPage; page <= getMetaArray.pageCount ; page++) {
			 		
					let nonce_string = globalFunction.generateRandoString(32);
					let timeStamp = globalFunction.currentDateTimeStamp();
					let getString = {'X-Merchant-Id':settings.SLOTEGRATOR_INTEGRATION_MERCHANT_ID, 'X-Nonce':nonce_string,'X-Timestamp':timeStamp,'page':page};
					getString = new URLSearchParams(getString).toString();		
					let generateHash = globalFunction.GenerateSLOTEGRATOR_HashKey(getString);
					let lobby_url=settings.SLOTEGRATOR_INTEGRATION_LOBBY_URL+'games/index?page='+page;			
					let headers ={};
					headers['X-Merchant-Id']	= settings.SLOTEGRATOR_INTEGRATION_MERCHANT_ID;
					headers['X-Timestamp']		= timeStamp;
					headers['X-Nonce']			= nonce_string;
					headers['X-Sign']			= generateHash;
					let getperPageRecord = await axios.get(lobby_url, {headers: headers});	
					if(getperPageRecord.data.items.length > 0){
						for (let record in getperPageRecord.data.items ) {
							let result = getperPageRecord.data.items[record];							
							let uuidr 							=	result.uuid;
							let namer 							=	result.name;
							let imager 							=	result.image;
							let typer 							=	result.type;
							let providerr 						=	result.provider;
							let technologyr 					=	result.technology;
							let has_lobbyr 						=	result.has_lobby;
							let is_mobiler 						=	result.is_mobile;
							let has_freespinsr 					=	result.has_freespins;
							let has_tablesr 					=	result.has_tables;
							let freespin_valid_until_full_dayr 	=	result.freespin_valid_until_full_day;
							let request_jsonr 					=	result.freespin_valid_until_full_day;
							let sportID = CONSTANTS.BETFAIR_SPORT_CASINO_SLOTEGRATOR;
							let seriesID = CONSTANTS.BETFAIR_SPORT_CASINO_SLOTEGRATOR+""+CONSTANTS.BETFAIR_SPORT_CASINO;
							let inplayDate = Math.floor(Date.now() / 1000);
						
							const updatRecord =await pool.request()
							.input('match_id', sql.VarChar(255), uuidr)
							.query("SELECT * FROM slotegrator_games WHERE match_id=@match_id");
						if (updatRecord.recordset === null || updatRecord.recordset == 0) {
								await pool.request()
								.input('sport_id', sql.Int, sportID)
								.input('series_id', sql.Int, seriesID)
								.input('match_id', sql.VarChar(255), uuidr)
								.input('name', sql.VarChar(255), namer)
								.input('freespin_valid_until_full_day', sql.VarChar(255), freespin_valid_until_full_dayr)
								.input('has_freespins', sql.VarChar(255), has_freespinsr)
								.input('has_lobby', sql.VarChar(255), has_lobbyr)
								.input('has_tables', sql.VarChar(255), has_tablesr)
								.input('image', sql.VarChar(255), imager)
								.input('is_mobile', sql.VarChar(255), is_mobiler)
								.input('provider', sql.VarChar(255), providerr)
								.input('technology', sql.VarChar(255), technologyr)
								.input('type', sql.VarChar(255), typer)
								.input('status', sql.VarChar(255), 'Y')
								.input('created_at', sql.BigInt, inplayDate)
								.input('updated_at', sql.BigInt, inplayDate)
								.query("INSERT INTO slotegrator_games (sport_id, series_id, match_id, name, freespin_valid_until_full_day, has_freespins, has_lobby, has_tables, image, is_mobile, provider, technology, type, status, created_at, updated_at) VALUES(@sport_id, @series_id, @match_id, @name,@freespin_valid_until_full_day, @has_freespins,@has_lobby,@has_tables,@image,@is_mobile,@provider,@technology,@type ,@status,@created_at,@updated_at)");
							}else{
							
								await pool.request()
								.input('match_id', sql.VarChar(255), uuidr)
								.query("UPDATE slotegrator_games SET status='Y' WHERE match_id=@match_id");
							}
							
						} 
					}
				}
				
			}
			return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL); 
		 
	} catch (error) {
		console.log(' error --------SLOTEGRATOR------------------------------------------------------ ', error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}

let addFindisMatches = async() =>{
	const pool = await poolPromise;
	try {
		let TID2 = Math.random()+'___'+Date.now();
		let jsonnn = 'Game/FullList/'+settings.FUN_WHITE_LIST_IP+'/'+TID2+'/'+settings.FUN_API_KEY+'/'+settings.FUN_API_PASSWORD;					
		let encrypt_string=globalFunction.convertFUNStringmd5(jsonnn);					
		let lobby_url=settings.FUN_LOBBY_GAMES_LIST_URL+TID2+'&Hash='+encrypt_string;		
		let response2 = await axios.get(lobby_url);	
	  	
			await pool.request()
			.input('sportID', sql.Int,  CONSTANTS.BETFAIR_SPORT_CASINO_FUN)
			.query("UPDATE fundist_games SET status='N' WHERE sport_id=@sportID"); 
			if(response2.data !== null && response2.data.games != null ){
				
				let getMetaArray = response2.data.games;			
				let merchants = response2.data.merchants;
					if(getMetaArray.length > 0){
						for (let record in getMetaArray ) {
							let result = getMetaArray[record];							

							let uuidr 						=	result.ID;
							let namer 						=	result.Name.en;
							let Image 						=	result.Image;
							let Url 						=	result.Url;
							let Description 				=	JSON.stringify(result.Description);
							let MobileUrl 					=	result.MobileUrl;
							let Branded 					=	result.Branded;
							let SuperBranded 				=	result.SuperBranded;
							let hasDemo 					=	result.hasDemo;
							let CategoryID 					=	JSON.stringify(result.CategoryID);
							let SortPerCategory 			=	JSON.stringify(result.SortPerCategory);
							let MerchantID 					=	result.MerchantID;
							let SubMerchantID 				=	result.SubMerchantID;
							let AR 							=	result.AR;
							let IDCountryRestriction 		=	result.IDCountryRestriction;
							let Sort 						=	result.Sort;
							let PageCode 					=	result.PageCode;
							let MobilePageCode 				=	result.MobilePageCode;
							let MobileAndroidPageCode 		=	result.MobileAndroidPageCode;
							let MobileWindowsPageCode 		=	result.MobileWindowsPageCode;
							let ExternalCode 				=	result.ExternalCode;
							let MobileExternalCode 			=	result.MobileExternalCode;
							let ImageFullPath 				=	result.ImageFullPath;
							let WorkingHours 				=	result.WorkingHours;
							let IsVirtual 					=	result.IsVirtual;
							let TableID 					=	result.TableID;
							let CustomSort 					=	JSON.stringify(result.CustomSort);
							let RTP 						=	result.RTP;
							let BrandedNew 					=	result.BrandedNew;
							let Freeround 					=	result.Freeround;
							let sportID 					= CONSTANTS.BETFAIR_SPORT_CASINO_FUN;
							let seriesID 					= CONSTANTS.BETFAIR_SPORT_CASINO_FUN+""+CONSTANTS.BETFAIR_SPORT_CASINO;
							let inplayDate 					= Math.floor(Date.now() / 1000);
							 
							console.log('marchentName -------------------------------- ', merchants[MerchantID]);
							let MerchantName 				= "";
							if(merchants[MerchantID] != undefined){
								MerchantName = merchants[MerchantID].Name;
							}
							//let MerchantName 				=  ((merchants[MerchantID]!=undefined || merchants[MerchantID]!='') ? merchants[MerchantID].Name:'');
							const updatRecord =await pool.request()
							.input('match_id', sql.VarChar(255), uuidr)
							.input('TableID', sql.VarChar(255), TableID)
							.query("SELECT * FROM fundist_games WHERE match_id=@match_id AND TableID=@TableID");
						if (updatRecord.recordset === null || updatRecord.recordset == 0) {
								await pool.request()
								.input('sport_id', sql.Int, sportID)
								.input('series_id', sql.Int, seriesID)
								.input('match_id', sql.VarChar(255), uuidr)
								.input('name', sql.VarChar(255), namer)
								.input('Image', sql.VarChar(255), Image)
								.input('Url', sql.VarChar(255), Url)
								.input('Description', sql.VarChar(255), Description)
								.input('MobileUrl', sql.VarChar(255), MobileUrl)
								.input('Branded', sql.VarChar(255), Branded)
								.input('SuperBranded', sql.VarChar(255), SuperBranded)
								.input('hasDemo', sql.VarChar(255), hasDemo)
								.input('SortPerCategory', sql.VarChar(255), SortPerCategory)
								.input('MerchantID', sql.VarChar(255), MerchantID)
								.input('MerchantName', sql.VarChar(255), MerchantName)
								.input('SubMerchantID', sql.VarChar(255), SubMerchantID)
								.input('AR', sql.VarChar(255), AR)
								.input('IDCountryRestriction', sql.VarChar(255), IDCountryRestriction)
								.input('Sort', sql.VarChar(255), Sort)
								.input('PageCode', sql.VarChar(255), PageCode)
								.input('MobilePageCode', sql.VarChar(255), MobilePageCode)
								.input('MobileAndroidPageCode', sql.VarChar(255), MobileAndroidPageCode)
								.input('MobileWindowsPageCode', sql.VarChar(255), MobileWindowsPageCode)
								.input('ExternalCode', sql.VarChar(255), ExternalCode)
								.input('MobileExternalCode', sql.VarChar(255), MobileExternalCode)
								.input('ImageFullPath', sql.VarChar(255), ImageFullPath)
								.input('WorkingHours', sql.VarChar(255), WorkingHours)
								.input('IsVirtual', sql.VarChar(255), IsVirtual)
								.input('TableID', sql.VarChar(255), TableID)
								.input('CustomSort', sql.VarChar(255), CustomSort)
								.input('RTP', sql.VarChar(255), RTP)
								.input('BrandedNew', sql.VarChar(255), BrandedNew)
								.input('Freeround', sql.VarChar(255), Freeround)
								.input('status', sql.VarChar(255), 'Y')
								.input('created_at', sql.BigInt, inplayDate)
								.input('updated_at', sql.BigInt, inplayDate)
								.query("INSERT INTO fundist_games (sport_id, series_id, match_id, name, Image, Url, Description, MobileUrl, Branded, SuperBranded, hasDemo, SortPerCategory, MerchantID, MerchantName, SubMerchantID,  AR,  IDCountryRestriction,  Sort,  PageCode,  MobilePageCode,  MobileAndroidPageCode,  MobileWindowsPageCode,  ExternalCode,  MobileExternalCode,  ImageFullPath,  WorkingHours,  IsVirtual,  TableID,  CustomSort,  RTP,  BrandedNew,  Freeround,  status, created_at, updated_at) VALUES(@sport_id, @series_id, @match_id, @name,@Image, @Url, @Description, @MobileUrl, @Branded, @SuperBranded, @hasDemo, @SortPerCategory, @MerchantID, @MerchantName,  @SubMerchantID ,@AR , @IDCountryRestriction ,@Sort ,@PageCode ,@MobilePageCode , @MobileAndroidPageCode, @MobileWindowsPageCode ,@ExternalCode ,@MobileExternalCode ,@ImageFullPath ,@WorkingHours ,@IsVirtual ,@TableID ,@CustomSort ,@RTP ,@BrandedNew ,@Freeround,@status, @created_at,@updated_at)");
							}else{
								console.log('uuidr ------------------------- ',uuidr);
								await pool.request()
								.input('match_id', sql.VarChar(255), uuidr)
								.input('TableID', sql.VarChar(255), TableID)
								.query("UPDATE fundist_games SET status='Y' WHERE match_id=@match_id AND TableID=@TableID");
							}
							
						} 
					}
			}
			return resultdb(CONSTANTS.SUCCESS, response2.data); 
		 
	} catch (error) {
		console.log(' error --------FUN------------------------------------------------------ ', error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}

module.exports = {
	getMatchDetailsOdds,
	getCasinoMatchDetailsOdds,
	getMatchDetailsOthers,
	getMatchDetailsCompleted,
	getMatchIndiaFancy,
	admin_getMatchAndMarketBets,
	getCompletedBetFairMarketBets,
	getMyBetFairMarketBets,
	getMatchFacnyBets,
	myDashboard,
	settlementReport,
	ProfitLoss,
	ProfitLossCommission,
	ownDataInSettlementReport,
	makeSettlement,
	settlementCollectionHistory,
	deleteSettlement,
	settlementHistoryByParent,
	userPosition,
	ourUserPosition,
	getMyMarketList,
	getInplayMatchesList,
	userFancyPosition,
	getFancyBetForUserPosition,
	getCasinoSports,
	saveCasinoMatches,
	getCasinoMyBetFairMarketBets,
	saveCasinoUpMatkaMatches,
	clearUserLogsData,
	casinoResultRecord,
	setResultBySportId,
	addcasinomatchbycurl,
	createFancyPosition,
	getMatchIndiaFancyManual,
	getMatchUsers,
	addcasinoMatchAnderBhar,
	historyList,
	getMatchCasinoMarketListAnderBahar,
	getMatchCasinoliveMarketListAnderBahar,
	getCasinoliveMatchDetailsOdds,
	clearLiabilityAllUsers,
	getChildUserList,
	setCasinoTvUrl,
	addcasinoMatchWorliMatka,
	addSLOTEGRATORMatches,
	addFindisMatches
};