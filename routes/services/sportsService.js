//const MysqlPool = require('../../db');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');
const userModel = require('../../routes/model/userModel');
const settings = require('../../config/settings');
const exchangeService = require('./exchangeService');
let resultdb = globalFunction.resultdb;
const { poolPromise, sql } = require('../../db')
let getSportList = async (data) => {
	try {
		//console.log("data  ",data);

		const pool = await poolPromise;
		const result = await pool.request()
			.input('pUserid', sql.Int, data.id)
			.execute('GET_ACTIVE_SPORTS_BY_USER_FRONT');

		//console.log("result  ",result);

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
let getSeriesListBySportId = async (data) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('input_parameter', sql.VarChar(50), data.sport_id)
			.query("SELECT name,sport_id,series_id,match_open,id FROM series WHERE series.sport_id=@input_parameter AND series.match_open > 0 AND status='Y' UNION ALL SELECT name,sport_id,series_id,match_open,id FROM cassino_series WHERE cassino_series.sport_id=@input_parameter AND parent_id=0 AND status='Y'")
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

let getInplayMatchesList = async (data) => {
	try {

		let userId = data.id;
		let inplayDate = Math.floor(Date.now() / 1000);
		const pool = await poolPromise;
		let query = "";
		if (data.sport_id <= 0) {
			query += "select * from (SELECT (CASE WHEN mtch.is_bookmaker='Y' THEN 1 ELSE 0 END) as bm,spt.order_by,spt.name as SportName,ISNULL(mkts.market_admin_message,'') as adminMessage,(CASE WHEN (select count(*) from markets where match_id=mtch.match_id AND status='Y' AND is_result_declared='N' AND isbetalowaftermatchodds='Y' AND (result_id IS NULL OR result_id=0)) > 0 THEN 'OPEN' ELSE 'CLOSE' END) AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff, mtch.series_id,ser.name AS seriesName,ISNULL(fav.match_id ,0) as favMatchID, mtch.match_id, mtch.name,(CASE WHEN  NOT EXISTS (SELECT 1  from deactive_fancies WHERE deactive_fancies.match_id =mtch.match_id AND deactive_fancies.user_id = " + userId + ") THEN 'Y' ELSE 'N' END) AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, spt.sport_id, mkts.market_id as market_id,mkts.runner_json, ROW_NUMBER() OVER ( Partition by mtch.sport_id order by mtch.sport_id ) as row_num FROM matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' LEFT JOIN favourites as fav ON fav.match_id=mtch.match_id AND fav.market_id= mkts.market_id AND fav.user_id=" + userId + " JOIN series ser ON ser.series_id = mtch.series_id where NOT EXISTS (SELECT 1  from user_deactive_matches WHERE user_deactive_matches.match_id = mtch.match_id AND user_deactive_matches.user_id =" + userId + " ) AND NOT EXISTS (SELECT 1 from deactive_sports WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id = " + userId + ") AND mtch.status='Y' AND mtch.start_date <= " + inplayDate + " AND mtch.is_completed='N'  AND mtch.is_cup='N' ) as mtchss where mtchss.sport_id IN (select sport_id from sports where sports.dashboard_inplay ='Y' AND sports.status='Y' ) AND mtchss.row_num <=5 ORDER BY mtchss.start_date ASC";
		} else {
			query += "SELECT (CASE WHEN mtch.is_bookmaker='Y' THEN 1 ELSE 0 END) as bm, spt.name as SportName,ISNULL(mkts.market_admin_message,'') as adminMessage,(CASE WHEN (select count(*) from markets where match_id=mtch.match_id AND status='Y' AND is_result_declared='N' AND isbetalowaftermatchodds='Y' AND (result_id IS NULL OR result_id=0)) > 0 THEN 'OPEN' ELSE 'CLOSE' END) AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id,ser.name AS seriesName,ISNULL(fav.match_id ,0) as favMatchID, mtch.match_id, mtch.name,(CASE WHEN NOT EXISTS (SELECT 1  from deactive_fancies WHERE deactive_fancies.match_id =mtch.match_id AND deactive_fancies.user_id = " + userId + " ) THEN 'Y' ELSE 'N' END) AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, mtch.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch JOIN sports as spt ON spt.sport_id = mtch.sport_id  JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' LEFT JOIN favourites as fav ON fav.match_id=mtch.match_id AND fav.market_id= mkts.market_id AND fav.user_id=" + userId + " JOIN series ser ON ser.series_id = mtch.series_id where NOT EXISTS (SELECT 1  from user_deactive_matches WHERE user_deactive_matches.match_id = mtch.match_id AND user_deactive_matches.user_id = " + userId + ") AND NOT EXISTS (SELECT 1 from deactive_sports WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id =" + userId + ") AND spt.status='Y' AND spt.sport_id=" + data.sport_id + " AND mtch.status='Y' AND mtch.start_date <= " + inplayDate + " AND mtch.is_completed='N' AND mtch.is_cup='N' ORDER BY   spt.order_by ASC, mtch.start_date ASC"
		}

		const result = await pool.request().query(query);

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let marketData = result.recordset.map((data) => (data.market_id));
			let oddsData = await exchangeService.getOddsByMarketIds(marketData);
			let newdata = result.recordset.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE' } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json }
			));
			return resultdb(CONSTANTS.SUCCESS, newdata);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getUpcomingMatchesList = async (data) => {
	try {
		let userId = data.id;
		let inplayDate = Math.floor(Date.now() / 1000);
		const pool = await poolPromise;
		let offset = (data.pageno - 1) * data.limit;
		let sportID = "";
		if (data.sport_id != 0) {
			sportID = " AND mtch.sport_id=" + data.sport_id;
		}

		let query = "SELECT  spt.name as SportName,'' as image, '' as casino_id,ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET LOCKED' ELSE mkts.market_admin_message END,'') as adminMessage,(CASE WHEN EXISTS(select 1 from markets where match_id=mtch.match_id AND status='Y' AND is_result_declared='N' AND (isbetalowaftermatchodds='Y' OR name='Book Maker')AND (result_id IS NULL OR result_id=0)) THEN 'OPEN' ELSE CASE WHEN spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_HORSE_RACING + " OR spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_GREYHOUND_RACING + " THEN 'OPEN' ELSE 'CLOSE' END  END) AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id,0 as favMatchID, mtch.match_id,(CASE WHEN spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_HORSE_RACING + " OR spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_GREYHOUND_RACING + " THEN mkts.display_name ELSE  mtch.name END) as name, 'N'  AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, mtch.sport_id, mkts.market_id as market_id,mkts.runner_json, series.name as seriesName FROM matches as mtch JOIN sports as spt ON spt.sport_id = mtch.sport_id  JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' LEFT JOIN series  ON series.series_id=mtch.series_id where spt.status='Y' AND mtch.status='Y' AND mtch.is_cup='N' AND mtch.start_date >= " + inplayDate + " AND mtch.is_completed='N'  " + sportID + "";


		// if(data.series_id!=0){
		// 	query+=' AND mtch.series_id='+data.series_id;	
		// }	
		query += " ORDER BY mtch.start_date ASC OFFSET  " + offset + " ROWS FETCH NEXT " + data.limit + " ROWS ONLY ";
		//console.log('----getMatchListBySportSeriesIdUpcomming -------------- ', query);
		const result = await pool.request()
			.query(query)
		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let marketData = result.recordset.map((data) => (data.market_id));
			let oddsData = await exchangeService.getOddsByMarketIds(marketData);
			// let newdata=result.recordset.map((data)=>(
			// 	oddsData.data[data.market_id]?{...data,runner_json:oddsData.data[data.market_id].runners}:{...data,runner_json:data.runner_json?JSON.parse(data.runner_json):data.runner_json}
			// ));

			// return resultdb(CONSTANTS.SUCCESS, newdata);
			let newdata = result.recordset.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE' } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json }
			));
			return resultdb(CONSTANTS.SUCCESS, newdata);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getFavoriteMatchesList = async (data) => {
	try {
		let userId = data.id;
		let inplayDate = Math.floor(Date.now() / 1000);
		const pool = await poolPromise;
		let query = "";
		if (data.sport_id <= 0) {
			query += "select * from (SELECT spt.order_by, spt.name as SportName,ISNULL(mkts.market_admin_message,'') as adminMessage,(CASE WHEN (select count(*) from markets where match_id=mtch.match_id AND status='Y' AND is_result_declared='N' AND isbetalowaftermatchodds='Y' AND (result_id IS NULL OR result_id=0)) > 0 THEN 'OPEN' ELSE 'CLOSE' END) AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff, mtch.series_id, mtch.match_id, mtch.name,(CASE WHEN NOT EXISTS (SELECT 1  from deactive_fancies WHERE deactive_fancies.match_id =mtch.match_id AND deactive_fancies.user_id = " + userId + " ) THEN 'Y' ELSE 'N' END) AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, spt.sport_id, mkts.market_id as market_id,mkts.runner_json, ROW_NUMBER() OVER ( Partition by mtch.sport_id order by mtch.sport_id ) as row_num FROM matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' where NOT EXISTS (SELECT 1  from user_deactive_matches WHERE user_deactive_matches.match_id = mtch.match_id AND user_deactive_matches.user_id = " + userId + ") AND  NOT EXISTS (SELECT 1 from deactive_sports WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id = " + userId + ") AND mtch.match_id IN (select match_id from favourites where favourites.match_id=mtch.match_id AND favourites.user_id=" + userId + " AND favourites.market_id=mkts.market_id) AND mtch.status='Y' AND mtch.is_completed='N' AND mtch.is_cup='N' ) as mtchss where mtchss.sport_id IN (select sport_id from sports where sports.dashboard_inplay ='Y' AND sports.status='Y' ) AND mtchss.row_num <=5 ORDER BY mtchss.start_date ASC";
		} else {
			query += "SELECT  spt.name as SportName,ISNULL(mkts.market_admin_message,'') as adminMessage,(CASE WHEN (select count(*) from markets where match_id=mtch.match_id AND status='Y' AND is_result_declared='N' AND isbetalowaftermatchodds='Y' AND (result_id IS NULL OR result_id=0)) > 0 THEN 'OPEN' ELSE 'CLOSE' END) AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id, mtch.match_id, mtch.name,(CASE WHEN NOT EXISTS (SELECT 1  from deactive_fancies WHERE deactive_fancies.match_id =mtch.match_id AND deactive_fancies.user_id = " + userId + ") THEN 'Y' ELSE 'N' END) AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, mtch.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch JOIN sports as spt ON spt.sport_id = mtch.sport_id  JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' where NOT EXISTS (SELECT 1  from user_deactive_matches WHERE user_deactive_matches.match_id = mtch.match_id AND user_deactive_matches.user_id = " + userId + ") AND mtch.match_id IN (select match_id from favourites where favourites.match_id=mtch.match_id AND favourites.user_id=" + userId + " AND favourites.market_id=mkts.market_id)  AND NOT EXISTS (SELECT 1 from deactive_sports WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id = " + userId + ") AND spt.status='Y' AND spt.sport_id=" + data.sport_id + " AND mtch.status='Y' AND mtch.is_completed='N' AND mtch.is_cup='N' ORDER BY spt.order_by ASC, mtch.start_date ASC"
		}

		const result = await pool.request()
			.query(query)

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let marketData = result.recordset.map((data) => (data.market_id));
			let oddsData = await exchangeService.getOddsByMarketIds(marketData);
			let newdata = result.recordset.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE' } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json }
			));
			return resultdb(CONSTANTS.SUCCESS, newdata);
		}

	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getMatchListBySportSeriesIdInPlay = async (data) => {
	try {
		let userId = data.id;
		let offset = (data.pageno - 1) * data.limit;
		let inplayDate = Math.floor(Date.now() / 1000);

		let StartEndDate = new Date();

		let startDatess = StartEndDate.setHours(0, 0, 0, 0);
		let startDate = Math.floor(startDatess / 1000);

		let startDatess2 = StartEndDate.setHours(10, 00, 00, 00);
		let startDat2e = Math.floor(startDatess2 / 1000);

		let endDatess = StartEndDate.setHours(23, 59, 59, 999);
		let endDate = Math.floor(endDatess / 1000);

		var yesterday = new Date(StartEndDate);
		let yesterdays = Math.floor(yesterday.setDate(yesterday.getDate() - 1) / 1000);

		const pool = await poolPromise;

		let sportSeries = "";
		if (data.series_id != 0) {
			sportSeries = ' AND mtch.series_id=' + data.series_id;
		}

		let seriesCasino = "";
		if (data.series_id != 0) {
			seriesCasino = ' AND mtch.series_id IN ((select series_id from cassino_series with(nolock) where parent_id =(select id from cassino_series where series_id=' + data.series_id + ')))';
		}

		let seriesMatka = "";
		if (data.series_id != 0) {
			seriesMatka = ' AND mtch.series_id IN ((select series_id from matka_series with(nolock) where parent_id =(select id from matka_series with(nolock) where series_id=' + data.series_id + ')))';
		}
		let sportID = "";
		if (data.sport_id != 0) {
			sportID = data.sport_id;
		} else if (data.type == 'home') {
			sportID = 4;
		}
		let query = "";

		if (data.sport_id == CONSTANTS.BETFAIR_SPORT_CASINO) {

			query += "SELECT  spt.name as SportName, ISNULL('" + settings.imageURL + "','') + '' + ISNULL(spt.image,'') as image, '' as adminMessage, 'OPEN' AS InplayStatus,0 AS BetAllowTimeBefore, 'Y' AS IsBetAllow,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,0 as series_id, 0 as favMatchID, 0 as match_id, ''  as name,'N' AS IsFancyAllow, 0 as start_date,spt.volume_limit as matchVolumn, spt.sport_id, '' as market_id,'' as runner_json FROM sports as spt with(nolock) INNER JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = spt.sport_id AND usptset.user_id=" + userId + " and usptset.assign_sport=1 LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= spt.sport_id and dspt.user_id =" + userId + " WHERE  spt.status='Y' AND ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND spt.parent_id= " + data.sport_id + "" + seriesCasino
			//query += "SELECT  spt.name as SportName, ISNULL('" + settings.imageURL + "','') + '' + ISNULL(spt.image,'') as image, ISNULL(mkts.market_admin_message,'') as adminMessage, 'OPEN' AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, 'Y' AS IsBetAllow,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id, 0 as favMatchID, mtch.match_id, mtch.name as name,'N' AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, mtch.sport_id, mkts.market_id as market_id,mkts.runner_json FROM cassino_matches as mtch with(nolock) JOIN sports as spt with(nolock) ON spt.sport_id = mtch.sport_id  JOIN cassino_markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' INNER JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = spt.sport_id AND usptset.user_id=" + userId + " and usptset.assign_sport=1 LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id and dspt.user_id =" + userId + " WHERE  spt.status='Y' AND ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND mtch.status='Y' AND mtch.start_date <= " + inplayDate + "  AND mtch.is_cup='N' AND mkts.is_sports_active='Y' AND spt.parent_id= " + data.sport_id + "" + seriesCasino

		} else if (data.sport_id == CONSTANTS.BETFAIR_SPORT_SANGAM_MATKA_PARENT) {

			query += "SELECT  spt.name as SportName, ISNULL('" + settings.imageURL + "','') + '' + ISNULL(spt.image,'') as image, ISNULL(mkts.market_admin_message,'') as adminMessage, 'OPEN' AS InplayStatus, (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id, 0 as favMatchID, mtch.match_id, mtch.name as name,'N' AS IsFancyAllow,spt.volume_limit as matchVolumn, mtch.sport_id, mtch.start_time as start_date, mtch.end_time as end_date, mtch.draw_time as draw_date, mkts.market_id as market_id,mkts.runner_json, mtch.winner_name, mtch.last_result as currentResult, (select TOP 1 last_result from matka_matches with(nolock) where name = mtch.name AND created_at <= " + yesterdays + " order by id desc ) as lastResult, mtch.result_a, mtch.result_b, mtch.result_c FROM matka_matches as mtch with(nolock) JOIN sports as spt with(nolock) ON spt.sport_id = mtch.sport_id  JOIN matka_markets mkts with(nolock) ON mkts.match_id=mtch.match_id  AND mkts.name='OPEN' where spt.status='Y' AND mtch.status='Y' AND mtch.is_showing='Y' AND mtch.match_id IN (select MIN(match_id) as matchID from matka_markets group by match_id) AND spt.parent_id= " + sportID + " " + seriesMatka + "ORDER BY (CASE WHEN mtch.is_completed = 'N' AND mtch.end_time > " + inplayDate + " THEN ( mtch.end_time - mtch.start_time ) ELSE mtch.end_time  END) ASC";

		} else if (data.sport_id == CONSTANTS.BETFAIR_SPORT_SANGAM_LOTTERY_PARENT) {

			query += "SELECT  spt.name as SportName, ISNULL('" + settings.imageURL + "','') + '' + ISNULL(spt.image,'') as image, ISNULL(mkts.market_admin_message,'') as adminMessage, 'OPEN' AS InplayStatus, (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id, 0 as favMatchID, mtch.match_id, mtch.name as name,'N' AS IsFancyAllow,spt.volume_limit as matchVolumn, mtch.sport_id, mtch.start_time as start_date, mtch.end_time as end_date, mtch.draw_time as draw_date, mkts.market_id as market_id,mkts.runner_json, mtch.winner_name, mtch.last_result as currentResult, (select TOP 1 last_result from matka_matches with(nolock) where name = mtch.name AND created_at <= " + yesterdays + " order by id desc ) as lastResult, mtch.result_a, mtch.result_b, mtch.result_c, mtch.match_starttime, mtch.match_endtime FROM matka_matches as mtch with(nolock) JOIN sports as spt with(nolock) ON spt.sport_id = mtch.sport_id  JOIN matka_markets mkts with(nolock) ON mkts.match_id=mtch.match_id  AND mkts.name='OPEN' LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id and dspt.user_id = " + userId + " LEFT JOIN user_deactive_matches as udmtch with(nolock) ON udmtch.match_id= mtch.match_id and udmtch.user_id = " + userId + " where spt.status='Y' AND ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND ( udmtch.match_id  IS NULL OR udmtch.match_id=0) AND mtch.is_showing='Y' AND mtch.match_id IN (select MIN(match_id) as matchID from matka_markets with(nolock) group by match_id) AND spt.parent_id= " + sportID + " " + seriesMatka + "ORDER BY mtch.end_time ASC";


		} else {
			query += "SELECT   (CASE WHEN mtch.is_bookmaker='Y' THEN 1 ELSE 0 END) as bm, spt.name as SportName, series.name as seriesName,'' as image, ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET LOCKED' ELSE mkts.market_admin_message END,'') as adminMessage,(CASE WHEN EXISTS(select 1 from markets with(nolock) where match_id=mtch.match_id AND status='Y' AND is_result_declared='N' AND (isbetalowaftermatchodds='Y' OR name='Book Maker')AND (result_id IS NULL OR result_id=0)) THEN 'OPEN' ELSE CASE WHEN spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_HORSE_RACING + " OR spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_GREYHOUND_RACING + " OR spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_ELECTION + " THEN 'OPEN' ELSE 'CLOSE' END  END) AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id,ISNULL(fav.match_id ,0) as favMatchID, mtch.match_id,(CASE WHEN spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_HORSE_RACING + " OR spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_GREYHOUND_RACING + " THEN mkts.display_name ELSE  mtch.name END) as name,(CASE WHEN (dfancy.id IS NULL OR dfancy.id=0)  THEN 'Y' ELSE 'N' END) AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, mtch.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch with(nolock) JOIN sports as spt with(nolock) ON spt.sport_id = mtch.sport_id  JOIN markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds'  INNER JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = spt.sport_id AND usptset.user_id=" + userId + " and usptset.assign_sport=1 LEFT JOIN favourites as fav with(nolock) ON fav.match_id=mtch.match_id AND fav.market_id= mkts.market_id AND fav.user_id=" + userId + " LEFT JOIN deactive_fancies as dfancy with(nolock) ON dfancy.match_id= mtch.match_id and dfancy.user_id = " + userId + " LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id and dspt.user_id = " + userId + " LEFT JOIN user_deactive_matches as udmtch with(nolock) ON udmtch.match_id= mtch.match_id and udmtch.user_id = " + userId + " LEFT JOIN series  ON series.series_id=mtch.series_id where  spt.status='Y' AND ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND ( udmtch.match_id  IS NULL OR udmtch.match_id=0) AND mtch.status='Y' AND mtch.start_date <= " + inplayDate + " AND mtch.is_completed='N' AND mtch.is_cup='N' AND mtch.sport_id=" + sportID + " " + sportSeries + "  ORDER BY mtch.start_date ASC";
		}
		//console.log(query);
		const result = await pool.request().query(query)

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let marketData = result.recordset.map((data) => (data.market_id));
			let oddsData = await exchangeService.getOddsByMarketIds(marketData);
			let newdata = result.recordset.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE' } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json }
			));
			return resultdb(CONSTANTS.SUCCESS, newdata);
		}

	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};


