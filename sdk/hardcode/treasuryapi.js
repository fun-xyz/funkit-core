Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const contracts_1 = require("@account-abstraction/contracts");
const utils_1 = require("ethers/lib/utils");
const BaseAccountAPI_1 = require("./BaseAccountAPI");
const { TreasuryFactory__factory } = require("./treasuryfactory")
const TreasurySRC = require("./../../web3/build/contracts/Treasury.json")
const Web3 = require('web3')
const web3 = new Web3();
/**c
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
                this.factory = TreasuryFactory__factory.connect(this.factoryAddress, this.provider);
            }
            else {
                throw new Error('no factory to get initCode');
            }
        }
        return (0, utils_1.hexConcat)([
            this.factory.address,
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
        return web3.eth.abi.encodeFunctionCall({
            "inputs": [
                {
                    "internalType": "address",
                    "name": "addr",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "value",
                    "type": "uint256"
                },
                {
                    "internalType": "bytes",
                    "name": "data",
                    "type": "bytes"
                }
            ],
            "name": "callOp",
            "outputs": [
                {
                    "internalType": "bytes",
                    "name": "",
                    "type": "bytes"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
        }, [target, value, data])
    }

    async signUserOpHash(userOpHash) {
        return await this.owner.signMessage((0, utils_1.arrayify)(userOpHash));
    }
}
exports.TreasuryAPI = SimpleAccountAPI;