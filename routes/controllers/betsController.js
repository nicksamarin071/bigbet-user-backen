const express = require('express');
const router = express.Router();
const Joi = require('joi');
const axios = require('axios');
const settings = require('../../config/settings');
const betService = require('../services/betsService');
const marketsService = require('../services/marketsService');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');
const partnershipsService = require('../services/partnershipsService');
const userService = require('../services/userService');
const selectionService = require('../services/selectionService');
const userSettingSportWiseService = require('../services/userSettingSportWiseService');
const exchangeService = require('../services/exchangeService');
const fancyService = require('../services/fancyService');
const matkabetService = require('../services/matkabetService');
const delay = require('delay');
let apiSuccessRes = globalFunction.apiSuccessRes;
let apiErrorRes = globalFunction.apiErrorRes;
const browser = require('browser-detect');

async function saveBetData(req, res) {

    const result = browser(req.headers['user-agent']);
    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    let device_info = Object.keys(result)[0];

    let { id } = req.headers;
    let { match_id, market_id, selection_id, odds, stack, is_back } = req.body;
    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
        market_id: Joi.string().required(),
        selection_id: Joi.number().required(),
        odds: Joi.string().required(),
        stack: Joi.number().required(),
        is_back: Joi.string().valid("0", "1").required(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
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
    let oldOdds = odds;
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
        redisOdds2 = parseFloat(redisOdds2).toFixed(2);
        let redisOdds3 = "";
        adminOdds = parseFloat(marketData.data.backRateDiff);

        if (settings.BET_PLACE_ODDS_RATE == 1) {
            redisOdds3 = parseFloat(odds); //+ parseFloat(marketData.data.backRateDiff);
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
        redisOdds2 = parseFloat(redisOdds2).toFixed(2);
        let redisOdds3 = "";
        adminOdds = parseFloat(marketData.data.layRateDiff);

        if (settings.BET_PLACE_ODDS_RATE == 1) {
            redisOdds3 = parseFloat(odds); // + parseFloat(marketData.data.layRateDiff);
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
        return apiErrorRes(req, res, 'Bet is not allowed on this market');
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

    let betDelay = '';
    if (marketData.data.bet_delay > userSetting.bet_delay) {

        betDelay = marketData.data.bet_delay;

    } else {
        betDelay = userSetting.bet_delay;
    }

    if (settings.BOOK_MAKER_MANUAL_MARKET_BET_DELAY_ON_OFF == 'OFF' && marketData.data.market_type == 'BM') {
        betDelay = 0;
    }

    await delay((betDelay) * 1000);

    if (betDelay > 0) {

        let marketDataDelay = await marketsService.gatDataByMarketId(getMarketDetail);

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
            return apiErrorRes(req, res, 'Bet is not allowed on this market');
        }

        let betFairOdssAfterDelay = await exchangeService.getOddsRate(market_id, selection_id, is_back, MarketType);
        //console.log('betFairOdss------------------------- ', betFairOdss);

        redisOdds = betFairOdssAfterDelay.data.odds;
        redisStatus = betFairOdssAfterDelay.data.status;

        if (redisStatus != 'OPEN') {
            return apiErrorRes(req, res, "Can not place bet on closed market");
        }
        if (is_back == "1") {
            redisOdds2 = parseFloat(redisOdds) + parseFloat(marketDataDelay.data.backRateDiff);
            redisOdds2 = parseFloat(redisOdds2).toFixed(2);
            adminOdds = parseFloat(marketDataDelay.data.backRateDiff);

            if (settings.BET_PLACE_ODDS_RATE == 1) {
                redisOdds3 = parseFloat(oldOdds); // + parseFloat(marketData.data.backRateDiff);
            } else {
                redisOdds3 = parseFloat(redisOdds) + parseFloat(marketData.data.backRateDiff);
            }

            if (parseFloat(oldOdds) <= parseFloat(redisOdds2)) {
                is_matched = "1";
            } else {
                if (CONSTANTS.UN_MATCH_BET_ALLOW_OR_NOT == 0) {
                    return apiErrorRes(req, res, "Rate has been changed !!");
                } else {
                    is_matched = "0";
                }
            }
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
            redisOdds2 = parseFloat(redisOdds) + parseFloat(marketDataDelay.data.layRateDiff);
            redisOdds2 = parseFloat(redisOdds2).toFixed(2);
            adminOdds = parseFloat(marketDataDelay.data.layRateDiff);

            if (settings.BET_PLACE_ODDS_RATE == 1) {
                redisOdds3 = parseFloat(oldOdds); // + parseFloat(marketData.data.layRateDiff);
            } else {
                redisOdds3 = parseFloat(redisOdds) + parseFloat(marketData.data.layRateDiff);
            }
            if (parseFloat(oldOdds) >= parseFloat(redisOdds2)) {
                is_matched = "1";
            } else {
                if (CONSTANTS.UN_MATCH_BET_ALLOW_OR_NOT == 0) {
                    return apiErrorRes(req, res, "Rate has been changed !!!");
                } else {
                    is_matched = "0";
                }
            }
            if (settings.BOOK_MAKER_MANUAL_MARKET_BET_FORMATE_INDIAN_BETFAIR == 'INDIAN' && marketData.data.market_type == 'BM') {
                odds = redisOdds3;
                liability = Number((((odds / 100) + 1) * stack) - stack);
                p_l = Number(stack);
            } else {

                odds = redisOdds3;
                liability = Number((odds * stack) - stack);
                p_l = Number(stack);
            }
        }
    }

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

        super_admin_commission: ((marketData.data.marketName == 'Book Maker 2'  || marketData.data.marketName == 'Book Maker'  || marketData.data.marketName == 'book maker 2' || marketData.data.marketName == 'book maker'  ) && settings.BOOK_MAKER_COMMISSION_ON_OFF == "OFF") ? 0 : servicePartnershipData.data.super_admin_match_commission,
        admin_commission: ((marketData.data.marketName == 'Book Maker 2'  || marketData.data.marketName == 'Book Maker'  || marketData.data.marketName == 'book maker 2' || marketData.data.marketName == 'book maker'  )  && settings.BOOK_MAKER_COMMISSION_ON_OFF == "OFF") ? 0 : servicePartnershipData.data.admin_match_commission,
        super_master_commission: ((marketData.data.marketName == 'Book Maker 2'  || marketData.data.marketName == 'Book Maker'  || marketData.data.marketName == 'book maker 2' || marketData.data.marketName == 'book maker'  )  && settings.BOOK_MAKER_COMMISSION_ON_OFF == "OFF") ? 0 : servicePartnershipData.data.super_master_match_commission,
        master_commission: ((marketData.data.marketName == 'Book Maker 2'  || marketData.data.marketName == 'Book Maker'  || marketData.data.marketName == 'book maker 2' || marketData.data.marketName == 'book maker'  )  && settings.BOOK_MAKER_COMMISSION_ON_OFF == "OFF") ? 0 : servicePartnershipData.data.master_match_commission,
        agent_commission: ((marketData.data.marketName == 'Book Maker 2'  || marketData.data.marketName == 'Book Maker'  || marketData.data.marketName == 'book maker 2' || marketData.data.marketName == 'book maker'  )  && settings.BOOK_MAKER_COMMISSION_ON_OFF == "OFF") ? 0 : servicePartnershipData.data.agent_match_commission,
        user_commission: ((marketData.data.marketName == 'Book Maker 2'  || marketData.data.marketName == 'Book Maker'  || marketData.data.marketName == 'book maker 2' || marketData.data.marketName == 'book maker'  ) && settings.BOOK_MAKER_COMMISSION_ON_OFF == "OFF") ? 0 : servicePartnershipData.data.user_match_commission,
        user_commission: ((marketData.data.marketName == 'Book Maker 2'  || marketData.data.marketName == 'Book Maker'  || marketData.data.marketName == 'book maker 2' || marketData.data.marketName == 'book maker'  ) && settings.BOOK_MAKER_COMMISSION_ON_OFF == "OFF") ? 0 : servicePartnershipData.data.user_match_commission,
        commission_type_partnership_percentage: servicePartnershipData.data.commission_type_partnership_percentage,
        user_commission_lena_dena: servicePartnershipData.data.user_commission_lena_dena,

        is_matched: is_matched,
        device_type: 'W',
        ip_address: ip_address,
        redis_status: redisStatus,
        user_setting_data: userSetting,
        userDataById: userData,
        device_info: device_info
    };
    //console.log('reqdaaObj ----------- ',reqdaaObj);return;
    let validationError = await betService.validateBet(reqdaaObj);
    if (validationError.statusCode == 201) {
        return apiErrorRes(req, res, validationError.data);
    }

    let liabilityForBlance = reqdaaObj.liabilityForBlance;
    delete reqdaaObj.user_setting_data;
    delete reqdaaObj.liabilityForBlance;
    // delete reqdaaObj.userDataById;  
    delete reqdaaObj.redis_status;
    // console.log('reqdaaObj.userDataById ------------------- ',reqdaaObj.userDataById);
    let responceSaveBet = await betService.saveMarketBetData(reqdaaObj, liabilityForBlance);
    if (responceSaveBet.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Bet has been saved successfully', responceSaveBet.data);
    } else if (responceSaveBet.statusCode == 201) {
        return apiErrorRes(req, res, responceSaveBet.data);
    } else {
        return apiErrorRes(req, res, 'Unable to save bet.');
    }

}

async function saveFancyData(req, res) {

    try {

        const result = browser(req.headers['user-agent']);
        let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        let device_info = Object.keys(result)[0];

        let { id } = req.headers;
        let {
            fancy_id,
            run,
            is_back,
            size,
            stack,
            match_id,
            sport_id,
            fancyStatus
        } = req.body;

        const createSeriesSchema = Joi.object({
            size: Joi.number(),
            fancy_id: Joi.string().required(),
            run: Joi.number().required(),
            match_id: Joi.number().required(),
            sport_id: Joi.number().required(),
            stack: Joi.number().integer().required(),
            is_back: Joi.string().valid("0", "1").required(),
            fancyStatus: Joi.string().required(),
        });

        await createSeriesSchema.validate(req.body, {
            abortEarly: true
        });
        let getFancyDetail = { fancy_id, match_id, id };

        let fancyData = await fancyService.getFancyById(getFancyDetail);
        if(fancyData.data.fancyStatus =='MM' || fancyData.data.fancyStatus =='MK'){
            return apiErrorRes(req, res, "Bet not allowed on manual fancy"); 
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
            if (betFairFancy.BackPrice1 != run) {
                return apiErrorRes(req, res, "Run Changed");
            }
            if (betFairFancy.BackSize1 != size) {
                return apiErrorRes(req, res, "Size Changed");
            }
        } else {
            if (betFairFancy.LayPrice1 != run) {
                return apiErrorRes(req, res, "Run Changed");
            }
            if (betFairFancy.LaySize1 != size) {
                return apiErrorRes(req, res, "Size Changed");
            }
        }



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
        let agent_id = userData.agent_id;
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
        let sessionDelay = '';
        if (fancyData.data.session_delay > userSetting.session_delay) {
            sessionDelay = fancyData.data.session_delay;
        } else {
            sessionDelay = userSetting.session_delay;
        }

        if (settings.BOOK_MAKER_MANUAL_SESSION_BET_DELAY_ON_OFF == 'OFF' && fancyData.data.fancyStatus == 'M') {
            sessionDelay = 0;
        }
        console.log(fancyData.data);
        console.log(userSetting);
        await delay((sessionDelay) * 1000);

        if (sessionDelay > 0) {
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
            }
        }

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
            user_commission: servicePartnershipData.data.user_session_commission, // userSetting.session_commission,
            commission_type_partnership_percentage: servicePartnershipData.data.commission_type_partnership_percentage,
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
        let responceSaveBet = await betService.saveFancyBetData(reqdaaObj, fancy_score_position, fancy_score_position_id, liabilityForBlance);

        if (responceSaveBet.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Bet has been saved successfully');
        } else if (responceSaveBet.statusCode == 201) {
            return apiErrorRes(req, res, responceSaveBet.data);
        } else {
            return apiErrorRes(req, res, 'Unable to save bet');
        }

    } catch (e) {
        console.log('save session bet error',e)
        return apiErrorRes(req, res, e.details[0].message, e);
    } finally {
        //global._loggedInToken[findToken].IsBetRunning = 0;
    }
}

