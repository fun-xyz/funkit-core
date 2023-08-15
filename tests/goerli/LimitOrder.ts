import { AutomatedActionsConfig, AutomatedActionsTest } from "../testUtils/AutomatedActions"

const config: AutomatedActionsConfig = {
    chainId: 5,
    outToken: "0x94CECF09210af7613143e96F01Fba3E4132E6d35",
    baseToken: "0xd2D994B58FA5d23d0CC8102dD97EDd1251Ae629f",
    prefund: true,
    prefundAmt: 0.2
}
AutomatedActionsTest(config)
