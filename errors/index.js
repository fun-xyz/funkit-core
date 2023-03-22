const baseErrors = require('./BaseError');
const dataErrors = require("./DataError")
const helpers = require("./Helper")
const parameterErrors = require("./ParameterError")


module.exports = { ...dataErrors, ...baseErrors, ...helpers, ...parameterErrors }