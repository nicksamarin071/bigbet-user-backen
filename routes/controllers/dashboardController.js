const express = require('express');
const router = express.Router();
const Joi = require('joi');
const dashboardService = require('../services/dashboardService');
const globalFunction = require('../../utils/globalFunction');
const settings = require('../../config/settings');
const CONSTANTS = require('../../utils/constants');
const CONSTANTS_MESSAGE = require('../../utils/constantsMessage');
let apiSuccessRes = globalFunction.apiSuccessRes;
let apiSuccessResDash = globalFunction.apiSuccessResDash;
let apiSuccessResSport = globalFunction.apiSuccessResSport;
let apiErrorRes = globalFunction.apiErrorRes;



async function dashboardOuterSlider(req, res) {
    try {
        let dashboarSports = await dashboardService.dashboardOuterSlider();
        if (dashboarSports.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Success', dashboarSports.data);
        } else if (dashboarSports.statusCode === CONSTANTS.NOT_FOUND) {
            return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
        } else {
            return apiErrorRes(req, res, 'Error to Sports.');
        }
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
}
async function dashboardOuterSports(req, res) {
    try {
        let dashboarSports = await dashboardService.dashboardOuterSports();
        if (dashboarSports.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Success', dashboarSports.data);
        } else if (dashboarSports.statusCode === CONSTANTS.NOT_FOUND) {
            return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
        } else {
            return apiErrorRes(req, res, 'Error to Sports.');
        }
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
}
async function dashboardOuterNews(req, res) {
    try {
        let dashboarSports = await dashboardService.dashboardOuterNews();

        let siteMessge = await dashboardService.getSiteMessage();

        if (dashboarSports.statusCode === CONSTANTS.SUCCESS) {
            let RecordSend = { 'SiteMessage': siteMessge.data.value, 'News': dashboarSports.data };
            return apiSuccessRes(req, res, 'Success', RecordSend);
        } else if (dashboarSports.statusCode === CONSTANTS.NOT_FOUND) {
            return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
        } else {
            return apiErrorRes(req, res, 'Error In News List.');
        }
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
}
async function outerDashboard(req, res) {
    try {
        let dashboarSportsMatch = await dashboardService.outerDashboard();
        if (dashboarSportsMatch.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Success', dashboarSportsMatch.data);
        } else if (dashboarSportsMatch.statusCode === CONSTANTS.NOT_FOUND) {
            return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
        } else {
            return apiErrorRes(req, res, 'Error In Sports Match List.');
        }
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
}
async function outerCategoryAndPost(req, res) {
    try {
        let dashboarSportsMatch = await dashboardService.outerCategoryAndPost();
        if (dashboarSportsMatch.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Success', dashboarSportsMatch.data);
        } else if (dashboarSportsMatch.statusCode === CONSTANTS.NOT_FOUND) {
            return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
        } else {
            return apiErrorRes(req, res, 'Error In Category and posts.');
        }
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
}
async function outerdashboardMatchBySports(req, res) {
    try {
        let {
            sport_id,
            datatype,
        } = req.body;
        let { id } = req.headers;
        const profilechema = Joi.object().keys({
            sport_id: Joi.number().required(),
            datatype: Joi.string().valid("A", "P", "U").required(),
        }).unknown(true);
        try {
            await profilechema.validate(req.body, {
                abortEarly: true
            });
        } catch (error) {
            return apiErrorRes(req, res, error.details[0].message);
        }
        let data = { sport_id, datatype };
        let dashboarSportsMatch = await dashboardService.outerdashboardMatchBySports(data);
        if (dashboarSportsMatch.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Success', dashboarSportsMatch.data);
        } else if (dashboarSportsMatch.statusCode === CONSTANTS.NOT_FOUND) {
            return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
        } else {
            return apiErrorRes(req, res, 'Error In Sports Match List.');
        }
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
}

async function outerPagesDetails(req, res) {
    try {
        let {
            id,
        } = req.body;

        const profilechema = Joi.object().keys({
            id: Joi.string().required(),
        }).unknown(true);
        try {
            await profilechema.validate(req.body, {
                abortEarly: true
            });
        } catch (error) {
            return apiErrorRes(req, res, error.details[0].message);
        }
        let data = { id };

        let dashboarSportsMatch = await dashboardService.outerPagesDetails(data);
        if (dashboarSportsMatch.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Success', dashboarSportsMatch.data);
        } else if (dashboarSportsMatch.statusCode === CONSTANTS.NOT_FOUND) {
            return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
        } else {
            return apiErrorRes(req, res, 'Error In Sports Match List.');
        }
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
}


router.post('/our-sport', dashboardOuterSports);
router.post('/our-news', dashboardOuterNews);
router.post('/our-slide', dashboardOuterSlider);
router.post('/our-home', outerDashboard);
router.post('/our-home-sport', outerdashboardMatchBySports);
router.post('/our-page', outerCategoryAndPost);
router.post('/our-page-show', outerPagesDetails);
module.exports = router;