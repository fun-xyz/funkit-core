const fetch = require('node-fetch');
const { parseOptions } = require('../utils')
const { approveAndExec } = require("./approveAndExec");

const API_KEY = '645b2c8c-5825-4930-baf3-d9b997fcd88c'; // SOCKET PUBLIC API KEY


const errorData = {
  location: "actions.bridge"
}

const _swap = (params) => {
  return async (actionData) => {
    const { wallet, chain, options } = actionData
    const address = await actionData.wallet.getAddress()
    const data = await _socketBridge(params, address, options)
    if (!data.approveTx) {
      return { data: data.bridgeTx, errorData }
    }
    else {
      return await approveAndExec({ approve: data.approveTx, exec: data.bridgeTx })(actionData)
    }
  }
}


const _socketBridge = async (params, userAddress, options = global) => {
  const { chain } = await parseOptions(options)

  const uniqueRoutesPerBridge = true; // Returns the best route for a given DEX / bridge combination
  const sort = "output"; // "output" | "gas" | "time"
  const singleTxOnly = true;

  // For single transaction bridging, mark singleTxOnly flag as true in query params
  const quote = await getQuote(params.fromChainId,
    params.fromAssetAddress, params.toChainId,
    params.toAssetAddress, params.amount,
    userAddress, uniqueRoutesPerBridge, sort, singleTxOnly
  );

  // Choosing first route from the returned route results 
  const route = quote.result.routes[0];

  // Fetching transaction data for swap/bridge tx
  const apiReturnData = await getRouteTransactionData(route);

  // --------------------- APPROVAL ---------------------
  // Used to check for ERC-20 approvals
  const approvalData = apiReturnData.result.approvalData;
  const { allowanceTarget, minimumApprovalAmount } = approvalData;
  let approveTx = undefined

  // approvalData from apiReturnData is null for native tokens 
  // Values are returned for ERC20 tokens but token allowance needs to be checked
  if (approvalData !== null) {
    // Fetches token allowance given to Socket contracts
    const allowanceCheckStatus = await checkAllowance(params.fromChainId, userAddress, allowanceTarget, params.fromAssetAddress)
    const allowanceValue = allowanceCheckStatus.result?.value;

    // If Socket contracts don't have sufficient allowance, otherwise leave undefined
    if (minimumApprovalAmount > allowanceValue) {
      // Approval tx data fetched
      const approvalTransactionData = await getApprovalTransactionData(params.fromChainId, userAddress, allowanceTarget, params.fromAssetAddress, params.amount);
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

// Makes a GET request to Socket APIs for quote
async function getQuote(fromChainId, fromTokenAddress, toChainId, toTokenAddress, fromAmount, userAddress, uniqueRoutesPerBridge, sort, singleTxOnly) {
  const response = await fetch(`https://api.socket.tech/v2/quote?fromChainId=${fromChainId}&fromTokenAddress=${fromTokenAddress}&toChainId=${toChainId}&toTokenAddress=${toTokenAddress}&fromAmount=${fromAmount}&userAddress=${userAddress}&uniqueRoutesPerBridge=${uniqueRoutesPerBridge}&sort=${sort}&singleTxOnly=${singleTxOnly}`, {
    method: 'GET',
    headers: {
      'API-KEY': API_KEY,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });

  const json = await response.json();
  return json;
}

// Makes a POST request to Socket APIs for swap/bridge transaction data
async function getRouteTransactionData(route) {
  const response = await fetch('https://api.socket.tech/v2/build-tx', {
    method: 'POST',
    headers: {
      'API-KEY': API_KEY,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ "route": route })
  });

  const json = await response.json();
  return json;
}

// GET request to check token allowance given to allowanceTarget by owner
async function checkAllowance(chainId, owner, allowanceTarget, tokenAddress) {
  const response = await fetch(`https://api.socket.tech/v2/approval/check-allowance?chainID=${chainId}&owner=${owner}&allowanceTarget=${allowanceTarget}&tokenAddress=${tokenAddress}`, {
    method: 'GET',
    headers: {
      'API-KEY': API_KEY,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });

  const json = await response.json();
  return json;
}

// Fetches transaction data for token approval 
async function getApprovalTransactionData(chainId, owner, allowanceTarget, tokenAddress, amount) {
  const response = await fetch(`https://api.socket.tech/v2/approval/build-tx?chainID=${chainId}&owner=${owner}&allowanceTarget=${allowanceTarget}&tokenAddress=${tokenAddress}&amount=${amount}`, {
    method: 'GET',
    headers: {
      'API-KEY': API_KEY,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });

  const json = await response.json();
  return json;
}

// Fetches status of the bridging transaction
// async function getBridgeStatus(transactionHash, fromChainId, toChainId) {
//   const response = await fetch(`https://api.socket.tech/v2/bridge-status?transactionHash=${transactionHash}&fromChainId=${fromChainId}&toChainId=${toChainId}`, {
//     method: 'GET',
//     headers: {
//       'API-KEY': API_KEY,
//       'Accept': 'application/json',
//       'Content-Type': 'application/json'
//     }
//   });

//   const json = await response.json();
//   return json;
// }

module.exports = { _swap };