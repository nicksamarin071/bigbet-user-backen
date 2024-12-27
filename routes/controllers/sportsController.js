const express = require('express');
const router = express.Router();
const Joi = require('joi');
const axios = require('axios');
const sportsService = require('../services/sportsService');
const betService = require('../services/betsService');
const userService = require('../services/userService');
const globalFunction = require('../../utils/globalFunction');
const settings = require('../../config/settings');
const CONSTANTS = require('../../utils/constants');
const CONSTANTS_MESSAGE = require('../../utils/constantsMessage');
let apiSuccessRes = globalFunction.apiSuccessRes;
let apiSuccessResDash = globalFunction.apiSuccessResDash;
let apiSuccessResSport = globalFunction.apiSuccessResSport;
let apiErrorRes = globalFunction.apiErrorRes;


async function getAllSports(req, res) {
    let {
        limit,
        pageno,
        status
    } = req.body;
    const profilechema = Joi.object().keys({
        userid: Joi.number().required(),
        parent_ids: Joi.optional().required(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let data = {
        limit,
        pageno,
        status
    };
    let getUserDetailsFromDB = await sportsService.getAllSports(data);
    if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success', getUserDetailsFromDB.data);
    } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiSuccessRes(req, res, 'Error to Sports.');
    }
}
async function getSportList(req, res) {
    let {
        limit,
        pageno
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        limit: Joi.number().required(),
        pageno: Joi.optional().required(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let data = {
        id,
        limit,
        pageno
    };
    let getUserDetailsFromDB = await sportsService.getSportList(data);
    let getMatchCupDetails = await sportsService.getIsCupMatches(data);
    let getDepositWidthwral = await sportsService.getDepositWidthwralDetails();
    let isOnlinePayment = await sportsService.isOnlinePayment(id); // user_front_menaul 

    var getDepositWidthwralDetails = {};
    getDepositWidthwralDetails.isOnlinePayment = isOnlinePayment.data.isOnlinePayment;
    if (getDepositWidthwral.statusCode === CONSTANTS.SUCCESS) {

        for (let index2 = 0; index2 < getDepositWidthwral.data.length; index2++) {

            const DepositWidthwralDetailsKey = getDepositWidthwral.data[index2].key.split('.')[1];
            const DepositWidthwralDetailsValue = getDepositWidthwral.data[index2].value;
            getDepositWidthwralDetails[DepositWidthwralDetailsKey] = DepositWidthwralDetailsValue;
        }
    }


    if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        let tempdata = []
        for (let index = 0; index < getUserDetailsFromDB.data.length; index++) {
            const element = getUserDetailsFromDB.data[index];
            tempdata.push({ ...element, image: settings.imageURL + element.image });
        }
        return apiSuccessResSport(req, res, 'Success', tempdata, getMatchCupDetails.data, getDepositWidthwralDetails);
    } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiSuccessRes(req, res, 'Error to Sports.');
    }
}
async function getSeriesListBySportId(req, res) {

    let {
        limit,
        sport_id,
        pageno
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        limit: Joi.number().required(),
        sport_id: Joi.number().required(),
        pageno: Joi.optional().required(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let data = {
        id,
        limit,
        sport_id,
        pageno
    };
    let getUserDetailsFromDB = await sportsService.getSeriesListBySportId(data);
    if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success', getUserDetailsFromDB.data);
    } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiSuccessRes(req, res, 'Error to Sports.');
    }
}

async function getSeriesOuterListBySportId(req, res) {

    let {
        limit,
        sport_id,
        pageno
    } = req.body;

    const profilechema = Joi.object().keys({
        limit: Joi.number().required(),
        sport_id: Joi.number().required(),
        pageno: Joi.optional().required(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let data = {
        limit,
        sport_id,
        pageno
    };
    let getUserDetailsFromDB = await sportsService.getSeriesOuterListBySportId(data);
    if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success', getUserDetailsFromDB.data);
    } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiSuccessRes(req, res, 'Error to Sports.');
    }
}
async function getMatchsBySportAndSeriesId(req, res) {

    let {
        limit,
        sport_id,
        series_id,
        pageno,
        type
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        limit: Joi.number().required(),
        sport_id: Joi.number().required(),
        series_id: Joi.number(),
        pageno: Joi.optional().required(),
        type: Joi.string().optional(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let data = {
        limit,
        sport_id,
        series_id,
        pageno,
        type,
        id
    };
    let SportSeriesInpalyMatch = await sportsService.getMatchListBySportSeriesIdInPlay(data);
    let SportSeriesUpcommingMatch = { data: [] };
    let EvolutionGamesLIST = null;
    let EvolutionGamesSLOTEGRATOR = null;
    if (data.sport_id != CONSTANTS.BETFAIR_SPORT_CASINO) {
        SportSeriesUpcommingMatch = await sportsService.getMatchListBySportSeriesIdUpcomming(data);
    }
    if (data.sport_id == CONSTANTS.BETFAIR_SPORT_CASINO && settings.FUN_GAMES_OPEN_CASINO_DASHBOARD_YES_NO === 'YES') {
        try {
            let getUserByid = await userService.getUserNameAndPasswordByIdXpg(id);
            let TID = id + '____' + Date.now();
            let send_json = { operatorID: settings.FUN_OPERATOR_ID, username: getUserByid.data.user_name, firstName: getUserByid.data.user_name };
            let Password = globalFunction.convertXpgStringmd5(send_json);

            let registUserHash = 'User/Add/' + settings.FUN_WHITE_LIST_IP + '/' + TID + '/' + settings.FUN_API_KEY + '/' + getUserByid.data.user_name + '/' + Password + '/' + settings.FUN_OPERATOR_CURRENCY + '/' + settings.FUN_API_PASSWORD;

            let registerHashKey = globalFunction.convertFUNStringmd5(registUserHash);

            let userRegiset = { Login: getUserByid.data.user_name, Password: Password, TID: TID, Currency: settings.FUN_OPERATOR_CURRENCY, Hash: registerHashKey, Language: settings.FUN_OPERATOR_LANGUAGE, RegistrationIP: settings.FUN_WHITE_LIST_IP };

            let userRegisterSendData = globalFunction.convertXpgString(userRegiset);
            let userRegisterResponse = await axios.get(settings.FUN_REGISTER_USER + userRegisterSendData);
            console.log('userRegisterResponse --------------------------------------------------------------------- ', userRegisterResponse.data);
            if (userRegisterResponse.status != 200 && userRegisterResponse.data != 1) {
                return apiErrorRes(req, res, userRegisterResponse.data);
            }
            //EvolutionGamesLIST.data= {'games':null};
            EvolutionGamesLIST = [];
            let data = { page: 1, }
            //let fungames  = await sportsService.getFundistGames(data);

            let BetGames = await sportsService.getFundistGamesBetGames(data);
            let LuckyStreak = await sportsService.getFundistGamesLuckyStreak(data);
            let SAGaming = await sportsService.getFundistGamesSAGaming(data);
            let VivoGaming = await sportsService.getFundistGamesVivoGaming(data);
            let XProGaming = await sportsService.getFundistGamesXProGaming(data);
            let AsiaGaming = await sportsService.getFundistGamesAsiaGaming(data);
            let AsiaLiveTech = await sportsService.getFundistGamesAsiaLiveTech(data);
            let LiveGames = await sportsService.getFundistGamesLiveGames(data);
            let OrientalGame = await sportsService.getFundistGamesOrientalGame(data);

            let Betgames1 = { 'name': 'Bet Games', 'data': CONSTANTS.DATA_NULL };
            let LuckyStreak1 = { 'name': 'Lucky Streak', 'data': CONSTANTS.DATA_NULL };
            let SAGaming1 = { 'name': 'SA Gaming', 'data': CONSTANTS.DATA_NULL };
            let VivoGaming1 = { 'name': 'Vivo Gaming', 'data': CONSTANTS.DATA_NULL };
            let XProGaming1 = { 'name': 'XPro Gaming', 'data': CONSTANTS.DATA_NULL };
            let AsiaGaming1 = { 'name': 'Asia Gaming', 'data': CONSTANTS.DATA_NULL };
            let AsiaLiveTech1 = { 'name': 'Asia Live Tech', 'data': CONSTANTS.DATA_NULL };
            let LiveGames1 = { 'name': 'Live Games', 'data': CONSTANTS.DATA_NULL };
            let OrientalGame1 = { 'name': 'Oriental Game', 'data': CONSTANTS.DATA_NULL };
            let games = { 'name': 'Oriental Game', 'data': CONSTANTS.DATA_NULL };

            if (BetGames.statusCode === CONSTANTS.SUCCESS || LuckyStreak.statusCode === CONSTANTS.SUCCESS || SAGaming.statusCode === CONSTANTS.SUCCESS || VivoGaming.statusCode === CONSTANTS.SUCCESS || XProGaming.statusCode === CONSTANTS.SUCCESS || AsiaGaming.statusCode === CONSTANTS.SUCCESS || AsiaLiveTech.statusCode === CONSTANTS.SUCCESS || LiveGames.statusCode === CONSTANTS.SUCCESS || OrientalGame.statusCode === CONSTANTS.SUCCESS) {

                Betgames1.data = BetGames.data;
                LuckyStreak1.data = LuckyStreak.data;
                SAGaming1.data = SAGaming.data;
                VivoGaming1.data = VivoGaming.data;
                XProGaming1.data = XProGaming.data;
                AsiaGaming1.data = AsiaGaming.data;
                AsiaLiveTech1.data = AsiaLiveTech.data;
                LiveGames1.data = LiveGames.data;
                OrientalGame1.data = OrientalGame.data;

                EvolutionGamesLIST.push(Betgames1);
                EvolutionGamesLIST.push(LuckyStreak1);
                EvolutionGamesLIST.push(SAGaming1);
                EvolutionGamesLIST.push(VivoGaming1);
                EvolutionGamesLIST.push(XProGaming1);
                EvolutionGamesLIST.push(AsiaGaming1);
                EvolutionGamesLIST.push(AsiaLiveTech1);
                EvolutionGamesLIST.push(LiveGames1);
                EvolutionGamesLIST.push(OrientalGame1);
            }
            /*let TID2 = id+'___'+Date.now();
            let jsonnn = 'Game/FullList/'+settings.FUN_WHITE_LIST_IP+'/'+TID2+'/'+settings.FUN_API_KEY+'/'+settings.FUN_API_PASSWORD;					
            let encrypt_string=globalFunction.convertFUNStringmd5(jsonnn);					
            let lobby_url=settings.FUN_LOBBY_GAMES_LIST_URL+TID2+'&Hash='+encrypt_string;		
            let response2 = await axios.get(lobby_url);	*/
            //EvolutionGamesLIST.data ={'games':fungames.data};	
        } catch (error) {
            console.log(' error ---------------------------------FUN_GAMES----------------------------- ', error);
            //return apiErrorRes(req, res, error.details[0].message);
        }

    }
    if (data.sport_id == CONSTANTS.BETFAIR_SPORT_CASINO && settings.SLOTEGRATOR_GAMES_OPEN_CASINO_DASHBOARD_YES_NO === 'YES') {
        try {
            EvolutionGamesSLOTEGRATOR = [];
            /*			let nonce_string = globalFunction.generateRandoString(32);
            let timeStamp = globalFunction.currentDateTimeStamp();
            let perPage = 200;
            let getString = {'X-Merchant-Id':settings.SLOTEGRATOR_INTEGRATION_MERCHANT_ID, 'X-Nonce':nonce_string,'X-Timestamp':timeStamp,'perPage':perPage};
            getString = new URLSearchParams(getString).toString();		
            let generateHash = globalFunction.GenerateSLOTEGRATOR_HashKey(getString);
            let lobby_url=settings.SLOTEGRATOR_INTEGRATION_LOBBY_URL+'games?perPage='+perPage;			
            let headers ={};
            headers['X-Merchant-Id']	= settings.SLOTEGRATOR_INTEGRATION_MERCHANT_ID;
            headers['X-Timestamp']		= timeStamp;
            headers['X-Nonce']			= nonce_string;
            headers['X-Sign']			= generateHash;
            let response2 = await axios.get(lobby_url, {headers: headers});	
            EvolutionGamesSLOTEGRATOR.items =response2.data.items;	*/
            let data = { page: 1, }
            let Betgames = await sportsService.getSlotgratorGamesBetgames(data);
            let Ezugi = await sportsService.getSlotgratorGamesEzugi(data);
            let LottoInstantWin = await sportsService.getSlotgratorGamesLottoInstantWin(data);
            //let resonse  = await sportsService.getSlotgratorGames(data);
            //let resonse  = await sportsService.getSlotgratorGames(data);
            //EvolutionGamesSLOTEGRATOR.items = CONSTANTS.DATA_NULL;
            //EvolutionGamesSLOTEGRATOR.others = {'name':'others', 'data':CONSTANTS.DATA_NULL};
            let Betgames1 = { 'name': 'Betgames', 'data': CONSTANTS.DATA_NULL };

            let Ezugi1 = { 'name': 'Ezugi', 'data': CONSTANTS.DATA_NULL };

            let LottoInstantWin1 = { 'name': 'Lotto Instant Win', 'data': CONSTANTS.DATA_NULL };


            if (Betgames.statusCode === CONSTANTS.SUCCESS || Ezugi.statusCode === CONSTANTS.SUCCESS || LottoInstantWin.statusCode === CONSTANTS.SUCCESS) {
                Betgames1.data = Betgames.data;
                Ezugi1.data = Ezugi.data;
                LottoInstantWin1.data = LottoInstantWin.data;
                EvolutionGamesSLOTEGRATOR.push(Betgames1);
                EvolutionGamesSLOTEGRATOR.push(Ezugi1);
                EvolutionGamesSLOTEGRATOR.push(LottoInstantWin1);

                // EvolutionGamesSLOTEGRATOR.items = resonse.data;
                /* EvolutionGamesSLOTEGRATOR.Betgames.data = Betgames.data;
                 EvolutionGamesSLOTEGRATOR.Ezugi.data = Ezugi.data;
                 EvolutionGamesSLOTEGRATOR.LottoInstantWin.data = LottoInstantWin.data; */
                //EvolutionGamesSLOTEGRATOR.others.data =  resonse.data; 

            }


        } catch (error) {
            //console.log(' error --------SLOTEGRATOR------------------------------------------------------ ', error);
            //return apiErrorRes(req, res, error.details[0].message);
        }
    }

    //let responseData = { 'InplayMatches': SportSeriesInpalyMatch.data, 'UpCommingMatches': SportSeriesUpcommingMatch.data, 'EvolutionGames': EvolutionGamesLIST, 'EvolutionGamesSLOTEGRATOR': EvolutionGamesSLOTEGRATOR };
    let responseData = { 'InplayMatches': SportSeriesInpalyMatch.data, 'UpCommingMatches': SportSeriesUpcommingMatch.data, 'EvolutionGames': EvolutionGamesLIST, 'EvolutionGamesSLOTEGRATOR': EvolutionGamesSLOTEGRATOR };
    if (SportSeriesInpalyMatch.statusCode === CONSTANTS.SUCCESS || SportSeriesUpcommingMatch.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success', responseData);
    } else if (SportSeriesInpalyMatch.statusCode === CONSTANTS.NOT_FOUND || SportSeriesUpcommingMatch.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', responseData);
    } else {
        return apiErrorRes(req, res, 'Error to Sports.');
    }
}
async function getMatchListForDashboard(req, res) {

    let {
        limit,
        type,
        pageno
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        limit: Joi.number().required(),
        type: Joi.string().optional(),
        pageno: Joi.optional().required(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let data = {
        limit,
        type,
        pageno,
        id
    };
    let getDashboardInplayMatches = await sportsService.getMatchListForDashboardNEW(data);
    let getDashboardPopularMatches = await sportsService.getDashboardPopularMatchesNEW(data);
    let RecordSend = { 'InplayMatches': getDashboardInplayMatches.data, 'PopularMatches': getDashboardPopularMatches.data };

    if (getDashboardInplayMatches.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessResDash(req, res, 'Success', RecordSend);
    } else if (getDashboardInplayMatches.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessResDash(req, res, 'not found.', RecordSend);
    } else {
        return apiErrorRes(req, res, 'Error to Sports.');
    }
}
async function getMatchesPage(req, res) {

    let {
        limit,
        pageno
    } = req.body;
    const profilechema = Joi.object().keys({
        limit: Joi.number().required(),
        pageno: Joi.optional().required(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let data = {
        limit,
        pageno
    };
    let getDashboardInplayMatches = await sportsService.getMatchListForDashboardNEW(data);
    let getDashboardPopularMatches = await sportsService.getDashboardPopularMatchesNEW(data);
    let RecordSend = { 'InplayMatches': getDashboardInplayMatches.data, 'PopularMatches': getDashboardPopularMatches.data };
    if (getDashboardInplayMatches.statusCode === CONSTANTS.SUCCESS || getDashboardPopularMatches.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success', RecordSend);
    } else if (getDashboardInplayMatches.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', RecordSend);
    } else {
        return apiSuccessRes(req, res, 'Error to Sports.');
    }
}
async function getMatchesInplay(req, res) {

    let {
        limit,
        sport_id,
        pageno
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        limit: Joi.number().required(),
        sport_id: Joi.number(),
        pageno: Joi.optional().required(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let data = {
        limit,
        sport_id,
        pageno,
        id
    };
    let getDashboardInplayMatches = await sportsService.getInplayMatchesList(data);
    if (getDashboardInplayMatches.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success', getDashboardInplayMatches.data);
    } else if (getDashboardInplayMatches.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiSuccessRes(req, res, 'Error to Sports.');
    }
}
async function getMatchesUpcoming(req, res) {

    let {
        limit,
        sport_id,
        pageno
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        limit: Joi.number().required(),
        sport_id: Joi.number(),
        pageno: Joi.optional().required(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let data = {
        limit,
        sport_id,
        pageno,
        id
    };
    let getDashboardUpcomingMatches = await sportsService.getUpcomingMatchesList(data);
    if (getDashboardUpcomingMatches.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success', getDashboardUpcomingMatches.data);
    } else if (getDashboardUpcomingMatches.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiSuccessRes(req, res, 'Error to Sports.');
    }
}
async function getFavoriteMatchesList(req, res) {

    let {
        limit,
        sport_id,
        pageno
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        limit: Joi.number().required(),
        sport_id: Joi.number(),
        pageno: Joi.optional().required(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let data = {
        limit,
        sport_id,
        pageno,
        id
    };
    let getDashboardFavoriteMatches = await sportsService.getFavoriteMatchesList(data);
    if (getDashboardFavoriteMatches.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success', getDashboardFavoriteMatches.data);
    } else if (getDashboardFavoriteMatches.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiSuccessRes(req, res, 'Error to Sports.');
    }
}
async function getMatchListForDashboardOld(req, res) {

    let {
        limit,
        // sport_id,
        pageno
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        limit: Joi.number().required(),
        // sport_id: Joi.number().required(),
        pageno: Joi.optional().required(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let data = {
        limit,
        id,
        pageno
    };
    let getDashboardInplayMatches = await sportsService.getMatchListForDashboard(data);
    let getDashboardPopularMatches = await sportsService.getDashboardPopularMatches(data);
    let RecordSend = { 'InplayMatches': getDashboardInplayMatches.data, 'PopularMatches': getDashboardPopularMatches.data };
    if (getDashboardInplayMatches.statusCode === CONSTANTS.SUCCESS || getDashboardPopularMatches.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success', RecordSend);
    } else if (getDashboardInplayMatches.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.');
    } else {
        return apiSuccessRes(req, res, 'Error to Sports.');
    }
}
async function getMatchListBySeriesId(req, res) {

    let {
        limit,
        series_id,
        pageno
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        limit: Joi.number().required(),
        series_id: Joi.number().required(),
        pageno: Joi.optional().required(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let data = {
        limit,
        series_id,
        pageno,
        id
    };
    let getUserDetailsFromDB = await sportsService.getMatchListBySeriesId(data);
    if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success', getUserDetailsFromDB.data);
    } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiSuccessRes(req, res, 'Error to Sports.');
    }
}

async function getMatchOuterListBySeriesId(req, res) {

    let {
        limit,
        series_id,
        pageno
    } = req.body;

    const profilechema = Joi.object().keys({
        limit: Joi.number().required(),
        series_id: Joi.number().required(),
        pageno: Joi.optional().required(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let data = {
        limit,
        series_id,
        pageno
    };
    let getUserDetailsFromDB = await sportsService.getMatchOuterListBySeriesId(data);
    if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success', getUserDetailsFromDB.data);
    } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiSuccessRes(req, res, 'Error to Sports.');
    }
}

async function getAllMarket(req, res) {

    let getUserDetailsFromDB = await sportsService.getAllMarketActive();
    if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success', getUserDetailsFromDB.data);
    } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiSuccessRes(req, res, 'Error to Sports.');
    }
}
async function getPagesList(req, res) {
    let slug = req.query.slug;
    let getUserDetailsFromDB = await sportsService.getPagesList(slug);
    if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success', getUserDetailsFromDB.data);
    } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiSuccessRes(req, res, 'Error to Pages.');
    }
}

async function getSLOTEGRATORMatches(req, res) {
    let {
        page
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        page: Joi.number().required(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    try {
        let EvolutionGamesSLOTEGRATOR = {};
        let data = { page: page, }
        let Betgames = await sportsService.getSlotgratorGamesBetgames(data);
        let Ezugi = await sportsService.getSlotgratorGamesEzugi(data);
        let LottoInstantWin = await sportsService.getSlotgratorGamesLottoInstantWin(data);
        let resonse = await sportsService.getSlotgratorGames(data);
        EvolutionGamesSLOTEGRATOR.items = CONSTANTS.DATA_NULL;
        //EvolutionGamesSLOTEGRATOR.others = {'name':'others', 'data':CONSTANTS.DATA_NULL};
        //EvolutionGamesSLOTEGRATOR.Betgames = {'name':'Betgames', 'data':CONSTANTS.DATA_NULL} ;
        //EvolutionGamesSLOTEGRATOR.Ezugi ={'name':'Ezugi', 'data':CONSTANTS.DATA_NULL} ;
        //EvolutionGamesSLOTEGRATOR.LottoInstantWin = {'name':'Lotto Instant Win', 'data':CONSTANTS.DATA_NULL} ;


        if (resonse.statusCode === CONSTANTS.SUCCESS) {

            EvolutionGamesSLOTEGRATOR.items = resonse.data;
            //EvolutionGamesSLOTEGRATOR.Betgames.data = Betgames.data;
            // EvolutionGamesSLOTEGRATOR.Ezugi.data = Ezugi.data;
            //EvolutionGamesSLOTEGRATOR.LottoInstantWin.data = LottoInstantWin.data; 
            // EvolutionGamesSLOTEGRATOR.others.data =  resonse.data; 

            return apiSuccessRes(req, res, 'Success', EvolutionGamesSLOTEGRATOR);
        } else if (resonse.statusCode === CONSTANTS.NOT_FOUND) {
            return apiSuccessRes(req, res, 'not found.', CONSTANTS.DATA_NULL);
        } else {
            return apiSuccessRes(req, res, 'Error to Pages.');
        }

        /*let EvolutionGamesSLOTEGRATOR={};
            let nonce_string = globalFunction.generateRandoString(32);
            let timeStamp = globalFunction.currentDateTimeStamp();
            //let perPage = page * 50;
            let getString = {'X-Merchant-Id':settings.SLOTEGRATOR_INTEGRATION_MERCHANT_ID, 'X-Nonce':nonce_string,'X-Timestamp':timeStamp,'page':page};
            getString = new URLSearchParams(getString).toString();		
            let generateHash = globalFunction.GenerateSLOTEGRATOR_HashKey(getString);
            let lobby_url=settings.SLOTEGRATOR_INTEGRATION_LOBBY_URL+'games/index?page='+page;			
            let headers ={};
            headers['X-Merchant-Id']	= settings.SLOTEGRATOR_INTEGRATION_MERCHANT_ID;
            headers['X-Timestamp']		= timeStamp;
            headers['X-Nonce']			= nonce_string;
            headers['X-Sign']			= generateHash;
            let response2 = await axios.get(lobby_url, {headers: headers});	
            console.log('response2----------------- ',response2.status);
              EvolutionGamesSLOTEGRATOR.items =response2.data.items;
            if (response2.status === 200) {
                return apiSuccessRes(req, res, 'Success', EvolutionGamesSLOTEGRATOR);
            } else if (response2.status !== 200) {
                return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
            } else {
                return apiSuccessRes(req, res, 'Error to get sports.');
            }*/

    } catch (error) {
        console.log(' error --------SLOTEGRATOR------------------------------------------------------ ', error);
        //return apiErrorRes(req, res, error.details[0].message);
    }

}


async function getFundistMatches(req, res) {
    let {
        page
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        page: Joi.number().required(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    try {
        let getUserByid = await userService.getUserNameAndPasswordByIdXpg(id);
        let TID = id + '____' + Date.now();
        let send_json = { operatorID: settings.FUN_OPERATOR_ID, username: getUserByid.data.user_name, firstName: getUserByid.data.user_name };
        let Password = globalFunction.convertXpgStringmd5(send_json);

        let registUserHash = 'User/Add/' + settings.FUN_WHITE_LIST_IP + '/' + TID + '/' + settings.FUN_API_KEY + '/' + getUserByid.data.user_name + '/' + Password + '/' + settings.FUN_OPERATOR_CURRENCY + '/' + settings.FUN_API_PASSWORD;

        let registerHashKey = globalFunction.convertFUNStringmd5(registUserHash);

        let userRegiset = { Login: getUserByid.data.user_name, Password: Password, TID: TID, Currency: settings.FUN_OPERATOR_CURRENCY, Hash: registerHashKey, Language: settings.FUN_OPERATOR_LANGUAGE, RegistrationIP: settings.FUN_WHITE_LIST_IP };

        let userRegisterSendData = globalFunction.convertXpgString(userRegiset);
        let userRegisterResponse = await axios.get(settings.FUN_REGISTER_USER + userRegisterSendData);
        console.log('userRegisterResponse --------------------------------------------------------------------- ', userRegisterResponse.data);
        if (userRegisterResponse.status != 200 && userRegisterResponse.data != 1) {
            return apiErrorRes(req, res, userRegisterResponse.data);
        }

        /*let TID2 = id+'___'+Date.now();
        let jsonnn = 'Game/FullList/'+settings.FUN_WHITE_LIST_IP+'/'+TID2+'/'+settings.FUN_API_KEY+'/'+settings.FUN_API_PASSWORD;					
        let encrypt_string=globalFunction.convertFUNStringmd5(jsonnn);					
        let lobby_url=settings.FUN_LOBBY_GAMES_LIST_URL+TID2+'&Hash='+encrypt_string;		
        let response = await axios.get(lobby_url);	*/


        let data = { page: page }

        /*let TID2 = id+'___'+Date.now();
        let jsonnn = 'Game/FullList/'+settings.FUN_WHITE_LIST_IP+'/'+TID2+'/'+settings.FUN_API_KEY+'/'+settings.FUN_API_PASSWORD;					
        let encrypt_string=globalFunction.convertFUNStringmd5(jsonnn);					
        let lobby_url=settings.FUN_LOBBY_GAMES_LIST_URL+TID2+'&Hash='+encrypt_string;		
        let response2 = await axios.get(lobby_url);	*/

        let fungames = await sportsService.getFundistGames(data);

        if (fungames.statusCode === CONSTANTS.SUCCESS) {
            //fungames.data = {'games':fungames.data}				
            return apiSuccessRes(req, res, 'Success', fungames.data);
        } else if (fungames.statusCode === CONSTANTS.NOT_FOUND) {
            return apiErrorRes(req, res, 'not found.', fungames.data);
        } else {
            return apiErrorRes(req, res, 'Error to Pages.');
        }
    } catch (error) {
        console.log(' error ---------------------------------FUN_GAMES----------------------------- ', error);
        return apiErrorRes(req, res, 'Error in get matches.', error.response.data);
    }
}
async function getSportOuterList(req, res) {
    let {
        limit,
        pageno
    } = req.body;

    const profilechema = Joi.object().keys({
        limit: Joi.number().required(),
        pageno: Joi.optional().required(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let data = {
        limit,
        pageno
    };
    let getUserDetailsFromDB = await sportsService.getSportOuterList(data);
    let getMatchCupDetails = await sportsService.getOuterIsCupMatches(data);
    //let getDepositWidthwral = await sportsService.getDepositWidthwralDetails();
    var getDepositWidthwralDetails = {};
    /*if (getDepositWidthwral.statusCode === CONSTANTS.SUCCESS) {
    	
        for (let index2 = 0; index2 < getDepositWidthwral.data.length; index2++) {
        	
            const DepositWidthwralDetailsKey = getDepositWidthwral.data[index2].key.split('.')[1];
            const DepositWidthwralDetailsValue = getDepositWidthwral.data[index2].value;		
            getDepositWidthwralDetails[DepositWidthwralDetailsKey]= DepositWidthwralDetailsValue;
        }
    }*/


    if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        let tempdata = []
        for (let index = 0; index < getUserDetailsFromDB.data.length; index++) {
            const element = getUserDetailsFromDB.data[index];
            tempdata.push({ ...element, image: settings.imageURL + element.image, mobile_image: settings.imageURL + element.mobile_image });
        }
        return apiSuccessResSport(req, res, 'Success', tempdata, getMatchCupDetails.data, getDepositWidthwralDetails);
    } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiSuccessRes(req, res, 'Error to Sports.');
    }
}
async function getseiresMatchsList(req, res) {

    let {
        limit,
        sport_id,
        series_id,
        type,
        pageno
    } = req.body;
    const profilechema = Joi.object().keys({
        limit: Joi.number().required(),
        sport_id: Joi.number().optional(),
        series_id: Joi.number().optional(),
        type: Joi.string().optional(),
        pageno: Joi.optional().required(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    try {

        let data = {
            limit,
            sport_id,
            series_id,
            type,
            pageno
        };
        let SportSeriesInpalyMatch = await sportsService.getseiresMatchsListInPlay(data);
        let SportSeriesUpcommingMatch = { data: [] };
        let EvolutionGamesLIST = { data: null };
        if (data.sport_id != CONSTANTS.BETFAIR_SPORT_CASINO) {
            SportSeriesUpcommingMatch = await sportsService.getseiresMatchsListUpcomming(data);
        }

        let responseData = { 'InplayMatches': SportSeriesInpalyMatch.data, 'UpCommingMatches': SportSeriesUpcommingMatch.data };
        if (SportSeriesInpalyMatch.statusCode === CONSTANTS.SUCCESS || SportSeriesUpcommingMatch.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Success', responseData);
        } else if (SportSeriesInpalyMatch.statusCode === CONSTANTS.NOT_FOUND || SportSeriesUpcommingMatch.statusCode === CONSTANTS.NOT_FOUND) {
            return apiSuccessRes(req, res, 'not found.', responseData);
        } else {
            return apiErrorRes(req, res, 'Error to Sports.');
        }
    } catch (error) {
        console.log('getMatchsBySportAndSeriesId ----------------------- ', error);
    }


}
async function getCasinoMatchInPlay(req, res) {

    let { limit, sport_id, series_id, pageno, type } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        limit: Joi.number().required(),
        sport_id: Joi.number().required(),
        series_id: Joi.number(),
        pageno: Joi.optional().required(),
        type: Joi.string().optional(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let data = { limit, sport_id, series_id, pageno, type, id };
    let SportSeriesInpalyMatch = await sportsService.getCasinoMatchInPlay(data);
    let SportSeriesUpcommingMatch = { data: [] };
    let EvolutionGamesLIST = null;
    let EvolutionGamesSLOTEGRATOR = null;

    if (data.sport_id == CONSTANTS.BETFAIR_SPORT_CASINO && settings.FUN_GAMES_OPEN_CASINO_DASHBOARD_YES_NO === 'YES') {
        try {
            let getUserByid = await userService.getUserNameAndPasswordByIdXpg(id);
            let TID = id + '____' + Date.now();
            let send_json = { operatorID: settings.FUN_OPERATOR_ID, username: getUserByid.data.user_name, firstName: getUserByid.data.user_name };
            let Password = globalFunction.convertXpgStringmd5(send_json);

            let registUserHash = 'User/Add/' + settings.FUN_WHITE_LIST_IP + '/' + TID + '/' + settings.FUN_API_KEY + '/' + getUserByid.data.user_name + '/' + Password + '/' + settings.FUN_OPERATOR_CURRENCY + '/' + settings.FUN_API_PASSWORD;

            let registerHashKey = globalFunction.convertFUNStringmd5(registUserHash);

            let userRegiset = { Login: getUserByid.data.user_name, Password: Password, TID: TID, Currency: settings.FUN_OPERATOR_CURRENCY, Hash: registerHashKey, Language: settings.FUN_OPERATOR_LANGUAGE, RegistrationIP: settings.FUN_WHITE_LIST_IP };

            let userRegisterSendData = globalFunction.convertXpgString(userRegiset);
            let userRegisterResponse = await axios.get(settings.FUN_REGISTER_USER + userRegisterSendData);
            console.log('userRegisterResponse --------------------------------------------------------------------- ', userRegisterResponse.data);
            if (userRegisterResponse.status != 200 && userRegisterResponse.data != 1) {
                return apiErrorRes(req, res, userRegisterResponse.data);
            }
            //EvolutionGamesLIST.data= {'games':null};
            EvolutionGamesLIST = [];
            let data = { page: 1, }
            //let fungames  = await sportsService.getFundistGames(data);

            let BetGames = await sportsService.getFundistGamesBetGames(data);
            let LuckyStreak = await sportsService.getFundistGamesLuckyStreak(data);
            let SAGaming = await sportsService.getFundistGamesSAGaming(data);
            let VivoGaming = await sportsService.getFundistGamesVivoGaming(data);
            let XProGaming = await sportsService.getFundistGamesXProGaming(data);
            let AsiaGaming = await sportsService.getFundistGamesAsiaGaming(data);
            let AsiaLiveTech = await sportsService.getFundistGamesAsiaLiveTech(data);
            let LiveGames = await sportsService.getFundistGamesLiveGames(data);
            let OrientalGame = await sportsService.getFundistGamesOrientalGame(data);

            let Betgames1 = { 'name': 'Bet Games', 'data': CONSTANTS.DATA_NULL };
            let LuckyStreak1 = { 'name': 'Lucky Streak', 'data': CONSTANTS.DATA_NULL };
            let SAGaming1 = { 'name': 'SA Gaming', 'data': CONSTANTS.DATA_NULL };
            let VivoGaming1 = { 'name': 'Vivo Gaming', 'data': CONSTANTS.DATA_NULL };
            let XProGaming1 = { 'name': 'XPro Gaming', 'data': CONSTANTS.DATA_NULL };
            let AsiaGaming1 = { 'name': 'Asia Gaming', 'data': CONSTANTS.DATA_NULL };
            let AsiaLiveTech1 = { 'name': 'Asia Live Tech', 'data': CONSTANTS.DATA_NULL };
            let LiveGames1 = { 'name': 'Live Games', 'data': CONSTANTS.DATA_NULL };
            let OrientalGame1 = { 'name': 'Oriental Game', 'data': CONSTANTS.DATA_NULL };
            let games = { 'name': 'Oriental Game', 'data': CONSTANTS.DATA_NULL };

            if (BetGames.statusCode === CONSTANTS.SUCCESS || LuckyStreak.statusCode === CONSTANTS.SUCCESS || SAGaming.statusCode === CONSTANTS.SUCCESS || VivoGaming.statusCode === CONSTANTS.SUCCESS || XProGaming.statusCode === CONSTANTS.SUCCESS || AsiaGaming.statusCode === CONSTANTS.SUCCESS || AsiaLiveTech.statusCode === CONSTANTS.SUCCESS || LiveGames.statusCode === CONSTANTS.SUCCESS || OrientalGame.statusCode === CONSTANTS.SUCCESS) {

                Betgames1.data = BetGames.data;
                LuckyStreak1.data = LuckyStreak.data;
                SAGaming1.data = SAGaming.data;
                VivoGaming1.data = VivoGaming.data;
                XProGaming1.data = XProGaming.data;
                AsiaGaming1.data = AsiaGaming.data;
                AsiaLiveTech1.data = AsiaLiveTech.data;
                LiveGames1.data = LiveGames.data;
                OrientalGame1.data = OrientalGame.data;

                EvolutionGamesLIST.push(Betgames1);
                EvolutionGamesLIST.push(LuckyStreak1);
                EvolutionGamesLIST.push(SAGaming1);
                EvolutionGamesLIST.push(VivoGaming1);
                EvolutionGamesLIST.push(XProGaming1);
                EvolutionGamesLIST.push(AsiaGaming1);
                EvolutionGamesLIST.push(AsiaLiveTech1);
                EvolutionGamesLIST.push(LiveGames1);
                EvolutionGamesLIST.push(OrientalGame1);
            }
        } catch (error) {
            console.log(' error ---------------------------------FUN_GAMES----------------------------- ', error);
        }

    }
    if (data.sport_id == CONSTANTS.BETFAIR_SPORT_CASINO && settings.SLOTEGRATOR_GAMES_OPEN_CASINO_DASHBOARD_YES_NO === 'YES') {
        try {
            EvolutionGamesSLOTEGRATOR = [];
            let data = { page: 1, }
            let Betgames = await sportsService.getSlotgratorGamesBetgames(data);
            let Ezugi = await sportsService.getSlotgratorGamesEzugi(data);
            let LottoInstantWin = await sportsService.getSlotgratorGamesLottoInstantWin(data);
            let Betgames1 = { 'name': 'Betgames', 'data': CONSTANTS.DATA_NULL };

            let Ezugi1 = { 'name': 'Ezugi', 'data': CONSTANTS.DATA_NULL };

            let LottoInstantWin1 = { 'name': 'Lotto Instant Win', 'data': CONSTANTS.DATA_NULL };


            if (Betgames.statusCode === CONSTANTS.SUCCESS || Ezugi.statusCode === CONSTANTS.SUCCESS || LottoInstantWin.statusCode === CONSTANTS.SUCCESS) {
                Betgames1.data = Betgames.data;
                Ezugi1.data = Ezugi.data;
                LottoInstantWin1.data = LottoInstantWin.data;
                EvolutionGamesSLOTEGRATOR.push(Betgames1);
                EvolutionGamesSLOTEGRATOR.push(Ezugi1);
                EvolutionGamesSLOTEGRATOR.push(LottoInstantWin1);
            }


        } catch (error) {
        }
    }

    let responseData = { 'InplayMatches': SportSeriesInpalyMatch.data, 'UpCommingMatches': SportSeriesUpcommingMatch.data, 'EvolutionGames': EvolutionGamesLIST, 'EvolutionGamesSLOTEGRATOR': EvolutionGamesSLOTEGRATOR };
    if (SportSeriesInpalyMatch.statusCode === CONSTANTS.SUCCESS || SportSeriesUpcommingMatch.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success', responseData);
    } else if (SportSeriesInpalyMatch.statusCode === CONSTANTS.NOT_FOUND || SportSeriesUpcommingMatch.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', responseData);
    } else {
        return apiErrorRes(req, res, 'Error to Sports.');
    }
}

async function fetchSportsLength(req, res) {

    let {
        limit,
        sport_id,
        series_id,
        pageno,
        type
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        limit: Joi.number().required(),
        sport_id: Joi.number().required(),
        series_id: Joi.number(),
        pageno: Joi.optional().required(),
        type: Joi.string().optional(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let data = {
        limit,
        sport_id,
        series_id,
        pageno,
        type,
        id
    };
    const SportSeriesInPlayMatch = await sportsService.getInPlaySportsLength(data);

    const cricketLiveCount = SportSeriesInPlayMatch.data.cricketLength || 0;
    const tennisLiveCount = SportSeriesInPlayMatch.data.tennisLength || 0;
    const soccerLiveCount = SportSeriesInPlayMatch.data.soccerLength || 0;

    let cricketUpcomingMatchCount = 0;
    let tennisUpcomingMatchCount = 0;
    let soccerUpcomingMatchCount = 0;

    if (data.sport_id !== CONSTANTS.BETFAIR_SPORT_CASINO) {
        const getCricketUpcomingLength = await sportsService.getCricketUpcomingLength(data);
        cricketUpcomingMatchCount = getCricketUpcomingLength.data.length || 0;

        const getTennisUpcomingLength = await sportsService.getTennisUpcomingLength(data);
        tennisUpcomingMatchCount = getTennisUpcomingLength.data.length || 0;

        const getSoccerUpcomingLength = await sportsService.getSoccerUpcomingLength(data);
        soccerUpcomingMatchCount = getSoccerUpcomingLength.data.length || 0;
    }

    const totalCricketCount = cricketLiveCount + cricketUpcomingMatchCount;
    const totalTennisCount = tennisLiveCount + tennisUpcomingMatchCount;
    const totalSoccerCount = soccerLiveCount + soccerUpcomingMatchCount;

    const totalCount = {
        cricketLength: totalCricketCount ,
        tennisLength: totalTennisCount ,
         soccerLength: totalSoccerCount 
    }
    return apiErrorRes(req, res, "success", totalCount);

}

async function runningMarketAnalysisReport(req, res) {
    try {
        const user_id = req.user.sub.id;
        if (!user_id) {
            console.error("User ID not found");
            return apiErrorRes(req, res, "User ID is required");
        }
        let {
            limit,
            sport_id,
            series_id,
            pageno,
            type
        } = req.body;
        let { id } = req.headers;
        const profilechema = Joi.object().keys({
            limit: Joi.number().required(),
            sport_id: Joi.number().required(),
            series_id: Joi.number(),
            pageno: Joi.optional().required(),
            type: Joi.string().optional(),
        }).unknown(true);
        try {
            await profilechema.validate(req.body, {
                abortEarly: true
            });
        } catch (error) {
            return apiErrorRes(req, res, error.details[0].message);
        }

        let data = {
            limit,
            sport_id,
            series_id,
            pageno,
            type,
            id
        };
        const SportSeriesInPlayMatch = await sportsService.getRunningMarketAnalysis(data);
        const allInplayMatchIds = SportSeriesInPlayMatch.data.map(i => i.match_id);

        const getAllSportsMarketAnalysis = await betService.runningMarketAnalysisReport(user_id, allInplayMatchIds);

        return apiErrorRes(req, res, "success", getAllSportsMarketAnalysis);
    } catch (error) {
        console.error("An error occurred:", error);
        return apiErrorRes(req, res, error.message || "An error occurred while fetching data");
    }
}

async function indiaBetgetMatchListBySportId(req, res) {
    const { limit, sport_id, pageno } = req.body;
    const { id } = req.headers;

    const profilechema = Joi.object().keys({
        limit: Joi.number().required(),
        sport_id: Joi.number().required(),
        pageno: Joi.optional().required(),
    }).unknown(true);

    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    const data = { limit, sport_id, pageno, id };

    try {
        const result = await sportsService.IndiaBetgetMatchListBySportId(data);
        if (result.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Success', result.data);
        }

        if (result.statusCode === CONSTANTS.NOT_FOUND) {
            return apiSuccessRes(req, res, 'No matches found.', CONSTANTS.BLANK_ARRAY);
        }

        return apiSuccessRes(req, res, 'An error occurred while fetching match data.');
    } catch (error) {
        console.error("Error in indiaBetgetMatchListBySportId:", error.message, error.stack);
        return apiErrorRes(req, res, 'Internal server error.');
    }
}

async function allLiveSports(req, res) {
    let { limit, sport_id, series_id, pageno, type } = req.body;
    let { id } = req.headers;
    
    const profilechema = Joi.object().keys({
        limit: Joi.number().required(),
        sport_id: Joi.number().required(),
        series_id: Joi.number(),
        pageno: Joi.optional().required(),
        type: Joi.string().optional(),
    }).unknown(true);

    try {
        await profilechema.validate(req.body, { abortEarly: true });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let data = {
        limit,
        sport_id,
        series_id,
        pageno,
        type,
        id,
    };

    try {
        const SportSeriesInPlayMatch = await sportsService.allLiveSportsList(data);
    
        if (SportSeriesInPlayMatch.statusCode === CONSTANTS.SUCCESS) {
            const groupedData = SportSeriesInPlayMatch.data.reduce((acc, item) => {
                const { SportName } = item;
                if (!acc[SportName]) {
                    acc[SportName] = [];
                }
                acc[SportName].push(item);
                return acc;
            }, {});
    
            return apiSuccessRes(req, res, 'Success', groupedData);
        } else if (SportSeriesInPlayMatch.statusCode === CONSTANTS.NOT_FOUND) {
            return apiSuccessRes(req, res, 'Not found.', []);
        } else {
            return apiErrorRes(req, res, 'Error fetching sports data.');
        }
    } catch (err) {
        console.error("Error fetching sports data:", err);
        return apiErrorRes(req, res, "Failed to fetch sports data");
    }
    
        
}

async function allSportsMatches(req, res) {
    let {
        limit,
        sport_id,
        series_id,
        pageno,
        type
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        limit: Joi.number().required(),
        sport_id: Joi.number().required(),
        series_id: Joi.number(),
        pageno: Joi.optional().required(),
        type: Joi.string().optional(),
    }).unknown(true);
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let data = {
        limit,
        sport_id,
        series_id,
        pageno,
        type,
        id
    };
    const SportSeriesInPlayMatch = await sportsService.allLiveSportsList(data);

    if (SportSeriesInPlayMatch.statusCode === CONSTANTS.SUCCESS) {
        // Group the data based on SportName
        const groupedData = SportSeriesInPlayMatch.data.reduce((acc, item) => {
            const { SportName } = item;
            if (!acc[SportName]) {
                acc[SportName] = [];
            }
            acc[SportName].push(item);
            return acc;
        }, {});

        const matchLengths = {};

        for (const sport in groupedData) {
            if (sport === 'Cricket') {
                const getCricketAllMatches = await sportsService.getCricketUpcomingLength(data);
                matchLengths.Cricket = getCricketAllMatches;
            } else if (sport === 'Tennis') {
                const getTennisAllMatches = await sportsService.getTennisUpcomingLength(data);
                matchLengths.Tennis = getTennisAllMatches;
            } else if (sport === 'Soccer') {
                const getSoccerAllMatches = await sportsService.getSoccerUpcomingLength(data);
                matchLengths.Soccer = getSoccerAllMatches;
            }
        }

        const mergedData = Object.keys(groupedData).reduce((acc, sport) => {
            const liveMatches = groupedData[sport] || [];
            const upcomingMatches = matchLengths[sport].data || [];

            const liveMatchIds = new Set(liveMatches.map((match) => match.match_id));

            const mergedMatches = [...liveMatches, ...upcomingMatches].reduce((merged, match) => {
                const existingMatchIndex = merged.findIndex((m) => m.match_id === match.match_id);
                if (existingMatchIndex !== -1) {
                    merged[existingMatchIndex].isLive = liveMatchIds.has(match.match_id);
                } else {
                    merged.push({
                        ...match,
                        isLive: liveMatchIds.has(match.match_id),
                    });
                }
                return merged;
            }, []);

            acc[sport] = mergedMatches; 
            return acc;
        }, {});

        return apiErrorRes(req, res, "success", mergedData);


    }
}


router.post('/games', getAllSports);
router.post('/games-list', getSportList);
router.post('/event-game-list', getSeriesListBySportId);
router.post('/event-game', getMatchsBySportAndSeriesId);
router.post('/game-profile', getMatchListForDashboard);
router.post('/game-event-list', getMatchListBySeriesId);
router.post('/game-page', getMatchesPage);
router.post('/inplay-event', getMatchesInplay);
router.post('/upcoming-event', getMatchesUpcoming);
router.post('/personal-games-list', getFavoriteMatchesList);
router.get('/all-game-list', getAllMarket);
router.post('/event-all-list', getMatchListForDashboardOld);
router.post('/third-games', getSLOTEGRATORMatches);
router.post('/fun-games', getFundistMatches);
router.get('/page-list', getPagesList);
router.post('/getSportOuterList', getSportOuterList);
router.post('/getseiresMatchsList', getseiresMatchsList);
router.post('/getSeriesOuterListBySportId', getSeriesOuterListBySportId);
router.post('/getMatchOuterListBySeriesId', getMatchOuterListBySeriesId);
router.post('/event-casino', getCasinoMatchInPlay);
router.post("/game-Length", fetchSportsLength)
router.post('/Running-Market-Analysis', runningMarketAnalysisReport)
router.post("/india-bet-event-list",indiaBetgetMatchListBySportId)
router.post("/all-live-sports", allLiveSports)
router.post("/all-sports-matches", allSportsMatches)

module.exports = router;
