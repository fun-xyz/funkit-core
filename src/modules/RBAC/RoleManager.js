const { PrimitiveModule } = require("../PrimitiveModule")
const { Enum } = require('../../../utils/Enum')
const ethers = require('ethers')
const ABI = ethers.utils.defaultAbiCoder
const { ROLE_MANAGEMENT_MODULE_NAME } = require('../Module')

const KeywordData = [
    "GREATER",
    "LESS",
    "EQUAL",
    "GREATER_OR_EQUAL",
    "LESS_OR_EQUAL",
    "NOT_EQUAL",
    "WILDCARD"
]

const Keyword = new Enum(KeywordData)

class Rule {
    constructor(action, target, keyword, extent) {
        if (!action || !target || !extent || !KeywordData[keyword]) {
            throw Error("Action, target, keyword, and extent are needed to create a rule")
        }
        this.action = ethers.utils.formatBytes32String(action)
        this.target = target
        this.keyword = keyword
        this.extent = ABI.encode(['uint256'], [extent])
    }
}

class RoleManager extends PrimitiveModule {

    init() {
        this.name = ROLE_MANAGEMENT_MODULE_NAME
    }

    // modify role through userOp
    async createRoleTx(roleName, moduleAddr, rules) {
        if (!roleName || !moduleAddr || !rules || rules.length == 0) {
            throw Error("Role name, module address and rules are needed to create a role")
        }
        rules.forEach((rule) => {
            if (!(rule instanceof Rule)) {
                throw Error("Rule must be of type Rule")
            }
        })
        const roleNameBytes = ethers.utils.formatBytes32String(roleName)
        const txData = await this.wallet.contract.contract.populateTransaction.createRole(roleNameBytes, moduleAddr, rules)
        return await this.createUserOpFromCallData(txData, 0, false, true)
    }

    async attachRuleToRoleTx(roleName, moduleAddr, rule) {
        if (!roleName || !moduleAddr || !rule || !(rule instanceof Rule)) {
            throw Error("Role name, module address and rules are needed to attach a rule to a role")
        }
        const roleNameBytes = ethers.utils.formatBytes32String(roleName)
        const txData = await this.wallet.contract.contract.populateTransaction.attachRuleToRole(roleNameBytes, moduleAddr, rule)
        return await this.createUserOpFromCallData(txData, 0, false, true)
    }

    async removeRuleFromRoleTx(roleName, moduleAddr, rule) {
        if (!roleName || !moduleAddr || !rule || !(rule instanceof Rule)) {
            throw Error("Role name, module address and rules are needed to remove a rule from a role")
        }
        const roleNameBytes = ethers.utils.formatBytes32String(roleName)
        const txData = await this.wallet.contract.contract.populateTransaction.removeRuleFromRole(roleNameBytes, moduleAddr, rule)
        return await this.createUserOpFromCallData(txData, 0, false, true)
    }

    // read role, not through userOp
    async getRulesOfRole(roleName, moduleAddr) {
        if (!roleName || !moduleAddr) {
            throw Error("Role name, module address and rules are needed to get rules of a role")
        }
        const roleNameBytes = ethers.utils.formatBytes32String(roleName)
        return await this.wallet.contract.contract.getRulesOfRole(roleNameBytes, moduleAddr)
    }
}

module.exports = { Keyword, RoleManager, Rule }