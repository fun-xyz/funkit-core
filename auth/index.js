const Auth = require("./Auth")
const EoaAuth = require("./EoaAuth")
const MagicAuthEoa = require("./MagicAuthEoa")

module.exports = { ...Auth, ...EoaAuth, ...MagicAuthEoa };