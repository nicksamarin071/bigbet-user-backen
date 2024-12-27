const express = require('express');
const router = express.Router();
const Joi = require('joi');
const axios = require('axios');
const userService = require('../services/userService');
const settings = require('../../config/settings');
const globalFunction = require('../../utils/globalFunction');
//const timezoneList = require('../../utils/timezoneList');
const CONSTANTS = require('../../utils/constants');
const delay = require('delay');
const FormData = require('form-data');
let apiSuccessRes = globalFunction.apiSuccessRes;
let apiUnauthorizedRes = globalFunction.apiUnauthorizedRes;
const fs = require('fs');
///Comment
const jwt = require("jsonwebtoken");

let apiErrorRes = globalFunction.apiErrorRes;

const multer = require('multer');
const path = require('path');
const xmlParser = require('xml2json-light');
const browser = require('browser-detect');
const qs = require('querystring');

let storage = multer.diskStorage({
	destination: (req, file, cb) => {
		//console.log("destination  ",destination);
		cb(null, settings.filePath)
	},
	filename: (req, file, cb) => {
		console.log("file.fieldname  ", file.fieldname);
		console.log("final file name :::   ", Date.now() + path.extname(file.originalname));
		req.body.attachment = (settings.imagePath + "/" + file.fieldname + '-' + Date.now() + path.extname(file.originalname));
		cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
	}
});
let upload = multer({ storage: storage, limits: { fileSize: 1000000 } });

function authenticateToken(token) {
	console.log('pass the execution off to whatever request the client intended');
	// Gather the jwt access token from the request header

	if (token == null) return res.sendStatus(401) // if there isn't any token

	jwt.verify(token, process.settings.secret, function (err, user) {
		console.log(err)
		if (err) return res.sendStatus(403)
		req.user = user
		next() // pass the execution off to whatever request the client intended
	})
}
async function lobbyAuth(req, res) {
	let {
		token,
		operatorId
	} = req.body;

	const loginchema = Joi.object({
		token: Joi.string().required(),
		operatorId: Joi.string().required()
	});

	try {
		await loginchema.validate(req.body, {
			abortEarly: true,
			allowUnknown: true
		});
	} catch (error) {
		return apiErrorRes(req, res, error.details[0].message);
	}


	if (token == null) return res.sendStatus(401) // if there isn't any token

	jwt.verify(token, settings.secret, function (err, user) {
		if (err) return res.status(200).json({ errorCode: 1, errorDescription: "Not authorized!" });//apiErrorRes(req, res, 'invalid authorization error !');		    	
		req.user = user
	})

	let id = req.user.sub.id;

	let authorization = await userService.getLobbyLotusUserAuthorization(id);

	let response = {};
	response.errorCode = 0;
	response.errorDescription = 'ok';

	if (authorization.statusCode !== CONSTANTS.SUCCESS && (authorization.data !== null && (token !== authorization.data.device_id || authorization.data.lockUser == 'Y' || authorization.data.closeUser == 'Y' || operatorId !== settings.LOTUS_OPERATOR_ID))) {
		response.errorCode = 1;
		response.errorDescription = 'Not authorized';
		return res.status(200).json(response);
	}

	let getSportsUser = await userService.funSportsActiveForUser(CONSTANTS.BETFAIR_SPORT_CASINO_LOTUS, id);
	if (getSportsUser.statusCode === CONSTANTS.NOT_FOUND) {
		response.errorCode = 1;
		response.errorDescription = 'Not authorized';
		return res.status(200).json(response);
	}

	let xpguserdata = await userService.getXpgtableDataByUsername(authorization.data.user_name, 3);

	if (xpguserdata.statusCode === CONSTANTS.SERVER_ERROR) {
		response.errorCode = 1;
		response.errorDescription = 'Server error in lotus check user exist function.';
		return res.status(200).json(response);
	}
	if (xpguserdata.statusCode === CONSTANTS.NOT_FOUND) {

		let data = {
			user_name: authorization.data.user_name,
			user_id: authorization.data.id,
			balance: authorization.data.balance
		};
		console.log('data', data);
		let xpguserinsertdata = await userService.insertLotusUser(data);
		if (xpguserinsertdata.statusCode === CONSTANTS.SERVER_ERROR) {
			return apiErrorRes(req, res, "Server error in xpg insert user function.");
		}
	} else {

		await userService.xpgUpdateUserActiveTime(authorization.data.id, 0, 3);
	}


	response.operatorId = settings.LOTUS_OPERATOR_ID;
	response.userId = authorization.data.id;
	response.username = authorization.data.user_name;
	response.playerTokenAtLaunch = token;
	response.token = authorization.data.device_id;
	response.balance = parseFloat(authorization.data.balance).toFixed(2);
	response.exposure = parseFloat(authorization.data.exposure).toFixed(2);
	response.currency = authorization.data.currency;
	response.language = authorization.data.language;
	response.timestamp = globalFunction.currentDateTimeStamp();
	response.clientIP = ["1"];
	response.VIP = 3;

	/*fs.appendFile('lobbyAuth.json',JSON.stringify(req.body), function (err) {
			  if (err) {
				return console.log('lobbyAuth--------------------- ',err);
			  }			
		});*/


	return res.status(200).json(response);

}

async function exposure(req, res) {

	let {
		token,
		calculateExposure,
		userId,
		betInfo,
	} = req.body;

	const loginchema = Joi.object({
		token: Joi.string().required(),
		betInfo: Joi.string().required()
	});

	/*try {
		await loginchema.validate(req.body, {
			abortEarly: true
		});
	} catch (error) {
		return apiErrorRes(req, res, error.details[0].message);
	}*/

	let response = {};
	if (token == null) return res.status(200).json({ status: 1, Message: "Not authorized!" }); // if there isn't any token
	jwt.verify(token, settings.secret, function (err, user) {
		if (err) return res.status(200).json({ status: 1, Message: "Not authorized!" });//apiErrorRes(req, res, 'invalid authorization error !');		    	
		req.user = user
	})

	let usergetId = req.user.sub.id;
	let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	let insertData = { liability: calculateExposure, usergetId: usergetId, betInfo: betInfo, ip_address: ip_address };

	let authorization = await userService.getLobbyLotusUserAuthorization(usergetId);

	if (authorization.data !== null && (token !== authorization.data.device_id || authorization.data.lockUser == 'Y' || authorization.data.closeUser == 'Y')) {
		response.status = 1;
		response.Message = 'Not authorized';
		return res.status(200).json(response);
	}

	let getSportsUser = await userService.funSportsActiveForUser(CONSTANTS.BETFAIR_SPORT_CASINO_LOTUS, usergetId);
	if (getSportsUser.statusCode === CONSTANTS.NOT_FOUND) {
		response.errorCode = 1;
		response.errorDescription = 'Not authorized';
		console.log('response ----------- ', response);
		return res.status(200).json(response);
	}

	let matchInsert = await userService.LotusInsertMatch(insertData);

	if ((authorization.data.balance) < Math.abs(calculateExposure)) {
		response.status = 1;
		response.Message = 'Insufficient Balance';
		return res.status(200).json(response);
	}



	let updateUserBalance = await userService.updateLobbyLotusUserBalance(insertData);

	let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(usergetId);

	response.status = 0;
	response.Message = "Exposure insert Successfully...";
	response.wallet = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
	response.exposure = parseFloat(balanceAfterBetPlace.data.exposure).toFixed(2);

	return res.status(200).json(response);
}
async function results(req, res) {

	let {
		result,
	} = req.body;

	const loginchema = Joi.object({
		result: Joi.string().required()
	});
	let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	let resultUserID = result[0].userId;
	let resultmarketId = result[0].marketId;
	let resultMatchId = result[0].roundId;
	let resultSportId = result[0].gameId;
	let resultProfitLoss = result[0].downpl;
	let response = {};
	let resultData = { user_id: resultUserID, market_id: resultmarketId, sport_id: resultSportId, match_id: resultMatchId, profit_loss: resultProfitLoss, ip_address: ip_address };

	let updateUserBalanceAfterResult = await userService.updateLobbyLotusAfterResult(resultData);

	let balanceAfterResultDeclear = await userService.getLobbyLotusUserAuthorization(resultUserID);
	response.Error = 0;
	response.result = [{ "wallet": parseFloat(balanceAfterResultDeclear.data.balance).toFixed(2), "exposure": parseFloat(balanceAfterResultDeclear.data.exposure).toFixed(2), "userId": resultUserID }];
	response.message = "1 user pl updated";
	return res.status(200).json(response);
}

async function ezugi_auth(req, res) {

	let {
		token,
		operatorId,
		platformId,
		timestamp
	} = req.body;


	let hash = req.headers.hash;

	const loginchema = Joi.object({
		token: Joi.string().required(),
		operatorId: Joi.number().required(),
		platformId: Joi.number().required(),
		timestamp: Joi.number().required(),
	});
	let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	try {
		await loginchema.validate(req.body, {
			allowUnknown: true
		});
	} catch (error) {
		let response = {};
		response.errorCode = 1;
		response.operatorId = settings.EZUGI_OPERATOR_ID;
		response.playerTokenAtLaunch = token;
		response.clientIP = ip_address;
		response.VIP = 0;
		response.errorDescription = error.details[0].message;
		return res.status(200).json(response);
	}

	try {

		let generateHash = globalFunction.GenerateEzugi_HashKey_auth(req.body);

		let response = {};

		response.errorCode = 0;
		response.operatorId = settings.EZUGI_OPERATOR_ID;
		response.token = token;
		response.clientIP = ip_address;
		response.balance = 0;
		response.VIP = 0;
		response.errorDescription = 'ok';
		response.timestamp = Date.now();

		if (generateHash != hash) {
			response.errorCode = 1;
			response.errorDescription = 'Security error';
			return res.status(200).json(response);
		}

		let requetEzugiToken = token;
		const getEzugiToken = token.split('____');

		token = getEzugiToken[0];
		let ezugi_token_string = getEzugiToken[1];

		if (token == null) return res.status(200).json({ errorCode: 6, operatorId: settings.EZUGI_OPERATOR_ID, errorDescription: "Token not found.", timestamp: Date.now() });

		jwt.verify(token, settings.secret, function (err, user) {
			if (err) return res.status(200).json({ errorCode: 6, operatorId: settings.EZUGI_OPERATOR_ID, errorDescription: "Token not found.", timestamp: Date.now() });//apiErrorRes(req, res, 'invalid authorization error !');		    	
			req.user = user
			//next() // pass the execution off to whatever request the client intended
		})

		let id = req.user.sub.id;

		let jsonRequest = JSON.stringify(req.body);

		let jsonLogs = { jsonRequest: jsonRequest, user_id: id, roundId: 0, timestamp: timestamp, type: 'AUTH' };

		let logsInsert = await userService.ezugiLogInsert(jsonLogs);

		let authorization = await userService.getLobbyLotusUserAuthorization(id);
		let getDbEzugiToken = await userService.getEzugi_Token(id, requetEzugiToken);
		console.log('getDbEzugiToken------------------------------', getDbEzugiToken);
		if (getDbEzugiToken.statusCode === CONSTANTS.SUCCESS) {

			if (authorization.statusCode !== CONSTANTS.SUCCESS && (authorization.data !== null && (authorization.data.lockUser == 'Y' || authorization.data.closeUser == 'Y' || operatorId !== settings.EZUGI_OPERATOR_ID))) {
				response.errorCode = 6;
				response.errorDescription = 'Token not found.';
				return res.status(200).json(response);
				//return apiUnauthorizedRes(req, res, 'Not authorized');
			}
		} else {
			response.errorCode = 6;
			response.errorDescription = 'Token not found.';
			return res.status(200).json(response);
		}

		let getSportsUser = await userService.funSportsActiveForUser(CONSTANTS.BETFAIR_SPORT_CASINO_EZUGI, id);
		if (getSportsUser.statusCode === CONSTANTS.NOT_FOUND) {
			response.errorCode = 6;
			response.errorDescription = 'Token not found.';
			return res.status(200).json(response);
		}



		let ezugiuserdata = await userService.getXpgtableDataByUsername(authorization.data.user_name, 2);

		if (ezugiuserdata.statusCode === CONSTANTS.SERVER_ERROR) {
			response.errorCode = 1;
			response.errorDescription = 'Server error in ezugi check user exist function.';
			return res.status(200).json(response);
		}
		if (ezugiuserdata.statusCode === CONSTANTS.NOT_FOUND) {

			let data = {
				user_name: authorization.data.user_name,
				user_id: authorization.data.id,
				balance: authorization.data.balance
			};
			let ezuginuserinsertdata = await userService.insertLotusUser(data, 2);
			if (ezuginuserinsertdata.statusCode === CONSTANTS.SERVER_ERROR) {
				return apiErrorRes(req, res, "Server error in ezugi insert user function.");
			}
		} else {

			await userService.xpgUpdateUserActiveTime(authorization.data.id, 0, 2);
		}


		response.operatorId = settings.EZUGI_OPERATOR_ID;
		response.uid = authorization.data.user_name;
		response.nickName = authorization.data.user_name;
		response.playerTokenAtLaunch = authorization.data.device_id;
		response.token = requetEzugiToken;
		response.balance = parseFloat(authorization.data.balance).toFixed(2);
		response.currency = authorization.data.currency;
		response.clientIP = ip_address;
		response.VIP = 0;
		return res.status(200).json(response);
	} catch (error) {
		console.error("server error ", error);
	}
}


