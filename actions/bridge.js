const fetch = require('node-fetch');
const { approveAndExec } = require("./approveAndExec");
const { Token } = require("../data")
const { getChainFromData } = require("../utils")
const SOCKET_API_KEY = '04dd4572-e22b-4bd6-beb9-feb73d31d009'; // SOCKET PUBLIC API KEY - can swap for our key in prod

let errorData = {
  location: "actions.bridge"
}

/**
 * Given two chains and two addresses on those chains, return an approveAndExec 
 * transaction that will bridge the asset from one chain to the other.
 * @param {obj} params should have the following fields
 * {
 *   fromChain: number chainName(ie "ethereum") or chainId(ie 1) or rpcURL (ie "https://mainnet.infura.io/v3/...") or bundlerURL (ie "https://bundler.avax.network")
 *   toChain: number chainName(ie "ethereum") or chainId(ie 1) or rpcURL (ie "https://mainnet.infura.io/v3/...") or bundlerURL (ie "https://bundler.avax.network")
 *   fromAsset: string asset symbol(ie "usdc") or asset address(ie "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee")
 *   toAsset: string asset symbol(ie "usdc") or asset address(ie "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee")
 *   amount: number (amount of the from asset you want to input - make sure to take decimals into account)
 *   sort: string Can sort routes by "output"(Maximize number of tokens received) | 
 *         "gas"(Minimize gas costs) | "time"(Minimize bridging time)
 * }
 * @returns {obj} approveAndExec transaction
 */
const _bridge = (params) => {
  return async (actionData) => {
    const address = await actionData.wallet.getAddress()
    const data = await _socketBridge(params, address)
    if (!data.bridgeTx) {
      return { data: undefined, errorData }
    }
    else if (!data.approveTx) {
      return { data: data.bridgeTx, errorData }
    }
    else {
      return await approveAndExec({ approve: data.approveTx, exec: data.bridgeTx })(actionData)
    }
  }
}

/**
 * Bridge a given asset from one chain to another using the Socket API.
 * Note, use 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee for the native token on a chain (ie eth on Ethereum)
 * @param {obj} params should have the following fields
 * {
 *   fromChain: number chainName(ie "ethereum") or chainId(ie 1) or rpcURL (ie "https://mainnet.infura.io/v3/...") or bundlerURL (ie "https://bundler.avax.network")
 *   toChain: number chainName(ie "ethereum") or chainId(ie 1) or rpcURL (ie "https://mainnet.infura.io/v3/...") or bundlerURL (ie "https://bundler.avax.network")
 *   fromAsset: string asset symbol(ie "usdc") or asset address(ie "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee")
 *   toAsset: string asset symbol(ie "usdc") or asset address(ie "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee")
 *   amount: number (amount of the from asset you want to input - make sure to take decimals into account)
 *   sort: string Can sort routes by "output"(Maximize number of tokens received) | "gas"(Minimize gas costs) | "time"(Minimize bridging time)
 * }
 * @param {string} userAddress Address that sends the fromAsset and receives the toAsset
 * @param {obj} options Global options object, unused
 * @returns {approvalTx: obj, bridgeTx: obj} approveAndExec transactions
 */
const _socketBridge = async (params, userAddress) => {
  const fromChain = await getChainFromData(params.fromChain)
  const toChain = await getChainFromData(params.toChain)
  const fromTokenObj = new Token(params.fromAsset)
  const fromAsset = await fromTokenObj.getAddress({ chainId: await fromChain.getChainId() });
  const toTokenObj = new Token(params.toAsset)
  const toAsset = await toTokenObj.getAddress({ chainId: await toChain.getChainId() });
  const quote = await getQuote(await fromChain.getChainId(), fromAsset, await toChain.getChainId(),
    toAsset, params.amount, userAddress, true, params.sort, true);
  if (!quote.success || quote.result.routes.length === 0) {
    errorData = {
      location: "action.bridge",
      error: {
        title: "Possible reasons:",
        reasons: [
          "Unable to find a route for the given asset pair",
          "Socket API is down",
        ],
      }
    }
    return { approveTx: undefined, bridgeTx: undefined, errorData }
  }

  // Choosing first route from the returned route results 
  const route = quote.result.routes[0];

  // Fetching transaction data for swap/bridge tx
  const apiReturnData = await getRouteTransactionData(route);

  // --------------------- approve tokens ---------------------
  const approvalData = apiReturnData.result.approvalData;
  const { allowanceTarget, minimumApprovalAmount } = approvalData;
  let approveTx = undefined

  // approvalData from apiReturnData is null for native tokens 
  // Values are returned for ERC20 tokens but token allowance needs to be checked
  if (approvalData !== null) {
    const allowanceCheckStatus = await checkAllowance(fromChain.getChainId(), userAddress, allowanceTarget, fromAsset)
    const allowanceValue = allowanceCheckStatus.result?.value;

    if (minimumApprovalAmount > allowanceValue) {
      const approvalTransactionData = await getApprovalTransactionData(fromChain.getChainId(), userAddress, allowanceTarget, fromAsset, params.amount);
      approveTx = {
        to: approvalTransactionData.result?.to,
        data: approvalTransactionData.result?.data,
      }
    }
  }

  // --------------------- Bridge ---------------------
  bridgeTx = {
    to: apiReturnData.result.txTarget,
    value: apiReturnData.result.value,
    data: apiReturnData.result.txData,
  }
  return { approveTx, bridgeTx }
}

