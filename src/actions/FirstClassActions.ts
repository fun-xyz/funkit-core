import { Address } from "viem"
import { createSessionKeyTransactionParams } from "./AccessControl"
import {
    finishUnstakeTransactionParams,
    isFinishUnstakeParams,
    isRequestUnstakeParams,
    requestUnstakeTransactionParams,
    stakeTransactionParams
} from "./Stake"
import { OneInchTransactionParams, uniswapV2SwapTransactionParams, uniswapV3SwapTransactionParams } from "./Swap"
import {
    erc20ApproveTransactionParams,
    erc20TransferTransactionParams,
    erc721ApproveTransactionParams,
    erc721TransferTransactionParams,
    ethTransferTransactionParams,
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
export abstract class FirstClassActions {
    abstract createOperation(auth: Auth, userId: string, transactionParams: TransactionParams, txOptions: EnvOption): Promise<Operation>

    abstract getAddress(options: EnvOption): Promise<Address>

    async swap(
        auth: Auth,
        userId: string,
        params: SwapParam,
        txOption: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const oneInchSupported = [1, 56, 137, 31337, 36864, 42161]
        const uniswapV3Supported = [1, 5, 10, 56, 137, 31337, 36865, 42161]
        let callData: TransactionParams
        if (oneInchSupported.includes(params.chainId)) {
            callData = await OneInchTransactionParams(params as OneInchSwapParams)
        } else if (uniswapV3Supported.includes(params.chainId)) {
            callData = await uniswapV3SwapTransactionParams(params as UniswapParams)
        } else {
            callData = await uniswapV2SwapTransactionParams(params as UniswapParams)
        }
        return await this.createOperation(auth, userId, callData, txOption)
    }

    async transfer(
        auth: Auth,
        userId: string,
        params: TransferParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        let callData: TransactionParams
        if (isERC721TransferParams(params)) {
            callData = await erc721TransferTransactionParams(params)
        } else if (isERC20TransferParams(params)) {
            callData = await erc20TransferTransactionParams(params)
        } else if (isNativeTransferParams(params)) {
            callData = await ethTransferTransactionParams(params)
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
            callData = await erc20ApproveTransactionParams(params)
        } else if (isERC721ApproveParams(params)) {
            callData = await erc721ApproveTransactionParams(params)
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
        const callData = await stakeTransactionParams(params)
        return await this.createOperation(auth, userId, callData, txOptions)
    }

    async unstake(
        auth: Auth,
        userId: string,
        params: RequestUnstakeParams | FinishUnstakeParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        let callData: TransactionParams
        if (isRequestUnstakeParams(params)) {
            callData = await requestUnstakeTransactionParams(params as RequestUnstakeParams)
        } else if (isFinishUnstakeParams(params)) {
            callData = await finishUnstakeTransactionParams(params as FinishUnstakeParams)
        } else {
            const currentLocation = "action.unstake"
            const helperMainMessage = "params were missing or incorrect"
            const helper = new Helper(`${currentLocation} was given these parameters`, params, helperMainMessage)
            throw new MissingParameterError(currentLocation, helper)
        }
        return await this.createOperation(auth, userId, callData, txOptions)
    }

    async execRawTx(
        auth: Auth,
        userId: string,
        params: TransactionParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        return await this.createOperation(auth, userId, params, txOptions)
    }

    async createSessionKey(
        auth: Auth,
        userId: string,
        params: SessionKeyParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const callData = await createSessionKeyTransactionParams(params)
        return await this.createOperation(auth, userId, callData, txOptions)
    }
}
