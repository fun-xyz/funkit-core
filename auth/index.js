const Auth = require("./Auth")
const EoaAuth = require("./EoaAuth")
const Web3AuthEoa = require('./Web3AuthEoa')
const MagicAuthEoa = require("./MagicAuthEoa")
const MultiAuthEOA = require("./MultiAuthEoa");

module.exports = { ...Auth, ...EoaAuth, ...Web3AuthEoa, ...MagicAuthEoa, ...MultiAuthEOA };