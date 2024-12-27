const MysqlPool = require('../../db');
const	globalFunction = require('../../utils/globalFunction');
const	CONSTANTS = require('../../utils/constants');
let resultdb = globalFunction.resultdb;

let getAllSeries = async (data) => {

	try {
		let calcTemp='';
		if (data.pageno===1) {
			calcTemp='SQL_CALC_FOUND_ROWS';
		}
		let queryString ='SELECT '+calcTemp+' series.series_id,series.name,series.is_manual,series.status, sports.sport_id, sports.name as sports_name FROM series  INNER join sports on series.sport_id=sports.sport_id where 1=1';

		let conditionParameter=[];
		let offSet=' LIMIT ? OFFSET ?';
		
		if(data.sport_id!==null){
			queryString+= ' and sports.sport_id =? ';
			conditionParameter.push(data.sport_id);
		}
		if(data.status!==null){
			queryString+= ' and series.status =? ';
			conditionParameter.push(''+data.status);
		}
		if(data.series_name!==null){
			queryString+= ' and series.name like ?';
			conditionParameter.push('%'+data.series_name+'%');
		}
		if (data.pageno!==null && data.limit!==null) {
			conditionParameter.push(data.limit);
			conditionParameter.push(((data.pageno-1)*data.limit));
			queryString=queryString+offSet;
		}
		let seriesdetails =await MysqlPool.query(queryString,conditionParameter);
		let totalCount = 0;
		if (data.pageno===1) {
			let totalQry = await MysqlPool.query('SELECT FOUND_ROWS() AS total');	
			totalCount = totalQry[0].total;
		}

		let returnRes={
			list:seriesdetails,
			total:totalCount
		};
		// console.log('queryString  ',queryString);
		// console.log('conditionParameter  ',conditionParameter);
		
		if (seriesdetails===null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		}else{
			return resultdb(CONSTANTS.SUCCESS, returnRes);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let createSeries = async (data) => {
	try {
		//console.log('datadata  ',data);
		let resFromDB= await MysqlPool.query('INSERT INTO series SET ?',data);
		//console.log('resFromDB  ',resFromDB);
		return resultdb(CONSTANTS.SUCCESS, resFromDB);
	} catch (error) {
		//console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let updateSeriesStatus = async (id) => {
	try {
		//console.log('datadata  ',id);
		let resFromDB = await MysqlPool.query('UPDATE series  SET is_active = IF(is_active=?, ?, ?) WHERE series_id = ?',['1','0','1',id]);
		//let resFromDB=await Markets.create(data,{isNewRecord:true});
		//console.log('resFromDB  ',resFromDB);
		return resultdb(CONSTANTS.SUCCESS, resFromDB);
	} catch (error) {
		//console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};
let getSeriesByListOfID = async (idlist) => {
	try {
		let seriesdetails =await MysqlPool.query('SELECT * FROM series  where series_id  in  (?)',[idlist]);
		if (seriesdetails===null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		}else{
			return resultdb(CONSTANTS.SUCCESS, seriesdetails);
		}
	} catch (error) {
		//console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getActiveSeriesByListOfID = async (idlist) => {
	try {
		let seriesdetails =await MysqlPool.query('SELECT * FROM series  where series_id  in  (?) and is_active="1"',[idlist]);
		if (seriesdetails===null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		}else{
			return resultdb(CONSTANTS.SUCCESS, seriesdetails);
		}
	} catch (error) {
		//console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getActiveSeriesBySportID = async () => {
	try {
		let seriesdetails =await MysqlPool.query('SELECT * FROM series  where is_active = "1" ');
		if (seriesdetails===null) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		}else{
			return resultdb(CONSTANTS.SUCCESS, seriesdetails);
		}
	} catch (error) {
		//console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};


module.exports = {
	getAllSeries,createSeries,updateSeriesStatus,getSeriesByListOfID,getActiveSeriesByListOfID,getActiveSeriesBySportID
};