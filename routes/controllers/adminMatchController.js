const express = require('express');
const router = express.Router();
const Joi = require('joi');
const axios = require('axios');
const settings = require('../../config/settings');
const userService = require('../services/userService');
const adminMatchService = require('../services/adminMatchService');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');
const logger = require('../../utils/logger');
const errorlog = logger.errorlog;

let apiSuccessRes = globalFunction.apiSuccessRes;

let apiErrorRes = globalFunction.apiErrorRes;

const partnershipsService = require('../services/partnershipsService');

const selectionService = require('../services/selectionService');
const userSettingSportWiseService = require('../services/userSettingSportWiseService');
const exchangeService = require('../services/exchangeService');
const fancyService = require('../services/fancyService');
const betService = require('../services/betsService');
const marketsService = require('../services/marketsService');

const browser = require('browser-detect');


async function getMatchDetils(req, res) {

    try {

        let {
            role_id,
            user_id,
            match_id
        } = req.body;

        const createSeriesSchema = Joi.object({
            user_id: Joi.number().required(),
            role_id: Joi.optional().required(),
            match_id: Joi.number().required(),
        });

        try {
            await createSeriesSchema.validate(req.body, {
                abortEarly: true
            });
        } catch (error) {
            errorlog.error('Parameter validation error.  ', error);
            return apiErrorRes(req, res, error.details[0].message);
        }
        let data = {
            role_id,
            user_id,
            match_id
        };

        let marketData = await adminMatchService.getMatchDetailsOdds(data);
        let marketDataOther = await adminMatchService.getMatchDetailsOthers(data);

        if (marketData.statusCode == CONSTANTS.SUCCESS || marketDataOther.statusCode == CONSTANTS.SUCCESS) {
            let retrunData = { 'OddsMarket': marketData.data, 'otherMarkets': marketDataOther.data };
            return apiSuccessRes(req, res, 'Success', retrunData);
            //return apiSuccessRes(req, res, 'account statement  successfully', {...marketData.data,...data});
        } else {

            return apiSuccessRes(req, res, 'No Record found.', CONSTANTS.BLANK_ARRAY);
        }
    } catch (e) {
        errorlog.error('Error in admin match controller ', e);
        return apiErrorRes(req, res, 'Enter valid param!', e);
    }
};


async function getMatchUsers(req, res) {

    try {

        let {
            user_name,
            user_id
        } = req.body;

        const createSeriesSchema = Joi.object({
            user_name: Joi.string().required(),
        });

        try {
            await createSeriesSchema.validate(req.body, {
                //abortEarly: true,
                allowUnknown: true
            });
        } catch (error) {
            errorlog.error('user serach not found errro ', error);
            return apiErrorRes(req, res, error.details[0].message);
        }
        let data = {
            user_name
        };

        let getSearchUser = await adminMatchService.getMatchUsers(data);

        if (getSearchUser.statusCode == CONSTANTS.SUCCESS) {

            return apiSuccessRes(req, res, 'Success', getSearchUser.data);

        } else {

            return apiSuccessRes(req, res, 'No User Record found.', CONSTANTS.BLANK_ARRAY);
        }
    } catch (e) {
        errorlog.error('error in user search ajax ', e);
        return apiErrorRes(req, res, 'User!', e);
    }
};
async function getCasinoMatchDetils(req, res) {

    try {

        let {
            role_id,
            user_id,
            sport_id,
            match_id
        } = req.body;

        const createSeriesSchema = Joi.object({
            user_id: Joi.number().required(),
            role_id: Joi.optional().required(),
            sport_id: Joi.number().required(),
            match_id: Joi.number().required(),
        });

        try {
            await createSeriesSchema.validate(req.body, {
                abortEarly: true
            });
        } catch (error) {
            errorlog.error('Parameter validation error.  ', error);
            return apiErrorRes(req, res, error.details[0].message);
        }
        let data = {
            role_id,
            user_id,
            sport_id,
            match_id
        };
        let marketData;
        //let marketData = await adminMatchService.getCasinoMatchDetailsOdds(data);
        if (sport_id == CONSTANTS.BETFAIR_SPORT_ANDER_BAHAR_D) {
            marketData = await adminMatchService.getMatchCasinoMarketListAnderBahar(data);
        } else {
            marketData = await adminMatchService.getCasinoMatchDetailsOdds(data);
        }
        //let marketDataOther = await adminMatchService.getMatchDetailsOthers(data);
        //console.log(marketDataOther);		
        if (marketData.statusCode == CONSTANTS.SUCCESS || marketDataOther.statusCode == CONSTANTS.SUCCESS) {
            let retrunData = { 'OddsMarket': marketData.data };
            return apiSuccessRes(req, res, 'Success', retrunData);
            //return apiSuccessRes(req, res, 'account statement  successfully', {...marketData.data,...data});
        } else {

            return apiSuccessRes(req, res, 'No Record found.', CONSTANTS.BLANK_ARRAY);
        }
    } catch (e) {
        errorlog.error('Error in admin match controller ', e);
        return apiErrorRes(req, res, 'Enter valid param!', e);
    }
};


async function getCasinoliveMatchDetils(req, res) {

    try {

        let {
            role_id,
            user_id,
            sport_id,
            match_id
        } = req.body;

        const createSeriesSchema = Joi.object({
            user_id: Joi.number().required(),
            role_id: Joi.optional().required(),
            sport_id: Joi.number().required(),
            match_id: Joi.number().required(),
        });

        try {
            await createSeriesSchema.validate(req.body, {
                abortEarly: true
            });
        } catch (error) {
            errorlog.error('Parameter validation error.  ', error);
            return apiErrorRes(req, res, error.details[0].message);
        }
        let data = {
            role_id,
            user_id,
            sport_id,
            match_id
        };
        let marketData;
        //let marketData = await adminMatchService.getCasinoMatchDetailsOdds(data);
        if (sport_id == CONSTANTS.BETFAIR_SPORT_ANDER_BAHAR_D) {
            marketData = await adminMatchService.getMatchCasinoliveMarketListAnderBahar(data);
        } else {
            marketData = await adminMatchService.getCasinoliveMatchDetailsOdds(data);
        }
        //let marketDataOther = await adminMatchService.getMatchDetailsOthers(data);
        //console.log(marketDataOther);		
        if (marketData.statusCode == CONSTANTS.SUCCESS || marketDataOther.statusCode == CONSTANTS.SUCCESS) {
            let retrunData = { 'OddsMarket': marketData.data };
            return apiSuccessRes(req, res, 'Success', retrunData);
            //return apiSuccessRes(req, res, 'account statement  successfully', {...marketData.data,...data});
        } else {

            return apiSuccessRes(req, res, 'No Record found.', CONSTANTS.BLANK_ARRAY);
        }
    } catch (e) {
        errorlog.error('Error in admin match controller ', e);
        return apiErrorRes(req, res, 'Enter valid param!', e);
    }
};

async function getMatchDetilCompleted(req, res) {

    try {

        let {
            role_id,
            user_id,
            match_id
        } = req.body;

        const createSeriesSchema = Joi.object({
            user_id: Joi.number().required(),
            role_id: Joi.optional().required(),
            match_id: Joi.number().required(),
        });

        try {
            await createSeriesSchema.validate(req.body, {
                abortEarly: true
            });
        } catch (error) {
            errorlog.error('Parameter validation error.  ', error);
            return apiErrorRes(req, res, error.details[0].message);
        }
        let data = {
            role_id,
            user_id,
            match_id
        };

        let matchDetailsCompleted = await adminMatchService.getMatchDetailsCompleted(data);


        if (matchDetailsCompleted.statusCode == CONSTANTS.SUCCESS && matchDetailsCompleted.data.length > 0) {
            return apiSuccessRes(req, res, 'Success', matchDetailsCompleted.data);
            //return apiSuccessRes(req, res, 'account statement  successfully', {...marketData.data,...data});
        } else {

            return apiSuccessRes(req, res, 'No Record found.');
        }
    } catch (e) {
        errorlog.error('Error in  admin match controller ', e);
        return apiErrorRes(req, res, 'Enter valid param!', e);
    }
};