async function ezugi_debit(req, res) {


	let {
		gameId,
		operatorId,
		token,
		uid,
		transactionId,
		roundId,
		tableId,
		currency,
		debitAmount,
		betTypeID,
		timestamp,
	} = req.body;


	const loginchema = Joi.object({
		gameId: Joi.number().required(),
		operatorId: Joi.number().required(),
		token: Joi.string().required(),
		uid: Joi.string().required(),
		transactionId: Joi.string().required(),
		roundId: Joi.number().required(),
		tableId: Joi.number().required(),
		currency: Joi.string().required(),
		debitAmount: Joi.number().required(),
		betTypeID: Joi.number().required(),
		timestamp: Joi.number().required(),
	});
	let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	let hash = req.headers.hash;

	try {
		await loginchema.validate(req.body, {
			allowUnknown: true
		});
	} catch (error) {
		let response = {};
		response.errorCode = 1;
		response.operatorId = settings.EZUGI_OPERATOR_ID;
		response.clientIP = ip_address;
		response.VIP = 0;
		response.errorDescription = error.details[0].message;
		return res.status(200).json(response);
	}
	try {
		if (parseInt(debitAmount) == debitAmount) {
			req.body.debitAmount = debitAmount.toFixed(1);
		} else {
			let requestDebitAmount = debitAmount.toString();
			let array = requestDebitAmount.split('.');
			let firstNumber = array[0];
			let secondNumber = array[1];
			if (parseInt(secondNumber) == secondNumber) {
				req.body.debitAmount = debitAmount.toFixed(1);
			} else {
				req.body.debitAmount = debitAmount.toFixed(2);
			}
			//req.body.debitAmount= debitAmount.toFixed(2);
		}

		let jsonRequest = JSON.stringify(req.body);
		let getString = jsonRequest.replace('"debitAmount":"' + req.body.debitAmount + '"', '"debitAmount":' + req.body.debitAmount + '');

		let generateHash = globalFunction.GenerateEzugi_HashKey(getString);
		console.log('hash ------------------------------------- ' + '"debitAmount":"' + req.body.debitAmount + '"' + '"debitAmount":' + req.body.debitAmount + '');
		console.log('generateHash ------------------------------------- ', generateHash);
		let response = {};
		response.errorCode = 0;
		response.operatorId = settings.EZUGI_OPERATOR_ID;
		response.errorDescription = 'ok';
		response.timestamp = Date.now();

		/*if (generateHash != hash) {
			response.errorCode = 1;
			response.errorDescription = 'Security error';
			console.log('security error',response);
			return res.status(200).json(response);
		}*/

		if (token == null) return res.status(200).json({ errorCode: 6, operatorId: settings.EZUGI_OPERATOR_ID, errorDescription: "Token not found." }); // if there isn't any token

		let requetEzugiToken = token;
		const getEzugiToken = token.split('____');

		token = getEzugiToken[0];
		let ezugi_token_string = getEzugiToken[1];

		jwt.verify(token, settings.secret, function (err, user) {
			if (err) return res.status(200).json({ errorCode: 6, operatorId: settings.EZUGI_OPERATOR_ID, errorDescription: "Token not found." });
			req.user = user
		})

		if (debitAmount < 0) {
			response.errorCode = 1;
			response.errorDescription = 'Negative amount.';
			return res.status(200).json(response);
		}
		if (debitAmount == 0) {
			response.errorCode = 1;
			response.errorDescription = 'Debit amount must be grater than zero';
			return res.status(200).json(response);
		}


		let usergetId = req.user.sub.id;

		let data = { liability: debitAmount, gameId: gameId, transactionId: transactionId, usergetId: usergetId, tableId: tableId, currency: currency, roundId: roundId, timestamp: timestamp, ip_address: ip_address };

		let jsonLogs = { jsonRequest: jsonRequest, user_id: usergetId, roundId: roundId, timestamp: timestamp, type: 'DEBIT' };

		let logsInsert = await userService.ezugiLogInsert(jsonLogs);

		let matchInsert = await userService.EZUGIInsertMatch(data);

		let authorization = await userService.getLobbyLotusUserAuthorization(usergetId);


		if (authorization.data !== null && (uid != authorization.data.user_name || authorization.data.lockUser == 'Y' || authorization.data.closeUser == 'Y')) {
			response.errorCode = 7;
			response.errorDescription = 'User not found.';
			return res.status(200).json(response);
		}

		response.roundId = roundId;
		response.token = token;
		response.transactionId = transactionId;
		response.bonusAmount = 0;
		response.uid = authorization.data.user_name;
		response.balance = parseFloat(authorization.data.balance).toFixed(2);
		response.currency = authorization.data.currency;

		if ((authorization.data.balance) < Math.abs(debitAmount)) {
			response.errorCode = 3;
			response.errorDescription = 'Insufficient funds.';
			return res.status(200).json(response);
		}



		let checkDebitConditions = await userService.getEzugiDebitConditions(data);

		if (checkDebitConditions.statusCode === CONSTANTS.SUCCESS) {

			if (checkDebitConditions.data.rollback_transactionId === transactionId) {

				response.errorCode = 1;
				response.errorDescription = 'Debit after rollback.';
				return res.status(200).json(response);

			} else {

				response.errorCode = 1;
				response.errorDescription = 'Transaction has already processed';
				return res.status(200).json(response);
			}
		}

		let letDebitRollback = { usergetId: usergetId, roundId: roundId, is_type: 'ROLLBACK' };

		let getDbitAfterRooback = await userService.getEzugiDebitAfterRollback(letDebitRollback);

		if (getDbitAfterRooback.statusCode === CONSTANTS.SUCCESS) {

			if (Math.abs(JSON.parse(getDbitAfterRooback.data.request_json).transactionId) == transactionId) {
				response.errorCode = 1;
				response.errorDescription = 'Debit after rollback.';
				return res.status(200).json(response);
			}
		}


		let updateUserBalance = "";

		if (betTypeID == 3) {
			updateUserBalance = await userService.updateLobbyEzugiUserTIPBalance(data);
		} else {
			updateUserBalance = await userService.updateLobbyEzugiUserBalance(data);
		}


		if (updateUserBalance.statusCode === CONSTANTS.SUCCESS) {

			let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(usergetId);

			response.operatorId = settings.EZUGI_OPERATOR_ID;
			response.roundId = roundId;
			response.uid = balanceAfterBetPlace.data.user_name;
			response.token = token;
			response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
			response.transactionId = transactionId;
			response.currency = balanceAfterBetPlace.data.currency;
			response.bonusAmount = 0;


		} else if (updateUserBalance.statusCode === CONSTANTS.NOT_FOUND) {
			response.errorCode = 1;
			response.errorDescription = 'Transaction has already processed';
		} else {
			response.errorCode = 1;
			response.errorDescription = 'Transaction has already processed';
		}
		console.log('ezugi debit api response ---- ', response);
		return res.status(200).json(response);

	} catch (error) {
		console.error("catch error debit ezugi ", error);
	}
}


async function ezugi_rollback(req, res) {

	let {
		operatorId,
		token,
		uid,
		transactionId,
		roundId,
		gameId,
		tableId,
		betTypeID,
		currency,
		rollbackAmount,
		timestamp,
	} = req.body;


	const loginchema = Joi.object({
		operatorId: Joi.number().required(),
		token: Joi.string().required(),
		uid: Joi.string().required(),
		transactionId: Joi.string().required(),
		roundId: Joi.number().required(),
		currency: Joi.string().required(),
		gameId: Joi.number().required(),
		tableId: Joi.number().required(),
		betTypeID: Joi.number().required(),
		rollbackAmount: Joi.number().required(),
		timestamp: Joi.number().required(),
	});



	try {
		await loginchema.validate(req.body, {
			abortEarly: true,
			allowUnknown: true
		});
	} catch (error) {
		let response = {};
		response.errorCode = 1;
		response.operatorId = settings.EZUGI_OPERATOR_ID;
		response.errorDescription = error.details[0].message;
		return res.status(200).json(response);
		//return apiErrorRes(req, res, error.details[0].message);
	}
	try {
		let hash = req.headers.hash;
		console.log('hash-------------------hash------------', hash);
		if (parseInt(rollbackAmount) == rollbackAmount) {
			req.body.rollbackAmount = rollbackAmount.toFixed(1);
		} else {

			let requestRollAmount = rollbackAmount.toString();
			let array = requestRollAmount.split('.');
			let firstNumber = array[0];
			let secondNumber = array[1];
			if (parseInt(secondNumber) == secondNumber) {
				req.body.rollbackAmount = rollbackAmount.toFixed(1);
			} else {
				req.body.rollbackAmount = rollbackAmount.toFixed(2);
			}
		}

		let jsonRequest = JSON.stringify(req.body);
		let getString = jsonRequest.replace('"rollbackAmount":"' + req.body.rollbackAmount + '"', '"rollbackAmount":' + req.body.rollbackAmount + '');

		let generateHash = globalFunction.GenerateEzugi_HashKey(getString);
		console.log('generateHash-------------------ezugi_rollback------------', generateHash);
		console.log('generateHash-------------------req.body------------', jsonRequest);
		console.log('generateHash-------------------req.body------------', getString);

		let response = {};
		response.errorCode = 0;
		response.operatorId = settings.EZUGI_OPERATOR_ID;
		response.errorDescription = 'ok';
		response.timestamp = Date.now();

		/*if (generateHash != hash) {
			console.log('---------------------------hash not matched---------------------------------');
			response.errorCode = 1;
			response.errorDescription = 'Security error';
			return res.status(200).json(response);
		}*/

		if (token == null) return res.status(200).json({ errorCode: 6, operatorId: settings.EZUGI_OPERATOR_ID, errorDescription: "Token not found." }); // if there isn't any token

		let requetEzugiToken = token;
		const getEzugiToken = token.split('____');

		token = getEzugiToken[0];
		let ezugi_token_string = getEzugiToken[1];

		jwt.verify(token, settings.secret, function (err, user) {
			if (err) return res.status(200).json({ errorCode: 6, operatorId: settings.EZUGI_OPERATOR_ID, errorDescription: "Token not found." });
			req.user = user

		})
		let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
		let usergetId = req.user.sub.id;
		let jsonLogs = { jsonRequest: jsonRequest, user_id: usergetId, roundId: roundId, timestamp: timestamp, type: 'ROLLBACK' };

		let logsInsert = await userService.ezugiLogInsert(jsonLogs);

		let insertData = { gameId: gameId, transactionId: transactionId, user_id: usergetId, tableId: tableId, currency: currency, roundId: roundId, profit_loss: rollbackAmount, timestamp: timestamp, ip_address: ip_address };

		let authorization = await userService.getLobbyLotusUserAuthorization(usergetId);

		if (authorization.data !== null && (uid != authorization.data.user_name || authorization.data.lockUser == 'Y' || authorization.data.closeUser == 'Y')) {

			response.errorCode = 7;
			response.errorDescription = 'User not found.';
			return res.status(200).json(response);
		}

		response.roundId = roundId;
		response.token = token;
		response.transactionId = transactionId;
		response.bonusAmount = 0;
		response.uid = authorization.data.user_name;
		response.balance = parseFloat(authorization.data.balance).toFixed(2);
		response.currency = authorization.data.currency;

		let checkRollbackConditions = await userService.getEzugiRollbackConditions(insertData);

		if (checkRollbackConditions.statusCode === CONSTANTS.SUCCESS) {

			if (Math.abs(checkRollbackConditions.data.liability) != rollbackAmount) {
				response.errorCode = 1;
				response.errorDescription = 'Wrong amount.';
				return res.status(200).json(response);

			}
			if (checkRollbackConditions.data.rollback_transactionId == transactionId) {

				response.errorCode = 0;
				response.errorDescription = 'Transaction already processed';
				return res.status(200).json(response);
			}

		} else {
			response.errorCode = 9;
			response.errorDescription = 'Transaction Not Found.';
			return res.status(200).json(response);
		}

		let updateTransactionID = await userService.ezugiUpdateTransactionId(insertData, 'rollback_transactionId');

		if (updateTransactionID.statusCode === CONSTANTS.SUCCESS) {
			let updateUserBalance = "";
			if (betTypeID != 3) {

				updateUserBalance = await userService.ezugiRollbackAccountStatement(insertData);
			}
			let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(usergetId);

			response.operatorId = settings.EZUGI_OPERATOR_ID;
			response.roundId = roundId;
			response.uid = balanceAfterBetPlace.data.user_name;
			response.token = token;
			response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
			response.transactionId = transactionId;
			response.currency = balanceAfterBetPlace.data.currency;
			response.bonusAmount = 0;

		} else if (updateTransactionID.statusCode === CONSTANTS.NOT_FOUND) {
			response.errorCode = 9;
			response.errorDescription = 'Transaction already processed';
		} else {
			response.errorCode = 0;
			response.errorDescription = 'Transaction already processed';
		}

		return res.status(200).json(response);

	} catch (error) {
		console.error("catch error rollback ezugi ", error);
	}
}