async function saveFancyDataMeter(req, res) {

    try {

        const result = browser(req.headers['user-agent']);
        let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        let device_info = Object.keys(result)[0];

        let { id } = req.headers;
        let {
            fancy_id,
            run,
            is_back,
            size,
            stack,
            match_id,
            sport_id,
            fancyStatus
        } = req.body;

        const createSeriesSchema = Joi.object({
            size: Joi.number(),
            fancy_id: Joi.string().required(),
            run: Joi.number().required(),
            match_id: Joi.number().required(),
            sport_id: Joi.number().required(),
            stack: Joi.number().integer().required(),
            is_back: Joi.string().valid("0", "1").required(),
            fancyStatus: Joi.string().required(),
        });

        await createSeriesSchema.validate(req.body, {
            abortEarly: true
        });
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
        run = parseInt(run);
        if (is_back == 1) {
            if (betFairFancy.BackPrice1 != run && fancyData.data.fancyStatus !='MK') {
                return apiErrorRes(req, res, "Run Changed");
            }
            if (betFairFancy.BackSize1 != size ) {
                return apiErrorRes(req, res, "Size Changed");
            }
        } else {
            if (betFairFancy.LayPrice1 != run && fancyData.data.fancyStatus !='MK') {
                return resultdb(CONSTANTS.VALIDATION_ERROR, "Run Changed");
            }
            if (betFairFancy.LaySize1 != size) {
                return resultdb(CONSTANTS.VALIDATION_ERROR, "Size Changed");
            }
        }



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
        let agent_id = userData.agent_id;
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
        let sessionDelay = '';
        if (fancyData.data.session_delay > userSetting.session_delay) {
            sessionDelay = fancyData.data.session_delay;
        } else {
            sessionDelay = userSetting.session_delay;
        }

        if (settings.BOOK_MAKER_MANUAL_SESSION_BET_DELAY_ON_OFF == 'OFF' && fancyData.data.fancyStatus == 'M') {
            sessionDelay = 0;
        }
        await delay((sessionDelay) * 1000);

        if (sessionDelay > 0) {
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
                return apiErrorRes(req, res, "Fancy Closed 1215666");
            }
            if (betFairFancy.length == 0) {
                return apiErrorRes(req, res, "Fancy Closed 12122221");
            }
            if (betFairFancy.GameStatus != '') {
                return apiErrorRes(req, res, "Fancy Suspended 2121000");
            }

            if (is_back == 1) {
                if (betFairFancy.BackPrice1 != run && fancyData.data.fancyStatus !='MK') {
                    return apiErrorRes(req, res, "Run Changed");
                }
                if (betFairFancy.BackSize1 != size) {
                    return apiErrorRes(req, res, "Size Changed");
                }
            } else {
                if (betFairFancy.LayPrice1 != run && fancyData.data.fancyStatus !='MK')  {
                    return resultdb(CONSTANTS.VALIDATION_ERROR, "Run Changed");
                }
                if (betFairFancy.LaySize1 != size) {
                    return resultdb(CONSTANTS.VALIDATION_ERROR, "Size Changed");
                }
            }
        }

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
            user_commission: servicePartnershipData.data.user_session_commission, // userSetting.session_commission,
            commission_type_partnership_percentage: servicePartnershipData.data.commission_type_partnership_percentage,
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
            is_manual_odds: fancyData.data.fancyStatus,
            khado_number: fancyData.data.khado_number
        };

        let validationError = await betService.validateFancyBetMeterKhado(reqdaaObj);
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

        //reqdaaObj.profit = reqdaaObj.profitFancy;
        //reqdaaObj.liability = reqdaaObj.liabilityFancy;
        
        delete reqdaaObj.user_setting_data;
        delete reqdaaObj.liabilityFancy;
        delete reqdaaObj.profitFancy;
        delete reqdaaObj.fancy_score_position_json;
        delete reqdaaObj.fancy_score_position_id;
        delete reqdaaObj.liabilityForBlance;
        delete reqdaaObj.max_session_bet_liability;
        delete reqdaaObj.max_session_liability;
        delete reqdaaObj.is_manual_odds;

        let responceSaveBet = await betService.saveFancyBetData(reqdaaObj, fancy_score_position, fancy_score_position_id, liabilityForBlance);

        if (responceSaveBet.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Bet has been saved successfully');
        } else if (responceSaveBet.statusCode == 201) {
            return apiErrorRes(req, res, responceSaveBet.data);
        } else {
            return apiErrorRes(req, res, 'Unable to save bet');
        }

    } catch (e) {
        return apiErrorRes(req, res, e.details[0].message, e);
    } finally {
        //global._loggedInToken[findToken].IsBetRunning = 0;
    }
}


