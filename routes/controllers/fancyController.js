const express = require('express');
const axios = require('axios');
const router = express.Router();
const Joi = require('joi');
const fancyService = require('../services/fancyService');
const settings = require('../../config/settings');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');
const userService = require('../services/userService');
let apiSuccessRes = globalFunction.apiSuccessRes;
let apiErrorRes = globalFunction.apiErrorRes;

async function createFancy(req, res) {
    try {
        let {
            match_id,
            super_admin_fancy_id,
            name,
            fancy_type_id,
            session_value_yes,
            session_value_no,
            fancy_range,
            sport_id,
            session_size_no,
            session_size_yes,
            is_indian_fancy,
            selection_id
        } = req.body;

        const createFancySchema = Joi.object({
            match_id: Joi.string().required(),
            super_admin_fancy_id: Joi.string().required(),
            name: Joi.string().required(),
            userid: Joi.number().required(),
            parent_ids: Joi.optional().required(),
            fancy_type_id: Joi.number().required().positive(),
            // date_time: Joi.number().required().positive(),
            session_value_yes: Joi.string().required(),
            session_value_no: Joi.string().required(),
            fancy_range: Joi.string().required(),
            sport_id: Joi.string().required(),
            session_size_no: Joi.string().required(),
            session_size_yes: Joi.string().required(),
            is_indian_fancy: Joi.number().valid(0, 1).required(),
            selection_id: Joi.string().required()
        });
        try {
            await createFancySchema.validate(req.body, {
                abortEarly: true
            });
        } catch (error) {
            return apiErrorRes(req, res, error.details[0].message);
        }

        if (is_indian_fancy === '1') {
            let randomNumber = globalFunction.randomIntFromInterval(CONSTANTS.MANUAL_SPORTS_MIN_RANGE, CONSTANTS.MANUAL_SPORTS_MAX_RANGE);
            selection_id = CONSTANTS.MANUAL_FANCY + randomNumber;
        }
        let fancy_id = match_id + '_' + selection_id;

        let reqdata = {
            match_id,
            super_admin_fancy_id,
            name,
            selection_id,
            fancy_type_id,
            date_time: new Date(),
            session_value_yes,
            session_value_no,
            fancy_range,
            sport_id,
            session_size_no,
            session_size_yes,
            is_indian_fancy,
            active: '0',
            fancy_id
        };

        let datafromService = await fancyService.createFancy(reqdata);
        if (datafromService.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Fancy created successfully');
        } else {
            return apiSuccessRes(req, res, 'Error to create Fancy.');
        }
    } catch (e) {
        console.log('There are errors ', e);
    }
}
async function getFancy(req, res) {
    try {
        let {
            match_id
        } = req.body;
        const createFancySchema = Joi.object({
            match_id: Joi.string(),
            userid: Joi.number().required(),
            parent_ids: Joi.optional().required(),
        });
        try {
            await createFancySchema.validate(req.body, {
                abortEarly: true
            });
        } catch (error) {
            return apiErrorRes(req, res, error.details[0].message);
        }
        let reqParam = {
            match_id
        };

        let fancyList = await fancyService.getFancy(reqParam);
        if (fancyList.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Fancy get successfully', fancyList.data);
        } else {
            return apiSuccessRes(req, res, 'Error to get Fancy.');
        }
    } catch (e) {
        console.log('there are the error ', e);
    }
}


async function getIndianFancy(req, res) {
    try {
        let { match_id } = req.query;
        if (match_id) {
            const createFancySchema = Joi.object({
                userid: Joi.number().required(),
                parent_ids: Joi.optional().required()
            });
            try {
                await createFancySchema.validate(req.body, {
                    abortEarly: true
                });
            } catch (error) {
                return apiErrorRes(req, res, error.details[0].message);
            }
            let matcketfromService = await fancyService.getmarketId({ match_id });
            let ActiveFancyListFromDB = await fancyService.getActiveFancyList(match_id);

            ActiveFancyListFromDB = JSON.parse(JSON.stringify(ActiveFancyListFromDB.data));
            if (matcketfromService.data.length > 0 && matcketfromService.statusCode === CONSTANTS.SUCCESS) {
                let market_id = matcketfromService.data[0].market_id;
                let fancyUrl = settings.fancyUrl + market_id;
                let indianFancy = await axios.get(fancyUrl);
                if (indianFancy.data) {
                    if (indianFancy.data.session) {
                        let fancyArray = indianFancy.data.session;

                        let result = fancyArray.map((item) => {

                            let findStatus = ActiveFancyListFromDB.find(o2 => item.SelectionId == o2.selection_id);
                            if (findStatus) {
                                item.is_active = '1';
                            } else {
                                item.is_active = '0';
                            }
                            return item;
                        });


                        return apiSuccessRes(req, res, 'Success', result);
                    } else {
                        return apiSuccessRes(req, res, 'Session not found for this matchID', []);
                    }
                } else {
                    return apiErrorRes(req, res, 'Error to get Fancy API.');
                }
            } else if (matcketfromService.data.length === 0 && matcketfromService.statusCode === CONSTANTS.SUCCESS) {
                return apiErrorRes(req, res, 'Market Id not enable with this market Id');
            } else {
                return apiErrorRes(req, res, 'Error to get Fancy.');
            }
        } else {
            return apiErrorRes(req, res, 'Enter valid param!');
        }
    } catch (e) {
        return apiErrorRes(req, res, 'Server Error');
    }
}



