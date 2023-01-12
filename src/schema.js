const { generateSha256 } = require("../utils/tools");
const { FunWallet } = require("./funWallet");

class AccessControlSchema {
    actionsStore = {}

    addAction(action, salt = 0) {
        actionsStore[generateSha256(action)] = { ...action, salt };
    }
    removeAction(action, salt = 0) {
        delete actionsStore[generateSha256({ ...action, salt })]
    }
    updateAction(prevAction, newAction, salt = 0) {
        this.removeAction(prevAction, salt)
        this.addAction(newAction, salt)
    }
    getActions() { return Object.keys(this.actionsStore) }

    async createFunWallet(eoa, prefundamt, index = 0) {
        const wallet = new FunWallet(eoa, this.actionsStore, index)
        await wallet.init(prefundamt)
    }
}


module.exports = { AccessControlSchema }