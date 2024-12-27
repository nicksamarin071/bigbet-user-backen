//const client = require('../../db/redis');
const settings = require('../../config/settings');
const	globalFunction = require('../../utils/globalFunction');
const	CONSTANTS = require('../../utils/constants');
const	userModel = require('../../routes/model/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
let resultdb = globalFunction.resultdb;
const { poolPromise ,sql} = require('../../db');
const SALT_WORK_FACTOR=10;

let createFancy = async (data) => { 
	try {
		let resFromDB = await MysqlPool.query('SELECT * FROM fancy WHERE fancy_id = ? LIMIT 1;', [data.fancy_id]);
		if (resFromDB.length > 0) {
			return resultdb(CONSTANTS.ALREADY_EXISTS, CONSTANTS.DATA_NULL);
		} else {
			let resFromDB = await MysqlPool.query('INSERT INTO fancy SET ?', data);
			return resultdb(CONSTANTS.SUCCESS, resFromDB);
		}
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getFancy = async (data) => {
	try {

		let userData = userModel.getUserData();
		let userId = userData.id;
		let userTypeId = userData.user_type_id;
		let parentIds = userData.parent_id;

		let match_id = '';
		let fancyQuery = 'SELECT b.sport_id, d.name AS sport_name, b.series_id, c.name AS series_name, a.match_id, b.name AS match_name, a.fancy_id, a.name AS fancy_name, super_admin_fancy_id, selection_id, fancy_type_id, date_time, active, is_indian_fancy, display_message ';

		if(userTypeId == 1){
			fancyQuery = fancyQuery + ' ,0 AS is_self_deactived ';
		}else{
			fancyQuery = fancyQuery + ' ,(CASE WHEN (c.id IS NULL) THEN 0 ELSE 1 END) AS is_self_deactived ';
		}

		fancyQuery = fancyQuery + ' FROM fancy AS a INNER JOIN matches AS b ON (a.match_id = b.match_id) INNER JOIN series AS c ON (b.series_id = c.series_id) INNER JOIN sports AS d ON (b.sport_id = d.sport_id) ';

		if(userTypeId != 1){
			fancyQuery = fancyQuery + ' LEFT JOIN deactive_fancy AS e ON(a.fancy_id = e.fancy_id AND e.user_id IN(?)) LEFT JOIN deactive_fancy AS f ON(a.fancy_id = f.fancy_id AND f.user_id = ?) ';
		}

		fancyQuery = fancyQuery + ' WHERE active IN("0", "1","2") AND result IS NULL ';

		if (data.match_id) {
			match_id = data.match_id;
			fancyQuery = fancyQuery + ' AND a.match_id = "' + match_id + '" ';
		}

		if(userTypeId != 1) {
			fancyQuery = fancyQuery + ' AND e.id IS NULL ';
		}

		let resFromDB = await MysqlPool.query(fancyQuery, [parentIds.split(','), userId]);

		return resultdb(CONSTANTS.SUCCESS, resFromDB);
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getFancyBySuperAdmin = async (data) => {
	try {
		//console.log('there are the input data ===>', data);

		let fancyQuery = 'select * from fancy where sport_id = "' + data.market_id + '"';


		let resFromDB = await MysqlPool.query(fancyQuery);
		//console.log('fancyQueryfancyQueryfancyQueryfancyQuery===', resFromDB);


		return resultdb(CONSTANTS.SUCCESS, resFromDB);
	} catch (error) {
		//console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getmarketId = async (data) => {
	try {

		let getMarketQuery = 'select market_id   from markets where match_id="' + data.match_id + '" and name = "Match Odds"';
		let resFromDB = await MysqlPool.query(getMarketQuery);
		return resultdb(CONSTANTS.SUCCESS, resFromDB);
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getFancyByMatchId = async (user_id,user_type_id,match_id) => {
    try {


        let condition,select;
        switch(user_type_id) {
            case 1:
                condition=' admin_id  ';
                select=' (fs.liability*(admin_partnership/100)) score_position  ';
                break;
            case 2:
                condition=' master_id';
                select=' (fs.liability*(master_partnership/100)) score_position  ';
                break;
            case 3:
                condition=' super_agent_id';
                select=' (fs.liability*(super_agent_partnership/100)) score_position  ';
                break;
            case 4:
                condition=' agent_id';
                select=' (fs.liability*(agent_partnership/100)) score_position  ';
                break;
            default:
                condition=' user_id ';
                select=' fs.liability score_position  ';
        }

        let fancyQuery = 'select f.active,f.display_message,f.fancy_id,f.session_size_no,f.session_size_yes,f.session_value_no,f.session_value_yes,f.sport_id,f.name,'+select+',fs.fancy_score_position_json fancy_score_position_json from fancy f  left join fancy_score_position fs on (fs.fancy_id=f.fancy_id and fs.'+condition+'=?) where f.match_id = ? order by f.name asc';

        let resFromDB = await MysqlPool.query(fancyQuery, [user_id,match_id]);

        return resultdb(CONSTANTS.SUCCESS, resFromDB);

    } catch (error) {
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};


let getFancyById = async (data) => {
	try {  
        const pool = await poolPromise;  
        const result = await pool.request()  
        .input('user_id', sql.VarChar(50), data.id)
		.input('fancyId', sql.VarChar(50), data.fancy_id)
		.input('matchId', sql.VarChar(50), data.match_id)			
        .query("select TOP 1 fancy.khado_number, spt.sport_id,CASE WHEN (disable.user_id IS NOT NULL OR disable.user_id !=0) THEN 'N' ELSE 'Y' END as matchFanceBetAllow,fancy.fancyStatus, (CASE WHEN fancy.session_delay > spt.session_delay THEN fancy.session_delay ELSE spt.session_delay END ) as session_delay,(CASE WHEN spt.is_bet_allow = fancy.is_bet_allow THEN 'Y' ELSE 'N' END) AS IsBetAllow, (CASE WHEN fancy.bet_allow_time_before > spt.bet_allow_time_before THEN fancy.bet_allow_time_before ELSE spt.bet_allow_time_before END) AS BetAllowTimeBefore,fancy.match_id,fancy.name as fancyName, fancy.status,mtch.start_date from fancies fancy with(nolock) INNER JOIN  matches mtch with(nolock) ON mtch.match_id=fancy.match_id and mtch.match_id=@matchId INNER JOIN sports spt with(nolock) ON fancy.sport_id = spt.sport_id LEFT JOIN disable_match_fancies as disable with(nolock) ON disable.match_id= mtch.match_id AND disable.user_id=@user_id LEFT JOIN deactive_sports as dspt with(nolock) ON dspt.sport_id= mtch.sport_id  and dspt.user_id = @user_id LEFT JOIN user_deactive_matches as udmtch with(nolock) ON udmtch.match_id= mtch.match_id AND  udmtch.match_id=@matchId and udmtch.user_id = @user_id  WHERE fancy.selection_id=@fancyId AND fancy.status='A' AND fancy.match_id=@matchId AND ( dspt.sport_id  IS NULL OR dspt.sport_id=0) AND ( udmtch.match_id  IS NULL OR udmtch.match_id=0) AND mtch.status='Y' AND mtch.is_completed='N' AND spt.status='Y'")	        
        if (result.recordset ===null) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        }else{    	
            return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
        }
	} catch (error) {
            console.log(error);
            return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
        }
};
let getFancyPosition = async (user_id,match_id,fancy_id) => {
    try {
        const pool = await poolPromise;  
        const result = await pool.request()  
        .input('user_id', sql.VarChar(50), user_id)
		.input('fancyId', sql.VarChar(50), fancy_id)
        .input('matchId', sql.VarChar(50), match_id)	
        .query("select TOP 1 id,liability,profit,fancy_score_position_json from fancy_score_positions where match_id=@matchId AND fancy_id=@fancyId and user_id=@user_id ORDER BY id DESC") 
        
        if (result.recordsets === null || result.recordset.length == 0) { 
            let data = {"id":0,"liability":0,"profit":0,"fancy_score_position_json":[]};
            return resultdb(CONSTANTS.SUCCESS, data);
        }else{  
            return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
        }
       

    } catch (e) {
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

let updatefancyData = async (inputKey, inputValue, fancy_id) => {

	try {
		let updateQuery = 'update fancy set ' + inputKey + ' = "' + inputValue + '" where fancy_id =?';

		let resFromDB = await MysqlPool.query(updateQuery, [fancy_id]);
		return resultdb(CONSTANTS.SUCCESS, resFromDB);
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let updatefancy = async (data) => {
	try {


		let updateQuery = 'update fancy set max_stack = "' + data.max_stack + '",rate_diff = "' + data.rate_diff + '",point_diff = "' + data.point_diff + '",session_value_yes = "' + data.session_value_yes + '",session_value_no = "' + data.session_value_no + '",session_size_yes = "' + data.session_size_yes + '",remark = "' + data.remark + '" where fancy_id =' + data.fancy_id;
		let resFromDB = await MysqlPool.query(updateQuery);
		return resultdb(CONSTANTS.SUCCESS, resFromDB);
	} catch (error) {
		//console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
// id, max_stack, max_stack, rate_diff, point_diff, session_value_yes, session_value_no, session_size_yes, remark




let matchResultFancy = async (sport_id, match_id, fancy_id, result,sportName,matchName) => {
	try {
		let sql = 'CALL sp_set_result_fancy(?,?,?,?,?,?)';

		let getResult = await MysqlPool.query(sql,[sport_id, match_id, fancy_id, result,sportName,matchName]);

		return resultdb(CONSTANTS.SUCCESS, getResult[0]);
	} catch (e) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let abandonedFancy = async (fancyID) => {
	try {
		let sql = 'CALL sp_abandoned_fancy(?)';
		let getResult = await MysqlPool.query(sql, [fancyID]);

		return resultdb(CONSTANTS.SUCCESS, getResult[0][0]);
	} catch (e) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getRollbackFancy = async (pBetResultId, pMatchID, pFancyID) => {
	try {
		let sql = 'CALL sp_rollback_result_fancy(?,?,?)';

		let getRollbackResult = await MysqlPool.query(sql, [pBetResultId, pMatchID, pFancyID]);

		return resultdb(CONSTANTS.SUCCESS, getRollbackResult[0]);
	} catch (e) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getBetsFancy = async (fancy_id) => {
	try {
		let sql = 'select * from bets_fancy where fancy_id=?';
		let getResult = await MysqlPool.query(sql, [fancy_id]);

		return resultdb(CONSTANTS.SUCCESS, getResult);
	} catch (e) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getFancyBetForUserPosition = async (user_id,fancy_id,match_id,user_type_id=null, notInIds=[]) => {
    try {
        const pool = await poolPromise;
		
        let condition;
        let selectioName;
        switch(user_type_id) {
            case 1:
                condition=' and super_admin_id='+user_id+'';
                selectioName=' ,super_admin as per ';
                break;
            case 2:
                condition=' and admin_id='+user_id+'';
                selectioName=' , admin as per ';
                break;
            case 3:
                condition=' and super_master_id='+user_id+'';
                selectioName=' ,super_master as per ';
                break;
            case 4:
                condition=' and master_id='+user_id+' ';
                selectioName=' ,master as per ';
                break;
            case 5:
                condition=' and agent_id='+user_id+' ';
                selectioName=' ,agent as per ';
                break;
            default:
                condition=' and user_id='+user_id+' ';
                selectioName=' , 100 as per ';
        }

        if( notInIds.length > 0){
            condition+=" and id not in ("+notInIds+") "
        }
        
        let querys = "select run,is_back,size,sum(stack) as stack from bets_fancy where delete_status='0' and fancy_id='"+fancy_id+"' AND match_id="+match_id+" "+condition+" group by run,is_back,size order by run";
      
        const result = await pool.request().query(querys);

        if (result.recordsets===null || result.recordsets.length ===0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		}else{ 
            return resultdb(CONSTANTS.SUCCESS, result.recordsets[0]); 
        }

        //return resultdb(CONSTANTS.SUCCESS, getResult.recordsets[0]);
    } catch (e) {
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};



let getRunTimeFancyPosition = async (user_id,fancy_id,user_type_id) => {
    try {
        let data;
        let fancyList = await  getFancyBetForUserPosition(user_id,fancy_id,user_type_id);

        let fancyListData = [];
        if (fancyList.statusCode === CONSTANTS.SUCCESS) {
            fancyListData = fancyList.data;

            let run=[];
            let resultValues=[];
            let orgRun=[];
            let lastPosition  =0;
            let max_exposure  =0;
            for (let i in fancyListData){
                let fancy = fancyListData[i];
                run.push(fancy.run-1);
            }
            run.push(fancyListData[fancyListData.length-1].run);
            //console.log(fancyListData);
            orgRun = run;

            run =  [...new Set(run)];

            run.map( function (r,ind) {
                let tempTotal = 0;
                fancyListData.map(async function (f) {

                    if(f.is_back==1){
                        if(f.run <=r){

                            tempTotal-= f.stack*(f.size/100);
                        }else{
                            tempTotal+=f.stack;
                        }

                    }else{

                        if(f.run >r){

                            tempTotal-=f.stack*(f.size/100);

                        }else{
                            tempTotal+=f.stack;
                        }

                    }
                });

                if((orgRun.length)-1 == ind){
                    resultValues.push({"key":lastPosition+'+',"value":tempTotal.toFixed(2)});
                }else{
                    if(lastPosition==r){
                        resultValues.push({"key":lastPosition,"value":tempTotal.toFixed(2)});
                    }else{
                        resultValues.push({"key":lastPosition+'-'+r,"value":tempTotal.toFixed(2)});

                    }

                }

                lastPosition = r+1;
                if(max_exposure > tempTotal){
                    max_exposure= tempTotal;
                }

            });
             data = {"fancy_position":resultValues,"liability":max_exposure};
        }else{
             data = {"fancy_position":[],"liability":0};
        }


        return resultdb(CONSTANTS.SUCCESS, data);

    } catch (e) {
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

let createFancyPosition = async (user_id,match_id,fancy_id,dataObj) => {
    try {
		let DataOject  = {
            "run": dataObj.run,
            "is_back": dataObj.is_back ,
            "size":dataObj.size,
            "stack": dataObj.stack
		};
        //console.log('DataOject---',DataOject);

        let fancyList = await  getFancyBetForUserPosition(user_id,fancy_id,match_id);
        //console.log('fancyList---',fancyList.data);
        	let fancyListData = [];
			if (fancyList.statusCode === CONSTANTS.SUCCESS) {
                fancyListData = fancyList.data;
                fancyListData.push(DataOject);
			}else {
                fancyListData.push(DataOject);
            }
            fancyListData.sort(function (run1, run2) {
                if (run1.run > run2.run) return 1;
                if (run1.run < run2.run) return -1;
                return 0;
            });
            //console.log('fancyList---',fancyListData);
            let run=[];
            let resultValues=[];
            let orgRun=[];
            let lastPosition  =0;
            let max_exposure  =0;
            let max_profit  =0;
            for (let i in fancyListData){
                let fancy = fancyListData[i];
                run.push(fancy.run-1);
            }
            run.push(fancyListData[fancyListData.length-1].run);
            orgRun = run;
            run =  [...new Set(run)];
            run.map( function (r,ind) {
                let tempTotal = 0;
                fancyListData.map( function (f) {

                    if(f.is_back==1){

                        if( r < f.run){

                            tempTotal-= f.stack;

                        }else{
                            tempTotal+=f.stack*(f.size/100);
                        }

                    }else{
                        if( r >= f.run){
                           tempTotal-=f.stack*(f.size/100);

                        }else{
                            tempTotal+=f.stack;
                        }

                    }
                });

                if((orgRun.length)-1 == ind){
                    resultValues.push({"key":lastPosition+'+',"value":tempTotal.toFixed(2)});
                }else{
                    if(lastPosition==r){
                        resultValues.push({"key":lastPosition,"value":tempTotal.toFixed(2)});
                    }else{
                        resultValues.push({"key":lastPosition+'-'+r,"value":tempTotal.toFixed(2)});
                    }
                }
               // console.log('run  resultValues---',resultValues);
                lastPosition = r+1;
                if(max_exposure > tempTotal){
                    max_exposure= tempTotal;
                }
                if(max_profit < tempTotal){
                    max_profit= tempTotal;
                }

            });
           
            let data = {"fancy_position":resultValues,"liability":max_exposure,"profit":max_profit};
           
            return resultdb(CONSTANTS.SUCCESS, data);

    } catch (e) {
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};


let createFancyPositionMeter = async (user_id,match_id,fancy_id,dataObj) => {
    try {
        let DataOject  = {
            "run": dataObj.run,
            "is_back": dataObj.is_back ,
            "size":dataObj.size,
            "stack": dataObj.stack
        };
        //console.log('DataOject---',DataOject);

        let maxLiability = dataObj.is_back == 1 ? (parseInt(dataObj.run) - parseInt(dataObj.size)) < 0 ? 0 : (parseInt(dataObj.run) - parseInt(dataObj.size)) : (parseInt(dataObj.run) + parseInt(dataObj.size));
        //console.log(maxLiability);
        let fancyList = await  getFancyBetForUserPosition(user_id,fancy_id,match_id);
        //console.log('fancyList---',fancyList.data);
            let fancyListData = [];
            if (fancyList.statusCode === CONSTANTS.SUCCESS) {
                fancyListData = fancyList.data;
                fancyListData.push(DataOject);
            }else {
                fancyListData.push(DataOject);
            }
            fancyListData.sort(function (run1, run2) {
                if (run1.run > run2.run) return 1;
                if (run1.run < run2.run) return -1;
                return 0;
            });
            //console.log('fancyList---',fancyListData);
            let run=[];
            let resultValues=[];
            let orgRun=[];
            let lastPosition  =0;
            let max_exposure  =0;
            let max_profit  =0;
            for (let i in fancyListData){
                let fancy = fancyListData[i];
                
                for (let j = 0; j < fancy.run; j++) {
                    let sizeee = fancy.run - j;
                    run.push(parseInt(fancy.run) - sizeee );
                }
                for (let K = 0; K <= 1000; K++) {
                    run.push(parseInt(fancy.run) + K );
                }                
            }
            //console.log('run ---------------------54545--',JSON.stringify(run));
            run.push(fancyListData[fancyListData.length-1].run);
            orgRun = run;
            run =  [...new Set(run)];
            run.map( function (r,ind) {
                let tempTotal = 0;
                fancyListData.map( function (f) {

                    if(f.is_back==1){

                        if( r < f.run){

                            tempTotal-= f.stack * (f.run- r);

                        }else{
                            tempTotal+=f.stack* (r - f.run);
                        }

                    }else{
                        if( r >= f.run){
                           tempTotal-=f.stack*(r - f.run);

                        }else{
                           
                            tempTotal+=f.stack *(f.run- r);
                        }

                    }
                });

                if((orgRun.length)-1 == ind){
                    resultValues.push({"key":lastPosition+'+',"value":tempTotal.toFixed(2)});
                }else{
                    if(lastPosition==r){
                        resultValues.push({"key":lastPosition,"value":tempTotal.toFixed(2)});
                    }else{
                        resultValues.push({"key":lastPosition+'-'+r,"value":tempTotal.toFixed(2)});
                    }
                }
                lastPosition = r+1;

              

                if(max_exposure > tempTotal){
                    max_exposure= tempTotal;
                }
                if(max_profit < tempTotal){
                    max_profit= tempTotal;
                }
             
            });
         
            console.log(max_exposure+' ----max_exposure ----------------------- ' + maxLiability);
             let obj = resultValues.find(o => o.key === maxLiability);
             max_exposure = obj.value;
              // console.log(max_exposure+' ----run ----------------------- ' +JSON.stringify(obj));
          
            let data = {"fancy_position":resultValues,"liability":max_exposure,"profit":max_profit};
             console.log('run ---------------------54545--',JSON.stringify(data));
            return resultdb(CONSTANTS.SUCCESS, data);

    } catch (e) {
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};


let createFancyPositionFavourite = async (user_id,match_id,fancy_id,dataObj) => {
    try {
        let DataOject  = {
            "run": dataObj.run,
            "is_back": dataObj.is_back ,
            "size":dataObj.size,
            "odds":dataObj.odds,
            "stack": dataObj.stack
        }; 

        let maxLiability = dataObj.is_back == 1 ? (parseInt(dataObj.run) - parseInt(dataObj.size)) : (parseInt(dataObj.run) + parseInt(dataObj.size));

        let fancyList = await  getFancyBetForUserPosition(user_id,fancy_id,match_id);
        //console.log('fancyList---',fancyList.data);
            let fancyListData = [];
            if (fancyList.statusCode === CONSTANTS.SUCCESS) {
                fancyListData = fancyList.data;
                fancyListData.push(DataOject);
            }else {
                fancyListData.push(DataOject);
            }
            fancyListData.sort(function (run1, run2) {
                if (run1.run > run2.run) return 1;
                if (run1.run < run2.run) return -1;
                return 0;
            });
            let run=[];
            let resultValues=[];
            let orgRun=[];
            let lastPosition  =0;
            let max_exposure  =0;
            let max_profit  =0;
            for (let i in fancyListData){
                let fancy = fancyListData[i];
                run.push(fancy.run-1);                
            }
            run.push(fancyListData[fancyListData.length-1].run);
            orgRun = run;
            run =  [...new Set(run)];
            run.map( function (r,ind) {
                let tempTotal = 0;
                fancyListData.map( function (f) {

                    if(f.is_back==1){

                        if( r < f.run){

                            tempTotal-= f.stack;

                        }else{
                            tempTotal+=Number((((f.run / 100) + 1) * f.stack) - f.stack);
                        }

                    }else{
                        if( r >= f.run){
                           tempTotal-=Number((((f.run / 100) + 1) * f.stack) - f.stack);

                        }else{
                            tempTotal+=f.stack;
                        }

                    }
                });

                if((orgRun.length)-1 == ind){
                    resultValues.push({"key":lastPosition+'+',"value":tempTotal.toFixed(2)});
                }else{
                    if(lastPosition==r){
                        resultValues.push({"key":lastPosition,"value":tempTotal.toFixed(2)});
                    }else{
                        resultValues.push({"key":lastPosition+'-'+r,"value":tempTotal.toFixed(2)});
                    }
                }
               // console.log('run  resultValues---',resultValues);
                lastPosition = r+1;
                if(max_exposure > tempTotal){
                    max_exposure= tempTotal;
                }
                if(max_profit < tempTotal){
                    max_profit= tempTotal;
                }

            });
         
            let data = {"fancy_position":resultValues,"liability":max_exposure,"profit":max_profit};
            console.log(data);
            return resultdb(CONSTANTS.SUCCESS, data);

    } catch (e) { console.log(e);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

let createFancyPositionKhado = async (user_id,match_id,fancy_id,dataObj) => {
    try {
        let DataOject  = {
            "run": dataObj.run,
            "is_back": dataObj.is_back ,
            "size":dataObj.size,
            "stack": dataObj.stack
        };
        let khado_number = dataObj.khado_number;
        let khado_run = parseInt(dataObj.run)+khado_number;
        //console.log('DataOject ---------------------khado_number--',JSON.stringify(khado_number));
        let fancyList = await  getFancyBetForUserPosition(user_id,fancy_id,match_id);
            let fancyListData = [];
            if (fancyList.statusCode === CONSTANTS.SUCCESS) {
                fancyListData = fancyList.data;
                fancyListData.push(DataOject);
            }else {
                fancyListData.push(DataOject);
            }
            fancyListData.sort(function (run1, run2) {
                if (run1.run > run2.run) return 1;
                if (run1.run < run2.run) return -1;
                return 0;
            });
            let run=[];
            let resultValues=[];
            let orgRun=[];
            let lastPosition  =0;
            let max_exposure  =0;
            let max_profit  =0;
            //run.push(fancyListData[fancyListData.length-1].run);
            for (let i in fancyListData){
                let fancy = fancyListData[i];
                run.push(parseInt(fancy.run) - 1 );
                for (let K = 0; K < khado_number +1; K++) {
                    run.push(parseInt(fancy.run) + K );
                }                
            }
            console.log('run -----------------------',JSON.stringify(run));
             
            orgRun = run;
            run =  [...new Set(run)]; 
      
            run.map( function (r,ind) {
                let tempTotal = 0;
                fancyListData.map( function (f) {

                    if(f.is_back==1){
                        
                        if( r < f.run){

                            tempTotal-= f.stack;

                        }else if( r >= khado_run){

                            tempTotal-= f.stack;

                        }else{
                            tempTotal+=f.stack*(f.size/100);
                        }

                    }else{
                        if( r >= f.run){
                           tempTotal-=f.stack*(f.size/100);

                        }else{
                            tempTotal+=f.stack;
                        }

                    }
                });

                if((orgRun.length)-1 == ind){
                    resultValues.push({"key":lastPosition+'+',"value":tempTotal.toFixed(2)});
                }else{
                    if(lastPosition==r){
                        resultValues.push({"key":lastPosition,"value":tempTotal.toFixed(2)});
                    }else{
                        resultValues.push({"key":lastPosition+'-'+r,"value":tempTotal.toFixed(2)});
                    }
                }
                lastPosition = r+1;
                if(max_exposure > tempTotal){
                    max_exposure= tempTotal;
                }
                if(max_profit < tempTotal){
                    max_profit= tempTotal;
                }

            });
           //console.log('run ---------------------max_exposure--',JSON.stringify(max_exposure));
           //console.log('resultValues -----------------------',resultValues);
           //return;
            let data = {"fancy_position":resultValues,"liability":max_exposure,"profit":max_profit};
            return resultdb(CONSTANTS.SUCCESS, data);

    } catch (e) {
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};



let getActiveFancyList = async (match_id) => {
    try {
        let sql = 'select id,selection_id from fancy where match_id  in (?)';
        let getResult = await MysqlPool.query(sql, match_id);
		//console.log(getResult);
        return resultdb(CONSTANTS.SUCCESS, getResult);
    } catch (e) {
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

let getFancyUser = async (match_id,parent_id,parent_type) => {
    try {
        let query='select users.id,users.parent_id,users.user_type_id,users.name,users.user_name from users inner join  bets_fancy on users.id=';

        switch(parent_type) {
            case 1:
                query+=' bets_fancy.master_id  ';
                break;
            case 2:
                query+=' bets_fancy.super_agent_id';
                break;
            case 3:
                query+=' bets_fancy.agent_id';
                break;
            case 4:
                query+=' bets_fancy.user_id';
                break;
            default:
                query+=' ';
        }
        query+=" where bets_fancy.match_id=? and  users.parent_id= ?  group by users.id";

        let matchUser = await MysqlPool.query(query,[match_id,parent_id]);

        if (matchUser===null) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        }else{

            return resultdb(CONSTANTS.SUCCESS, matchUser);
        }
    } catch (error) {
        //console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};

module.exports = {
	createFancy,
	getFancy,
	getFancyBySuperAdmin,
	getmarketId,
	getFancyById,
	updatefancyData,
	updatefancy,
	matchResultFancy,
	abandonedFancy,
	getRollbackFancy,
	getBetsFancy,
    getActiveFancyList,
    getFancyByMatchId,
    getFancyUser,
    getFancyBetForUserPosition,
    createFancyPosition,
    createFancyPositionMeter,
    createFancyPositionFavourite,
    getRunTimeFancyPosition,
    getFancyPosition,
    createFancyPositionKhado
};