async function saveFancyFavourite(req, res) {

    try {

        const result = browser(req.headers['user-agent']);
        let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        let device_info = Object.keys(result)[0];

        let { id } = req.headers;
        let {
            fancy_id,
            run,
            is_back,
            size,
            stack,
            match_id,
            sport_id,
            fancyStatus
        } = req.body;

        const createSeriesSchema = Joi.object({
            size: Joi.number(),
            fancy_id: Joi.string().required(),
            run: Joi.number().required(),
            match_id: Joi.number().required(),
            sport_id: Joi.number().required(),
            stack: Joi.number().integer().required(),
            is_back: Joi.string().valid("0", "1").required(),
            fancyStatus: Joi.string().required(),
        });

        await createSeriesSchema.validate(req.body, {
            abortEarly: true
        });
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
        run = parseInt(run);
        if (is_back == 1) {
            if (betFairFancy.BackPrice1 != run && fancyData.data.fancyStatus !='MK') {
                return apiErrorRes(req, res, "Run Changed");
            }
          
        } else {
            if (betFairFancy.LayPrice1 != run && fancyData.data.fancyStatus !='MK') {
                return resultdb(CONSTANTS.VALIDATION_ERROR, "Run Changed");
            }
        }



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
        let agent_id = userData.agent_id;
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
        let sessionDelay = '';
        if (fancyData.data.session_delay > userSetting.session_delay) {
            sessionDelay = fancyData.data.session_delay;
        } else {
            sessionDelay = userSetting.session_delay;
        }

        if (settings.BOOK_MAKER_MANUAL_SESSION_BET_DELAY_ON_OFF == 'OFF' && fancyData.data.fancyStatus == 'M') {
            sessionDelay = 0;
        }
        await delay((sessionDelay) * 1000);

        if (sessionDelay > 0) {
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
                if (betFairFancy.BackPrice1 != run ) {
                    return apiErrorRes(req, res, "Run Changed");
                }
                
            } else {
                if (betFairFancy.LayPrice1 != run )  {
                    return resultdb(CONSTANTS.VALIDATION_ERROR, "Run Changed");
                }
            }
        }

        let p_l, liability;
        stack = Number(stack);

        if (is_back == 1) {
            liability = stack;
            p_l =  Number((((run / 100) + 1) * stack) - stack); 
        } else {
            p_l = stack;
            liability = Number((((run / 100) + 1) * stack) - stack);
        }

        let reqdaaObj = {
            user_id: id,
            sport_id: sportId,
            match_id: match_id,
            fancy_id: fancy_id,
            fancy_name: fancy_name,
            run: run,
            odds: run,
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
            user_commission: servicePartnershipData.data.user_session_commission, // userSetting.session_commission,
            commission_type_partnership_percentage: servicePartnershipData.data.commission_type_partnership_percentage,
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
            is_manual_odds: fancyData.data.fancyStatus,
            khado_number: fancyData.data.khado_number
        };

        let validationError = await betService.validateFancyBetMeterKhado(reqdaaObj);
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

        //reqdaaObj.profit = reqdaaObj.profitFancy;
        //reqdaaObj.liability = reqdaaObj.liabilityFancy;
        
        delete reqdaaObj.user_setting_data;
        delete reqdaaObj.liabilityFancy;
        delete reqdaaObj.profitFancy;
        delete reqdaaObj.fancy_score_position_json;
        delete reqdaaObj.fancy_score_position_id;
        delete reqdaaObj.liabilityForBlance;
        delete reqdaaObj.max_session_bet_liability;
        delete reqdaaObj.max_session_liability;
        delete reqdaaObj.is_manual_odds;
        
        let responceSaveBet = await betService.saveFancyBetData(reqdaaObj, fancy_score_position, fancy_score_position_id, liabilityForBlance);

        if (responceSaveBet.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Bet has been saved successfully');
        } else if (responceSaveBet.statusCode == 201) {
            return apiErrorRes(req, res, responceSaveBet.data);
        } else {
            return apiErrorRes(req, res, 'Unable to save bet');
        }

    } catch (e) {
        return apiErrorRes(req, res, e.details[0].message, e);
    } finally {
        //global._loggedInToken[findToken].IsBetRunning = 0;
    }
}


