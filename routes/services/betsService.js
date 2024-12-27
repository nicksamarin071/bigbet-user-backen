const settings = require('../../config/settings');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');
const exchangeService = require('./exchangeService');
const userService = require('./userService');
const marketsService = require('./marketsService');
const fancyService = require('./fancyService');
const sportsService = require('./sportsService');
const matkabetService = require('./matkabetService');
let resultdb = globalFunction.resultdb;
const { poolPromise, sql } = require('../../db');


let saveMarketBetData = async (data, liabilityForBlance) => {
    try {

        const pool = await poolPromise;
        let pSuperAdmin = parseInt(data.userDataById.super_admin_id);
        let pAdmin = parseInt(data.userDataById.admin_id);
        let pSuperMaster = parseInt(data.userDataById.super_id);
        let pMaster = parseInt(data.userDataById.master_id);
        let pAgent = parseInt(data.userDataById.agent_id);

        delete data.userDataById;
        console.log('liabilityForBlance -------- ', liabilityForBlance);
        const getUserBalanceRecord = await pool.request()
            .input('pLiabilityForBlance', sql.Float, liabilityForBlance)
            .input('pUserid', sql.Int, data.user_id)
            .input('pSuperAdmin', sql.Int, pSuperAdmin)
            .input('pAdmin', sql.Int, pAdmin)
            .input('pSuperMaster', sql.Int, pSuperMaster)
            .input('pMaster', sql.Int, pMaster)
            .input('pAgent', sql.Int, pAgent)
            .input('pMarketID', sql.VarChar(150), data.market_id)
            .input('P_L', sql.Float, data.p_l)
            .input('Stack', sql.Float, data.stack)
            .input('IsBack', sql.Int, data.is_back)
            .input('selection_id', sql.Int, data.selection_id)
            .input('liability', sql.Float, data.liability)
            .input('pbetJson', sql.NVarChar(10000), JSON.stringify(data))
            .execute('SP_SAVE_BET_BEFIAR_MARKET');
        console.log('getUserBalanceRecord.recordset', getUserBalanceRecord.recordset);
        if (getUserBalanceRecord.recordset[0].savebeterror == 1) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Dublicate entry not allowed on same time");
        }
        if (getUserBalanceRecord.recordset[0].balance == 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Insufficient Balance!");
        }
        return resultdb(CONSTANTS.SUCCESS, getUserBalanceRecord.recordset);

    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.VALIDATION_ERROR, "Error In save bet");
    }
};

let validateBet = async (data) => {
    try {

        let userSetting = data.user_setting_data;
        let userData = data.userDataById;

        let sportService = await sportsService.getSportSetting(data.sport_id, data.match_id, data.market_id);
        sportService = sportService.data;

        if (data.redis_status != 'OPEN') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Can not place bet on closed market");
        }
        if (data.odds == 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Rate must be greater than zero");
        }
        if ((CONSTANTS.UN_MATCH_BET_ALLOW_OR_NOT == 0) && (data.is_matched == 0) || sportService.unmatch_bets == 'Y') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Rate has been changed");
        }
        if (sportService.status == 'N') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "This Sport is not avaliable for bet");
        }

        if (data.stack <= 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Stake must be greater than zero");
        }

        if (userData.self_lock_betting == 'Y' || userData.parent_lock_betting == 'Y') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your betting has been locked by your parent");
        }
        if (userData.self_lock_user == 'Y' || userData.parent_lock_user == 'Y') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your account has been locked by your parent");
        }
        if (userData.self_close_account == 'Y' || userData.parent_close_account == 'Y') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your account has been closed by your parent");
        }
        let marketSetting = await marketsService.getMarketSettingById(data.market_id);

        marketSetting = marketSetting.data;


        if (settings.BOOK_MAKER_MANUAL_MARKET_BET_FORMATE_INDIAN_BETFAIR == 'INDIAN' && marketSetting.market_type == 'BM') {
            let oddManual = Number((data.odds / 100) + 1).toFixed(2);
            console.log('data.odds ------ ', data.odds);
            console.log('oddManual ------ ', oddManual);
            if (sportService.max_odss_limit != null && sportService.max_odss_limit != 0 && oddManual > sportService.max_odss_limit) {
                return resultdb(CONSTANTS.VALIDATION_ERROR, "Bet is not allowed more than " + sportService.max_odss_limit + " rate");
            }

            if (sportService.min_odds_limit != null && sportService.min_odds_limit != 0 && oddManual < sportService.min_odds_limit) {
                return resultdb(CONSTANTS.VALIDATION_ERROR, "Bet is not allowed less than " + sportService.min_odds_limit + " rate");
            }

        }
        else {
            if (sportService.max_odss_limit != null && sportService.max_odss_limit != 0 && data.odds > sportService.max_odss_limit) {
                return resultdb(CONSTANTS.VALIDATION_ERROR, "Bet is not allowed more than " + sportService.max_odss_limit + " rate");
            }

            if (sportService.min_odds_limit != null && sportService.min_odds_limit != 0 && data.odds < sportService.min_odds_limit) {
                return resultdb(CONSTANTS.VALIDATION_ERROR, "Bet is not allowed less than " + sportService.min_odds_limit + " rate");
            }
        }

        if (marketSetting.market_admin_message != null && marketSetting.market_admin_message != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Bet is not allowed");
        }

        if (marketSetting.max_bet_liability < Math.abs(data.liability) && marketSetting.max_bet_liability != null && marketSetting.max_bet_liability != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your max bet liability " + marketSetting.max_bet_liability + " is exceeded");
        }


        if (marketSetting.is_bet_allow == 'N' || sportService.is_bet_allow == 'N') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Bet is not allowed on this market");
        }
        if (marketSetting.liability_type == 'N') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Market liability not allowed");
        }
        if (marketSetting.min_stack != null && marketSetting.min_stack != 0 && marketSetting.min_stack > data.stack) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "You can not place bet less than " + marketSetting.min_stack + "");
        }

        if (marketSetting.max_stack != null && marketSetting.max_stack != 0 && marketSetting.max_stack < data.stack) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "You can not place bet more than " + marketSetting.max_stack + "");
        }


        let teamPositionData = await marketsService.getTeamPosition(data.user_id, data.market_id);
        let teamPosition = teamPositionData.data;
        let run_time_sum_win_loss = [];
        let old_sum_win_loss = [];
        if (data.is_back == 1) {
            teamPosition.forEach(function (position) {
                old_sum_win_loss.push(position.win_loss_value);
                if (position.selection_id == data.selection_id) {

                    position.win_loss_value = position.win_loss_value + data.p_l;
                }
                else {

                    position.win_loss_value = position.win_loss_value - data.stack;
                }
                position.sum_win_loss = position.win_loss_value;
                run_time_sum_win_loss.push(position.sum_win_loss);
            });
        }
        else {
            teamPosition.forEach(function (position) {
                old_sum_win_loss.push(position.win_loss_value);
                if (position.selection_id == data.selection_id) {

                    position.win_loss_value = position.win_loss_value + data.liability;
                } else {

                    position.win_loss_value = position.win_loss_value + data.stack;
                }
                position.sum_win_loss = position.win_loss_value;
                run_time_sum_win_loss.push(position.sum_win_loss);
            });
        }

        let oldUserMaxProfit = Math.max(...old_sum_win_loss);
        let oldUserMaxLoss = 0;
        let userMaxProfit = 0;
        let userMaxLoss = 0;
        oldUserMaxLoss = Math.min(...old_sum_win_loss) >= 0 ? 0 : Math.min(...old_sum_win_loss);

        userMaxProfit = Math.max(...run_time_sum_win_loss);

        userMaxLoss = Math.min(...run_time_sum_win_loss);
        userMaxLoss = Number(parseFloat(userMaxLoss).toFixed(2));
        let userBalance = parseFloat(userData.balance) + Math.abs(oldUserMaxLoss);

        if (userMaxLoss >= 0) {

            data.liabilityForBlance = Math.abs(oldUserMaxLoss);
        } else {
            data.liabilityForBlance = Math.abs(oldUserMaxLoss) - Math.abs(userMaxLoss);
        }
        data.liabilityForBlance = Number(parseFloat(data.liabilityForBlance).toFixed(2));

        if (userMaxProfit > marketSetting.max_market_profit && marketSetting.max_market_profit != null && marketSetting.max_market_profit != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your maxmium profit is " + marketSetting.max_market_profit + " exceeded");
        }

        if (Math.abs(userMaxLoss) > marketSetting.max_market_liability && marketSetting.max_market_liability != null && marketSetting.max_market_liability != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your liability is " + marketSetting.max_market_liability + " exceeded" + userData.id + "");
        }
        let tempUserBalance = userMaxLoss > 0 ? 0 : userMaxLoss;
        if (Math.abs(tempUserBalance) > userBalance) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Insufficient Balance");
        }
        if (userMaxProfit > userSetting.market_max_profit && userSetting.market_max_profit != null && userSetting.market_max_profit != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your maxmium profit is " + userSetting.market_max_profit + " exceeded");
        }

        if (Math.abs(userMaxLoss) > userSetting.market_max_loss && userSetting.market_max_loss != null && userSetting.market_max_loss != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your liability is " + userSetting.market_max_loss + " exceededexceeded" + userData.id + "");
        }

        if (Math.abs(data.liability) > userSetting.max_exposure && userSetting.max_exposure != null && userSetting.max_exposure != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your bet liability is " + userSetting.max_exposure + " exceeded");
        }
        if (Math.abs(data.liability) < userSetting.min_exposure && userSetting.min_exposure != null && userSetting.min_exposure != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your min bet liability should be less than " + userSetting.min_exposure + "");
        }

        if (data.p_l > userSetting.winning_limit && userSetting.winning_limit != null && userSetting.winning_limit != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your bet profit " + userSetting.winning_limit + " is exceeded");
        }
         
        if (marketSetting.max_stack ==0 && userSetting.max_match_stack != null && userSetting.max_match_stack != 0 && userSetting.max_match_stack < data.stack) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "You can not place bet more than " + userSetting.max_match_stack + "");
        }

        if (marketSetting.min_stack ==0 && userSetting.min_match_stack != null && userSetting.min_match_stack != 0 && userSetting.min_match_stack > data.stack) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "You can not place bet less than " + userSetting.min_match_stack + "");
        }


        return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

