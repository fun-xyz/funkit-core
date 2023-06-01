import { BigNumber, Transaction } from "ethers"
import { FinishUnstakeParams, RequestUnstakeParams, StakeParams, _finishUnstake, _requestUnstake, _stake } from "./Stake"
import { SwapParams, _swap } from "./Swap"
import { ApproveParams, TransferParams, _approve, _transfer } from "./Token"
import { Auth } from "../auth"
import { EnvOption } from "../config"
import { Chain, UserOp, getChainFromData } from "../data"
import { Helper, ParameterFormatError } from "../errors"
import { isContract } from "../utils"
import { FunWallet } from "../wallet"

export interface ActionData {
    wallet: FunWallet
    chain: Chain
    options: EnvOption
}

export interface ExecutionReceipt {
    opHash: string
    txid?: string
    gasUsed: number
    gasUSD: number
}

export abstract class FirstClassActions {
    abstract execute(auth: Auth, transactionFunc: Function, txOptions: EnvOption, estimate: boolean): Promise<ExecutionReceipt | UserOp>
    abstract getAddress(options?: EnvOption): Promise<string>

    async transfer(
        auth: Auth,
        input: TransferParams,
        options: EnvOption = (globalThis as any).globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp> {
        return await this.execute(auth, _transfer(input), options, estimate)
    }

    async approve(
        auth: Auth,
        input: ApproveParams,
        options: EnvOption = (globalThis as any).globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp> {
        return await this.execute(auth, _approve(input), options, estimate)
    }

    async swap(
        auth: Auth,
        input: SwapParams,
        options: EnvOption = (globalThis as any).globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp> {
        return await this.execute(auth, _swap(input), options, estimate)
    }

    async stake(
        auth: Auth,
        input: StakeParams,
        options: EnvOption = (globalThis as any).globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp> {
        return await this.execute(auth, _stake(input), options, estimate)
    }

    async unstake(
        auth: Auth,
        input: RequestUnstakeParams | FinishUnstakeParams,
        options: EnvOption = globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp> {
        const isRequestUnstakeParams = (input: any) => {
            return input.amounts !== undefined
        }
        const isFinishUnstakeParams = (input: any) => {
            return input.recipient !== undefined
        }
        if (isRequestUnstakeParams(input)) {
            return await this.execute(auth, _requestUnstake(input as RequestUnstakeParams), options, estimate)
        } else if (isFinishUnstakeParams(input)) {
            return await this.execute(auth, _finishUnstake(input as FinishUnstakeParams), options, estimate)
        }
        const helper = new Helper("Invalid parameters", input, "Must be of type RequestUnstakeParams or FinishUnstakeParams")
        throw new ParameterFormatError("FirstClass.unstake", helper)
    }

    async create(
        auth: Auth,
        options: EnvOption = (globalThis as any).globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp> {
        const address = await this.getAddress()
        if (await isContract(address)) {
            throw new Error("Wallet already exists as contract.")
        } else {
            const chain = await getChainFromData(options.chain)
            return await this.execRawTx(
                auth,
                { to: address, data: "0x", nonce: 0, value: BigNumber.from(0), chainId: Number(chain.id!), gasLimit: BigNumber.from(0) },
                options,
                estimate
            )
        }
    }

    async execRawTx(
        auth: Auth,
        input: Transaction,
        options: EnvOption = (globalThis as any).globalEnvOption,
        estimate = false
    ): Promise<ExecutionReceipt | UserOp> {
        return await this.execute(auth, genCall(input), options, estimate)
    }
}

export const genCall = (data: Transaction) => {
    return async () => {
        if (!data.value) {
            data.value = BigNumber.from(0)
        }
        if (!data.data) {
            data.data = "0x"
        }
        const gasInfo = {}
        return { gasInfo, data, errorData: { location: "action.genCall" } }
    }
}
