const CONSTANTS = require('./constants');
const settings = require('../config/settings');
var md5 = require('md5');
const zlib = require('zlib');
var SHA2 = require("sha2");
var xmlParser = require('xml2json-light');
const crypto = require('crypto');
const fs = require('fs');
const randomIntFromInterval = (min, max) => {
	return Math.floor(
		Math.random() * (max - min + 1) + min
	);
};
const resultdb = (statusCode, data = null) => {
	return {
		statusCode: statusCode,
		data: data
	};
};
const apiSuccessResDash = (req, res, message = CONSTANTS.DATA_NULL, data = CONSTANTS.DATA_NULL,code = CONSTANTS.ERROR_CODE_ZERO, error = CONSTANTS.ERROR_FALSE, token) => {
	return res.status(200).json({
		message: message,
		currentTime:Math.floor(Date.now()/1000),
		code: code,
		error: error,
		data: data,
		token: token
	});
};
const apiSuccessResSport = (req, res, message = CONSTANTS.DATA_NULL, data = CONSTANTS.DATA_NULL,CupData = CONSTANTS.DATA_NULL,DepositWidthrwalDetails = CONSTANTS.DATA_NULL, code = CONSTANTS.ERROR_CODE_ZERO, error = CONSTANTS.ERROR_FALSE, token) => {
	return res.status(200).json({
		message: message,	
		currentTime:Math.floor(Date.now()/1000),	
		code: code,
		error: error,
		data: data,
		CupData:CupData,
		DepositWidthrwalDetails:DepositWidthrwalDetails,
		token: token
	});
};

const apiSuccessResFancy = (req, res, message = CONSTANTS.DATA_NULL, data = CONSTANTS.DATA_NULL,manualData = CONSTANTS.DATA_NULL,code = CONSTANTS.ERROR_CODE_ZERO, error = CONSTANTS.ERROR_FALSE, token) => {
	return res.status(200).json({
		message: message,	
		currentTime:Math.floor(Date.now()/1000),	
		code: code,
		error: error,
		data: data,
		manual:manualData,		 
		token: token
	});
};

const apiSuccessRes = (req, res, message = CONSTANTS.DATA_NULL, data = CONSTANTS.DATA_NULL, code = CONSTANTS.ERROR_CODE_ZERO, error = CONSTANTS.ERROR_FALSE, token) => {

	return res.status(200).json({
		message: message,
		currentTime:Math.floor(Date.now()/1000),
		code: code,
		error: error,
		data: data,
		token: token
	});
};
const apiSuccessResHtml = (req, res,data = CONSTANTS.DATA_NULL) => {

	return res.status(200).text(data);
};
const apiErrorRes = (req, res, message = CONSTANTS.DATA_NULL, data = CONSTANTS.DATA_NULL, code = CONSTANTS.ERROR_CODE_ONE, error = CONSTANTS.ERROR_TRUE) => {
	return res.status(200).json({
		message: message,
		code: code,
		error: error,
		data: data
	});
};
const apiUnauthorizedRes = (req, res, message = CONSTANTS.DATA_NULL, data = CONSTANTS.DATA_NULL, code = CONSTANTS.ERROR_CODE_ONE, error = CONSTANTS.ERROR_TRUE) => {
	return res.status(401).json({
		message: message,
		code: code,
		error: error,
		data: data
	});
};
const apiNotFoundRes = (req, res, message = CONSTANTS.DATA_NULL, data = CONSTANTS.DATA_NULL, code = CONSTANTS.ERROR_CODE_ONE, error = CONSTANTS.ERROR_TRUE) => {
	return res.status(404).json({
		message: message,
		code: code,
		error: error,
		data: data
	});
};
const currentDate = () => {
	return Date.now()/1000;
};
const currentDateTimeStamp = () => {
	return  Math.floor(Date.now() / 1000);
};
const datetickvalue= (date) =>{
	//  var d = new Date(date);
	// var dd=d.getTime();
	var dd=date;
	var ticks = (dd * 10000); 
	return ticks+621355968000000000;
}
const convertXpgStringmd5=(data)=>{

  var text = "";
  var x;
  for (x in data) {
	  if(text==""){
		text += x+"="+data[x];
	  }else{
		text += "&"+x+"="+data[x];
	  }
    
  }
  text=md5(settings.XPG_PRIVATE_KEY+text).toUpperCase();
  
  return text;

};
const convertFUNStringmd5=(data)=>{

  var text = "";
 
  text=md5(data);
  
  return text;

};
const GenerateEzugiToken=(data)=>{

  var text = "";
  var x;
  for (x in data) {
	  if(text==""){
		text += x+"="+data[x];
	  }else{
		text += "&"+x+"="+data[x];
	  }
    
  }
  text=SHA2.sha256(settings.EZUGI_API_SALT+text);
  text=text.toString("hex")
  return text;

};
const GenerateEzugi_HashKey_auth=(data)=>{

   let string =  JSON.stringify(data); 

  let hash = crypto.createHmac('sha256', settings.EZUGI_API_HASH_KEY).update(string).digest('base64');
   
/*  hash=SHA2.sha256(data+settings.EZUGI_API_HASH_KEY);
  hash=hash.toString("base64")*/
  return hash;

};