let getMatchListBySportSeriesIdUpcomming = async (data) => {
	try {
		let userId = data.id;
		let offset = (data.pageno - 1) * 15;
		let inplayDate = Math.floor(Date.now() / 1000);
		const pool = await poolPromise;
		let sportSeries = "";
		if (data.series_id != 0) {
			sportSeries += ' AND mtch.series_id=' + data.series_id;
		}
		let sportID = "";
		if (data.sport_id != 0) {
			sportID = data.sport_id;
		} else if (data.type == 'home') {
			sportID = 4;
		}

		let query = "SELECT  (CASE WHEN mtch.is_bookmaker='Y' THEN 1 ELSE 0 END) as bm, spt.name as SportName, series.name as seriesName,'' as image, '' as casino_id,ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET LOCKED' ELSE mkts.market_admin_message END,'') as adminMessage,(CASE WHEN EXISTS(select 1 from markets with(nolock) where match_id=mtch.match_id AND status='Y' AND is_result_declared='N' AND (isbetalowaftermatchodds='Y' OR name='Book Maker')AND (result_id IS NULL OR result_id=0)) THEN 'OPEN' ELSE CASE WHEN spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_HORSE_RACING + " OR spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_GREYHOUND_RACING + " THEN 'OPEN' ELSE 'CLOSE' END  END) AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id,ISNULL(fav.match_id ,0) as favMatchID, mtch.match_id,(CASE WHEN spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_HORSE_RACING + " OR spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_GREYHOUND_RACING + " THEN mkts.display_name ELSE  mtch.name END) as name,(CASE WHEN (dfancy.id IS NULL OR dfancy.id=0) THEN 'Y' ELSE 'N' END) AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, mtch.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch JOIN sports as spt ON spt.sport_id = mtch.sport_id  JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' INNER JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = spt.sport_id AND usptset.user_id=" + userId + " and usptset.assign_sport=1 LEFT JOIN deactive_fancies as dfancy with(nolock) ON dfancy.match_id= mtch.match_id and dfancy.user_id =" + userId + " LEFT JOIN favourites as fav ON fav.match_id=mtch.match_id AND fav.market_id= mkts.market_id AND fav.user_id=" + userId + " LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id and dspt.user_id  =" + userId + " LEFT JOIN user_deactive_matches as udmtch with(nolock) ON udmtch.match_id= mtch.match_id and udmtch.user_id  =" + userId + " LEFT JOIN series  ON series.series_id=mtch.series_id where spt.status='Y'  AND ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND ( udmtch.match_id  IS NULL OR udmtch.match_id=0) AND mtch.status='Y' AND mtch.is_cup='N' AND mtch.start_date >= " + inplayDate + " AND mtch.is_completed='N' AND mtch.sport_id=" + sportID + " " + sportSeries + "";


		// if(data.series_id!=0){
		// 	query+=' AND mtch.series_id='+data.series_id;	
		// }	
		query += ' ORDER BY mtch.start_date ASC OFFSET  ' + offset + ' ROWS FETCH NEXT 15 ROWS ONLY';
		//console.log('----getMatchListBySportSeriesIdUpcomming -------------- ', query);
		const result = await pool.request().query(query);

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let marketData = result.recordset.map((data) => (data.market_id));
			let oddsData = await exchangeService.getOddsByMarketIds(marketData);
			// let newdata=result.recordset.map((data)=>(
			// 	oddsData.data[data.market_id]?{...data,runner_json:oddsData.data[data.market_id].runners}:{...data,runner_json:data.runner_json?JSON.parse(data.runner_json):data.runner_json}
			// ));

			// return resultdb(CONSTANTS.SUCCESS, newdata);
			let newdata = result.recordset.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE' } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json }
			));
			return resultdb(CONSTANTS.SUCCESS, newdata);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getCasinoMatchInPlay = async (data) => {
	try {
		let userId = data.id;
		const pool = await poolPromise;
		let sportSeries = "";
		if (data.series_id != 0) {
			sportSeries = ' AND mtch.series_id=' + data.series_id;
		}

		let seriesCasino = "";
		if (data.series_id != 0) {
			seriesCasino = ' AND mtch.series_id IN ((select series_id from cassino_series with(nolock) where parent_id =(select id from cassino_series where series_id=' + data.series_id + ')))';
		}

		let query = "";
		query += "SELECT  spt.name as SportName, ISNULL('" + settings.imageURL + "','') + '' + ISNULL(spt.image,'') as image, '' as adminMessage, 'OPEN' AS InplayStatus,0 AS BetAllowTimeBefore, 'Y' AS IsBetAllow,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,0 as series_id, 0 as favMatchID, 0 as match_id, ''  as name,'N' AS IsFancyAllow, 0 as start_date,spt.volume_limit as matchVolumn, spt.sport_id, '' as market_id,'' as runner_json FROM sports as spt with(nolock) INNER JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = spt.sport_id AND usptset.user_id=" + userId + " and usptset.assign_sport=1 LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= spt.sport_id and dspt.user_id =" + userId + " WHERE  spt.status='Y' AND ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND spt.parent_id= " + data.sport_id + "" + seriesCasino

		const result = await pool.request().query(query)

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let marketData = result.recordset.map((data) => (data.market_id));
			let oddsData = await exchangeService.getOddsByMarketIds(marketData);
			let newdata = result.recordset.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE' } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json }
			));
			return resultdb(CONSTANTS.SUCCESS, newdata);
		}

	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};
