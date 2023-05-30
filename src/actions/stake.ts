import { parseEther } from "ethers/lib/utils"
import { Token } from "../data"
import { Interface } from "ethers/lib/utils"
import { approveAndExec, ApproveParams, ExecParams } from "./ApproveAndExec"
import { BigNumber, ethers } from "ethers"
const WITHDRAW_QUEUE_ABI = [{
    "inputs": [
        {
            "internalType": "uint256[]",
            "name": "_amounts",
            "type": "uint256[]"
        },
        {
            "internalType": "address",
            "name": "_owner",
            "type": "address"
        }
    ],
    "name": "requestWithdrawals",
    "outputs": [
        {
            "internalType": "uint256[]",
            "name": "requestIds",
            "type": "uint256[]"
        }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
}, {
    "inputs": [
        {
            "internalType": "address",
            "name": "_owner",
            "type": "address"
        }
    ],
    "name": "getWithdrawalRequests",
    "outputs": [
        {
            "internalType": "uint256[]",
            "name": "requestsIds",
            "type": "uint256[]"
        }
    ],
    "stateMutability": "view",
    "type": "function"
}, {
    "inputs": [
        {
            "internalType": "uint256[]",
            "name": "_requestIds",
            "type": "uint256[]"
        }
    ],
    "name": "getWithdrawalStatus",
    "outputs": [
        {
            "components": [
                {
                    "internalType": "uint256",
                    "name": "amountOfStETH",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "amountOfShares",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "owner",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "timestamp",
                    "type": "uint256"
                },
                {
                    "internalType": "bool",
                    "name": "isFinalized",
                    "type": "bool"
                },
                {
                    "internalType": "bool",
                    "name": "isClaimed",
                    "type": "bool"
                }
            ],
            "internalType": "struct WithdrawalQueueBase.WithdrawalRequestStatus[]",
            "name": "statuses",
            "type": "tuple[]"
        }
    ],
    "stateMutability": "view",
    "type": "function"
},
{
    "inputs": [],
    "name": "getLastCheckpointIndex",
    "outputs": [
        {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
        }
    ],
    "stateMutability": "view",
    "type": "function"
}, {
    "inputs": [
        {
            "internalType": "uint256[]",
            "name": "_requestIds",
            "type": "uint256[]"
        },
        {
            "internalType": "uint256",
            "name": "_firstIndex",
            "type": "uint256"
        },
        {
            "internalType": "uint256",
            "name": "_lastIndex",
            "type": "uint256"
        }
    ],
    "name": "findCheckpointHints",
    "outputs": [
        {
            "internalType": "uint256[]",
            "name": "hintIds",
            "type": "uint256[]"
        }
    ],
    "stateMutability": "view",
    "type": "function"
}, {
    "inputs": [
        {
            "internalType": "uint256",
            "name": "_requestId",
            "type": "uint256"
        }
    ],
    "name": "claimWithdrawal",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
}, {
    "inputs": [
        {
            "internalType": "uint256[]",
            "name": "_requestIds",
            "type": "uint256[]"
        },
        {
            "internalType": "uint256[]",
            "name": "_hints",
            "type": "uint256[]"
        }
    ],
    "name": "claimWithdrawals",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
}]
export interface StakeParams {
    amount: BigNumber
}

export interface RequestUnstakeParams {
    token: string
    amount: BigNumber
}
const withdrawQueueInterface = new Interface(WITHDRAW_QUEUE_ABI)

export const _stake = (input: StakeParams) => {
    return async (actionData: any) => {
        const { chain } = actionData
        const lidoAddress = getLidoAddress(chain.id.toString())
        let reasonData = null
        if (!lidoAddress) {
            reasonData = {
                title: "Possible reasons:",
                reasons: ["Incorrect Chain Id - Staking available only on Ethereum mainnet and Goerli"]
            }
        }
        const data = { to: lidoAddress, data: "0x", value: parseEther(`${input.amount}`) }
        const errorData = {
            location: "action.stake",
            error: {
                reasonData
            }
        }
        return { data, errorData }
    }
}

export const _requestUnstake = (params: any) => {
    return async (actionData: any) => {
        // Approve steth
        const { chain, wallet } = actionData
        const steth: string = getSteth(chain.id.toString())
        const withdrawalQueue: string = getWithdrawalQueue(chain.id.toString())
        let errorData = null
        if (!steth || !withdrawalQueue || steth.length === 0 || withdrawalQueue.length === 0) {
            errorData = {
                location: "action.requestUnstake",
                error: {
                    title: "Possible reasons:",
                    reasons: ["Incorrect Chain Id - Staking available only on Ethereum mainnet and Goerli"]
                }
            }
        }
        let token = new Token(params.token)
        const approveData: ApproveParams = await token.approve(withdrawalQueue, params.amount, { chain: actionData.chain })
        // Request Withdrawal
        const requestWithdrawal = withdrawQueueInterface.encodeFunctionData("requestWithdrawals", [[params.amount], await wallet.getAddress()])
        const requestWithdrawalData: ExecParams = { to: withdrawalQueue, data: requestWithdrawal, value: BigNumber.from(0) }
        return await approveAndExec({ approve: approveData, exec: requestWithdrawalData })
    }
}

export const _finishUnstake = () => {
    return async (actionData: any) => {
        const { chain, wallet } = actionData
        const provider = await actionData.chain.getProvider()
        const withdrawalQueue = new ethers.Contract(getWithdrawalQueue(chain.id.toString()), WITHDRAW_QUEUE_ABI, provider)
        // check withdrawal requests
        const withdrawalRequests = await withdrawalQueue.getWithdrawalRequests(wallet.getAddress())
        // get the state of a particular nft
        const withdrawalStatusTx = await withdrawalQueue.getWithdrawalStatus(withdrawalRequests)
        const readyToWithdraw = []
        let errorData = null
        for (let i = 0; i < withdrawalStatusTx.length; i++) {
            if (withdrawalStatusTx[i].isFinalized) {
                readyToWithdraw.push(withdrawalRequests[i])
            }
        }
        if (readyToWithdraw.length === 0) {
            // return error
            errorData = {
                location: "action.requestUnstake",
                error: {
                    title: "Possible reasons:",
                    reasons: ["Incorrect Chain Id - Staking available only on Ethereum mainnet and Goerli"]
                }
            }
        }
        const readyToWithdrawRequestIds = [...readyToWithdraw].sort((a, b) => {
            return a.sub(b)
        })
        // claim batch withdrawal
        const lastCheckpoint = await withdrawalQueue.getLastCheckpointIndex()
        const hints = await withdrawalQueue.findCheckpointHints(readyToWithdrawRequestIds, 1, lastCheckpoint)
        const claimBatchWithdrawalTx = await withdrawalQueue.populateTransaction.claimWithdrawals(readyToWithdrawRequestIds, hints)
        let data: ExecParams
        if (claimBatchWithdrawalTx && claimBatchWithdrawalTx.data && claimBatchWithdrawalTx.to && claimBatchWithdrawalTx.value) {
            data = {
                to: claimBatchWithdrawalTx.to.toString(),
                data: claimBatchWithdrawalTx.data,
                value: claimBatchWithdrawalTx.value
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

export const getWithdrawalQueue = (chainId: string): string => {
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