async function saveCasinoBetData(req, res) {

    const result = browser(req.headers['user-agent']);
    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    let device_info = Object.keys(result)[0];

    let { id } = req.headers;
    let { match_id, market_id, selection_id, odds, stack, is_back } = req.body;
    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
        market_id: Joi.string().required(),
        selection_id: Joi.number().required(),
        odds: Joi.string().required(),
        stack: Joi.number().required(),
        is_back: Joi.string().valid("0", "1").required(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    if (odds <= CONSTANTS.ODDMINLIMIT) {
        return apiErrorRes(req, res, 'Min odds limit (' + CONSTANTS.ODDMINLIMIT + ') is exceeded ');
    }
    let getMarketDetail = { market_id, match_id, id };
    let marketData = await marketsService.gatDataByCasinoMarketId(getMarketDetail);

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
    let selectCondition = { selection_id, matchID, market_id };
    let getSelectionRecord = await selectionService.getCasinoNameBySelectionId(selectCondition);
    if (getSelectionRecord.statusCode !== CONSTANTS.SUCCESS) {
        return apiErrorRes(req, res, 'Selected option is invalid');
    } else {
        if (getSelectionRecord.data === null) {
            return apiErrorRes(req, res, 'Selected option is Not Found!');
        }
    }
    let sportId = marketData.data.sport_id;
    let bhavMarket = market_id;
    if (marketData.data.sport_id == CONSTANTS.BETFAIR_SPORT_ANDER_BAHAR_D) {
        let getMarket = market_id.split('_');
        bhavMarket = getMarket[0];
    }
    let worliMatkaPl = 0;
    if (marketData.data.sport_id == CONSTANTS.BETFAIR_SPORT_WARLI_MATKA) {
        let getMarket = market_id.split('_');
        if (getMarket.length > 1) {
            stack = stack * 5;
            worliMatkaPl = stack * 0.8;
        }
        bhavMarket = getMarket[0];
    }
    let bhavMarketId = marketData.data.sport_id + bhavMarket;
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
    //console.log('avinash settings userSetting',userSetting);
    let betDelay = '';
    if (marketData.data.bet_delay > userSetting.bet_delay) {
        betDelay = marketData.data.bet_delay;
    } else {
        betDelay = userSetting.bet_delay;
    }
    await delay((betDelay) * 1000);

    if (betDelay > 0) {
        let marketData = await marketsService.gatDataByCasinoMarketId(getMarketDetail);

        if (marketData.statusCode == CONSTANTS.SUCCESS) {

            if (marketData.data.is_result_declared == 'Y') {
                return apiErrorRes(req, res, 'Result already declared for this Market ');
            } else if (marketData.data.status == 'N') {
                return apiErrorRes(req, res, 'This Market is deactivated');
            }
        } else {
            return apiErrorRes(req, res, 'This Market is invalid');
        }
    }

    let betFairOdss = await exchangeService.getCasinoOddsRate(bhavMarketId, selection_id, is_back);
    //console.log(betFairOdss);
    let is_matched = "0",
        p_l, redisOdds, redisStatus, liability, adminOdds;
    redisOdds = betFairOdss.data.odds;
    redisStatus = betFairOdss.data.status;
    if (is_back == "1") {
        let redisOdds2 = parseFloat(redisOdds) + parseFloat(marketData.data.backRateDiff);
        let redisOdds3 = "";
        adminOdds = parseFloat(marketData.data.backRateDiff);
        if (settings.BET_CASINO_PLACE_ODDS_RATE == 1) {
            redisOdds3 = parseFloat(odds); //+ parseFloat(marketData.data.backRateDiff);
        } else {
            redisOdds3 = parseFloat(redisOdds); // + parseFloat(marketData.data.backRateDiff); 
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
        odds = redisOdds3;
        p_l = (odds * stack) - stack;
        if (sportId === CONSTANTS.BETFAIR_SPORT_MATKA_H) {
            p_l = (odds * stack); // - stack;
        }
        if (sportId == CONSTANTS.BETFAIR_SPORT_WARLI_MATKA) {
            let getMarket = market_id.split('_');
            if (getMarket.length > 1) {
                p_l = stack * 0.8;
            }
        }
        liability = stack;
    } else {
        let redisOdds2 = parseFloat(redisOdds) + parseFloat(marketData.data.layRateDiff);
        let redisOdds3 = "";
        adminOdds = parseFloat(marketData.data.layRateDiff);

        if (settings.BET_CASINO_PLACE_ODDS_RATE == 1) {
            redisOdds3 = parseFloat(odds); // + parseFloat(marketData.data.layRateDiff);
        } else {
            redisOdds3 = parseFloat(redisOdds); // + parseFloat(marketData.data.layRateDiff); 
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
        odds = redisOdds3;
        liability = (odds * stack) - stack;

        if (sportId === CONSTANTS.BETFAIR_SPORT_MATKA_H) {
            liability = (odds * stack); // - stack;
        }
        p_l = stack;
    }
    //console.log('teeee--',getSelectionRecord.data.liability_type);                  
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

        super_admin_commission: servicePartnershipData.data.super_admin_match_commission,
        admin_commission: servicePartnershipData.data.admin_match_commission,
        super_master_commission: servicePartnershipData.data.super_master_match_commission,
        master_commission: servicePartnershipData.data.master_match_commission,
        agent_commission: servicePartnershipData.data.agent_match_commission,
        user_commission: servicePartnershipData.data.user_match_commission,

        commission_type_partnership_percentage: servicePartnershipData.data.commission_type_partnership_percentage,
        user_commission_lena_dena: servicePartnershipData.data.user_commission_lena_dena,

        is_matched: is_matched,
        device_type: 'W',
        ip_address: ip_address,
        redis_status: redisStatus,
        user_setting_data: userSetting,
        userDataById: userData,
        device_info: device_info
    };
    // console.log('odds reqdaaObj---',reqdaaObj);       
    let validationError = await betService.validateCasinoBet(reqdaaObj);
    if (validationError.statusCode == 201) {
        return apiErrorRes(req, res, validationError.data);
    }

    let liabilityForBlance = reqdaaObj.liabilityForBlance;
    delete reqdaaObj.user_setting_data;
    delete reqdaaObj.liabilityForBlance;
    //delete reqdaaObj.userDataById;  
    delete reqdaaObj.redis_status;
    let responceSaveBet = await betService.saveCasinoMarketBetData(reqdaaObj, liabilityForBlance);
    if (responceSaveBet.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Bet has been saved successfully', responceSaveBet.data);
    } else if (responceSaveBet.statusCode == 201) {
        return apiErrorRes(req, res, responceSaveBet.data);
    } else {
        return apiErrorRes(req, res, 'Unable to save bet.');
    }
}

async function resultdeclear(req, res) {

    let {
        sport_id
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
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
        sport_id,
        id
    };

    let getMatchMarketList = await betService.resultdeclear(data);

    if (getMatchMarketList.statusCode === CONSTANTS.SUCCESS) {

        //let records = {'MatchDetails': getMatchMarketList.data};
        return apiSuccessRes(req, res, 'Success', getMatchMarketList.data);
    } else if (getMatchMarketList.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.');
    } else {
        return apiSuccessRes(req, res, 'Error result List.');
    }
}

async function casinoresultbydate(req, res) {

    let {
        sport_id,
        from_date,
        to_date,
        limit,
        pageno
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        sport_id: Joi.number().required(),
        from_date: Joi.number().required(),
        to_date: Joi.number().required(),
        limit: Joi.number().required(),
        pageno: Joi.number().required()
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let data = {
        sport_id,
        from_date,
        to_date,
        limit,
        pageno,
        id
    };

    let getMatchMarketList = await betService.casinoresultbydate(data);

    if (getMatchMarketList.statusCode === CONSTANTS.SUCCESS) {

        //let records = {'MatchDetails': getMatchMarketList.data};
        return apiSuccessRes(req, res, 'Success', getMatchMarketList.data);
    } else if (getMatchMarketList.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.');
    } else {
        return apiSuccessRes(req, res, 'Error result List.');
    }
}


async function saveMatkaTempBetData(req, res) {
    const result = browser(req.headers['user-agent']);
    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    let responceSaveBet = "";
    let device_info = Object.keys(result)[0];

    let { id } = req.headers;
    //console.log(id);
    let { match_id, bet_data } = req.body;
    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
        bet_data: Joi.array().min(1).required(),
    }).unknown(true);

    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    for (let k in bet_data) {

        let market_id = bet_data[k].market_id;
        let selection_id = bet_data[k].selection_id;
        let amount = bet_data[k].amount;

        let getMarketDetail = { match_id, id, market_id };
        let selectCondition = { selection_id, match_id, market_id };

        let marketData = await marketsService.gatDataByMatkaMarketId(getMarketDetail);

        if (marketData.statusCode == CONSTANTS.SUCCESS) {
            if (marketData.data.is_result_declared == 'Y') {
                return apiErrorRes(req, res, 'Result already declared for this Market ');
            } else if (marketData.data.status == 'N') {
                return apiErrorRes(req, res, 'This Market is deactivated');
            }

        } else {
            return apiErrorRes(req, res, 'This Market is invalid');
        }

        let getSelectionRecord = await matkabetService.getMatkaNameBySelectionId(selectCondition);

        if (getSelectionRecord.statusCode === CONSTANTS.SUCCESS) {
            if (getSelectionRecord.data === null) {
                return apiErrorRes(req, res, 'Selected option is Not Found!');
            }
        } else {
            return apiErrorRes(req, res, 'Please enter valid number');
        }

        let sportId = marketData.data.sport_id;
        let userData = await userService.getUserByUserIdInBetServices(id);
        userData = userData.data;
        if (userData.agent_id != userData.parent_id) {
            return apiErrorRes(req, res, 'User is not valid');
        }
        let inplayDate = Math.floor(Date.now() / 1000);
        if (marketData.data.BetAllowTimeBefore != 0 && ((marketData.data.start_date - marketData.data.BetAllowTimeBefore) > inplayDate)) {
            return apiErrorRes(req, res, 'Bet is not allowed on this market');
        }

        let getPartnerShipData = { id, sportId };
        //console.log(getPartnerShipData);
        let servicePartnershipData = await partnershipsService.getPartnershipByUserId(getPartnerShipData);

        if (servicePartnershipData.statusCode === CONSTANTS.SUCCESS) {

            if (servicePartnershipData.data.user_type_id != 6) {

                return apiErrorRes(req, res, 'User is not valid');
            }

        } else {
            return apiErrorRes(req, res, 'Partner ships is not defined properly');
        }

        let userSetting = await userSettingSportWiseService.getUserSettingBySport(sportId, id);
        userSetting = userSetting.data;

        let betDelay = '';
        if (marketData.data.bet_delay > userSetting.bet_delay) {
            betDelay = marketData.data.bet_delay;
        } else {
            betDelay = userSetting.bet_delay;
        }

        await delay((betDelay) * 1000);

        if (betDelay > 0) {
            let marketData = await marketsService.gatDataByMatkaMarketId(getMarketDetail);
            if (marketData.statusCode == CONSTANTS.SUCCESS) {

                if (marketData.data.is_result_declared == 'Y') {
                    return apiErrorRes(req, res, 'Result already declared for this Market ');
                } else if (marketData.data.status == 'N') {
                    return apiErrorRes(req, res, 'This Market is deactivated');
                }
            } else {
                return apiErrorRes(req, res, 'This Market is invalid');
            }
        }
        let liability = amount;
        let p_l = amount * marketData.data.odds;

        let is_matched = "1";
        let reqdaaObj = {
            user_id: id,
            sport_id: marketData.data.sport_id,
            match_id: match_id,
            market_id: market_id,
            market_name: marketData.data.marketName,
            odds: marketData.data.odds,
            redis_odds: 0,
            admin_odds: 0,
            stack: amount,
            p_l: p_l,
            liability: -liability,
            profit: 0,
            chips: 0,
            selection_id: selection_id,
            selection_name: getSelectionRecord.data.selectionName,
            type_id: 0,
            super_admin: servicePartnershipData.data.super_admin,
            admin: servicePartnershipData.data.admin,
            super_master: servicePartnershipData.data.super_master,
            master: servicePartnershipData.data.master,
            agent: servicePartnershipData.data.agent,

            super_admin_commission: servicePartnershipData.data.super_admin_match_commission,
            admin_commission: servicePartnershipData.data.admin_match_commission,
            super_master_commission: servicePartnershipData.data.super_master_match_commission,
            master_commission: servicePartnershipData.data.master_match_commission,
            agent_commission: servicePartnershipData.data.agent_match_commission,
            user_commission: servicePartnershipData.data.user_match_commission,

            commissionset: servicePartnershipData.data.commissionset,
            patti_type: marketData.data.patti_type,
            is_matched: is_matched,
            device_type: 'W',
            ip_address: ip_address,
            user_setting_data: userSetting,
            userDataById: userData,
            device_info: device_info
        };

        let validationError = await betService.matkaValidateBet(reqdaaObj);
        if (validationError.statusCode == 201) {
            return apiErrorRes(req, res, validationError.data);
        }


        delete reqdaaObj.user_setting_data;
        delete reqdaaObj.redis_status;

        responceSaveBet = await betService.saveMatkaMarketTempBetData(reqdaaObj);

    }
    //console.log(responceSaveBet);
    if (responceSaveBet.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Temp Bet Save Successfully', '');
    } else if (responceSaveBet.statusCode == 201) {
        return apiErrorRes(req, res, responceSaveBet.data);
    } else {
        return apiErrorRes(req, res, 'Unable to save bet.');
    }
}


async function saveMatkaTempBetsData(req, res) {
    const result = browser(req.headers['user-agent']);
    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    let responceSaveBet = "";
    let device_info = Object.keys(result)[0];

    let { id } = req.headers;
    //console.log(id);
    let { match_id, bet_data } = req.body;
    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
        bet_data: Joi.object().min(1).required(),
    }).unknown(true);

    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let userData = await userService.getUserByUserIdInBetServices(id);
    userData = userData.data;
    if (userData.agent_id != userData.parent_id) {
        return apiErrorRes(req, res, 'User is not valid');
    }
    /*
     ** Start Bet Array process
     */

    for (let ik in bet_data) {

        let market_id = ik;
        let getMarketDetail = { match_id, id, market_id };

        let marketData = await marketsService.gatDataByMatkaMarketId(getMarketDetail);
        if (marketData.statusCode == CONSTANTS.SUCCESS) {
            if (marketData.data.is_result_declared == 'Y') {
                return apiErrorRes(req, res, 'Result already declared for this Market ');
            } else if (marketData.data.status == 'N') {
                return apiErrorRes(req, res, 'This Market is deactivated');
            }

        } else {
            return apiErrorRes(req, res, 'This Market is invalid');
        }
        let sportId = marketData.data.sport_id;

        let inplayDate = Math.floor(Date.now() / 1000);
        if (marketData.data.BetAllowTimeBefore != 0 && ((marketData.data.start_date - marketData.data.BetAllowTimeBefore) > inplayDate)) {
            return apiErrorRes(req, res, 'Bet is not allowed on this market');
        }

        let getPartnerShipData = { id, sportId };

        let servicePartnershipData = await partnershipsService.getPartnershipByUserId(getPartnerShipData);

        if (servicePartnershipData.statusCode === CONSTANTS.SUCCESS) {

            if (servicePartnershipData.data.user_type_id != CONSTANTS.USER_TYPE_USER) {

                return apiErrorRes(req, res, 'User is not valid');
            }

        } else {
            return apiErrorRes(req, res, 'Partner ships is not defined properly');
        }
        let userSetting = await userSettingSportWiseService.getUserSettingBySport(sportId, id);
        userSetting = userSetting.data;

        let betDelay = '';
        if (marketData.data.bet_delay > userSetting.bet_delay) {
            betDelay = marketData.data.bet_delay;
        } else {
            betDelay = userSetting.bet_delay;
        }

        await delay((betDelay) * 1000);

        if (betDelay > 0) {

            let marketData = await marketsService.gatDataByMatkaMarketId(getMarketDetail);
            if (marketData.statusCode == CONSTANTS.SUCCESS) {

                if (marketData.data.is_result_declared == 'Y') {
                    return apiErrorRes(req, res, 'Result already declared for this Market ');
                } else if (marketData.data.status == 'N') {
                    return apiErrorRes(req, res, 'This Market is deactivated');
                }
            } else {
                return apiErrorRes(req, res, 'This Market is invalid');
            }
        }

        let getBetMarketArray = bet_data[ik];
        for (let kk in getBetMarketArray) {
            let selection_id = getBetMarketArray[kk].selection_id;
            console.log(selection_id);
            let amount = getBetMarketArray[kk].amount;
            let selectCondition = { selection_id, match_id, market_id };
            let getSelectionRecord = await matkabetService.getMatkaNameBySelectionId(selectCondition);

            if (getSelectionRecord.statusCode === CONSTANTS.SUCCESS) {
                if (getSelectionRecord.data === null) {
                    return apiErrorRes(req, res, 'Selected option is Not Found!');
                }
            } else {
                return apiErrorRes(req, res, 'Please enter valid number');
            }
            let liability = amount;
            let p_l = amount * marketData.data.odds;

            let is_matched = "1";

            let reqdaaObj = {
                user_id: id,
                sport_id: marketData.data.sport_id,
                match_id: match_id,
                market_id: market_id,
                market_name: marketData.data.marketName,
                odds: marketData.data.odds,
                redis_odds: 0,
                admin_odds: 0,
                stack: amount,
                p_l: p_l,
                liability: -liability,
                profit: 0,
                chips: 0,
                selection_id: selection_id,
                selection_name: getSelectionRecord.data.selectionName,
                type_id: 0,
                super_admin: servicePartnershipData.data.super_admin,
                admin: servicePartnershipData.data.admin,
                super_master: servicePartnershipData.data.super_master,
                master: servicePartnershipData.data.master,
                agent: servicePartnershipData.data.agent,

                super_admin_commission: servicePartnershipData.data.super_admin_match_commission,
                admin_commission: servicePartnershipData.data.admin_match_commission,
                super_master_commission: servicePartnershipData.data.super_master_match_commission,
                master_commission: servicePartnershipData.data.master_match_commission,
                agent_commission: servicePartnershipData.data.agent_match_commission,
                user_commission: servicePartnershipData.data.user_match_commission,
                commission_type_partnership_percentage: servicePartnershipData.data.commission_type_partnership_percentage,
                user_commission_lena_dena: servicePartnershipData.data.user_commission_lena_dena,

                patti_type: marketData.data.patti_type,
                is_matched: is_matched,
                device_type: 'W',
                ip_address: ip_address,
                user_setting_data: userSetting,
                userDataById: userData,
                device_info: device_info
            };
            let validationError = await betService.matkaValidateBet(reqdaaObj);
            //console.log('validationError ----------- ',validationError);
            if (validationError.statusCode == 201) {
                return apiErrorRes(req, res, validationError.data);
            }


            delete reqdaaObj.user_setting_data;
            delete reqdaaObj.redis_status;

            responceSaveBet = await betService.saveMatkaMarketTempBetData(reqdaaObj);
            //console.log('responceSaveBet ----------- ',responceSaveBet);
        }
    }
    if (responceSaveBet.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Temp Bet Save Successfully', '');
    } else if (responceSaveBet.statusCode == 201) {
        return apiErrorRes(req, res, responceSaveBet.data);
    } else {
        return apiErrorRes(req, res, 'Unable to save bet.');
    }
}