async function ezugi_credit(req, res) {

	let {
		operatorId,
		token,
		uid,
		transactionId,
		debitTransactionId,
		roundId,
		gameId,
		tableId,
		currency,
		creditAmount,
		timestamp,
	} = req.body;


	const loginchema = Joi.object({

		operatorId: Joi.number().required(),
		token: Joi.string().required(),
		uid: Joi.string().required(),
		transactionId: Joi.string().required(),
		debitTransactionId: Joi.string().required(),
		roundId: Joi.number().required(),
		gameId: Joi.number().required(),
		tableId: Joi.number().required(),
		currency: Joi.string().optional(),
		creditAmount: Joi.number().required(),
		timestamp: Joi.number().required(),
	});

	try {
		await loginchema.validate(req.body, {
			//abortEarly: true,
			allowUnknown: true
		});
	} catch (error) {
		let response = {};
		response.errorCode = 1;
		response.operatorId = settings.EZUGI_OPERATOR_ID;
		response.errorDescription = error.details[0].message;
		return res.status(200).json(response);
		//return apiErrorRes(req, res, error.details[0].message);
	}
	try {

		let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
		let hash = req.headers.hash;
		if (parseInt(creditAmount) == creditAmount) {
			req.body.creditAmount = creditAmount.toFixed(1);
		} else {

			let requestCreditAmount = creditAmount.toString();
			let array = requestCreditAmount.split('.');
			let firstNumber = array[0];
			let secondNumber = array[1];
			if (parseInt(secondNumber) == secondNumber) {
				req.body.creditAmount = creditAmount.toFixed(1);
			} else {
				req.body.creditAmount = creditAmount.toFixed(2);
			}
		}

		let jsonRequest = JSON.stringify(req.body);
		let getString = jsonRequest.replace('"creditAmount":"' + req.body.creditAmount + '"', '"creditAmount":' + req.body.creditAmount + '');

		let generateHash = globalFunction.GenerateEzugi_HashKey(getString);

		//console.log('generateHash-------------------ezugi_credit------------',generateHash);	
		//console.log('generateHash-------------------req.body-----jsonRequest-------',jsonRequest);	
		//console.log('generateHash-------------------req.getString------------',getString);

		let response = {};
		response.errorCode = 0;
		response.operatorId = settings.EZUGI_OPERATOR_ID;
		response.errorDescription = 'ok';
		response.timestamp = Date.now();

		/*if (generateHash != hash) {
			console.log('---------------------------hash not matched---------------------------------');
			response.errorCode = 1;
			response.errorDescription = 'Security error';
			return res.status(200).json(response);
		}*/

		if (token == null) return res.status(200).json({ errorCode: 6, operatorId: settings.EZUGI_OPERATOR_ID, errorDescription: "Token not found." });

		let requetEzugiToken = token;
		const getEzugiToken = token.split('____');

		token = getEzugiToken[0];
		let ezugi_token_string = getEzugiToken[1];

		jwt.verify(token, settings.secret, function (err, user) {
			if (err) return res.status(200).json({ errorCode: 6, operatorId: settings.EZUGI_OPERATOR_ID, errorDescription: "Token not found." });
			req.user = user

		})

		let usergetId = req.user.sub.id;

		let jsonLogs = { jsonRequest: jsonRequest, user_id: usergetId, roundId: roundId, timestamp: timestamp, type: 'CREDIT' };

		let logsInsert = await userService.ezugiLogInsert(jsonLogs);


		let insertData = { debitTransactionId: debitTransactionId, gameId: gameId, transactionId: transactionId, user_id: usergetId, tableId: tableId, currency: currency, roundId: roundId, profit_loss: creditAmount, timestamp: timestamp, ip_address: ip_address };

		let authorization = await userService.getLobbyLotusUserAuthorization(usergetId);

		if (authorization.data !== null && (uid != authorization.data.user_name || authorization.data.lockUser == 'Y' || authorization.data.closeUser == 'Y')) {

			response.errorCode = 7;
			response.errorDescription = 'User not found.';
			return res.status(200).json(response);
		}

		response.roundId = roundId;
		response.token = token;
		response.transactionId = transactionId;
		response.bonusAmount = 0;
		response.uid = authorization.data.user_name;
		response.balance = parseFloat(authorization.data.balance).toFixed(2);
		response.currency = authorization.data.currency;

		let checkCreditConditions = await userService.getEzugiCreditConditions(insertData);

		if (checkCreditConditions.statusCode === CONSTANTS.SUCCESS) {

			if (checkCreditConditions.data.credit_transactionId == transactionId) {

				response.errorCode = 0;
				response.errorDescription = 'Transaction has already processed.';
				return res.status(200).json(response);

			}

			if (checkCreditConditions.data.debit_transactionId == debitTransactionId && checkCreditConditions.data.credit_transactionId != null) {

				response.errorCode = 0;
				response.errorDescription = 'Transaction has already processed.';
				return res.status(200).json(response);

			}
		} else {

			response.errorCode = 1;
			response.errorDescription = 'Debit transaction not found';
			return res.status(200).json(response);
		}

		let updateTransactionID = await userService.ezugiUpdateTransactionId(insertData, 'credit_transactionId');

		if (updateTransactionID.statusCode === CONSTANTS.SUCCESS) {

			let updateUserBalance = await userService.ezugiAccountStatement(insertData);
			let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(usergetId);

			response.operatorId = settings.EZUGI_OPERATOR_ID;
			response.roundId = roundId;
			response.uid = balanceAfterBetPlace.data.user_name;
			response.token = token;
			response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
			response.transactionId = transactionId;
			response.currency = balanceAfterBetPlace.data.currency;
			response.bonusAmount = 0;



		} else if (updateTransactionID.statusCode === CONSTANTS.NOT_FOUND) {
			response.errorCode = 0;
			response.errorDescription = 'Transaction has already processed';
		} else {
			response.errorCode = 0;
			response.errorDescription = 'Transaction has already processed';
		}

		return res.status(200).json(response);



	} catch (error) {
		console.error("catch error credit ezugi ", error);
	}

}


async function xpg_PlayerGetBalance(req, res) {
	/*fs.appendFile('lobbyAuth.json',JSON.stringify(req.body), function (err) {
				  if (err) {
					return console.log('xpg get balace auth--------------------- ',err);
				  }			
			});*/
	let {
		Login,
		OperatorId,
		Session,
	} = req.body;


	const loginchema = Joi.object({
		Login: Joi.string().required(),
		OperatorId: Joi.number().required(),
		Session: Joi.string().optional().allow(''),
	});

	try {
		await loginchema.validate(req.body, {
			//abortEarly: true
			allowUnknown: true
		});
	} catch (error) {
		let response = {};
		response.ErrorCode = "-2";
		response.HasErrors = true;
		response.Message = error.details[0].message;
		return res.status(200).json({ d: response });
	}

	try {

		let user_name = Login;

		let authorization = await userService.getUserByUserName(user_name);
		let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
		let response = {};

		if (authorization.statusCode === CONSTANTS.NOT_FOUND || authorization.data[0] == null || authorization.data[0].length <= 0) {

			response.ErrorCode = "-10";
			response.HasErrors = true;
			response.Message = 'Player not found in Partner system';
			return res.status(200).json({ d: response });
		}

		if (authorization.statusCode == CONSTANTS.SUCCESS && (authorization.data[0] != null || authorization.data[0].length > 0) && (user_name != authorization.data[0].user_name || authorization.data[0].parent_lock_user == 'Y' || authorization.data[0].self_lock_user == 'Y' || authorization.data[0].self_close_account == 'Y' || authorization.data[0].parent_close_account == 'Y' || OperatorId != settings.XPG_OPERATOR_ID)) {
			response.ErrorCode = "-10";
			response.HasErrors = true;
			response.Message = 'Player not found in Partner system';
			return res.status(200).json({ d: response });
		}

		response.Data = [parseFloat(authorization.data[0].balance).toFixed(2)];
		response.ErrorCode = 0;
		response.HasErrors = false;
		response.Message = '';

		return res.status(200).json({ d: response });
	} catch (error) {
		console.error("server error xpg_PlayerGetBalance -------------------------------- ", error);
	}
}

async function xpg_PlayerGetBalances(req, res) {

	/*	fs.appendFile('PlayerGetBalances.json',JSON.stringify(req.body), function (err) {
					  if (err) {
						return console.log('xpg get PlayerGetBalances auth--------------------- ',err);
					  }			
				});*/
	let {
		Logins,
		OperatorId,
	} = req.body;


	const loginchema = Joi.object({
		Logins: Joi.array().min(1).required(),
		OperatorId: Joi.number().required(),
	});

	try {
		await loginchema.validate(req.body, {
			//abortEarly: true
			allowUnknown: true
		});
	} catch (error) {
		let response = {};
		response.ErrorCode = "-2";
		response.HasErrors = true;
		response.Message = error.details[0].message;
		return res.status(200).json({ d: response });
		//return apiErrorRes(req, res, error.details[0].message);
	}

	try {

		let user_name = Logins;

		//let authorization = await userService.getUserByUserName(user_name);
		let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
		let response = {};
		response.ErrorCode = 0;
		response.HasErrors = false;
		response.Message = '';

		response.Data = [{ "Balance": 4255, "Login": " sisprashant" }, { "Balance": 0, "Login": "sisprashant2" }];

		console.log('response ------------------------ ', response);

		return res.status(200).json({ d: response });
	} catch (error) {
		console.error("server error ", error);
	}
}

