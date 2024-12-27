const MysqlPool = require('../../db');
const globalFunction = require('../../utils/globalFunction');
const CONSTANTS = require('../../utils/constants');


let resultdb = globalFunction.resultdb;

let profitLossMatchWise = async (user_id,user_type_id,sport_id=0,match_id=0,market_id=0,to_date=0,from_date=0) => {
	try {

		let  query='select ';
		let whereCondition = ' where 1=1 ';
		let groupByCondition = ' ';

		switch(user_type_id) {
		case 1:
			query+=' match_id,market_id,reffered_name,sum(stack) as stack,sum(admin_pl) AS player_p_l,  sum(admin_pl) AS downline_p_l  , 0 AS upline_p_l, 0 AS super_comm';
			whereCondition+= ' and admin_id= '+user_id;
			break;
		case 2:
			query+=' match_id,market_id,reffered_name,sum(stack) as stack,sum(master_pl)  AS player_p_l,  sum(master_pl+admin_pl) AS downline_p_l  , sum(admin_pl) AS upline_p_l, 0 AS super_comm';
			whereCondition+= ' and master_id= '+user_id;
			break;
		case 3:
			query+=' match_id,market_id,reffered_name,sum(stack) as stack,sum(super_agent_pl)  AS player_p_l,  sum(super_agent_pl+master_pl+admin_pl) AS downline_p_l  , sum(master_pl+admin_pl) AS upline_p_l, 0 AS super_comm';
			whereCondition+= ' and super_agent_id= '+user_id;
			break;
		case 4:
			query+=' match_id,market_id,reffered_name,sum(stack) as stack,sum(agent_pl)  AS player_p_l,  sum(agent_pl+super_agent_pl+master_pl+admin_pl) AS downline_p_l  , sum(super_agent_pl+master_pl+admin_pl) AS upline_p_l, 0 AS super_comm';
			whereCondition+= ' and agent_id= '+user_id;
			break;
		default:
			query+=' match_id,market_id,reffered_name,sum(stack) as stack,sum(user_pl)  AS player_p_l,  0 AS downline_p_l  , sum(-user_pl) AS upline_p_l, 0 AS super_comm';
			whereCondition+= ' and user_id= '+user_id;
		}

		if(sport_id!=0){
			whereCondition+=' and sport_id='+sport_id;
		}
		if(match_id!=0){
			whereCondition+=' and match_id='+match_id;
		}
		if(market_id!=0){
			whereCondition+=' and market_id='+market_id;
			groupByCondition = ' market_id,type';
		}
        if(from_date!=0){
            whereCondition+=" and DATE(FROM_UNIXTIME(user_profit_loss.created_at)) >= date('"+from_date+"')";
        }
		if(to_date!=0){
			 whereCondition+=" and DATE(FROM_UNIXTIME(user_profit_loss.created_at)) <= date('"+to_date+"')";
		}


		query+=' from user_profit_loss ' + whereCondition + ' group by match_id'+groupByCondition;
		//console.log(query);
		let resFromDB = await MysqlPool.query(query,true);
		//console.log(resFromDB.sql);
		return resultdb(CONSTANTS.SUCCESS, resFromDB);
	} catch (error) {
		//console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let profitLossUpline = async (user_id,user_type_id,to_date=0,from_date=0) => {
	try {

		let  query='';
        let whereCondition = '';
        if(from_date!=0){
            whereCondition+=" and DATE(FROM_UNIXTIME(user_profit_loss.created_at)) >= date('"+from_date+"')";
        }
        if(to_date!=0){
            whereCondition+=" and DATE(FROM_UNIXTIME(user_profit_loss.created_at)) <= date('"+to_date+"')";
        }
		switch(user_type_id) {
		case 1:
			query=`
                    select u.name, match_id,market_id,reffered_name,sum(stack) as stack,sum(admin_pl) AS player_p_l,  sum(admin_pl) AS downline_p_l , 0 AS upline_p_l, 0 AS super_comm                    
                    from user_profit_loss
                    inner join users u on u.id=user_profit_loss.master_id
                    
                    WHERE user_profit_loss.admin_id = ${user_id} ${whereCondition}
                    group by user_profit_loss.master_id
                `;

			break;
		case 2:
			query=`
                    select u.name, match_id,market_id,reffered_name,sum(stack) as stack,sum(master_pl)  AS player_p_l,  sum(master_pl+admin_pl) AS downline_p_l  , sum(admin_pl) AS upline_p_l, 0 AS super_comm
                    from user_profit_loss
                    inner join users u on u.id=user_profit_loss.super_agent_id
                    WHERE user_profit_loss.master_id = ${user_id} ${whereCondition}
                    group by user_profit_loss.super_agent_id
                `;
			break;
		case 3:
			query=`
                    select u.name,  match_id,market_id,reffered_name,sum(stack) as stack,sum(super_agent_pl)  AS player_p_l,  sum(super_agent_pl+master_pl+admin_pl) AS downline_p_l  , sum(master_pl+admin_pl) AS upline_p_l, 0 AS super_comm
                    
                    from user_profit_loss
                    inner join users u on u.id=user_profit_loss.agent_id
                    
                    WHERE user_profit_loss.super_agent_id = ${user_id} ${whereCondition}
                    group by user_profit_loss.agent_id
                `;
			break;
		case 4:
			query=`
                    select u.name,  match_id,market_id,reffered_name,sum(stack) as stack,sum(agent_pl)  AS player_p_l,  sum(agent_pl+super_agent_pl+master_pl+admin_pl) AS downline_p_l  , sum(super_agent_pl+master_pl+admin_pl) AS upline_p_l, 0 AS super_comm
                    
                    from user_profit_loss
                    inner join users u on u.id=user_profit_loss.user_id
                    
                    WHERE user_profit_loss.agent_id = ${user_id} ${whereCondition}
                    group by user_profit_loss.user_id
                `;
			break;
		default:
			query=`
                    select u.name, match_id,market_id,reffered_name,sum(stack) as stack,sum(user_pl)  AS player_p_l,  0 AS downline_p_l  , sum(-user_pl) AS upline_p_l, 0 AS super_comm                    
                    from user_profit_loss
                    inner join users u on u.id=user_profit_loss.user_id                    
                    WHERE user_profit_loss.user_id = ${user_id} ${whereCondition}
                    group by user_profit_loss.user_id
                `;
		}


		//console.log(query);
		let resFromDB = await MysqlPool.query(query,true);
		//console.log(resFromDB.sql);
		return resultdb(CONSTANTS.SUCCESS, resFromDB);
	} catch (error) {
		//console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let profitLossUplineBySport = async (user_id,user_type_id,to_date=0,from_date=0) => {
    try {

        let  query='';

        switch(user_type_id) {
            case 1:
                query=`
                    SELECT match_id,market_id,SUBSTRING_INDEX(reffered_name, '->', 1) reffered_name, SUM(stack) AS stack, SUM(admin_pl) AS player_p_l, SUM(admin_pl) AS downline_p_l, 0 AS upline_p_l, 0 AS super_comm
FROM user_profit_loss
WHERE user_profit_loss.admin_id = ${user_id}
GROUP BY  user_profit_loss.sport_id
                `;

                break;
            case 2:
                query=`
                SELECT match_id,market_id,SUBSTRING_INDEX(reffered_name, '->', 1) reffered_name, SUM(stack) AS stack, SUM(admin_pl) AS player_p_l, SUM(admin_pl) AS downline_p_l, 0 AS upline_p_l, 0 AS super_comm
FROM user_profit_loss
WHERE user_profit_loss.master_id = ${user_id}
GROUP BY  user_profit_loss.sport_id
                `;
                break;
            case 3:
                query=`
                SELECT match_id,market_id,SUBSTRING_INDEX(reffered_name, '->', 1) reffered_name, SUM(stack) AS stack, SUM(admin_pl) AS player_p_l, SUM(admin_pl) AS downline_p_l, 0 AS upline_p_l, 0 AS super_comm
FROM user_profit_loss
WHERE user_profit_loss.super_agent_id = ${user_id}
GROUP BY  user_profit_loss.sport_id
                `;
                break;
            case 4:
                query=`
                SELECT match_id,market_id,SUBSTRING_INDEX(reffered_name, '->', 1) reffered_name, SUM(stack) AS stack, SUM(admin_pl) AS player_p_l, SUM(admin_pl) AS downline_p_l, 0 AS upline_p_l, 0 AS super_comm
FROM user_profit_loss
WHERE user_profit_loss.agent_id = ${user_id}
GROUP BY  user_profit_loss.sport_id
                `;
                break;
            default:
                query=`
                 SELECT match_id,market_id,SUBSTRING_INDEX(reffered_name, '->', 1) reffered_name, SUM(stack) AS stack, SUM(admin_pl) AS player_p_l, SUM(admin_pl) AS downline_p_l, 0 AS upline_p_l, 0 AS super_comm
FROM user_profit_loss
WHERE user_profit_loss.user_id = ${user_id}
GROUP BY  user_profit_loss.sport_id
                `;
        }

        if(to_date!=0){
            // condition+=" created_at="+sport_id;
        }
        if(from_date!=0){
            // condition+=" created_at="+sport_id;
        }

        //console.log(query);
        let resFromDB = await MysqlPool.query(query,true);
        //console.log(resFromDB.sql);
        return resultdb(CONSTANTS.SUCCESS, resFromDB);
    } catch (error) {
        //console.log(error);
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};


module.exports = {
	profitLossMatchWise,
	profitLossUpline,
    profitLossUplineBySport
};