async function getMatkaTempBetData(req, res) {
    let { id } = req.headers;
    //console.log(id);
    let { match_id } = req.body;
    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
    }).unknown(true);

    let tembetData = await marketsService.getMatkaTempBets(match_id, id);
    if (tembetData.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'success', tembetData.data);
    } else if (tembetData.statusCode == 201) {
        return apiErrorRes(req, res, tembetData.data);
    } else {
        return apiErrorRes(req, res, 'Not found.');
    }
}

async function getMatkaBetData(req, res) {
    let { id } = req.headers;
    //console.log(id);
    let { match_id } = req.body;
    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
    }).unknown(true);

    let tembetData = await marketsService.getMatkaBets(match_id, id);
    if (tembetData.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'success', tembetData.data);
    } else if (tembetData.statusCode == 201) {
        return apiErrorRes(req, res, tembetData.data);
    } else {
        return apiErrorRes(req, res, 'Not found.');
    }
}

async function deleteMatkaTempBetData(req, res) {
    let { id } = req.headers;
    let { betid, amount } = req.body;

    const profilechema = Joi.object().keys({
        betid: Joi.number().required(),
        amount: Joi.number().required(),

    }).unknown(true);

    let tembetData = await marketsService.deleteMatkaTempBets(betid, amount, id);

    if (tembetData.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'success', tembetData.data);
    } else if (tembetData.statusCode == 201) {
        return apiErrorRes(req, res, tembetData.data);
    } else {
        return apiErrorRes(req, res, 'Not found.');
    }
}