async function xpg_Debit(req, res) {

	let {
		Login,
		OperatorId,
		Session,
		GameId,
		RoundId,
		Sequence,
		Amount,
		DebitDetails,
	} = req.body;

	const loginchema = Joi.object({
		Login: Joi.string().required(),
		OperatorId: Joi.number().required(),
		Session: Joi.string().optional().allow(''),
		GameId: Joi.number().required(),
		RoundId: Joi.number().required(),
		Sequence: Joi.number().required(),
		Amount: Joi.number().required(),
		DebitDetails: Joi.string().optional().allow(''),
	});

	try {
		await loginchema.validate(req.body, {
			//abortEarly: true
			allowUnknown: true
		});
	} catch (error) {
		let response = {};
		response.ErrorCode = "-2";
		response.HasErrors = true;
		response.Message = error.details[0].message;
		return res.status(200).json({ d: response });
	}

	try {
		let jsonRequest = JSON.stringify(req.body);

		let user_name = Login;
		let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;


		let response = {};

		let authorization = await userService.getLobbyXPGUserAuthorization(user_name);

		if (authorization.statusCode === CONSTANTS.SUCCESS) {
			if (user_name !== authorization.data.user_name || authorization.data.lockUser == 'Y' || authorization.data.closeUser == 'Y') {
				response.ErrorCode = "-10";
				response.HasErrors = true;
				response.Message = 'Player not found in Partner system';
				return res.status(200).json({ d: response });
			}

		} else {
			response.ErrorCode = "-10";
			response.HasErrors = true;
			response.Message = 'Player not found in Partner system';
			return res.status(200).json({ d: response });
		}

		let getSportsUser = await userService.funSportsActiveForUser(CONSTANTS.BETFAIR_SPORT_CASINO_XPG, authorization.data.id);
		if (getSportsUser.statusCode === CONSTANTS.NOT_FOUND) {
			response.ErrorCode = "-10";
			response.HasErrors = true;
			response.Message = 'Player not found in Partner system';
			return res.status(200).json({ d: response });
		}

		if ((authorization.data.balance) < Math.abs(Amount)) {
			response.Data = [parseFloat(authorization.data.balance).toFixed(2)]
			response.ErrorCode = "-20";
			response.HasErrors = true;
			response.Message = 'Insufficient Balance';
			return res.status(200).json({ d: response });
		}

		let data = { liability: Amount, gameId: GameId, usergetId: authorization.data.id, roundId: RoundId, ip_address: ip_address, Sequence: Sequence, is_type: 'DEBIT' };

		let jsonLogs = { jsonRequest: jsonRequest, user_id: authorization.data.id, roundId: RoundId, type: 'DEBIT', ip_address: ip_address };

		let logsInsert = await userService.XPGLogInsert(jsonLogs);
		let matchInsert = await userService.XPGInsertMatch(jsonLogs);

		let userCheckSameRoudIdCoditionXPG = await userService.getSameRoundConditionXPG(data);

		if (userCheckSameRoudIdCoditionXPG.statusCode === CONSTANTS.SUCCESS) {

			if (Math.abs(userCheckSameRoudIdCoditionXPG.data.liability) == Amount) {
				response.Data = [parseFloat(authorization.data.balance).toFixed(2)];
				response.ErrorCode = "21";
				response.HasErrors = true;
				response.Message = "Transaction has already been recorded in Partner server";
				return res.status(200).json({ d: response });
			} else {
				response.Data = [parseFloat(authorization.data.balance).toFixed(2)];
				response.ErrorCode = "-22";
				response.HasErrors = true;
				response.Message = "Transaction for specified RoundID and Username already recorded for different amount";
				return res.status(200).json({ d: response });
			}

		}


		let updateUserBalance = "";
		if (Sequence >= 1001 && Sequence <= 1010) {

			updateUserBalance = await userService.updateLobbyXPGUserTIPBalance(data);
		} else {
			updateUserBalance = await userService.updateLobbyXPGUserBalance(data);
		}

		//await delay((3) * 1000);

		if (updateUserBalance.statusCode === CONSTANTS.SUCCESS) {

			let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(authorization.data.id);

			response.Data = [parseFloat(balanceAfterBetPlace.data.balance).toFixed(2)];
			response.ErrorCode = 0;
			response.HasErrors = false;
			response.Message = "";
			return res.status(200).json({ d: response });


		} else {
			response.ErrorCode = 0;
			response.HasErrors = true;
			response.Message = "";
			return res.status(200).json({ d: response });
		}
		/*fs.appendFile('debit.json',JSON.stringify(req.body), function (err) {
	  if (err) {
		return console.log('debit--------------------- ',err);
	  }			
	});	*/
	} catch (error) {
		console.error("catch error debit xpg ", error);
	}
}

async function xpg_Credit(req, res) {

	let {
		Login,
		OperatorId,
		Session,
		GameId,
		RoundId,
		Amount,
		CreditDetails,
	} = req.body;


	const loginchema = Joi.object({
		Login: Joi.string().required(),
		OperatorId: Joi.number().required(),
		Session: Joi.string().optional().allow(''),
		GameId: Joi.number().required(),
		RoundId: Joi.number().required(),
		Amount: Joi.number().required(),
	});


	try {
		await loginchema.validate(req.body, {
			//abortEarly: true
			allowUnknown: true
		});
	} catch (error) {
		let response = {};
		response.ErrorCode = "-2";
		response.HasErrors = true;
		response.Message = error.details[0].message;
		return res.status(200).json({ d: response });
		//return apiErrorRes(req, res, error.details[0].message);
	}
	try {

		let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

		let jsonRequest = JSON.stringify(req.body);

		let user_name = Login;

		let response = {};

		let authorization = await userService.getLobbyXPGUserAuthorization(user_name);

		if (authorization.statusCode === CONSTANTS.SUCCESS) {
			if (user_name !== authorization.data.user_name || authorization.data.lockUser == 'Y' || authorization.data.closeUser == 'Y') {
				response.ErrorCode = "-10";
				response.HasErrors = true;
				response.Message = 'Player not found in Partner system';
				return res.status(200).json({ d: response });
			}

		} else {
			response.ErrorCode = "-10";
			response.HasErrors = true;
			response.Message = 'Player not found in Partner system';
			return res.status(200).json({ d: response });
		}


		let dataCredit = { user_id: authorization.data.id, roundId: RoundId, credit_type: 'CREDIT' };
		let userCheckSameRoudIdCREDIT_XPG = await userService.getSameRoundCREDIT_XPG(dataCredit);

		if (userCheckSameRoudIdCREDIT_XPG.statusCode === CONSTANTS.SUCCESS) {
			if (Math.abs(JSON.parse(userCheckSameRoudIdCREDIT_XPG.data.request_json).Amount) == Amount) {
				response.Data = [parseFloat(authorization.data.balance).toFixed(2)];
				response.ErrorCode = "21";
				response.HasErrors = true;
				response.Message = "Transaction has already been recorded in Partner server";
				return res.status(200).json({ d: response });
			}
			else {
				response.Data = [parseFloat(authorization.data.balance).toFixed(2)];
				response.ErrorCode = "-22";
				response.HasErrors = true;
				response.Message = "Transaction for specified RoundID and Username already recorded for different amount";
				return res.status(200).json({ d: response });
			}
		}


		let dataDebit = { user_id: authorization.data.id, GameId: GameId, roundId: RoundId, is_type: 'DEBIT' };

		let userCheckSameRoudIdDEBIT_XPG = await userService.getSameRoundDEBIT_XPG(dataDebit);

		if (userCheckSameRoudIdDEBIT_XPG.statusCode === CONSTANTS.NOT_FOUND) {
			response.Data = [parseFloat(authorization.data.balance).toFixed(2)];
			response.ErrorCode = "-30";
			response.HasErrors = true;
			response.Message = "No debit record is exist";
			return res.status(200).json({ d: response });
		}

		let jsonLogs = { jsonRequest: jsonRequest, user_id: authorization.data.id, roundId: RoundId, type: 'CREDIT' };

		let logsInsert = await userService.XPGLogInsert(jsonLogs);


		let insertData = { gameId: GameId, user_id: authorization.data.id, roundId: RoundId, profit_loss: Amount, ip_address: ip_address, is_type: 'DEBIT', is_type_update: 'CREDIT' };

		let updateTransactionID = await userService.XPGAccountStatement(insertData);


		if (updateTransactionID.statusCode === CONSTANTS.SUCCESS) {


			let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(authorization.data.id);

			response.Data = [parseFloat(balanceAfterBetPlace.data.balance).toFixed(2)];
			response.ErrorCode = 0;
			response.HasErrors = false;
			response.Message = "";


		} else {
			response.ErrorCode = 0;
			response.HasErrors = true;
			response.Message = "";
		}

		return res.status(200).json({ d: response });

		/*fs.appendFile('credit.json',JSON.stringify(req.body), function (err) {
			  if (err) {
				return console.log('credit--------------------- ',err);
			  }			
		});	*/

	} catch (error) {
		console.error("catch error credit xpg ", error);
	}

}

async function xpg_CancelTransaction(req, res) {

	/*fs.appendFile('CancelTransaction.json',JSON.stringify(req.body), function (err) {
			  if (err) {
				return console.log('CancelTransaction--------------------- ',err);
			  }			
		});	*/

	let {
		Login,
		OperatorId,
		Session,
		GameId,
		RoundId,
		Sequence,
	} = req.body;


	const loginchema = Joi.object({
		Login: Joi.string().required(),
		OperatorId: Joi.number().required(),
		Session: Joi.string().optional().allow(''),
		GameId: Joi.number().required(),
		RoundId: Joi.number().required(),
		Sequence: Joi.number().required(),
	});


	try {
		await loginchema.validate(req.body, {
			//abortEarly: true
			allowUnknown: true
		});
	} catch (error) {
		let response = {};
		response.ErrorCode = "-2";
		response.HasErrors = true;
		response.Message = error.details[0].message;
		return res.status(200).json({ d: response });
		//return apiErrorRes(req, res, error.details[0].message);
	}

	try {

		let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

		let jsonRequest = JSON.stringify(req.body);

		let user_name = Login;

		let response = {};

		let authorization = await userService.getLobbyXPGUserAuthorization(user_name);

		if (authorization.statusCode === CONSTANTS.SUCCESS) {
			if (user_name !== authorization.data.user_name || authorization.data.lockUser == 'Y' || authorization.data.closeUser == 'Y') {
				response.ErrorCode = "-10";
				response.HasErrors = true;
				response.Message = 'Player not found in Partner system';
				return res.status(200).json({ d: response });

			}
		}
		else {

			response.ErrorCode = "-10";
			response.HasErrors = true;
			response.Message = 'Player not found in Partner system';
			return res.status(200).json({ d: response });
		}


		let data = { user_id: authorization.data.id, roundId: RoundId, is_type: 'CANCEL', Sequence: Sequence, GameId: GameId };

		let userCheckSameRoudIdCREDIT_XPG = await userService.getSameRoundCANCEL_XPG(data);

		if (userCheckSameRoudIdCREDIT_XPG.statusCode === CONSTANTS.SUCCESS) {

			response.Data = [parseFloat(authorization.data.balance).toFixed(2)];
			response.ErrorCode = "21";
			response.HasErrors = true;
			response.Message = "Transaction has already been recorded in Partner server";
			return res.status(200).json({ d: response });
		}

		let cancelAgain = { user_id: authorization.data.id, roundId: RoundId, credit_type: 'CancelTransaction' };

		let sameTransactionCancelAgain = await userService.getSameRoundCREDIT_XPG(cancelAgain);

		if (sameTransactionCancelAgain.statusCode === CONSTANTS.SUCCESS) {

			response.Data = [parseFloat(authorization.data.balance).toFixed(2)];
			response.ErrorCode = "21";
			response.HasErrors = true;
			response.Message = "Transaction has already been recorded in Partner server fsfsdf";
			return res.status(200).json({ d: response });
		}
		let jsonLogs = { jsonRequest: jsonRequest, user_id: authorization.data.id, roundId: RoundId, type: 'CancelTransaction' };

		let logsInsert = await userService.XPGLogInsert(jsonLogs);

		let dataDebit = { user_id: authorization.data.id, GameId: GameId, roundId: RoundId, is_type: 'DEBIT' };

		let userCheckSameRoudIdDEBIT_XPG = await userService.getSameRoundDEBIT_XPG(dataDebit);

		if (userCheckSameRoudIdDEBIT_XPG.statusCode === CONSTANTS.NOT_FOUND) {
			response.Data = [parseFloat(authorization.data.balance).toFixed(2)];
			response.ErrorCode = "-30";
			response.HasErrors = true;
			response.Message = "No debit record is exist";
			return res.status(200).json({ d: response });
		}


		let insertData = { gameId: GameId, user_id: authorization.data.id, roundId: RoundId, Sequence: Sequence, is_type_update: 'CANCEL' };

		let updateTransactionID = await userService.xpg_CancelTransaction(insertData);


		if (updateTransactionID.statusCode === CONSTANTS.SUCCESS) {


			let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(authorization.data.id);

			response.Data = [parseFloat(balanceAfterBetPlace.data.balance).toFixed(2)];
			response.ErrorCode = 0;
			response.HasErrors = false;
			response.Message = "";

		} else {
			response.Data = [parseFloat(authorization.data.balance).toFixed(2)]
			response.ErrorCode = 1;
			response.HasErrors = false;
			response.Message = "";
		}

		return res.status(200).json({ d: response });



	} catch (error) {
		console.error("catch error CancelTransaction xpg ", error);
	}

}

