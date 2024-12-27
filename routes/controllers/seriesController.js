const express = require('express');
const router = express.Router();
const Joi = require('joi');
const axios = require('axios');
const settings = require('../../config/settings');
const seriesService = require('../services/seriesService');
const matchesService = require('../services/matchesService');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS_MESSAGE = require('../../utils/constantsMessage.js');
const CONSTANTS = require('../../utils/constants');
let apiSuccessRes = globalFunction.apiSuccessRes;
let apiErrorRes = globalFunction.apiErrorRes;


async function getAllSeries(req, res) {
	//console.log('req.body  ',req.body);

	let {
		limit,pageno,sport_id,series_name,status
	} = req.body;
	const profilechema = Joi.object({
		userid: Joi.number().required(),
		limit: Joi.optional().required(),
		pageno: Joi.optional().required(),
		parent_ids: Joi.optional().required(),
		sport_id: Joi.optional().required(),
		status: Joi.optional().required(),
		series_name: Joi.optional().required(),
	});
	try {
		await profilechema.validate(req.body, {
			abortEarly: true
		});
	} catch (error) {
		return apiErrorRes(req, res, error.details[0].message);
	}
	let data={
		limit,pageno,sport_id,series_name,status
	};
	let getUserDetailsFromDB = await seriesService.getAllSeries(data);
	if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
		return apiSuccessRes(req, res, 'success', getUserDetailsFromDB.data);

	} else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
		return apiSuccessRes(req, res, 'not found.');
	} else {
		return apiSuccessRes(req, res, 'Error to profile.');
	}
}
router.post('/getAllSeries', getAllSeries);
module.exports = router;
// async function createSeries(req, res) {
// 	let {
// 		sport_id,
// 		series_id,
// 		name,
// 		is_manual
// 	} = req.body;

// 	const createSeriesSchema = Joi.object({
// 		sport_id: Joi.string().required(),
// 		userid: Joi.number().required(),
// 		parent_ids: Joi.optional().required(),
// 		series_id: Joi.string().required(),
// 		name: Joi.string().required(),
// 		is_manual: Joi.string().valid('0', '1').required(),
// 	});
// 	try {
// 		await createSeriesSchema.validate(req.body, {
// 			abortEarly: true
// 		});
// 	} catch (error) {
// 		return apiErrorRes(req, res, error.details[0].message);
// 	}

// 	if(is_manual==1){
// 		let randomNumber = globalFunction.randomIntFromInterval(CONSTANTS.MANUAL_SPORTS_MIN_RANGE, CONSTANTS.MANUAL_SPORTS_MAX_RANGE);
// 		series_id = CONSTANTS.MANUAL_SERIES + randomNumber;
// 	}

// 	let reqdaa = {
// 		sport_id,
// 		series_id,
// 		name,
// 		is_manual,
// 		is_active: '1',
// 		create_at: globalFunction.currentDate(),
// 		update_at: globalFunction.currentDate()
// 	};
// 	let datafromService;
// 	let message='Series Added Successfully';
// 	if(is_manual==0){
// 		let checkSeriedIsAdded = await seriesService.getSeriesByListOfID(series_id);
// 		//console.log(checkSeriedIsAdded.data);
// 		if(checkSeriedIsAdded.data.length > 0  ){
// 			datafromService = await seriesService.updateSeriesStatus(series_id);
// 			message='Series Updated Successfully';
// 		}else {
// 			datafromService = await seriesService.createSeries(reqdaa);
// 		}

// 	}else {
// 		datafromService = await seriesService.createSeries(reqdaa);
// 	}
// 	if (datafromService.statusCode === CONSTANTS.SUCCESS) {
// 		return apiSuccessRes(req, res, message);
// 	} else {
// 		return apiSuccessRes(req, res, 'Error to create Series.');
// 	}
// }
// async function updateSeriesStatus(req, res) {
// 	//console.log('req.body  ',req.body);

// 	let {
// 		id
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
// 	let getUserDetailsFromDB = await seriesService.updateSeriesStatus(id);
// 	if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
// 		return apiSuccessRes(req, res, CONSTANTS_MESSAGE.UPDATED_SUCCESS_MESSAGE);

