const express = require('express');
const router = express.Router();
const Joi = require('joi');
const globalSettingService = require('../services/globalSettingService');
const settings = require('../../config/settings');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');
let apiSuccessRes = globalFunction.apiSuccessRes;
let apiErrorRes = globalFunction.apiErrorRes;

async function getGlobalSetting(req, res) {
	try {
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

		let globalList = await globalSettingService.getGlobalSetting();
		if (globalList.statusCode === CONSTANTS.SUCCESS) {
			return apiSuccessRes(req, res, 'globalsetting get successfully', globalList.data);
		} else {
			return apiSuccessRes(req, res, 'Error to get Fancy.');
		}
	} catch (e) {
 	}
}
async function updateGlobalSetting(req, res) {
	try {
		let {
			site_title,
			site_message,
			one_click_stack,
			match_stack,
			session_stack,
			bet_allow_time_before
		} = req.body;
		const createFancySchema = Joi.object({
			userid: Joi.number().required(), 		
			parent_ids: Joi.optional().required(),
			site_title: Joi.string().required(),
			site_message: Joi.string().required(),
			one_click_stack: Joi.string().required(),
			match_stack: Joi.string().required(),
			session_stack: Joi.string().required(),
			bet_allow_time_before: Joi.number().required()
		});
		try {
			await createFancySchema.validate(req.body, {
				abortEarly: true
			});
		} catch (error) {
			return apiErrorRes(req, res, error.details[0].message);
		}
		let reqParam = {
			site_title,
			site_message,
			one_click_stack,
			match_stack,
			session_stack,
			bet_allow_time_before

		};
		let globalList = await globalSettingService.updateGlobalSetting(reqParam);
		if (globalList.statusCode === CONSTANTS.SUCCESS) {

			return apiSuccessRes(req, res, 'globalsetting update successfully');
		} else {
			return apiSuccessRes(req, res, 'Error to get Fancy.');
		}
	} catch (e) {
 	}
}
async function uploadlogo(req, res) {
	try {
		if (!req.files) {
			return apiErrorRes(req, res, 'enter valid params!');
		} else {
			let fileImage = req.files.fileImage;
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
			if (fileImage.mimetype == 'image/png') {
				let globalList = await globalSettingService.uploadImage('logo.png');
				if (globalList.statusCode === CONSTANTS.SUCCESS) {
					await fileImage.mv(settings.filePath + '/logo.png');
					return apiSuccessRes(req, res, 'file upload successfully');
				} else {
					return apiSuccessRes(req, res, 'Error to upload logo');
				}
			} else {
				return apiSuccessRes(req, res, 'image need  in png format');
			}
		}
	} catch (e) {
 		return apiSuccessRes(req, res, 'Error to file upload.');
	}
}
async function uploadfavicon(req, res) {
	try {
		if (!req.files) {
			return apiErrorRes(req, res, 'enter valid params!');
		} else {

			let faviconIcon = req.files.faviconIcon;
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
			if (faviconIcon.mimetype == 'image/x-icon') {

				let globalList = await globalSettingService.uploadfavicon('favicon.ico');

				if (globalList.statusCode === CONSTANTS.SUCCESS) {

					await faviconIcon.mv(settings.filePath + '/favicon.ico');

					return apiSuccessRes(req, res, 'file upload successfully');

				} else {
					return apiSuccessRes(req, res, 'Error to get Fancy.');
				}

			} else {
				return apiSuccessRes(req, res, 'image need  in ico format');

			}
		}
	} catch (e) {
		//console.log('there are the error ', e);
	}
}
async function getGlobalMatchStack(req, res) {
	try {
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
		let globalList = await globalSettingService.getGlobalSetting();
		if (globalList.statusCode === CONSTANTS.SUCCESS) {
			return apiSuccessRes(req, res, 'match_stack get successfully', globalList.data[0].match_stack);
		} else {
			return apiSuccessRes(req, res, 'Error to get Fancy.');
		}
	} catch (e) {
		return apiErrorRes(req, res, 'There are the error to get GlobalMatchStack');
	}
}
router.get('/getGlobalSetting', getGlobalSetting);
router.post('/updateGlobalSetting', updateGlobalSetting);
router.post('/uploadlogo', uploadlogo);
router.post('/uploadfavicon', uploadfavicon);
router.post('/getGlobalMatchStack', getGlobalMatchStack);

module.exports = router;