async function xpg_CancelRound(req, res) {

	/*fs.appendFile('CancelRound.json',JSON.stringify(req.body), function (err) {
			  if (err) {
				return console.log('CancelRound--------------------- ',err);
			  }			
		});	*/
	let {
		GameId,
		RoundId,
		Logins,
		OperatorId,
	} = req.body;



	const loginchema = Joi.object({
		Logins: Joi.array().min(1).required(),
		GameId: Joi.number().required(),
		RoundId: Joi.number().required(),
		OperatorId: Joi.number().required(),
	});

	try {
		await loginchema.validate(req.body, {
			//abortEarly: true
			allowUnknown: true
		});
	} catch (error) {
		let response = {};
		response.ErrorCode = "-2";
		response.HasErrors = true;
		response.Message = error.details[0].message;
		return res.status(200).json({ d: response });
		//return apiErrorRes(req, res, error.details[0].message);
	}

	try {

		let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

		let jsonRequest = JSON.stringify(req.body);

		let response = {};

		let jsonLogs = { jsonRequest: jsonRequest, user_id: 0, roundId: RoundId, type: 'CancelRound' };

		let logsInsert = await userService.XPGLogInsert(jsonLogs);


		let insertData = { gameId: GameId, roundId: RoundId, Logins: Logins };

		let updateTransactionID = await userService.xpg_CancelRound(insertData);


		if (updateTransactionID.statusCode === CONSTANTS.SUCCESS) {
			response.ErrorCode = 0;
			response.HasErrors = false;
			response.Message = "";


		}

		return res.status(200).json({ d: response });



	} catch (error) {
		console.error("catch error CancelTransaction xpg ", error);
	}
}

async function xpg_ProcessDebit(req, res) {

	/*fs.appendFile('debit.json',JSON.stringify(req.body), function (err) {
			  if (err) {
				return console.log('debit--------------------- ',err);
			  }			
		});	*/


	let {
		Login,
		OperatorId,
		GameId,
		RoundId,
		TransactionId,
		Amount,
	} = req.body;


	const loginchema = Joi.object({
		Login: Joi.string().required(),
		OperatorId: Joi.number().required().min(1),
		GameId: Joi.number().required(),
		RoundId: Joi.number().required(),
		TransactionId: Joi.number().required(),
		Amount: Joi.number().required(),
	});

	try {
		await loginchema.validate(req.body, {
			allowUnknown: true
		});
	} catch (error) {
		let response = {};
		response.ErrorCode = "-2";
		response.HasErrors = true;
		response.Message = error.details[0].message;
		return res.status(200).json({ d: response });
		//return apiErrorRes(req, res, error.details[0].message);
	}
	try {
		let jsonRequest = JSON.stringify(req.body);
		let user_name = Login;
		let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

		let response = {};

		let authorization = await userService.getLobbyXPGUserAuthorization(user_name);

		if (authorization.statusCode === CONSTANTS.SUCCESS) {
			if (user_name !== authorization.data.user_name || authorization.data.lockUser == 'Y' || authorization.data.closeUser == 'Y') {
				response.ErrorCode = "-10";
				response.HasErrors = true;
				response.Message = 'Player not found in Partner system';
				return res.status(200).json({ d: response });
			}

		} else {
			response.ErrorCode = "-10";
			response.HasErrors = true;
			response.Message = 'Player not found in Partner system';
			return res.status(200).json({ d: response });
		}

		let getSportsUser = await userService.funSportsActiveForUser(CONSTANTS.BETFAIR_SPORT_CASINO_XPG, authorization.data.id);
		if (getSportsUser.statusCode === CONSTANTS.NOT_FOUND) {
			response.ErrorCode = "-10";
			response.HasErrors = true;
			response.Message = 'Player not found in Partner system';
			return res.status(200).json({ d: response });
		}

		if ((authorization.data.balance) < Math.abs(Amount)) {
			response.Data = [parseFloat(authorization.data.balance).toFixed(2)]
			response.ErrorCode = "-20";
			response.HasErrors = true;
			response.Message = 'Player balance is insufficient to place bet';
			return res.status(200).json({ d: response });
		}


		let data = { liability: Amount, gameId: GameId, usergetId: authorization.data.id, roundId: RoundId, ip_address: ip_address, TransactionId: TransactionId, is_type: 'DEBIT' };

		let jsonLogs = { jsonRequest: jsonRequest, user_id: authorization.data.id, roundId: RoundId, type: 'PROCESSDEBIT', ip_address: ip_address };

		let logsInsert = await userService.XPGLogInsert(jsonLogs);

		let matchInsert = await userService.XPGInsertMatch(jsonLogs);

		let userCheckSameRoudIdCoditionXPG = await userService.getSameRoundConditionXPGPROCESS(data);

		if (userCheckSameRoudIdCoditionXPG.statusCode === CONSTANTS.SUCCESS) {

			if (Math.abs(userCheckSameRoudIdCoditionXPG.data.liability) == Amount) {
				response.Data = [parseFloat(authorization.data.balance).toFixed(2)];
				response.ErrorCode = "21";
				response.HasErrors = true;
				response.Message = "Transaction has already been recorded in Partner server";
				return res.status(200).json({ d: response });
			} else {
				response.Data = [parseFloat(authorization.data.balance).toFixed(2)];
				response.ErrorCode = "-22";
				response.HasErrors = true;
				response.Message = "Transaction for specified RoundID and Username already recorded for different amount";
				return res.status(200).json({ d: response });
			}

		}

		let updateUserBalance = await userService.updateLobbyXPGP_ROCESS_UserBalance(data);

		//await delay((3) * 1000);

		if (updateUserBalance.statusCode === CONSTANTS.SUCCESS) {

			let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(authorization.data.id);

			response.Data = [parseFloat(balanceAfterBetPlace.data.balance).toFixed(2)];
			response.ErrorCode = 0;
			response.HasErrors = false;
			response.Message = "";
			return res.status(200).json({ d: response });


		} else {
			response.ErrorCode = [parseFloat(authorization.data.balance).toFixed(2)];;
			response.HasErrors = true;
			response.Message = "";
			return res.status(200).json({ d: response });
		}
		//console.log('response-------------------------------xpg debit -----------------------------',{d:response});
		//return res.status(200).json({d:response});

	} catch (error) {
		console.error("catch error debit xpg_ProcessDebit ", error);
	}
}


async function xpg_ProcessCredit(req, res) {

	/*fs.appendFile('credit.json',JSON.stringify(req.body), function (err) {
			  if (err) {
				return console.log('credit--------------------- ',err);
			  }			
		});	*/

	let {
		Login,
		OperatorId,
		GameId,
		RoundId,
		TransactionId,
		Amount,
	} = req.body;


	const loginchema = Joi.object({
		Login: Joi.string().required(),
		OperatorId: Joi.number().required().min(1),
		GameId: Joi.number().required(),
		RoundId: Joi.number().required(),
		Amount: Joi.number().required(),
		TransactionId: Joi.string().required(),
	});


	try {
		await loginchema.validate(req.body, {
			//abortEarly: true
			allowUnknown: true
		});
	} catch (error) {
		let response = {};
		response.ErrorCode = "-2";
		response.HasErrors = true;
		response.Message = error.details[0].message;
		return res.status(200).json({ d: response });
	}
	try {

		let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

		let jsonRequest = JSON.stringify(req.body);

		let user_name = Login;

		let response = {};

		let authorization = await userService.getLobbyXPGUserAuthorization(user_name);

		if (authorization.statusCode === CONSTANTS.SUCCESS) {
			if (user_name !== authorization.data.user_name || authorization.data.lockUser == 'Y' || authorization.data.closeUser == 'Y') {
				response.ErrorCode = "-10";
				response.HasErrors = true;
				response.Message = 'Player not found in Partner system';
				return res.status(200).json({ d: response });

			}
		}
		else {

			response.ErrorCode = "-10";
			response.HasErrors = true;
			response.Message = 'Player not found in Partner system';
			return res.status(200).json({ d: response });
		}

		let data = { user_id: authorization.data.id, roundId: RoundId, credit_type: 'PROCESSCREDIT' };

		let userCheckSameRoudIdCREDIT_XPG = await userService.getSameRoundCREDIT_XPG(data);

		if (userCheckSameRoudIdCREDIT_XPG.statusCode === CONSTANTS.SUCCESS) {
			if (JSON.parse(userCheckSameRoudIdCREDIT_XPG.data.request_json).TransactionId == TransactionId) {
				response.Data = [parseFloat(authorization.data.balance).toFixed(2)];
				response.ErrorCode = "21";
				response.HasErrors = true;
				response.Message = "Transaction has already been recorded in Partner server";
				return res.status(200).json({ d: response });
			}
		}

		let jsonLogs = { jsonRequest: jsonRequest, user_id: authorization.data.id, roundId: RoundId, type: 'PROCESSCREDIT' };

		let logsInsert = await userService.XPGLogInsert(jsonLogs);


		let insertData = { gameId: GameId, user_id: authorization.data.id, roundId: RoundId, profit_loss: Amount, ip_address: ip_address, TransactionId: TransactionId, is_type: 'DEBIT', is_type_update: 'CREDIT' };

		let updateTransactionID = await userService.XPG_PROCESS_AccountStatement(insertData);

		if (updateTransactionID.statusCode === CONSTANTS.SUCCESS) {


			let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(authorization.data.id);

			response.Data = [parseFloat(balanceAfterBetPlace.data.balance).toFixed(2)];
			response.ErrorCode = 0;
			response.HasErrors = false;
			response.Message = "";


		} else {
			response.ErrorCode = [parseFloat(authorization.data.balance).toFixed(2)];;
			response.HasErrors = true;
			response.Message = "";
		}

		return res.status(200).json({ d: response });



	} catch (error) {
		console.error("catch xpg_PerformCREDIT xpg ", error);
	}
}

async function xpg_PerformRefund(req, res) {

	let {
		Login,
		OperatorId,
		GameId,
		RoundId,
		TransactionId,
		Amount,
	} = req.body;

	const loginchema = Joi.object({
		Login: Joi.string().required(),
		OperatorId: Joi.number().required().min(1),
		TransactionId: Joi.string().required(),
		GameId: Joi.number().required(),
		RoundId: Joi.number().required(),
		Amount: Joi.number().required(),
	});


	try {
		await loginchema.validate(req.body, {
			//abortEarly: true
			allowUnknown: true
		});
	} catch (error) {
		let response = {};
		response.ErrorCode = "-2";
		response.HasErrors = true;
		response.Message = error.details[0].message;
		return res.status(200).json({ d: response });
	}

	try {

		let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

		let jsonRequest = JSON.stringify(req.body);

		let user_name = Login;

		let response = {};

		let authorization = await userService.getLobbyXPGUserAuthorization(user_name);


		if (authorization.statusCode === CONSTANTS.SUCCESS) {
			if (user_name !== authorization.data.user_name || authorization.data.lockUser == 'Y' || authorization.data.closeUser == 'Y') {
				response.ErrorCode = "-10";
				response.HasErrors = true;
				response.Message = 'Player not found in Partner system';
				return res.status(200).json({ d: response });

			}
		}
		else {

			response.ErrorCode = "-10";
			response.HasErrors = true;
			response.Message = 'Player not found in Partner system';
			return res.status(200).json({ d: response });
		}

		let sameRound = { user_id: authorization.data.id, roundId: RoundId, is_type: 'PERFORMREFUND', TransactionId: TransactionId, GameId: GameId };

		let userCheckSameRoudIdCREDIT_XPG = await userService.getSameRoundPerformRefund_XPG(sameRound);

		if (userCheckSameRoudIdCREDIT_XPG.statusCode === CONSTANTS.SUCCESS) {

			response.Data = [parseFloat(authorization.data.balance).toFixed(2)];
			response.ErrorCode = "21";
			response.HasErrors = true;
			response.Message = "Transaction has already been recorded in Partner server";
			return res.status(200).json({ d: response });
		}



		let data = { user_id: authorization.data.id, roundId: RoundId, credit_type: 'PERFORMREFUND' };

		let sameTransactionCancelAgain = await userService.getSameRoundCREDIT_XPG(data);

		if (sameTransactionCancelAgain.statusCode === CONSTANTS.SUCCESS) {

			response.Data = [parseFloat(authorization.data.balance).toFixed(2)];
			response.ErrorCode = "21";
			response.HasErrors = true;
			response.Message = "Transaction has already been recorded in Partner server";
			return res.status(200).json({ d: response });
		}

		let jsonLogs = { jsonRequest: jsonRequest, user_id: authorization.data.id, roundId: RoundId, type: 'PERFORMREFUND' };

		let logsInsert = await userService.XPGLogInsert(jsonLogs);

		let dataDebit = { user_id: authorization.data.id, GameId: GameId, roundId: RoundId, TransactionId: TransactionId, is_type: 'DEBIT' };

		let userCheckSameRoudIdDEBIT_XPG = await userService.getSameRoundPROCESS_DEBIT_XPG(dataDebit);

		if (userCheckSameRoudIdDEBIT_XPG.statusCode === CONSTANTS.NOT_FOUND) {
			response.Data = [parseFloat(authorization.data.balance).toFixed(2)];
			response.ErrorCode = "-30";
			response.HasErrors = true;
			response.Message = "No debit record is exist";
			return res.status(200).json({ d: response });
		}
		TransactionId = TransactionId.replace("Refund", "");
		let insertData = { gameId: GameId, user_id: authorization.data.id, roundId: RoundId, TransactionId: TransactionId, is_type_update: 'PERFORMREFUND', Amount: Amount, is_type: 'DEBIT' };

		let updateTransactionID = await userService.xpg_PerformRefund(insertData);

		if (updateTransactionID.statusCode === CONSTANTS.SUCCESS) {


			let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(authorization.data.id);

			response.Data = [parseFloat(balanceAfterBetPlace.data.balance).toFixed(2)];
			response.ErrorCode = 0;
			response.HasErrors = false;
			response.Message = "";


		} else {
			response.Data = [parseFloat(authorization.data.balance).toFixed(2)]
			response.ErrorCode = "-1";
			response.HasErrors = true;
			response.Message = "Unknown error";
		}


		return res.status(200).json({ d: response });



	} catch (error) {
		console.error("catch error xpg_PerformRefund xpg ", error);
	}

}



