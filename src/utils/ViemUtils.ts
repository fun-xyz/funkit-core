import { AbiParameter } from "abitype"
import { AbiItem, getAbiItem, getFunctionSelector } from "viem"

// Copied from viem
export function formatAbiItem(abiItem: AbiItem, { includeName = false }: { includeName?: boolean } = {}) {
    if (abiItem.type !== "function" && abiItem.type !== "event" && abiItem.type !== "error")
        throw new Error(`InvalidDefinitionTypeError: ${abiItem.type}`)

    return `${abiItem.name}(${formatAbiParams(abiItem.inputs, { includeName })})`
}

export function formatAbiParams(
    params: readonly AbiParameter[] | undefined,
    { includeName = false }: { includeName?: boolean } = {}
): string {
    if (!params) return ""
    return params.map((param) => formatAbiParam(param, { includeName })).join(includeName ? ", " : ",")
}

function formatAbiParam(param: AbiParameter, { includeName }: { includeName: boolean }): string {
    if (param.type.startsWith("tuple")) {
        return `(${formatAbiParams((param as unknown as { components: AbiParameter[] }).components, { includeName })})${param.type.slice(
            "tuple".length
        )}`
    }
    return param.type + (includeName && param.name ? ` ${param.name}` : "")
}

export const getSigHash = (abi: any, functionName: string) => {
    const abiItem = getAbiItem({ abi, name: functionName })
    const definition = formatAbiItem(abiItem)
    return getFunctionSelector(definition)
}
