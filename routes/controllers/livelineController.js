const express = require('express');
const router = express.Router();
const Joi = require('joi');
const livelineService = require('../services/livelineService');
const globalFunction = require('../../utils/globalFunction');
const settings = require('../../config/settings');
const CONSTANTS = require('../../utils/constants');
const CONSTANTS_MESSAGE = require('../../utils/constantsMessage');
let apiSuccessRes = globalFunction.apiSuccessRes;
let apiErrorRes = globalFunction.apiErrorRes;

async function getLivLineMatchsBySportAndSeriesId(req, res) {

	let {
		limit,
		sport_id,
		series_id,
		pageno
	} = req.body;
	const profilechema = Joi.object().keys({
		limit: Joi.number().required(),
		sport_id: Joi.number().required(),
		series_id: Joi.number(),
		pageno: Joi.optional().required(),
	}).unknown(true);
	try {
		await profilechema.validate(req.body, {
			abortEarly: true
		});
	} catch (error) {
		return apiErrorRes(req, res, error.details[0].message);
	}

	let data={
		limit,
		sport_id,
		series_id,
		pageno
	};
	let SportSeriesInpalyMatch = await livelineService.getMatchListBySportSeriesIdInPlay(data);
	let SportSeriesUpcommingMatch = await livelineService.getMatchListBySportSeriesIdUpcomming(data);
	if (SportSeriesInpalyMatch.statusCode === CONSTANTS.SUCCESS || SportSeriesUpcommingMatch.statusCode === CONSTANTS.SUCCESS) {
		let tempdata1=[]
		let tempdata2=[]
		 
		if(SportSeriesInpalyMatch.data !== null && SportSeriesInpalyMatch.data !== ''){
			for (let index = 0; index < SportSeriesInpalyMatch.data.length; index++) {
				const element = SportSeriesInpalyMatch.data[index];
				let teamOneImage1 = element.team_one_image===null?'liveline.png':element.team_one_image;
				let teamTwoImage2 = element.team_one_image===null?'liveline.png':element.team_one_image;
				tempdata1.push({...element,team_one_image:settings.imageURL+'/'+teamOneImage1,team_two_image:settings.imageURL+'/'+teamTwoImage2});			
			}
		}
		if(SportSeriesUpcommingMatch.data !== null && SportSeriesUpcommingMatch.data !== ''){	
			for (let index1 = 0; index1 < SportSeriesUpcommingMatch.data.length; index1++) {
				const element1 = SportSeriesUpcommingMatch.data[index1];
				let teamOneImage = element1.team_one_image===null?'liveline.png':element1.team_one_image;
				let teamTwoImage = element1.team_one_image===null?'liveline.png':element1.team_one_image;
				tempdata2.push({...element1,team_one_image:settings.imageURL+'/'+teamOneImage,team_two_image:settings.imageURL+'/'+teamTwoImage});
			}	
		}
		let responseData={'inplayMatches':tempdata1,'upCommingMatches':tempdata2};
		return apiSuccessRes(req, res, 'Success', responseData);
	} else if (SportSeriesInpalyMatch.statusCode === CONSTANTS.NOT_FOUND || SportSeriesUpcommingMatch.statusCode === CONSTANTS.NOT_FOUND) {
		return apiSuccessRes(req, res, 'not found.');
	} else {
		return apiSuccessRes(req, res, 'Error to Sports.');
	}
}


async function getLivLineFavouriteTeamOdds(req, res) {

	let {	
		match_id,
		sport_id,
		market_id
	} = req.body;
	
	const profilechema = Joi.object().keys({
		match_id: Joi.number().required(),
		sport_id: Joi.number().required(),
		market_id: Joi.string().required(),		
	}).unknown(true);
	try {
		await profilechema.validate(req.body, {
			abortEarly: true
		});
	} catch (error) {
		return apiErrorRes(req, res, error.details[0].message);
	}

	let data={
		match_id,
		sport_id,
		market_id
	};
	
	let getMatchMarketList = await livelineService.getLiveLineMatchDetailMarketList(data);
	if (getMatchMarketList.statusCode === CONSTANTS.SUCCESS ) {		
		return apiSuccessRes(req, res, 'Success', getMatchMarketList.data);
	} else if (getMatchMarketList.statusCode === CONSTANTS.NOT_FOUND ) {
		return apiSuccessRes(req, res, 'not found.');
	} else {
		return apiErrorRes(req, res, 'Error Match Market List.');
	}
}

router.post('/getLivLineMatchsBySportAndSeriesId', getLivLineMatchsBySportAndSeriesId);
router.post('/getLivLineFavouriteTeamOdds', getLivLineFavouriteTeamOdds);

module.exports = router;