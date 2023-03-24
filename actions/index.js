const transfers = require("./token")
const swap = require("./swap")
const firstClass = require("./firstClass")
module.exports = { ...transfers, ...swap, ...firstClass };