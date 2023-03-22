const baseErrors = require('./BaseError');
const dataErrors = require("./DataError")
const helpers = require("./Helper")
const parameterErrors = require("./ParameterError")
const serverErrors = require("./ServerError")


module.exports = { ...serverErrors, ...dataErrors, ...baseErrors, ...helpers, ...parameterErrors }