const Auth = require("./Auth")
const EoaAuth = require("./EoaAuth")


module.exports = { ...Auth, ...EoaAuth };