/*
** Casino Bet validation
*/

let validateCasinoBet = async (data) => {
    try {

        let userSetting = data.user_setting_data;
        let userData = data.userDataById;

        //let sportService = await sportsService.getSportSetting(data.sport_id);
        let sportService = await sportsService.getCasinoSportSetting(data.sport_id, data.match_id, data.market_id);
        sportService = sportService.data;

        if (data.redis_status != 'OPEN') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Can not place bet on closed market");
        }
        if (data.odds == 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Rate must be greater than zero");
        }
        //if((global._config.is_unmatched_bet == 0) && (data.is_matched==0)){
        if ((CONSTANTS.UN_MATCH_BET_ALLOW_OR_NOT == 0) && (data.is_matched == 0) || sportService.unmatch_bets == 'Y') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Rate has been changed");
        }
        if (sportService.status == 'N') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "This Sport is not avaliable for bet");
        }

        if (data.stack <= 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Stake must be greater than zero");
        }

        if (userData.self_lock_betting == 'Y' || userData.parent_lock_betting == 'Y') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your betting has been locked by your parent");
        }
        if (userData.self_lock_user == 'Y' || userData.parent_lock_user == 'Y') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your account has been locked by your parent");
        }
        if (userData.self_close_account == 'Y' || userData.parent_close_account == 'Y') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your account has been closed by your parent");
        }

        if (sportService.max_odss_limit != null && sportService.max_odss_limit != 0 && data.odds > sportService.max_odss_limit) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Bet is not allowed more than " + sportService.max_odss_limit + " rate");
        }

        if (sportService.min_odds_limit != null && sportService.min_odds_limit != 0 && data.odds < sportService.min_odds_limit) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Bet is not allowed less than " + sportService.min_odds_limit + " rate");
        }

        let marketSetting = await marketsService.getCasinoMarketSettingById(data.market_id);

        marketSetting = marketSetting.data;

        if (marketSetting.market_admin_message != null && marketSetting.market_admin_message != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Bet is not allowed");
        }

        if (marketSetting.max_bet_liability < Math.abs(data.liability) && marketSetting.max_bet_liability != null && marketSetting.max_bet_liability != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your max bet liability " + marketSetting.max_bet_liability + " is exceeded");
        }


        if (marketSetting.is_bet_allow == 'N' || sportService.is_bet_allow == 'N') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Bet is not allowed on this market");
        }
        if (marketSetting.liability_type == 'N') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Market liability not allowed");
        }
        if (marketSetting.min_stack != null && marketSetting.min_stack != 0 && marketSetting.min_stack > data.stack) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "You can not place bet less than " + marketSetting.min_stack + "");
        }

        if (marketSetting.max_stack != null && marketSetting.max_stack != 0 && marketSetting.max_stack < data.stack) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "You can not place bet more than " + marketSetting.max_stack + "");
        }


        let teamPositionData = await marketsService.getCasinoTeamPosition(data.user_id, data.market_id);
        let teamPosition = teamPositionData.data;
        //console.log(teamPosition);
        let run_time_sum_win_loss = [];
        let old_sum_win_loss = [];
        if (data.is_back == 1) {
            teamPosition.forEach(function (position) {
                old_sum_win_loss.push(position.win_loss_value);
                if (position.selection_id == data.selection_id) {

                    position.win_loss_value = position.win_loss_value + data.p_l;
                }
                else {

                    position.win_loss_value = position.win_loss_value - data.stack;
                }
                position.sum_win_loss = position.win_loss_value;
                run_time_sum_win_loss.push(position.sum_win_loss);
            });
        }
        else {
            teamPosition.forEach(function (position) {
                old_sum_win_loss.push(position.win_loss_value);
                if (position.selection_id == data.selection_id) {

                    position.win_loss_value = position.win_loss_value + data.liability;
                } else {

                    position.win_loss_value = position.win_loss_value + data.stack;
                }
                position.sum_win_loss = position.win_loss_value;
                run_time_sum_win_loss.push(position.sum_win_loss);
            });
        }

        let oldUserMaxProfit = Math.max(...old_sum_win_loss);
        let oldUserMaxLoss = 0;
        let userMaxProfit = 0;
        let userMaxLoss = 0;
        // if(marketSetting.liability_type=='Y'){
        //     console.log(data.selection_liability_typ);
        //     if(data.selection_liability_type=="1"){
        //         teamPosition.forEach(function (position) {
        //             oldUserMaxLoss+= position.liability_type=="1" ? position.stack : 0;
        //             console.log("oldUserMaxLoss",oldUserMaxLoss);
        //         });

        //         userMaxProfit = 0;

        //         userMaxLoss = -(oldUserMaxLoss+data.stack);
        //         oldUserMaxLoss = -(oldUserMaxLoss);
        //     }

        //     if(data.selection_liability_type=="0"){
        //         oldUserMaxLoss = Math.min(...old_sum_win_loss) >= 0 ? 0 : Math.min(...old_sum_win_loss);
        //         userMaxProfit = Math.max(...run_time_sum_win_loss);

        //         userMaxLoss = Math.min(...run_time_sum_win_loss);
        //     }


        // }else {
        //     oldUserMaxLoss = Math.min(...old_sum_win_loss) >= 0 ? 0 : Math.min(...old_sum_win_loss);

        //     userMaxProfit = Math.max(...run_time_sum_win_loss);

        //     userMaxLoss = Math.min(...run_time_sum_win_loss);
        // }

        // console.log('outer---',marketSetting.liability_type);
        // return;

        oldUserMaxLoss = Math.min(...old_sum_win_loss) >= 0 ? 0 : Math.min(...old_sum_win_loss);

        userMaxProfit = Math.max(...run_time_sum_win_loss);

        userMaxLoss = Math.min(...run_time_sum_win_loss);


        // oldUserMaxLoss = Math.min(...old_sum_win_loss) >= 0 ? 0 : Math.min(...old_sum_win_loss);

        // userMaxProfit = Math.max(...run_time_sum_win_loss);

        // userMaxLoss = Math.min(...run_time_sum_win_loss);

        let userBalance = parseFloat(userData.balance) + Math.abs(oldUserMaxLoss);

        if (userMaxLoss >= 0) {

            data.liabilityForBlance = Math.abs(oldUserMaxLoss);
        } else {
            data.liabilityForBlance = Math.abs(oldUserMaxLoss) - Math.abs(userMaxLoss);
        }
        if (userMaxProfit > marketSetting.max_market_profit && marketSetting.max_market_profit != null && marketSetting.max_market_profit != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your maxmium profit is " + marketSetting.max_market_profit + " exceeded");
        }
        //console.log(userMaxLoss);
        if (Math.abs(userMaxLoss) > marketSetting.max_market_liability && marketSetting.max_market_liability != null && marketSetting.max_market_liability != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your liability is " + marketSetting.max_market_liability + " exceeded");
        }


        let tempUserBalance = userMaxLoss > 0 ? 0 : userMaxLoss;
        if (Math.abs(tempUserBalance) > userBalance) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Insufficient Balance");
        }
        //console.log('marketSetting',marketSetting);
        //console.log('userSetting',userSetting);
        if (userMaxProfit > userSetting.market_max_profit && userSetting.market_max_profit != null && userSetting.market_max_profit != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your maxmium profit is " + userSetting.market_max_profit + " exceeded");
        }

        if (Math.abs(userMaxLoss) > userSetting.market_max_loss && userSetting.market_max_loss != null && userSetting.market_max_loss != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your liability is " + userSetting.market_max_loss + " exceeded");
        }

        if (Math.abs(data.liability) > userSetting.max_exposure && userSetting.max_exposure != null && userSetting.max_exposure != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your bet liability is " + userSetting.max_exposure + " exceeded");
        }
        if (Math.abs(data.liability) < userSetting.min_exposure && userSetting.min_exposure != null && userSetting.min_exposure != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your min bet liability should be less than " + userSetting.min_exposure + "");
        }

        if (data.p_l > userSetting.winning_limit && userSetting.winning_limit != null && userSetting.winning_limit != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your bet profit " + userSetting.winning_limit + " is exceeded");
        }
        if (userSetting.max_match_stack != null && userSetting.max_match_stack != 0 && userSetting.max_match_stack < data.stack) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "You can not place bet more than " + userSetting.max_match_stack + "");
        }

        if (userSetting.min_match_stack != null && userSetting.min_match_stack != 0 && userSetting.min_match_stack > data.stack) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "You can not place bet less than " + userSetting.min_match_stack + "");
        }


        return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

