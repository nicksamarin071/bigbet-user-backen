const express = require('express');
const router = express.Router();
const Joi = require('joi');
const axios = require('axios');
const crypto = require("crypto");
const FormData = require('form-data');
const userService = require('../services/userService');
const settings = require('../../config/settings');
const globalFunction = require('../../utils/globalFunction');
//const timezoneList = require('../../utils/timezoneList');
const CONSTANTS = require('../../utils/constants');
let apiSuccessRes = globalFunction.apiSuccessRes;
let apiSuccessResHtml = globalFunction.apiSuccessResHtml;
let apiUnauthorizedRes = globalFunction.apiUnauthorizedRes;
///Comment
let apiErrorRes = globalFunction.apiErrorRes;
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const xmlParser = require('xml2json-light');
const browser = require('browser-detect');
const qs = require('querystring');
const telegramBotService = require("../../Telegram/telegramBotService")


let storage = multer.diskStorage({
    destination: (req, file, cb) => {
        //console.log("destination  ",destination);
        cb(null, settings.filePath)
        cb(null, settings.filePath2)
    },
    filename: (req, file, cb) => {
        console.log("file.fieldname  ", file.fieldname);
        console.log("final file name :::   ", Date.now() + path.extname(file.originalname));
        req.body.attachment = (settings.uploadimagePath + "/" + file.fieldname + '-' + Date.now() + path.extname(file.originalname));
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
});
let upload = multer({ storage: storage, limits: { fileSize: 1000000 } });



const generateLoginCode = () => {
  const min = 100000;
  const max = 999999;
  return crypto.randomInt(min, max).toString();
};


async function userLogin(req, res) {
  let { user_name, password } = req.body;

  const loginchema = Joi.object({
    user_name: Joi.string().required(),
    password: Joi.string().required(),
  });
  try {
    await loginchema.validate(req.body, {
      abortEarly: true,
    });
  } catch (error) {
    return apiErrorRes(req, res, error.details[0].message);
  }
  let reqdaa = {
    user_name: user_name,
    password: password,
  };

console.log("req data", reqdaa)

  let getUserDetailsFromDB = await userService.userLogin(reqdaa);
  const userDetails = getUserDetailsFromDB.data;
  console.log(userDetails)

  if (userDetails && userDetails.telegramConnected === '1' && userDetails.chatId !== null) {
    const login_code = generateLoginCode();
    const telegram_verefied = false;

    const loginCode_Expiration = new Date(Date.now() + 60 * 1000);
    const saveResponse = await userService.saveTelegramLoginCode(
      login_code,
      telegram_verefied,
      loginCode_Expiration,
      user_name
    );

    try {
      await telegramBotService.sendMessage(
        userDetails.chatId,
        `Login Code: ${login_code}. Do not give this code to anyone, even if they say they are from Telegram! It's valid for 60 seconds.`
      );
      let resData = { ...getUserDetailsFromDB.data };
      return apiSuccessRes(req, res, "Login code sent successfully .", resData);
    } catch (err) {
      console.error("Error sending message to Telegram:", err);
    }
    // console.log("User is connected to Telegram and chatId is set.");
  } else if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
    let resData = { ...getUserDetailsFromDB.data };
    return apiSuccessRes(req, res, "Logged in successfully .", resData);
  }

  // if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
  //   let resData = { ...getUserDetailsFromDB.data };
  //   return apiSuccessRes(req, res, "Logged in successfully .", resData);
  // }
  else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
    return apiErrorRes(req, res, "User does Not Exist.");
  } else if (getUserDetailsFromDB.statusCode === CONSTANTS.ACCESS_DENIED) {
    return apiErrorRes(req, res, "Please Enter Valid Username And Password");
  } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_VERIFIED) {
    return apiErrorRes(req, res, "User Name Is not Activated ");
  } else {
    return apiErrorRes(req, res, "Oops! Something went wrong, Try again");
  }
}


async function getProfile(req, res) {
    let getUserDetailsFromDB = await userService.getUserByUserId(req.headers.id);
    if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        // let resData = { ...getUserDetailsFromDB.data, timezoneList };
        let resData = { ...getUserDetailsFromDB.data };
        return apiSuccessRes(req, res, 'Success', resData);
    } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiErrorRes(req, res, 'User Name Is Not Exist.');
    } else if (getUserDetailsFromDB.statusCode === CONSTANTS.ACCESS_DENIED) {
        return apiErrorRes(req, res, 'Please Enter Valid Username And Password');
    } else {
        return apiErrorRes(req, res, 'Oops! Something went wrong, Try again');
    }
}
async function updateRules(req, res) {
    let { id } = req.headers;
    let {
        is_rules_displayed

    } = req.body;
    const profilechema = Joi.object({
        is_rules_displayed: Joi.string().required(),

    });
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    is_rules_displayed = 'Y';
    let data = {
        is_rules_displayed,
        id
    }
    console.log('data', data);
    let getUserByid = await userService.updateRules(data);
    if (getUserByid.statusCode === CONSTANTS.SUCCESS) {

        return apiSuccessRes(req, res, 'Success.');
    } else if (getUserByid.statusCode === CONSTANTS.ACCESS_DENIED) {
        return apiErrorRes(req, res, 'Invalid id.');
    } else {
        return apiErrorRes(req, res, 'Server error.');
    }
}

async function globalSettings(req, res) {
    return apiSuccessRes(req, res, 'Error in settings.');
    let getUserDetailsFromDB = await userService.globalSettings();
    if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {

        let tempdata = [];
        let randomNumber = randomString(32, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
        const element = getUserDetailsFromDB.data;
        //let newString = (randomNumber+''+element.register+''+randomNumber);			
        //let buff = new Buffer(newString);
        //let text = buff.toString('base64');

        delete element.created_at;
        delete element.ezugi_created_at;

        let newString = (element.register);
        let buff = new Buffer(newString);
        let text = buff.toString('base64');
        let fristText = text.substring(0, 1);
        let secondText = text.substring(1, text.length);
        text = (fristText + '' + randomNumber + '' + secondText);

        let randomNumber2 = randomString(32, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

        let registerOTP = (element.register_otp);
        let registerOTPSendBuffer = new Buffer(registerOTP);
        let registerOTPSend = registerOTPSendBuffer.toString('base64');
        let registerOTPSend1 = registerOTPSend.substring(0, 1);
        let registerOTPSend2 = registerOTPSend.substring(1, registerOTPSend.length);
        registerOTPSend = (registerOTPSend1 + '' + randomNumber2 + '' + registerOTPSend2);
        let randomNumber3 = randomString(32, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

        let forgotOTP = (element.forgot_otp);
        let forgotOTPSendBuffer = new Buffer(forgotOTP);
        let forgotOTPSend = forgotOTPSendBuffer.toString('base64');
        let forgotOTPSend1 = forgotOTPSend.substring(0, 1);
        let forgotOTPSend2 = forgotOTPSend.substring(1, forgotOTPSend.length);
        forgotOTPSend = (forgotOTPSend1 + '' + randomNumber3 + '' + forgotOTPSend2);

        let randomNumber4 = randomString(32, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

        let LoginOTP = (element.login_otp);
        let LoginOTPSendBuffer = new Buffer(LoginOTP);
        let LoginOTPSend = LoginOTPSendBuffer.toString('base64');
        let LoginOTPSend1 = LoginOTPSend.substring(0, 1);
        let LoginOTPSend2 = LoginOTPSend.substring(1, LoginOTPSend.length);
        LoginOTPSend = (LoginOTPSend1 + '' + randomNumber4 + '' + LoginOTPSend2);

        tempdata.push({ ...element, register: text, register_otp: registerOTPSend, forgot_otp: forgotOTPSend, login_otp: LoginOTPSend });


        //delete tempdata.created_at;
        //delete tempdata.created_at;

        return apiSuccessRes(req, res, 'Success', tempdata);
    } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiSuccessRes(req, res, 'Error in settings.');
    }
}

async function getRules(req, res) {

    let getUserDetailsFromDB = await userService.getRules();
    if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {

        return apiSuccessRes(req, res, 'Success', getUserDetailsFromDB.data);
    } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiSuccessRes(req, res, 'Error in settings.');
    }
}
async function getFavouriteList(req, res) {
    let getUserDetailsFromDB = await userService.getFavouriteList(req.headers.id);
    if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        //let resData={...getUserDetailsFromDB.data};
        return apiSuccessRes(req, res, 'Success', getUserDetailsFromDB.data);
    } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiErrorRes(req, res, 'User Name Is Not Exist.');
    } else if (getUserDetailsFromDB.statusCode === CONSTANTS.ACCESS_DENIED) {
        return apiErrorRes(req, res, 'Please Enter Valid Username And Password');
    } else {
        return apiErrorRes(req, res, 'Oops! Something went wrong, Try again');
    }
}
async function oneClickBetSportWise(req, res) {
    let getUserDetailsFromDB = await userService.oneClickBetSportWise(req.headers.id);
    if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        //let resData={...getUserDetailsFromDB.data};
        return apiSuccessRes(req, res, 'Success', getUserDetailsFromDB.data);
    } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiErrorRes(req, res, 'User Name Is Not Exist.');
    } else if (getUserDetailsFromDB.statusCode === CONSTANTS.ACCESS_DENIED) {
        return apiErrorRes(req, res, 'Please Enter Valid Username And Password');
    } else {
        return apiErrorRes(req, res, 'Oops! Something went wrong, Try again');
    }
}
async function getAPIListFile(req, res) {
    fs.readFile('upload/apiList.html', (e, data) => {
        if (e) throw e;
        res.send(data);
    });
}
async function updatePassword(req, res) {
    let {
        oldPassword,
        newPassword,
        confirmNewPassword
    } = req.body;
    let { id } = req.headers;

    const profilechema = Joi.object({
        oldPassword: Joi.string().required(),
        newPassword: Joi.string().required().min(6),
        confirmNewPassword: Joi.string().required(),

    });
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    var pattern1 = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/;;
    var pattern2 = /^(?=.*[A-Z])/;
    var pattern3 = /^(?=.*[0-9])/;


    if (pattern1.test(newPassword) == false) {
        return apiErrorRes(req, res, 'Password must be 6 characters long [ lowercase,uppercase,number ] required !');
    } else if (newPassword !== confirmNewPassword) {
        return apiErrorRes(req, res, 'New password and confirm new password is not same.');
    }
    let getUserByid = await userService.findUserByIdAndVerifyPassword(id, oldPassword);

    if (getUserByid.statusCode === CONSTANTS.SUCCESS) {
        let updatePasswordID = await userService.updatePassword(newPassword, id);
        if (updatePasswordID.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Password updated successfully.');
        } else {
            return apiErrorRes(req, res, 'Error update password.');
        }
    } else if (getUserByid.statusCode === CONSTANTS.ACCESS_DENIED) {
        return apiErrorRes(req, res, 'Invalid current password.');
    } else {
        return apiErrorRes(req, res, 'Error to update password.');
    }
}
async function getUserBalance(req, res) {
    let { id } = req.headers;

    let checkAuth = req.headers.authorization;
    let authorization = await userService.getUserAuthorization(id);

    let checkAuth2 = checkAuth.replace('Bearer ', '');
    if (authorization.data !== null && (checkAuth2 !== authorization.data.device_id || authorization.data.lockUser == 'Y' || authorization.data.closeUser == 'Y')) {
        return apiUnauthorizedRes(req, res, 'Not authorized');
    }

    //let getUserByid = await userService.getUserNameAndPasswordById(id);

    //let siteMessge = await userService.getSiteMessage();

    if (authorization.statusCode === CONSTANTS.SUCCESS) {
        delete authorization.data.device_id;
        delete authorization.data.lockUser;
        delete authorization.data.closeUser;
        delete authorization.data.password;
        delete authorization.data.avatar;

        //getUserByid.data['site_message'] = siteMessge.data.value;
        return apiSuccessRes(req, res, 'Success.', authorization.data);
    } else if (authorization.statusCode === CONSTANTS.ACCESS_DENIED) {
        return apiSuccessRes(req, res, 'Invalid id.');
    } else {
        return apiSuccessRes(req, res, 'Server error.');
    }
}
async function updateTimeZone(req, res) {
    let { id } = req.headers;
    let {
        time_zone,
        timezone_value
    } = req.body;
    const profilechema = Joi.object({
        time_zone: Joi.string().required(),
        timezone_value: Joi.string().required(),

    });
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let data = {
        time_zone,
        timezone_value,
        id
    }
    let getUserByid = await userService.updateTimeZone(data);
    if (getUserByid.statusCode === CONSTANTS.SUCCESS) {

        return apiSuccessRes(req, res, 'Success.');
    } else if (getUserByid.statusCode === CONSTANTS.ACCESS_DENIED) {
        return apiErrorRes(req, res, 'Invalid id.');
    } else {
        return apiErrorRes(req, res, 'Server error.');
    }
}
async function updateOneClickAndMatchStack(req, res) {
    let { id } = req.headers;
    let {
        one_click_stack,
        match_stack,
        sport_id
    } = req.body;
    const profilechema = Joi.object({
        one_click_stack: Joi.string(),
        match_stack: Joi.string(),
        sport_id: Joi.string().required(),

    });
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let data = {
        one_click_stack,
        match_stack,
        sport_id,
        id
    }
    let getUserByid = await userService.updateOneClickAndMatchStack(data);
    if (getUserByid.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success.');
    } else if (getUserByid.statusCode === CONSTANTS.ACCESS_DENIED) {
        return apiErrorRes(req, res, 'Invalid id.');
    } else {
        return apiErrorRes(req, res, 'Server error.');
    }
}
async function getUserAccountStatement(req, res) {

    let {
        limit,
        pageno,
        from_date,
        to_date
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object({
        limit: Joi.number().required(),
        pageno: Joi.number().required(),
        from_date: Joi.number().required(),
        to_date: Joi.number()
    });

    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let reqData = {
        limit,
        pageno,
        from_date,
        to_date,
        id
    };

    let makeUserDetailsFromDB = await userService.UserAccountStatement(reqData);

    if (makeUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'success', makeUserDetailsFromDB.data);
    } else if (makeUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.');
    } else {
        return apiSuccessRes(req, res, 'Error to account statement.');
    }
}
async function getUserMyBetsList(req, res) {

    let {
        limit,
        pageno,
        from_date,
        to_date,
        sport_id,
        match_id,
        market_id,
        betType
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object({
        limit: Joi.number().required(),
        pageno: Joi.number().required(),
        from_date: Joi.number().required(),
        to_date: Joi.number(),
        sport_id: Joi.number(),
        match_id: Joi.number(),
        market_id: Joi.string(),
        betType: Joi.string()
    });

    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let reqData = {
        limit,
        pageno,
        from_date,
        to_date,
        sport_id,
        match_id,
        market_id,
        betType,
        id
    };

    let makeUserDetailsFromDB = await userService.getUserMyBetsList(reqData);

    const checkUserId=makeUserDetailsFromDB.data[0].userId;
    const checkUserNameByUserId=await userService.getUserByUserId(checkUserId)
    const result =makeUserDetailsFromDB.data.map((item)=>{
    return{
        ...item,user_name:checkUserNameByUserId.data.user_name
    }
    })


    if (makeUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'success',result);
    } else if (makeUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiSuccessRes(req, res, 'Error in bet list.', CONSTANTS.BLANK_ARRAY);
    }
}
async function ProfitLossMatchAndMarketWise(req, res) {

    let {
        limit,
        pageno,
        from_date,
        to_date,
        sport_id,
        match_id,
        betType
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object({
        limit: Joi.number().required(),
        pageno: Joi.number().required(),
        from_date: Joi.number().required(),
        to_date: Joi.number(),
        sport_id: Joi.number(),
        match_id: Joi.number(),
        betType: Joi.string()
    });

    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let reqData = {
        limit,
        pageno,
        from_date,
        to_date,
        sport_id,
        match_id,
        betType,
        id
    };

    let makeUserDetailsFromDB = await userService.getUserProfitLossMatchAndMarket(reqData);

    if (makeUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'success', makeUserDetailsFromDB.data);
    } else if (makeUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.');
    } else {
        return apiSuccessRes(req, res, 'Error in profit loss list.');
    }
}
async function getUserProfitLossLMatchID(req, res) {

    let {
        sport_id,
        match_id
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object({
        sport_id: Joi.number().required(),
        match_id: Joi.number().required()
    });

    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let reqData = {
        sport_id,
        match_id,
        id
    };

    let makeUserDetailsFromDB = await userService.getUserProfitLossLMatchID(reqData);

    if (makeUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'success', makeUserDetailsFromDB.data);
    } else if (makeUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.');
    } else {
        return apiSuccessRes(req, res, 'Error in profit loss market list.');
    }
}
async function DepositWithdrawalRequest(req, res) {

    let {
        amount,
        description,
        attachment,
        type,
        account_number,
        ifsc,
        account_name,
        user_id,
        transaction_id,
        sender,
        reciver,
        dwtype,
        method,
        bankname
    } = req.body;

    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    let { id } = req.headers;
    const profilechema = Joi.object({
        amount: Joi.number().required(),
        description: Joi.string().allow('').optional(),
        attachment: Joi.string().allow('').optional(),
        type: Joi.string().valid("W", "D").required(),
        account_number: Joi.string().required(),
        ifsc: Joi.string().allow('').optional(),
        account_name: Joi.string().required(),
        user_id: Joi.number().optional(),
        transaction_id: Joi.string().allow('').optional(),
        sender: Joi.string().allow('').optional(),
        reciver: Joi.string().allow('').optional(),
        dwtype: Joi.string().required(),
        method: Joi.string().required(),
        bankname: Joi.string().optional(),

    });

    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let reqData = {
        amount,
        description,
        type,
        ip_address,
        attachment,
        id,
        account_phone_number: account_number,
        account_ifsc_code: ifsc,
        account_holder_name: account_name,
        user_ac_info_id: user_id,
        unique_transaction_id: transaction_id,
        sender_name: sender,
        reciver_name: reciver,
        deposit_withdraw_type: dwtype,
        payment_method: method,
        bankname
    };
    let data = { id, type };
    let userWithrawal = "";
    let makeUserDetailsFromDB = await userService.getUserNameAndPasswordById(id);
    let userRequestCount = await userService.getRequestCount(data);

    if (makeUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS && userRequestCount.statusCode === CONSTANTS.SUCCESS) {
        let newAmount = makeUserDetailsFromDB.data.amount + amount;

        if (type === 'W' && makeUserDetailsFromDB.data.balance < amount) {
            return apiErrorRes(req, res, 'Insufficient Balance', CONSTANTS.BLANK_ARRAY);
        } else if (userRequestCount.data.requestCount == CONSTANTS.DEPOSITWITHDRAWAL_REQUEST_COUNT) {
            return apiErrorRes(req, res, 'You have a pending request! ', CONSTANTS.BLANK_ARRAY);
        } else if (type === 'W' && userRequestCount.data.requestCount == CONSTANTS.DEPOSITWITHDRAWAL_REQUEST_COUNT) {
            return apiErrorRes(req, res, 'Withdrawal request is not allowed more than ' + CONSTANTS.DEPOSITWITHDRAWAL_REQUEST_COUNT + ' ', CONSTANTS.BLANK_ARRAY);
        } else if (type === 'W' && newAmount > makeUserDetailsFromDB.data.balance) {
            return apiErrorRes(req, res, 'Insufficient Balance', CONSTANTS.BLANK_ARRAY);
        } else if (type === 'W' && makeUserDetailsFromDB.data.balance > amount) {
            userWithrawal = await userService.DepositWithdrawalRequest(reqData);
        } else if (type === 'D') {
            userWithrawal = await userService.DepositWithdrawalRequest(reqData);
        } else {
            return apiErrorRes(req, res, 'Error in deposit request', CONSTANTS.BLANK_ARRAY);
        }

        if (userWithrawal.statusCode == CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'success', userWithrawal.data);
        } else if (userWithrawal.statusCode === CONSTANTS.NOT_FOUND) {
            return apiErrorRes(req, res, 'Error in request.', CONSTANTS.BLANK_ARRAY);
        } else {
            return apiErrorRes(req, res, 'Error in request.', CONSTANTS.BLANK_ARRAY);
        }

    } else if (makeUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.');
    } else {
        return apiSuccessRes(req, res, 'Error in request list.');
    }
}
async function DepositWithdrawalCancel(req, res) {

    let {
        request_id,
        reason,
        type
    } = req.body;
    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    let { id } = req.headers;
    const profilechema = Joi.object({
        request_id: Joi.number().required(),
        reason: Joi.string().required(),
        type: Joi.string().valid("C").required(),
    });

    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let reqData = {
        request_id,
        reason,
        ip_address,
        type,
        id
    };

    let makeUserDetailsFromDB = await userService.DepositWithdrawalCancel(reqData);
    if (makeUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'success', makeUserDetailsFromDB.data);
    } else if (makeUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.');
    } else {
        return apiSuccessRes(req, res, 'Error in profit loss market list.');
    }
}



