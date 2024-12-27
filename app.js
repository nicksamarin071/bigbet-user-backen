require("./Telegram/telegramCommand")
const express = require('express');
const http = require('http');
//const firebase = require('firebase-admin');
const bodyParser = require('body-parser');
const fileupload = require('express-fileupload');
const settings = require('./config/settings');
//const firebaseSetting = require('./config/firebase');
const cors = require('cors');
const routes = require('./routes');
const morgan = require('morgan');
const jwt = require('./routes/middlewares/jwt'); //Token for User
//const middleware = require('./routes/middlewares/middleware'); //Token for loadGlobalSetting
const errorHandler = require('./utils/error_handler');
// const sessionGlobal = require('./utils/sessionGlobal');
// const oddsGlobal = require('./utils/oddsGlobal');
const loadGlobalSetting = require('./utils/loadGlobalSetting');
const logger = require('./utils/logger');
const blacklistToken = require('./utils/blacklistToken');
const path = require('path');
const dir = path.join(__dirname, settings.filePath);
const successlog = logger.successlog;
const userController = routes.userController;
const userLotusController = routes.userLotusController;
const userCasinoController = routes.userCasinoController;
const marketsController = routes.marketsController;
const matchesController = routes.matchesController;
const seriesController = routes.seriesController;
const sportsController = routes.sportsController;
const fancyController = routes.fancyController;
const accountStatementsController = routes.accountStatementsController;
const globalSettingController = routes.globalSettingController;
const betsController = routes.betsController;
const matkabetsController = routes.matkabetsController;
const adminMatchController = routes.adminMatchController;
const userSettingController = routes.userSettingController;
const exchangeController = routes.exchangeController;
const reportController = routes.reportController;
const livelineController = routes.livelineController;
const uploadController = routes.uploadController;
const dashboardController = routes.dashboardController;
const userSuperNovaController = routes.userSuperNovaController;
//Onload get data from global table load in memory.
global._blacklistToken = [];
(async() => {
    try {
        await loadGlobalSetting();
        //await sessionGlobal();
        //await oddsGlobal();
        await blacklistToken.removeToken();
    } catch (error) {
        console.log("error  ", error)
        process.exit();
    }
})();
const app = express();

app.set('view engine', 'ejs');

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());
//app.use(middleware);
app.use(jwt());
app.use(errorHandler);
app.use("/upload", express.static(dir));
app.enable('trust proxy');
app.use(morgan('dev', {
    skip: function(req, res) {
        return res.statusCode < 400;
    },
    stream: process.stderr
}));

/* firebase.initializeApp({
	credential: firebase.credential.cert(firebaseSetting),
	databaseURL: settings.FIREBASE_DATABASE_URL
  });

  var db = firebase.database();
  var ref = db.ref("scores");


  ref.child("123456").set({
	date_of_birth: "June 23, 1912",
	full_name: "Alan Turing"
  });
 */
app.use(morgan('dev', {
    skip: function(req, res) {
        return res.statusCode >= 400;
    },
    stream: process.stdout
}));
app.use(settings.API_URL, userController);
app.use(settings.API_LOBBY_LOTUS_URL, userLotusController);
app.use(settings.API_LOBBY_LOTUS_URL, userCasinoController);
app.use(settings.API_URL, marketsController);
app.use(settings.API_URL, matchesController);
app.use(settings.API_URL, seriesController);
app.use(settings.API_URL, sportsController);
app.use(settings.API_URL, fancyController);
app.use(settings.API_URL, accountStatementsController);
app.use(settings.API_URL, globalSettingController);
app.use(settings.API_URL, betsController);
app.use(settings.API_URL, matkabetsController);
app.use(settings.API_URL, adminMatchController);
app.use(settings.API_URL, userSettingController);
app.use(settings.API_URL, exchangeController);
app.use(settings.API_URL, reportController);
app.use(settings.API_URL, livelineController);
app.use(settings.API_URL, uploadController);
app.use(settings.API_URL, dashboardController);
app.use(settings.API_URL, userSuperNovaController);

http.createServer(function(req, res) {
    res.writeHead(200);
    res.end("hello sdfsdfsdfsdfsda world\ n");
}).listen(8785);

app.listen(settings.PORT1, function() {
    successlog.info('Running at PORT  ' + settings.PORT1);
});
app.listen(8787, function() {
    successlog.info('Running at PORT  ' + 8787);
});
app.listen(8788, function() {
    successlog.info('Running at PORT  ' + 8788);
});
app.listen(8789, function() {
    successlog.info('Running at PORT  ' + 8789);
});
app.listen(8790, function() {
    successlog.info('Running at PORT  ' + 8790);
});
app.listen(8791, function() {
    successlog.info('Running at PORT  ' + 8791);
});
app.listen(8792, function() {
    successlog.info('Running at PORT  ' + 8792);
});
app.listen(8793, function() {
    successlog.info('Running at PORT  ' + 8793);
});
