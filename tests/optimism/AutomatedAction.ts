import { AutomatedActionsConfig, AutomatedActionsTest } from "../testUtils/AutomatedActions"

const config: AutomatedActionsConfig = {
    chainId: 10,
    baseToken: "eth",
    prefundAmt: 0.005
}
AutomatedActionsTest(config)
