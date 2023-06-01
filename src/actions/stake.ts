import { ActionData } from "./FirstClass"
import { Token } from "../data"
import { approveAndExec, ApproveParams, ExecParams } from "./ApproveAndExec"

import { Interface, parseEther } from "ethers/lib/utils"
import { BigNumber, ethers } from "ethers"
import { Helper, StatusError } from "../errors"
import WITHDRAW_QUEUE_ABI from "../abis/LidoWithdrawQueue.json"
export interface StakeParams {
    amount: number // denominated in wei
}

export interface RequestUnstakeParams {
    amounts: number[] // denominated in wei
}

export interface FinishUnstakeParams {
    recipient: string
}
const withdrawQueueInterface = new Interface(WITHDRAW_QUEUE_ABI)

export const _stake = (params: StakeParams) => {
    return async (actionData: ActionData) => {
        const lidoAddress = getLidoAddress(actionData.chain.id!.toString())
        let reasonData: any = null
        if (!lidoAddress) {
            reasonData = {
                title: "Possible reasons:",
                reasons: ["Incorrect Chain Id - Staking available only on Ethereum mainnet and Goerli"]
            }
        }
        const data = { to: lidoAddress, data: "0x", value: `${parseEther(params.amount.toString())}` }
        const errorData = {
            location: "action.stake",
            error: {
                reasonData
            }
        }
        return { data, errorData }
    }
}

export const _requestUnstake = (params: RequestUnstakeParams) => {
    return async (actionData: ActionData) => {
        // Approve steth
        const { chain, wallet } = actionData
        const steth: string = getSteth(await chain.getChainId())
        const withdrawalQueue: string = getWithdrawalQueueAddr(await chain.getChainId())
        if (!steth || !withdrawalQueue || steth.length === 0 || withdrawalQueue.length === 0) {
            const helper = new Helper("Request Unstake", "Incorrect Chain Id", "Staking available only on Ethereum mainnet and Goerli")
            throw new StatusError("Lido Finance", "action.requestUnstake", helper)
        }
        const token = new Token(steth)
        const approveAmount: number = params.amounts.reduce((partialSum, a) => partialSum + a, 0)
        const approveData: ApproveParams = await token.approve(withdrawalQueue, approveAmount, { chain: actionData.chain })
        // Request Withdrawal
        const requestWithdrawal = withdrawQueueInterface.encodeFunctionData("requestWithdrawals", [
            params.amounts.map((amount) => parseEther(amount.toString())),
            await wallet.getAddress()
        ])
        const requestWithdrawalData: ExecParams = { to: withdrawalQueue, data: requestWithdrawal, value: BigNumber.from(0) }
        return await approveAndExec({ approve: approveData, exec: requestWithdrawalData })(actionData)
    }
}

export const _finishUnstake = (params: FinishUnstakeParams) => {
    return async (actionData: ActionData) => {
        const { chain, wallet } = actionData
        const provider = await actionData.chain.getProvider()
        const withdrawalQueue = new ethers.Contract(getWithdrawalQueueAddr(await chain.getChainId()), WITHDRAW_QUEUE_ABI, provider)
        // check withdrawal requests
        const withdrawalRequests: BigNumber[] = await withdrawalQueue.getWithdrawalRequests(await wallet.getAddress())
        // get the state of a particular nft
        const withdrawalStatusTx = await withdrawalQueue.getWithdrawalStatus(withdrawalRequests)
        const readyToWithdraw: BigNumber[] = []
        let errorData
        for (let i = 0; i < withdrawalStatusTx.length; i++) {
            if (withdrawalStatusTx[i].isFinalized) {
                readyToWithdraw.push(withdrawalRequests[i])
            }
        }
        const readyToWithdrawRequestIds = [...readyToWithdraw].sort((a, b) => {
            return a.gt(b) ? 1 : -1
        })
        if (readyToWithdrawRequestIds.length === 0) {
            const helper = new Helper("Finish Unstake", " ", "No ready to withdraw requests")
            throw new StatusError("Lido Finance", "action.finishUnstake", helper)
        }

        // claim batch withdrawal
        const lastCheckpoint = await withdrawalQueue.getLastCheckpointIndex()
        const hints = await withdrawalQueue.findCheckpointHints(readyToWithdrawRequestIds, 1, lastCheckpoint)
        const claimBatchWithdrawalTx = await withdrawalQueue.populateTransaction.claimWithdrawalsTo(
            readyToWithdrawRequestIds,
            hints,
            params.recipient
        )
        let data
        if (claimBatchWithdrawalTx && claimBatchWithdrawalTx.data && claimBatchWithdrawalTx.to) {
            data = {
                to: claimBatchWithdrawalTx.to.toString(),
                data: claimBatchWithdrawalTx.data,
            }
        } else {
            data = { to: "", data: "", value: BigNumber.from(0) }
        }
        return { data, errorData }
    }
}

export const getLidoAddress = (chainId: string) => {
    switch (parseInt(chainId)) {
        case 1:
            return "0x2170Ed0880ac9A755fd29B2688956BD959F933F8"
        case 5:
            return "0x1643E812aE58766192Cf7D2Cf9567dF2C37e9B7F"
        default:
            return null
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
