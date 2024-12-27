const settings = require('../config/settings');

const asyncRedis = require('async-redis');
const Client = asyncRedis.createClient({
    port      : settings.REDIS_PORT,               
    host      : settings.REDIS_HOST,        
    password  : settings.REDIS_PASS,    
});
module.exports = Client;