const tokenSponsor = require("./TokenSponsor");
const GaslessSponsor = require("./GaslessSponsor")

module.exports = { ...tokenSponsor, ...GaslessSponsor };