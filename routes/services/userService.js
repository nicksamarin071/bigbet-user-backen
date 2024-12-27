'use strict';
const settings = require('../../config/settings');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');
const userModel = require('../../routes/model/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
let resultdb = globalFunction.resultdb;
const { poolPromise, sql } = require('../../db');
const axios = require('axios');
const SALT_WORK_FACTOR = 10;
let getUserByUserName = async (user_name) => {
	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('input_parameter', sql.VarChar(50), user_name)
			.input('USER_TYPE_USER', sql.VarChar(50), CONSTANTS.USER_TYPE_USER)
			.input('domain_id', sql.Int, settings.DOMAIN_ID)
			.query("select *,(SELECT [value] from settings with(nolock) where [key]='rules.type' AND [group]='rules' ) as ruleType from users with(nolock) where  user_name = @input_parameter and role_id=@USER_TYPE_USER and domain_id=@domain_id");

		if (result.recordsets === null || result.recordsets.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getUserByUserId = async (id) => {
	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('input_parameter', sql.VarChar(50), id)
			.query('select id,slug,user_name,name,mobile,email,avatar,remark,self_lock_betting,parent_lock_betting,self_lock_fancy_bet,parent_lock_fancy_bet,liability,balance,profit_loss,freechips,chip,session_liability,un_match_liability,one_click,is_confirm_bets,time_zone,timezone_value  from users with(nolock) where  id = @input_parameter and role_id=6');
		if (result.recordsets.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			delete result.recordsets[0][0].password;
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getUserById = async (id) => {
	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('input_parameter', sql.Int, id)
			.query('select id,slug,role_id,parent_id,user_name,name,email,avatar,remark,self_lock_betting,parent_lock_betting,self_lock_fancy_bet,parent_lock_fancy_bet,liability,balance,profit_loss,freechips,chip,session_liability,un_match_liability,one_click,is_confirm_bets,time_zone,timezone_value  from users with(nolock) where  id = @input_parameter ');
		if (result.recordsets.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getUserByUserIdInBetServices = async (id) => {
	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('input_parameter', sql.VarChar(50), id)
			.query('select *  from users with(nolock) where  id = @input_parameter and role_id=' + CONSTANTS.USER_TYPE_USER + '');
		if (result.recordsets.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			delete result.recordsets[0][0].password;
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let userLogin = async (data) => {
	try {

		let userData = await getUserByUserName(data.user_name);
		//console.log('userData--------------- ', userData);
		if (userData.statusCode === CONSTANTS.SUCCESS) {
			if (userData.data[0] && userData.data[0].self_lock_user === "N" &&
				userData.data[0].parent_lock_user === "N" && userData.data[0].self_close_account === "N" &&
				userData.data[0].parent_close_account === "N") {
				let hash = userData.data[0].password;
				// console.log(hash);
				hash = hash.replace('$2y$', '$2a$');
				//console.log('outer---',hash);
				let bcryptAttempt = bcrypt.compareSync(data.password, hash)
				//console.log(bcryptAttempt);
				if (userData.data[0].register_user_status === 'A') {


					if (bcryptAttempt) {
						let token = jwt.sign({
							sub: {
								id: userData.data[0].id,
								user_type_id: userData.data[0].role_id
							}
						}, settings.secret);

						let data = {
							user_name: userData.data[0].user_name,
							token: token,
							user_type_id: userData.data[0].role_id,
							is_rules_displayed: userData.data[0].is_rules_displayed,
							ruleType: userData.data[0].ruleType,
							passChange: userData.data[0].is_change_password,
 							telegramConnected:userData.data[0].telegram_connected,
              						chatId:userData.data[0].chatId
						};
						let dataUpdate = {
							id: userData.data[0].id,
							token: token,
						};
						await setUserDeviceId(dataUpdate);
						return resultdb(CONSTANTS.SUCCESS, data);
					} else {
						return resultdb(CONSTANTS.ACCESS_DENIED);
					}

				} else {
					return resultdb(CONSTANTS.NOT_VERIFIED);
				}
			} else {
				return resultdb(CONSTANTS.NOT_FOUND);
			}
		} else {
			return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let setUserDeviceId = async function (data) {
	try {
		const pool = await poolPromise;
		await pool.request()
			.input('id', sql.Int, data.id)
			.input('device_token', sql.Text, data.token)
			.query('UPDATE  users SET  device_id = @device_token  WHERE  id = @id');
		return resultdb(CONSTANTS.SUCCESS);
	} catch (error) {
		console.error(error);

		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let findUserByIdAndVerifyPassword = async (id, password) => {
	try {

		let userData = await getUserNameAndPasswordById(id);
		//console.log("userData  ",userData);

		if (userData.statusCode === CONSTANTS.SUCCESS) {
			let hash = userData.data.password;
			hash = hash.replace(/^\$2y(.+)$/i, '$2a$1');
			let isValidPassword = bcrypt.compareSync(password, hash);
			//	console.log("isValidPassword  ",isValidPassword);

			if (isValidPassword) {
				return resultdb(CONSTANTS.SUCCESS);
			} else {
				return resultdb(CONSTANTS.ACCESS_DENIED);
			}
		} else {
			return resultdb(CONSTANTS.NOT_FOUND);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getUserNameAndPasswordById = async (id) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('input_parameter', sql.VarChar(50), id)
			.query('select ROUND(ISNULL(chip,0),2) as chip,avatar,ROUND(ISNULL(freechips,0),0) as freechips,is_online,password,ROUND(ISNULL(liability,0),2) as liability,ROUND(ISNULL(balance,0),2) as balance,ROUND(ISNULL(profit_loss,0),2) as profit_loss,ROUND(ISNULL(session_liability,0),2) as session_liability,ROUND(ISNULL(un_match_liability,0),2) as un_match_liability,timezone_value, time_zone from users with(nolock) where  id = @input_parameter');
		if (result.recordsets.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getUserNameAndPasswordByIdXpg = async (id) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('input_parameter', sql.VarChar(50), id)
			.query('select ROUND(ISNULL(balance,0),2) as balance,user_name,id from users with(nolock) where  id = @input_parameter');

		if (result.recordset.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset[0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getXpgtableDataByUsername = async (user_name, type = 1) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('input_parameter', sql.VarChar(150), user_name)
			.input('type', sql.Int, type)
			.query('select * from xpg_active_users with(nolock) where user_name = @input_parameter AND type=@type');
		console.log("result.recordsets.length---", result.recordset.length);
		if (result.recordset.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			console.log("result.recordset[0]---", result.recordset[0]);
			return resultdb(CONSTANTS.SUCCESS, result.recordset[0]);

		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let insertXpgUser = async (user_detail, type = 1, session_token = "0") => {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		await pool.request()
			.input('user_id', sql.Int, user_detail.id)
			.input('user_name', sql.VarChar(150), user_detail.user_name)
			.input('open_balance', sql.Float, user_detail.balance)
			.input('updated_at', sql.BigInt, currentdate)
			.input('type', sql.Int, type)
			.input('session_token', sql.VarChar(255), session_token)
			.query("insert into xpg_active_users (user_id, user_name, open_balance,updated_at,type,session_token) values(@user_id,@user_name,@open_balance,@updated_at,@type,@session_token)");


		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let insertLotusUser = async (data, type = 3, session_token = "0") => {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		await pool.request()
			.input('user_id', sql.Int, data.user_id)
			.input('user_name', sql.VarChar(150), data.user_name)
			.input('open_balance', sql.Float, data.balance)
			.input('updated_at', sql.BigInt, currentdate)
			.input('type', sql.Int, type)
			.input('session_token', sql.VarChar(255), session_token)
			.query("insert into xpg_active_users (user_id, user_name, open_balance,updated_at,type,session_token) values(@user_id,@user_name,@open_balance,@updated_at,@type,@session_token)");


		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getXpgActiveUserData = async (login_id, type = 1) => {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();

		let matchDate = currentdate - settings.XPG_BALANCE_SYNC_INTERVAL;

		const pool = await poolPromise;
		if (login_id > 0) {

			var result = await pool.request()
				.input('matchDate', sql.BigInt, matchDate)
				.input('user_id', sql.Int, login_id)
				.input('type', sql.Int, type)
				.query('select  xau.type,xau.session_token,xau.user_id,xau.user_name,xau.updated_at,ROUND(ISNULL(xau.open_balance,0),2) as open_balance,ROUND(ISNULL(u.balance,0),2) as balance from xpg_active_users as xau  with(nolock) LEFT JOIN users as u with(nolock) ON (xau.user_id=u.id) where  xau.updated_at >= @matchDate AND xau.user_id=@user_id AND xau.type=@type');
		} else {

			var result = await pool.request()
				.input('matchDate', sql.BigInt, matchDate)
				.input('type', sql.Int, type)
				.query('select xau.type,xau.session_token, xau.user_id,xau.user_name,xau.updated_at,ROUND(ISNULL(xau.open_balance,0),2) as open_balance,ROUND(ISNULL(u.balance,0),2) as balance from xpg_active_users as xau with(nolock) LEFT JOIN users as u with(nolock) ON (xau.user_id=u.id) where  xau.updated_at >= @matchDate AND xau.type=@type');
		}


		if (result.recordset.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordset);
		}
	} catch (error) {
		console.log("error-----", error.message);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};

let xpgUpdateUserActiveTime = async (id, session_token = "0", typee = 1) => {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();

		const pool = await poolPromise;
		let result = "";

		if (session_token != "0") {

			result = await pool.request()
				.input('currentdate', sql.BigInt, currentdate)
				.input('user_id', sql.VarChar(150), id)
				.input('session_token', sql.VarChar(255), session_token)
				.input('type', sql.Int, typee)
				.query("UPDATE  xpg_active_users SET updated_at= @currentdate, session_token=@session_token where user_id= @user_id AND type=@type");
		} else {

			result = await pool.request()
				.input('currentdate', sql.BigInt, currentdate)
				.input('user_id', sql.VarChar(150), id)
				.input('type', sql.Int, typee)
				.query("UPDATE  xpg_active_users SET updated_at= @currentdate where user_id= @user_id AND type=@type");

		}

		if (result.rowsAffected[0] <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		}
		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

	} catch (error) {

		console.log("error------", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let xpgUpdateUserAmout = async (user_name, amount, type = 1) => {
	try {

		const pool = await poolPromise;

		await pool.request()
			.input('open_balance', sql.Float, amount)
			.input('user_name', sql.VarChar(150), user_name)
			.input('type', sql.Int, type)
			.query("UPDATE xpg_active_users SET open_balance= @open_balance where user_name= @user_name AND type=@type");


		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let userTableUpdateAmout = async (user_name, amount, modify_balance) => {
	try {

		const pool = await poolPromise;
		let liability = 0;

		if (modify_balance < 0) {
			liability = modify_balance;
		}
		await pool.request()
			.input('balance', sql.Float, amount)
			.input('liability', sql.Float, liability)
			.input('user_name', sql.VarChar(150), user_name)
			.query("UPDATE users SET balance= @balance, liability += @liability where user_name= @user_name");


		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let userEzugiProfitAmout = async (user_name, ezugiprofit) => {
	try {
		console.log('11111111111111111111111111111111 -------  ', ezugiprofit);
		const pool = await poolPromise;
		let ezugiProfitBalance = 0;

		if (ezugiprofit > 0) {
			ezugiProfitBalance = ezugiprofit;
		}
		let type = 2;
		console.log('444444444444444444444444444444444--- ', "UPDATE xpg_active_users SET ezugi_profit += " + ezugiProfitBalance + " where user_name= " + user_name + " AND type=2");
		await pool.request()
			.input('ezugi_profit', sql.Float, ezugiProfitBalance)
			.input('user_name', sql.VarChar(150), user_name)
			.input('type', sql.Int, type)
			.query("UPDATE xpg_active_users SET ezugi_profit += @ezugi_profit where user_name= @user_name AND type=@type");
		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let userXpgProfitAmout = async (user_name, xpgProfit) => {
	try {
		console.log('222222222222222222222222222 -- ', xpgProfit);
		const pool = await poolPromise;
		let xpgProfitBalance = 0;

		if (xpgProfit > 0) {
			xpgProfitBalance = xpgProfit;
		}
		let type = 1;

		console.log('3333333333333333333333333333333---', "UPDATE xpg_active_users SET xpg_profit += " + xpgProfitBalance + " where user_name= '" + user_name + "' AND type=1");


		await pool.request()
			.input('xpg_profit', sql.Float, xpgProfitBalance)
			.input('user_name', sql.VarChar(150), user_name)
			.input('type', sql.Int, type)
			.query("UPDATE xpg_active_users SET xpg_profit += @xpg_profit where user_name= @user_name AND type=@type");
		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};



function getNum(val) {
	if (isNaN(val)) {
		return 0;
	}
	return val;
}

let updateEzugiPlayerIdOnUser = async (user_name, player_id) => {

	try {
		const pool = await poolPromise;
		let updateSettingsDate = "UPDATE users set ezugi=" + player_id + " where user_name= '" + user_name + "'";

		await pool.request()
			.query(updateSettingsDate);

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);


	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}


};


let GetEzugiUsers = async () => {

	try {
		const pool = await poolPromise;
		let userGetdata = "SELECT user_name,ezugi FROM  users with(nolock) where ezugi != 0";
		const getUserData = await pool.request()
			.query(userGetdata);

		return resultdb(CONSTANTS.SUCCESS, getUserData);


	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}


};





let updateUserAcStatement = async (stateMentData, ip_address) => {
	try {

		const pool = await poolPromise;
		let currentdate = globalFunction.currentDateTimeStamp();

		let userName = stateMentData.Username;
		let BetAmount = parseFloat(stateMentData.BetAmount).toFixed(2);
		let PrizeAmount = parseFloat(getNum(stateMentData.PrizeAmount)).toFixed(2);
		let RoundId = stateMentData.RoundId;
		let GameType = stateMentData.GameType;
		let GameName = stateMentData.GameName;
		let WinLoss = "";
		let TipAmount = parseFloat(stateMentData.TipAmount).toFixed(2);
		let userUpdateQuery = "";


		let statementAmt = "";
		let available_balance = "";
		if (PrizeAmount > 0) {
			let profitLoss = parseFloat(PrizeAmount) - parseFloat(BetAmount); // - parseFloat(TipAmount);
			profitLoss = parseFloat(profitLoss).toFixed(2);
			let updatLiability = parseFloat(BetAmount); //+ parseFloat(TipAmount);
			userUpdateQuery = "UPDATE users SET liability += " + updatLiability + ", profit_loss += " + profitLoss + " where user_name= '" + userName + "'";
		} else {
			let profitLoss = parseFloat(PrizeAmount) - parseFloat(BetAmount); // - parseFloat(TipAmount);
			profitLoss = parseFloat(profitLoss).toFixed(2);
			let updatLiability = parseFloat(BetAmount); // + parseFloat(TipAmount);
			userUpdateQuery = "UPDATE users SET liability += " + updatLiability + ", profit_loss += " + profitLoss + " where user_name= '" + userName + "'"
		}
		console.log('userUpdateQuery', userUpdateQuery);
		await pool.request()
			.query(userUpdateQuery);

		let userGetdata = "SELECT usr.id,usr.parent_id,usr.balance, usr.liability, usr.profit_loss ,xpg.ezugi_profit , xpg.xpg_profit FROM  users as usr with(nolock) join xpg_active_users as xpg with(nolock) ON xpg.user_id=usr.id where usr.user_name= '" + userName + "' AND xpg.user_name='" + userName + "' AND xpg.type=1 ";
		console.log('userGetdata------- ', userGetdata);
		const getUserData = await pool.request()
			.query(userGetdata);
		console.log('getUserData', getUserData);
		let userId = getUserData.recordset[0].id;
		let parent_id = getUserData.recordset[0].parent_id;
		let balance = parseFloat(getUserData.recordset[0].balance).toFixed(2);
		let xpgEzugiProfitLoss = parseFloat(parseFloat(getUserData.recordset[0].ezugi_profit) + parseFloat(getUserData.recordset[0].xpg_profit)).toFixed(2);
		let liability = parseFloat(getUserData.recordset[0].liability).toFixed(2);
		let userprofit_lossId = getUserData.recordset[0].profit_loss;
		if (BetAmount > 0) {
			if (PrizeAmount > 0) {
				let amountWinLoss = parseFloat(PrizeAmount) - parseFloat(BetAmount); // - parseFloat(TipAmount);
				statementAmt = parseFloat(amountWinLoss).toFixed(2);
				available_balance = parseFloat(balance) - parseFloat(xpgEzugiProfitLoss) + parseFloat(PrizeAmount) + parseFloat(Math.abs(liability)); // + parseFloat(amountWinLoss);
				available_balance = parseFloat(available_balance).toFixed(2);
				WinLoss = "" + GameName + " " + GameType + " # " + RoundId + " Win";


				let updateXpgProfit = parseFloat(PrizeAmount); // + parseFloat(TipAmount);
				let updateXpgProfitQuery = "UPDATE xpg_active_users SET  xpg_profit -= " + updateXpgProfit + " where user_name= '" + userName + "' AND type=1";
				await pool.request()
					.query(updateXpgProfitQuery);

			} else {
				let amountWinLoss = parseFloat(stateMentData.BetAmount);// + parseFloat(TipAmount);
				statementAmt = "-" + parseFloat(amountWinLoss).toFixed(2);
				available_balance = parseFloat(balance) - parseFloat(xpgEzugiProfitLoss) + parseFloat(Math.abs(liability));
				available_balance = parseFloat(available_balance).toFixed(2);
				WinLoss = "" + GameName + " " + GameType + " # " + RoundId + " Loss";
			}

			let AccountStatementQuery = "INSERT INTO  account_statements (user_id,parent_id,description,statement_type,amount,available_balance,match_id,market_id,type,created_by,created_at,created_ip) VALUES(" + userId + "," + parent_id + ",'" + WinLoss + "',2,'" + statementAmt + "','" + available_balance + "',0,'" + RoundId + "',1," + userId + "," + currentdate + ",'" + ip_address + "')";
			console.log('AccountStatementQuery', AccountStatementQuery);
			await pool.request()
				.query(AccountStatementQuery);
		}

		if (TipAmount > 0) {

			let TipStatementAmt = "";
			let TopAvailable_balance = "";
			let TipWinLoss = "";

			let TipProfitLoss = "-" + parseFloat(TipAmount);
			TipProfitLoss = parseFloat(TipProfitLoss).toFixed(2);
			let TipUpdatLiability = parseFloat(TipAmount);
			await pool.request()
				.query("UPDATE users SET liability += " + TipUpdatLiability + ", profit_loss += " + TipProfitLoss + " where user_name= '" + userName + "'");

			//let TipuserGetdata = "SELECT id,parent_id,balance, liability, profit_loss FROM  users where user_name= '"+userName+"'"
			let TipuserGetdata = " SELECT usr.id,usr.parent_id,usr.balance, usr.liability, usr.profit_loss ,ezugi.ezugi_profit , xpg.xpg_profit FROM  users as usr with(nolock) join xpg_active_users as xpg with(nolock) ON xpg.user_id=usr.id where usr.user_name= '" + userName + "' AND xpg.user_name='" + userName + "' AND xpg.type=1 ";
			const TipgetUserData = await pool.request()
				.query(TipuserGetdata);
			console.log('TipuserGetdata', TipgetUserData.recordset[0]);
			let TipUserId = TipgetUserData.recordset[0].id;
			let Tipparent_id = TipgetUserData.recordset[0].parent_id;
			let Tipbalance = parseFloat(TipgetUserData.recordset[0].balance).toFixed(2);
			let Tipliability = parseFloat(TipgetUserData.recordset[0].liability).toFixed(2);
			let xpgEzugiProfitLossTipXpg = parseFloat(parseFloat(TipgetUserData.recordset[0].ezugi_profit) + parseFloat(TipgetUserData.recordset[0].xpg_profit)).toFixed(2);

			let TipAmountWinLoss = parseFloat(TipAmount);
			TipStatementAmt = "-" + parseFloat(TipAmountWinLoss).toFixed(2);
			TopAvailable_balance = parseFloat(Tipbalance) - parseFloat(xpgEzugiProfitLossTipXpg) + parseFloat(Math.abs(Tipliability));
			TopAvailable_balance = parseFloat(TopAvailable_balance).toFixed(2);
			TipWinLoss = "" + GameName + " " + GameType + " # " + RoundId + " Tip";

			let TipAccountStatementQuery = "INSERT INTO  account_statements (user_id,parent_id,description,statement_type,amount,available_balance,match_id,market_id,type,created_by,created_at,created_ip) VALUES(" + TipUserId + "," + Tipparent_id + ",'" + TipWinLoss + "',2,'" + TipStatementAmt + "','" + TopAvailable_balance + "',0,'" + RoundId + "',1," + TipUserId + "," + currentdate + ",'" + ip_address + "')";
			console.log('TipAccountStatementQuery', TipAccountStatementQuery);
			await pool.request()
				.query(TipAccountStatementQuery);
		}




		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);


	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let updateXpgStatementDate = async (updateDateLastCron) => {
	try {
		const pool = await poolPromise;
		updateDateLastCron = updateDateLastCron + 1000;
		let updateSettingsDate = "UPDATE global_settings set created_at=" + updateDateLastCron + " where id=1";
		await pool.request()
			.query(updateSettingsDate);

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}


let updateEzugiStatementDate = async (updateDateLastCron) => {
	try {
		const pool = await poolPromise;
		updateDateLastCron = updateDateLastCron + 1000;
		let updateSettingsDate = "UPDATE global_settings set ezugi_created_at=" + updateDateLastCron + " where id=1";
		await pool.request()
			.query(updateSettingsDate);

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}

let updateUserEzugiAcStatement = async (stateMentData, ip_address) => {
	try {

		const pool = await poolPromise;
		let currentdate = globalFunction.currentDateTimeStamp();

		let userName = stateMentData.Username;
		let BetAmount = parseFloat(stateMentData.BetAmount).toFixed(2);
		let PrizeAmount = parseFloat(getNum(stateMentData.PrizeAmount)).toFixed(2);
		let RoundId = stateMentData.RoundId;
		let GameType = stateMentData.GameType;
		let GameName = stateMentData.GameName;
		let WinLoss = "";
		let TipAmount = parseFloat(stateMentData.TipAmount).toFixed(2);
		let userUpdateQuery = "";


		let statementAmt = "";
		let available_balance = "";
		if (PrizeAmount > 0) {
			let profitLoss = parseFloat(PrizeAmount) - parseFloat(BetAmount); // - parseFloat(TipAmount);
			profitLoss = parseFloat(profitLoss).toFixed(2);
			let updatLiability = parseFloat(BetAmount); //+ parseFloat(TipAmount);
			userUpdateQuery = "UPDATE users SET liability += " + updatLiability + ", profit_loss += " + profitLoss + " where user_name= '" + userName + "'";
		} else {
			let profitLoss = parseFloat(PrizeAmount) - parseFloat(BetAmount); // - parseFloat(TipAmount);
			profitLoss = parseFloat(profitLoss).toFixed(2);
			let updatLiability = parseFloat(BetAmount); // + parseFloat(TipAmount);
			userUpdateQuery = "UPDATE users SET liability += " + updatLiability + ", profit_loss += " + profitLoss + " where user_name= '" + userName + "'"
		}
		console.log('userUpdateQuery', userUpdateQuery);
		await pool.request()
			.query(userUpdateQuery);

		let userGetdata = "SELECT usr.id,usr.parent_id,usr.balance, usr.liability, usr.profit_loss,ezugi.ezugi_profit,ezugi.xpg_profit FROM  users as usr with(nolock) join xpg_active_users as ezugi with(nolock) ON ezugi.user_id=usr.id where usr.user_name= '" + userName + "' AND ezugi.user_name='" + userName + "' AND ezugi.type=2";

		const getUserData = await pool.request()
			.query(userGetdata);
		console.log('getUserData.recordset', getUserData.recordset);
		let userId = getUserData.recordset[0].id;
		let parent_id = getUserData.recordset[0].parent_id;
		let balance = parseFloat(getUserData.recordset[0].balance).toFixed(2);
		let liability = parseFloat(getUserData.recordset[0].liability).toFixed(2);
		let xpgEzugiProfitLoss = parseFloat(parseFloat(getUserData.recordset[0].ezugi_profit) + parseFloat(getUserData.recordset[0].xpg_profit)).toFixed(2);



		if (BetAmount > 0) {
			if (PrizeAmount > 0) {
				let amountWinLoss = parseFloat(PrizeAmount) - parseFloat(BetAmount); // - parseFloat(TipAmount);
				statementAmt = parseFloat(amountWinLoss).toFixed(2);
				//available_balance = parseFloat(balance) +  parseFloat(Math.abs(liability)); // + parseFloat(amountWinLoss);
				available_balance = parseFloat(balance) - parseFloat(xpgEzugiProfitLoss) + parseFloat(PrizeAmount) + parseFloat(Math.abs(liability));
				available_balance = parseFloat(available_balance).toFixed(2);
				WinLoss = "" + GameName + " " + GameType + " # " + RoundId + " Win";

				let updateExugiProfit = parseFloat(PrizeAmount); // + parseFloat(TipAmount);
				let updateExugiProfitQuery = "UPDATE xpg_active_users SET  ezugi_profit -= " + updateExugiProfit + " where user_name= '" + userName + "' AND type=2";
				await pool.request()
					.query(updateExugiProfitQuery);

			} else {
				let amountWinLoss = parseFloat(stateMentData.BetAmount);// + parseFloat(TipAmount);
				statementAmt = "-" + parseFloat(amountWinLoss).toFixed(2);
				available_balance = parseFloat(balance) - parseFloat(xpgEzugiProfitLoss) + parseFloat(Math.abs(liability));
				available_balance = parseFloat(available_balance).toFixed(2);
				WinLoss = "" + GameName + " " + GameType + " # " + RoundId + " Loss";
			}

			let AccountStatementQuery = "INSERT INTO  account_statements (user_id,parent_id,description,statement_type,amount,available_balance,match_id,market_id,type,created_by,created_at,created_ip) VALUES(" + userId + "," + parent_id + ",'" + WinLoss + "',2,'" + statementAmt + "','" + available_balance + "',0,'" + RoundId + "',1," + userId + "," + currentdate + ",'" + ip_address + "')";
			console.log('AccountStatementQuery', AccountStatementQuery);
			await pool.request()
				.query(AccountStatementQuery);
		}

		if (TipAmount > 0) {

			let TipStatementAmt = "";
			let TopAvailable_balance = "";
			let TipWinLoss = "";

			let TipProfitLoss = "-" + parseFloat(TipAmount);
			TipProfitLoss = parseFloat(TipProfitLoss).toFixed(2);
			let TipUpdatLiability = parseFloat(TipAmount);
			await pool.request()
				.query("UPDATE users SET liability += " + TipUpdatLiability + ", profit_loss += " + TipProfitLoss + " where user_name= '" + userName + "'");

			//let TipuserGetdata = "SELECT id,parent_id,balance, liability, profit_loss FROM  users where user_name= '"+userName+"'"
			let TipuserGetdata = "SELECT usr.id,usr.parent_id,usr.balance, usr.liability, usr.profit_loss,ezugi.ezugi_profit,ezugi.xpg_profit FROM  users as usr with(nolock) join xpg_active_users as ezugi with(nolock) ON ezugi.user_id=usr.id where usr.user_name= '" + userName + "' AND ezugi.user_name='" + userName + "' AND ezugi.type=2";
			const TipgetUserData = await pool.request()
				.query(TipuserGetdata);
			console.log('TipuserGetdata', TipgetUserData.recordset[0]);
			let TipUserId = TipgetUserData.recordset[0].id;
			let Tipparent_id = TipgetUserData.recordset[0].parent_id;
			let Tipbalance = parseFloat(TipgetUserData.recordset[0].balance).toFixed(2);
			let Tipliability = parseFloat(TipgetUserData.recordset[0].liability).toFixed(2);
			let xpgEzugiProfitLossTip = parseFloat(parseFloat(TipgetUserData.recordset[0].ezugi_profit) + parseFloat(TipgetUserData.recordset[0].xpg_profit)).toFixed(2);

			let TipAmountWinLoss = parseFloat(TipAmount);
			TipStatementAmt = "-" + parseFloat(TipAmountWinLoss).toFixed(2);
			TopAvailable_balance = parseFloat(Tipbalance) - parseFloat(xpgEzugiProfitLossTip) + parseFloat(Math.abs(Tipliability));
			TopAvailable_balance = parseFloat(TopAvailable_balance).toFixed(2);
			TipWinLoss = "" + GameName + " " + GameType + " # " + RoundId + " Tip";

			let TipAccountStatementQuery = "INSERT INTO  account_statements (user_id,parent_id,description,statement_type,amount,available_balance,match_id,market_id,type,created_by,created_at,created_ip) VALUES(" + TipUserId + "," + Tipparent_id + ",'" + TipWinLoss + "',2,'" + TipStatementAmt + "','" + TopAvailable_balance + "',0,'" + RoundId + "',1," + TipUserId + "," + currentdate + ",'" + ip_address + "')";
			console.log('TipAccountStatementQuery', TipAccountStatementQuery);
			await pool.request()
				.query(TipAccountStatementQuery);
		}

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);


	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getUserAuthorization = async (id) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('input_parameter', sql.VarChar(50), id)
			.query("select device_id, CASE WHEN ( parent_lock_user = 'N' AND self_lock_user = 'N')  THEN 'N' ELSE 'Y' END as lockUser, CASE WHEN  (self_close_account = 'N' AND  parent_close_account = 'N')  THEN 'N' ELSE 'Y' END as closeUser, ROUND(ISNULL(chip,0),2) as chip,avatar,ROUND(ISNULL(freechips,0),0) as freechips,is_online,password,ROUND(ISNULL(liability,0),2) as liability,ROUND(ISNULL(balance,0),2) as balance,ROUND(ISNULL(profit_loss,0),2) as profit_loss,ROUND(ISNULL(session_liability,0),2) as session_liability,ROUND(ISNULL(un_match_liability,0),2) as un_match_liability,timezone_value, time_zone, (select value from settings with(nolock) where [key]='site.MESSAGE') as site_message from users with(nolock) where  id = @input_parameter");

		if (result.recordsets.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {

			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getLobbyLotusUserAuthorization = async (id) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('input_parameter', sql.VarChar(50), id)
			.query("select id,user_name,ROUND(balance,2) as balance,ROUND(liability,2) as exposure,'INR' as currency, 'en' as language, device_id, CASE WHEN ( parent_lock_user = 'N' AND self_lock_user = 'N')  THEN 'N' ELSE 'Y' END as lockUser, CASE WHEN  (self_close_account = 'N' AND  parent_close_account = 'N')  THEN 'N' ELSE 'Y' END as closeUser from users with(nolock) where  id = @input_parameter");

		if (result.recordsets.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {

			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getLobbyXPGUserAuthorization = async (user_name) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('input_parameter', sql.VarChar(50), user_name)
			.query("select id, parent_id, user_name,ROUND(balance,2) as balance,ROUND(liability,2) as exposure,'INR' as currency, 'en' as language, device_id, CASE WHEN ( parent_lock_user = 'N' AND self_lock_user = 'N')  THEN 'N' ELSE 'Y' END as lockUser, CASE WHEN  (self_close_account = 'N' AND  parent_close_account = 'N')  THEN 'N' ELSE 'Y' END as closeUser from users with(nolock) where  user_name = @input_parameter");

		if (result.recordsets === null || result.recordsets[0].length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {

			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
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
let updatePassword = async function (password, id) {
	try {
		let genSalt = await bcrypt.genSalt(SALT_WORK_FACTOR);
		let hash = await bcrypt.hash(password, genSalt);
		hash = await hash.replace(/^\$2b(.+)$/i, '$2y$1');
		const pool = await poolPromise;
		await pool.request()
			.input('id', sql.VarChar(50), id)
			.input('hash', sql.VarChar, hash)
			.input('is_change_password', sql.VarChar(50), 'Y')
			.query('UPDATE  users SET  password = @hash, is_change_password=@is_change_password  WHERE  id = @id');
		return resultdb(CONSTANTS.SUCCESS);
	} catch (error) {
		console.error(error);

		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let updateTimeZone = async function (data) {
	try {
		const pool = await poolPromise;
		await pool.request()
			.input('id', sql.VarChar(50), data.id)
			.input('time_zone', sql.VarChar, data.time_zone)
			.input('timezone_value', sql.VarChar, data.timezone_value)
			.query('UPDATE  users SET  time_zone = @time_zone, timezone_value = @timezone_value  WHERE  id = @id');
		return resultdb(CONSTANTS.SUCCESS);
	} catch (error) {
		console.error(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let updateRules = async function (data) {
	try {
		const pool = await poolPromise;
		await pool.request()
			.input('id', sql.VarChar(50), data.id)
			.input('is_rules_displayed', sql.VarChar, data.is_rules_displayed)
			.query('UPDATE  users SET  is_rules_displayed = @is_rules_displayed WHERE  id = @id');
		return resultdb(CONSTANTS.SUCCESS);
	} catch (error) {
		console.error(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let updateOneClickAndMatchStack = async function (data) {
	try {
		let updateDate = Math.floor(Date.now() / 1000);
		let queryparameter = "";
		if (data.one_click_stack != 0) {
			queryparameter += "one_click_stack = '" + data.one_click_stack + "'";
		}
		if (data.match_stack != 0) {
			queryparameter = "match_stack = '" + data.match_stack + "'";
		}
		let query = "UPDATE  user_setting_sport_wise SET " + queryparameter + " ,updated_by=" + data.id + ",updated_at=" + updateDate + "  WHERE  user_id = " + data.id + " and sport_id =" + data.sport_id + "";

		const pool = await poolPromise;
		const result = await pool.request()
			.query(query)
		if (result === null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS);
		}
	} catch (error) {
		console.error(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getFavouriteList = async (created_by) => {
	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('input_parameter', sql.VarChar(50), created_by)
			.query('select * from favourites where  created_by = @input_parameter');
		if (result.recordsets.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			result.recordsets[0][0] ? delete result.recordsets[0][0].password : null;
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let oneClickBetSportWise = async (data) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('id', sql.VarChar(50), data.id)
			.input('market_id', sql.VarChar(50), data.market_id)
			.input('match_id', sql.BigInt, data.match_id)
			.query('select * from favourites where  created_by = @id and market_id =@market_id and match_id =@match_id   ');

		if (result.recordsets[0].length <= 0 && data.isFav === true) { //Insert recored
			let currentdate = Date.now();
			console.log("currentdate  ", currentdate);

			await pool.request()
				.input('id', sql.VarChar(50), data.id)
				.input('market_id', sql.VarChar(50), data.market_id)
				.input('match_id', sql.BigInt, data.match_id)
				.input('currentdate', sql.VarChar(50), data.currentdate)
				.query("insert into favourites (user_id, market_id, match_id,created_by,created_at,created_ip) values(@id,@market_id,@match_id,@id,@currentdate,'192.168.1.68')");
			return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);
		} else if (result.recordsets[0].length > 0 && data.isFav === true) { //Already
			return resultdb(CONSTANTS.ALREADY_EXISTS, CONSTANTS.DATA_NULL);
		} else if (result.recordsets[0].length > 0 && data.isFav === false) { //Delete record
			const result = await pool.request()
				.input('id', sql.VarChar(50), data.id)
				.input('market_id', sql.VarChar(50), data.market_id)
				.input('match_id', sql.VarChar(50), data.match_id)
				.query('DELETE FROM favourites WHERE  created_by = @id and market_id =@market_id  and match_id =@match_id  ');
			return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);
		} else if (result.recordsets[0].length <= 0 && data.isFav === false) { //Not available
			return resultdb(CONSTANTS.ALREADY_DELETED, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SERVER_ERROR, result.recordsets[0][0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let UserAccountStatement = async (data) => {
	try {
		const pool = await poolPromise;

		var offset = (data.pageno - 1) * data.limit;


		let query = "select  stm.id,stm.user_id,stm.description,stm.statement_type,stm.match_id as match, stm.market_id as market, stm.amount,ROUND(stm.available_balance,2) as available_balance,stm.type,stm.created_at from account_statements as stm where user_id=" + data.id + "";
		if (data.from_date > 0) {
			query += " AND stm.created_at >=" + data.from_date;
		}
		if (data.to_date > 0) {
			query += " AND stm.created_at <= " + data.to_date;
		}
		query += " order by stm.id desc OFFSET  " + offset + " ROWS FETCH NEXT " + data.limit + " ROWS ONLY";
		//query += " order by stm.id desc";

		//console.log('-----------------------------------------', query);
		const result = await pool.request().query(query)

		if (result.recordsets.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {

		console.log("error  ", error);

		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getUserMyBetsList = async (data) => {
	try {
		const pool = await poolPromise;

		var offset = (data.pageno - 1) * data.limit;

		let query = "";
		let profitLoss = "";
		if (data.betType == 'P') {
			profitLoss = " ISNULL(betOD.chips,0) ";
		} else {
			profitLoss = " ISNULL(betOD.p_l,0) ";
		}
		query += "select  betOD.winner_name as winResult, betOD.id as BetId, 'B' as marketType, betOD.user_id as userId,Match.name as matchName,Match.match_id as matchId,betOD.market_id as marketId,betOD.market_name as marketName,spt.sport_id as sportId,spt.name as sportName, ser.series_id as seriesId, ser.name as seriesName,betOD.selection_name as SelectionName,'' Size, CASE WHEN  betOD.is_back = 0 THEN 'Lay' ELSE 'Back' END as Type, betOD.odds as Odds ,betOD.stack as Stack,betOD.liability as Liability," + profitLoss + " as PotentialProfit,betOD.created_ip as ipAddress, betOD.created_at as Placed, '' as drawTime from bets_odds as betOD INNER JOIN matches as Match ON Match.match_id=betOD.match_id INNER JOIN sports as spt ON spt.sport_id=betOD.sport_id INNER JOIN series as ser ON ser.series_id=Match.series_id where betOD.user_id=" + data.id + " AND betOD.delete_status IN(0,2)";
		if (data.betType == 'P') {
			query += " AND betOD.bet_result_id !=0 ";
		} else {
			query += " AND betOD.bet_result_id =0 ";
		}
		if (data.sport_id != 0) {
			query += " AND Match.sport_id=" + data.sport_id;
		}
		if (data.match_id != 0) {
			query += " AND betOD.match_id=" + data.match_id;
		}
		if (data.market_id != 0) {
			query += " AND betOD.market_id='" + data.market_id + "'";
		}
		if (data.from_date > 0) {
			query += " AND betOD.created_at >=" + data.from_date;
		}
		if (data.to_date > 0) {
			query += " AND betOD.created_at <= " + data.to_date;
		}

		/* */
		query += " UNION ALL ";
		let profitLoss4 = "";
		if (data.betType == 'P') {
			profitLoss4 = " ISNULL(betOD.chips,0) ";
		} else {
			profitLoss4 = " ISNULL(betOD.p_l,0) ";
		}
		query += "select betOD.winner_name as winResult,  betOD.id as BetId, 'M' as marketType, betOD.user_id as userId,Match.name as matchName,Match.match_id as matchId,betOD.market_id as marketId,betOD.market_name as marketName,spt.sport_id as sportId,spt.name as sportName, ser.series_id as seriesId, ser.name as seriesName,betOD.selection_name as SelectionName,'' Size, CASE WHEN  betOD.patti_type = 'JODI' THEN 'Jodi' ELSE 'Haroof' END as Type, betOD.odds as Odds ,betOD.stack as Stack,betOD.liability as Liability," + profitLoss4 + " as PotentialProfit,betOD.created_ip as ipAddress, betOD.created_at as Placed, Match.draw_time as drawTime from matka_bets_odds as betOD INNER JOIN matka_matches as Match ON Match.match_id=betOD.match_id  INNER JOIN matka_markets as markt ON markt.market_id=betOD.market_id INNER JOIN sports as spt ON spt.sport_id=betOD.sport_id INNER JOIN matka_series as ser ON ser.series_id=Match.series_id where betOD.user_id=" + data.id + " AND betOD.delete_status IN(0,2)";

		if (data.betType == 'P') {
			query += " AND betOD.bet_result_id !=0 ";
		} else {
			query += " AND betOD.bet_result_id =0 ";
		}
		if (data.sport_id != 0) {
			if (data.sport_id == CONSTANTS.BETFAIR_SPORT_SANGAM_MATKA_PARENT || data.sport_id == CONSTANTS.BETFAIR_SPORT_SANGAM_TITLI_PARENT) {
				query += " AND spt.parent_id=" + data.sport_id;
			} else {
				query += " AND spt.sport_id=" + data.sport_id;
			}
		}
		if (data.match_id != 0) {
			query += " AND betOD.match_id=" + data.match_id;
		}
		if (data.market_id != 0) {
			query += " AND betOD.market_id='" + data.market_id + "'";
		}
		if (data.from_date > 0) {
			query += " AND betOD.created_at >=" + data.from_date;
		}
		if (data.to_date > 0) {
			query += " AND betOD.created_at <= " + data.to_date;
		}

		/* */
		query += " UNION ALL ";

		let profitLoss3 = "";
		if (data.betType == 'P') {
			profitLoss3 = " ISNULL(betOD.chips,0) ";
		} else {
			profitLoss3 = " ISNULL(betOD.p_l,0) ";
		}
		query += "select betOD.winner_name as winResult,  betOD.id as BetId, 'B' as marketType, betOD.user_id as userId,Match.name + ' #' + betOD.market_id as matchName,Match.match_id as matchId,betOD.market_id as marketId,betOD.market_name  as marketName,spt.sport_id as sportId,spt.name as sportName, ser.series_id as seriesId, ser.name as seriesName,betOD.selection_name as SelectionName,'' Size, CASE WHEN  betOD.is_back = 0 THEN 'Lay' ELSE 'Back' END as Type, betOD.odds as Odds ,betOD.stack as Stack,betOD.liability as Liability," + profitLoss3 + " as PotentialProfit,betOD.created_ip as ipAddress, betOD.created_at as Placed, '' as drawTime  from cassino_bets_odds as betOD INNER JOIN cassino_matches as Match ON Match.match_id=betOD.match_id INNER JOIN sports as spt ON spt.sport_id=betOD.sport_id INNER JOIN cassino_series as ser ON ser.series_id=Match.series_id where betOD.user_id=" + data.id + " AND betOD.delete_status IN(0,2)";
		if (data.betType == 'P') {
			query += " AND betOD.bet_result_id !=0 ";
		} else {
			query += " AND betOD.bet_result_id =0 ";
		}
		if (data.sport_id != 0) {
			query += " AND Match.sport_id=" + data.sport_id;
		}
		if (data.match_id != 0) {
			query += " AND betOD.match_id=" + data.match_id;
		}
		if (data.market_id != 0) {
			query += " AND betOD.market_id='" + data.market_id + "'";
		}
		if (data.from_date > 0) {
			query += " AND betOD.created_at >=" + data.from_date;
		}
		if (data.to_date > 0) {
			query += " AND betOD.created_at <= " + data.to_date;
		}
		/* */

		query += " UNION ALL ";
		let profitLoss2 = "";
		if (data.betType == 'P') {
			profitLoss2 = " ISNULL(betFn.chips,0)";
		} else {
			profitLoss2 = "ISNULL(betFn.profit,0)";
		}

		query += " select CONVERT(VARCHAR, CONVERT(VARCHAR(255), fnc.result))  as winResult,  betFn.id as BetId,'F' as marketType, betFn.user_id as userId,Match.name as matchName,Match.match_id as matchId, betFn.fancy_id as marketId,betFn.fancy_name as marketName,spt.sport_id as sportId,spt.name as sportName, ser.series_id as seriesId, ser.name as seriesName,CASE WHEN betFn.is_back = 0 THEN 'N0' ELSE 'Yes' END as SelectionName,betFn.size as Size,CASE WHEN betFn.is_back = 0 THEN 'Lay' ELSE 'Back' END as Type,betFn.run as Odds ,betFn.stack as Stack,betFn.liability as Liability," + profitLoss2 + " as PotentialProfit, betFn.created_ip as ipAddress, betFn.created_at as Placed,  '' as drawTime  from bets_fancy as betFn INNER JOIN fancies as fnc ON fnc.match_id=betFn.match_id AND fnc.selection_id= betFn.fancy_id INNER JOIN matches as Match ON Match.match_id=betFn.match_id INNER JOIN sports as spt ON spt.sport_id=betFn.sport_id INNER JOIN series as ser ON ser.series_id=Match.series_id  where betFn.user_id=" + data.id + " AND betFn.delete_status IN(0,2)";

		if (data.betType == 'P') {
			query += " AND betFn.bet_result_id != 0";
		} else {
			query += " AND betFn.bet_result_id IS NULL ";
		}

		if (data.sport_id != 0) {
			query += " AND Match.sport_id=" + data.sport_id;
		}
		if (data.match_id != 0) {
			query += " AND betFn.match_id=" + data.match_id;
		}
		if (data.market_id != 0) {
			query += " AND betFn.fancy_id='" + data.market_id + "'";
		}
		if (data.from_date > 0) {
			query += "AND betFn.created_at >=" + data.from_date;
		}
		if (data.to_date > 0) {
			query += "AND betFn.created_at <= " + data.to_date;
		}
		query += " ORDER BY Placed DESC  OFFSET  " + offset + " ROWS FETCH NEXT " + data.limit + " ROWS ONLY ";

		console.log(query);
		const result = await pool.request().query(query)

		if (result.recordsets.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {

		console.log("error  ", error);

		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};

let getUserProfitLossMatchAndMarket = async (data) => {
	try {
		const pool = await poolPromise;

		var offset = (data.pageno - 1) * data.limit;

		let query = "";
		let condition = "";
		let condition2 = "";
		let condition3 = "";
		if (data.betType == 'P') {
			condition = "user_id=" + data.id + "";
			if (data.sport_id != 0) {
				condition += " AND sport_id=" + data.sport_id;
			}
			if (data.match_id != 0) {
				condition += " AND match_id=" + data.match_id;
			}
			if (data.from_date > 0) {
				condition += " AND created_at >=" + data.from_date;
			}
			if (data.to_date > 0) {
				condition += " AND created_at <= " + data.to_date;
			}
			query += "select upl.*,mtch.name as matchName,mtch.match_id as matchId,spt.name as sportName,spt.sport_id as sportId,serie.series_id as seriesId,serie.name as seriesName,mtch.start_date as matchDate , '' as winnerName, '' drawTime from (select match_id,sport_id, sum(user_pl) as userPL, sum(stack) as stack, sum(user_commission) as userComm from user_profit_loss where " + condition + " group by match_id,sport_id ) as upl  INNER JOIN matches as mtch ON mtch.match_id=upl.match_id  INNER JOIN sports as spt ON spt.sport_id=upl.sport_id INNER JOIN series as serie ON serie.series_id=mtch.series_id";
			//query += " ORDER BY mtch.start_date DESC  OFFSET  "+offset+" ROWS FETCH NEXT "+data.limit+" ROWS ONLY ";


			condition2 = "user_id=" + data.id + "";
			if (data.sport_id != 0) {
				if (data.sport_id == CONSTANTS.BETFAIR_SPORT_CASINO) {
					condition2 += " AND sport_id IN (SELECT sport_id from sports where parent_id=" + data.sport_id + ")";
				} else {
					condition2 += " AND sport_id=" + data.sport_id;
				}
			}
			if (data.match_id != 0) {
				condition2 += " AND match_id=" + data.match_id;
			}
			if (data.from_date > 0) {
				condition2 += " AND created_at >=" + data.from_date;
			}
			if (data.to_date > 0) {
				condition2 += " AND created_at <= " + data.to_date;
			}
			query += " UNION ALL ";

			query += "select upl.*,mtch.name + ' #' + CAST( mtch.match_id AS varchar) as matchName,mtch.match_id as matchId,spt.name as sportName,spt.sport_id as sportId,serie.series_id as seriesId,serie.name as seriesName,mtch.start_date as matchDate ,  '' as winnerName,'' drawTime from (select match_id,sport_id, sum(user_pl) as userPL, sum(stack) as stack, sum(user_commission) as userComm from user_profit_loss where " + condition2 + " group by match_id,sport_id ) as upl  INNER JOIN cassino_matches as mtch ON mtch.match_id=upl.match_id  INNER JOIN sports as spt ON spt.sport_id=upl.sport_id INNER JOIN cassino_series as serie ON serie.series_id=mtch.series_id";

			//query += " ORDER BY mtch.start_date DESC  OFFSET  "+offset+" ROWS FETCH NEXT "+data.limit+" ROWS ONLY ";

			condition3 = "user_id=" + data.id + "";
			if (data.sport_id != 0) {
				if (data.sport_id == CONSTANTS.BETFAIR_SPORT_SANGAM_MATKA_PARENT || data.sport_id == CONSTANTS.BETFAIR_SPORT_SANGAM_TITLI_PARENT) {
					condition3 += " AND sport_id IN (SELECT sport_id from sports where parent_id=" + data.sport_id + ")";
				} else {
					condition3 += " AND sport_id=" + data.sport_id;
				}
			}
			if (data.match_id != 0) {
				condition3 += " AND match_id=" + data.match_id;
			}
			if (data.from_date > 0) {
				condition3 += " AND created_at >=" + data.from_date;
			}
			if (data.to_date > 0) {
				condition3 += " AND created_at <= " + data.to_date;
			}
			query += " UNION ALL ";
			query += "select upl.*,mtch.name + ' #' + CAST( mtch.match_id AS varchar) as matchName,mtch.match_id as matchId,spt.name as sportName,spt.sport_id as sportId,serie.series_id as seriesId,serie.name as seriesName,mtch.start_time as matchDate, mkrt.winner_name as winnerName, mtch.draw_time as drawTime  from (select match_id,sport_id, sum(user_pl) as userPL, sum(stack) as stack, sum(user_commission) as userComm from user_profit_loss where " + condition3 + " group by match_id,sport_id ) as upl INNER JOIN matka_matches as mtch ON mtch.match_id=upl.match_id INNER JOIN matka_markets as mkrt ON mkrt.match_id=upl.match_id AND  mkrt.name='OPEN' INNER JOIN sports as spt ON spt.sport_id=upl.sport_id INNER JOIN matka_series as serie ON serie.series_id=mtch.series_id";

			if (data.sport_id == CONSTANTS.BETFAIR_SPORT_SANGAM_TITLI) {
				query += " ORDER BY mtch.start_time DESC  OFFSET  " + offset + " ROWS FETCH NEXT " + data.limit + " ROWS ONLY ";
			} else {
				query += " ORDER BY mtch.start_date DESC  OFFSET  " + offset + " ROWS FETCH NEXT " + data.limit + " ROWS ONLY ";
			}

		} else {
			//query+="select * from odds_profit_loss as Opl INNER JOIN matches as mtch ON mtch.match_id=Opl.match_id where Opl.user_id="+data.id+"";
			query += "select Opl.id,mtch.name as matchName,mtch.match_id as matchId,spt.name as sportName,spt.sport_id as sportId,serie.series_id as seriesId,serie.name as seriesName,mtch.start_date as matchDate, '' as stack,Opl.win_loss_value as userPL,'' as userComm,'' as description,'' as refferedName, '' winnerName, '' drawTime from odds_profit_loss as Opl INNER JOIN matches as mtch ON mtch.match_id=Opl.match_id INNER JOIN sports as spt ON spt.sport_id=mtch.sport_id INNER JOIN series as serie ON serie.series_id=mtch.series_id  where Opl.user_id=" + data.id + "";
			if (data.sport_id != 0) {
				query += " AND mtch.sport_id=" + data.sport_id;
			}
			if (data.match_id != 0) {
				query += " AND Opl.match_id=" + data.match_id;
			}
			// if(data.market_id !=0 ){			
			// 	query += " AND Opl.market_id="+data.market_id;
			// }
			if (data.from_date > 0) {
				query += " AND mtch.start_date >=" + data.from_date;
			}
			if (data.to_date > 0) {
				query += " AND mtch.start_date <= " + data.to_date;
			}
			query += " ORDER BY mtch.start_date DESC  OFFSET  " + offset + " ROWS FETCH NEXT " + data.limit + " ROWS ONLY ";
			console.log(query);
		}



		//console.log(query);
		const result = await pool.request()
			.query(query)

		if (result.recordsets.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {

		console.log("error  ", error);

		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getUserProfitLossLMatchID = async (data) => {
	try {
		const pool = await poolPromise;

		//	var offset = (data.pageno-1) * data.limit;  

		let query = "";
		query += "select upl.id, 'B' as marketType, markt.market_id as marketId,markt.name as marketName, markt.winner_name  as winnerName, upl.stack as stack,upl.user_pl as userPL,upl.user_commission as userComm,upl.description as description,upl.reffered_name as refferedName, markt.sport_id as sportId, '' drawTime  from user_profit_loss as upl INNER JOIN markets as markt ON markt.market_id=upl.market_id where upl.user_id=" + data.id + " AND upl.type=1";

		if (data.sport_id != 0) {
			query += " AND upl.sport_id=" + data.sport_id;
		}
		if (data.match_id != 0) {
			query += " AND upl.match_id=" + data.match_id;
		}

		query += " UNION ALL ";


		query += "select upl.id,'F' as marketType,fancy.selection_id as marketId,fancy.name as marketName,CAST(fancy.result as varchar(100)) as winnerName,upl.stack as stack,upl.user_pl as userPL, upl.user_commission as userComm, upl.description as description, upl.reffered_name as refferedName, fancy.sport_id as sportId, '' drawTime from user_profit_loss as upl  INNER JOIN fancies as fancy ON CAST(fancy.selection_id as varchar(100))=upl.market_id AND fancy.match_id=upl.match_id where upl.user_id=" + data.id + " AND upl.type=2";

		if (data.sport_id != 0) {
			query += " AND upl.sport_id=" + data.sport_id;
		}
		if (data.match_id != 0) {
			query += " AND upl.match_id=" + data.match_id;
		}

		query += " UNION ALL ";

		query += "select upl.id, 'M' as marketType, markt.market_id as marketId,markt.display_name as marketName,markt.winner_name as winnerName,upl.stack as stack,upl.user_pl as userPL,upl.user_commission as userComm,upl.description as description,upl.reffered_name as refferedName, markt.sport_id as sportId, mtch.draw_time as drawTime  from user_profit_loss as upl INNER JOIN matka_markets as markt ON markt.market_id=upl.market_id INNER JOIN matka_matches as mtch ON mtch.match_id = markt.match_id where upl.user_id=" + data.id + " AND upl.type=1";

		if (data.sport_id != 0) {
			query += " AND upl.sport_id=" + data.sport_id;
		}
		if (data.match_id != 0) {
			query += " AND upl.match_id=" + data.match_id;
		}
		console.log(query);
		const result = await pool.request().query(query)

		if (result.recordsets.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {

		console.log("error  ", error);

		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getUserSportWiseSettings = async (data) => {
	try {
		const pool = await poolPromise;
		let inplayDate = Math.floor(Date.now() / 1000);
		const result = await pool.request()
			.input('sport_id', sql.VarChar(50), data.sport_id)
			.input('user_id', sql.Int, data.id)
			.query("select spt.sport_id,spt.name,spt.is_manual,spt.is_show_last_result,spt.is_show_tv,spt.is_live_sport,spt.score,spt.graphic, uSetting.one_click_stack,uSetting.match_stack from sports as spt with(nolock)  JOIN user_setting_sport_wise as uSetting with(nolock) ON uSetting.sport_id =spt.sport_id and uSetting.user_id=@user_id where spt.sport_id=@sport_id AND uSetting.sport_id=@sport_id and uSetting.user_id=@user_id")

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

let DepositWithdrawalRequest = async function (data) {
	try {

		const pool = await poolPromise;
		let currentdate = globalFunction.currentDateTimeStamp();
		const resFromDB = await pool.request()
			.input('pUserid', sql.Int, data.id)
			.execute('GET_ALL_PARENT_USER');
		let getAllparent = Array();
		for (let i in resFromDB.recordset) {
			var resultGet = resFromDB.recordset[i]
			getAllparent[i] = resultGet.id;
		}

		const resFromDBSetting = await pool.request().query("SELECT value from settings where id=57");
		let settingData = resFromDBSetting.recordset[0];

		let finalAmount = data.amount;
		if (settingData.value != '' || settingData.value != 0) {
			let bonusAmount = (data.amount * settingData.value) / 100;
			finalAmount = bonusAmount + data.amount;
		}
		//console.log(finalAmount);
		//return;
		const resFromDBr = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('super_admin_id', sql.Int, getAllparent[0])
			.input('admin_id', sql.Int, getAllparent[1])
			.input('super_master_id', sql.Int, getAllparent[2])
			.input('master_id', sql.Int, getAllparent[3])
			.input('agent_id', sql.Int, getAllparent[4])
			.input('amount', sql.Int, finalAmount)
			.input('attachment', sql.VarChar(150), data.attachment)
			.input('description', sql.Text, data.description)
			.input('type', sql.VarChar(5), data.type)
			.input('created_by', sql.BigInt, data.id)
			.input('ip_address', sql.VarChar(150), data.ip_address)
			.input('currentdate', sql.BigInt, currentdate)
			.input('account_phone_number', sql.VarChar(255), data.account_phone_number)
			.input('account_ifsc_code', sql.VarChar(255), data.account_ifsc_code)
			.input('account_holder_name', sql.VarChar(255), data.account_holder_name)
			.input('user_ac_info_id', sql.Int, data.user_ac_info_id)
			.input('unique_transaction_id', sql.Text, data.unique_transaction_id)
			.input('sender_name', sql.VarChar(255), data.sender_name)
			.input('reciver_name', sql.VarChar(255), data.reciver_name)
			.input('deposit_withdraw_type', sql.VarChar(255), data.deposit_withdraw_type)
			.input('payment_method', sql.VarChar(255), data.payment_method)
			.query("insert into user_deposit_withdrawal_requests (user_id,super_admin_id,admin_id,super_master_id,master_id,agent_id, amount,attachment, description,type,status,created_by,created_ip,created_at,account_phone_number,account_ifsc_code, account_holder_name, user_ac_info_id, unique_transaction_id, sender_name, reciver_name, deposit_withdraw_type , payment_method ) values(@user_id,@super_admin_id,@admin_id,@super_master_id,@master_id,@agent_id,@amount,@attachment,@description,@type,'P',@user_id,@ip_address,@currentdate,@account_phone_number, @account_ifsc_code, @account_holder_name, @user_ac_info_id, @unique_transaction_id, @sender_name, @reciver_name , @deposit_withdraw_type, @payment_method ); SELECT SCOPE_IDENTITY() AS id");
		let lastInsId = resFromDBr.recordset[0].id;
		const saveProfilLoss = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('request_id', sql.Int, lastInsId)
			.input('created_by', sql.Int, data.id)
			.input('created_ip', sql.VarChar(150), data.ip_address)
			.input('created_at', sql.BigInt, currentdate)
			.input('request_json', sql.Text, JSON.stringify(data))
			.query("insert into request_log (user_id,request_id,status,created_by,created_ip,created_at,request_json) values (@user_id, @request_id, 'P', @created_by, @created_ip, @created_at,@request_json)");

		return resultdb(CONSTANTS.SUCCESS, saveProfilLoss.recordsets);
	} catch (error) {
		console.error(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let DepositWithdrawalCancel = async function (data) {
	try {

		const pool = await poolPromise;
		let currentdate = globalFunction.currentDateTimeStamp();

		const resFromDBr = await pool.request()
			.input('request_id', sql.Int, data.request_id)
			.input('reason', sql.Text, data.reason)
			.input('status', sql.VarChar(5), data.type)
			.input('updated_by', sql.BigInt, data.id)
			.input('currentdate', sql.BigInt, currentdate)
			.query("update user_deposit_withdrawal_requests SET reason=@reason,status=@status,updated_by=@updated_by,updated_at=@currentdate Where id=@request_id AND user_id=@updated_by");

		const saveProfilLoss = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('request_id', sql.Int, data.request_id)
			.input('status', sql.VarChar(5), data.type)
			.input('created_by', sql.Int, data.id)
			.input('created_ip', sql.VarChar(150), data.ip_address)
			.input('created_at', sql.BigInt, currentdate)
			.query("insert into request_log (user_id,request_id,status,created_by,created_ip,created_at) values (@user_id, @request_id, @status, @created_by, @created_ip, @created_at)");

		return resultdb(CONSTANTS.SUCCESS, saveProfilLoss.recordsets);
	} catch (error) {
		console.error(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let userChatRequestCancel = async function (data) {
	try {

		const pool = await poolPromise;
		let currentdate = globalFunction.currentDateTimeStamp();

		const resFromDBr = await pool.request()
			.input('request_id', sql.VarChar(255), data.request_id)
			.input('reason', sql.Text, data.reason)
			.input('status', sql.VarChar(5), data.status)
			.input('updated_by', sql.BigInt, data.id)
			.query("update user_request SET reason=@reason,status=@status Where ticket_id=@request_id AND user_id=@updated_by");
		return resultdb(CONSTANTS.SUCCESS, resFromDBr.recordsets);
		/* const saveProfilLoss = await pool.request()	
		.input('user_id', sql.Int,data.id)
		.input('request_id', sql.Int,data.request_id)
		.input('status', sql.VarChar(5), data.type)		
		.input('created_by',sql.Int,data.id)
		.input('created_ip', sql.VarChar(150),data.ip_address)
		.input('created_at', sql.BigInt,currentdate)
		.query("insert into request_log (user_id,request_id,status,created_by,created_ip,created_at) values (@user_id, @request_id, @status, @created_by, @created_ip, @created_at)");
		return resultdb(CONSTANTS.SUCCESS, saveProfilLoss.recordsets); */

	} catch (error) {
		console.error(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let ChatRequest = async function (data) {
	try {

		const pool = await poolPromise;
		let currentdate = globalFunction.currentDateTimeStamp();
		const resFromDB = await pool.request()
			.input('pUserid', sql.Int, data.id)
			.execute('GET_ALL_PARENT_USER');
		let getAllparent = Array();
		for (let i in resFromDB.recordset) {
			var resultGet = resFromDB.recordset[i]
			getAllparent[i] = resultGet.id;
		}

		let ticketId = 'TC' + String(currentdate).slice(-4) + '' + data.id;
		let messageId = 'MSG' + String(currentdate).slice(-4) + '' + data.id;
		const resFromDBr = await pool.request()
			.input('user_id', sql.Int, data.id)
			.input('super_admin_id', sql.Int, getAllparent[0])
			.input('admin_id', sql.Int, getAllparent[1])
			.input('super_master_id', sql.Int, getAllparent[2])
			.input('master_id', sql.Int, getAllparent[3])
			.input('agent_id', sql.Int, getAllparent[4])
			.input('attachment', sql.VarChar(150), data.attachment)
			.input('message', sql.Text, data.message)
			.input('access_user', sql.VarChar(5), data.access_user)
			.input('ticket_id', sql.VarChar(255), ticketId)
			.input('created_ip', sql.VarChar(150), data.ip_address)
			.input('currentdate', sql.BigInt, currentdate)
			.query("insert into user_request (user_id,super_admin_id,admin_id,super_master_id,master_id,agent_id, attachment, message,access_user,ticket_id,created_ip,created_at) values(@user_id,@super_admin_id,@admin_id,@super_master_id,@master_id,@agent_id,@attachment,@message,@access_user,@ticket_id,@created_ip,@currentdate) SELECT SCOPE_IDENTITY() AS request_id");

		let lastInsId = resFromDBr.recordset[0].request_id;


		const resFromDBr2 = await pool.request()
			.input('request_id', sql.Int, lastInsId)
			.input('sender_id', sql.Int, data.id)
			.input('attachment', sql.VarChar(150), data.attachment)
			.input('message', sql.Text, data.message)
			.input('message_id', sql.VarChar(255), messageId)
			.input('ticket_id', sql.VarChar(255), ticketId)
			.input('created_ip', sql.VarChar(150), data.ip_address)
			.input('currentdate', sql.BigInt, currentdate)
			.query("insert into user_request_chat (request_id,sender_id , attachment, message,message_id,ticket_id,created_ip,created_at) values(@request_id,@sender_id,@attachment,@message,@message_id,@ticket_id,@created_ip,@currentdate)");

		return resultdb(CONSTANTS.SUCCESS, ticketId);

	} catch (error) {
		console.error(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let ChatRequestList = async function (data) {
	try {
		const pool = await poolPromise;
		let offset = (data.page - 1) * data.limit;
		let query = "select  ticket_id,message,attachment,created_at,(CASE WHEN access_user='SA' THEN 'Super Admin' ELSE CASE WHEN access_user='D'THEN 'Dealer' ELSE 'All' END END) as userType,(CASE WHEN status='P' THEN 'Pending' ELSE CASE WHEN status='R'THEN 'Replied' ELSE CASE WHEN status='C'THEN 'Closed' ELSE CASE WHEN status='CA'THEN 'Cancelled' ELSE 'ALL'  END END END END) as statusName,status,reason from user_request as lst where lst.user_id=" + data.id + " ";
		if (data.from_date > 0) {
			query += " AND lst.created_at >=" + data.from_date;
		}
		if (data.type !== 'A') {
			query += " AND access_user='" + data.type + "'";
		}
		if (data.type !== 'A') {
			query += " AND access_user='" + data.type + "'";
		}
		if (data.status !== 'A') {
			query += " AND status='" + data.status + "'";
		}

		if (data.to_date > 0) {
			query += " AND lst.created_at <= " + data.to_date;
		}

		query += " order by lst.id desc OFFSET  " + offset + " ROWS FETCH NEXT " + data.limit + " ROWS ONLY";
		//console.log(query);
		const result = await pool.request()
			.query(query)

		if (result.recordsets === null || result.recordsets.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {

		console.log("error  ", error);

		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}


let userConversion = async function (data) {
	try {
		const pool = await poolPromise;
		//let offset = (data.page-1) * data.limit;
		let query = "select  TOP " + data.limit + " uchat.attachment,uchat.message_id,uchat.message,uchat.created_at,usr.user_name,usr.name from user_request_chat as uchat inner join users as usr with(nolock) ON usr.id=uchat.sender_id where uchat.ticket_id ='" + data.ticket_id + "'";
		if (data.type === 'O' && data.message_id != '0') {
			query += " AND uchat.id < (SELECT id FROM user_request_chat where message_id='" + data.message_id + "')";
		}
		else if (data.type === 'N' && data.message_id != '0') {
			query += " AND uchat.id > (SELECT id FROM user_request_chat where message_id='" + data.message_id + "')";
		}
		query += " order by uchat.id DESC";  // OFFSET  "+offset+" ROWS FETCH NEXT "+data.limit+" ROWS ONLY";
		//console.log(query);
		const result = await pool.request()
			.query(query)

		if (result.recordsets === null || result.recordsets.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0].reverse());
		}
	} catch (error) {

		console.log("error  ", error);

		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}


let userConversionChat = async function (data) {
	try {

		const pool = await poolPromise;
		let currentdate = globalFunction.currentDateTimeStamp();

		let query = "select  id from user_request as lst where lst.ticket_id='" + data.ticket_id + "'";

		const result = await pool.request()
			.query(query)
		let request_id = result.recordset[0].id;

		let messageId = 'MSG' + String(currentdate).slice(-4) + '' + data.id;

		const resFromDBr = await pool.request()
			.input('request_id', sql.Int, request_id)
			.input('sender_id', sql.Int, data.id)
			.input('attachment', sql.VarChar(150), data.attachment)
			.input('message', sql.Text, data.message)
			.input('message_id', sql.VarChar(255), messageId)
			.input('ticket_id', sql.VarChar(255), data.ticket_id)
			.input('created_ip', sql.VarChar(150), data.ip_address)
			.input('currentdate', sql.BigInt, currentdate)
			.query("insert into user_request_chat (request_id,sender_id , attachment, message,message_id,ticket_id,created_ip,created_at) values(@request_id,@sender_id,@attachment,@message,@message_id,@ticket_id,@created_ip,@currentdate)");

		return resultdb(CONSTANTS.SUCCESS, resFromDBr.recordsets);
	} catch (error) {
		console.error(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let userDepositWithdrawalRequestList = async function (data) {
	try {
		const pool = await poolPromise;
		let offset = (data.page - 1) * data.limit;
		/* let query="select id,round(amount,2) as amount,description,reason,(CASE WHEN type='D' THEN 'Deposit' ELSE CASE WHEN type='W' THEN 'Withdrawal' ELSE '' END END) as type,(CASE WHEN status='P' THEN 'Pending' ELSE CASE WHEN status='D'THEN 'Declined' ELSE CASE WHEN status='C' THEN 'Cancelled' ELSE CASE WHEN status='A'THEN 'Approved' ELSE ''  END END END END) as statusName,status,created_at from user_deposit_withdrawal_requests  where  user_id ="+data.id+""; */

		let query = "select id,round(amount,2) as amount,attachment ,description,reason,(CASE WHEN type='D' THEN 'Deposit' ELSE CASE WHEN type='W' THEN 'Withdrawal' ELSE '' END END) as type,status,created_at, account_phone_number as accountNumber , account_ifsc_code as ifscCode, account_holder_name as accountHolder, unique_transaction_id as UTR, sender_name as senderName, reciver_name as reciverName, deposit_withdraw_type as requestMethod, payment_method as paymentMethod from user_deposit_withdrawal_requests  where  user_id =" + data.id + "";

		if (data.from_date > 0) {
			query += " AND created_at >=" + data.from_date;
		}
		if (data.to_date > 0) {
			query += " AND created_at <= " + data.to_date;
		}
		if (data.type !== 'AL') {
			query += " AND type ='" + data.type + "'";
		}
		if (data.status !== 'AL') {
			query += " AND status ='" + data.status + "'";
		}
		query += " order by id DESC OFFSET  " + offset + " ROWS FETCH NEXT " + data.limit + " ROWS ONLY";
		//console.log(query);
		const result = await pool.request()
			.query(query)

		if (result.recordsets === null || result.recordsets.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {

		console.log("error  ", error);

		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}


let getRequestCount = async function (data) {
	try {
		const pool = await poolPromise;
		let query = "select count(*) as requestCount,SUM(round(amount,2)) as amount from user_deposit_withdrawal_requests  where  user_id =" + data.id + "";

		/* if(data.type !== null ){			
			query += " AND type ='"+data.type+"'";
		} */
		query += " AND status ='P'";
		//query += " order by id DESC";
		//console.log(query);
		const result = await pool.request().query(query);

		if (result.recordsets === null || result.recordsets[0].length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}
	} catch (error) {

		console.log("error  ", error);

		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}


let globalSettings = async function () {
	try {
		const pool = await poolPromise;
		let result = await pool.request()
			.query('SELECT user_register as register,created_at,ezugi_created_at, register_otp, forgot_otp, login_otp FROM global_settings');
		if (result.recordsets.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}
	} catch (error) {
		console.error(error);

		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}
let getRules = async function () {
	try {
		const pool = await poolPromise;
		let result = await pool.request()
			.query("SELECT 'Rules' as title,[value] as rules from settings where [key]='rules.description' AND [group]='rules'");
		if (result.recordsets.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}
	} catch (error) {
		console.error(error);

		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}

let register = async (data, dealerData) => {
	try {

		let hash = bcrypt.hashSync(data.password, 10);
		hash = hash.replace('$2b$', '$2y$');
		const pool = await poolPromise;
		let currentdate = globalFunction.currentDateTimeStamp();
		let user_front_menaul = 'Y';
		let register_user_status = settings.FRONT_USER_REGISTER_APPROVAL_AUTO_PENDING_P_ACTIVE_A;

		const resFromDBr = await pool.request()
			.input('role_id', sql.Int, CONSTANTS.USER_TYPE_USER)
			.input('parent_id', sql.Int, dealerData.id)
			.input('super_admin_id', sql.Int, dealerData.super_admin_id)
			.input('admin_id', sql.Int, dealerData.admin_id)
			.input('super_id', sql.Int, dealerData.super_id)
			.input('master_id', sql.Int, dealerData.master_id)
			.input('agent_id', sql.Int, dealerData.id)
			.input('name', sql.VarChar(50), data.name)
			.input('email', sql.VarChar(50), data.email)
			.input('user_name', sql.VarChar(50), data.username)
			.input('mobile', sql.VarChar(50), data.mobile)
			.input('password', sql.VarChar(150), hash)
			.input('user_front_menaul', sql.VarChar(150), user_front_menaul)
			.input('register_user_status', sql.VarChar(150), register_user_status)
			.input('domain_id', sql.Int, settings.DOMAIN_ID)
			.input('created_ip', sql.VarChar(50), data.ip_address)
			.input('created_at', sql.VarChar(50), currentdate)
			.query("insert into users (role_id,parent_id,super_admin_id,admin_id,super_id,master_id,agent_id, name, email, user_name,mobile,user_front_menaul,register_user_status,password,domain_id,created_at,created_ip) values(@role_id,@parent_id,@super_admin_id,@admin_id,@super_id,@master_id,@agent_id,@name,@email,@user_name,@mobile, @user_front_menaul,@register_user_status,@password,@domain_id, @created_at,@created_ip) SELECT SCOPE_IDENTITY() AS id");

		let lastInsId = resFromDBr.recordset[0].id;

		if (lastInsId !== null) {
			let query = "INSERT INTO user_setting_sport_wise (assign_sport, sport_id,user_id,parent_id,match_commission,session_commission,bet_delay,session_delay,min_match_stack,max_match_stack,min_session_stack,max_session_stack,session_max_profit,session_max_loss,max_profit,max_loss,min_exposure,max_exposure,winning_limit,one_click_stack,match_stack,created_ip,created_by,created_at) SELECT assign_sport, sport_id," + lastInsId + "," + dealerData.id + ",match_commission,session_commission,bet_delay,session_delay,min_match_stack,max_match_stack,min_session_stack,max_session_stack,session_max_profit,session_max_loss,max_profit,max_loss,min_exposure,max_exposure,winning_limit,'" + settings.REGISTER_ONE_CLICK_STAKE + "','" + settings.REGISTER_MATCH_STAKE + "','" + data.ip_address + "',0," + currentdate + " from user_default_settings where user_id=" + dealerData.id + "";
			await pool.request().query(query);

			let userDefaultSetting = "INSERT INTO user_default_settings (assign_sport,sport_id,user_id,match_commission,session_commission,bet_delay,session_delay,min_match_stack,max_match_stack,min_session_stack,max_session_stack,session_max_profit,session_max_loss,max_profit,max_loss,min_exposure,max_exposure,winning_limit,partnership , created_ip,created_by) SELECT  assign_sport,sport_id," + lastInsId + ",match_commission,session_commission,bet_delay,session_delay,min_match_stack,max_match_stack,min_session_stack,max_session_stack,session_max_profit,session_max_loss,max_profit,max_loss,min_exposure,max_exposure,winning_limit,partnership,'" + data.ip_address + "',0 from user_default_settings where user_id=" + dealerData.id + "";
			await pool.request().query(userDefaultSetting);

			let userPartnership = " INSERT INTO partnerships (user_type_id, user_id ,parent_id ,sport_id ,super_admin ,admin ,super_master ,master ,agent ,created_ip ,created_by ,created_at ,super_admin_match_commission ,admin_match_commission ,super_master_match_commission ,master_match_commission ,agent_match_commission ,user_match_commission ,super_admin_session_commission ,admin_session_commission ,super_master_session_commission ,master_session_commission ,agent_session_commission,user_session_commission ,commission_type_partnership_percentage ,user_commission_lena_dena) SELECT  " + CONSTANTS.USER_TYPE_USER + ", " + lastInsId + "," + dealerData.id + ",sport_id ,super_admin ,admin ,super_master ,master ,agent, '" + data.ip_address + "',0," + currentdate + ",super_admin_match_commission ,admin_match_commission ,super_master_match_commission ,master_match_commission ,agent_match_commission ,user_match_commission ,super_admin_session_commission ,admin_session_commission ,super_master_session_commission ,master_session_commission ,agent_session_commission,user_session_commission ,commission_type_partnership_percentage ,user_commission_lena_dena from partnerships where user_id=" + dealerData.id + "";
			await pool.request().query(userPartnership);

		} else {
			return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
		}

		return resultdb(CONSTANTS.SUCCESS, lastInsId);
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getuserbyusernameandmobile = async (mobile) => {
	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('mobile', sql.VarChar(50), mobile)
			.input('USER_TYPE_USER', sql.VarChar(50), CONSTANTS.USER_TYPE_USER)
			.query("select mobile, id from users with(nolock) where mobile=@mobile");

		if (result.recordsets === null || result.recordsets[0].length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let registerWithOTP = async function (data, dealerData) {
	let hash = bcrypt.hashSync(data.password, 10);
	hash = hash.replace('$2b$', '$2y$');
	const pool = await poolPromise;

	await pool.request()
		.input('mobile', sql.BigInt, data.mobile)
		.query("delete from  register_with_otp where mobile=@mobile");

	let currentdate = globalFunction.currentDateTimeStamp();
	let user_front_menaul = 'Y';
	let register_user_status = settings.FRONT_USER_REGISTER_APPROVAL_AUTO_PENDING_P_ACTIVE_A;
	let otpMessage = settings.REGISTER_USER_OTP_MESSAGE;
	otpMessage = otpMessage.replace("@message", "login");
	let messageOPT = Math.floor(1000 + Math.random() * 9000);
	otpMessage = otpMessage.replace("@messageOPT", messageOPT);
	let messageAPI = settings.REGISTER_USER_WITH_OTP + data.mobile + '&sms=' + encodeURI(otpMessage);
	let response2 = await axios.get(messageAPI);
	if (response2.status == 200) {
		let registerOTP = messageOPT;
		const resFromDBr = await pool.request()
			.input('parent_id', sql.Int, dealerData.id)
			.input('super_admin_id', sql.Int, dealerData.super_admin_id)
			.input('admin_id', sql.Int, dealerData.admin_id)
			.input('super_id', sql.Int, dealerData.super_id)
			.input('master_id', sql.Int, dealerData.master_id)
			.input('agent_id', sql.Int, dealerData.id)
			.input('name', sql.VarChar(50), data.name)
			.input('user_name', sql.VarChar(50), data.username)
			.input('mobile', sql.BigInt, data.mobile)
			.input('password', sql.VarChar(150), hash)
			.input('user_front_menaul', sql.VarChar(150), user_front_menaul)
			.input('register_user_status', sql.VarChar(150), register_user_status)
			.input('created_ip', sql.VarChar(50), data.ip_address)
			.input('created_at', sql.VarChar(50), currentdate)
			.input('register_otp', sql.BigInt, registerOTP)
			.query("insert into register_with_otp (parent_id,super_admin_id,admin_id,super_master_id,master_id,agent_id, name, user_name,mobile,user_front_menaul,register_user_status,password,created_at,created_ip,register_otp) values(@parent_id,@super_admin_id,@admin_id,@super_id,@master_id,@agent_id,@name,@user_name,@mobile, @user_front_menaul,@register_user_status,@password, @created_at,@created_ip,@register_otp) SELECT SCOPE_IDENTITY() AS id");
		if (resFromDBr.recordset.length > 0) {
			return resultdb(CONSTANTS.SUCCESS, resFromDBr.recordset[0].id);
		} else {
			return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
		}
	}
}

let registerdealer = async function () {
	try {
		const pool = await poolPromise;
		let result = await pool.request()
			.query("SELECT * FROM users with(nolock) where is_front_user_register='Y' AND role_id=" + CONSTANTS.USER_TYPE_AGENT + "");

		if (result.recordsets.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}
	} catch (error) {
		console.error(error);

		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}
let getUserBalanceOnly = async (id) => {
	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('input_parameter', sql.Int, id)
			.query('select balance,liability  from users with(nolock) where  id = @input_parameter and role_id=' + CONSTANTS.USER_TYPE_USER + '');
		if (result.recordsets.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			delete result.recordsets[0][0].password;
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};



let userFaurdCallApi = async (data) => {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		//if(data.id > 0)	 {
		const result = await pool.request()
			.input('user_id', sql.Int, data.id)
			.query('select count(*) as userLoginCount from user_fraud_logs where  user_id = @user_id');

		if (result.recordset === null || result.recordset.length == 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			if (result.recordsets[0][0].userLoginCount >= 2 && data.id > 0) {
				let self_close_account = 'Y';
				let invalid_activites = 1;
				const result = await pool.request()
					.input('user_id', sql.Int, data.id)
					.input('invalid_activites', sql.Int, invalid_activites)
					.input('close_account', sql.VarChar(150), self_close_account)
					.query('UPDATE users SET  self_close_account=@close_account, invalid_activites +=@invalid_activites where id = @user_id');

				return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

			} else {
				if (data.id > 0) {
					let invalid_activites = 1;
					const result = await pool.request()
						.input('user_id', sql.Int, data.id)
						.input('invalid_activites', sql.Int, invalid_activites)
						.query('UPDATE users SET  invalid_activites +=@invalid_activites where id = @user_id');
				}
				await pool.request()
					.input('user_id', sql.Int, data.id)
					.input('type', sql.VarChar(150), data.type)
					.input('description', sql.Text, data.description)
					.input('device_type', sql.Text, data.device_info)
					.input('created_at', sql.BigInt, currentdate)
					.input('created_ip', sql.VarChar(255), data.ip_address)
					.query("insert into user_fraud_logs (user_id, type, description,device_type,created_at,created_ip) values(@user_id,@type,@description,@device_type,@created_at,@created_ip)");

				return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);
			}
		}
		//}
		//return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);		


	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let updateLobbyLotusUserBalance = async function (insertData) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		let getUserParentData = "SELECT super_admin,admin,super_master,master,agent,super_admin_id,admin_id,super_id as super_master_id,master_id,agent_id , super_admin_match_commission, admin_match_commission, super_master_match_commission, master_match_commission, agent_match_commission, user_match_commission FROM users usr with(nolock) JOIN partnerships part with(nolock) ON part.user_id=usr.id WHERE part.user_id=" + insertData.usergetId + " and usr.id=" + insertData.usergetId + " and part.sport_id=" + CONSTANTS.BETFAIR_SPORT_CASINO_LOTUS;

		const getAllparentData = await pool.request().query(getUserParentData);

		let super_admin_id = 0;
		let admin_id = 0;
		let super_master_id = 0;
		let master_id = 0;
		let agent_id = 0;

		let super_admin_partnership = 0;
		let admin_partnership = 0;
		let super_master_partnership = 0;
		let master_partnership = 0;
		let agent_partnership = 0;

		let super_admin_commission = 0;
		let admin_commission = 0;
		let super_master_commission = 0;
		let master_commission = 0;
		let agent_commission = 0;
		let user_commission = 0;


		if (getAllparentData.recordsets[0].length > 0) {
			super_admin_id = getAllparentData.recordsets[0][0].super_admin_id;
			admin_id = getAllparentData.recordsets[0][0].admin_id;
			super_master_id = getAllparentData.recordsets[0][0].super_master_id;
			master_id = getAllparentData.recordsets[0][0].master_id;
			agent_id = getAllparentData.recordsets[0][0].agent_id;

			super_admin_partnership = getAllparentData.recordsets[0][0].super_admin;
			admin_partnership = getAllparentData.recordsets[0][0].admin;
			super_master_partnership = getAllparentData.recordsets[0][0].super_master;
			master_partnership = getAllparentData.recordsets[0][0].master;
			agent_partnership = getAllparentData.recordsets[0][0].agent;

			super_admin_commission = getAllparentData.recordsets[0][0].super_admin_match_commission;
			admin_commission = getAllparentData.recordsets[0][0].admin_match_commission;
			super_master_commission = getAllparentData.recordsets[0][0].super_master_match_commission;
			master_commission = getAllparentData.recordsets[0][0].master_match_commission;
			agent_commission = getAllparentData.recordsets[0][0].agent_match_commission;
			user_commission = getAllparentData.recordsets[0][0].user_match_commission;
		}

		let getUserLotusExpo = "SELECT TOP 1 liability FROM user_lotus_market_exposures WHERE user_id=" + insertData.usergetId + " AND sport_id=" + insertData.betInfo.gameId + " AND match_id=" + insertData.betInfo.roundId + " AND market_id='" + insertData.betInfo.marketId + "' ORDER BY id DESC";

		const getExpoLotusUserOnMatch = await pool.request().query(getUserLotusExpo);

		let totalExposer = 0;

		if (getExpoLotusUserOnMatch.recordsets[0].length > 0 && getExpoLotusUserOnMatch.recordsets[0][0].liability && getExpoLotusUserOnMatch.recordsets[0][0].liability !== null) {
			totalExposer = insertData.liability - getExpoLotusUserOnMatch.recordsets[0][0].liability;
		}
		else {
			totalExposer = insertData.liability;
		}

		let updateRunningExposure = "update users SET liability +=  " + totalExposer + " ,balance += " + totalExposer + " where id=" + insertData.usergetId + "";
		await pool.request().query(updateRunningExposure);

		let insertLotusMarketExpo = "INSERT INTO user_lotus_market_exposures (user_id,agent_id,master_id,super_master_id, admin_id,super_admin_id, super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission, master_commission, agent_commission,user_commission, sport_id,match_id,market_id,liability,created_at) VALUES (" + insertData.usergetId + "," + agent_id + "," + master_id + "," + super_master_id + "," + admin_id + "," + super_admin_id + "," + super_admin_partnership + "," + admin_partnership + "," + super_master_partnership + "," + master_partnership + "," + agent_partnership + "," + super_admin_commission + "," + admin_commission + "," + super_master_commission + "," + master_commission + "," + agent_commission + "," + user_commission + "," + insertData.betInfo.gameId + "," + insertData.betInfo.roundId + ",'" + insertData.betInfo.marketId + "'," + insertData.liability + "," + currentdate + ")";
		await pool.request().query(insertLotusMarketExpo);


		/*let insertLotusMarketExpo = "INSERT INTO user_lotus_market_exposures (user_id,sport_id,match_id,market_id,liability,created_at) VALUES ("+insertData.usergetId+","+insertData.betInfo.gameId+","+insertData.betInfo.roundId+",'"+insertData.betInfo.marketId+"',"+insertData.liability+","+currentdate+")";		
		const getExposureRes =  await pool.request().query(insertLotusMarketExpo);	*/

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

	} catch (error) {
		console.error(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let updateLobbyEzugiUserBalance = async function (insertData) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		let getUserParentData = "SELECT super_admin,admin,super_master,master,agent,super_admin_id,admin_id,super_id as super_master_id,master_id,agent_id , super_admin_match_commission, admin_match_commission, super_master_match_commission, master_match_commission, agent_match_commission, user_match_commission FROM users usr with(nolock) JOIN partnerships part with(nolock) ON part.user_id=usr.id WHERE part.user_id=" + insertData.usergetId + " and usr.id=" + insertData.usergetId + " and part.sport_id=" + CONSTANTS.BETFAIR_SPORT_CASINO_EZUGI;

		const getAllparentData = await pool.request().query(getUserParentData);

		let super_admin_id = 0;
		let admin_id = 0;
		let super_master_id = 0;
		let master_id = 0;
		let agent_id = 0;

		let super_admin_partnership = 0;
		let admin_partnership = 0;
		let super_master_partnership = 0;
		let master_partnership = 0;
		let agent_partnership = 0;

		let super_admin_commission = 0;
		let admin_commission = 0;
		let super_master_commission = 0;
		let master_commission = 0;
		let agent_commission = 0;
		let user_commission = 0;


		if (getAllparentData.recordsets[0].length > 0) {
			super_admin_id = getAllparentData.recordsets[0][0].super_admin_id;
			admin_id = getAllparentData.recordsets[0][0].admin_id;
			super_master_id = getAllparentData.recordsets[0][0].super_master_id;
			master_id = getAllparentData.recordsets[0][0].master_id;
			agent_id = getAllparentData.recordsets[0][0].agent_id;

			super_admin_partnership = getAllparentData.recordsets[0][0].super_admin;
			admin_partnership = getAllparentData.recordsets[0][0].admin;
			super_master_partnership = getAllparentData.recordsets[0][0].super_master;
			master_partnership = getAllparentData.recordsets[0][0].master;
			agent_partnership = getAllparentData.recordsets[0][0].agent;

			super_admin_commission = getAllparentData.recordsets[0][0].super_admin_match_commission;
			admin_commission = getAllparentData.recordsets[0][0].admin_match_commission;
			super_master_commission = getAllparentData.recordsets[0][0].super_master_match_commission;
			master_commission = getAllparentData.recordsets[0][0].master_match_commission;
			agent_commission = getAllparentData.recordsets[0][0].agent_match_commission;
			user_commission = getAllparentData.recordsets[0][0].user_match_commission;
		}



		let getUserEzugiExpo = "SELECT TOP 1 liability FROM user_ezugi_market_exposures WHERE user_id=" + insertData.usergetId + " AND sport_id=" + insertData.gameId + " AND match_id=" + insertData.roundId + " AND market_id='" + insertData.roundId + "' ORDER BY id DESC";

		const getExpoEzugiUserOnMatch = await pool.request().query(getUserEzugiExpo);

		let totalExposer = 0;
		if (getExpoEzugiUserOnMatch.recordsets[0].length > 0 && getExpoEzugiUserOnMatch.recordsets[0][0].liability && getExpoEzugiUserOnMatch.recordsets[0][0].liability !== null) {
			totalExposer -= insertData.liability;
		}
		else {
			totalExposer -= insertData.liability;
		}

		let updateRunningExposure = "update users SET liability +=  " + totalExposer + " ,balance += " + totalExposer + " where id=" + insertData.usergetId + "";
		await pool.request().query(updateRunningExposure);

		let insertLotusMarketExpo = "INSERT INTO user_ezugi_market_exposures (user_id,agent_id,master_id,super_master_id, admin_id,super_admin_id, super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission, master_commission, agent_commission,user_commission, sport_id, tableId, match_id,market_id, debit_transactionId, currency, liability, created_at) VALUES (" + insertData.usergetId + "," + agent_id + "," + master_id + "," + super_master_id + "," + admin_id + "," + super_admin_id + "," + super_admin_partnership + "," + admin_partnership + "," + super_master_partnership + "," + master_partnership + "," + agent_partnership + "," + super_admin_commission + "," + admin_commission + "," + super_master_commission + "," + master_commission + "," + agent_commission + "," + user_commission + "," + insertData.gameId + "," + insertData.tableId + "," + insertData.roundId + ",'" + insertData.roundId + "','" + insertData.transactionId + "','" + insertData.currency + "'," + totalExposer + "," + insertData.timestamp + ")";
		await pool.request().query(insertLotusMarketExpo);

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);


	} catch (error) {
		console.error(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let updateLobbyEzugiUserTIPBalance = async function (insertData) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		let updateRunningExposure = "update users SET balance -= " + insertData.liability + " where id=" + insertData.usergetId + "; SELECT id,parent_id, balance , liability, profit_loss from users where id=" + insertData.usergetId + "";

		const TipgetUserData = await pool.request().query(updateRunningExposure);


		let TipAmountWinLoss = parseFloat(insertData.liability);
		let TipStatementAmt = "-" + parseFloat(TipAmountWinLoss).toFixed(2);

		let Tipbalance = parseFloat(TipgetUserData.recordset[0].balance).toFixed(2);
		let Tipliability = parseFloat(TipgetUserData.recordset[0].liability).toFixed(2);
		let Tipparent_id = TipgetUserData.recordset[0].parent_id;

		let TopAvailable_balance = parseFloat(Tipbalance) + parseFloat(Math.abs(Tipliability));
		TopAvailable_balance = parseFloat(TopAvailable_balance).toFixed(2);

		let TipWinLoss = "Tip On Ezugi Round Id # " + insertData.roundId + "";


		let TipAccountStatementQuery = "INSERT INTO  account_statements (user_id,parent_id,description,statement_type,amount,available_balance,match_id,market_id,type,created_by,created_at,created_ip) VALUES(" + insertData.usergetId + "," + Tipparent_id + ",'" + TipWinLoss + "',2,'" + TipStatementAmt + "','" + TopAvailable_balance + "'," + insertData.roundId + ",'" + insertData.roundId + "',1," + insertData.usergetId + "," + currentdate + ",'" + insertData.ip_address + "')";
		console.log('TipAccountStatementQuery', TipAccountStatementQuery);
		await pool.request()
			.query(TipAccountStatementQuery);

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);


	} catch (error) {
		console.error(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let updateLobbyXPGUserTIPBalance = async function (insertData) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		let updateRunningExposure = "update users SET balance -= " + insertData.liability + " where id=" + insertData.usergetId + "; SELECT id,parent_id, balance , liability, profit_loss from users where id=" + insertData.usergetId + "";

		const TipgetUserData = await pool.request().query(updateRunningExposure);


		let TipAmountWinLoss = parseFloat(insertData.liability);
		let TipStatementAmt = "-" + parseFloat(TipAmountWinLoss).toFixed(2);

		let Tipbalance = parseFloat(TipgetUserData.recordset[0].balance).toFixed(2);
		let Tipliability = parseFloat(TipgetUserData.recordset[0].liability).toFixed(2);
		let Tipparent_id = TipgetUserData.recordset[0].parent_id;

		let TopAvailable_balance = parseFloat(Tipbalance) + parseFloat(Math.abs(Tipliability));
		TopAvailable_balance = parseFloat(TopAvailable_balance).toFixed(2);

		let TipWinLoss = "Tip On XPG Round Id # " + insertData.roundId + " Tip Amount -> " + TipStatementAmt + " , Profit -> 0";

		let TipAccountStatementQuery = "INSERT INTO  account_statements (user_id,parent_id, description, statement_type, amount, available_balance, match_id,market_id,type,created_by,created_at,created_ip) VALUES(" + insertData.usergetId + "," + Tipparent_id + ",'" + TipWinLoss + "',2,'" + TipStatementAmt + "','" + TopAvailable_balance + "'," + insertData.roundId + ",'" + insertData.roundId + "',1," + insertData.usergetId + "," + currentdate + ",'" + insertData.ip_address + "')";

		await pool.request().query(TipAccountStatementQuery);

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);


	} catch (error) {
		console.error(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let updateLobbyLotusAfterResult = async function (data) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		/*let getRoundLastLiability = "SELECT TOP 1 liability FROM user_lotus_market_exposures WHERE user_id="+data.user_id+" AND sport_id="+data.sport_id+" AND match_id="+data.match_id+" AND market_id='"+data.market_id+"' ORDER BY id DESC";		 
	 	
		const resGetRoundLastLiability =  await pool.request().query(getRoundLastLiability);*/

		let getRoundLastLiability = "SELECT SUM(liability) as liability, agent_id, master_id, super_master_id, admin_id, super_admin_id, super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission, master_commission, agent_commission, user_commission FROM user_lotus_market_exposures WHERE user_id=" + data.user_id + " AND sport_id=" + data.sport_id + " AND match_id=" + data.match_id + " AND market_id='" + data.market_id + "' GROUP BY agent_id, master_id, super_master_id, admin_id, super_admin_id, super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission, master_commission, agent_commission, user_commission";

		const resGetRoundLastLiability = await pool.request().query(getRoundLastLiability);

		let lastRoundLiability = 0;

		let agent_id = 0;
		let master_id = 0;
		let super_master_id = 0;
		let admin_id = 0;
		let super_admin_id = 0;

		let super_admin = 0;
		let admin = 0;
		let super_master = 0;
		let master = 0;
		let agent = 0;

		let super_admin_commission = 0;
		let admin_commission = 0;
		let super_master_commission = 0;
		let master_commission = 0;
		let agent_commission = 0;
		let user_commission = 0;

		if (resGetRoundLastLiability.recordsets[0].length > 0) {
			lastRoundLiability = (resGetRoundLastLiability.recordsets[0][0].liability && resGetRoundLastLiability.recordsets[0][0].liability !== null) ? resGetRoundLastLiability.recordsets[0][0].liability : 0;

			agent_id = resGetRoundLastLiability.recordsets[0][0].agent_id;
			master_id = resGetRoundLastLiability.recordsets[0][0].master_id;
			super_master_id = resGetRoundLastLiability.recordsets[0][0].super_master_id;
			admin_id = resGetRoundLastLiability.recordsets[0][0].admin_id;
			super_admin_id = resGetRoundLastLiability.recordsets[0][0].super_admin_id;

			super_admin = resGetRoundLastLiability.recordsets[0][0].super_admin;
			admin = resGetRoundLastLiability.recordsets[0][0].admin;
			super_master = resGetRoundLastLiability.recordsets[0][0].super_master;
			master = resGetRoundLastLiability.recordsets[0][0].master;
			agent = resGetRoundLastLiability.recordsets[0][0].agent;

			super_admin_commission = resGetRoundLastLiability.recordsets[0][0].super_admin_commission;
			admin_commission = resGetRoundLastLiability.recordsets[0][0].admin_commission;
			super_master_commission = resGetRoundLastLiability.recordsets[0][0].super_master_commission;
			master_commission = resGetRoundLastLiability.recordsets[0][0].master_commission;
			agent_commission = resGetRoundLastLiability.recordsets[0][0].agent_commission;
			user_commission = resGetRoundLastLiability.recordsets[0][0].user_commission;
		}

		let lastRoundProfitLoss = 0;
		let lastRoundBalance = 0;

		if (data.profit_loss === "" || data.profit_loss === null || data.profit_loss === 0) {
			lastRoundBalance = 0;
			lastRoundProfitLoss = lastRoundLiability;
		}
		else if (data.profit_loss !== "" && data.profit_loss !== null && data.profit_loss > 0) {
			lastRoundBalance = parseFloat(data.profit_loss) - parseFloat(lastRoundLiability);
			lastRoundBalance = parseFloat(lastRoundBalance).toFixed(2);
			lastRoundProfitLoss = parseFloat(data.profit_loss).toFixed(2);
		} else {
			lastRoundBalance = 0;
			lastRoundProfitLoss = parseFloat(data.profit_loss).toFixed(2);
		}



		let statementDescription = "";

		if (lastRoundProfitLoss > 0) {
			statementDescription = "Win Game " + data.sport_id + " Round Id " + data.match_id + " # " + data.market_id + " Win";
		} else {
			statementDescription = "Loss Game " + data.sport_id + " Round Id " + data.match_id + " # " + data.market_id + " Loss";
		}



		/**/
		let user_pl = lastRoundProfitLoss;
		let agent_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(agent) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(agent) / 100)).toFixed(2);

		let master_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(master) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(master) / 100)).toFixed(2);

		let super_master_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_master) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_master) / 100)).toFixed(2);

		let admin_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(admin) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(admin) / 100)).toFixed(2);

		let super_admin_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_admin) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_admin) / 100)).toFixed(2);

		let userCommission = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(user_commission) / 100)).toFixed(2) : 0;
		let agentCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(agent_commission) / 100)).toFixed(2) : 0;;
		let masterCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(master_commission) / 100)).toFixed(2) : 0;;
		let super_masterCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_master_commission) / 100)).toFixed(2) : 0;;
		let adminCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(admin_commission) / 100)).toFixed(2) : 0;;
		let super_adminCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_admin_commission) / 100)).toFixed(2) : 0;

		let distributAmountQuery = "INSERT INTO user_profit_loss (user_id, agent_id, master_id, super_master_id, admin_id,super_admin_id, sport_id, match_id, market_id, type, bet_result_id, stack, description, reffered_name, created_at, user_pl, agent_pl, master_pl, super_master_pl, admin_pl, super_admin_pl, user_commission, agent_commission, master_commission, super_master_commission, admin_commission,super_admin_commission) VALUES(" + data.user_id + "," + agent_id + "," + master_id + "," + super_master_id + "," + admin_id + "," + super_admin_id + ", " + CONSTANTS.BETFAIR_SPORT_CASINO_LOTUS + ", " + data.match_id + ", '" + data.market_id + "', 1, 0, " + Math.abs(lastRoundLiability) + ", '" + statementDescription + "', '" + statementDescription + "', " + currentdate + ", " + user_pl + ", " + agent_pl + ", " + master_pl + ", " + super_master_pl + ", " + admin_pl + ", " + super_admin_pl + ", " + userCommission + ", " + agentCommission + ", " + masterCommission + ", " + super_masterCommission + "," + adminCommission + "," + super_adminCommission + " )";
		await pool.request().query(distributAmountQuery);
		let zeroValue = 0;
		await pool.request()
			.input('pMatchID', sql.Int, data.match_id)
			.input('pMarketID', sql.VarChar(150), data.market_id)
			.input('pIsFancy', sql.Int, zeroValue)
			.input('pIsRollback', sql.Int, zeroValue)
			.input('pIsSuperAdminCommission', sql.VarChar(150), zeroValue)
			.input('pSuperAdminCommissionType', sql.Int, zeroValue)
			.execute('SP_UPDATE_BALANCE_ON_EZUGI_XPG_LOTUS_RESULT');



		let updateRoundUserProfitLoss = "update users SET liability -=  " + lastRoundLiability + " ,balance += " + lastRoundBalance + ", profit_loss +=" + lastRoundProfitLoss + " where id=" + data.user_id + "; SELECT parent_id,balance,liability from users where id=" + data.user_id + "";
		const getUserBalance = await pool.request().query(updateRoundUserProfitLoss);

		let totalAvailableBalance = parseFloat(getUserBalance.recordsets[0][0].balance) - parseFloat(getUserBalance.recordsets[0][0].liability);
		totalAvailableBalance = parseFloat(totalAvailableBalance).toFixed(2);
		let userParentId = getUserBalance.recordsets[0][0].parent_id;

		/**/

		let userLotusAcStatement = "INSERT INTO  account_statements (user_id, parent_id, description, statement_type, amount, available_balance, match_id, market_id, type, created_by, created_at,created_ip) VALUES(" + data.user_id + "," + userParentId + ",'" + statementDescription + "',2,'" + lastRoundProfitLoss + "','" + totalAvailableBalance + "'," + data.match_id + ",'" + data.market_id + "' ,'1'," + data.user_id + "," + currentdate + ",'" + data.ip_address + "')";
		await pool.request().query(userLotusAcStatement);

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);



	} catch (error) {
		console.error(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};



let ezugiUpdateTransactionId = async function (data, field) {
	try {

		const pool = await poolPromise;
		let getexposurEZUGI = "SELECT * FROM user_ezugi_market_exposures WHERE user_id=" + data.user_id + " AND sport_id=" + data.gameId + "  AND match_id=" + data.roundId + " AND market_id='" + data.roundId + "' AND " + field + "='" + data.transactionId + "' ORDER BY id DESC";
		const result = await pool.request().query(getexposurEZUGI);

		console.log('result.recordsets--------------ezugiUpdateTransactionId-------------- ', result.recordsets[0]);

		if (result.recordsets === null || result.recordsets[0].length <= 0) {

			let updateCreditTransaction = "update user_ezugi_market_exposures SET " + field + " =  '" + data.transactionId + "' where user_id=" + data.user_id + " AND match_id=" + data.roundId + " AND market_id='" + data.roundId + "' AND debit_transactionId='" + data.debitTransactionId + "'";

			const result1 = await pool.request().query(updateCreditTransaction);


			return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

		} else {
			return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
		}


	} catch (error) {
		console.error("ezugiUpdateTransactionId", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let ezugiAccountStatement = async function (data) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		let getRoundLastLiability = "SELECT SUM(liability) as liability, agent_id, master_id, super_master_id, admin_id, super_admin_id, super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission, master_commission, agent_commission, user_commission FROM user_ezugi_market_exposures WHERE user_id=" + data.user_id + " AND sport_id=" + data.gameId + " AND match_id=" + data.roundId + " AND market_id='" + data.roundId + "' AND debit_transactionId='" + data.debitTransactionId + "' GROUP BY agent_id, master_id, super_master_id, admin_id, super_admin_id, super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission, master_commission, agent_commission, user_commission";

		const resGetRoundLastLiability = await pool.request().query(getRoundLastLiability);

		let lastRoundLiability = 0;

		let agent_id = 0;
		let master_id = 0;
		let super_master_id = 0;
		let admin_id = 0;
		let super_admin_id = 0;

		let super_admin = 0;
		let admin = 0;
		let super_master = 0;
		let master = 0;
		let agent = 0;

		let super_admin_commission = 0;
		let admin_commission = 0;
		let super_master_commission = 0;
		let master_commission = 0;
		let agent_commission = 0;
		let user_commission = 0;

		if (resGetRoundLastLiability.recordsets[0].length > 0) {
			lastRoundLiability = (resGetRoundLastLiability.recordsets[0][0].liability && resGetRoundLastLiability.recordsets[0][0].liability !== null) ? resGetRoundLastLiability.recordsets[0][0].liability : 0;

			agent_id = resGetRoundLastLiability.recordsets[0][0].agent_id;
			master_id = resGetRoundLastLiability.recordsets[0][0].master_id;
			super_master_id = resGetRoundLastLiability.recordsets[0][0].super_master_id;
			admin_id = resGetRoundLastLiability.recordsets[0][0].admin_id;
			super_admin_id = resGetRoundLastLiability.recordsets[0][0].super_admin_id;

			super_admin = resGetRoundLastLiability.recordsets[0][0].super_admin;
			admin = resGetRoundLastLiability.recordsets[0][0].admin;
			super_master = resGetRoundLastLiability.recordsets[0][0].super_master;
			master = resGetRoundLastLiability.recordsets[0][0].master;
			agent = resGetRoundLastLiability.recordsets[0][0].agent;

			super_admin_commission = resGetRoundLastLiability.recordsets[0][0].super_admin_commission;
			admin_commission = resGetRoundLastLiability.recordsets[0][0].admin_commission;
			super_master_commission = resGetRoundLastLiability.recordsets[0][0].super_master_commission;
			master_commission = resGetRoundLastLiability.recordsets[0][0].master_commission;
			agent_commission = resGetRoundLastLiability.recordsets[0][0].agent_commission;
			user_commission = resGetRoundLastLiability.recordsets[0][0].user_commission;
		}

		let lastRoundProfitLoss = 0;
		let lastRoundBalance = 0;

		if (data.profit_loss === "" || data.profit_loss === null || data.profit_loss === 0) {

			lastRoundBalance = 0;
			lastRoundProfitLoss = lastRoundLiability;
		}
		else if (data.profit_loss !== "" && data.profit_loss !== null && data.profit_loss > 0) {

			lastRoundProfitLoss = parseFloat(data.profit_loss) + parseFloat(lastRoundLiability);
			lastRoundProfitLoss = parseFloat(lastRoundProfitLoss).toFixed(2);
			lastRoundBalance = parseFloat(data.profit_loss).toFixed(2);
		} else {

			lastRoundBalance = 0;
			lastRoundProfitLoss = parseFloat(data.profit_loss).toFixed(2);
		}

		let statementDescription = "";

		if (data.profit_loss > 0) {
			statementDescription = "Ezugi Game  Round Id # " + data.roundId + " Bet Amount -> " + lastRoundLiability + " , Profit -> " + data.profit_loss + "";
		} else {
			statementDescription = "Ezugi Game  Round Id # " + data.roundId + " Bet Amount -> " + lastRoundLiability + " , Profit -> " + data.profit_loss + "";
		}

		let user_pl = lastRoundProfitLoss;
		let agent_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(agent) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(agent) / 100)).toFixed(2);

		let master_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(master) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(master) / 100)).toFixed(2);

		let super_master_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_master) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_master) / 100)).toFixed(2);

		let admin_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(admin) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(admin) / 100)).toFixed(2);

		let super_admin_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_admin) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_admin) / 100)).toFixed(2);

		let userCommission = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(user_commission) / 100)).toFixed(2) : 0;
		let agentCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(agent_commission) / 100)).toFixed(2) : 0;;
		let masterCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(master_commission) / 100)).toFixed(2) : 0;;
		let super_masterCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_master_commission) / 100)).toFixed(2) : 0;;
		let adminCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(admin_commission) / 100)).toFixed(2) : 0;;
		let super_adminCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_admin_commission) / 100)).toFixed(2) : 0;;



		let distributAmountQuery = "INSERT INTO user_profit_loss (user_id, agent_id, master_id, super_master_id, admin_id,super_admin_id, sport_id, match_id, market_id, type, bet_result_id, stack, description, reffered_name, created_at, user_pl, agent_pl, master_pl, super_master_pl, admin_pl, super_admin_pl, user_commission, agent_commission, master_commission, super_master_commission, admin_commission,super_admin_commission) VALUES(" + data.user_id + "," + agent_id + "," + master_id + "," + super_master_id + "," + admin_id + "," + super_admin_id + ", " + CONSTANTS.BETFAIR_SPORT_CASINO_EZUGI + ", " + data.roundId + ", '" + data.roundId + "', 1, 0, " + Math.abs(lastRoundLiability) + ", '" + statementDescription + "', '" + statementDescription + "', " + currentdate + ", " + user_pl + ", " + agent_pl + ", " + master_pl + ", " + super_master_pl + ", " + admin_pl + ", " + super_admin_pl + ", " + userCommission + ", " + agentCommission + ", " + masterCommission + ", " + super_masterCommission + "," + adminCommission + "," + super_adminCommission + " )";
		await pool.request().query(distributAmountQuery);
		let zeroValue = 0;
		await pool.request()
			.input('pMatchID', sql.Int, data.roundId)
			.input('pMarketID', sql.VarChar(150), data.roundId)
			.input('pIsFancy', sql.Int, zeroValue)
			.input('pIsRollback', sql.Int, zeroValue)
			.input('pIsSuperAdminCommission', sql.VarChar(150), zeroValue)
			.input('pSuperAdminCommissionType', sql.Int, zeroValue)
			.execute('SP_UPDATE_BALANCE_ON_EZUGI_XPG_LOTUS_RESULT');


		let updateRoundUserProfitLoss = "update users SET liability -=  " + lastRoundLiability + " ,balance += " + lastRoundBalance + ", profit_loss +=" + lastRoundProfitLoss + " where id=" + data.user_id + "; SELECT parent_id,balance,liability from users where id=" + data.user_id + "";
		const getUserBalance = await pool.request().query(updateRoundUserProfitLoss);


		let totalAvailableBalance = parseFloat(getUserBalance.recordsets[0][0].balance) - parseFloat(getUserBalance.recordsets[0][0].liability);
		totalAvailableBalance = parseFloat(totalAvailableBalance).toFixed(2);
		let userParentId = getUserBalance.recordsets[0][0].parent_id;

		let userLotusAcStatement = "INSERT INTO  account_statements (user_id, parent_id, description, statement_type, amount, available_balance, match_id, market_id, type, created_by, created_at,created_ip) VALUES(" + data.user_id + "," + userParentId + ",'" + statementDescription + "',2,'" + lastRoundProfitLoss + "','" + totalAvailableBalance + "'," + data.roundId + ",'" + data.roundId + "' ,'1'," + data.user_id + "," + currentdate + ",'" + data.ip_address + "')";
		await pool.request().query(userLotusAcStatement);


		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);



	} catch (error) {
		console.error("ezugiAccountStatement", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let ezugiRollbackAccountStatement = async function (data) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		let getRoundLastLiability = "SELECT TOP 1 liability FROM user_ezugi_market_exposures WHERE user_id=" + data.user_id + " AND sport_id=" + data.gameId + " AND match_id=" + data.roundId + " AND market_id='" + data.roundId + "' AND debit_transactionId='" + data.transactionId + "' ORDER BY id DESC";

		const resGetRoundLastLiability = await pool.request().query(getRoundLastLiability);

		let lastRoundLiability = "";



		if (resGetRoundLastLiability.recordsets[0].length > 0 && resGetRoundLastLiability.recordsets[0][0].liability && resGetRoundLastLiability.recordsets[0][0].liability !== null) {
			lastRoundLiability = resGetRoundLastLiability.recordsets[0][0].liability;
		}
		else {

			lastRoundLiability = 0;
		}

		let updateRoundUserProfitLoss = "update users SET liability -=  " + lastRoundLiability + " ,balance -= " + lastRoundLiability + " where id=" + data.user_id + "; SELECT parent_id,balance,liability from users where id=" + data.user_id + "";

		console.log('ezugiRollbackAccountStatement Result     ------------------------ ', updateRoundUserProfitLoss);

		const getUserBalance = await pool.request().query(updateRoundUserProfitLoss);

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);



		/*let lastRoundProfitLoss = "";
		let lastRoundBalance = "";

		if(data.profit_loss === "" || data.profit_loss === null || data.profit_loss === 0)
		{
			 
			lastRoundBalance = 0;
			lastRoundProfitLoss =lastRoundLiability;
		}
		else if(data.profit_loss !== "" && data.profit_loss !== null && data.profit_loss > 0 ){
			 
			lastRoundBalance = parseFloat(data.profit_loss) - parseFloat(lastRoundLiability);
			lastRoundBalance = parseFloat(lastRoundBalance).toFixed(2);
			lastRoundProfitLoss =  parseFloat(data.profit_loss).toFixed(2); 
		}else{
			 
			lastRoundBalance =0;
			lastRoundProfitLoss = parseFloat(data.profit_loss).toFixed(2); 
		}
		
		let updateRoundUserProfitLoss = "update users SET liability +=  "+lastRoundLiability+" ,balance -= "+lastRoundBalance+", profit_loss -="+lastRoundProfitLoss+" where id="+data.user_id+"; SELECT parent_id,balance,liability from users where id="+data.user_id+"";	
	
		console.log('updateRoundUserProfitLoss Result     ------------------------ ',updateRoundUserProfitLoss);

		const getUserBalance =await pool.request().query(updateRoundUserProfitLoss);

		let statementDescription="";

		if(lastRoundProfitLoss > 0)
		{
			statementDescription= "Rollback Ezugi Game  Round Id "+data.roundId+"";	
		}else{
			statementDescription= "Rollback Ezugi Game  Round Id "+data.roundId+"";	
		}

		let totalAvailableBalance = parseFloat(getUserBalance.recordsets[0][0].balance) - parseFloat(getUserBalance.recordsets[0][0].liability);
		 totalAvailableBalance = parseFloat(totalAvailableBalance).toFixed(2);
		let userParentId = getUserBalance.recordsets[0][0].parent_id ;

		let userLotusAcStatement = "INSERT INTO  account_statements (user_id, parent_id, description, statement_type, amount, available_balance, match_id, market_id, type, created_by, created_at,created_ip) VALUES("+data.user_id+","+userParentId+",'"+statementDescription+"',2,'-"+lastRoundProfitLoss+"','"+totalAvailableBalance+"',"+data.roundId+",'"+data.roundId+"' ,'1',"+data.user_id+","+currentdate+",'"+data.ip_address+"')";			
			console.log('userLotusAcStatement--------------------------- ',userLotusAcStatement);
		await pool.request().query(userLotusAcStatement); 	


	return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);*/



	} catch (error) {
		console.error("ezugiRollbackAccountStatement", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let ezugiLogInsert = async function (data) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		let userLotusAcStatement = "INSERT INTO  user_ezugi_market_logs (user_id, round_id, request_json, created_at, type) VALUES(" + data.user_id + "," + data.roundId + ",'" + data.jsonRequest + "'," + data.timestamp + ",'" + data.type + "')";
		console.log('userLotusAcStatement--------------------------- ', userLotusAcStatement);
		await pool.request().query(userLotusAcStatement);


		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);



	} catch (error) {
		console.error("ezugiLogInsert", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let XPGLogInsert = async function (data) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		let userLotusAcStatement = "INSERT INTO  user_xpg_market_logs (user_id, round_id, request_json, created_at, type) VALUES(" + data.user_id + "," + data.roundId + ",'" + data.jsonRequest + "'," + currentdate + ",'" + data.type + "')";
		await pool.request().query(userLotusAcStatement);

		/*let matchId= data.roundId;
		let marketId= data.roundId;
		let seriesId= CONSTANTS.BETFAIR_SPORT_CASINO_XPG+""+CONSTANTS.BETFAIR_SPORT_CASINO;

		let insertMatchData = "INSERT INTO cassino_matches (sport_id, series_id, match_id, cassino_match_type, name, match_date, start_date, score_board_json, score_type, score_key, liability_type, is_manual, is_completed, is_popular, is_cup, winner_name ,is_bet_allow, status ,created_by ,updated_by,created_ip ,created_at ,updated_at ,team_one_image ,team_two_image ,match_number ,stadium_location ) VALUES("+CONSTANTS.BETFAIR_SPORT_CASINO_XPG+","+seriesId+","+matchId+",0,'casino 1',"+currentdate+","+currentdate+",'[]','N',"",'Y','N','N','N','N','','Y','Y',1,0,'"+data.ip_address+"',"+currentdate+",0,"","",0,"")";
			await pool.request().query(insertMatchData); 

		let insertMarketData = "INSERT INTO cassino_markets (sport_id, series_id, match_id, market_id, name, display_name, match_date, runner_json, market_runner_count, is_bet_allow, bet_allow_time_before, bet_delay, min_stack, max_stack, min_liability, max_market_liability, max_market_profit, min_loss, max_bet_liability, liability_type, status, is_visible, is_manual, is_result_declared, is_abandoned, card_data, result_id, winner_name,market_admin_message,created_by, updated_by, created_ip, created_at, updated_at, isbetalowaftermatchodds ) VALUES("+CONSTANTS.BETFAIR_SPORT_CASINO_XPG+","+seriesId+","+matchId+",'1."+marketId+"','Match Odds','Match Odds',"+currentdate+",'[]',2,'Y', 0, 0, 0 , 0, 0, 0, 0, 0, 0, 'Y', 'Y','Y','N','N','N',"","","","",1,0,'"+data.ip_address+"',"+currentdate+",0,'N')";
		await pool.request().query(insertMarketData); 
*/

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);



	} catch (error) {
		console.error("xpg insert logs ", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let updateLobbyXPGUserBalance = async function (insertData) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		let getUserParentData = "SELECT super_admin,admin,super_master,master,agent,super_admin_id,admin_id,super_id as super_master_id,master_id,agent_id , super_admin_match_commission, admin_match_commission, super_master_match_commission, master_match_commission, agent_match_commission, user_match_commission FROM users usr  with(nolock) JOIN partnerships part with(nolock) ON part.user_id=usr.id WHERE part.user_id=" + insertData.usergetId + " and usr.id=" + insertData.usergetId + " and part.sport_id=" + CONSTANTS.BETFAIR_SPORT_CASINO_XPG;

		const getAllparentData = await pool.request().query(getUserParentData);

		let super_admin_id = 0;
		let admin_id = 0;
		let super_master_id = 0;
		let master_id = 0;
		let agent_id = 0;

		let super_admin_partnership = 0;
		let admin_partnership = 0;
		let super_master_partnership = 0;
		let master_partnership = 0;
		let agent_partnership = 0;

		let super_admin_commission = 0;
		let admin_commission = 0;
		let super_master_commission = 0;
		let master_commission = 0;
		let agent_commission = 0;
		let user_commission = 0;


		if (getAllparentData.recordsets[0].length > 0) {
			super_admin_id = getAllparentData.recordsets[0][0].super_admin_id;
			admin_id = getAllparentData.recordsets[0][0].admin_id;
			super_master_id = getAllparentData.recordsets[0][0].super_master_id;
			master_id = getAllparentData.recordsets[0][0].master_id;
			agent_id = getAllparentData.recordsets[0][0].agent_id;

			super_admin_partnership = getAllparentData.recordsets[0][0].super_admin;
			admin_partnership = getAllparentData.recordsets[0][0].admin;
			super_master_partnership = getAllparentData.recordsets[0][0].super_master;
			master_partnership = getAllparentData.recordsets[0][0].master;
			agent_partnership = getAllparentData.recordsets[0][0].agent;

			super_admin_commission = getAllparentData.recordsets[0][0].super_admin_match_commission;
			admin_commission = getAllparentData.recordsets[0][0].admin_match_commission;
			super_master_commission = getAllparentData.recordsets[0][0].super_master_match_commission;
			master_commission = getAllparentData.recordsets[0][0].master_match_commission;
			agent_commission = getAllparentData.recordsets[0][0].agent_match_commission;
			user_commission = getAllparentData.recordsets[0][0].user_match_commission;
		}

		let totalExposer = 0;
		totalExposer -= insertData.liability;

		let insertXPGMarketExpo = "INSERT INTO user_xpg_market_exposures (user_id,agent_id,master_id,super_master_id,admin_id,super_admin_id,super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission,master_commission,agent_commission,user_commission, sport_id, match_id,market_id,liability, created_at, sequence, is_type) VALUES (" + insertData.usergetId + "," + agent_id + "," + master_id + "," + super_master_id + "," + admin_id + "," + super_admin_id + "," + super_admin_partnership + "," + admin_partnership + "," + super_master_partnership + "," + master_partnership + "," + agent_partnership + "," + super_admin_commission + "," + admin_commission + "," + super_master_commission + "," + master_commission + "," + agent_commission + "," + user_commission + "," + insertData.gameId + "," + insertData.roundId + ",'" + insertData.roundId + "'," + totalExposer + "," + currentdate + "," + insertData.Sequence + ",'" + insertData.is_type + "')";

		await pool.request().query(insertXPGMarketExpo);

		let updateRunningExposure = "update users SET liability +=  " + totalExposer + " ,balance += " + totalExposer + " where id=" + insertData.usergetId + "";

		await pool.request().query(updateRunningExposure);

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);


	} catch (error) {
		console.error(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getSameRoundConditionXPGPROCESS = async function (insertData) {

	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, insertData.usergetId)
			.input('sport_id', sql.Int, insertData.gameId)
			.input('match_id', sql.VarChar(255), insertData.roundId)
			.input('market_id', sql.VarChar(255), insertData.roundId)
			.input('transaction_id', sql.VarChar(255), insertData.TransactionId)
			.query("SELECT * FROM user_xpg_market_exposures WHERE user_id=@user_id AND sport_id=@sport_id  AND match_id=@match_id AND market_id=@market_id AND transaction_id=@transaction_id");
		console.log('result.recordsets---------getSameRoundConditionXPGPROCESS------------------- ', result.recordsets[0].length);
		if (result.recordsets === null || result.recordsets[0].length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}

	} catch (error) {
		console.error("getSameRoundConditionXPGPROCESS", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let updateLobbyXPGP_ROCESS_UserBalance = async function (insertData) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		let totalExposer = 0;
		totalExposer -= insertData.liability;

		let getUserParentData = "SELECT super_admin,admin,super_master,master,agent,super_admin_id,admin_id,super_id as super_master_id,master_id,agent_id , super_admin_match_commission, admin_match_commission, super_master_match_commission, master_match_commission, agent_match_commission, user_match_commission FROM users usr with(nolock) JOIN partnerships part with(nolock) ON part.user_id=usr.id WHERE part.user_id=" + insertData.usergetId + " and usr.id=" + insertData.usergetId + " and part.sport_id=" + CONSTANTS.BETFAIR_SPORT_CASINO_XPG;

		const getAllparentData = await pool.request().query(getUserParentData);

		let super_admin_id = 0;
		let admin_id = 0;
		let super_master_id = 0;
		let master_id = 0;
		let agent_id = 0;

		let super_admin_partnership = 0;
		let admin_partnership = 0;
		let super_master_partnership = 0;
		let master_partnership = 0;
		let agent_partnership = 0;

		let super_admin_commission = 0;
		let admin_commission = 0;
		let super_master_commission = 0;
		let master_commission = 0;
		let agent_commission = 0;
		let user_commission = 0;


		if (getAllparentData.recordsets[0].length > 0) {
			super_admin_id = getAllparentData.recordsets[0][0].super_admin_id;
			admin_id = getAllparentData.recordsets[0][0].admin_id;
			super_master_id = getAllparentData.recordsets[0][0].super_master_id;
			master_id = getAllparentData.recordsets[0][0].master_id;
			agent_id = getAllparentData.recordsets[0][0].agent_id;

			super_admin_partnership = getAllparentData.recordsets[0][0].super_admin;
			admin_partnership = getAllparentData.recordsets[0][0].admin;
			super_master_partnership = getAllparentData.recordsets[0][0].super_master;
			master_partnership = getAllparentData.recordsets[0][0].master;
			agent_partnership = getAllparentData.recordsets[0][0].agent;

			super_admin_commission = getAllparentData.recordsets[0][0].super_admin_match_commission;
			admin_commission = getAllparentData.recordsets[0][0].admin_match_commission;
			super_master_commission = getAllparentData.recordsets[0][0].super_master_match_commission;
			master_commission = getAllparentData.recordsets[0][0].master_match_commission;
			agent_commission = getAllparentData.recordsets[0][0].agent_match_commission;
			user_commission = getAllparentData.recordsets[0][0].user_match_commission;
		}


		//let insertXPGMarketExpo = "INSERT INTO user_xpg_market_exposures (user_id, sport_id, match_id,market_id,liability, created_at, sequence, transaction_id,is_type) VALUES ("+insertData.usergetId+","+insertData.gameId+","+insertData.roundId+",'"+insertData.roundId+"',"+totalExposer+","+currentdate+",0,'"+insertData.TransactionId+"','"+insertData.is_type+"')";	

		let insertXPGMarketExpo = "INSERT INTO user_xpg_market_exposures (user_id,agent_id,master_id,super_master_id,admin_id,super_admin_id,super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission,master_commission,agent_commission,user_commission, sport_id, match_id,market_id,liability, created_at, sequence,transaction_id, is_type) VALUES (" + insertData.usergetId + "," + agent_id + "," + master_id + "," + super_master_id + "," + admin_id + "," + super_admin_id + "," + super_admin_partnership + "," + admin_partnership + "," + super_master_partnership + "," + master_partnership + "," + agent_partnership + "," + super_admin_commission + "," + admin_commission + "," + super_master_commission + "," + master_commission + "," + agent_commission + "," + user_commission + "," + insertData.gameId + "," + insertData.roundId + ",'" + insertData.roundId + "'," + totalExposer + "," + currentdate + ",0,'" + insertData.TransactionId + "','" + insertData.is_type + "')";
		console.log('----- insertXPGMarketExpo -------------------------- ', insertXPGMarketExpo);

		const getExposureRes = await pool.request().query(insertXPGMarketExpo);


		let updateRunningExposure = "update users SET liability +=  " + totalExposer + " ,balance += " + totalExposer + " where id=" + insertData.usergetId + "";
		//console.log('updateRunningExposure     ------------------------ ',updateRunningExposure);			
		const resFromDBr = await pool.request().query(updateRunningExposure);


		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

	} catch (error) {
		console.error('---------updateLobbyXPGP_ROCESS_UserBalance--------------- ', error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getSameRoundConditionXPG = async function (insertData) {

	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, insertData.usergetId)
			.input('sport_id', sql.Int, insertData.gameId)
			.input('match_id', sql.VarChar(255), insertData.roundId)
			.input('market_id', sql.VarChar(255), insertData.roundId)
			.input('Sequence', sql.Int, insertData.Sequence)
			.query("SELECT * FROM user_xpg_market_exposures WHERE user_id=@user_id AND sport_id=@sport_id  AND match_id=@match_id AND market_id=@market_id AND sequence=@Sequence");

		if (result.recordsets === null || result.recordsets[0].length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}

	} catch (error) {
		console.error("getSameRoundConditionXPG", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getEzugiDebitConditions = async function (insertData) {

	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, insertData.usergetId)
			.input('sport_id', sql.Int, insertData.gameId)
			.input('match_id', sql.VarChar(255), insertData.roundId)
			.input('market_id', sql.VarChar(255), insertData.roundId)
			.input('debit_transactionId', sql.VarChar(255), insertData.transactionId)
			.query("SELECT * FROM user_ezugi_market_exposures WHERE user_id=@user_id AND sport_id=@sport_id  AND match_id=@match_id AND market_id=@market_id AND debit_transactionId=@debit_transactionId");
		console.log('result.recordsets----------getEzugiDebitConditions------------------ ', result.recordsets[0].length);
		if (result.recordsets === null || result.recordsets[0].length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}

	} catch (error) {
		console.error("getEzugiDebitConditions", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getEzugiDebitAfterRollback = async function (letDebitRollback) {

	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, letDebitRollback.usergetId)
			.input('round_id', sql.VarChar(255), letDebitRollback.roundId)
			.input('type', sql.VarChar(255), letDebitRollback.is_type)
			.query("SELECT TOP 1 * FROM user_ezugi_market_logs WHERE user_id=@user_id AND round_id=@round_id AND type=@type ORDER BY id DESC");

		if (result.recordsets === null || result.recordsets[0].length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}

	} catch (error) {
		console.error("getEzugiDebitAfterRollback", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getEzugiRollbackConditions = async function (insertData) {

	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, insertData.user_id)
			.input('sport_id', sql.Int, insertData.gameId)
			.input('match_id', sql.VarChar(255), insertData.roundId)
			.input('market_id', sql.VarChar(255), insertData.roundId)
			.input('debit_transactionId', sql.VarChar(255), insertData.transactionId)
			.query("SELECT * FROM user_ezugi_market_exposures WHERE user_id=@user_id AND sport_id=@sport_id  AND match_id=@match_id AND market_id=@market_id AND debit_transactionId=@debit_transactionId");
		console.log('result.recordsets----------getEzugiRollbackConditions------------------ ', result.recordsets[0].length);
		if (result.recordsets === null || result.recordsets[0].length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}

	} catch (error) {
		console.error("getEzugiRollbackConditions", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getEzugiCreditConditions = async function (insertData) {

	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, insertData.user_id)
			.input('sport_id', sql.Int, insertData.gameId)
			.input('match_id', sql.VarChar(255), insertData.roundId)
			.input('market_id', sql.VarChar(255), insertData.roundId)
			.input('debit_transactionId', sql.VarChar(255), insertData.debitTransactionId)
			.query("SELECT * FROM user_ezugi_market_exposures WHERE user_id=@user_id AND sport_id=@sport_id  AND match_id=@match_id AND market_id=@market_id AND debit_transactionId=@debit_transactionId");
		console.log('result.recordsets----------getEzugiCreditConditions------------------ ', result.recordsets[0].length);
		if (result.recordsets === null || result.recordsets[0].length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}

	} catch (error) {
		console.error("getEzugiCreditConditions", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getSameRoundCREDIT_XPG = async function (insertData) {

	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, insertData.user_id)
			.input('match_id', sql.VarChar(255), insertData.roundId)
			.input('credit_type', sql.VarChar(255), insertData.credit_type)
			.query("SELECT TOP 1 * FROM user_xpg_market_logs WHERE user_id=@user_id AND round_id=@match_id AND type=@credit_type ORDER BY id DESC");

		if (result.recordsets === null || result.recordsets[0].length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}

	} catch (error) {
		console.error("getSameRoundCREDIT_XPG", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getSameRoundDEBIT_XPG = async function (insertData) {

	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, insertData.user_id)
			.input('sport_id', sql.Int, insertData.GameId)
			.input('match_id', sql.VarChar(255), insertData.roundId)
			.input('market_id', sql.VarChar(255), insertData.roundId)
			.input('is_type', sql.VarChar(255), insertData.is_type)
			.query("SELECT * FROM user_xpg_market_exposures WHERE user_id=@user_id AND sport_id=@sport_id AND match_id=@match_id AND market_id=@market_id AND is_type=@is_type");

		if (result.recordsets === null || result.recordsets[0].length <= 0) {

			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}

	} catch (error) {
		console.error("getSameRoundDEBIT_XPG", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getSameRoundPROCESS_DEBIT_XPG = async function (insertData) {

	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, insertData.user_id)
			.input('sport_id', sql.Int, insertData.GameId)
			.input('match_id', sql.VarChar(255), insertData.roundId)
			.input('market_id', sql.VarChar(255), insertData.roundId)
			.input('transaction_id', sql.VarChar(255), insertData.TransactionId)
			.input('is_type', sql.VarChar(255), insertData.is_type)
			.query("SELECT * FROM user_xpg_market_exposures WHERE user_id=@user_id AND sport_id=@sport_id AND match_id=@match_id AND market_id=@market_id AND  is_type=@is_type");
		//console.log("SELECT * FROM user_xpg_market_exposures WHERE user_id="+insertData.user_id+" AND sport_id="+insertData.GameId+" AND match_id="+insertData.roundId+" AND market_id='"+insertData.roundId+"' AND is_type='"+insertData.is_type+"'");
		console.log('result.recordsets--------------getSameRoundPROCESS_DEBIT_XPG-------------- ', result.recordsets[0].length);
		if (result.recordsets === null || result.recordsets[0].length <= 0) {

			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}

	} catch (error) {
		console.error("getSameRoundPROCESS_DEBIT_XPG", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getSameRoundCANCEL_XPG = async function (insertData) {

	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, insertData.user_id)
			.input('sport_id', sql.Int, insertData.GameId)
			.input('match_id', sql.VarChar(255), insertData.roundId)
			.input('market_id', sql.VarChar(255), insertData.roundId)
			.input('sequence', sql.Int, insertData.Sequence)
			.input('is_type', sql.VarChar(255), insertData.is_type)
			.query("SELECT * FROM user_xpg_market_exposures WHERE user_id=@user_id AND sport_id=@sport_id AND match_id=@match_id AND market_id=@market_id AND sequence=@sequence AND is_type=@is_type");
		//console.log("SELECT TOP 1 * FROM user_xpg_market_logs WHERE user_id=@user_id AND round_id=@match_id AND type=@credit_type ORDER BY id DESC");
		console.log('result.recordsets--------------getSameRoundCANCEL_XPG-------------- ', result.recordsets[0].length);
		if (result.recordsets === null || result.recordsets[0].length <= 0) {


			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}

	} catch (error) {
		console.error("getSameRoundCANCEL_XPG", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getSameRoundPerformRefund_XPG = async function (insertData) {

	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, insertData.user_id)
			.input('sport_id', sql.Int, insertData.GameId)
			.input('match_id', sql.VarChar(255), insertData.roundId)
			.input('market_id', sql.VarChar(255), insertData.roundId)
			.input('transaction_id', sql.VarChar(255), insertData.transaction_id)
			.input('is_type', sql.VarChar(255), insertData.is_type)
			.query("SELECT * FROM user_xpg_market_exposures WHERE user_id=@user_id AND sport_id=@sport_id AND match_id=@match_id AND market_id=@market_id AND transaction_id=@transaction_id AND is_type=@is_type");
		//console.log("SELECT TOP 1 * FROM user_xpg_market_logs WHERE user_id=@user_id AND round_id=@match_id AND type=@credit_type ORDER BY id DESC");
		console.log('result.recordsets--------------getSameRoundPerformRefund_XPG-------------- ', result.recordsets[0].length);
		if (result.recordsets === null || result.recordsets[0].length <= 0) {


			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}

	} catch (error) {
		console.error("getSameRoundPerformRefund_XPG", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let XPGAccountStatement = async function (data) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		let getRoundLastLiability = "SELECT SUM(liability) as liability, agent_id, master_id, super_master_id, admin_id, super_admin_id, super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission, master_commission, agent_commission, user_commission FROM user_xpg_market_exposures WHERE user_id=" + data.user_id + " AND sport_id=" + data.gameId + " AND match_id=" + data.roundId + " AND market_id='" + data.roundId + "' AND is_type='" + data.is_type + "' GROUP BY agent_id, master_id, super_master_id, admin_id, super_admin_id, super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission, master_commission, agent_commission, user_commission";//ORDER BY id DESC";		 
		//console.log('XPGAccountStatement -------------------------- ',getRoundLastLiability);
		const resGetRoundLastLiability = await pool.request().query(getRoundLastLiability);

		let lastRoundLiability = 0;

		let agent_id = 0;
		let master_id = 0;
		let super_master_id = 0;
		let admin_id = 0;
		let super_admin_id = 0;

		let super_admin = 0;
		let admin = 0;
		let super_master = 0;
		let master = 0;
		let agent = 0;

		let super_admin_commission = 0;
		let admin_commission = 0;
		let super_master_commission = 0;
		let master_commission = 0;
		let agent_commission = 0;
		let user_commission = 0;



		if (resGetRoundLastLiability.recordsets[0].length > 0) {
			lastRoundLiability = (resGetRoundLastLiability.recordsets[0][0].liability && resGetRoundLastLiability.recordsets[0][0].liability !== null) ? resGetRoundLastLiability.recordsets[0][0].liability : 0;

			agent_id = resGetRoundLastLiability.recordsets[0][0].agent_id;
			master_id = resGetRoundLastLiability.recordsets[0][0].master_id;
			super_master_id = resGetRoundLastLiability.recordsets[0][0].super_master_id;
			admin_id = resGetRoundLastLiability.recordsets[0][0].admin_id;
			super_admin_id = resGetRoundLastLiability.recordsets[0][0].super_admin_id;

			super_admin = resGetRoundLastLiability.recordsets[0][0].super_admin;
			admin = resGetRoundLastLiability.recordsets[0][0].admin;
			super_master = resGetRoundLastLiability.recordsets[0][0].super_master;
			master = resGetRoundLastLiability.recordsets[0][0].master;
			agent = resGetRoundLastLiability.recordsets[0][0].agent;

			super_admin_commission = resGetRoundLastLiability.recordsets[0][0].super_admin_commission;
			admin_commission = resGetRoundLastLiability.recordsets[0][0].admin_commission;
			super_master_commission = resGetRoundLastLiability.recordsets[0][0].super_master_commission;
			master_commission = resGetRoundLastLiability.recordsets[0][0].master_commission;
			agent_commission = resGetRoundLastLiability.recordsets[0][0].agent_commission;
			user_commission = resGetRoundLastLiability.recordsets[0][0].user_commission;
		}

		let lastRoundProfitLoss = "";
		let lastRoundBalance = "";

		if (data.profit_loss === "" || data.profit_loss === null || data.profit_loss === 0) {

			lastRoundBalance = 0;
			lastRoundProfitLoss = lastRoundLiability;
		}
		else if (data.profit_loss !== "" && data.profit_loss !== null && data.profit_loss > 0) {

			lastRoundProfitLoss = parseFloat(data.profit_loss) + parseFloat(lastRoundLiability);
			lastRoundProfitLoss = parseFloat(lastRoundProfitLoss).toFixed(2);
			lastRoundBalance = parseFloat(data.profit_loss).toFixed(2);
		} else {

			lastRoundBalance = 0;
			lastRoundProfitLoss = parseFloat(data.profit_loss).toFixed(2);
		}

		let statementDescriptionPL = "XPG Game  Round Id # " + data.roundId + "";
		let statementDescription = "XPG Game  Round Id # " + data.roundId + " Bet Amount -> " + lastRoundLiability + " , Profit -> " + data.profit_loss + "";

		let user_pl = lastRoundProfitLoss;
		let agent_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(agent) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(agent) / 100)).toFixed(2);

		let master_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(master) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(master) / 100)).toFixed(2);

		let super_master_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_master) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_master) / 100)).toFixed(2);

		let admin_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(admin) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(admin) / 100)).toFixed(2);

		let super_admin_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_admin) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_admin) / 100)).toFixed(2);

		let userCommission = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(user_commission) / 100)).toFixed(2) : 0;
		let agentCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(agent_commission) / 100)).toFixed(2) : 0;;
		let masterCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(master_commission) / 100)).toFixed(2) : 0;;
		let super_masterCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_master_commission) / 100)).toFixed(2) : 0;;
		let adminCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(admin_commission) / 100)).toFixed(2) : 0;;
		let super_adminCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_admin_commission) / 100)).toFixed(2) : 0;;


		let distributAmountQuery = "INSERT INTO user_profit_loss (user_id, agent_id, master_id, super_master_id, admin_id,super_admin_id, sport_id, match_id, market_id, type, bet_result_id, stack, description, reffered_name, created_at, user_pl, agent_pl, master_pl, super_master_pl, admin_pl, super_admin_pl, user_commission, agent_commission, master_commission, super_master_commission, admin_commission,super_admin_commission) VALUES(" + data.user_id + "," + agent_id + "," + master_id + "," + super_master_id + "," + admin_id + "," + super_admin_id + ", " + CONSTANTS.BETFAIR_SPORT_CASINO_XPG + ", " + data.roundId + ", '" + data.roundId + "', 1, 0, " + Math.abs(lastRoundLiability) + ", '" + statementDescriptionPL + "', '" + statementDescriptionPL + "', " + currentdate + ", " + user_pl + ", " + agent_pl + ", " + master_pl + ", " + super_master_pl + ", " + admin_pl + ", " + super_admin_pl + ", " + userCommission + ", " + agentCommission + ", " + masterCommission + ", " + super_masterCommission + "," + adminCommission + "," + super_adminCommission + " )";
		await pool.request().query(distributAmountQuery);
		let zeroValue = 0;
		await pool.request()
			.input('pMatchID', sql.Int, data.roundId)
			.input('pMarketID', sql.VarChar(150), data.roundId)
			.input('pIsFancy', sql.Int, zeroValue)
			.input('pIsRollback', sql.Int, zeroValue)
			.input('pIsSuperAdminCommission', sql.VarChar(150), zeroValue)
			.input('pSuperAdminCommissionType', sql.Int, zeroValue)
			.execute('SP_UPDATE_BALANCE_ON_EZUGI_XPG_LOTUS_RESULT');



		let updateRoundUserProfitLoss = "update users SET liability -=  " + lastRoundLiability + " ,balance += " + lastRoundBalance + ", profit_loss +=" + lastRoundProfitLoss + " where id=" + data.user_id + "; SELECT parent_id,balance,liability from users where id=" + data.user_id + "";

		const getUserBalance = await pool.request().query(updateRoundUserProfitLoss);


		let totalAvailableBalance = parseFloat(getUserBalance.recordsets[0][0].balance) - parseFloat(getUserBalance.recordsets[0][0].liability);
		totalAvailableBalance = parseFloat(totalAvailableBalance).toFixed(2);
		let userParentId = getUserBalance.recordsets[0][0].parent_id;

		//console.log('xpg ----- totalAvailableBalance -------------------- ',totalAvailableBalance);

		let userLotusAcStatement = "INSERT INTO  account_statements (user_id, parent_id, description, statement_type, amount, available_balance, match_id, market_id, type, created_by, created_at,created_ip) VALUES(" + data.user_id + "," + userParentId + ",'" + statementDescription + "',2,'" + lastRoundProfitLoss + "','" + totalAvailableBalance + "'," + data.roundId + ",'" + data.roundId + "' ,'1'," + data.user_id + "," + currentdate + ",'" + data.ip_address + "')";

		await pool.request().query(userLotusAcStatement);

		let updateXpgCredit = "update user_xpg_market_exposures SET is_type = '" + data.is_type_update + "' where user_id=" + data.user_id + " AND sport_id=" + data.gameId + " AND match_id=" + data.roundId + " AND market_id='" + data.roundId + "' AND is_type='" + data.is_type + "'";

		await pool.request().query(updateXpgCredit);


		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

	} catch (error) {
		console.error("XPGAccountStatement", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let XPG_PROCESS_AccountStatement = async function (data) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		let getRoundLastLiability = "SELECT SUM(liability) as liability, agent_id, master_id, super_master_id, admin_id, super_admin_id, super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission, master_commission, agent_commission, user_commission FROM user_xpg_market_exposures WHERE user_id=" + data.user_id + " AND sport_id=" + data.gameId + " AND match_id=" + data.roundId + " AND market_id='" + data.roundId + "' AND transaction_id='" + data.TransactionId + "' GROUP BY agent_id, master_id, super_master_id, admin_id, super_admin_id, super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission, master_commission, agent_commission, user_commission";
		console.log('---- getRoundLastLiability ------------------- ', getRoundLastLiability);

		const resGetRoundLastLiability = await pool.request().query(getRoundLastLiability);

		let lastRoundLiability = 0;

		let agent_id = 0;
		let master_id = 0;
		let super_master_id = 0;
		let admin_id = 0;
		let super_admin_id = 0;

		let super_admin = 0;
		let admin = 0;
		let super_master = 0;
		let master = 0;
		let agent = 0;

		let super_admin_commission = 0;
		let admin_commission = 0;
		let super_master_commission = 0;
		let master_commission = 0;
		let agent_commission = 0;
		let user_commission = 0;


		/*if(resGetRoundLastLiability.recordsets[0].length > 0 && resGetRoundLastLiability.recordsets[0][0].liability && resGetRoundLastLiability.recordsets[0][0].liability !== null )
		{
			lastRoundLiability = resGetRoundLastLiability.recordsets[0][0].liability;
		}
*/
		if (resGetRoundLastLiability.recordsets[0].length > 0) {
			lastRoundLiability = (resGetRoundLastLiability.recordsets[0][0].liability && resGetRoundLastLiability.recordsets[0][0].liability !== null) ? resGetRoundLastLiability.recordsets[0][0].liability : 0;

			agent_id = resGetRoundLastLiability.recordsets[0][0].agent_id;
			master_id = resGetRoundLastLiability.recordsets[0][0].master_id;
			super_master_id = resGetRoundLastLiability.recordsets[0][0].super_master_id;
			admin_id = resGetRoundLastLiability.recordsets[0][0].admin_id;
			super_admin_id = resGetRoundLastLiability.recordsets[0][0].super_admin_id;

			super_admin = resGetRoundLastLiability.recordsets[0][0].super_admin;
			admin = resGetRoundLastLiability.recordsets[0][0].admin;
			super_master = resGetRoundLastLiability.recordsets[0][0].super_master;
			master = resGetRoundLastLiability.recordsets[0][0].master;
			agent = resGetRoundLastLiability.recordsets[0][0].agent;

			super_admin_commission = resGetRoundLastLiability.recordsets[0][0].super_admin_commission;
			admin_commission = resGetRoundLastLiability.recordsets[0][0].admin_commission;
			super_master_commission = resGetRoundLastLiability.recordsets[0][0].super_master_commission;
			master_commission = resGetRoundLastLiability.recordsets[0][0].master_commission;
			agent_commission = resGetRoundLastLiability.recordsets[0][0].agent_commission;
			user_commission = resGetRoundLastLiability.recordsets[0][0].user_commission;
		}


		let lastRoundProfitLoss = "";
		let lastRoundBalance = "";

		if (data.profit_loss === "" || data.profit_loss === null || data.profit_loss === 0) {

			lastRoundBalance = 0;
			lastRoundProfitLoss = lastRoundLiability;
		}
		else if (data.profit_loss !== "" && data.profit_loss !== null && data.profit_loss > 0) {

			lastRoundProfitLoss = parseFloat(data.profit_loss) + parseFloat(lastRoundLiability);
			lastRoundProfitLoss = parseFloat(lastRoundProfitLoss).toFixed(2);
			lastRoundBalance = parseFloat(data.profit_loss).toFixed(2);
		} else {

			lastRoundBalance = 0;
			lastRoundProfitLoss = parseFloat(data.profit_loss).toFixed(2);
		}

		let statementDescriptionPL = "XPG SLOAT Game  Round Id # " + data.roundId + "";
		let statementDescription = "XPG SLOAT Game  Round Id # " + data.roundId + " Bet Amount -> " + lastRoundLiability + " , Profit -> " + data.profit_loss + "";

		let user_pl = lastRoundProfitLoss;

		let agent_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(agent) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(agent) / 100)).toFixed(2);

		let master_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(master) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(master) / 100)).toFixed(2);

		let super_master_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_master) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_master) / 100)).toFixed(2);

		let admin_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(admin) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(admin) / 100)).toFixed(2);

		let super_admin_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_admin) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_admin) / 100)).toFixed(2);



		let userCommission = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(user_commission) / 100)).toFixed(2) : 0;
		let agentCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(agent_commission) / 100)).toFixed(2) : 0;;
		let masterCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(master_commission) / 100)).toFixed(2) : 0;
		let super_masterCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_master_commission) / 100)).toFixed(2) : 0;
		let adminCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(admin_commission) / 100)).toFixed(2) : 0;;
		let super_adminCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_admin_commission) / 100)).toFixed(2) : 0;

		let distributAmountQuery = "INSERT INTO user_profit_loss (user_id, agent_id, master_id, super_master_id, admin_id,super_admin_id, sport_id, match_id, market_id, type, bet_result_id, stack, description, reffered_name, created_at, user_pl, agent_pl, master_pl, super_master_pl, admin_pl, super_admin_pl, user_commission, agent_commission, master_commission, super_master_commission, admin_commission,super_admin_commission) VALUES(" + data.user_id + "," + agent_id + "," + master_id + "," + super_master_id + "," + admin_id + "," + super_admin_id + ", " + CONSTANTS.BETFAIR_SPORT_CASINO_XPG + ", " + data.roundId + ", '" + data.roundId + "', 1, 0, " + Math.abs(lastRoundLiability) + ", '" + statementDescriptionPL + "', '" + statementDescriptionPL + "', " + currentdate + ", " + user_pl + ", " + agent_pl + ", " + master_pl + ", " + super_master_pl + ", " + admin_pl + ", " + super_admin_pl + ", " + userCommission + ", " + agentCommission + ", " + masterCommission + ", " + super_masterCommission + "," + adminCommission + "," + super_adminCommission + " )";
		await pool.request().query(distributAmountQuery);
		let zeroValue = 0;
		await pool.request()
			.input('pMatchID', sql.BigInt, data.roundId)
			.input('pMarketID', sql.VarChar(150), data.roundId)
			.input('pIsFancy', sql.Int, zeroValue)
			.input('pIsRollback', sql.Int, zeroValue)
			.input('pIsSuperAdminCommission', sql.VarChar(150), zeroValue)
			.input('pSuperAdminCommissionType', sql.Int, zeroValue)
			.execute('SP_UPDATE_BALANCE_ON_EZUGI_XPG_LOTUS_RESULT');


		let updateRoundUserProfitLoss = "update users SET liability -=  " + lastRoundLiability + " ,balance += " + lastRoundBalance + ", profit_loss +=" + lastRoundProfitLoss + " where id=" + data.user_id + "; SELECT parent_id,balance,liability from users where id=" + data.user_id + "";

		const getUserBalance = await pool.request().query(updateRoundUserProfitLoss);

		let totalAvailableBalance = parseFloat(getUserBalance.recordsets[0][0].balance) - parseFloat(getUserBalance.recordsets[0][0].liability);
		totalAvailableBalance = parseFloat(totalAvailableBalance).toFixed(2);
		let userParentId = getUserBalance.recordsets[0][0].parent_id;

		let userLotusAcStatement = "INSERT INTO  account_statements (user_id, parent_id, description, statement_type, amount, available_balance, match_id, market_id, type, created_by, created_at,created_ip) VALUES(" + data.user_id + "," + userParentId + ",'" + statementDescription + "',2,'" + lastRoundProfitLoss + "','" + totalAvailableBalance + "'," + data.roundId + ",'" + data.roundId + "' ,'1'," + data.user_id + "," + currentdate + ",'" + data.ip_address + "')";

		await pool.request().query(userLotusAcStatement);

		let updateXpgCredit = "update user_xpg_market_exposures SET is_type = '" + data.is_type_update + "' where user_id=" + data.user_id + " AND sport_id=" + data.gameId + " AND match_id=" + data.roundId + " AND market_id='" + data.roundId + "' AND is_type='" + data.is_type + "'";



		await pool.request().query(updateXpgCredit);


		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

	} catch (error) {
		console.error("XPG_PROCESS_AccountStatement ------- ", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let xpg_CancelTransaction = async function (data) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		let getRoundLastLiability = "SELECT SUM(liability) as liability  FROM user_xpg_market_exposures WHERE user_id=" + data.user_id + " AND sport_id=" + data.gameId + " AND match_id=" + data.roundId + " AND market_id='" + data.roundId + "' AND sequence=" + data.Sequence + "";//" ORDER BY id DESC";		 

		const resGetRoundLastLiability = await pool.request().query(getRoundLastLiability);

		let lastRoundLiability = 0;



		if (resGetRoundLastLiability.recordsets[0].length > 0 && resGetRoundLastLiability.recordsets[0][0].liability && resGetRoundLastLiability.recordsets[0][0].liability !== null) {
			lastRoundLiability = resGetRoundLastLiability.recordsets[0][0].liability;
		}


		let updateRoundUserProfitLoss = "update users SET liability -=  " + lastRoundLiability + " ,balance -= " + lastRoundLiability + " where id=" + data.user_id + "; SELECT parent_id,balance,liability from users where id=" + data.user_id + "; UPDATE cassino_markets SET status = 'N',winner_name='Abandoned',result_id=0 ,is_abandoned='Y', is_result_declared = 'Y' WHERE  match_id = " + data.roundId + " AND market_id = '" + data.roundId + "'; UPDATE cassino_matches SET winner_name='Abandoned', is_completed = 'Y' WHERE  match_id =" + data.roundId + "";

		const getUserBalance = await pool.request().query(updateRoundUserProfitLoss);

		let cancelRoundSequece = "update user_xpg_market_exposures SET is_type = '" + data.is_type_update + "'  WHERE user_id=" + data.user_id + " AND sport_id=" + data.gameId + " AND match_id=" + data.roundId + " AND market_id='" + data.roundId + "' AND sequence=" + data.Sequence + "";



		await pool.request().query(cancelRoundSequece);

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);



	} catch (error) {
		console.error("xpg_CancelTransaction error on service", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let xpg_PerformRefund = async function (data) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		let getRoundLastLiability = "SELECT SUM(liability) as liability  FROM user_xpg_market_exposures WHERE user_id=" + data.user_id + " AND sport_id=" + data.gameId + " AND match_id=" + data.roundId + " AND market_id='" + data.roundId + "' AND transaction_id='" + data.TransactionId + "'";//" ORDER BY id DESC";		 

		const resGetRoundLastLiability = await pool.request().query(getRoundLastLiability);

		let lastRoundLiability = "";



		if (resGetRoundLastLiability.recordsets[0].length > 0 && resGetRoundLastLiability.recordsets[0][0].liability && resGetRoundLastLiability.recordsets[0][0].liability !== null) {
			lastRoundLiability = resGetRoundLastLiability.recordsets[0][0].liability;
		}
		else {

			lastRoundLiability = 0;
		}


		let updateRoundUserProfitLoss = "update users SET liability -=  " + lastRoundLiability + " ,balance -= " + lastRoundLiability + " where id=" + data.user_id + "; SELECT parent_id,balance,liability from users where id=" + data.user_id + " ; UPDATE cassino_markets SET status = 'N',winner_name='Abandoned',result_id=0 ,is_abandoned='Y', is_result_declared = 'Y' WHERE  match_id = " + data.roundId + " AND market_id = '" + data.roundId + "'; UPDATE cassino_matches SET winner_name='Abandoned', is_completed = 'Y' WHERE  match_id =" + data.roundId + "";

		console.log('xpg_PerformRefund  update users     ------------------------ ', updateRoundUserProfitLoss);

		const getUserBalance = await pool.request().query(updateRoundUserProfitLoss);

		let xpg_PerformRefund = "update user_xpg_market_exposures SET is_type = '" + data.is_type_update + "'  WHERE user_id=" + data.user_id + " AND sport_id=" + data.gameId + " AND match_id=" + data.roundId + " AND market_id='" + data.roundId + "' AND transaction_id='" + data.TransactionId + "'";

		console.log('xpg_PerformRefund Result     ------------------------ ', xpg_PerformRefund);

		await pool.request().query(xpg_PerformRefund);

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);



	} catch (error) {
		console.error("xpg_PerformRefund error on service", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let xpg_CancelRound = async function (data) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		let cancelRoundUsers = data.Logins;

		for (let i = 0; i < cancelRoundUsers.length; i++) {
			let user_name = cancelRoundUsers[i];


			let getRoundLastLiability = "update users set liability -= ( SELECT SUM(liability) as liability from user_xpg_market_exposures where  match_id=" + data.roundId + " and market_id='" + data.roundId + "' AND sport_id=" + data.gameId + " AND user_id=(SELECT id FROM users where user_name='" + user_name + "')),  balance -=( SELECT SUM(liability) as liability from user_xpg_market_exposures where  match_id=" + data.roundId + " and market_id='" + data.roundId + "' AND sport_id=" + data.gameId + " AND  user_id=(SELECT id FROM users where user_name='" + user_name + "')) where user_name='" + user_name + "'; UPDATE cassino_markets SET status = 'N',winner_name='Abandoned',result_id=0 ,is_abandoned='Y', is_result_declared = 'Y' WHERE  match_id = " + data.roundId + " AND market_id = '" + data.roundId + "'; UPDATE cassino_matches SET winner_name='Abandoned', is_completed = 'Y' WHERE  match_id =" + data.roundId + "";

			console.log('getRoundLastLiability------xpg_CancelRound---------------------', getRoundLastLiability);

			const resGetRoundLastLiability = await pool.request().query(getRoundLastLiability);

		}


		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);



	} catch (error) {
		console.error("xpg_CancelRound error on service", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let insertEzugiAuthString = async (data) => {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		await pool.request()
			.input('user_id', sql.Int, data.user_id)
			.input('ezugi_token', sql.VarChar(255), data.ezugi_token)
			.input('ezugi_token_string', sql.VarChar(50), data.ezugi_token_string)
			.input('status', sql.VarChar(10), data.status)
			.input('created', sql.BigInt, currentdate)
			.query("insert into ezugi_auths (user_id, ezugi_token, ezugi_token_string,status,created) values(@user_id,@ezugi_token,@ezugi_token_string,@status,@created)");

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getEzugi_Token = async (id, requetEzugiToken) => {
	try {

		let status = 'N';
		const pool = await poolPromise;
		const result = await pool.request()
			.input('user_id', sql.Int, id)
			.input('ezugi_token', sql.VarChar(255), requetEzugiToken)
			.input('status', sql.VarChar(10), status)
			.query("SELECT * FROM ezugi_auths WHERE user_id = @user_id AND ezugi_token=@ezugi_token AND status=@status");


		if (result.recordsets === null || result.recordsets[0].length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			let upstatus = 'U';
			await pool.request()
				.input('user_id', sql.Int, id)
				.input('status', sql.VarChar(10), upstatus)
				.query("UPDATE ezugi_auths set status='U' WHERE user_id = @user_id");


			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}

	} catch (error) {
		console.log('error----------getEzugi_Token-----------------', error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

/*
** Add Match XPG 
*
** 16-03-2021
*/

let XPGInsertMatch = async function (data) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;
		let getInserMatch = "SELECT match_id FROM cassino_matches where match_id=" + data.roundId + " AND sport_id=" + CONSTANTS.BETFAIR_SPORT_CASINO_XPG;
		let result = await pool.request().query(getInserMatch);

		if (result.recordsets[0] === null || result.recordsets[0].length <= 0) {

			let matchId = data.roundId;
			let marketId = data.roundId;
			let seriesId = CONSTANTS.BETFAIR_SPORT_CASINO_XPG + "" + CONSTANTS.BETFAIR_SPORT_CASINO;

			let insertMatchData = "INSERT INTO cassino_matches (sport_id, series_id, match_id, cassino_match_type, name, match_date, start_date, score_board_json, score_type, score_key, liability_type, is_manual, is_completed, is_popular, is_cup, winner_name ,is_bet_allow, status ,created_by ,updated_by,created_ip ,created_at ,updated_at ,team_one_image ,team_two_image ,match_number ,stadium_location ) VALUES(" + CONSTANTS.BETFAIR_SPORT_CASINO_XPG + "," + seriesId + "," + matchId + ",0,'casino 1'," + currentdate + "," + currentdate + ",'[]','N','' ,'Y','N','N','N','N','','Y','Y',1,0,'" + data.ip_address + "'," + currentdate + ",0,'','',0,'')";
			await pool.request().query(insertMatchData);

			let insertMarketData = "INSERT INTO cassino_markets (sport_id, series_id, match_id, market_id, name, display_name, match_date, runner_json, market_runner_count, is_bet_allow, bet_allow_time_before, bet_delay, min_stack, max_stack, min_liability, max_market_liability, max_market_profit, min_loss, max_bet_liability, liability_type, status, is_visible, is_manual, is_result_declared, is_abandoned, card_data, result_id, winner_name,market_admin_message,created_by, updated_by, created_ip, created_at, updated_at, isbetalowaftermatchodds ) VALUES(" + CONSTANTS.BETFAIR_SPORT_CASINO_XPG + "," + seriesId + "," + matchId + ",'" + marketId + "','Match Odds','Match Odds'," + currentdate + ",'[]',2,'Y', 0, 0, 0 , 0, 0, 0, 0, 0, 0, 'Y', 'Y','Y','N','N','N','','','','',1,0,'" + data.ip_address + "'," + currentdate + ",0,'N')";
			await pool.request().query(insertMarketData);
		}

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);



	} catch (error) {
		console.error("xpg insert logs ", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let FUNLogInsert = async function (data) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		let userLotusAcStatement = "INSERT INTO  user_fun_market_logs (user_id, round_id, request_json, created_at, type) VALUES(" + data.user_id + "," + data.roundId + ",'" + data.jsonRequest + "'," + currentdate + ",'" + data.type + "')";
		await pool.request().query(userLotusAcStatement);
		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

	} catch (error) {
		console.error("xpg insert logs ", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let updateLobbyFUNUserBalance = async function (insertData) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		let getUserParentData = "SELECT super_admin,admin,super_master,master,agent,super_admin_id,admin_id,super_id as super_master_id,master_id,agent_id , super_admin_match_commission, admin_match_commission, super_master_match_commission, master_match_commission, agent_match_commission, user_match_commission FROM users usr with(nolock) JOIN partnerships part with(nolock) ON part.user_id=usr.id WHERE part.user_id=" + insertData.usergetId + " and usr.id=" + insertData.usergetId + " and part.sport_id=" + CONSTANTS.BETFAIR_SPORT_CASINO_FUN;

		const getAllparentData = await pool.request().query(getUserParentData);

		let super_admin_id = 0;
		let admin_id = 0;
		let super_master_id = 0;
		let master_id = 0;
		let agent_id = 0;

		let super_admin_partnership = 0;
		let admin_partnership = 0;
		let super_master_partnership = 0;
		let master_partnership = 0;
		let agent_partnership = 0;

		let super_admin_commission = 0;
		let admin_commission = 0;
		let super_master_commission = 0;
		let master_commission = 0;
		let agent_commission = 0;
		let user_commission = 0;


		if (getAllparentData.recordsets[0].length > 0) {
			super_admin_id = getAllparentData.recordsets[0][0].super_admin_id;
			admin_id = getAllparentData.recordsets[0][0].admin_id;
			super_master_id = getAllparentData.recordsets[0][0].super_master_id;
			master_id = getAllparentData.recordsets[0][0].master_id;
			agent_id = getAllparentData.recordsets[0][0].agent_id;

			super_admin_partnership = getAllparentData.recordsets[0][0].super_admin;
			admin_partnership = getAllparentData.recordsets[0][0].admin;
			super_master_partnership = getAllparentData.recordsets[0][0].super_master;
			master_partnership = getAllparentData.recordsets[0][0].master;
			agent_partnership = getAllparentData.recordsets[0][0].agent;

			super_admin_commission = getAllparentData.recordsets[0][0].super_admin_match_commission;
			admin_commission = getAllparentData.recordsets[0][0].admin_match_commission;
			super_master_commission = getAllparentData.recordsets[0][0].super_master_match_commission;
			master_commission = getAllparentData.recordsets[0][0].master_match_commission;
			agent_commission = getAllparentData.recordsets[0][0].agent_match_commission;
			user_commission = getAllparentData.recordsets[0][0].user_match_commission;
		}

		let totalExposer = 0;
		totalExposer -= insertData.liability;

		let insertXPGMarketExpo = "INSERT INTO user_fun_market_exposures (user_id,agent_id,master_id,super_master_id,admin_id,super_admin_id,super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission,master_commission,agent_commission,user_commission, sport_id, match_id,market_id,liability, created_at, sequence,transaction_id, is_type) VALUES (" + insertData.usergetId + "," + agent_id + "," + master_id + "," + super_master_id + "," + admin_id + "," + super_admin_id + "," + super_admin_partnership + "," + admin_partnership + "," + super_master_partnership + "," + master_partnership + "," + agent_partnership + "," + super_admin_commission + "," + admin_commission + "," + super_master_commission + "," + master_commission + "," + agent_commission + "," + user_commission + "," + CONSTANTS.BETFAIR_SPORT_CASINO_FUN + "," + insertData.MatchId + ",'" + insertData.MarketId + "'," + totalExposer + "," + currentdate + "," + insertData.Sequence + "," + insertData.transaction_id + ",'" + insertData.is_type + "')";
		await pool.request().query(insertXPGMarketExpo);

		let updateRunningExposure = "update users SET liability +=  " + totalExposer + " ,balance += " + totalExposer + " where id=" + insertData.usergetId + "; SELECT parent_id,balance,liability from users where id=" + insertData.usergetId + "";
		//let updateRunningExposure = "update users SET liability +=  "+totalExposer+" ,balance += "+totalExposer+" where id="+insertData.usergetId+"";				
		const getUserBalance = await pool.request().query(updateRunningExposure);

		/*let totalAvailableBalance = parseFloat(getUserBalance.recordsets[0][0].balance) - parseFloat(getUserBalance.recordsets[0][0].liability) ; //- parseFloat(totalExposer);
		 totalAvailableBalance = parseFloat(totalAvailableBalance).toFixed(2);
		let userParentId = getUserBalance.recordsets[0][0].parent_id;
		let statementDescription = "Evolution Games "+ insertData.game_extra+" amount";

		let userLotusAcStatement = "INSERT INTO  account_statements (user_id, parent_id, description, statement_type, amount, available_balance, match_id, market_id, type, created_by, created_at,created_ip) VALUES("+insertData.usergetId+","+userParentId+",'"+statementDescription+"',2,'"+totalExposer+"','"+totalAvailableBalance+"',0,'0' ,'1',"+insertData.usergetId+","+currentdate+",'"+insertData.ip_address+"')";	
		console.log(userLotusAcStatement);
		  await pool.request().query(userLotusAcStatement);	*/



		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

	} catch (error) {
		console.error(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};



let updateLobbyFUNCreditUserBalance = async function (data) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		let getRoundLastLiability = "SELECT SUM(liability) as liability, agent_id, master_id, super_master_id, admin_id, super_admin_id, super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission, master_commission, agent_commission, user_commission FROM user_fun_market_exposures WHERE user_id=" + data.user_id + " AND match_id=" + data.MatchId + " AND market_id='" + data.MarketId + "' AND is_type='" + data.is_type + "' GROUP BY agent_id, master_id, super_master_id, admin_id, super_admin_id, super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission, master_commission, agent_commission, user_commission";//ORDER BY id DESC";		 
		//console.log('XPGAccountStatement -------------------------- ',getRoundLastLiability);
		const resGetRoundLastLiability = await pool.request().query(getRoundLastLiability);
		if (resGetRoundLastLiability.recordsets[0].length <= 0) {
			return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);
		}


		let lastRoundLiability = 0;

		let agent_id = 0;
		let master_id = 0;
		let super_master_id = 0;
		let admin_id = 0;
		let super_admin_id = 0;

		let super_admin = 0;
		let admin = 0;
		let super_master = 0;
		let master = 0;
		let agent = 0;

		let super_admin_commission = 0;
		let admin_commission = 0;
		let super_master_commission = 0;
		let master_commission = 0;
		let agent_commission = 0;
		let user_commission = 0;



		if (resGetRoundLastLiability.recordsets[0].length > 0) {
			lastRoundLiability = (resGetRoundLastLiability.recordsets[0][0].liability && resGetRoundLastLiability.recordsets[0][0].liability !== null) ? resGetRoundLastLiability.recordsets[0][0].liability : 0;

			agent_id = resGetRoundLastLiability.recordsets[0][0].agent_id;
			master_id = resGetRoundLastLiability.recordsets[0][0].master_id;
			super_master_id = resGetRoundLastLiability.recordsets[0][0].super_master_id;
			admin_id = resGetRoundLastLiability.recordsets[0][0].admin_id;
			super_admin_id = resGetRoundLastLiability.recordsets[0][0].super_admin_id;

			super_admin = resGetRoundLastLiability.recordsets[0][0].super_admin;
			admin = resGetRoundLastLiability.recordsets[0][0].admin;
			super_master = resGetRoundLastLiability.recordsets[0][0].super_master;
			master = resGetRoundLastLiability.recordsets[0][0].master;
			agent = resGetRoundLastLiability.recordsets[0][0].agent;

			super_admin_commission = resGetRoundLastLiability.recordsets[0][0].super_admin_commission;
			admin_commission = resGetRoundLastLiability.recordsets[0][0].admin_commission;
			super_master_commission = resGetRoundLastLiability.recordsets[0][0].super_master_commission;
			master_commission = resGetRoundLastLiability.recordsets[0][0].master_commission;
			agent_commission = resGetRoundLastLiability.recordsets[0][0].agent_commission;
			user_commission = resGetRoundLastLiability.recordsets[0][0].user_commission;
		}

		let lastRoundProfitLoss = "";
		let lastRoundBalance = "";

		if (data.profit_loss === "" || data.profit_loss === null || data.profit_loss === 0 || data.profit_loss === "0.00") {

			lastRoundBalance = 0;
			lastRoundProfitLoss = lastRoundLiability;
		}
		else if (data.profit_loss !== "" && data.profit_loss !== null && data.profit_loss > 0) {

			lastRoundProfitLoss = parseFloat(data.profit_loss) + parseFloat(lastRoundLiability);
			lastRoundProfitLoss = parseFloat(lastRoundProfitLoss).toFixed(2);
			lastRoundBalance = parseFloat(data.profit_loss).toFixed(2);
		} else {

			lastRoundBalance = 0;
			lastRoundProfitLoss = parseFloat(data.profit_loss).toFixed(2);
		}

		let statementDescriptionPL = "Evolution Game " + data.game_extra + " Round Id # " + data.MarketId + " ";
		let statementDescription = "Evolution Game " + data.game_extra + " Round Id # " + data.MarketId + " Bet Amount -> " + lastRoundLiability + " , Profit -> " + data.profit_loss + "";

		let user_pl = lastRoundProfitLoss;
		let agent_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(agent) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(agent) / 100)).toFixed(2);

		let master_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(master) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(master) / 100)).toFixed(2);

		let super_master_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_master) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_master) / 100)).toFixed(2);

		let admin_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(admin) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(admin) / 100)).toFixed(2);

		let super_admin_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_admin) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_admin) / 100)).toFixed(2);

		let userCommission = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(user_commission) / 100)).toFixed(2) : 0;
		let agentCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(agent_commission) / 100)).toFixed(2) : 0;;
		let masterCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(master_commission) / 100)).toFixed(2) : 0;;
		let super_masterCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_master_commission) / 100)).toFixed(2) : 0;;
		let adminCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(admin_commission) / 100)).toFixed(2) : 0;;
		let super_adminCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_admin_commission) / 100)).toFixed(2) : 0;;

		let insertXPGMarketExpo = "INSERT INTO user_fun_market_exposures (user_id,agent_id,master_id,super_master_id,admin_id,super_admin_id,super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission,master_commission,agent_commission,user_commission, sport_id, match_id,market_id,liability, created_at, sequence,transaction_id, is_type) VALUES (" + data.user_id + "," + agent_id + "," + master_id + "," + super_master_id + "," + admin_id + "," + super_admin_id + "," + super_admin + "," + admin + "," + super_master + "," + master + "," + agent + "," + super_admin_commission + "," + admin_commission + "," + super_master_commission + "," + master_commission + "," + agent_commission + "," + user_commission + "," + CONSTANTS.BETFAIR_SPORT_CASINO_FUN + "," + data.MatchId + ",'" + data.MarketId + "'," + data.profit_loss + "," + currentdate + "," + data.Sequence + "," + data.transaction_id + ",'" + data.is_type_update + "')";
		await pool.request().query(insertXPGMarketExpo);



		let distributAmountQuery = "INSERT INTO user_profit_loss (user_id, agent_id, master_id, super_master_id, admin_id,super_admin_id, sport_id, match_id, market_id, type, bet_result_id, stack, description, reffered_name, created_at, user_pl, agent_pl, master_pl, super_master_pl, admin_pl, super_admin_pl, user_commission, agent_commission, master_commission, super_master_commission, admin_commission,super_admin_commission) VALUES(" + data.user_id + "," + agent_id + "," + master_id + "," + super_master_id + "," + admin_id + "," + super_admin_id + ", " + CONSTANTS.BETFAIR_SPORT_CASINO_FUN + ", " + data.MatchId + ", '" + data.MarketId + "', 1, 0, " + Math.abs(lastRoundLiability) + ", '" + statementDescriptionPL + "', '" + statementDescriptionPL + "', " + currentdate + ", " + user_pl + ", " + agent_pl + ", " + master_pl + ", " + super_master_pl + ", " + admin_pl + ", " + super_admin_pl + ", " + userCommission + ", " + agentCommission + ", " + masterCommission + ", " + super_masterCommission + "," + adminCommission + "," + super_adminCommission + " )";
		await pool.request().query(distributAmountQuery);
		let zeroValue = 0;
		await pool.request()
			.input('pMatchID', sql.BigInt(20), data.MatchId)
			.input('pMarketID', sql.VarChar(150), data.MarketId)
			.input('pIsFancy', sql.Int, zeroValue)
			.input('pIsRollback', sql.Int, zeroValue)
			.input('pIsSuperAdminCommission', sql.VarChar(150), zeroValue)
			.input('pSuperAdminCommissionType', sql.Int, zeroValue)
			.execute('SP_UPDATE_BALANCE_ON_EZUGI_XPG_LOTUS_RESULT');



		let updateRoundUserProfitLoss = "update users SET liability -=  " + lastRoundLiability + " , balance += " + lastRoundBalance + ", profit_loss +=" + lastRoundProfitLoss + " where id=" + data.user_id + "; SELECT parent_id,balance,liability from users where id=" + data.user_id + "";

		const getUserBalance = await pool.request().query(updateRoundUserProfitLoss);


		let totalAvailableBalance = parseFloat(getUserBalance.recordsets[0][0].balance) - parseFloat(getUserBalance.recordsets[0][0].liability);
		totalAvailableBalance = parseFloat(totalAvailableBalance).toFixed(2);
		let userParentId = getUserBalance.recordsets[0][0].parent_id;

		//console.log('xpg ----- totalAvailableBalance -------------------- ',totalAvailableBalance);

		let userLotusAcStatement = "INSERT INTO  account_statements (user_id, parent_id, description, statement_type, amount, available_balance, match_id, market_id, type, created_by, created_at,created_ip) VALUES(" + data.user_id + "," + userParentId + ",'" + statementDescription + "',2,'" + lastRoundProfitLoss + "','" + totalAvailableBalance + "'," + data.MatchId + ",'" + data.MarketId + "' ,'1'," + data.user_id + "," + currentdate + ",'" + data.ip_address + "')";

		await pool.request().query(userLotusAcStatement);

		let updateXpgCredit = "update user_fun_market_exposures SET is_type = '" + data.is_type_update + "' where user_id=" + data.user_id + "  AND match_id=" + data.MatchId + " AND market_id='" + data.MarketId + "' AND is_type='" + data.is_type + "'";
		await pool.request().query(updateXpgCredit);

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

	} catch (error) {
		console.error(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

/*
** Add Match XPG 
*
** 16-03-2021
*/

let FUNInsertMatch = async function (data) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;
		let getInserMatch = "SELECT match_id FROM cassino_matches where match_id=" + data.MatchId + " AND sport_id=" + CONSTANTS.BETFAIR_SPORT_CASINO_FUN;
		let result = await pool.request().query(getInserMatch);

		if (result.recordsets[0] === null || result.recordsets[0].length <= 0) {

			let matchId = data.MatchId;
			let marketId = data.MarketId;
			let seriesId = CONSTANTS.BETFAIR_SPORT_CASINO_FUN + "" + CONSTANTS.BETFAIR_SPORT_CASINO;

			let insertMatchData = "INSERT INTO cassino_matches (sport_id, series_id, match_id, cassino_match_type, name, match_date, start_date, score_board_json, score_type, score_key, liability_type, is_manual, is_completed, is_popular, is_cup, winner_name ,is_bet_allow, status ,created_by ,updated_by,created_ip ,created_at ,updated_at ,team_one_image ,team_two_image ,match_number ,stadium_location ) VALUES(" + CONSTANTS.BETFAIR_SPORT_CASINO_FUN + "," + seriesId + "," + matchId + ",0,'casino 5'," + currentdate + "," + currentdate + ",'[]','N','' ,'Y','N','N','N','N','','Y','Y',1,0,'" + data.ip_address + "'," + currentdate + ",0,'','',0,'')";
			await pool.request().query(insertMatchData);

			let insertMarketData = "INSERT INTO cassino_markets (sport_id, series_id, match_id, market_id, name, display_name, match_date, runner_json, market_runner_count, is_bet_allow, bet_allow_time_before, bet_delay, min_stack, max_stack, min_liability, max_market_liability, max_market_profit, min_loss, max_bet_liability, liability_type, status, is_visible, is_manual, is_result_declared, is_abandoned, card_data, result_id, winner_name,market_admin_message,created_by, updated_by, created_ip, created_at, updated_at, isbetalowaftermatchodds ) VALUES(" + CONSTANTS.BETFAIR_SPORT_CASINO_FUN + "," + seriesId + "," + matchId + ",'" + marketId + "','Match Odds','Match Odds'," + currentdate + ",'[]',2,'Y', 0, 0, 0 , 0, 0, 0, 0, 0, 0, 'Y', 'Y','Y','N','N','N','','','','',1,0,'" + data.ip_address + "'," + currentdate + ",0,'N')";
			await pool.request().query(insertMarketData);
		}

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);



	} catch (error) {
		console.error("xpg insert logs ", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getSameRoundFUN = async function (txnId) {

	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('transaction_id', sql.VarChar(255), txnId)
			.query("SELECT * FROM user_fun_market_exposures WHERE transaction_id=@transaction_id");

		if (result.recordsets === null || result.recordsets[0].length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}

	} catch (error) {
		console.error("getSameRoundCANCEL_XPG", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let userFUNGameUpdateAmout = async (amount, user_id, ip_address, game_extra) => {
	try {

		const pool = await poolPromise;
		let currentdate = globalFunction.currentDateTimeStamp();

		let updateRunningExposure = "update users SET liability +=  " + amount + ", balance += " + amount + " where id=" + user_id + "; SELECT parent_id,balance,liability from users where id=" + user_id + "";
		const getUserBalance = await pool.request().query(updateRunningExposure);
		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let funSportsActiveForUser = async (sport_id, user_id) => {
	try {

		const pool = await poolPromise;

		let getSprtsSetting = "select  CASE WHEN sports.parent_id > 0 THEN sports.parent_id ELSE sports.sport_id END  from user_setting_sport_wise as ussport	JOIN sports ON sports.sport_id=ussport.sport_id where ussport.user_id =  " + user_id + "  and ussport.assign_sport=1  AND sports.status='Y'  AND sports.sport_id =" + sport_id + "	AND NOT EXISTS ( SELECT 1 from deactive_sports WHERE deactive_sports.sport_id =sports.sport_id AND ( deactive_sports.user_id =" + user_id + " ) ) ";
		const getUserBalance = await pool.request().query(getSprtsSetting);

		if (getUserBalance.recordsets === null || getUserBalance.recordsets[0].length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, getUserBalance.recordsets[0][0]);
		}

	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

/*
** Add Match EZUGI 
*
** 08-06-2021
*/

let EZUGIInsertMatch = async function (data) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;
		let getInserMatch = "SELECT match_id FROM cassino_matches where match_id=" + data.roundId + " AND sport_id=" + CONSTANTS.BETFAIR_SPORT_CASINO_EZUGI;
		let result = await pool.request().query(getInserMatch);

		if (result.recordsets[0] === null || result.recordsets[0].length <= 0) {

			let matchId = data.roundId;
			let marketId = data.roundId;
			let seriesId = CONSTANTS.BETFAIR_SPORT_CASINO_EZUGI + "" + CONSTANTS.BETFAIR_SPORT_CASINO;

			let insertMatchData = "INSERT INTO cassino_matches (sport_id, series_id, match_id, cassino_match_type, name, match_date, start_date, score_board_json, score_type, score_key, liability_type, is_manual, is_completed, is_popular, is_cup, winner_name ,is_bet_allow, status ,created_by ,updated_by,created_ip ,created_at ,updated_at ,team_one_image ,team_two_image ,match_number ,stadium_location ) VALUES(" + CONSTANTS.BETFAIR_SPORT_CASINO_EZUGI + "," + seriesId + "," + matchId + ",0,'casino 2'," + currentdate + "," + currentdate + ",'[]','N','' ,'Y','N','N','N','N','','Y','Y',1,0,'" + data.ip_address + "'," + currentdate + ",0,'','',0,'')";
			await pool.request().query(insertMatchData);

			let insertMarketData = "INSERT INTO cassino_markets (sport_id, series_id, match_id, market_id, name, display_name, match_date, runner_json, market_runner_count, is_bet_allow, bet_allow_time_before, bet_delay, min_stack, max_stack, min_liability, max_market_liability, max_market_profit, min_loss, max_bet_liability, liability_type, status, is_visible, is_manual, is_result_declared, is_abandoned, card_data, result_id, winner_name,market_admin_message,created_by, updated_by, created_ip, created_at, updated_at, isbetalowaftermatchodds ) VALUES(" + CONSTANTS.BETFAIR_SPORT_CASINO_EZUGI + "," + seriesId + "," + matchId + ",'" + marketId + "','Match Odds','Match Odds'," + currentdate + ",'[]',2,'Y', 0, 0, 0 , 0, 0, 0, 0, 0, 0, 'Y', 'Y','Y','N','N','N','','','','',1,0,'" + data.ip_address + "'," + currentdate + ",0,'N')";
			await pool.request().query(insertMarketData);
		}

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);



	} catch (error) {
		console.error("xpg insert logs ", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
/*
** Add Match Lotus 
*
** 08-06-2021
*/

let LotusInsertMatch = async function (data) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;
		let getInserMatch = "SELECT match_id FROM cassino_matches where match_id=" + data.betInfo.roundId + " AND sport_id=" + CONSTANTS.BETFAIR_SPORT_CASINO_LOTUS;
		let result = await pool.request().query(getInserMatch);

		if (result.recordsets[0] === null || result.recordsets[0].length <= 0) {

			let matchId = data.betInfo.roundId;
			let marketId = data.betInfo.marketId;
			let seriesId = CONSTANTS.BETFAIR_SPORT_CASINO_LOTUS + "" + CONSTANTS.BETFAIR_SPORT_CASINO;

			let insertMatchData = "INSERT INTO cassino_matches (sport_id, series_id, match_id, cassino_match_type, name, match_date, start_date, score_board_json, score_type, score_key, liability_type, is_manual, is_completed, is_popular, is_cup, winner_name ,is_bet_allow, status ,created_by ,updated_by,created_ip ,created_at ,updated_at ,team_one_image ,team_two_image ,match_number ,stadium_location ) VALUES(" + CONSTANTS.BETFAIR_SPORT_CASINO_LOTUS + "," + seriesId + "," + matchId + ",0,'casino 3'," + currentdate + "," + currentdate + ",'[]','N','' ,'Y','N','N','N','N','','Y','Y',1,0,'" + data.ip_address + "'," + currentdate + ",0,'','',0,'')";
			await pool.request().query(insertMatchData);

			let insertMarketData = "INSERT INTO cassino_markets (sport_id, series_id, match_id, market_id, name, display_name, match_date, runner_json, market_runner_count, is_bet_allow, bet_allow_time_before, bet_delay, min_stack, max_stack, min_liability, max_market_liability, max_market_profit, min_loss, max_bet_liability, liability_type, status, is_visible, is_manual, is_result_declared, is_abandoned, card_data, result_id, winner_name,market_admin_message,created_by, updated_by, created_ip, created_at, updated_at, isbetalowaftermatchodds ) VALUES(" + CONSTANTS.BETFAIR_SPORT_CASINO_LOTUS + "," + seriesId + "," + matchId + ",'" + marketId + "','Match Odds','Match Odds'," + currentdate + ",'[]',2,'Y', 0, 0, 0 , 0, 0, 0, 0, 0, 0, 'Y', 'Y','Y','N','N','N','','','','',1,0,'" + data.ip_address + "'," + currentdate + ",0,'N')";
			await pool.request().query(insertMarketData);
		}

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);



	} catch (error) {
		console.error("xpg insert logs ", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let paymentInitiated = async (data) => {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		let query = "insert into user_transaction (user_id, agent_id, master_id,super_master_id,admin_id,super_admin_id, amount, request_json,status,request_status,response_status, created_ip, created_at) SELECT " + data.id + ",agent_id, master_id, super_id, admin_id, super_admin_id," + data.amount + ",'" + JSON.stringify(data) + "','PENDING','Pre Initiated','Pre Initiated','" + data.ip_address + "'," + currentdate + "  FROM users with(nolock) WHERE id=" + data.id + "  SELECT SCOPE_IDENTITY() AS transaction_id";
		const getTransactionDetails = await pool.request().query(query);

		if (getTransactionDetails.recordsets === null || getTransactionDetails.recordsets[0].length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {

			let transaction_id = getTransactionDetails.recordsets[0][0].transaction_id;

			let queryLog = "insert into user_transaction_logs (transaction_id, user_id, agent_id, master_id,super_master_id,admin_id,super_admin_id, amount, request_json,status, created_ip, created_at) SELECT " + transaction_id + "," + data.id + ",agent_id, master_id, super_id, admin_id, super_admin_id," + data.amount + ",'" + JSON.stringify(data) + "','Pre Initiated','" + data.ip_address + "'," + currentdate + "  FROM users with(nolock) WHERE id=" + data.id;
			await pool.request().query(queryLog);
			return resultdb(CONSTANTS.SUCCESS, getTransactionDetails.recordsets[0][0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


function base64Decode(mainUserId) {
	let fristUserId = mainUserId.substring(0, 1);
	let secondUserId = mainUserId.substring(7, mainUserId.length);
	let data = fristUserId + secondUserId;
	let buff = new Buffer(data, 'base64');
	return buff.toString('ascii');

}
let paymentLog = async (data) => {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;
		//let transactionId = await base64Decode(data.data.transaction_id);
		let transactionId = data.data.transaction_id;
		transactionId = transactionId.split('__');
		let user_id = transactionId[0];
		let trransaction_id = transactionId[1];
		let queryLog = "insert into user_transaction_logs (transaction_id, user_id, agent_id, master_id,super_master_id,admin_id,super_admin_id, amount, request_json,status, created_ip, created_at) SELECT " + trransaction_id + ",id,agent_id, master_id, super_id, admin_id, super_admin_id," + data.data.amount + ",'" + JSON.stringify(data) + "','" + data.status + "','" + data.ip_address + "'," + currentdate + "  FROM users with(nolock) WHERE id=" + user_id;
		await pool.request().query(queryLog);
		let transactionQuery = "";
		if ((data.status == 'Success' || data.status == 'SUCCESS')) {

			let getUserTransactionDetails = "SELECT status, amount FROM user_transaction WHERE id=" + trransaction_id;
			let result = await pool.request().query(getUserTransactionDetails);
			console.log(' result.recordsets[0] ----- ', result.recordsets[0]);
			if (result.recordsets === null || result.recordsets[0].length <= 0) {
				return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
			} else {

				let userTransactionDetails = result.recordsets[0][0];

				if (userTransactionDetails.status != data.data.txStatus && data.data.txStatus == 'SUCCESS' && data.data.amount == userTransactionDetails.amount) {

					let depositAmt = data.data.amount;

					let userRecordQuery = "SELECT id,parent_id,user_name,name,balance,liability,profit_loss,freechips FROM users with(nolock) WHERE id=" + user_id;
					let userDetails = await pool.request().query(userRecordQuery);
					let userDetailsRecod = userDetails.recordsets[0][0];
					let userAvailableBalance = userDetailsRecod.balance + Math.abs(userDetailsRecod.liability) + depositAmt;


					let updateUserWallet = "UPDATE users SET freechips +=" + depositAmt + ", balance +=" + depositAmt + ",updated_at=" + currentdate + ",updated_by=" + user_id + " WHERE id=" + user_id;
					await pool.request().query(updateUserWallet);

					let userStatement = "INSERT INTO account_statements (user_id,parent_id,description, statement_type, amount, match_id,market_id, type, available_balance, created_by, updated_by,created_at ) values(" + user_id + ",0,'Chips deposited by " + userDetailsRecod.name + "',1,'" + depositAmt + "',0,0,0," + userAvailableBalance + "," + user_id + "," + user_id + "," + currentdate + ") ";
					console.log('user statement insert ------------- ', userStatement);
					await pool.request().query(userStatement);


					let userParentRecordQuery = "SELECT id,parent_id,user_name,name,balance,liability,profit_loss,freechips FROM users with(nolock) WHERE id=" + userDetailsRecod.parent_id;
					let userParentDetails = await pool.request().query(userParentRecordQuery);
					let userParentDetailsRecod = userParentDetails.recordsets[0][0];

					let parentAvailableBalanc = userParentDetailsRecod.balance - depositAmt;

					let updateUserParentWallet = "UPDATE users SET freechips -=" + depositAmt + ", balance -=" + depositAmt + ",updated_at=" + currentdate + ",updated_by=" + user_id + " WHERE id=" + userDetailsRecod.parent_id;
					await pool.request().query(updateUserParentWallet);

					let userParentStatement = "INSERT INTO account_statements (user_id,parent_id,description, statement_type, amount, match_id,market_id, type, available_balance, created_by, updated_by,created_at ) values(" + userDetailsRecod.parent_id + ",0,'Chips deposited to " + userDetailsRecod.name + "',1,'-" + depositAmt + "',0,0,0," + parentAvailableBalanc + "," + user_id + "," + user_id + "," + currentdate + ") ";
					console.log('user userParentStatement insert ------------- ', userParentStatement);
					await pool.request().query(userParentStatement);
				}

				transactionQuery = "UPDATE user_transaction SET status='" + data.data.txStatus + "', response_status='" + data.data.txStatus + "' WHERE id=" + trransaction_id;
				await pool.request().query(transactionQuery);


				return resultdb(CONSTANTS.SUCCESS,);
			}


		}

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getAccountDetails = async (data) => {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;
		let query = "";
		if (data.type == 'W') {
			query = "SELECT id as ac_sub, account_phone_number as accountnumber,account_ifsc_code as ifsc ,account_holder_name as acHname, account_type  as type  FROM user_account_informations with(nolock) WHERE user_id=" + data.id;

		} else {

			let account_details_column = ''
			if (settings.DEPOSIT_ACCOUNT_DETAILS_SUPER_ADMIN == 'YES') {
				account_details_column = 'super_admin_id'
			} else if (settings.DEPOSIT_ACCOUNT_DETAILS_ADMIN == 'YES') {
				account_details_column = 'admin_id'
			} else if (settings.DEPOSIT_ACCOUNT_DETAILS_SUPER_MASTER == 'YES') {
				account_details_column = 'super_id'
			} else if (settings.DEPOSIT_ACCOUNT_DETAILS_MASTER == 'YES') {
				account_details_column = 'master_id'
			} else if (settings.DEPOSIT_ACCOUNT_DETAILS_AGENT == 'YES') {
				account_details_column = 'agent_id'
			}

			query = "SELECT * FROM user_account_informations with(nolock) WHERE agent_id =0 and status = 'Y'";
			// query = "SELECT id as ac_sub,account_phone_number as accountnumber,account_ifsc_code as ifsc, CASE WHEN qr_code_image IS NULL THEN '' ELSE ISNULL('" + settings.imagePublic + "qr_code/','') + '' +  ISNULL(CAST(qr_code_image AS varchar(4000)) ,'') END  as qr_code ,account_holder_name as acHname, account_type as type,bank_account_type as banktype,upi_id as upi FROM user_account_informations with(nolock) WHERE user_id=(SELECT " + account_details_column + " FROM users with(nolock) WHERE id=1)";
		}

		const getTransactionDetails = await pool.request().query(query);

		if (getTransactionDetails.recordsets === null || getTransactionDetails.recordsets[0].length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, getTransactionDetails.recordsets[0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};



let getVerifyOTP = async (data) => {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		let getOTPTime = currentdate - 60;
		const pool = await poolPromise;
		console.log("SELECT * FROM register_with_otp WHERE id=" + data + " AND created_at <=" + currentdate + " AND created_at>=" + getOTPTime);
		const getOTPRecord = await pool.request()
			.input('register_otp_id', sql.Int, data)
			.input('currentdate', sql.BigInt, currentdate)
			.input('getOTPTime', sql.BigInt, getOTPTime)
			.query("SELECT * FROM register_with_otp WHERE id=@register_otp_id AND created_at <=@currentdate AND created_at>= @getOTPTime ");

		if (getOTPRecord.recordsets === null || getOTPRecord.recordsets[0].length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			console.log(' getOTPRecord.recordsets ', getOTPRecord.recordsets[0][0].id);
			return resultdb(CONSTANTS.SUCCESS, getOTPRecord.recordsets[0][0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};

let verifyOTPRegister = async (data, parentInfo) => {
	try {
		const pool = await poolPromise;
		let currentdate = globalFunction.currentDateTimeStamp();
		const resFromDBr = await pool.request()
			.input('role_id', sql.Int, CONSTANTS.USER_TYPE_USER)
			.input('otpId', sql.Int, data.otpId)
			.input('created_ip', sql.VarChar(50), data.ip_address)
			.input('created_at', sql.VarChar(50), currentdate)
			.query("insert into users (role_id,parent_id,super_admin_id,admin_id,super_id,master_id,agent_id, name, user_name,mobile,user_front_menaul,register_user_status,password,created_at,created_ip) SELECT @role_id, parent_id ,super_admin_id ,admin_id,super_master_id ,master_id ,agent_id, name ,user_name ,mobile ,user_front_menaul  ,register_user_status ,password ,@created_at ,@created_ip FROM  register_with_otp WHERE  id =@otpId ; SELECT SCOPE_IDENTITY() AS id");

		let lastInsId = resFromDBr.recordset[0].id;

		if (lastInsId !== null) {
			let query = "INSERT INTO user_setting_sport_wise (assign_sport, sport_id,user_id,parent_id,match_commission,session_commission,bet_delay,session_delay,min_match_stack,max_match_stack,min_session_stack,max_session_stack,session_max_profit,session_max_loss,max_profit,max_loss,min_exposure,max_exposure,winning_limit,one_click_stack,match_stack,created_ip,created_by,created_at) SELECT assign_sport, sport_id," + lastInsId + "," + parentInfo.parent_id + ",match_commission,session_commission,bet_delay,session_delay,min_match_stack,max_match_stack,min_session_stack,max_session_stack,session_max_profit,session_max_loss,max_profit,max_loss,min_exposure,max_exposure,winning_limit,'" + settings.REGISTER_ONE_CLICK_STAKE + "','" + settings.REGISTER_MATCH_STAKE + "','" + data.ip_address + "',0," + currentdate + " from user_default_settings where user_id=" + parentInfo.parent_id + "";
			await pool.request().query(query);

			let userDefaultSetting = "INSERT INTO user_default_settings (assign_sport,sport_id,user_id,match_commission,session_commission,bet_delay,session_delay,min_match_stack,max_match_stack,min_session_stack,max_session_stack,session_max_profit,session_max_loss,max_profit,max_loss,min_exposure,max_exposure,winning_limit,partnership , created_ip,created_by) SELECT  assign_sport,sport_id," + lastInsId + ",match_commission,session_commission,bet_delay,session_delay,min_match_stack,max_match_stack,min_session_stack,max_session_stack,session_max_profit,session_max_loss,max_profit,max_loss,min_exposure,max_exposure,winning_limit,partnership,'" + data.ip_address + "',0 from user_default_settings where user_id=" + parentInfo.parent_id + "";
			await pool.request().query(userDefaultSetting);

			let userPartnership = " INSERT INTO partnerships (user_type_id, user_id ,parent_id ,sport_id ,super_admin ,admin ,super_master ,master ,agent ,created_ip ,created_by ,created_at ,super_admin_match_commission ,admin_match_commission ,super_master_match_commission ,master_match_commission ,agent_match_commission ,user_match_commission ,super_admin_session_commission ,admin_session_commission ,super_master_session_commission ,master_session_commission ,agent_session_commission,user_session_commission ,commission_type_partnership_percentage ,user_commission_lena_dena) SELECT  " + CONSTANTS.USER_TYPE_USER + ", " + lastInsId + "," + parentInfo.parent_id + ",sport_id ,super_admin ,admin ,super_master ,master ,agent, '" + data.ip_address + "',0," + currentdate + ",super_admin_match_commission ,admin_match_commission ,super_master_match_commission ,master_match_commission ,agent_match_commission ,user_match_commission ,super_admin_session_commission ,admin_session_commission ,super_master_session_commission ,master_session_commission ,agent_session_commission,user_session_commission ,commission_type_partnership_percentage ,user_commission_lena_dena from partnerships where user_id=" + parentInfo.parent_id + "";
			await pool.request().query(userPartnership);

			let userWelcomeAmountDeposit = "UPDATE users Set balance +=" + settings.DEFAULT_USER_REGISTER_AMOUNT + " WHERE id=" + lastInsId;
			await pool.request().query(userWelcomeAmountDeposit);

			let agentWelcomeChipsCredit = "UPDATE users Set balance -=" + settings.DEFAULT_USER_REGISTER_AMOUNT + " WHERE id=" + parentInfo.parent_id;
			await pool.request().query(agentWelcomeChipsCredit);

			let userWelcomeAmount = "INSERT INTO  account_statements (user_id,parent_id,description,statement_type,amount,available_balance,match_id,market_id,type,created_by,created_at,created_ip) VALUES(" + lastInsId + "," + parentInfo.parent_id + ",'Welcome chips deposit',1,'" + settings.DEFAULT_USER_REGISTER_AMOUNT + "','" + settings.DEFAULT_USER_REGISTER_AMOUNT + "',0,'0',1," + lastInsId + "," + currentdate + ",'" + data.ip_address + "')";
			await pool.request().query(userWelcomeAmount);

			let agentWelcomAmountStatement = "INSERT INTO  account_statements (user_id,parent_id,description,statement_type,amount,available_balance,match_id,market_id,type,created_by,created_at,created_ip) SELECT id, parent_id,'Welcome Chips given users',1, balance, balance,0,0,0, " + lastInsId + ", " + currentdate + ",'" + data.ip_address + "' FROM users WHERE id=" + parentInfo.parent_id;
			await pool.request().query(agentWelcomAmountStatement);



		} else {
			return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
		}

		return resultdb(CONSTANTS.SUCCESS, lastInsId);
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let forgotOTP = async function (data) {

	const pool = await poolPromise;

	await pool.request()
		.input('mobile', sql.BigInt, data.mobile)
		.query("delete from forgot_password_otps where mobile=@mobile");

	let currentdate = globalFunction.currentDateTimeStamp();

	let otpMessage = settings.REGISTER_USER_OTP_MESSAGE;
	otpMessage = otpMessage.replace("@message", "login");
	let messageOPT = Math.floor(1000 + Math.random() * 9000);
	otpMessage = otpMessage.replace("@messageOPT", messageOPT);
	let messageAPI = settings.REGISTER_USER_WITH_OTP + data.mobile + '&sms=' + encodeURI(otpMessage);
	console.log(messageAPI);
	let response2 = await axios.get(messageAPI);
	if (response2.status == 200) {
		let registerOTP = messageOPT;
		const resFromDBr = await pool.request()
			.input('user_id', sql.Int, data.user_id)
			.input('mobile', sql.BigInt, data.mobile)
			.input('created_ip', sql.VarChar(50), data.ip_address)
			.input('created_at', sql.VarChar(50), currentdate)
			.input('forgot_password_otp', sql.BigInt, registerOTP)
			.query("insert into forgot_password_otps (user_id,mobile,created_ip,created_at,forgot_password_otp) values(@user_id,@mobile,@created_ip,@created_at,@forgot_password_otp) SELECT SCOPE_IDENTITY() AS id");
		if (resFromDBr.recordset.length > 0) {
			return resultdb(CONSTANTS.SUCCESS, resFromDBr.recordset[0].id);
		} else {
			return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
		}
	}
}

let forgotOTPverify = async (data) => {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		let getOTPTime = currentdate - 60;
		const pool = await poolPromise;

		const getOTPRecord = await pool.request()
			.input('forgot_otp_id', sql.Int, data)
			.input('currentdate', sql.BigInt, currentdate)
			.input('getOTPTime', sql.BigInt, getOTPTime)
			.query("SELECT * FROM forgot_password_otps WHERE id=@forgot_otp_id AND created_at <=@currentdate AND created_at>= @getOTPTime ");

		if (getOTPRecord.recordsets === null || getOTPRecord.recordsets[0].length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, getOTPRecord.recordsets[0][0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};

let forgotOTPpasswordUpdate = async function (data, userData) {
	try {
		let hash = bcrypt.hashSync(data.password, 10);
		hash = hash.replace('$2b$', '$2y$');
		const pool = await poolPromise;
		let currentdate = globalFunction.currentDateTimeStamp();
		const resFromDBr = await pool.request()
			.input('password', sql.VarChar(150), hash)
			.input('created_ip', sql.VarChar(50), data.ip_address)
			.input('updated_at', sql.BigInt, currentdate)
			.input('updated_by', sql.Int, userData.user_id)
			.input('user_id', sql.Int, userData.user_id)
			.query("UPDATE users SET password=@password,created_ip=@created_ip,@updated_at=@updated_at,updated_by=@updated_by WHERE id= @user_id ");
		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}

}
let registerOTPresend = async (data) => {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		let getOTPTime = currentdate - 60;
		const pool = await poolPromise;

		const getOTPRecord = await pool.request()
			.input('forgot_otp_id', sql.Int, data)
			.query("SELECT * FROM register_with_otp WHERE id=@forgot_otp_id");

		if (getOTPRecord.recordsets === null || getOTPRecord.recordsets[0].length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, getOTPRecord.recordsets[0][0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};


let registerOTPresendUpdate = async function (data) {
	try {
		let otpMessage = settings.REGISTER_USER_OTP_MESSAGE;
		otpMessage = otpMessage.replace("@message", "login");
		let messageOPT = Math.floor(1000 + Math.random() * 9000);
		otpMessage = otpMessage.replace("@messageOPT", messageOPT);
		let messageAPI = settings.REGISTER_USER_WITH_OTP + data.mobile + '&sms=' + encodeURI(otpMessage);
		let response2 = await axios.get(messageAPI);
		if (response2.status == 200) {
			let registerOTP = messageOPT;

			const pool = await poolPromise;
			let currentdate = globalFunction.currentDateTimeStamp();
			const resFromDBr = await pool.request()
				.input('created_ip', sql.VarChar(50), data.ip_address)
				.input('created_at', sql.BigInt, currentdate)
				.input('register_otp', sql.Int, registerOTP)
				.input('otpId', sql.Int, data.otpId)
				.query("UPDATE register_with_otp SET created_ip=@created_ip,created_at=@created_at,register_otp=@register_otp WHERE id= @otpId ");
			return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);
		}
		else {
			return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}

}



let forgotOTPresend = async (data) => {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		let getOTPTime = currentdate - 60;
		const pool = await poolPromise;
		const getOTPRecord = await pool.request()
			.input('forgot_otp_id', sql.Int, data)
			.query("SELECT * FROM forgot_password_otps WHERE id=@forgot_otp_id");

		if (getOTPRecord.recordsets === null || getOTPRecord.recordsets[0].length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, getOTPRecord.recordsets[0][0]);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}
};


let forgotOTPresendUpdate = async function (data) {
	try {
		let otpMessage = settings.REGISTER_USER_OTP_MESSAGE;
		otpMessage = otpMessage.replace("@message", "login");
		let messageOPT = Math.floor(1000 + Math.random() * 9000);
		otpMessage = otpMessage.replace("@messageOPT", messageOPT);
		let messageAPI = settings.REGISTER_USER_WITH_OTP + data.mobile + '&sms=' + encodeURI(otpMessage);
		let response2 = await axios.get(messageAPI);
		if (response2.status == 200) {
			let registerOTP = messageOPT;
			const pool = await poolPromise;
			let currentdate = globalFunction.currentDateTimeStamp();
			const resFromDBr = await pool.request()
				.input('created_ip', sql.VarChar(50), data.ip_address)
				.input('created_at', sql.BigInt, currentdate)
				.input('forgot_password_otp', sql.Int, registerOTP)
				.input('otpId', sql.Int, data.otpId)
				.query("UPDATE forgot_password_otps SET created_ip=@created_ip,created_at=@created_at,forgot_password_otp=@forgot_password_otp WHERE id= @otpId ");
			return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);
		}
		else {
			return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
	}

}


let slotegrator_LogInsert = async function (data) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		let userLotusAcStatement = "INSERT INTO  user_slotegrator_market_logs (user_id, round_id, request_json, created_at, type) VALUES(" + data.user_id + "," + data.roundId + ",'" + data.jsonRequest + "'," + currentdate + ",'" + data.type + "')";
		await pool.request().query(userLotusAcStatement);
		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

	} catch (error) {
		console.error("xpg insert logs ", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getSameRound_slotegrator = async function (txnId) {

	try {

		const pool = await poolPromise;
		const result = await pool.request()
			.input('transaction_id', sql.VarChar(255), txnId)
			.query("SELECT * FROM user_slotegrator_market_exposures WHERE transaction_id=@transaction_id");

		if (result.recordsets === null || result.recordsets[0].length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}

	} catch (error) {
		console.error("getSameRound_slotegrator", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let user_slotegrator_GameUpdateAmout = async (amount, user_id, ip_address, game_extra) => {
	try {

		const pool = await poolPromise;
		let currentdate = globalFunction.currentDateTimeStamp();

		let updateRunningExposure = "update users SET liability +=  " + amount + ", balance += " + amount + " where id=" + user_id + "; SELECT parent_id,balance,liability from users where id=" + user_id + "";
		const getUserBalance = await pool.request().query(updateRunningExposure);
		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let updateLobby_slotegrator_UserBalance = async function (insertData) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		let getUserParentData = "SELECT super_admin,admin,super_master,master,agent,super_admin_id,admin_id,super_id as super_master_id,master_id,agent_id , super_admin_match_commission, admin_match_commission, super_master_match_commission, master_match_commission, agent_match_commission, user_match_commission FROM users usr with(nolock) JOIN partnerships part with(nolock) ON part.user_id=usr.id WHERE part.user_id=" + insertData.usergetId + " and usr.id=" + insertData.usergetId + " and part.sport_id=" + CONSTANTS.BETFAIR_SPORT_CASINO_SLOTEGRATOR;

		const getAllparentData = await pool.request().query(getUserParentData);

		let super_admin_id = 0;
		let admin_id = 0;
		let super_master_id = 0;
		let master_id = 0;
		let agent_id = 0;

		let super_admin_partnership = 0;
		let admin_partnership = 0;
		let super_master_partnership = 0;
		let master_partnership = 0;
		let agent_partnership = 0;

		let super_admin_commission = 0;
		let admin_commission = 0;
		let super_master_commission = 0;
		let master_commission = 0;
		let agent_commission = 0;
		let user_commission = 0;


		if (getAllparentData.recordsets[0].length > 0) {
			super_admin_id = getAllparentData.recordsets[0][0].super_admin_id;
			admin_id = getAllparentData.recordsets[0][0].admin_id;
			super_master_id = getAllparentData.recordsets[0][0].super_master_id;
			master_id = getAllparentData.recordsets[0][0].master_id;
			agent_id = getAllparentData.recordsets[0][0].agent_id;

			super_admin_partnership = getAllparentData.recordsets[0][0].super_admin;
			admin_partnership = getAllparentData.recordsets[0][0].admin;
			super_master_partnership = getAllparentData.recordsets[0][0].super_master;
			master_partnership = getAllparentData.recordsets[0][0].master;
			agent_partnership = getAllparentData.recordsets[0][0].agent;

			super_admin_commission = getAllparentData.recordsets[0][0].super_admin_match_commission;
			admin_commission = getAllparentData.recordsets[0][0].admin_match_commission;
			super_master_commission = getAllparentData.recordsets[0][0].super_master_match_commission;
			master_commission = getAllparentData.recordsets[0][0].master_match_commission;
			agent_commission = getAllparentData.recordsets[0][0].agent_match_commission;
			user_commission = getAllparentData.recordsets[0][0].user_match_commission;
		}

		let totalExposer = 0;
		totalExposer -= insertData.liability;

		let insertXPGMarketExpo = "INSERT INTO user_slotegrator_market_exposures (user_id,agent_id,master_id,super_master_id,admin_id,super_admin_id,super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission,master_commission,agent_commission,user_commission, sport_id, match_id,market_id,liability, created_at, sequence,transaction_id, is_type) VALUES (" + insertData.usergetId + "," + agent_id + "," + master_id + "," + super_master_id + "," + admin_id + "," + super_admin_id + "," + super_admin_partnership + "," + admin_partnership + "," + super_master_partnership + "," + master_partnership + "," + agent_partnership + "," + super_admin_commission + "," + admin_commission + "," + super_master_commission + "," + master_commission + "," + agent_commission + "," + user_commission + "," + CONSTANTS.BETFAIR_SPORT_CASINO_SLOTEGRATOR + "," + insertData.MatchId + ",'" + insertData.MarketId + "'," + totalExposer + "," + currentdate + "," + insertData.Sequence + ",'" + insertData.transaction_id + "','" + insertData.is_type + "') ; SELECT SCOPE_IDENTITY() AS id";
		let resFromDBr = await pool.request().query(insertXPGMarketExpo);

		let updateRunningExposure = "update users SET liability +=  " + totalExposer + " ,balance += " + totalExposer + " where id=" + insertData.usergetId + "; SELECT parent_id,balance,liability from users where id=" + insertData.usergetId + "";
		const getUserBalance = await pool.request().query(updateRunningExposure);
		if (resFromDBr.recordset.length > 0) {
			return resultdb(CONSTANTS.SUCCESS, resFromDBr.recordset[0]);
		} else {
			return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
		}
		//return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

	} catch (error) {
		console.error('------updateLobby_slotegrator_UserBalance----------- ', error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


/*
** Add Match XPG 
*
** 16-03-2021
*/

let slotegrator_InsertMatch = async function (data) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;
		let getInserMatch = "SELECT match_id FROM cassino_matches with(nolock) where match_id=" + data.MatchId + " AND sport_id=" + CONSTANTS.BETFAIR_SPORT_CASINO_SLOTEGRATOR;
		let result = await pool.request().query(getInserMatch);

		if (result.recordsets[0] === null || result.recordsets[0].length <= 0) {

			let matchId = data.MatchId;
			let marketId = data.MarketId;
			let seriesId = CONSTANTS.BETFAIR_SPORT_CASINO_SLOTEGRATOR + "" + CONSTANTS.BETFAIR_SPORT_CASINO;

			let insertMatchData = "INSERT INTO cassino_matches (sport_id, series_id, match_id, cassino_match_type, name, match_date, start_date, score_board_json, score_type, score_key, liability_type, is_manual, is_completed, is_popular, is_cup, winner_name ,is_bet_allow, status ,created_by ,updated_by,created_ip ,created_at ,updated_at ,team_one_image ,team_two_image ,match_number ,stadium_location ) VALUES(" + CONSTANTS.BETFAIR_SPORT_CASINO_SLOTEGRATOR + "," + seriesId + "," + matchId + ",0,'casino 6'," + currentdate + "," + currentdate + ",'[]','N','' ,'Y','N','N','N','N','','Y','Y',1,0,'" + data.ip_address + "'," + currentdate + ",0,'','',0,'')";
			await pool.request().query(insertMatchData);

			let insertMarketData = "INSERT INTO cassino_markets (sport_id, series_id, match_id, market_id, name, display_name, match_date, runner_json, market_runner_count, is_bet_allow, bet_allow_time_before, bet_delay, min_stack, max_stack, min_liability, max_market_liability, max_market_profit, min_loss, max_bet_liability, liability_type, status, is_visible, is_manual, is_result_declared, is_abandoned, card_data, result_id, winner_name,market_admin_message,created_by, updated_by, created_ip, created_at, updated_at, isbetalowaftermatchodds ) VALUES(" + CONSTANTS.BETFAIR_SPORT_CASINO_SLOTEGRATOR + "," + seriesId + "," + matchId + ",'" + marketId + "','Match Odds','Match Odds'," + currentdate + ",'[]',2,'Y', 0, 0, 0 , 0, 0, 0, 0, 0, 0, 'Y', 'Y','Y','N','N','N','','','','',1,0,'" + data.ip_address + "'," + currentdate + ",0,'N')";
			await pool.request().query(insertMarketData);
		}

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);



	} catch (error) {
		console.error("slotegrator_InsertMatch insert logs ", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};



let updateLobby_slotegrator_CreditUserBalance = async function (data) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;
		console.log('updateLobby_slotegrator_CreditUserBalance request ------- ', data);
		let getRoundLastLiability = "SELECT SUM(liability) as liability, agent_id, master_id, super_master_id, admin_id, super_admin_id, super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission, master_commission, agent_commission, user_commission FROM user_slotegrator_market_exposures with(nolock) WHERE user_id=" + data.user_id + " AND match_id=" + data.MatchId + " AND market_id='" + data.MarketId + "' GROUP BY agent_id, master_id, super_master_id, admin_id, super_admin_id, super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission, master_commission, agent_commission, user_commission";
		console.log('updateLobby_slotegrator_CreditUserBalance liability ------------ ', getRoundLastLiability);
		const resGetRoundLastLiability = await pool.request().query(getRoundLastLiability);
		if (resGetRoundLastLiability.recordsets[0].length <= 0) {
			return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);
		}

		let lastRoundLiability = 0;
		let agent_id = 0;
		let master_id = 0;
		let super_master_id = 0;
		let admin_id = 0;
		let super_admin_id = 0;

		let super_admin = 0;
		let admin = 0;
		let super_master = 0;
		let master = 0;
		let agent = 0;

		let super_admin_commission = 0;
		let admin_commission = 0;
		let super_master_commission = 0;
		let master_commission = 0;
		let agent_commission = 0;
		let user_commission = 0;



		if (resGetRoundLastLiability.recordsets[0].length > 0) {
			lastRoundLiability = (resGetRoundLastLiability.recordsets[0][0].liability && resGetRoundLastLiability.recordsets[0][0].liability !== null) ? resGetRoundLastLiability.recordsets[0][0].liability : 0;

			agent_id = resGetRoundLastLiability.recordsets[0][0].agent_id;
			master_id = resGetRoundLastLiability.recordsets[0][0].master_id;
			super_master_id = resGetRoundLastLiability.recordsets[0][0].super_master_id;
			admin_id = resGetRoundLastLiability.recordsets[0][0].admin_id;
			super_admin_id = resGetRoundLastLiability.recordsets[0][0].super_admin_id;

			super_admin = resGetRoundLastLiability.recordsets[0][0].super_admin;
			admin = resGetRoundLastLiability.recordsets[0][0].admin;
			super_master = resGetRoundLastLiability.recordsets[0][0].super_master;
			master = resGetRoundLastLiability.recordsets[0][0].master;
			agent = resGetRoundLastLiability.recordsets[0][0].agent;

			super_admin_commission = resGetRoundLastLiability.recordsets[0][0].super_admin_commission;
			admin_commission = resGetRoundLastLiability.recordsets[0][0].admin_commission;
			super_master_commission = resGetRoundLastLiability.recordsets[0][0].super_master_commission;
			master_commission = resGetRoundLastLiability.recordsets[0][0].master_commission;
			agent_commission = resGetRoundLastLiability.recordsets[0][0].agent_commission;
			user_commission = resGetRoundLastLiability.recordsets[0][0].user_commission;
		}

		let lastRoundProfitLoss = "";
		let lastRoundBalance = "";

		if (data.profit_loss == "" || data.profit_loss == null || data.profit_loss == 0 || data.profit_loss == "0.00") {

			lastRoundBalance = 0;
			lastRoundProfitLoss = lastRoundLiability;
		}
		else if (data.profit_loss != "" && data.profit_loss != null && data.profit_loss > 0) {

			lastRoundProfitLoss = parseFloat(data.profit_loss) + parseFloat(lastRoundLiability);
			lastRoundProfitLoss = parseFloat(lastRoundProfitLoss).toFixed(2);
			lastRoundBalance = parseFloat(data.profit_loss).toFixed(2);
		} else {

			lastRoundBalance = 0;
			lastRoundProfitLoss = parseFloat(data.profit_loss).toFixed(2);
		}

		let statementDescriptionPL = "Evolution Game " + data.game_extra + " Round Id # " + data.MarketId + " ";
		let statementDescription = "Evolution Game " + data.game_extra + " Round Id # " + data.MarketId + " Bet Amount -> " + lastRoundLiability + " , Profit -> " + data.profit_loss + "";

		let user_pl = lastRoundProfitLoss;
		let agent_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(agent) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(agent) / 100)).toFixed(2);

		let master_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(master) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(master) / 100)).toFixed(2);

		let super_master_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_master) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_master) / 100)).toFixed(2);

		let admin_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(admin) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(admin) / 100)).toFixed(2);

		let super_admin_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_admin) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_admin) / 100)).toFixed(2);

		let userCommission = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(user_commission) / 100)).toFixed(2) : 0;
		let agentCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(agent_commission) / 100)).toFixed(2) : 0;;
		let masterCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(master_commission) / 100)).toFixed(2) : 0;;
		let super_masterCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_master_commission) / 100)).toFixed(2) : 0;;
		let adminCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(admin_commission) / 100)).toFixed(2) : 0;;
		let super_adminCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_admin_commission) / 100)).toFixed(2) : 0;;

		let insertXPGMarketExpo = "INSERT INTO user_slotegrator_market_exposures (user_id,agent_id,master_id,super_master_id,admin_id,super_admin_id,super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission,master_commission,agent_commission,user_commission, sport_id, match_id,market_id,liability, created_at, sequence,transaction_id, is_type) VALUES (" + data.user_id + "," + agent_id + "," + master_id + "," + super_master_id + "," + admin_id + "," + super_admin_id + "," + super_admin + "," + admin + "," + super_master + "," + master + "," + agent + "," + super_admin_commission + "," + admin_commission + "," + super_master_commission + "," + master_commission + "," + agent_commission + "," + user_commission + "," + CONSTANTS.BETFAIR_SPORT_CASINO_SLOTEGRATOR + "," + data.MatchId + ",'" + data.MarketId + "'," + data.profit_loss + "," + currentdate + "," + data.Sequence + ",'" + data.transaction_id + "','" + data.is_type_update + "')";
		//console.log('insertXPGMarketExpo -------------- ',insertXPGMarketExpo);
		await pool.request().query(insertXPGMarketExpo);



		let distributAmountQuery = "INSERT INTO user_profit_loss (user_id, agent_id, master_id, super_master_id, admin_id,super_admin_id, sport_id, match_id, market_id, type, bet_result_id, stack, description, reffered_name, created_at, user_pl, agent_pl, master_pl, super_master_pl, admin_pl, super_admin_pl, user_commission, agent_commission, master_commission, super_master_commission, admin_commission,super_admin_commission) VALUES(" + data.user_id + "," + agent_id + "," + master_id + "," + super_master_id + "," + admin_id + "," + super_admin_id + ", " + CONSTANTS.BETFAIR_SPORT_CASINO_SLOTEGRATOR + ", " + data.MatchId + ", '" + data.MarketId + "', 1, 0, " + Math.abs(lastRoundLiability) + ", '" + statementDescriptionPL + "', '" + statementDescriptionPL + "', " + currentdate + ", " + user_pl + ", " + agent_pl + ", " + master_pl + ", " + super_master_pl + ", " + admin_pl + ", " + super_admin_pl + ", " + userCommission + ", " + agentCommission + ", " + masterCommission + ", " + super_masterCommission + "," + adminCommission + "," + super_adminCommission + " )";
		//console.log('distributAmountQuery -------------- ',distributAmountQuery);
		await pool.request().query(distributAmountQuery);
		let zeroValue = 0;
		await pool.request()
			.input('pMatchID', sql.BigInt(20), data.MatchId)
			.input('pMarketID', sql.VarChar(150), data.MarketId)
			.input('pIsFancy', sql.Int, zeroValue)
			.input('pIsRollback', sql.Int, zeroValue)
			.input('pIsSuperAdminCommission', sql.VarChar(150), zeroValue)
			.input('pSuperAdminCommissionType', sql.Int, zeroValue)
			.execute('SP_UPDATE_BALANCE_ON_EZUGI_XPG_LOTUS_RESULT');

		let updateRoundUserProfitLoss = "update users SET liability -=  " + lastRoundLiability + " , balance += " + lastRoundBalance + ", profit_loss +=" + lastRoundProfitLoss + " where id=" + data.user_id + "; SELECT parent_id,balance,liability from users where id=" + data.user_id + "";

		const getUserBalance = await pool.request().query(updateRoundUserProfitLoss);


		let totalAvailableBalance = parseFloat(getUserBalance.recordsets[0][0].balance) - parseFloat(getUserBalance.recordsets[0][0].liability);
		totalAvailableBalance = parseFloat(totalAvailableBalance).toFixed(2);
		let userParentId = getUserBalance.recordsets[0][0].parent_id;

		//console.log('xpg ----- totalAvailableBalance -------------------- ',totalAvailableBalance);

		let userLotusAcStatement = "INSERT INTO  account_statements (user_id, parent_id, description, statement_type, amount, available_balance, match_id, market_id, type, created_by, created_at,created_ip) VALUES(" + data.user_id + "," + userParentId + ",'" + statementDescription + "',2,'" + lastRoundProfitLoss + "','" + totalAvailableBalance + "'," + data.MatchId + ",'" + data.MarketId + "' ,'1'," + data.user_id + "," + currentdate + ",'" + data.ip_address + "')";
		console.log('userLotusAcStatement ------------------ ', userLotusAcStatement);
		await pool.request().query(userLotusAcStatement);

		let updateXpgCredit = "update user_slotegrator_market_exposures SET is_type = '" + data.is_type_update + "' where user_id=" + data.user_id + "  AND match_id=" + data.MatchId + " AND market_id='" + data.MarketId + "' AND is_type='" + data.is_type + "'";
		await pool.request().query(updateXpgCredit);

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

	} catch (error) {
		console.error(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let updateLobby_slotegrator_refund_UserBalance = async function (data) {
	try {
		let currentdate = globalFunction.currentDateTimeStamp();
		const pool = await poolPromise;

		console.log('updateLobby_slotegrator_refund_UserBalance request ------- ', data);
		let getRoundLastLiability = "SELECT SUM(liability) as liability, agent_id, master_id, super_master_id, admin_id, super_admin_id, super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission, master_commission, agent_commission, user_commission FROM user_slotegrator_market_exposures with(nolock) WHERE user_id=" + data.user_id + " AND match_id=" + data.MatchId + " AND market_id='" + data.MarketId + "' GROUP BY agent_id, master_id, super_master_id, admin_id, super_admin_id, super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission, master_commission, agent_commission, user_commission";
		console.log('updateLobby_slotegrator_refund_UserBalance liability ------------ ', getRoundLastLiability);
		const resGetRoundLastLiability = await pool.request().query(getRoundLastLiability);
		if (resGetRoundLastLiability.recordsets[0].length <= 0) {
			return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);
		}
		//const resGetRoundLastLiability = await pool.request().query(getRoundLastLiability);

		let lastRoundLiability = "";



		if (resGetRoundLastLiability.recordsets[0].length > 0 && resGetRoundLastLiability.recordsets[0][0].liability && resGetRoundLastLiability.recordsets[0][0].liability !== null) {
			lastRoundLiability = resGetRoundLastLiability.recordsets[0][0].liability;
		}
		else {

			lastRoundLiability = 0;
		}


		let updateRoundUserProfitLoss = "update users SET liability -=  " + lastRoundLiability + " ,balance -= " + lastRoundLiability + " where id=" + data.user_id + "; SELECT parent_id,balance,liability from users where id=" + data.user_id + " ; UPDATE cassino_markets SET status = 'N',winner_name='Abandoned',result_id=0 ,is_abandoned='Y', is_result_declared = 'Y' WHERE  match_id = " + data.roundId + " AND market_id = '" + data.roundId + "'; UPDATE cassino_matches SET winner_name='Abandoned', is_completed = 'Y' WHERE  match_id =" + data.roundId + "";

		console.log('xpg_PerformRefund  update users     ------------------------ ', updateRoundUserProfitLoss);

		const getUserBalance = await pool.request().query(updateRoundUserProfitLoss);

		let xpg_PerformRefund = "update user_xpg_market_exposures SET is_type = '" + data.is_type_update + "'  WHERE user_id=" + data.user_id + " AND sport_id=" + data.gameId + " AND match_id=" + data.roundId + " AND market_id='" + data.roundId + "' AND transaction_id='" + data.TransactionId + "'";

		console.log('xpg_PerformRefund Result     ------------------------ ', xpg_PerformRefund);

		await pool.request().query(xpg_PerformRefund);

		return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);



	} catch (error) {
		console.error("xpg_PerformRefund error on service", error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let uploadDepositeFile = async function (data) {
	return resultdb(CONSTANTS.SUCCESS, data);
};
let getDefaultSetting = async function () {
	try {
		const pool = await poolPromise;
		let result = await pool.request()
			.query("SELECT * from settings where [group]='Site'");
		if (result.recordsets.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.BLANK_ARRAY);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {
		console.error(error);

		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
}

let userLoginActionLlogs= async (user_id)=>{
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("user_id", sql.VarChar, user_id)
      .query(`SELECT * FROM user_login_logs where user_id=@user_id`);
      // console.log(result);
      if (result.recordsets.length <= 0) {
        return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
      } else {
        return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
      }
  } catch (error) {
    console.log("Error:", error);
    return { statusCode: CONSTANTS.SERVER_ERROR, error: error.message };
  }
}


let userCasinoStatement = async (user_id) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("user_id", sql.VarChar, user_id)
      .query(`SELECT gam.game_name, profit.sport_id, profit.match_id, profit.market_id as roundId, profit.stack, (profit.user_pl + profit.user_commission) as user_pl, profit.description, users.user_name, profit.created_at FROM user_profit_loss as profit JOIN casino_games as gam ON gam.game_id=profit.match_id JOIN users as users ON users.id=profit.user_id WHERE profit.sport_id=9999 AND profit.user_id=@user_id ORDER BY profit.created_at DESC`);
    
    if (result.recordsets.length <= 0 || result.recordsets[0].length === 0) {
      return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
    } else {
      return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
    }
  } catch (error) {
    console.log("Error:", error);
    return { statusCode: CONSTANTS.SERVER_ERROR, error: error.message };
  }
};

let userConnectionId = async (data) => {
  try {
    let userData = await getUserByUserName(data.user_name);
    // console.log('userData--------------- ', userData);
    if (userData.statusCode === CONSTANTS.SUCCESS) {
      if (
        userData.data[0] &&
        userData.data[0].self_lock_user === "N" &&
        userData.data[0].parent_lock_user === "N" &&
        userData.data[0].self_close_account === "N" &&
        userData.data[0].parent_close_account === "N"
      ) {
        let hash = userData.data[0].password;
        // console.log(hash);
        hash = hash.replace("$2y$", "$2a$");
        //console.log('outer---',hash);
        let bcryptAttempt = bcrypt.compareSync(data.password, hash);
        //console.log(bcryptAttempt);
        if (userData.data[0].register_user_status === "A") {
          if (bcryptAttempt) {
            // let token = jwt.sign({
            // 	sub: {
            // 		id: userData.data[0].id,
            // 		user_type_id: userData.data[0].role_id
            // 	}
            // }, settings.secret);

            // let data = {
            // 	user_name: userData.data[0].user_name,
            // 	token: token,
            // 	user_type_id: userData.data[0].role_id,
            // 	is_rules_displayed: userData.data[0].is_rules_displayed,
            // 	ruleType: userData.data[0].ruleType,
            // 	passChange: userData.data[0].is_change_password
            // };
            // let dataUpdate = {
            // 	id: userData.data[0].id,
            // 	token: token,
            // };
            // await setUserDeviceId(dataUpdate);
            return resultdb(CONSTANTS.SUCCESS, data);
          } else {
            return resultdb(CONSTANTS.ACCESS_DENIED);
          }
        } else {
          return resultdb(CONSTANTS.NOT_VERIFIED);
        }
      } else {
        return resultdb(CONSTANTS.NOT_FOUND);
      }
    } else {
      return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
  } catch (error) {
    console.log(error);
    return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
  }
};

let updateConnectionId = async (userName, connectionId) => {
	try {
	  const pool = await poolPromise;
	  const result = await pool
		.request()
		.input("user_name", sql.VarChar, userName)
		.input("connection_id", sql.VarChar, connectionId)
		.query(
		  `UPDATE users SET connection_id = @connection_id WHERE user_name = @user_name`
		);
	  if (result.rowsAffected[0] > 0) {
		return { statusCode: CONSTANTS.SUCCESS };
	  } else {
		return { statusCode: CONSTANTS.NOT_FOUND };
	  }
	} catch (error) {
	  console.log("Error:", error);
	  return { statusCode: CONSTANTS.SERVER_ERROR, error: error.message };
	}
  };
  
  let findByConnectionId = async (connection_id) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input("connection_id", sql.VarChar, connection_id)
        .query(`SELECT * FROM users WHERE connection_id = @connection_id`);
  
        if (result.recordsets.length <= 0) {
          return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        } else {
          return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
        }
    } catch (error) {
      console.log("Error:", error);
      return { statusCode: CONSTANTS.SERVER_ERROR, error: error.message };
    }
  };
  
  

  let saveTelegramUserRecord = async (telegram_connected, chatId, connection_id) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('telegram_connected', sql.Bit, telegram_connected) // Use sql.Bit for boolean values
        .input('chatId', sql.VarChar, chatId)
        .input('connection_id', sql.VarChar, connection_id)
        .query(
          'UPDATE users SET telegram_connected = @telegram_connected, chatId = @chatId WHERE connection_id = @connection_id'
        );
  
      return { statusCode: CONSTANTS.SUCCESS };
    } catch (error) {
      console.error("Error:", error);
      return { statusCode: CONSTANTS.SERVER_ERROR, error: error.message };
    }
  };

  let saveTelegramLoginCode = async (login_code, telegram_verefied,loginCode_Expiration,user_name) => {
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('login_code', sql.VarChar, login_code) // Use sql.Bit for boolean values
        .input('telegram_verefied', sql.VarChar, telegram_verefied)
        .input('loginCode_Expiration', sql.VarChar, loginCode_Expiration)
        .input('user_name', sql.VarChar, user_name)
        .query(
          'UPDATE users SET login_code = @login_code, telegram_verefied = @telegram_verefied,loginCode_Expiration=@loginCode_Expiration WHERE user_name = @user_name'
        );
  
      return { statusCode: CONSTANTS.SUCCESS };
    } catch (error) {
      console.error("Error:", error);
      return { statusCode: CONSTANTS.SERVER_ERROR, error: error.message };
    }
  };

  let loginTelegramCodeVarefication= async (user_name)=>{
    try {
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input("user_name", sql.VarChar, user_name)
        .query(`UPDATE users SET login_code=null WHERE user_name = @user_name`);
  
        if (result.recordsets.length <= 0) {
          return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        } else {
          return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
        }
    } catch (error) {
      console.log("Error:", error);
      return { statusCode: CONSTANTS.SERVER_ERROR, error: error.message };
    }
  }


