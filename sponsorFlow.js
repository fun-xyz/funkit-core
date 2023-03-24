const envOptions = {
    gasSponsor: {
        sponsorAddress: "", // Dev-specific
        token: ""
    }, // Defaults to
}
FunAccountManager.configureEnvironment(envOptions)

// 3.5 GasSponsor
// For both non paying and token paying flows. This can be included in environment config
// Also, if no environment config, then will need to provide info
const funder = web3.provider.getSigner();
const tokenSponsor = new GasSponsor.TokenSponsor(); // TokenSponsor subclasses from GasSponsor, no need for GasSponsor.TokenSponsor()

await funder.sendTx(tokenSponsor.whitelistMode());
await funder.sendTx(tokenSponsor.whitelist(wallet.getAddress()));
await funder.sendTx(tokenSponsor.stake(funder.adddress, amount)) // tokenSponsor.stake(), not tokenActionSponsor.addEthDepositForSponsorer()

await funder.sendTx(tokenSponsor.blacklistMode());
await funder.sendTx(tokenSponsor.blacklist(wallet.getAddress())); // isn't doing anything here just showing flow

FunAccountManager.setEnvironmentVariable(gasSponsor.type = tokenActionSponsor)

await funder.sendTx(tokenSponsor.stakeToken(token, amount, wallet.getAddress())); // tokenSponsor.stakeToken() as opposed to tokenActionSponsor.addTokenDepositTo()

// If default sponsor address + token is not supplied, need to do this
tokenSponsor = await wallet.transfer(to, amount, "USDC", { actionSponsor: { sponsorAddress: funder.getAddress(), token: "USDC" } })

// If the wallet is already created, then you can use approve flow:
await wallet.approve(tokenSponsor.getAddress(), "USDC", amount);
