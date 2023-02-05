class Module {
    getRequiredPreTxs() {
        return []
    }
    verifyRequirements() {
        return true
    }

    innerAddData(wallet) {
        Object.keys(wallet).forEach(varKey => {
            this.wallet[varKey] = wallet[varKey]
        })
    }
}

module.exports = { Module }