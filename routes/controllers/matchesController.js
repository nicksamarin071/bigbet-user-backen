const express = require('express');
const router = express.Router();
const Joi = require('joi');
const axios = require('axios');
const settings = require('../../config/settings');
const matchesService = require('../services/matchesService');
const CONSTANTS_MESSAGE = require('../../utils/constantsMessage');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');
const userModel = require('../../routes/model/userModel');
const marketsService = require('../services/marketsService');
let apiSuccessRes = globalFunction.apiSuccessRes;
let apiSuccessResFancy = globalFunction.apiSuccessResFancy;
let apiErrorRes = globalFunction.apiErrorRes;


async function getMatchScore(req, res) {
    return apiErrorRes(req, res, 'Error to get score.');
    let {
        sport_id,
        match_id
    } = req.body;
    const profilechema = Joi.object({
        sport_id: Joi.number().required(),
        match_id: Joi.string().required()
    });
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    try {
        let response = [];
        if (sport_id == CONSTANTS.BETFAIR_SPORT_CRICKET) {
            let response2 = await axios.get(settings.GET_SCORE_CRICKET_URL + "" + match_id);
            response = response2.data;
            if (response.data === null || response.data.length == 0) {
                return apiErrorRes(req, res, 'Score not found.', CONSTANTS.BLANK_ARRAY);
            }
        } else if (sport_id == CONSTANTS.BETFAIR_SPORT_TENNIS) {

            response = await axios.get(settings.GET_SCORE_TENNIS_URL + "" + match_id);
        } else if (sport_id == CONSTANTS.BETFAIR_SPORT_SOCCER) {
            response = await axios.get(settings.GET_SCORE_SOCCER_URL + "" + match_id);
        } else {
            response = await axios.get(settings.GET_SCORE_ALL_SPORTS_URL + "" + match_id);
        }

        let responsData = '';

        if (response.data.length <= 0 && sport_id != CONSTANTS.BETFAIR_SPORT_CRICKET) {
            responsData = await axios.get(settings.GET_SCORE_ALL_SPORTS_URL + "" + match_id);
        } else {
            responsData = response;
        }
        // let newresponse = await axios.get(settings.GET_SCORE_ALL_SPORTS_URL + "" + match_id);

        if (responsData.data === null || responsData.data.length == 0) {
            return apiErrorRes(req, res, 'Score not found.', CONSTANTS.BLANK_ARRAY);
        } else {
            let resss = JSON.parse(responsData.data);
            //console.log(' -----------------------------score-------------------------------------------- ', resss.data); 
            return apiSuccessRes(req, res, 'Success', resss.data);
        }
    } catch (error) {
        console.log(error);
        return apiErrorRes(req, res, 'Error to get score.');
    }
}

async function getMatchLiveTV(req, res) {
    return apiErrorRes(req, res, 'Error to get score.');
    let {
        sport_id,
        match_id
    } = req.body;
    const profilechema = Joi.object({
        sport_id: Joi.number().required(),
        match_id: Joi.string().required()
    });
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    try {
        if (sport_id == CONSTANTS.BETFAIR_SPORT_CRICKET) {
            let response = await axios.get(settings.GET_SCORE_URL + "" + match_id);
        } else if (sport_id == CONSTANTS.BETFAIR_SPORT_TENNIS) {
            let response = await axios.get(settings.GET_SCORE_URL + "" + match_id);
        } else if (sport_id == CONSTANTS.BETFAIR_SPORT_SOCCER) {
            let response = await axios.get(settings.GET_SCORE_URL + "" + match_id);
        } else {
            let response = await axios.get(settings.GET_SCORE_URL + "" + match_id);
        }
        if (response.data) {
            return apiSuccessRes(req, res, 'Success', response.data);
        } else {
            return apiErrorRes(req, res, 'Data not found.', response);
        }
    } catch (error) {
        console.log(error);

        return apiErrorRes(req, res, 'Error to get data.');
    }
}

async function getMatchIndianSessionByMarketIdm(req, res) {

    let {
        match_id
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        match_id: Joi.string().required(),
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
        id
    };

    try {
        let response = await axios.get(settings.GET_MATCH_INDIAN_SESSION_URL + "" + match_id);

        if (response.data) {
            return apiSuccessRes(req, res, 'Success', response.data);
        } else {
            return apiErrorRes(req, res, 'Data not found.', response);
        }
    } catch (error) {
        console.log(error);

        return apiErrorRes(req, res, 'Error to get data.');
    }
}

