Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");

const utils_1 = require("ethers/lib/utils");

const TreasurySRC = require("./abis/Treasury.json")
const srcfile = require("./abis/TreasuryFactory.json")
var _abi = srcfile.abi


Object.defineProperty(exports, "__esModule", { value: true });
const contracts_1 = require("@account-abstraction/contracts");
const utils_2 = require("@account-abstraction/utils");
const calcPreVerificationGas_1 = require("./tools");



/**
 * An implementation of the BaseAccountAPI using the SimpleAccount contract.
 * - contract deployer gets "entrypoint", "owner" addresses and "index" nonce
 * - owner signs requests using normal "Ethereum Signed Message" (ether's signer.signMessage())
 * - nonce method is "nonce()"
 * - execute method is "execFromEntryPoint()"
 */
class SimpleAccountAPI  {
    constructor(params) {
        var _a;
        this.factoryAddress = params.factoryAddress;
        this.owner = params.owner;


        this.index = (_a = params.index) !== null && _a !== void 0 ? _a : 0;

        this.isPhantom = true;
        this.provider = params.provider;
        this.overheads = params.overheads;
        this.entryPointAddress = params.entryPointAddress;
        this.accountAddress = params.accountAddress;
        this.paymasterAPI = params.paymasterAPI;
        // factory "connect" define the contract address. the contract "connect" defines the "from" address.
        this.entryPointView = contracts_1.EntryPoint__factory.connect(params.entryPointAddress, params.provider).connect(ethers_1.ethers.constants.AddressZero);
    

    }
    async _getAccountContract() {
        if (this.accountContract == null) {
            this.accountContract = new ethers_1.Contract(await this.getAccountAddress(), TreasurySRC.abi, this.provider);
        }
        return this.accountContract;
    }
    /**
     * return the value to put into the "initCode" field, if the account is not yet deployed.
     * this value holds the "factory" address, followed by this account's information
     */
    async getAccountInitCode() {
        if (this.factory == null) {
            if (this.factoryAddress != null && this.factoryAddress !== '') {
                this.factory = new ethers_1.Contract(this.factoryAddress, _abi)
            }
            else {
                throw new Error('no factory to get initCode');
            }
        }
    
        return (0, utils_1.hexConcat)([
            this.factoryAddress,
            this.factory.interface.encodeFunctionData('createAccount', [this.entryPointAddress, await this.owner.getAddress(), this.index])
        ]);
    }
    async getNonce() {
        return ethers_1.BigNumber.from(parseInt(Math.random() * 2 ** 30));
    }
    /**
     * encode a method call from entryPoint to our contract
     * @param target
     * @param value
     * @param data
     */
    async encodeExecute(target, value, data) {
        await this._getAccountContract()
        return this.accountContract.interface.encodeFunctionData("execFromEntryPoint", [target, value, data])
    }

    async signUserOpHash(userOpHash) {
        return await this.owner.signMessage((0, utils_1.arrayify)(userOpHash));
    }


