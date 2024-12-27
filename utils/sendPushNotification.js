//const logger = require('./logger');
var FCM = require('fcm-node');
var serverKey = 'AIzaSyBvfEwq29aFHMM2hy3R-4fiZRbrlwV5c2o'; //put your server key here
var fcm = new FCM(serverKey);
async function sendNotification(deviceidarray, title, message) {
	// logger.info("enter into sendNotification ")
	var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
		to: deviceidarray,

		notification: {
			title: title,
			body: message
		}
	};

	fcm.send(message, function (err, response) {
		if (err) {

			console.log('Something has gone wrong!', err);
			return 0;
		} else {

			console.log('Successfully sent with response: ', response);
			return response;
		}
	});
}


module.exports = {
	sendNotification: sendNotification
};
