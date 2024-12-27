https://medium.com/codebase/structure-of-a-nodejs-api-project-cdecb46ef3f8


https://standardjs.com/rules.html#javascript-standard-style

ssh root@139.162.218.18

git rm -r --cached .

 asdfasdf
timedatectl list-timezones

timedatectl set-timezone Europe/Athens

https://crontab.guru/every-day-at-1am




BetDip 237 Forever file stop list

1. marketsbysportid.js

2. marketsbysportid.js
    folder : ./javatonodejsapi/copynodesinglefile8383/nodesinglefile8383/marketIdForSession.js

3. cluster8386.js
    folder : /root/javatonodejsapi/copynodesinglefile8383/nodesinglefile8383

BetDip Current Working instance of forever list as follows:

1. Odds

Folder : /root/betfairOddsWriteOnRedis/betfairnodeappdec15
Files : 
    1.  betfair11.js
    2.  betfair12.js
    3.  betfair13.js
    4.  betfair14.js
    5.  betfair15.js
    6.  betfair16.js
    7.  betfair17.js
    8.  betfair18.js
    9.  betfair19.js
    10. betfair20.js
Restart Script file : betfairnodeapp.sh


2. Session 

Folder : /root/betfairOddsWriteOnRedis/sessionshakti
Files : 1. currentMatchSession.js (Match within 6 hour, Cron will update session in each second)
        2. preMatchSession.js (Match after 6 hour , Cron will update session in  60 seconds)


CREATE USER 'dev'@'%' IDENTIFIED BY 'password';

git config --global credential.helper 'cache --timeout 36000'

GRANT ALL PRIVILEGES ON *.* TO 'dev'@'%';


0. : SUPER_ADMIN
1. : ADMIN
2. : MASTER
3. : SUPER AGENT
4. : AGENT
5. : USER 



1=Free Chips Cr/Dr, 
2= Match Profit/Loss, 
3=Match Commission, 
4=Session Profit/Loss, 
5=Session Commission, 
6=Settlement, 
7=Old Data



//Add Partenership

1. Check userID and SportsID is available or not.
2. If available return already exist.
3. else if not avalailable
    a. user_type_id === MASTER(2)
    <!--"user_type_id": "2",
	"user_id": 2,
	"parent_id":1,
	"sport_id": "4",
	"partnership": 70 -->

        let adminPartership=100-partnership;
        let reqdata={
          user_type_id:2,  
          user_id:2,  
          parent_id:1,
          sport_id: "4",
          admin_partnership= adminPartership,
          master_partnership= partnership,
          superagent_partnership= 0,
          agent_partnership= 0,
        }
    b. user_type_id === SUPER_AGENT(3)
    <!-- "user_type_id": "3",
	"user_id": 3,
	"parent_id":2,
	"sport_id": "4",
	"partnership": 50 -->
        let getParentPartership=db.getParentParnnership(parent_id,user_id)
        if(getParentPartership){
            let adminPartership=100-partnership;
            let reqdata={
                user_type_id:2,  
                user_id:2,  
                parent_id:1,
                sport_id: "4",
                admin_partnership= adminPartership,
                master_partnership= partnership,
                superagent_partnership= 0,
                agent_partnership= 0,
            }
        }else{
            return "Parent details not available"
        }




1. How push code in github
    go to folder
    git add . 
    git commit -m "Comment descriptoion"
    git push origin master


2. How pull code from github
    git pull origin master



Redis API 

1. MarketId comma seperated, return all of odds
2. marketId, matchId

session match wise
oddsdata marketidwise

getMatchListForDashboardOld

1. getMatchesPage
2. getMatchesInplay
3. getMatchesFav
4. updatePassword
# bigbat-user-backend
# bigbet-user-backen
# bigbet-user-backen
# bigbet-user-backen
