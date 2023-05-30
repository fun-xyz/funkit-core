import { Auth } from "../auth"
import { verifyFunctionParams, isContract } from "../utils"
import { _swap } from "./Swap"
import { _stake } from "./Stake"
import { _transfer, _approve } from "./Token"
import { EnvOption } from "../config"
import { Chain, UserOp } from "../data"
import { FunWallet } from "../wallet"

const transferExpected = ["to", "amount"]
const genCallExpected = ["to"]
const approveExpected = ["spender", "amount", "token"]
const swapExpected = ["in", "out", "amount"]
const stakeExpected = ["amount"]

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

    async transfer(auth: Auth, input: any, options: EnvOption = globalEnvOption, estimate = false): Promise<ExecutionReceipt | UserOp> {
        verifyFunctionParams("Wallet.transfer", input, transferExpected)
        return await this.execute(auth, _transfer(input), options, estimate)
    }

    async approve(auth: Auth, input: any, options: EnvOption = globalEnvOption, estimate = false): Promise<ExecutionReceipt | UserOp> {
        verifyFunctionParams("Wallet.approve", input, approveExpected)
        return await this.execute(auth, _approve(input), options, estimate)
    }

    async swap(auth: Auth, input: any, options: EnvOption = globalEnvOption, estimate = false): Promise<ExecutionReceipt | UserOp> {
        verifyFunctionParams("Wallet.swap", input, swapExpected)
        return await this.execute(auth, _swap(input), options, estimate)
    }

    async stake(auth: Auth, input: any, options: EnvOption = globalEnvOption, estimate = false): Promise<ExecutionReceipt | UserOp> {
        verifyFunctionParams("Wallet.stake", input, stakeExpected)
        return await this.execute(auth, _stake(input), options, estimate)
    }

    async create(auth: Auth, options: EnvOption = globalEnvOption, estimate = false): Promise<ExecutionReceipt | UserOp> {
        const address = await this.getAddress()
        if (await isContract(address)) {
            throw new Error("Wallet already exists as contract.")
        } else {
            return await this.execRawTx(auth, { to: address, data: "0x" }, options, estimate)
        }
    }

    async execRawTx(auth: Auth, input: any, options: EnvOption = globalEnvOption, estimate = false): Promise<ExecutionReceipt | UserOp> {
        verifyFunctionParams("Wallet.execRawTx", input, genCallExpected)
        return await this.execute(auth, genCall(input), options, estimate)
    }
}

export const genCall = (data: any) => {
    return async () => {
        if (!data.value) {
            data.value = 0
        }
        if (!data.data) {
            data.data = "0x"
        }
        const gasInfo = {}
        return { gasInfo, data, errorData: { location: "action.genCall" } }
    }
}