async function userChatRequestCancel(req, res) {

    let {
        request_id,
        reason,
        status
    } = req.body;
    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    let { id } = req.headers;
    const profilechema = Joi.object({
        request_id: Joi.string().required(),
        reason: Joi.string().required(),
        status: Joi.string().valid("C", "CA", "R", "P").required(),
    });

    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let reqData = {
        request_id,
        reason,
        ip_address,
        status,
        id
    };

    let makeUserDetailsFromDB = await userService.userChatRequestCancel(reqData);
    if (makeUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'success', makeUserDetailsFromDB.data);
    } else if (makeUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.');
    } else {
        return apiSuccessRes(req, res, 'Error in profit loss market list.');
    }
}


async function ChatRequest(req, res) {

    let {
        message,
        access_user,
        attachment
    } = req.body;
    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    let { id } = req.headers;

    const profilechema = Joi.object({
        message: Joi.string().required(),
        attachment: Joi.string().allow('').optional(),
        access_user: Joi.string().valid("D", "SA", "A").required(),
    });


    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let reqData = {
        message,
        access_user,
        attachment,
        ip_address,
        id
    };

    let makeUserDetailsFromDB = await userService.ChatRequest(reqData);
    if (makeUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        let message = 'Ticket id ' + makeUserDetailsFromDB.data + ' generated successfully';
        return apiSuccessRes(req, res, message);
    } else if (makeUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {

        return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiSuccessRes(req, res, 'Error in chat list.');
    }
}
async function ChatRequestList(req, res) {
    let {
        from_date,
        to_date,
        type,
        status,
        page,
        limit
    } = req.body;

    let { id } = req.headers;
    const profilechema = Joi.object({
        from_date: Joi.number().optional(),
        to_date: Joi.number().optional(),
        type: Joi.any().valid("A", "SA", "D").optional(),
        status: Joi.any().valid("A", "P", "C", "R", "CA").optional(),
        page: Joi.number().optional(),
        limit: Joi.number().optional(),
    });

    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let reqData = {
        from_date,
        to_date,
        type,
        status,
        page,
        limit,
        id
    };

    let ChatRequestList = await userService.ChatRequestList(reqData);
    if (ChatRequestList.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success.', ChatRequestList.data);
    } else if (ChatRequestList.statusCode === CONSTANTS.ACCESS_DENIED) {
        return apiSuccessRes(req, res, 'Invalid id.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiSuccessRes(req, res, 'Server error.', CONSTANTS.BLANK_ARRAY);
    }
}
async function userConversion(req, res) {
    let {
        ticket_id,
        type,
        message_id,
        limit
    } = req.body;

    let { id } = req.headers;
    const profilechema = Joi.object({
        ticket_id: Joi.string().required(),
        type: Joi.any().valid("0", "O", "N").required(),
        message_id: Joi.string().required(),
        limit: Joi.number().required(),
    });

    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let reqData = {
        ticket_id,
        type,
        message_id,
        limit,
        id
    };

    let ChatRequestList = await userService.userConversion(reqData);
    if (ChatRequestList.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success.', ChatRequestList.data);
    } else if (ChatRequestList.statusCode === CONSTANTS.ACCESS_DENIED) {
        return apiSuccessRes(req, res, 'Invalid id.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiSuccessRes(req, res, 'Server error.', CONSTANTS.BLANK_ARRAY);
    }
}
async function userConversionChat(req, res) {

    let {
        message,
        ticket_id,
        attachment
    } = req.body;
    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    let { id } = req.headers;

    const profilechema = Joi.object({
        message: Joi.string().allow('').optional(),
        attachment: Joi.string().allow('').optional(),
        ticket_id: Joi.string().required()
    });

    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    if ((message == '' || message == null) && (attachment == '' || attachment == null)) {
        return apiSuccessRes(req, res, 'Message requred!');
    }
    let reqData = {
        message,
        ticket_id,
        attachment,
        ip_address,
        id
    };

    let makeUserDetailsFromDB = await userService.userConversionChat(reqData);
    if (makeUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'success', makeUserDetailsFromDB.data);
    } else if (makeUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiSuccessRes(req, res, 'Error in chat list.');
    }
}
async function userDepositWithdrawalRequestList(req, res) {
    let {
        from_date,
        to_date,
        type,
        status,
        page,
        limit
    } = req.body;

    let { id } = req.headers;
    const profilechema = Joi.object({
        from_date: Joi.number().optional(),
        to_date: Joi.number().optional(),
        type: Joi.any().valid("AL", "D", "W").optional(),
        status: Joi.any().valid("AL", "P", "C", "A", "D").optional(),
        page: Joi.number().required(),
        limit: Joi.number().required(),
    });

    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let reqData = {
        from_date,
        to_date,
        type,
        status,
        page,
        limit,
        id
    };

    let ChatRequestList = await userService.userDepositWithdrawalRequestList(reqData);
    if (ChatRequestList.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success.', ChatRequestList.data);
    } else if (ChatRequestList.statusCode === CONSTANTS.ACCESS_DENIED) {
        return apiSuccessRes(req, res, 'Invalid id.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiSuccessRes(req, res, 'Server error.', CONSTANTS.BLANK_ARRAY);
    }
}
async function register(req, res) {
    let {
        name,
        username,
        mobile,
        password,
        email,
        confirmpassword
    } = req.body;

    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    const profilechema = Joi.object({
        name: Joi.string().required(),
        username: Joi.string().min(CONSTANTS.USER_NAME_LENGTH).required(),
        mobile: Joi.number().required(),
        password: Joi.string().min(6).required(),
        email: Joi.string().optional(),
        confirmpassword: Joi.string().min(6).required(),

    });
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    var format = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;

    if (format.test(name)) {
        return apiErrorRes(req, res, 'Name must be a string. Special characters not allowed! ');
    }
    if (format.test(username)) {
        return apiErrorRes(req, res, 'User Name must be a string. Special characters not allowed! ');
    }

    let reqdaaObj = { name: name, username: username, email: email, mobile: mobile, password: password, ip_address: ip_address };
    let getUserDetails = await userService.getUserByUserName(username);
    let globalSetting = await userService.globalSettings();
    let getUserMobile = await userService.getuserbyusernameandmobile(mobile);
    if (mobile.toString().length !== 10) {
        return apiErrorRes(req, res, 'Invalid mobile number');
    }
    if (globalSetting.statusCode === CONSTANTS.SUCCESS && globalSetting.data.register == 'N') {
        return apiErrorRes(req, res, 'User register not allowed');
    } else if (getUserDetails.statusCode === CONSTANTS.SUCCESS && getUserDetails.data.length > 0) {
        return apiErrorRes(req, res, 'username already exists');
    }
    if (getUserMobile.statusCode === CONSTANTS.SUCCESS && getUserMobile.data.length > 0) {
        return apiErrorRes(req, res, 'mobile number already exists');
    }

    if (password !== confirmpassword) {
        return apiErrorRes(req, res, 'Password and confirm password is not same.');
    }

    let mobileLastDigits = mobile.toString().slice(-3);

    let dealerData = await userService.registerdealer();
    let dealerData2 = dealerData.data;

    if (dealerData.statusCode === CONSTANTS.SUCCESS && dealerData.data.id === null) {
        return apiErrorRes(req, res, 'User register not allowed');
    }
    let registerUser = "";
    if (globalSetting.statusCode === CONSTANTS.SUCCESS && globalSetting.data.register_otp == 'N') {
        registerUser = await userService.register(reqdaaObj, dealerData2);
    } else if (globalSetting.statusCode === CONSTANTS.SUCCESS && globalSetting.data.register_otp == 'Y') {
        registerUser = await userService.registerWithOTP(reqdaaObj, dealerData2);
    } else {
        return apiErrorRes(req, res, 'User not register.');
    }

    if (registerUser.statusCode === CONSTANTS.SUCCESS) {
        let decryptValue = Number(registerUser.data).toFixed(2);
        let response = await decryptValueWith32RandomString(decryptValue);
        if (globalSetting.statusCode === CONSTANTS.SUCCESS && globalSetting.data.register_otp == 'Y') {

            return apiSuccessRes(req, res, 'OTP sent on ***' + mobileLastDigits, response);
        } else {
            return apiSuccessRes(req, res, 'User register successfully.', response);
        }

    } else if (registerUser.statusCode === CONSTANTS.ACCESS_DENIED) {
        return apiErrorRes(req, res, 'User not register.');
    } else {
        return apiErrorRes(req, res, 'Error to register user.');
    }
}

async function userexistornot(req, res) {
    let {
        username
    } = req.body;

    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    const profilechema = Joi.object({
        username: Joi.string().required(),

    });
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let getUserDetails = await userService.getUserByUserName(username);
    let globalSetting = await userService.globalSettings();

    if (globalSetting.statusCode === CONSTANTS.SUCCESS && globalSetting.data.register == 'N') {
        return apiErrorRes(req, res, 'User register not allowed');
    } else if (getUserDetails.statusCode === CONSTANTS.SUCCESS && getUserDetails.data.length > 0) {
        return apiErrorRes(req, res, 'username already exists');
    } else if (getUserDetails.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'username available');
    } else {
        return apiErrorRes(req, res, 'Error to register user.');
    }
}

async function openXpgLobby(req, res) {
    let { id } = req.headers;

    let checkAuth = req.headers.authorization;
    let authorization = await userService.getUserAuthorization(id);

    let checkAuth2 = checkAuth.replace('Bearer ', '');
    if (authorization.data !== null && (checkAuth2 !== authorization.data.device_id || authorization.data.lockUser == 'Y' || authorization.data.closeUser == 'Y')) {
        return apiUnauthorizedRes(req, res, 'Not authorized');
    }

    let getUserByid = await userService.getUserNameAndPasswordByIdXpg(id);



    if (getUserByid.statusCode === CONSTANTS.SUCCESS) {
        delete getUserByid.data.password


        let send_json = { operatorID: settings.XPG_OPERATOR_ID, username: getUserByid.data.user_name, firstName: getUserByid.data.user_name };
        let encrypt_string = globalFunction.convertXpgStringmd5(send_json);



        send_json = { accessPassword: encrypt_string, operatorID: settings.XPG_OPERATOR_ID, username: getUserByid.data.user_name, firstName: getUserByid.data.user_name };
        let send_string = globalFunction.convertXpgString(send_json);


        let response2 = await axios.post(settings.XPG_REGISTER_USER, send_string, {
            headers: { 'Content-Type': 'text/plain' }
        });

        let res_json = xmlParser.xml2json(response2.data);
        //res_json=JSON.parse(res_json);


        if (res_json.response.errorCode != "3" && res_json.response.errorCode != "0") {
            return apiErrorRes(req, res, res_json.response.description);
        }


        let xpguserdata = await userService.getXpgtableDataByUsername(getUserByid.data.user_name);
        if (xpguserdata.statusCode === CONSTANTS.SERVER_ERROR) {
            return apiErrorRes(req, res, "Server error in xpg check user exist function.");
        }

        if (xpguserdata.statusCode === CONSTANTS.NOT_FOUND) {


            let UseraccountBalance = await GetXpgUserAccountBalance(getUserByid.data);

            if (UseraccountBalance.response.errorCode != "0") {
                return apiErrorRes(req, res, "XPG balance error");
            }

            let xpgUserBalance = UseraccountBalance.response.balance;

            let xpgupdateamount = getUserByid.data.balance - xpgUserBalance;

            if (xpgupdateamount < 0) {
                let xpgupdateamountw = Math.abs(xpgupdateamount);
                let updateFunDataa = { user_name: getUserByid.data.user_name, balance: xpgupdateamountw };
                let WithdrawData = await xpgWithdrawBalance(updateFunDataa);
                if (!WithdrawData) {
                    return apiErrorRes(req, res, "XPG balance error 1");
                }

            } else if (xpgupdateamount > 0) {
                let updateFunDataa = { user_name: getUserByid.data.user_name, balance: xpgupdateamount };

                let balanceData = await xpgDepositeBalance(updateFunDataa);
                if (!balanceData) {
                    return apiErrorRes(req, res, "XPG balance error 2");
                }

            }

            let xpguserinsertdata = await userService.insertXpgUser(getUserByid.data);

            if (xpguserinsertdata.statusCode === CONSTANTS.SERVER_ERROR) {
                return apiErrorRes(req, res, "Server error in xpg insert user function.");
            }
        } else {

            await userService.xpgUpdateUserActiveTime(id);
        }

        // await xpgCronInner(req, res, id);

        let token_data = await generateXpgToken(getUserByid.data);

        if (token_data.response.errorCode != "0") {
            return apiErrorRes(req, res, token_data.response.description);
        }
        let tokenn = token_data.response.description;

        let lobby_url = settings.XPG_LOBBY_URL + tokenn + "&username=" + getUserByid.data.user_name;

        //let lobby_url="https://lobby.xpgstaging.com/?operatorId="+settings.XPG_OPERATOR_ID+"&token="+tokenn+"&username="+getUserByid.data.user_name;

        let ret_data = { url: lobby_url };

        return apiSuccessRes(req, res, 'Success.', ret_data);
    } else if (getUserByid.statusCode === CONSTANTS.ACCESS_DENIED) {
        return apiErrorRes(req, res, 'Invalid id.');
    } else {
        return apiErrorRes(req, res, 'Server error.');
    }
}

async function openGameLobby_BT(req, res) {


    let { id } = req.headers;

    let checkAuth = req.headers.authorization;
    let authorization = await userService.getUserAuthorization(id);

    let checkAuth2 = checkAuth.replace('Bearer ', '');
    if (authorization.data !== null && (checkAuth2 !== authorization.data.device_id || authorization.data.lockUser == 'Y' || authorization.data.closeUser == 'Y')) {
        return apiUnauthorizedRes(req, res, 'Not authorized');
    }

    let getUserByid = await userService.getUserNameAndPasswordByIdXpg(id);



    if (getUserByid.statusCode === CONSTANTS.SUCCESS) {
        delete getUserByid.data.password

        const openlobbychema = Joi.object({
            type: Joi.string().required(),
            inner_type: Joi.string().valid("0", "1").optional(),
            device: Joi.string().valid("W", "M").optional(),

        });
        try {
            await openlobbychema.validate(req.body, {
                abortEarly: true
            });
        } catch (error) {
            return apiErrorRes(req, res, error.details[0].message);
        }

        let external_type = req.body.type;

        let external_device = req.body.device;
        let inner_type = req.body.inner_type;

        if (inner_type === undefined) {
            inner_type = '0';
        }


        if (external_type === "1") {

            /*let token_data=await generateXpgToken(getUserByid.data);
            console.log('token_data---------- ',token_data);
        if( token_data.response.errorCode !="0")	{
            return apiErrorRes(req, res, token_data.response.description);
        }
        let tokenn=token_data.response.description;
	
    let l_url= settings.XPG_LOBYY_WEB_URL + tokenn+"&operatorId="+settings.XPG_OPERATOR_ID+"&username="+getUserByid.data.user_name;
    let ret_data={url:l_url};

    return apiSuccessRes(req, res, 'Success.',ret_data);*/

            let send_json = { operatorID: settings.XPG_OPERATOR_ID, username: getUserByid.data.user_name, firstName: getUserByid.data.user_name };
            let encrypt_string = globalFunction.convertXpgStringmd5(send_json);



            send_json = { accessPassword: encrypt_string, operatorID: settings.XPG_OPERATOR_ID, username: getUserByid.data.user_name, firstName: getUserByid.data.user_name };
            let send_string = globalFunction.convertXpgString(send_json);


            let response2 = await axios.post(settings.XPG_REGISTER_USER, send_string, {
                headers: { 'Content-Type': 'text/plain' }
            });

            let res_json = xmlParser.xml2json(response2.data);
            //res_json=JSON.parse(res_json);


            if (res_json.response.errorCode != "3" && res_json.response.errorCode != "0") {
                return apiErrorRes(req, res, res_json.response.description);
            }


            /*let xpguserdata = await userService.getXpgtableDataByUsername(getUserByid.data.user_name);
            if (xpguserdata.statusCode === CONSTANTS.SERVER_ERROR) {
                return apiErrorRes(req, res, "Server error in xpg check user exist function.");
            }*/

            /*if (xpguserdata.statusCode === CONSTANTS.NOT_FOUND) {


                let UseraccountBalance=await GetXpgUserAccountBalance(getUserByid.data);

                if( UseraccountBalance.response.errorCode !="0"){
                    return apiErrorRes(req, res, "XPG balance error");
                }

                let xpgUserBalance=UseraccountBalance.response.balance;

                let xpgupdateamount=getUserByid.data.balance-xpgUserBalance;
            	
                if(xpgupdateamount<0){
                    let xpgupdateamountw=Math.abs(xpgupdateamount);
                    let updateFunDataa={user_name:getUserByid.data.user_name,balance:xpgupdateamountw};
                    let WithdrawData=await xpgWithdrawBalance(updateFunDataa);
                    if(!WithdrawData){
                        return apiErrorRes(req, res, "XPG balance error 1");
                    }
                	
                }else if(xpgupdateamount>0){
                    let updateFunDataa={user_name:getUserByid.data.user_name,balance:xpgupdateamount};

                    let balanceData=await xpgDepositeBalance(updateFunDataa);
                    if(!balanceData){
                        return apiErrorRes(req, res, "XPG balance error 2");
                    }

                }

                let xpguserinsertdata = await userService.insertXpgUser(getUserByid.data);

                if (xpguserinsertdata.statusCode === CONSTANTS.SERVER_ERROR) {
                    return apiErrorRes(req, res, "Server error in xpg insert user function.");
                }
            }else{

                await userService.xpgUpdateUserActiveTime(id);
            }*/

            // await xpgCronInner(req, res, id);

            let token_data = await generateXpgToken(getUserByid.data);

            if (token_data.response.errorCode != "0") {
                return apiErrorRes(req, res, token_data.response.description);
            }
            let tokenn = token_data.response.description;

            //let lobby_url="https://lobby.xpgstaging.com/?operatorId="+settings.XPG_OPERATOR_ID+"&token="+tokenn+"&username="+getUserByid.data.user_name;

            let lobby_url = settings.XPG_LOBBY_URL + tokenn + "&username=" + getUserByid.data.user_name;

            let ret_data = { url: lobby_url };

            return apiSuccessRes(req, res, 'Success.', ret_data);

        } else if (external_type === "2") {

            console.log('----------------------aaa------------------', id);

            let randonNumber = Math.floor(Math.random() * Math.floor(100000));

            checkAuth2 = checkAuth2 + '____' + randonNumber;

            let insData = { user_id: id, ezugi_token_string: randonNumber, ezugi_token: checkAuth2, status: 'N' };

            await userService.insertEzugiAuthString(insData);

            let l_url = settings.EZUGI_LOBYY_WEB_URL + checkAuth2 + "&operatorId=" + settings.EZUGI_OPERATOR_ID + "&language=en&clientType=html5";
            /*if(external_device =='M')
            {
                https://playint.tableslive.com/auth/?token=123e4567-e89b-12d3-a456-426655440000&operatorId=13000001&language=en&clientType=html5&openTable=1&homeUrl=https://ezugi.com


                l_url=settings.EZUGI_LOBYY_MOBILE_URL +checkAuth2+"/"+settings.LOTUS_OPERATOR_ID; //https://d.fawk.app/#/splash-screen/"+checkAuth2+"/"+settings.LOTUS_OPERATOR_ID;
            }else{
                l_url= settings.EZUGI_LOBYY_WEB_URL + checkAuth2+"/"+settings.LOTUS_OPERATOR_ID; //https://d.fawk.app/#/splash-screen/"+checkAuth2+"/"+settings.LOTUS_OPERATOR_ID;
            }*/

            let ret_data = { url: l_url };

            return apiSuccessRes(req, res, 'Success.', ret_data);



            /*let ip_address = settings.EZUGI_WHITE_LIST_IP;
            	

            let send_json={agent_id:settings.EZUGI_AGENT_ID,username:settings.EZUGI_AGENT_USERNAME,player_username:getUserByid.data.user_name,player_password:getUserByid.data.user_name,nickname:getUserByid.data.user_name,session_ip:ip_address};


            let token=globalFunction.GenerateEzugiToken(send_json);
            	
        	

            send_json={agent_id:settings.EZUGI_AGENT_ID,username:settings.EZUGI_AGENT_USERNAME,player_username:getUserByid.data.user_name,player_password:getUserByid.data.user_name,nickname:getUserByid.data.user_name,session_ip:ip_address,request_token:token};

                let send_string=globalFunction.convertEzugiString(send_json);
                let response1 = await axios.get(settings.EZUGI_REGISTER_USER+send_string);

                let res_json=response1.data;
                //console.log('ip_address-------session_token-------'+ip_address+' ------- session_token send_json----------'+JSON.stringify(res_json));					 
            	
                if(res_json.error_code != "4" && res_json.error_code !="0")	{
                    return apiErrorRes(req, res, res_json.error);
                }

                let session_token="";

                if(res_json.error_code === 4){

                    //console.log('hhehehehehehehh fffffffffffffffffff if');
                    let send_json2={agent_id:settings.EZUGI_AGENT_ID,username:settings.EZUGI_AGENT_USERNAME,player_username:getUserByid.data.user_name,player_password:getUserByid.data.user_name,login:'new',session_ip:ip_address};


                    let token2=globalFunction.GenerateEzugiToken(send_json2);
            	
            	

                    send_json2={agent_id:settings.EZUGI_AGENT_ID,username:settings.EZUGI_AGENT_USERNAME,player_username:getUserByid.data.user_name,player_password:getUserByid.data.user_name,login:'new',session_ip:ip_address,request_token:token2};

                    let send_string2=globalFunction.convertEzugiString(send_json2);
                    let response2 = await axios.get(settings.EZUGI_LOGIN_USER+send_string2);
                    let res_json2=response2.data;

                    if(res_json2.error_code !="0")	{
                        return apiErrorRes(req, res, res_json2.details);
                    }

                    session_token=res_json2.session.session_token;
                	
                }else{
                    //console.log('hhehehehehehehh dddddddddddddddddddddd if');
                    session_token=res_json.session.session_token;

                    let player_iddd=res_json.session.player_id;
                	

                    let ezugiupdateplayerdata = await userService.updateEzugiPlayerIdOnUser(getUserByid.data.user_name,player_iddd);


                    if (ezugiupdateplayerdata.statusCode === CONSTANTS.SERVER_ERROR) {
                        return apiErrorRes(req, res, "Server error in update ezugi player id on user.");
                    }

                }
                //console.log('ip_address-------session_token-------'+ip_address+' ------- session_token ----------'+session_token);
                if(session_token==""){
                    return apiErrorRes(req, res, "Error in Generate session token.");
                }


                let xpguserdata = await userService.getXpgtableDataByUsername(getUserByid.data.user_name,2);
                if (xpguserdata.statusCode === CONSTANTS.SERVER_ERROR) {
                    return apiErrorRes(req, res, "Server error in xpg check user exist function.");
                }

                if (xpguserdata.statusCode === CONSTANTS.NOT_FOUND) {

                    getUserByid.data.ezugi_session_token=session_token;
                    let UseraccountBalance=await GetEzugiUserAccountBalance(getUserByid.data);

                    if( UseraccountBalance.error_code !="0"){
                        return apiErrorRes(req, res, "Ezugi balance error");
                    }

                    let xpgUserBalance=UseraccountBalance.balance;

                    let xpgupdateamount=getUserByid.data.balance-xpgUserBalance;
                	
                    if(xpgupdateamount<0){
                        let xpgupdateamountw=Math.abs(xpgupdateamount);
                        let updateFunDataa={user_name:getUserByid.data.user_name,balance:xpgupdateamountw,ezugi_session_token:session_token};
                        let WithdrawData=await EzugiWithdrawBalance(updateFunDataa);
                        if(!WithdrawData){
                            return apiErrorRes(req, res, "Ezugi balance error 1");
                        }
                    	
                    }else if(xpgupdateamount>0){
                        let updateFunDataa={user_name:getUserByid.data.user_name,balance:xpgupdateamount,ezugi_session_token:session_token};

                        let balanceData=await EzugiDepositeBalance(updateFunDataa);
                        if(!balanceData){
                            return apiErrorRes(req, res, "Ezugi balance error 2");
                        }

                    }

                    let xpguserinsertdata = await userService.insertXpgUser(getUserByid.data,2,session_token);

                    if (xpguserinsertdata.statusCode === CONSTANTS.SERVER_ERROR) {
                        return apiErrorRes(req, res, "Server error in ezugi insert user function.");
                    }
                }else{

                    await userService.xpgUpdateUserActiveTime(id,session_token,2);
                }


                let send_json3={agent_id:settings.EZUGI_AGENT_ID,username:settings.EZUGI_AGENT_USERNAME,session_token:session_token,provider_id:6,session_ip:ip_address};


                    let token3=globalFunction.GenerateEzugiToken(send_json3);
            	
            	

                    send_json3={agent_id:settings.EZUGI_AGENT_ID,username:settings.EZUGI_AGENT_USERNAME,session_token:session_token,provider_id:6,session_ip:ip_address,request_token:token3};

                    let send_string3=globalFunction.convertEzugiString(send_json3);
                    let response3 = await axios.get(settings.EZUGI_GAME_TOKEN+send_string3);
                    let res_json3=response3.data;

                    if(res_json3.error_code !="0")	{
                        return apiErrorRes(req, res, res_json3.details);
                    }
                    let ret_data={url:res_json3.provider.main_url, data:res_json3};	
                    console.log(' inner_type ---------------- ',inner_type);
                    if(inner_type ==='1')
                    {
                        ret_data.url+='&openTable=1000000';
                    }
                	

                    return apiSuccessRes(req, res, 'Success.',ret_data);*/



        } else if (external_type === "3") {
            let l_url = "";
            if (external_device == 'M') {
                l_url = settings.LOTUS_LOBYY_MOBILE_URL + checkAuth2 + "/" + settings.LOTUS_OPERATOR_ID; //https://d.fawk.app/#/splash-screen/"+checkAuth2+"/"+settings.LOTUS_OPERATOR_ID;
            } else {
                l_url = settings.LOTUS_LOBYY_WEB_URL + checkAuth2 + "/" + settings.LOTUS_OPERATOR_ID; //https://d.fawk.app/#/splash-screen/"+checkAuth2+"/"+settings.LOTUS_OPERATOR_ID;
            }

            let ret_data = { url: l_url };

            return apiSuccessRes(req, res, 'Success.', ret_data);

        } else {

            return apiErrorRes(req, res, 'Type is not valid.');
        }
    } else if (getUserByid.statusCode === CONSTANTS.ACCESS_DENIED) {
        return apiErrorRes(req, res, 'Invalid id.');
    } else {
        return apiErrorRes(req, res, 'Server error.');
    }
}




async function openGameLobby(req, res) {


    let { id } = req.headers;

    let checkAuth = req.headers.authorization;
    let authorization = await userService.getUserAuthorization(id);

    let checkAuth2 = checkAuth.replace('Bearer ', '');
    if (authorization.data !== null && (checkAuth2 !== authorization.data.device_id || authorization.data.lockUser == 'Y' || authorization.data.closeUser == 'Y')) {
        return apiUnauthorizedRes(req, res, 'Not authorized');
    }

    let getUserByid = await userService.getUserNameAndPasswordByIdXpg(id);



    if (getUserByid.statusCode === CONSTANTS.SUCCESS) {
        delete getUserByid.data.password

        const openlobbychema = Joi.object({
            type: Joi.string().required(),
            inner_type: Joi.string().valid("0", "1").optional(),
            device: Joi.string().valid("W", "M").optional(),

        });
        try {
            await openlobbychema.validate(req.body, {
                abortEarly: true
            });
        } catch (error) {
            return apiErrorRes(req, res, error.details[0].message);
        }

        let external_type = req.body.type;

        let external_device = req.body.device;
        let inner_type = req.body.inner_type;

        if (inner_type === undefined) {
            inner_type = '0';
        }


        if (external_type === "1") {

            let send_json = { operatorID: settings.XPG_OPERATOR_ID, username: getUserByid.data.user_name, firstName: getUserByid.data.user_name };
            let encrypt_string = globalFunction.convertXpgStringmd5(send_json);

            send_json = { accessPassword: encrypt_string, operatorID: settings.XPG_OPERATOR_ID, username: getUserByid.data.user_name, firstName: getUserByid.data.user_name };
            let send_string = globalFunction.convertXpgString(send_json);

            let response2 = await axios.post(settings.XPG_REGISTER_USER, send_string, {
                headers: { 'Content-Type': 'text/plain' }
            });

            let res_json = xmlParser.xml2json(response2.data);

            if (res_json.response.errorCode != "3" && res_json.response.errorCode != "0") {
                return apiErrorRes(req, res, res_json.response.description);
            }

            let token_data = await generateXpgToken(getUserByid.data);

            if (token_data.response.errorCode != "0") {
                return apiErrorRes(req, res, token_data.response.description);
            }
            let tokenn = token_data.response.description;

            let lobby_url = settings.XPG_LOBBY_URL + tokenn + "&username=" + getUserByid.data.user_name;

            let ret_data = { url: lobby_url };

            return apiSuccessRes(req, res, 'Success.', ret_data);

        } else if (external_type === "2") {

            let randonNumber = Math.floor(Math.random() * Math.floor(100000));

            checkAuth2 = checkAuth2 + '____' + randonNumber;

            let insData = { user_id: id, ezugi_token_string: randonNumber, ezugi_token: checkAuth2, status: 'N' };

            await userService.insertEzugiAuthString(insData);

            let l_url = settings.EZUGI_LOBYY_WEB_URL + checkAuth2 + "&operatorId=" + settings.EZUGI_OPERATOR_ID + "&language=en&clientType=html5";

            let ret_data = { url: l_url };

            return apiSuccessRes(req, res, 'Success.', ret_data);



            /*let ip_address = settings.EZUGI_WHITE_LIST_IP;
            	

            let send_json={agent_id:settings.EZUGI_AGENT_ID,username:settings.EZUGI_AGENT_USERNAME,player_username:getUserByid.data.user_name,player_password:getUserByid.data.user_name,nickname:getUserByid.data.user_name,session_ip:ip_address};


            let token=globalFunction.GenerateEzugiToken(send_json);
            	
        	

            send_json={agent_id:settings.EZUGI_AGENT_ID,username:settings.EZUGI_AGENT_USERNAME,player_username:getUserByid.data.user_name,player_password:getUserByid.data.user_name,nickname:getUserByid.data.user_name,session_ip:ip_address,request_token:token};

                let send_string=globalFunction.convertEzugiString(send_json);
                let response1 = await axios.get(settings.EZUGI_REGISTER_USER+send_string);

                let res_json=response1.data;
                //console.log('ip_address-------session_token-------'+ip_address+' ------- session_token send_json----------'+JSON.stringify(res_json));					 
            	
                if(res_json.error_code != "4" && res_json.error_code !="0")	{
                    return apiErrorRes(req, res, res_json.error);
                }

                let session_token="";

                if(res_json.error_code === 4){

                    //console.log('hhehehehehehehh fffffffffffffffffff if');
                    let send_json2={agent_id:settings.EZUGI_AGENT_ID,username:settings.EZUGI_AGENT_USERNAME,player_username:getUserByid.data.user_name,player_password:getUserByid.data.user_name,login:'new',session_ip:ip_address};


                    let token2=globalFunction.GenerateEzugiToken(send_json2);
            	
            	

                    send_json2={agent_id:settings.EZUGI_AGENT_ID,username:settings.EZUGI_AGENT_USERNAME,player_username:getUserByid.data.user_name,player_password:getUserByid.data.user_name,login:'new',session_ip:ip_address,request_token:token2};

                    let send_string2=globalFunction.convertEzugiString(send_json2);
                    let response2 = await axios.get(settings.EZUGI_LOGIN_USER+send_string2);
                    let res_json2=response2.data;

                    if(res_json2.error_code !="0")	{
                        return apiErrorRes(req, res, res_json2.details);
                    }

                    session_token=res_json2.session.session_token;
                	
                }else{
                    //console.log('hhehehehehehehh dddddddddddddddddddddd if');
                    session_token=res_json.session.session_token;

                    let player_iddd=res_json.session.player_id;
                	

                    let ezugiupdateplayerdata = await userService.updateEzugiPlayerIdOnUser(getUserByid.data.user_name,player_iddd);


                    if (ezugiupdateplayerdata.statusCode === CONSTANTS.SERVER_ERROR) {
                        return apiErrorRes(req, res, "Server error in update ezugi player id on user.");
                    }

                }
                //console.log('ip_address-------session_token-------'+ip_address+' ------- session_token ----------'+session_token);
                if(session_token==""){
                    return apiErrorRes(req, res, "Error in Generate session token.");
                }


                let xpguserdata = await userService.getXpgtableDataByUsername(getUserByid.data.user_name,2);
                if (xpguserdata.statusCode === CONSTANTS.SERVER_ERROR) {
                    return apiErrorRes(req, res, "Server error in xpg check user exist function.");
                }

                if (xpguserdata.statusCode === CONSTANTS.NOT_FOUND) {

                    getUserByid.data.ezugi_session_token=session_token;
                    let UseraccountBalance=await GetEzugiUserAccountBalance(getUserByid.data);

                    if( UseraccountBalance.error_code !="0"){
                        return apiErrorRes(req, res, "Ezugi balance error");
                    }

                    let xpgUserBalance=UseraccountBalance.balance;

                    let xpgupdateamount=getUserByid.data.balance-xpgUserBalance;
                	
                    if(xpgupdateamount<0){
                        let xpgupdateamountw=Math.abs(xpgupdateamount);
                        let updateFunDataa={user_name:getUserByid.data.user_name,balance:xpgupdateamountw,ezugi_session_token:session_token};
                        let WithdrawData=await EzugiWithdrawBalance(updateFunDataa);
                        if(!WithdrawData){
                            return apiErrorRes(req, res, "Ezugi balance error 1");
                        }
                    	
                    }else if(xpgupdateamount>0){
                        let updateFunDataa={user_name:getUserByid.data.user_name,balance:xpgupdateamount,ezugi_session_token:session_token};

                        let balanceData=await EzugiDepositeBalance(updateFunDataa);
                        if(!balanceData){
                            return apiErrorRes(req, res, "Ezugi balance error 2");
                        }

                    }

                    let xpguserinsertdata = await userService.insertXpgUser(getUserByid.data,2,session_token);

                    if (xpguserinsertdata.statusCode === CONSTANTS.SERVER_ERROR) {
                        return apiErrorRes(req, res, "Server error in ezugi insert user function.");
                    }
                }else{

                    await userService.xpgUpdateUserActiveTime(id,session_token,2);
                }


                let send_json3={agent_id:settings.EZUGI_AGENT_ID,username:settings.EZUGI_AGENT_USERNAME,session_token:session_token,provider_id:6,session_ip:ip_address};


                    let token3=globalFunction.GenerateEzugiToken(send_json3);
            	
            	

                    send_json3={agent_id:settings.EZUGI_AGENT_ID,username:settings.EZUGI_AGENT_USERNAME,session_token:session_token,provider_id:6,session_ip:ip_address,request_token:token3};

                    let send_string3=globalFunction.convertEzugiString(send_json3);
                    let response3 = await axios.get(settings.EZUGI_GAME_TOKEN+send_string3);
                    let res_json3=response3.data;

                    if(res_json3.error_code !="0")	{
                        return apiErrorRes(req, res, res_json3.details);
                    }
                    let ret_data={url:res_json3.provider.main_url, data:res_json3};	
                    console.log(' inner_type ---------------- ',inner_type);
                    if(inner_type ==='1')
                    {
                        ret_data.url+='&openTable=1000000';
                    }
                	

                    return apiSuccessRes(req, res, 'Success.',ret_data);*/



        } else if (external_type === "3") {
            let l_url = "";
            if (external_device == 'M') {
                l_url = settings.LOTUS_LOBYY_MOBILE_URL + checkAuth2 + "/" + settings.LOTUS_OPERATOR_ID; //https://d.fawk.app/#/splash-screen/"+checkAuth2+"/"+settings.LOTUS_OPERATOR_ID;
            } else {
                l_url = settings.LOTUS_LOBYY_WEB_URL + checkAuth2 + "/" + settings.LOTUS_OPERATOR_ID; //https://d.fawk.app/#/splash-screen/"+checkAuth2+"/"+settings.LOTUS_OPERATOR_ID;
            }

            let ret_data = { url: l_url };

            return apiSuccessRes(req, res, 'Success.', ret_data);

        } else if (external_type === "4") {
            let TID = id + '____' + Date.now();
            let send_json = { operatorID: settings.FUN_OPERATOR_ID, username: getUserByid.data.user_name, firstName: getUserByid.data.user_name };
            let Password = globalFunction.convertXpgStringmd5(send_json);

            let registUserHash = 'User/Add/' + settings.FUN_WHITE_LIST_IP + '/' + TID + '/' + settings.FUN_API_KEY + '/' + getUserByid.data.user_name + '/' + Password + '/' + settings.FUN_OPERATOR_CURRENCY + '/' + settings.FUN_API_PASSWORD;

            //User/Add/[IP]/[TID]/[KEY]/[LOGIN]/[PASSWORD]/[CURRENCY]/[PWD] 				
            let registerHashKey = globalFunction.convertFUNStringmd5(registUserHash);

            let userRegiset = { Login: getUserByid.data.user_name, Password: Password, TID: TID, Currency: settings.FUN_OPERATOR_CURRENCY, Hash: registerHashKey, Language: settings.FUN_OPERATOR_LANGUAGE, RegistrationIP: settings.FUN_WHITE_LIST_IP };

            let userRegisterSendData = globalFunction.convertXpgString(userRegiset);
            console.log(settings.FUN_REGISTER_USER + userRegisterSendData);
            let userRegisterResponse = await axios.get(settings.FUN_REGISTER_USER + userRegisterSendData);
            if (userRegisterResponse.status != 200 && userRegisterResponse.data != 1) {

                return apiErrorRes(req, res, userRegisterResponse.data);
            }

            let lobbyTID = id + '___' + Date.now();
            /*let jsonnn = 'Game/FullList/'+settings.FUN_WHITE_LIST_IP+'/'+TID2+'/'+settings.FUN_API_KEY+'/'+settings.FUN_API_PASSWORD;					
            let encrypt_string=globalFunction.convertFUNStringmd5(jsonnn);					
            let lobby_url=settings.FUN_LOBBY_URL+TID2+'&Hash='+encrypt_string;*/

            let lobbyStateHash = 'User/DirectAuth/' + settings.FUN_WHITE_LIST_IP + '/' + lobbyTID + '/' + settings.FUN_API_KEY + '/' + getUserByid.data.user_name + '/' + Password + '/' + settings.FUN_OPERATOR_ID + '/' + settings.FUN_API_PASSWORD;
            let lobbyHashKey = globalFunction.convertFUNStringmd5(lobbyStateHash);

            let lobbyReadyPram = {
                Login: getUserByid.data.user_name,
                Password: Password,
                TID: lobbyTID,
                System: settings.FUN_OPERATOR_ID,
                Page: settings.FUN_OPERATOR_PAGE_CODE,
                Hash: lobbyHashKey,
                Language: settings.FUN_OPERATOR_LANGUAGE,
                UserIP: settings.FUN_WHITE_LIST_IP
            };

            let lobbyReadyPramInAPI = globalFunction.convertXpgString(lobbyReadyPram);

            let lobby_url = await axios.get(settings.FUN_READY_LOBBY_STATE_URL + lobbyReadyPramInAPI);
            if (lobby_url.status != 200) {

                return apiErrorRes(req, res, lobby_url.data);
            }

            let lobby = lobby_url.data;
            lobby = lobby.split(',');
            lobby = lobby[1];
            return apiSuccessRes(req, res, 'Success.', lobby);

        } else {

            return apiErrorRes(req, res, 'Type is not valid.');
        }
    } else if (getUserByid.statusCode === CONSTANTS.ACCESS_DENIED) {
        return apiErrorRes(req, res, 'Invalid id.');
    } else {
        return apiErrorRes(req, res, 'Server error.');
    }
}

async function xpgDepositeBalance(user_detail) {
    var currentTime = globalFunction.currentDateTimeStamp();
    let transactionIDd = user_detail.user_name + "_" + currentTime;

    let send_json = { operatorID: settings.XPG_OPERATOR_ID, username: user_detail.user_name, amount: user_detail.balance, transactionID: transactionIDd };
    let encrypt_string = globalFunction.convertXpgStringmd5(send_json);



    send_json = { accessPassword: encrypt_string, operatorID: settings.XPG_OPERATOR_ID, username: user_detail.user_name, amount: user_detail.balance, transactionID: transactionIDd };
    let send_string = globalFunction.convertXpgString(send_json);


    let response2 = await axios.post(settings.XPG_DEPOSITE_AMOUNT, send_string, {
        headers: { 'Content-Type': 'text/plain' }
    });

    let res_json = xmlParser.xml2json(response2.data);
    //res_json=JSON.parse(res_json);

    if (res_json.response.errorCode != "0") {
        return false;
    }
    return true;

}


async function generateXpgToken(user_detail) {


    let send_json = { operatorID: settings.XPG_OPERATOR_ID, username: user_detail.user_name, props: "ExternalSessionID:null" };
    let encrypt_string = globalFunction.convertXpgStringmd5(send_json);



    send_json = { accessPassword: encrypt_string, operatorID: settings.XPG_OPERATOR_ID, username: user_detail.user_name, props: "ExternalSessionID:null" };
    let send_string = globalFunction.convertXpgString(send_json);


    let response2 = await axios.post(settings.XPG_REGISTER_TOKEN, send_string, {
        headers: { 'Content-Type': 'text/plain' }
    });

    let res_json = xmlParser.xml2json(response2.data);
    //res_json=JSON.parse(res_json);

    return res_json;




}

async function GetXpgUserAccountBalance(user_detail) {


    let send_json = { operatorID: settings.XPG_OPERATOR_ID, username: user_detail.user_name };
    let encrypt_string = globalFunction.convertXpgStringmd5(send_json);



    send_json = { accessPassword: encrypt_string, operatorID: settings.XPG_OPERATOR_ID, username: user_detail.user_name };
    let send_string = globalFunction.convertXpgString(send_json);


    let response2 = await axios.post(settings.XPG_GET_BALANCE, send_string, {
        headers: { 'Content-Type': 'text/plain' }
    });

    let res_json = xmlParser.xml2json(response2.data);
    //res_json=JSON.parse(res_json);

    return res_json;




}





async function GetXpgUserAccountBalances(user_names) {


    let send_json = { operatorID: settings.XPG_OPERATOR_ID, usernames: user_names };
    let encrypt_string = globalFunction.convertXpgStringmd5(send_json);



    send_json = { accessPassword: encrypt_string, operatorID: settings.XPG_OPERATOR_ID, usernames: user_names };
    let send_string = globalFunction.convertXpgString(send_json);


    let response2 = await axios.post(settings.XPG_GET_BALANCES, send_string, {
        headers: { 'Content-Type': 'text/plain' }
    });

    let res_json = xmlParser.xml2json(response2.data);
    //res_json=JSON.parse(res_json);

    return res_json;




}


async function xpgWithdrawBalance(user_detail) {
    var currentTime = globalFunction.currentDateTimeStamp();
    let transactionIDd = user_detail.user_name + "_" + currentTime + "Withdraw";

    let send_json = { operatorID: settings.XPG_OPERATOR_ID, username: user_detail.user_name, amount: user_detail.balance, transactionID: transactionIDd };
    let encrypt_string = globalFunction.convertXpgStringmd5(send_json);



    send_json = { accessPassword: encrypt_string, operatorID: settings.XPG_OPERATOR_ID, username: user_detail.user_name, amount: user_detail.balance, transactionID: transactionIDd };
    let send_string = globalFunction.convertXpgString(send_json);


    let response2 = await axios.post(settings.XPG_WITHDRAW_AMOUNT, send_string, {
        headers: { 'Content-Type': 'text/plain' }
    });

    let res_json = xmlParser.xml2json(response2.data);
    //res_json=JSON.parse(res_json);
    //console.log("res_json---",res_json);

    if (res_json.response.errorCode != "0") {
        return false;
    }
    return true;

}


async function GetEzugiUserAccountBalance(user_detail) {
    let ip_address = settings.EZUGI_WHITE_LIST_IP;

    let send_json2 = { agent_id: settings.EZUGI_AGENT_ID, username: settings.EZUGI_AGENT_USERNAME, session_ip: ip_address, session_token: user_detail.ezugi_session_token };


    let token2 = globalFunction.GenerateEzugiToken(send_json2);



    send_json2 = { agent_id: settings.EZUGI_AGENT_ID, username: settings.EZUGI_AGENT_USERNAME, session_ip: ip_address, session_token: user_detail.ezugi_session_token, request_token: token2 };

    let send_string2 = globalFunction.convertEzugiString(send_json2);
    let response2 = await axios.get(settings.EZUGI_GET_BALANCE + send_string2);
    let res_json2 = response2.data;

    return res_json2;
}

async function EzugiDepositeBalance(user_detail) {
    let ip_address = settings.EZUGI_WHITE_LIST_IP;

    let send_json2 = { agent_id: settings.EZUGI_AGENT_ID, username: settings.EZUGI_AGENT_USERNAME, session_ip: ip_address, session_token: user_detail.ezugi_session_token, payment_method: 1, amount: user_detail.balance };


    let token2 = globalFunction.GenerateEzugiToken(send_json2);



    send_json2 = { agent_id: settings.EZUGI_AGENT_ID, username: settings.EZUGI_AGENT_USERNAME, session_ip: ip_address, session_token: user_detail.ezugi_session_token, payment_method: 1, amount: user_detail.balance, request_token: token2 };

    let send_string2 = globalFunction.convertEzugiString(send_json2);
    let response2 = await axios.get(settings.EZUGI_DEPOSITE_AMOUNT + send_string2);
    let res_json2 = response2.data;



    if (res_json2.error_code != "0") {
        return false;
    }
    return true;

}

async function EzugiWithdrawBalance(user_detail) {
    let ip_address = settings.EZUGI_WHITE_LIST_IP;

    let send_json2 = { agent_id: settings.EZUGI_AGENT_ID, username: settings.EZUGI_AGENT_USERNAME, session_ip: ip_address, session_token: user_detail.ezugi_session_token, payment_method: 1, amount: user_detail.balance };


    let token2 = globalFunction.GenerateEzugiToken(send_json2);



    send_json2 = { agent_id: settings.EZUGI_AGENT_ID, username: settings.EZUGI_AGENT_USERNAME, session_ip: ip_address, session_token: user_detail.ezugi_session_token, payment_method: 1, amount: user_detail.balance, request_token: token2 };

    let send_string2 = globalFunction.convertEzugiString(send_json2);
    let response2 = await axios.get(settings.EZUGI_WITHDRAW_AMOUNT + send_string2);
    let res_json2 = response2.data;



    if (res_json2.error_code != "0") {
        return false;
    }
    return true;

}





async function keepAlive(req, res) {



    const keepactiveschema = Joi.object({
        type: Joi.number().required(),

    });
    try {
        await keepactiveschema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let external_type = req.body.type;
    //let  external_type=1;


    let { id } = req.headers;
    //console.log("req.headers-------",req.headers);

    let checkAuth = req.headers.authorization;
    let authorization = await userService.getUserAuthorization(id);

    let checkAuth2 = checkAuth.replace('Bearer ', '');
    if (authorization.data !== null && (checkAuth2 !== authorization.data.device_id || authorization.data.lockUser == 'Y' || authorization.data.closeUser == 'Y')) {
        return apiUnauthorizedRes(req, res, 'Not authorized');
    }

    // let getUserByid = await userService.getUserNameAndPasswordByIdXpg(id);

    // if (getUserByid.statusCode === CONSTANTS.SUCCESS) {

    let updateData = await userService.xpgUpdateUserActiveTime(id, "0", external_type);
    return apiSuccessRes(req, res, 'Success.');
    if (updateData.statusCode === CONSTANTS.NOT_FOUND) {
        return apiErrorRes(req, res, 'Invalid User.', CONSTANTS.DATA_NULL, 101);
    }
    if (updateData.statusCode != CONSTANTS.SUCCESS) {
        return apiErrorRes(req, res, 'Error In xpg update user active time.');
    }

    return apiSuccessRes(req, res, 'Success.');
    // } else if (getUserByid.statusCode === CONSTANTS.ACCESS_DENIED) {
    // 	return apiErrorRes(req, res, 'Invalid id.');
    // } else {
    // 	return apiErrorRes(req, res, 'Server error.');
    // }


}

async function xpgCron(req, res) {
    return await xpgCronInner(req, res, 0);


}


async function xpgCronInner(req, res, login_id) {


    let getactiveuserdata = await userService.getXpgActiveUserData(login_id, 1);
    let getactiveuserdataEzugi = await userService.getXpgActiveUserData(login_id, 2);


    if (getactiveuserdata.statusCode === CONSTANTS.NOT_FOUND && getactiveuserdataEzugi.statusCode === CONSTANTS.NOT_FOUND) {
        console.log("No Active user Found.-----------------", "No Active user Found.")
        return apiErrorRes(req, res, 'No Active user Found.');
    }
    /*if (getactiveuserdata.statusCode != CONSTANTS.SUCCESS || getactiveuserdataEzugi.statusCode != CONSTANTS.SUCCESS) {
        return apiErrorRes(req, res, 'Error In  Fetch all Users.');
    }*/

    var user_names = [];

    for (var i = 0; i < getactiveuserdata.data.length; i++) {
        user_names.push(getactiveuserdata.data[i].user_name);

    }
    console.log("user_names----", user_names);
    var returnData = [];
    if (user_names.length > 0) {

        let user_names_string = user_names.join();
        let user_balances = await GetXpgUserAccountBalances(user_names_string);
        if (user_balances.response.errorCode == 0) {
            //return apiErrorRes(req, res, 'Error in xpg fetch all users balance.');

            let balances_json = globalFunction.decompressGzipdat(user_balances.response.CompressedData);

            console.log("balances_json---", balances_json);

            if (!Array.isArray(balances_json.accountBalances.accountBalance)) {
                balances_json.accountBalances.accountBalance = [balances_json.accountBalances.accountBalance];
            }


            for (var i = 0; i < balances_json.accountBalances.accountBalance.length; i++) {

                let open_balance = getactiveuserdata.data[i].open_balance;
                let balance = getactiveuserdata.data[i].balance;
                let returnDataObject = { user_name: getactiveuserdata.data[i].user_name, open_balance: open_balance, balance: balance, type: 1 };
                let UserBalance = balances_json.accountBalances.accountBalance[i].balance;

                let modify_balance = UserBalance - open_balance;
                let final_balance = balance + modify_balance;
                returnDataObject.final_balance = final_balance;
                returnDataObject.modify_balance = modify_balance;

                let xpgupdateamount = final_balance - UserBalance;
                returnDataObject.xpgupdateamount = xpgupdateamount;


                if (xpgupdateamount < 0) {
                    let xpgupdateamountw = Math.abs(xpgupdateamount);
                    let updateFunDataa = { user_name: getactiveuserdata.data[i].user_name, balance: xpgupdateamountw };
                    let WithdrawData = await xpgWithdrawBalance(updateFunDataa);
                    if (!WithdrawData) {

                        returnDataObject.errormessage = "Balance withdraw Error.";
                        returnData.push(returnDataObject);
                        continue;
                    }

                } else if (xpgupdateamount > 0) {
                    let updateFunDataa = { user_name: getactiveuserdata.data[i].user_name, balance: xpgupdateamount };

                    let balanceData = await xpgDepositeBalance(updateFunDataa);
                    if (!balanceData) {

                        returnDataObject.errormessage = "Balance Deposite Error.";
                        returnData.push(returnDataObject);
                        continue;
                    }

                }


                if (open_balance != final_balance) {


                    let activetableupdate = await userService.xpgUpdateUserAmout(getactiveuserdata.data[i].user_name, final_balance);
                    if (activetableupdate.statusCode != CONSTANTS.SUCCESS) {


                        returnDataObject.errormessage = "error in update open balance.";
                        returnData.push(returnDataObject);
                        continue;
                    }

                }

                if (balance != final_balance) {

                    let usertableupdate = await userService.userTableUpdateAmout(getactiveuserdata.data[i].user_name, final_balance, modify_balance);

                    if (usertableupdate.statusCode != CONSTANTS.SUCCESS) {

                        returnDataObject.errormessage = "error in update user balance.";
                        returnData.push(returnDataObject);
                        continue;
                    }
                    if (modify_balance > 0) {
                        await userService.userXpgProfitAmout(getactiveuserdata.data[i].user_name, modify_balance);
                    }

                }



                returnData.push(returnDataObject);

            }
        }
    }




    for (var i = 0; i < getactiveuserdataEzugi.data.length; i++) {

        let open_balance = getactiveuserdataEzugi.data[i].open_balance;
        let balance = getactiveuserdataEzugi.data[i].balance;
        let returnDataObject = { user_name: getactiveuserdataEzugi.data[i].user_name, open_balance: open_balance, balance: balance, type: 2 };


        let UseraccountBalance = await GetEzugiUserAccountBalance({ ezugi_session_token: getactiveuserdataEzugi.data[i].session_token });
        console.log('UseraccountBalance Ezugi', UseraccountBalance);
        if (UseraccountBalance.error_code != "0") {

            returnDataObject.errormessage = "Ezugi balance error";
            returnData.push(returnDataObject);
            continue;
        }





        let UserBalance = UseraccountBalance.balance;

        let modify_balance = UserBalance - open_balance;
        let final_balance = balance + modify_balance;
        returnDataObject.final_balance = final_balance;
        returnDataObject.modify_balance = modify_balance;

        let xpgupdateamount = final_balance - UserBalance;
        returnDataObject.xpgupdateamount = xpgupdateamount;


        if (xpgupdateamount < 0) {
            let xpgupdateamountw = Math.abs(xpgupdateamount);
            let updateFunDataa = { balance: xpgupdateamountw, ezugi_session_token: getactiveuserdataEzugi.data[i].session_token };
            let WithdrawData = await EzugiWithdrawBalance(updateFunDataa);
            if (!WithdrawData) {
                returnDataObject.errormessage = "Balance withdraw Error.";
                returnData.push(returnDataObject);
                continue;
            }

        } else if (xpgupdateamount > 0) {
            let updateFunDataa = { balance: xpgupdateamount, ezugi_session_token: getactiveuserdataEzugi.data[i].session_token };

            let balanceData = await EzugiDepositeBalance(updateFunDataa);
            if (!balanceData) {
                returnDataObject.errormessage = "Balance Deposite Error.";
                returnData.push(returnDataObject);
                continue;
            }

        }

        /*if(xpgupdateamount<0){
            let xpgupdateamountw=Math.abs(xpgupdateamount);
            let updateFunDataa={user_name:getactiveuserdataEzugi.data[i].user_name,balance:xpgupdateamountw};
            let WithdrawData=await xpgWithdrawBalance(updateFunDataa);
            if(!WithdrawData){
            	
                returnDataObject.errormessage="Balance withdraw Error.";
                  returnData.push(returnDataObject);
                continue;
            }
        	
        }else if(xpgupdateamount>0){
            let updateFunDataa={user_name:getactiveuserdataEzugi.data[i].user_name,balance:xpgupdateamount};

            let balanceData=await xpgDepositeBalance(updateFunDataa);
            if(!balanceData){
            	
                returnDataObject.errormessage="Balance Deposite Error.";
                  returnData.push(returnDataObject);
                continue;
            }

        }*/


        if (open_balance != final_balance) {


            let activetableupdate = await userService.xpgUpdateUserAmout(getactiveuserdataEzugi.data[i].user_name, final_balance, 2);
            //let activetableupdate = await userService.xpgUpdateUserAmout(getactiveuserdataEzugi.data[i].user_name,final_balance,modify_balance);

            if (activetableupdate.statusCode != CONSTANTS.SUCCESS) {


                returnDataObject.errormessage = "error in update open balance.";
                returnData.push(returnDataObject);
                continue;
            }

        }

        if (balance != final_balance) {

            let usertableupdate = await userService.userTableUpdateAmout(getactiveuserdataEzugi.data[i].user_name, final_balance, modify_balance);

            if (usertableupdate.statusCode != CONSTANTS.SUCCESS) {

                returnDataObject.errormessage = "error in update user balance.";
                returnData.push(returnDataObject);
                continue;
            }
            if (modify_balance > 0) {
                await userService.userEzugiProfitAmout(getactiveuserdataEzugi.data[i].user_name, modify_balance);
            }



        }



        returnData.push(returnDataObject);

    }






    return apiSuccessRes(req, res, 'Success.', returnData);


}

async function xpgstatementCron(req, res) {

    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    let getUserDetailsFromDB = await userService.globalSettings();

    d = getUserDetailsFromDB.data.created_at;
    // d = new Date('2020-07-18 13:45:30').getTime();

    var date_ticks = globalFunction.datetickvalue(d);
    var toDate = globalFunction.datetickvalue(Date.now());

    let send_json = { operatorID: settings.XPG_OPERATOR_ID, fromDate: date_ticks, getTipActivity: 1, getExternalGamesActivity: 1 };
    let encrypt_string = globalFunction.convertXpgStringmd5(send_json);



    send_json = { accessPassword: encrypt_string, operatorID: settings.XPG_OPERATOR_ID, fromDate: date_ticks, getTipActivity: 1, getExternalGamesActivity: 1 };
    let send_string = globalFunction.convertXpgString(send_json);


    let response2 = await axios.post(settings.XPG_GETOPERATORACTIVITYREPORT, send_string, {
        headers: { 'Content-Type': 'text/plain' }
    });

    let res_json = xmlParser.xml2json(response2.data);
    //res_json=JSON.parse(res_json);




    if (res_json.response.errorCode != 0) {
        return apiErrorRes(req, res, 'Error in xpg fetch all users balance.');
    }
    //console.log('res_json.response.CompressedData',res_json.response.CompressedData);
    let balances_json = globalFunction.decompressGzipdat(res_json.response.CompressedData);
    console.log('balances_jsonnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn', balances_json);
    // var user_names=[];
    //console.log('balances_json',balances_json);
    if (balances_json.Data == '' || balances_json.Data == null) {
        return apiErrorRes(req, res, 'Data not found!');
    }
    var rounds_object = {};
    console.log("balances_json------------------", balances_json);
    if (!Array.isArray(balances_json.Data['Rounds']) && ("Rounds" in balances_json.Data)) {
        balances_json.Data.Rounds = [balances_json.Data['Rounds']];
    }

    if (("Rounds" in balances_json.Data)) {
        for (var j = 0; j < balances_json.Data['Rounds'].length; j++) {
            rounds_object[balances_json.Data['Rounds'][j].RoundID] = balances_json.Data['Rounds'][j];

        }
    }



    //return apiSuccessRes(req, res, 'Success.',balances_json);		

    //	console.log("data--------------",balances_json.Data);
    var user_names_statements = {};
    for (const property in balances_json.Data) {

        if (property.includes('Rounds') || property.includes('Hands') || property.includes('CarribeanPokerBets') || property.includes('Results')) {
            continue;
        }

        //console.log("length-----",property+"--------"+balances_json.Data[property].length);
        if (!Array.isArray(balances_json.Data[property])) {
            balances_json.Data[property] = [balances_json.Data[property]];
        }

        for (var i = 0; i < balances_json.Data[property].length; i++) {
            var single_json = {};

            if (property == "TipsActivity") {
                single_json.Username = balances_json.Data[property][i].NickName;
                single_json.RoundId = balances_json.Data[property][i].RoundId;
                single_json.TipAmount = parseFloat(balances_json.Data[property][i].Amount);
                single_json.BetAmount = 0;
                single_json.PrizeAmount = 0;
                single_json.TransactionDate = balances_json.Data[property][i].TransactionDate;

                single_json.GameType = rounds_object[single_json.RoundId].GameType;
                single_json.GameName = rounds_object[single_json.RoundId].GameName;
                single_json.GameID = rounds_object[single_json.RoundId].GameID;
            } else if (property == "ExternalGamesActivity") {

                single_json.Username = balances_json.Data[property][i].NickName;
                single_json.RoundId = balances_json.Data[property][i].RoundId;
                single_json.TipAmount = 0;
                single_json.BetAmount = parseFloat(balances_json.Data[property][i].Amount);
                single_json.PrizeAmount = parseFloat(balances_json.Data[property][i].Prize);
                single_json.TransactionDate = balances_json.Data[property][i].UpdateDate;

                single_json.GameType = balances_json.Data[property][i].GameProvider;
                single_json.GameName = balances_json.Data[property][i].GameName;
                single_json.GameID = balances_json.Data[property][i].GameID;

            } else if (property == "SinglePokerBets") {
                single_json.Username = balances_json.Data[property][i].Username;
                single_json.RoundId = balances_json.Data[property][i].RoundID;
                single_json.TipAmount = 0;
                single_json.BetAmount = parseFloat(balances_json.Data[property][i].AnteBetAmount) + parseFloat(balances_json.Data[property][i].FlopBetAmount) + parseFloat(balances_json.Data[property][i].TurnBetAmount) + parseFloat(balances_json.Data[property][i].RiverBetAmount) + parseFloat(balances_json.Data[property][i].BonusBetAmount);
                single_json.PrizeAmount = parseFloat(balances_json.Data[property][i].BetPrize) + parseFloat(balances_json.Data[property][i].BonusPrize);
                single_json.TransactionDate = rounds_object[single_json.RoundId].RoundDate;

                single_json.GameType = rounds_object[single_json.RoundId].GameType;
                single_json.GameName = rounds_object[single_json.RoundId].GameName;
                single_json.GameID = rounds_object[single_json.RoundId].GameID;
            } else if (property == "SicBoBets") {
                single_json.Username = balances_json.Data[property][i].Username;
                single_json.RoundId = balances_json.Data[property][i].RoundID;
                single_json.TipAmount = 0;
                single_json.BetAmount = parseFloat(balances_json.Data[property][i].BetAmount);
                single_json.PrizeAmount = parseFloat(balances_json.Data[property][i].BetPrize);
                single_json.TransactionDate = rounds_object[single_json.RoundId].RoundDate;

                single_json.GameType = rounds_object[single_json.RoundId].GameType;
                single_json.GameName = rounds_object[single_json.RoundId].GameName;
                single_json.GameID = rounds_object[single_json.RoundId].GameID;
            } else {

                single_json.Username = balances_json.Data[property][i].Username;
                single_json.RoundId = balances_json.Data[property][i].RoundID;
                single_json.TipAmount = 0;
                single_json.BetAmount = parseFloat(balances_json.Data[property][i].BetAmount);
                single_json.PrizeAmount = parseFloat(balances_json.Data[property][i].PrizeAmount);
                single_json.TransactionDate = rounds_object[single_json.RoundId].RoundDate;

                single_json.GameType = rounds_object[single_json.RoundId].GameType;
                single_json.GameName = rounds_object[single_json.RoundId].GameName;
                single_json.GameID = rounds_object[single_json.RoundId].GameID;
            }

            //console.log("rounds_object[single_json.RoundId]----",rounds_object[single_json.RoundId]);


            var user_array_key = single_json.RoundId + "_" + single_json.Username;

            if (!(user_array_key in user_names_statements)) {

                if (property == "TipsActivity") {
                    single_json.TipsActivity = [balances_json.Data[property][i]];
                    single_json.BetsHistory = [];
                } else {
                    single_json.TipsActivity = [];
                    single_json.BetsHistory = [balances_json.Data[property][i]];
                }

                user_names_statements[user_array_key] = single_json;
            } else {
                user_names_statements[user_array_key].TipAmount = parseFloat(user_names_statements[user_array_key].TipAmount) + parseFloat(single_json.TipAmount);
                user_names_statements[user_array_key].BetAmount = parseFloat(user_names_statements[user_array_key].BetAmount) + parseFloat(single_json.BetAmount);
                user_names_statements[user_array_key].PrizeAmount = parseFloat(user_names_statements[user_array_key].PrizeAmount) + parseFloat(single_json.PrizeAmount);
                if (property == "TipsActivity") {
                    user_names_statements[user_array_key].TipsActivity.push(balances_json.Data[property][i]);
                } else {
                    user_names_statements[user_array_key].BetsHistory.push(balances_json.Data[property][i]);
                }
            }
            //console.log('avinash---------',user_names_statements[user_array_key]);

            //await userService.updateUserAcStatement(user_names_statements[user_array_key]);




        }

    }
    let updateDateLastCron = 0;
    for (const index in user_names_statements) {
        var d = new Date(user_names_statements[index].TransactionDate);
        var timeStamp = d.getTime();
        if (updateDateLastCron < timeStamp) {
            updateDateLastCron = timeStamp;
        }
        //console.log('date--- '+user_names_statements[index].TransactionDate+' ----time ---- '+timeStamp);				
        await userService.updateUserAcStatement(user_names_statements[index], ip_address);

    }
    if (updateDateLastCron > 0) {
        await userService.updateXpgStatementDate(updateDateLastCron);
    }
    console.log('updateDateLastCron---' + Math.floor(updateDateLastCron / 1000));
    return apiSuccessRes(req, res, 'Success.', user_names_statements);


}

async function ezugistatementCron(req, res) {
    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    var allEzugiUsers = await userService.GetEzugiUsers();

    if (allEzugiUsers.statusCode === CONSTANTS.SERVER_ERROR) {
        return apiErrorRes(req, res, "Server error in get ezugi users from database.");
    }
    //console.log("allEzugiUsers------",allEzugiUsers.data);

    var ezugi_users_array = {};

    for (var i = 0; i < allEzugiUsers.data.recordset.length; i++) {

        ezugi_users_array[allEzugiUsers.data.recordset[i].ezugi] = allEzugiUsers.data.recordset[i].user_name;

    }


    let getUserDetailsFromDB = await userService.globalSettings();
    let date = new Date();
    date.setTime(getUserDetailsFromDB.data.ezugi_created_at);
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();
    let hours = date.getHours();
    let minutes = "0" + date.getMinutes();
    let seconds = "0" + date.getSeconds();
    let convdataTime = year + '-' + month + '-' + day + ' ' + hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);

    let getcurrentdate = globalFunction.currentDateTimeStamp();

    let currentDate = new Date(getcurrentdate * 1000);
    let currentyear = currentDate.getFullYear();
    let currentmonth = currentDate.getMonth() + 1;
    let currentday = currentDate.getDate();
    let currenthours = currentDate.getHours();
    let currentminutes = "0" + currentDate.getMinutes();
    let currentseconds = "0" + currentDate.getSeconds();
    let currentconvdataTime = currentyear + '-' + currentmonth + '-' + currentday + ' ' + currenthours + ':' + currentminutes.substr(-2) + ':' + currentseconds.substr(-2);

    console.log('convdataTime', convdataTime + '-------- ' + getUserDetailsFromDB.data.ezugi_created_at);
    console.log('currentconvdataTime', currentconvdataTime);
    var start_date = convdataTime; //"2020-7-15 12:20:20";
    //var start_date= "2020-07-16 18:13:00";
    var end_date = currentconvdataTime; //"2020-07-15 23:59:59";	 
    let send_json2 = { DataSet: "per_round_report", APIID: settings.EZUGI_APP_ID, APIUser: settings.EZUGI_APP_USER, StartTime: start_date, EndTime: end_date, Limit: 500 };

    let token2 = globalFunction.GenerateEzugiToken_BO(send_json2);

    send_json2 = { DataSet: "per_round_report", APIID: settings.EZUGI_APP_ID, APIUser: settings.EZUGI_APP_USER, StartTime: start_date, EndTime: end_date, Limit: 500, RequestToken: token2 };
    let send_string2 = globalFunction.convertEzugiString(send_json2);

    var config = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }

    let response2 = await axios.post(settings.EZUGI_GETOPERATORACTIVITYREPORT, qs.stringify(send_json2), config);



    let res_json2 = response2.data;

    var user_names_statements = {};
    for (var i = 0; i < res_json2.data.length; i++) {
        var single_json = {};


        if (!(res_json2.data[i].UID in ezugi_users_array)) {

            continue;
        } else {

            res_json2.data[i].UID = ezugi_users_array[res_json2.data[i].UID];
        }

        /*if(res_json2.data[i].BetType=="Tip"){
            single_json.Username=res_json2.data[i].UID;
            single_json.RoundId=res_json2.data[i].RoundID;
            single_json.TipAmount=parseFloat(res_json2.data[i].Bet);
            single_json.BetAmount=0;
            single_json.PrizeAmount=0;
            single_json.TransactionDate=res_json2.data[i].DateInserted;

            single_json.GameType=res_json2.data[i].GameTypeName;
            single_json.GameName="";
            single_json.GameID=res_json2.data[i].GameTypeID;
        }else{


            single_json.Username=res_json2.data[i].UID;
            single_json.RoundId=res_json2.data[i].RoundID;
            single_json.TipAmount=0;
            single_json.BetAmount=parseFloat(res_json2.data[i].Bet);
            single_json.PrizeAmount=parseFloat(res_json2.data[i].Win);
            single_json.TransactionDate=res_json2.data[i].DateInserted;

            single_json.GameType=res_json2.data[i].GameTypeName;
            single_json.GameName="";
            single_json.GameID=res_json2.data[i].GameTypeID;


        }*/


        if (res_json2.data[i].BetType == "Table Bet") {
            continue;
        }

        if (res_json2.data[i].BetType == "Tip") {
            single_json.Username = res_json2.data[i].UID;
            single_json.RoundId = res_json2.data[i].RoundID;
            single_json.TipAmount = parseFloat(res_json2.data[i].Bet);
            single_json.BetAmount = 0;
            single_json.PrizeAmount = 0;
            single_json.TransactionDate = res_json2.data[i].RoundDateTime;

            single_json.GameType = res_json2.data[i].GameTypeName;
            single_json.GameName = "";
            single_json.GameID = res_json2.data[i].GameTypeID;
        } else {

            let GameS = JSON.parse(res_json2.data[i].GameString);
            let BetAmount = GameS.BetAmount;

            single_json.Username = res_json2.data[i].UID;
            single_json.RoundId = res_json2.data[i].RoundID;
            single_json.TipAmount = 0;
            //single_json.BetAmount=parseFloat(res_json2.data[i].Bet);
            single_json.BetAmount = parseFloat(BetAmount);
            single_json.PrizeAmount = parseFloat(res_json2.data[i].Win);
            single_json.TransactionDate = res_json2.data[i].RoundDateTime;

            single_json.GameType = res_json2.data[i].GameTypeName;
            single_json.GameName = "";
            single_json.GameID = res_json2.data[i].GameTypeID;


        }


        var user_array_key = single_json.RoundId + "_" + single_json.Username;

        if (!(user_array_key in user_names_statements)) {

            user_names_statements[user_array_key] = single_json;
        } else {
            user_names_statements[user_array_key].TipAmount = parseFloat(user_names_statements[user_array_key].TipAmount) + parseFloat(single_json.TipAmount);
            user_names_statements[user_array_key].BetAmount = parseFloat(user_names_statements[user_array_key].BetAmount) + parseFloat(single_json.BetAmount);
            user_names_statements[user_array_key].PrizeAmount = parseFloat(user_names_statements[user_array_key].PrizeAmount) + parseFloat(single_json.PrizeAmount);

        }

    }
    console.log('user_names_statements avinash ------ ', user_names_statements);
    let updateDateLastCron = 0;
    for (const index in user_names_statements) {
        var d = new Date(user_names_statements[index].TransactionDate);
        var timeStamp = d.getTime();
        if (updateDateLastCron < timeStamp) {
            updateDateLastCron = timeStamp;
        }

        await userService.updateUserEzugiAcStatement(user_names_statements[index], ip_address);

    }
    if (updateDateLastCron > 0) {
        await userService.updateEzugiStatementDate(updateDateLastCron);
    }

    return apiSuccessRes(req, res, 'Success.', user_names_statements);

}


async function ezugistatementCron_our(req, res) {

    var allEzugiUsers = await userService.GetEzugiUsers();

    if (allEzugiUsers.statusCode === CONSTANTS.SERVER_ERROR) {
        return apiErrorRes(req, res, "Server error in get ezugi users from database.");
    }
    //console.log("allEzugiUsers------",allEzugiUsers.data);

    var ezugi_users_array = {};

    for (var i = 0; i < allEzugiUsers.data.recordset.length; i++) {

        ezugi_users_array[allEzugiUsers.data.recordset[i].ezugi] = allEzugiUsers.data.recordset[i].user_name;

    }





    var start_date = "2020-7-18 05:59:11";
    var end_date = "2020-07-18 23:59:59";

    let send_json2 = { DataSet: "per_round_report", APIID: settings.EZUGI_APP_ID, APIUser: settings.EZUGI_APP_USER, StartTime: start_date, EndTime: end_date, Limit: 500 };

    let token2 = globalFunction.GenerateEzugiToken_BO(send_json2);

    send_json2 = { DataSet: "per_round_report", APIID: settings.EZUGI_APP_ID, APIUser: settings.EZUGI_APP_USER, StartTime: start_date, EndTime: end_date, Limit: 500, RequestToken: token2 };
    let send_string2 = globalFunction.convertEzugiString(send_json2);

    var config = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }

    let response2 = await axios.post(settings.EZUGI_GETOPERATORACTIVITYREPORT, qs.stringify(send_json2), config);



    let res_json2 = response2.data;

    var user_names_statements = {};
    for (var i = 0; i < res_json2.data.length; i++) {
        var single_json = {};


        if (!(res_json2.data[i].UID in ezugi_users_array)) {

            continue;
        } else {

            res_json2.data[i].UID = ezugi_users_array[res_json2.data[i].UID];
        }

        if (res_json2.data[i].BetType == "Table Bet") {
            continue;
        }

        if (res_json2.data[i].BetType == "Tip") {
            single_json.Username = res_json2.data[i].UID;
            single_json.RoundId = res_json2.data[i].RoundID;
            single_json.TipAmount = parseFloat(res_json2.data[i].Bet);
            single_json.BetAmount = 0;
            single_json.PrizeAmount = 0;
            single_json.TransactionDate = res_json2.data[i].RoundDateTime;

            single_json.GameType = res_json2.data[i].GameTypeName;
            single_json.GameName = "";
            single_json.GameID = res_json2.data[i].GameTypeID;
        } else {

            let GameS = JSON.parse(res_json2.data[i].GameString);
            let BetAmount = GameS.BetAmount;

            single_json.Username = res_json2.data[i].UID;
            single_json.RoundId = res_json2.data[i].RoundID;
            single_json.TipAmount = 0;
            //single_json.BetAmount=parseFloat(res_json2.data[i].Bet);
            single_json.BetAmount = parseFloat(BetAmount);
            single_json.PrizeAmount = parseFloat(res_json2.data[i].Win);
            single_json.TransactionDate = res_json2.data[i].RoundDateTime;

            single_json.GameType = res_json2.data[i].GameTypeName;
            single_json.GameName = "";
            single_json.GameID = res_json2.data[i].GameTypeID;


        }

        var user_array_key = single_json.RoundId + "_" + single_json.Username;

        if (!(user_array_key in user_names_statements)) {

            user_names_statements[user_array_key] = single_json;
        } else {
            user_names_statements[user_array_key].TipAmount = parseFloat(user_names_statements[user_array_key].TipAmount) + parseFloat(single_json.TipAmount);
            user_names_statements[user_array_key].BetAmount = parseFloat(user_names_statements[user_array_key].BetAmount) + parseFloat(single_json.BetAmount);
            user_names_statements[user_array_key].PrizeAmount = parseFloat(user_names_statements[user_array_key].PrizeAmount) + parseFloat(single_json.PrizeAmount);

        }

    }

    /*for (const index in user_names_statements) {
            	
        await userService.updateUserEzugiAcStatement(user_names_statements[index]);  

    }*/

    return apiSuccessRes(req, res, 'Success.', res_json2);

}


