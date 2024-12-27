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

                await call_to_server_callback_xpg(0,null);
                await call_to_server_callback_ezugi(0,null);

            } catch (error) {
                printLog("error in  start function internal "+error,3);
            }

        }, 600000)

    } catch (error) {
        printLog("error in  start function "+error,3);

    }
}



async function call_to_server_callback_xpg(sport_id,data){

    printLog("call_to_server_callback==> https://bet247s.com/api/v1/xpgstatementCron",1);
    
    await axios.get("https://bet247s.com/api/v1/xpgstatementCron")
    .then(function (response) {
        printLog("call_to_server_callback XPG response==> "+JSON.stringify(response.data),1);
    })

}



async function call_to_server_callback_ezugi(sport_id,data){

    printLog("call_to_server_callback==> https://bet247s.com/api/v1/ezugistatementCron",1);
    
    await axios.get("https://bet247s.com/api/v1/ezugistatementCron")
    .then(function (response) {
        printLog("call_to_server_callback EZUGI response==> "+JSON.stringify(response.data),1);
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