async function getOnlineFancy(req, res) {

    let market_id = req.query;

    if (market_id) {
        const createFancySchema = Joi.object({
            userid: Joi.number().required(),
            parent_ids: Joi.optional().required()
        });

        try {
            await createFancySchema.validate(req.body, {
                abortEarly: true
            });
        } catch (error) {
            return apiErrorRes(req, res, error.details[0].message);


        }

        let onlineFancyRes = await axios.get(settings.ONLINE_URL + market_id);


        let onlineFancyList = onlineFancyRes.data;
        let listOfId = [];
        let mapsdata = onlineFancyList.map((element) => {

            listOfId.push(element.competition.id);
            return {
                sport_id: sport_id,
                series_id: element.competition.id,
                name: element.competition.name
            };
        });

        let getUserDetailsFromDB = await fancyService.getFancyBySuperAdmin(market_id);
        if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
            let marketListFromDB = getUserDetailsFromDB.data;
            if (marketListFromDB.length > 0) {


                let availableIDInDB = mapsdata.length > 0 ? mapsdata.filter(o1 => seriesListFromDB.some(o2 => o1.series_id === o2.series_id)).map((element) => {
                    return {
                        ...element,
                        is_active: '1'
                    };
                }) : [];
                let notAvailableIDInDB = mapsdata.length > 0 ? mapsdata.filter(o1 => seriesListFromDB.some(o2 => o1.series_id !== o2.series_id)).map((element) => {
                    return {
                        ...element,
                        is_active: '0'
                    };
                }) : [];
                let sendId = [...availableIDInDB, ...notAvailableIDInDB];

                return apiSuccessRes(req, res, 'success11', sendId);
            } else {
                let notAvailableIDInDB = mapsdata.map((element) => {
                    return {
                        ...element,
                        is_active: '0'
                    };
                });
                return apiSuccessRes(req, res, 'success11', notAvailableIDInDB);
            }

        } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
            return apiSuccessRes(req, res, 'not found.');
        } else {
            return apiSuccessRes(req, res, 'Error to get series.');
        }

    } else {
        return apiErrorRes(req, res, 'Enter valid param!');

    }
}



async function getFancyById(req, res) {
    try {
        let {
            fancy_id
        } = req.query;
        const createFancySchema = Joi.object({
            userid: Joi.number().required(),
            parent_ids: Joi.optional().required(),
        });

        try {
            await createFancySchema.validate(req.body, {
                abortEarly: true
            });
        } catch (error) {
            return apiErrorRes(req, res, error.details[0].message);

        }
        if (fancy_id) {
            let fancyList = await fancyService.getFancyById(fancy_id);
            if (fancyList.statusCode === CONSTANTS.SUCCESS) {
                return apiSuccessRes(req, res, 'Fancy get successfully', fancyList.data);
            } else {
                return apiSuccessRes(req, res, 'Error to get Fancy.');
            }
        } else {
            return apiErrorRes(req, res, 'Enter valid param!', error);

        }
    } catch (e) {
        console.log('there are the error ', e);
    }
}