async function getMatchIndianSessionByMarketId(req, res) {

    let {
        match_id,
        user_id,
        role_id
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
        user_id: Joi.number().required(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let data = {
        match_id,
        user_id,
        role_id
    };
    let fancyResponse = await adminMatchService.getMatchIndiaFancy(data);
    let fancyResponseManual = await adminMatchService.getMatchIndiaFancyManual(data);
    console.log('fancyResponse------- ----- ', fancyResponse);
    console.log('fancyResponseManual------------ ', fancyResponseManual);
    let fancyResponseResult = [];
    if (fancyResponse.statusCode === CONSTANTS.SUCCESS || fancyResponseManual.statusCode === CONSTANTS.SUCCESS) {
        fancyResponseResult = fancyResponse.data;
        fancyResponseResult = fancyResponseResult.concat(fancyResponseManual.data);
        return apiSuccessRes(req, res, 'Success', fancyResponseResult);
    } else if (fancyResponse.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'No Record found.', []);
    } else {
        return apiErrorRes(req, res, 'Error Match fancy List.');
    }
}


async function getMyBetFairMarketBets(req, res) {

    let {
        match_id,
        market_id,
        user_id,
        role_id,
        search,
        page,
        limit
    } = req.body;
    const profilechema = Joi.object({
        match_id: Joi.number().required(),
        market_id: Joi.string(),
        user_id: Joi.number().required(),
        role_id: Joi.number().required(),
        search: Joi.optional(),
        page: Joi.number().required(),
        limit: Joi.number().required(),
    });
    let data = {
        match_id,
        market_id,
        user_id,
        role_id,
        search,
        page,
        limit
    };
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let getBetsBetFair = await adminMatchService.getMyBetFairMarketBets(data);
    if (getBetsBetFair.statusCode === CONSTANTS.SUCCESS) {

        return apiSuccessRes(req, res, 'success', getBetsBetFair.data);

    } else if (getBetsBetFair.statusCode === CONSTANTS.NOT_FOUND) {
        return apiErrorRes(req, res, 'No Record found.');
    } else {
        return apiErrorRes(req, res, 'Error to bets.');
    }
}

async function getCasinoMatchAndMarketBets(req, res) {

    let {
        match_id,
        market_id,
        user_id,
        role_id
    } = req.body;
    const profilechema = Joi.object({
        match_id: Joi.number().required(),
        market_id: Joi.string(),
        user_id: Joi.number().required(),
        role_id: Joi.number().required(),
    });
    let data = {
        match_id,
        market_id,
        user_id,
        role_id
    };
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let getBetsBetFair = await adminMatchService.getCasinoMyBetFairMarketBets(data);
    if (getBetsBetFair.statusCode === CONSTANTS.SUCCESS) {

        return apiSuccessRes(req, res, 'success', getBetsBetFair.data);

    } else if (getBetsBetFair.statusCode === CONSTANTS.NOT_FOUND) {
        return apiErrorRes(req, res, 'No Record found.');
    } else {
        return apiErrorRes(req, res, 'Error to bets.');
    }
}


async function getMyCompletedBetFairMarketBets(req, res) {

    let {
        match_id,
        market_id,
        user_id,
        role_id,
        search,
        page,
        limit
    } = req.body;
    const profilechema = Joi.object({
        match_id: Joi.number().required(),
        market_id: Joi.string(),
        user_id: Joi.number().required(),
        role_id: Joi.number().required(),
        search: Joi.optional(),
        page: Joi.number().required(),
        limit: Joi.number().required(),
    });
    let data = {
        match_id,
        market_id,
        user_id,
        role_id,
        search,
        page,
        limit
    };
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let getBetsBetFair = await adminMatchService.getCompletedBetFairMarketBets(data);
    if (getBetsBetFair.statusCode === CONSTANTS.SUCCESS) {

        return apiSuccessRes(req, res, 'success', getBetsBetFair.data);

    } else if (getBetsBetFair.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'No Record found.');
    } else {
        return apiSuccessRes(req, res, 'Error to bets.');
    }
}



async function getMatchFacnyBets(req, res) {

    let {
        match_id,
        fancy_id,
        user_id,
        role_id,
        search,
        page,
        limit
    } = req.body;
    const profilechema = Joi.object({
        match_id: Joi.number().required(),
        fancy_id: Joi.string(),
        user_id: Joi.number().required(),
        role_id: Joi.number().required(),
        search: Joi.optional(),
        page: Joi.number().required(),
        limit: Joi.number().required(),
    });
    let data = {
        match_id,
        fancy_id,
        user_id,
        role_id,
        search,
        page,
        limit
    };
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let getBetsBetFair = await adminMatchService.getMatchFacnyBets(data);

    if (getBetsBetFair.statusCode === CONSTANTS.SUCCESS) {

        return apiSuccessRes(req, res, 'success', getBetsBetFair.data);

    } else if (getBetsBetFair.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'No Record found.');
    } else {
        return apiSuccessRes(req, res, 'Error to bets.');
    }
}

async function myDashboard(req, res) {

    let {
        user_id,
        role_id,
        sport_id
    } = req.body;
    const profilechema = Joi.object({
        user_id: Joi.number().required(),
        role_id: Joi.number().required(),
        sport_id: Joi.number().required(),
    });
    let data = {
        user_id,
        role_id,
        sport_id
    };
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let getBetsBetFair = await adminMatchService.myDashboard(data);

    if (getBetsBetFair.statusCode === CONSTANTS.SUCCESS) {

        return apiSuccessRes(req, res, 'success', getBetsBetFair.data);

    } else if (getBetsBetFair.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'No Record found.');
    } else {
        return apiSuccessRes(req, res, 'Error to bets.');
    }
}

function base64Decode(mainUserId) {

    let fristUserId = mainUserId.substring(0, 1);
    let secondUserId = mainUserId.substring(33, mainUserId.length);
    let data = fristUserId + secondUserId;
    let buff = new Buffer(data, 'base64');
    return buff.toString('ascii');

}


async function ProfitLoss(req, res) {

    try {
        let {
            user_id,
            role_id,
            fromdate,
            twodate
        } = req.body;

        const createSeriesSchema = Joi.object({
            user_id: Joi.string().required(),
            role_id: Joi.string().required(),
            fromdate: Joi.number().greater(0).required(),
            twodate: Joi.number().greater(0).required()
        });

        await createSeriesSchema.validate(req.body, {
            abortEarly: true
        });


        user_id = parseInt(await base64Decode(user_id));
        role_id = parseInt(await base64Decode(role_id));


        let getUserById = await userService.getUserById(user_id);

        let parent_id = '';
        let parent_user_type_id = '';
        if (getUserById.statusCode === CONSTANTS.SUCCESS && role_id != CONSTANTS.USER_TYPE_SUPER_ADMIN) {
            parent_id = getUserById.data.parent_id;
            let getParentUserById = await userService.getUserById(parent_id);
            if (getParentUserById.statusCode === CONSTANTS.SUCCESS) {
                parent_user_type_id = getParentUserById.data.role_id;
            }
        }

        let returnData = await adminMatchService.ProfitLoss(user_id, role_id, fromdate, twodate);

        if (returnData.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'success', returnData.data);
        } else if (returnData.statusCode === CONSTANTS.NOT_FOUND) {
            return apiErrorRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
        } else {
            return apiErrorRes(req, res, 'Error profit loss.', CONSTANTS.BLANK_ARRAY);
        }

    } catch (e) {
        return apiErrorRes(req, res, 'Enter valid param!', e);
    }
}



async function ProfitLossCommission(req, res) {

    try {
        let {
            user_id,
            role_id,
            fromdate,
            twodate,
            sport_id,
            type
        } = req.body;


        const createSeriesSchema = Joi.object({
            user_id: Joi.string().required(),
            role_id: Joi.string().required(),
            sport_id: Joi.string().allow('').optional(),
            type: Joi.string().required(),
            fromdate: Joi.number().greater(0).required(),
            twodate: Joi.number().greater(0).required()
        });

        await createSeriesSchema.validate(req.body, {
            abortEarly: true
        });

        sport_ids = typeof sport_id !== 'undefined' ? sport_id : '';
        user_id = parseInt(await base64Decode(user_id));
        role_id = parseInt(await base64Decode(role_id));
        sport_id = parseInt(await base64Decode(sport_ids));
        type = parseInt(await base64Decode(type));

        let getUserById = await userService.getUserById(user_id);

        let parent_id = '';
        let parent_user_type_id = '';
        if (getUserById.statusCode === CONSTANTS.SUCCESS && role_id != CONSTANTS.USER_TYPE_SUPER_ADMIN) {
            parent_id = getUserById.data.parent_id;
            let getParentUserById = await userService.getUserById(parent_id);
            if (getParentUserById.statusCode === CONSTANTS.SUCCESS) {
                parent_user_type_id = getParentUserById.data.role_id;
            }
        }
        let requestPram = { user_id: user_id, role_id: role_id, fromdate: fromdate, twodate: twodate, sport_id: sport_id, type: type };
        let returnData = await adminMatchService.ProfitLossCommission(requestPram);


        if (returnData.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'success', returnData.data);
        } else if (returnData.statusCode === CONSTANTS.NOT_FOUND) {
            return apiErrorRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
        } else {
            return apiErrorRes(req, res, 'Error profit loss.', CONSTANTS.BLANK_ARRAY);
        }

    } catch (e) {
        return apiErrorRes(req, res, 'Enter valid param!', e);
    }
}


async function settlementReport(req, res) {

    try {
        let {
            user_id,
            role_id,
            search
        } = req.body;

        const createSeriesSchema = Joi.object({
            user_id: Joi.string().required(),
            role_id: Joi.string().required(),
            search: Joi.optional()
        });

        await createSeriesSchema.validate(req.body, {
            abortEarly: true
        });


        user_id = parseInt(await base64Decode(user_id));
        role_id = parseInt(await base64Decode(role_id));


        let getUserById = await userService.getUserById(user_id);
        //console.log('getUserById------', getUserById);
        let parent_id = '';
        let parent_user_type_id = '';
        if (getUserById.statusCode === CONSTANTS.SUCCESS && role_id != CONSTANTS.USER_TYPE_SUPER_ADMIN) {
            parent_id = getUserById.data.parent_id;
            let getParentUserById = await userService.getUserById(parent_id);
            if (getParentUserById.statusCode === CONSTANTS.SUCCESS) {
                parent_user_type_id = getParentUserById.data.role_id;
            }
        }

        let ownData = await adminMatchService.ownDataInSettlementReport(user_id, role_id);

        let finalData = { "user_id": user_id, "user_type_id": role_id, "parent_id": parent_id, "parent_user_type_id": parent_user_type_id, "plusData": ownData.data.plusData, "minusData": ownData.data.minusData, "data_receiving_from": [], "data_paid_to": [] };

        let totalPlus = Math.abs(ownData.data.totalPlus);
        let totalMinus = Math.abs(ownData.data.totalMinus);

        let returnData = await adminMatchService.settlementReport(user_id, role_id, search);

        if (returnData.statusCode === CONSTANTS.SUCCESS) {

            for (let i in returnData.data) {
                let element = returnData.data[i];

                if (element.settlement_amount > 0) {
                    totalMinus = totalMinus + element.settlement_amount;
                    element.settlement_amount = element.settlement_amount.toFixed(2);
                    finalData.data_receiving_from.push(element);
                } else {
                    element.settlement_amount = Math.abs(element.settlement_amount);
                    totalPlus = totalPlus + element.settlement_amount;
                    element.settlement_amount = element.settlement_amount.toFixed(2);
                    finalData.data_paid_to.push(element);
                }
            }
        }
        finalData.totalPlus = totalPlus.toFixed(2);
        finalData.totalMinus = totalMinus.toFixed(2);
        //console.log(finalData);
        return apiSuccessRes(req, res, 'SUCCESS', finalData);
    } catch (e) {
        console.log(e);
        return apiErrorRes(req, res, 'Enter valid param!', e);
    }
}