let saveTelegramDisableCode = async (user_name,disables_telegram_code,disableCode_Expiration) => {
  try {
    // Make sure the pool is correctly initialized and connected
    const pool = await poolPromise;

    // Execute the update query
    const result = await pool
      .request()
     .input('disables_telegram_code', sql.VarChar, disables_telegram_code) 
      .input('disableCode_Expiration', sql.VarChar, disableCode_Expiration)
      .input('user_name', sql.VarChar, user_name)
      .query(
        'UPDATE users SET disables_telegram_code=@disables_telegram_code, disableCode_Expiration=@disableCode_Expiration WHERE user_name = @user_name'
      );

    return { statusCode: CONSTANTS.SUCCESS };
  } catch (error) {
    console.error("Error:", error);
    return { statusCode: CONSTANTS.SERVER_ERROR, error: error.message };
  }
};


let disableTelegramCodeVarefication= async (user_name)=>{
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("user_name", sql.VarChar, user_name)
      .query(`UPDATE users SET disables_telegram_code=null,telegram_connected=0 WHERE user_name = @user_name`);

      if (result.recordsets.length <= 0) {
        return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
      } else {
        return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
      }
  } catch (error) {
    console.log("Error:", error);
    return { statusCode: CONSTANTS.SERVER_ERROR, error: error.message };
  }
}

