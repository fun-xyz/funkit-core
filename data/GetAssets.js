const { Network, Alchemy } = require("alchemy-sdk")
const fetch = require('node-fetch')

const ALCHEMY_KEY = "7Azt6l3Ys70v7YYIm10Qk19FNCqPN4SY"
const CRYPTOCOMPARE_KEY = "185dcc99d0354993163234bee79d937acf057db102668b3cfa3570bcbbd13bf4"

/**
  * Get all NFTs and prices owned by a wallet address
 * @param {string} Address of the NFT holder you want to query
 * @returns {list of JSON}
 * [
 *   {
 *      "address": "0xaddressOfCollection",
 *      "token_id": '123',
 *      "floor_price": 12.3 // floor price of collection in ETH
 *   }
 * ]
 */
async function getAllOwnedNFTs(chainId, holderAddr){
  const settings = {
    apiKey: "7Azt6l3Ys70v7YYIm10Qk19FNCqPN4SY", // Replace with your Alchemy API Key.
    network: chainIdToAlchemyNetwork(chainId), // Replace with your network.
  }
  const alchemy = new Alchemy(settings)
  const res = await alchemy.nft.getNftsForOwner(holderAddr)
  let nftAddresses = {}
  for (let i=0; i < res["ownedNfts"].length; i++){
    nftAddresses.push({
      "address": res["ownedNfts"][i]["contract"]["address"],
      "token_id": res["ownedNfts"][i]["tokenId"],
      "floor_price": res["ownedNfts"][i]["contract"]["openSea"]["floorPrice"] ?? 0,
    })
  }
  return nftAddresses
}

/**
 * Returns the symbol, amount, and price of all ERC-20 tokens owned by the given address.
 * @param chainId The EVM style chain id of the network you want to query.
 * @param holderAddr The address of the EOA or smart contract wallet you want to query.
 * @param onlyMajors If true, only return tokens with a logo(filters out scam token)
 * @returns {JSON} JSON object of token balances
 * The format of the JSON Object is
 * {
 *   // If this token has no price
 *   '0xaddress_string': {
 *     tokenBalance: '0x123',
 *   },
 *   // If this token has a price
 *   '0xaddress_string': {
 *    tokenBalance: "0x123" // hex value of raw token balance, divide by decimals to scale correctly
 *    price: 1828.12 // price of token in USD
 *    decimals: 18 // number of decimals to scale token balance by
 *   }
 * }
 */
async function getTokenBalances(chainId, holderAddr, onlyVerifiedTokens=false) {
  const settings = {
    apiKey: ALCHEMY_KEY, // Replace with your Alchemy API Key.
    network: chainIdToAlchemyNetwork(chainId),
  }
  
  // Query Alchemy for ERC20 token balances
  const alchemy = new Alchemy(settings)
  let tokenBalances = {}
  const res = (await alchemy.core.getTokenBalances(holderAddr))['tokenBalances']
  res.forEach(item => {
    const {contractAddress, ...data} = item
    tokenBalances[contractAddress] = data
  })

  // Query defillama for token prices
  const queries = await getDefillamaQueries(chainId, tokenBalances)
  for (let i = 0; i < queries.length; i++){
    const price = await (await fetch(queries[i])).json()
    Object.entries(price['coins']).forEach(([key, ]) => {
      const tokenAddress = key.replace(chainIdToDefillama(chainId) + ":", "")
      tokenBalances[tokenAddress]['price'] = price['coins'][key]['price']
      tokenBalances[tokenAddress]['decimals'] = price['coins'][key]['decimals']
    })
  }  

  // Query alchemy for token symbol, token decimals, and token logo
  for(const [key, ] of Object.entries(tokenBalances)){
    const address = key
    const res = await alchemy.core.getTokenMetadata(address)
    tokenBalances[address]['symbol'] = res['symbol']
    tokenBalances[address]['decimals'] = res['decimals']
    tokenBalances[address]['logo'] = res['logo']
  }

  // Query Alchemy for native token(ETH) amount and price
  const ethBalance = (await alchemy.core.getBalance(holderAddr, 'latest'))
  tokenBalances['0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'] = {
    tokenBalance: ethBalance.toHexString(),
    price: await getNativeGasTokenPrice(chainId),
  }

  if (onlyVerifiedTokens){
    return Object.fromEntries(Object.entries(tokenBalances).filter(([, value]) => value.logo !== null))
  }
  return tokenBalances
}

/**
 * @param {number} chainId https://chainlist.org/
 * @returns the price of the native gas token for the given chain in decimal format
 */
async function getNativeGasTokenPrice(chainId){
  const url = `https://min-api.cryptocompare.com/data/price?fsym=${chainIdToCryptocompare(chainId)}&tsyms=USD&apikey=${CRYPTOCOMPARE_KEY}`
  const res = await fetch(url)
  return (await res.json())['USD']
}

/**
 * Create defillama queries for the array of tokens returned from the alchemy getTokenBalances function
 * @param {number} chainId
 * @param {JSON} tokens Array of {"contractAddress": "0x...", "tokenBalance": "0x..."}
 * @return {Array} array of defillama queries for prices
 */
async function getDefillamaQueries(chainId, tokens){
  const maxQueryCount = 4 // Maximum number of coins per query
  let query = "https://coins.llama.fi/prices/current/" // Base query to get prices
  let queries = []
  let queryCount = 0
  for(const [key,] of Object.entries(tokens)){
    const address = key
    if (queryCount < maxQueryCount){
      query += chainIdToDefillama(chainId) + ":" + address + ","
    } else {
      queries.push(query)
      query = "https://coins.llama.fi/prices/current/" + chainIdToDefillama(chainId) + ":" + address + ","
      queryCount = 0
    }
    queryCount++
  }
  if (query.localeCompare("https://coins.llama.fi/prices/current/") !== 0){
    queries.push(query)
  }
  return queries
}
getTokenBalances(1, "0xaE8c5032A0436d1e4A4b0711908c05d65F421F67", true)

/**
 * Given a chain id, returns the defillama network ID string.
 * @param {number} chainId 
 * @returns defillama ID string
 */
function chainIdToDefillama(chainId){
  switch(chainId){
    case 1:
      return "ethereum"
    case 10:
      return "optimism"
    case 56:
      return "bsc"
    case 137:
      return "polygon"
    case 42161:
      return "arbitrum"
    default:
      return "ethereum"
  }
}

/**
 * Given a chain id, returns the Alchemy Network ID string.
 * @param {number} chainId 
 * @returns Alchemy Network ID string
 */
function chainIdToAlchemyNetwork(chainId){
  switch(chainId){
    case 1:
      return Network.ETH_MAINNET
    case 5:
      return Network.ETH_GOERLI
    case 10:
      return Network.OPT_MAINNET
    case 56:
      return Network.BSC_MAINNET
    case 137:
      return Network.MATIC_MAINNET
    case 42161:
      return Network.ARB_MAINNET
    case 11155111:
      return Network.ETH_SEPOLIA
    default:
      return Network.ETH_MAINNET
  }
}

/**
 * Get the cryptocompare symbol for the given chain id
 * @param {number} chainId 
 * @returns {string} cryptocompare symbol
 */
function chainIdToCryptocompare(chainId){
  switch(chainId){
    case 1:
      return "ETH"
    case 10:
      return "ETH"
    case 56:
      return "BNB"
    case 137:
      return "MATIC"
    case 42161:
      return "ETH"
    default:
      return "ETH"
  }
}