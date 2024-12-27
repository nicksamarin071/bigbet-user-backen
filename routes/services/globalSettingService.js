const MysqlPool = require('../../db');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');

let resultdb = globalFunction.resultdb;




let getGlobalSetting = async () => {
	try {


		let globalSettingQuery = 'select * from global_settings where id = 1 LIMIT 1';

		let resFromDB = await MysqlPool.query(globalSettingQuery);

		return resultdb(CONSTANTS.SUCCESS, resFromDB);
	} catch (error) {
 		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let updateGlobalSetting = async (data) => {
	try {

		let updateQuery = 'update global_settings set site_title = "' + data.site_title + '",site_message = "' + data.site_message + '",one_click_stack = "' + data.one_click_stack + '",match_stack = "' + data.match_stack + '",session_stack = "' + data.session_stack + '",bet_allow_time_before = "' + data.bet_allow_time_before + '"where id  = 1';

		let resFromDB = await MysqlPool.query(updateQuery);
		return resultdb(CONSTANTS.SUCCESS, resFromDB);
	} catch (error) {
 		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let uploadImage = async (data) => {
	try {

		let updateQuery = 'update global_settings set logo = "' + data + '"where id  = 1';

		let resFromDB = await MysqlPool.query(updateQuery);
		return resultdb(CONSTANTS.SUCCESS, resFromDB);
	} catch (error) {
 		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let uploadfavicon = async (data) => {
	try {

		let updateQuery = 'update global_settings set favicon = "' + data + '"where id  = 1';

		let resFromDB = await MysqlPool.query(updateQuery);
		return resultdb(CONSTANTS.SUCCESS, resFromDB);
	} catch (error) {
 		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
module.exports = {
	getGlobalSetting, updateGlobalSetting, uploadImage, uploadfavicon
};