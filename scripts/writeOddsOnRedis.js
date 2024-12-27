//const interval = require('interval-promise');
const { fork } = require('child_process');
let axios = require('axios');
axios.defaults.timeout = 4000;
let arrayOfMarketId=[];
let chunkSize = 15;
let i=0;
let errorInAPI=false;
const asyncRedis = require('async-redis');
const client = asyncRedis.createClient(6379, '127.0.0.1');
let getMatchListFromBetdip = async () => {
	let cricketMatch = 'http://localhost:3003/api/v1/getLiveMatchMarketIdList';
	try {
 		let response = await axios.get(cricketMatch);
		if (response.status > 200) {
			client.get('CURRENT_SESSION_MARKETID', function (err, value) {
				arrayOfMarketId=JSON.parse(value);
				if (i==0 || i >= 4) {
					i=0;
					errorInAPI=true;
					start();
				}
			});
		} else {
			errorInAPI=false;
			arrayOfMarketId=response.data.data;

			if (response.data.data.length>0) {
				await client.set('CURRENT_SESSION_MARKETID', JSON.stringify(response.data.data));
			}
			return response.data.data;
		}
	} catch (error) {

		client.get('CURRENT_SESSION_MARKETID', function (err, value) {
			arrayOfMarketId=JSON.parse(value);
			if (i==0 || i >= 9) {
				i=0;
				errorInAPI=true;
				start();
			}
		});
 	}
    
};
async function start() {
	try {

		if (arrayOfMarketId) {

			var groups = arrayOfMarketId.map( function(e,i){ 
				return i%chunkSize===0 ? arrayOfMarketId.slice(i,i+chunkSize) : null; 
			}).filter(function(e){ return e; });
 			for (let index = 0; index < groups.length; index++) {
				const element = groups[index];
				await createChildProcess(element);
			}
		}
        
	} catch (error) {
		//console.log(error);
	}
}
async function createChildProcess(data) {
	try {
		if (data.length>0) {

			const process = fork('scripts/child.js');
			// send list of market id  to forked process
			process.send({ arrayOfMarketId:data,index:process.pid });
			// listen for messages from forked process
			process.on('message', (message) => {
				//console.log(`Response from child process  :::: ${message.index}`);
			});
			process.on('exit', (code)=>{
				//console.log(`child_process exited with code ${code}`);
			});
		}
	} catch (error) {
		//console.log(error);
	}
}
(async () => {
    
	await getMatchListFromBetdip();
	await start();
	await createChildProcess(1);
	// await createChildProcess(2);
})();