let userExposureDetails = async (user_id) => {
  try {
    const pool = await poolPromise;

    // Run the queries in parallel using Promise.all
    const [casinoMarketExposureResult, betsFancyResult, betsOddsResult] = await Promise.all([
      pool.request()
        .input("user_id", sql.VarChar, user_id)
        .query(`SELECT exposures.*, sports.name AS event_type, matches.name AS event_name
                FROM user_casino_market_exposures as exposures 
                JOIN sports ON sports.sport_id = exposures.sport_id 
                JOIN matches ON matches.match_id = exposures.match_id
                WHERE exposures.user_id=@user_id AND exposures.is_type='DEBIT'`),
      
      pool.request()
        .input("user_id", sql.VarChar, user_id)
        .query(`SELECT fancy.*, sports.name AS event_type, matches.name AS event_name
                FROM bets_fancy as fancy 
                JOIN sports ON sports.sport_id = fancy.sport_id 
                JOIN matches ON matches.match_id = fancy.match_id
                WHERE fancy.user_id=@user_id AND (fancy.bet_result_id IS NULL OR fancy.bet_result_id=0)`),
      
      pool.request()
        .input("user_id", sql.VarChar, user_id)
        .query(`SELECT odds.*, sports.name AS event_type, matches.name AS event_name
                FROM bets_odds as odds 
                JOIN sports ON sports.sport_id = odds.sport_id 
                JOIN matches ON matches.match_id = odds.match_id
                WHERE odds.user_id=@user_id AND (odds.bet_result_id IS NULL OR odds.bet_result_id=0)`)
    ]);

    // Combine all results into one array
    const combinedResult = [
      ...casinoMarketExposureResult.recordsets[0],
      ...betsFancyResult.recordsets[0],
      ...betsOddsResult.recordsets[0]
    ];

    // Create a map to group by fancy_id or market_id and count occurrences
    const groupedResult = {};

    combinedResult.forEach(entry => {
      const key = entry.fancy_id || entry.market_id; // Group by fancy_id or market_id
      if (key) {
        if (!groupedResult[key]) {
          groupedResult[key] = {
            market: entry.fancy_name || entry.market_name || null, // Choose fancy_name or market_name
            event_name: entry.event_name,
            event_type: entry.event_type,
            trade: 0 ,// Initialize trade count
            fancyId:entry.fancy_id,
            marketId:entry.market_id,
            sport_id:entry.sport_id,
            match_id:entry.match_id
          };
        }
        groupedResult[key].trade++; // Increment the trade count for each occurrence
      }
    });

    // Convert the grouped result back into an array
    const finalResult = Object.values(groupedResult);

    if (finalResult.length === 0) {
      return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
    }

    return resultdb(CONSTANTS.SUCCESS, finalResult);

  } catch (error) {
    console.log("Error:", error);
    return { statusCode: CONSTANTS.SERVER_ERROR, error: error.message };
  }
};

