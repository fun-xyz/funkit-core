const { expect } = require("chai")
const { FunWallet, FunWalletConfig } = require("../index")
const { RoleManager, Rule, Keyword, UserManager, UserMetadata, AuthType } = require("../src/modules")
const ethers = require('ethers')
const { transferAmt, HARDHAT_FORK_CHAIN_ID, RPC_URL, PRIV_KEY, PKEY, OWNER_PKEY, TEST_API_KEY } = require("./TestUtils")
const { TOKEN_SWAP_MODULE_NAME } = require("../src/modules/Module")

const PREFUND_AMT = 0.3
const AMOUNT = 60
const WILDCARD_BYTES32 = ethers.utils.formatBytes32String("*")

describe("RBAC", function() {
    let eoa
    let owner
    let wallet
    let roleManager
    let userManager

    before(async function() {
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
        eoa = new ethers.Wallet(PRIV_KEY, provider)
        owner = new ethers.Wallet(OWNER_PKEY, provider)
        const funder = new ethers.Wallet(PKEY, provider)
        await transferAmt(funder, eoa.address, AMOUNT + 1)
        await transferAmt(funder, owner.address, AMOUNT + 1)

        const walletConfig = new FunWalletConfig(eoa, await eoa.getAddress(), HARDHAT_FORK_CHAIN_ID, PREFUND_AMT)
        wallet = new FunWallet(walletConfig, TEST_API_KEY)
        await wallet.init()
    })

    function getRndInteger(min, max) {
        return Math.floor(Math.random() * (max - min) ) + min;
      }

    describe("role", async function() {
        before(async function() {
            this.timeout(30000)
            roleManager = new RoleManager()
            await wallet.addModule(roleManager)
            await wallet.deploy()
        })

        it("create role then fetch the role", async function() {
            this.timeout(30000)
            const rule1 = new Rule("*", WILDCARD_BYTES32, Keyword.WILDCARD, 1000)
            const rule2 = new Rule("test action", WILDCARD_BYTES32, Keyword.GREATER, 1000)
            const roleName = "create role test" + getRndInteger(1, 100000).toString()

            const createRoleTx = await wallet.createRoleTx(roleName, wallet.address, [rule1, rule2])
            await wallet.deployTx(createRoleTx)

            const rulesOfCreatedRole = await wallet.getRulesOfRole(roleName, wallet.address)
            
            expect(rulesOfCreatedRole[0].action).to.be.equal(rule1.action)
            expect(rulesOfCreatedRole[0].target).to.be.equal(rule1.target)
            expect(rulesOfCreatedRole[0].keyword).to.be.equal(rule1.keyword)
            expect(rulesOfCreatedRole[0].extent).to.be.equal(rule1.extent)

            expect(rulesOfCreatedRole[1].action).to.be.equal(rule2.action)
            expect(rulesOfCreatedRole[1].target).to.be.equal(rule2.target)
            expect(rulesOfCreatedRole[1].keyword).to.be.equal(rule2.keyword)
            expect(rulesOfCreatedRole[1].extent).to.be.equal(rule2.extent)
        })

        it("attach rule to role", async function() {
            this.timeout(30000)
            const rule1 = new Rule("*", WILDCARD_BYTES32, Keyword.WILDCARD, 1000)
            const roleName = "attach role test" + getRndInteger(1, 100000).toString()
            const createRoleTx = await wallet.createRoleTx(roleName, wallet.address, [rule1])
            await wallet.deployTx(createRoleTx)

            const rulesOfCreatedRole1 = await wallet.getRulesOfRole(roleName, wallet.address)
            expect(rulesOfCreatedRole1.length).to.be.equal(1)
            expect(rulesOfCreatedRole1[0].action).to.be.equal(rule1.action)
            expect(rulesOfCreatedRole1[0].target).to.be.equal(rule1.target)
            expect(rulesOfCreatedRole1[0].keyword).to.be.equal(rule1.keyword)
            expect(rulesOfCreatedRole1[0].extent).to.be.equal(rule1.extent)

            const rule2 = new Rule("test action", WILDCARD_BYTES32, Keyword.GREATER, 1000)
            const attachRuleToRoleTx = await wallet.attachRuleToRoleTx(roleName, wallet.address, rule2)
            await wallet.deployTx(attachRuleToRoleTx)

            const rulesOfCreatedRole2 = await wallet.getRulesOfRole(roleName, wallet.address)
            expect(rulesOfCreatedRole2.length).to.be.equal(2)
            expect(rulesOfCreatedRole2[1].action).to.be.equal(rule2.action)
            expect(rulesOfCreatedRole2[1].target).to.be.equal(rule2.target)
            expect(rulesOfCreatedRole2[1].keyword).to.be.equal(rule2.keyword)
            expect(rulesOfCreatedRole2[1].extent).to.be.equal(rule2.extent)
        })

        it("remove rule from role", async function() {
            this.timeout(30000)
            const rule1 = new Rule("*", WILDCARD_BYTES32, Keyword.WILDCARD, 1000)
            const rule2 = new Rule("test action", WILDCARD_BYTES32, Keyword.GREATER, 1000)
            const roleName = "remove rule test" + getRndInteger(1, 100000).toString()
            
            const createRoleTx = await wallet.createRoleTx(roleName, wallet.address, [rule1, rule2])
            await wallet.deployTx(createRoleTx)
            
            const rulesOfCreatedRole1 = await wallet.getRulesOfRole(roleName, wallet.address)
            expect(rulesOfCreatedRole1.length).to.be.equal(2)
            
            const removeRuleFromRoleTx = await wallet.removeRuleFromRoleTx(roleName, wallet.address, rule1)
            await wallet.deployTx(removeRuleFromRoleTx)
            const rulesOfCreatedRole2 = await wallet.getRulesOfRole(roleName, wallet.address)
            expect(rulesOfCreatedRole2.length).to.be.equal(1)
            expect(rulesOfCreatedRole2[0].action).to.be.equal(rule2.action)
            expect(rulesOfCreatedRole2[0].target).to.be.equal(rule2.target)
            expect(rulesOfCreatedRole2[0].keyword).to.be.equal(rule2.keyword)
            expect(rulesOfCreatedRole2[0].extent).to.be.equal(rule2.extent)
        })
    })

    describe("user", async function() {
        before(async function() {
            this.timeout(10000)
            userManager = new UserManager()
            await wallet.addModule(userManager)
            await wallet.deploy()
        }) 

        it("create user then fetch the user", async function() {
            this.timeout(10000)
            const userId = "create user test" + getRndInteger(1, 100000).toString()
            const roleName = "create user test" + getRndInteger(1, 100000).toString()
            const userMetadata = new UserMetadata(roleName, AuthType.ECDSA, eoa.address)
            const createUserTx = await wallet.createUserTx(userId, userMetadata)
            await wallet.deployTx(createUserTx)
            
            const user = await wallet.getUser(userId)
            expect(user.role).to.be.equal(userMetadata.role)
            expect(user.authType).to.be.equal(userMetadata.authType)
            expect(user.authMetadata).to.be.equal(userMetadata.authMetadata)
        })

        it("create user using owner eoa then swap token using user eoa", async function() {
            const walletConfig1 = new FunWalletConfig(owner, await owner.getAddress(), HARDHAT_FORK_CHAIN_ID, PREFUND_AMT)
            const wallet1 = new FunWallet(walletConfig1, TEST_API_KEY)
            const swapModule = new TokenSwap()
            await wallet1.addModule(swapModule)
            await wallet1.deploy()

            // the following commented out code snipet is an example of creating token swap tx
            // now we want to create a role to allowlist an user to do token swap for the following params

            // const tokenIn = new Token({ symbol: "eth", chainId: HARDHAT_FORK_CHAIN_ID })
            // const tokenOut = new Token({ address: DAI_ADDR, chainId: HARDHAT_FORK_CHAIN_ID })
            // const createSwapTx = await wallet.modules[TOKEN_SWAP_MODULE_NAME].createSwapTx(tokenIn, tokenOut, AMOUNT, wallet.address, 5, 100)
            // await wallet.deployTx(createSwapTx)

            // create a role for swapModule with rules as
            // - allowlist any kind of actions
            // - for target as swapTargetData, allowlist less than 10000 swap
            // - for target as swapTargetData, allowlist greater than 1000 swap
            // - reject any transactions not matching the above rules
            const tokenIn = new Token({ symbol: "eth", chainId: HARDHAT_FORK_CHAIN_ID })
            const swapTargetData = await wallet1.modules[TOKEN_SWAP_MODULE_NAME].getTargetData(tokenIn)
            const rule1 = new Rule("*", swapTargetData, Keyword.LESS, 10000)
            const rule2 = new Rule("*", swapTargetData, Keyword.GREATER, 1000)
            const roleName = "tokenSwap role" + getRndInteger(1, 100000).toString()

            const createRoleTx = await wallet1.createRoleTx(roleName, swapModule.addr, [rule1, rule2])
            await wallet1.deployTx(createRoleTx)

            // create an user for eoa address within the fun wallet. the user has access to the tokenSwap role
            const userId = "tokenSwap user" + getRndInteger(1, 100000).toString()
            const userMetadata = new UserMetadata(roleName, AuthType.ECDSA, eoa.address)
            const createUserTx = await wallet1.createUserTx(userId, userMetadata)
            await wallet1.deployTx(createUserTx)
            
            const user = await wallet1.getUser(userId)
            expect(user.role).to.be.equal(userMetadata.role)
            expect(user.authType).to.be.equal(userMetadata.authType)
            expect(user.authMetadata).to.be.equal(userMetadata.authMetadata)

            // now use eoa as the user to do tokenSwap in the fun wallet
            // all the transaction sent out by wallet2 will be signed by eoa
            // using owner address here is to ensure the eoa is operating on the right fun wallet as the fun wallet address is 
            // by default calculated based on hash(ownerAddr, index)
            const walletConfig2 = new FunWalletConfig(eoa, await owner.getAddress(), HARDHAT_FORK_CHAIN_ID, PREFUND_AMT)
            const wallet2 = new FunWallet(walletConfig2, TEST_API_KEY)
            wallet2.addModule(swapModule)
            wallet2.deploy()
            
            const tokenOut = new Token({ address: DAI_ADDR, chainId: HARDHAT_FORK_CHAIN_ID })
            const createSwapTx = await wallet2.modules[TOKEN_SWAP_MODULE_NAME].createSwapTx(tokenIn, tokenOut, AMOUNT, wallet2.address, 5, 100)
            await wallet2.deployTx(createSwapTx)
        })

        it("delete the user after create user", async function() {
            this.timeout(10000)
            const userId = "delete user test" + getRndInteger(1, 100000).toString()
            const roleName = "delete user test" + getRndInteger(1, 100000).toString()
            const userMetadata = new UserMetadata(roleName, AuthType.ECDSA, eoa.address)
            const createUserTx = await wallet.createUserTx(userId, userMetadata)
            await wallet.deployTx(createUserTx)
            
            const user = await wallet.getUser(userId)
            expect(user.role).to.be.equal(userMetadata.role)
            expect(user.authType).to.be.equal(userMetadata.authType)
            expect(user.authMetadata).to.be.equal(userMetadata.authMetadata)

            const deleteUserTx = await wallet.deleteUserTx(userId)
            await wallet.deployTx(deleteUserTx)

            const userAfterDelete = await wallet.getUser(userId)
            expect(userAfterDelete.role).to.be.equal("0x0000000000000000000000000000000000000000000000000000000000000000")
            expect(userAfterDelete.authType).to.be.equal(0)
            expect(userAfterDelete.authMetadata).to.be.equal("0x")
        })

        it("update the user after create user", async function() {
            this.timeout(10000)
            const userId = "update user test" + getRndInteger(1, 100000).toString()
            const roleName1 = "update user test" + getRndInteger(1, 100000).toString()
            const userMetadata1 = new UserMetadata(roleName1, AuthType.ECDSA, eoa.address)
            const createUserTx = await wallet.createUserTx(userId, userMetadata1)
            await wallet.deployTx(createUserTx)
            
            const user = await wallet.getUser(userId)
            expect(user.role).to.be.equal(userMetadata1.role)
            expect(user.authType).to.be.equal(userMetadata1.authType)
            expect(user.authMetadata).to.be.equal(userMetadata1.authMetadata)

            const roleName2 = "update user test 1" + getRndInteger(1, 100000).toString()
            const userMetadata2 = new UserMetadata(roleName2, AuthType.ECDSA, eoa.address)
            const updateUserTx = await wallet.updateUserTx(userId, userMetadata2)
            await wallet.deployTx(updateUserTx)

            const userAfterUpdate = await wallet.getUser(userId)
            expect(userAfterUpdate.role).to.be.equal(userMetadata2.role)
            expect(userAfterUpdate.authType).to.be.equal(userMetadata2.authType)
            expect(userAfterUpdate.authMetadata).to.be.equal(userMetadata2.authMetadata)
        })
    })
})