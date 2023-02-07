const actionUtils = require('../utils/actionUtils.js')
const { TreasuryAPI } = require('../utils/TreasuryAPI.js')
const { wrapProvider } = require("../utils/Provider.js")
const { BundlerInstance } = require('../utils/BundlerInstance.js')
let accountAPI
const entryPointAddress = '0xCf64E11cd6A6499FD6d729986056F5cA7348349D'
const factoryAddress = '0xCb8b356Ab30EA87d62Ed1B6C069Ef3E51FaDF749'
const rpcurl = 'https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7'
const bundlerUrl = "http://54.184.167.23:3000/rpc"
const ethers = require('ethers')
const { assert } = require('chai')
const data = {
    data: '0xd0cb75fa000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000672d9623ee5ec5d864539b326710ec468cfe0abe0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001044ddf47d4000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000a596e25e2cbc988867b4ee7dc73634329e674d9e0000000000000000000000007021eb315ad2ce787e3a6fd1c4a136c9722457cc000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000406664323662346638303139316133623332616462633136343964633865326230323833323438323730333363623461363232636266646261303130383238343100000000000000000000000000000000000000000000000000000000',
    to: '0xF01abb54e72737194E40Db51d8E16c1238d7C914',
    from: '0xA596e25E2CbC988867B4Ee7Dc73634329E674d9e'
}
const privKey = '66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206'
const expectedCallData = '0x55cd05cc000000000000000000000000f01abb54e72737194e40db51d8e16c1238d7c914000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000204d0cb75fa000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000672d9623ee5ec5d864539b326710ec468cfe0abe0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001044ddf47d4000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000a596e25e2cbc988867b4ee7dc73634329e674d9e0000000000000000000000007021eb315ad2ce787e3a6fd1c4a136c9722457cc00000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000040666432366234663830313931613362333261646263313634396463386532623032383332343832373033336362346136323263626664626130313038323834310000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
let index = 0
describe('action util functions test', function () {
    before(async function () {
        const provider = new ethers.providers.JsonRpcProvider(rpcurl);
        // erc4337Provider = await wrapProvider(provider, this.config, this.eoa, this.factoryAddress)
        const eoa = new ethers.Wallet(privKey, provider)

        // accountApi = new TreasuryAPI({
        //     provider: erc4337Provider,
        //     entryPointAddress: entryPointAddress,
        //     factoryAddress: factoryAddress,
        //     owner: eoa,
        //     index:0
        // })
        let { bundlerClient, accountApi } = await BundlerInstance.connect(rpcurl, bundlerUrl, entryPointAddress, factoryAddress, eoa, index)
        accountAPI = accountApi

    })
    it('createAction', async function () {
        const res = await actionUtils.createAction(accountAPI, data, 56000)
        // console.log(res)
        assert.equal(res.callData, expectedCallData)
    })
})