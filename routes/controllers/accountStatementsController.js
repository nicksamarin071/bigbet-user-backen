const express = require('express');
const router = express.Router();
const Joi = require('joi');
// const axios = require('axios');
// const settings = require('../../config/settings');
const accountStatementsservice = require('../services/accountStatementsservice');
const serviceUser = require('../services/userService');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');
const logger = require('../../utils/logger');
const errorlog = logger.errorlog;
let apiSuccessRes = globalFunction.apiSuccessRes;
let apiErrorRes = globalFunction.apiErrorRes;

async function chipInOut(req, res) {
    let {
        user_id,
        parent_id,
        description,
        amount,
        crdr
    } = req.body;

    const createMarketSchema = Joi.object({
        userid: Joi.number().required(),
        parent_ids: Joi.optional().required(),
        user_id: Joi.number().required(),
        parent_id: Joi.number().required(),
        description: Joi.optional(),

        amount: Joi.number().required(),
        crdr: Joi.number().valid(1, 2).required(),
    });

    try {
        await createMarketSchema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        errorlog.error('Invalid parameter.');
        return apiErrorRes(req, res, error.details[0].message);
    }
    let datafromService1 = await serviceUser.getUserById(user_id);
    console.log("datafromService1  ", datafromService1);
    if (datafromService1.statusCode === CONSTANTS.SUCCESS) {
        if (datafromService1.data.user_type_id === CONSTANTS.USER_TYPE_ADMIN) {
            let requestData = {
                user_id,
                parent_id,
                description,
                statement_type: CONSTANTS.ACCOUNT_STATEMENT_TYPE_CHIPINOUT,
                amount,
                userCurrentBalance: datafromService1.data.balance,
                crdr
            };
            if (amount > datafromService1.data.balance && crdr === CONSTANTS.DEBIT_TWO) {
                return apiSuccessRes(req, res, 'Insufficient  balance.');
            }
            let createParentAccountStatement = await accountStatementsservice.createAccStatementAndUpdateBalance(requestData);
            if (createParentAccountStatement.statusCode === CONSTANTS.SUCCESS) {
                return apiSuccessRes(req, res, 'Balance Updated.');
            } else {
                return apiSuccessRes(req, res, 'Error to update balance.');
            }
        } else {

            let parentUserDetails = await serviceUser.getUserById(parent_id);
            if (parentUserDetails.statusCode === CONSTANTS.SUCCESS) {
                let requestData = {
                    user_id,
                    parent_id,
                    parentOfParentId: parentUserDetails.data.parent_id,
                    description,
                    statement_type: CONSTANTS.ACCOUNT_STATEMENT_TYPE_CHIPINOUT,
                    amount,
                    userCurrentBalance: datafromService1.data.balance,
                    parentCurrentBalance: parentUserDetails.data.balance,
                    crdr
                };
                if (amount > datafromService1.data.balance && crdr === CONSTANTS.DEBIT_TWO) {
                    return apiSuccessRes(req, res, 'Insufficient  Balance');
                } else if (amount > parentUserDetails.data.balance && crdr === CONSTANTS.CREDIT_ONE) {
                    // console.log("amount ",amount)
                    // console.log("parentUserDetails.data.balance ",parentUserDetails.data.balance)
                    return apiSuccessRes(req, res, 'Insufficient  Balance');
                } else {
                    let createParentAccountStatement = await accountStatementsservice.createAccStatementAndUpdateBalanceParentAndUser(requestData, datafromService1);
                    if (createParentAccountStatement.statusCode === CONSTANTS.SUCCESS) {
                        return apiSuccessRes(req, res, 'Balance Updated Successfully');
                    } else {
                        return apiSuccessRes(req, res, 'Error to update balance');
                    }
                }
            } else {
                return apiSuccessRes(req, res, 'Parent details not found.');
            }
        }
    } else {
        errorlog.error('Error to update balance. UserId not found. user_id : ', user_id);
        return apiSuccessRes(req, res, 'Error to update balance');
    }

}

async function getProfitLoss(req, res) {

    try {
        let {
            from_date,
            to_date,
            user_id,
            offset,
            limit
        } = req.body;

        const createSeriesSchema = Joi.object({
            userid: Joi.number().required(),
            parent_ids: Joi.optional().required(),
            user_id: Joi.number().required(),
            from_date: Joi.number().required(),
            to_date: Joi.number().required(),
            offset: Joi.number().required(),
            limit: Joi.number().required(),
        });

        try {
            await createSeriesSchema.validate(req.body, {
                abortEarly: true
            });
        } catch (error) {
            return apiErrorRes(req, res, error.details[0].message);
        }

        let getUserByUserId = await serviceUser.getUserByUserId([req.body.userid]);

        if (getUserByUserId.statusCode !== CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'account not get successfully.', []);


        } else {

            req.body['user_type'] = getUserByUserId.data.user_type_id;


            let marketData = await accountStatementsservice.getProfitLoss(req.body);

            if (marketData.statusCode != CONSTANTS.SUCCESS) {
                return apiSuccessRes(req, res, 'profit Loss not gets.', []);
            } else {

                return apiSuccessRes(req, res, 'ProfitLoss get  successfully', marketData.data);
            }
        }
    } catch (e) {
        errorlog.error('Error in getProfitLoss controller ', e);
        return apiErrorRes(req, res, 'Error to create chipInOut.');
    }
}