async function makeSettlement(req, res) {

    try {
        let {
            user_id,
            role_id,
            amount,
            type,
            comment
        } = req.body;

        const createSeriesSchema = Joi.object({
            user_id: Joi.string().required(),
            role_id: Joi.string().required(),
            amount: Joi.number().greater(0).required(),
            type: Joi.number().valid(1, 2).required(),
            comment: Joi.optional(),
        });

        await createSeriesSchema.validate(req.body, {
            abortEarly: true
        });
        user_id = parseInt(await base64Decode(user_id));
        role_id = parseInt(await base64Decode(role_id));

        let getUserData = await userService.getUserById(user_id);
        if (getUserData.statusCode === CONSTANTS.SUCCESS) {

            //if(getUserData.data.self_lock_settlement == '0' && getUserData.data.parent_lock_settlement == '0') {

            if (type == 1 && comment == '') {
                comment = 'Cash Credit';
            } else if (type == 2 && comment == '') {
                comment = 'Cash Debit';
            }
            console.log('parent_id--------', getUserData.data.parent_id);
            console.log('user_id ---------------- ', user_id);
            console.log('role_id ----------- ', role_id);
            let parent_id = getUserData.data.parent_id;
            let returnData = await adminMatchService.makeSettlement(user_id, role_id, parent_id, amount, type, comment);
            console.log('parent_id----returnData----', returnData);
            if (returnData.statusCode === CONSTANTS.SUCCESS) {
                return apiSuccessRes(req, res, returnData.data);
            } else {
                return apiErrorRes(req, res, 'No Record found.');
            }
            // } else {
            // 	return apiErrorRes(req, res, 'Settlement Locked !');
            // }
        } else {
            return apiErrorRes(req, res, 'Invalid User !');
        }
    } catch (e) {
        return apiErrorRes(req, res, 'Enter valid param!', e);
    }
}
async function settlementCollectionHistory(req, res) {

    try {
        let {
            user_id,
            role_id,
            parent_id,
            page,
            opening_balance
        } = req.body;

        const createSeriesSchema = Joi.object({
            role_id: Joi.number().required(),
            user_id: Joi.number().required(),
            parent_id: Joi.number().required(),
            page: Joi.number().required(),
            opening_balance: Joi.number().required(),
        });

        await createSeriesSchema.validate(req.body, {
            abortEarly: true
        });

        let returnData = await adminMatchService.settlementCollectionHistory(user_id, role_id, parent_id, page, opening_balance);

        if (returnData.statusCode === CONSTANTS.SUCCESS) {
            let finalData = {};
            let openBal = returnData.data.length - 1;
            let openBalace = returnData.data[openBal].opening_balance;
            let returnData2 = returnData.data;
            returnData2.splice(-1);
            if (page == 1) {
                finalData = { "limit": 10000, "total": returnData.data.length, "opening_balance": openBalace, "data": returnData2 };
            } else {
                finalData = { "limit": 10000, "total": 0, "opening_balance": openBalace, "data": returnData2 };
            }
            return apiSuccessRes(req, res, 'SUCCESS', finalData);
        } else {
            return apiSuccessRes(req, res, 'not found data');
        }
    } catch (e) {
        return apiErrorRes(req, res, 'Enter valid param!', e);
    }
}


async function historyList(req, res) {

    try {
        let {
            user_id,
            role_id,
            parent_id,
            page
        } = req.body;

        const createSeriesSchema = Joi.object({
            role_id: Joi.number().required(),
            user_id: Joi.number().required(),
            parent_id: Joi.number().required(),
            page: Joi.number().required()
        });

        await createSeriesSchema.validate(req.body, {
            abortEarly: true
        });

        let returnData = await adminMatchService.historyList(user_id, role_id, parent_id, page);

        if (returnData.statusCode === CONSTANTS.SUCCESS) {

            return apiSuccessRes(req, res, 'SUCCESS', returnData.data);
        } else {
            return apiSuccessRes(req, res, 'not found data');
        }
    } catch (e) {
        return apiErrorRes(req, res, 'Enter valid param!', e);
    }
}


async function getChildUserList(req, res) {

    try {
        let {
            user_id
        } = req.body;

        const createSeriesSchema = Joi.object({
            user_id: Joi.number().required()
        });

        await createSeriesSchema.validate(req.body, {
            abortEarly: true
        });

        let userData = await adminMatchService.getChildUserList(user_id);

        if (userData.statusCode === CONSTANTS.SUCCESS) {

            return apiSuccessRes(req, res, 'SUCCESS', userData.data);
        } else {
            return apiSuccessRes(req, res, 'not found data');
        }
    } catch (e) {
        console.log(e);
        return apiErrorRes(req, res, 'Enter valid param!', e);
    }
}



async function settlementHistoryByParent(req, res) {

    try {
        let {
            user_id,
            page
        } = req.body;

        const createSeriesSchema = Joi.object({
            user_id: Joi.number().required(),
            page: Joi.number().required()
        });

        await createSeriesSchema.validate(req.body, {
            abortEarly: true
        });

        let returnData = await reportService.settlementHistoryByParent(user_id, page);

        if (returnData.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'SUCCESS', returnData.data);
        } else {
            return apiSuccessRes(req, res, 'not found data');
        }
    } catch (e) {
        return apiErrorRes(req, res, 'Enter valid param!', e);
    }
}


async function userPosition(req, res) {

    try {
        let {
            user_id,
            role_id,
            match_id,
            market_id
        } = req.body;

        const createSeriesSchema = Joi.object({
            match_id: Joi.number().required(),
            role_id: Joi.number().required(),
            user_id: Joi.number().required(),
            market_id: Joi.string().required(),
        });

        await createSeriesSchema.validate(req.body, {
            abortEarly: true
        });

        let getUserById = await userService.getUserById(user_id);

        let parent_id = '';
        let parent_user_type_id = '';
        if (getUserById.statusCode === CONSTANTS.SUCCESS && role_id != CONSTANTS.USER_TYPE_SUPER_ADMIN) {
            parent_id = getUserById.data.parent_id;
            let getParentUserById = await userService.getUserById(parent_id);
            if (getParentUserById.statusCode === CONSTANTS.SUCCESS) {
                parent_user_type_id = getParentUserById.data.role_id;
            }
        }

        let ownData = await adminMatchService.userPosition(user_id, role_id, match_id, market_id, );


        let userPositionData = await adminMatchService.ourUserPosition(user_id, role_id, match_id, market_id);

        let finalData = { "ownPosition": [], "userPosition": [] };
        if (ownData.statusCode === CONSTANTS.SUCCESS) {
            finalData['ownPosition'] = ownData.data;
            finalData['userPosition'] = userPositionData.data;
        }
        //console.log(finalData);
        return apiSuccessRes(req, res, 'SUCCESS', finalData);
    } catch (e) {
        return apiErrorRes(req, res, 'Enter valid param!', e);
    }
}

async function myMarketList(req, res) {
    let {
        user_id,
        role_id,
        sport_id
    } = req.body;

    const profilechema = Joi.object({
        user_id: Joi.number().required(),
        role_id: Joi.number().required(),
        sport_id: Joi.number().required(),
    });
    let data = {
        user_id,
        role_id,
        sport_id
    };
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let getMyMatchList = await adminMatchService.getMyMarketList(data);
    if (getMyMatchList.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'success', getMyMatchList.data);
    } else if (getMyMatchList.statusCode === CONSTANTS.NOT_FOUND) {
        return apiErrorRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiErrorRes(req, res, 'Error to my match list.', CONSTANTS.BLANK_ARRAY);
    }
}