async function deleteMatkaAllTempBetData(req, res) {
    let { id } = req.headers;
    let { match_id, amount } = req.body;

    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
        amount: Joi.number().required(),

    }).unknown(true);

    let tembetData = await marketsService.deleteMatkaAllTempBets(match_id, amount, id);
    if (tembetData.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'success', tembetData.data);
    } else if (tembetData.statusCode == 201) {
        return apiErrorRes(req, res, tembetData.data);
    } else {
        return apiErrorRes(req, res, 'Not found.');
    }
}

async function saveMatkaBetData(req, res) {

    const result = browser(req.headers['user-agent']);
    //let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    //let device_info = Object.keys(result)[0];
    let { match_id, amount } = req.body;

    const profilechema = Joi.object().keys({
        match_id: Joi.string().required(),
        amount: Joi.number().required(),
    }).unknown(true);

    let { id } = req.headers;


    let responceSaveBet = await betService.saveMatkaMarketBetData(amount, match_id, id);
    if (responceSaveBet.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Bet has been saved successfully', responceSaveBet.data);
    } else if (responceSaveBet.statusCode == 201) {
        return apiErrorRes(req, res, responceSaveBet.data);
    } else {
        return apiErrorRes(req, res, 'Unable to save bet.');
    }

}

async function saveTitliBetData(req, res) {
    const result = browser(req.headers['user-agent']);
    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    let responceSaveBet = "";
    let device_info = Object.keys(result)[0];

    let { id } = req.headers;
    //console.log(id);
    let { match_id, bet_data } = req.body;
    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
        bet_data: Joi.array().min(1).required(),
    }).unknown(true);

    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let currentdate = Math.floor(Date.now() / 1000);

    for (let k in bet_data) {

        let market_id = bet_data[k].market_id;
        let selection_id = bet_data[k].selection_id;
        let amount = bet_data[k].amount;

        let getMarketDetail = { match_id, id, market_id };
        let selectCondition = { selection_id, match_id, market_id };

        let marketData = await marketsService.gatDataByMatkaMarketId(getMarketDetail);
        let drawRemaingTime = marketData.data.drawTime - currentdate;
        if (marketData.statusCode == CONSTANTS.SUCCESS) {
            if (marketData.data.is_result_declared == 'Y') {
                return apiErrorRes(req, res, 'Result already declared for this Market ');
            } else if (marketData.data.status == 'N') {
                return apiErrorRes(req, res, 'This Market is deactivated');
            }

        } else if (drawRemaingTime < 10) {
            return apiErrorRes(req, res, 'Bet place before 10 second.');
        } else {
            return apiErrorRes(req, res, 'This Market is invalid');
        }

        let getSelectionRecord = await matkabetService.getMatkaNameBySelectionId(selectCondition);

        if (getSelectionRecord.statusCode === CONSTANTS.SUCCESS) {
            if (getSelectionRecord.data === null) {
                return apiErrorRes(req, res, 'Selected option is Not Found!');
            }
        } else {
            return apiErrorRes(req, res, 'Selected option is invalid');
        }

        let sportId = marketData.data.sport_id;
        let userData = await userService.getUserByUserIdInBetServices(id);
        userData = userData.data;
        if (userData.agent_id != userData.parent_id) {
            return apiErrorRes(req, res, 'User is not valid');
        }
        let inplayDate = Math.floor(Date.now() / 1000);
        if (marketData.data.BetAllowTimeBefore != 0 && ((marketData.data.start_date - marketData.data.BetAllowTimeBefore) > inplayDate)) {
            return apiErrorRes(req, res, 'Bet is not allowed on this market');
        }

        let getPartnerShipData = { id, sportId };
        //console.log(getPartnerShipData);
        let servicePartnershipData = await partnershipsService.getPartnershipByUserId(getPartnerShipData);

        if (servicePartnershipData.statusCode === CONSTANTS.SUCCESS) {

            if (servicePartnershipData.data.user_type_id != 6) {

                return apiErrorRes(req, res, 'User is not valid');
            }

        } else {
            return apiErrorRes(req, res, 'Partner ships is not defined properly');
        }

        let userSetting = await userSettingSportWiseService.getUserSettingBySport(sportId, id);
        userSetting = userSetting.data;

        let betDelay = '';
        if (marketData.data.bet_delay > userSetting.bet_delay) {
            betDelay = marketData.data.bet_delay;
        } else {
            betDelay = userSetting.bet_delay;
        }

        await delay((betDelay) * 1000);

        if (betDelay > 0) {
            let marketData = await marketsService.gatDataByMatkaMarketId(getMarketDetail);
            if (marketData.statusCode == CONSTANTS.SUCCESS) {

                if (marketData.data.is_result_declared == 'Y') {
                    return apiErrorRes(req, res, 'Result already declared for this Market ');
                } else if (marketData.data.status == 'N') {
                    return apiErrorRes(req, res, 'This Market is deactivated');
                }
            } else {
                return apiErrorRes(req, res, 'This Market is invalid');
            }
        }
        let liability = amount;
        let p_l = amount * marketData.data.odds;

        let is_matched = "1";
        let reqdaaObj = {
            user_id: id,
            sport_id: marketData.data.sport_id,
            match_id: match_id,
            market_id: market_id,
            market_name: marketData.data.marketName,
            odds: marketData.data.odds,
            redis_odds: 0,
            admin_odds: 0,
            stack: amount,
            p_l: p_l,
            liability: -liability,
            profit: 0,
            chips: 0,
            selection_id: selection_id,
            selection_name: getSelectionRecord.data.selectionName,
            type_id: 0,
            super_admin: servicePartnershipData.data.super_admin,
            admin: servicePartnershipData.data.admin,
            super_master: servicePartnershipData.data.super_master,
            master: servicePartnershipData.data.master,
            agent: servicePartnershipData.data.agent,

            super_admin_commission: servicePartnershipData.data.super_admin_match_commission,
            admin_commission: servicePartnershipData.data.admin_match_commission,
            super_master_commission: servicePartnershipData.data.super_master_match_commission,
            master_commission: servicePartnershipData.data.master_match_commission,
            agent_commission: servicePartnershipData.data.agent_match_commission,
            user_commission: servicePartnershipData.data.user_match_commission,

            commissionset: servicePartnershipData.data.commissionset,
            patti_type: marketData.data.patti_type,
            is_matched: is_matched,
            device_type: 'W',
            ip_address: ip_address,
            user_setting_data: userSetting,
            userDataById: userData,
            device_info: device_info
        };

        let validationError = await betService.matkaValidateBet(reqdaaObj);
        if (validationError.statusCode == 201) {
            return apiErrorRes(req, res, validationError.data);
        }


        delete reqdaaObj.user_setting_data;
        delete reqdaaObj.redis_status;

        responceSaveBet = await betService.saveTitliMarketBetData(reqdaaObj);

    }
    //console.log(responceSaveBet);
    if (responceSaveBet.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Bet has been saved successfully', '');
    } else if (responceSaveBet.statusCode == 201) {
        return apiErrorRes(req, res, responceSaveBet.data);
    } else {
        return apiErrorRes(req, res, 'Unable to save bet.');
    }
}



