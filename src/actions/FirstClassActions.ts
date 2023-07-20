import { Address } from "viem"
import { createSessionKeyTransactionParams } from "./AccessControl"
import { createExecuteBatchTxParams } from "./Execution"
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
        let transactionParams: TransactionParams
        if (oneInchSupported.includes(params.chainId)) {
            transactionParams = await OneInchTransactionParams(params as OneInchSwapParams)
        } else if (uniswapV3Supported.includes(params.chainId)) {
            transactionParams = await uniswapV3SwapTransactionParams(params as UniswapParams)
        } else {
            transactionParams = await uniswapV2SwapTransactionParams(params as UniswapParams)
        }
        return await this.createOperation(auth, userId, transactionParams, txOption)
    }

    async transfer(
        auth: Auth,
        userId: string,
        params: TransferParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        let transactionParams: TransactionParams
        if (isERC721TransferParams(params)) {
            transactionParams = await erc721TransferTransactionParams(params)
        } else if (isERC20TransferParams(params)) {
            transactionParams = await erc20TransferTransactionParams(params)
        } else if (isNativeTransferParams(params)) {
            transactionParams = await ethTransferTransactionParams(params)
        } else {
            const currentLocation = "action.transfer"
            const helperMainMessage = "params were missing or incorrect"
            const helper = new Helper(`${currentLocation} was given these parameters`, params, helperMainMessage)
            throw new MissingParameterError(currentLocation, helper)
        }
        return await this.createOperation(auth, userId, transactionParams, txOptions)
    }

    async tokenApprove(
        auth: Auth,
        userId: string,
        params: ApproveParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        let transactionParams
        if (isERC20ApproveParams(params)) {
            transactionParams = await erc20ApproveTransactionParams(params)
        } else if (isERC721ApproveParams(params)) {
            transactionParams = await erc721ApproveTransactionParams(params)
        } else {
            const currentLocation = "action.tokenApprove"
            const helperMainMessage = "params were missing or incorrect"
            const helper = new Helper(`${currentLocation} was given these parameters`, params, helperMainMessage)
            throw new MissingParameterError(currentLocation, helper)
        }
        return await this.createOperation(auth, userId, transactionParams, txOptions)
    }

    async stake(
        auth: Auth,
        userId: string,
        params: StakeParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const transactionParams = await stakeTransactionParams(params)
        return await this.createOperation(auth, userId, transactionParams, txOptions)
    }

    async unstake(
        auth: Auth,
        userId: string,
        params: RequestUnstakeParams | FinishUnstakeParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        let transactionParams: TransactionParams
        if (isRequestUnstakeParams(params)) {
            transactionParams = await requestUnstakeTransactionParams(params as RequestUnstakeParams)
        } else if (isFinishUnstakeParams(params)) {
            transactionParams = await finishUnstakeTransactionParams(params as FinishUnstakeParams)
        } else {
            const currentLocation = "action.unstake"
            const helperMainMessage = "params were missing or incorrect"
            const helper = new Helper(`${currentLocation} was given these parameters`, params, helperMainMessage)
            throw new MissingParameterError(currentLocation, helper)
        }
        return await this.createOperation(auth, userId, transactionParams, txOptions)
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
        const transactionParams = await createSessionKeyTransactionParams(params)
        return await this.createOperation(auth, userId, transactionParams, txOptions)
    }

    async executeBatch(
        auth: Auth,
        userId: string,
        params: TransactionParams[],
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<Operation> {
        const walletAddress = await this.getAddress(txOptions)
        const txParams = createExecuteBatchTxParams(params, walletAddress)
        return this.createOperation(auth, userId, txParams, txOptions)
    }
}
