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
const { unset } = require('lodash');
const SALT_WORK_FACTOR = 10;
let deleteMatkaTempBetData = async (data) => {
	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('id', sql.Int, data.id)
			.input('match_id', sql.Int, data.match_id)
			.input('bet_id', sql.Int, data.bet_id)
			.query('DELETE FROM matka_temp_bet WHERE  user_id = @id and match_id =@match_id  and id =@bet_id');		
            return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getMatkaNameBySelectionId = async (data) => {
	try {	
		const pool = await poolPromise;		
		/*console.log("select name as selectionName,liability_type, selection_id,sort_priority as selectPriority from matka_market_selections where selection_id="+data.selection_id+" AND match_id="+data.match_id+" AND market_id="+data.market_id+"");*/
		const result = await pool.request()
		.input('selection_id', sql.VarChar(50), data.selection_id)
		.input('marketId', sql.VarChar(50), data.market_id)
		.input('matchId', sql.VarChar(50), data.match_id)			
		.query("select name as selectionName,liability_type, selection_id,sort_priority as selectPriority from matka_market_selections where selection_id=@selection_id AND match_id=@matchId AND market_id=@marketId")	
					
		if (result.recordset===null || result.recordset.length <=0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);		
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset[0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getWinnerNameBySelectionId = async (data) => {
	try {	
		const pool = await poolPromise;		
		/*console.log("select name as selectionName,liability_type, selection_id,sort_priority as selectPriority from matka_market_selections where selection_id="+data.result_id+" AND match_id="+data.match_id+" AND market_id="+data.market_id+"");*/
		const result = await pool.request()
		.input('selection_id', sql.VarChar(50), data.result_id)
		.input('marketId', sql.VarChar(50), data.market_id)
		.input('matchId', sql.VarChar(50), data.match_id)			
		.query("select name as selectionName,liability_type, selection_id,sort_priority as selectPriority from matka_market_selections where selection_id=@selection_id AND match_id=@matchId AND market_id=@marketId")	
					
		if (result.recordset===null || result.recordset.length <=0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);		
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset[0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getMatkaOdds = async (data) => {
	try {	
		const pool = await poolPromise;		
		console.log("select name,bhav,status from matka_bhavs where patti_type='"+data.getBhav_PattiType+"' AND sport_id="+data.sportId+"");
		const result = await pool.request()
		.input('patti_type', sql.VarChar(50), data.getBhav_PattiType)
		.input('sport_id', sql.Int, data.sportId)		 		
		.query("select name,bhav,status from matka_bhavs where patti_type=@patti_type AND sport_id=@sport_id")	
					
		if (result.recordset===null || result.recordset.length <=0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);		
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
				.query("select is_bet_allow,bet_allow_time_before,bet_delay,min_stack,market_admin_message,max_stack,min_liability,max_market_liability,max_market_profit,min_loss,max_bet_liability,liability_type from matka_markets where market_id=@marketId and status='Y'")

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
let getMatchdata = async (match_id,market_id, sport_id ) => {
	try {	
		const pool = await poolPromise;		
		/*console.log("select matka_markets.name as marketName, matka_markets.series_id, matka_markets.market_id, matka_markets.patti_type, matka_markets.display_name, spt.sport_id, spt.name as sportName, mtch.name as matchName, mtch.match_id, mtch.winner_name from matka_markets join sports as spt ON matka_markets.sport_id = spt.sport_id join matka_matches as mtch mtch.match_id = matka_markets.match_id AND mtch.sport_id spt.sport_id where matka_markets.market_id ="+market_id+" AND matka_markets.match_id="+match_id+" AND matka_markets.sport_id="+sport_id+"");*/
		const result = await pool.request()
		.input('match_id', sql.VarChar(50), match_id)
		.input('sport_id', sql.Int, sport_id)	
		.input('market_id', sql.VarChar(50), market_id)	 		
		.query("select matka_markets.name as marketName, matka_markets.series_id, matka_markets.market_id, matka_markets.patti_type, matka_markets.display_name, spt.sport_id, spt.name as sportName, mtch.name as matchName, mtch.match_id, mtch.winner_name, mbod.id as selection_id from matka_markets join sports as spt ON matka_markets.sport_id = spt.sport_id join matka_matches as mtch ON mtch.match_id = matka_markets.match_id AND mtch.sport_id = spt.sport_id join matka_titli_draw_images as mbod ON mbod.image = mtch.winner_name where matka_markets.market_id =@market_id AND matka_markets.match_id=@match_id AND matka_markets.sport_id=@sport_id")	
					
		if (result.recordset===null || result.recordset.length <=0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);		
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset[0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}

let getThimbleMatchDetail = async (sport_id, id) => {
	try {	
		console.log(id);
		const pool = await poolPromise;		
		const result = await pool.request()
		.input('sport_id', sql.Int, sport_id)
		.input('user_id', sql.Int, id)		
		.query("SELECT min_match_stack as minBetAmount, max_match_stack as maxBetAmount FROM user_default_settings where sport_id =@sport_id AND user_id=@user_id")
					
		if (result.recordset===null || result.recordset.length <=0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);		
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset[0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}

let getThimbleBetData = async (sport_id, id) => {
	
	try {	
		var today = new Date();

		var startDate = today.getFullYear()+'-0'+(today.getMonth()+1)+'-0'+today.getDate()+' 00:00:00';
		var endDate = today.getFullYear()+'-0'+(today.getMonth()+1)+'-0'+today.getDate()+' 23:59:59';

		sdArr = (Date.parse(startDate)/1000);
		edArr = (Date.parse(endDate)/1000);
	
		const pool = await poolPromise;	
		const result = await pool.request()
			.input('sport_id', sql.Int, sport_id)
			.input('user_id', sql.Int, id)		
			.input('startTime', sql.Int, sdArr)
			.input('endTime', sql.Int, edArr)
			.query("SELECT stack, match_id, selection_id as betId, winner_name as resultId, odds as bhav, chips as p_l, created_at as betDate FROM matka_bets_odds where sport_id =@sport_id AND user_id=@user_id AND created_at >= @startTime AND created_at <= @endTime ORDER BY id desc")

		if (result.recordset===null || result.recordset.length <=0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);		
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}

module.exports = {
	deleteMatkaTempBetData,
	getMatkaNameBySelectionId,
	getMatkaOdds,	
	getMarketSettingById,
	getMatchdata,
	getThimbleMatchDetail,
	getThimbleBetData,
	getWinnerNameBySelectionId
};