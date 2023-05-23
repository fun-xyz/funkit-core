const { DataServer } = require("../servers/DataServer")

const APIURL = "https://m2m3k0n2uf.execute-api.us-west-2.amazonaws.com/prod/"//"https://zl8bx9p7f4.execute-api.us-west-2.amazonaws.com/Prod"
const TEST_API_KEY = "localtest"

const getOrgInfo = async (apiKey) => {
    if (apiKey == TEST_API_KEY) {
        return { id: "test", name: "test" }
    }
    return await DataServer.sendGetRequest(APIURL, "apikey", apiKey).then((r) => {
        return r.data
    })
}
module.exports = { getOrgInfo }