    async init() {
        if (await this.provider.getCode(this.entryPointAddress) === '0x') {
            throw new Error(`entryPoint not deployed at ${this.entryPointAddress}`);
        }
        await this.getAccountAddress();
        return this;
    }
    /**
     * check if the contract is already deployed.
     */
    async checkAccountPhantom() {
        if (!this.isPhantom) {
            // already deployed. no need to check anymore.
            return this.isPhantom;
        }
        const senderAddressCode = await this.provider.getCode(this.getAccountAddress());
        if (senderAddressCode.length > 2) {
            // console.log(`SimpleAccount Contract already deployed at ${this.senderAddress}`)
            this.isPhantom = false;
        }
        else {
            // console.log(`SimpleAccount Contract is NOT YET deployed at ${this.senderAddress} - working in "phantom account" mode.`)
        }
        return this.isPhantom;
    }
    /**
     * calculate the account address even before it is deployed
     */
    async getCounterFactualAddress() {
        const initCode = await this.getAccountInitCode();
        // use entryPoint to query account address (factory can provide a helper method to do the same, but
        // this method attempts to be generic
        try {
            await this.entryPointView.callStatic.getSenderAddress(initCode);
        }
        catch (e) {
            return e.errorArgs.sender;
        }
        throw new Error('must handle revert');
    }
    /**
     * return initCode value to into the UserOp.
     * (either deployment code, or empty hex if contract already deployed)
     */
    async getInitCode() {
        if (await this.checkAccountPhantom()) {
            return await this.getAccountInitCode();
        }
        return '0x';
    }
    /**
     * return maximum gas used for verification.
     * NOTE: createUnsignedUserOp will add to this value the cost of creation, if the contract is not yet created.
     */
    async getVerificationGasLimit() {
        return 5000000;
    }
    /**
     * should cover cost of putting calldata on-chain, and some overhead.
     * actual overhead depends on the expected bundle size
     */
    async getPreVerificationGas(userOp) {
        const p = await (0, utils_1.resolveProperties)(userOp);
        return (0, calcPreVerificationGas_1.calcPreVerificationGas)(p, this.overheads);
    }
    /**
     * ABI-encode a user operation. used for calldata cost estimation
     */
    packUserOp(userOp) {
        return (0, utils_2.packUserOp)(userOp, false);
    }
    async encodeUserOpCallDataAndGasLimit(detailsForUserOp) {
        var _a, _b;
        function parseNumber(a) {
            if (a == null || a === '')
                return null;
            return ethers_1.BigNumber.from(a.toString());
        }
        const value = (_a = parseNumber(detailsForUserOp.value)) !== null && _a !== void 0 ? _a : ethers_1.BigNumber.from(0);
        const callData = await this.encodeExecute(detailsForUserOp.target, value, detailsForUserOp.data);
        const callGasLimit = (_b = parseNumber(detailsForUserOp.gasLimit)) !== null && _b !== void 0 ? _b : 1_000_000
        // await this.provider.estimateGas({
        //     from: this.entryPointAddress,
        //     to: this.getAccountAddress(),
        //     data: callData
        // });
        return {
            callData,
            callGasLimit
        };
    }
    /**
     * return userOpHash for signing.
     * This value matches entryPoint.getUserOpHash (calculated off-chain, to avoid a view call)
     * @param userOp userOperation, (signature field ignored)
     */
    async getUserOpHash(userOp) {
        const op = await (0, utils_1.resolveProperties)(userOp);
        const chainId = await this.provider.getNetwork().then(net => net.chainId);
        return (0, utils_2.getUserOpHash)(op, this.entryPointAddress, chainId);
    }
    /**
     * return the account's address.
     * this value is valid even before deploying the contract.
     */
    async getAccountAddress() {
        if (this.senderAddress == null) {
            if (this.accountAddress != null) {
                this.senderAddress = this.accountAddress;
            }
            else {
                this.senderAddress = await this.getCounterFactualAddress();
            }
        }
        return this.senderAddress;
    }
    async estimateCreationGas(initCode) {
        if (initCode == null || initCode === '0x')
            return 0;
        const deployerAddress = initCode.substring(0, 42);
        const deployerCallData = '0x' + initCode.substring(42);
        return await this.provider.estimateGas({ to: deployerAddress, data: deployerCallData });
    }
    /**
     * create a UserOperation, filling all details (except signature)
     * - if account is not yet created, add initCode to deploy it.
     * - if gas or nonce are missing, read them from the chain (note that we can't fill gaslimit before the account is created)
     * @param info
     */
    async createUnsignedUserOp(info) {
        var _a, _b;
        let callData, callGasLimit;
        if (info.calldata) {
            callData = info.data
        } else {
            let out = await this.encodeUserOpCallDataAndGasLimit(info);
            callData = out.callData
            callGasLimit = out.callGasLimit
        }
        let initCode = info.noInit ? "0x" : await this.getInitCode();
        const initGas = await this.estimateCreationGas(initCode);
        const verificationGasLimit = ethers_1.BigNumber.from(await this.getVerificationGasLimit())
            .add(initGas);
        let { maxFeePerGas, maxPriorityFeePerGas } = info;
        if (maxFeePerGas == null || maxPriorityFeePerGas == null) {
            const feeData = await this.provider.getFeeData();
            if (maxFeePerGas == null) {
                maxFeePerGas = (_a = feeData.maxFeePerGas) !== null && _a !== void 0 ? _a : undefined;
            }
            if (maxPriorityFeePerGas == null) {
                maxPriorityFeePerGas = (_b = feeData.maxPriorityFeePerGas) !== null && _b !== void 0 ? _b : undefined;
            }
        }
        const partialUserOp = {
            sender: this.getAccountAddress(),
            nonce: this.getNonce(),
            initCode,
            callData,
            callGasLimit: info.gasLimit ? info.gasLimit : callGasLimit,
            verificationGasLimit,
            maxFeePerGas,
            maxPriorityFeePerGas
        };
        let paymasterAndData;
        if (this.paymasterAPI != null) {
            // fill (partial) preVerificationGas (all except the cost of the generated paymasterAndData)
            const userOpForPm = Object.assign(Object.assign({}, partialUserOp), { preVerificationGas: this.getPreVerificationGas(partialUserOp) });
            paymasterAndData = await this.paymasterAPI.getPaymasterAndData(userOpForPm);
        }
        partialUserOp.paymasterAndData = paymasterAndData !== null && paymasterAndData !== void 0 ? paymasterAndData : '0x';
        return Object.assign(Object.assign({}, partialUserOp), { preVerificationGas: this.getPreVerificationGas(partialUserOp), signature: '' });
    }
    /**
     * Sign the filled userOp.
     * @param userOp the UserOperation to sign (with signature field ignored)
     */
    async signUserOp(userOp) {
        const userOpHash = await this.getUserOpHash(userOp);
        const signature = this.signUserOpHash(userOpHash);
        return Object.assign(Object.assign({}, userOp), { signature });
    }
    /**
     * helper method: create and sign a user operation.
     * @param info transaction details for the userOp
     */
    async createSignedUserOp(info) {
        return await this.signUserOp(await this.createUnsignedUserOp(info));
    }
    /**
     * get the transaction that has this userOpHash mined, or null if not found
     * @param userOpHash returned by sendUserOpToBundler (or by getUserOpHash..)
     * @param timeout stop waiting after this timeout
     * @param interval time to wait between polls.
     * @return the transactionHash this userOp was mined, or null if not found.
     */
    async getUserOpReceipt(userOpHash, timeout = 30000, interval = 5000) {
        const endtime = Date.now() + timeout;
        while (Date.now() < endtime) {
            const events = await this.entryPointView.queryFilter(this.entryPointView.filters.UserOperationEvent(userOpHash));
            if (events.length > 0) {
                return events[0].transactionHash;
            }
            await new Promise(resolve => setTimeout(resolve, interval));
        }
        return null;
    }
}
exports.TreasuryAPI = SimpleAccountAPI;