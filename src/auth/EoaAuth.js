const { Auth } = require('./Auth')
class EoaAuth extends Auth {
    constructor(eoa) {
        super()
        this.eoa = eoa
    }
}

module.exports = {EoaAuth}