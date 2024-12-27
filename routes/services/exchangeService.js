const client = require('../../db/redis');
const redisOdds = require('../../db/redisodds');
const clientCasino = require('../../db/casinoredis');
const manualSession = require('../../db/manual_session_redis');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');
let resultdb = globalFunction.resultdb;
const { poolPromise, sql } = require('../../db');

let getOddsByMarketId = async (market_id) => {
    try {
        let reqArr = market_id.split(',');
        let oddsFromredis = await client.mget(reqArr);
        let parsedData = oddsFromredis.map((marketIdData) => JSON.parse(marketIdData))
        return resultdb(CONSTANTS.SUCCESS, parsedData);
    } catch (error) {
        console.log(error);

        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};
let getOddsByMarketIdArray = async (array) => {
    try {
        let oddsFromredis = await client.mget(array);
        let parsedData = oddsFromredis.map((marketIdData) => marketIdData ? (
            { [marketIdData.marketId]: JSON.parse(marketIdData) }
        ) : null)
        return resultdb(CONSTANTS.SUCCESS, parsedData);
    } catch (error) {
        console.log(error);

        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

let getOddsAndSession = async (market_id, match_id) => {
    try {
        let reqArr = market_id.split(',');
        let oddsFromredis = await client.mget(reqArr);
        let parsedData = oddsFromredis.map((marketIdData) => JSON.parse(marketIdData));

        let sessionFromredis = await client.get(match_id);
        sessionFromredis = sessionFromredis ? JSON.parse(sessionFromredis) : null;
        let responseData = {
            odds: parsedData,
            session: sessionFromredis
        }
        return resultdb(CONSTANTS.SUCCESS, responseData);
    } catch (error) {
        console.log(error);

        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

/**
 *
 * @param market_id
 * @param selection_id
 * @param is_back
 * @returns {Promise<{statusCode, data}>}
 */
let getOddsRate = async (market_id, selection_id, is_back, MarketType = 'M') => {
    try {

        let currentOdss = 0;
        let odds;
        if (MarketType == 'BM') { 
            odds = await client.mget(market_id+'__MM');
            //odds = await client.localClient.get(fancy_id);
        } else {
            odds = await client.mget(market_id);
        }
        //let odds=await client.get(market_id);
        odds = JSON.parse(odds);
        let selectionData = odds.runners.filter(function (data) {
            return data.selectionId == selection_id
        });
        let status = odds.status;
        if (is_back == 1) {
            currentOdss = selectionData[0].ex.availableToBack[0].price;
            status = (selectionData[0].GameStatus != '' && selectionData[0].GameStatus != undefined) ? selectionData[0].GameStatus : odds.status;
        } else {
            currentOdss = selectionData[0].ex.availableToLay[0].price;
            status = (selectionData[0].GameStatus != '' && selectionData[0].GameStatus != undefined) ? selectionData[0].GameStatus : odds.status;
        }

        return resultdb(CONSTANTS.SUCCESS, {
            odds: currentOdss,
            status: status
        });

    } catch (error) {
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

/**
 *
 * @param market_id
 * @param selection_id
 * @param is_back
 * @returns {Promise<{statusCode, data}>}
 */
let getCasinoOddsRate = async (sport_id, selection_id, is_back) => {
    try {

        let currentOdss = 0;
        let currentStatus = '';
        let odds = await clientCasino.get(sport_id);
        odds = JSON.parse(odds);
        //console.log(odds.result[0].marketRunner); 
        /* let selectionData = odds.result[0].marketRunner.filter(function (data) {
            return data.id==selection_id
        }); */
        //console.log(odds);
        let selectionData = [];
        let runnerJson = odds.result;
        for (let j in runnerJson) {
            let marktRunner = runnerJson[j].marketRunner;

            let selectionData2 = marktRunner.filter(function (data) {
                if (data.id == selection_id) {
                    data.superStatus = runnerJson[j].status;
                    selectionData.push(data);
                }
            });
        }

        if (is_back == 1) {
            currentOdss = selectionData[0].back[0].price;
            currentStatus = selectionData[0].superStatus;
        } else {
            currentOdss = selectionData[0].lay[0].price;
            currentStatus = selectionData[0].superStatus;
        }

        return resultdb(CONSTANTS.SUCCESS, {
            odds: currentOdss,
            status: currentStatus
        });

    } catch (error) {
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};


let getOddsByMarketIds = async (market_ids, Type = 'M') => {
    try {
        let tempData = {};

        let data = [];
        let marketType = [];
        market_ids.forEach(function (market_id) {
            data.push(market_id);
        });
        /* Type.forEach(function (mtype) {
            marketType.push(mtype);
        }); */
        let odds = [];

        //console.log('marketTyoe ---------- '+marketType+' -------------------- '+market_ids );
        if (Type == 'BM') {
            odds = await client.mget(data+'__MM');
            //odds = await client.localClient.get(fancy_id);
        } else {

            odds = await client.mget(data);
            for (var i = 0; i < Type.length; i++) {

                if (Type[i] === 'BM') {

                    odds.push(await client.mget(data[i]+'__MM'));

                }
            }
            //  odds = await client.mget(data);

        }
        
        let oddsArray = odds.map(function (o) {
            if (o != null) {
                let oddsTemp = JSON.parse(o);
                // console.log(oddsTemp);
                tempData[oddsTemp.marketId] = oddsTemp;
            }

        });
        return resultdb(CONSTANTS.SUCCESS, tempData);


    } catch (error) {
        //console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
    }
};
let getmatchTV = async (match_id) => {
    try {
        let tempData = {};

        let tvurl =await client.get(match_id+'_TV');
        return resultdb(CONSTANTS.SUCCESS, tvurl);


    } catch (error) {
        //console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.BLANK_ARRAY);
    }
};
/*  Get Casino market odds*/


let getCasinoOddsByMarketIds = async (market_ids) => {
    try {
        let tempData = {};

        let data = [];
        market_ids.forEach(function (market_id) {
            data.push(market_id);
        });
        let odds = [];
        odds = await clientCasino.mget(data);
        //console.log(odds);
        let oddsArray = odds.map(function (o) {
            if (o != null) {
                let oddsTemp = JSON.parse(o);
                //console.log('ainash',oddsTemp);
                //tempData[oddsTemp.marketId] = oddsTemp.result;
                tempData = oddsTemp.result;
            }

        });
        return resultdb(CONSTANTS.SUCCESS, tempData);


    } catch (error) {
        //console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};


let getCasinoLiveTv = async (sportId) => {
    try {

        /*  await clientCasino.set('7779_TV','https://timexbet.com/andarbahar/');
            await clientCasino.set('5559_TV','https://timexbet.com/dragontiger20/'); 
            await clientCasino.set('6669_TV','https://timexbet.com/baccarat/'); 
            await clientCasino.set('7779_TV','https://c_n.casinovid.in/ddiamond/ab/'); 
            await clientCasino.set('1114_TV','https://c_n.casinovid.in/ddiamond/onedaytp/'); 
            await clientCasino.set('1113_TV','https://c_n.casinovid.in/ddiamond/teen20/'); 
            await clientCasino.set('4444_TV','https://c_n.casinovid.in/ddiamond/32b/'); 
            await clientCasino.set('5557_TV','https://c_n.casinovid.in/ddiamond/lucky7b/'); 



            await clientCasino.set('5559_TV','https://timexbet.com/diamond2/dragon-tiger-20/'); 
            await clientCasino.set('6669_TV','https://timexbet.com/diamond2/baccarat-1/'); 
            await clientCasino.set('7779_TV','https://timexbet.com/diamond2/andar-bahar-1/'); 
            await clientCasino.set('1114_TV','https://timexbet.com/diamond2/teen-oneday/'); 
            await clientCasino.set('1113_TV','https://timexbet.com/diamond2/teen-20/'); 
            await clientCasino.set('4444_TV','https://timexbet.com/diamond2/32-b/'); 
            await clientCasino.set('5557_TV','https://timexbet.com/diamond2/lucky7-b/');

            
            https://c_n.casinovid.in/ddiamond/teen20/
            https://c_n.casinovid.in/ddiamond/onedaytp/
            https://c_n.casinovid.in/ddiamond/ab/
            https://c_n.casinovid.in/ddiamond/32b/
            https://c_n.casinovid.in/ddiamond/lucky7b/
        */

        let liveTvUrl = await clientCasino.mget(sportId + '_TV');
        //console.log('-------------------------TVVVVVVVVVVVVVVVVVVVVVVVV-----------------------' + liveTvUrl);
        return resultdb(CONSTANTS.SUCCESS, liveTvUrl[0]);

    } catch (error) {
        //console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

let getOddsMyMarketSelection = async (market_ids) => {
    try {
        let tempData = {};
        let data = [];
        market_ids.forEach(function (market_id) {
            data.push(market_id);
        });

        let odds = await client.mget(data);

        let oddsArray = odds.map(function (o) {
            if (o != null) {
                let oddsTemp = JSON.parse(o);
                tempData[oddsTemp.marketId] = oddsTemp.runners;
            }

        });
        return resultdb(CONSTANTS.SUCCESS, tempData);


    } catch (error) {
        //console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};
let getMarketSelection = async (matchiId, marketId, UserId) => {
    try {

        const pool = await poolPromise;
        const result = await pool.request()
            .input('marketId', sql.VarChar(50), marketId)
            .input('matchiId', sql.Int, matchiId)
            .input('userId', sql.Int, UserId)
            .query("SELECT selc.selection_id,selc.name as SelectionName,selc.sort_priority ,ROUND(ISNULL(proftl.win_loss_value,0),2) as win_loss_value from market_selections as selc LEFT JOIN odds_profit_loss as proftl on proftl.selection_id=selc.selection_id and  proftl.user_id=@userId AND proftl.match_id=@matchiId AND proftl.market_id=@marketId WHERE selc.match_id=@matchiId AND selc.market_id=@marketId ORDER BY selc.sort_priority ASC")
        if (result === null) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        } else {
            return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
        }
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};
let getCasinoMarketSelection = async (matchiId, marketId, UserId) => {
    try {

        const pool = await poolPromise;
        const result = await pool.request()
            .input('marketId', sql.VarChar(50), marketId)
            .input('matchiId', sql.BigInt, matchiId)
            .input('userId', sql.Int, UserId)
            .query("SELECT selc.selection_id,selc.name as SelectionName,selc.sort_priority ,ROUND(ISNULL(proftl.win_loss_value,0),2) as win_loss_value from cassino_market_selections as selc LEFT JOIN odds_profit_loss as proftl on proftl.selection_id=selc.selection_id and  proftl.user_id=@userId AND proftl.match_id=@matchiId AND proftl.market_id=@marketId WHERE selc.match_id=@matchiId AND selc.market_id=@marketId ORDER BY selc.sort_priority ASC")
        if (result === null) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        } else {
            return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
        }
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};



let admin_getCasinoMarketSelection = async (matchiId, marketId, UserId, roleId) => {
    try {
        let condition = "";
        let winLoss = "";
        if (roleId === CONSTANTS.USER_TYPE_SUPER_ADMIN) {
            condition = 'super_admin_id';
            winLoss = 'super_admin_win_loss';
        } else if (roleId === CONSTANTS.USER_TYPE_ADMIN) {
            condition = 'admin_id';
            winLoss = 'admin_win_loss';
        }
        else if (roleId === CONSTANTS.USER_TYPE_SUPER_MASTER) {
            condition = 'super_master_id';
            winLoss = 'super_master_win_loss';
        }
        else if (roleId === CONSTANTS.USER_TYPE_MASTER) {
            condition = 'master_id';
            winLoss = 'master_win_loss';
        }
        else if (roleId === CONSTANTS.USER_TYPE_AGENT) {
            condition = 'agent_id';
            winLoss = 'agent_win_loss  ';
        } else if (roleId === CONSTANTS.USER_TYPE_USER) {
            condition = 'user_id';
            winLoss = 'win_loss_value';
        }
        const pool = await poolPromise;
        const result = await pool.request()
            .input('marketId', sql.VarChar(50), marketId)
            .input('matchiId', sql.BigInt, matchiId)
            .input('userId', sql.Int, UserId)
            .query("SELECT min(selc.selection_id) as selection_id,min(selc.name) as selectionName,min(selc.sort_priority) as sort_priority ,ROUND(ISNULL(sum(proftl." + winLoss + "),0),2) as win_loss_value from cassino_market_selections as selc LEFT JOIN odds_profit_loss as proftl on proftl.selection_id=selc.selection_id and proftl." + condition + "=@userId AND proftl.match_id=@matchiId AND proftl.market_id=@marketId WHERE selc.match_id=@matchiId AND selc.market_id=@marketId GROUP BY selc.selection_id ORDER BY  min(selc.sort_priority) ASC")
        if (result === null) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        } else {
            return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
        }
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};



let getMarketSelectionLiveLine = async (matchiId, marketId) => {
    try {

        const pool = await poolPromise;
        const result = await pool.request()
            .input('marketId', sql.VarChar(50), marketId)
            .input('matchiId', sql.Int, matchiId)
            .query("SELECT selc.selection_id,selc.name as SelectionName,selc.sort_priority from market_selections as selc  WHERE selc.match_id=@matchiId AND selc.market_id=@marketId ORDER BY selc.sort_priority ASC")
        if (result === null) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        } else {
            return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
        }
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

let admin_getMarketSelection = async (matchiId, marketId, UserId, roleId) => {
    try {
        let condition = "";
        let winLoss = "";
        if (roleId === CONSTANTS.USER_TYPE_SUPER_ADMIN) {
            condition = 'super_admin_id';
            winLoss = 'super_admin_win_loss';
        } else if (roleId === CONSTANTS.USER_TYPE_ADMIN) {
            condition = 'admin_id';
            winLoss = 'admin_win_loss';
        }
        else if (roleId === CONSTANTS.USER_TYPE_SUPER_MASTER) {
            condition = 'super_master_id';
            winLoss = 'super_master_win_loss';
        }
        else if (roleId === CONSTANTS.USER_TYPE_MASTER) {
            condition = 'master_id';
            winLoss = 'master_win_loss';
        }
        else if (roleId === CONSTANTS.USER_TYPE_AGENT) {
            condition = 'agent_id';
            winLoss = 'agent_win_loss  ';
        } else if (roleId === CONSTANTS.USER_TYPE_USER) {
            condition = 'user_id';
            winLoss = 'win_loss_value';
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('marketId', sql.VarChar(50), marketId)
            .input('matchiId', sql.Int, matchiId)
            .input('userId', sql.Int, UserId)
            .query("SELECT min(selc.selection_id) as selection_id,min(selc.name) as selectionName,min(selc.sort_priority) as sort_priority ,ROUND(ISNULL(sum(proftl." + winLoss + "),0),2) as win_loss_value from market_selections as selc LEFT JOIN odds_profit_loss as proftl on proftl.selection_id=selc.selection_id and  proftl." + condition + "=@userId AND proftl.match_id=@matchiId AND proftl.market_id=@marketId WHERE selc.match_id=@matchiId AND selc.market_id=@marketId GROUP BY selc.selection_id ORDER BY min(selc.sort_priority) ASC")

        if (result === null) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        } else {
            return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
        }
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

let getMarketSelectionWithSelectionId = async (matchiId, marketId, UserId, selectionID) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('marketId', sql.VarChar(50), marketId)
            .input('matchiId', sql.Int, matchiId)
            .input('userId', sql.Int, UserId)
            .input('selectionID', sql.Int, selectionID)
            .query("SELECT selc.selection_id,selc.name as SelectionName,selc.sort_priority ,ROUND(ISNULL(proftl.win_loss_value,0),2) as win_loss_value from market_selections as selc LEFT JOIN odds_profit_loss as proftl on proftl.selection_id=selc.selection_id and  proftl.user_id=@userId AND proftl.match_id=@matchiId AND proftl.market_id=@marketId WHERE selc.match_id=@matchiId AND selc.market_id=@marketId AND selc.selection_id=@selectionID ")
        if (result === null) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        } else {
            return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
        }
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

let admin_getMarketSelectionWithSelectionId = async (matchiId, marketId, UserId, selectionID, roleId) => {
    try {
        let condition = "";
        let winLoss = "";
        if (roleId === CONSTANTS.USER_TYPE_SUPER_ADMIN) {
            condition = 'super_admin_id';
            winLoss = 'super_admin_win_loss';
        } else if (roleId === CONSTANTS.USER_TYPE_ADMIN) {
            condition = 'admin_id';
            winLoss = 'admin_win_loss';
        }
        else if (roleId === CONSTANTS.USER_TYPE_SUPER_MASTER) {
            condition = 'super_master_id';
            winLoss = 'super_master_win_loss';
        }
        else if (roleId === CONSTANTS.USER_TYPE_MASTER) {
            condition = 'master_id';
            winLoss = 'master_win_loss';
        }
        else if (roleId === CONSTANTS.USER_TYPE_AGENT) {
            condition = 'agent_id';
            winLoss = 'agent_win_loss  ';
        } else if (roleId === CONSTANTS.USER_TYPE_USER) {
            condition = 'user_id';
            winLoss = 'win_loss_value';
        }


        const pool = await poolPromise;
        const result = await pool.request()
            .input('marketId', sql.VarChar(50), marketId)
            .input('matchiId', sql.Int, matchiId)
            .input('userId', sql.Int, UserId)
            .input('selectionID', sql.Int, selectionID)
            .query("SELECT min(selc.selection_id) as selection_id,min(selc.name) as selectionName,min(selc.sort_priority) as sort_priority ,ROUND(ISNULL(sum(proftl." + winLoss + "),0),2) as win_loss_value from market_selections as selc LEFT JOIN odds_profit_loss as proftl on proftl.selection_id=selc.selection_id and  proftl." + condition + "=@userId AND proftl.match_id=@matchiId AND proftl.market_id=@marketId WHERE selc.match_id=@matchiId AND selc.market_id=@marketId AND selc.selection_id=@selectionID GROUP BY selc.selection_id ORDER BY min(selc.sort_priority) ASC")
        if (result === null) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        } else {
            return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
        }
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

let getFancyByFancyIds = async (fancy_ids) => {
    try {
        let tempData = {};
        let odds = await client.mget(fancy_ids);
        odds.map(function (o, i) {
            if (o != null) {
                let oddsTemp = JSON.parse(o);
                tempData[fancy_ids[i]] = oddsTemp;
            }
        });
        return resultdb(CONSTANTS.SUCCESS, tempData);
    } catch (error) {
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};


let getFancyByFancyId = async (fancy_id, match_id, is_manual_odds = 'A') => {
    try {       
        if (is_manual_odds == 'M' || is_manual_odds == 'MM' || is_manual_odds == 'MK'|| is_manual_odds == 'ML') {
            let odds = await manualSession.mget(match_id + '_ms_' + fancy_id);
            return resultdb(CONSTANTS.SUCCESS, JSON.parse(odds));
        } else if( is_manual_odds == 'A' ) {
            let odds = await client.mget(match_id + '_s_' + fancy_id);
            return resultdb(CONSTANTS.SUCCESS, JSON.parse(odds));
        }else{
           return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL); 
        }
        
    } catch (error) {
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

 

let getIndianFancyByMatchId = async (match_id) => {
    try {

        let oddsFromredis = await client.mget(match_id + '_s'); 
        let parsedData = oddsFromredis.map((marketIdData) => JSON.parse(marketIdData))
        if (parsedData === null) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        } else {
            return resultdb(CONSTANTS.SUCCESS, parsedData);
        }
        //return resultdb(CONSTANTS.SUCCESS,parsedData);
    } catch (error) {
        console.log(error);

        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};
let getManualIndianFancyByMatchId = async (match_id) => {
    try {

        let oddsFromredis = await manualSession.mget(match_id + '_ms');
        let parsedData = oddsFromredis.map((marketIdData) => JSON.parse(marketIdData))
        if (parsedData === null) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        } else {
            return resultdb(CONSTANTS.SUCCESS, parsedData);
        }
        //return resultdb(CONSTANTS.SUCCESS,parsedData);
    } catch (error) {
        console.log(error);

        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};


let getMatchIndianSessionBetFair = async (match_id, selectId) => {
    try {
        let data = [];
        selectId.forEach(function (seleId) {
            data.push(match_id + "_s_" + seleId);
        });
        if (data.length <= 0) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        }
        // console.log(data);
        let oddsFromredis = await client.mget(data);
        let parsedData = oddsFromredis.map((marketIdData) => JSON.parse(marketIdData))
        if (parsedData === null) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        } else {
            return resultdb(CONSTANTS.SUCCESS, parsedData);
        }
        //return resultdb(CONSTANTS.SUCCESS,parsedData);
    } catch (error) {
        console.log(error);

        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

let getMatchIndianSessionManual = async (match_id, selectId) => {
    try {
        let data = [];

        selectId.forEach(function (seleId) {
            data.push(match_id + "_ms_" + seleId);
        });

        if (data.length <= 0) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        }
        let oddsFromredis = await manualSession.mget(data);
        let parsedData = oddsFromredis.map((marketIdData) => JSON.parse(marketIdData))
        if (parsedData === null) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        } else {
            return resultdb(CONSTANTS.SUCCESS, parsedData);
        }
        //return resultdb(CONSTANTS.SUCCESS,parsedData);
    } catch (error) {
        console.log(error);

        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};
let getMatkaRunner = async (market_ids, match_id) => {
    try {

        const pool = await poolPromise;
        const result = await pool.request()
            .input('marketId', sql.VarChar(50), market_ids)
            .input('match_id', sql.Int, match_id)
            .query("SELECT market_id,runner_json from matka_markets WHERE market_id=@marketId")
        if (result === null) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        } else {
            return resultdb(CONSTANTS.SUCCESS, result.recordsets);
        }
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};


let getMarketTitliSelection = async (matchiId, marketId, UserId, drawResult) => {
    try {
        const pool = await poolPromise;
        drawResult = Number(drawResult) - 1;
        /*console.log("SELECT selc.selection_id, sum(ISNULL(stack,0)) as totalStack, ISNULL((select SUM(CASE WHEN selection_id="+drawResult+" THEN p_l - stack ELSE 0 END + CASE WHEN selection_id !="+drawResult+" THEN liability ELSE 0 END )  from matka_bets_odds where market_id="+marketId+" AND match_id="+matchiId+" AND user_id="+UserId+"),0) as winLossAmount from matka_market_selections as selc LEFT JOIN matka_bets_odds as betOdds on betOdds.selection_id=selc.selection_id and  betOdds.user_id="+UserId+" AND betOdds.match_id="+matchiId+" AND betOdds.market_id="+marketId+" WHERE selc.match_id="+matchiId+" AND selc.market_id="+marketId+" GROUP BY selc.selection_id");*/
        const result = await pool.request()
            .input('marketId', sql.VarChar(50), marketId)
            .input('matchiId', sql.BigInt, matchiId)
            .input('userId', sql.Int, UserId)
            .query("SELECT selc.selection_id, sum(ISNULL(stack,0)) as totalStack, ISNULL((select SUM(CASE WHEN selection_id=" + drawResult + " THEN p_l - stack ELSE 0 END + CASE WHEN selection_id !=" + drawResult + " THEN liability ELSE 0 END )  from matka_bets_odds where market_id=@marketId AND match_id=@matchiId AND user_id=@userId),0) as winLossAmount from matka_market_selections as selc LEFT JOIN matka_bets_odds as betOdds on betOdds.selection_id=selc.selection_id and  betOdds.user_id=@userId AND betOdds.match_id=@matchiId AND betOdds.market_id=@marketId WHERE selc.match_id=@matchiId AND selc.market_id=@marketId GROUP BY selc.selection_id");
        if (result === null) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        } else {
            return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]);
        }
    } catch (error) {
        console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

let setCasinoTvUrl = async (sportId) => {
    try {

        /*  await clientCasino.set('7779_TV','https://timexbet.com/andarbahar/');
            await clientCasino.set('5559_TV','https://timexbet.com/dragontiger20/'); 
            await clientCasino.set('6669_TV','https://timexbet.com/baccarat/'); 
            await clientCasino.set('1114_TV','https://c_n.casinovid.in/ddiamond/onedaytp/'); 
            await clientCasino.set('1113_TV','https://c_n.casinovid.in/ddiamond/teen20/'); 
            await clientCasino.set('4444_TV','https://c_n.casinovid.in/ddiamond/32b/'); 
            await clientCasino.set('5557_TV','https://c_n.casinovid.in/ddiamond/lucky7b/'); 



            await clientCasino.set('5559_TV','https://timexbet.com/diamond2/dragon-tiger-20/'); 
            await clientCasino.set('6669_TV','https://timexbet.com/diamond2/baccarat-1/'); 
            await clientCasino.set('7779_TV','https://timexbet.com/diamond2/andar-bahar-1/'); 
            await clientCasino.set('1114_TV','https://timexbet.com/diamond2/teen-oneday/'); 
            await clientCasino.set('1113_TV','https://timexbet.com/diamond2/teen-20/'); 
            await clientCasino.set('4444_TV','https://timexbet.com/diamond2/32-b/'); 
            await clientCasino.set('5557_TV','https://timexbet.com/diamond2/lucky7-b/');

            
            https://c_n.casinovid.in/ddiamond/teen20/
            https://c_n.casinovid.in/ddiamond/onedaytp/
            https://c_n.casinovid.in/ddiamond/ab/
            https://c_n.casinovid.in/ddiamond/32b/
            https://c_n.casinovid.in/ddiamond/lucky7b/
        */



        await clientCasino.set('5559_TV', 'https://shroute.casinovid.in/diamondvideo/sh.php?id=3059');
        await clientCasino.set('6669_TV', 'https://shroute.casinovid.in/diamondvideo/sh.php?id=3044');
        await clientCasino.set('7779_TV', 'https://shroute.casinovid.in/diamondvideo/sh.php?id=3053');
        await clientCasino.set('1114_TV', 'https://shroute.casinovid.in/diamondvideo/sh.php?id=3031');
        await clientCasino.set('1113_TV', 'https://shroute.casinovid.in/diamondvideo/sh.php?id=3030');
        await clientCasino.set('4444_TV', 'https://shroute.casinovid.in/diamondvideo/sh.php?id=3034');
        await clientCasino.set('5557_TV', 'https://shroute.casinovid.in/diamondvideo/sh.php?id=3032');
        await clientCasino.set('7776_TV', 'https://shroute.casinovid.in/diamondvideo/sh.php?id=3054');


        return resultdb(CONSTANTS.SUCCESS, CONSTANTS.DATA_NULL);

    } catch (error) {
        //console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};



module.exports = {
    getOddsByMarketId,
    getOddsByMarketIds,
    getOddsMyMarketSelection,
    getFancyByFancyIds,
    getOddsAndSession,
    getOddsByMarketIdArray,
    getMarketSelection,
    admin_getMarketSelectionWithSelectionId,
    getOddsRate,
    getFancyByFancyId,
    getIndianFancyByMatchId,
    getManualIndianFancyByMatchId,
    getMarketSelectionWithSelectionId,
    admin_getMarketSelection,
    getMarketSelectionLiveLine,
    getCasinoOddsByMarketIds,
    getCasinoMarketSelection,
    admin_getCasinoMarketSelection,
    getCasinoOddsRate,
    getCasinoLiveTv,
    getMatchIndianSessionBetFair,
    getMatchIndianSessionManual,
    getMatkaRunner,
    getMarketTitliSelection,
    setCasinoTvUrl,
    getmatchTV
};