async function getTitliBetData(req, res) {
    let { id } = req.headers;
    //console.log(id);
    let { match_id, market_id, sport_id } = req.body;
    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
        market_id: Joi.number().required(),
        sport_id: Joi.number().required(),
    }).unknown(true);

    //let { match_id, market_id, sport_id } = req.body;
    let tembetData = await marketsService.getTitliBets(match_id, market_id, sport_id, id);
    if (tembetData.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'success', tembetData.data);
    } else if (tembetData.statusCode == 201) {
        return apiErrorRes(req, res, tembetData.data);
    } else {
        return apiErrorRes(req, res, 'Not found.');
    }
}

async function getTitliResult(req, res) {
    let { id } = req.headers;
    //console.log(id);
    let { sport_id } = req.body;
    const profilechema = Joi.object().keys({
        sport_id: Joi.number().required(),
    }).unknown(true);

    //let { match_id, market_id, sport_id } = req.body;
    let tembetData = await marketsService.getTitliResult(sport_id, id);
    if (tembetData.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'success', tembetData.data);
    } else if (tembetData.statusCode == 201) {
        return apiErrorRes(req, res, tembetData.data);
    } else {
        return apiErrorRes(req, res, 'Not found.');
    }
}

async function titliResultDeclare(req, res) {
    let { id } = req.headers;
    //console.log(req.body);

    let { sport_id, market_id, match_id } = req.body;
    const profilechema = Joi.object().keys({
        sport_id: Joi.number().required(),
        market_id: Joi.number().required(),
        match_id: Joi.number().required(),
    }).unknown(true);
    let matchDetail = await matkabetService.getMatchdata(match_id, market_id, sport_id);

    //let { match_id, market_id, sport_id } = req.body;
    let betData = await marketsService.titliResultDeclare(sport_id, market_id, match_id, id, matchDetail.data);
    if (betData.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'success', betData.data);
    } else if (betData.statusCode == 201) {
        return apiErrorRes(req, res, betData.data);
    } else {
        return apiErrorRes(req, res, 'Not found.');
    }
}

async function getTitliLastResult(req, res) {
    let { id } = req.headers;
    //console.log(id);
    let { sport_id, match_id, market_id } = req.body;
    const profilechema = Joi.object().keys({
        sport_id: Joi.number().required(),
    }).unknown(true);

    //let { match_id, market_id, sport_id } = req.body;
    let resultData = await marketsService.getTitliLastResult(sport_id, match_id, market_id, id);

    if (resultData.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'success', resultData.data);
    } else if (resultData.statusCode == 201) {
        return apiErrorRes(req, res, resultData.data);
    } else {
        return apiErrorRes(req, res, 'Not found.');
    }
}

async function saveThimbleUserlog(req, res) {
    let { id } = req.headers;
    //console.log(req.body);

    let { stack } = req.body;
    const profilechema = Joi.object().keys({
        stack: Joi.number().required(),
    }).unknown(true);

    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let betData = await marketsService.thimbleUserLog(stack, id);
    if (betData.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'success', betData.data);
    } else if (betData.statusCode == 201) {
        return apiErrorRes(req, res, betData.data);
    } else {
        return apiErrorRes(req, res, 'Not found.');
    }
}