async function updateFancyById(req, res) {
    try {
        let {
            fancy_id,
            active,
            max_session_bet_liability,
            max_session_liability,
            fancy_mode,
            name
        } = req.body;

        const createFancySchema = Joi.object({
            userid: Joi.number().required(),
            parent_ids: Joi.optional().required(),
            fancy_id: Joi.string().required(),
            active: Joi.string().valid('0', '1', '2'),
            max_session_bet_liability: Joi.string(),
            max_session_liability: Joi.string(),
            fancy_mode: Joi.string(),
            name: Joi.string(),
        });
        try {
            await createFancySchema.validate(req.body, {
                abortEarly: true
            });
        } catch (error) {
            return apiErrorRes(req, res, error.details[0].message);
        }
        let inputKey = '';
        let Myobj = req.body;


        for (var prop in Myobj) {
            if (prop != 'userid' && prop != 'id' && prop != 'fancy_id' && prop != 'parent_ids') {
                inputKey = prop;
            }
        }

        let globalList = await fancyService.updatefancyData(inputKey, Myobj[inputKey], Myobj['fancy_id']);
        if (globalList.statusCode === CONSTANTS.SUCCESS) {

            return apiSuccessRes(req, res, 'fancy update successfully');
        } else {
            return apiSuccessRes(req, res, 'Error to get Fancy.');
        }
    } catch (e) {
        //console.log('there are the error ', e);
    }
}


async function updateFancyData(req, res) {
    try {
        let {
            fancy_id,
            max_stack,
            rate_diff,
            point_diff,
            session_value_yes,
            session_value_no,
            session_size_yes,
            session_size_no,
            remark
        } = req.body;

        const createFancySchema = Joi.object({
            userid: Joi.number().required(),
            parent_ids: Joi.optional().required(),
            fancy_id: Joi.string().required(),
            max_stack: Joi.string().required(),
            rate_diff: Joi.string().required(),
            point_diff: Joi.string().required(),
            session_value_yes: Joi.string().required(),
            session_value_no: Joi.string().required(),
            session_size_no: Joi.string().required(),
            session_size_yes: Joi.string().required(),
            remark: Joi.string().required()
        });
        try {
            await createFancySchema.validate(req.body, {
                abortEarly: true
            });
        } catch (error) {
            return apiErrorRes(req, res, error.details[0].message);
        }
        let reqParam = {
            fancy_id,
            max_stack,
            rate_diff,
            point_diff,
            session_value_yes,
            session_value_no,
            session_size_yes,
            session_size_no,
            remark
        };

        let globalList = await fancyService.updatefancy(reqParam);
        if (globalList.statusCode === CONSTANTS.SUCCESS) {

            return apiSuccessRes(req, res, 'fancy update successfully');
        } else {
            return apiSuccessRes(req, res, 'Error to get Fancy.');
        }
    } catch (e) {
        console.log('there are the error ', e);
    }
}





// CALL `sp_set_result_fancy`(pSportsID, pMatchID, pFancyID, pResult);
let matchResultFancy = async(req, res) => {
    let {
        sport_id,
        match_id,
        fancy_id,
        result,
        sportName,
        matchName,
    } = req.body;

    const resultSchema = Joi.object({

        userid: Joi.number().required(),
        parent_ids: Joi.optional().required(),
        sport_id: Joi.string().required(''),
        match_id: Joi.string().required(),
        fancy_id: Joi.string().required(),
        result: Joi.string().required(),
        sportName: Joi.string().required(),
        matchName: Joi.string().required()
    });
    try {
        await resultSchema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }


    let getUserByUserId = await userService.getUserByUserId(req.body.userid);

    if (getUserByUserId.statusCode === CONSTANTS.SUCCESS) {
        if (getUserByUserId.data.user_type_id === CONSTANTS.USER_TYPE_ADMIN) {

            let FancyResultData = await fancyService.matchResultFancy(sport_id, match_id, fancy_id, result, sportName, matchName);

            if (FancyResultData.statusCode === CONSTANTS.SUCCESS) {

                return apiSuccessRes(req, res, FancyResultData.data[0].sMsg, FancyResultData.data[0].iReturn);
            } else {
                return apiSuccessRes(req, res, 'Error to get fancy result');
            }

        } else {
            return apiErrorRes(req, res, 'user unauthorized');

        }
    } else {
        return apiSuccessRes(req, res, 'Error to get fancy result');
    }



};

async function abandonedFancy(req, res) {
    try {

        let {
            fancyID
        } = req.body;
        const createFancySchema = Joi.object({
            userid: Joi.number().required(),
            parent_ids: Joi.optional().required(),
            fancyID: Joi.string().required()
        });
        try {
            await createFancySchema.validate(req.body, {
                abortEarly: true
            });
        } catch (error) {
            return apiErrorRes(req, res, error.details[0].message);
        }
        let Fancy = await fancyService.abandonedFancy(fancyID);
        if (Fancy.statusCode === CONSTANTS.SUCCESS && Fancy.data.resultV === 1) {

            return apiSuccessRes(req, res, Fancy.data.retMess);
        } else {
            return apiSuccessRes(req, res, Fancy.data.retMess);
        }
    } catch (e) {
        return apiSuccessRes(req, res, 'Error to abandoned Fancy.');
    }
}

