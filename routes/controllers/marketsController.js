const express = require('express');
const router = express.Router();
const Joi = require('joi');
const axios = require('axios');
const settings = require('../../config/settings');
const marketsService = require('../services/marketsService');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');
const userService = require('../services/userService');
const exchangeService = require('../services/exchangeService');
let apiSuccessRes = globalFunction.apiSuccessRes;
let apiErrorRes = globalFunction.apiErrorRes;

async function getAllMarket(req, res) {
    //console.log('req.body  ',req.body);
    let {
        limit,
        pageno,
        match_id
    } = req.body;

    const profilechema = Joi.object({
        userid: Joi.number().required(),
        parent_ids: Joi.optional().required(),
        match_id: Joi.optional().required()
    });
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let data = {
        match_id
    };

    let getUserDetailsFromDB = await marketsService.getAllMarket(data);
    if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {

        return apiSuccessRes(req, res, 'success', getUserDetailsFromDB.data);

    } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.');
    } else {
        return apiSuccessRes(req, res, 'Error to profile.');
    }
}

async function getMatchMarketOdds(req, res) {

    let {
        market_id
    } = req.body;
    const profilechema = Joi.object().keys({
        market_id: Joi.number().required(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let data = {
        market_id
    };

    let getMatchMarketBhav = await marketsService.getMatchListForDashboard(data);

    if (getMatchMarketBhav.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success', getMatchMarketBhav.data);
    } else if (getMatchMarketBhav.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.');
    } else {
        return apiSuccessRes(req, res, 'Error to Sports.');
    }
};
async function makeFavouriteMarket(req, res) {
    let { market_id, match_id, isFav } = req.body;
    let { id } = req.headers;
    let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    let ip_address = ip.slice(7);
    const makeFavSchema = Joi.object({
        market_id: Joi.number().required(),
        isFav: Joi.boolean().required(),
        match_id: Joi.number().integer().required()
    });
    try {
        await makeFavSchema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let reqData = {
        market_id,
        match_id,
        id,
        isFav,
        ip_address
    }

    let makeUserDetailsFromDB = await marketsService.makeFavouriteMarket(reqData);
    if (makeUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS && isFav === true) {
        return apiSuccessRes(req, res, 'Match favorite successfully', makeUserDetailsFromDB.data);
    } else if (makeUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS && isFav === false) {
        return apiSuccessRes(req, res, 'Match unfavorite successfully', makeUserDetailsFromDB.data);
    } else if (makeUserDetailsFromDB.statusCode === CONSTANTS.ALREADY_EXISTS) {
        return apiSuccessRes(req, res, 'Already in fav list.', makeUserDetailsFromDB.data);
    } else if (makeUserDetailsFromDB.statusCode === CONSTANTS.ALREADY_DELETED) {
        return apiSuccessRes(req, res, 'Not available in fav list.');
    } else {
        return apiErrorRes(req, res, 'Error to login user.111');
    }
};

async function getMatchDetailMarketList(req, res) {

    let {
        match_id,
        sport_id
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
        sport_id: Joi.number().required(),
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
        sport_id,
        id
    };
    let getMatchMarketList = await marketsService.getMatchDetailMarketList(data);
    let getMatchBookMaker = [];
    let getMatchBookMaker2 = [];
    if (sport_id == CONSTANTS.BETFAIR_SPORT_CRICKET) {
        getMatchBookMaker = await marketsService.getMatchBookmakerMarket(data);
        getMatchBookMaker2 = await marketsService.getMatchBookmakerOthers(data);
        getMatchBookMaker = getMatchBookMaker.data;
        getMatchBookMaker2 = getMatchBookMaker2.data;
    }

    let getMatchOthersMarketList = await marketsService.getMatchWithoutMatchOddsMarketList(data);
    let getUserSportWiseSettings = await userService.getUserSportWiseSettings(data);
    if (getMatchMarketList.statusCode === CONSTANTS.SUCCESS || getUserSportWiseSettings.statusCode === CONSTANTS.SUCCESS) {
        let records = { 'MatchDetails': getMatchMarketList.data, 'OtherMarketList': getMatchOthersMarketList.data, 'BookerMakerMarket': getMatchBookMaker, 'bm': getMatchBookMaker2, 'UserSportSettings': getUserSportWiseSettings.data };
        //let records = { 'MatchDetails': getMatchMarketList.data, 'BookerMakerMarket': [], 'OtherMarketList': getMatchOthersMarketList.data, 'UserSportSettings': getUserSportWiseSettings.data };
        return apiSuccessRes(req, res, 'Success', records);
    } else if (getMatchMarketList.statusCode === CONSTANTS.NOT_FOUND || getUserSportWiseSettings.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', []);
    } else {
        return apiErrorRes(req, res, 'Error Match Market List.');
    }
}

async function getEventBookMaker(req, res) {

    let {
        match_id,
        sport_id
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
        sport_id: Joi.number().required(),
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
        sport_id,
        id
    };
    //let getMatchMarketList = await marketsService.getMatchDetailMarketList(data);
    let getMatchBookMaker = await marketsService.getMatchBookmakerMarket(data);
    //let getMatchOthersMarketList = await marketsService.getMatchWithoutMatchOddsMarketList(data);
    //let getUserSportWiseSettings = await userService.getUserSportWiseSettings(data);
    if (getMatchBookMaker.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success', getMatchBookMaker.data);
    } else if (getMatchBookMaker.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', []);
    } else {
        return apiErrorRes(req, res, 'Error Match Market List.');
    }
}

async function getMatchDetailMarketListNew(req, res) {

    let {
        match_id,
        sport_id
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
        sport_id: Joi.number().required(),
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
        sport_id,
        id
    };
    let getMatchMarketList = await marketsService.getMatchDetailMarketListNew(data);
    let getMatchBookMaker = await marketsService.getMatchBookmakerMarketNew(data);
    let getMatchOthersMarketList = await marketsService.getMatchWithoutMatchOddsMarketListNew(data);
    let getUserSportWiseSettings = await userService.getUserSportWiseSettings(data);
    if (getMatchMarketList.statusCode === CONSTANTS.SUCCESS || getUserSportWiseSettings.statusCode === CONSTANTS.SUCCESS) {
        let records = { 'MatchDetails': getMatchMarketList.data, 'OtherMarketList': getMatchOthersMarketList.data, 'BookerMakerMarket': getMatchBookMaker.data, 'UserSportSettings': getUserSportWiseSettings.data };
        return apiSuccessRes(req, res, 'Success', records);
    } else if (getMatchMarketList.statusCode === CONSTANTS.NOT_FOUND || getUserSportWiseSettings.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', []);
    } else {
        return apiErrorRes(req, res, 'Error Match Market List.');
    }
}

async function getCupsMatchDetails(req, res) {

    let {
        match_id,
        sport_id
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
        sport_id: Joi.number().required(),
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
        sport_id,
        id
    };
    let getMatchMarketList = await marketsService.getCupsMatchDetails(data);
    let getUserSportWiseSettings = await userService.getUserSportWiseSettings(data);
    if (getMatchMarketList.statusCode === CONSTANTS.SUCCESS || getUserSportWiseSettings.statusCode === CONSTANTS.SUCCESS) {
        let records = { 'MatchDetails': getMatchMarketList.data, 'UserSportSettings': getUserSportWiseSettings.data };
        return apiSuccessRes(req, res, 'Success', records);
    } else if (getMatchMarketList.statusCode === CONSTANTS.NOT_FOUND || getUserSportWiseSettings.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.');
    } else {
        return apiSuccessRes(req, res, 'Error Cup Match Market List.');
    }
}

async function getHorseRacingMatchDetails(req, res) {

    let {
        match_id,
        sport_id,
        market_id
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
        sport_id: Joi.number().required(),
        market_id: Joi.number().required(),
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
        sport_id,
        id,
        market_id
    };
    let getMatchMarketList = await marketsService.getHorseRacingMatchDetails(data);
    let otherMarkets = await marketsService.getHorseRacingMatchDetailsOtherMarket(data);
    let getUserSportWiseSettings = await userService.getUserSportWiseSettings(data);
    if (getMatchMarketList.statusCode === CONSTANTS.SUCCESS || otherMarkets.statusCode === CONSTANTS.SUCCESS || getUserSportWiseSettings.statusCode === CONSTANTS.SUCCESS) {
        let records = { 'MatchDetails': getMatchMarketList.data, 'UpcommingMatches': otherMarkets.data, 'UserSportSettings': getUserSportWiseSettings.data };
        return apiSuccessRes(req, res, 'Success', records);
    } else if (getMatchMarketList.statusCode === CONSTANTS.NOT_FOUND || otherMarkets.statusCode === CONSTANTS.NOT_FOUND || getUserSportWiseSettings.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.');
    } else {
        return apiSuccessRes(req, res, 'Error Horse Racing Market List.');
    }
}

async function getGreyHoundRacingMatchDetails(req, res) {

    let {
        match_id,
        sport_id,
        market_id
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
        sport_id: Joi.number().required(),
        market_id: Joi.number().required(),
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
        sport_id,
        id,
        market_id
    };
    let getMatchMarketList = await marketsService.getGreyHoundRacingMatchDetails(data);
    let otherMarkets = await marketsService.getHorseRacingMatchDetailsOtherMarket(data);
    let getUserSportWiseSettings = await userService.getUserSportWiseSettings(data);
    if (getMatchMarketList.statusCode === CONSTANTS.SUCCESS || otherMarkets.statusCode === CONSTANTS.SUCCESS || getUserSportWiseSettings.statusCode === CONSTANTS.SUCCESS) {
        let records = { 'MatchDetails': getMatchMarketList.data, 'UpcommingMatches': otherMarkets.data, 'UserSportSettings': getUserSportWiseSettings.data };
        return apiSuccessRes(req, res, 'Success', records);
    } else if (getMatchMarketList.statusCode === CONSTANTS.NOT_FOUND || otherMarkets.statusCode === CONSTANTS.NOT_FOUND || getUserSportWiseSettings.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.');
    } else {
        return apiSuccessRes(req, res, 'Error Grey Hound Racing Market List.');
    }
}

async function getMatchSoccerMarketList(req, res) {

    let {
        match_id,
        sport_id
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
        sport_id: Joi.number().required(),
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
        sport_id,
        id
    };

    let getMatchMarketList = await marketsService.getMatchSoccerMarketList(data);
    let getMatchOthersMarketList = await marketsService.getMatchWithoutMatchOddsMarketList(data);
    let getUserSportWiseSettings = await userService.getUserSportWiseSettings(data);

    let getMatchBookMaker2 = await marketsService.getMatchBookmakerOthers(data);
    getMatchBookMaker2 = getMatchBookMaker2.data;
    if (getMatchMarketList.statusCode === CONSTANTS.SUCCESS || getUserSportWiseSettings.statusCode === CONSTANTS.SUCCESS) {
        let records = { 'MatchDetails': getMatchMarketList.data, 'OtherMarketList': getMatchOthersMarketList.data, 'UserSportSettings': getUserSportWiseSettings.data, 'bm': getMatchBookMaker2 };
        return apiSuccessRes(req, res, 'Success', records);
    } else if (getMatchMarketList.statusCode === CONSTANTS.NOT_FOUND || getUserSportWiseSettings.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.');
    } else {
        return apiSuccessRes(req, res, 'Error Match Market List.');
    }
}

async function getMatchTennisMarketList(req, res) {

    let {
        match_id,
        sport_id
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
        sport_id: Joi.number().required(),
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
        sport_id,
        id
    };
    let getMatchMarketList = await marketsService.getMatchTennisMarketList(data);
    let getMatchOthersMarketList = await marketsService.getMatchWithoutMatchOddsMarketList(data);
    let getUserSportWiseSettings = await userService.getUserSportWiseSettings(data);


    let getMatchBookMaker2 = await marketsService.getMatchBookmakerOthers(data);
    getMatchBookMaker2 = getMatchBookMaker2.data;

    if (getMatchMarketList.statusCode === CONSTANTS.SUCCESS || getUserSportWiseSettings.statusCode === CONSTANTS.SUCCESS) {
        let records = { 'MatchDetails': getMatchMarketList.data, 'OtherMarketList': getMatchOthersMarketList.data, 'UserSportSettings': getUserSportWiseSettings.data, 'bm': getMatchBookMaker2 };
        return apiSuccessRes(req, res, 'Success', records);
    } else if (getMatchMarketList.statusCode === CONSTANTS.NOT_FOUND || getUserSportWiseSettings.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.');
    } else {
        return apiSuccessRes(req, res, 'Error Match Market List.');
    }
}

async function getMatchCasinoMarketList(req, res) {

    let {
        match_id,
        sport_id
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
        sport_id: Joi.number().required(),
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
        sport_id,
        id
    };

    let getMatchMarketList;
    if (sport_id == CONSTANTS.BETFAIR_SPORT_ANDER_BAHAR_D) {
        getMatchMarketList = await marketsService.getMatchCasinoMarketListAnderBahar(data);
    } else {
        getMatchMarketList = await marketsService.getMatchCasinoMarketList(data);
    }
    let getMatchOtherMarketList = { data: null };
    if (sport_id == CONSTANTS.BETFAIR_SPORT_WARLI_MATKA) {
        getMatchOtherMarketList = await marketsService.getMatchCasinoMarketListWorliMatka(data);
    }
    //let getMatchMarketList = await marketsService.getMatchCasinoMarketList(data);

    let iscompleted = getMatchMarketList.data !== null ? getMatchMarketList.data.is_completed : 'N';
    let getMatchResult = { statusCode: CONSTANTS.SUCCESS, data: CONSTANTS.DATA_NULL };
    if (iscompleted == 'Y') {
        let resultData = { sport_id: getMatchMarketList.data.sport_id, match_id: getMatchMarketList.data.match_id };
        getMatchResult = await marketsService.matchResult(resultData);
    }

    let getUserSportWiseSettings = await userService.getUserSportWiseSettings(data);

    if (getMatchMarketList.statusCode === CONSTANTS.SUCCESS || getMatchResult.statusCode === CONSTANTS.SUCCESS || getUserSportWiseSettings.statusCode === CONSTANTS.SUCCESS) {
        let records = { 'MatchDetails': getMatchMarketList.data, 'otherMarkets': getMatchOtherMarketList.data, 'MatchResult': getMatchResult.data, 'UserSportSettings': getUserSportWiseSettings.data };
        return apiSuccessRes(req, res, 'Success', records);
    } else if (getMatchMarketList.statusCode === CONSTANTS.NOT_FOUND || getUserSportWiseSettings.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.');
    } else {
        return apiSuccessRes(req, res, 'Error Match Market List.');
    }
}




async function getMatchMarketLiveOdds(req, res) {

    let {
        match_id,
        requestData
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
        requestData: Joi.required(),

    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: false
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let getMatchMarketList = await marketsService.getMatchMarketOdds(requestData.mo);
    let getMatchBookMaker = await marketsService.getMatchMarketOdds(requestData.mob);
    console.log('getMatchBookMaker ---------- ', getMatchBookMaker.data);
    let getMatchOtherMarketOdds = await marketsService.getMatchOtherMarketOdds(requestData.om);
    let selectionArrayBefair = requestData.sa
    let selectionArrayManual = requestData.sm;

    let fancyResponse = await exchangeService.getMatchIndianSessionBetFair(match_id, selectionArrayBefair);
    let fancyResponseManual = await exchangeService.getMatchIndianSessionManual(match_id, selectionArrayManual);

    let fancyResponseResult = [];
    if (getMatchMarketList.statusCode === CONSTANTS.SUCCESS || getMatchBookMaker.statusCode === CONSTANTS.SUCCESS || fancyResponse.statusCode === CONSTANTS.SUCCESS || fancyResponseManual.statusCode === CONSTANTS.SUCCESS || getMatchOtherMarketOdds.statusCode === CONSTANTS.SUCCESS) {
        fancyResponseResult = fancyResponse.data;
        if (fancyResponseManual.data !== null && fancyResponseManual.data.length > 0) {
            fancyResponseResult = fancyResponseResult.concat(fancyResponseManual.data);
        }

        let records = { 'MatchDetails': getMatchMarketList.data, 'BookerMakerMarket': getMatchBookMaker.data, 'otherMarkets': getMatchOtherMarketOdds.data, 'SSN': fancyResponseResult };
        return apiSuccessRes(req, res, 'Success', records);
    } else if (fancyResponse.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'Success', CONSTANTS.DATA_NULL);
    } else {
        return apiErrorRes(req, res, 'Error Match fancy List.');
    }
}

async function getMatchMatkaMarketList(req, res) {

    let {
        match_id,
        sport_id
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
        sport_id: Joi.number().required(),
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
        sport_id,
        id
    };

    let getMatchMarketList = await marketsService.getMatchMatkaMarketList(data);
    /* let iscompleted = getMatchMarketList.data !== null ? getMatchMarketList.data.is_completed : 'N';
    let getMatchResult = { statusCode: CONSTANTS.SUCCESS, data: CONSTANTS.DATA_NULL };
    if (iscompleted == 'Y') {
        let resultData = { sport_id: getMatchMarketList.data.sport_id, match_id: getMatchMarketList.data.match_id };
        getMatchResult = await marketsService.matchResult(resultData);
    } */

    //let getUserSportWiseSettings = await userService.getUserSportWiseSettings(data);

    if (getMatchMarketList.statusCode === CONSTANTS.SUCCESS) {
        let records = { 'MatchDetails': getMatchMarketList.data };
        return apiSuccessRes(req, res, 'Success', records);
    } else if (getMatchMarketList.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.');
    } else {
        return apiSuccessRes(req, res, 'Error Match Market List.');
    }
}

async function getMatchTitliMarketList(req, res) {

    let { sport_id } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        sport_id: Joi.number().required(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, { abortEarly: true });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let data = { sport_id, id };

    let getMatchMarketList = await marketsService.getMatchTitliMarketList(data);
    //console.log(getMatchMarketList);
    if (getMatchMarketList.statusCode === CONSTANTS.SUCCESS) {
        let records = { 'MatchDetails': getMatchMarketList.data };
        return apiSuccessRes(req, res, 'Success', records);
    } else if (getMatchMarketList.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.');
    } else {
        return apiSuccessRes(req, res, 'Error Match Market List.');
    }
}


async function getMatchElectionMarketList(req, res) {

    let {
        match_id,
        sport_id
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
        sport_id: Joi.number().required(),
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
        sport_id,
        id
    };
    let getMatchMarketList = await marketsService.getMatchElectionMarketList(data);
    let getMatchOthersMarketList = await marketsService.getMatchWithoutMatchOddsMarketList(data);
    let getUserSportWiseSettings = await userService.getUserSportWiseSettings(data);
    if (getMatchMarketList.statusCode === CONSTANTS.SUCCESS || getUserSportWiseSettings.statusCode === CONSTANTS.SUCCESS) {
        let records = { 'MatchDetails': getMatchMarketList.data, 'OtherMarketList': getMatchOthersMarketList.data, 'BookerMakerMarket': CONSTANTS.DATA_NULL, 'UserSportSettings': getUserSportWiseSettings.data };
        return apiSuccessRes(req, res, 'Success', records);
    } else if (getMatchMarketList.statusCode === CONSTANTS.NOT_FOUND || getUserSportWiseSettings.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', []);
    } else {
        return apiErrorRes(req, res, 'Error Match Market List.');
    }
}

async function getCricketMatchDetailWithoutLogin(req, res) {

    let {
        match_id,
        sport_id
    } = req.body;
    let { id } = 0;
    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
        sport_id: Joi.number().required(),
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
        sport_id,
        id
    };
    let getMatchMarketList = await marketsService.getCricketMatchDetail(data);
    let getMatchBookMaker = await marketsService.getMatchBookmakerMarketwithoutLogin(data);
    let getMatchBookMaker2 = await marketsService.getMatchBookmakerOtherMarketwithoutLogin(data);


    let getMatchOthersMarketList = await marketsService.getMatchWithoutMatchOddsMarketListwithoutLogin(data);
    if (getMatchMarketList.statusCode === CONSTANTS.SUCCESS) {
        let records = { 'odds': getMatchMarketList.data, 'others': getMatchOthersMarketList.data, 'bm': getMatchBookMaker.data, 'bmo': getMatchBookMaker2.data };
        return apiSuccessRes(req, res, 'Success', records);
    } else if (getMatchMarketList.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', []);
    } else {
        return apiErrorRes(req, res, 'Error Match Market List.');
    }
}

async function getSoccerMatchDetailWithoutLogin(req, res) {


    let {
        match_id,
        sport_id
    } = req.body;

    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
        sport_id: Joi.number().required(),
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
        sport_id
    };

    let getMatchMarketList = await marketsService.getSoccerMatchDetailWithoutLogin(data);
    let getMatchOthersMarketList = await marketsService.getMatchWithoutMatchOddsMarketListwithoutLogin(data);

    if (getMatchMarketList.statusCode === CONSTANTS.SUCCESS) {
        let records = { 'odds': getMatchMarketList.data, 'others': getMatchOthersMarketList.data };
        return apiSuccessRes(req, res, 'Success', records);
    } else if (getMatchMarketList.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.');
    } else {
        return apiSuccessRes(req, res, 'Error Match Market List.');
    }
}


async function getTennisMatchDetailWithoutLogin(req, res) {

    let {
        match_id,
        sport_id
    } = req.body;

    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
        sport_id: Joi.number().required(),
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
        sport_id
    };
    let getMatchMarketList = await marketsService.getTennisMatchDetailWithoutLogin(data);
    let getMatchOthersMarketList = await marketsService.getMatchWithoutMatchOddsMarketListwithoutLogin(data);
    if (getMatchMarketList.statusCode === CONSTANTS.SUCCESS) {
        let records = { 'odds': getMatchMarketList.data, 'others': getMatchOthersMarketList.data };
        return apiSuccessRes(req, res, 'Success', records);
    } else if (getMatchMarketList.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.');
    } else {
        return apiSuccessRes(req, res, 'Error Match Market List.');
    }
}

router.post('/getAllMarket', getAllMarket);
router.post('/market-bhav', getMatchMarketOdds);
router.post('/market-current-bhav', getMatchMarketLiveOdds);
router.post('/add-in-personal', makeFavouriteMarket);
router.post('/event-detals', getMatchDetailMarketList);
router.post('/event-detals-new', getMatchDetailMarketListNew);
router.post('/event-book', getEventBookMaker);
router.post('/event-election', getMatchElectionMarketList);
router.post('/event-tennis', getMatchTennisMarketList);
router.post('/event-footbal', getMatchSoccerMarketList);
router.post('/event-fun-csno', getMatchCasinoMarketList);
router.post('/event-parent', getCupsMatchDetails);
router.post('/event-race-h', getHorseRacingMatchDetails);
router.post('/event-race-g', getGreyHoundRacingMatchDetails);
router.post('/event-money', getMatchMatkaMarketList);
router.post('/event-money-tt', getMatchTitliMarketList);

router.post('/get-cricket-detail', getCricketMatchDetailWithoutLogin);
router.post('/get-soccer-detail', getSoccerMatchDetailWithoutLogin);
router.post('/get-tennis-detail', getTennisMatchDetailWithoutLogin);
module.exports = router;