import { Address, Hex } from "viem"
import { approveAndExecCalldata } from "./ApproveAndExec"
import { createCalldata, createExecRawTxCalldata } from "./FirstClass"
import { finishUnstakeCalldata, requestUnstakeCalldata, stakeCalldata } from "./Stake"
import { OneInchCalldata, uniswapV2SwapCalldata, uniswapV3SwapCalldata } from "./Swap"
import { erc20ApproveCalldata, erc20TransferCalldata, erc721ApproveCalldata, erc721TransferCalldata, ethTransferCalldata } from "./Token"
import {
    ApproveAndExecParams,
    ApproveERC20Params,
    ApproveERC721Params,
    ERC20TransferParams,
    ERC721TransferParams,
    FinishUnstakeParams,
    NativeTransferParams,
    OneInchSwapParams,
    RequestUnstakeParams,
    StakeParams,
    SwapParam,
    UniswapParams
} from "./types"
import { Auth } from "../auth"
import { TransactionParams } from "../common"
import { EnvOption } from "../config"
import { UserOp } from "../data"

export abstract class FirstClassActions {
    abstract createOperation(
        auth: Auth,
        _: string, //userId - left unused for @Chazzzzzzz to implement
        callData: Hex,
        txOptions: EnvOption
    ): Promise<UserOp>

    abstract getAddress(options: EnvOption): Promise<Address>

    async swap(auth: Auth, userId: string, params: SwapParam, txOption: EnvOption = (globalThis as any).globalEnvOption): Promise<UserOp> {
        const oneInchSupported = [1, 56, 137, 31337, 36864, 42161]
        const uniswapV3Supported = [1, 5, 10, 56, 137, 31337, 36865, 42161]
        let callData
        if (oneInchSupported.includes(params.chainId)) {
            callData = await OneInchCalldata(params as OneInchSwapParams)
        } else if (uniswapV3Supported.includes(params.chainId)) {
            callData = await uniswapV3SwapCalldata(params as UniswapParams)
        } else {
            callData = await uniswapV2SwapCalldata(params as UniswapParams)
        }
        return await this.createOperation(auth, userId, callData, txOption)
    }

    async transferERC721(
        auth: Auth,
        params: ERC721TransferParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<UserOp> {
        const callData = await erc721TransferCalldata(params)
        return await this.createOperation(auth, "", callData, txOptions)
    }

    async transferERC20(
        auth: Auth,
        params: ERC20TransferParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<UserOp> {
        const callData = await erc20TransferCalldata(params)
        return await this.createOperation(auth, "", callData, txOptions)
    }

    async transferEth(
        auth: Auth,
        params: NativeTransferParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<UserOp> {
        const callData = await ethTransferCalldata(params)
        return await this.createOperation(auth, "", callData, txOptions)
    }

    async approveERC20(
        auth: Auth,
        params: ApproveERC20Params,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<UserOp> {
        const callData = await erc20ApproveCalldata(params)
        return await this.createOperation(auth, "", callData, txOptions)
    }

    async approveERC721(
        auth: Auth,
        params: ApproveERC721Params,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<UserOp> {
        const callData = await erc721ApproveCalldata(params)
        return await this.createOperation(auth, "", callData, txOptions)
    }

    async stake(auth: Auth, params: StakeParams, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<UserOp> {
        const callData = await stakeCalldata(params)
        return await this.createOperation(auth, "", callData, txOptions)
    }

    async requestUnstake(
        auth: Auth,
        params: RequestUnstakeParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<UserOp> {
        const callData = await requestUnstakeCalldata(params)
        return await this.createOperation(auth, "", callData, txOptions)
    }

    async finishUnstake(
        auth: Auth,
        params: FinishUnstakeParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<UserOp> {
        const callData = await finishUnstakeCalldata(params)
        return await this.createOperation(auth, "", callData, txOptions)
    }

    async approveAndExec(
        auth: Auth,
        params: ApproveAndExecParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<UserOp> {
        const callData = await approveAndExecCalldata(params)
        return await this.createOperation(auth, "", callData, txOptions)
    }

    async uniswapV3Swap(auth: Auth, params: UniswapParams, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<UserOp> {
        const callData = await uniswapV3SwapCalldata(params)
        return await this.createOperation(auth, "", callData, txOptions)
    }

    async uniswapV2Swap(auth: Auth, params: UniswapParams, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<UserOp> {
        const callData = await uniswapV2SwapCalldata(params)
        return await this.createOperation(auth, "", callData, txOptions)
    }

    async oneinchSwap(auth: Auth, params: OneInchSwapParams, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<UserOp> {
        const callData = await OneInchCalldata(params)
        return await this.createOperation(auth, "", callData, txOptions)
    }

    async create(auth: Auth, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<UserOp> {
        const callData = await createCalldata({ to: await this.getAddress(txOptions) })
        return await this.createOperation(auth, "", callData, txOptions)
    }

    async execRawCalldata(
        auth: Auth,
        params: TransactionParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<UserOp> {
        const callData = await createExecRawTxCalldata(params)
        return await this.createOperation(auth, "", callData, txOptions)
    }
}
