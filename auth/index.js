const Auth = require("./Auth")
const EoaAuth = require("./EoaAuth")
const Web3AuthEoa = require("./Web3AuthEoa")

module.exports = { ...Auth, ...EoaAuth, ...Web3AuthEoa};