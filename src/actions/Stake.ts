import { Address, parseEther } from "viem"
import { approveAndExec } from "./ApproveAndExec"
import { ActionData, ActionFunction, FinishUnstakeParams, FirstClassActionResult, RequestUnstakeParams, StakeParams } from "./types"
import { TransactionData, WITHDRAW_QUEUE_ABI } from "../common"
import { Token } from "../data"
import { Helper, StatusError } from "../errors"
import { ContractInterface } from "../viem/ContractInterface"

const withdrawQueueInterface = new ContractInterface(WITHDRAW_QUEUE_ABI)

export const _stake = (params: StakeParams): ActionFunction => {
    return async (actionData: ActionData): Promise<FirstClassActionResult> => {
        const lidoAddress = getLidoAddress(await actionData.chain.getChainId())
        const data = { to: lidoAddress!, data: "0x", value: `${parseEther(params.amount.toString())}` }

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
    return async (actionData: ActionData): Promise<FirstClassActionResult> => {
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

const getReadyToWithdrawRequests = async (actionData: ActionData) => {
    const { chain, wallet } = actionData
    // check withdrawal requests
    const withdrawalQueueAddr: Address = getWithdrawalQueueAddr(await chain.getChainId())

    const withdrawalRequests: bigint[] = await withdrawQueueInterface.readFromChain(
        withdrawalQueueAddr,
        "getWithdrawalRequests",
        [await wallet.getAddress()],
        chain
    )
    // get the state of a particular nft
    const withdrawalStatusTx = await withdrawQueueInterface.readFromChain(
        withdrawalQueueAddr,
        "getWithdrawalStatus",
        [withdrawalRequests],
        chain
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
    return async (actionData: ActionData): Promise<FirstClassActionResult> => {
        const { chain } = actionData
        const withdrawQueueAddress = getWithdrawalQueueAddr(await chain.getChainId())
        const readyToWithdrawRequestIds = await getReadyToWithdrawRequests(actionData)
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
    switch (parseInt(chainId)) {
        case 1:
            return "0x2170Ed0880ac9A755fd29B2688956BD959F933F8"
        case 5:
            return "0x1643E812aE58766192Cf7D2Cf9567dF2C37e9B7F"
        default:
            return "0x"
    }
}

export const getWithdrawalQueueAddr = (chainId: string): Address => {
    switch (parseInt(chainId)) {
        case 1:
            return "0x889edC2eDab5f40e902b864aD4d7AdE8E412F9B1"
        case 5:
            return "0xCF117961421cA9e546cD7f50bC73abCdB3039533"
        default:
            return "0x"
    }
}

export const getSteth = (chainId: string): Address => {
    switch (parseInt(chainId)) {
        case 1:
            return "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84"
        case 5:
            return "0x1643E812aE58766192Cf7D2Cf9567dF2C37e9B7F"
        default:
            return "0x"
    }
}
