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
        this.dataServer = new DataServer(API_KEY);
    }

    /**
     * Load all user data associated with an API_KEY
     */
    async getAllUserData(){
      const self = this;
      return new Promise(async (res, rej) => {
        if(!self.dataServer.id) await self.dataServer.init()
        const data = await self.dataServer.getAllUserData()
        return res(data)
      })
    }

     /**
     * Load specific user data by their unique identifier
     * @param {string} user_id Unique user identifier
     */
     async getUserData(user_id){
      const self = this;
      return new Promise(async (res, rej) => {
        if(!self.dataServer.id) await self.dataServer.init()
        const data = await self.dataServer.getUserData(user_id)
        return res(data)
      })
    }
    
}

module.exports = { FunAccountManager }