let getMatchListForDashboard = async (data) => {
	try {
		let userId = data.id;
		const pool = await poolPromise;
		let inplayDate = Math.floor(Date.now() / 1000);
		const result = await pool.request()
			.input('input_parameter', sql.VarChar(50), inplayDate)
			.input('user_id', sql.Int, userId)
			.query("select * from (SELECT spt.order_by,spt.name as SportName,ISNULL(mkts.market_admin_message,'') as adminMessage,'' AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,ISNULL(fav.match_id ,0) as favMatchID,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff, mtch.series_id, mtch.match_id, mtch.name,(CASE WHEN NOT EXISTS (SELECT 1  from deactive_fancies WHERE deactive_fancies.match_id =mtch.match_id AND deactive_fancies.user_id = @user_id ) THEN 'Y' ELSE 'N' END) AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, spt.sport_id, mkts.market_id as market_id,mkts.runner_json, ROW_NUMBER() OVER ( Partition by mtch.sport_id order by mtch.sport_id ) as row_num FROM matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' LEFT JOIN favourites as fav ON fav.match_id=mtch.match_id AND fav.market_id= mkts.market_id AND fav.user_id=@user_id where NOT EXISTS (SELECT 1  from user_deactive_matches WHERE user_deactive_matches.match_id = mtch.match_id AND user_deactive_matches.user_id = @user_id ) AND NOT EXISTS (SELECT 1 from deactive_sports WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id = @user_id) AND mtch.status='Y' AND mtch.start_date <= @input_parameter AND mtch.is_completed='N' AND mtch.is_cup='N' ) as mtchss where mtchss.sport_id IN (select sport_id from sports where sports.dashboard_inplay ='Y' AND sports.status='Y' ) AND mtchss.row_num <=2 ORDER BY mtchss.start_date ASC")
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
let getMatchListForDashboardNEW = async (data) => {
	try {
		let userId = data.id;
		//console.log('userId-----', userId);
		const pool = await poolPromise;

		let inplayDate = Math.floor(Date.now() / 1000);
		inplayDate = inplayDate + 1800;
		const result = await pool.request()
			.input('input_parameter', sql.VarChar(50), inplayDate)
			.input('user_id', sql.Int, userId)
			.query("SELECT spt.order_by,spt.name as SportName,series.name as seriesName,ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET LOCKED' ELSE mkts.market_admin_message END,'') as adminMessage, (CASE WHEN mtch.is_bookmaker='Y' THEN 1 ELSE 0 END) as bm,(CASE WHEN EXISTS(select 1 from markets with(nolock) where match_id=mtch.match_id AND status='Y' AND is_result_declared='N' AND (isbetalowaftermatchodds='Y' OR name='Book Maker') AND (result_id IS NULL OR result_id=0))  THEN 'OPEN' ELSE 'CLOSE' END) AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,ISNULL(fav.match_id ,0) as favMatchID,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff, mtch.series_id, mtch.match_id, mtch.name,(CASE WHEN  (dfancy.id IS NULL OR dfancy.id=0)  THEN 'Y' ELSE 'N' END) AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, spt.sport_id, mkts.market_id as market_id,mkts.runner_json, ROW_NUMBER() OVER ( Partition by mtch.sport_id order by mtch.sport_id ) as row_num FROM matches as mtch with(nolock) JOIN sports spt with(nolock) ON spt.sport_id=mtch.sport_id JOIN markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' LEFT JOIN favourites as fav with(nolock) ON fav.match_id=mtch.match_id AND fav.market_id= mkts.market_id AND fav.user_id=@user_id LEFT JOIN deactive_fancies as dfancy with(nolock) ON dfancy.match_id= mtch.match_id and dfancy.user_id =@user_id  LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id and dspt.user_id =@user_id LEFT JOIN user_deactive_matches as udmtch with(nolock) ON udmtch.match_id= mtch.match_id and udmtch.user_id =@user_id LEFT JOIN series  ON series.series_id=mtch.series_id  where  ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND ( udmtch.match_id  IS NULL OR udmtch.match_id=0) AND mtch.status='Y' AND mtch.is_completed='N' AND mtch.is_cup='N' AND spt.dashboard_inplay ='Y' AND spt.status='Y'  AND mtch.start_date <=@input_parameter ORDER BY mtch.start_date ASC ")

		//.query("select * from (SELECT spt.order_by,spt.name as SportName,series.name as seriesName,ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET LOCKED' ELSE mkts.market_admin_message END,'') as adminMessage, (CASE WHEN mtch.is_bookmaker='Y' THEN 1 ELSE 0 END) as bm,(CASE WHEN EXISTS(select 1 from markets with(nolock) where match_id=mtch.match_id AND status='Y' AND is_result_declared='N' AND (isbetalowaftermatchodds='Y' OR name='Book Maker') AND (result_id IS NULL OR result_id=0))  THEN 'OPEN' ELSE 'CLOSE' END) AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,ISNULL(fav.match_id ,0) as favMatchID,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff, mtch.series_id, mtch.match_id, mtch.name,(CASE WHEN  (dfancy.id IS NULL OR dfancy.id=0)  THEN 'Y' ELSE 'N' END) AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, spt.sport_id, mkts.market_id as market_id,mkts.runner_json, ROW_NUMBER() OVER ( Partition by mtch.sport_id order by mtch.sport_id ) as row_num FROM matches as mtch with(nolock) JOIN sports spt with(nolock) ON spt.sport_id=mtch.sport_id JOIN markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' LEFT JOIN favourites as fav with(nolock) ON fav.match_id=mtch.match_id AND fav.market_id= mkts.market_id AND fav.user_id=@user_id LEFT JOIN deactive_fancies as dfancy with(nolock) ON dfancy.match_id= mtch.match_id and dfancy.user_id =@user_id  LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id and dspt.user_id =@user_id LEFT JOIN user_deactive_matches as udmtch with(nolock) ON udmtch.match_id= mtch.match_id and udmtch.user_id =@user_id LEFT JOIN series  ON series.series_id=mtch.series_id  where  ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND ( udmtch.match_id  IS NULL OR udmtch.match_id=0) AND mtch.status='Y' AND mtch.is_completed='N' AND mtch.is_cup='N' ) as mtchss where mtchss.sport_id IN (select sport_id from sports where sports.dashboard_inplay ='Y' AND sports.status='Y' ) AND mtchss.row_num <=10 ORDER BY mtchss.start_date ASC")


		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let marketData = result.recordset.map((data) => (data.market_id));
			let oddsData = await exchangeService.getOddsByMarketIds(marketData);
			let newdata = result.recordset.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE' } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json }
			));
			return resultdb(CONSTANTS.SUCCESS, newdata);

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getDashboardPopularMatches = async (data) => {
	try {
		let userId = data.id;
		const pool = await poolPromise;
		let inplayDate = Math.floor(Date.now() / 1000);
		const result = await pool.request()
			.input('input_parameter', sql.VarChar(50), inplayDate)
			.input('user_id', sql.Int, userId)
			.query("SELECT spt.name as SportName,'' AS InplayStatus,ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET LOCKED' ELSE mkts.market_admin_message END,'') as adminMessage, (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,ISNULL(fav.match_id ,0) as favMatchID,mtch.series_id, mtch.match_id, mtch.name,(CASE WHEN  NOT EXISTS (SELECT 1 from deactive_fancies WHERE deactive_fancies.match_id =mtch.match_id  AND deactive_fancies.user_id =@user_id )  THEN 'Y' ELSE 'N' END) AS IsFancyAllow,  mtch.start_date, spt.volume_limit as matchVolumn, spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' LEFT JOIN favourites as fav ON fav.match_id=mtch.match_id AND fav.market_id= mkts.market_id AND fav.user_id=@user_id where NOT EXISTS(SELECT 1 from user_deactive_matches WHERE user_deactive_matches.match_id = mtch.match_id AND user_deactive_matches.user_id = @user_id) AND NOT EXISTS(SELECT 1 from deactive_sports WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id = @user_id) AND mtch.start_date >=@input_parameter AND mtch.status='Y' AND spt.status='Y' AND mtch.is_popular='Y' AND mtch.is_completed='N' AND spt.dashboard_inplay ='Y'  AND mtch.is_cup='N' ORDER BY spt.order_by ASC, mtch.start_date ASC")


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
let getDashboardPopularMatchesNEW = async (data) => {

	try {
		let userId = data.id;
		//console.log('userId----ttt-', userId);
		const pool = await poolPromise;
		let inplayDate = Math.floor(Date.now() / 1000);
		const result = await pool.request()
			.input('input_parameter', sql.VarChar(50), inplayDate)
			.input('user_id', sql.Int, userId)
			.query("SELECT spt.name as SportName,'' AS InplayStatus,ISNULL(mkts.market_admin_message,'') as adminMessage, (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,ISNULL(fav.match_id ,0) as favMatchID,mtch.series_id, mtch.match_id, mtch.name,mtch.start_date, spt.volume_limit as matchVolumn, (CASE WHEN (dfancy.id IS NULL OR dfancy.id=0) THEN 'Y' ELSE 'N' END) AS IsFancyAllow, spt.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch with(nolock) JOIN sports spt with(nolock) ON spt.sport_id=mtch.sport_id JOIN markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' LEFT JOIN favourites as fav with(nolock) ON fav.match_id=mtch.match_id AND fav.market_id= mkts.market_id AND fav.user_id=@user_id LEFT JOIN deactive_fancies as dfancy with(nolock) ON dfancy.match_id= mtch.match_id  and dfancy.user_id =@user_id  LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id and dspt.user_id =@user_id LEFT JOIN user_deactive_matches as udmtch with(nolock) ON udmtch.match_id= mtch.match_id AND  udmtch.user_id =@user_id where ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND ( udmtch.match_id  IS NULL OR udmtch.match_id=0) AND mtch.start_date >=@input_parameter AND mtch.status='Y' AND spt.status='Y' AND mtch.is_popular='Y' AND mtch.is_completed='N' AND spt.dashboard_inplay ='Y'  AND mtch.is_cup='N' ORDER BY spt.order_by ASC, mtch.start_date ASC")

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
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

let getIsCupMatches = async (data) => {

	try {
		const pool = await poolPromise;
		let inplayDate = Math.floor(Date.now() / 1000);
		const result = await pool.request()
			.input('input_parameter', sql.VarChar(50), inplayDate)
			.input('user_id', sql.Int, data.id)
			.query("SELECT mtch.series_id, mtch.match_id, mtch.name,ISNULL(mkts.market_admin_message,'') as adminMessage, mtch.sport_id, mkts.market_id as market_id FROM matches as mtch JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' where NOT EXISTS (SELECT 1  from user_deactive_matches WHERE user_deactive_matches.match_id = mtch.match_id AND user_deactive_matches.user_id = @user_id) AND NOT EXISTS (SELECT 1 from deactive_sports WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id = @user_id) AND mtch.status='Y' AND mtch.is_cup='Y' AND mtch.is_completed='N' ORDER BY mtch.start_date ASC")

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

let getDepositWidthwralDetails = async () => {

	try {
		const pool = await poolPromise;
		const result = await pool.request()
			//.input('input_parameter', sql.VarChar(50),inplayDate)	
			//.input('user_id', sql.Int, data.id)
			.query("SELECT [key],value FROM settings where [group]='Information'")

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

let isOnlinePayment = async (id) => {

	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, id)
			.query("SELECT user_front_menaul as isOnlinePayment  FROM users where id=@user_id")

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

let getMatchListBySeriesId = async (data) => {
	try {
		let userId = data.id;
		const pool = await poolPromise;
		const result = await pool.request()
			.input('series_id', sql.VarChar(50), data.series_id)
			.input('user_id', sql.Int, userId)
			.query("SELECT mtch.series_id, mtch.match_id,ISNULL(mkts.market_admin_message,'') as adminMessage,'' AS InplayStatus, mtch.name, (CASE WHEN NOT EXISTS (SELECT 1  from deactive_fancies WHERE deactive_fancies.match_id =mtch.match_id AND deactive_fancies.user_id = @user_id) THEN 'Y' ELSE 'N' END) AS IsFancyAllow,mtch.start_date, mtch.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' where NOT EXISTS (SELECT 1  from user_deactive_matches WHERE user_deactive_matches.match_id = mtch.match_id AND user_deactive_matches.user_id = @user_id) AND NOT EXISTS (SELECT 1 from deactive_sports WHERE deactive_sports.sport_id =mtch.sport_id AND deactive_sports.user_id = @user_id) AND mtch.status='Y' AND mtch.is_cup='N' AND mtch.is_completed='N' AND mtch.series_id=@series_id")
		if (result === null) {
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


let getMatchOuterListBySeriesId = async (data) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('series_id', sql.VarChar(50), data.series_id)
			.query("SELECT mtch.series_id, mtch.match_id,ISNULL(mkts.market_admin_message,'') as adminMessage,'' AS InplayStatus, mtch.name,mtch.start_date, mtch.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' AND mtch.status='Y' AND mtch.is_cup='N' AND mtch.is_completed='N' AND mtch.series_id=@series_id")
		if (result === null) {
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

let getAllSports = async (data) => {
	try {

		let userData = userModel.getUserData();
		//console.log("userData  ", userData);

		let userId = userData.id;
		let userTypeId = userData.user_type_id;
		let parentIds = userData.parent_id;

		let sportsdetails = await MysqlPool.query('call GET_ACTIVE_SPORTS_BY_USER(?)', [userId]);
		let total = 0;
		if (sportsdetails === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, sportsdetails && sportsdetails[0] ? sportsdetails[0] : []);
		}
	} catch (error) {
		//console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getAllSports_nad = async () => {

	let userData = userModel.getUserData();
	let userId = userData.id;
	let userTypeId = userData.user_type_id;
	let parentIds = userData.parent_id;

	try {
		let qry = '';
		if (userTypeId == 1) {
			qry = 'SELECT *, 0 AS is_self_deactived FROM sports;';
		}
		else {
			qry = 'SELECT a.*, (CASE WHEN (c.id IS NULL) THEN 0 ELSE 1 END) AS is_self_deactived FROM sports AS a LEFT JOIN deactive_sport AS b ON(a.sport_id = b.sport_id AND b.user_id IN(?)) LEFT JOIN deactive_sport AS c ON(a.sport_id = c.sport_id AND c.user_id = ?) WHERE a.is_active = "1" AND b.id IS NULL;';
		}

		let sportsdetails = await MysqlPool.query(qry, [parentIds.split(','), userId]);
		if (sportsdetails === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, sportsdetails);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let createSports = async (data) => {
	try {
		let resFromDB = await MysqlPool.query('INSERT INTO sports SET ?', data);
		return resultdb(CONSTANTS.SUCCESS, resFromDB);
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let updateSportsStatus = async (id) => {
	try {
		let resFromDB = await MysqlPool.query('UPDATE sports  SET is_active = IF(is_active=?, ?, ?) WHERE id in  (?)', ['1', '0', '1', id]);
		return resultdb(CONSTANTS.SUCCESS, resFromDB);
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let insertIntoDeactiveSport = async (id) => {
	try {
		//console.log('datadata  ',id);
		let resFromDB = await MysqlPool.query('UPDATE sports  SET is_active = IF(is_active=?, ?, ?) WHERE id in  (?)', ['1', '0', '1', id]);
		//let resFromDB=await Markets.create(data,{isNewRecord:true});
		//console.log('resFromDB  ',resFromDB);
		return resultdb(CONSTANTS.SUCCESS, resFromDB);
	} catch (error) {
		//console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getDeactiveSport = async (data) => {
	try {
		let resFromDB = await MysqlPool.query('SELECT user_id,sport_id FROM deactive_sport where user_id = ? and sport_id = ?', [data.user_id, parseInt(data.sport_id)]);
		if (resFromDB.length > 0) {
			return resultdb(CONSTANTS.SUCCESS, resFromDB);
		} else {
			return resultdb(CONSTANTS.NOT_FOUND);
		}
	} catch (error) {
		//console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let createDeactiveSport = async (data) => {
	try {
		let resFromDB = await MysqlPool.query('INSERT INTO deactive_sport SET ?', [data]);
		return resultdb(CONSTANTS.SUCCESS, resFromDB);
	} catch (error) {
		//console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let deleteDeactiveSport = async (data) => {
	try {
		let resFromDB = await MysqlPool.query('DELETE FROM deactive_sport WHERE user_id=? AND sport_id=?', [data.user_id, data.sport_id]);
		return resultdb(CONSTANTS.SUCCESS, resFromDB);
	} catch (error) {
		//console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getAllMarketActive = async () => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.query("select market_id as id from markets where status='Y' and is_visible='Y' and is_manual='N' AND is_result_declared='N'")
		if (result === null) {
			return resultdb(CONSTANTS.NOT_FOUND, []);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getPagesList = async (slug) => {
	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('slug', sql.VarChar(50), slug)
			.query("select id,title,excerpt,body,slug,status from pages where slug=@slug AND status='ACTIVE'")
		if (result === null) {
			return resultdb(CONSTANTS.NOT_FOUND, []);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getSportSetting = async (sport_id, match_id, market_id) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('sport_id', sql.Int, sport_id)
			.input('match_id', sql.BigInt, match_id)
			.input('market_id', sql.VarChar(150), market_id)
			.query("SELECT (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as max_odss_limit, (CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as min_odds_limit,spt.is_bet_allow,spt.status,spt.unmatch_bets FROM markets as mkts JOIN sports as spt ON spt.sport_id=mkts.sport_id where spt.sport_id =@sport_id AND mkts.match_id=@match_id AND mkts.market_id=@market_id ")

		if (result === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset[0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getCasinoSportSetting = async (sport_id, match_id, market_id) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('sport_id', sql.Int, sport_id)
			.input('match_id', sql.BigInt, match_id)
			.input('market_id', sql.VarChar(150), market_id)
			.query("SELECT (CASE WHEN mkts.max_odd_bet > 0 THEN mkts.max_odd_bet  ELSE spt.max_odss_limit  END ) as max_odss_limit, (CASE WHEN mkts.min_odd_bet > 0 THEN mkts.min_odd_bet  ELSE spt.min_odds_limit  END ) as min_odds_limit,spt.is_bet_allow,spt.status,spt.unmatch_bets FROM cassino_markets as mkts JOIN sports as spt ON spt.sport_id=mkts.sport_id where spt.sport_id =@sport_id AND mkts.match_id=@match_id AND mkts.market_id=@market_id ")

		if (result === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset[0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getSportSettingMatka = async (id) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('sport_id', sql.Int, id)
			.query("SELECT max_odss_limit,min_odds_limit,is_bet_allow,status,unmatch_bets FROM sports where sport_id =@sport_id")

		if (result === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset[0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getSlotgratorGames = async (data) => {
	try {
		let limit = 50;
		let offset = (data.page - 1) * limit;
		const pool = await poolPromise;
		const result = await pool.request()
			.input('sport_id', sql.Int, CONSTANTS.BETFAIR_SPORT_CASINO_SLOTEGRATOR)
			.input('status', sql.VarChar(10), 'Y')
			.input('offset', sql.Int, offset)
			.input('limit', sql.Int, limit)
			.query("SELECT match_id as uuid, name, freespin_valid_until_full_day, has_freespins, has_lobby, has_tables, image, is_mobile, provider, technology, type FROM slotegrator_games with(nolock) where sport_id =@sport_id  AND status=@status AND provider NOT IN('Ezugi','Betgames','Lotto Instant Win') ORDER BY(SELECT NULL) OFFSET  @offset ROWS FETCH NEXT @limit ROWS ONLY")
		//.query("SELECT match_id as uuid, name, freespin_valid_until_full_day, has_freespins, has_lobby, has_tables, image, is_mobile, provider, technology, type FROM slotegrator_games with(nolock) where sport_id =@sport_id  AND status=@status ORDER BY CASE provider WHEN 'Betgames' THEN 1  WHEN 'Ezugi' THEN 2  ELSE 3 END  OFFSET  @offset ROWS FETCH NEXT @limit ROWS ONLY")  

		if (result.recordsets[0].length === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getSlotgratorGamesBetgames = async (data) => {
	try {
		let limit = 50;
		let offset = (data.page - 1) * limit;
		const pool = await poolPromise;
		const result = await pool.request()
			.input('sport_id', sql.Int, CONSTANTS.BETFAIR_SPORT_CASINO_SLOTEGRATOR)
			.input('status', sql.VarChar(10), 'Y')
			.input('offset', sql.Int, offset)
			.input('limit', sql.Int, limit)
			.query("SELECT match_id as uuid, name, freespin_valid_until_full_day, has_freespins, has_lobby, has_tables, image, is_mobile, provider, technology, type FROM slotegrator_games with(nolock) where sport_id =@sport_id  AND status=@status AND provider='Betgames' ORDER BY(SELECT NULL) OFFSET  @offset ROWS FETCH NEXT @limit ROWS ONLY")
		//.query("SELECT match_id as uuid, name, freespin_valid_until_full_day, has_freespins, has_lobby, has_tables, image, is_mobile, provider, technology, type FROM slotegrator_games with(nolock) where sport_id =@sport_id  AND status=@status ORDER BY CASE provider WHEN 'Betgames' THEN 1  WHEN 'Ezugi' THEN 2  ELSE 3 END  OFFSET  @offset ROWS FETCH NEXT @limit ROWS ONLY")  

		if (result.recordsets[0].length === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getSlotgratorGamesEzugi = async (data) => {
	try {
		let limit = 50;
		let offset = (data.page - 1) * limit;
		const pool = await poolPromise;
		const result = await pool.request()
			.input('sport_id', sql.Int, CONSTANTS.BETFAIR_SPORT_CASINO_SLOTEGRATOR)
			.input('status', sql.VarChar(10), 'Y')
			.input('offset', sql.Int, offset)
			.input('limit', sql.Int, limit)
			.query("SELECT match_id as uuid, name, freespin_valid_until_full_day, has_freespins, has_lobby, has_tables, image, is_mobile, provider, technology, type FROM slotegrator_games with(nolock) where sport_id =@sport_id  AND status=@status AND provider='Ezugi' ORDER BY(SELECT NULL) OFFSET  @offset ROWS FETCH NEXT @limit ROWS ONLY")
		//.query("SELECT match_id as uuid, name, freespin_valid_until_full_day, has_freespins, has_lobby, has_tables, image, is_mobile, provider, technology, type FROM slotegrator_games with(nolock) where sport_id =@sport_id  AND status=@status ORDER BY CASE provider WHEN 'Betgames' THEN 1  WHEN 'Ezugi' THEN 2  ELSE 3 END  OFFSET  @offset ROWS FETCH NEXT @limit ROWS ONLY")  

		if (result.recordsets[0].length === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getSlotgratorGamesLottoInstantWin = async (data) => {
	try {
		let limit = 50;
		let offset = (data.page - 1) * limit;
		const pool = await poolPromise;
		const result = await pool.request()
			.input('sport_id', sql.Int, CONSTANTS.BETFAIR_SPORT_CASINO_SLOTEGRATOR)
			.input('status', sql.VarChar(10), 'Y')
			.input('offset', sql.Int, offset)
			.input('limit', sql.Int, limit)
			.query("SELECT match_id as uuid, name, freespin_valid_until_full_day, has_freespins, has_lobby, has_tables, image, is_mobile, provider, technology, type FROM slotegrator_games with(nolock) where sport_id =@sport_id  AND status=@status AND provider='Lotto Instant Win' ORDER BY(SELECT NULL) OFFSET  @offset ROWS FETCH NEXT @limit ROWS ONLY")
		//.query("SELECT match_id as uuid, name, freespin_valid_until_full_day, has_freespins, has_lobby, has_tables, image, is_mobile, provider, technology, type FROM slotegrator_games with(nolock) where sport_id =@sport_id  AND status=@status ORDER BY CASE provider WHEN 'Betgames' THEN 1  WHEN 'Ezugi' THEN 2  ELSE 3 END  OFFSET  @offset ROWS FETCH NEXT @limit ROWS ONLY")  

		if (result.recordsets[0].length === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getFundistGames = async (data) => {
	try {
		let limit = 50;
		let offset = (data.page - 1) * limit;
		const pool = await poolPromise;
		const result = await pool.request()
			.input('sport_id', sql.Int, CONSTANTS.BETFAIR_SPORT_CASINO_FUN)
			.input('status', sql.VarChar(10), 'Y')
			.input('offset', sql.Int, offset)
			.input('limit', sql.Int, limit)
			.query("SELECT  match_id as ID, Name, Url, Image, Description, MobileUrl, Branded, SuperBranded, hasDemo, CategoryID, SortPerCategory, MerchantID, SubMerchantID, AR, IDCountryRestriction, Sort, PageCode, MobilePageCode, MobileAndroidPageCode, MobileWindowsPageCode, ExternalCode, MobileExternalCode, ImageFullPath, WorkingHours, IsVirtual, TableID, CustomSort, RTP, BrandedNew, Freeround FROM fundist_games with(nolock) where sport_id =@sport_id  AND status=@status AND  MerchantName NOT IN('BetGames', 'LuckyStreak','SAGaming','VivoGaming','XProGaming', 'AsiaGaming','AsiaLiveTech','OrientalGame','LiveGames') ORDER BY fundist_games.id ASC OFFSET  @offset ROWS FETCH NEXT @limit ROWS ONLY")
		//.query("SELECT match_id as uuid, name, freespin_valid_until_full_day, has_freespins, has_lobby, has_tables, image, is_mobile, provider, technology, type FROM slotegrator_games with(nolock) where sport_id =@sport_id  AND status=@status ORDER BY CASE provider WHEN 'Betgames' THEN 1  WHEN 'Ezugi' THEN 2  ELSE 3 END  OFFSET  @offset ROWS FETCH NEXT @limit ROWS ONLY")  

		if (result.recordsets[0].length === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};



let getFundistGamesBetGames = async (data) => {
	try {
		let limit = 50;
		let offset = (data.page - 1) * limit;
		const pool = await poolPromise;
		const result = await pool.request()
			.input('sport_id', sql.Int, CONSTANTS.BETFAIR_SPORT_CASINO_FUN)
			.input('status', sql.VarChar(10), 'Y')
			.input('offset', sql.Int, offset)
			.input('limit', sql.Int, limit)
			.query("SELECT  match_id as ID, Name, Url, Image, Description, MobileUrl, Branded, SuperBranded, hasDemo, CategoryID, SortPerCategory, MerchantID, SubMerchantID, AR, IDCountryRestriction, Sort, PageCode, MobilePageCode, MobileAndroidPageCode, MobileWindowsPageCode, ExternalCode, MobileExternalCode, ImageFullPath, WorkingHours, IsVirtual, TableID, CustomSort, RTP, BrandedNew, Freeround FROM fundist_games with(nolock) where sport_id =@sport_id  AND status=@status AND MerchantName='BetGames' ORDER BY(SELECT NULL)  OFFSET  @offset ROWS FETCH NEXT @limit ROWS ONLY")
		if (result.recordsets[0].length === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getFundistGamesLuckyStreak = async (data) => {
	try {
		let limit = 50;
		let offset = (data.page - 1) * limit;
		const pool = await poolPromise;
		const result = await pool.request()
			.input('sport_id', sql.Int, CONSTANTS.BETFAIR_SPORT_CASINO_FUN)
			.input('status', sql.VarChar(10), 'Y')
			.input('offset', sql.Int, offset)
			.input('limit', sql.Int, limit)
			.query("SELECT  match_id as ID, Name, Url, Image, Description, MobileUrl, Branded, SuperBranded, hasDemo, CategoryID, SortPerCategory, MerchantID, SubMerchantID, AR, IDCountryRestriction, Sort, PageCode, MobilePageCode, MobileAndroidPageCode, MobileWindowsPageCode, ExternalCode, MobileExternalCode, ImageFullPath, WorkingHours, IsVirtual, TableID, CustomSort, RTP, BrandedNew, Freeround FROM fundist_games with(nolock) where sport_id =@sport_id  AND status=@status AND MerchantName='LuckyStreak' ORDER BY(SELECT NULL)  OFFSET  @offset ROWS FETCH NEXT @limit ROWS ONLY")
		if (result.recordsets[0].length === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getFundistGamesSAGaming = async (data) => {
	try {
		let limit = 50;
		let offset = (data.page - 1) * limit;
		const pool = await poolPromise;
		const result = await pool.request()
			.input('sport_id', sql.Int, CONSTANTS.BETFAIR_SPORT_CASINO_FUN)
			.input('status', sql.VarChar(10), 'Y')
			.input('offset', sql.Int, offset)
			.input('limit', sql.Int, limit)
			.query("SELECT  match_id as ID, Name, Url, Image, Description, MobileUrl, Branded, SuperBranded, hasDemo, CategoryID, SortPerCategory, MerchantID, SubMerchantID, AR, IDCountryRestriction, Sort, PageCode, MobilePageCode, MobileAndroidPageCode, MobileWindowsPageCode, ExternalCode, MobileExternalCode, ImageFullPath, WorkingHours, IsVirtual, TableID, CustomSort, RTP, BrandedNew, Freeround FROM fundist_games with(nolock) where sport_id =@sport_id  AND status=@status AND MerchantName='SAGaming' ORDER BY(SELECT NULL)  OFFSET  @offset ROWS FETCH NEXT @limit ROWS ONLY")
		if (result.recordsets[0].length === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getFundistGamesVivoGaming = async (data) => {
	try {
		let limit = 50;
		let offset = (data.page - 1) * limit;
		const pool = await poolPromise;
		const result = await pool.request()
			.input('sport_id', sql.Int, CONSTANTS.BETFAIR_SPORT_CASINO_FUN)
			.input('status', sql.VarChar(10), 'Y')
			.input('offset', sql.Int, offset)
			.input('limit', sql.Int, limit)
			.query("SELECT  match_id as ID, Name, Url, Image, Description, MobileUrl, Branded, SuperBranded, hasDemo, CategoryID, SortPerCategory, MerchantID, SubMerchantID, AR, IDCountryRestriction, Sort, PageCode, MobilePageCode, MobileAndroidPageCode, MobileWindowsPageCode, ExternalCode, MobileExternalCode, ImageFullPath, WorkingHours, IsVirtual, TableID, CustomSort, RTP, BrandedNew, Freeround FROM fundist_games with(nolock) where sport_id =@sport_id  AND status=@status AND MerchantName='VivoGaming' ORDER BY(SELECT NULL)  OFFSET  @offset ROWS FETCH NEXT @limit ROWS ONLY")
		if (result.recordsets[0].length === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getFundistGamesXProGaming = async (data) => {
	try {
		let limit = 50;
		let offset = (data.page - 1) * limit;
		const pool = await poolPromise;
		const result = await pool.request()
			.input('sport_id', sql.Int, CONSTANTS.BETFAIR_SPORT_CASINO_FUN)
			.input('status', sql.VarChar(10), 'Y')
			.input('offset', sql.Int, offset)
			.input('limit', sql.Int, limit)
			.query("SELECT  match_id as ID, Name, Url, Image, Description, MobileUrl, Branded, SuperBranded, hasDemo, CategoryID, SortPerCategory, MerchantID, SubMerchantID, AR, IDCountryRestriction, Sort, PageCode, MobilePageCode, MobileAndroidPageCode, MobileWindowsPageCode, ExternalCode, MobileExternalCode, ImageFullPath, WorkingHours, IsVirtual, TableID, CustomSort, RTP, BrandedNew, Freeround FROM fundist_games with(nolock) where sport_id =@sport_id  AND status=@status AND MerchantName='XProGaming' ORDER BY(SELECT NULL)  OFFSET  @offset ROWS FETCH NEXT @limit ROWS ONLY")
		if (result.recordsets[0].length === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};



let getFundistGamesAsiaGaming = async (data) => {
	try {
		let limit = 50;
		let offset = (data.page - 1) * limit;
		const pool = await poolPromise;
		const result = await pool.request()
			.input('sport_id', sql.Int, CONSTANTS.BETFAIR_SPORT_CASINO_FUN)
			.input('status', sql.VarChar(10), 'Y')
			.input('offset', sql.Int, offset)
			.input('limit', sql.Int, limit)
			.query("SELECT  match_id as ID, Name, Url, Image, Description, MobileUrl, Branded, SuperBranded, hasDemo, CategoryID, SortPerCategory, MerchantID, SubMerchantID, AR, IDCountryRestriction, Sort, PageCode, MobilePageCode, MobileAndroidPageCode, MobileWindowsPageCode, ExternalCode, MobileExternalCode, ImageFullPath, WorkingHours, IsVirtual, TableID, CustomSort, RTP, BrandedNew, Freeround FROM fundist_games with(nolock) where sport_id =@sport_id  AND status=@status AND MerchantName='AsiaGaming' ORDER BY(SELECT NULL)  OFFSET  @offset ROWS FETCH NEXT @limit ROWS ONLY")
		if (result.recordsets[0].length === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getFundistGamesAsiaLiveTech = async (data) => {
	try {
		let limit = 50;
		let offset = (data.page - 1) * limit;
		const pool = await poolPromise;
		const result = await pool.request()
			.input('sport_id', sql.Int, CONSTANTS.BETFAIR_SPORT_CASINO_FUN)
			.input('status', sql.VarChar(10), 'Y')
			.input('offset', sql.Int, offset)
			.input('limit', sql.Int, limit)
			.query("SELECT  match_id as ID, Name, Url, Image, Description, MobileUrl, Branded, SuperBranded, hasDemo, CategoryID, SortPerCategory, MerchantID, SubMerchantID, AR, IDCountryRestriction, Sort, PageCode, MobilePageCode, MobileAndroidPageCode, MobileWindowsPageCode, ExternalCode, MobileExternalCode, ImageFullPath, WorkingHours, IsVirtual, TableID, CustomSort, RTP, BrandedNew, Freeround FROM fundist_games with(nolock) where sport_id =@sport_id  AND status=@status AND MerchantName='AsiaLiveTech' ORDER BY(SELECT NULL)  OFFSET  @offset ROWS FETCH NEXT @limit ROWS ONLY")
		if (result.recordsets[0].length === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getFundistGamesOrientalGame = async (data) => {
	try {
		let limit = 50;
		let offset = (data.page - 1) * limit;
		const pool = await poolPromise;
		const result = await pool.request()
			.input('sport_id', sql.Int, CONSTANTS.BETFAIR_SPORT_CASINO_FUN)
			.input('status', sql.VarChar(10), 'Y')
			.input('offset', sql.Int, offset)
			.input('limit', sql.Int, limit)
			.query("SELECT  match_id as ID, Name, Url, Image, Description, MobileUrl, Branded, SuperBranded, hasDemo, CategoryID, SortPerCategory, MerchantID, SubMerchantID, AR, IDCountryRestriction, Sort, PageCode, MobilePageCode, MobileAndroidPageCode, MobileWindowsPageCode, ExternalCode, MobileExternalCode, ImageFullPath, WorkingHours, IsVirtual, TableID, CustomSort, RTP, BrandedNew, Freeround FROM fundist_games with(nolock) where sport_id =@sport_id  AND status=@status AND MerchantName='OrientalGame' ORDER BY(SELECT NULL)  OFFSET  @offset ROWS FETCH NEXT @limit ROWS ONLY")
		if (result.recordsets[0].length === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getFundistGamesLiveGames = async (data) => {
	try {
		let limit = 50;
		let offset = (data.page - 1) * limit;
		const pool = await poolPromise;
		const result = await pool.request()
			.input('sport_id', sql.Int, CONSTANTS.BETFAIR_SPORT_CASINO_FUN)
			.input('status', sql.VarChar(10), 'Y')
			.input('offset', sql.Int, offset)
			.input('limit', sql.Int, limit)
			.query("SELECT  match_id as ID, Name, Url, Image, Description, MobileUrl, Branded, SuperBranded, hasDemo, CategoryID, SortPerCategory, MerchantID, SubMerchantID, AR, IDCountryRestriction, Sort, PageCode, MobilePageCode, MobileAndroidPageCode, MobileWindowsPageCode, ExternalCode, MobileExternalCode, ImageFullPath, WorkingHours, IsVirtual, TableID, CustomSort, RTP, BrandedNew, Freeround FROM fundist_games with(nolock) where sport_id =@sport_id  AND status=@status AND MerchantName='LiveGames' ORDER BY(SELECT NULL)  OFFSET  @offset ROWS FETCH NEXT @limit ROWS ONLY")
		if (result.recordsets[0].length === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getSportOuterList = async (data) => {
	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.execute('GET_ACTIVE_SPORTS_BY_USER_FRONT_OUTER');
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


let getSeriesOuterListBySportId = async (data) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('input_parameter', sql.VarChar(50), data.sport_id)
			.query("SELECT name,sport_id,series_id,match_open,id FROM series WHERE series.sport_id=@input_parameter AND series.match_open > 0 AND status='Y' UNION ALL SELECT name,sport_id,series_id,match_open,id FROM cassino_series WHERE cassino_series.sport_id=@input_parameter AND parent_id=0 AND status='Y'")
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

let getOuterIsCupMatches = async (data) => {

	try {
		const pool = await poolPromise;
		let inplayDate = Math.floor(Date.now() / 1000);
		const result = await pool.request()
			.input('input_parameter', sql.VarChar(50), inplayDate)
			.input('user_id', sql.Int, data.id)
			.query("SELECT mtch.series_id, mtch.match_id, mtch.name,ISNULL(mkts.market_admin_message,'') as adminMessage, mtch.sport_id, mkts.market_id as market_id FROM matches as mtch JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' where mtch.status='Y' AND mtch.is_cup='Y' AND mtch.is_completed='N' ORDER BY mtch.start_date ASC")

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
let getseiresMatchsListInPlay = async (data) => {
	try {
		let userId = data.id;
		let inplayDate = Math.floor(Date.now() / 1000);
		const pool = await poolPromise;
		let offset = (data.pageno - 1) * data.limit;
		let sportSeries = "";
		if (data.series_id != 0) {
			sportSeries = ' AND mtch.series_id=' + data.series_id;
		}
		let seriesCasino = "";
		if (data.series_id != 0) {
			seriesCasino = ' AND mtch.series_id IN ((select series_id from cassino_series where parent_id =(select id from cassino_series where series_id=' + data.series_id + ')))';
		}
		let sportID = "";
		if (data.sport_id != 0) {
			sportID = " AND mtch.sport_id=" + data.sport_id;
		} else if (data.type == 'home') {
			sportID = " AND mtch.sport_id=4";
		}
		let query = "";
		if (data.sport_id == CONSTANTS.BETFAIR_SPORT_CASINO) {
			query += "SELECT  spt.name as SportName, ISNULL('" + settings.imageURL + "','') + '' + ISNULL(spt.image,'') as image, ISNULL(mkts.market_admin_message,'') as adminMessage, 'OPEN' AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id, 0 as favMatchID, mtch.match_id, mtch.name as name,'N' AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, mtch.sport_id, mkts.market_id as market_id,mkts.runner_json FROM cassino_matches (NOLOCK) as mtch JOIN sports (NOLOCK) as spt ON spt.sport_id = mtch.sport_id  JOIN cassino_markets (NOLOCK) mkts ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' where spt.status='Y' AND mtch.status='Y' AND mtch.start_date <= " + inplayDate + "  AND mtch.is_cup='N' AND mtch.match_id IN (select MIN(match_id) as matchID from cassino_markets group by sport_id) AND mtch.sport_id IN (SELECT sport_id from sports where parent_id=" + data.sport_id + ") " + seriesCasino
		} else {
			query += "SELECT  spt.name as SportName,'' as image, ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET LOCKED' ELSE mkts.market_admin_message END,'') as adminMessage,(CASE WHEN EXISTS(select 1 from markets where match_id=mtch.match_id AND status='Y' AND is_result_declared='N' AND (isbetalowaftermatchodds='Y' OR name='Book Maker')AND (result_id IS NULL OR result_id=0)) THEN 'OPEN' ELSE CASE WHEN spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_HORSE_RACING + " OR spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_GREYHOUND_RACING + " THEN 'OPEN' ELSE 'CLOSE' END  END) AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id,0 as favMatchID, mtch.match_id,(CASE WHEN spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_HORSE_RACING + " OR spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_GREYHOUND_RACING + " THEN mkts.display_name ELSE  mtch.name END) as name,'N' AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, mtch.sport_id, mkts.market_id as market_id,mkts.runner_json, series.name as seriesName FROM matches as mtch JOIN sports as spt ON spt.sport_id = mtch.sport_id LEFT JOIN series  ON series.series_id=mtch.series_id JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' where spt.status='Y' AND mtch.status='Y' AND mtch.start_date <= " + inplayDate + " AND mtch.is_completed='N' AND mtch.is_cup='N' " + sportID + " " + sportSeries + "  ORDER BY mtch.start_date ASC OFFSET  " + offset + " ROWS FETCH NEXT " + data.limit + " ROWS ONLY";
		}


		// if(data.series_id!=0){
		// 	query+=' AND mtch.series_id='+data.series_id;	
		// }
		//query+=' ORDER BY mtch.start_date ASC';
		//console.log('----- getMatchListBySportSeriesIdInPlay ------------ ', query);
		/* const result = await pool.request()
		.input('pUserId', sql.Int, data.id)
		.input('pSportId', sql.Int, data.sport_id)
		.input('pSeriesId', sql.VarChar(150), data.series_id)
		.execute('GET_MATCH_BY_SPORT_AND_SERIESID');  */

		const result = await pool.request().query(query);

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let marketData = result.recordset.map((data) => (data.market_id));
			let oddsData = await exchangeService.getOddsByMarketIds(marketData);
			let newdata = result.recordset.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE' } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json }
			));
			return resultdb(CONSTANTS.SUCCESS, newdata);
		}

	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};
let getseiresMatchsListUpcomming = async (data) => {
	try {
		let userId = data.id;
		let inplayDate = Math.floor(Date.now() / 1000);
		const pool = await poolPromise;
		let offset = (data.pageno - 1) * data.limit;
		let sportSeries = "";
		if (data.series_id != 0) {
			sportSeries += ' AND mtch.series_id=' + data.series_id;
		}
		let seriesCasino = "";
		if (data.series_id != 0) {
			seriesCasino += ' AND mtch.series_id IN ((select series_id from cassino_series where parent_id =(select id from cassino_series where series_id=' + data.series_id + ')))';
		}
		let sportID = "";
		if (data.sport_id != 0) {
			sportID = " AND mtch.sport_id=" + data.sport_id;
		} else if (data.type == 'home') {
			sportID = " AND mtch.sport_id=4";
		}

		let query = "SELECT  spt.name as SportName,'' as image, '' as casino_id,ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET LOCKED' ELSE mkts.market_admin_message END,'') as adminMessage,(CASE WHEN EXISTS(select 1 from markets where match_id=mtch.match_id AND status='Y' AND is_result_declared='N' AND (isbetalowaftermatchodds='Y' OR name='Book Maker')AND (result_id IS NULL OR result_id=0)) THEN 'OPEN' ELSE CASE WHEN spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_HORSE_RACING + " OR spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_GREYHOUND_RACING + " THEN 'OPEN' ELSE 'CLOSE' END  END) AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id,0 as favMatchID, mtch.match_id,(CASE WHEN spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_HORSE_RACING + " OR spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_GREYHOUND_RACING + " THEN mkts.display_name ELSE  mtch.name END) as name, 'N'  AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, mtch.sport_id, mkts.market_id as market_id,mkts.runner_json, series.name as seriesName FROM matches as mtch JOIN sports as spt ON spt.sport_id = mtch.sport_id  JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' LEFT JOIN series  ON series.series_id=mtch.series_id where spt.status='Y' AND mtch.status='Y' AND mtch.is_cup='N' AND mtch.start_date >= " + inplayDate + " AND mtch.is_completed='N'  " + sportID + " " + sportSeries + "";


		// if(data.series_id!=0){
		// 	query+=' AND mtch.series_id='+data.series_id;	
		// }	
		query += " ORDER BY mtch.start_date ASC OFFSET  " + offset + " ROWS FETCH NEXT " + data.limit + " ROWS ONLY ";
		//console.log('----getMatchListBySportSeriesIdUpcomming -------------- ', query);
		const result = await pool.request()
			.query(query)
		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let marketData = result.recordset.map((data) => (data.market_id));
			let oddsData = await exchangeService.getOddsByMarketIds(marketData);
			// let newdata=result.recordset.map((data)=>(
			// 	oddsData.data[data.market_id]?{...data,runner_json:oddsData.data[data.market_id].runners}:{...data,runner_json:data.runner_json?JSON.parse(data.runner_json):data.runner_json}
			// ));

			// return resultdb(CONSTANTS.SUCCESS, newdata);
			let newdata = result.recordset.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE' } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json }
			));
			return resultdb(CONSTANTS.SUCCESS, newdata);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getInPlaySportsLength = async (data) => {
	try {
		let userId = data.id;
		let offset = (data.pageno - 1) * data.limit;
		let inplayDate = Math.floor(Date.now() / 1000);
		let StartEndDate = new Date();
		let startDatess = StartEndDate.setHours(0, 0, 0, 0);
		let startDate = Math.floor(startDatess / 1000);
		let startDatess2 = StartEndDate.setHours(10, 0, 0, 0);
		let startDat2e = Math.floor(startDatess2 / 1000);
		let endDatess = StartEndDate.setHours(23, 59, 59, 999);
		let endDate = Math.floor(endDatess / 1000);
		var yesterday = new Date(StartEndDate);
		let yesterdays = Math.floor(yesterday.setDate(yesterday.getDate() - 1) / 1000);

		const pool = await poolPromise;

		let sportSeries = "";
		if (data.series_id != 0) {
			sportSeries = ' AND mtch.series_id=' + data.series_id;
		}

		let seriesCasino = "";
		if (data.series_id != 0) {
			seriesCasino = ' AND mtch.series_id IN ((select series_id from cassino_series with(nolock) where parent_id =(select id from cassino_series where series_id=' + data.series_id + ')))';
		}

		let seriesMatka = "";
		if (data.series_id != 0) {
			seriesMatka = ' AND mtch.series_id IN ((select series_id from matka_series with(nolock) where parent_id =(select id from matka_series with(nolock) where series_id=' + data.series_id + ')))';
		}

		let sportID = [2];

		if (data.sport_id === 1 || data.sport_id === 4) {
			sportID = [data.sport_id];
		} else if (data.type === "home") {
			sportID = [2, 4, 1];
		} else if (data.sport_id === CONSTANTS.BETFAIR_SPORT_CASINO) {
			sportID = [CONSTANTS.BETFAIR_SPORT_CASINO];
		}

		let query = "";

		if (sportID.includes(CONSTANTS.BETFAIR_SPORT_CASINO)) {
			query += "SELECT  spt.name as SportName, ISNULL('" + settings.imageURL + "','') + '' + ISNULL(spt.image,'') as image, '' as adminMessage, 'OPEN' AS InplayStatus,0 AS BetAllowTimeBefore, 'Y' AS IsBetAllow,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,0 as series_id, 0 as favMatchID, 0 as match_id, ''  as name,'N' AS IsFancyAllow, 0 as start_date,spt.volume_limit as matchVolumn, spt.sport_id, '' as market_id,'' as runner_json FROM sports as spt with(nolock) INNER JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = spt.sport_id AND usptset.user_id=" + userId + " and usptset.assign_sport=1 LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= spt.sport_id and dspt.user_id =" + userId + " WHERE  spt.status='Y' AND ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND spt.parent_id= " + sportID + "" + seriesCasino;
		} else {
			query += "SELECT (CASE WHEN mtch.is_bookmaker='Y' THEN 1 ELSE 0 END) as bm, spt.name as SportName, series.name as seriesName,'' as image, ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET LOCKED' ELSE mkts.market_admin_message END,'') as adminMessage,(CASE WHEN EXISTS(select 1 from markets with(nolock) where match_id=mtch.match_id AND status='Y' AND is_result_declared='N' AND (isbetalowaftermatchodds='Y' OR name='Book Maker')AND (result_id IS NULL OR result_id=0)) THEN 'OPEN' ELSE CASE WHEN spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_HORSE_RACING + " OR spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_GREYHOUND_RACING + " OR spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_ELECTION + " THEN 'OPEN' ELSE 'CLOSE' END  END) AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id,ISNULL(fav.match_id ,0) as favMatchID, mtch.match_id,(CASE WHEN spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_HORSE_RACING + " OR spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_GREYHOUND_RACING + " THEN mkts.display_name ELSE  mtch.name END) as name,(CASE WHEN (dfancy.id IS NULL OR dfancy.id=0)  THEN 'Y' ELSE 'N' END) AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, mtch.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch with(nolock) JOIN sports as spt with(nolock) ON spt.sport_id = mtch.sport_id  JOIN markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds'  INNER JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = spt.sport_id AND usptset.user_id=" + userId + " and usptset.assign_sport=1 LEFT JOIN favourites as fav with(nolock) ON fav.match_id=mtch.match_id AND fav.market_id= mkts.market_id AND fav.user_id=" + userId + " LEFT JOIN deactive_fancies as dfancy with(nolock) ON dfancy.match_id= mtch.match_id and dfancy.user_id = " + userId + " LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id and dspt.user_id = " + userId + " LEFT JOIN user_deactive_matches as udmtch with(nolock) ON udmtch.match_id= mtch.match_id and udmtch.user_id = " + userId + " LEFT JOIN series  ON series.series_id=mtch.series_id where  spt.status='Y' AND ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND ( udmtch.match_id  IS NULL OR udmtch.match_id=0) AND mtch.status='Y' AND mtch.start_date <= " + inplayDate + " AND mtch.is_completed='N' AND mtch.is_cup='N' AND mtch.sport_id IN (" + sportID.join(",") + ") " + sportSeries + "  ORDER BY mtch.start_date ASC";
		}

		const result = await pool.request().query(query);

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let groupedBySport = result.recordset.reduce((acc, curr) => {
				acc[curr.sport_id] = acc[curr.sport_id] || [];
				acc[curr.sport_id].push(curr);
				return acc;
			}, {});

			let sportCounts = {
				cricketLength: groupedBySport[4] ? groupedBySport[4].length : 0,
				tennisLength: groupedBySport[2] ? groupedBySport[2].length : 0,
				soccerLength: groupedBySport[1] ? groupedBySport[1].length : 0,
			};

			let marketData = result.recordset.map((data) => data.market_id);
			let oddsData = await exchangeService.getOddsByMarketIds(marketData);
			let newdata = result.recordset.map((data) =>
				oddsData.data[data.market_id]
					? {
						...data,
						runner_json: oddsData.data[data.market_id].runners,
						InplayStatus: oddsData.data[data.market_id].status || 'CLOSE',
					}
					: {
						...data,
						runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json,
					}
			);

			return resultdb(CONSTANTS.SUCCESS, {
				...sportCounts,

			});
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}

};

const getCricketUpcomingLength = async (data) => {
	try {
		let userId = 7;
		let offset = (data.pageno - 1) * 15;
		let inplayDate = Math.floor(Date.now() / 1000);
		const pool = await poolPromise;
		let sportSeries = "";
		if (data.series_id != 0) {
			sportSeries += ' AND mtch.series_id=' + data.series_id;
		}
		let sportID = "4";
		if (data.sport_id != 0) {
			sportID = data.sport_id;
		} else if (data.type == 'home') {
			sportID = 4;
		}

		let query = "SELECT  (CASE WHEN mtch.is_bookmaker='Y' THEN 1 ELSE 0 END) as bm, spt.name as SportName, series.name as seriesName,'' as image, '' as casino_id,ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET LOCKED' ELSE mkts.market_admin_message END,'') as adminMessage,(CASE WHEN EXISTS(select 1 from markets with(nolock) where match_id=mtch.match_id AND status='Y' AND is_result_declared='N' AND (isbetalowaftermatchodds='Y' OR name='Book Maker')AND (result_id IS NULL OR result_id=0)) THEN 'OPEN' ELSE CASE WHEN spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_HORSE_RACING + " OR spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_GREYHOUND_RACING + " THEN 'OPEN' ELSE 'CLOSE' END  END) AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id,ISNULL(fav.match_id ,0) as favMatchID, mtch.match_id,(CASE WHEN spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_HORSE_RACING + " OR spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_GREYHOUND_RACING + " THEN mkts.display_name ELSE  mtch.name END) as name,(CASE WHEN (dfancy.id IS NULL OR dfancy.id=0) THEN 'Y' ELSE 'N' END) AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, mtch.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch JOIN sports as spt ON spt.sport_id = mtch.sport_id  JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' INNER JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = spt.sport_id AND usptset.user_id=" + userId + " and usptset.assign_sport=1 LEFT JOIN deactive_fancies as dfancy with(nolock) ON dfancy.match_id= mtch.match_id and dfancy.user_id =" + userId + " LEFT JOIN favourites as fav ON fav.match_id=mtch.match_id AND fav.market_id= mkts.market_id AND fav.user_id=" + userId + " LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id and dspt.user_id  =" + userId + " LEFT JOIN user_deactive_matches as udmtch with(nolock) ON udmtch.match_id= mtch.match_id and udmtch.user_id  =" + userId + " LEFT JOIN series  ON series.series_id=mtch.series_id where spt.status='Y'  AND ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND ( udmtch.match_id  IS NULL OR udmtch.match_id=0) AND mtch.status='Y' AND mtch.is_cup='N' AND mtch.start_date >= " + inplayDate + " AND mtch.is_completed='N' AND mtch.sport_id=" + sportID + " " + sportSeries + "";
	
		query += ' ORDER BY mtch.start_date ASC OFFSET  ' + offset + ' ROWS FETCH NEXT 15 ROWS ONLY';
		const result = await pool.request().query(query);

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let marketData = result.recordset.map((data) => (data.market_id));
			let oddsData = await exchangeService.getOddsByMarketIds(marketData);

			let newdata = result.recordset.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE' } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json }
			));
			return resultdb(CONSTANTS.SUCCESS, newdata);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}

const getTennisUpcomingLength = async (data) => {
	try {
		let userId = 7;
		let offset = (data.pageno - 1) * 15;
		let inplayDate = Math.floor(Date.now() / 1000);
		const pool = await poolPromise;
		let sportSeries = "";
		if (data.series_id != 0) {
			sportSeries += ' AND mtch.series_id=' + data.series_id;
		}
		let sportID = "4";
		if (data.sport_id != 0) {
			sportID = data.sport_id;
		} else if (data.type == 'home') {
			sportID = 2;
		}

		let query = "SELECT  (CASE WHEN mtch.is_bookmaker='Y' THEN 1 ELSE 0 END) as bm, spt.name as SportName, series.name as seriesName,'' as image, '' as casino_id,ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET LOCKED' ELSE mkts.market_admin_message END,'') as adminMessage,(CASE WHEN EXISTS(select 1 from markets with(nolock) where match_id=mtch.match_id AND status='Y' AND is_result_declared='N' AND (isbetalowaftermatchodds='Y' OR name='Book Maker')AND (result_id IS NULL OR result_id=0)) THEN 'OPEN' ELSE CASE WHEN spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_HORSE_RACING + " OR spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_GREYHOUND_RACING + " THEN 'OPEN' ELSE 'CLOSE' END  END) AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id,ISNULL(fav.match_id ,0) as favMatchID, mtch.match_id,(CASE WHEN spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_HORSE_RACING + " OR spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_GREYHOUND_RACING + " THEN mkts.display_name ELSE  mtch.name END) as name,(CASE WHEN (dfancy.id IS NULL OR dfancy.id=0) THEN 'Y' ELSE 'N' END) AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, mtch.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch JOIN sports as spt ON spt.sport_id = mtch.sport_id  JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' INNER JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = spt.sport_id AND usptset.user_id=" + userId + " and usptset.assign_sport=1 LEFT JOIN deactive_fancies as dfancy with(nolock) ON dfancy.match_id= mtch.match_id and dfancy.user_id =" + userId + " LEFT JOIN favourites as fav ON fav.match_id=mtch.match_id AND fav.market_id= mkts.market_id AND fav.user_id=" + userId + " LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id and dspt.user_id  =" + userId + " LEFT JOIN user_deactive_matches as udmtch with(nolock) ON udmtch.match_id= mtch.match_id and udmtch.user_id  =" + userId + " LEFT JOIN series  ON series.series_id=mtch.series_id where spt.status='Y'  AND ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND ( udmtch.match_id  IS NULL OR udmtch.match_id=0) AND mtch.status='Y' AND mtch.is_cup='N' AND mtch.start_date >= " + inplayDate + " AND mtch.is_completed='N' AND mtch.sport_id=" + sportID + " " + sportSeries + "";


		query += ' ORDER BY mtch.start_date ASC OFFSET  ' + offset + ' ROWS FETCH NEXT 15 ROWS ONLY';
		const result = await pool.request().query(query);

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let marketData = result.recordset.map((data) => (data.market_id));
			let oddsData = await exchangeService.getOddsByMarketIds(marketData);

			let newdata = result.recordset.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE' } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json }
			));
			return resultdb(CONSTANTS.SUCCESS, newdata);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}

const getSoccerUpcomingLength = async (data) => {
	try {
		let userId =7;
		let offset = (data.pageno - 1) * 15;
		let inplayDate = Math.floor(Date.now() / 1000);
		const pool = await poolPromise;
		let sportSeries = "";
		if (data.series_id != 0) {
			sportSeries += ' AND mtch.series_id=' + data.series_id;
		}
		let sportID = "4";
		if (data.sport_id != 0) {
			sportID = data.sport_id;
		} else if (data.type == 'home') {
			sportID = 1;
		}

		let query = "SELECT  (CASE WHEN mtch.is_bookmaker='Y' THEN 1 ELSE 0 END) as bm, spt.name as SportName, series.name as seriesName,'' as image, '' as casino_id,ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET LOCKED' ELSE mkts.market_admin_message END,'') as adminMessage,(CASE WHEN EXISTS(select 1 from markets with(nolock) where match_id=mtch.match_id AND status='Y' AND is_result_declared='N' AND (isbetalowaftermatchodds='Y' OR name='Book Maker')AND (result_id IS NULL OR result_id=0)) THEN 'OPEN' ELSE CASE WHEN spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_HORSE_RACING + " OR spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_GREYHOUND_RACING + " THEN 'OPEN' ELSE 'CLOSE' END  END) AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id,ISNULL(fav.match_id ,0) as favMatchID, mtch.match_id,(CASE WHEN spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_HORSE_RACING + " OR spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_GREYHOUND_RACING + " THEN mkts.display_name ELSE  mtch.name END) as name,(CASE WHEN (dfancy.id IS NULL OR dfancy.id=0) THEN 'Y' ELSE 'N' END) AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, mtch.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch JOIN sports as spt ON spt.sport_id = mtch.sport_id  JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' INNER JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = spt.sport_id AND usptset.user_id=" + userId + " and usptset.assign_sport=1 LEFT JOIN deactive_fancies as dfancy with(nolock) ON dfancy.match_id= mtch.match_id and dfancy.user_id =" + userId + " LEFT JOIN favourites as fav ON fav.match_id=mtch.match_id AND fav.market_id= mkts.market_id AND fav.user_id=" + userId + " LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id and dspt.user_id  =" + userId + " LEFT JOIN user_deactive_matches as udmtch with(nolock) ON udmtch.match_id= mtch.match_id and udmtch.user_id  =" + userId + " LEFT JOIN series  ON series.series_id=mtch.series_id where spt.status='Y'  AND ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND ( udmtch.match_id  IS NULL OR udmtch.match_id=0) AND mtch.status='Y' AND mtch.is_cup='N' AND mtch.start_date >= " + inplayDate + " AND mtch.is_completed='N' AND mtch.sport_id=" + sportID + " " + sportSeries + "";


		query += ' ORDER BY mtch.start_date ASC OFFSET  ' + offset + ' ROWS FETCH NEXT 15 ROWS ONLY';
		const result = await pool.request().query(query);

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let marketData = result.recordset.map((data) => (data.market_id));
			let oddsData = await exchangeService.getOddsByMarketIds(marketData);
			let newdata = result.recordset.map((data) => (
				oddsData.data[data.market_id] ? { ...data, runner_json: oddsData.data[data.market_id].runners, InplayStatus: oddsData.data[data.market_id].status ? oddsData.data[data.market_id].status : 'CLOSE' } : { ...data, runner_json: data.runner_json ? JSON.parse(data.runner_json) : data.runner_json }
			));
			return resultdb(CONSTANTS.SUCCESS, newdata);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}


let getRunningMarketAnalysis = async (data) => {
	try {
		let userId = data.id;
		let offset = (data.pageno - 1) * data.limit;
		let inplayDate = Math.floor(Date.now() / 1000);
		let StartEndDate = new Date();
		let startDatess = StartEndDate.setHours(0, 0, 0, 0);
		let startDate = Math.floor(startDatess / 1000);
		let startDatess2 = StartEndDate.setHours(10, 0, 0, 0);
		let startDat2e = Math.floor(startDatess2 / 1000);
		let endDatess = StartEndDate.setHours(23, 59, 59, 999);
		let endDate = Math.floor(endDatess / 1000);
		var yesterday = new Date(StartEndDate);
		let yesterdays = Math.floor(yesterday.setDate(yesterday.getDate() - 1) / 1000);

		const pool = await poolPromise;

		let sportSeries = "";
		if (data.series_id != 0) {
			sportSeries = ' AND mtch.series_id=' + data.series_id;
		}

		let seriesCasino = "";
		if (data.series_id != 0) {
			seriesCasino = ' AND mtch.series_id IN ((select series_id from cassino_series with(nolock) where parent_id =(select id from cassino_series where series_id=' + data.series_id + ')))';
		}

		let seriesMatka = "";
		if (data.series_id != 0) {
			seriesMatka = ' AND mtch.series_id IN ((select series_id from matka_series with(nolock) where parent_id =(select id from matka_series with(nolock) where series_id=' + data.series_id + ')))';
		}

		let sportID = [2];

		if (data.sport_id === 1 || data.sport_id === 4) {
			sportID = [data.sport_id];
		} else if (data.type === "home") {
			sportID = [2, 4, 1];
		} else if (data.sport_id === CONSTANTS.BETFAIR_SPORT_CASINO) {
			sportID = [CONSTANTS.BETFAIR_SPORT_CASINO];
		}

		let query = "";

		if (sportID.includes(CONSTANTS.BETFAIR_SPORT_CASINO)) {
			query += "SELECT  spt.name as SportName, ISNULL('" + settings.imageURL + "','') + '' + ISNULL(spt.image,'') as image, '' as adminMessage, 'OPEN' AS InplayStatus,0 AS BetAllowTimeBefore, 'Y' AS IsBetAllow,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,0 as series_id, 0 as favMatchID, 0 as match_id, ''  as name,'N' AS IsFancyAllow, 0 as start_date,spt.volume_limit as matchVolumn, spt.sport_id, '' as market_id,'' as runner_json FROM sports as spt with(nolock) INNER JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = spt.sport_id AND usptset.user_id=" + userId + " and usptset.assign_sport=1 LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= spt.sport_id and dspt.user_id =" + userId + " WHERE  spt.status='Y' AND ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND spt.parent_id= " + sportID + "" + seriesCasino;
		} else {
			query += "SELECT (CASE WHEN mtch.is_bookmaker='Y' THEN 1 ELSE 0 END) as bm, spt.name as SportName, series.name as seriesName,'' as image, ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET LOCKED' ELSE mkts.market_admin_message END,'') as adminMessage,(CASE WHEN EXISTS(select 1 from markets with(nolock) where match_id=mtch.match_id AND status='Y' AND is_result_declared='N' AND (isbetalowaftermatchodds='Y' OR name='Book Maker')AND (result_id IS NULL OR result_id=0)) THEN 'OPEN' ELSE CASE WHEN spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_HORSE_RACING + " OR spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_GREYHOUND_RACING + " OR spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_ELECTION + " THEN 'OPEN' ELSE 'CLOSE' END  END) AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id,ISNULL(fav.match_id ,0) as favMatchID, mtch.match_id,(CASE WHEN spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_HORSE_RACING + " OR spt.sport_id=" + CONSTANTS.BETFAIR_SPORT_GREYHOUND_RACING + " THEN mkts.display_name ELSE  mtch.name END) as name,(CASE WHEN (dfancy.id IS NULL OR dfancy.id=0)  THEN 'Y' ELSE 'N' END) AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, mtch.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch with(nolock) JOIN sports as spt with(nolock) ON spt.sport_id = mtch.sport_id  JOIN markets mkts with(nolock) ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds'  INNER JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = spt.sport_id AND usptset.user_id=" + userId + " and usptset.assign_sport=1 LEFT JOIN favourites as fav with(nolock) ON fav.match_id=mtch.match_id AND fav.market_id= mkts.market_id AND fav.user_id=" + userId + " LEFT JOIN deactive_fancies as dfancy with(nolock) ON dfancy.match_id= mtch.match_id and dfancy.user_id = " + userId + " LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id and dspt.user_id = " + userId + " LEFT JOIN user_deactive_matches as udmtch with(nolock) ON udmtch.match_id= mtch.match_id and udmtch.user_id = " + userId + " LEFT JOIN series  ON series.series_id=mtch.series_id where  spt.status='Y' AND ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND ( udmtch.match_id  IS NULL OR udmtch.match_id=0) AND mtch.status='Y' AND mtch.start_date <= " + inplayDate + " AND mtch.is_completed='N' AND mtch.is_cup='N' AND mtch.sport_id IN (" + sportID.join(",") + ") " + sportSeries + "  ORDER BY mtch.start_date ASC";
		}

		const result = await pool.request().query(query);
		// const matchIds = result.recordset.map(record => record.match_id);
		if (result === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}
		
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};

let IndiaBetgetMatchListBySportId = async (data) => {
    try {
        let userId = data.id;
        const pool = await poolPromise;

        const query = `
            SELECT mtch.sport_id, mtch.match_id, ISNULL(mkts.market_admin_message, '') as adminMessage,
                   '' AS InplayStatus, mtch.name,
                   (CASE WHEN NOT EXISTS (
                        SELECT 1 FROM deactive_fancies
                        WHERE deactive_fancies.match_id = mtch.match_id
                          AND deactive_fancies.user_id = @user_id
                    ) THEN 'Y' ELSE 'N' END) AS IsFancyAllow,
                   mtch.start_date,
                   mkts.market_id AS market_id, mkts.runner_json
            FROM matches AS mtch
            JOIN markets mkts ON mkts.match_id = mtch.match_id AND mkts.name = 'Match Odds'
            WHERE NOT EXISTS (
                      SELECT 1 FROM user_deactive_matches
                      WHERE user_deactive_matches.match_id = mtch.match_id
                        AND user_deactive_matches.user_id = @user_id
                  )
              AND NOT EXISTS (
                      SELECT 1 FROM deactive_sports
                      WHERE deactive_sports.sport_id = mtch.sport_id
                        AND deactive_sports.user_id = @user_id
                  )
              AND mtch.status = 'Y' AND mtch.is_cup = 'N' AND mtch.is_completed = 'N'
              AND mtch.sport_id = @sport_id`;

        const result = await pool.request()
            .input('sport_id', sql.Int, data.sport_id)
            .input('user_id', sql.Int, userId)
            .query(query);

        if (!result || !result.recordset.length) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        }

        let marketData = result.recordset.map(data => data.market_id);
        let oddsData = await exchangeService.getOddsByMarketIds(marketData).catch((err) => {
            console.error("Error fetching odds data:", err.message);
            return { data: {} };
        });

			let newdata = result.recordset.map(data => {
			const odds = oddsData.data[data.market_id]; 
			return {
				...data,
				runner_json: (() => {
					try {
						if (odds && odds.runners) {
							return odds.runners;
						} else if (data.runner_json) {
							return JSON.parse(data.runner_json);
						} else {
							return null;
						}
					} catch (err) {
						console.error("Invalid runner_json:", err.message);
						return null;
					}
				})(),
				InplayStatus: odds && odds.status ? odds.status : 'CLOSE', 
			};
		});
        return resultdb(CONSTANTS.SUCCESS, newdata);
    } catch (error) {
        console.error("Error in IndiaBetgetMatchListBySportId:", error.message, error.stack);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

let allLiveSportsList = async (data) => {
	try {
		let userId = data.id
		let offset = (data.pageno - 1) * data.limit;
		let inplayDate = Math.floor(Date.now() / 1000);
		let StartEndDate = new Date();
		let startDatess = StartEndDate.setHours(0, 0, 0, 0);
		let startDate = Math.floor(startDatess / 1000);
		let startDatess2 = StartEndDate.setHours(10, 0, 0, 0);
		let startDat2e = Math.floor(startDatess2 / 1000);
		let endDatess = StartEndDate.setHours(23, 59, 59, 999);
		let endDate = Math.floor(endDatess / 1000);
		var yesterday = new Date(StartEndDate);
		let yesterdays = Math.floor(yesterday.setDate(yesterday.getDate() - 1) / 1000);

		const pool = await poolPromise;

		let sportSeries = "";
		if (data.series_id != 0) {
			sportSeries = ' AND mtch.series_id=' + data.series_id;
		}

		let seriesCasino = "";
		if (data.series_id != 0) {
			seriesCasino = ' AND mtch.series_id IN ((select series_id from cassino_series with(nolock) where parent_id =(select id from cassino_series where series_id=' + data.series_id + ')))';
		}

		let seriesMatka = "";
		if (data.series_id != 0) {
			seriesMatka = ' AND mtch.series_id IN ((select series_id from matka_series with(nolock) where parent_id =(select id from matka_series with(nolock) where series_id=' + data.series_id + ')))';
		}

		let sportID = [2];

		if (data.sport_id === 1 || data.sport_id === 4) {
			sportID = [data.sport_id];
		} else if (data.type === "home") {
			sportID = [2, 4, 1];
		} else if (data.sport_id === CONSTANTS.BETFAIR_SPORT_CASINO) {
			sportID = [CONSTANTS.BETFAIR_SPORT_CASINO];
		}


		let query = "";
		if (data.sport_id == CONSTANTS.BETFAIR_SPORT_CASINO) { query += "SELECT spt.name as SportName, ISNULL('${settings.imageURL}', '') + '' + ISNULL(spt.image, '') as image, ISNULL(mkts.market_admin_message, '') as adminMessage, 'OPEN' AS InplayStatus, (CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, spt.odd_limit_back as backRateDiff, spt.odd_limit_lay as layRateDiff, mtch.series_id, 0 as favMatchID, mtch.match_id, mtch.name as name, 'N' AS IsFancyAllow, mtch.start_date, spt.volume_limit as matchVolumn, mtch.sport_id, mkts.market_id as market_id FROM cassino_matches AS mtch WITH (NOLOCK) JOIN sports AS spt WITH (NOLOCK) ON spt.sport_id = mtch.sport_id JOIN cassino_markets AS mkts WITH (NOLOCK) ON mkts.match_id = mtch.match_id AND mkts.name = 'Match Odds' WHERE spt.status = 'Y' AND mtch.status = 'Y' AND mtch.start_date <= ${inplayDate} AND mtch.is_cup = 'N' AND mtch.match_id IN (SELECT MIN(match_id) AS matchID FROM cassino_markets GROUP BY sport_id) AND mtch.sport_id IN (SELECT sport_id FROM sports WHERE parent_id = ${data.sport_id}) ${seriesCasino}"; }
		else {
			query += `
				SELECT 
					spt.name AS SportName, 
					'' AS image, 
					ISNULL(CASE WHEN mtch.is_bet_allow = 'N' THEN 'BET LOCKED' ELSE mkts.market_admin_message END, '') AS adminMessage,
					(CASE WHEN EXISTS (
						SELECT 1 
						FROM markets 
						WHERE match_id = mtch.match_id 
						AND status = 'Y' 
						AND is_result_declared = 'N' 
						AND (isbetalowaftermatchodds = 'Y' OR name = 'Book Maker') 
						AND (result_id IS NULL OR result_id = 0)
					) THEN 'OPEN' ELSE 
						CASE 
							WHEN spt.sport_id = ${CONSTANTS.BETFAIR_SPORT_HORSE_RACING} 
								OR spt.sport_id = ${CONSTANTS.BETFAIR_SPORT_GREYHOUND_RACING} 
							THEN 'OPEN' 
							ELSE 'CLOSE' 
						END 
					END) AS InplayStatus,
					(CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, 
					(CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,
					spt.odd_limit_back AS backRateDiff,
					spt.odd_limit_lay AS layRateDiff,
					mtch.series_id, 
					0 AS favMatchID, 
					mtch.match_id,
					(CASE 
						WHEN spt.sport_id = ${CONSTANTS.BETFAIR_SPORT_HORSE_RACING} 
							OR spt.sport_id = ${CONSTANTS.BETFAIR_SPORT_GREYHOUND_RACING} 
						THEN mkts.display_name 
						ELSE mtch.name 
					END) AS name,
					'N' AS IsFancyAllow, 
					mtch.start_date,
					spt.volume_limit AS matchVolumn, 
					mtch.sport_id, 
					mkts.market_id AS market_id, 
					series.name AS seriesName 
				FROM matches AS mtch 
				WITH (NOLOCK)
				JOIN sports AS spt 
				ON spt.sport_id = mtch.sport_id
				LEFT JOIN series 
				ON series.series_id = mtch.series_id
				JOIN markets AS mkts 
				ON mkts.match_id = mtch.match_id 
				AND mkts.name = 'Match Odds'
				WHERE spt.status = 'Y' 
					AND mtch.status = 'Y' 
					AND mtch.start_date <= ${inplayDate} 
					AND mtch.is_completed = 'N' 
					AND mtch.is_cup = 'N'
					AND mtch.sport_id IN (${sportID.join(",")}) 
					${sportSeries}
				ORDER BY mtch.start_date ASC 
				OFFSET ${offset} ROWS FETCH NEXT ${data.limit} ROWS ONLY
			`;
		}

		const result = await pool.request().query(query);

		if (result.recordset === null || result.recordset.length === 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			let marketData = result.recordset.map((data) => data.market_id);
			let oddsData = await exchangeService.getOddsByMarketIds(marketData);

			let newdata = result.recordset
				.map((data) =>
					oddsData.data[data.market_id]
						? {
							...data,
							InplayStatus: oddsData.data[data.market_id].status || 'CLOSE',
						}
						: {
							...data,
						}
				)
				.sort((a, b) => {
					if (a.SportName.toLowerCase() === 'cricket' && b.SportName.toLowerCase() !== 'cricket') {
						return -1;
					}
					if (a.SportName.toLowerCase() !== 'cricket' && b.SportName.toLowerCase() === 'cricket') {
						return 1; 
					}
					return 0; 
				});


			return resultdb(CONSTANTS.SUCCESS, newdata);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}

};



module.exports = {
	getAllSports,
	createSports,
	updateSportsStatus,
	insertIntoDeactiveSport,
	deleteDeactiveSport,
	getDeactiveSport,
	createDeactiveSport,
	getSportList,
	getSeriesListBySportId,
	getMatchListBySportSeriesIdInPlay,
	getMatchListBySportSeriesIdUpcomming,
	getMatchListForDashboard,
	getDashboardPopularMatches,
	getMatchListBySeriesId,
	getDashboardPopularMatchesNEW,
	getMatchListForDashboardNEW,
	getIsCupMatches,
	getAllMarketActive,
	getPagesList,
	getInplayMatchesList,
	getUpcomingMatchesList,
	getFavoriteMatchesList,
	getSportSetting,
	getDepositWidthwralDetails,
	getCasinoSportSetting,
	getSportSettingMatka,
	isOnlinePayment,
	getSlotgratorGames,
	getSlotgratorGamesBetgames,
	getSlotgratorGamesEzugi,
	getSlotgratorGamesLottoInstantWin,
	getFundistGames,
	getFundistGamesBetGames,
	getFundistGamesLuckyStreak,
	getFundistGamesSAGaming,
	getFundistGamesVivoGaming,
	getFundistGamesXProGaming,
	getFundistGamesAsiaGaming,
	getFundistGamesAsiaLiveTech,
	getFundistGamesOrientalGame,
	getFundistGamesLiveGames,
	getSportOuterList,
	getOuterIsCupMatches,
	getseiresMatchsListInPlay,
	getseiresMatchsListUpcomming,
	getSeriesOuterListBySportId,
	getMatchOuterListBySeriesId,
	getCasinoMatchInPlay,
	getInPlaySportsLength,
	getCricketUpcomingLength,
	getTennisUpcomingLength,
	getSoccerUpcomingLength,
	getRunningMarketAnalysis,
	IndiaBetgetMatchListBySportId,
	allLiveSportsList
};
