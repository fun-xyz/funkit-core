const actionUtils = require('../utils/actionUtils')
const {TreasuryApi}  = require('../utils/TreasuryAPI')
let accountApi, to, data
const entryPointAddress='0xCf64E11cd6A6499FD6d729986056F5cA7348349D'
const factoryAddress='0xCb8b356Ab30EA87d62Ed1B6C069Ef3E51FaDF749'
const rpcurl='https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7'
const ethers = require('ethers')

describe('action util functions test', function(){
    before(async function(){
        const provider = new ethers.providers.JsonRpcProvider(rpcurl);
        accountApi = new TreasuryAPI({
            provider: provider,
            entryPointAddress: entryPointAddress,  
            factoryAddress: factoryAddress
        })
    })
    it('createAction', async function(){
        
        actionUtils._createAction(accountApi, data, 56000)

    })
})