let saveFancyBetData = async (data, fancy_score_position, fancy_score_position_id, liabilityForBlance) => {
    try {

        const pool = await poolPromise;
        /* const resFromDB = await pool.request()
            .input('pUserid', sql.Int, data.user_id)
            .execute('GET_ALL_PARENT_USER');
        let getAllparent = Array();
        for (let i in resFromDB.recordset) {
            var resultGet = resFromDB.recordset[i]
            getAllparent[i] = resultGet.id;
        } */


        let pSuperAdmin = parseInt(data.userDataById.super_admin_id);
        let pAdmin = parseInt(data.userDataById.admin_id);
        let pSuperMaster = parseInt(data.userDataById.super_id);
        let pMaster = parseInt(data.userDataById.master_id);
        let pAgent = parseInt(data.userDataById.agent_id);

        delete data.userDataById;

        //console.log("EXEC SP_SAVE_BET_FANCY_MARKET "+liabilityForBlance+","+data.user_id+","+getAllparent[0]+","+getAllparent[1]+","+getAllparent[2]+","+getAllparent[3]+","+getAllparent[4]+",'"+data.match_id+"','"+ data.fancy_id+"','"+ JSON.stringify(data)+"','"+ JSON.stringify(fancy_score_position)+"',"+fancy_score_position_id+"");

        const getUserBalanceRecord = await pool.request()
            .input('pLiabilityForBlance', sql.Float, liabilityForBlance)
            .input('pUserid', sql.Int, data.user_id)
            .input('pSuperAdmin', sql.Int, pSuperAdmin)
            .input('pAdmin', sql.Int, pAdmin)
            .input('pSuperMaster', sql.Int, pSuperMaster)
            .input('pMaster', sql.Int, pMaster)
            .input('pAgent', sql.Int, pAgent)
            .input('pMatchID', sql.VarChar(150), data.match_id)
            .input('pMarketID', sql.VarChar(150), data.fancy_id)
            .input('pbetJson', sql.NVarChar(10000), JSON.stringify(data))
            .input('pFancyScoreJson', sql.NVarChar(10000), JSON.stringify(fancy_score_position))
            .input('pFancyScorePositoID', sql.Int, fancy_score_position_id)
            .execute('SP_SAVE_BET_FANCY_MARKET');
        console.log('getUserBalanceRecord.recordset', getUserBalanceRecord.recordset);
        if (getUserBalanceRecord.recordset[0].savebeterror == 1) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Dublicate entry not allowed on same time");
        }
        if (getUserBalanceRecord.recordset[0].balance == 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Insufficient Balance!");
        }
        return resultdb(CONSTANTS.SUCCESS, getUserBalanceRecord.recordset);

        /* const getUserBalanceRecord = await pool.request()
             .input('pLiabilityForBlance', sql.Float, liabilityForBlance)
             .input('pUserid', sql.Int, data.user_id)
             .execute('SP_USER_BALANCE_UPDATE_GET');
 
 
         let query2 = "update users SET liability += " + liabilityForBlance + ",balance+= " + liabilityForBlance + " where id=" + data.user_id + "";
 
         /* let updateUser = "update users SET liability += "+liabilityForBlance+",balance+= "+liabilityForBlance+" where id="+data.user_id+"";             
         const updatBalance =  await pool.request().query(updateUser);   
                  console.log('updatBalance',updatBalance);
         let userBalanceData = await userService.getUserBalanceOnly(data.user_id);
         console.log('userBalanceData',userBalanceData); *
         console.log('getUserBalanceRecord.recordset fancy bet', getUserBalanceRecord.recordset);
         let balance = getUserBalanceRecord.recordset[0].balance;
 
         if (balance == 0) {
 
             return resultdb(CONSTANTS.VALIDATION_ERROR, "Insufficient User Balance!");
         }
 
         const resFromDBr = await pool.request()
             .input('user_id', sql.BigInt, data.user_id)
             .input('super_admin_id', sql.BigInt, getAllparent[0])
             .input('admin_id', sql.BigInt, getAllparent[1])
             .input('super_master_id', sql.BigInt, getAllparent[2])
             .input('master_id', sql.BigInt, getAllparent[3])
             .input('agent_id', sql.BigInt, getAllparent[4])
             .input('sport_id', sql.Int, data.sport_id)
             .input('match_id', sql.Int, data.match_id)
             .input('fancy_id', sql.VarChar(50), data.fancy_id)
             .input('fancy_name', sql.VarChar(50), data.fancy_name)
             .input('redis_run', sql.Int, data.redisRun)
             .input('redis_size', sql.Int, data.redisSize)
             .input('run', sql.Int, data.run)
             .input('chips', sql.VarChar(50), data.chips)
             .input('stack', sql.VarChar(50), data.stack)
             .input('is_back', sql.VarChar(50), data.is_back)
             .input('profit', sql.VarChar(50), data.profit)
             .input('liability', sql.VarChar(50), data.liability)
             .input('type_id', sql.VarChar(50), data.type_id)
             .input('session_input_yes', sql.VarChar(50), data.session_input_yes)
             .input('session_input_no', sql.VarChar(50), data.session_input_no)
             .input('point_difference', sql.VarChar(50), data.point_difference)
             .input('size', sql.VarChar(50), data.size)
             .input('super_admin', sql.VarChar(50), data.super_admin)
             .input('admin', sql.VarChar(50), data.admin)
             .input('super_master', sql.VarChar(50), data.super_master)
             .input('master', sql.VarChar(50), data.master)
             .input('agent', sql.VarChar(50), data.agent)
             .input('super_admin_commission', sql.VarChar(50), data.super_admin_commission)
             .input('admin_commission', sql.VarChar(50), data.admin_commission)
             .input('super_master_commission', sql.VarChar(50), data.super_master_commission)
             .input('master_commission', sql.VarChar(50), data.master_commission)
             .input('agent_commission', sql.VarChar(50), data.agent_commission)
             .input('user_commission', sql.VarChar(50), data.user_commission)
             .input('device_type', sql.VarChar(50), data.device_type)
             .input('ip_address', sql.VarChar(50), data.ip_address)
             .input('device_info', sql.VarChar(50), data.device_info)
             .input('currentdate', sql.VarChar(50), currentdate)
             .query("insert into bets_fancy (user_id,super_admin_id,admin_id,super_master_id,master_id,agent_id, sport_id, match_id,fancy_id,fancy_name,redis_run,redis_size,run,chips,stack,is_back,profit,liability,type_id,session_input_yes,session_input_no,super_admin,admin,super_master,master,agent,point_difference,size,super_admin_commission,admin_commission,super_master_commission,master_commission,agent_commission,user_commission,device_type,device_info,created_by,created_at,created_ip) values(@user_id,@super_admin_id,@admin_id,@super_master_id,@master_id,@agent_id,@sport_id,@match_id,@fancy_id, @fancy_name,@redis_run,@redis_size,@run, @chips,@stack,@is_back,@profit,@liability,@type_id,@session_input_yes,@session_input_no,@super_admin,@admin,@super_master,@master,@agent ,@point_difference,@size,@super_admin_commission,@admin_commission,@super_master_commission,@master_commission,@agent_commission,@user_commission,@device_type,@device_info,@user_id,@currentdate,@ip_address); SELECT SCOPE_IDENTITY() AS bet_id");
         
         if (fancy_score_position_id == 0) {
             const positions = await pool.request()
                 .input('user_id', sql.BigInt, fancy_score_position.user_id)
                 .input('super_admin_id', sql.BigInt, getAllparent[0])
                 .input('admin_id', sql.BigInt, getAllparent[1])
                 .input('super_master_id', sql.BigInt, getAllparent[2])
                 .input('master_id', sql.BigInt, getAllparent[3])
                 .input('agent_id', sql.BigInt, getAllparent[4])
                 .input('match_id', sql.Int, fancy_score_position.match_id)
                 .input('fancy_id', sql.VarChar(50), fancy_score_position.fancy_id)
                 .input('super_admin_partnership', sql.VarChar(50), fancy_score_position.super_admin_partnership)
                 .input('admin_partnership', sql.VarChar(50), fancy_score_position.admin_partnership)
                 .input('super_master_partnership', sql.VarChar(50), fancy_score_position.super_master_partnership)
                 .input('master_partnership', sql.VarChar(50), fancy_score_position.master_partnership)
                 .input('agent_partnership', sql.VarChar(50), fancy_score_position.agent_partnership)
                 .input('liability', sql.VarChar(50), fancy_score_position.liability)
                 .input('profit', sql.VarChar(50), fancy_score_position.profit)
                 .input('fancy_score_position_json', sql.Text, fancy_score_position.fancy_score_position_json)
                 .query("insert into fancy_score_positions (user_id,super_admin_id,admin_id,super_master_id,master_id,agent_id, match_id,fancy_id,super_admin_partnership,admin_partnership,super_master_partnership,master_partnership,agent_partnership,liability,profit,fancy_score_position_json) values(@user_id,@super_admin_id,@admin_id,@super_master_id,@master_id,@agent_id,@match_id,@fancy_id, @super_admin_partnership,@admin_partnership, @super_master_partnership,@master_partnership,@agent_partnership,@liability,@profit,@fancy_score_position_json)");
         } else {
             let query = "UPDATE fancy_score_positions SET liability=" + fancy_score_position.liability + ",profit=" + fancy_score_position.profit + ",fancy_score_position_json='" + fancy_score_position.fancy_score_position_json + "' where user_id=" + fancy_score_position.user_id + " AND match_id=" + fancy_score_position.match_id + " AND fancy_id=" + fancy_score_position.fancy_id + "";
             console.log(query);
             await pool.request()
                 .query(query);
         }
         let lastInsId = resFromDBr.recordset[0].bet_id;
 
         /* let query2 = "update users SET liability += "+liabilityForBlance+",balance+= "+liabilityForBlance+" where id="+data.user_id+"";        
          
         if(CONSTANTS.USER_BET_LOG_YES_NO =='Y'){
             let userBetLogs = "insert into user_bet_logs (user_id,match_id,market_id,bet_id,type,old_balance,old_liability,new_liability,bet_user_query,created_at) VALUES("+data.user_id+","+data.match_id+",'"+data.fancy_id+"',"+lastInsId+",'F',"+data.userDataById.balance+","+data.userDataById.liability+","+liabilityForBlance+",'"+query2+"',"+currentdate+")";      
             await pool.request()           
             .query(userBetLogs); 
         }
 
 
           await pool.request()         
          .query(query2); *
 
         //let lastInsId= resFromDBr.recordset[0].bet_id;
 
         if (CONSTANTS.USER_BET_LOG_YES_NO == 'Y') {
             let userBetLogs = "insert into user_bet_logs (user_id,match_id,market_id,bet_id,type,old_balance,old_liability,new_liability,bet_user_query,created_at) VALUES(" + data.user_id + "," + data.match_id + ",'" + data.fancy_id + "'," + lastInsId + ",'F'," + data.userDataById.balance + "," + data.userDataById.liability + "," + liabilityForBlance + ",'" + query2 + "'," + currentdate + ")";
             await pool.request()
                 .query(userBetLogs);
         }
 
         return resultdb(CONSTANTS.SUCCESS, resFromDBr.recordsets);*/
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};