async function getMatchesInplay(req, res) {

    let {
        user_id,
        role_id,
        sport_id
    } = req.body;
    const profilechema = Joi.object({
        user_id: Joi.number().required(),
        role_id: Joi.number().required(),
        sport_id: Joi.number().required(),
    });
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let data = {
        user_id,
        role_id,
        sport_id
    };
    let getDashboardInplayMatches = await adminMatchService.getInplayMatchesList(data);
    if (getDashboardInplayMatches.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success', getDashboardInplayMatches.data);
    } else if (getDashboardInplayMatches.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiSuccessRes(req, res, 'Error to Sports.', CONSTANTS.BLANK_ARRAY);
    }
}
async function FancyUserPosition(req, res) {
    try {
        let {
            user_id,
            role_id,
            match_id,
            fancy_id
        } = req.body;

        const createSeriesSchema = Joi.object({
            match_id: Joi.number().required(),
            role_id: Joi.number().required(),
            user_id: Joi.number().required(),
            fancy_id: Joi.string().required(),
        });

        await createSeriesSchema.validate(req.body, {
            abortEarly: true
        });

        let getUserById = await userService.getUserById(user_id);

        let parent_id = '';
        let parent_user_type_id = '';
        if (getUserById.statusCode === CONSTANTS.SUCCESS && role_id != CONSTANTS.USER_TYPE_SUPER_ADMIN) {
            parent_id = getUserById.data.parent_id;
            let getParentUserById = await userService.getUserById(parent_id);
            if (getParentUserById.statusCode === CONSTANTS.SUCCESS) {
                parent_user_type_id = getParentUserById.data.role_id;
            }
        }

        let fancyList = await adminMatchService.userFancyPosition(user_id, match_id, fancy_id, role_id);

        if (fancyList.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'post ', fancyList.data);
        } else {
            return apiErrorRes(req, res, 'Error to get Fancy.', CONSTANTS.BLANK_ARRAY);
        }
    } catch (e) {
        return apiErrorRes(req, res, 'Enter valid param!', e);
    }
}



async function settlementDelete(req, res) {

    try {
        let {
            settlement_id,
            password
        } = req.body;

        const createSeriesSchema = Joi.object({
            settlement_id: Joi.number().required(),
            //password: Joi.optional().required()
            password: Joi.optional()
        });

        await createSeriesSchema.validate(req.body, {
            abortEarly: true
        });

        /*let loginUserData = userModel.getUserData();
        let user_type_id = loginUserData.user_type_id;

        if(user_type_id === CONSTANTS.USER_TYPE_ADMIN){*/

        //let getUserDetails = await userService.verifyUser(userid, password);
        //if (getUserDetails.statusCode === CONSTANTS.SUCCESS) {

        let returnData = await adminMatchService.deleteSettlement(settlement_id);

        if (returnData.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, returnData.data);
        } else {
            return apiErrorRes(req, res, returnData.data);
        }

        //} else {
        //	return apiErrorRes(req, res, 'Un-authorized user !');
        //}

        /*}else{
        	return apiErrorRes(req, res, 'Unauthorized Access !');
        }*/

    } catch (e) {
        return apiErrorRes(req, res, 'Enter valid param!', e);
    }
}

async function addCasinoMatches(req, res) {

    //let getCasinoSports = await adminMatchService.getCasinoSports();
    let sport_id = req.query.sport_id;
    if (sport_id === null || sport_id === '') {
        return apiErrorRes(req, res, 'Sport id required !', CONSTANTS.BLANK_ARRAY);
    }


    try {

        let response = await adminMatchService.saveCasinoMatches(sport_id);

        if (response.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Saved successfully', response.data);
        } else {
            return apiErrorRes(req, res, response.data);
        }

    } catch (e) {
        return apiErrorRes(req, res, 'Error in add casino match.!', e);
    }
    //let getCasinoSports = await adminMatchService.saveCasinoMatches(sportsData);		
    //return apiSuccessRes(req, res, 'Success', tempdata);

}

async function setCasinoTvUrl(req, res) {

    try {

        let response = await adminMatchService.setCasinoTvUrl();
        console.log('setCasinoTvUrl ------------- ', response);
        if (response.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Saved successfully', response.data);
        } else {
            return apiErrorRes(req, res, response.data);
        }

    } catch (e) {
        console.log(e);
        return apiErrorRes(req, res, 'Error in add casino match.!', e);
    }
    //let getCasinoSports = await adminMatchService.saveCasinoMatches(sportsData);		
    //return apiSuccessRes(req, res, 'Success', tempdata);

}


async function addCasinoUpMatkaMatches(req, res) {

    //let getCasinoSports = await adminMatchService.getCasinoSports();
    let sport_id = req.query.sport_id;
    if (sport_id === null || sport_id === '') {
        return apiErrorRes(req, res, 'Sport id required !', CONSTANTS.BLANK_ARRAY);
    }


    try {

        let response = await adminMatchService.saveCasinoUpMatkaMatches(sport_id);

        if (response.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Saved successfully', response.data);
        } else {
            return apiErrorRes(req, res, response.data);
        }

    } catch (e) {
        return apiErrorRes(req, res, 'Error in add casino match.!', e);
    }
}



async function clearUserLogsData(req, res) {


    try {

        let response = await adminMatchService.clearUserLogsData();

        if (response.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Successfully', response.data);
        } else {
            return apiErrorRes(req, res, response.data);
        }

    } catch (e) {
        return apiErrorRes(req, res, 'Error in clear data!', e);
    }
}


async function setCasinoResultRecord(req, res) {

    try {

        let sport_id = req.query.sport_id;
        let db_sport_id = req.query.db_sport_id;

        if (sport_id === null || sport_id === '') {
            return apiErrorRes(req, res, 'Sport id required !', CONSTANTS.BLANK_ARRAY);
        }
        if (db_sport_id === null || db_sport_id === '') {
            return apiErrorRes(req, res, 'DB Sport id required !', CONSTANTS.BLANK_ARRAY);
        }
        let data = { db_sport_id: db_sport_id, sport_id: sport_id };

        let response = await adminMatchService.casinoResultRecord(data);

        if (response.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Successfully', response.data);
        } else {
            return apiErrorRes(req, res, response.data);
        }

    } catch (e) {
        return apiErrorRes(req, res, 'Error in result data!', e);
    }
}

