const MysqlPool = require('../../db');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');
const connConfig = require('../../db/indexTest');
let resultdb = globalFunction.resultdb;





let saveUserSettings = async (data) => {
	try {
		let resFromDB = await MysqlPool.query('INSERT INTO user_setting_sport_wise SET ?', [data]);
		return resultdb(CONSTANTS.SUCCESS, resFromDB);
	} catch (error) {
		//console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let updateUserSettings = async function (parameter) {
	try {
		let bet_delay = parameter.bet_delay;
		let session_delay = parameter.session_delay;

		let resFromDB = await MysqlPool.query('UPDATE user_setting_sport_wise SET ? WHERE sport_id = ? AND user_id = ? AND id = ?', [parameter, parameter.sport_id, parameter.user_id, parameter.id]);

		let qry = 'UPDATE user_setting_sport_wise SET bet_delay = CASE WHEN(bet_delay < ?) THEN ? ELSE bet_delay END, session_delay = CASE WHEN(session_delay < ?) THEN ? ELSE session_delay END WHERE sport_id = ? AND user_id IN (WITH recursive chield (id) AS (SELECT id FROM users WHERE id = ? UNION ALL SELECT p.id FROM users p INNER JOIN chield ON p.parent_id = chield.id) SELECT id FROM chield WHERE id != ?)';

		await MysqlPool.query(qry, [bet_delay, bet_delay, session_delay, session_delay, parameter.sport_id, parameter.user_id, parameter.user_id]);

		return resultdb(CONSTANTS.SUCCESS, resFromDB);
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let updateUserSettingsAllSport = async function (globalInputArray, user_id) {
	const conn = await connConfig.getConnection();
	try {
		await conn.beginTransaction();

		let globalInputArrayData = globalInputArray.data;
		for (let i in globalInputArrayData){
			let element = globalInputArrayData[i];
			delete element['sport_name'];
			let userSetting = await getUserSettingBySportId(element.sport_id, user_id);
			if (userSetting.statusCode === CONSTANTS.SUCCESS && userSetting.data.length > 0) {
				let bet_delay = element.bet_delay;
				let session_delay = element.session_delay;

				await conn.query('UPDATE user_setting_sport_wise SET ? WHERE sport_id = ? AND user_id = ? AND id = ?', [element, element.sport_id, user_id, element.id]);

				let qry = 'UPDATE user_setting_sport_wise SET bet_delay = CASE WHEN(bet_delay < ?) THEN ? ELSE bet_delay END, session_delay = CASE WHEN(session_delay < ?) THEN ? ELSE session_delay END WHERE sport_id = ? AND user_id IN (WITH recursive chield (id) AS (SELECT id FROM users WHERE id = ? UNION ALL SELECT p.id FROM users p INNER JOIN chield ON p.parent_id = chield.id) SELECT id FROM chield WHERE id != ?)';

				await conn.query(qry, [bet_delay, bet_delay, session_delay, session_delay, element.sport_id, user_id, user_id]);
			}
		};
		await conn.commit();

		return resultdb(CONSTANTS.SUCCESS, 'SUCCESS');
	} catch (error) {
		await conn.rollback();
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getUserSetting = async (data) => {
	try {
		let fancyQuery = 'select a.*, b.name AS sport_name from user_setting_sport_wise  AS a INNER JOIN sports AS b ON (a.sport_id = b.sport_id) where a.user_id =' + data;
		let resFromDB = await MysqlPool.query(fancyQuery);
		return resultdb(CONSTANTS.SUCCESS, resFromDB);
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getUserSettingBySportId = async (sport_id, user_id) => {
	try {
		let fancyQuery = 'SELECT * FROM user_setting_sport_wise WHERE sport_id = ? AND user_id = ? LIMIT 1';
		let resFromDB = await MysqlPool.query(fancyQuery, [sport_id, user_id]);
		return resultdb(CONSTANTS.SUCCESS, resFromDB);
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let checkBetDelayValid = async (parent_id, element) => {
	try {
		let qry = 'SELECT a.bet_delay, a.session_delay FROM user_setting_sport_wise AS a WHERE a.user_id = ? AND a.sport_id = ? AND (a.bet_delay > ? OR a.session_delay > ?) LIMIT 1';
		let resFromDB = await MysqlPool.query(qry, [parent_id, element.sport_id, element.bet_delay, element.session_delay]);
		if (resFromDB.length == 0) {
			return resultdb(CONSTANTS.SUCCESS, 'SUCCESS');
		}else{
			let msg = 'Minimum bet delay ' + resFromDB[0]['bet_delay'] + ' and session delay ' + resFromDB[0]['session_delay'] + ' required for ' + element.sport_name;
			return resultdb(CONSTANTS.VALIDATION_ERROR, msg);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


module.exports = {
	saveUserSettings,
	updateUserSettings,
	getUserSetting,
	getUserSettingBySportId,
	checkBetDelayValid,
	updateUserSettingsAllSport
};