async function getMatchIndianSessionByMarketId(req, res) {

    let {
        match_id
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object().keys({
        match_id: Joi.number().required(),
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
        id
    };

    let fancyResponse = await marketsService.getMatchIndiaFancy(data);
    let fancyResponseManual = await marketsService.getMatchIndiaFancyManual(data);
    let fancyResponseResult = [];
    if (fancyResponse.statusCode === CONSTANTS.SUCCESS || fancyResponseManual.statusCode === CONSTANTS.SUCCESS) {
        fancyResponseResult = fancyResponse.data;
        fancyResponseResult = fancyResponseResult.concat(fancyResponseManual.data);
        return apiSuccessResFancy(req, res, 'Success', fancyResponseResult, fancyResponseManual.data);
    } else if (fancyResponse.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', []);
    } else {
        return apiErrorRes(req, res, 'Error Match fancy List.');
    }
}
async function getBetsByMatchFancyORMarketeId(req, res) {

    let {
        limit,
        match_id,
        market_id,
        fancy_id,
        pageno
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object({
        match_id: Joi.number().required(),
        market_id: Joi.string(),
        fancy_id: Joi.number(),
        limit: Joi.optional().required(),
        pageno: Joi.optional().required(),
    });
    let data = {
        limit,
        match_id,
        market_id,
        fancy_id,
        pageno,
        id
    };
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let getBetsBetFair = await matchesService.getBetsByMatchORMarketeId(data);
    let getBetsFancy = await matchesService.getBetsByMatchORFancyId(data);
    if (getBetsBetFair.statusCode === CONSTANTS.SUCCESS || getBetsFancy.statusCode === CONSTANTS.SUCCESS) {
        let sendRecords = { 'MatchAndBetfair': getBetsBetFair.data, 'MatchFancy': getBetsFancy.data };
        return apiSuccessRes(req, res, 'success', sendRecords);

    } else if (getBetsBetFair.statusCode === CONSTANTS.NOT_FOUND || getBetsFancy.statusCode === CONSTANTS.NOT_FOUND) {
        return apiErrorRes(req, res, 'not found.');
    } else {
        return apiErrorRes(req, res, 'Error to bets.');
    }
}
/*Get Casino Match bets */


async function getCasinoBetsByMatchFancyORMarketeId(req, res) {

    let {
        limit,
        match_id,
        market_id,
        pageno
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object({
        match_id: Joi.number().required(),
        market_id: Joi.string(),
        //fancy_id:Joi.number(),	
        limit: Joi.optional().required(),
        pageno: Joi.optional().required(),
    });
    let data = {
        limit,
        match_id,
        market_id,
        pageno,
        id
    };
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let getBetsBetFair = await matchesService.getCasinoBetsByMatchORMarketeId(data);
    if (getBetsBetFair.statusCode === CONSTANTS.SUCCESS) {
        let sendRecords = { 'MatchAndBetfair': getBetsBetFair.data };
        return apiSuccessRes(req, res, 'success', sendRecords);

    } else if (getBetsBetFair.statusCode === CONSTANTS.NOT_FOUND) {
        return apiErrorRes(req, res, 'not found.');
    } else {
        return apiErrorRes(req, res, 'Error to bets.');
    }
}

async function getMyMatchesList(req, res) {
    let {
        sport_id
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object({
        sport_id: Joi.number(),
    });
    let data = {
        sport_id,
        id
    };
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let getMyMatchList = await matchesService.getMyMatchesList(data);
    if (getMyMatchList.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'success', getMyMatchList.data);
    } else if (getMyMatchList.statusCode === CONSTANTS.NOT_FOUND) {
        return apiErrorRes(req, res, 'not found.');
    } else {
        return apiErrorRes(req, res, 'Error to my match list.');
    }
}
async function getMatchSessionWithoutAuth(req, res) {
    let { match_id } = req.query;
    if (match_id == '' || match_id == null) {
        return apiErrorRes(req, res, 'Match Id required !');
    }
    let data = {
        match_id
    };

    let fancyResponse = await matchesService.getMatchIndiaFancyWithoutAuth(data);
    let fancyResponseManual = await matchesService.getMatchIndiaFancyManualWithoutAuth(data);
    let fancyResponseResult = [];
    if (fancyResponse.statusCode === CONSTANTS.SUCCESS || fancyResponseManual.statusCode === CONSTANTS.SUCCESS) {
        fancyResponseResult = fancyResponse.data;
        fancyResponseResult = fancyResponseResult.concat(fancyResponseManual.data);
        return apiSuccessResFancy(req, res, 'Success', fancyResponseResult, fancyResponseManual.data);
    } else if (fancyResponse.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', []);
    } else {
        return apiErrorRes(req, res, 'Error Match fancy List.');
    }
}
async function getSearchExchange(req, res) {
    let { id } = req.headers;
    let {
        team_name
    } = req.body;
    const profilechema = Joi.object({
        team_name: Joi.string().required()
    });
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let requestData = { team_name: team_name };

    try {
        let getMatchByMarchent = await marketsService.getSearchExchange(requestData);

        if (getMatchByMarchent.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Success', getMatchByMarchent.data);
        } else if (getMatchByMarchent.statusCode === CONSTANTS.NOT_FOUND) {
            return apiErrorRes(req, res, 'not found.', []);
        } else {
            return apiErrorRes(req, res, 'Error Match fancy List.');
        }
    } catch (error) {
        console.log(error);

        return apiErrorRes(req, res, 'Error to get data market list.');
    }
}

async function fetchMatchesList(req, res) {
    try {
        let { from_date, to_date } = req.body;

        from_date = from_date.trim();
        to_date = to_date.trim();

        const createSeriesSchema = Joi.object({

            from_date: Joi.string().required(),
            to_date: Joi.string().required(),

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
            from_date,
            to_date
        }

        const fetchMatches = await matchesService.getMatchesList(data);
        if (!fetchMatches || fetchMatches.length === 0) {
            return apiErrorRes(req, res, 'No matches found for the given criteria.');
        }

        // Send successful response
        return apiSuccessRes(req, res, 'Success', fetchMatches);
    } catch (error) {
        console.error(error);
        return apiErrorRes(req, res, 'Error getting data for matches list.');
    }
}

// router.post('/getAllMatches', getAllMatches);
// router.post('/getAllMatchesActive', getAllMatchesActive);
router.post('/score', getMatchScore);
router.post('/streming-play', getMatchLiveTV);
router.post('/my-event-list', getMyMatchesList);
router.post('/event-session', getMatchIndianSessionByMarketId);
router.post('/list-bt-ssn-mk', getBetsByMatchFancyORMarketeId);
router.post('/list-fn-match', getCasinoBetsByMatchFancyORMarketeId);
router.post('/event-session-tt', getMatchIndianSessionByMarketIdm);
router.get('/get-match-session', getMatchSessionWithoutAuth);
router.post('/getSearchExchange', getSearchExchange);
router.post('/matches-list-indiabet', fetchMatchesList);

module.exports = router;


// async function createMatches(req, res) {
// 	let {
// 		sport_id,
// 		series_id,
// 		match_id,
// 		name,
// 		is_manual,
// 		userid,
// 		match_date
// 	} = req.body;

// 	const createMatcheschema = Joi.object({
// 		userid: Joi.number().required(),
// 		parent_ids: Joi.optional().required(),
// 		sport_id: Joi.string().required(),
// 		series_id: Joi.string().required(),
// 		match_id: Joi.string().optional(),
// 		match_date: Joi.string().required(),
// 		is_manual: Joi.string().optional(),
// 		name: Joi.string().required(),
// 	});
// 	try {
// 		await createMatcheschema.validate(req.body, {
// 			abortEarly: true
// 		});
// 	} catch (error) {
// 		return apiErrorRes(req, res, error.details[0].message);
// 	}
// 	let reqdaa = {};
// 	if (is_manual === '0') {
// 		reqdaa = {
// 			sport_id,
// 			series_id,
// 			match_id,
// 			match_date,
// 			start_date:match_date,
// 			name,
// 			is_manual: '0',
// 			create_at: globalFunction.currentDate(),
// 			update_at: globalFunction.currentDate()
// 		};
// 	} else if (is_manual === '1') {
// 		let randomNumber = globalFunction.randomIntFromInterval(CONSTANTS.MANUAL_MATCH_MIN_RANGE, CONSTANTS.MANUAL_MATCH_MAX_RANGE);
// 		let matchId = CONSTANTS.MANUAL_MATCH + randomNumber;
// 		reqdaa = {
// 			sport_id,
// 			series_id,
// 			match_date,
// 			start_date:match_date,
// 			match_id: matchId,
// 			name,
// 			is_manual: '0',
// 			create_at: globalFunction.currentDate(),
// 			update_at: globalFunction.currentDate()
// 		};
// 	} else {
// 		return apiSuccessRes(req, res, 'Send valid manual type.');
// 	}


// 	let datafromService;
// 	let message='Match Added Successfully';
// 	if(is_manual==0){
// 		let checkSeriedIsAdded = await matchesService.getMatchSettingById(match_id);
// 		//console.log('checkSeriedIsAdded',checkSeriedIsAdded);
// 		if(checkSeriedIsAdded.data ){
// 			datafromService = await matchesService.updateOnlineMatchStatus(match_id);
// 			message='Match Updated Successfully';
// 		}else {
// 			datafromService = await matchesService.createMatches(reqdaa);
// 		}

// 	}else {
// 		datafromService = await matchesService.createMatches(reqdaa);
// 	}

// 	if (datafromService.statusCode === CONSTANTS.SUCCESS) {
// 		return apiSuccessRes(req, res, message);
// 	} else {
// 		return apiSuccessRes(req, res, 'Error to create Match.');
// 	}
// }

// async function updateMatchStatus(req, res) {

// 	let {
// 		id,userid
// 	} = req.body;
// 	const profilechema = Joi.object({
// 		userid: Joi.number().required(),
// 		parent_ids: Joi.optional().required(),
// 		id: Joi.required()
// 	});
// 	try {
// 		await profilechema.validate(req.body, {
// 			abortEarly: true
// 		});
// 	} catch (error) {
// 		return apiErrorRes(req, res, error.details[0].message);
// 	}
// 	let getUserDetailsFromDB = await matchesService.updateMatchStatus(id,userid);
// 	if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
// 		return apiSuccessRes(req, res, CONSTANTS_MESSAGE.UPDATED_SUCCESS_MESSAGE);
// 	} else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
// 		return apiSuccessRes(req, res, 'not found.');
// 	} else {
// 		return apiSuccessRes(req, res, 'Error to updateMatchStatus.');
// 	}
// }
// async function getOnlineMatch(req, res) {

// 	let {
// 		sport_id,
// 		series_id
// 	} = req.body;
// 	const profilechema = Joi.object({
// 		userid: Joi.number().required(),
// 		parent_ids: Joi.optional().required(),
// 		series_id: Joi.string().required(),
// 		sport_id: Joi.string().required()
// 	});
// 	try {
// 		await profilechema.validate(req.body, {
// 			abortEarly: true
// 		});
// 	} catch (error) {
// 		return apiErrorRes(req, res, error.details[0].message);
// 	}

// 	let onlineSeriesRes = await axios.get(settings.ONLINE_MATCH_URL + sport_id + '&CompetitionID=' + series_id);
// 	let onlineSeriesList = onlineSeriesRes.data;
// 	let listOfId = [];
// 	let mapsdata = onlineSeriesList.map((element) => {
// 		listOfId.push(element.event.id);
// 		return {
// 			match_id: element.event.id,
// 			name: element.event.name,
// 			match_date: element.event.openDate
// 		};
// 	});

// 	let getUserDetailsFromDB = await matchesService.getActiveMatchesByListOfID(listOfId);
// 	if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
// 		let matchesListFromDB = getUserDetailsFromDB.data;
// 		matchesListFromDB = JSON.parse(JSON.stringify(matchesListFromDB));
// 		if (matchesListFromDB.length > 0) {
// 			let notAvailableIDInDB = mapsdata.length > 0 ? mapsdata.filter(o => !matchesListFromDB.find(o2 => o.match_id === o2.match_id)).map((element) => {
// 				return {
// 					...element,
// 					is_active: '0',
// 					sport_id: sport_id,
// 					series_id: series_id
// 				};
// 			}) : [];
// 			let availableIDInDB = mapsdata.length > 0 ? mapsdata.filter(o => matchesListFromDB.find(o2 => o.match_id === o2.match_id)).map((element) => {
// 				return {
// 					...element,
// 					is_active: '1',
// 					sport_id: sport_id,
// 					series_id: series_id
// 				};
// 			}) : [];
// 			let sendId = [...availableIDInDB, ...notAvailableIDInDB];
// 			return apiSuccessRes(req, res, 'success11', sendId);
// 		} else {
// 			let notAvailableIDInDB = mapsdata.map((element) => {
// 				return {
// 					...element,
// 					is_active: '0',
// 					sport_id: sport_id,
// 					series_id: series_id
// 				};
// 			});
// 			return apiSuccessRes(req, res, 'success11', notAvailableIDInDB);
// 		}

// 	} else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
// 		return apiSuccessRes(req, res, 'not found.');
// 	} else {
// 		return apiSuccessRes(req, res, 'Error to get series.');
// 	}

// }
// async function updateMatch(req, res) {

// 	let {
// 		id,
// 		odd_limit,
// 		volume_limit,
// 		min_stack,
// 		max_stack
// 	} = req.body;
// 	const profilechema = Joi.object({
// 		userid: Joi.number().required(),
// 		parent_ids: Joi.optional().required(),
// 		id: Joi.number().required(),
// 		odd_limit: Joi.number().required(),
// 		volume_limit: Joi.number().required(),
// 		min_stack: Joi.number().required(),
// 		max_stack: Joi.number().required(),
// 	});
// 	try {
// 		await profilechema.validate(req.body, {
// 			abortEarly: true
// 		});
// 	} catch (error) {
// 		return apiErrorRes(req, res, error.details[0].message);
// 	}
// 	let reqData = {
// 		odd_limit,
// 		volume_limit,
// 		min_stack,
// 		max_stack
// 	};
// 	let getUserDetailsFromDB = await matchesService.updateMatch(reqData, id);
// 	if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
// 		return apiSuccessRes(req, res, 'Updated Successfully');

// 	} else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
// 		return apiSuccessRes(req, res, 'not found.');
// 	} else {
// 		return apiSuccessRes(req, res, 'Error to updateMarketStatus.');
// 	}
// }

// async function marketWatch(req, res) {
// 	try {
// 		let {
// 			parent_ids
// 		} = req.body;
// 		const createFancySchema = Joi.object({
// 			userid: Joi.number().required(),
// 			parent_ids: Joi.optional().required(),
// 		});
// 		try {
// 			await createFancySchema.validate(req.body, {
// 				abortEarly: true
// 			});
// 		} catch (error) {
// 			return apiErrorRes(req, res, error.details[0].message);
// 		}
// 		let fancyList = await matchesService.getMatch(parent_ids);
// 		if (fancyList.statusCode === CONSTANTS.SUCCESS) {
// 			return apiSuccessRes(req, res, 'market match get successfully', fancyList.data);
// 		} else {
// 			return apiSuccessRes(req, res, 'Error to get marketWatch.');
// 		}
// 	} catch (e) {
// 		//console.log('there are the error ', e);
// 	}
// }
// async function getMatchSettingById(req, res) {

// 	let {
// 		id
// 	} = req.body;
// 	const profilechema = Joi.object({
// 		userid: Joi.number().required(),
// 		parent_ids: Joi.optional().required(),
// 		id: Joi.number().required(),
// 	});
// 	try {
// 		await profilechema.validate(req.body, {
// 			abortEarly: true
// 		});
// 	} catch (error) {
// 		return apiErrorRes(req, res, 'Enter valid param!');
// 	}
// 	let getUserDetailsFromDB = await matchesService.getMatchSettingById(id);
// 	if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
// 		return apiSuccessRes(req, res, 'Success', getUserDetailsFromDB.data);

// 	} else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
// 		return apiSuccessRes(req, res, 'not found.');
// 	} else {
// 		return apiSuccessRes(req, res, 'Error to updateMarketStatus.');
// 	}
// }

// async function homeMatches(req, res) {

// 	let {sport_id,series_id}=req.body;
// 	const profilechema = Joi.object({
// 		userid: Joi.number().required(),
// 		parent_ids: Joi.optional().required(),
// 		sport_id: Joi.number(),
// 		series_id: Joi.number()
// 	});
// 	try {
// 		await profilechema.validate(req.body, {
// 			abortEarly: true
// 		});
// 	} catch (error) {
// 		return apiErrorRes(req, res, error.details[0].message);
// 	}


// 	let parents =req.body.parent_ids;

// 	let getUserDetailsFromDB = await matchesService.getMatchForUserPanelBySportId(parents,sport_id,series_id);
// 	if (getUserDetailsFromDB.statusCode===CONSTANTS.SUCCESS) {
// 		return apiSuccessRes(req, res, 'Success',getUserDetailsFromDB.data);

// 	} else {
// 		return apiSuccessRes(req, res, 'not found.');
// 	}
// }


// async function matchDetails(req, res) {

// 	let {match_id,user_id,user_type_id}=req.body;
// 	const profilechema = Joi.object({
// 		userid: Joi.number().required(),
//         user_id: Joi.optional(),
//         user_type_id: Joi.optional(),
// 		parent_ids: Joi.optional().required(),
// 		match_id: Joi.required(),
// 	});
// 	//let loginUserData = userModel.getUserData();
// 	//user_type_id = loginUserData.user_type_id;
// 	try {
// 		await profilechema.validate(req.body, {
// 			abortEarly: true
// 		});
// 	} catch (error) {
// 		return apiErrorRes(req, res, error.details[0].message);
// 	}

// 	let parents =req.body.parent_ids;

// 	let getUserDetailsFromDB = await matchesService.matchDetails(user_id,user_type_id,parents,match_id);
// 	if (getUserDetailsFromDB.statusCode===CONSTANTS.SUCCESS) {
// 		return apiSuccessRes(req, res, 'Success',getUserDetailsFromDB.data);

// 	} else {
// 		return apiSuccessRes(req, res, 'not found.');
// 	}
// }

// let getMatchUser = async function (req, res) {

// 	let {match_id,parent_id,parent_type}=req.body;
// 	const matchschema = Joi.object({
// 		userid: Joi.number().required(),
// 		match_id: Joi.optional(),
// 		parent_ids: Joi.optional().required(),
// 		parent_id: Joi.required(),
// 		parent_type: Joi.required(),
// 	});
// 	try {
// 		await matchschema.validate(req.body, {
// 			abortEarly: true
// 		});
// 	} catch (error) {
// 		return apiErrorRes(req, res, error.details[0].message);
// 	}
// 	let getMatchUserData = await matchesService.getMatchUser(match_id,parent_id,parent_type);
// 	if (getMatchUserData.statusCode===CONSTANTS.SUCCESS) {
// 		return apiSuccessRes(req, res, 'Success',getMatchUserData.data);

// 	} else {
// 		return apiSuccessRes(req, res, 'not found.');
// 	}
// };

// let getMatchAndMarketPosition = async function (req, res) {

//     let {userid,user_type_id}=req.body;

//     //console.log("dskfhhhhhhh",req.body)
//     let {match_id}=req.params;
//     const matchschema = Joi.object({
//         userid: Joi.number().required(),
//         match_id: Joi.optional(),
//         parent_ids: Joi.optional().required()
//     });
//     try {
//         await matchschema.validate(req.body, {
//             abortEarly: true
//         });
//     } catch (error) {
//         return apiErrorRes(req, res, error.details[0].message);
//     }
//     let loginUserData = userModel.getUserData();
//     user_type_id = loginUserData.user_type_id;

//     let getMatchUserData = await matchesService.getMatchAndMarketPosition(userid,match_id,user_type_id);
//     if (getMatchUserData.statusCode===CONSTANTS.SUCCESS) {
//         return apiSuccessRes(req, res, 'Success',getMatchUserData.data);

//     } else {
//         return apiSuccessRes(req, res, 'not found.');
//     }
// };

// async function searchMatches(req, res) {

// 	let {search} = req.query;

// 	const createFancySchema = Joi.object({
// 		search: Joi.optional().required()
// 	});

// 	let matchesFromDB = await matchesService.searchMatches(search);
// 	if (matchesFromDB.statusCode===CONSTANTS.SUCCESS) {
// 		return apiSuccessRes(req, res, 'Success',matchesFromDB.data);

// 	} else {
// 		return apiSuccessRes(req, res, 'not found.');
// 	}
// }


// router.post('/getOnlineMatch', getOnlineMatch);
// router.post('/updateMatchStatus', updateMatchStatus);
// router.post('/createMatches', createMatches);

// router.post('/updateMatch', updateMatch);
// router.post('/getMatchSettingById', getMatchSettingById);
// router.get('/marketWatch', marketWatch);
// router.post('/homematches', homeMatches);
// router.post('/matchDetails', matchDetails);
// router.post('/getMatchUser', getMatchUser);
// router.get('/getMatchAndMarketPosition/:match_id', getMatchAndMarketPosition);
// router.get('/searchMatches', searchMatches);