let userUnsettledBets = async (user_id) => {
	try {
	  const pool = await poolPromise;
	  
	  const [fancyResult, oddsResult] = await Promise.all([
		pool.request()
		  .input("user_id", sql.VarChar, user_id)
		  .query(`SELECT fancy.*, sports.name AS event_type, matches.name AS event_name ,matches.created_at AS match_date
				  FROM bets_fancy as fancy 
				  JOIN sports ON sports.sport_id = fancy.sport_id 
				  JOIN matches ON matches.match_id = fancy.match_id
				  WHERE fancy.user_id=@user_id AND (fancy.bet_result_id IS NULL OR fancy.bet_result_id=0)`),
		
		pool.request()
		  .input("user_id", sql.VarChar, user_id)
		  .query(`SELECT odds.*, sports.name AS event_type, matches.name AS event_name ,matches.created_at AS match_date
				  FROM bets_odds as odds 
				  JOIN sports ON sports.sport_id = odds.sport_id 
				  JOIN matches ON matches.match_id = odds.match_id
				  WHERE odds.user_id=@user_id AND (odds.bet_result_id IS NULL OR odds.bet_result_id=0)`)
	  ]);
				
	  // Combine results from both tables
	  const combinedResults = [
		...fancyResult.recordset,
		...oddsResult.recordset
	  ];
	  const groupedResult = {};

	  combinedResults.forEach(entry => {
		const key = entry.fancy_id || entry.market_id; // Group by fancy_id or market_id
		if (key) {
		  if (!groupedResult[key]) {
			groupedResult[key] = {
			  event_name: entry.event_name,
			  event_type: entry.event_type,
			  nation: entry.fancy_name || entry.selection_name || null, // Show fancy_name or selection_name in nation
			  market_name: entry.fancy_id ? "FANCY" : entry.market_name || null,
			  side: entry.is_back == 0 ? "LAY" : entry.is_back == 1 ? "BACK" : null,
			  rate:entry.odds || entry.size || null,
			  amount:entry.stack,
			  place_date:entry.created_at,
			  match_date:entry.match_date
			};
		  }
		}
	  });
  
	  // Convert the grouped result back into an array
	  const finalResult = Object.values(groupedResult);
  
	  if (finalResult.length === 0) {
		return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
	  }
  
	  return resultdb(CONSTANTS.SUCCESS, finalResult);
	} catch (error) {
	  console.log("Error:", error);
	  return { statusCode: CONSTANTS.SERVER_ERROR, error: error.message };
	}
  };

