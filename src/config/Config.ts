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

    globalEnvOption.apiKey = option.apiKey ? option.apiKey : globalEnvOption.apiKey
    if (!globalEnvOption.apiKey) {
        throw new InvalidParameterError(
            ErrorCode.MissingParameter,
            "apiKey is required",
            { option },
            "Provide apiKey when configureEnvironment.",
            "https://docs.fun.xyz"
        )
    }

    if ((!option || !option.chain) && !globalEnvOption.chain) {
        globalEnvOption.chain = await Chain.getChain({ chainIdentifier: 5 }, globalEnvOption.apiKey)
    } else {
        globalEnvOption.chain = option.chain
            ? await Chain.getChain({ chainIdentifier: option.chain }, globalEnvOption.apiKey)
            : globalEnvOption.chain
    }

    if (option.gasSponsor !== null && option.gasSponsor !== undefined) {
        if (Object.keys(option.gasSponsor).length !== 0) {
            if (option.gasSponsor.token) {
                const usePermit = option.gasSponsor.usePermit === false ? false : true
                globalEnvOption.gasSponsor = { ...option.gasSponsor, usePermit }
            } else {
                globalEnvOption.gasSponsor = { ...option.gasSponsor }
            }
        } else {
            globalEnvOption.gasSponsor = {}
        }
    }
    globalEnvOption.fee = option.fee ? option.fee : globalEnvOption.fee
    globalEnvOption.skipDBAction =
        option.skipDBAction === null || option.skipDBAction === undefined ? globalEnvOption.skipDBAction : option.skipDBAction
}
