import { Address, isAddress, parseEther } from "viem"
import { FinishUnstakeParams, RequestUnstakeParams, StakeParams } from "./types"
import { APPROVE_AND_EXEC_CONTRACT_INTERFACE, ERC20_CONTRACT_INTERFACE, TransactionParams, WITHDRAW_QUEUE_ABI } from "../common"
import { GlobalEnvOption } from "../config"
import { Chain } from "../data"
import { ErrorCode, InternalFailureError, InvalidParameterError } from "../errors"
import { ContractInterface } from "../viem/ContractInterface"

const withdrawQueueInterface = new ContractInterface(WITHDRAW_QUEUE_ABI)

export const isRequestUnstakeParams = (input: any): boolean => {
    return input.amounts !== undefined
}
export const isFinishUnstakeParams = (input: any): boolean => {
    return input.recipient !== undefined
}
export const stakeTransactionParams = async (params: StakeParams, txOptions: GlobalEnvOption): Promise<TransactionParams> => {
    const chain = await Chain.getChain({ chainIdentifier: txOptions.chain }, txOptions.apiKey)
    const lidoAddress = getSteth(chain.getChainId())
    return { to: lidoAddress, value: parseEther(`${params.amount}`), data: "0x" }
}

export const requestUnstakeTransactionParams = async (
    params: RequestUnstakeParams,
    txOptions: GlobalEnvOption
): Promise<TransactionParams> => {
    if (!isAddress(params.recipient ?? "")) {
        throw new InvalidParameterError(
            ErrorCode.InvalidParameter,
            "Recipient address is not a valid address, please make sure it is a valid checksum address.",
            { params },
            "Please make sure it is a valid checksum address",
            "https://docs.fun.xyz"
        )
    }
    // Approve steth
    const chain = await Chain.getChain({ chainIdentifier: txOptions.chain }, txOptions.apiKey)
    const chainId = chain.getChainId()
    const steth = getSteth(chainId)
    const withdrawalQueue: Address = getWithdrawalQueue(chainId)
    if (!steth || !withdrawalQueue || steth.length === 0 || withdrawalQueue.length === 0) {
        throw new InvalidParameterError(
            ErrorCode.ChainNotSupported,
            "Incorrect chainId, staking only available on Ethereum mainnet and Goerli",
            { params },
            "Provide correct chainId.",
            "https://docs.fun.xyz"
        )
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
    const approveAndExecAddress = chain.getAddress("approveAndExecAddress")
    return APPROVE_AND_EXEC_CONTRACT_INTERFACE.encodeTransactionParams(approveAndExecAddress, "approveAndExecute", [
        withdrawalQueue,
        0,
        requestWithdrawalData.data,
        steth,
        approveData.data
    ])
}

export const finishUnstakeTransactionParams = async (
    params: FinishUnstakeParams,
    txOptions: GlobalEnvOption
): Promise<TransactionParams> => {
    if (!isAddress(params.recipient ?? "")) {
        throw new InvalidParameterError(
            ErrorCode.InvalidParameter,
            "Recipient address is not a valid address, please make sure it is a valid checksum address.",
            { params },
            "Please make sure it is a valid checksum address",
            "https://docs.fun.xyz"
        )
    }
    const chain = await Chain.getChain({ chainIdentifier: txOptions.chain }, txOptions.apiKey)
    const withdrawQueueAddress = getWithdrawalQueue(chain.getChainId())
    const readyToWithdrawRequestIds = (await getReadyToWithdrawRequests(params, txOptions)).slice(0, 5)
    if (readyToWithdrawRequestIds.length === 0) {
        throw new InvalidParameterError(
            ErrorCode.InvalidParameter,
            "Not ready to withdraw requests",
            { params },
            "Please wait a bit.",
            "https://docs.fun.xyz"
        )
    }

    // claim batch withdrawal
    const lastCheckpoint = await withdrawQueueInterface.readFromChain(withdrawQueueAddress, "getLastCheckpointIndex", [], chain)
    const hints = await withdrawQueueInterface.readFromChain(
        withdrawQueueAddress,
        "findCheckpointHints",
        [readyToWithdrawRequestIds, 1, lastCheckpoint],
        chain
    )
    if (!hints) {
        throw new InternalFailureError(
            ErrorCode.CheckPointHintsNotFound,
            "lido checkpoint hints are not found when batching the withdrawal",
            { params, readyToWithdrawRequestIds, lastCheckpoint, hints },
            "Retry later.",
            "https://docs.fun.xyz"
        )
    }
    return withdrawQueueInterface.encodeTransactionParams(withdrawQueueAddress, "claimWithdrawalsTo", [
        readyToWithdrawRequestIds,
        hints,
        params.recipient
    ])
}

const getReadyToWithdrawRequests = async (params: FinishUnstakeParams, txOptions: GlobalEnvOption): Promise<bigint[]> => {
    if (!isAddress(params.recipient ?? "")) {
        throw new InvalidParameterError(
            ErrorCode.InvalidParameter,
            "Recipient address is not a valid address, please make sure it is a valid checksum address.",
            { params },
            "Please make sure it is a valid checksum address",
            "https://docs.fun.xyz"
        )
    }
    // check withdrawal requests
    const chain = await Chain.getChain({ chainIdentifier: txOptions.chain }, txOptions.apiKey)
    const withdrawalQueueAddr: Address = getWithdrawalQueue(chain.getChainId())

    const withdrawalRequests: bigint[] = await withdrawQueueInterface.readFromChain(
        withdrawalQueueAddr,
        "getWithdrawalRequests",
        [params.walletAddress],
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

const getWithdrawalQueue = (chainId: string): Address => {
    switch (parseInt(chainId)) {
        case 1:
            return "0x889edC2eDab5f40e902b864aD4d7AdE8E412F9B1"
        case 5:
            return "0xCF117961421cA9e546cD7f50bC73abCdB3039533"
        case 36865:
            return "0x889edC2eDab5f40e902b864aD4d7AdE8E412F9B1"
        default:
            throw new InvalidParameterError(
                ErrorCode.ChainNotSupported,
                "Incorrect chainId, staking only available on Ethereum mainnet and Goerli",
                { chainId },
                "Provide correct chainId.",
                "https://docs.fun.xyz"
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
            throw new InvalidParameterError(
                ErrorCode.ChainNotSupported,
                "Incorrect chainId, staking only available on Ethereum mainnet and Goerli",
                { chainId },
                "Provide correct chainId.",
                "https://docs.fun.xyz"
            )
    }
}