const acountStatementIndiaBetbyFilter = async (user_id,data) => {
	try {
		const pool = await poolPromise;
		let queryResult;
		if (data.type === "AC") {
			queryResult = await pool.request()
				.input('from_date', data.from_date)
				.input('to_date', data.to_date)
				.input("user_id", user_id)
				.query(`
                    SELECT stm.id, stm.user_id,stm.match_id, stm.statement_type, stm.match_id AS match, stm.market_id AS market, stm.amount, 
                           ROUND(stm.available_balance, 2) AS available_balance, stm.type, stm.created_at,
                           CASE WHEN stm.amount > 0 THEN stm.amount ELSE 0 END AS credit,
                           CASE WHEN stm.amount < 0 THEN stm.amount ELSE 0 END AS debit,
                           CONCAT(CASE WHEN stm.amount > 0 THEN 'Profit to Fthj by ' WHEN stm.amount < 0 THEN 'Loss from Fthj by ' ELSE '' END, 
                           stm.description) AS description
                    FROM account_statements AS stm
                    WHERE stm.user_id = @user_id
					AND created_at BETWEEN @from_date AND @to_date;
                `);
		} else if (data.type === "ML") {
			queryResult = await pool.request()
    .input('from_date', data.from_date)
    .input('to_date', data.to_date)
    .input("user_id", user_id)
    .query(`
	SELECT 
	m.match_id AS matchId,
    0 AS commission, 
    bo.chips AS match_PL, 
    bo.chips AS finalP_l, 
    CASE WHEN bo.chips > 0 THEN bo.chips ELSE 0 END AS credit,
    CASE WHEN bo.chips < 0 THEN bo.chips ELSE 0 END AS debit,
    m.name AS description, 
    bo.created_at AS Date
FROM bets_odds bo 
JOIN matches m ON bo.match_id = m.match_id 
WHERE bo.user_id = @user_id
AND bo.created_at BETWEEN @from_date AND @to_date

UNION ALL

SELECT 
m.match_id AS matchId,
    0 AS commission, 
    0 AS match_PL, 
    bf.chips AS finalP_l, 
    CASE WHEN bf.chips > 0 THEN bf.chips ELSE 0 END AS credit,
    CASE WHEN bf.chips < 0 THEN bf.chips ELSE 0 END AS debit,
    CONCAT(m.name, ' - ', bf.fancy_name) AS description, 
    bf.created_at AS Date
FROM bets_fancy bf 
JOIN matches m ON bf.match_id = m.match_id 
WHERE bf.user_id = @user_id 
AND bf.fancy_name IS NOT NULL
AND bf.created_at BETWEEN @from_date AND @to_date

ORDER BY Date DESC;

    `);
		} else if (data.type === "MP") {
			queryResult = await pool.request()
    .input('from_date', data.from_date)
    .input('to_date', data.to_date)
    .input("user_id", user_id)
    .query(`
    WITH ProfitLossCTE AS (
        SELECT 
            CONCAT(s.name, ' / ', m.name) AS description, 
            0 AS commissions, 
            s.name AS sport_name, 
            m.created_at AS date, 
            COALESCE(bo.match_id, bf.match_id) AS match_id, 
            (SUM(COALESCE(bo.chips, 0)) + SUM(COALESCE(bf.chips, 0))) AS match_PL, 
            SUM(COALESCE(bf.chips, 0)) AS fancyP_L, 
            (SUM(COALESCE(bo.chips, 0)) + SUM(COALESCE(bf.chips, 0))) AS total_P_L,

            CASE WHEN (SUM(COALESCE(bo.chips, 0)) + SUM(COALESCE(bf.chips, 0))) > 0 
                 THEN (SUM(COALESCE(bo.chips, 0)) + SUM(COALESCE(bf.chips, 0))) 
                 ELSE 0 END AS credit,

            CASE WHEN (SUM(COALESCE(bo.chips, 0)) + SUM(COALESCE(bf.chips, 0))) < 0 
                 THEN (SUM(COALESCE(bo.chips, 0)) + SUM(COALESCE(bf.chips, 0))) 
                 ELSE 0 END AS debit
        FROM bets_odds bo 
        FULL OUTER JOIN bets_fancy bf ON bo.user_id = bf.user_id AND bo.match_id = bf.match_id 
        JOIN matches m ON m.match_id = COALESCE(bo.match_id, bf.match_id) 
        JOIN sports s ON m.sport_id = s.sport_id 
        WHERE (bo.user_id = @user_id OR bf.user_id = @user_id)
        AND m.created_at BETWEEN @from_date AND @to_date  -- Filter applied here for created_at in matches
        GROUP BY s.name, m.name, m.created_at, COALESCE(bo.match_id, bf.match_id) 
    )
    
    SELECT 
        description, 
        commissions, 
        sport_name, 
        date, 
        match_id, 
        match_PL, 
        fancyP_L, 
        -- Adding previous finalP_L (from the last row) with the current match_PL
        total_P_L + COALESCE(LAG(total_P_L, 1) OVER (ORDER BY date ASC), 0) AS finalP_L,  
        credit, 
        debit
    FROM ProfitLossCTE
    ORDER BY date DESC;
    `);

		} else if (data.type === "DW") {
			const depWedresult = await pool.request()
				.input('from_date', data.from_date)
				.input('to_date', data.to_date)
				.input("user_id", user_id)
				.query(`
                    SELECT * FROM user_deposit_withdrawal_requests 
                    WHERE user_id = @user_id
                `);

			let totalBalance = 0;
			queryResult = depWedresult.recordset.map((record) => {
				let credit = 0;
				let debit = 0;

				if (record.deposit_withdraw_type === "D") {
					credit = record.amount;
					totalBalance += record.amount;
				} else {
					debit = record.amount;
					totalBalance -= record.amount;
				}

				return {
					date: record.created_at,
					credit: credit || 0,
					debit: debit || 0,
					amount: record.amount,
					description: record.deposit_withdraw_type === "D" ? "Deposit" : "Withdrawal"
				};
			});

			return { data: queryResult, totalBalance };
		}

		return queryResult.recordsets[0] || queryResult;
	} catch (error) {
		console.error("Error fetching account statement:", error);
		throw error;
	}
};