let fancyRollback = async(req, res) => {
    let {
        bet_result_id,
        match_id,
        fancy_id
    } = req.body;

    const resultSchema = Joi.object({

        userid: Joi.number().required(),
        parent_ids: Joi.optional().required(),
        bet_result_id: Joi.string().required(''),
        match_id: Joi.string().required(),
        fancy_id: Joi.string().required(),

    });
    try {
        await resultSchema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }


    /*	let getUserByUserId = await userService.getUserByUserId(req.body.userid);

    	if (getUserByUserId.statusCode === CONSTANTS.SUCCESS) {
    		if (getUserByUserId.data.user_type_id === CONSTANTS.USER_TYPE_ADMIN) {*/

    let oddsRollbackData = await fancyService.getRollbackFancy(bet_result_id, match_id, fancy_id);

    if (oddsRollbackData.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, oddsRollbackData.data[0].retMess, oddsRollbackData.data[0].resultV);
    } else {
        return apiSuccessRes(req, res, 'Error to do rollback');
    }

    /*} else {
			return apiErrorRes(req, res, 'user unauthorized');

		}
	} else {
		return apiSuccessRes(req, res, 'Error to do rollback');
	}*/



};

async function getFancyPosition(req, res) {
    try {
        let {
            fancy_id,
            user_id
        } = req.body;
        const createFancySchema = Joi.object({
            userid: Joi.number().required(),
            user_id: Joi.number().required(),
            fancy_id: Joi.string().required(),
            parent_ids: Joi.optional().required(),
        });
        try {
            await createFancySchema.validate(req.body, {
                abortEarly: true
            });
        } catch (error) {
            return apiErrorRes(req, res, error.details[0].message);
        }
        let fancyList = await fancyService.getFancyPosition(userid, fancy_id);

        if (fancyList.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'post ', fancyList);
        } else {
            return apiErrorRes(req, res, 'Error to get Fancy.');
        }

    } catch (e) {
        return apiErrorRes(req, res, 'Server error!');
    }
}

async function getRunTimeFancyPosition(req, res) {
    try {
        let {
            fancy_id,
            user_id,
            user_type_id
        } = req.body;
        const createFancySchema = Joi.object({
            userid: Joi.number().required(),
            user_id: Joi.number().required(),
            user_type_id: Joi.number().required(),
            fancy_id: Joi.string().required(),
            parent_ids: Joi.optional().required(),
        });
        try {
            await createFancySchema.validate(req.body, {
                abortEarly: true
            });
        } catch (error) {
            return apiErrorRes(req, res, error.details[0].message);
        }
        let fancyList = await fancyService.getRunTimeFancyPosition(user_id, fancy_id, user_type_id);

        if (fancyList.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'post ', fancyList.data);
        } else {
            return apiErrorRes(req, res, 'Error to get Fancy.');
        }

    } catch (e) {
        return apiErrorRes(req, res, 'Server error!');
    }
}



let getFancyUser = async function(req, res) {

    let { match_id, parent_id, parent_type } = req.body;
    const matchschema = Joi.object({
        userid: Joi.number().required(),
        fancy_id: Joi.optional(),
        parent_ids: Joi.optional().required(),
        parent_id: Joi.required(),
        parent_type: Joi.required(),
    });
    try {
        await matchschema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let getMatchUserData = await fancyService.getFancyUser(match_id, parent_id, parent_type);
    if (getMatchUserData.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success', getMatchUserData.data);

    } else {
        return apiSuccessRes(req, res, 'not found.');
    }
};


router.post('/session-position', getFancyPosition);
router.post('/current-session-position', getRunTimeFancyPosition);
router.post('/create-session', createFancy);
router.post('/session-list', getFancy);
router.post('/session-user', getFancyUser);
router.get('/session-fancy', getIndianFancy);
router.get('/session-online', getOnlineFancy);
router.get('/session-byid', getFancyById);
router.post('/update-session-byid', updateFancyById);
router.post('/update-session', updateFancyData);
router.post('/match-session-res', matchResultFancy);
router.post('/session-abandoned', abandonedFancy);
router.post('/session-rollback', fancyRollback);

module.exports = router;