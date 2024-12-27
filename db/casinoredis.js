const settings = require('../config/settings');

const asyncCasinoRedis = require('async-redis');
const clientCasino = asyncCasinoRedis.createClient({
    port      : settings.REDIS_CASINO_PORT,               
    host      : settings.REDIS_CASION_HOST,        
    password  : settings.REDIS_CASINO_PASS,    
});
module.exports = clientCasino;