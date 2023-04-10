const tokenSponsor = require("./TokenSponsor");
const feelessSponsor = require("./Feeless")

module.exports = { ...tokenSponsor, ...feelessSponsor };