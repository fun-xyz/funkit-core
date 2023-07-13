import { Hex, concat, keccak256 } from "viem"

// Copied from contracts repo

export const createMerkleHashes = (list: Hex[]) => {
    list = list.map((data) => keccak256(data))
    const treeSize = 2 ** Math.ceil(Math.log2(list.length)) * 2
    const buffer = new Array(treeSize).fill("0x")
    arrayCopy(buffer, list, treeSize / 2)
    for (let i = treeSize / 2 - list.length; i > 0; i--) {
        buffer[buffer.length - i] = list[list.length - 1]
    }
    for (let i = 1; i < buffer.length; i++) {
        buffer[i] = getHash(buffer, i)
    }
    return buffer
}

export const getLeft = (i: number) => i * 2
export const getRight = (i: number) => i * 2 + 1
export const getParent = (index: number) => Math.floor(index / 2)
export const getSibling = (index: number) => {
    const parent = getParent(index)
    if (index % 2 === 0) {
        return getRight(parent)
    }
    return getLeft(parent)
}

export const getHash = (list: Hex[], i: number): Hex => {
    if (list[i] === "0x") {
        if (getRight(i) < list.length) {
            const left = getHash(list, getLeft(i))
            const right = getHash(list, getRight(i))
            return getHashPair(left, right)
        }
        throw new Error("Invalid tree")
    }
    return list[i]
}

export const getHashPair = (left: Hex, right: Hex) => {
    if (BigInt(left) < BigInt(right)) {
        return keccak256(concat([left, right]))
    }
    return keccak256(concat([right, left]))
}

export const arrayCopy = (arr: any[], copy: any[], start: number) => {
    for (let i = 0; i < copy.length; i++) {
        arr[i + start] = copy[i]
    }
}

export const getPathForItem = (list: Hex[], item: Hex) => {
    let index = list.indexOf(keccak256(item))
    if (index === -1) {
        throw new Error("Item not found")
    }
    const path: Hex[] = []
    while (index > 1) {
        const sibling = getSibling(index)
        path.push(list[sibling])
        index = getParent(index)
    }
    return path
}

export const verifyPath = (root: Hex, item: Hex, path: Hex[]) => {
    let hash = keccak256(item)
    for (let i = 0; i < path.length; i++) {
        hash = getHashPair(hash, path[i])
    }
    return hash === root
}

export class MerkleTree {
    tree: Hex[]
    constructor(list: Hex[]) {
        this.tree = createMerkleHashes(list)
    }
    getPathForItem(item: Hex) {
        return getPathForItem(this.tree, item)
    }
    verifyPath(item: Hex, path: Hex[]) {
        return verifyPath(this.getRoot(), item, path)
    }
    getRoot() {
        return this.tree[1]
    }
}
