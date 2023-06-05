import { EnvOption, GlobalEnvOption } from "./types"
import { getOrgInfo } from "../apis"
import { OPTION_TEST_API_KEY } from "../common/constants"
import { getChainFromData } from "../data"

export function parseOptions(option: EnvOption) {
    const globalOptions = (globalThis as any).globalEnvOption
    return { ...globalOptions, ...option }
}

export async function configureEnvironment(option: GlobalEnvOption) {
    const global = globalThis as any
    global.globalEnvOption = global.globalEnvOption ? global.globalEnvOption : {}
    const globalEnvOption = global.globalEnvOption as GlobalEnvOption
    if (!option.chain && !globalEnvOption.chain) {
        globalEnvOption.chain = await getChainFromData("5")
    } else {
        globalEnvOption.chain = option.chain ? await getChainFromData(option.chain) : globalEnvOption.chain
    }

    if (!option.apiKey && !globalEnvOption.apiKey) {
        globalEnvOption.apiKey = OPTION_TEST_API_KEY
    } else {
        globalEnvOption.apiKey = option.apiKey ? option.apiKey : globalEnvOption.apiKey
    }

    globalEnvOption.orgInfo = await getOrgInfo(globalEnvOption.apiKey!)
    globalEnvOption.gasSponsor = option.gasSponsor ? option.gasSponsor : globalEnvOption.gasSponsor
    globalEnvOption.fee = option.fee ? option.fee : globalEnvOption.fee
    globalEnvOption.sendTxLater = option.sendTxLater ? option.sendTxLater : globalEnvOption.sendTxLater
}
