import { resolveProperties } from "ethers/lib/utils";
import { JsonRpcProvider } from "@ethersproject/providers";
import { deepHexlify } from "../utils/data";
import { Helper, NoServerConnectionError } from "../errors";
import { BigNumber } from "ethers";
import { validateChainId, sendUserOpToBundler, estimateUserOpGas, getChainId } from "../apis";
import { UserOperation } from "../data/UserOp";
const LOCAL_FORK_CHAIN_ID = 31337

export interface EstimateUserOpGasResult {
    callGasLimit: BigNumber
    verificationGasLimit: BigNumber
    preVerificationGas: BigNumber
}

export class Bundler {
    chainId: string
    bundlerUrl: string
    entryPointAddress: string
    userOpJsonRpcProvider?: JsonRpcProvider

    constructor(chainId: string, bundlerUrl: string, entryPointAddress: string) {
        this.chainId = chainId;
        this.bundlerUrl = bundlerUrl;
        this.entryPointAddress = entryPointAddress;
        this.userOpJsonRpcProvider = Number(chainId) == LOCAL_FORK_CHAIN_ID ?
            new JsonRpcProvider(this.bundlerUrl) : undefined;
    }
    async validateChainId() {
        // validate chainId is in sync with expected chainid
        let response;
        try {
            response = await validateChainId(this.chainId, this.userOpJsonRpcProvider);
        } catch (e) {
            console.log(e)
            const helper = new Helper("Chain ID", this.chainId, "Cannot connect to bundler.");
            throw new NoServerConnectionError("Chain.loadBundler", "Bundler", helper, true);
        }

        if (Number(response) != Number(this.chainId)) {
            throw new Error(`Bundler chainId ${response} does not match expected chainId ${this.chainId}`);
        }
    }

    async sendUserOpToBundler(userOp: UserOperation): Promise<string> {
        const hexifiedUserOp = deepHexlify(await resolveProperties(userOp));
        const response = await sendUserOpToBundler(hexifiedUserOp, this.entryPointAddress, this.chainId, this.userOpJsonRpcProvider);
        return response;
    }

    async estimateUserOpGas(userOp: UserOperation): Promise<EstimateUserOpGasResult> {
        const hexifiedUserOp = deepHexlify(await resolveProperties(userOp));
        return await estimateUserOpGas(hexifiedUserOp, this.entryPointAddress, this.chainId, this.userOpJsonRpcProvider);
    }

    static async getChainId(bundlerUrl: string): Promise<string> {
        return await getChainId(bundlerUrl)
    }
}