const { Constraint } = require("./Constraint")

const AuthTypeData = [
    "ECDSA"
]

const AuthType = new Enum(AuthTypeData)

class Role {
    constructor(roleName, moduleAddr, authType, constraints) {
        if (!roleName || !moduleAddr || !AuthType[authType]) {
            throw Error("RoleName, moduleAddr, and authType is needed to create a role")
        }
        if (constraints.map(constraint => !(constraint instanceof Constraint))) {
            throw Error("Constraints are needed to create a role")
        }
        this.roleName = roleName
        this.moduleAuthTypeConstraints = new Map([[moduleAddr, new Map([[authType, constraints]])]])
    }

    async addModuleWithConstraints(moduleAddr, constraint) {
        // xxxxx
        // const constraints=this.moduleConstraints.get(moduleAddr)
        // constraint.roleName = this.roleName
        // constraint.moduleAddr = moduleAddr
        // constraint.authType = 
    }

    async addModuleConstraints(module, constraints) {

    }

    async removeModule(module) {

    }

    async addConstraintToModule(module, constraint) {

    }

    async removeModuleConstraint(module, constraint) {

    }

    async getModuleConstraints(module) {

    }
}