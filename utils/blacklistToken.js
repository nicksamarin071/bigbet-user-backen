
const interval = require('interval-promise');
async function addToken(token,time) {
	global._blacklistToken.push({token:token,time:time});
}
async function removeToken() {
	interval(async () => {
		
		if (global._blacklistToken.length>0) {
			//console.log('intervalinterval  ',Date.now());
			global._blacklistToken=global._blacklistToken.filter((element)=>element.time>=(Date.now()-(60*60*1000)));
			//console.log('removeData ',removeData);
		}
	}, 1000*10);
}
module.exports = {
	addToken,
	removeToken
};