const tokenSponsor = require("./TokenSponsor");
const multiTokenSponsor = require("./MultiTokenSponsor")

module.exports = { ...tokenSponsor, ...multiTokenSponsor };