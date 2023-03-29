const tokenSponsor = require("./TokenSponsor");
const multiTokenSponsor = require("./TokenSponsor")

module.exports = { ...tokenSponsor, ...multiTokenSponsor };