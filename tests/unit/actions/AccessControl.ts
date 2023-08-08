import { expect } from "chai"
import { restore, spy, stub } from "sinon"
import { Address, Hex, getAddress, pad } from "viem"
import { Token } from "./../../../src/data/Token"
import {
    HashOne,
    addOwnerTxParams,
    createSessionKeyTransactionParams,
    createSessionUser,
    removeOwnerTxParams
} from "../../../src/actions/AccessControl"
import { SessionKeyAuth } from "../../../src/auth"
import { RBAC_CONTRACT_INTERFACE, TransactionParams } from "../../../src/common"
import { Chain } from "../../../src/data/Chain"
import { InvalidParameterError } from "../../../src/errors"
import { randomBytes } from "../../../src/utils"
import { MerkleTree } from "../../../src/utils/MerkleUtils"
import * as ViemUtils from "../../../src/utils/ViemUtils"

describe("AccessControl", () => {
    let sessionKeyParams
    let actionWhitelistItem
    let targetWhitelist
    let feeTokenWhitelist
    let feeRecipientWhitelist
    let user
    let chainId

    const testTargetSelectorMerkleRootHash: Hex = "0xtestTargetSelectorMerkleRootHash"
    const testfeeRecipientTokenMerkleRootHash: Hex = "0xtestFeeRecipientTokenMerkleRootHash"
    const testUserId = "userId"
    const testRbacAddress: Address = "0xrbacAddress"
    const testTokenAddress: Address = "0xtestTokenAddress"
    const testSetRuleData: Hex = "0xtestSetRuleData"
    const testAddRuleToRoleData: Hex = "0xtestAddRuleToRoleData"
    const testAddUserToRoleData: Hex = "0xtestAddUserToRoleData"

    const testChain: any = {
        id: 5,
        getAddress: () => {
            return Promise.resolve(testRbacAddress)
        }
    }
    let chainStub: any

    beforeEach(() => {
        actionWhitelistItem = { abi: "testAbi", functionWhitelist: ["function1"] }
        targetWhitelist = ["0xe2a83b15fc300d8457eb9e176f98d92a8ff40a49"]
        feeTokenWhitelist = ["token1"]
        feeRecipientWhitelist = ["0xe2a83b15fc300d8457eb9e176f98d92a8ff40a49"]
        user = new SessionKeyAuth({ privateKey: randomBytes(32) })

        chainId = 1

        sessionKeyParams = {
            targetWhitelist,
            actionWhitelist: [actionWhitelistItem],
            feeTokenWhitelist,
            feeRecipientWhitelist,
            deadline: 1234n,
            user,
            chainId
        }

        stub(ViemUtils, "getSigHash").callsFake(() => "0xtestSigHash")

        stub(Token, "getAddress").withArgs("token1").returns(Promise.resolve(testTokenAddress))

        stub(user).getUserId = stub().resolves(testUserId)

        chainStub = stub(Chain, "getChain").resolves(testChain)
        stub(testChain, "getAddress").resolves(testRbacAddress)
    })

    afterEach(() => {
        restore()
    })

    describe("createSessionKeyTransactionParams", () => {
        let merkleTreestub: any
        const testRuleStruct = {
            deadline: 1234n,
            targetSelectorMerkleRootHash: testTargetSelectorMerkleRootHash,
            feeRecipientTokenMerkleRootHash: testfeeRecipientTokenMerkleRootHash,
            actionValueLimit: 0n,
            feeValueLimit: 0n
        }
        beforeEach(() => {
            merkleTreestub = stub(MerkleTree.prototype, "getRoot")
        })

        afterEach(() => {
            restore()
        })

        it("should throw an error if targetWhitelist is empty", async () => {
            stub(RBAC_CONTRACT_INTERFACE, "encodeData")
                .withArgs("setRule", [user.ruleId, testRuleStruct])
                .returns(testSetRuleData)
                .withArgs("addRuleToRole", [user.roleId, user.ruleId])
                .returns(testAddRuleToRoleData)
                .withArgs("addUserToRole", [user.roleId, testUserId])
                .returns(testAddUserToRoleData)

            sessionKeyParams.targetWhitelist = []
            try {
                await createSessionKeyTransactionParams(sessionKeyParams)
            } catch (error: any) {
                expect(error).to.be.instanceOf(InvalidParameterError)
                expect(error.message).to.include("targetWhitelist is required")
            }
        })

        it("should return the correct TransactionParams", async () => {
            stub(RBAC_CONTRACT_INTERFACE, "encodeData")
                .withArgs("setRule", [user.ruleId, testRuleStruct])
                .returns(testSetRuleData)
                .withArgs("addRuleToRole", [user.roleId, user.ruleId])
                .returns(testAddRuleToRoleData)
                .withArgs("addUserToRole", [user.roleId, testUserId])
                .returns(testAddUserToRoleData)

            merkleTreestub.onCall(0).returns(testfeeRecipientTokenMerkleRootHash).onCall(1).returns(testTargetSelectorMerkleRootHash)

            const result: TransactionParams = await createSessionKeyTransactionParams(sessionKeyParams)

            // Check if the specific data strings are present in the data
            expect(result).to.have.property("data")
            expect(result.data).to.include(testSetRuleData.slice(2))
            expect(result.data).to.include(testAddRuleToRoleData.slice(2))
            expect(result.data).to.include(testAddUserToRoleData.slice(2))
            expect(result).to.have.property("to").and.to.deep.equal(testRbacAddress)
            expect(result).to.have.property("value")
        })

        it("should not execute certain code if feeRecipientWhitelist and feeTokenWhitelist are not provided", async () => {
            merkleTreestub.onCall(0).returns(testTargetSelectorMerkleRootHash)
            stub(RBAC_CONTRACT_INTERFACE, "encodeData")
                .withArgs("setRule", [user.ruleId, { ...testRuleStruct, feeRecipientTokenMerkleRootHash: HashOne }])
                .returns(testSetRuleData)
                .withArgs("addRuleToRole", [user.roleId, user.ruleId])
                .returns(testAddRuleToRoleData)
                .withArgs("addUserToRole", [user.roleId, testUserId])
                .returns(testAddUserToRoleData)

            const getAddressSpy = spy(getAddress)

            // Mock the user object to provide a spy for the setFeeRecipientMerkleTree function
            const setFeeRecipientMerkleTreeSpy = spy()

            const paramsWithNoWhitelists = { ...sessionKeyParams, feeRecipientWhitelist: undefined, feeTokenWhitelist: undefined }
            await createSessionKeyTransactionParams(paramsWithNoWhitelists)

            // Verify that the spied functions were not called
            expect(getAddressSpy.called).to.be.false
            expect(setFeeRecipientMerkleTreeSpy.called).to.be.false
        })
    })

    describe("createSessionUser", function () {
        it("should return an instance of SessionKeyAuth", function () {
            const result = createSessionUser()
            expect(result).to.be.an.instanceof(SessionKeyAuth)
        })
    })

    describe("Ownership Transaction Functions", () => {
        const testOwnerId: Hex = "0xtestOwnerId"

        describe("addOwnerTxParams", () => {
            it("should return correct transaction parameters for adding owner", async () => {
                const result: TransactionParams = await addOwnerTxParams({ chainId: testChain.id, ownerId: testOwnerId })

                const paddedOwnerId = pad(testOwnerId, { size: 32 })

                expect(result?.data?.slice(-32)).to.equal(paddedOwnerId.slice(-32))
                expect(result?.to).to.equal(testRbacAddress)
                expect(result?.value?.toString()).to.equal("0")
                expect(chainStub.calledWith({ chainIdentifier: testChain.id })).to.be.true
            })
        })

        describe("removeOwnerTxParams", () => {
            it("should return correct transaction parameters for removing owner", async () => {
                const testOwnerId: Hex = "0xtestOwnerId"

                const result = await removeOwnerTxParams({ chainId: testChain.id, ownerId: testOwnerId })

                const paddedOwnerId = pad(testOwnerId, { size: 32 })

                expect(result?.data?.slice(-32)).to.equal(paddedOwnerId.slice(-32))
                expect(result?.to).to.equal(testRbacAddress)
                expect(result?.value?.toString()).to.equal("0")
                expect(chainStub.calledWith({ chainIdentifier: testChain.id })).to.be.true
            })
        })
    })
})
