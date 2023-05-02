import { RampInstantSDK } from "@ramp-network/ramp-instant-sdk";

//TODO:
//GetAPIKey from AWS

//getUser address from wallet
const _onramp = (params) => {

//partial user op - chain and wallet
  return async (actionData) => {
    let { hostLogoUrl, hostAppName, hostApiKey, swapAsset, userAddress } = params;

    return 
  };
};

module.exports = { _transfer, _approve };
