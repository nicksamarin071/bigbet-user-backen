const express = require('express');
const router = express.Router();
const Joi = require('joi');
const globalFunction = require('../../utils/globalFunction');
const reportService = require('../../routes/services/reportService');
const CONSTANTS = require('../../utils/constants');

let apiSuccessRes = globalFunction.apiSuccessRes;
let apiErrorRes = globalFunction.apiErrorRes;

async function profitLossMatchWise(req, res) {

	try {
		let {
			user_id,
            user_type_id,
            sport_id,
            to_date,
            from_date,
            match_id,market_id
		} = req.body;

		const createSeriesSchema = Joi.object({
			userid: Joi.number().required(),
			parent_ids: Joi.optional().required(),
            user_type_id: Joi.number().required(),
            user_id: Joi.number().required(),
            sport_id: Joi.string().required(),
            match_id: Joi.string().required(),
            market_id: Joi.string().required(),
            to_date: Joi.string().required(),
            from_date: Joi.string().required()

		});

		await createSeriesSchema.validate(req.body, {
			abortEarly: true
		});



		let profitLossData = await reportService.profitLossMatchWise(user_id,user_type_id,sport_id,match_id,market_id,to_date,from_date);
		//console.log("datafromService", profitLossData);

		if (profitLossData.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'success', profitLossData.data);
		} else {
			return apiSuccessRes(req, res, 'not found data');
		}
	} catch (e) {
		//console.log(e);
		return apiErrorRes(req, res, 'Enter valid param!', e);
	}
}

async function profitLossUpline(req, res) {

    try {
        let {
            user_id,
            user_type_id,
            to_date,
            from_date
        } = req.body;

        const createSeriesSchema = Joi.object({
            userid: Joi.number().required(),
            parent_ids: Joi.optional().required(),
            user_type_id: Joi.number().required(),
            user_id: Joi.number().required(),
            to_date: Joi.string().required(),
            from_date: Joi.string().required()

        });

        await createSeriesSchema.validate(req.body, {
            abortEarly: true
        });



        let profitLossData = await reportService.profitLossUpline(user_id,user_type_id,to_date,from_date);
        //console.log("datafromService", profitLossData);

        if (profitLossData.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'success', profitLossData.data);
        } else {
            return apiSuccessRes(req, res, 'not found data');
        }
    } catch (e) {
        //console.log(e);
        return apiErrorRes(req, res, 'Enter valid param!', e);
    }
}

async function profitLossUplineBySport(req, res) {

    try {
        let {
            user_id,
            user_type_id,
            to_date,
            from_date
        } = req.body;

        const createSeriesSchema = Joi.object({
            userid: Joi.number().required(),
            parent_ids: Joi.optional().required(),
            user_type_id: Joi.number().required(),
            user_id: Joi.number().required(),
            to_date: Joi.string().required(),
            from_date: Joi.string().required()

        });

        await createSeriesSchema.validate(req.body, {
            abortEarly: true
        });



        let profitLossData = await reportService.profitLossUplineBySport(user_id,user_type_id,to_date,from_date);
        //console.log("datafromService", profitLossData);

        if (profitLossData.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'success', profitLossData.data);
        } else {
            return apiSuccessRes(req, res, 'not found data');
        }
    } catch (e) {
        //console.log(e);
        return apiErrorRes(req, res, 'Enter valid param!', e);
    }
}



router.post('/report/profitLossMatchWise', profitLossMatchWise);
router.post('/report/profitLossUpline', profitLossUpline);
router.post('/report/profitLossUplineBySport', profitLossUplineBySport);

module.exports = router;