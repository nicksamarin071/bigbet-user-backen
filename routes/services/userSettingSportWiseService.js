const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');
const { poolPromise ,sql} = require('../../db');

let resultdb = globalFunction.resultdb;


let getUserSettingBySport = async (sport_id,user_id) => {

	try {		
			
		const pool = await poolPromise;		

		/* const resFromDB = await pool.request()	
		.input('pUserid', sql.Int, user_id)
		.execute('GET_ALL_PARENT_USER');
		
		let getAllparent=Array();		
		for(let i in resFromDB.recordset)
			 {
				let parentUserId = resFromDB.recordset[i]
				getAllparent[i]=parentUserId.id;
			 }
		let resultGet=getAllparent.toString();  */
		//console.log('user settings',getAllparent.toString());
		//let query = "select parent_id,match_commission,session_commission,ISNULL((select MAX(bet_delay) from user_setting_sport_wise where sport_id="+sport_id+" AND user_id IN("+resultGet+") AND bet_delay > 0 ),0) as bet_delay,ISNULL((select MAX(session_delay) from user_setting_sport_wise where sport_id="+sport_id+" AND user_id IN("+resultGet+") AND session_delay > 0 ),0) as session_delay,ISNULL((select MAX(min_match_stack) from user_setting_sport_wise where sport_id="+sport_id+" AND user_id IN("+resultGet+") AND min_match_stack > 0 ),0) as min_match_stack,ISNULL((select MIN(max_match_stack) from user_setting_sport_wise where sport_id="+sport_id+" AND user_id IN("+resultGet+") AND max_match_stack > 0 ),0) as max_match_stack,ISNULL((select MAX(min_session_stack) from user_setting_sport_wise where sport_id="+sport_id+" AND user_id IN("+resultGet+") AND min_session_stack > 0 ),0) as min_session_stack,ISNULL((select MIN(max_session_stack) from user_setting_sport_wise where sport_id="+sport_id+" AND user_id IN("+resultGet+") AND max_session_stack > 0 ),0) as max_session_stack,ISNULL((select MIN(session_max_profit) from user_setting_sport_wise where sport_id="+sport_id+" AND user_id IN("+resultGet+") AND session_max_profit > 0 ),0) as session_max_profit,ISNULL((select MIN(session_max_loss) from user_setting_sport_wise where sport_id="+sport_id+" AND user_id IN("+resultGet+") AND session_max_loss > 0 ),0) as session_max_loss,ISNULL((select MIN(max_profit) from user_setting_sport_wise where sport_id="+sport_id+" AND user_id IN("+resultGet+") AND max_profit > 0 ),0) as market_max_profit,ISNULL((select MIN(max_loss) from user_setting_sport_wise where sport_id="+sport_id+" AND user_id IN("+resultGet+") AND max_loss > 0 ),0) as market_max_loss,ISNULL((select MAX(min_exposure) from user_setting_sport_wise where sport_id="+sport_id+" AND user_id IN("+resultGet+") AND min_exposure > 0 ),0) as min_exposure,ISNULL((select MIN(max_exposure) from user_setting_sport_wise where sport_id="+sport_id+" AND user_id IN("+resultGet+") AND max_exposure > 0 ),0) as max_exposure,ISNULL((select MIN(winning_limit) from user_setting_sport_wise where sport_id="+sport_id+" AND user_id IN("+resultGet+") AND winning_limit > 0 ),0) as winning_limit from user_setting_sport_wise where sport_id="+sport_id+" AND user_id ="+user_id+"";
		//console.log("bet delay query -------------------------  ",query);
		const result = await pool.request()
		.input('sport_id', sql.Int, sport_id)
		.input('user_id', sql.Int, user_id)	
		.query("select parent_id,match_commission,session_commission,bet_delay,session_delay,min_match_stack,max_match_stack,min_session_stack,max_session_stack,session_max_profit,session_max_loss,max_profit as market_max_profit,max_loss as market_max_loss,min_exposure,max_exposure,winning_limit from user_setting_sport_wise where sport_id=@sport_id AND user_id=@user_id")
		//.query(query);
		if (result===null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			//console.log('avinash settigs',result.recordset[0]);
			return resultdb(CONSTANTS.SUCCESS, result.recordset[0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

module.exports = {
    getUserSettingBySport,
};
