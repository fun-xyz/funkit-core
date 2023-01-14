Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");

const utils_1 = require("ethers/lib/utils");
const BaseAccountAPI_1 = require("./BaseAccountAPI");

const TreasurySRC = require("./abis/Treasury.json")
const srcfile = require("./abis/TreasuryFactory.json")
var _abi = srcfile.abi


/**
 * An implementation of the BaseAccountAPI using the SimpleAccount contract.
 * - contract deployer gets "entrypoint", "owner" addresses and "index" nonce
 * - owner signs requests using normal "Ethereum Signed Message" (ether's signer.signMessage())
 * - nonce method is "nonce()"
 * - execute method is "execFromEntryPoint()"
 */
class SimpleAccountAPI extends BaseAccountAPI_1.BaseAccountAPI {
    constructor(params) {
        var _a;
        super(params);
        this.factoryAddress = params.factoryAddress;
        this.owner = params.owner;


        this.index = (_a = params.index) !== null && _a !== void 0 ? _a : 0;
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
}
exports.TreasuryAPI = SimpleAccountAPI;