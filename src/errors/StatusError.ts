const { BaseError } = require("./BaseError")

class StatusError extends BaseError {
  constructor(service: string, status: string, location: string = "", helper, isInternal = false, stackDepth = 1) {
    super(`${service} ${status} in ${location}`, helper, isInternal, stackDepth)
  }
}

module.exports = { StatusError }
