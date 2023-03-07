const { DataServer} = require('../utils/DataServer')
const { API_KEY } = require("./TestUtils")

const dataServer = new DataServer(API_KEY);
dataServer.init();

async function main(){
  console.log("Testing DataServer.getChainFromName");
  try {
    let chain = await dataServer.getChainFromName("ethereum");
    console.log(chain)
    chain = await dataServer.getChainFromName("avalanche");
    console.log(chain)
    chain = await dataServer.getChainFromName("avalanche-fuji");
    console.log(chain)
    chain = await dataServer.getChainFromName("polygon");
    console.log(chain)
    chain = await dataServer.getChainFromName("polygon-mumbai");
    console.log(chain)
  } catch(e){
    console.log(e)
  }
}

main()

