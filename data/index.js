const dataServer = require("./DataServer")
const userOp = require("./UserOp")

module.exports = { ...dataServer, ...userOp }