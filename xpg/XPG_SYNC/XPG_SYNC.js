const interval = require('interval-promise')
const axios = require('axios')
let settings = require('../../config/settings');

let i = 0;

start();

function start() {
    printLog("call start function",1);
    try {

        interval(async (iteration, stop) => {

            //printLog("start function interval iteration= "+iteration,2);
            try {

                await call_to_server_callback(0,null);

            } catch (error) {
                printLog("error in  start function internal "+error,3);
            }

        }, 10000)

    } catch (error) {
        printLog("error in  start function "+error,3);

    }
}



async function call_to_server_callback(sport_id,data){

    printLog("call_to_server_callback==> https://bet247s.com/api/v1/xpgCron",1);
    
    await axios.post("https://bet247s.com/api/v1/xpgCron", {
    sport_id: sport_id,
    data: data
    })
    .then(function (response) {
        printLog("call_to_server_callback response==> "+JSON.stringify(response.data),1);
    })

}

function printLog(message, log_level){
    if(log_level==1){
        console.log(message);
    }else if(log_level==2){
        console.warn(message);
    }else if(log_level==3){
        console.error(message);
    }

}