const CryptoJS = require("crypto-js")


const generateActionHash = (action) => {
    return CryptoJS.SHA256(JSON.stringify(action)).toString(CryptoJS.enc.Hex)
}

class Schema {
    actionsStore = {}

    addAction(action) {
        actionsStore[generateActionHash(action)] = action;
    }
    removeAction(action) {
        delete actionsStore[generateActionHash(action)]
    }
    updateAction(prevAction, newAction) {
        this.removeAction(prevAction)
        this.addAction(newAction)
    }
    getActions() { return Object.keys(this.actionsStore) }
}