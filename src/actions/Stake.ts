import { Address, Hex, parseEther } from "viem"
import { approveAndExec } from "./ApproveAndExec"
import { ActionData, ActionFunction, ActionResult, FinishUnstakeParams, RequestUnstakeParams, StakeParams } from "./types"
import {
    APPROVE_AND_EXEC_CONTRACT_INTERFACE,
    ERC20_CONTRACT_INTERFACE,
    TransactionData,
    WALLET_CONTRACT_INTERFACE,
    WITHDRAW_QUEUE_ABI
} from "../common"
import { Chain, Token } from "../data"
import { Helper, ParameterError, StatusError } from "../errors"
import { ContractInterface } from "../viem/ContractInterface"

const withdrawQueueInterface = new ContractInterface(WITHDRAW_QUEUE_ABI)

export const stakeCalldata = async (params: StakeParams): Promise<Hex> => {
    const lidoAddress = getLidoAddress(params.chainId.toString())
    return WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPoint", [lidoAddress, parseEther(`${params.amount}`), "0x"])
}

export const requestUnstakeCalldata = async (params: RequestUnstakeParams): Promise<Hex> => {
    // Approve steth
    const steth = getSteth(params.chainId.toString())
    const withdrawalQueue: Address = getWithdrawalQueueAddr(params.chainId.toString())
    if (!steth || !withdrawalQueue || steth.length === 0 || withdrawalQueue.length === 0) {
        const helper = new Helper("Request Unstake", "Incorrect Chain Id", "Staking available only on Ethereum mainnet and Goerli")
        throw new StatusError("Lido Finance", "", "action.requestUnstake", helper)
    }
    const approveAmount: number = params.amounts.reduce((partialSum, a) => partialSum + a, 0)
    const approveData = await ERC20_CONTRACT_INTERFACE.encodeTransactionData(steth, "approve", [withdrawalQueue, approveAmount])

    // Request Withdrawal
    const requestWithdrawalData = withdrawQueueInterface.encodeTransactionData(withdrawalQueue, "requestWithdrawals", [
        params.amounts.map((amount) => parseEther(`${amount}`)),
        params.recipient
    ])
    const chain = new Chain({ chainId: params.chainId.toString() })

    const approveAndExecAddress = await chain.getAddress("approveAndExecAddress")
    const requestUnstakeData = APPROVE_AND_EXEC_CONTRACT_INTERFACE.encodeTransactionData(approveAndExecAddress, "approveAndExecute", [
        withdrawalQueue,
        0,
        requestWithdrawalData.data,
        steth,
        approveData.data
    ])
    return WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPoint", [approveAndExecAddress, 0, requestUnstakeData])
}

export const finishUnstakeCalldata = async (params: FinishUnstakeParams): Promise<Hex> => {
    const chain = new Chain({ chainId: params.chainId.toString() })
    const withdrawQueueAddress = getWithdrawalQueueAddr(params.chainId.toString())
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
    const claimBatchWithdrawalTx = withdrawQueueInterface.encodeTransactionData(withdrawQueueAddress, "claimWithdrawalsTo", [
        readyToWithdrawRequestIds,
        hints,
        params.recipient
    ])
    if (claimBatchWithdrawalTx && claimBatchWithdrawalTx.data && claimBatchWithdrawalTx.to) {
        const data = {
            to: claimBatchWithdrawalTx.to.toString() as Address,
            data: claimBatchWithdrawalTx.data
        }
        return WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPoint", [data.to, 0, data.data])
    }
    const helper = new Helper("Finish Unstake", " ", "Error in batch claim")
    throw new StatusError("Lido Finance", "", "action.finishUnstake", helper)
}

export const _stake = (params: StakeParams): ActionFunction => {
    return async (actionData: ActionData): Promise<ActionResult> => {
        const lidoAddress = getLidoAddress(await actionData.chain.getChainId())
        const data = { to: lidoAddress!, value: parseEther(`${params.amount}`) }

        const errorData = {
            location: "action.stake",
            error: {
                reasonData: {
                    title: "Possible reasons:",
                    reasons: ["Incorrect Chain Id - Staking available only on Ethereum mainnet and Goerli"]
                }
            }
        }
        return { data, errorData }
    }
}

