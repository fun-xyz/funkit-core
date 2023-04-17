const tokenSponsor = require("./TokenSponsor");
const gaslessSponsor = require("./GaslessSponsor")

module.exports = { ...tokenSponsor, ...gaslessSponsor };