async function userFaurdCallApi(req, res) {
    try {
        const result = browser(req.headers['user-agent']);
        let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        let device_info = Object.keys(result)[0];
        let token = req.headers.authorization.replace('Bearer', '');
        let id;
        console.log('token', token);
        if (token === undefined || token == null || token == '') {
            id = 0;

        } else {
            console.log('aaaa');
            let { id } = req.headers.authorization;
        }
        let type = "F12";
        let description = "Invisual activities !";

        let data = { id, ip_address, device_info, type, description };
        console.log('data', data);
        let userFaurdCallApi = await userService.userFaurdCallApi(data);

        if (userFaurdCallApi.statusCode === CONSTANTS.SUCCESS) {
            //let resData={...getUserDetailsFromDB.data};
            return apiSuccessRes(req, res, 'Success');
        } else {
            return apiErrorRes(req, res, 'Oops! Something went wrong, Try again');
        }
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
}

function randomString(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}


function randomString(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

function decryptValueWith32RandomString(decryptValue) {
    let randomNumber = randomString(32, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
    let buff = new Buffer(decryptValue);
    let text = buff.toString('base64');
    let fristText = text.substring(0, 1);
    let secondText = text.substring(1, text.length);
    text = (fristText + '' + randomNumber + '' + secondText);

    return text;
}

function decryptBackLayValue(decryptValue) {
    let randomNumber = randomString(6, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
    console.log('decryptValue ', decryptValue);
    let buff = new Buffer(decryptValue);
    let text = buff.toString('base64');
    let fristText = text.substring(0, 1);
    let secondText = text.substring(1, text.length);
    text = (fristText + '' + randomNumber + '' + secondText);

    return text;
}


async function payment(req, res) {
    let {
        amount
    } = req.body;
    let { id } = req.headers;

    const profilechema = Joi.object({
        amount: Joi.number().required(),
        promocode: Joi.string().optional().allow('')
    });

    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    let data = { amount, id, ip_address };

    let paymentInitiated = await userService.paymentInitiated(data);
    let getUserDetails = await userService.getUserByUserId(id);

    if (paymentInitiated.statusCode === CONSTANTS.SUCCESS && getUserDetails.statusCode === CONSTANTS.SUCCESS) {
        delete data.id;
        let decodeString = id + "__" + paymentInitiated.data.transaction_id;
        data.transaction_id = decodeString;
        data.firstName = getUserDetails.data.user_name;
        data.lastname = getUserDetails.data.name;
        data.phone = getUserDetails.data.mobile;
        data.email = getUserDetails.data.email;
        //data.transaction_id = await decryptBackLayValue(decodeString);
        console.log(data);
        let response = await axios.post(settings.PAYMENT_CHECKOUT_URL, data, {
            headers: { 'Content-Type': 'application/json' }
        });

        res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Length': response.data.length });
        res.write(response.data);
        res.end();



    } else if (getUserByid.statusCode === CONSTANTS.ACCESS_DENIED) {
        return apiErrorRes(req, res, 'Invalid payment request.');
    } else {
        return apiErrorRes(req, res, 'Error payment request');
    }
}


async function paymentLog(req, res) {
    let {
        data,
        status
    } = req.body;
    let { id } = req.headers;

    const profilechema = Joi.object({
        data: Joi.object().required(),
        status: Joi.string().required(),
    });
    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    let requestData = { data, status, ip_address };

    let paymentLog = await userService.paymentLog(requestData);

    if (paymentLog.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success', paymentLog.data);
    } else if (paymentLog.statusCode === CONSTANTS.ACCESS_DENIED) {
        return apiErrorRes(req, res, 'Invalid current password.');
    } else {
        return apiErrorRes(req, res, 'Error to update password.');
    }
}


async function cashfreesuccess(req, res) {
    let {
        data
    } = req.body;

    const profilechema = Joi.object({
        data: Joi.object().required(),
    });
    try {
        await profilechema.validate(req.body, {
            abortEarly: true,
            allowUnknown: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    let requestData = { data, status: 'SUCCESS', ip_address };

    let paymentLog = await userService.paymentLog(requestData);

    if (paymentLog.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success', data);
    } else if (paymentLog.statusCode === CONSTANTS.ACCESS_DENIED) {
        return apiErrorRes(req, res, 'Invalid current password.');
    } else {
        return apiErrorRes(req, res, 'Error to update password.');
    }
}



async function cashfreenotify(req, res) {
    let {
        data
    } = req.body;

    const profilechema = Joi.object({
        data: Joi.object().required(),
    });
    try {
        await profilechema.validate(req.body, {
            abortEarly: true,
            allowUnknown: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    let requestData = { data, status: "SUCCESS", ip_address };

    let paymentLog = await userService.paymentLog(requestData);

    if (paymentLog.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success', data);
    } else if (paymentLog.statusCode === CONSTANTS.ACCESS_DENIED) {
        return apiErrorRes(req, res, 'Invalid current password.');
    } else {
        return apiErrorRes(req, res, 'Error to update password.');
    }
}

async function getAccountDetails(req, res) {
    let {
        type
    } = req.body;
    let { id } = req.headers;
    const profilechema = Joi.object({
        type: Joi.string().valid("W", "D").required(),
    });
    try {
        await profilechema.validate(req.body, {
            abortEarly: true,
            allowUnknown: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }

    let data = { id: id, type: type };
    let getUserDetailsFromDB = await userService.getAccountDetails(data);
    if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        return apiSuccessRes(req, res, 'Success', getUserDetailsFromDB.data);
    } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiSuccessRes(req, res, 'Account details not found.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiSuccessRes(req, res, 'Account details not found.', CONSTANTS.BLANK_ARRAY);
    }
}

function base64Decode(mainUserId) {

    let fristUserId = mainUserId.substring(0, 1);
    let secondUserId = mainUserId.substring(33, mainUserId.length);
    let data = fristUserId + secondUserId;
    let buff = new Buffer(data, 'base64');
    //let buff = Buffer.alloc(data, 'base64');		
    return buff.toString('ascii');

}
async function verifyOTP(req, res) {
    let {
        string,
        otp
    } = req.body;
    const profilechema = Joi.object({
        string: Joi.string().required(),
        otp: Joi.number().required(),
    });
    try {
        await profilechema.validate(req.body, {
            abortEarly: true,
            allowUnknown: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    let veryOTP = parseInt(await base64Decode(string));
    let data = { otpId: veryOTP, otp: otp, ip_address: ip_address };
    let getUserDetailsFromDB = await userService.getVerifyOTP(veryOTP);
    if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        if (getUserDetailsFromDB.data.register_otp == otp) {
            let parentInfo = getUserDetailsFromDB.data;
            let registerUser = await userService.verifyOTPRegister(data, parentInfo);

            return apiSuccessRes(req, res, 'Your account has been created, now you can login', registerUser.data);

        } else {
            return apiErrorRes(req, res, 'OTP not match. Please send valid OTP');

        }
    } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiErrorRes(req, res, 'OTP expired please resend.');
    } else {
        return apiErrorRes(req, res, 'OTP expired please resend.-');
    }
}


async function forgotOTP(req, res) {
    let {
        mobile
    } = req.body;
    const profilechema = Joi.object({
        mobile: Joi.number().required(),
    });
    try {
        await profilechema.validate(req.body, {
            abortEarly: true,
            allowUnknown: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    let veryOTP = { mobile: mobile, ip_address: ip_address };
    let getUserMobile = await userService.getuserbyusernameandmobile(mobile);
    if (mobile.toString().length !== 10) {
        return apiErrorRes(req, res, 'Invalid mobile number');
    }
    if (getUserMobile.statusCode !== CONSTANTS.SUCCESS) {
        return apiErrorRes(req, res, 'Mobile number not register.');
    }
    if (getUserMobile.data.length > 0) {
        veryOTP.user_id = getUserMobile.data[0].id;
    }
    let mobileLastDigits = mobile.toString().slice(-3);
    let getUserDetailsFromDB = await userService.forgotOTP(veryOTP);
    if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        let decryptValue = Number(getUserDetailsFromDB.data).toFixed(2);
        let response = await decryptValueWith32RandomString(decryptValue);
        return apiSuccessRes(req, res, 'OTP sent on ***' + mobileLastDigits, response);
    } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiErrorRes(req, res, 'OTP expired please resend.');
    } else {
        return apiErrorRes(req, res, 'OTP expired please resend.-');
    }
}

async function forgotOTPverify(req, res) {
    let {
        string,
        otp,
        password,
        confirmpassword
    } = req.body;
    const profilechema = Joi.object({
        string: Joi.string().required(),
        otp: Joi.number().required(),
        password: Joi.string().required(),
        confirmpassword: Joi.string().required(),
    });
    try {
        await profilechema.validate(req.body, {
            abortEarly: true,
            allowUnknown: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (password !== confirmpassword) {
        return apiErrorRes(req, res, 'Password and confirm password is not same.');
    }
    let veryOTP = parseInt(await base64Decode(string));
    let data = { otpId: veryOTP, otp: otp, ip_address: ip_address, password: password };
    let getUserDetailsFromDB = await userService.forgotOTPverify(veryOTP);
    if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        if (getUserDetailsFromDB.data.forgot_password_otp == otp) {
            let parentInfo = getUserDetailsFromDB.data;
            let registerUser = await userService.forgotOTPpasswordUpdate(data, parentInfo);

            return apiSuccessRes(req, res, 'Password has changed successfully.', registerUser.data);

        } else {
            return apiErrorRes(req, res, 'OTP not match. Please send valid OTP');

        }
    } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiErrorRes(req, res, 'OTP expired please resend.');
    } else {
        return apiErrorRes(req, res, 'OTP expired please resend.-');
    }
}

async function registerOTPresend(req, res) {
    let {
        string
    } = req.body;
    const profilechema = Joi.object({
        string: Joi.string().required(),
    });
    try {
        await profilechema.validate(req.body, {
            abortEarly: true,
            allowUnknown: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    let veryOTP = parseInt(await base64Decode(string));

    let getUserDetailsFromDB = await userService.registerOTPresend(veryOTP);
    let data = { otpId: veryOTP, ip_address: ip_address, mobile: getUserDetailsFromDB.data.mobile };
    if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        let mobile = getUserDetailsFromDB.data.mobile;
        mobile = mobile.toString().slice(-3);
        let registerUser = await userService.registerOTPresendUpdate(data);
        if (registerUser.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'OTP sent on ***' + mobile, CONSTANTS.DATA_NULL);
        } else {
            return apiErrorRes(req, res, 'No Record Found');
        }
    } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiErrorRes(req, res, 'No Record Found');
    } else {
        return apiErrorRes(req, res, 'Resend otp server error ');
    }
}


async function forgotOTPresend(req, res) {
    let {
        string
    } = req.body;
    const profilechema = Joi.object({
        string: Joi.string().required(),
    });
    try {
        await profilechema.validate(req.body, {
            abortEarly: true,
            allowUnknown: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    let veryOTP = parseInt(await base64Decode(string));
    let getUserDetailsFromDB = await userService.forgotOTPresend(veryOTP);
    let data = { otpId: veryOTP, ip_address: ip_address, mobile: getUserDetailsFromDB.data.mobile };
    console.log('getUserDetailsFromDB ------------ ', getUserDetailsFromDB);
    if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        let mobile = getUserDetailsFromDB.data.mobile;
        mobile = mobile.toString().slice(-3);
        let registerUser = await userService.forgotOTPresendUpdate(data);
        if (registerUser.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'OTP sent on ***' + mobile, CONSTANTS.DATA_NULL);
        } else {
            return apiErrorRes(req, res, 'No Record Found dddd');
        }
    } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
        return apiErrorRes(req, res, 'No Record Found');
    } else {
        return apiErrorRes(req, res, 'Resend otp server error ');
    }
}



async function payment_process(req, res) {



    var data = req.body;

    var status = 'Post Initiated';

    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    let requestData = { data, status, ip_address };

    let paymentLog = await userService.paymentLog(requestData);

    var custname = data.firstName;
    var custemail = 'pankaj@gmail.com';
    var custmobile = data.phone;
    var custaddressline1 = 'None';
    var custaddressline2 = 'None';
    var custaddresscity = 'None';
    var custaddressstate = 'None';
    var custaddresscountry = 'India';
    var custaddresspostalcode = '000000';
    var orderid = data.transaction_id;
    var ordervalue = data.amount;

    var data = new FormData();
    data.append('KP_ENVIRONMENT', settings.KP_ENVIRONMENT);
    data.append('KPMID', settings.KPMID);
    data.append('KPMIDKEY', settings.KPMIDKEY);
    data.append('CUST_NAME', custname);
    data.append('CUST_EMAIL', custemail);
    data.append('CUST_MOBILE', custmobile);
    data.append('CUST_ADDRESS_LINE1', custaddressline1);
    data.append('CUST_ADDRESS_LINE2', custaddressline2);
    data.append('CUST_ADDRESS_CITY', custaddresscity);
    data.append('CUST_ADDRESS_STATE', custaddressstate);
    data.append('CUST_ADDRESS_COUNTRY', custaddresscountry);
    data.append('CUST_ADDRESS_POSTAL_CODE', custaddresspostalcode);

    var config = {
        method: 'post',
        url: settings.KP_CREATE_CUSTOMER,
        headers: {
            ...data.getHeaders()
        },
        data: data
    };
    var response;
    axios(config)
        .then(function (response) {
            response = JSON.parse(JSON.stringify(response.data));

            var CustomerAPIStatus = response.status;
            if (CustomerAPIStatus == 'success') {
                var customerIdvalue = response.CUST_KP_ID;

                var data = new FormData();
                data.append('KP_ENVIRONMENT', settings.KP_ENVIRONMENT);
                data.append('KPMID', settings.KPMID);
                data.append('KPMIDKEY', settings.KPMIDKEY);
                data.append('CUST_KP_ID', customerIdvalue);
                data.append('TXN_CURRENCY', settings.KPCURRENCY);
                data.append('TXN_AMOUNT', ordervalue);
                data.append('ORDER_ID', orderid);

                var config = {
                    method: 'post',
                    url: settings.KP_CREATE_ORDER,
                    headers: {
                        ...data.getHeaders()
                    },
                    data: data
                };

                axios(config)
                    .then(function (response) {

                        var OrderDetails = JSON.parse(JSON.stringify(response.data));

                        var OrderAPIStatus = OrderDetails.status;
                        if (OrderAPIStatus == 'success') {
                            var KP_Txn_OrderID = OrderDetails.KP_Txn_OrderID;
                            var KP_Txn_Signature = OrderDetails.KP_Txn_Signature;
                            var KP_Txn_Token = OrderDetails.KP_Txn_Token;


                            res.render("payment", {
                                kpmid: settings.KPMID,
                                customerIdvalue: customerIdvalue,
                                order_id: KP_Txn_OrderID,
                                signature: KP_Txn_Signature,
                                token: KP_Txn_Token,
                                call_back: settings.CALLBACK_URL,
                                kp_txn: settings.KP_TXN_URL,
                                OrderAPIStatus: OrderAPIStatus,
                                CustomerAPIStatus: CustomerAPIStatus
                            });

                        } else {
                            return apiErrorRes(req, res, 'Something went wrong. Please try again later');
                        }
                    })
                    .catch(function (error) {
                        return apiErrorRes(req, res, 'Something went wrong. Please try again later');
                    });
            } else {
                return apiErrorRes(req, res, 'Something went wrong. Please try again later');
            }
        })
        .catch(function (error) {
            return apiErrorRes(req, res, 'Something went wrong. Please try again later');
        });
}


async function payment_response(req, res) {

    var data = req.body;

    var status = 'SUCCESS';

    const responseData = {
        orderId: data.midorderid,
        orderAmount: parseFloat(data.txn_amount),
        referenceId: data.txn_id,
        txStatus: data.txn_status,
        paymentMode: data.mode,
        txMsg: "Doe",
        txTime: Date.parse(data.txn_time),
        transaction_id: data.midorderid,
        amount: parseFloat(data.txn_amount)
    };

    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    let requestData = { "data": responseData, status };

    let paymentLog = await userService.paymentLog(requestData);

    let finalData = { "data": responseData, status, ip_address };

    let finalPaymentLog = await userService.paymentLog(finalData);

    res.render("response", {
        midorderid: data.midorderid,
        txn_amount: data.txn_amount,
        txn_id: data.txn_id,
        txn_currency: data.txn_currency,
        mode: data.mode,
        txn_status: data.txn_status,
        txn_time: data.txn_time,
        txn_mid: data.txn_mid
    });
}

async function uploadDepositeFile(req, res) {

    let {
        attachment
    } = req.body;
    let ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    let { id } = req.headers;

    const profilechema = Joi.object({
        attachment: Joi.string().allow('').optional(),
    });


    try {
        await profilechema.validate(req.body, {
            abortEarly: true
        });
    } catch (error) {
        return apiErrorRes(req, res, error.details[0].message);
    }
    let reqData = {
        attachment,
        ip_address,
        id
    };

    let makeUserDetailsFromDB = await userService.uploadDepositeFile(reqData);
    if (makeUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
        let message = 'Kyc submitted successfully';
        return apiSuccessRes(req, res, message, makeUserDetailsFromDB.data);
    } else if (makeUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {

        return apiSuccessRes(req, res, 'not found.', CONSTANTS.BLANK_ARRAY);
    } else {
        return apiSuccessRes(req, res, 'Error in chat list.');
    }
}

async function getDefaultSetting(req, res) {
    try {
        let settingData = await userService.getDefaultSetting();
        if (settingData.statusCode === CONSTANTS.SUCCESS) {
            return apiSuccessRes(req, res, 'Saved successfully', settingData.data);
        } else {
            return apiErrorRes(req, res, 'Error Match Market List.');
        }

    } catch (error) {
        console.log(' error --------FUN------------------------------------------------------ ', error);
        return apiErrorRes(req, res, 'Enter valid param!', error);
    }
}

async function userActionLogs(req, res) {
  const { user_name } = req.body;
 // if (!user_name) {
   // return res.status(400).json({ success: false, message: "User name is required" });
 // }

  try {
    const findUserName = await userService.getUserByUserName(user_name);
    if (!findUserName || !findUserName.data || findUserName.data.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const user_id = findUserName.data[0].id;
    const getUserActionLogs = await userService.userLoginActionLlogs(user_id);
    return res.status(200).json({
      success: true,
      message: "User Action Logs",
      data: getUserActionLogs
    });

  } catch (error) {
    console.error("Error during getting action logs:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function userCasinoStatement(req, res) {
  const { user_name } = req.body;
  if (!user_name) {
    return res.status(400).json({ success: false, message: "User name required" });
  }

  try {
    const findUserName = await userService.getUserByUserName(user_name);
    if (!findUserName || !findUserName.data || findUserName.data.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const user_id = findUserName.data[0].id;
    const getUserActionLogs = await userService.userCasinoStatement(user_id);

    return res.status(200).json({
      success: true,
      message: "User Casino Statement",
      data: [getUserActionLogs]
    });

  } catch (error) {
    console.error("Error during getting casino statement logs:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}


const generateConnectionID = () => {
  const min = 10000;
  const max = 99999;
  return crypto.randomInt(min, max).toString();
};

async function getUserConnectionId(req, res) {
  let { user_name, password } = req.body;

  const loginchema = Joi.object({
    user_name: Joi.string().required(),
    password: Joi.string().required(),
  });
  try {
    await loginchema.validate(req.body, {
      abortEarly: true,
    });
  } catch (error) {
    return apiErrorRes(req, res, error.details[0].message);
  }
  let reqdaa = {
    user_name: user_name,
    password: password,
  };

  let getUserDetailsFromDB = await userService.userConnectionId(reqdaa);
  // console.log(getUserDetailsFromDB);

  if (getUserDetailsFromDB.statusCode === CONSTANTS.SUCCESS) {
    const connectionId = generateConnectionID(); // Generate a new unique connection ID

    // Update the connection_id in the database
    let updateResult = await userService.updateConnectionId(user_name, connectionId);

    if (updateResult.statusCode === CONSTANTS.SUCCESS) {
      return apiSuccessRes(req, res, `Please follow the instructions below for the Telegram 2-step verification:
        
        Find @BgSecureAuth_bot in your Telegram and type the /start command. The bot will respond to you.
        
        After this type /connect ${connectionId} and send it to the BOT.
        
        Now your Telegram account will be linked with your website account and 2-Step verification will be enabled.`);
    } else {
      return apiErrorRes(req, res, "Failed to update connection ID.");
    }
  } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_FOUND) {
    return apiErrorRes(req, res, "User does Not Exist.");
  } else if (getUserDetailsFromDB.statusCode === CONSTANTS.ACCESS_DENIED) {
    return apiErrorRes(req, res, "Please Enter Valid Username And Password");
  } else if (getUserDetailsFromDB.statusCode === CONSTANTS.NOT_VERIFIED) {
    return apiErrorRes(req, res, "User Name Is not Activated ");
  } else {
    return apiErrorRes(req, res, "Oops! Something went wrong, Try again");
  }
}



async function telegramConnectionVeify(req, res) {
  const { user_name, login_code } = req.body;

  try {
    const findUserName = await userService.getUserByUserName(user_name);
    const loginCode = findUserName.data[0].login_code;
    const codeExpire = new Date(findUserName.data[0].loginCode_Expiration);
    const currentTime = new Date();

    const thirtySeconds = 10 * 1000; // Thirty seconds in milliseconds
    const timeDifference = currentTime - codeExpire;
    const isExpired = timeDifference > thirtySeconds;

    if (isExpired) {
      return res.status(400).json({
        success: false, message: "Code expired"
      });
    } else if (loginCode === login_code) {
      const findUserName = await userService.loginTelegramCodeVarefication(user_name);

      return res.status(200).json({
        success: true, message: "Login code verified"
      });
    } else {
      return res.status(400).json({
        success: false, message: "Invalid verification code"
      });
    }
  } catch (error) {
    console.error("Error during verification:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

const generateDisableCode = () => {
  const min = 100000;
  const max = 999999;
  return crypto.randomInt(min, max).toString();
};

async function saveTelegramDisableCode(req, res) {
  try {
    const { user_name } = req.body;
    const checkUser = await userService.getUserByUserName(user_name);
    const userData = checkUser.data[0]
    if (userData.telegram_connected === '1') {
      const disableCode_Expiration = new Date(Date.now() + 60 * 1000);
      const disables_telegram_code = generateDisableCode();
      const sendCode = await userService.saveTelegramDisableCode(user_name, disables_telegram_code, disableCode_Expiration)
      try {
        await telegramBotService.sendMessage(
          userData.chatId,
          `Disable Code: ${disables_telegram_code}. Do not give this code to anyone, even if they say they are from Telegram! It's valid for 60 seconds.`
        );
        return apiSuccessRes(req, res, "Disable code sent successfully .");
      } catch (err) {
        console.error("Error sending message to Telegram:", err);
      }

    } else {
      return res.status(400).json({
        status: false,
        message: "user not connected to telegram"
      })
    }

  } catch (error) {
    console.error("Error during verification:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}


async function telegramDisableCodeVeify(req, res) {
  const { user_name, disables_telegram_code } = req.body;

  try {
    const findUserName = await userService.getUserByUserName(user_name);
    const loginCode = findUserName.data[0].disables_telegram_code;
    const codeExpire = new Date(findUserName.data[0].disableCode_Expiration);
    const currentTime = new Date();

    const thirtySeconds = 10 * 1000; // Thirty seconds in milliseconds
    const timeDifference = currentTime - codeExpire;
    const isExpired = timeDifference > thirtySeconds;

    if (isExpired) {
      return res.status(400).json({
        success: false, message: "Code expired"
      });
    } else if (disables_telegram_code === disables_telegram_code) {
      const findUserName = await userService.disableTelegramCodeVarefication(user_name);
      return res.status(200).json({
        success: true, message: "disable code verified"
      });
    } else {
      return res.status(400).json({
        success: false, message: "Invalid verification code"
      });
    }
  } catch (error) {
    console.error("Error during verification:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function teleConnectedStatus(req, res) {
  const { user_name } = req.body;
  try {
    const findUserName = await userService.getUserByUserName(user_name);
    const teleStatus = findUserName.data[0].telegram_connected;
    if (teleStatus == 1) {
      return res.status(200).json({
        success: true
      });
    } else {
      return res.status(200).json({
        success: false
      });
    }

  } catch (error) {
    console.error("Error during verification:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}


async function userExposureDetails(req, res) {
  const { user_name } = req.body;
  if (!user_name) {
    return res.status(400).json({ success: false, message: "User name is required" });
  }

  try {
    const findUserName = await userService.getUserByUserName(user_name);
    if (!findUserName || !findUserName.data || findUserName.data.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const user_id = findUserName.data[0].id;
    console.log("user_id",user_id)
    const getUserExposureDetails = await userService.userExposureDetails(user_id);

  //  console.log(getUserActionLogs)

   return res.status(200).json({
    success: true,
    message: "User Exposure Details",
    data: getUserExposureDetails
  });

  } catch (error) {
    console.error("Error during getting casino statement logs:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function userUnsettledBets(req, res) {
    const { user_name } = req.body;
    if (!user_name) {
        return res.status(400).json({ success: false, message: "User name is required" });
    }

    try {
        const findUserName = await userService.getUserByUserName(user_name);
        if (!findUserName || !findUserName.data || findUserName.data.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const user_id = findUserName.data[0].id;
        console.log("user_id", user_id)
        const getuserUnsettledBets = await userService.userUnsettledBets(user_id);

        //  console.log(getUserActionLogs)

        return res.status(200).json({
            success: true,
            message: "User Unsetteled Bets",
            data: getuserUnsettledBets
        });

    } catch (error) {
        console.error("Error during getting casino statement logs:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}

async function getRulesIndiaBet(req, res) {
    try {
        const rules = {
            note: {
                hindi: "नोट : सर्वर या वेबसाइट में किसी तरह की खराबी आने या बंद हो जाने पर केवल किए गए सौदे ही मान्य होंगे | ऐसी स्तिथि में किसी तरह का वाद-विवाद मान्य नहीं होगा | अंतिम फैसला कंपनी का होगा |",
                english: "Note: Only placed bets will be valid if there is a malfunction or shutdown on the server or website. No dispute will be entertained in such a situation. The final decision will be the company's."
            },
            msg: [
                {
                    hindi: "1. लॉग इन करने के बाद अपना पासवर्ड बदल लें |",
                    english: "1. Change your password after logging in."
                },
                {
                    hindi: "2. खेल रद्द या टाई होने पर सभी सौदे रद्द कर दिए जाएंगे और लेनदेन सेशन जो पूरा हो गया है उस पर किया जाएगा।",
                    english: "2. All bets will be void if the game is canceled or tied, and settlement will be based on the completed session."
                },
                {
                    hindi: "3. सभी एडवांस सौदे टॉस के बाद लिए जाएंगे |",
                    english: "3. All advance bets will be accepted after the toss."
                },
                {
                    hindi: "4. मैच के दौरान भाव को देख और समझ कर ही सौदा करें | किये गए किसी भी सौदे को हटाया या बदला नहीं जायेगा | सभी सौदे के लिए आप स्वयं जिम्मेवार हैं |",
                    english: "4. Place bets carefully based on odds during the match. No bet can be removed or modified. You are responsible for all your bets."
                },
                {
                    hindi: "5. यहाँ सभी सौदे लेजर से मान्य किये जायेंगे |",
                    english: "5. All bets here will be validated through the ledger."
                },
                {
                    hindi: "6. इंटरनेट कनेक्शन प्रॉब्लम की जिम्मेवारी आपकी रहेगी |",
                    english: "6. You are responsible for any internet connection issues."
                },
                {
                    hindi: "7. मैच के बाद धोखा बेट और स्वचालित दांव हटा दिया जाएगा।",
                    english: "7. Fraudulent bets and automated wagers will be removed after the match."
                }
            ]
        };

        return apiSuccessRes(req, res, 'Success.', rules);
    } catch (error) {
        return apiErrorRes(req, res, "Failed to fetch rules");
    }
}

async function acountStatementIndiaBetbyFilter(req, res) {
    const user_id = req.user.sub.id;
     let { from_date, to_date,type } = req.body;

        from_date = from_date.trim();
        to_date = to_date.trim();

        const createSeriesSchema = Joi.object({

            from_date: Joi.string().required(),
            to_date: Joi.string().required(),
            type:Joi.string().required()

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
            to_date,
            type
        }
    try {
        const statement = await userService.acountStatementIndiaBetbyFilter(user_id,data);
        return apiSuccessRes(req, res, 'Success.', statement);
    } catch (error) {
        console.error("Error in controller:", error);
        return apiErrorRes(req, res, 'Failed to fetch data.');
    }
}

async function showBetsIndiaBets(req, res) {
    const user_id = req.user.sub.id;
    const match_id = req.body.matchId;
    try {
        const showBets = await userService.showBetsIndiaBets(match_id, user_id);
        if (showBets.statusCode === CONSTANTS.SUCCESS) {
            const totalPnL = showBets.data.reduce((sum, bet) => sum + bet.PnL, 0);
            const response = {
                data: showBets.data,
                totalPnL: totalPnL
            };
            return apiSuccessRes(req, res, 'Success.', response);
        } else {
            return apiErrorRes(req, res, 'No data found.');
        }
    } catch (error) {
        console.error("Error in controller:", error);
        return apiErrorRes(req, res, 'Failed to fetch data.');
    }
}

async function indiaBetshistory(req, res) {
    const user_id = req.user.sub.id;
    const match_id = req.body.match_id;
    const market_id = req.body.market_id;


    try {
        const betsHistoryData = await userService.indiaBetsHistory(user_id, match_id, market_id);
        
        if (!betsHistoryData || betsHistoryData.statusCode !== CONSTANTS.SUCCESS) {
            return apiErrorRes(req, res, 'Failed to fetch data.');
        }

        return apiSuccessRes(req, res, 'Success.', betsHistoryData.data);
    } catch (error) {
        console.error("Error in controller:", error);
        return apiErrorRes(req, res, 'Failed to fetch data.');
    }
}

router.post('/login', userLogin);
router.post('/infomation', getProfile);
router.post('/rules', updateRules);
router.post('/personal-list', getFavouriteList);
router.get('/api-list-file', getAPIListFile);
router.post('/update-info', updatePassword);
router.post('/payment', payment);
router.post('/payment-history', paymentLog);
router.post('/cash-success', cashfreesuccess);
router.post('/cash-notify', cashfreenotify);
router.post('/wallet-balance', getUserBalance);
router.post('/zone-update', updateTimeZone);
router.post('/single-click-bet-amount', oneClickBetSportWise);
router.post('/single-click-update-amount', updateOneClickAndMatchStack);
router.post('/statement', getUserAccountStatement);
router.post('/my-bet-list', getUserMyBetsList);
router.post('/my-profit-loss', ProfitLossMatchAndMarketWise);
router.post('/my-profit-round', getUserProfitLossLMatchID);
router.post('/my-deposit-request', upload.single('image'), DepositWithdrawalRequest);
router.post('/my-deposit-cancel', DepositWithdrawalCancel);
router.post('/comment-request-cancel', userChatRequestCancel);
router.post('/comment-request', upload.single('image'), ChatRequest);
router.post('/comment-request-list', ChatRequestList);
router.post('/user-chat', userConversion);
router.post('/user-chat-req', upload.single('image'), userConversionChat);
router.post('/user-chat-list', userDepositWithdrawalRequestList);
router.post('/info', globalSettings);
router.post('/rule-list', getRules);
router.post('/sign-up', register);
router.post('/check-avaliable', userexistornot);
router.post('/open-games', openXpgLobby);
router.post('/live-customer', keepAlive);
router.post('/live-cron', xpgCron);
router.get('/live-statment', xpgstatementCron);
router.get('/live-statment-cron', ezugistatementCron);
router.post('/customer-details', getAccountDetails);
router.get('/live-statment-cron-our', ezugistatementCron_our);
router.post('/game-start', openGameLobby);
router.post('/game-start-bt', openGameLobby_BT);
router.post('/otp-verify', verifyOTP);
router.post('/otp-forgot', forgotOTP);
router.post('/otp-forgot-verify', forgotOTPverify);
router.post('/sign-gup-otp', registerOTPresend);
router.post('/otp-forgot-try', forgotOTPresend);
router.post('/uploadDepositeFile', upload.single('deposite'), uploadDepositeFile);
router.post('/pay-start', payment_process);
router.post('/pay-result', payment_response);
router.get('/default-setting', getDefaultSetting);
router.post("/userCasinoStatement", userCasinoStatement)
router.post("/userActionLogs", userActionLogs)
router.post("/getConnectionId", getUserConnectionId);
router.post("/verifyLoginCodeTelegram", telegramConnectionVeify)
router.post("/saveTelegramDisableCode", saveTelegramDisableCode)
router.post("/telegramDisableCodeVeify", telegramDisableCodeVeify)
router.post("/teleConnectedStatus", teleConnectedStatus)
router.post("/userExposureDetails",userExposureDetails)
router.post("/getUserUnsettledBets",userUnsettledBets)
router.get("/getRulesIndiaBet", getRulesIndiaBet)
router.post("/indiaBet-Account-Statement",acountStatementIndiaBetbyFilter)
router.post("/indiaBet-ShowBets",showBetsIndiaBets)
router.post("/India-Bets-History",indiaBetshistory)

module.exports = router;
