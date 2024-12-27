const express = require('express');
const router = express.Router();
const Joi = require('joi');
const axios = require('axios');
const userCasinoService = require('../services/userCasinoService');
const userService = require('../services/userService');
const settings = require('../../config/settings');
const globalFunction = require('../../utils/globalFunction');
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

async function interNationCasionBalance(req, res) {
    /*fs.appendFile('exposure.json', JSON.stringify(req.body), function (err) {
        if (err) {
            return console.log('debit--------------------- ', err);
        }
    });*/
    //return res.status(200).json();
    let {
        token,
        operatorId,
        userId
    } = req.body;

    const loginchema = Joi.object({
        token: Joi.string().required(),
        operatorId: Joi.string().required(),
        userId: Joi.string().required()
    });
    let response = {};
    try {
        await loginchema.validate(req.body, {
            abortEarly: true,
            allowUnknown: true
        });
    } catch (error) {
        response.status = "OP_INVALID_PARAMS";
        response.balance = parseFloat(0);
        return res.status(200).json(response);
        return apiErrorRes(req, res, error.details[0].message);
    }
    try {
        let jsonRequest = req.body; // JSON.stringify(req.body);
        let jsonRequestBODY = req.body; // JSON.stringify(req.body);


        let getUserData = await userService.getLobbyXPGUserAuthorization(userId);
        if (getUserData.statusCode === CONSTANTS.SUCCESS) {
            jsonRequestBODY.currentBalance = parseFloat(getUserData.data.balance);
            let getSportsUser = await userService.funSportsActiveForUser(CONSTANTS.BETFAIR_SPORT_CASINO_FUN, getUserData.data.id);

            if (getSportsUser.statusCode === CONSTANTS.NOT_FOUND) {
                response.status = "OP_INVALID_GAME";
                response.balance = 0;
                return res.status(200).json(response);
            } else {

                if (getUserData.statusCode === CONSTANTS.SUCCESS) {
                    response.status = 'OP_SUCCESS';
                    response.balance = parseFloat(getUserData.data.balance);
                    console.log('response ------------------------------------------------------------------------- ', response);
                    return res.status(200).json(response);
                } else {
                    response.status = "OP_USER_NOT_FOUND";
                    response.balance = 0;
                    return res.status(200).json(response);
                }
            }
        } else {
            response.status = "OP_USER_NOT_FOUND";
            response.balance = 0;
            return res.status(200).json(response);
        }

    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    /*fs.appendFile('exposure.json', JSON.stringify(req.body), function(err) {
        if (err) {
            return console.log('debit--------------------- ', err);
        }
    });
    return res.status(200).json();*/
}

async function interNationCasionBetRequest(req, res) {

    /*fs.appendFile('debit.json', JSON.stringify(req.body), function (err) {
        if (err) {
            return console.log('debit--------------------- ', err);
        }
    });*/
    //return res.status(200).json();
     console.log('debit--------------------- ', JSON.stringify(req.body));
    let {
        token,
        operatorId,
        userId,
        betType,
        debitAmount,
        gameId,
        reqId,
        roundId,
        transactionId
    } = req.body;

    const loginchema = Joi.object({
        token: Joi.string().required(),
        operatorId: Joi.string().required(),
        userId: Joi.string().required(),
        betType: Joi.string().required(),
        debitAmount: Joi.number().required(),
        gameId: Joi.string().required(),
        reqId: Joi.string().required(),
        roundId: Joi.string().required(),
        transactionId: Joi.string().required()
    });
    let response = {};
    try {
        await loginchema.validate(req.body, {
            abortEarly: true,
            allowUnknown: true
        });
    } catch (error) {
        response.status = "OP_INVALID_PARAMS";
        response.balance = parseFloat(0);
        return res.status(200).json(response);
        return apiErrorRes(req, res, error.details[0].message);
    }

    try {
        let jsonRequest = req.body;
        //let match_id = roundId.replace(".", ""); 
        let match_id = gameId;
        //let match_id = roundId.split(".");
        //match_id = match_id[1]? match_id[1] : roundId;
        //match_id = match_id +""+gameId;
        let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        if (token == '' || operatorId == '' || userId == '' || betType == '' || (debitAmount == '' && debitAmount != 0) || gameId == '' || reqId == '' || roundId == '' || transactionId == '') {
            response.status = "OP_INVALID_PARAMS";
            response.balance = parseFloat(0);
            return res.status(200).json(response);
        }
        if (debitAmount == 0) {
            response.status = "OP_ZERO_DEBIT_AMOUNT";
            response.balance = parseFloat(0);
            return res.status(200).json(response);
        }
        let userDetailByUserName = await userService.getLobbyXPGUserAuthorization(userId);

        if (userDetailByUserName.statusCode === CONSTANTS.SUCCESS) {

            let balance = parseFloat(userDetailByUserName.data.balance).toFixed(2);
            let user_id = userDetailByUserName.data.id;
            let liability = debitAmount;
            let jsonLogs = { request_json: JSON.stringify(req.body), user_id: user_id, betType: betType, debitAmount: debitAmount, gameId: gameId, reqId: reqId, match_id: match_id, roundId: roundId, transactionId: transactionId, type: 'DEBIT' };

            await userCasinoService.casinoLogInsert(jsonLogs);

            let gameIdCheck = await userCasinoService.getGameId(gameId);

            if (gameIdCheck.statusCode === CONSTANTS.NOT_FOUND) {
                response.status = "OP_INVALID_GAME";
                response.balance = parseFloat(balance);
                return res.status(200).json(response);
            }

            let transactionIdCheck = await userCasinoService.getTransationId(jsonLogs);

            if (transactionIdCheck.statusCode === CONSTANTS.SUCCESS) {
                transactionIdCheck = transactionIdCheck.data;
                if (transactionIdCheck.is_type == 'DEBIT') {
                    response.status = "OP_DUPLICATE_TRANSACTION";
                    response.balance = parseFloat(balance);
                    return res.status(200).json(response);
                } else {
                    response.status = "OP_TRANSACTION_DOES_NOT_EXIST";
                    response.balance = parseFloat(balance);
                    return res.status(200).json(response);
                }

            }


            if (liability > 0) {
                if (balance > 0) {
                    if (parseFloat(balance) >= parseFloat(debitAmount)) {

                        let inserMatchJson = { user_id: user_id, MatchId: match_id, MarketId: roundId, type: 'DEBIT', ip_address: ip_address };
                        let matchInsert = await userCasinoService.casinoInsertMatch(inserMatchJson);

                        let data = { liability: liability, betType: betType, gameId: gameId, user_id: user_id, MatchId: match_id, MarketId: roundId, reqId: reqId, transactionId: transactionId, ip_address: ip_address, is_type: 'DEBIT' };

                        let updateUserBalance = await userCasinoService.updateCasinoDebitUserBalance(data);

                        if (updateUserBalance.statusCode === CONSTANTS.SUCCESS) {
                            let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(user_id);
                            response.status = "OP_SUCCESS";
                            response.balance = parseFloat(balanceAfterBetPlace.data.balance);
                            console.log(' balance update on debit ----- ', response);
                            return res.status(200).json(response);
                        }
                    } else {
                        response.status = "OP_INSUFFICIENT_FUNDS";
                        response.balance = parseFloat(balance);
                        return res.status(200).json(response);
                    }
                } else {
                    response.status = "OP_INSUFFICIENT_FUNDS";
                    response.balance = parseFloat(balance);
                    return res.status(200).json(response);
                }
            } else {
                response.status = "OP_ERROR_NEGATIVE_DEBIT_AMOUNT";
                response.balance = parseFloat(balance);
                return res.status(200).json(response);
            }
        } else {

            let jsonLogs = { request_json: JSON.stringify(req.body), user_id: 0, betType: betType, debitAmount: debitAmount, gameId: gameId, reqId: reqId, match_id: match_id, roundId: roundId, transactionId: transactionId, type: 'DEBIT' };
            await userCasinoService.casinoLogInsert(jsonLogs);

            response.status = "OP_USER_NOT_FOUND";
            response.balance = 0;
            return res.status(200).json(response);
        }

    } catch (error) {
        console.log(' --------------- interNationCasionBetRequest ------- OP_SYSTEM_BUSY--------------- ', error);
        response.status = "OP_SYSTEM_BUSY";
        response.balance = 0;
        return res.status(200).json(response);
    }

}

async function interNationCasionResultRequest(req, res) {
    /*fs.appendFile('credit.json', JSON.stringify(req.body), function (err) {
        if (err) {
            return console.log('debit--------------------- ', err);
        }
    });*/

    let {
        token,
        operatorId,
        userId,
        betType,
        creditAmount,
        gameId,
        reqId,
        roundId,
        transactionId
    } = req.body;

    const loginchema = Joi.object({
        token: Joi.string().required(),
        operatorId: Joi.string().required(),
        userId: Joi.string().required(),
        betType: Joi.string().required(),
        creditAmount: Joi.number().required(),
        gameId: Joi.string().required(),
        reqId: Joi.string().required(),
        roundId: Joi.string().required(),
        transactionId: Joi.string().required()
    });
    let response = {};
    try {
        await loginchema.validate(req.body, {
            abortEarly: true,
            allowUnknown: true
        });
    } catch (error) {
        response.status = "OP_INVALID_PARAMS";
        response.balance = parseFloat(0);
        return res.status(200).json(response);
        return apiErrorRes(req, res, error.details[0].message);
    }

    try {

        let jsonRequest = req.body;
        //let match_id = roundId.replace(".", "");
        let match_id = gameId;
        /*let match_id = roundId.split(".");
        match_id = match_id[1]? match_id[1] : roundId;*/
        //match_id = match_id +""+gameId;
        let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        if (token == '' || operatorId == '' || userId == '' || betType == '' || (creditAmount == '' && creditAmount != 0) || gameId == '' || reqId == '' || roundId == '' || transactionId == '') {
            response.status = "OP_INVALID_PARAMS";
            response.balance = parseFloat(0);
            return res.status(200).json(response);
        }
        let userDetailByUserName = await userService.getLobbyXPGUserAuthorization(userId);
        if (userDetailByUserName.statusCode === CONSTANTS.SUCCESS) {
            let balance = parseFloat(userDetailByUserName.data.balance);
            let user_id = userDetailByUserName.data.id;
            let profitLoss = creditAmount;
            let jsonLogs = { request_json: JSON.stringify(req.body), user_id: user_id, betType: betType, debitAmount: profitLoss, gameId: gameId, reqId: reqId, match_id: match_id, roundId: roundId, transactionId: transactionId, type: 'CREDIT' };
            await userCasinoService.casinoLogInsert(jsonLogs);

            let gameIdCheck = await userCasinoService.getGameId(gameId);

            if (gameIdCheck.statusCode === CONSTANTS.NOT_FOUND) {
                response.status = "OP_INVALID_GAME";
                response.balance = parseFloat(balance);
                return res.status(200).json(response);
            }
            let game_name = gameIdCheck.data.game_name;
            let transactionIdCheck = await userCasinoService.getTransationId(jsonLogs);

            if (transactionIdCheck.statusCode === CONSTANTS.SUCCESS) {
                transactionIdCheck = transactionIdCheck.data;
                if (transactionIdCheck.is_type == 'CREDIT') {
                    response.status = "OP_DUPLICATE_TRANSACTION";
                    response.balance = parseFloat(balance);
                    return res.status(200).json(response);
                } else if (transactionIdCheck.is_type == 'CANCEL') {
                    response.status = "OP_ERROR_TRANSACTION_INVALID";
                    response.balance = parseFloat(balance);
                    return res.status(200).json(response);
                }

            } else {
                response.status = "OP_TRANSACTION_NOT_FOUND";
                response.balance = parseFloat(balance);
                return res.status(200).json(response);
            }

            let data = { profit_loss: profitLoss, betType: betType, gameId: gameId, user_id: user_id, MatchId: match_id, MarketId: roundId, reqId: reqId, transactionId: transactionId, ip_address: ip_address, is_type: 'DEBIT', is_type_update: 'CREDIT', game_name: game_name };


            let updateUserBalance = await userCasinoService.updateLobbyCasinoCreditUserBalance(data);
            if (updateUserBalance.statusCode === CONSTANTS.SUCCESS) {
                let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(user_id);
                response.status = "OP_SUCCESS";
                response.balance = parseFloat(balanceAfterBetPlace.data.balance);
                console.log(' balance update on credit ----- ', response);
                return res.status(200).json(response);
            }
        }

    } catch (error) {
        console.log('error');
        console.log(' --------------- interNationCasionBetRequest ------- OP_SYSTEM_BUSY--------------- ', error);
        response.status = "OP_SYSTEM_BUSY";
        response.balance = 0;
        return res.status(200).json(response);
    }


    /*fs.appendFile('credit.json', JSON.stringify(req.body), function(err) {
        if (err) {
            return console.log('debit--------------------- ', err);
        }
    });
    return res.status(200).json();*/
}

async function interNationCasionRollbackRequest(req, res) {
    /*fs.appendFile('rollback.json', JSON.stringify(req.body), function (err) {
        if (err) {
            return console.log('debit--------------------- ', err);
        }
    });*/
    let {
        token,
        operatorId,
        userId,
        betType,
        rollbackAmount,
        gameId,
        reqId,
        roundId,
        transactionId
    } = req.body;

    const loginchema = Joi.object({
        token: Joi.string().required(),
        operatorId: Joi.string().required(),
        userId: Joi.string().required(),
        betType: Joi.string().required(),
        rollbackAmount: Joi.number().required(),
        gameId: Joi.string().required(),
        reqId: Joi.string().required(),
        roundId: Joi.string().required(),
        transactionId: Joi.string().required()
    });
    let response = {};
    try {
        await loginchema.validate(req.body, {
            abortEarly: true,
            allowUnknown: true
        });
    } catch (error) {
        response.status = "OP_INVALID_PARAMS";
        response.balance = parseFloat(0);
        return res.status(200).json(response);
        return apiErrorRes(req, res, error.details[0].message);
    }


    try {

        let jsonRequest = req.body;
        //let match_id = roundId.replace(".", ""); 
        let match_id = gameId;
        /*let match_id = roundId.split(".");
        match_id = match_id[1]? match_id[1] : roundId;*/
        //match_id = match_id +""+gameId;
        let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        if (token == '' || operatorId == '' || userId == '' || betType == '' || rollbackAmount == '' || gameId == '' || reqId == '' || roundId == '' || transactionId == '') {
            response.status = "OP_INVALID_PARAMS";
            response.balance = parseFloat(0);
            return res.status(200).json(response);
        }

        let userDetailByUserName = await userService.getLobbyXPGUserAuthorization(userId);
        if (userDetailByUserName.statusCode === CONSTANTS.SUCCESS) {
            let balance = parseFloat(userDetailByUserName.data.balance);
            let user_id = userDetailByUserName.data.id;
            let profitLoss = rollbackAmount;
            let jsonLogs = { request_json: JSON.stringify(req.body), user_id: user_id, betType: betType, debitAmount: profitLoss, gameId: gameId, reqId: reqId, match_id: match_id, roundId: roundId, transactionId: transactionId, type: 'CANCEL' };
            await userCasinoService.casinoLogInsert(jsonLogs);

            let gameIdCheck = await userCasinoService.getGameId(gameId);

            if (gameIdCheck.statusCode === CONSTANTS.NOT_FOUND) {
                response.status = "OP_INVALID_GAME";
                response.balance = parseFloat(balance);
                return res.status(200).json(response);
            }
            let game_name = gameIdCheck.data.game_name;
            let transactionIdCheck = await userCasinoService.getTransationId(jsonLogs);

            if (transactionIdCheck.statusCode === CONSTANTS.SUCCESS) {
                transactionIdCheck = transactionIdCheck.data;
                if (transactionIdCheck.is_type == 'CANCEL') {
                    response.status = "OP_DUPLICATE_TRANSACTION";
                    response.balance = parseFloat(balance);
                    return res.status(200).json(response);
                } else if (transactionIdCheck.is_type == 'CREDIT') {
                    response.status = "OP_TRANSACTION_DOES_NOT_EXIST";
                    response.balance = parseFloat(balance);
                    return res.status(200).json(response);
                }

            } else {
                response.status = "OP_TRANSACTION_NOT_FOUND";
                response.balance = parseFloat(balance);
                return res.status(200).json(response);
            }

            let data = { profit_loss: profitLoss, betType: betType, gameId: gameId, user_id: user_id, MatchId: match_id, MarketId: roundId, reqId: reqId, transactionId: transactionId, ip_address: ip_address, is_type: 'DEBIT', is_type_update: 'CANCEL', game_name: game_name };


            let updateUserBalance = await userCasinoService.updateCasinoRollbackUserBalance(data);
            if (updateUserBalance.statusCode === CONSTANTS.SUCCESS) {
                let balanceAfterBetPlace = await userService.getLobbyLotusUserAuthorization(user_id);
                response.status = "OP_SUCCESS";
                response.balance = parseFloat(balanceAfterBetPlace.data.balance);
                console.log(' balance update on credit ----- ', response);
                return res.status(200).json(response);
            }
        }

    } catch (error) {
        console.log('error');
        console.log(' --------------- interNationCasionRollbackRequest ------- OP_SYSTEM_BUSY--------------- ', error);
        response.status = "OP_SYSTEM_BUSY";
        response.balance = 0;
        return res.status(200).json(response);
    }


    /*fs.appendFile('rollback.json', JSON.stringify(req.body), function(err) {
        if (err) {
            return console.log('debit--------------------- ', err);
        }
    });
    return res.status(200).json();*/



}
async function interNationCasionGameList(req, res) {
    try {
        let response = await userCasinoService.saveCasinoMatches();

        if (response.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Saved successfully', response.data);
        } else {
            return apiErrorRes(req, res, response.data);
        }

    } catch (error) {
        console.log(' error --------FUN------------------------------------------------------ ', error);
        return apiErrorRes(req, res, 'Enter valid param!', error);
    }
}

async function interNationCasionGetGameList(req, res) {
    try {
        let { id } = req.headers;
        let response = await userCasinoService.getCasinoMatches(id);

        if (response.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Saved successfully', response.data);
        } else {
            return apiErrorRes(req, res, response.data);
        }

    } catch (error) {
        console.log(' error --------FUN------------------------------------------------------ ', error);
        return apiErrorRes(req, res, 'Enter valid param!', error);
    }
}


async function interNationCasionLogin(req, res) {
    console.log(' error --------FUN----------------------------------dddd-------------------- ');
    let {
        providerName,
        lobby,
        gameId,
        subOperatorId
    } = req.body;

    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    const profilechema = Joi.object({
        providerName: Joi.string().required(),
        gameId: Joi.string().required()
    });
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let { id } = req.headers;
    let authorization = await userService.getUserById(id);
    //let reqData = { providerName: providerName, gameId: gameId, ip_address: ip_address, id:id};    

    if (authorization.statusCode === CONSTANTS.SUCCESS) {

        authorization = authorization.data;
        const payload = {
            operatorId: settings.GURU_CASINO_OPERATOR_ID,
            userId: authorization.user_name,
            providerName: providerName,
            platformId: 'DESKTOP',
            currency: settings.GURU_CASINO_CURRENCY,
            username: authorization.user_name,
            lobby: false,
            gameId: gameId,
            clientIp: settings.GURU_CASINO_CLIENT_IP,
            balance: authorization.balance,
            redirectUrl: settings.GURU_CASINO_REDIRECT_URL
        };
        let signature = globalFunction.createCasinoSignature(payload);

        let response = await axios.post(settings.GURU_CASINO_LOGIN_URL, payload, {
            headers: { 'Content-Type': 'application/json', "Signature": signature }
        });
        console.log('-------------', response.data);
        let message = 'Successfully';
        return apiSuccessRes(req, res, message, response.data);
    } else if (authorization.statusCode === CONSTANTS.NOT_FOUND) {
        return apiErrorRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiErrorRes(req, res, 'Something went wrong.');
    }
}

async function interNationCasionLobbyLogin(req, res) {
    console.log(' error --------FUN----------------------------------dddd-------------------- ');
    let {
        gameId
    } = req.body;

    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    const profilechema = Joi.object({
        gameId: Joi.string().required()
    });
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let { id } = req.headers;
    let authorization = await userService.getUserById(id);
    let gameIdDetails = await userCasinoService.getGameId(gameId);
    let providerName = "";
    if (gameIdDetails.statusCode === CONSTANTS.SUCCESS) {
        providerName = gameIdDetails.provider_name;

    }
    //let reqData = { providerName: providerName, gameId: gameId, ip_address: ip_address, id:id};    

    if (authorization.statusCode === CONSTANTS.SUCCESS) {

        authorization = authorization.data;
        const payload = {
            operatorId: settings.GURU_CASINO_OPERATOR_ID,
            userId: authorization.user_name,
            providerName: providerName,
            platformId: 'DESKTOP',
            currency: settings.GURU_CASINO_CURRENCY,
            username: authorization.user_name,
            lobby: false,
            gameId: gameId,
            clientIp: settings.GURU_CASINO_CLIENT_IP,
            balance: authorization.balance,
            redirectUrl: settings.GURU_CASINO_REDIRECT_URL
        };
        let signature = globalFunction.createCasinoSignature(payload);

        let response = await axios.post(settings.GURU_CASINO_LOGIN_URL, payload, {
            headers: { 'Content-Type': 'application/json', "Signature": signature }
        });
        console.log('-------------', response.data);
        let message = 'Successfully';
        return apiSuccessRes(req, res, message, response.data);
    } else if (authorization.statusCode === CONSTANTS.NOT_FOUND) {
        return apiErrorRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiErrorRes(req, res, 'Something went wrong.');
    }
}

router.get('/game-list-add', interNationCasionGameList);
router.get('/game-list', interNationCasionGetGameList);
router.post('/game-login', interNationCasionLogin);
router.post('/game-lobby', interNationCasionLobbyLogin);
router.post('/balance', interNationCasionBalance);

//router.get('/balance', interNationCasionBalance);

router.post('/betrequest', interNationCasionBetRequest);
router.post('/resultrequest', interNationCasionResultRequest);
router.post('/rollbackrequest', interNationCasionRollbackRequest);

module.exports = router;