async function fun_LobbyState(req, res) {
	let { id } = req.headers;
	let {
		Page,
		MerchantID
	} = req.body;
	const profilechema = Joi.object({
		Page: Joi.string().required(),
		MerchantID: Joi.string().required(),

	});
	try {
		await profilechema.validate(req.body, {
			abortEarly: true
		});
	} catch (error) {
		return apiErrorRes(req, res, error.details[0].message);
	}

	let getUserByid = await userService.getUserByUserId(id);
	/*let amount = (getUserByid.data.balance).toFixed(2);
	let amtTID = id+'____'+Date.now();
	await updateUserFunBalance();
	let depositAmtHash = 'Balance/Set/'+settings.FUN_WHITE_LIST_IP+'/'+amtTID+'/'+settings.FUN_API_KEY+'/'+MerchantID+'/'+amount+'/'+getUserByid.data.user_name+'/'+settings.FUN_OPERATOR_CURRENCY+'/'+settings.FUN_API_PASSWORD;
	let depositHashKey=globalFunction.convertFUNStringmd5(depositAmtHash);
	let depositAmt = {	Login:getUserByid.data.user_name,
						TID:amtTID,							
						System:MerchantID,							
						Amount:amount,
						Hash:depositHashKey,
						Currency:settings.FUN_OPERATOR_CURRENCY
					};
	
	let depositAmtPramInAPI =globalFunction.convertXpgString(depositAmt);
	let userRegisterResponse = await axios.get(settings.FUN_DEPOSITE_AMOUNT+depositAmtPramInAPI);

	console.log(getUserByid.data.balance + ' ---------------------------------------------'  +userRegisterResponse.data);*/


	let lobbyTID = id + '____' + Date.now();
	let send_json = { operatorID: settings.FUN_OPERATOR_ID, username: getUserByid.data.user_name, firstName: getUserByid.data.user_name };
	let Password = globalFunction.convertXpgStringmd5(send_json);


	let lobbyStateHash = 'User/AuthHTML/' + settings.FUN_WHITE_LIST_IP + '/' + lobbyTID + '/' + settings.FUN_API_KEY + '/' + getUserByid.data.user_name + '/' + Password + '/' + MerchantID + '/' + settings.FUN_API_PASSWORD;
	let registerHashKey = globalFunction.convertFUNStringmd5(lobbyStateHash);

	let lobbyReadyPram = {
		Login: getUserByid.data.user_name,
		Password: Password, TID: lobbyTID,
		System: MerchantID,
		Page: Page,
		Hash: registerHashKey,
		Language: settings.FUN_OPERATOR_LANGUAGE,
		UserIP: settings.FUN_WHITE_LIST_IP
	};

	let lobbyReadyPramInAPI = globalFunction.convertXpgString(lobbyReadyPram);
	console.log(' -----------------------------------------lobby state --------------- ',settings.FUN_READY_LOBBY_STATE_URL + lobbyReadyPramInAPI);

	let userRegisterLobbyResponse = await axios.get(settings.FUN_READY_LOBBY_STATE_URL + lobbyReadyPramInAPI);

	if (userRegisterLobbyResponse.status != 200) {
		return apiErrorRes(req, res, lobby_url.data);
	}

	let lobby = userRegisterLobbyResponse.data;
	//lobby = lobby.substring( 0, lobby.indexOf(","));
	//lobby.substring(lobby.indexOf(',')+1);
	lobby = lobby.replace('1,', '');
	lobby = lobby.trim();
	//lobby = lobby.split(',');
	//lobby = lobby[1];

	console.log(' --- lobby ------------------------ ',lobby);
	return apiSuccessRes(req, res, 'Success.', lobby);
}

async function funLobbyCallBackUrl(req, res) {

	/*fs.appendFile('debit.json',JSON.stringify(req.body), function (err) {
		  if (err) {
		   // return console.log('debit--------------------- ',err);
		  }			
	});	*/

	//console.log('debit--------------------- ', JSON.stringify(req.body))

	let {
		type,
		userid,
		currency,
		hmac,
	} = req.body;

	const loginchema = Joi.object({
		type: Joi.string().required(),
		userid: Joi.string().required(),
		currency: Joi.string().required(),
		hmac: Joi.string().required(),
	});


	try {
		await loginchema.validate(req.body, {
			allowUnknown: true
		});
	} catch (error) {
		let response = {};
		response.status = "OK";
		response.HasErrors = true;
		response.Message = error.details[0].message;
		return res.status(200).json(response);
	}

	try {
		let jsonRequest = req.body; // JSON.stringify(req.body);
		let jsonRequestBODY = req.body; // JSON.stringify(req.body);
		let response = {};

		let getUserData = await userService.getLobbyXPGUserAuthorization(userid);
		if (getUserData.statusCode === CONSTANTS.SUCCESS) {
			jsonRequestBODY.currentBalance = parseFloat(getUserData.data.balance);
			let getSportsUser = await userService.funSportsActiveForUser(CONSTANTS.BETFAIR_SPORT_CASINO_FUN, getUserData.data.id);
			console.log('getSportsUser ------------------------------------------------------------------------- ', getSportsUser);
			if (getSportsUser.statusCode === CONSTANTS.NOT_FOUND) {
				response.error = "Invalid userid";
				response.hmac = globalFunction.GenerateFUN_HashKey(response);
				return res.status(200).json(response);
			}
		} else {

			response.error = "Invalid userid";
			response.hmac = globalFunction.GenerateFUN_HashKey(response);
		}


		let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
		if (type === 'ping') {
			response.hmac = globalFunction.GenerateFUN_HashKey(response);
			let jsonLogs = { jsonRequest: JSON.stringify(jsonRequestBODY), user_id: 0, roundId: 0, type: 'PING' };
			await userService.FUNLogInsert(jsonLogs);
		}

		/* Return Balance Start */
		if (type === 'balance') {
			let userDetailByUserName = await userService.getLobbyXPGUserAuthorization(userid);
			if (userDetailByUserName.statusCode === CONSTANTS.SUCCESS) {
				jsonRequestBODY.currentBalance = parseFloat(userDetailByUserName.data.balance);
				if (currency === settings.FUN_OPERATOR_CURRENCY) {
					response.status = 'OK';
					response.balance = (userDetailByUserName.data.balance).toFixed(2);
					response.hmac = globalFunction.GenerateFUN_HashKey(response);

					let jsonLogs = { jsonRequest: JSON.stringify(jsonRequestBODY), user_id: userDetailByUserName.data.id, roundId: 0, type: 'BALANCE' };
					await userService.FUNLogInsert(jsonLogs);

				} else {
					response.error = "Invalid currency";
					response.hmac = globalFunction.GenerateFUN_HashKey(response);
				}
			}
			else {

				response.error = "Invalid userid";
				response.hmac = globalFunction.GenerateFUN_HashKey(response);
			}
		}
		/* Return Balance close */
		/* Return debit start */
		if (type === 'debit') {

			let userDetailByUserName = await userService.getLobbyXPGUserAuthorization(userid);
			if (userDetailByUserName.statusCode === CONSTANTS.SUCCESS) {
				jsonRequestBODY.currentBalance = parseFloat(userDetailByUserName.data.balance);
				jsonRequestBODY.updateBalance = parseFloat(userDetailByUserName.data.balance) - parseFloat(jsonRequest.amount);
				let jsonLogs = { jsonRequest: JSON.stringify(jsonRequestBODY), user_id: userDetailByUserName.data.id, roundId: 0, type: 'DEBIT' };
				await userService.FUNLogInsert(jsonLogs);
				if (currency === settings.FUN_OPERATOR_CURRENCY) {
					let balance = parseFloat(userDetailByUserName.data.balance).toFixed(2);
					let txnId = jsonRequest.tid;
					let MatchId = jsonRequest.i_gameid;
					let MarketId = jsonRequest.i_actionid.slice(1); // jsonRequest.i_gameid;
					let Amount = jsonRequest.amount;
					let game_extra = jsonRequest.game_extra;
					let userId = userDetailByUserName.data.id;
					if (balance > 0) {
						if (parseFloat(balance) >= parseFloat(Amount)) {
							let sameRoundGetRecord = await userService.getSameRoundFUN(txnId);

							if (sameRoundGetRecord.statusCode == CONSTANTS.SUCCESS && sameRoundGetRecord.data.length > 0 && Math.abs(sameRoundGetRecord.data.liability) == Amount && sameRoundGetRecord.data.is_type == 'DEBIT') {
								let updateBalance = 0;
								updateBalance -= Amount;
								let sameRoundGetRecord = await userService.userFUNGameUpdateAmout(updateBalance, userId, ip_address, game_extra);
								let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(userId);

								response.status = "OK";
								response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
								response.tid = txnId;
								response.hmac = globalFunction.GenerateFUN_HashKey(response);

							} else if (sameRoundGetRecord.statusCode == CONSTANTS.SUCCESS && sameRoundGetRecord.data.length > 0 && Math.abs(sameRoundGetRecord.data.liability) != Amount) {

								let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(authorization.data.id);
								response.error = "Transaction Failed";
								response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
								response.hmac = globalFunction.GenerateFUN_HashKey(response);

							} else {

								let inserMatchJson = { user_id: userDetailByUserName.data.id, MatchId: MatchId, MarketId: MarketId, type: 'DEBIT', ip_address: ip_address };
								let matchInsert = await userService.FUNInsertMatch(inserMatchJson);

								let data = { liability: Amount, gameId: 0, usergetId: userDetailByUserName.data.id, MatchId: MatchId, MarketId: MarketId, ip_address: ip_address, Sequence: 1, is_type: 'DEBIT', game_extra: game_extra, transaction_id: txnId };
								let updateUserBalance = await userService.updateLobbyFUNUserBalance(data);
								if (updateUserBalance.statusCode === CONSTANTS.SUCCESS) {
									let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(userId);
									response.status = "OK";
									response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
									response.tid = txnId;
									response.hmac = globalFunction.GenerateFUN_HashKey(response);
								}
							}
						}
						else {
							response.error = "Invalid parameters";
							response.hmac = globalFunction.GenerateFUN_HashKey(response);
							response.balance = balance;
						}
					}
					else {
						response.error = "Invalid parameters";
						response.hmac = globalFunction.GenerateFUN_HashKey(response);
						response.balance = balance;
					}

				} else {
					response.error = "Invalid currency";
					response.hmac = globalFunction.GenerateFUN_HashKey(response);
				}
			}
			else {

				response.error = "Invalid userid";
				response.hmac = globalFunction.GenerateFUN_HashKey(response);
				let jsonLogs = { jsonRequest: JSON.stringify(req.body), user_id: 0, roundId: 0, type: 'DEBIT' };
				await userService.FUNLogInsert(jsonLogs);
			}

		}

		/* Return CREDIT start  */
		if (type === 'credit') {

			let userDetailByUserName = await userService.getLobbyXPGUserAuthorization(userid);
			if (userDetailByUserName.statusCode === CONSTANTS.SUCCESS) {
				jsonRequestBODY.currentBalance = parseFloat(userDetailByUserName.data.balance);
				jsonRequestBODY.updateBalance = parseFloat(userDetailByUserName.data.balance) + parseFloat(jsonRequest.amount);

				let jsonLogs = { jsonRequest: JSON.stringify(jsonRequestBODY), user_id: userDetailByUserName.data.id, roundId: jsonRequest.i_gameid, type: 'credit' };
				await userService.FUNLogInsert(jsonLogs);
				if (currency === settings.FUN_OPERATOR_CURRENCY) {
					let balance = parseFloat(userDetailByUserName.data.balance).toFixed(2);
					let txnId = jsonRequest.tid;
					//let roundId 		= jsonRequest.i_gameid;
					let MatchId = jsonRequest.i_gameid;
					let MarketId = jsonRequest.i_actionid.slice(1);
					let Amount = jsonRequest.amount;
					let game_extra = jsonRequest.game_extra;
					let userId = userDetailByUserName.data.id;
					/*if(balance > 0)
					{*/
					let sameRoundGetRecord = await userService.getSameRoundFUN(txnId);

					if (sameRoundGetRecord.statusCode == CONSTANTS.SERVER_ERROR) {
						let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(userId);
						response.status = "OK";
						response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
						response.tid = txnId;
						response.hmac = globalFunction.GenerateFUN_HashKey(response);
						return res.status(200).json(response);
					}

					if (sameRoundGetRecord.statusCode == CONSTANTS.SUCCESS && sameRoundGetRecord.data.length > 0 && Math.abs(sameRoundGetRecord.data.liability) == Amount && sameRoundGetRecord.data.is_type == 'credit') {

						let sameRoundGetRecord = await userService.userFUNGameUpdateAmout(Amount, userId, ip_address, game_extra);
						let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(userId);
						response.status = "OK";
						response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
						response.tid = txnId;
						response.hmac = globalFunction.GenerateFUN_HashKey(response);

					} else if (sameRoundGetRecord.statusCode == CONSTANTS.SUCCESS && sameRoundGetRecord.data.length > 0 && Math.abs(sameRoundGetRecord.data.liability) != Amount) {

						let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(authorization.data.id);
						response.error = "Transaction Failed";
						response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
						response.hmac = globalFunction.GenerateFUN_HashKey(response);

					} else if (sameRoundGetRecord.statusCode == CONSTANTS.SUCCESS && sameRoundGetRecord.data.length > 0 && sameRoundGetRecord.data.is_type != type) {

						let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(authorization.data.id);
						response.error = "Transaction Failed";
						response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
						response.hmac = globalFunction.GenerateFUN_HashKey(response);

					} else {

						let data = { profit_loss: Amount, gameId: 0, user_id: userDetailByUserName.data.id, MatchId: MatchId, MarketId: MarketId, ip_address: ip_address, Sequence: 0, is_type: 'DEBIT', game_extra: game_extra, is_type_update: 'credit', transaction_id: txnId };
						//let insertData= {gameId:GameId,user_id:authorization.data.id,roundId:RoundId,profit_loss:Amount,ip_address:ip_address,is_type:'DEBIT',is_type_update:'credit'};
						let updateUserBalance = await userService.updateLobbyFUNCreditUserBalance(data);
						if (updateUserBalance.statusCode === CONSTANTS.SUCCESS) {
							let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(userId);
							response.status = "OK";
							response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
							response.tid = txnId;
							response.hmac = globalFunction.GenerateFUN_HashKey(response);
						}
					}

					/*}else{
						response.error 		=   "Invalid parameters";
						response.hmac 		=	globalFunction.GenerateFUN_HashKey(response);
					}*/

				} else {
					response.error = "Invalid currency";
					response.hmac = globalFunction.GenerateFUN_HashKey(response);
				}

			}
			else {

				response.error = "Invalid userid";
				response.hmac = globalFunction.GenerateFUN_HashKey(response);
				let jsonLogs = { jsonRequest: JSON.stringify(req.body), user_id: 0, roundId: 0, type: 'credit' };
				await userService.FUNLogInsert(jsonLogs);
			}

		}
		/* Return CREDIT close  */
		console.log('response ----------------- ', response);
		return res.status(200).json(response);
	} catch (error) {
		console.log('funlobbycallbackUrl Error ------------ ', error);
	}
	/* Return debit close */
	/*fs.appendFile('debit.json',JSON.stringify(req.body), function (err) {
	  if (err) {
	   // return console.log('debit--------------------- ',err);
	  }			
	});	*/
}
function randomString(length) {
	var result = '';
	var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var charactersLength = characters.length;
	for (var i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() *
			charactersLength));
	}
	return result;
}

