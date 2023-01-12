const CryptoJS = require("crypto-js")

const generateActionHash = (action) => {
    return CryptoJS.SHA256(JSON.stringify(action)).toString(CryptoJS.enc.Hex)
}


module.exports = { generateActionHash }