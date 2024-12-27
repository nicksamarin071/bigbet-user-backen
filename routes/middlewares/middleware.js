const settings = require('../../config/settings');
const globalFunction = require('../../utils/globalFunction');
//const CONSTANTS = require('../../utils/constants');
const apiUnauthorizedRes = globalFunction.apiUnauthorizedRes;

var middleware = function (req, res, next) {

    const ignored_routes = [
        '/api/v1/setting',
        '/api/v1/getRules',
        '/api/v1/login',
        '/api/v1/otp-verify',
        '/api/v1/otp-forgot',
        '/api/v1/otp-forgot-verify',
        '/api/v1/sign-gup-otp',
        '/api/v1/otp-forgot-try',
        '/api/v1/outersports',
        '/api/v1/outernews',
        '/api/v1/outerslider',
        '/api/v1/our-page',
        '/api/v1/outerPagesDetails',
        '/api/v1/our-home-sport',
        '/api/v1/our-home',
        '/api/v1/userLogin',
        '/api/v1/register',
        '/api/v1/paymentLog',
        '/api/v1/cashfreenotify',
        '/api/v1/cashfreesuccess',
        '/api/v1/forgotPassword',
        '/api/v1/getLiveMatchMarketIdList',
        '/api/v1/forgotPasswordVerifyOtp',
        '/api/v1/getMarketSession',
        '/api/v1/xpgCron',
        '/api/v1/xpgstatementCron',
        '/api/v1/ezugistatementCron',
        '/api/v1/ezugistatementCron_our',
        '/api/v1/userdata',
        '/api/poker/auth',
        '/api/poker/auth/',
        '/api/poker/exposure',
        '/api/poker/exposure/',

        '/api/poker/results',
        '/api/poker/results/',
        '/v1/ezugi_auth',
        '/v1/ezugi_auth/',
        '/v1/ezugi_debit',
        '/v1/ezugi_debit/',
        '/v1/ezugi_rollback',
        '/v1/ezugi_rollback/',
        '/v1/ezugi_credit',
        '/v1/ezugi_credit/',

        '/v1/PlayerGetBalance',
        '/v1/PlayerGetBalance/',
        '/v1/PlayerGetBalances',
        '/v1/PlayerGetBalances/',
        '/v1/Debit',
        '/v1/Debit/',
        '/v1/Credit',
        '/v1/Credit/',
        '/v1/CancelTransaction',
        '/v1/CancelTransaction/',
        '/v1/CancelRound',
        '/v1/CancelRound/',

        '/v1/ProcessDebit',
        '/v1/ProcessDebit/',

        '/v1/ProcessCredit',
        '/v1/ProcessCredit/',

        '/v1/PerformRefund',
        '/v1/PerformRefund/',

        '/v1/funCallBackUrl',
        '/v1/funCallBackUrl/',

        '/v1/slotegratorCallBackUrl',
        '/v1/slotegratorCallBackUrl/',

        //'/v1/Balance',
        //'/v1/Balance/',

        '/v1/Win',
        '/v1/Win/',

        '/v1/Bet',
        '/v1/Bet/',

        '/v1/Refund',
        '/v1/Refund/',
        '/api/v1/pay-start',
        '/api/v1/pay-result',
        settings.API_URL+'/Balance',
        settings.API_URL+'/Debit', 
        settings.API_URL+'/Credit',  

    ];
    if (ignored_routes.includes(req.path)) {
        next();
    } else {
        let token = req.headers.authorization.split(' ');
        let findToken = global._blacklistToken.findIndex((element) => element.token === token[token.length - 1]);
        if (findToken >= 0) {
            return apiUnauthorizedRes(req, res, 'Your token is expire.');
        }
        next();
    }

};
module.exports = middleware;