async function slotegratorCallBackUrl(req, res) {
	 let {
		action,
		player_id, 
		currency,
	} = req.body;

	const loginchema = Joi.object({
		action: Joi.string().required(),
		player_id: Joi.string().required(), 
	});


	try {
		await loginchema.validate(req.body, {
			allowUnknown: true
		});
	} catch (error) {
		let response = {};
		response.error_code = "INTERNAL_ERROR";
		response.error_description = "Player not found!";
		return res.status(200).json(response);
	}
	try {
			let jsonRequest = req.body;	
			//console.log('jsonRequest --------- ',jsonRequest);	
			let jsonRequestBODY = req.body; 
			let response = {};
			let userid = player_id
			let getUserData = await userService.getLobbyXPGUserAuthorization(userid);
			if (getUserData.statusCode === CONSTANTS.SUCCESS) {
				jsonRequestBODY.currentBalance = parseFloat(getUserData.data.balance);
				let getSportsUser = await userService.funSportsActiveForUser(CONSTANTS.BETFAIR_SPORT_CASINO_SLOTEGRATOR, getUserData.data.id);
				if (getSportsUser.statusCode === CONSTANTS.NOT_FOUND) {
					response.error_code = "INTERNAL_ERROR";
					response.error_description = "Player not found!";//globalFunction.GenerateFUN_HashKey(response);
					//console.log('response ---------- ',response);
					return res.status(200).json(response);
				}
			} else {
				response.error_code = "INTERNAL_ERROR";
				response.error_description = "Player not found!"; 
			}

			let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
			if (action === 'balance') {
				let userDetailByUserName = await userService.getLobbyXPGUserAuthorization(userid);
				if (userDetailByUserName.statusCode === CONSTANTS.SUCCESS) {
					jsonRequestBODY.currentBalance = parseFloat(userDetailByUserName.data.balance);
					if (currency === settings.SLOTEGRATOR_INTEGRATION_CURRENCY) {
						response.balance = (userDetailByUserName.data.balance).toFixed(2);
						let jsonLogs = { jsonRequest: JSON.stringify(jsonRequestBODY), user_id: userDetailByUserName.data.id, roundId: 0, type: 'BALANCE' };
						await userService.slotegrator_LogInsert(jsonLogs);
					} else {
						response.error_code = "INTERNAL_ERROR";
						response.error_description = "Player not found!";
					}
				}
				else {
					response.error_code = "INTERNAL_ERROR";
					response.error_description = "Player not found!";
				}
			}
		/* Return debit start */
		if (action === 'bet') {

			let userDetailByUserName = await userService.getLobbyXPGUserAuthorization(userid);
			if (userDetailByUserName.statusCode === CONSTANTS.SUCCESS) {
				jsonRequestBODY.currentBalance = parseFloat(userDetailByUserName.data.balance);
				jsonRequestBODY.updateBalance = parseFloat(userDetailByUserName.data.balance) - parseFloat(jsonRequest.amount);
				let jsonLogs = { jsonRequest: JSON.stringify(jsonRequestBODY), user_id: userDetailByUserName.data.id, roundId: 0, type: 'DEBIT' };
				await userService.slotegrator_LogInsert(jsonLogs);
				if (currency === settings.SLOTEGRATOR_INTEGRATION_CURRENCY) {
					let balance = parseFloat(userDetailByUserName.data.balance).toFixed(2);
					let txnId = jsonRequest.transaction_id;
					let MatchId = jsonRequest.round_id;
					let MarketId = jsonRequest.round_id;
					let Amount = jsonRequest.amount;
					//let game_extra = jsonRequest.game_extra;
					let userId = userDetailByUserName.data.id;
					if (balance > 0) {
						if (parseFloat(balance) >= parseFloat(Amount)) {
							let sameRoundGetRecord = await userService.getSameRound_slotegrator(txnId);

							if (sameRoundGetRecord.statusCode == CONSTANTS.SUCCESS && sameRoundGetRecord.data.length > 0 && Math.abs(sameRoundGetRecord.data.liability) == Amount && sameRoundGetRecord.data.is_type == 'DEBIT') {
								let updateBalance = 0;
								updateBalance -= Amount;
								let sameRoundGetRecord = await userService.user_slotegrator_GameUpdateAmout(updateBalance, userId, ip_address, game_extra);
								let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(userId);								 
								response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);							 
								response.transaction_id =txnId+""+sameRoundGetRecord.data.id;								 

							} else if (sameRoundGetRecord.statusCode == CONSTANTS.SUCCESS && sameRoundGetRecord.data.length > 0 && Math.abs(sameRoundGetRecord.data.liability) != Amount) {

								let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(authorization.data.id);
								response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
								response.transaction_id = txnId+""+sameRoundGetRecord.data.id;
								/*response.error = "Transaction Failed";
								response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
								response.hmac = globalFunction.GenerateFUN_HashKey(response);*/

							} else {

								let inserMatchJson = { user_id: userDetailByUserName.data.id, MatchId: MatchId, MarketId: MarketId, type: 'DEBIT', ip_address: ip_address };
								let matchInsert = await userService.slotegrator_InsertMatch(inserMatchJson);

								let data = { liability: Amount, gameId: 0, usergetId: userDetailByUserName.data.id, MatchId: MatchId, MarketId: MarketId, ip_address: ip_address, Sequence: 1, is_type: 'DEBIT', game_extra: 0, transaction_id: txnId };
								
								let updateUserBalance = await userService.updateLobby_slotegrator_UserBalance(data);
								if (updateUserBalance.statusCode === CONSTANTS.SUCCESS) {
									let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(userId);
								 
									response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
									response.transaction_id = txnId+""+updateUserBalance.data.id;
								 
								 
								}
							}
						}
						else {
							//response.error = "Invalid parameters";
							//response.hmac = globalFunction.GenerateFUN_HashKey(response);
							response.balance = balance;
							response.transaction_id = Math.random();
						}
					}
					else {
						response.balance = balance;
						response.transaction_id = Math.random();
						/*response.error_code = "INTERNAL_ERROR";
						response.error_description = "Player not found!";*/
					}

				} else {
					response.balance = balance;
					response.transaction_id = Math.random();

					/*response.error_code = "INTERNAL_ERROR";
					response.error_description = "Player not found!";*/
				}
			}
			else {
				response.balance = balance;
				response.transaction_id = Math.random();
			/*	response.error_code = "INTERNAL_ERROR";
				response.error_description = "Player not found!";*/
				let jsonLogs = { jsonRequest: JSON.stringify(req.body), user_id: 0, roundId: 0, type: 'DEBIT' };
				await userService.FUNLogInsert(jsonLogs);
			}

		}

		/* Return CREDIT start  */
		if (action === 'win') {

			let userDetailByUserName = await userService.getLobbyXPGUserAuthorization(userid);
			if (userDetailByUserName.statusCode === CONSTANTS.SUCCESS) {
				jsonRequestBODY.currentBalance = parseFloat(userDetailByUserName.data.balance);
				jsonRequestBODY.updateBalance = parseFloat(userDetailByUserName.data.balance) + parseFloat(jsonRequest.amount);

				let jsonLogs = { jsonRequest: JSON.stringify(jsonRequestBODY), user_id: userDetailByUserName.data.id, roundId: jsonRequest.round_id, type: 'credit' };
				await userService.slotegrator_LogInsert(jsonLogs);
				if (currency === settings.SLOTEGRATOR_INTEGRATION_CURRENCY) {
					let balance = parseFloat(userDetailByUserName.data.balance).toFixed(2);
					let txnId = jsonRequest.transaction_id;
					let MatchId = jsonRequest.round_id;
					let MarketId = jsonRequest.round_id;
					let Amount = jsonRequest.amount;
					let game_extra = 0;
					let userId = userDetailByUserName.data.id;
					
					let sameRoundGetRecord = await userService.getSameRound_slotegrator(txnId);

					if (sameRoundGetRecord.statusCode == CONSTANTS.SERVER_ERROR) {
						let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(userId);
						 
						response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
						response.transaction_id = Math.random();
						//response.hmac = globalFunction.GenerateFUN_HashKey(response);
						return res.status(200).json(response);
					}

					if (sameRoundGetRecord.statusCode == CONSTANTS.SUCCESS && sameRoundGetRecord.data.length > 0 && Math.abs(sameRoundGetRecord.data.liability) == Amount && sameRoundGetRecord.data.is_type == 'credit') {

						let sameRoundGetRecord = await userService.user_slotegrator_GameUpdateAmout(Amount, userId, ip_address, game_extra);
						let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(userId);

						response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
						response.transaction_id =  txnId+""+sameRoundGetRecord.data.id;
						//response.hmac = globalFunction.GenerateFUN_HashKey(response);

					} else if (sameRoundGetRecord.statusCode == CONSTANTS.SUCCESS && sameRoundGetRecord.data.length > 0 && Math.abs(sameRoundGetRecord.data.liability) != Amount) {

						let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(authorization.data.id);
  
  						response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
						response.transaction_id =  txnId+""+sameRoundGetRecord.data.id;

					} else if (sameRoundGetRecord.statusCode == CONSTANTS.SUCCESS && sameRoundGetRecord.data.length > 0 && sameRoundGetRecord.data.is_type != type) {

						let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(authorization.data.id);
						response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
						response.transaction_id =  txnId+""+sameRoundGetRecord.data.id;

					} else {

						let data = { profit_loss: Amount, gameId: 0, user_id: userDetailByUserName.data.id, MatchId: MatchId, MarketId: MarketId, ip_address: ip_address, Sequence: 0, is_type: 'DEBIT', game_extra: game_extra, is_type_update: 'credit', transaction_id: txnId };
					 
						let updateUserBalance = await userService.updateLobby_slotegrator_CreditUserBalance(data);
						if (updateUserBalance.statusCode === CONSTANTS.SUCCESS) {
							let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(userId);
 
 							response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
							response.transaction_id = Math.random();
							//response.hmac = globalFunction.GenerateFUN_HashKey(response);
						}
					} 
				} else {
					response.balance = parseFloat(userDetailByUserName.data.balance).toFixed(2);
					response.transaction_id =  Math.random();
				}

			}
			else {
				response.balance = parseFloat(userDetailByUserName.data.balance).toFixed(2);
				response.transaction_id =  Math.random();
				
				let jsonLogs = { jsonRequest: JSON.stringify(jsonRequestBODY), user_id: 0, roundId: 0, type: 'credit' };
				await userService.slotegrator_LogInsert(jsonLogs);
			}

		}
		if (action === 'refund') {
			let userDetailByUserName = await userService.getLobbyXPGUserAuthorization(userid);
			if (userDetailByUserName.statusCode === CONSTANTS.SUCCESS) {
				jsonRequestBODY.currentBalance = parseFloat(userDetailByUserName.data.balance);
				jsonRequestBODY.updateBalance = parseFloat(userDetailByUserName.data.balance) + parseFloat(jsonRequest.amount);

				let jsonLogs = { jsonRequest: JSON.stringify(jsonRequestBODY), user_id: userDetailByUserName.data.id, roundId: jsonRequest.round_id, type: 'refund' };
				await userService.slotegrator_LogInsert(jsonLogs);
				if (currency === settings.SLOTEGRATOR_INTEGRATION_CURRENCY) {
					let balance = parseFloat(userDetailByUserName.data.balance).toFixed(2);
					let txnId = jsonRequest.transaction_id;
					let MatchId = jsonRequest.round_id;
					let MarketId = jsonRequest.round_id;
					let Amount = jsonRequest.amount;
					let game_extra = 0;
					let userId = userDetailByUserName.data.id;
					
					let sameRoundGetRecord = await userService.getSameRound_slotegrator(txnId);

					if (sameRoundGetRecord.statusCode == CONSTANTS.SERVER_ERROR) {
						let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(userId);
						 
						response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
						response.transaction_id = Math.random();
						//response.hmac = globalFunction.GenerateFUN_HashKey(response);
						return res.status(200).json(response);
					}
					
					let data = { profit_loss: Amount, gameId: 0, user_id: userDetailByUserName.data.id, MatchId: MatchId, MarketId: MarketId, ip_address: ip_address, Sequence: 0, is_type: 'DEBIT', game_extra: game_extra, is_type_update: 'refund', transaction_id: txnId };
					 
						let updateUserBalance = await userService.updateLobby_slotegrator_refund_UserBalance(data);
						if (updateUserBalance.statusCode === CONSTANTS.SUCCESS) {
							let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(userId);
 
 							response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
							response.transaction_id = Math.random();
							//response.hmac = globalFunction.GenerateFUN_HashKey(response);
						}

					/*if (sameRoundGetRecord.statusCode == CONSTANTS.SUCCESS && sameRoundGetRecord.data.length > 0 && Math.abs(sameRoundGetRecord.data.liability) == Amount && sameRoundGetRecord.data.is_type == 'refund') {

						let sameRoundGetRecord = await userService.user_slotegrator_GameUpdateAmout(Amount, userId, ip_address, game_extra);
						let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(userId);

						response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
						response.transaction_id =  txnId+""+sameRoundGetRecord.data.id;
						//response.hmac = globalFunction.GenerateFUN_HashKey(response);

					} else if (sameRoundGetRecord.statusCode == CONSTANTS.SUCCESS && sameRoundGetRecord.data.length > 0 && Math.abs(sameRoundGetRecord.data.liability) != Amount) {

						let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(authorization.data.id);
  
  						response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
						response.transaction_id =  txnId+""+sameRoundGetRecord.data.id;

					} else if (sameRoundGetRecord.statusCode == CONSTANTS.SUCCESS && sameRoundGetRecord.data.length > 0 && sameRoundGetRecord.data.is_type != type) {

						let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(authorization.data.id);
						response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
						response.transaction_id =  txnId+""+sameRoundGetRecord.data.id;

					} else {

						let data = { profit_loss: Amount, gameId: 0, user_id: userDetailByUserName.data.id, MatchId: MatchId, MarketId: MarketId, ip_address: ip_address, Sequence: 0, is_type: 'DEBIT', game_extra: game_extra, is_type_update: 'refund', transaction_id: txnId };
					 
						let updateUserBalance = await userService.updateLobby_slotegrator_refund_UserBalance(data);
						if (updateUserBalance.statusCode === CONSTANTS.SUCCESS) {
							let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(userId);
 
 							response.balance = parseFloat(balanceAfterBetPlace.data.balance).toFixed(2);
							response.transaction_id = Math.random();
							//response.hmac = globalFunction.GenerateFUN_HashKey(response);
						}
					} */
				} else {
					response.balance = parseFloat(userDetailByUserName.data.balance).toFixed(2);
					response.transaction_id =  Math.random();
				}

			}
			else {
				response.balance = parseFloat(userDetailByUserName.data.balance).toFixed(2);
				response.transaction_id =  Math.random();
				
				let jsonLogs = { jsonRequest: JSON.stringify(jsonRequestBODY), user_id: 0, roundId: 0, type: 'credit' };
				await userService.slotegrator_LogInsert(jsonLogs);
			}
		}
		console.log(response);
		return res.status(200).json(response);
	}catch(error){
		console.log('slotegratorCallBackUrl------------------------- ',error);
	}

}
async function slotegrator_LobbyState(req, res) {
	let { id } = req.headers;
	let {
		game_uuid
	} = req.body;
	const profilechema = Joi.object({
		game_uuid: Joi.string().required()
	});
	try {
		await profilechema.validate(req.body, {
			abortEarly: true
		});
	} catch (error) {
		return apiErrorRes(req, res, error.details[0].message);
	}
	let getUserByid = await userService.getLobbyLotusUserAuthorization(id);

	let nonce_string = globalFunction.generateRandoString(32);
	let timeStamp = globalFunction.currentDateTimeStamp();

	let getString = { 'X-Merchant-Id': settings.SLOTEGRATOR_INTEGRATION_MERCHANT_ID, 'X-Nonce': nonce_string, 'X-Timestamp': timeStamp};

	let lobbyReadyPram = {
		game_uuid: game_uuid,
		player_id: getUserByid.data.user_name,
		player_name: getUserByid.data.user_name,
		currency: settings.SLOTEGRATOR_INTEGRATION_CURRENCY,
		session_id: getUserByid.data.device_id
	};
	let merged = { ...getString, ...lobbyReadyPram };
	const ordered = Object.keys(merged).sort().reduce(
		(obj, key) => {
			obj[key] = merged[key];
			return obj;
		},
		{}
	);

	try {

		let hashGenerator = new URLSearchParams(ordered).toString();		
		let generateHash = globalFunction.GenerateSLOTEGRATOR_HashKey(hashGenerator);
		
		let headers = {};
		headers['X-Merchant-Id'] = settings.SLOTEGRATOR_INTEGRATION_MERCHANT_ID;
		headers['X-Timestamp'] = timeStamp;
		headers['X-Nonce'] = nonce_string;
		headers['X-Sign'] = generateHash;
		headers['content-type'] = 'application/x-www-form-urlencoded;charset=utf-8';
		

		let paramString = new URLSearchParams(lobbyReadyPram).toString();
		let lobby_url = settings.SLOTEGRATOR_INTEGRATION_LOBBY_URL + "games/init";
		//console.log(lobby_url);
		//console.log(headers);
		//console.log(lobbyReadyPram);
		let userRegisterLobbyResponse = await axios({
			'method':'post',
			'url':lobby_url,
			'data':qs.stringify(lobbyReadyPram) ,
			'headers':headers
		});//.post(lobby_url,bodyFormData,{ headers: headers });
			
		if (userRegisterLobbyResponse.status != 200) {
			return apiErrorRes(req, res, lobby_url.data);
		}

		let lobby = userRegisterLobbyResponse.data.url;
		return apiSuccessRes(req, res, 'Success.', lobby);
	} catch (error) {
		console.log('error ----------------------- ', error);
	}

}



