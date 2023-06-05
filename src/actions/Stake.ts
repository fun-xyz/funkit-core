import { BigNumber, ethers } from "ethers"
import { Interface, parseEther } from "ethers/lib/utils"
import { approveAndExec } from "./ApproveAndExec"
import { ActionData, ActionFunction, FinishUnstakeParams, FirstClassActionResult, RequestUnstakeParams, StakeParams } from "./types"
import { TransactionData, WITHDRAW_QUEUE_ABI } from "../common"
import { Token } from "../data"
import { Helper, StatusError } from "../errors"

const withdrawQueueInterface = new Interface(WITHDRAW_QUEUE_ABI)

export const _stake = (params: StakeParams): ActionFunction => {
    return async (actionData: ActionData): Promise<FirstClassActionResult> => {
        const lidoAddress = getLidoAddress(actionData.chain.chainId!.toString())

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
        const withdrawalQueue: string = getWithdrawalQueueAddr(await chain.getChainId())
        if (!steth || !withdrawalQueue || steth.length === 0 || withdrawalQueue.length === 0) {
            const helper = new Helper("Request Unstake", "Incorrect Chain Id", "Staking available only on Ethereum mainnet and Goerli")
            throw new StatusError("Lido Finance", "", "action.requestUnstake", helper)
        }
        const approveAmount: number = params.amounts.reduce((partialSum, a) => partialSum + a, 0)
        const approveData: TransactionData = await Token.approve(steth, withdrawalQueue, approveAmount, { chain: actionData.chain })
        // Request Withdrawal
        const requestWithdrawal = withdrawQueueInterface.encodeFunctionData("requestWithdrawals", [
            params.amounts.map((amount) => parseEther(amount.toString())),
            params.recipient ? params.recipient : await wallet.getAddress()
        ])
        const requestWithdrawalData: TransactionData = { to: withdrawalQueue, data: requestWithdrawal, value: BigNumber.from(0) }
        const approveAndExecData = { approve: approveData, exec: requestWithdrawalData }
        return await approveAndExec(approveAndExecData)(actionData)
    }
}

const getReadyToWithdrawRequests = async (actionData: ActionData) => {
    const { chain, wallet } = actionData
    const provider = await actionData.chain.getProvider()
    const withdrawalQueue = new ethers.Contract(getWithdrawalQueueAddr(await chain.getChainId()), WITHDRAW_QUEUE_ABI, provider)
    // check withdrawal requests
    const withdrawalRequests: BigNumber[] = await withdrawalQueue.getWithdrawalRequests(await wallet.getAddress())
    // get the state of a particular nft
    const withdrawalStatusTx = await withdrawalQueue.getWithdrawalStatus(withdrawalRequests)
    const readyToWithdraw: BigNumber[] = []
    for (let i = 0; i < withdrawalStatusTx.length; i++) {
        if (withdrawalStatusTx[i].isFinalized) {
            readyToWithdraw.push(withdrawalRequests[i])
        }
    }
    const readyToWithdrawRequestIds = [...readyToWithdraw].sort((a, b) => {
        return a.gt(b) ? 1 : -1
    })
    return readyToWithdrawRequestIds
}

export const _finishUnstake = (params: FinishUnstakeParams): ActionFunction => {
    return async (actionData: ActionData): Promise<FirstClassActionResult> => {
        const { chain } = actionData
        const provider = await actionData.chain.getProvider()
        const withdrawalQueue = new ethers.Contract(getWithdrawalQueueAddr(await chain.getChainId()), WITHDRAW_QUEUE_ABI, provider)

        const readyToWithdrawRequestIds = await getReadyToWithdrawRequests(actionData)
        if (readyToWithdrawRequestIds.length === 0) {
            const helper = new Helper("Finish Unstake", " ", "No ready to withdraw requests")
            throw new StatusError("Lido Finance", "", "action.finishUnstake", helper)
        }

        // claim batch withdrawal
        const lastCheckpoint = await withdrawalQueue.getLastCheckpointIndex()
        const hints = await withdrawalQueue.findCheckpointHints(readyToWithdrawRequestIds, 1, lastCheckpoint)
        const claimBatchWithdrawalTx = await withdrawalQueue.populateTransaction.claimWithdrawalsTo(
            readyToWithdrawRequestIds,
            hints,
            params.recipient
        )
        if (claimBatchWithdrawalTx && claimBatchWithdrawalTx.data && claimBatchWithdrawalTx.to) {
            const data = {
                to: claimBatchWithdrawalTx.to.toString(),
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

export const getLidoAddress = (chainId: string) => {
    switch (parseInt(chainId)) {
        case 1:
            return "0x2170Ed0880ac9A755fd29B2688956BD959F933F8"
        case 5:
            return "0x1643E812aE58766192Cf7D2Cf9567dF2C37e9B7F"
        default:
            return undefined
    }
}

export const getWithdrawalQueueAddr = (chainId: string): string => {
    switch (parseInt(chainId)) {
        case 1:
            return "0x889edC2eDab5f40e902b864aD4d7AdE8E412F9B1"
        case 5:
            return "0xCF117961421cA9e546cD7f50bC73abCdB3039533"
        default:
            return ""
    }
}

export const getSteth = (chainId: string): string => {
    switch (parseInt(chainId)) {
        case 1:
            return "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84"
        case 5:
            return "0x1643E812aE58766192Cf7D2Cf9567dF2C37e9B7F"
        default:
            return ""
    }
}
