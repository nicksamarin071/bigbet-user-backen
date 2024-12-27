const settings = require('../config/settings');

const asyncRedis = require('async-redis');
const manualSession = asyncRedis.createClient({
    port      : settings.REDIS_MANUL_SESSION_PORT,               
    host      : settings.REDIS_MANUL_SESSION_HOST,        
    password  : settings.REDIS_MANUL_SESSION_PASS,    
});
module.exports = manualSession;