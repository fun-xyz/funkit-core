class ModuleManager {
    modules = {}

    constructor(chainId) {
        this.chainId = chainId

    }

    async addModule(module) {
        await module.init(this.chainId)
        this.modules[module.name] = module
    }

    async removeModule(module) {
        delete this.modules[module.name]
    }
}

module.exports = { ModuleManager }