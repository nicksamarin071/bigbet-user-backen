//const MysqlPool = require('../../db');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');
const userModel = require('../../routes/model/userModel');
const settings = require('../../config/settings');
const exchangeService = require('./exchangeService');
let resultdb = globalFunction.resultdb;
const { poolPromise, sql } = require('../../db')

let dashboardOuterSlider = async () => {
	try {
		const pool = await poolPromise;
		const result = await pool.request().query("SELECT title,(CASE WHEN (attachment IS NULL) THEN ISNULL(attachment,'') ELSE  ISNULL('" + settings.imagePublic + "','') + '' + ISNULL(attachment,'') END) as attachment,hyper_link as link FROM sliders WHERE status=1 AND domain_id=1")
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
let dashboardOuterSports = async () => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			//.input('input_parameter', sql.VarChar(50), data.sport_id)		
			.query("SELECT sports.name,sports.sport_id,ISNULL('" + settings.imageURL + "','') + '' + ISNULL(sports.image,'') as image FROM sports WHERE sports_type IN('B','BS') AND status='Y'")
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
let dashboardOuterNews = async () => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			//.input('input_parameter', sql.VarChar(50), data.sport_id)		
			.query("SELECT title,(CASE WHEN (attachment IS NULL) THEN ISNULL(attachment,'') ELSE  ISNULL('" + settings.imagePublic + "','') + '' + ISNULL(attachment,'') END) as attachment,sort_description,description,meta_tag,meta_title,meta_description,hyper_link,created_at FROM news WHERE status='Y'")
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

let outerDashboard = async () => {
	try {
		let inplayDate = Math.floor(Date.now() / 1000);
		const pool = await poolPromise;
		const result = await pool.request()
			//.input('input_parameter', sql.VarChar(50),inplayDate)
			//.input('user_id', sql.Int, userId)
			.query("select * from (SELECT spt.order_by,(CASE WHEN mtch.start_date < " + inplayDate + " THEN 'Y' ELSE 'N' END) as inplay,spt.name as SportName,ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET LOCKED' ELSE mkts.market_admin_message END,'') as adminMessage,(CASE WHEN (select count(*) from markets where match_id=mtch.match_id AND status='Y' AND is_result_declared='N' AND (isbetalowaftermatchodds='Y' OR name='Book Maker') AND (result_id IS NULL OR result_id=0)) > 0 THEN 'OPEN' ELSE 'CLOSE' END) AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,0 as favMatchID,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff, mtch.series_id, mtch.match_id, mtch.name,'N' AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, spt.sport_id, mkts.market_id as market_id,mkts.runner_json, ROW_NUMBER() OVER ( Partition by mtch.sport_id order by mtch.sport_id ) as row_num FROM matches as mtch JOIN sports spt ON spt.sport_id=mtch.sport_id JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds'  where  mtch.status='Y' AND mtch.is_completed='N' AND mtch.is_cup='N' ) as mtchss where mtchss.sport_id IN (select sport_id from sports where sports.dashboard_inplay ='Y' AND sports.status='Y' ) AND mtchss.row_num <=2 ORDER BY mtchss.start_date ASC")
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

let outerCategoryAndPost = async () => {
	try {
		let inplayDate = Math.floor(Date.now() / 1000);
		const pool = await poolPromise;
		const result = await pool.request()
			.query("SELECT id,name,slug FROM categories where parent_id IS NULL")
		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {

			let categoryArray = result.recordset;
			let finalResultArray = [];
			for (let i in categoryArray) {
				var resultGet = categoryArray[i];
				var categoryName = resultGet.name;
				const getPost = await pool.request()
					.input('category_id', sql.VarChar(50), resultGet.id)
					.query("SELECT  slug as id,title FROM posts where category_id=@category_id AND status='PUBLISHED'")
				//.query("SELECT  title,seo_title,excerpt,body,slug,(CASE WHEN (image IS NULL) THEN ISNULL(image,'') ELSE  ISNULL('"+settings.imagePublic+"','') + '' + ISNULL(image,'') END) as image,meta_description,meta_keywords FROM posts where category_id=@category_id AND status='PUBLISHED'")
				if (getPost.recordset === null || getPost.recordset.length == 0) {
					return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
				} else {
					finalResultArray.push({ 'mainTitle': categoryName, 'data': getPost.recordset });
				}
			}
			return resultdb(CONSTANTS.SUCCESS, finalResultArray);

		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let outerdashboardMatchBySports = async (data) => {
	try {

		let inplayDate = Math.floor(Date.now() / 1000);
		const pool = await poolPromise;
		let inplayType = "";
		if (data.datatype == 'P') {
			inplayType = " AND mtch.start_date <=" + inplayDate;
		}
		else if (data.datatype == 'U') {
			inplayType = " AND mtch.start_date >=" + inplayDate;
		}

		let query = "SELECT  spt.name as SportName,(CASE WHEN mtch.start_date < " + inplayDate + " THEN 'Y' ELSE 'N' END) as inplay,'' as image, ISNULL(CASE WHEN mtch.is_bet_allow='N' THEN 'BET LOCKED' ELSE mkts.market_admin_message END,'') as adminMessage,(CASE WHEN (select count(*) from markets where match_id=mtch.match_id AND status='Y' AND is_result_declared='N' AND (isbetalowaftermatchodds='Y' OR name='Book Maker') AND (result_id IS NULL OR result_id=0))  > 0 THEN 'OPEN' ELSE 'CLOSE' END) AS InplayStatus,(CASE WHEN mkts.bet_allow_time_before > spt.bet_allow_time_before THEN mkts.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore, (CASE WHEN spt.is_bet_allow = mkts.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow,spt.odd_limit_back as backRateDiff,spt.odd_limit_lay as layRateDiff,mtch.series_id,0 as favMatchID, mtch.match_id,mtch.name as name,'N' AS IsFancyAllow, mtch.start_date,spt.volume_limit as matchVolumn, mtch.sport_id, mkts.market_id as market_id,mkts.runner_json FROM matches as mtch JOIN sports as spt ON spt.sport_id = mtch.sport_id  JOIN markets mkts ON mkts.match_id=mtch.match_id AND mkts.name='Match Odds' where spt.status='Y' AND mtch.status='Y' AND mtch.is_completed='N' AND mtch.is_cup='N' " + inplayType + " AND mtch.sport_id=" + data.sport_id + " ORDER BY mtch.start_date ASC";


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
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};
let getSiteMessage = async () => {
	try {
		const pool = await poolPromise;
		let query = "select value from settings where [key]='site.MESSAGE'";
		const result = await pool.request()
			//.input('input_parameter', sql.VarChar(50), id)
			.query(query);
		if (result.recordsets.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let outerPagesDetails = async (data) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('input_parameter', sql.VarChar(255), data.id)
			.query("SELECT  title,seo_title,excerpt,body,slug,(CASE WHEN (image IS NULL) THEN ISNULL(image,'') ELSE  ISNULL('" + settings.imagePublic + "','') + '' + ISNULL(image,'') END) as image,meta_description,meta_keywords FROM posts where slug=@input_parameter AND status='PUBLISHED'")
		if (result.recordsets.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

module.exports = {
	dashboardOuterSports,
	dashboardOuterSlider,
	dashboardOuterNews,
	outerDashboard,
	outerdashboardMatchBySports,
	getSiteMessage,
	outerCategoryAndPost,
	outerPagesDetails,
};