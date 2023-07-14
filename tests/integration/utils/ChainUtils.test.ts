import { expect } from "chai"
import { Chain, createPublicClient, getAddress, http, isHex, size } from "viem"
import { mainnet, polygon } from "viem/chains"
import { isContract, randomBytes } from "../../../src/utils/ChainUtils"

describe("Test src/utils/ChainUtils.ts", function () {
    describe("isContract", function () {
        it("USDC address should return true", async function () {
            const USDC = getAddress("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
            // 2. Set up your client with desired chain & transport.
            const client = createPublicClient({
                chain: mainnet,
                transport: http()
            })
            expect(await isContract(USDC, client)).to.be.true
        })

        it("Zero address should return false", async function () {
            const USDC = getAddress("0x0000000000000000000000000000000000000000")
            // 2. Set up your client with desired chain & transport.
            const client = createPublicClient({
                chain: polygon,
                transport: http()
            })
            expect(await isContract(USDC, client)).to.be.false
        })

        it("Should error since the chain has no RPCs and client.getBytecode won't work", async function () {
            const badChain: Chain = {
                id: 1,
                name: "badChain",
                network: "badChain",
                nativeCurrency: {
                    decimals: 18,
                    name: "badChain",
                    symbol: "badChain"
                },
                rpcUrls: {
                    public: { http: ["https"] },
                    default: { http: ["https"] }
                },
                blockExplorers: {
                    etherscan: { name: "badChainExplorer", url: "https://badChainExplorer.io" },
                    default: { name: "badChainExplorer", url: "https://badChainExplorer.io" }
                }
            } as const satisfies Chain
            const USDC = getAddress("0x0000000000000000000000000000000000000000")
            // 2. Set up your client with desired chain & transport.
            const client = createPublicClient({
                chain: badChain,
                transport: http()
            })
            expect(await isContract(USDC, client)).to.be.false
        })
    })

    describe("randomBytes", function () {
        it("Should return a string of length 32", function () {
            const bytes32 = randomBytes(32)
            expect(isHex(bytes32)).to.be.true
            expect(size(bytes32)).to.equal(32)
        })
    })
})