let showBetsIndiaBets = async (match_id,user_id) => {
	try {
		const pool = await poolPromise;
		const result = await pool
			.request()
			.input("match_id",match_id)
			.input("user_id", user_id)
			.query(`SELECT bo.market_id AS marketId, NULL AS fancyId, bo.match_id AS matchId, m.name AS matchName, bo.market_name AS marketName, SUM(bo.chips) AS PnL, SUM(bo.chips) AS totalAmt, MAX(bo.created_at) AS created_at FROM bets_odds bo JOIN matches m ON bo.match_id = m.match_id WHERE bo.user_id = @user_id AND bo.match_id = @match_id GROUP BY bo.market_id, bo.match_id, m.name, bo.market_name UNION ALL SELECT NULL AS marketId, bf.fancy_id AS fancyId, bf.match_id AS matchId, m.name AS matchName, bf.fancy_name AS marketName, SUM(bf.chips) AS PnL, SUM(bf.chips) AS totalAmt, MAX(bf.created_at) AS created_at FROM bets_fancy bf JOIN matches m ON bf.match_id = m.match_id WHERE bf.user_id = @user_id AND bf.match_id = @match_id GROUP BY bf.fancy_id, bf.match_id, m.name, bf.fancy_name			`);

		if (result.recordsets.length <= 0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		} else {
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
		}
	} catch (error) {
		console.log("Error:", error);
		return { statusCode: CONSTANTS.SERVER_ERROR, error: error.message };
	}
}