async function sloegratorBalance(req, res) {

	fs.appendFile('exposure.json', JSON.stringify(req.body), function (err) {
		if (err) {
			return console.log('debit--------------------- ', err);
		}
	});
	return res.status(200).json();
}

async function sloegratorWin(req, res) {

	fs.appendFile('debit.json', JSON.stringify(req.body), function (err) {
		if (err) {
			return console.log('debit--------------------- ', err);
		}
	});
	return res.status(200).json();
}

async function sloegratorBet(req, res) {

	fs.appendFile('credit.json', JSON.stringify(req.body), function (err) {
		if (err) {
			return console.log('debit--------------------- ', err);
		}
	});
	return res.status(200).json();
}

async function sloegratorRefund(req, res) {

	fs.appendFile('debit.json', JSON.stringify(req.body), function (err) {
		if (err) {
			return console.log('debit--------------------- ', err);
		}
	});
	return res.status(200).json();
}

router.post('/poker/auth', lobbyAuth);
router.post('/poker/exposure', exposure);
router.post('/poker/results', results);
router.post('/v1/ezugi_auth', ezugi_auth);
router.post('/v1/ezugi_debit', ezugi_debit);
router.post('/v1/ezugi_rollback', ezugi_rollback);
router.post('/v1/ezugi_credit', ezugi_credit);
router.post('/v1/PlayerGetBalance', xpg_PlayerGetBalance);
router.post('/v1/PlayerGetBalances', xpg_PlayerGetBalances);
router.post('/v1/Debit', xpg_Debit);
router.post('/v1/Credit', xpg_Credit);
router.post('/v1/CancelTransaction', xpg_CancelTransaction);
router.post('/v1/CancelRound', xpg_CancelRound);

router.post('/v1/ProcessDebit', xpg_ProcessDebit);
router.post('/v1/ProcessCredit', xpg_ProcessCredit);
router.post('/v1/PerformRefund', xpg_PerformRefund);

router.post('/v1/LobbyState', fun_LobbyState);
router.post('/v1/funCallBackUrl', funLobbyCallBackUrl);
router.post('/v1/slotegratorCallBackUrl', slotegratorCallBackUrl);
router.post('/v1/slotegratorLobbyState', slotegrator_LobbyState);

router.post('/v1/Balance', sloegratorBalance);
router.post('/v1/Win', sloegratorWin);
router.post('/v1/Bet', sloegratorBet);
router.post('/v1/Refund', sloegratorRefund);
module.exports = router;