export const _requestUnstake = (params: RequestUnstakeParams): ActionFunction => {
    return async (actionData: ActionData): Promise<ActionResult> => {
        // Approve steth
        const { chain, wallet } = actionData
        const steth: string = getSteth(await chain.getChainId())
        const withdrawalQueue: Address = getWithdrawalQueueAddr(await chain.getChainId())
        if (!steth || !withdrawalQueue || steth.length === 0 || withdrawalQueue.length === 0) {
            const helper = new Helper("Request Unstake", "Incorrect Chain Id", "Staking available only on Ethereum mainnet and Goerli")
            throw new StatusError("Lido Finance", "", "action.requestUnstake", helper)
        }
        const approveAmount: number = params.amounts.reduce((partialSum, a) => partialSum + a, 0)
        const approveData: TransactionData = await Token.approve(steth, withdrawalQueue, approveAmount, { chain: actionData.chain })
        // Request Withdrawal
        const requestWithdrawalData = withdrawQueueInterface.encodeTransactionData(withdrawalQueue, "requestWithdrawals", [
            params.amounts.map((amount) => parseEther(`${amount}`)),
            params.recipient ? params.recipient : await wallet.getAddress()
        ])
        const approveAndExecData = { approve: approveData, exec: requestWithdrawalData }
        return await approveAndExec(approveAndExecData)(actionData)
    }
}

const getReadyToWithdrawRequests = async (params: FinishUnstakeParams) => {
    // check withdrawal requests
    const withdrawalQueueAddr: Address = getWithdrawalQueueAddr(params.chainId.toString())

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

export const _finishUnstake = (params: FinishUnstakeParams): ActionFunction => {
    return async (actionData: ActionData): Promise<ActionResult> => {
        const { chain } = actionData
        const withdrawQueueAddress = getWithdrawalQueueAddr(await chain.getChainId())
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
        const claimBatchWithdrawalTx = withdrawQueueInterface.encodeTransactionData(withdrawQueueAddress, "claimWithdrawalsTo", [
            readyToWithdrawRequestIds,
            hints,
            params.recipient
        ])
        if (claimBatchWithdrawalTx && claimBatchWithdrawalTx.data && claimBatchWithdrawalTx.to) {
            const data = {
                to: claimBatchWithdrawalTx.to.toString() as Address,
                data: claimBatchWithdrawalTx.data
            }

            const txDetails = {
                method: "finishUnstake",
                params: [readyToWithdrawRequestIds, hints, params.recipient],
                contractAddress: claimBatchWithdrawalTx.to,
                chainId: actionData.chain.id
            }

            const reasonData = {
                title: "Possible reasons:",
                reasons: ["Incorrect Chain Id - Staking available only on Ethereum mainnet and Goerli"]
            }

            const errorData = {
                location: "action.unstake.finishUnstake",
                error: {
                    txDetails,
                    reasonData
                }
            }
            return { data, errorData }
        }
        const helper = new Helper("Finish Unstake", " ", "Error in batch claim")
        throw new StatusError("Lido Finance", "", "action.finishUnstake", helper)
    }
}

export const getLidoAddress = (chainId: string): Address => {
    const helper = new Helper("getLidoAddress", chainId, "Staking available only on Ethereum mainnet and Goerli")
    switch (parseInt(chainId)) {
        case 1:
            return "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84"
        case 5:
            return "0x1643E812aE58766192Cf7D2Cf9567dF2C37e9B7F"
        case 36865:
            return "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84"
        default:
            throw new ParameterError("Invalid Chain Id", "getLidoAddress", helper, false)
    }
}

export const getWithdrawalQueueAddr = (chainId: string): Address => {
    const helper = new Helper("getWithdrawalQueueAddr", chainId, "Staking available only on Ethereum mainnet and Goerli")
    switch (parseInt(chainId)) {
        case 1:
            return "0x889edC2eDab5f40e902b864aD4d7AdE8E412F9B1"
        case 5:
            return "0xCF117961421cA9e546cD7f50bC73abCdB3039533"
        case 36865:
            return "0x889edC2eDab5f40e902b864aD4d7AdE8E412F9B1"
        default:
            throw new ParameterError("Invalid Chain Id", "getWithdrawalQueueAddr", helper, false)
    }
}

export const getSteth = (chainId: string): Address => {
    const helper = new Helper("getSteth", chainId, "Staking available only on Ethereum mainnet and Goerli")
    switch (parseInt(chainId)) {
        case 1:
            return "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84"
        case 5:
            return "0x1643E812aE58766192Cf7D2Cf9567dF2C37e9B7F"
        case 36865:
            return "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84"
        default:
            throw new ParameterError("Invalid Chain Id", "getSteth", helper, false)
    }
}
