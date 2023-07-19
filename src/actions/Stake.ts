import { Address, parseEther } from "viem"
import { FinishUnstakeParams, RequestUnstakeParams, StakeParams } from "./types"
import { APPROVE_AND_EXEC_CONTRACT_INTERFACE, ERC20_CONTRACT_INTERFACE, TransactionParams, WITHDRAW_QUEUE_ABI } from "../common"
import { Chain } from "../data"
import { Helper, ParameterError, StatusError } from "../errors"
import { ContractInterface } from "../viem/ContractInterface"

const withdrawQueueInterface = new ContractInterface(WITHDRAW_QUEUE_ABI)

export const isRequestUnstakeParams = (input: any) => {
    return input.amounts !== undefined
}
export const isFinishUnstakeParams = (input: any) => {
    return input.recipient !== undefined
}
export const stakeCalldata = async (params: StakeParams): Promise<TransactionParams> => {
    const lidoAddress = getSteth(params.chainId.toString())
    return { to: lidoAddress, value: parseEther(`${params.amount}`), data: "0x" }
}

export const requestUnstakeCalldata = async (params: RequestUnstakeParams): Promise<TransactionParams> => {
    // Approve steth
    const steth = getSteth(params.chainId.toString())
    const withdrawalQueue: Address = getWithdrawalQueue(params.chainId.toString())
    if (!steth || !withdrawalQueue || steth.length === 0 || withdrawalQueue.length === 0) {
        const helper = new Helper("Request Unstake", "Incorrect Chain Id", "Staking available only on Ethereum mainnet and Goerli")
        throw new StatusError("Lido Finance", "", "action.requestUnstake", helper)
    }
    const approveAmount: number = params.amounts.reduce((partialSum, a) => partialSum + a, 0)
    const approveData = ERC20_CONTRACT_INTERFACE.encodeTransactionParams(steth, "approve", [
        withdrawalQueue,
        parseEther(`${approveAmount}`)
    ])

    // Request Withdrawal
    const requestWithdrawalData = withdrawQueueInterface.encodeTransactionParams(withdrawalQueue, "requestWithdrawals", [
        params.amounts.map((amount) => parseEther(`${amount}`)),
        params.recipient
    ])
    const chain = new Chain({ chainId: params.chainId.toString() })
    const approveAndExecAddress = await chain.getAddress("approveAndExecAddress")
    const requestUnstakeData = APPROVE_AND_EXEC_CONTRACT_INTERFACE.encodeTransactionParams(approveAndExecAddress, "approveAndExecute", [
        withdrawalQueue,
        0,
        requestWithdrawalData.data,
        steth,
        approveData.data
    ])
    return { to: approveAndExecAddress, value: 0n, data: requestUnstakeData.data }
}

export const finishUnstakeCalldata = async (params: FinishUnstakeParams): Promise<TransactionParams> => {
    const chain = new Chain({ chainId: params.chainId.toString() })
    const withdrawQueueAddress = getWithdrawalQueue(params.chainId.toString())
    const readyToWithdrawRequestIds = (await getReadyToWithdrawRequests(params)).slice(0, 5)
    if (readyToWithdrawRequestIds.length === 0) {
        const helper = new Helper("Finish Unstake", " ", "No ready to withdraw requests")
        throw new StatusError("Lido Finance", "", "action.finishUnstake", helper)
    }

    // claim batch withdrawal
    const lastCheckpoint = await withdrawQueueInterface.readFromChain(withdrawQueueAddress, "getLastCheckpointIndex", [], chain)
    const hints = await withdrawQueueInterface.readFromChain(
        withdrawQueueAddress,
        "findCheckpointHints",
        [readyToWithdrawRequestIds, 1, lastCheckpoint],
        chain
    )
    const claimBatchWithdrawalTx = withdrawQueueInterface.encodeTransactionParams(withdrawQueueAddress, "claimWithdrawalsTo", [
        readyToWithdrawRequestIds,
        hints,
        params.recipient
    ])
    if (claimBatchWithdrawalTx && claimBatchWithdrawalTx.data && claimBatchWithdrawalTx.to) {
        const data = {
            to: claimBatchWithdrawalTx.to.toString() as Address,
            data: claimBatchWithdrawalTx.data
        }
        return { to: data.to, value: 0n, data: data.data }
    }
    const helper = new Helper("Finish Unstake", " ", "Error in batch claim")
    throw new StatusError("Lido Finance", "", "action.finishUnstake", helper)
}

const getReadyToWithdrawRequests = async (params: FinishUnstakeParams) => {
    // check withdrawal requests
    const withdrawalQueueAddr: Address = getWithdrawalQueue(params.chainId.toString())

    const withdrawalRequests: bigint[] = await withdrawQueueInterface.readFromChain(
        withdrawalQueueAddr,
        "getWithdrawalRequests",
        [params.walletAddress],
        new Chain({ chainId: params.chainId.toString() })
    )
    // get the state of a particular nft
    const withdrawalStatusTx = await withdrawQueueInterface.readFromChain(
        withdrawalQueueAddr,
        "getWithdrawalStatus",
        [withdrawalRequests],
        new Chain({ chainId: params.chainId.toString() })
    )
    const readyToWithdraw: bigint[] = []
    for (let i = 0; i < withdrawalStatusTx.length; i++) {
        if (withdrawalStatusTx[i].isFinalized) {
            readyToWithdraw.push(withdrawalRequests[i])
        }
    }
    const readyToWithdrawRequestIds = [...readyToWithdraw].sort((a, b) => {
        return a > b ? 1 : -1
    })
    return readyToWithdrawRequestIds
}

const getWithdrawalQueue = (chainId: string): Address => {
    switch (parseInt(chainId)) {
        case 1:
            return "0x889edC2eDab5f40e902b864aD4d7AdE8E412F9B1"
        case 5:
            return "0xCF117961421cA9e546cD7f50bC73abCdB3039533"
        case 36865:
            return "0x889edC2eDab5f40e902b864aD4d7AdE8E412F9B1"
        default:
            throw new ParameterError(
                "Invalid Chain Id",
                "getWithdrawalQueue",
                new Helper("getWithdrawalQueue", chainId, "Staking available only on Ethereum mainnet and Goerli"),
                false
            )
    }
}

const getSteth = (chainId: string): Address => {
    switch (parseInt(chainId)) {
        case 1:
            return "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84"
        case 5:
            return "0x1643E812aE58766192Cf7D2Cf9567dF2C37e9B7F"
        case 36865:
            return "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84"
        default:
            throw new ParameterError(
                "Invalid Chain Id",
                "getSteth",
                new Helper("getSteth", chainId, "Staking available only on Ethereum mainnet and Goerli"),
                false
            )
    }
}
