const ETHEREUM = {
    GOERLI: {
        RPC: "https://goerli.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7",
        PRIVKEY: "6270ba97d41630c84de28dd8707b0d1c3a9cd465f7a2dba7d21b69e7a1981064", //ensure
        TO: "0xDc054C4C5052F0F0c28AA8042BB333842160AEA2",
        USDC_ADDR: "0x07865c6E87B9F70255377e024ace6630C1Eaa37F",
        CHAIN: "5",
        PREFUNDAMT: 0,
        ADAIADDRESS: "0xADD98B0342e4094Ec32f3b67Ccfd3242C876ff7a",
        DAIADDRESS: "0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60",
        WETHADDRESS: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
        FUNDERADDRESS: "0x38835ddaC97596c0240048f371C4c89495814B48"
    }
}
const AVALANCHE = {
    FUJI: {
        RPC: "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7",
        PRIVKEY: "6270ba97d41630c84de28dd8707b0d1c3a9cd465f7a2dba7d21b69e7a1981064", //ensure
        TO: "0xDc054C4C5052F0F0c28AA8042BB333842160AEA2",
        USDC_ADDR: "0x5425890298aed601595a70AB815c96711a31Bc65",
        CHAIN: "43113",
        PREFUNDAMT: 0,
        ADAIADDRESS: "0x7021eB315AD2Ce787E3A6FD1c4a136c9722457Cc"
    }
}
const POLYGON = {
    MUMBAI: {

    },
    MAIN: {

    }
}



module.exports = { ETHEREUM, AVALANCHE, POLYGON }