async function accountSatement(req, res) {

    try {

        let {
            from_date,
            to_date,
            user_id,
            pageno,
            limit
        } = req.body;

        const createSeriesSchema = Joi.object({
            userid: Joi.number().required(),
            parent_ids: Joi.optional().required(),
            user_id: Joi.number().required(),
            from_date: Joi.string().required(),
            to_date: Joi.string().required(),
            pageno: Joi.number().required(),
            limit: Joi.number().required(),
        });

        try {
            await createSeriesSchema.validate(req.body, {
                abortEarly: true
            });
        } catch (error) {
            errorlog.error('Parameter validation error.  ', error);
            return apiErrorRes(req, res, error.details[0].message);
        }

        let marketData = await accountStatementsservice.getAccountStatement(req.body);


        if (marketData.statusCode == CONSTANTS.SUCCESS && marketData.data.list.length > 0) {
            let data = marketData.data.list.reduce((a, b) => ({ balanceSum: a.balance + b.balance, creditDebitSum: a.credit_debit + b.credit_debit }));
            return apiSuccessRes(req, res, 'account statement  successfully', {...marketData.data, ...data });
        } else {

            return apiSuccessRes(req, res, 'Data not found.');
        }
    } catch (e) {
        errorlog.error('Error in accountSatement controller ', e);
        return apiErrorRes(req, res, 'Enter valid param!', e);
    }
}


async function accountDetails(req, res) {

    try {

        let {
            match_id,
        } = req.body;

        const createSeriesSchema = Joi.object({
            userid: Joi.number().required(),
            parent_ids: Joi.optional().required(),
            match_id: Joi.string().required(),


        });

        try {
            await createSeriesSchema.validate(req.body, {
                abortEarly: true
            });
        } catch (error) {
            errorlog.error('Parameter validation error in accountDetails  ', error);
            return apiErrorRes(req, res, error.details[0].message);
        }


        let getUserByUserId = await serviceUser.getUserByUserId([req.body.userid]);

        if (getUserByUserId.statusCode !== CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'account not get successfully.', []);


        } else {

            let user_type = getUserByUserId.data.user_type_id;
            let reqObj = {

                user_type: user_type,
                user_id: req.body.userid,
                match_id: match_id
            };
            let marketData = await accountStatementsservice.getAccountDetails(reqObj);

            if (marketData.statusCode == CONSTANTS.SUCCESS) {
                return apiSuccessRes(req, res, 'account details get  successfully', marketData.data);
            } else {
                return apiSuccessRes(req, res, 'account details not not get successfully.', []);
            }
        }
    } catch (e) {
        errorlog.error('Error in accountDetails controller ', e);

        return apiErrorRes(req, res, 'Error in accountDetails ');
    }
}


async function chipInOutStatement(req, res) {

    try {
        let {
            from_date,
            to_date,
            user_id,
            page
        } = req.body;

        const createSeriesSchema = Joi.object({
            userid: Joi.number().required(),
            parent_ids: Joi.optional().required(),
            user_id: Joi.number().required(),
            from_date: Joi.optional(),
            to_date: Joi.optional(),
            page: Joi.number().required()
        });

        try {
            await createSeriesSchema.validate(req.body, {
                abortEarly: true
            });
        } catch (error) {
            errorlog.error('Parameter validation error in chipInOutStatement  ', error);
            return apiErrorRes(req, res, error.details[0].message);
        }

        let returnData = await accountStatementsservice.chipInOutStatement(req.body);

        //console.log(returnData);

        let finalData = {};
        if (page == 1) {
            finalData = { "total": returnData.data[1][0].total, "data": returnData.data[0] };
        } else {
            finalData = { "total": 0, "data": returnData.data[0] };
        }
        return apiSuccessRes(req, res, 'SUCCESS', finalData);
    } catch (e) {
        errorlog.error('Error in chipInOutStatement controller ', e);
        return apiErrorRes(req, res, 'Error in chipInOutStatement');
    }
}


router.post('/chip-in-out', chipInOut);
router.post('/get-stmt-pl', getProfitLoss);
router.post('/account-stmt', accountSatement);
router.post('/account-stmt-details', accountDetails);
router.post('/account-stmt/chip-in-out-stmt', chipInOutStatement);

module.exports = router;