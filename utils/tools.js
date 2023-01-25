const CryptoJS = require("crypto-js")

const generateSha256 = (action) => {
    return CryptoJS.SHA256(JSON.stringify(action)).toString(CryptoJS.enc.Hex)
}


module.exports = { generateSha256 }