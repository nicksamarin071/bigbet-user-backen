const mysql = require('mysql2/promise');


const connConfig = mysql.createPool({
    connectionLimit: 1000,
    user: 'sa',
    password: 'Hds$#@!d362d',
    server: '103.205.66.152', // You can use 'localhost\\instance' to connect to named instance
    database: 'Live111',
    port: 2499,
    multipleStatements:true
});
module.exports = connConfig;