/* async function CasinoDiamonToLotusTODI(req, res) { 	
		
	try{
		
		/* let sport_id=req.query.sport_id;
		
		if(sport_id === null || sport_id ===''){
			return apiErrorRes(req, res, 'Sport id required !',CONSTANTS.BLANK_ARRAY);
		} *
		let response = await axios.get(CONSTANTS.T_TODI);

		//function convert_diamond_T1day(string){
		
			let mainjson=response.data;		
	
			let main_array=[];
			let newjson={};
			newjson.createdBy="teenpatti";
			newjson.marketHeader="Match odds";
			newjson.roundId=mainjson.data.bf[0].marketId;
			newjson.indexCard=[];
			newjson.id="";
			newjson.gameId="56767";
			let marketRunner=[];
	
			let first_index={};
	
			let cards=[];
	
			if(mainjson.data.bf[0].C1!="1"){
				cards.push(mainjson.data.bf[0].C1);
			}
			if(mainjson.data.bf[0].C2!="1"){
				cards.push(mainjson.data.bf[0].C2);
			}
			if(mainjson.data.bf[0].C3!="1"){
				cards.push(mainjson.data.bf[0].C3);
			}
			first_index.cards=cards;
			first_index.type="plain";
	
			let back=[{price: mainjson.data.bf[0].b1, size: mainjson.data.bf[0].bs1}];
			let lay=[{price: mainjson.data.bf[0].l1, size: mainjson.data.bf[0].ls1}];
			first_index.back=back;
			first_index.lay=lay;
			first_index.id=mainjson.data.bf[0].sectionId;
			first_index.name=mainjson.data.bf[0].nation;
			first_index.sortPriority=1;
			first_index.pl=0;
			first_index.status=mainjson.data.bf[0].gstatus;
			first_index.resDesc="";
	
	
			let second_index={};
	
			let cards_s=[];
			if(mainjson.data.bf[1].C1!="1"){
				cards_s.push(mainjson.data.bf[1].C1);
			}
			if(mainjson.data.bf[1].C2!="1"){
				cards_s.push(mainjson.data.bf[1].C2);
			}
			if(mainjson.data.bf[1].C3!="1"){
				cards_s.push(mainjson.data.bf[1].C3);
			}
			second_index.cards=cards_s;
			second_index.type="plain";
	
	
			let back1=[{price: mainjson.data.bf[1].b1, size: mainjson.data.bf[1].bs1}];
			let lay1=[{price: mainjson.data.bf[1].l1, size: mainjson.data.bf[1].ls1}];
			second_index.back=back1;
			second_index.lay=lay1;
			second_index.id=mainjson.data.bf[1].sectionId;
			second_index.name=mainjson.data.bf[1].nation;
			second_index.sortPriority=2;
			second_index.pl=0;
			second_index.status=mainjson.data.bf[1].gstatus;
			second_index.resDesc="";
	
			marketRunner.push(first_index);
			marketRunner.push(second_index);
			newjson.marketRunner=marketRunner;
			newjson.gameType="teenpatti";
			newjson.gameSubType="oneDay";
			newjson.runnerType="plain";
			newjson.stage=0;
			newjson.timer=mainjson.data.bf[0].lasttime;
			newjson.createdAt="";
			newjson.updatedAt="";
			newjson.v=0;
			newjson.marketValidity=0;
			newjson.status="OPEN";
			newjson.matchName="Live Teenpatti";
			main_array.push(newjson);
			//return main_array;
		//}

		return apiSuccessRes(req, res, 'Successfully',main_array);
		//let response = await adminMatchService.CasinoDiamonToLotus(sport_id);
		
		if (response.statusCode === CONSTANTS.SUCCESS) {
			return apiSuccessRes(req, res, 'Successfully',[]);
		} else {
			return apiErrorRes(req, res, response.data);
		}	
		
	}
	catch(e){
		return apiErrorRes(req, res, 'Error in result data!', e);
	}			
}


async function CasinoDiamonToLotusT20(req, res) { 	
		
	try{
		
		/* let sport_id=req.query.sport_id;
		
		if(sport_id === null || sport_id ===''){
			return apiErrorRes(req, res, 'Sport id required !',CONSTANTS.BLANK_ARRAY);
		} *
		let response = await axios.get(CONSTANTS.T_T20);

	
			let mainjson=response.data;			
	
			let main_array=[];
			let newjson={};
			newjson.createdBy="t20tp";
			newjson.marketHeader="Match odds";
			newjson.roundId=mainjson.data.t1[0].mid;
			newjson.indexCard=[];
			newjson.id="";
			newjson.gameId="56768";
			let marketRunner=[];
	
			let first_index={};
	
			let cards=[];
	
			if(mainjson.data.t1[0].C1!="1"){
				cards.push(mainjson.data.t1[0].C1);
			}
			if(mainjson.data.t1[0].C2!="1"){
				cards.push(mainjson.data.t1[0].C2);
			}
			if(mainjson.data.t1[0].C3!="1"){
				cards.push(mainjson.data.t1[0].C3);
			}
			first_index.cards=cards;
			first_index.type="plain";
	
			let back=[{price: mainjson.data.t2[0].rate, size: ""}];
			let lay=[];
			first_index.back=back;
			first_index.lay=lay;
			first_index.id=mainjson.data.t2[0].sid;
			first_index.name="Player A";
			first_index.sortPriority=1;
			first_index.pl=0;
			first_index.status=(mainjson.data.t2[0].gstatus=="0")?"SUSPENDED":"ACTIVE";
			first_index.resDesc="";
	
	
			let second_index={};
	
			let cards_s=[];
			if(mainjson.data.t1[0].C4!="1"){
				cards_s.push(mainjson.data.t1[0].C4);
			}
			if(mainjson.data.t1[0].C5!="1"){
				cards_s.push(mainjson.data.t1[0].C5);
			}
			if(mainjson.data.t1[0].C6!="1"){
				cards_s.push(mainjson.data.t1[0].C6);
			}
			second_index.cards=cards_s;
			second_index.type="plain";
	
	
			let back1=[{price: mainjson.data.t2[2].rate, size:""}];
			let lay1=[];
			second_index.back=back1;
			second_index.lay=lay1;
			second_index.id=mainjson.data.t2[2].sid;
			second_index.name="Player B";
			second_index.sortPriority=2;
			second_index.pl=0;
			second_index.status=(mainjson.data.t2[2].gstatus=="0")?"SUSPENDED":"ACTIVE";;
			second_index.resDesc="";
	
			marketRunner.push(first_index);
			marketRunner.push(second_index);
			newjson.marketRunner=marketRunner;
			newjson.gameType="teenpatti";
			newjson.gameSubType="T20";
			newjson.runnerType="plain";
			newjson.stage=0;
			newjson.timer=mainjson.data.t1[0].autotime;
			newjson.createdAt="";
			newjson.updatedAt="";
			newjson.v=0;
			newjson.marketValidity=0;
			newjson.status="OPEN";
			newjson.matchName="Teenpatti T20";
			main_array.push(newjson);
	
	
			//second index
	
			let newjson1={};
			newjson1.createdBy="t20tp";
			newjson1.marketHeader="Pair Plus";
			newjson1.roundId=mainjson.data.t1[0].mid;
			newjson1.indexCard=[];
			newjson1.id="";
			newjson1.gameId="56768";
			let marketRunner1=[];
	
			let first_index1={};
	
			let cards1=[];
	
			if(mainjson.data.t1[0].C1!="1"){
				cards1.push(mainjson.data.t1[0].C1);
			}
			if(mainjson.data.t1[0].C2!="1"){
				cards1.push(mainjson.data.t1[0].C2);
			}
			if(mainjson.data.t1[0].C3!="1"){
				cards1.push(mainjson.data.t1[0].C3);
			}
			first_index1.cards=cards1;
			first_index1.type="plus";
	
			let back1=[{price: mainjson.data.t2[1].rate, size: ""}];
			let lay1=[];
			first_index1.back=back1;
			first_index1.lay=lay1
			first_index1.id=mainjson.data.t2[1].sid;
			first_index1.name="Player A+";
			first_index1.sortPriority=1;
			first_index1.pl=0;
			first_index1.status=(mainjson.data.t2[1].gstatus=="0")?"SUSPENDED":"ACTIVE";
			first_index1.resDesc="";
	
	
			let second_index1={};
	
			let cards_s1=[];
			if(mainjson.data.t1[0].C4!="1"){
				cards_s1.push(mainjson.data.t1[0].C4);
			}
			if(mainjson.data.t1[0].C5!="1"){
				cards_s1.push(mainjson.data.t1[0].C5);
			}
			if(mainjson.data.t1[0].C6!="1"){
				cards_s1.push(mainjson.data.t1[0].C6);
			}
			second_index1.cards=cards_s1;
			second_index1.type="plus";
	
	
			let back11=[{price: mainjson.data.t2[3].rate, size:""}];
			let lay11=[];
			second_index1.back=back11;
			second_index1.lay=lay11;
			second_index1.id=mainjson.data.t2[3].sid;
			second_index1.name="Player B+";
			second_index1.sortPriority=2;
			second_index1.pl=0;
			second_index1.status=(mainjson.data.t2[3].gstatus=="0")?"SUSPENDED":"ACTIVE";;
			second_index1.resDesc="";
	
			marketRunner1.push(first_index1);
			marketRunner1.push(second_index1);
			newjson1.marketRunner=marketRunner1;
			newjson1.gameType="teenpatti";
			newjson1.gameSubType="T20";
			newjson1.runnerType="plus";
			newjson1.stage=0;
			newjson1.timer=mainjson.data.t1[0].autotime;
			newjson1.createdAt="";
			newjson1.updatedAt="";
			newjson1.v=0;
			newjson1.marketValidity=0;
			newjson1.status="OPEN";
			newjson1.matchName="Teenpatti T20";
			main_array.push(newjson1);
	
			//console.log("main_array---",main_array);
	
			//return main_array;
		
		return apiSuccessRes(req, res, 'Successfully',main_array);
		//let response = await adminMatchService.CasinoDiamonToLotus(sport_id);
		
		if (response.statusCode === CONSTANTS.SUCCESS) {
			return apiSuccessRes(req, res, 'Successfully',[]);
		} else {
			return apiErrorRes(req, res, response.data);
		}	
		
	}
	catch(e){
		return apiErrorRes(req, res, 'Error in result data!', e);
	}			
} */

async function setResultBySportId(req, res) {

    try {

        let sport_id = req.query.sport_id;
        let db_sport_id = req.query.db_sport_id;

        if (sport_id === null || sport_id === '') {
            return apiErrorRes(req, res, 'Sport id required !', CONSTANTS.BLANK_ARRAY);
        }

        let response = await adminMatchService.setResultBySportId(sport_id);

        if (response.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Successfully', response.data);
        } else {
            return apiErrorRes(req, res, response.data);
        }

    } catch (e) {
        return apiErrorRes(req, res, 'Error in result data!', e);
    }
}


async function addcasinomatchbycurl(req, res) {

    try {
        let {
            sport_id,
            data
        } = req.body;

        const createSeriesSchema = Joi.object({
            sport_id: Joi.number().required(),
            data: Joi.object().required()
        });

        await createSeriesSchema.validate(req.body, {
            abortEarly: true
        });
        let returnData;
        if (sport_id == CONSTANTS.BETFAIR_SPORT_ANDER_BAHAR_D) {
            returnData = await adminMatchService.addcasinoMatchAnderBhar(sport_id, data);

        } else if (sport_id == CONSTANTS.BETFAIR_SPORT_WARLI_MATKA) {
            returnData = await adminMatchService.addcasinoMatchWorliMatka(sport_id, data);

        } else {
            returnData = await adminMatchService.addcasinomatchbycurl(sport_id, data);
        }


        if (returnData.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, returnData.data);
        } else if (returnData.statusCode === CONSTANTS.MATCH_POST_BLANK) {
            return apiSuccessRes(req, res, 'Send request data blank. post array blank');
        } else if (returnData.statusCode === CONSTANTS.MATCH_NOT_ADDED_DECLEAR) {
            return apiSuccessRes(req, res, 'Match not found in database. status closed');
        } else if (returnData.statusCode === CONSTANTS.MATCH_ABANDONED) {
            return apiSuccessRes(req, res, 'Match result abandoned successfully.');
        } else if (returnData.statusCode === CONSTANTS.MATCH_DECLEAR) {
            return apiSuccessRes(req, res, 'Match result set successfully');
        } else if (returnData.statusCode === CONSTANTS.ALREADY_EXISTS) {
            return apiSuccessRes(req, res, 'Match alreay added.');
        } else {
            return apiErrorRes(req, res, 'save match error', returnData.data);
        }



    } catch (e) {
        return apiErrorRes(req, res, 'Enter valid param!', e);
    }
}


async function recalculatFancyPosition(req, res) {

    try {
        let {
            user_id,
            match_id,
            fancy_id
        } = req.body;

        const createSeriesSchema = Joi.object({
            user_id: Joi.number().required(),
            match_id: Joi.number().required(),
            fancy_id: Joi.number().required()
        });

        await createSeriesSchema.validate(req.body, {
            abortEarly: true
        });

        let returnData = await adminMatchService.createFancyPosition(user_id, match_id, fancy_id);

        if (returnData.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Success', returnData.data);
        } else {
            return apiErrorRes(req, res, 'save match error', returnData.data);
        }



    } catch (e) {
        return apiErrorRes(req, res, 'Enter valid param!', e);
    }
}


