const express = require('express');
const router = express.Router();
const Joi = require('joi');
// const axios = require('axios');
// const settings = require('../../config/settings');
const exchangeService = require('../services/exchangeService');
const marketsService = require('../services/marketsService');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');
let apiSuccessRes = globalFunction.apiSuccessRes;
let apiErrorRes = globalFunction.apiErrorRes;

async function getOddsByMarketId(req, res) {
    let {
        market_id
    } = req.body;
    const profilechema = Joi.object({
        market_id: Joi.string().required(),
    });
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let getUserByUserId = await exchangeService.getOddsByMarketId(market_id);

    if (getUserByUserId.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success.', getUserByUserId.data);
    } else {
        return apiSuccessRes(req, res, 'User already locked.');
    }

}
async function getOddsAndSession(req, res) {
    let {
        market_id,
        match_id
    } = req.body;
    const profilechema = Joi.object({
        market_id: Joi.string().required(),
        match_id: Joi.string().required(),
    });
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let getUserByUserId = await exchangeService.getOddsAndSession(market_id, match_id);

    if (getUserByUserId.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success.', getUserByUserId.data);
    } else {
        return apiSuccessRes(req, res, 'User already locked.');
    }

}
async function getLiveMatchMarketIdList(req, res) {

    // const profilechema = Joi.object({
    // 	userid: Joi.number().required(), 		
    // 	parent_ids: Joi.optional().required()
    // });
    // try {
    // 	await profilechema.validate(req.body, {
    // 		abortEarly: true
    // 	});
    // } catch (error) {
    // 	return apiErrorRes(req, res, error.details[0].message);
    // }
    let getUserByUserId = await marketsService.getLiveMatchMarketIdList();

    if (getUserByUserId.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success.', getUserByUserId.data);
    } else {
        return apiSuccessRes(req, res, 'User already locked.');
    }

}
router.post('/getOddsByMarketId', getOddsByMarketId);
router.post('/getOddsAndSession', getOddsAndSession);
router.get('/getLiveMatchMarketIdList', getLiveMatchMarketIdList);
module.exports = router;