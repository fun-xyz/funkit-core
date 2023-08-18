import { EnvOption, GlobalEnvOption } from "./types"
import { Chain } from "../data"
import { ErrorCode, InvalidParameterError } from "../errors"

export function parseOptions(option: EnvOption) {
    const globalOptions = (globalThis as any).globalEnvOption
    return { ...globalOptions, ...option }
}

export async function configureEnvironment(option: GlobalEnvOption) {
    const global = globalThis as any
    if (!global.globalEnvOption) {
        global.globalEnvOption = {}
    }
    const globalEnvOption = global.globalEnvOption

    if ((!option || !option.chain) && !globalEnvOption.chain) {
        globalEnvOption.chain = await Chain.getChain({ chainIdentifier: 5 })
    } else {
        globalEnvOption.chain = option.chain ? await Chain.getChain({ chainIdentifier: option.chain }) : globalEnvOption.chain
    }

    globalEnvOption.apiKey = option.apiKey ? option.apiKey : globalEnvOption.apiKey
    if (!globalEnvOption.apiKey) {
        throw new InvalidParameterError(
            ErrorCode.MissingParameter,
            "apiKey is required",
            "configureEnvironment",
            { option },
            "Provide apiKey when configureEnvironment.",
            "https://docs.fun.xyz"
        )
    }

    if (option.gasSponsor !== null && option.gasSponsor !== undefined) {
        if (Object.keys(option.gasSponsor).length !== 0) {
            const usePermit = option.gasSponsor.usePermit === false ? false : true
            globalEnvOption.gasSponsor = { ...option.gasSponsor, usePermit }
        } else {
            globalEnvOption.gasSponsor = {}
        }
    }
    globalEnvOption.fee = option.fee ? option.fee : globalEnvOption.fee
    globalEnvOption.skipDBAction =
        option.skipDBAction === null || option.skipDBAction === undefined ? globalEnvOption.skipDBAction : option.skipDBAction
}
