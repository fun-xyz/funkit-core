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
        return res({
          users: [{
            id: "",
            accounts: [{
              wallet_addr: "",
              chain_id: "",
              chain_name: ""
            }]
          }]
        });
      })
    }

     /**
     * Load specific user data by their unique identifier
     * @param {string} userId Unique user identifier
     */
     async getUserData(userId){
      return new Promise(async (res, rej) => {
        return res({
          id: userId,
          accounts: [{
            wallet_addr: "",
            chain_id: "",
            chain_name: ""
          }]
        });
      })
    }
    
}

module.exports = { FunAccountManager }