/**
 * Return a quote with socket routes for a given asset from one chain to another
 * @param {number} fromChainId chain id you are bridging the asset from
 * @param {string} fromTokenAddress address of the asset on fromChainId's chain
 * @param {number} toChainId chain id you are bridging the asset to
 * @param {string} toTokenAddress address of the asset you want to receive on toChainId's chain
 * @param {number} fromAmount Will there be an issue with decimals? ie 10**18 * 1_000_000
 * @param {string} userAddress Address that sends the fromAsset and receives the toAsset
 * @param {boolean} uniqueRoutesPerBridge set to true for single tx bridging
 * @param {string} sort Can sort routes by "output" | "gas" | "time"
 * @param {boolean} singleTxOnly set to true for single tx bridging
 * @returns https://docs.socket.tech/socket-api/v2/quote
 */
async function getQuote(fromChainId, fromTokenAddress, toChainId, toTokenAddress, fromAmount, userAddress, uniqueRoutesPerBridge, sort, singleTxOnly) {
  const response = await fetch(`https://api.socket.tech/v2/quote?fromChainId=${fromChainId}&fromTokenAddress=${fromTokenAddress}&toChainId=${toChainId}&toTokenAddress=${toTokenAddress}&fromAmount=${fromAmount}&userAddress=${userAddress}&uniqueRoutesPerBridge=${uniqueRoutesPerBridge}&sort=${sort}&singleTxOnly=${singleTxOnly}`, {
    method: 'GET',
    headers: {
      'API-KEY': SOCKET_API_KEY,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });

  const json = await response.json();
  return json;
}

/**
 * Makes a POST request to Socket APIs for swap/bridge transaction data
 * @param {*} route Output from getQuote
 * @returns https://docs.socket.tech/socket-api/v2/app/build-tx-get
 */
async function getRouteTransactionData(route) {
  const response = await fetch('https://api.socket.tech/v2/build-tx', {
    method: 'POST',
    headers: {
      'API-KEY': SOCKET_API_KEY,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ "route": route })
  });

  const json = await response.json();
  return json;
}

/**
 * GET request to check token allowance given to allowanceTarget by owner
 * 
 * @param {string} chainId ID of chain, for example Ethereum Mainnet is 1
 * @param {string} owner Address of token holder
 * @param {string} allowanceTarget Address whose spending allowance on behalf of owner is to be checked
 * @param {string} tokenAddress Contract address of token on the chain specified in chainId
 * @returns https://docs.socket.tech/socket-api/v2/approvals/check-allowance
 */
async function checkAllowance(chainId, owner, allowanceTarget, tokenAddress) {
  const response = await fetch(`https://api.socket.tech/v2/approval/check-allowance?chainID=${chainId}&owner=${owner}&allowanceTarget=${allowanceTarget}&tokenAddress=${tokenAddress}`, {
    method: 'GET',
    headers: {
      'API-KEY': SOCKET_API_KEY,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });

  const json = await response.json();
  return json;
}

/**
 * Fetches transaction data for token approval 
 * @param {string} chainId ID of chain, for example Ethereum Mainnet is 1
 * @param {string} owner Address of token holder
 * @param {string} allowanceTarget Address whose spending allowance on behalf of owner is to be checked
 * @param {string} tokenAddress Contract address of token on the chain specified in chainId
 * @param {string} amount Amount of tokens to be approved for spending. This value needs to be decimal adjusted.
 * @returns https://docs.socket.tech/socket-api/v2/approvals/approval-build-tx
 */
async function getApprovalTransactionData(chainId, owner, allowanceTarget, tokenAddress, amount) {
  const response = await fetch(`https://api.socket.tech/v2/approval/build-tx?chainID=${chainId}&owner=${owner}&allowanceTarget=${allowanceTarget}&tokenAddress=${tokenAddress}&amount=${amount}`, {
    method: 'GET',
    headers: {
      'API-KEY': SOCKET_API_KEY,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });

  const json = await response.json();
  return json;
}

module.exports = { _bridge };