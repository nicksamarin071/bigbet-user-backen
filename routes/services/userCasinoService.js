const settings = require('../../config/settings');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');
const axios = require('axios');
const exchangeService = require('./exchangeService');
let resultdb = globalFunction.resultdb;
const { poolPromise, sql } = require('../../db');
const connConfig = require('../../db/indexTest');
const SALT_WORK_FACTOR = 10;


/*Save Casino Matches */

let saveCasinoMatches = async () => {
    const pool = await poolPromise;
    try {
        const payload = {
            operator_id: settings.GURU_CASINO_OPERATOR_ID_INSERT_GAME,
            page: 1,
            page_size: 10000
        };
        let signature = globalFunction.createCasinoSignature(payload);

        let response = await axios.post(settings.GURU_CASINO_GAME_LIST_URL, payload, {
            headers: { 'Content-Type': 'application/json', "Signature": signature }
        });

        await pool.request()
            .input('sportID', sql.Int, CONSTANTS.BETFAIR_SPORT_CASINO_FUN)
            .query("TRUNCATE TABLE casino_games");
        if (response.data !== null && response.data.data != null) {

            let getMetaArray = response.data.data;

            if (getMetaArray.length > 0) {
                for (let record in getMetaArray) {
                    let result = getMetaArray[record];
                    let match_id = result.game_id;
                    let game_name = result.game_name;
                    let game_id = result.game_id;
                    let category = result.category;
                    let provider_name = result.provider_name;
                    let sub_provider_name = result.sub_provider_name;
                    let status = result.status == 'ACTIVE' ? 'Y' : 'N';
                    let game_code = result.game_code;

                    let Image = result.url_thumb;
                    let Url = result.url_thumb;
                    let requestJson = JSON.stringify(result);
                    let sportID = CONSTANTS.BETFAIR_SPORT_CASINO_FUN;
                    let seriesID = CONSTANTS.BETFAIR_SPORT_CASINO_FUN + "" + CONSTANTS.BETFAIR_SPORT_CASINO;
                    let inplayDate = Math.floor(Date.now() / 1000);



                    const updatRecord = await pool.request()
                        .input('match_id', sql.VarChar(255), match_id)
                        .query("SELECT * FROM casino_games WHERE match_id=@match_id");
                    if (updatRecord.recordset === null || updatRecord.recordset == 0) {
                        await pool.request()
                            .input('sport_id', sql.Int, sportID)
                            .input('series_id', sql.Int, seriesID)
                            .input('match_id', sql.VarChar(255), match_id)
                            .input('game_name', sql.VarChar(255), game_name)
                            .input('game_id', sql.VarChar(255), game_id)
                            .input('category', sql.VarChar(255), category)
                            .input('provider_name', sql.VarChar(255), provider_name)
                            .input('sub_provider_name', sql.VarChar(255), sub_provider_name)
                            .input('game_code', sql.VarChar(255), game_code)
                            .input('Url', sql.VarChar(255), Url)
                            .input('Image', sql.VarChar(255), Image)
                            .input('status', sql.VarChar(255), 'Y')
                            .input('request_json', sql.NVarChar(1000000), requestJson)
                            .input('created_at', sql.BigInt, inplayDate)
                            .input('updated_at', sql.BigInt, inplayDate)
                            .query("INSERT INTO casino_games (sport_id, series_id, match_id, game_name, game_id, category, provider_name, sub_provider_name, game_code,Url,Image, status, request_json, created_at, updated_at) VALUES(@sport_id, @series_id, @match_id, @game_name,@game_id, @category, @provider_name, @sub_provider_name, @game_code, @Url, @Image, @status, @request_json , @created_at,@updated_at)");
                    } else {
                        console.log('uuidr ------------------------- ', match_id);
                        await pool.request()
                            .input('match_id', sql.VarChar(255), match_id)
                            .query("UPDATE casino_games SET status='Y' WHERE match_id=@match_id");
                    }

                }
            }
        }
        return resultdb(CONSTANTS.SUCCESS, response.data);

    } catch (error) {
        console.log(' error --------FUN------------------------------------------------------ ', error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
}



let getCasinoMatches = async (id) => {
    const pool = await poolPromise;
    try {
        let sportID = CONSTANTS.BETFAIR_SPORT_CASINO_FUN;
        //let resultQuery = "SELECT  mtch.sport_id, mtch.series_id, mtch.match_id, mtch.game_name, mtch.game_id, mtch.category,mtch. provider_name, mtch.sub_provider_name, mtch.game_code,mtch.Url,mtch.Image FROM casino_games as mtch with(nolock) JOIN sports as spt with(nolock) ON spt.sport_id = mtch.sport_id   INNER JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = spt.sport_id AND usptset.user_id=" + id + " and usptset.assign_sport=1 LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id and dspt.user_id = " + id + " WHERE  spt.status='Y' AND ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND mtch.status='Y' AND provider_name='RG'  AND spt.sport_id=" + sportID;
        let resultQuery = "SELECT TOP 1000 mtch.sport_id, mtch.series_id, mtch.match_id, mtch.game_name, mtch.game_id, mtch.category,mtch. provider_name, mtch.sub_provider_name, mtch.game_code,mtch.Url,mtch.Image FROM casino_games as mtch with(nolock) JOIN sports as spt with(nolock) ON spt.sport_id = mtch.sport_id   INNER JOIN user_setting_sport_wise as usptset with(nolock) ON usptset.sport_id = spt.sport_id AND usptset.user_id=" + id + " and usptset.assign_sport=1 LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id and dspt.user_id = " + id + " WHERE  spt.status='Y' AND ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND mtch.status='Y' AND spt.sport_id=" + sportID;



        const liability = await pool.request().query(resultQuery);

        if (liability.recordsets === null || liability.recordsets[0] == 0) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        } else {
            return resultdb(CONSTANTS.SUCCESS, liability.recordsets[0]);
        }

    } catch (error) {
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

let casinoLogInsert = async function (data) {
    try {
        let currentdate = globalFunction.currentDateTimeStamp();
        const pool = await poolPromise;

        let userLotusAcStatement = "INSERT INTO  user_casino_market_logs (user_id,betType, debitAmount, gameId, reqId, match_id,  roundId, transactionId, type, request_json, created_at) VALUES(" + data.user_id + ",'" + data.betType + "', " + data.debitAmount + ", " + data.gameId + ", '" + data.reqId + "', " + data.match_id + ", '" + data.roundId + "', '" + data.transactionId + "', '" + data.type + "','" + data.request_json + "'," + currentdate + ")";
        //console.log(userLotusAcStatement);
        await pool.request().query(userLotusAcStatement);
        return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

    } catch (error) {
        console.error("casinoLogInsert insert logs ", error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};


let casinoInsertMatch = async function (data) {
    try {
        let currentdate = globalFunction.currentDateTimeStamp();
        const pool = await poolPromise;
        let getInserMatch = "SELECT match_id FROM cassino_matches where match_id=" + data.MatchId + " AND sport_id=" + CONSTANTS.BETFAIR_SPORT_CASINO_FUN;
        let result = await pool.request().query(getInserMatch);

        if (result.recordsets[0] === null || result.recordsets[0].length <= 0) {

            let matchId = data.MatchId;
            let marketId = data.MarketId;
            let seriesId = CONSTANTS.BETFAIR_SPORT_CASINO_FUN + "" + CONSTANTS.BETFAIR_SPORT_CASINO;

            let insertMatchData = "INSERT INTO cassino_matches (sport_id, series_id, match_id, cassino_match_type, name, match_date, start_date, score_board_json, score_type, score_key, liability_type, is_manual, is_completed, is_popular, is_cup, winner_name ,is_bet_allow, status ,created_by ,updated_by,created_ip ,created_at ,updated_at ,team_one_image ,team_two_image ,match_number ,stadium_location ) VALUES(" + CONSTANTS.BETFAIR_SPORT_CASINO_FUN + "," + seriesId + "," + matchId + ",0,'casino 5'," + currentdate + "," + currentdate + ",'[]','N','' ,'Y','N','N','N','N','','Y','Y',1,0,'" + data.ip_address + "'," + currentdate + ",0,'','',0,'')";
            await pool.request().query(insertMatchData);

            let insertMarketData = "INSERT INTO cassino_markets (sport_id, series_id, match_id, market_id, name, display_name, match_date, runner_json, market_runner_count, is_bet_allow, bet_allow_time_before, bet_delay, min_stack, max_stack, min_liability, max_market_liability, max_market_profit, min_loss, max_bet_liability, liability_type, status, is_visible, is_manual, is_result_declared, is_abandoned, card_data, result_id, winner_name,market_admin_message,created_by, updated_by, created_ip, created_at, updated_at, isbetalowaftermatchodds ) VALUES(" + CONSTANTS.BETFAIR_SPORT_CASINO_FUN + "," + seriesId + "," + matchId + ",'" + marketId + "','Match Odds','Match Odds'," + currentdate + ",'[]',2,'Y', 0, 0, 0 , 0, 0, 0, 0, 0, 0, 'Y', 'Y','Y','N','N','N','','','','',1,0,'" + data.ip_address + "'," + currentdate + ",0,'N')";
            await pool.request().query(insertMarketData);
        }

        return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);



    } catch (error) {
        console.error("casinoInsertMatch insert logs ", error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};


let updateCasinoDebitUserBalance = async function (data) {
    try {
        let currentdate = globalFunction.currentDateTimeStamp();
        const pool = await poolPromise;

        let getUserParentData = "SELECT super_admin,admin,super_master,master,agent,super_admin_id,admin_id,super_id as super_master_id,master_id,agent_id , super_admin_match_commission, admin_match_commission, super_master_match_commission, master_match_commission, agent_match_commission, user_match_commission FROM users usr with(nolock) JOIN partnerships part with(nolock) ON part.user_id=usr.id WHERE part.user_id=" + data.user_id + " and usr.id=" + data.user_id + " and part.sport_id=" + CONSTANTS.BETFAIR_SPORT_CASINO_FUN;

        const getAllparentData = await pool.request().query(getUserParentData);

        let super_admin_id = 0;
        let admin_id = 0;
        let super_master_id = 0;
        let master_id = 0;
        let agent_id = 0;

        let super_admin_partnership = 0;
        let admin_partnership = 0;
        let super_master_partnership = 0;
        let master_partnership = 0;
        let agent_partnership = 0;

        let super_admin_commission = 0;
        let admin_commission = 0;
        let super_master_commission = 0;
        let master_commission = 0;
        let agent_commission = 0;
        let user_commission = 0;


        if (getAllparentData.recordsets[0].length > 0) {
            super_admin_id = getAllparentData.recordset[0].super_admin_id;
            admin_id = getAllparentData.recordset[0].admin_id;
            super_master_id = getAllparentData.recordset[0].super_master_id;
            master_id = getAllparentData.recordset[0].master_id;
            agent_id = getAllparentData.recordset[0].agent_id;

            super_admin_partnership = getAllparentData.recordset[0].super_admin;
            admin_partnership = getAllparentData.recordset[0].admin;
            super_master_partnership = getAllparentData.recordset[0].super_master;
            master_partnership = getAllparentData.recordset[0].master;
            agent_partnership = getAllparentData.recordset[0].agent;

            super_admin_commission = getAllparentData.recordset[0].super_admin_match_commission;
            admin_commission = getAllparentData.recordset[0].admin_match_commission;
            super_master_commission = getAllparentData.recordset[0].super_master_match_commission;
            master_commission = getAllparentData.recordset[0].master_match_commission;
            agent_commission = getAllparentData.recordset[0].agent_match_commission;
            user_commission = getAllparentData.recordset[0].user_match_commission;
        }

        let totalExposer = 0;
        totalExposer -= data.liability;

        let insertXPGMarketExpo = "INSERT INTO user_casino_market_exposures (user_id,agent_id,master_id,super_master_id,admin_id,super_admin_id,super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission,master_commission,agent_commission,user_commission, sport_id, match_id,market_id,liability, betType, gameId, reqId, transactionId, is_type , created_at,created_ip ) VALUES (" + data.user_id + "," + agent_id + "," + master_id + "," + super_master_id + "," + admin_id + "," + super_admin_id + "," + super_admin_partnership + "," + admin_partnership + "," + super_master_partnership + "," + master_partnership + "," + agent_partnership + "," + super_admin_commission + "," + admin_commission + "," + super_master_commission + "," + master_commission + "," + agent_commission + "," + user_commission + "," + CONSTANTS.BETFAIR_SPORT_CASINO_FUN + "," + data.MatchId + ",'" + data.MarketId + "'," + totalExposer + ",'" + data.betType + "', " + data.gameId + ", '" + data.reqId + "',  '" + data.transactionId + "', '" + data.is_type + "',  " + currentdate + ",'" + data.ip_address + "')";
        await pool.request().query(insertXPGMarketExpo);


        let updateRunningExposure = "update users SET liability +=  " + totalExposer + " ,balance += " + totalExposer + " where id=" + data.user_id + "; SELECT parent_id,balance,liability from users where id=" + data.user_id + "";
        const getUserBalance = await pool.request().query(updateRunningExposure);

        return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

    } catch (error) {
        console.error(' ------------ updateCasinoDebitUserBalance -------------- ', error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};





let updateLobbyCasinoCreditUserBalance = async function (data) {
    try {
        let currentdate = globalFunction.currentDateTimeStamp();
        const pool = await poolPromise;

        let getRoundLastLiability = "SELECT SUM(liability) as liability, agent_id, master_id, super_master_id, admin_id, super_admin_id, super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission, master_commission, agent_commission, user_commission FROM user_casino_market_exposures WHERE user_id=" + data.user_id + " AND match_id=" + data.MatchId + " AND market_id='" + data.MarketId + "' AND transactionId='" + data.transactionId + "' AND is_type='" + data.is_type + "' GROUP BY agent_id, master_id, super_master_id, admin_id, super_admin_id, super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission, master_commission, agent_commission, user_commission";//ORDER BY id DESC";       
        //console.log('XPGAccountStatement -------------------------- ',getRoundLastLiability);
        const resGetRoundLastLiability = await pool.request().query(getRoundLastLiability);
        if (resGetRoundLastLiability.recordsets[0].length <= 0) {
            return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);
        }


        let lastRoundLiability = 0;

        let agent_id = 0;
        let master_id = 0;
        let super_master_id = 0;
        let admin_id = 0;
        let super_admin_id = 0;

        let super_admin = 0;
        let admin = 0;
        let super_master = 0;
        let master = 0;
        let agent = 0;

        let super_admin_commission = 0;
        let admin_commission = 0;
        let super_master_commission = 0;
        let master_commission = 0;
        let agent_commission = 0;
        let user_commission = 0;



        if (resGetRoundLastLiability.recordsets[0].length > 0) {
            lastRoundLiability = (resGetRoundLastLiability.recordset[0].liability && resGetRoundLastLiability.recordset[0].liability !== null) ? resGetRoundLastLiability.recordset[0].liability : 0;

            agent_id = resGetRoundLastLiability.recordset[0].agent_id;
            master_id = resGetRoundLastLiability.recordset[0].master_id;
            super_master_id = resGetRoundLastLiability.recordset[0].super_master_id;
            admin_id = resGetRoundLastLiability.recordset[0].admin_id;
            super_admin_id = resGetRoundLastLiability.recordset[0].super_admin_id;

            super_admin = resGetRoundLastLiability.recordset[0].super_admin;
            admin = resGetRoundLastLiability.recordset[0].admin;
            super_master = resGetRoundLastLiability.recordset[0].super_master;
            master = resGetRoundLastLiability.recordset[0].master;
            agent = resGetRoundLastLiability.recordset[0].agent;

            super_admin_commission = resGetRoundLastLiability.recordset[0].super_admin_commission;
            admin_commission = resGetRoundLastLiability.recordset[0].admin_commission;
            super_master_commission = resGetRoundLastLiability.recordset[0].super_master_commission;
            master_commission = resGetRoundLastLiability.recordset[0].master_commission;
            agent_commission = resGetRoundLastLiability.recordset[0].agent_commission;
            user_commission = resGetRoundLastLiability.recordset[0].user_commission;
        }

        let lastRoundProfitLoss = "";
        let lastRoundBalance = "";

        if (data.profit_loss === "" || data.profit_loss === null || data.profit_loss === 0 || data.profit_loss === "0.00") {

            lastRoundBalance = 0;
            lastRoundProfitLoss = lastRoundLiability;
        }
        else if (data.profit_loss !== "" && data.profit_loss !== null && data.profit_loss > 0) {

            lastRoundProfitLoss = parseFloat(data.profit_loss) + parseFloat(lastRoundLiability);
            lastRoundProfitLoss = parseFloat(lastRoundProfitLoss).toFixed(2);
            lastRoundBalance = parseFloat(data.profit_loss).toFixed(2);
        } else {

            lastRoundBalance = 0;
            lastRoundProfitLoss = parseFloat(data.profit_loss).toFixed(2);
        }

        let statementDescriptionPL = "Casino -> " + data.game_name + " -> Round Id # " + data.MarketId + " ";
        let statementDescription = "Casino -> " + data.game_name + " -> Round Id # " + data.MarketId + " Bet Amount -> " + lastRoundLiability + " , Profit -> " + data.profit_loss + "";

        let user_pl = lastRoundProfitLoss;
        let agent_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(agent) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(agent) / 100)).toFixed(2);

        let master_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(master) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(master) / 100)).toFixed(2);

        let super_master_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_master) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_master) / 100)).toFixed(2);

        let admin_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(admin) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(admin) / 100)).toFixed(2);

        let super_admin_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_admin) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_admin) / 100)).toFixed(2);

        let userCommission = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(user_commission) / 100)).toFixed(2) : 0;
        let agentCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(agent_commission) / 100)).toFixed(2) : 0;;
        let masterCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(master_commission) / 100)).toFixed(2) : 0;;
        let super_masterCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_master_commission) / 100)).toFixed(2) : 0;;
        let adminCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(admin_commission) / 100)).toFixed(2) : 0;;
        let super_adminCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_admin_commission) / 100)).toFixed(2) : 0;;

        //let insertXPGMarketExpo = "INSERT INTO user_casino_market_exposures (user_id,agent_id,master_id,super_master_id,admin_id,super_admin_id,super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission,master_commission,agent_commission,user_commission, sport_id, match_id,market_id,liability, created_at, sequence,transaction_id, is_type) VALUES (" + data.user_id + "," + agent_id + "," + master_id + "," + super_master_id + "," + admin_id + "," + super_admin_id + "," + super_admin + "," + admin + "," + super_master + "," + master + "," + agent + "," + super_admin_commission + "," + admin_commission + "," + super_master_commission + "," + master_commission + "," + agent_commission + "," + user_commission + "," + CONSTANTS.BETFAIR_SPORT_CASINO_FUN + "," + data.MatchId + ",'" + data.MarketId + "'," + data.profit_loss + "," + currentdate + "," + data.Sequence + "," + data.transaction_id + ",'" + data.is_type_update + "')";
        // await pool.request().query(insertXPGMarketExpo);



        let distributAmountQuery = "INSERT INTO user_profit_loss (user_id, agent_id, master_id, super_master_id, admin_id,super_admin_id, sport_id, match_id, market_id, type, bet_result_id, stack, description, reffered_name, created_at, user_pl, agent_pl, master_pl, super_master_pl, admin_pl, super_admin_pl, user_commission, agent_commission, master_commission, super_master_commission, admin_commission,super_admin_commission) VALUES(" + data.user_id + "," + agent_id + "," + master_id + "," + super_master_id + "," + admin_id + "," + super_admin_id + ", " + CONSTANTS.BETFAIR_SPORT_CASINO_FUN + ", " + data.MatchId + ", '" + data.MarketId + "', 1, 0, " + Math.abs(lastRoundLiability) + ", '" + statementDescriptionPL + "', '" + statementDescriptionPL + "', " + currentdate + ", " + user_pl + ", " + agent_pl + ", " + master_pl + ", " + super_master_pl + ", " + admin_pl + ", " + super_admin_pl + ", " + userCommission + ", " + agentCommission + ", " + masterCommission + ", " + super_masterCommission + "," + adminCommission + "," + super_adminCommission + " )";
        await pool.request().query(distributAmountQuery);
        let zeroValue = 0;
        await pool.request()
            .input('pMatchID', sql.BigInt, data.MatchId)
            .input('pMarketID', sql.VarChar(255), data.MarketId)
            .input('pIsFancy', sql.Int, zeroValue)
            .input('pIsRollback', sql.Int, zeroValue)
            .input('pIsSuperAdminCommission', sql.VarChar(150), zeroValue)
            .input('pSuperAdminCommissionType', sql.Int, zeroValue)
            .execute('SP_UPDATE_BALANCE_ON_EZUGI_XPG_LOTUS_RESULT');



        let updateRoundUserProfitLoss = "update users SET liability -=  " + lastRoundLiability + " , balance += " + lastRoundBalance + ", profit_loss +=" + lastRoundProfitLoss + " where id=" + data.user_id + "; SELECT parent_id,balance,liability from users where id=" + data.user_id + "";

        const getUserBalance = await pool.request().query(updateRoundUserProfitLoss);


        let totalAvailableBalance = parseFloat(getUserBalance.recordset[0].balance) - parseFloat(getUserBalance.recordset[0].liability);
        totalAvailableBalance = parseFloat(totalAvailableBalance).toFixed(2);
        let userParentId = getUserBalance.recordset[0].parent_id;

        let userLotusAcStatement = "INSERT INTO  account_statements (user_id, parent_id, description, statement_type, amount, available_balance, match_id, market_id, type, created_by, created_at,created_ip) VALUES(" + data.user_id + "," + userParentId + ",'" + statementDescription + "',2,'" + lastRoundProfitLoss + "','" + totalAvailableBalance + "'," + data.MatchId + ",'" + data.MarketId + "' ,'1'," + data.user_id + "," + currentdate + ",'" + data.ip_address + "')";

        await pool.request().query(userLotusAcStatement);

        let updateXpgCredit = "update user_casino_market_exposures SET is_type = '" + data.is_type_update + "' where user_id=" + data.user_id + "  AND match_id=" + data.MatchId + " AND market_id='" + data.MarketId + "'  AND transactionId='" + data.transactionId + "'  AND is_type='" + data.is_type + "'";
        await pool.request().query(updateXpgCredit);

        return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

    } catch (error) {
        console.error(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};



let updateCasinoRollbackUserBalance = async function (data) {
    try {
        let currentdate = globalFunction.currentDateTimeStamp();
        const pool = await poolPromise;

        let getRoundLastLiability = "SELECT SUM(liability) as liability, agent_id, master_id, super_master_id, admin_id, super_admin_id, super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission, master_commission, agent_commission, user_commission FROM user_casino_market_exposures WHERE user_id=" + data.user_id + " AND match_id=" + data.MatchId + " AND market_id='" + data.MarketId + "' AND transactionId='" + data.transactionId + "' AND is_type='" + data.is_type + "' GROUP BY agent_id, master_id, super_master_id, admin_id, super_admin_id, super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission, master_commission, agent_commission, user_commission";//ORDER BY id DESC";       
        //console.log('XPGAccountStatement -------------------------- ',getRoundLastLiability);
        const resGetRoundLastLiability = await pool.request().query(getRoundLastLiability);
        if (resGetRoundLastLiability.recordsets[0].length <= 0) {
            return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);
        }


        let lastRoundLiability = 0;

        let agent_id = 0;
        let master_id = 0;
        let super_master_id = 0;
        let admin_id = 0;
        let super_admin_id = 0;

        let super_admin = 0;
        let admin = 0;
        let super_master = 0;
        let master = 0;
        let agent = 0;

        let super_admin_commission = 0;
        let admin_commission = 0;
        let super_master_commission = 0;
        let master_commission = 0;
        let agent_commission = 0;
        let user_commission = 0;



        if (resGetRoundLastLiability.recordsets[0].length > 0) {
            lastRoundLiability = (resGetRoundLastLiability.recordset[0].liability && resGetRoundLastLiability.recordset[0].liability !== null) ? resGetRoundLastLiability.recordset[0].liability : 0;

            agent_id = resGetRoundLastLiability.recordset[0].agent_id;
            master_id = resGetRoundLastLiability.recordset[0].master_id;
            super_master_id = resGetRoundLastLiability.recordset[0].super_master_id;
            admin_id = resGetRoundLastLiability.recordset[0].admin_id;
            super_admin_id = resGetRoundLastLiability.recordset[0].super_admin_id;

            super_admin = resGetRoundLastLiability.recordset[0].super_admin;
            admin = resGetRoundLastLiability.recordset[0].admin;
            super_master = resGetRoundLastLiability.recordset[0].super_master;
            master = resGetRoundLastLiability.recordset[0].master;
            agent = resGetRoundLastLiability.recordset[0].agent;

            super_admin_commission = resGetRoundLastLiability.recordset[0].super_admin_commission;
            admin_commission = resGetRoundLastLiability.recordset[0].admin_commission;
            super_master_commission = resGetRoundLastLiability.recordset[0].super_master_commission;
            master_commission = resGetRoundLastLiability.recordset[0].master_commission;
            agent_commission = resGetRoundLastLiability.recordset[0].agent_commission;
            user_commission = resGetRoundLastLiability.recordset[0].user_commission;
        }

        let lastRoundProfitLoss = "";
        let lastRoundBalance = "";

        if (data.profit_loss === "" || data.profit_loss === null || data.profit_loss === 0 || data.profit_loss === "0.00") {

            lastRoundBalance = 0;
            lastRoundProfitLoss = lastRoundLiability;
        }
        else if (data.profit_loss !== "" && data.profit_loss !== null && data.profit_loss > 0) {

            lastRoundProfitLoss = parseFloat(data.profit_loss) + parseFloat(lastRoundLiability);
            lastRoundProfitLoss = parseFloat(lastRoundProfitLoss).toFixed(2);
            lastRoundBalance = parseFloat(data.profit_loss).toFixed(2);
        } else {

            lastRoundBalance = 0;
            lastRoundProfitLoss = parseFloat(data.profit_loss).toFixed(2);
        }

        let statementDescriptionPL = "Casino -> " + data.game_name + " -> Round Id # " + data.MarketId + " ";
        let statementDescription = "Casino -> " + data.game_name + " -> Round Id # " + data.MarketId + " Bet Amount -> " + lastRoundLiability + " , Profit -> " + data.profit_loss + "";

        let user_pl = lastRoundProfitLoss;
        let agent_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(agent) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(agent) / 100)).toFixed(2);

        let master_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(master) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(master) / 100)).toFixed(2);

        let super_master_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_master) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_master) / 100)).toFixed(2);

        let admin_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(admin) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(admin) / 100)).toFixed(2);

        let super_admin_pl = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_admin) / 100)).toFixed(2) : - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_admin) / 100)).toFixed(2);

        let userCommission = lastRoundProfitLoss > 0 ? - parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(user_commission) / 100)).toFixed(2) : 0;
        let agentCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(agent_commission) / 100)).toFixed(2) : 0;
        let masterCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(master_commission) / 100)).toFixed(2) : 0;
        let super_masterCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_master_commission) / 100)).toFixed(2) : 0;;
        let adminCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(admin_commission) / 100)).toFixed(2) : 0;
        let super_adminCommission = lastRoundProfitLoss > 0 ? parseFloat((parseFloat(lastRoundProfitLoss) * parseFloat(super_admin_commission) / 100)).toFixed(2) : 0;

        //let insertXPGMarketExpo = "INSERT INTO user_casino_market_exposures (user_id,agent_id,master_id,super_master_id,admin_id,super_admin_id,super_admin, admin, super_master, master, agent, super_admin_commission, admin_commission, super_master_commission,master_commission,agent_commission,user_commission, sport_id, match_id,market_id,liability, created_at, sequence,transaction_id, is_type) VALUES (" + data.user_id + "," + agent_id + "," + master_id + "," + super_master_id + "," + admin_id + "," + super_admin_id + "," + super_admin + "," + admin + "," + super_master + "," + master + "," + agent + "," + super_admin_commission + "," + admin_commission + "," + super_master_commission + "," + master_commission + "," + agent_commission + "," + user_commission + "," + CONSTANTS.BETFAIR_SPORT_CASINO_FUN + "," + data.MatchId + ",'" + data.MarketId + "'," + data.profit_loss + "," + currentdate + "," + data.Sequence + "," + data.transaction_id + ",'" + data.is_type_update + "')";
        // await pool.request().query(insertXPGMarketExpo);



        /*let distributAmountQuery = "INSERT INTO user_profit_loss (user_id, agent_id, master_id, super_master_id, admin_id,super_admin_id, sport_id, match_id, market_id, type, bet_result_id, stack, description, reffered_name, created_at, user_pl, agent_pl, master_pl, super_master_pl, admin_pl, super_admin_pl, user_commission, agent_commission, master_commission, super_master_commission, admin_commission,super_admin_commission) VALUES(" + data.user_id + "," + agent_id + "," + master_id + "," + super_master_id + "," + admin_id + "," + super_admin_id + ", " + CONSTANTS.BETFAIR_SPORT_CASINO_FUN + ", " + data.MatchId + ", '" + data.MarketId + "', 1, 0, " + Math.abs(lastRoundLiability) + ", '" + statementDescriptionPL + "', '" + statementDescriptionPL + "', " + currentdate + ", " + user_pl + ", " + agent_pl + ", " + master_pl + ", " + super_master_pl + ", " + admin_pl + ", " + super_admin_pl + ", " + userCommission + ", " + agentCommission + ", " + masterCommission + ", " + super_masterCommission + "," + adminCommission + "," + super_adminCommission + " )";
        await pool.request().query(distributAmountQuery);
        let zeroValue = 0;
        await pool.request()
            .input('pMatchID', sql.BigInt(20), data.MatchId)
            .input('pMarketID', sql.VarChar(150), data.MarketId)
            .input('pIsFancy', sql.Int, zeroValue)
            .input('pIsRollback', sql.Int, zeroValue)
            .input('pIsSuperAdminCommission', sql.VarChar(150), zeroValue)
            .input('pSuperAdminCommissionType', sql.Int, zeroValue)
            .execute('SP_UPDATE_BALANCE_ON_EZUGI_XPG_LOTUS_RESULT');*/



        let updateRoundUserProfitLoss = "update users SET liability -=  " + lastRoundLiability + " , balance += " + lastRoundBalance + ", profit_loss +=" + lastRoundProfitLoss + " where id=" + data.user_id + "; SELECT parent_id,balance,liability from users where id=" + data.user_id + "";

        const getUserBalance = await pool.request().query(updateRoundUserProfitLoss);


        //let totalAvailableBalance = parseFloat(getUserBalance.recordset[0].balance) - parseFloat(getUserBalance.recordset[0].liability);
        //totalAvailableBalance = parseFloat(totalAvailableBalance).toFixed(2);
        //let userParentId = getUserBalance.recordset[0].parent_id;

        //let userLotusAcStatement = "INSERT INTO  account_statements (user_id, parent_id, description, statement_type, amount, available_balance, match_id, market_id, type, created_by, created_at,created_ip) VALUES(" + data.user_id + "," + userParentId + ",'" + statementDescription + "',2,'" + lastRoundProfitLoss + "','" + totalAvailableBalance + "'," + data.MatchId + ",'" + data.MarketId + "' ,'1'," + data.user_id + "," + currentdate + ",'" + data.ip_address + "')";

        //await pool.request().query(userLotusAcStatement);

        let updateXpgCredit = "update user_casino_market_exposures SET is_type = '" + data.is_type_update + "' where user_id=" + data.user_id + "  AND match_id=" + data.MatchId + " AND market_id='" + data.MarketId + "' AND transactionId='" + data.transactionId + "'  AND is_type='" + data.is_type + "'";
        await pool.request().query(updateXpgCredit);

        return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

    } catch (error) {
        console.error(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};



let getTransationId = async function (data) {
    try {
        let currentdate = globalFunction.currentDateTimeStamp();
        const pool = await poolPromise;

        let getTransationIdQuery = "SELECT transactionId,is_type,user_id FROM user_casino_market_exposures WHERE transactionId='" + data.transactionId + "' AND user_id=" + data.user_id;
        const result = await pool.request().query(getTransationIdQuery);
        if (result.recordsets === null || result.recordsets[0] == 0) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        } else {
            return resultdb(CONSTANTS.SUCCESS, result.recordset[0]);
        }

    } catch (error) {
        console.error("casinoLogInsert insert logs ", error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

let getGameId = async function (gameId) {
    try {
        let currentdate = globalFunction.currentDateTimeStamp();
        const pool = await poolPromise;

        let getTransationIdQuery = "SELECT TOP 1 * FROM casino_games WHERE game_id='" + gameId + "' ";
        const result = await pool.request().query(getTransationIdQuery);
        if (result.recordsets === null || result.recordsets[0] == 0) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        } else {
            return resultdb(CONSTANTS.SUCCESS, result.recordset[0]);
        }

    } catch (error) {
        console.error("casinoLogInsert insert logs ", error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};


module.exports = {
    saveCasinoMatches,
    getCasinoMatches,
    casinoLogInsert,
    casinoInsertMatch,
    updateCasinoDebitUserBalance,
    updateLobbyCasinoCreditUserBalance,
    updateCasinoRollbackUserBalance,
    getTransationId,
    getGameId
};