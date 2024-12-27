let globalFunction = require('./globalFunction');
//const CONSTANTS = require('./constants');
const apiErrorRes = globalFunction.apiErrorRes;
const apiUnauthorizedRes = globalFunction.apiUnauthorizedRes;




function errorHandler(err, req, res, next) {
	if (typeof (err) === 'string') {
		return apiErrorRes(req, res, 'Eroor'+next);
	}
	if (err.name === 'UnauthorizedError') {
		return apiUnauthorizedRes(req, res, 'Send valid token!');
	}
	console.log("err  ",err);
	
	return apiErrorRes(req, res, err.message);

}
module.exports = errorHandler;