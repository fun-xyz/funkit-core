import { expect } from "chai"
import { restore, stub } from "sinon"
import { Address, Hex } from "viem"
import { Token } from "./../../../src/data/Token"
import { createSessionKeyTransactionParams } from "../../../src/actions/AccessControl"
import { SessionKeyAuth } from "../../../src/auth"
import { RBAC_CONTRACT_INTERFACE, TransactionParams } from "../../../src/common"
import * as data from "../../../src/data"
import { Chain } from "../../../src/data/Chain"
import { InvalidParameterError } from "../../../src/errors"
import { randomBytes } from "../../../src/utils"
import * as ViemUtils from "../../../src/utils/ViemUtils"

describe("createSessionKeyTransactionParams", () => {
    let sessionKeyParams
    let actionWhitelistItem
    let targetWhitelist
    let feeTokenWhitelist
    let feeRecipientWhitelist
    let user
    let chainId

    beforeEach(() => {
        actionWhitelistItem = { abi: "fakeAbi", functionWhitelist: ["function1"] }
        targetWhitelist = ["0xe2a83b15fc300d8457eb9e176f98d92a8ff40a49"]
        feeTokenWhitelist = ["token1"]
        feeRecipientWhitelist = ["0xe2a83b15fc300d8457eb9e176f98d92a8ff40a49"]
        user = new SessionKeyAuth({ privateKey: randomBytes(32) })
        user.roleId = 1
        user.ruleId = 2
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
    })

    it("should throw an error if targetWhitelist is empty", async () => {
        sessionKeyParams.targetWhitelist = []
        try {
            await createSessionKeyTransactionParams(sessionKeyParams)
        } catch (error: any) {
            expect(error).to.be.instanceOf(InvalidParameterError)
            expect(error.message).to.include("targetWhitelist is required")
        }
    })

    it("should return the correct TransactionParams", async () => {
        const fakeRootHash: Hex = "0xrootHash"
        const fakeUserId = "userId"
        const fakeRbacAddress: Address = "0xrbacAddress"

        const fakeTokenAddress: Address = "0xfakeTokenAddress"

        const fakeSetRuleData: Hex = "0xfakeSetRuleData"
        const fakeAddRuleToRoleData: Hex = "0xfakeAddRuleToRoleData"
        const fakeAddUserToRoleData: Hex = "0xfakeAddUserToRoleData"
        const fakeEncodedTransactionParams: TransactionParams = {
            to: "0xtoaddress" as Address
        }

        stub(Token, "getAddress").withArgs("token1").returns(Promise.resolve(fakeTokenAddress))

        stub(data, "getChainFromData").resolves(new Chain({ chainId: chainId }))

        stub(Chain.prototype, "getAddress").withArgs("token1").returns(Promise.resolve(fakeTokenAddress))

        stub(RBAC_CONTRACT_INTERFACE, "encodeData")
            .withArgs("setRule", [
                user.ruleId,
                {
                    deadline: 1234n,
                    targetSelectorMerkleRootHash: fakeRootHash,
                    feeRecipientTokenMerkleRootHash: fakeRootHash,
                    actionValueLimit: 0n,
                    feeValueLimit: 0n
                }
            ])
            .returns(fakeSetRuleData)
            .withArgs("addRuleToRole", [user.roleId, user.ruleId])
            .returns(fakeAddRuleToRoleData)
            .withArgs("addUserToRole", [user.roleId, fakeUserId])
            .returns(fakeAddUserToRoleData)

        stub(RBAC_CONTRACT_INTERFACE, "encodeTransactionParams")
            .withArgs(fakeRbacAddress, "multiCall", [[fakeSetRuleData, fakeAddRuleToRoleData, fakeAddUserToRoleData]])
            .returns(fakeEncodedTransactionParams)

        stub(ViemUtils, "getSigHash").callsFake(() => "0xfakeSigHash")

        const result: TransactionParams = await createSessionKeyTransactionParams(sessionKeyParams)

        expect(result).to.deep.equal(fakeEncodedTransactionParams)
    })

    it("should include feeRecipientTokenMerkleRootHash if feeRecipientWhitelist and feeTokenWhitelist are provided", async () => {
        //
    })

    afterEach(() => {
        restore()
    })
})

//   describe("createSessionUser", function () {
//     it("should return an instance of SessionKeyAuth", function () {
//       const result = createSessionUser();
//       expect(result).to.be.an.instanceof(SessionKeyAuth);
//     });
//   });

//   describe("addOwnerTxParams", function () {
//     it("should return correct transaction parameters", async function () {
//       const params = { ownerId: "ownerId", chainId: "chainId" };
//       const chain = { getAddress: async () => "rbacAddress" };

//       viemModule.pad = (id) => id;
//       getChainFromData = async () => chain;

//       const result = await addOwnerTxParams(params);
//       expect(result).to.be.a("string");
//     });
//   });

//   describe("removeOwnerTxParams", function () {
//     it("should return correct transaction parameters", async function () {
//       const params = { ownerId: "ownerId", chainId: "chainId" };
//       const chain = { getAddress: async () => "rbacAddress" };

//       viemModule.pad = (id) => id;
//       getChainFromData = async () => chain;

//       const result = await removeOwnerTxParams(params);
//       expect(result).to.be.a("string");
//     });
//   });
// });
