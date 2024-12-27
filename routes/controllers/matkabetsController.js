const express = require('express');
const router = express.Router();
const Joi = require('joi');
const axios = require('axios');
const settings = require('../../config/settings');
const betService = require('../services/betsService');
const matkabetService = require('../services/matkabetService');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');
const partnershipsService = require('../services/partnershipsService');
const userService = require('../services/userService');
const selectionService = require('../services/selectionService');
const userSettingSportWiseService = require('../services/userSettingSportWiseService');
const exchangeService = require('../services/exchangeService');
const fancyService = require('../services/fancyService');
const delay = require('delay');
let apiSuccessRes = globalFunction.apiSuccessRes;
let apiErrorRes = globalFunction.apiErrorRes;
const browser = require('browser-detect');
const { compareSync } = require('bcrypt');
const sportsService = require('../services/sportsService');

async function deleteMatkaTempBetData(req, res) {

	const result = browser(req.headers['user-agent']);
	let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

	let device_info = Object.keys(result)[0];

	let { id } = req.headers;
	let { match_id, bet_id} = req.body;
	const profilechema = Joi.object().keys({
		match_id: Joi.number().required(),		 
		bet_id: Joi.number().required(),
	}).unknown(true);
	try {
		await profilechema.validate(req.body, {
			abortEarly: true
		});
	} catch (error) {
		return apiErrorRes(req, res, error.details[0].message);
	}
	

	let getDeleteBetData = { bet_id, match_id, id };
	let matkaDeleteBetResponse = await matkabetService.deleteMatkaTempBetData(getDeleteBetData); 

	 
	if (matkaDeleteBetResponse.statusCode === CONSTANTS.SUCCESS) {
		return apiSuccessRes(req, res, 'Bet delete successfully');
	} else {
		return apiErrorRes(req, res, 'Bet not deleted successfully');
	}

}

async function getThimbleDetail(req, res) {

	const result = browser(req.headers['user-agent']);
	let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

	let device_info = Object.keys(result)[0];

	let { id } = req.headers;
	let { sport_id} = req.body;
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
	
	let matkaDeleteBetResponse = await matkabetService.getThimbleMatchDetail(sport_id, id); 
	 
	if (matkaDeleteBetResponse.statusCode === CONSTANTS.SUCCESS) {
		return apiSuccessRes(req, res, 'success', matkaDeleteBetResponse.data);
	} else if (matkaDeleteBetResponse.statusCode == 201) {
		return apiErrorRes(req, res, matkaDeleteBetResponse.data);
	} else {
		return apiErrorRes(req, res, 'Not found.');
	}

}

router.post('/deleteMatkaTempBetData', deleteMatkaTempBetData);
router.post('/getThimbleDetail', getThimbleDetail);
module.exports = router;