let indiaBetsHistory = async (user_id, match_id, market_id) => {
    try {
        const pool = await poolPromise;
        const result = await pool
            .request()
            .input("user_id", user_id)
            .input("match_id", match_id)  
            .input("market_id", market_id)  
            .query(`SELECT bo.is_back AS type, bo.selection_name AS selectionName, bo.odds AS odds, bo.stack AS Stake, bo.liability AS Liability, bo.created_ip AS BetCode, bo.created_at AS Date, bo.p_l AS profit, bo.chips AS P_L, CONCAT(m.name, ' > ', bo.market_name) AS description, u.user_name AS user_name, CASE WHEN bo.chips > 0 THEN 'WON' WHEN bo.chips < 0 THEN 'LOST' ELSE 'O' END AS status FROM bets_odds bo JOIN matches m ON bo.match_id = m.match_id JOIN users u ON bo.user_id = u.id WHERE bo.user_id = @user_id AND bo.match_id = @match_id AND bo.market_id = @market_id UNION ALL SELECT bf.is_back AS type, bf.fancy_name AS selectionName, bf.size AS odds, bf.stack AS Stake, bf.liability AS Liability, bf.created_ip AS BetCode, bf.created_at AS Date, bf.profit AS profit, bf.chips AS P_L, CONCAT(m.name, ' > ', bf.fancy_name) AS description, u.user_name AS user_name, CASE WHEN bf.chips > 0 THEN 'WON' WHEN bf.chips < 0 THEN 'LOST' ELSE 'O' END AS status FROM bets_fancy bf JOIN matches m ON bf.match_id = m.match_id JOIN users u ON bf.user_id = u.id WHERE bf.user_id = @user_id AND bf.match_id = @match_id AND bf.fancy_id = @market_id`);

        if (result.recordsets.length <= 0) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        } else {
            return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
        }
    } catch (error) {
        console.log("Error:", error);
        return { statusCode: CONSTANTS.SERVER_ERROR, error: error.message };
    }
};

