const MysqlPool = require('../db/index');

async function loadGlobalSetting() {
	//console.log('Enter into ..................');

    try {
        let resFromDB = await MysqlPool.query('select * from global_settings');
        resFromDB = JSON.parse(JSON.stringify(resFromDB[0]));

        global._config = resFromDB;
    } catch (e) {
    }

}
module.exports = loadGlobalSetting;