const GenerateEzugi_HashKey=(data)=>{
  
 //console.log('---------------data------------------------',JSON.parse(data.toString('utf8')));

  //let hash = crypto.createHmac('sha256', settings.EZUGI_API_HASH_KEY).update(string.toString('utf8')).digest('base64');
  let hash = crypto.createHmac('sha256',  settings.EZUGI_API_HASH_KEY).update(data).digest('base64');
   
/*  hash=SHA2.sha256(data+settings.EZUGI_API_HASH_KEY);
  hash=hash.toString("base64")*/
  return hash;

};

const GenerateFUN_HashKey=(data)=>{
	//let string =  JSON.stringify(data); 
	const base = Object.assign({}, data);
	//delete data.hmac;
	delete base.hmac;
	if ('actions' in base) {
	 let actions = '';
	 for (const action of base.actions) {
	 Object.keys(action).sort().forEach(key => actions += action[key]);
	 }
	 base.actions = actions;
	}
	const hash = crypto.createHash('sha256');
	const hmac = crypto.createHmac('sha256', hash.update(settings.FUN_HMAC_KEY).digest('buffer'));
	let hmacBase = '';
	
	Object.keys(base).sort().forEach(key => hmacBase += base[key]);
	//console.log( 'hmacBase  -------------------- ', hmacBase);
	const hmacString = hmac.update(hmacBase).digest('hex');
	//console.log( 'hmacString -------------------- ', hmacString);


/*console.log(data);
  let string =  JSON.stringify(data);
  console.log( 'string -------------------- ', string);
  let hash1 = crypto.createHmac('sha256',  settings.FUN_HMAC_KEY).update(string).digest('base64');
  */
  return hmacString;

};
function theReplacer(key, value) {
    return key === "debitAmount" ? Number(+value).toFixed(1) : value;
}
const GenerateEzugiToken_BO=(data)=>{

  var text = "";
  var x;
  for (x in data) {
	  if(text==""){
		text += x+"="+data[x];
	  }else{
		text += "&"+x+"="+data[x];
	  }
    
  }
  text=SHA2.sha256(settings.EZUGI_API_SALT_BO+text);
  text=text.toString("hex")
  return text;

};

const convertXpgString=(data)=>{

	var text = "";
	var x;
	for (x in data) {
		if(text==""){
		  text += x+"="+data[x];
		}else{
		  text += "&"+x+"="+data[x];
		}
	  
	} 
	return text;
  
  };

  const convertEzugiString=(data)=>{

	var text = "";
	var x;
	for (x in data) {
		if(text==""){
		  text += x+"="+data[x];
		}else{
		  text += "&"+x+"="+data[x];
		}
	  
	} 
	return text;
  
  };
  const decompressGzipdat=(string)=>{
	var bufferr = new Buffer(string, 'base64');
	var decrypt_data= zlib.unzipSync(bufferr).toString();
	
	let res_json=xmlParser.xml2json(decrypt_data);
	
	//res_json=JSON.parse(res_json);
	return res_json;

  };
  const GenerateSLOTEGRATOR_HashKey=(data)=>{   
	  let hash1 = crypto.createHmac('sha1',  settings.SLOTEGRATOR_INTEGRATION_MERCHANT_KEY).update(data).digest('hex');  
	  return hash1; 
	};

function generateRandoString(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * 
 			charactersLength));
   }
   return result;//.toString('hex');
}

function createCasinoSignature(payload) {
		//let privateKey = settings.GURU_CASINO_PRIVATE_KEY;
		const privateKey = fs.readFileSync("./config/private.pem", "utf8");
	 	const privateKeyBuffer = Buffer.from(privateKey, "utf8");
	  // console.log("PRBuffer   ",privateKeyBuffer)
	  const signer = crypto.createSign("RSA-SHA256");
	  signer.update(JSON.stringify(payload));
	  const signature = signer.sign(privateKeyBuffer, "base64");
	  return signature;
}


module.exports = {
	resultdb,
	apiSuccessRes,
	apiSuccessResHtml,
	apiErrorRes,
	apiSuccessResDash,
	apiUnauthorizedRes,
	apiSuccessResSport,
	apiSuccessResFancy,
	randomIntFromInterval,
	currentDate,
	apiNotFoundRes,
	currentDateTimeStamp,
	convertXpgStringmd5,
	convertXpgString,
	decompressGzipdat,
	datetickvalue,
	convertEzugiString,
	GenerateEzugiToken,
	GenerateEzugiToken_BO,
	GenerateEzugi_HashKey,
	GenerateEzugi_HashKey_auth,
	GenerateFUN_HashKey,
	convertFUNStringmd5,
	GenerateSLOTEGRATOR_HashKey,
	generateRandoString,
	createCasinoSignature
};