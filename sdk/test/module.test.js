const { AAVEWithdrawal } = require("../src/modules/AAVEWithdrawal")




const main = async () => {

    const module = new AAVEWithdrawal("0xFc7215C9498Fc12b22Bc0ed335871Db4315f03d3", "43113")
    const txs = await module.getPreExecTxs()
    console.log(txs)
}

main()