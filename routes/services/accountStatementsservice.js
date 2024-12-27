/* eslint-disable indent */
const MysqlPool = require('../../db');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');
const connConfig = require('../../db/indexTest');

let resultdb = globalFunction.resultdb;

let createAccStatementAndUpdateBalance = async (data) => {
	const conn = await connConfig.getConnection();
	try {
		let desc = '';
		if (data.crdr===CONSTANTS.DEBIT_TWO) {
			desc = 'Admin Self Debit';
		}else{
			desc = 'Admin Self Credit';
		}

		if(data.description != ''){
			desc = desc + ' || ' + data.description;
		}

		let accountdetails = {
			user_id: data.user_id,
			parent_id: data.parent_id,
			description: desc,
			statement_type: data.statement_type,
			created_at:globalFunction.currentDate()
		};
		let queryString='';
		if (data.crdr===CONSTANTS.DEBIT_TWO) {
			queryString='update users set balance=balance - ? where id=?';
			accountdetails.amount=-data.amount;
			accountdetails.available_balance = (parseInt(data.userCurrentBalance) - parseInt(data.amount));
		}else{
			queryString='update users set balance=balance + ? where id=?';
			accountdetails.amount = data.amount;
			accountdetails.available_balance = (parseInt(data.userCurrentBalance) + parseInt(data.amount));
		}
		await conn.beginTransaction();
		await conn.query(queryString, [data.amount, data.user_id]);
		await conn.query('insert into account_statements set ?', [accountdetails]);
		await conn.commit();
		return resultdb(CONSTANTS.SUCCESS);
	} catch (error) {
		//console.log(error);
		await conn.rollback();
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let createAccStatementAndUpdateBalanceParentAndUser = async (data, userDetail) => {
	const conn = await connConfig.getConnection();
	try {

		let desc = '';
		let descParent = '';

		if (data.crdr === CONSTANTS.CREDIT_ONE) {

			desc = 'Chips credited from parent';
			descParent = 'Chips credited to ' + userDetail.data.name + '(' + userDetail.data.user_name + ')';

			if(data.description != ''){
				desc = desc + ' || ' + data.description;
				descParent = descParent + ' || ' + data.description;
			}

			let parent = {
				user_id: data.parent_id,
				parent_id: data.parentOfParentId,
				description: descParent,
				statement_type: data.statement_type,
				amount: -data.amount,
				available_balance: (parseInt(data.parentCurrentBalance) - parseInt(data.amount)),
				created_at:globalFunction.currentDate()
			};
			let child = {
				user_id: data.user_id,
				parent_id: data.parent_id,
				description: desc,
				statement_type: data.statement_type,
				amount: data.amount,
				available_balance: (parseInt(data.userCurrentBalance) + parseInt(data.amount)),
				created_at:globalFunction.currentDate()
			};

			await conn.beginTransaction();
			await conn.query('update users set balance=balance + ?,freechips=freechips + ? where id=?', [data.amount,data.amount, data.user_id]);
			await conn.query('update users set balance=balance - ?,freechips=freechips - ? where id=?', [data.amount,data.amount, data.parent_id]);
			await conn.query('insert into account_statements set ?', [parent]);
			await conn.query('insert into account_statements set ?', [child]);
			await conn.commit();
			return resultdb(CONSTANTS.SUCCESS);
		} else if (data.crdr === CONSTANTS.DEBIT_TWO) {

			desc = 'Chips debited from parent';
			descParent = 'Chips debited from ' + userDetail.data.name + '(' + userDetail.data.user_name + ')';

			if(data.description != ''){
				desc = desc + ' || ' + data.description;
				descParent = descParent + ' || ' + data.description;
			}

			let parent = {
				user_id: data.parent_id,
				parent_id: data.parentOfParentId,
				description: descParent,
				statement_type: data.statement_type,
				amount: data.amount,
				available_balance: (parseInt(data.parentCurrentBalance) + parseInt(data.amount)),
				created_at:globalFunction.currentDate()
			};
			let child = {
				user_id: data.user_id,
				parent_id: data.parent_id,
				description: desc,
				statement_type: data.statement_type,
				amount: -data.amount,
				available_balance: (parseInt(data.userCurrentBalance) - parseInt(data.amount)),
				created_at:globalFunction.currentDate()
			};
			await conn.beginTransaction();
            await conn.query('update users set balance=balance - ?,freechips=freechips - ? where id=?', [data.amount,data.amount, data.user_id]);
            await conn.query('update users set balance=balance + ?,freechips=freechips + ? where id=?', [data.amount,data.amount, data.parent_id]);

			await conn.query('insert into account_statements set ?', [parent]);
			await conn.query('insert into account_statements set ?', [child]);

			await conn.commit();
			return resultdb(CONSTANTS.SUCCESS);
		} else {
			return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
		}
	} catch (error) {
		console.log(error);
		await conn.rollback();
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};



let getAccountStatement = async (data) => {
	try {
		let getqury = 'SELECT SQL_CALC_FOUND_ROWS created_at date,users.name user_name,account_statements.description,account_statements.amount credit_debit,account_statements.available_balance balance FROM account_statements LEFT JOIN users ON account_statements.user_id = users.id where account_statements.user_id = ? AND DATE(FROM_UNIXTIME(account_statements.created_at)) >= date(?) AND DATE(FROM_UNIXTIME(account_statements.created_at)) <= date(?) order by account_statements.created_at DESC  LIMIT ? OFFSET ? ' + '';

		let insertAccSTMT = await MysqlPool.query(getqury, [data.user_id, data.from_date, data.to_date,data.limit,((data.pageno-1)*data.limit)]);



		let totalQry = await MysqlPool.query('SELECT FOUND_ROWS() AS total');	
		let totalCount = totalQry[0].total;
		let resData={list:insertAccSTMT,total:totalCount};
		//console.log('resDataresData  ',resData);
		
		return resultdb(CONSTANTS.SUCCESS, resData);
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


let getProfitLoss = async (data) => {
	try {

		var getquery = '';

		switch (data.user_type) {
			case 5:
				getquery = 'select m.name,SUM (upl.user_pl) pl,SUM(upl.user_commission) comm,upl.created_at,m.match_id from user_profit_loss upl LEFT JOIN matches m ON upl.matc h_id = m.match_id where upl.user_id = ? AND upl.created_at >= ? AND upl.created_at <= ? GROUP BY m.match_id ORDER BY upl.created_at LIMIT  ?,?';
				break;
				// eslint-disable-next-line indent
			case 4:
				getquery = 'select m.name,SUM(upl.agent_pl) pl,SUM(upl.agent_commission) comm,upl.created_at,m.match_id from user_profit_loss upl LEFT JOIN matches m ON upl.match_id = m.match_id where upl.agent_id = ? AND upl.created_at >= ? AND upl.created_at <= ? GROUP BY m.match_id ORDER BY upl.created_at LIMIT  ?,?';

				break;
			case 3:
				getquery = 'select m.name,SUM(upl.super_agent_pl) pl,SUM(upl.super_agent_commission) comm,upl.created_at,m.match_id from user_profit_loss upl LEFT JOIN matches m ON upl.match_id = m.match_id where upl.super_agent_id = ? AND upl.created_at >= ? AND upl.created_at <= ? GROUP BY m.match_id ORDER BY upl.created_at LIMIT ?,?';

				break;
			case 2:

				getquery = 'select m.name,SUM(upl.master_pl) pl,SUM(upl.master_commission) comm,upl.created_at,m.match_id from user_profit_loss upl LEFT JOIN matches m ON upl.match_id = m.match_id where upl.master_id = ? AND upl.created_at >= ? AND upl.created_at <= ? GROUP BY m.match_id ORDER BY upl.created_at LIMIT ?,?';

				break;
			case 1:

				getquery = 'select m.name,SUM(upl.admin_pl) pl,SUM(upl.admin_commission) comm,upl.created_at,m.match_id from user_profit_loss upl LEFT JOIN matches m ON upl.match_id = m.match_id where upl.admin_id = ? AND upl.created_at >= ? AND upl.created_at <= ? GROUP BY m.match_id ORDER BY upl.created_at LIMIT ?,?';

				break;
			default:
				break;
		}

		let insertAccSTMT = await MysqlPool.query(getquery, [data.user_id, data.from_date, data.to_date, data.offset, data.limit]);


		return resultdb(CONSTANTS.SUCCESS, insertAccSTMT);
	} catch (error) {
		//console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getAccountDetails = async (data) => {
	try {

		var getquery = '';
		switch (data.user_type) {
			case 5:
				getquery = `SELECT m.name, upl.user_pl pl, upl.user_commission comm,upl.created_at,m.market_id,upl.type 
							FROM user_profit_loss upl
							LEFT JOIN markets m ON upl.match_id = m.match_id
							WHERE upl.user_id = ? AND upl.match_id = ?
							ORDER BY upl.created_at DESC`;
				break;
				// eslint-disable-next-line indent
			case 4:
				getquery = `SELECT m.name, upl.agent_pl pl, upl.agent_commission comm,upl.created_at,m.market_id,upl.type
							FROM user_profit_loss upl
							LEFT JOIN markets m ON upl.match_id = m.match_id
							WHERE upl.agent_id = ? AND upl.match_id = ?
							ORDER BY upl.created_at DESC`;
				break;
			case 3:
				getquery = `SELECT m.name, upl.super_agent_pl pl, upl.super_agent_commission comm,upl.created_at,m.market_id,upl.type
							FROM user_profit_loss upl
							LEFT JOIN markets m ON upl.match_id = m.match_id
							WHERE upl.super_agent_id = ? AND upl.match_id = ?
							ORDER BY upl.created_at DESC`;
				break;
			case 2:

				getquery = `SELECT m.name, upl.master_pl pl, upl.master_commission comm,upl.created_at,m.market_id,upl.type
				FROM user_profit_loss upl
				LEFT JOIN markets m ON upl.match_id = m.match_id
				WHERE upl.master_id = ? AND upl.match_id = ?
				ORDER BY upl.created_at DESC`;
				break;
			case 1:

				getquery = `SELECT m.name, upl.admin_pl pl, upl.admin_commission comm,upl.created_at,m.market_id,upl.type
				FROM user_profit_loss upl
				LEFT JOIN markets m ON upl.match_id = m.match_id
				WHERE upl.admin_id = ? AND upl.match_id = ?
				ORDER BY upl.created_at DESC`;
				break;
			default:
				break;
		}
		let insertAccSTMT = await MysqlPool.query(getquery, [data.user_id, data.match_id]);
		return resultdb(CONSTANTS.SUCCESS, insertAccSTMT);
	} catch (error) {
		//console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let chipInOutStatement = async (data) => {
	try {
		let limit = CONSTANTS.LIMIT;
		let offset = (data.page-1) * limit;

		let qry = 'SELECT ';
		if(data.page == 1){
			qry = qry + ' SQL_CALC_FOUND_ROWS ';
		}

		qry = qry + ' * FROM account_statements where account_statements.user_id = ? AND statement_type = 1 ';

		if(data.from_date && data.from_date != ''){
			qry = qry + ' AND DATE(FROM_UNIXTIME(account_statements.created_at)) >= DATE("' + data.from_date + '") ';
		}

		if(data.to_date && data.to_date != ''){
			qry = qry + ' AND DATE(FROM_UNIXTIME(account_statements.created_at)) <= DATE("' + data.to_date + '") ';
		}

		qry = qry + ' ORDER BY account_statements.id DESC  LIMIT ? OFFSET ?; ';

		if(data.page == 1){
			qry = qry + ' SELECT FOUND_ROWS() AS total; ';
		}

		let qryResult = await MysqlPool.query(qry, [data.user_id, limit, offset]);
		return resultdb(CONSTANTS.SUCCESS, qryResult);
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

module.exports = {
	createAccStatementAndUpdateBalance,
	createAccStatementAndUpdateBalanceParentAndUser,
	getAccountStatement,
	getProfitLoss,
	getAccountDetails,
	chipInOutStatement
};