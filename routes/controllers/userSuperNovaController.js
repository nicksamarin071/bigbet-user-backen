const express = require('express');
const router = express.Router();
const Joi = require('joi');
const axios = require('axios');
const userService = require('../services/userService');
const settings = require('../../config/settings');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');
const delay = require('delay');
const FormData = require('form-data');
let apiSuccessRes = globalFunction.apiSuccessRes;
let apiUnauthorizedRes = globalFunction.apiUnauthorizedRes;
const fs = require('fs');
///Comment
const jwt = require("jsonwebtoken");

let apiErrorRes = globalFunction.apiErrorRes;

const multer = require('multer');
const path = require('path');
const xmlParser = require('xml2json-light');
const browser = require('browser-detect');
const qs = require('querystring');


async function superNovaBalance(req, res) {
	console.log('hellod ');
	fs.appendFile('exposure.json', JSON.stringify(req.body), function (err) {
		if (err) {
			return console.log('debit--------------------- ', err);
		}
	});
	return res.status(200).json();
}

async function superNovaDebit(req, res) {

	fs.appendFile('debit.json', JSON.stringify(req.body), function (err) {
		if (err) {
			return console.log('debit--------------------- ', err);
		}
	});
	return res.status(200).json();
}

async function superNovaCredit(req, res) {

	fs.appendFile('credit.json', JSON.stringify(req.body), function (err) {
		if (err) {
			return console.log('debit--------------------- ', err);
		}
	});
	return res.status(200).json();
}
 

router.post('/Balance', superNovaBalance);
router.post('/Debit', superNovaDebit);
router.post('/Credit', superNovaCredit);
module.exports = router;