// 	} else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
// 		return apiSuccessRes(req, res, 'not found.');
// 	} else {
// 		return apiSuccessRes(req, res, 'Error to updateSeriesStatus.');
// 	}
// }
// async function getOnlineSeries(req, res) {

// 	let {
// 		sport_id
// 	} = req.body;
// 	const profilechema = Joi.object({
// 		userid: Joi.number().required(),
// 		parent_ids: Joi.optional().required(),
// 		sport_id: Joi.string().required()
// 	});
// 	try {
// 		await profilechema.validate(req.body, {
// 			abortEarly: true
// 		});
// 	} catch (error) {
// 		return apiErrorRes(req, res, error.details[0].message);
// 	}

// 	let onlineSeriesRes = await axios.get(settings.ONLINE_URL + sport_id);


// 	let onlineSeriesList = onlineSeriesRes.data;
// 	let listOfId = [];
// 	let mapsdata = onlineSeriesList.map((element) => {
// 		listOfId.push(element.competition.id);
// 		return {
// 			sport_id: sport_id,
// 			series_id: element.competition.id,
// 			name: element.competition.name
// 		};
// 	});

// 	let getUserDetailsFromDB = await seriesService.getActiveSeriesByListOfID(listOfId);

// 	if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
// 		let seriesListFromDB = getUserDetailsFromDB.data;
// 		seriesListFromDB = JSON.parse(JSON.stringify(seriesListFromDB));
// 		if (seriesListFromDB.length > 0) {

// 			let sendId =mapsdata.map((item) => {
// 				let findStatus=seriesListFromDB.find(o2 => item.series_id === o2.series_id);
// 				if (findStatus && findStatus.is_active) {
// 					item.is_active= '1';
// 				}else{
// 					item.is_active= '0';
// 				}
// 				return item;
// 			});
// 			return apiSuccessRes(req, res, 'Success',sendId);

// 		} else {
// 			let notAvailableIDInDB = mapsdata.map((element) => {
// 				return {
// 					...element,
// 					is_active: '0'
// 				};
// 			});
// 			return apiSuccessRes(req, res, 'Success', notAvailableIDInDB);
// 		}

// 	} else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
// 		return apiSuccessRes(req, res, 'not found.');
// 	} else {
// 		return apiSuccessRes(req, res, 'Error to get series.');
// 	}

// }
// async function getInPlayMatchBySportId(req, res) {
// 	let {
// 		sport_id,series_id,parent_ids
// 	} = req.body;

// 	const profilechema = Joi.object({
// 		userid: Joi.number().required(),
// 		parent_ids: Joi.optional(),
// 		sport_id: Joi.optional(),
// 		series_id: Joi.optional(),
// 	});
// 	try {
// 		await profilechema.validate(req.body, {
// 			abortEarly: true
// 		});
// 	} catch (error) {
// 		return apiErrorRes(req, res, error.details[0].message);
// 	}
// 	try {
// 		let getActiveSeriesList = await seriesService.getActiveSeriesBySportID();

// 		if (getActiveSeriesList.statusCode === CONSTANTS.SUCCESS) {
// 			let getUserDetailsFromDB = await matchesService.getMatchForUserPanelBySportId(parent_ids,sport_id,series_id);
// 			let resData={
// 				onlineMatch:getUserDetailsFromDB.data?getUserDetailsFromDB.data:[],
// 				seriesList:getActiveSeriesList.data?getActiveSeriesList.data:[],

// 			}
// 			return apiSuccessRes(req, res, 'Success.',resData);
// 		} else if (getActiveSeriesList.statusCode === CONSTANTS.NOT_FOUND) {
// 			return apiSuccessRes(req, res, 'not found.');
// 		} else {
// 			return apiSuccessRes(req, res, 'Error to get series.');
// 		}
// 	}catch (e) {
// 		console.log(e)
// 	}


// }
// router.post('/updateSeriesStatus', updateSeriesStatus);
// router.post('/createSeries', createSeries);

// router.post('/getOnlineSeries', getOnlineSeries);
// router.post('/series/getInPlayMatchBySportId', getInPlayMatchBySportId);
