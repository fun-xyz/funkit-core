const transfers = require("./transfer")

const swap = require("./swap")
module.exports = { ...transfers, ...swap };