let validateFancyBet = async (data) => {
    try {

        let matchSetting = await marketsService.getFancySettingById(data.fancy_id, data.match_id);
        matchSetting = matchSetting.data;

        if (matchSetting.market_admin_message != null && matchSetting.market_admin_message != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Bet is not allowed");
        }

        if (matchSetting.min_stack != null && matchSetting.min_stack != 0 && matchSetting.min_stack > data.stack) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "You can not place bet less than" + matchSetting.min_stack + "");
        }

        if (matchSetting.max_stack != null && matchSetting.max_stack != 0 && matchSetting.max_stack < data.stack) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "You can not place bet more than" + matchSetting.max_stack + "");
        }

        if (matchSetting.is_bet_allow == 'N') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Bet is not allowed on this session");
        }

        //console.log(' matchSetting.session_max_profit', matchSetting.session_max_profit);
        //console.log(' data.is_manual_odds', data.is_manual_odds);

        let betFairFancy = await exchangeService.getFancyByFancyId(data.fancy_id, data.match_id, data.is_manual_odds);
        betFairFancy = betFairFancy.data;
        //console.log('betFairFancy',betFairFancy)
        if (betFairFancy == null) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Fancy Closed");
        }
        if (betFairFancy.length == 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Fancy Closed");
        }
        if (betFairFancy.GameStatus != '') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Fancy Suspended");
        }

        if (data.is_back == 1) {
            data.redisRun = betFairFancy.BackPrice1;
            data.redisSize = betFairFancy.BackSize1;
            /* if (betFairFancy.BackPrice1 != data.run) {
                return resultdb(CONSTANTS.VALIDATION_ERROR, "Run Changed");
            }
            if (betFairFancy.BackSize1 != data.size) {
                return resultdb(CONSTANTS.VALIDATION_ERROR, "Size Changed");
            } */
        } else {
            data.redisRun = betFairFancy.LayPrice1;
            data.redisSize = betFairFancy.LaySize1;
            /* if (betFairFancy.LayPrice1 != data.run) {
                return resultdb(CONSTANTS.VALIDATION_ERROR, "Run Changed");
            }
            if (betFairFancy.LaySize1 != data.size) {
                return resultdb(CONSTANTS.VALIDATION_ERROR, "Size Changed");
            } */
        }
        let userSetting = data.user_setting_data;

        if (data.stack <= 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Stake must be greater than zero");
        }
        if (data.size <= 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Size must be greater than zero");
        }
        if (data.run <= 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Run must be greater than zero");
        }

        let userData = await userService.getUserByUserId(data.user_id);
        userData = userData.data;
        if (userData.self_lock_betting == 'Y' || userData.parent_lock_betting == 'Y') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your betting has been locked by your parent");
        }
        if (userData.self_lock_user == 'Y' || userData.parent_lock_user == 'Y') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your account has been locked by your parent");
        }
        if (userData.self_close_account == 'Y' || userData.parent_close_account == 'Y') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your account has been closed by your parent");
        }
        if (userData.self_lock_fancy_bet == 'Y' || userData.parent_lock_fancy_bet == 'Y') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your betting has been locked by your parent");
        }

        let createFancyPosition = await fancyService.createFancyPosition(data.user_id, data.match_id, data.fancy_id, data);
       
        createFancyPositionnew = createFancyPosition.data; 

 
        let teamPositionData = await fancyService.getFancyPosition(data.user_id, data.match_id, data.fancy_id);
        let teamPosition = teamPositionData.data;

        

        let oldUserMaxProfit = teamPosition.profit;
        let oldUserMaxLoss = teamPosition.liability;

        let userMaxLoss = createFancyPositionnew.liability;
        let userMaxProfit = createFancyPositionnew.profit;



        if (userMaxProfit > matchSetting.session_max_profit && matchSetting.session_max_profit != null && matchSetting.session_max_profit != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your maxmium profit is " + matchSetting.session_max_profit + " exceeded");
        }

        if (Math.abs(userMaxLoss) > matchSetting.session_max_loss && matchSetting.session_max_loss != null && matchSetting.session_max_loss != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your liability is " + matchSetting.session_max_loss + " exceeded");
        }


        let userBalance = parseFloat(userData.balance) + Math.abs(oldUserMaxLoss);
        if (userMaxLoss >= 0) {
            data.liabilityForBlance = oldUserMaxLoss >= 0 ? 0 : Math.abs(oldUserMaxLoss);
            data.liabilityFancy = 0;
        } else {
            data.liabilityForBlance = (Math.abs(oldUserMaxLoss) - Math.abs(userMaxLoss));
            data.liabilityFancy = userMaxLoss;
        }


        data.profitFancy = userMaxProfit;
        data.fancy_score_position_json = createFancyPositionnew.fancy_position;
        data.fancy_score_position_id = teamPosition.id;


        if (Math.abs(userMaxLoss) > userBalance) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Insufficient Balance");
        }




        if (userSetting.session_max_loss != null && userSetting.session_max_loss != 0) {

            let query = "SELECT ISNULL(SUM(ISNULL(liability, 0)), 0) AS total_liability FROM fancy_score_positions WHERE fancy_id ='" + data.fancy_id + "' AND user_id = " + data.user_id + " AND match_id=" + data.match_id + "";
            const pool = await poolPromise;
            const resFromDBr = await pool.request()
                .query(query);
            let getTotalFancyLiability = resFromDBr.recordsets[0][0].total_liability

            let total_liability = Math.abs(getTotalFancyLiability) + Math.abs(userMaxLoss);

            if (total_liability > userSetting.session_max_loss) {
                return resultdb(CONSTANTS.VALIDATION_ERROR, "Max limit on fancy liability is over");
            }
        }
        //console.log('heheheheheh avnash------------------------- ', userSetting);

        if (userSetting.max_session_stack != null && userSetting.max_session_stack != 0 && userSetting.max_session_stack < data.stack) {

            return resultdb(CONSTANTS.VALIDATION_ERROR, "You can not place bet more than " + userSetting.max_session_stack + "");
        }

        if (userSetting.min_session_stack != null && userSetting.min_session_stack != 0 && userSetting.min_session_stack > data.stack) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "You can not place bet less than " + userSetting.min_session_stack + "");
        }

        return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);
    } catch (error) {
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};
/*Save Casino Bet */
let saveCasinoMarketBetData = async (data, liabilityForBlance) => {
    try {

        const pool = await poolPromise;
        let currentdate = globalFunction.currentDateTimeStamp();
        /*  const resFromDB = await pool.request()
             .input('pUserid', sql.Int, data.user_id)
             .execute('GET_ALL_PARENT_USER');
         let getAllparent = Array();
         for (let i in resFromDB.recordset) {
             var resultGet = resFromDB.recordset[i]
             getAllparent[i] = resultGet.id;
         }
  */
        let pSuperAdmin = parseInt(data.userDataById.super_admin_id);
        let pAdmin = parseInt(data.userDataById.admin_id);
        let pSuperMaster = parseInt(data.userDataById.super_id);
        let pMaster = parseInt(data.userDataById.master_id);
        let pAgent = parseInt(data.userDataById.agent_id);


        const getUserBalanceRecord = await pool.request()
            .input('pLiabilityForBlance', sql.Float, liabilityForBlance)
            .input('pUserid', sql.Int, data.user_id)
            .execute('SP_USER_BALANCE_UPDATE_GET');

        let updateUser = "update users SET liability += " + liabilityForBlance + ",balance+= " + liabilityForBlance + " where id=" + data.user_id + "";

        let balance = getUserBalanceRecord.recordset[0].balance;

        if (balance == 0) {

            return resultdb(CONSTANTS.VALIDATION_ERROR, "Insufficient User Balance ");
        }

        const resFromDBr = await pool.request()
            .input('user_id', sql.VarChar(50), data.user_id)
            .input('super_admin_id', sql.VarChar(50), pSuperAdmin)
            .input('admin_id', sql.VarChar(50), pAdmin)
            .input('super_master_id', sql.VarChar(50), pSuperMaster)
            .input('master_id', sql.VarChar(50), pMaster)
            .input('agent_id', sql.VarChar(50), pAgent)
            .input('sport_id', sql.VarChar(50), data.sport_id)
            .input('match_id', sql.BigInt, data.match_id)
            .input('super_admin', sql.VarChar(50), data.super_admin)
            .input('admin', sql.VarChar(50), data.admin)
            .input('super_master', sql.VarChar(50), data.super_master)
            .input('master', sql.VarChar(50), data.master)
            .input('agent', sql.VarChar(50), data.agent)
            .input('market_id', sql.VarChar(50), data.market_id)
            .input('market_name', sql.VarChar(50), data.market_name)
            .input('selection_id', sql.VarChar(50), data.selection_id)
            .input('selection_name', sql.VarChar(50), data.selection_name)
            .input('redis_odds', sql.Decimal(10, 2), data.redis_odds)
            .input('admin_odds', sql.Decimal(10, 2), data.admin_odds)
            .input('odds', sql.VarChar(50), data.odds)
            .input('stack', sql.VarChar(50), data.stack)
            .input('is_back', sql.VarChar(50), data.is_back)
            .input('p_l', sql.VarChar(50), data.p_l)
            .input('liability', sql.VarChar(50), data.liability)
            .input('profit', sql.VarChar(50), data.profit)
            .input('chips', sql.VarChar(50), data.chips)
            .input('type_id', sql.VarChar(50), data.type_id)
            .input('super_admin_commission', sql.VarChar(50), data.super_admin_commission)
            .input('admin_commission', sql.VarChar(50), data.admin_commission)
            .input('super_master_commission', sql.VarChar(50), data.super_master_commission)
            .input('master_commission', sql.VarChar(50), data.master_commission)
            .input('agent_commission', sql.VarChar(50), data.agent_commission)
            .input('user_commission', sql.VarChar(50), data.user_commission)
            .input('is_matched', sql.VarChar(50), data.is_matched)
            .input('device_type', sql.VarChar(50), data.device_type)
            .input('ip_address', sql.VarChar(50), data.ip_address)
            .input('device_info', sql.VarChar(50), data.device_info)
            .input('currentdate', sql.VarChar(50), currentdate)
            .input('commission_type_partnership_percentage', sql.VarChar(50), data.commission_type_partnership_percentage)
            .input('user_commission_lena_dena', sql.VarChar(50), data.user_commission_lena_dena)

            //.input('liabilityforbalance', sql.VarChar(150), liabilityForBlance) 
            .query("insert into cassino_bets_odds (user_id,super_admin_id,admin_id,super_master_id,master_id,agent_id, sport_id, match_id,market_id,market_name,selection_id,selection_name,redis_odds,admin_odds,odds,stack,is_back,p_l,liability,profit,super_admin,admin,super_master,master,agent,chips,type_id,super_admin_commission,admin_commission,super_master_commission,master_commission,agent_commission,user_commission,is_matched,device_type,device_info,created_by,created_at,created_ip,commission_type_partnership_percentage,user_commission_lena_dena) values(@user_id,@super_admin_id,@admin_id,@super_master_id,@master_id,@agent_id,@sport_id,@match_id,@market_id, @market_name,@selection_id, @selection_name,@redis_odds,@admin_odds,@odds,@stack,@is_back,@p_l,@liability,@profit,@super_admin,@admin,@super_master,@master,@agent ,@chips,@type_id,@super_admin_commission,@admin_commission,@super_master_commission,@master_commission,@agent_commission,@user_commission,@is_matched,@device_type,@device_info,@user_id,@currentdate,@ip_address,@commission_type_partnership_percentage,@user_commission_lena_dena); SELECT SCOPE_IDENTITY() AS bet_id");

        updateOddsCasinoProfitLoss(data);
        let lastInsId = resFromDBr.recordset[0].bet_id;
        /* const saveProfilLoss = await pool.request()  
       .input('pUserId', sql.Int, data.user_id)
       .input('pMarketId', sql.VarChar(100), data.market_id)
       .execute('SP_CASINO_SAVE_ODDS_PROFIT_LOSS');
       
       
      /*  let updateUser = "update users SET liability += "+liabilityForBlance+",balance+= "+liabilityForBlance+" where id="+data.user_id+"";

       if(CONSTANTS.USER_BET_LOG_YES_NO =='Y'){        
           let userBetLogs = "insert into user_bet_logs (user_id,match_id,market_id,bet_id,type,old_balance,old_liability,new_liability,bet_user_query,created_at) VALUES("+data.user_id+","+data.match_id+",'"+data.market_id+"',"+lastInsId+",'C',"+data.userDataById.balance+","+data.userDataById.liability+","+liabilityForBlance+",'"+updateUser+"',"+currentdate+")";      
           await pool.request()         
           .query(userBetLogs);  
       }

       //console.log(updateUser);
       await pool.request()         
       .query(updateUser); */


        //let lastInsId= resFromDBr.recordset[0].bet_id;

        if (CONSTANTS.USER_BET_LOG_YES_NO == 'Y') {
            let userBetLogs = "insert into user_bet_logs (user_id,match_id,market_id,bet_id,type,old_balance,old_liability,new_liability,bet_user_query,created_at) VALUES(" + data.user_id + "," + data.match_id + ",'" + data.market_id + "'," + lastInsId + ",'C'," + data.userDataById.balance + "," + data.userDataById.liability + "," + liabilityForBlance + ",'" + updateUser + "'," + currentdate + ")";
            await pool.request()
                .query(userBetLogs);
        }


        return resultdb(CONSTANTS.SUCCESS, resFromDBr.recordsets);
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

async function updateOddsCasinoProfitLoss(data) {
    const pool = await poolPromise;
    await pool.request()
        .input('pUserId', sql.Int, data.user_id)
        .input('pMarketId', sql.VarChar(100), data.market_id)
        .execute('SP_CASINO_SAVE_ODDS_PROFIT_LOSS');
}

let resultdeclear = async (data) => {
    try {

        const pool = await poolPromise;
        const result = await pool.request()
            .input('sport_id', sql.Int, data.sport_id)
            .query("select TOP 10 mrkt.card_data from cassino_matches as mtch join cassino_markets as mrkt ON mrkt.match_id=mtch.match_id where mtch.sport_id=@sport_id and mtch.is_completed='Y' AND mrkt.name='Match Odds' AND mrkt.card_data IS NOT NULL order by mtch.id desc");
        if (result.recordsets.length <= 0) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        } else {
            let tempData = [];
            let selectionsData = result.recordsets[0];
            // console.log(selectionsData);
            for (let i in selectionsData) {
                let cardData = JSON.parse(selectionsData[i].card_data);
                if (Array.isArray(cardData)) {
                    cardData = cardData[0];
                }

                delete selectionsData[i].card_data;
                //for(let j in cardData){
                selectionsData[i].match_id = cardData.matchId;
                selectionsData[i].indexCard = cardData.indexCard;
                if (data.sport_id == CONSTANTS.BETFAIR_SPORT_ANDER_BAHAR_D) {
                    selectionsData[i].indexCard2 = cardData.indexCard2;
                }
                let marketRunner = cardData.marketRunner;


                for (let k in marketRunner) {
                    let winnerName = marketRunner[k].name;
                    
                    selectionsData[i].winner_desc = marketRunner[k].resDesc ? marketRunner[k].resDesc : '';


                    delete marketRunner[k].type;
                    delete marketRunner[k].back;
                    delete marketRunner[k].lay;
                    delete marketRunner[k].sortPriority;
                    delete marketRunner[k].pl;
                    let status = marketRunner[k].status;

                    if (status == 'WINNER') {
                        let winnerString = '';
                       
                        if (winnerName == 'Andar') {
                            winnerString = winnerName.replace('Andar', 'A');
                        } else if (winnerName == 'Bahar') {
                            winnerString = winnerName.replace('Bahar', 'B');
                        }
                        else if (winnerName == 'HIGHER') {
                            winnerString = winnerName.replace('HIGHER', 'H');
                        }
                        else if (winnerName == 'SNAP') {
                            winnerString = winnerName.replace('SNAP', 'S');
                        }
                        else if (winnerName == 'LOWER') {
                            winnerString = winnerName.replace('LOWER', 'L');
                        }
                        else if (winnerName == '7Up') {
                            winnerString = winnerName.replace('7Up', 'U');
                        }
                        else if (winnerName == '7Down') {
                            winnerString = winnerName.replace('7Down', 'D');
                        }
                        else if (winnerName == 'Under Pasa') {
                            winnerString = winnerName.replace('Under Pasa', 'U');
                        }
                        else if (winnerName == 'Over Pasa') {
                            winnerString = winnerName.replace('Over Pasa', 'O');
                        }
                        else if (winnerName == 'Tiger') {
                            winnerString = winnerName.replace('Tiger', 'T');
                        }
                        else if (winnerName == 'Dragon') {
                            winnerString = winnerName.replace('Dragon', 'D');
                        }
                        else if (winnerName == 'Lion') {
                            winnerString = winnerName.replace('Lion', 'L');
                        }
                        else if (data.sport_id == 6669 && winnerName == 'Player') {
                            winnerString = winnerName.replace('Player', 'P');
                        }
                        else if (winnerName == 'Banker') {
                            winnerString = winnerName.replace('Banker', 'B');
                        }
                        else if (!isNaN(winnerName) ){                          
                            winnerString = winnerName;
                        }
                        else {
                            winnerString = winnerName.replace('Player ', '');
                        }

                        selectionsData[i].winner = winnerString;
                        marketRunner[k].win = 1;
                    } else {
                        marketRunner[k].win = 0;
                    }
                }
                selectionsData[i].marketRunner = JSON.stringify(marketRunner);
                // console.log(marketRunner); 
                //}
            }
            for (let i in selectionsData) {
                //console.log(selectionsData[i].marketRunner);
                selectionsData[i].runners = JSON.parse(selectionsData[i].marketRunner);
                delete selectionsData[i].marketRunner;
            }

            // console.log(selectionsData);
            return resultdb(CONSTANTS.SUCCESS, selectionsData);
        }
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

let casinoresultbydate = async (data) => {
    try {
        var offset = (data.pageno - 1) * data.limit;
        //console.log();
        let query = "select mrkt.card_data from cassino_matches as mtch join cassino_markets as mrkt ON mrkt.match_id=mtch.match_id where mtch.sport_id=" + data.sport_id + " and mtch.is_completed='Y' AND mrkt.card_data IS NOT NULL AND mtch.start_date>=" + data.from_date + " AND mtch.start_date <=" + data.to_date + " order by mtch.id desc OFFSET  " + offset + " ROWS FETCH NEXT " + data.limit + " ROWS ONLY";
        //console.log(query);
        const pool = await poolPromise;
        const result = await pool.request()
            .query(query);
        if (result.recordsets.length <= 0) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        } else {
            let tempData = [];
            let selectionsData = result.recordsets[0];
            for (let i in selectionsData) {
                let cardData = JSON.parse(selectionsData[i].card_data);
                delete selectionsData[i].card_data;
                for (let j in cardData) {
                    selectionsData[i].match_id = cardData.roundId;
                    selectionsData[i].indexCard = cardData.indexCard;
                    let marketRunner = cardData.marketRunner;

                    for (let k in marketRunner) {
                        let winnerName = marketRunner[k].name;

                        selectionsData[i].winner_desc = marketRunner[k].resDesc ? marketRunner[k].resDesc : '';


                        delete marketRunner[k].type;
                        delete marketRunner[k].back;
                        delete marketRunner[k].lay;
                        delete marketRunner[k].sortPriority;
                        delete marketRunner[k].pl;
                        let status = marketRunner[k].status;

                        if (status == 'WINNER') {
                            let winnerString = '';
                           
                            if (winnerName == 'Andar') {
                                winnerString = winnerName.replace('Andar', 'A');
                            } else if (winnerName == 'Bahar') {
                                winnerString = winnerName.replace('Bahar', 'B');
                            }
                            else if (winnerName == 'HIGHER') {
                                winnerString = winnerName.replace('HIGHER', 'H');
                            }
                            else if (winnerName == 'SNAP') {
                                winnerString = winnerName.replace('SNAP', 'S');
                            }
                            else if (winnerName == 'LOWER') {
                                winnerString = winnerName.replace('LOWER', 'L');
                            }
                            else if (winnerName == '7Up') {
                                winnerString = winnerName.replace('7Up', 'U');
                            }
                            else if (winnerName == '7Down') {
                                winnerString = winnerName.replace('7Down', 'D');
                            }
                            else if (winnerName == 'Under Pasa') {
                                winnerString = winnerName.replace('Under Pasa', 'U');
                            }
                            else if (winnerName == 'Over Pasa') {
                                winnerString = winnerName.replace('Over Pasa', 'O');
                            }
                            else if (winnerName == 'Tiger') {
                                winnerString = winnerName.replace('Tiger', 'T');
                            }
                            else if (winnerName == 'Dragon') {
                                winnerString = winnerName.replace('Dragon', 'D');
                            }
                            else if (winnerName == 'Lion') {
                                winnerString = winnerName.replace('Lion', 'L');
                            }
                            else if (data.sport_id == 6669 && winnerName == 'Player') {
                                winnerString = winnerName.replace('Player', 'P');
                            }
                            else if (winnerName == 'Banker') {
                                winnerString = winnerName.replace('Banker', 'B');
                            }
                            else if (!isNaN(winnerName) ){                          
                                winnerString = winnerName;
                            }
                            else {
                                winnerString = winnerName.replace('Player ', '');
                            }
    
                            selectionsData[i].winner = winnerString;
                            marketRunner[k].win = 1;
                        } else {
                            marketRunner[k].win = 0;
                        }


                    }
                    selectionsData[i].marketRunner = JSON.stringify(marketRunner);

                }
            }
            for (let i in selectionsData) {

                selectionsData[i].runners = JSON.parse(selectionsData[i].marketRunner);
                delete selectionsData[i].marketRunner;
            }


            return resultdb(CONSTANTS.SUCCESS, selectionsData);
        }
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};


let saveThimbleBetData = async (data) => {

    try {
        const pool = await poolPromise;
        const resFromDB = await pool.request()
            .input('pUserid', sql.Int, data.user_id)
            .execute('GET_ALL_PARENT_USER');
        let getAllparent = Array();
        for (let i in resFromDB.recordset) {
            var resultGet = resFromDB.recordset[i]
            getAllparent[i] = resultGet.id;
        }
        delete data.userDataById;

        const getUserBalanceRecord = await pool.request()
            .input('pLiabilityForBlance', sql.Float, data.liability)
            .input('pUserid', sql.Int, data.user_id)
            .input('pSuperAdmin', sql.Int, getAllparent[0])
            .input('pAdmin', sql.Int, getAllparent[1])
            .input('pSuperMaster', sql.Int, getAllparent[2])
            .input('pMaster', sql.Int, getAllparent[3])
            .input('pAgent', sql.Int, getAllparent[4])
            .input('pMarketID', sql.VarChar(150), data.market_id)
            .input('P_L', sql.Float, data.p_l)
            .input('Stack', sql.Float, data.stack)
            .input('pbetJson', sql.NVarChar(10000), JSON.stringify(data))
            .execute('SP_SAVE_BET_TITLI_MARKET');


        await pool.request()
            .input('pSportsID', sql.Int, data.sport_id)
            .input('pMatchID', sql.BigInt(20), data.match_id)
            .input('pMarketID', sql.VarChar(100), data.market_id)
            .input('pSelectionID', sql.VarChar(100), data.result_id)
            .input('pSportsNM', sql.VarChar(500), data.market_name)
            .input('pMatchNM', sql.VarChar(500), data.market_name)
            .input('pMarketNM', sql.VarChar(500), data.market_name)
            .input('pSelectionNM', sql.VarChar(500), data.winner_name)
            .input('pSuperAdminCommissionType', sql.Int, 0)
            .input('pSeriesID', sql.Int, 4444444)
            .input('pWinnerNM', sql.VarChar(500), data.winner_name)
            .execute('SP_SET_RESULT_MATKA_MARKETS');

        if (getUserBalanceRecord.recordset[0].savebeterror == 1) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Dublicate entry not allowed on same time");
        }
        if (getUserBalanceRecord.recordset[0].balance == 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Insufficient Balance!");
        }
        return resultdb(CONSTANTS.SUCCESS, getUserBalanceRecord.recordset);
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

let saveMatkaMarketBetData = async (amount, match_id, id) => {
    try {
        const pool = await poolPromise;
        const saveMatkaBets = await pool.request()
            .input('pUserid', sql.Int, id)
            .input('pMatchid', sql.NVarChar(500), match_id)
            .query(" insert into matka_bets_odds (user_id,super_admin_id,admin_id,super_master_id,master_id,agent_id, sport_id, match_id,market_id,market_name,selection_id,selection_name,patti_type, odds,stack,p_l,liability,profit,super_admin,admin,super_master,master,agent,chips,type_id,super_admin_commission,admin_commission,super_master_commission,master_commission,agent_commission,user_commission,commission_type_partnership_percentage , user_commission_lena_dena, is_matched,device_type,device_info,created_by,created_at,created_ip) SELECT user_id,super_admin_id,admin_id,super_master_id,master_id,agent_id, sport_id, match_id,market_id,market_name,selection_id,selection_name,patti_type, odds,stack,p_l,liability,profit,super_admin,admin,super_master,master,agent,chips,type_id,super_admin_commission,admin_commission,super_master_commission,master_commission,agent_commission,user_commission,commission_type_partnership_percentage , user_commission_lena_dena,is_matched,device_type,device_info,created_by,created_at,created_ip FROM matka_temp_bet where user_id =@pUserid and match_id = @pMatchid");

        await pool.request()
            .input('pUserid', sql.Int, id)
            .input('pMatchid', sql.BigInt(20), match_id)
            .query("delete matka_temp_bet where user_id =@pUserid and match_id =@pMatchid");

        return resultdb(CONSTANTS.SUCCESS, saveMatkaBets.recordset);


    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

let saveMatkaMarketTempBetData = async (data) => {

    try {
        const pool = await poolPromise;
        const resFromDB = await pool.request()
            .input('pUserid', sql.Int, data.user_id)
            .execute('GET_ALL_PARENT_USER');
        let getAllparent = Array();
        for (let i in resFromDB.recordset) {
            var resultGet = resFromDB.recordset[i]
            getAllparent[i] = resultGet.id;
        }
        delete data.userDataById;
        console.log("SP_SAVE_BET_MATKA_MARKET " + data.liability + "," + data.user_id + ", " + getAllparent[0] + ", " + getAllparent[1] + ", " + getAllparent[2] + ", " + getAllparent[3] + ", " + getAllparent[4] + " , '" + data.market_id + "', " + data.p_l + "," + data.stack + ", '" + JSON.stringify(data) + "' ");
        const getUserBalanceRecord = await pool.request()
            .input('pLiabilityForBlance', sql.Float, data.liability)
            .input('pUserid', sql.Int, data.user_id)
            .input('pSuperAdmin', sql.Int, getAllparent[0])
            .input('pAdmin', sql.Int, getAllparent[1])
            .input('pSuperMaster', sql.Int, getAllparent[2])
            .input('pMaster', sql.Int, getAllparent[3])
            .input('pAgent', sql.Int, getAllparent[4])
            .input('pMarketID', sql.VarChar(150), data.market_id)
            .input('P_L', sql.Float, data.p_l)
            .input('Stack', sql.Float, data.stack)
            .input('pbetJson', sql.NVarChar(10000), JSON.stringify(data))
            .execute('SP_SAVE_BET_MATKA_MARKET');

        /* if (getUserBalanceRecord.recordset[0].savebeterror == 1) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Dublicate entry not allowed on same time");
        } 
        if(getUserBalanceRecord.recordset[0].balance == 0 ){            
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Insufficient Balance!" );
        } */
        return resultdb(CONSTANTS.SUCCESS, getUserBalanceRecord.recordset);
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

let saveTitliMarketBetData = async (data) => {
    try {
        const pool = await poolPromise;
        const resFromDB = await pool.request()
            .input('pUserid', sql.Int, data.user_id)
            .execute('GET_ALL_PARENT_USER');
        let getAllparent = Array();
        for (let i in resFromDB.recordset) {
            var resultGet = resFromDB.recordset[i]
            getAllparent[i] = resultGet.id;
        }
        delete data.userDataById;


        const getUserBalanceRecord = await pool.request()
            .input('pLiabilityForBlance', sql.Float, data.liability)
            .input('pUserid', sql.Int, data.user_id)
            .input('pSuperAdmin', sql.Int, getAllparent[0])
            .input('pAdmin', sql.Int, getAllparent[1])
            .input('pSuperMaster', sql.Int, getAllparent[2])
            .input('pMaster', sql.Int, getAllparent[3])
            .input('pAgent', sql.Int, getAllparent[4])
            .input('pMarketID', sql.VarChar(150), data.market_id)
            .input('P_L', sql.Float, data.p_l)
            .input('Stack', sql.Float, data.stack)
            .input('pbetJson', sql.NVarChar(10000), JSON.stringify(data))
            .execute('SP_SAVE_BET_TITLI_MARKET');

        if (getUserBalanceRecord.recordset[0].savebeterror == 1) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Dublicate entry not allowed on same time");
        }
        if (getUserBalanceRecord.recordset[0].balance == 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Insufficient Balance!");
        }
        return resultdb(CONSTANTS.SUCCESS, getUserBalanceRecord.recordset);
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

let matkaValidateBet = async (data) => {
    try {

        let userSetting = data.user_setting_data;
        let userData = data.userDataById;

        let sportService = await sportsService.getSportSettingMatka(data.sport_id);
        sportService = sportService.data;

        if ((CONSTANTS.UN_MATCH_BET_ALLOW_OR_NOT == 0) && (data.is_matched == 0) || sportService.unmatch_bets == 'Y') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Rate has been changed");
        }
        if (sportService.status == 'N') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "This Sport is not avaliable for bet");
        }

        if (userData.self_lock_betting == 'Y' || userData.parent_lock_betting == 'Y') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your betting has been locked by your parent");
        }
        if (userData.self_lock_user == 'Y' || userData.parent_lock_user == 'Y') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your account has been locked by your parent");
        }
        if (userData.self_close_account == 'Y' || userData.parent_close_account == 'Y') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your account has been closed by your parent");
        }

        let marketSetting = await matkabetService.getMarketSettingById(data.market_id);

        marketSetting = marketSetting.data;

        if (marketSetting.market_admin_message != null && marketSetting.market_admin_message != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Bet is not allowed");
        }

        if (marketSetting.max_bet_liability < Math.abs(data.liability) && marketSetting.max_bet_liability != null && marketSetting.max_bet_liability != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your max bet liability " + marketSetting.max_bet_liability + " is exceeded");
        }

        if (marketSetting.is_bet_allow == 'N' || sportService.is_bet_allow == 'N') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Bet is not allowed on this market");
        }
        if (marketSetting.liability_type == 'N') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Market liability not allowed");
        }

        if (marketSetting.min_stack != null && marketSetting.min_stack != 0 && parseFloat(marketSetting.min_stack) > parseFloat(data.stack)) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "You can not place bet less than " + marketSetting.min_stack + "");
        }

        if (marketSetting.max_stack != null && marketSetting.max_stack != 0 && parseFloat(marketSetting.max_stack) < parseFloat(data.stack)) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "You can not place bet more than " + marketSetting.max_stack + "");
        }

        let userBalanceData = await userService.getUserBalanceOnly(data.user_id);

        userData.balance = userBalanceData.data.balance;

        if (Math.abs(data.liability) > userData.balance) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Insufficient Balance");
        }

        if (Math.abs(data.liability) > userSetting.max_exposure && userSetting.max_exposure != null && userSetting.max_exposure != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your bet liability is " + userSetting.max_exposure + " exceeded");
        }
        if (Math.abs(data.liability) < userSetting.min_exposure && userSetting.min_exposure != null && userSetting.min_exposure != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your min bet liability should be less than " + userSetting.min_exposure + "");
        }

        if (data.p_l > userSetting.winning_limit && userSetting.winning_limit != null && userSetting.winning_limit != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your bet profit " + userSetting.winning_limit + " is exceeded");
        }
        if (userSetting.max_match_stack != null && userSetting.max_match_stack != 0 && userSetting.max_match_stack < data.stack) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "You can not place bet more than " + userSetting.max_match_stack + "");
        }

        if (userSetting.min_match_stack != null && userSetting.min_match_stack != 0 && userSetting.min_match_stack > data.stack) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "You can not place bet less than " + userSetting.min_match_stack + "");
        }
        return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};