module.exports = {
	userLogin,
	setUserDeviceId,
	getUserAuthorization,
	getLobbyLotusUserAuthorization,
	findUserByIdAndVerifyPassword,
	updatePassword,
	getUserByUserId,
	getFavouriteList,
	updateTimeZone,
	getUserNameAndPasswordById,
	oneClickBetSportWise,
	updateOneClickAndMatchStack,
	getUserByUserName,
	UserAccountStatement,
	getUserMyBetsList,
	getUserProfitLossMatchAndMarket,
	getSiteMessage,
	getUserSportWiseSettings,
	getUserByUserIdInBetServices,
	getUserProfitLossLMatchID,
	getUserById,
	DepositWithdrawalRequest,
	DepositWithdrawalCancel,
	userChatRequestCancel,
	ChatRequest,
	ChatRequestList,
	userConversion,
	globalSettings,
	userConversionChat,
	userDepositWithdrawalRequestList,
	register,
	registerdealer,
	getRequestCount,
	getUserNameAndPasswordByIdXpg,
	insertXpgUser,
	getXpgtableDataByUsername,
	xpgUpdateUserActiveTime,
	getXpgActiveUserData,
	xpgUpdateUserAmout,
	userTableUpdateAmout,
	updateUserAcStatement,
	updateUserEzugiAcStatement,
	getUserBalanceOnly,
	userFaurdCallApi,
	updateEzugiPlayerIdOnUser,
	GetEzugiUsers,
	updateXpgStatementDate,
	updateEzugiStatementDate,
	userEzugiProfitAmout,
	userXpgProfitAmout,
	updateRules,
	getRules,
	insertLotusUser,
	updateLobbyLotusUserBalance,
	updateLobbyLotusAfterResult,
	updateLobbyEzugiUserBalance,
	ezugiAccountStatement,
	ezugiRollbackAccountStatement,
	ezugiUpdateTransactionId,
	ezugiLogInsert,
	getLobbyXPGUserAuthorization,
	XPGLogInsert,
	updateLobbyXPGUserBalance,
	XPGAccountStatement,
	xpg_CancelTransaction,
	xpg_CancelRound,
	updateLobbyEzugiUserTIPBalance,
	updateLobbyXPGUserTIPBalance,
	getSameRoundConditionXPG,
	getSameRoundCREDIT_XPG,
	getSameRoundDEBIT_XPG,
	getSameRoundPROCESS_DEBIT_XPG,
	getSameRoundCANCEL_XPG,
	getEzugiDebitConditions,
	getEzugiCreditConditions,
	getEzugiRollbackConditions,
	getSameRoundConditionXPGPROCESS,
	updateLobbyXPGP_ROCESS_UserBalance,
	insertEzugiAuthString,
	getEzugi_Token,
	getEzugiDebitAfterRollback,
	XPG_PROCESS_AccountStatement,
	getSameRoundPerformRefund_XPG,
	xpg_PerformRefund,
	XPGInsertMatch,
	FUNLogInsert,
	updateLobbyFUNUserBalance,
	updateLobbyFUNCreditUserBalance,
	FUNInsertMatch,
	getSameRoundFUN,
	userFUNGameUpdateAmout,
	funSportsActiveForUser,
	EZUGIInsertMatch,
	LotusInsertMatch,
	paymentInitiated,
	paymentLog,
	getAccountDetails,
	registerWithOTP,
	getuserbyusernameandmobile,
	getVerifyOTP,
	verifyOTPRegister,
	forgotOTP,
	forgotOTPverify,
	forgotOTPpasswordUpdate,
	registerOTPresend,
	registerOTPresendUpdate,
	forgotOTPresend,
	forgotOTPresendUpdate,
	slotegrator_LogInsert,
	getSameRound_slotegrator,
	user_slotegrator_GameUpdateAmout,
	updateLobby_slotegrator_UserBalance,
	slotegrator_InsertMatch,
	updateLobby_slotegrator_CreditUserBalance,
	updateLobby_slotegrator_refund_UserBalance,
	uploadDepositeFile,
	getDefaultSetting,
	userCasinoStatement,
	userLoginActionLlogs,
	saveTelegramUserRecord,
  	findByConnectionId,
  	updateConnectionId,
  	userConnectionId,
  	loginTelegramCodeVarefication,
  	saveTelegramLoginCode,
 	saveTelegramDisableCode,
	disableTelegramCodeVarefication,
	userExposureDetails,
	userUnsettledBets,
	acountStatementIndiaBetbyFilter,
	showBetsIndiaBets,
	indiaBetsHistory
};
