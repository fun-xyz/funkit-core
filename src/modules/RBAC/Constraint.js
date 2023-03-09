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

class Constraint {
    constructor(action, target, keyword, extent) {
        if (!action || !target || !extent || !KeywordData[keyword]) {
            throw Error("Action, target, keyword, and extent are needed to create a constraint")
        }
        this.action = ethers.utils.formatBytes32String(action)
        this.target = target
        this.keyword = keyword
        this.extent = ABI.encode(['uint256'], [extent])
        this.constraintId = getConstraintId()
    }

    async updateAction(action) {
        //assume roleName, moduleAddr is there
    }

    async updateTarget(target) {
        //assume roleName, moduleAddr is there
    }

    async updateKeyword(keyword) {
        //assume roleName, moduleAddr is there
    }

    async updateExtent(extent) {
        //assume roleName, moduleAddr is there
    }

    async getConstraintId() {
        
    }
}

module.exports = { Keyword, Constraint }