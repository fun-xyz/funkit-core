import { Address, Hex } from "viem"
import { createSessionKeyCalldata } from "./AccessControl"
import { finishUnstakeCalldata, isFinishUnstakeParams, isRequestUnstakeParams, requestUnstakeCalldata, stakeCalldata } from "./Stake"
import { OneInchCalldata, uniswapV2SwapCalldata, uniswapV3SwapCalldata } from "./Swap"
import {
    erc20ApproveCalldata,
    erc20TransferCalldata,
    erc721ApproveCalldata,
    erc721TransferCalldata,
    ethTransferCalldata,
    isERC20ApproveParams,
    isERC20TransferParams,
    isERC721ApproveParams,
    isERC721TransferParams,
    isNativeTransferParams
} from "./Token"
import {
    ApproveParams,
    FinishUnstakeParams,
    OneInchSwapParams,
    RequestUnstakeParams,
    SessionKeyParams,
    StakeParams,
    SwapParam,
    TransferParams,
    UniswapParams
} from "./types"
import { Auth } from "../auth"
import { TransactionParams } from "../common"
import { EnvOption } from "../config"
import { Operation } from "../data"
import { Helper, MissingParameterError } from "../errors"
import { FunWallet } from "../wallet"
export abstract class FirstClassActions {
    abstract createOperation(auth: Auth, userId: string, callData: Hex, txOptions: EnvOption): Promise<Operation>

    abstract getAddress(options: EnvOption): Promise<Address>

    async swap(
        auth: Auth,
        userId: string,
        params: SwapParam,
        txOption: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const oneInchSupported = [1, 56, 137, 31337, 36864, 42161]
        const uniswapV3Supported = [1, 5, 10, 56, 137, 31337, 36865, 42161]
        let callData
        if (oneInchSupported.includes(params.chainId)) {
            callData = await OneInchCalldata(auth, userId, params as OneInchSwapParams, txOption)
        } else if (uniswapV3Supported.includes(params.chainId)) {
            callData = await uniswapV3SwapCalldata(auth, userId, params as UniswapParams, txOption)
        } else {
            callData = await uniswapV2SwapCalldata(auth, userId, params as UniswapParams, txOption)
        }
        return await this.createOperation(auth, userId, callData, txOption)
    }

    async transfer(
        auth: Auth,
        userId: string,
        params: TransferParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        let callData
        if (isERC721TransferParams(params)) {
            callData = await erc721TransferCalldata(auth, userId, params, txOptions)
        } else if (isERC20TransferParams(params)) {
            callData = await erc20TransferCalldata(auth, userId, params, txOptions)
        } else if (isNativeTransferParams(params)) {
            callData = await ethTransferCalldata(auth, userId, params, txOptions)
        } else {
            const currentLocation = "action.transfer"
            const helperMainMessage = "params were missing or incorrect"
            const helper = new Helper(`${currentLocation} was given these parameters`, params, helperMainMessage)
            throw new MissingParameterError(currentLocation, helper)
        }
        return await this.createOperation(auth, userId, callData, txOptions)
    }

    async tokenApprove(
        auth: Auth,
        userId: string,
        params: ApproveParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        let callData
        if (isERC20ApproveParams(params)) {
            callData = await erc20ApproveCalldata(auth, userId, params, txOptions)
        } else if (isERC721ApproveParams(params)) {
            callData = await erc721ApproveCalldata(auth, userId, params, txOptions)
        } else {
            const currentLocation = "action.tokenApprove"
            const helperMainMessage = "params were missing or incorrect"
            const helper = new Helper(`${currentLocation} was given these parameters`, params, helperMainMessage)
            throw new MissingParameterError(currentLocation, helper)
        }
        return await this.createOperation(auth, userId, callData, txOptions)
    }

    async stake(
        auth: Auth,
        userId: string,
        params: StakeParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const callData = await stakeCalldata(auth, userId, params, txOptions)
        return await this.createOperation(auth, userId, callData, txOptions)
    }

    async unstake(
        auth: Auth,
        userId: string,
        params: RequestUnstakeParams | FinishUnstakeParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        let callData
        if (isRequestUnstakeParams(params)) {
            callData = await requestUnstakeCalldata(auth, userId, params as RequestUnstakeParams, txOptions)
        } else if (isFinishUnstakeParams(params)) {
            callData = await finishUnstakeCalldata(auth, userId, params as FinishUnstakeParams, txOptions)
        }
        return await this.createOperation(auth, userId, callData, txOptions)
    }

    async execRawTx(
        auth: Auth,
        userId: string,
        params: TransactionParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const callData = await FunWallet.execFromEntryPoint(auth, userId, params, txOptions)
        return await this.createOperation(auth, userId, callData, txOptions)
    }

    async createSessionKey(
        auth: Auth,
        userId: string,
        params: SessionKeyParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const callData = await createSessionKeyCalldata(auth, userId, params, txOptions)
        return await this.createOperation(auth, userId, callData, txOptions)
    }
}
