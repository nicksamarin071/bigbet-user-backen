const axios = require("axios");
const settings = require('../config/settings');
//const logger = require('./logger');
async function sendOtp(mobile, message) {
    //logger.info(mobile + " etner into sendOTP ", message);

    //let messageUrl = "http://138.201.121.32/http-api.php?username=adtwlt&password=india2018&senderid=ADTWLT&route=6&number=" + mobile + "&message= You registration OTP is " + message;
    let messageUrl = "http://alerts.prioritysms.com/api/v4/?api_key=A1483568b547cfdd40d2b7c6a8a6815e0&method=sms&message= You verification OTP is " + message + "&to=" + mobile + "&sender=ADTWLT";
    // logger.info("Message with OTP ", messageUrl);
    if (settings.isSendSMS) {
        let response = await axios.get(messageUrl);
        //    logger.info("response   ", response.data);
        return response;
    }

    return 0;

}
async function forgotOtp(mobile, message) {
    //  logger.info(mobile + " etner into sendOTP ", message);

    //let messageUrl = "http://138.201.121.32/http-api.php?username=adtwlt&password=india2018&senderid=ADTWLT&route=6&number=" + mobile + "&message= You registration OTP is " + message;
    let messageUrl = "http://alerts.prioritysms.com/api/v4/?api_key=A1483568b547cfdd40d2b7c6a8a6815e0&method=sms&message= You verification OTP is " + message + "&to=" + mobile + "&sender=ADTWLT";
    //  logger.info("Message with OTP ", messageUrl);
    if (settings.isSendSMS) {
        let response = await axios.get(messageUrl);
        //  logger.info("response   ", response.data);
        return response;
    }

    return 0;

}

module.exports = {
    sendOtp: sendOtp,
    forgotOtp: forgotOtp

};