let validateFancyBetMeterKhado = async (data) => {
    try {

        let matchSetting = await marketsService.getFancySettingById(data.fancy_id, data.match_id);
        matchSetting = matchSetting.data;

        if (matchSetting.market_admin_message != null && matchSetting.market_admin_message != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Bet is not allowed");
        }

        if (matchSetting.min_stack != null && matchSetting.min_stack != 0 && matchSetting.min_stack > data.stack) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "You can not place bet less than" + matchSetting.min_stack + "");
        }

        if (matchSetting.max_stack != null && matchSetting.max_stack != 0 && matchSetting.max_stack < data.stack) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "You can not place bet more than" + matchSetting.max_stack + "");
        }

        if (matchSetting.is_bet_allow == 'N') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Bet is not allowed on this session");
        }

        //console.log(' matchSetting.session_max_profit', matchSetting.session_max_profit);
        //console.log(' data.is_manual_odds', data.is_manual_odds);

        let betFairFancy = await exchangeService.getFancyByFancyId(data.fancy_id, data.match_id, data.is_manual_odds);
        betFairFancy = betFairFancy.data;
        //console.log('betFairFancy',betFairFancy)
        if (betFairFancy == null) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Fancy Closed");
        }
        if (betFairFancy.length == 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Fancy Closed");
        }
        if (betFairFancy.GameStatus != '') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Fancy Suspended");
        }

        if (data.is_back == 1) {
            data.redisRun = betFairFancy.BackPrice1;
            data.redisSize = betFairFancy.BackSize1;
            /* if (betFairFancy.BackPrice1 != data.run) {
                return resultdb(CONSTANTS.VALIDATION_ERROR, "Run Changed");
            }
            if (betFairFancy.BackSize1 != data.size) {
                return resultdb(CONSTANTS.VALIDATION_ERROR, "Size Changed");
            } */
        } else {
            data.redisRun = betFairFancy.LayPrice1;
            data.redisSize = betFairFancy.LaySize1;
            /* if (betFairFancy.LayPrice1 != data.run) {
                return resultdb(CONSTANTS.VALIDATION_ERROR, "Run Changed");
            }
            if (betFairFancy.LaySize1 != data.size) {
                return resultdb(CONSTANTS.VALIDATION_ERROR, "Size Changed");
            } */
        }
        let userSetting = data.user_setting_data;

        if (data.stack <= 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Stake must be greater than zero");
        }
        if (data.size <= 0 && data.is_manual_odds !='ML') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Size must be greater than zero");
        }
        if (data.run <= 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Run must be greater than zero");
        }

        let userData = await userService.getUserByUserId(data.user_id);
        userData = userData.data;
        if (userData.self_lock_betting == 'Y' || userData.parent_lock_betting == 'Y') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your betting has been locked by your parent");
        }
        if (userData.self_lock_user == 'Y' || userData.parent_lock_user == 'Y') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your account has been locked by your parent");
        }
        if (userData.self_close_account == 'Y' || userData.parent_close_account == 'Y') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your account has been closed by your parent");
        }
        if (userData.self_lock_fancy_bet == 'Y' || userData.parent_lock_fancy_bet == 'Y') {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your betting has been locked by your parent");
        }
        console.log('createFancyPositionnew-----ddd----------------------- ');
        let createFancyPosition = ""
        if(data.is_manual_odds =='MM'){
           createFancyPosition = await fancyService.createFancyPositionMeter(data.user_id, data.match_id, data.fancy_id, data); 
        }else if(data.is_manual_odds =='MK'){
           //console.log('createFancyPositionnew-----ddd----------------------- ');
           createFancyPosition = await fancyService.createFancyPositionKhado(data.user_id, data.match_id, data.fancy_id, data); 
        }else{
           createFancyPosition = await fancyService.createFancyPositionFavourite(data.user_id, data.match_id, data.fancy_id, data);  
        }        

        createFancyPositionnew = createFancyPosition.data; 

       // console.log('createFancyPositionnew----------------rrr------------ ',createFancyPositionnew); return;

        let teamPositionData = await fancyService.getFancyPosition(data.user_id, data.match_id, data.fancy_id);
        let teamPosition = teamPositionData.data;

        

        let oldUserMaxProfit = teamPosition.profit;
        let oldUserMaxLoss = teamPosition.liability;

        let userMaxLoss = createFancyPositionnew.liability;
        let userMaxProfit = createFancyPositionnew.profit;



        if (userMaxProfit > matchSetting.session_max_profit && matchSetting.session_max_profit != null && matchSetting.session_max_profit != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your maxmium profit is " + matchSetting.session_max_profit + " exceeded");
        }

        if (Math.abs(userMaxLoss) > matchSetting.session_max_loss && matchSetting.session_max_loss != null && matchSetting.session_max_loss != 0) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Your liability is " + matchSetting.session_max_loss + " exceeded");
        }


        let userBalance = parseFloat(userData.balance) + Math.abs(oldUserMaxLoss);
        if (userMaxLoss >= 0) {
            data.liabilityForBlance = oldUserMaxLoss >= 0 ? 0 : Math.abs(oldUserMaxLoss);
            data.liabilityFancy = 0;
        } else {
            data.liabilityForBlance = (Math.abs(oldUserMaxLoss) - Math.abs(userMaxLoss));
            data.liabilityFancy = userMaxLoss;
        }


        data.profitFancy = userMaxProfit;
        data.fancy_score_position_json = createFancyPositionnew.fancy_position;
        data.fancy_score_position_id = teamPosition.id;


        if (Math.abs(userMaxLoss) > userBalance) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "Insufficient Balance");
        }




        if (userSetting.session_max_loss != null && userSetting.session_max_loss != 0) {

            let query = "SELECT ISNULL(SUM(ISNULL(liability, 0)), 0) AS total_liability FROM fancy_score_positions WHERE fancy_id ='" + data.fancy_id + "' AND user_id = " + data.user_id + " AND match_id=" + data.match_id + "";
            const pool = await poolPromise;
            const resFromDBr = await pool.request()
                .query(query);
            let getTotalFancyLiability = resFromDBr.recordsets[0][0].total_liability

            let total_liability = Math.abs(getTotalFancyLiability) + Math.abs(userMaxLoss);

            if (total_liability > userSetting.session_max_loss) {
                return resultdb(CONSTANTS.VALIDATION_ERROR, "Max limit on fancy liability is over");
            }
        }
        //console.log('heheheheheh avnash------------------------- ', userSetting);

        if (userSetting.max_session_stack != null && userSetting.max_session_stack != 0 && userSetting.max_session_stack < data.stack) {

            return resultdb(CONSTANTS.VALIDATION_ERROR, "You can not place bet more than " + userSetting.max_session_stack + "");
        }

        if (userSetting.min_session_stack != null && userSetting.min_session_stack != 0 && userSetting.min_session_stack > data.stack) {
            return resultdb(CONSTANTS.VALIDATION_ERROR, "You can not place bet less than " + userSetting.min_session_stack + "");
        }

        return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);
    } catch (error) {
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

let fetchBetsMatchAndFancyPnl = async (match_id, sport_id, user_id) => {
    const pool = await poolPromise;

    try {
        const betsOddsResult = await pool.request()
            .input('match_id', match_id)
            .input('sport_id', sport_id)
            .input('user_id', user_id)
            .query(`SELECT created_at AS Date,
             odds AS Rate, 
             stack AS Amt,
            CASE 
            WHEN is_back = 0 THEN 'KHAI' 
            WHEN is_back = 1 THEN 'LAGAI' 
            ELSE 'UNKNOWN' 
            END AS Mode,
            selection_name AS Team,
            chips AS   pL,
            winner_name AS Result
            FROM bets_odds
            WHERE match_id=@match_id AND user_id=@user_id AND sport_id=@sport_id
            ORDER BY created_at DESC`);



        const fancyBetsResult = await pool.request()
            .input('match_id', match_id)
            .input('sport_id', sport_id)
            .input('user_id', user_id)
            .query(`SELECT 
                created_at AS Date,
                fancy_name AS Fancy,
                fancy_id AS Selection,
                size AS Rate,
                stack AS Amt,
                'NO' AS mode,      
                0 AS result ,
                Chips AS pnl        
            FROM bets_fancy 
            WHERE match_id=@match_id AND user_id=@user_id AND sport_id=@sport_id 
            ORDER BY created_at DESC
        `);


        const response = {
            betsOdds: betsOddsResult.recordset || [],
            fancyBets: fancyBetsResult.recordset || []
        };

        return response;

    } catch (error) {
        console.error("Database query error:", error);
        return resultdb(CONSTANTS.ERROR, "An error occurred while fetching bets");
    }
};

let runningMarketAnalysisReport = async (user_id, allInplayMatchIds) => {
    try {
        const pool = await poolPromise;

        if (allInplayMatchIds.length === 0) {
            console.warn("No match IDs provided");
            return [];
        }

        const formattedMatchIds = allInplayMatchIds.join(','); 

        const allOddsBets = await pool.request()
            .input('user_id', user_id)
            .query(`
                SELECT 
                    bets_odds.market_name AS Market_Name, 
                    bets_odds.market_id AS Market_ID, 
                    matches.match_id AS Match_ID, -- Include match_id in the results
                    matches.name AS Match_Name, 
                    matches.sport_id AS Sport_ID, 
                    sports.name AS Sport_Name,
                    market_selections.selection_id AS Selection_ID,
                    market_selections.name AS Selection_Name,
                    CASE 
                        WHEN bets_odds.selection_id = market_selections.selection_id 
                        THEN bets_odds.p_l 
                        ELSE 0 
                    END AS PnL,  -- Show bets_odds.p_l where selection_id matches
                    CASE 
                        WHEN bets_odds.selection_id <> market_selections.selection_id 
                        THEN bets_odds.liability 
                        ELSE 0 
                    END AS Liability,  -- Show liability where selection_id does not match
                    'Open' AS Match_Status
                FROM 
                    bets_odds
                INNER JOIN 
                    matches ON bets_odds.match_id = matches.match_id
                INNER JOIN 
                    sports ON matches.sport_id = sports.sport_id
                INNER JOIN 
                    market_selections ON bets_odds.market_id = market_selections.market_id
                WHERE 
                    matches.match_id IN (${formattedMatchIds}) -- Use IN for multiple match IDs
                    AND bets_odds.user_id = @user_id
                ORDER BY 
                    matches.match_id, market_selections.selection_id; -- Order by match_id and selection_id
            `);

 const organizedResults = {};

            allOddsBets.recordset.forEach(row => {
                const matchId = row.Match_ID;
                const marketName = row.Market_Name;
            
                if (!organizedResults[matchId]) {
                    organizedResults[matchId] = {
                        Match_ID: matchId,
                        Match_Name: row.Match_Name,
                        Sport_ID: row.Sport_ID,
                        Sport_Name: row.Sport_Name,
                        Market_Odds: {}
                    };
                }
            
                if (!organizedResults[matchId].Market_Odds[marketName]) {
                    organizedResults[matchId].Market_Odds[marketName] = [];
                }
            
                const existingEntry = organizedResults[matchId].Market_Odds[marketName].find(
                    item => item.Selection_ID === row.Selection_ID && item.Market_ID === row.Market_ID
                );
            
                if (existingEntry) {
                    existingEntry.PnL += row.PnL !== 0 ? row.PnL : row.Liability;
                } else {
                    organizedResults[matchId].Market_Odds[marketName].push({
                        Market_ID: row.Market_ID,
                        Selection_ID: row.Selection_ID,
                        teamName: row.Selection_Name,
                        PnL: row.PnL !== 0 ? row.PnL : row.Liability,
                        Match_Status: row.Match_Status
                    });
                }
            });
            
            const formattedData = Object.entries(organizedResults).map(([matchId, matchData]) => ({
                Match_ID: matchId,
                Match_Name: matchData.Match_Name,
                Sport_ID: matchData.Sport_ID,
                Sport_Name: matchData.Sport_Name,
                Market_Odds: Object.entries(matchData.Market_Odds).map(([marketName, oddsArray]) => ({
                    Market_Name: marketName,
                    Odds: oddsArray
                }))
            }));
            
            return formattedData;
    } catch (error) {
        console.error("Database query error:", error);
        return resultdb(CONSTANTS.ERROR, "An error occurred while fetching bets");
    }
};


module.exports = {
    saveMarketBetData,
    saveCasinoMarketBetData,
    validateBet,
    validateCasinoBet,
    saveFancyBetData,
    validateFancyBet,
    resultdeclear,
    casinoresultbydate,

    saveMatkaMarketBetData,
    matkaValidateBet,
    saveMatkaMarketTempBetData,
    saveTitliMarketBetData,
    saveThimbleBetData,
    validateFancyBetMeterKhado,
    fetchBetsMatchAndFancyPnl,
    runningMarketAnalysisReport
};
