const settings = require('../../config/settings');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
let resultdb = globalFunction.resultdb;
const { poolPromise ,sql} = require('../../db');
const SALT_WORK_FACTOR=10;


let getNameBySelectionId = async (data) => {
	try {	
		const pool = await poolPromise;		
		const result = await pool.request()
		.input('selection_id', sql.VarChar(50), data.selection_id)
		.input('marketId', sql.VarChar(50), data.market_id)
		.input('matchId', sql.VarChar(50), data.matchID)			
		.query("select name as selectionName,liability_type, selection_id,sort_priority as selectPriority from market_selections where selection_id=@selection_id AND match_id=@matchId AND market_id=@marketId")	
					
		if (result===null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
			//return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset[0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getCasinoNameBySelectionId = async (data) => {
	try {	
		const pool = await poolPromise;		
		const result = await pool.request()
		.input('selection_id', sql.VarChar(50), data.selection_id)
		.input('marketId', sql.VarChar(50), data.market_id)
		.input('matchId', sql.VarChar(50), data.matchID)			
		.query("select name as selectionName,liability_type, selection_id,sort_priority as selectPriority from cassino_market_selections where selection_id=@selection_id AND match_id=@matchId AND market_id=@marketId")	
					
		if (result===null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
			//return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset[0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getSelectionByMarketId = async (marketId) => {
    try { 
		const pool = await poolPromise;		
		const result = await pool.request()		
		.input('marketId', sql.VarChar(50), marketId)	
		.query("select market_id,selection_id,name,sort_priority from market_selections where  market_id=@marketId")
      
        if (result === null) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        } else { 
            return resultdb(CONSTANTS.SUCCESS, result.recordset);
        }
    } catch (error) {
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

let getCasinoSelectionByMarketId = async (marketId) => {
    try { 
		const pool = await poolPromise;		
		const result = await pool.request()		
		.input('marketId', sql.VarChar(50), marketId)	
		.query("select market_id,selection_id,name,sort_priority from cassino_market_selections where  market_id=@marketId")
      
        if (result === null) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
        } else { 
            return resultdb(CONSTANTS.SUCCESS, result.recordset);
        }
    } catch (error) {
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};
module.exports = {
	getNameBySelectionId,
	getSelectionByMarketId,
	getCasinoNameBySelectionId,
	getCasinoSelectionByMarketId
};