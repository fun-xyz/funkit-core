const Auth = require("./Auth")
const EoaAuth = require("./EoaAuth")
const MagicAuthEoa = require("./MagicAuthEoa")
const MultiAuthEOA = require("./MultiAuthEoa");

module.exports = { ...Auth, ...EoaAuth, ...MagicAuthEoa, ...MultiAuthEOA };