
class Enum {
    constructor(data) {
        data.map((type, i) => { this[type] = i })
    }
}


module.exports = { Enum }