async function placeBetfairBet(req, res) {

    const result = browser(req.headers['user-agent']);
    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    let device_info = Object.keys(result)[0];

    let { match_id, market_id, selection_id, odds, stack, is_back, user_id } = req.body;
    const profilechema = Joi.object().keys({
        match_id: Joi.string().required(),
        market_id: Joi.string().required(),
        selection_id: Joi.string().required(),
        odds: Joi.string().required(),
        stack: Joi.string().required(),
        is_back: Joi.string().required(),
        user_id: Joi.string().required(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let id = parseInt(await base64Decode(user_id));
    match_id = parseInt(await base64Decode(match_id));
    selection_id = parseInt(await base64Decode(selection_id));
    odds = await base64Decode(odds);
    market_id = await base64Decode(market_id);
    stack = parseInt(await base64Decode(stack));
    is_back = await base64Decode(is_back);

    if (odds <= CONSTANTS.ODDMINLIMIT) {
        return apiErrorRes(req, res, 'Min odds limit (' + CONSTANTS.ODDMINLIMIT + ') is exceeded ');
    }

    let getMarketDetail = { market_id, match_id, id };
    let marketData = await marketsService.gatDataByMarketId(getMarketDetail);

    if (marketData.statusCode == CONSTANTS.SUCCESS) {

        if (marketData.data.is_result_declared == 'Y') {
            return apiErrorRes(req, res, 'Result already declared for this Market ');
        } else if (marketData.data.status == 'N') {
            return apiErrorRes(req, res, 'This Market is deactivated');
        }
    } else {
        return apiErrorRes(req, res, 'This Market is invalid');
    }
    let matchID = marketData.data.match_id;
    let MarketType = marketData.data.market_type;
    let selectCondition = { selection_id, matchID, market_id };

    //let betFairOdss = await exchangeService.getOddsRate(market_id, selection_id, is_back, MarketType);

    let betFairOdss = await exchangeService.getOddsRate(market_id, selection_id, is_back, MarketType);
    //console.log('betFairOdss------------------------- ', betFairOdss);

    let is_matched = "0",
        p_l, redisOdds3 = "",
        redisOdds2 = "",
        redisOdds, redisStatus, liability, adminOdds;
    redisOdds = betFairOdss.data.odds;
    redisStatus = betFairOdss.data.status;

    if (redisStatus != 'OPEN') {
        return apiErrorRes(req, res, "Can not place bet on closed market");
    }


    if (is_back == "1") {
        let redisOdds2 = parseFloat(redisOdds) + parseFloat(marketData.data.backRateDiff);
        let redisOdds3 = "";
        adminOdds = parseFloat(marketData.data.backRateDiff);

        if (settings.BET_PLACE_ODDS_RATE == 1) {
            redisOdds3 = parseFloat(odds); //+ parseFloat(marketData.data.backRateDiff);
        } else {
            redisOdds3 = parseFloat(redisOdds) + parseFloat(marketData.data.backRateDiff);
        }
        is_matched = "1";
        /* if (parseFloat(odds) <= parseFloat(redisOdds2)) {
        	is_matched = "1";
        } else {
        	if (CONSTANTS.UN_MATCH_BET_ALLOW_OR_NOT == 0) {
        		return apiErrorRes(req, res, "Rate has been changed");
        	} else {
        		is_matched = "0";
        	}
        } */
        if (settings.BOOK_MAKER_MANUAL_MARKET_BET_FORMATE_INDIAN_BETFAIR == 'INDIAN' && marketData.data.market_type == 'BM') {
            odds = redisOdds3;
            p_l = Number((((odds / 100) + 1) * stack) - stack);
            liability = Number(stack);

        } else {

            odds = redisOdds3;
            p_l = Number((odds * stack) - stack);
            liability = Number(stack);
        }


    } else {
        let redisOdds2 = parseFloat(redisOdds) + parseFloat(marketData.data.layRateDiff);
        let redisOdds3 = "";
        adminOdds = parseFloat(marketData.data.layRateDiff);

        if (settings.BET_PLACE_ODDS_RATE == 1) {
            redisOdds3 = parseFloat(odds); // + parseFloat(marketData.data.layRateDiff);
        } else {
            redisOdds3 = parseFloat(redisOdds) + parseFloat(marketData.data.layRateDiff);
        }
        is_matched = "1";
        /* if (parseFloat(odds) >= parseFloat(redisOdds2)) {
        	is_matched = "1";
        } else {
        	if (CONSTANTS.UN_MATCH_BET_ALLOW_OR_NOT == 0) {
        		return apiErrorRes(req, res, "Rate has been changed");
        	} else {
        		is_matched = "0";
        	}
        } */
        if (settings.BOOK_MAKER_MANUAL_MARKET_BET_FORMATE_INDIAN_BETFAIR == 'INDIAN' && marketData.data.market_type == 'BM') {
            odds = redisOdds3;
            liability = Number((((odds / 100) + 1) * stack) - stack);
            p_l = Number(stack);

        } else {

            odds = redisOdds3;
            liability = Number((odds * stack) - stack);
            p_l = Number(stack);
        }
        /* odds = redisOdds3;
        liability = (odds * stack) - stack;
        p_l = stack; */
    }


    let getSelectionRecord = await selectionService.getNameBySelectionId(selectCondition);
    if (getSelectionRecord.statusCode !== CONSTANTS.SUCCESS) {
        return apiErrorRes(req, res, 'Selected option is invalid');
    } else {
        if (getSelectionRecord.data === null) {
            return apiErrorRes(req, res, 'Selected option is Not Found!');
        }
    }
    let sportId = marketData.data.sport_id;
    let userData = await userService.getUserByUserIdInBetServices(id);
    userData = userData.data;

    let agent_id = userData.agent_id;

    if (userData.agent_id != userData.parent_id) {
        return apiErrorRes(req, res, 'User is not valid');
    }
    let inplayDate = Math.floor(Date.now() / 1000);
    if (marketData.data.BetAllowTimeBefore != 0 && ((marketData.data.start_date - marketData.data.BetAllowTimeBefore) > inplayDate)) {
        return apiErrorRes(req, res, 'Bet is not allowed on this market');
    }
    if (marketData.data.matchBetAllow == 'N' && marketData.data.market_type != 'BM' && settings.BOOK_MAKER_MANUAL_MARKET_BET_OPEN_CLOSE == 'OPEN') {
        return apiErrorRes(req, res, 'Bet is not allowed on this match');
    }

    let getPartnerShipData = { id, sportId };
    let servicePartnershipData = await partnershipsService.getPartnershipByUserId(getPartnerShipData);

    if (servicePartnershipData.statusCode !== CONSTANTS.SUCCESS) {
        return apiErrorRes(req, res, 'Partner ships is not defined properly');
    } else {
        if (servicePartnershipData.data.user_type_id != CONSTANTS.USER_TYPE_USER) {
            return apiErrorRes(req, res, 'User is not valid');
        }
    }

    let userSetting = await userSettingSportWiseService.getUserSettingBySport(sportId, id);
    userSetting = userSetting.data;

    /* let betDelay = '';
	if (marketData.data.bet_delay > userSetting.bet_delay) {
		
		betDelay = marketData.data.bet_delay;
		
	} else {
		betDelay = userSetting.bet_delay;
	}

	if(settings.BOOK_MAKER_MANUAL_MARKET_BET_DELAY_ON_OFF =='OFF' && marketData.data.market_type =='BM' )
		{
			betDelay =0;
		}
 */
    //await delay((betDelay) * 1000);

    //if (betDelay > 0) {

    /* 	let marketDataDelay = await marketsService.gatDataByMarketId(getMarketDetail);

    	if (marketDataDelay.statusCode == CONSTANTS.SUCCESS) {

    		if (marketDataDelay.data.is_result_declared == 'Y') {
    			return apiErrorRes(req, res, 'Result already declared for this Market ');
    		} else if (marketDataDelay.data.status == 'N') {
    			return apiErrorRes(req, res, 'This Market is deactivated');
    		}
    	} else {
    		return apiErrorRes(req, res, 'This Market is invalid');
    	}
    	if (marketDataDelay.data.matchBetAllow == 'N') {
    		return apiErrorRes(req, res, 'Bet is not allowed on this match');
    	}

    	let betFairOdssAfterDelay = await exchangeService.getOddsRate(market_id, selection_id, is_back, MarketType);
    	//console.log('betFairOdss------------------------- ', betFairOdss);

    	redisOdds = betFairOdssAfterDelay.data.odds;
    	redisStatus = betFairOdssAfterDelay.data.status;
    	console.log('redisStatus after dealy -----------',redisStatus);
    	if (redisStatus != 'OPEN') {
    		return apiErrorRes(req, res, "Can not place bet on closed market");
    	}
    	if (is_back == "1") {
    		redisOdds2 = parseFloat(redisOdds) + parseFloat(marketDataDelay.data.backRateDiff);
    		//let redisOdds3 = "";
    		adminOdds = parseFloat(marketDataDelay.data.backRateDiff);

    		if (settings.BET_PLACE_ODDS_RATE == 1) {
    			redisOdds3 = parseFloat(odds);// + parseFloat(marketData.data.backRateDiff);
    		} else {
    			redisOdds3 = parseFloat(redisOdds) + parseFloat(marketData.data.backRateDiff); 
    		}

    		if (parseFloat(odds) <= parseFloat(redisOdds2)) {
    			is_matched = "1";
    		} else {
    			if (CONSTANTS.UN_MATCH_BET_ALLOW_OR_NOT == 0) {
    				return apiErrorRes(req, res, "Rate has been changed");
    			} else {
    				is_matched = "0";
    			}
    		}
    		if(settings.BOOK_MAKER_MANUAL_MARKET_BET_FORMATE_INDIAN_BETFAIR=='INDIAN' && marketData.data.market_type=='BM')
    		{
    			odds = redisOdds3;
    			p_l = Number((((odds/100) + 1) * stack) - stack);
    			liability = Number(stack);

    		}else{
    			
    			odds = redisOdds3;
    			p_l = Number((odds * stack) - stack);
    			liability = Number(stack);	
    		}

    		
    	} else {
    		redisOdds2 = parseFloat(redisOdds) + parseFloat(marketDataDelay.data.layRateDiff);
    		//let redisOdds3 = "";
    		adminOdds = parseFloat(marketDataDelay.data.layRateDiff);

    		if (settings.BET_PLACE_ODDS_RATE == 1) {
    			redisOdds3 = parseFloat(odds);// + parseFloat(marketData.data.layRateDiff);
    		} else {
    			redisOdds3 = parseFloat(redisOdds) + parseFloat(marketData.data.layRateDiff); 
    		}
    		if (parseFloat(odds) >= parseFloat(redisOdds2)) {
    			is_matched = "1";
    		} else {
    			if (CONSTANTS.UN_MATCH_BET_ALLOW_OR_NOT == 0) {
    				return apiErrorRes(req, res, "Rate has been changed");
    			} else {
    				is_matched = "0";
    			}
    		}
    		if(settings.BOOK_MAKER_MANUAL_MARKET_BET_FORMATE_INDIAN_BETFAIR=='INDIAN' && marketData.data.market_type=='BM')
    		{
    			odds = redisOdds3;
    			liability = Number((((odds/100) + 1) * stack) - stack);
    			p_l = Number(stack);
    		}else{
    			
    			odds = redisOdds3;
    			liability = Number((odds * stack) - stack);
    			p_l = Number(stack);
    		}
    	} */
    //}

    let reqdaaObj = {
        user_id: id,
        sport_id: marketData.data.sport_id,
        match_id: marketData.data.match_id,
        market_id: market_id,
        market_name: marketData.data.marketName,
        selection_id: getSelectionRecord.data.selection_id,
        selection_name: getSelectionRecord.data.selectionName,
        selection_liability_type: getSelectionRecord.data.liability_type,
        odds: odds,
        redis_odds: redisOdds,
        admin_odds: adminOdds,
        stack: stack,
        is_back: is_back,
        p_l: p_l,
        liability: -liability,
        profit: 0,
        chips: 0,
        super_admin: servicePartnershipData.data.super_admin,
        admin: servicePartnershipData.data.admin,
        super_master: servicePartnershipData.data.super_master,
        master: servicePartnershipData.data.master,
        agent: servicePartnershipData.data.agent,

        super_admin_commission: (marketData.data.market_type == 'BM' && settings.BOOK_MAKER_COMMISSION_ON_OFF == "OFF") ? 0 : servicePartnershipData.data.super_admin_match_commission,
        admin_commission: (marketData.data.market_type == 'BM' && settings.BOOK_MAKER_COMMISSION_ON_OFF == "OFF") ? 0 : servicePartnershipData.data.admin_match_commission,
        super_master_commission: (marketData.data.market_type == 'BM' && settings.BOOK_MAKER_COMMISSION_ON_OFF == "OFF") ? 0 : servicePartnershipData.data.super_master_match_commission,
        master_commission: (marketData.data.market_type == 'BM' && settings.BOOK_MAKER_COMMISSION_ON_OFF == "OFF") ? 0 : servicePartnershipData.data.master_match_commission,
        agent_commission: (marketData.data.market_type == 'BM' && settings.BOOK_MAKER_COMMISSION_ON_OFF == "OFF") ? 0 : servicePartnershipData.data.agent_match_commission,
        user_commission: (marketData.data.market_type == 'BM' && settings.BOOK_MAKER_COMMISSION_ON_OFF == "OFF") ? 0 : servicePartnershipData.data.user_match_commission,

        is_matched: is_matched,
        device_type: 'W',
        ip_address: ip_address,
        redis_status: redisStatus,
        user_setting_data: userSetting,
        userDataById: userData,
        device_info: device_info
    };

    let validationError = await betService.validateBet(reqdaaObj);
    if (validationError.statusCode == 201) {
        return apiErrorRes(req, res, validationError.data);
    }

    let liabilityForBlance = reqdaaObj.liabilityForBlance;
    delete reqdaaObj.user_setting_data;
    delete reqdaaObj.liabilityForBlance;
    // delete reqdaaObj.userDataById;  
    delete reqdaaObj.redis_status;
    //console.log('reqdaaObj ----------- '+reqdaaObj+"---------------- liabilityForBlance --"+liabilityForBlance);return;
    let responceSaveBet = await betService.saveMarketBetData(reqdaaObj, liabilityForBlance);
    if (responceSaveBet.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Bet has been saved successfully', responceSaveBet.data);
    } else if (responceSaveBet.statusCode == 201) {
        return apiErrorRes(req, res, responceSaveBet.data);
    } else {
        return apiErrorRes(req, res, 'Unable to save bet.');
    }

}


async function placeFancyBet(req, res) {

    try {

        const result = browser(req.headers['user-agent']);
        let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        let device_info = Object.keys(result)[0];

        let {
            fancy_id,
            run,
            is_back,
            size,
            stack,
            match_id,
            sport_id,
            user_id
        } = req.body;

        const createSeriesSchema = Joi.object({
            size: Joi.string(),
            fancy_id: Joi.string().required(),
            run: Joi.string().required(),
            match_id: Joi.string().required(),
            sport_id: Joi.string().required(),
            stack: Joi.string().required(),
            is_back: Joi.string().required(),
            user_id: Joi.string().required(),
        });

        await createSeriesSchema.validate(req.body, {
            abortEarly: true
        });

        let id = parseInt(await base64Decode(user_id));
        fancy_id = await base64Decode(fancy_id);
        run = parseInt(await base64Decode(run));
        is_back = await base64Decode(is_back);
        size = parseInt(await base64Decode(size));
        stack = parseInt(await base64Decode(stack));
        match_id = parseInt(await base64Decode(match_id));
        sport_id = parseInt(await base64Decode(sport_id));

        let getFancyDetail = { fancy_id, match_id, id };

        let fancyData = await fancyService.getFancyById(getFancyDetail);


        let betFairFancy = await exchangeService.getFancyByFancyId(fancy_id, match_id, fancyData.data.fancyStatus);
        betFairFancy = betFairFancy.data;

        if (betFairFancy == null) {
            return apiErrorRes(req, res, "Fancy Closed");
        }
        if (betFairFancy.length == 0) {
            return apiErrorRes(req, res, "Fancy Closed");
        }
        if (betFairFancy.GameStatus != '') {
            return apiErrorRes(req, res, "Fancy Suspended");
        }
        /* 	if (is_back == 1) {
        		
        		if (betFairFancy.BackPrice1 != run) {
        			return apiErrorRes(req, res, "Run Changed");
        		}
        		if (betFairFancy.BackSize1 != size) {
        			return apiErrorRes(req, res, "Size Changed");
        		}
        	} else {
        		 
        		if (betFairFancy.LayPrice1 != run) {
        			return resultdb(CONSTANTS.VALIDATION_ERROR, "Run Changed");
        		}
        		if (betFairFancy.LaySize1 != size) {
        			return resultdb(CONSTANTS.VALIDATION_ERROR, "Size Changed");
        		}
        	} */



        if (fancyData.statusCode !== CONSTANTS.SUCCESS || fancyData.data === null) {
            return apiErrorRes(req, res, 'This fancy is invalid');
        }

        if (fancyData.data.status != 'A') {
            if (fancyData.data.status == 'I') {
                return apiErrorRes(req, res, 'This fancy is inactive');
            }
            if (fancyData.data.status == 'C') {
                return apiErrorRes(req, res, 'This fancy is suspended');
            }
        }

        let inplayDate = Math.floor(Date.now() / 1000);

        if (fancyData.data.BetAllowTimeBefore != 0 && (fancyData.data.start_date - fancyData.data.BetAllowTimeBefore) > inplayDate) {
            return apiErrorRes(req, res, 'Bet is not allowed on this market');
        }
        if (fancyData.data.matchFanceBetAllow == 'N') {
            return apiErrorRes(req, res, 'Bet is not allowed on this match');
        }

        let fancy_name = fancyData.data.fancyName;

        let sportId = sport_id;

        let userData = await userService.getUserByUserIdInBetServices(id);
        userData = userData.data;

        if (userData.agent_id != userData.parent_id) {
            return apiErrorRes(req, res, 'User is not valid');
        }
        let getPartnerShipData = { id, sportId };

        let servicePartnershipData = await partnershipsService.getPartnershipByUserId(getPartnerShipData);



        if (servicePartnershipData.statusCode !== CONSTANTS.SUCCESS) {
            return apiErrorRes(req, res, 'Partner ships is not defined properly');
        } else {
            if (servicePartnershipData.data.user_type_id != CONSTANTS.USER_TYPE_USER) {
                return apiErrorRes(req, res, 'User is not valid');
            }
        }

        let userSetting = await userSettingSportWiseService.getUserSettingBySport(sportId, id);
        userSetting = userSetting.data;
        /* let sessionDelay = '';
        if (fancyData.data.session_delay > userSetting.session_delay) {
        	sessionDelay = fancyData.data.session_delay;
        } else {
        	sessionDelay = userSetting.session_delay;
        } */

        /* 	if(settings.BOOK_MAKER_MANUAL_SESSION_BET_DELAY_ON_OFF =='OFF' && fancyData.data.fancyStatus =='M' )
        	{
        		sessionDelay =0;
        	}
        	await delay((sessionDelay) * 1000); */

        /* if (sessionDelay > 0) {
        	let fancyData = await fancyService.getFancyById(getFancyDetail);

        	if (fancyData.statusCode !== CONSTANTS.SUCCESS || fancyData.data === null) {
        		return apiErrorRes(req, res, 'This fancy is invalid');
        	}

        	if (fancyData.data.status != 'A') {
        		if (fancyData.data.status == 'I') {
        			return apiErrorRes(req, res, 'This fancy is inactive');
        		}
        		if (fancyData.data.status == 'C') {
        			return apiErrorRes(req, res, 'This fancy is suspended');
        		}
        	}

        	if (fancyData.data.matchFanceBetAllow == 'N') {
        		return apiErrorRes(req, res, 'Bet is not allowed on this match');
        	}

        	let betFairFancy = await exchangeService.getFancyByFancyId(fancy_id, match_id, fancyData.data.fancyStatus);
        	betFairFancy = betFairFancy.data;
        	if (betFairFancy == null) {
        		return apiErrorRes(req, res, "Fancy Closed");
        	}
        	if (betFairFancy.length == 0) {
        		return apiErrorRes(req, res, "Fancy Closed");
        	}
        	if (betFairFancy.GameStatus != '') {
        		return apiErrorRes(req, res, "Fancy Suspended");
        	}

        	if (is_back == 1) {
        		//data.redisRun=betFairFancy.BackPrice1;
        		//data.redisSize=betFairFancy.BackSize1;
        		if (betFairFancy.BackPrice1 != run) {
        			return apiErrorRes(req, res, "Run Changed");
        		}
        		if (betFairFancy.BackSize1 != size) {
        			return apiErrorRes(req, res, "Size Changed");
        		}
        	} else {
        		//data.redisRun=betFairFancy.LayPrice1;
        		//data.redisSize=betFairFancy.LaySize1;
        		if (betFairFancy.LayPrice1 != run) {
        			return resultdb(CONSTANTS.VALIDATION_ERROR, "Run Changed");
        		}
        		if (betFairFancy.LaySize1 != size) {
        			return resultdb(CONSTANTS.VALIDATION_ERROR, "Size Changed");
        		}
        	}
        } */

        let p_l, liability;
        stack = Number(stack);

        if (is_back == 1) {
            liability = stack;
            p_l = stack * (size / 100);
        } else {
            p_l = stack;
            liability = stack * (size / 100);
        }
        let reqdaaObj = {
            user_id: id,
            sport_id: sportId,
            match_id: match_id,
            fancy_id: fancy_id,
            fancy_name: fancy_name,
            run: run,
            stack: stack,
            is_back: is_back,
            profit: p_l,
            liability: -liability,
            chips: 0,
            type_id: 2,
            session_input_yes: 0,
            session_input_no: 0,
            point_difference: 0,
            size: size,
            super_admin: servicePartnershipData.data.super_admin,
            admin: servicePartnershipData.data.admin,
            super_master: servicePartnershipData.data.super_master,
            master: servicePartnershipData.data.master,
            agent: servicePartnershipData.data.agent,
            super_admin_commission: servicePartnershipData.data.super_admin_session_commission,
            admin_commission: servicePartnershipData.data.admin_session_commission,
            super_master_commission: servicePartnershipData.data.super_master_session_commission,
            master_commission: servicePartnershipData.data.master_session_commission,
            agent_commission: servicePartnershipData.data.agent_session_commission,
            user_commission: servicePartnershipData.data.user_session_commission,
            device_type: 'W',
            ip_address: ip_address,
            user_setting_data: userSetting,
            fancy_score_position_id: 0,
            fancy_score_position_json: [],
            liabilityFancy: 0,
            profitFancy: 0,
            userDataById: userData,
            device_info: device_info,
            created_at: globalFunction.currentDate(),
            is_manual_odds: fancyData.data.fancyStatus

        };
        //console.log('aviahshshshsh',reqdaaObj);
        let validationError = await betService.validateFancyBet(reqdaaObj);
        if (validationError.statusCode == 201) {
            return apiErrorRes(req, res, validationError.data);
        }
        let fancy_score_position = {
            user_id: id,
            match_id: match_id,
            fancy_id: fancy_id,
            super_admin_partnership: servicePartnershipData.data.super_admin,
            admin_partnership: servicePartnershipData.data.admin,
            super_master_partnership: servicePartnershipData.data.super_master,
            master_partnership: servicePartnershipData.data.master,
            agent_partnership: servicePartnershipData.data.agent,
            liability: reqdaaObj.liabilityFancy,
            profit: reqdaaObj.profitFancy,
            fancy_score_position_json: JSON.stringify(reqdaaObj.fancy_score_position_json)
        };
        let fancy_score_position_id = reqdaaObj.fancy_score_position_id;
        let liabilityForBlance = reqdaaObj.liabilityForBlance;

        delete reqdaaObj.user_setting_data;
        delete reqdaaObj.liabilityFancy;
        delete reqdaaObj.profitFancy;
        delete reqdaaObj.fancy_score_position_json;
        delete reqdaaObj.fancy_score_position_id;
        delete reqdaaObj.liabilityForBlance;
        delete reqdaaObj.max_session_bet_liability;
        delete reqdaaObj.max_session_liability;
        delete reqdaaObj.is_manual_odds;
        //console.log('reqdaaObj',reqdaaObj); 
        //console.log('fancy_score_position_id',fancy_score_position_id); 

        //return;
        let responceSaveBet = await betService.saveFancyBetData(reqdaaObj, fancy_score_position, fancy_score_position_id, liabilityForBlance);

        if (responceSaveBet.statusCode === CONSTANTS.SUCCESS) {

            return apiSuccessRes(req, res, 'Bet has been saved successfully');
        } else {
            return apiErrorRes(req, res, 'Unable to save bet');
        }

    } catch (e) {
        return apiErrorRes(req, res, e.details[0].message, e);
    } finally {
        //global._loggedInToken[findToken].IsBetRunning = 0;
    }
}


async function clearLiabilityAllUsers(req, res) {

    try {

        let response = await adminMatchService.clearLiabilityAllUsers();

        if (response.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Successfully', response.data);
        } else {
            return apiErrorRes(req, res, response.data);
        }

    } catch (e) {
        return apiErrorRes(req, res, 'Error in result data!', e);
    }
}
async function addSLOTEGRATORMatches(req, res) {

    try {


        let response = await adminMatchService.addSLOTEGRATORMatches();

        if (response.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Successfully', response.data);
        } else {
            return apiErrorRes(req, res, response.data);
        }

    } catch (e) {
        return apiErrorRes(req, res, 'Error in result data!', e);
    }
}

async function addFindisMatches(req, res) {

    try {


        let response = await adminMatchService.addFindisMatches();

        if (response.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Successfully', response.data);
        } else {
            return apiErrorRes(req, res, response.data);
        }

    } catch (e) {
        return apiErrorRes(req, res, 'Error in result data!', e);
    }
}

router.post('/backoffice-match-details', getMatchDetils);
router.post('/backoffice-casino-details', getCasinoMatchDetils);
router.post('/backoffice-casino-current-details', getCasinoliveMatchDetils);
router.post('/backoffice-match-completed', getMatchDetilCompleted);
router.post('/backoffice-match-fancy', getMatchIndianSessionByMarketId);
router.post('/backoffice-match-mrkt-bet-list', getMyBetFairMarketBets);
router.post('/backoffice-casino-mrkt-bet-list', getCasinoMatchAndMarketBets);
router.post('/backoffice-mtch-fancy-bet-list', getMatchFacnyBets);
router.post('/backoffice-complete-match-bet-list', getMyCompletedBetFairMarketBets);
router.post('/backoffice-dashboard', myDashboard);
router.post('/backoffice-settle-report', settlementReport);
router.post('/backoffice-p-l', ProfitLoss);
router.post('/backoffice-p-l-c', ProfitLossCommission);
router.post('/backoffice-sattlement', makeSettlement);
router.post('/backoffice-sattlement-c-history', settlementCollectionHistory);
router.post('/backoffice-sattlement-history', historyList);
router.post('/backoffice-sattlement-parent', settlementHistoryByParent);
router.post('/backoffice-match-position', userPosition);
router.post('/backoffice-my-market', myMarketList);
router.post('/backoffice-inplay-match', getMatchesInplay);
router.post('/backoffice-fancy-position', FancyUserPosition);
router.post('/backoffice-delete', settlementDelete);
router.get('/backoffice-casino-tv', setCasinoTvUrl);
router.get('/backoffice-casino-match', addCasinoMatches);
router.get('/backoffice-casino-match-add-updown-match', addCasinoUpMatkaMatches);
router.get('/backoffice-clear-log', clearUserLogsData);
router.get('/backoffice-casino-result-rec', setCasinoResultRecord);
router.get('/backoffice-casino-result-sport_id', setResultBySportId);
router.get('/backoffice-user-expo', clearLiabilityAllUsers);
router.get('/backoffice-add-slogrator-match', addSLOTEGRATORMatches);
router.get('/backoffice-add-fun-match', addFindisMatches);
router.post('/backoffice-add-casino-match', addcasinomatchbycurl);
router.post('/backoffice-fancy-positon', recalculatFancyPosition);
router.post('/backoffice-match-user', getMatchUsers);
router.post('/backoffice-place-betfair-bet', placeBetfairBet);
router.post('/backoffice-place-fancy-bet', placeFancyBet);
router.post('/backoffice-user-child', getChildUserList);

module.exports = router;