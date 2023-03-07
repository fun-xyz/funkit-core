const { DataServer } = require("../utils/DataServer")

/**
* Fun Account Manager
*/
class FunAccountManager {

    /**
    * Standard constructor
    * @param {string} API_KEY Fun developer API key
    */
    constructor(API_KEY) {
        if (!API_KEY) {
            throw Error("API_KEY must be specified to construct FunAccountManager")
        }
        this.API_KEY = API_KEY;
    }

    /**
     * Load all user data associated with an API_KEY
     */
    async getAllUserData(){
      return new Promise(async (res, rej) => {
        const data = await DataServer.getAllUserData()
        return res(data)
      })
    }

     /**
     * Load specific user data by their unique identifier
     * @param {string} user_id Unique user identifier
     */
     async getUserData(user_id){
      return new Promise(async (res, rej) => {
        const data = await DataServer.getUserData(user_id)
        return res(data)
      })
    }
    
}

module.exports = { FunAccountManager }
