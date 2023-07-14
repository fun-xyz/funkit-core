import { Address, Hex } from "viem"
import { createCalldata } from "./FirstClass"
import { finishUnstakeCalldata, requestUnstakeCalldata, stakeCalldata } from "./Stake"
import { OneInchCalldata, uniswapV2SwapCalldata, uniswapV3SwapCalldata } from "./Swap"
import { erc20ApproveCalldata, erc20TransferCalldata, erc721ApproveCalldata, erc721TransferCalldata, ethTransferCalldata } from "./Token"
import {
    ApproveERC20Params,
    ApproveERC721Params,
    ApproveParams,
    ERC20TransferParams,
    ERC721TransferParams,
    FinishUnstakeParams,
    NativeTransferParams,
    OneInchSwapParams,
    RequestUnstakeParams,
    StakeParams,
    SwapParam,
    TransferParams,
    UniswapParams
} from "./types"
import { Auth } from "../auth"
import { EnvOption } from "../config"
import { Token, UserOp } from "../data"
import { Helper, MissingParameterError } from "../errors"
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

    isERC721TransferParams(obj: TransferParams): obj is ERC721TransferParams {
        return "tokenId" in obj
    }

    isERC20TransferParams(obj: TransferParams): obj is ERC20TransferParams {
        return "amount" in obj && "token" in obj && !Token.isNative(obj.token)
    }

    isNativeTransferParams(obj: TransferParams): obj is NativeTransferParams {
        return "amount" in obj && (!("token" in obj) || Token.isNative(obj.token))
    }

    async transfer(
        auth: Auth,
        userId: string,
        params: TransferParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<UserOp> {
        let callData
        if (this.isERC721TransferParams(params)) {
            callData = await erc721TransferCalldata(params)
        } else if (this.isERC20TransferParams(params)) {
            callData = await erc20TransferCalldata(params)
        } else if (this.isNativeTransferParams(params)) {
            callData = await ethTransferCalldata(params)
        } else {
            const currentLocation = "action.transfer"
            const helperMainMessage = "params were missing or incorrect"
            const helper = new Helper(`${currentLocation} was given these parameters`, params, helperMainMessage)
            throw new MissingParameterError(currentLocation, helper)
        }
        return await this.createOperation(auth, userId, callData, txOptions)
    }

    isERC20ApproveParams(obj: ApproveParams): obj is ApproveERC20Params {
        return "amount" in obj && "token" in obj
    }

    isERC721ApproveParams(obj: ApproveParams): obj is ApproveERC721Params {
        return "tokenId" in obj && "token" in obj
    }

    async tokenApprove(
        auth: Auth,
        userId: string,
        params: ApproveParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<UserOp> {
        let callData
        if (this.isERC20ApproveParams(params)) {
            callData = await erc20ApproveCalldata(params)
        } else if (this.isERC721ApproveParams(params)) {
            callData = await erc721ApproveCalldata(params)
        } else {
            const currentLocation = "action.tokenApprove"
            const helperMainMessage = "params were missing or incorrect"
            const helper = new Helper(`${currentLocation} was given these parameters`, params, helperMainMessage)
            throw new MissingParameterError(currentLocation, helper)
        }
        return await this.createOperation(auth, userId, callData, txOptions)
    }

    async _stake(auth: Auth, params: StakeParams, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<UserOp> {
        const callData = await stakeCalldata(params)
        return await this.createOperation(auth, "", callData, txOptions)
    }

    async stake(
        auth: Auth,
        userId: string,
        params: StakeParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<UserOp> {
        const callData = await stakeCalldata(params)
        return await this.createOperation(auth, userId, callData, txOptions)
    }

    isRequestUnstakeParams = (input: any) => {
        return input.amounts !== undefined
    }
    isFinishUnstakeParams = (input: any) => {
        return input.recipient !== undefined
    }

    async unstake(
        auth: Auth,
        userId: string,
        params: RequestUnstakeParams | FinishUnstakeParams,
        txOptions: EnvOption = (globalThis as any).globalEnvOption
    ): Promise<UserOp> {
        let callData
        if (this.isRequestUnstakeParams(params)) {
            callData = await requestUnstakeCalldata(params as RequestUnstakeParams)
        } else if (this.isFinishUnstakeParams(params)) {
            callData = await finishUnstakeCalldata(params as FinishUnstakeParams)
        }
        return await this.createOperation(auth, userId, callData, txOptions)
    }

    // async execRawTx(
    //     auth: Auth,
    //     userId: string,
    //     params: TransactionParams,
    //     txOptions: EnvOption = (globalThis as any).globalEnvOption
    // ): Promise<UserOp> {
    //     const callData = await createExecRawTxCalldata(params)
    //     return await this.createOperation(auth, userId, callData, txOptions)
    // }

    // async transferERC721(
    //     auth: Auth,
    //     params: ERC721TransferParams,
    //     txOptions: EnvOption = (globalThis as any).globalEnvOption
    // ): Promise<UserOp> {
    //     const callData = await erc721TransferCalldata(params)
    //     return await this.createOperation(auth, "", callData, txOptions)
    // }

    // async transferERC20(
    //     auth: Auth,
    //     params: ERC20TransferParams,
    //     txOptions: EnvOption = (globalThis as any).globalEnvOption
    // ): Promise<UserOp> {
    //     const callData = await erc20TransferCalldata(params)
    //     return await this.createOperation(auth, "", callData, txOptions)
    // }

    // async transferEth(
    //     auth: Auth,
    //     params: NativeTransferParams,
    //     txOptions: EnvOption = (globalThis as any).globalEnvOption
    // ): Promise<UserOp> {
    //     const callData = await ethTransferCalldata(params)
    //     return await this.createOperation(auth, "", callData, txOptions)
    // }

    // async approveERC20(
    //     auth: Auth,
    //     params: ApproveERC20Params,
    //     txOptions: EnvOption = (globalThis as any).globalEnvOption
    // ): Promise<UserOp> {
    //     const callData = await erc20ApproveCalldata(params)
    //     return await this.createOperation(auth, "", callData, txOptions)
    // }

    // async approveERC721(
    //     auth: Auth,
    //     params: ApproveERC721Params,
    //     txOptions: EnvOption = (globalThis as any).globalEnvOption
    // ): Promise<UserOp> {
    //     const callData = await erc721ApproveCalldata(params)
    //     return await this.createOperation(auth, "", callData, txOptions)
    // }

    // async requestUnstake(
    //     auth: Auth,
    //     params: RequestUnstakeParams,
    //     txOptions: EnvOption = (globalThis as any).globalEnvOption
    // ): Promise<UserOp> {
    //     const callData = await requestUnstakeCalldata(params)
    //     return await this.createOperation(auth, "", callData, txOptions)
    // }

    // async finishUnstake(
    //     auth: Auth,
    //     params: FinishUnstakeParams,
    //     txOptions: EnvOption = (globalThis as any).globalEnvOption
    // ): Promise<UserOp> {
    //     const callData = await finishUnstakeCalldata(params)
    //     return await this.createOperation(auth, "", callData, txOptions)
    // }

    // async approveAndExec(
    //     auth: Auth,
    //     params: ApproveAndExecParams,
    //     txOptions: EnvOption = (globalThis as any).globalEnvOption
    // ): Promise<UserOp> {
    //     const callData = await approveAndExecCalldata(params)
    //     return await this.createOperation(auth, "", callData, txOptions)
    // }

    // async uniswapV3Swap(auth: Auth, params: UniswapParams, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<UserOp> {
    //     const callData = await uniswapV3SwapCalldata(params)
    //     return await this.createOperation(auth, "", callData, txOptions)
    // }

    // async uniswapV2Swap(auth: Auth, params: UniswapParams, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<UserOp> {
    //     const callData = await uniswapV2SwapCalldata(params)
    //     return await this.createOperation(auth, "", callData, txOptions)
    // }

    // async oneinchSwap(auth: Auth, params: OneInchSwapParams, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<UserOp> {
    //     const callData = await OneInchCalldata(params)
    //     return await this.createOperation(auth, "", callData, txOptions)
    // }

    async create(auth: Auth, txOptions: EnvOption = (globalThis as any).globalEnvOption): Promise<UserOp> {
        const callData = await createCalldata({ to: await this.getAddress(txOptions) })
        return await this.createOperation(auth, "", callData, txOptions)
    }

    // async execRawCalldata(
    //     auth: Auth,
    //     params: TransactionParams,
    //     txOptions: EnvOption = (globalThis as any).globalEnvOption
    // ): Promise<UserOp> {
    //     const callData = await createExecRawTxCalldata(params)
    //     return await this.createOperation(auth, "", callData, txOptions)
    // }
}
