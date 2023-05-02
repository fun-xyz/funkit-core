const { RampInstantSDK } = require("@ramp-network/ramp-instant-sdk")

//hostLogoURL, hostAppName passed from front-end and instantiated in the SDK
//hostApiKey stored in AWS and retrieved in SDK
//swapAsset will be set to ETH compatible assets
//enabledFlows will be set ONRAMP
//userAddress will be retrieved from the wallet instance


//TODO:
//GetAPIKey from AWS

const _onramp = (params) => {

  return async (actionData) => {
    const { wallet, chain, options } = actionData
    const {logo, name} = params;

    const userAddress = await wallet.getAddress({ chain })
    return new RampInstantSDK({
        hostLogoUrl: logo,
        hostAppName: name,
        userAddress: userAddress,
        enabledFlows: ['ONRAMP'],
        swapAsset: 'ETH_*',
        url: 'https://app.demo.ramp.network'
    })
  }
}

module.exports = { _onramp}
