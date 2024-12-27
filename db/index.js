const sql = require('mssql')
const config = {
    //user: 'sa2',
    //password: 'FASSVH@tftua656',
    //server: '91.203.133.138', // You can use 'localhost\\instance' to connect to named instance
    user: 'sa',
    password: 'Q#9B%#9F5c4A%Z32@$K',
    server: '101.53.148.95', // You can use 'localhost\\instance' to connect to named instance
    database: 'goldexch',
    port: 1433,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 3000
    },
    options: {
        //multipleStatements: true,
        encrypt: false, // Use this if you're on Windows Azure asdf asdfasdf
        packetSize: 32768
    }
}
const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('Connected to MSSQL')
        return pool
    })
    .catch(err => console.log('Database Connection Failed! Bad Config: ', err))

module.exports = {
    sql,
    poolPromise
}


// const mysql = require('mysql');
// const util = require('util');
// const MysqlPool = mysql.createPool({
//     connectionLimit: 1000,
//     host: '192.168.1.66',
//     user: 'dev',
//     password: '123456',
//     database: 'live365',
//     multipleStatements:true
// });
// MysqlPool.query = util.promisify(MysqlPool.query); // Magic happens here.
// module.exports = MysqlPool;

// const mysql = require('mysql2/promise');
// const util = require('util');
// const MysqlPool = mysql.createPool({
//     connectionLimit: 1000,
//     host: '192.168.1.66',
//     user: 'dev',
//     password: '123456',
//     database: 'live365',
//     multipleStatements:true
// });
// MysqlPool.query = util.promisify(MysqlPool.query); // Magic happens here.
// module.exports = MysqlPool;