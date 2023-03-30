const { Eoa } = require("./EoaAuth");


class WalletConnectEoa extends Eoa {
    constructor(input) {
        super(input)
        this.provider = input.provider
    }
    async signHash(hash) {
        const address = await this.getUniqueId()
        return await this.provider.send("personal_sign",
            [hash, address],
        )
    }

    async sendTx(txData, options = global) {
        if (typeof txData == "function") {
            txData = await txData(options)
        }
        const { to, value, data, chain } = txData
        const address = await this.getUniqueId()
        let accValue = value
        if (accValue) {
            accValue = accValue.toString()
        }
        const txhash = await this.provider.send("eth_sendTransaction",
            [{ to, value: accValue, data, from: address }],
        )
        return await this.provider.waitForTransaction(txhash)
    }

    async sendTxs(txs, options = global) {
        const receipts = []
        for (let tx of txs) {
            receipts.push(await this.sendTx(tx, options))
        }
        return receipts
    }
}

module.exports = { WalletConnectEoa }