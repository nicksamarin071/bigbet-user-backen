/**
* Configurations of logger.
*/
const winston = require('winston');
const winstonRotator = require('winston-daily-rotate-file');
//const settings = require('./../config/settings');
const moment = require('moment');

const logsCurrentFolder = process.env.PWD;
const consoleConfig = [
	new winston.transports.Console({
		'colorize': true
	})
];
const createLogger = new winston.Logger({
	level: 'info',
	transports: consoleConfig
});
const successLogger = createLogger;
successLogger.add(winstonRotator, {
	'name': 'access-file',
	'level': 'info',
	'filename': logsCurrentFolder + '/logs/access.log',
	'json': false,
	'datePattern': 'YYYY-MM-DD',
	'prepend': true,
	'timestamp': () => {
		return moment().format('YYYY-MM-DD hh:mm:ss');
	}
});

const errorLogger = createLogger;
errorLogger.add(winstonRotator, {
	'name': 'error-file',
	'level': 'error',
	'filename': logsCurrentFolder + '/logs/error.log',
	'json': false,
	'datePattern': 'YYYY-MM-DD',
	'prepend': true,
	'timestamp': () => {
		return moment().format('YYYY-MM-DD hh:mm:ss');
	}
});

module.exports = {
	'successlog': successLogger,
	'errorlog': errorLogger
};