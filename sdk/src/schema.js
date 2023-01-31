const { generateSha256 } = require("../utils/tools");
const { FunWallet } = require("./FunWallet");

class AccessControlSchema {
    actionsStore = {}

    addModule(action, salt = 0) {
        this.actionsStore[generateSha256(action)] = { ...action, salt };
        return { ...action, salt }
    }
    removeModule(action, salt = 0) {
        delete this.actionsStore[generateSha256({ ...action, salt })]
    }
    updateModule(prevAction, newAction, salt = 0) {
        this.removeModule(prevAction, salt)
        this.addModule(newAction, salt)
    }
    getActions() { return Object.keys(this.actionsStore) }

    async createFunWallet(eoa, prefundamt, chain, index = 0) {
        const wallet = new FunWallet(eoa, this.actionsStore, chain, index,)
        const prefund = await wallet.init(prefundamt)
        console.log("Prefund Successful: ", prefund)
        return wallet
    }
}


module.exports = { AccessControlSchema }