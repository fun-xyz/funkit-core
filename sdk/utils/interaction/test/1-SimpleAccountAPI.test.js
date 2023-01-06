"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var contracts_1 = require("@account-abstraction/contracts");
var ethers_1 = require("ethers");
var utils_1 = require("ethers/lib/utils");
var chai_1 = require("chai");
var withArgs_1 = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
var hardhat_1 = require("hardhat");
var src_1 = require("../src");
var types_1 = require("@account-abstraction/utils/dist/src/types");
var DeterministicDeployer_1 = require("../src/DeterministicDeployer");
var utils_2 = require("@account-abstraction/utils");
var provider = hardhat_1.ethers.provider;
var signer = provider.getSigner();
describe('SimpleAccountAPI', function () {
    var owner;
    var api;
    var entryPoint;
    var beneficiary;
    var recipient;
    var accountAddress;
    var accountDeployed = false;
    before('init', function () { return __awaiter(void 0, void 0, void 0, function () {
        var factoryAddress;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, new contracts_1.EntryPoint__factory(signer).deploy()];
                case 1:
                    entryPoint = _a.sent();
                    return [4 /*yield*/, signer.getAddress()];
                case 2:
                    beneficiary = _a.sent();
                    return [4 /*yield*/, new types_1.SampleRecipient__factory(signer).deploy()];
                case 3:
                    recipient = _a.sent();
                    owner = ethers_1.Wallet.createRandom();
                    return [4 /*yield*/, DeterministicDeployer_1.DeterministicDeployer.deploy(contracts_1.SimpleAccountDeployer__factory.bytecode)];
                case 4:
                    factoryAddress = _a.sent();
                    api = new src_1.SimpleAccountAPI({
                        provider: provider,
                        entryPointAddress: entryPoint.address,
                        owner: owner,
                        factoryAddress: factoryAddress
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    it('#getUserOpHash should match entryPoint.getUserOpHash', function () {
        return __awaiter(this, void 0, void 0, function () {
            var userOp, hash, epHash;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        userOp = {
                            sender: '0x'.padEnd(42, '1'),
                            nonce: 2,
                            initCode: '0x3333',
                            callData: '0x4444',
                            callGasLimit: 5,
                            verificationGasLimit: 6,
                            preVerificationGas: 7,
                            maxFeePerGas: 8,
                            maxPriorityFeePerGas: 9,
                            paymasterAndData: '0xaaaaaa',
                            signature: '0xbbbb'
                        };
                        return [4 /*yield*/, api.getUserOpHash(userOp)];
                    case 1:
                        hash = _a.sent();
                        return [4 /*yield*/, entryPoint.getUserOpHash(userOp)];
                    case 2:
                        epHash = _a.sent();
                        (0, chai_1.expect)(hash).to.equal(epHash);
                        return [2 /*return*/];
                }
            });
        });
    });
    it('should deploy to counterfactual address', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, op, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, api.getAccountAddress()];
                case 1:
                    accountAddress = _c.sent();
                    _a = chai_1.expect;
                    return [4 /*yield*/, provider.getCode(accountAddress).then(function (code) { return code.length; })];
                case 2:
                    _a.apply(void 0, [_c.sent()]).to.equal(2);
                    return [4 /*yield*/, signer.sendTransaction({
                            to: accountAddress,
                            value: (0, utils_1.parseEther)('0.1')
                        })];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, api.createSignedUserOp({
                            target: recipient.address,
                            data: recipient.interface.encodeFunctionData('something', ['hello'])
                        })];
                case 4:
                    op = _c.sent();
                    return [4 /*yield*/, (0, chai_1.expect)(entryPoint.handleOps([op], beneficiary)).to.emit(recipient, 'Sender')
                            .withArgs(withArgs_1.anyValue, accountAddress, 'hello')];
                case 5:
                    _c.sent();
                    _b = chai_1.expect;
                    return [4 /*yield*/, provider.getCode(accountAddress).then(function (code) { return code.length; })];
                case 6:
                    _b.apply(void 0, [_c.sent()]).to.greaterThan(1000);
                    accountDeployed = true;
                    return [2 /*return*/];
            }
        });
    }); });
    context('#rethrowError', function () {
        var userOp;
        before(function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, api.createUnsignedUserOp({
                            target: hardhat_1.ethers.constants.AddressZero,
                            data: '0x'
                        })
                        // expect FailedOp "invalid signature length"
                    ];
                    case 1:
                        userOp = _a.sent();
                        // expect FailedOp "invalid signature length"
                        userOp.signature = '0x11';
                        return [2 /*return*/];
                }
            });
        }); });
        it('should parse FailedOp error', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, chai_1.expect)(entryPoint.handleOps([userOp], beneficiary)["catch"](utils_2.rethrowError))
                            .to.revertedWith('FailedOp: ECDSA: invalid signature length')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should parse Error(message) error', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, chai_1.expect)(entryPoint.addStake(0)).to.revertedWith('must specify unstake delay')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should parse revert with no description', function () { return __awaiter(void 0, void 0, void 0, function () {
            var wrongContract;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        wrongContract = entryPoint.attach(recipient.address);
                        return [4 /*yield*/, (0, chai_1.expect)(wrongContract.addStake(0)).to.revertedWithoutReason()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    it('should use account API after creation without a factory', function () {
        return __awaiter(this, void 0, void 0, function () {
            var api1, op1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!accountDeployed) {
                            this.skip();
                        }
                        api1 = new src_1.SimpleAccountAPI({
                            provider: provider,
                            entryPointAddress: entryPoint.address,
                            accountAddress: accountAddress,
                            owner: owner
                        });
                        return [4 /*yield*/, api1.createSignedUserOp({
                                target: recipient.address,
                                data: recipient.interface.encodeFunctionData('something', ['world'])
                            })];
                    case 1:
                        op1 = _a.sent();
                        return [4 /*yield*/, (0, chai_1.expect)(entryPoint.handleOps([op1], beneficiary)).to.emit(recipient, 'Sender')
                                .withArgs(withArgs_1.anyValue, accountAddress, 'world')];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
});