async function saveThimbleBet(req, res) {

    const result = browser(req.headers['user-agent']);
    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    let responceSaveBet = "";
    let device_info = Object.keys(result)[0];

    let { id } = req.headers;
    let { match_id, selection_id } = req.body;

    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
        selection_id: Joi.string().required(),
    }).unknown(true);

    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let currentdate = Math.floor(Date.now() / 1000);
    let getThimbleBetData = await marketsService.getThimbleBetData(match_id);

    let saveMatchData = await marketsService.saveThimbleMatchMarketSelectionData(getThimbleBetData);

    let market_id = getThimbleBetData.data.market_id;
    let result_id = getThimbleBetData.data.result_id;
    let amount = getThimbleBetData.data.stack;

    let getMarketDetail = { match_id, id, market_id };
    let selectCondition = { selection_id, match_id, market_id };
    let getWinnerNameCondition = { result_id, match_id, market_id };

    let marketData = await marketsService.gatDataByMatkaMarketId(getMarketDetail);

    if (marketData.statusCode == CONSTANTS.SUCCESS) {
        if (marketData.data.is_result_declared == 'Y') {
            return apiErrorRes(req, res, 'Result already declared for this Market ');
        } else if (marketData.data.status == 'N') {
            return apiErrorRes(req, res, 'This Market is deactivated');
        }

    } else {
        return apiErrorRes(req, res, 'This Market is invalid');
    }
    let getWinnerRecord = await matkabetService.getWinnerNameBySelectionId(getWinnerNameCondition);

    let getSelectionRecord = await matkabetService.getMatkaNameBySelectionId(selectCondition);

    if (getSelectionRecord.statusCode === CONSTANTS.SUCCESS) {
        if (getSelectionRecord.data === null) {
            return apiErrorRes(req, res, 'Selected option is Not Found!');
        }
    } else {
        return apiErrorRes(req, res, 'Selected option is invalid');
    }

    let sportId = marketData.data.sport_id;
    let userData = await userService.getUserByUserIdInBetServices(id);
    userData = userData.data;
    if (userData.agent_id != userData.parent_id) {
        return apiErrorRes(req, res, 'User is not valid');
    }
    let inplayDate = Math.floor(Date.now() / 1000);
    if (marketData.data.BetAllowTimeBefore != 0 && ((marketData.data.start_date - marketData.data.BetAllowTimeBefore) > inplayDate)) {
        return apiErrorRes(req, res, 'Bet is not allowed on this market');
    }

    let getPartnerShipData = { id, sportId };
    //console.log(getPartnerShipData);
    let servicePartnershipData = await partnershipsService.getPartnershipByUserId(getPartnerShipData);

    if (servicePartnershipData.statusCode === CONSTANTS.SUCCESS) {

        if (servicePartnershipData.data.user_type_id != 6) {

            return apiErrorRes(req, res, 'User is not valid');
        }

    } else {
        return apiErrorRes(req, res, 'Partner ships is not defined properly');
    }

    let userSetting = await userSettingSportWiseService.getUserSettingBySport(sportId, id);
    userSetting = userSetting.data;

    let betDelay = '';
    if (marketData.data.bet_delay > userSetting.bet_delay) {
        betDelay = marketData.data.bet_delay;
    } else {
        betDelay = userSetting.bet_delay;
    }

    await delay((betDelay) * 1000);

    if (betDelay > 0) {
        let marketData = await marketsService.gatDataByMatkaMarketId(getMarketDetail);
        if (marketData.statusCode == CONSTANTS.SUCCESS) {

            if (marketData.data.is_result_declared == 'Y') {
                return apiErrorRes(req, res, 'Result already declared for this Market ');
            } else if (marketData.data.status == 'N') {
                return apiErrorRes(req, res, 'This Market is deactivated');
            }
        } else {
            return apiErrorRes(req, res, 'This Market is invalid');
        }
    }
    let liability = amount;
    let p_l = amount * marketData.data.odds;

    let is_matched = "1";
    let reqdaaObj = {
        user_id: id,
        sport_id: marketData.data.sport_id,
        match_id: match_id,
        market_id: market_id,
        market_name: marketData.data.marketName,
        odds: marketData.data.odds,
        redis_odds: 0,
        admin_odds: 0,
        stack: amount,
        p_l: p_l,
        liability: -liability,
        profit: 0,
        chips: 0,
        selection_id: selection_id,
        result_id: result_id,
        selection_name: getSelectionRecord.data.selectionName,
        winner_name: getWinnerRecord.data.selectionName,
        type_id: 0,
        super_admin: servicePartnershipData.data.super_admin,
        admin: servicePartnershipData.data.admin,
        super_master: servicePartnershipData.data.super_master,
        master: servicePartnershipData.data.master,
        agent: servicePartnershipData.data.agent,

        super_admin_commission: servicePartnershipData.data.super_admin_match_commission,
        admin_commission: servicePartnershipData.data.admin_match_commission,
        super_master_commission: servicePartnershipData.data.super_master_match_commission,
        master_commission: servicePartnershipData.data.master_match_commission,
        agent_commission: servicePartnershipData.data.agent_match_commission,
        user_commission: servicePartnershipData.data.user_match_commission,

        commissionset: servicePartnershipData.data.commissionset,
        patti_type: marketData.data.patti_type,
        is_matched: is_matched,
        device_type: 'W',
        ip_address: ip_address,
        user_setting_data: userSetting,
        userDataById: userData,
        device_info: device_info
    };

    let validationError = await betService.matkaValidateBet(reqdaaObj);
    if (validationError.statusCode == 201) {
        return apiErrorRes(req, res, validationError.data);
    }


    delete reqdaaObj.user_setting_data;
    delete reqdaaObj.redis_status;

    responceSaveBet = await betService.saveThimbleBetData(reqdaaObj);


    //console.log(responceSaveBet);
    if (responceSaveBet.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Bet Save Successfully', '');
    } else if (responceSaveBet.statusCode == 201) {
        return apiErrorRes(req, res, responceSaveBet.data);
    } else {
        return apiErrorRes(req, res, 'Unable to save bet.');
    }
}

async function getThimbleBetList(req, res) {
    let { id } = req.headers;
    //console.log(id);
    let { sport_id } = req.body;
    const profilechema = Joi.object().keys({
        sport_id: Joi.number().required(),
    }).unknown(true);

    //let { match_id, market_id, sport_id } = req.body;
    let tembetData = await matkabetService.getThimbleBetData(sport_id, id);
    if (tembetData.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'success', tembetData.data);
    } else if (tembetData.statusCode == 201) {
        return apiErrorRes(req, res, tembetData.data);
    } else {
        return apiErrorRes(req, res, 'Not found.');
    }
}

async function fetchBetsMatchAndFancyPnl(req, res) {
    try {
        const user_id = req.user.sub.id;
        if (!user_id) {
            console.error("User ID not found");
            return apiErrorRes(req, res, "User ID is required");
        }
        const { match_id, sport_id } = req.body;
        const fetchMatchPnl = await betService.fetchBetsMatchAndFancyPnl(match_id, sport_id, user_id);


 	const fancyPNL = fetchMatchPnl.fancyBets.map((i) => i.pnl);
        const oddsPNL = fetchMatchPnl.betsOdds.map((i) => i.pL);
        
        const totalFancyPNL = fancyPNL.reduce((acc, pnl) => acc + pnl, 0);
        const totalOddsPNL = oddsPNL.reduce((acc, pL) => acc + pL, 0);
        const totalPNL = totalFancyPNL + totalOddsPNL;
        
        let message;
        if (totalPNL < 0) {
            message = `You lost ${totalPNL}/- coins.`;  
        } else {
            message = `You won ${totalPNL}/- coins.`;  
        }
        
        return apiErrorRes(req, res, "success", {
            fetchMatchPnl,
            MatchPlusMinus: message,
            commission: "You Lost -0/- Coins", 
            NetPlusMinus: message
        });


    } catch (error) {
        console.error("An error occurred:", error);
        return apiErrorRes(req, res, "An error occurred while fetching data");
    }
}

router.post('/save-bet', saveBetData);
router.post('/save-csn-bet', saveCasinoBetData);
router.post('/save-ssn-bet', saveFancyData);

router.post('/last-result', resultdeclear);
router.post('/last-result-day', casinoresultbydate);

router.post('/save-mtk-bet', saveMatkaBetData);
router.post('/save-mtk-tmp-bet', saveMatkaTempBetData);
router.post('/save-mtk-tmp-bets', saveMatkaTempBetsData);
router.post('/save-tt-bets', saveTitliBetData);
router.post('/get-mtk-temp-bet', getMatkaTempBetData);
router.post('/delete-mtk-temp-bet', deleteMatkaTempBetData);
router.post('/delete-all-temp-bet', deleteMatkaAllTempBetData);
router.post('/get-mtk-bet', getMatkaBetData);
router.post('/get-tt-bet', getTitliBetData);
router.post('/get-tt-res', getTitliResult);
router.post('/tt-res-declare', titliResultDeclare);
router.post('/save-tmb-log', saveThimbleUserlog);
router.post('/save-tmb-bet', saveThimbleBet);
router.post('/get-tmb-bet', getThimbleBetList);
router.post('/get-tit-last-rec', getTitliLastResult);
router.post('/save-ssn-bet-meter', saveFancyDataMeter);
router.post('/save-ssn-favourite', saveFancyFavourite);
router.post('/Match-Pnl-India-Bet', fetchBetsMatchAndFancyPnl);

module.exports = router;
