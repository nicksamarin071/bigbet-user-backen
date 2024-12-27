const expressJwt = require('express-jwt');
const settings = require('../../config/settings');
const userModel = require('../model/userModel');
module.exports = jwt;

function jwt() {
    const secret = settings.secret;
    return expressJwt({
        secret,
        isRevoked
    }).unless({
        path: [
            { url: /^\/upload\/.*/, methods: ['GET'] },
            { url: settings.API_URL + "/info", methods: ['POST'] },
            { url: settings.API_URL + "/rule-list", methods: ['POST'] },
            { url: settings.API_URL + "/sign-up", methods: ['POST'] },
            { url: settings.API_URL + "/our-sport", methods: ['POST'] },
            { url: settings.API_URL + "/payment-history", methods: ['POST'] },
            { url: settings.API_URL + "/cash-success", methods: ['POST'] },
            { url: settings.API_URL + "/cash-notify", methods: ['POST'] },
            { url: settings.API_URL + "/our-news", methods: ['POST'] },
            { url: settings.API_URL + "/our-page-show", methods: ['POST'] },
            { url: settings.API_URL + "/login", methods: ['POST'] },
            { url: settings.API_URL + "/our-home", methods: ['POST'] },
            { url: settings.API_URL + "/our-slide", methods: ['POST'] },
            { url: settings.API_URL + "/our-page", methods: ['POST'] },
            { url: settings.API_URL + "/our-home-sport", methods: ['POST'] },
            { url: settings.API_URL + "/upcoming-event", methods: ['POST'] },
            { url: settings.API_URL + "/userdata", methods: ['POST'] },
            { url: settings.API_URL + "/userLogin", methods: ['POST'] },
            { url: settings.API_URL + "/check-avaliable", methods: ['POST'] },
            { url: settings.API_URL + "/forgotPassword", methods: ['POST'] },
            { url: settings.API_URL + "/getLiveMatchMarketIdList", methods: ['POST'] },
            { url: settings.API_URL + "/forgotPasswordVerifyOtp", methods: ['POST'] },
            { url: settings.API_URL + "/getMarketSession", methods: ['POST'] },
            { url: settings.API_URL + "/getAllMarket", methods: ['GET'] },
            { url: settings.API_URL + "/getPagesList", methods: ['GET'] },
            { url: settings.API_URL + "/backoffice-casino-tv", methods: ['GET'] },
            { url: settings.API_URL + "/getAPIListFile", methods: ['GET'] },
            { url: settings.API_URL + "/backoffice-match-details", methods: ['POST'] },
            { url: settings.API_URL + "/backoffice-match-user", methods: ['POST'] },
            { url: settings.API_URL + "/backoffice-casino-details", methods: ['POST'] },
            { url: settings.API_URL + "/backoffice-casino-current-details", methods: ['POST'] },

            { url: settings.API_URL + "/backoffice-match-completed", methods: ['POST'] },
            { url: settings.API_URL + "/backoffice-match-fancy", methods: ['POST'] },
            { url: settings.API_URL + "/backoffice-match-mrkt-bet-list", methods: ['POST'] },
            { url: settings.API_URL + "/backoffice-casino-mrkt-bet-list", methods: ['POST'] },
            { url: settings.API_URL + "/backoffice-mtch-fancy-bet-list", methods: ['POST'] },
            { url: settings.API_URL + "/backoffice-complete-match-bet-list", methods: ['POST'] },
            { url: settings.API_URL + "/backoffice-sattlement-history", methods: ['POST'] },
            { url: settings.API_URL + "/backoffice-dashboard", methods: ['POST'] },
            { url: settings.API_URL + "/our-slide", methods: ['POST'] },
            { url: settings.API_URL + "/backoffice-settle-report", methods: ['POST'] },
            { url: settings.API_URL + "/otp-verify", methods: ['POST'] },
            { url: settings.API_URL + "/otp-forgot", methods: ['POST'] },
            { url: settings.API_URL + "/otp-forgot-verify", methods: ['POST'] },
            { url: settings.API_URL + "/sign-gup-otp", methods: ['POST'] },
            { url: settings.API_URL + "/otp-forgot-try", methods: ['POST'] },
            //{ url: settings.API_URL+"/backoffice-place-betfair-bet", methods: ['POST'] },
            //{ url: settings.API_URL+"/backoffice-place-fancy-bet", methods: ['POST'] },						
            { url: settings.API_URL + "/backoffice-p-l", methods: ['POST'] },
            { url: settings.API_URL + "/backoffice-p-l-c", methods: ['POST'] },
            { url: settings.API_URL + "/backoffice-user-child", methods: ['POST'] },
            { url: settings.API_URL + "/backoffice-sattlement", methods: ['POST'] },
            { url: settings.API_URL + "/backoffice-sattlement-c-history", methods: ['POST'] },
            { url: settings.API_URL + "/backoffice-delete", methods: ['POST'] },
            { url: settings.API_URL + "/backoffice-sattlement-parent", methods: ['POST'] },
            { url: settings.API_URL + "/backoffice-match-position", methods: ['POST'] },
            { url: settings.API_URL + "/backoffice-my-market", methods: ['POST'] },
            { url: settings.API_URL + "/backoffice-inplay-match", methods: ['POST'] },
            { url: settings.API_URL + "/backoffice-fancy-positon", methods: ['POST'] },
            { url: settings.API_URL + "/backoffice-fancy-position", methods: ['POST'] },
            { url: settings.API_URL + "/backoffice-casino-match", methods: ['GET'] },
            { url: settings.API_URL + "/backoffice-casino-match-add-updown-match", methods: ['GET'] },
            { url: settings.API_URL + "/backoffice-clear-log", methods: ['GET'] },
            { url: settings.API_URL + "/backoffice-add-slogrator-match", methods: ['GET'] },
            { url: settings.API_URL + "/backoffice-add-fun-match", methods: ['GET'] },
            { url: settings.API_URL + "/backoffice-casino-result-rec", methods: ['GET'] },
            { url: settings.API_URL + "/admin_addCasinoDiamonToLotusTODI", methods: ['GET'] },
            { url: settings.API_URL + "/admin_addCasinoDiamonToLotusT20", methods: ['GET'] },
            { url: settings.API_URL + "/backoffice-casino-result-sport_id", methods: ['GET'] },
            { url: settings.API_URL + "/backoffice-user-expo", methods: ['GET'] },
            { url: settings.API_URL + "/backoffice-add-casino-match", methods: ['POST'] },
            { url: settings.API_URL + "/xpgCron", methods: ['POST'] },
            { url: settings.API_URL + "/xpgstatementCron", methods: ['GET'] },
            { url: settings.API_URL + "/ezugistatementCron", methods: ['GET'] },
            { url: settings.API_URL + "/ezugistatementCron_our", methods: ['GET'] },
            { url: settings.API_URL + "/uploadDepositeFile", methods: ['POST'] },

            { url: settings.API_LOBBY_LOTUS_URL + "/poker/auth", methods: ['POST'] },
            { url: settings.API_LOBBY_LOTUS_URL + "/poker/auth/", methods: ['POST'] },
            { url: settings.API_LOBBY_LOTUS_URL + "/poker/exposure", methods: ['POST'] },
            { url: settings.API_LOBBY_LOTUS_URL + "/poker/exposure/", methods: ['POST'] },
            { url: settings.API_LOBBY_LOTUS_URL + "/poker/results", methods: ['POST'] },
            { url: settings.API_LOBBY_LOTUS_URL + "/poker/results/", methods: ['POST'] },
            { url: settings.API_URL + "/ezugi_auth", methods: ['POST'] },
            { url: settings.API_URL + "/ezugi_auth/", methods: ['POST'] },

            { url: settings.API_URL + "/PlayerGetBalance", methods: ['POST'] },
            { url: settings.API_URL + "/PlayerGetBalance/", methods: ['POST'] },
            { url: settings.API_URL + "/PlayerGetBalances", methods: ['POST'] },
            { url: settings.API_URL + "/PlayerGetBalances/", methods: ['POST'] },
            { url: settings.API_URL + "/Debit", methods: ['POST'] },
            { url: settings.API_URL + "/Debit/", methods: ['POST'] },
            { url: settings.API_URL + "/Credit", methods: ['POST'] },
            { url: settings.API_URL + "/Credit/", methods: ['POST'] },
            { url: settings.API_URL + "/CancelTransaction", methods: ['POST'] },
            { url: settings.API_URL + "/CancelTransaction/", methods: ['POST'] },

            { url: settings.API_URL + "/CancelRound", methods: ['POST'] },
            { url: settings.API_URL + "/CancelRound/", methods: ['POST'] },

            { url: settings.API_URL + "/ProcessDebit", methods: ['POST'] },
            { url: settings.API_URL + "/ProcessDebit/", methods: ['POST'] },

            { url: settings.API_URL + "/ProcessCredit", methods: ['POST'] },
            { url: settings.API_URL + "/ProcessCredit/", methods: ['POST'] },

            { url: settings.API_URL + "/PerformRefund", methods: ['POST'] },
            { url: settings.API_URL + "/PerformRefund/", methods: ['POST'] },

            { url: settings.API_URL + "/funCallBackUrl", methods: ['POST'] },
            { url: settings.API_URL + "/funCallBackUrl/", methods: ['POST'] },

            { url: settings.API_URL + "/slotegratorCallBackUrl", methods: ['POST'] },
            { url: settings.API_URL + "/slotegratorCallBackUrl/", methods: ['POST'] },

            //{ url: settings.API_URL + "/Balance", methods: ['POST'] },
            // { url: settings.API_URL + "/Balance/", methods: ['POST'] },

            { url: settings.API_URL + "/Win", methods: ['POST'] },
            { url: settings.API_URL + "/Win/", methods: ['POST'] },

            { url: settings.API_URL + "/Bet", methods: ['POST'] },
            { url: settings.API_URL + "/Bet/", methods: ['POST'] },

            { url: settings.API_URL + "/Refund", methods: ['POST'] },
            { url: settings.API_URL + "/Refund/", methods: ['POST'] },

            { url: settings.API_URL + "/ezugi_debit", methods: ['POST'] },
            { url: settings.API_URL + "/ezugi_debit/", methods: ['POST'] },
            { url: settings.API_URL + "/ezugi_rollback", methods: ['POST'] },
            { url: settings.API_URL + "/ezugi_rollback/", methods: ['POST'] },
            { url: settings.API_URL + "/ezugi_credit", methods: ['POST'] },
            { url: settings.API_URL + "/ezugi_credit/", methods: ['POST'] },
            { url: settings.API_URL + "/pay-start", methods: ['POST'] },
            { url: settings.API_URL + "/pay-result", methods: ['POST'] },
            { url: settings.API_URL + "/getSportOuterList", methods: ['POST'] },
            { url: settings.API_URL + "/getseiresMatchsList", methods: ['POST'] },
            { url: settings.API_URL + "/getSearchExchange", methods: ['POST'] },
            { url: settings.API_URL + "/getBanner", methods: ['GET'] },
            { url: settings.API_URL + "/getSeriesOuterListBySportId", methods: ['POST'] },
            { url: settings.API_URL + "/getMatchOuterListBySeriesId", methods: ['POST'] },
            { url: settings.API_URL + "/get-match-session", methods: ['GET'] },
            { url: settings.API_URL + "/get-cricket-detail", methods: ['POST'] },
            { url: settings.API_URL + "/get-soccer-detail", methods: ['POST'] },
            { url: settings.API_URL + "/get-tennis-detail", methods: ['POST'] },
            { url: settings.API_URL + "/default-setting", methods: ['GET'] },

            { url: settings.API_URL + "/Balance", methods: ['POST'] },
            { url: settings.API_URL + "/Debit", methods: ['POST'] },
            { url: settings.API_URL + "/Credit", methods: ['POST'] },

            { url: settings.API_LOBBY_LOTUS_URL + "/game-list-add", methods: ['GET'] },
            { url: settings.API_LOBBY_LOTUS_URL + "/balance", methods: ['GET'] },
            { url: settings.API_LOBBY_LOTUS_URL + "/balance", methods: ['POST'] },
            { url: settings.API_LOBBY_LOTUS_URL + "/betrequest", methods: ['POST'] },
            { url: settings.API_LOBBY_LOTUS_URL + "/resultrequest", methods: ['POST'] },
            { url: settings.API_LOBBY_LOTUS_URL + "/rollbackrequest", methods: ['POST'] },
		

	   { url: settings.API_URL + "/all-live-sports", methods: ['POST'] },
	   { url: settings.API_URL + "/all-sports-matches", methods: ['POST'] },
        ]
    });
}
async function isRevoked(req, payload, done) {
    req.headers.id = payload.sub.id;
    userModel.setUserData(payload.sub);
    done();
}
