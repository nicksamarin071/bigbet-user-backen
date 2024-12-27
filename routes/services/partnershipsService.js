const	globalFunction = require('../../utils/globalFunction');
const	CONSTANTS = require('../../utils/constants');
const	userService = require('./userService');
let resultdb = globalFunction.resultdb;
const { poolPromise ,sql} = require('../../db');
const SALT_WORK_FACTOR=10;

let getPartnershipByUserId = async (data) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
        .input('user_id', sql.Int, data.id)
        .input('sport_id', sql.Int, data.sportId)
        .input('agent_role', sql.Int, CONSTANTS.USER_TYPE_USER)
        .query('select user_type_id,user_id,parent_id,super_admin,admin,super_master,master,agent,super_admin_match_commission,admin_match_commission,super_master_match_commission,master_match_commission,agent_match_commission,user_match_commission,super_admin_session_commission,admin_session_commission,super_master_session_commission,master_session_commission,agent_session_commission,user_session_commission, commission_type_partnership_percentage, user_commission_lena_dena from partnerships where user_id =@user_id and sport_id=@sport_id and user_type_id=@agent_role');	     
       
		if (result.recordsets.length<=0) {
			return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
		}else{			
			return resultdb(CONSTANTS.SUCCESS, result.recordsets[0][0]);
		}
	} catch (error) {
		console.log(error);
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

let getPartnershipListByUserId = async (id) => {
	try {
        let  query='SELECT p.user_id,p.sport_id ,s.name,p.user_type_id, CASE WHEN p.user_type_id = 1 THEN p.admin WHEN p.user_type_id = 2 THEN p.master WHEN p.user_type_id = 3 THEN p.super_agent WHEN p.user_type_id = 4 THEN p.agent END as partnership FROM partnerships p inner join sports s on s.sport_id=p.sport_id where user_id = ?';
        let partnershipsdetails =await MysqlPool.query(query,[id]);
        if (partnershipsdetails.length<=0) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        }else{
            return resultdb(CONSTANTS.SUCCESS, partnershipsdetails);
        }
	} catch (error) {
		return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
	}
};

/**
 *
 * @param userId
 * @param sportId
 * @param partnership
 * @returns {Promise<{statusCode, data}>}
 */
let validatePartnership = async (userId,sportId,partnership) => {

        let  query=`SELECT p.user_id,p.sport_id,p.user_type_id,
            CASE
                WHEN p.user_type_id = 1 THEN p.admin
                WHEN p.user_type_id = 2 THEN p.master
                WHEN p.user_type_id = 3 THEN p.super_agent
                WHEN p.user_type_id = 4 THEN p.agent
            END AS partnership
        FROM partnerships p

        WHERE  sport_id= ? and  user_id in (select id from users where parent_id = ?) having partnership > ?` ;

        let partnershipsdetails =await MysqlPool.query(query,[sportId,userId,partnership]);

        if (partnershipsdetails.length<=0) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        }else{
            return resultdb(CONSTANTS.SUCCESS, partnershipsdetails);
        }

};


/**
 *
 * @param userId
 * @param sportId
 * @param sartnershipId
 * @returns {Promise<{statusCode, data}>}
 */
let updatePartnershipByUserAndSportId = async (user_id,sportId,partnership,user_type_id) => {
    try {

        let chieldIds = await userService.getChieldIdsWithOwn(user_id);

        let  query='UPDATE partnerships SET ';
        switch(user_type_id) {
            case 1:
                query+=' admin= '+partnership+' , master = admin-('+partnership+'- master)';
                break;
            case 2:
                query+=' admin= admin-('+partnership+'), master = master+('+partnership+')';
                break;
            case 3:
                query+=' master= master-('+partnership+'), super_agent = super_agent+('+partnership+')';
                break;
            case 4:
                query+=' super_agent= super_agent-('+partnership+'), agent = agent+('+partnership+')';
                break;
            default:
            // code block
        }


         query+=` WHERE user_id  in (${chieldIds.data.ids}) and sport_id= ${sportId} `;

        //console.log(query);
        //return false;

        let partnershipsdetails =await MysqlPool.query(query);
        if (partnershipsdetails.length<=0) {
            return resultdb(CONSTANTS.NOT_FOUND, CONSTANTS.DATA_NULL);
        }else{
            return resultdb(CONSTANTS.SUCCESS, partnershipsdetails);
        }
    } catch (error) {
        return resultdb(CONSTANTS.SERVER_ERROR, CONSTANTS.DATA_NULL);
    }
};






module.exports = {
    updatePartnershipByUserAndSportId,
	getPartnershipByUserId,
	getPartnershipListByUserId,
    validatePartnership
};