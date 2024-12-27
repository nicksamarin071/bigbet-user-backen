const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');
const userModel = require('../../routes/model/userModel');
const exchangeService = require('./exchangeService');
let resultdb = globalFunction.resultdb;
const { poolPromise, sql } = require('../../db')

// Avinash Code

let getBetsByMatchORMarketeId = async (data) => {
	try {

		const pool = await poolPromise;
		let query = "SELECT bet.id,bet.user_id,bet.agent_id,bet.master_id,bet.super_master_id,bet.admin_id,bet.super_admin_id,bet.sport_id,bet.match_id,mrkt.market_id, mrkt.name as marketName,selection.selection_id as selectionId,(CASE WHEN bet.delete_status=2 THEN 'Void' ELSE bet.delete_status END) as status,selection.name as selectionName,bet.odds,bet.stack,bet.is_back,ROUND((CASE WHEN bet.is_back=1 THEN bet.p_l ELSE bet.liability END),2) AS p_l,bet.is_matched,bet.bet_matched_at,bet.created_ip,bet.created_at from bets_odds as bet with(nolock) INNER JOIN markets as mrkt with(nolock) ON mrkt.market_id = bet.market_id AND mrkt.match_id=" + data.match_id + " INNER JOIN market_selections as selection with(nolock) ON selection.selection_id = bet.selection_id AND selection.match_id=" + data.match_id + " AND  selection.market_id=bet.market_id where bet.user_id=" + data.id + " AND (bet.delete_status=0 OR bet.delete_status=2 ) AND (bet.bet_result_id=0 OR bet.bet_result_id='' ) AND bet.match_id=" + data.match_id + " AND selection.match_id=" + data.match_id + "";
		if (data.market_id != 0) {
			query += " AND bet.market_id=" + data.market_id + " AND  selection.market_id=" + data.market_id + "";
		}
		query += ' ORDER BY id DESC';
		//console.log(query);
		const result = await pool.request()
			.query(query)
		if (result === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}

	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
/*Get Casino Match bets */

let getCasinoBetsByMatchORMarketeId = async (data) => {
	try {

		const pool = await poolPromise;
		let query = "SELECT bet.id,bet.user_id,bet.agent_id,bet.master_id,bet.super_master_id,bet.admin_id,bet.super_admin_id,bet.sport_id,bet.match_id,mrkt.market_id, mrkt.name + ' #' + mrkt.market_id as marketName,selection.selection_id as selectionId,(CASE WHEN bet.delete_status=2 THEN 'Void' ELSE bet.delete_status END) as status,selection.name as selectionName,bet.odds,bet.stack,bet.is_back,ROUND((CASE WHEN bet.is_back=1 THEN bet.p_l ELSE bet.liability END),2) AS p_l,bet.is_matched,bet.bet_matched_at,bet.created_ip,bet.created_at from cassino_bets_odds as bet with(nolock) INNER JOIN cassino_markets as mrkt  with(nolock) ON mrkt.market_id = bet.market_id AND mrkt.match_id=" + data.match_id + " INNER JOIN cassino_market_selections as selection  with(nolock) ON selection.selection_id = bet.selection_id AND selection.match_id=" + data.match_id + " AND  selection.market_id=bet.market_id where bet.user_id=" + data.id + " AND (bet.delete_status=0 OR bet.delete_status=2 ) AND bet.match_id=" + data.match_id + " AND selection.match_id=" + data.match_id + "";
		if (data.market_id != 0) {
			query += " AND bet.market_id='" + data.market_id + "' AND  selection.market_id='" + data.market_id + "'";
		}
		query += ' ORDER BY id DESC';
		//console.log(query);
		const result = await pool.request().query(query)
		if (result === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}

	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getBetsByMatchORFancyId = async (data) => {
	try {

		const pool = await poolPromise;
		let query = "SELECT bet.id,bet.user_id,bet.agent_id,bet.master_id,bet.super_master_id,bet.admin_id,bet.super_admin_id,bet.sport_id,bet.match_id,bet.fancy_id,bet.stack,bet.is_back,bet.run,bet.size,bet.liability,(CASE WHEN bet.delete_status=2 THEN 'Void' ELSE bet.delete_status END) as status,ROUND((CASE WHEN bet.is_back=1 THEN bet.profit ELSE bet.liability END),2) AS profit, bet.type_id,bet.chips,bet.fancy_name,bet.session_input_yes,bet.session_input_no,bet.point_difference,bet.created_ip,bet.created_at from bets_fancy as bet with(nolock) where bet.user_id= " + data.id + " AND bet.match_id= " + data.match_id + " AND (bet.delete_status=0 OR bet.delete_status=2 ) AND (bet.bet_result_id=0 OR bet.bet_result_id IS NULL ) ";
		if (data.fancy_id != 0) {
			query += " AND bet.super_admin_id=" + data.fancy_id;
			//conditonArray.push()	
		}

		query += 'ORDER BY id DESC';
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
let getMyMatchesList = async (data) => {
	try {
		const pool = await poolPromise;
		let query = "SELECT  spt.name as SportName, ISNULL(mkts.market_admin_message,'') as adminMessage,'' AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before >0 THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,ISNULL(fav.match_id ,0) as favMatchID, spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id, mtch.match_id, mtch.name, (CASE WHEN (dfancy.id IS NULL OR dfancy.id=0) THEN 'Y' ELSE 'N' END) AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, mtch.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch  with(nolock) JOIN sports as spt  with(nolock) ON spt.sport_id = mtch.sport_id  JOIN markets mkts  with(nolock) ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' LEFT JOIN favourites as fav  with(nolock) ON fav.match_id=mtch.match_id AND fav.market_id= mkts.market_id AND fav.user_id=" + data.id + " LEFT JOIN deactive_fancies as dfancy with(nolock) ON dfancy.match_id= mtch.match_id and dfancy.user_id=" + data.id + " LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id and dspt.user_id =" + data.id + " LEFT JOIN user_deactive_matches as udmtch with(nolock) ON udmtch.match_id= mtch.match_id and udmtch.user_id =" + data.id + " where   (mtch.match_id=(select TOP 1  match_id from odds_profit_loss with(nolock) where user_id=" + data.id + " AND match_id=mtch.match_id ) OR mtch.match_id=(select TOP 1  match_id from fancy_score_positions with(nolock) where user_id=" + data.id + " AND match_id=mtch.match_id ) ) AND ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND ( udmtch.match_id  IS NULL OR udmtch.match_id=0)  AND spt.status='Y' AND mtch.status='Y' AND mtch.is_completed='N' ";
		if (data.sport_id > 0 && data.sport_id != 0) {
			query += " AND mtch.sport_id=" + data.sport_id + "";
		}
		//console.log(query);
		const result = await pool.request()
			.query(query)
		if (result.recordset === null || result.recordset.length === 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			let marketData = result.recordset.map((data) => (data.market_id));
			let oddsData = await exchangeService.getOddsByMarketIds(marketData);
			let newdata = result.recordset.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE' } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json, InplayStatus: 'CLOSE' }
			));
			return resultdb(CONSTANTS.SUCCESS, newdata);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
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
			.query("SELECT fanc.fancyStatus, fanc.selection_id as SelectionId,mtch.start_date, ISNULL(CASE WHEN mtch.is_fancy_bet_allow='N' THEN 'BET SUSPENDED' ELSE fanc.market_admin_message END,'') as adminMessage,(CASE WHEN spt.is_bet_allow = fanc.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, CASE  WHEN fanc.bet_allow_time_before > spt.bet_allow_time_before THEN fanc.bet_allow_time_before  ELSE  spt.bet_allow_time_before  END AS BetAllowTimeBefore, ISNULL(fanc.min_stack, 0) AS minStack,ISNULL(fanc.max_stack ,0) AS maxStack, ISNULL(fanc.session_max_profit, 0) AS maxProfit, fanc.name as RunnerName, fanc.session_value_yes as BackPrice1,fanc.session_size_yes as BackSize1, fanc.session_value_no as LayPrice1, fanc.session_size_no as LaySize1,'' AS inplayStatus,0 as scorePostion FROM fancies fanc INNER JOIN matches as mtch ON mtch.match_id=fanc.match_id AND mtch.match_id=@match_id AND mtch.status='Y' INNER LOOP JOIN sports spt ON spt.sport_id=fanc.sport_id  where fanc.match_id=@match_id AND (fanc.status='A' OR fanc.status='C') AND fanc.result IS NULL AND fanc.fancyStatus='M'")

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

let getMatchesList = async (data) => {
	try {
		const pool = await poolPromise;

		const result = await pool.request()
			.input('from_date', data.from_date)
			.input('to_date', data.to_date)
			.query(`
			SELECT match_id, sport_id, name
			FROM matches
			WHERE sport_id IN (1, 2, 4) 
			AND created_at BETWEEN @from_date AND @to_date
			ORDER BY created_at DESC;
            `);

		if (!result.recordset || result.recordset.length === 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		}

		return result.recordset; // Return the fetched matches
	} catch (error) {
		console.error("Error in getMatchesList:", error); // Improved error logging
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

module.exports = {
	getBetsByMatchORMarketeId,
	getCasinoBetsByMatchORMarketeId,
	getBetsByMatchORFancyId,
	getMyMatchesList,
	getMatchIndiaFancyWithoutAuth,
	getMatchIndiaFancyManualWithoutAuth,
	getMatchesList,
};
