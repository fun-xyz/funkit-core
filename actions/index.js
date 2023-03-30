const transfers = require("./token")
const swap = require("./swap")
const firstClass = require("./firstClass")


const genCall = (data, callGasLimit = 100_000) => {
    return async () => {
        const gasInfo = { callGasLimit }
        return { gasInfo, data, errorData: { location: "action.genCall" } }
    }
}


module.exports = { ...transfers, ...swap, ...firstClass, genCall };