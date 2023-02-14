const CryptoJS = require("crypto-js")
const fetch = require("node-fetch")

Object.defineProperty(exports, "__esModule", { value: true });
exports.calcPreVerificationGas = exports.DefaultGasOverheads = void 0;
const utils_1 = require("@account-abstraction/utils");
const utils_2 = require("ethers/lib/utils");

exports.DefaultGasOverheads = {
    fixed: 21000,
    perUserOp: 18300,
    perUserOpWord: 4,
    zeroByte: 4,
    nonZeroByte: 16,
    bundleSize: 1,
    sigSize: 65
};
function encode(typevalues, forSignature) {
    const types = typevalues.map(typevalue => typevalue.type === 'bytes' && forSignature ? 'bytes32' : typevalue.type);
    const values = typevalues.map((typevalue) => typevalue.type === 'bytes' && forSignature ? (0, utils_1.keccak256)(typevalue.val) : typevalue.val);
    return utils_2.defaultAbiCoder.encode(types, values);
}
/**
 * calculate the preVerificationGas of the given UserOperation
 * preVerificationGas (by definition) is the cost overhead that can't be calculated on-chain.
 * it is based on parameters that are defined by the Ethereum protocol for external transactions.
 * @param userOp filled userOp to calculate. The only possible missing fields can be the signature and preVerificationGas itself
 * @param overheads gas overheads to use, to override the default values
 */
function calcPreVerificationGas(userOp, overheads) {
    const ov = Object.assign(Object.assign({}, exports.DefaultGasOverheads), (overheads !== null && overheads !== void 0 ? overheads : {}));
    const p = Object.assign({
        // dummy values, in case the UserOp is incomplete.
        preVerificationGas: 21000, signature: (0, utils_2.hexlify)(Buffer.alloc(ov.sigSize, 1))
    }, userOp);
    const packed = (0, utils_2.arrayify)(packUserOp(p, false));
    const callDataCost = packed.map(x => x === 0 ? ov.zeroByte : ov.nonZeroByte).reduce((sum, x) => sum + x);
    const ret = Math.round(callDataCost +
        ov.fixed / ov.bundleSize +
        ov.perUserOp +
        ov.perUserOpWord * packed.length);
    return ret;
}
const generateSha256 = (action) => {
    return CryptoJS.SHA256(JSON.stringify(action)).toString(CryptoJS.enc.Hex)
}

async function getPromiseFromOp(op) {
    const out = {}
    await Promise.all(Object.keys(op).map(async (key) => {
        out[key] = await op[key]
    }))
    return out
}

const sendRequest = async (uri, method, apiKey, body) => {
    try {
        return await fetch(uri, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': apiKey
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            body: JSON.stringify(body)
        }).then(r => r.json())
    } catch (e) {
        console.log(e)
    }
}
const UserOpType = {
    components: [
        { internalType: 'address', name: 'sender', type: 'address' },
        { internalType: 'uint256', name: 'nonce', type: 'uint256' },
        { internalType: 'bytes', name: 'initCode', type: 'bytes' },
        { internalType: 'bytes', name: 'callData', type: 'bytes' },
        { internalType: 'uint256', name: 'callGasLimit', type: 'uint256' },
        {
            internalType: 'uint256',
            name: 'verificationGasLimit',
            type: 'uint256'
        },
        {
            internalType: 'uint256',
            name: 'preVerificationGas',
            type: 'uint256'
        },
        { internalType: 'uint256', name: 'maxFeePerGas', type: 'uint256' },
        {
            internalType: 'uint256',
            name: 'maxPriorityFeePerGas',
            type: 'uint256'
        },
        { internalType: 'bytes', name: 'paymasterAndData', type: 'bytes' },
        { internalType: 'bytes', name: 'signature', type: 'bytes' }
    ],
    internalType: 'struct UserOperation',
    name: 'userOp',
    type: 'tuple'
}

function packUserOp(op, forSignature = true) {
    if (forSignature) {
        // lighter signature scheme (must match UserOperation#pack): do encode a zero-length signature, but strip afterwards the appended zero-length value
        const userOpType = {
            components: [
                {
                    type: 'address',
                    name: 'sender'
                },
                {
                    type: 'uint256',
                    name: 'nonce'
                },
                {
                    type: 'bytes',
                    name: 'initCode'
                },
                {
                    type: 'bytes',
                    name: 'callData'
                },
                {
                    type: 'uint256',
                    name: 'callGasLimit'
                },
                {
                    type: 'uint256',
                    name: 'verificationGasLimit'
                },
                {
                    type: 'uint256',
                    name: 'preVerificationGas'
                },
                {
                    type: 'uint256',
                    name: 'maxFeePerGas'
                },
                {
                    type: 'uint256',
                    name: 'maxPriorityFeePerGas'
                },
                {
                    type: 'bytes',
                    name: 'paymasterAndData'
                },
                {
                    type: 'bytes',
                    name: 'signature'
                }
            ],
            name: 'userOp',
            type: 'tuple'
        };
        // console.log('hard-coded userOpType', userOpType)
        // console.log('from ABI userOpType', UserOpType)
        let encoded = utils_1.defaultAbiCoder.encode([userOpType], [Object.assign(Object.assign({}, op), { signature: '0x' })]);
        // remove leading word (total length) and trailing word (zero-length signature)
        encoded = '0x' + encoded.slice(66, encoded.length - 64);
        return encoded;
    }
    const typevalues = UserOpType.components.map((c) => ({
        type: c.type,
        val: op[c.name]
    }));
    return encode(typevalues, forSignature);
}




module.exports = {
    generateSha256,
    calcPreVerificationGas,
    getPromiseFromOp,
    sendRequest
}