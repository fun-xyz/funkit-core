import { AutomatedActionsConfig, AutomatedActionsTest } from "../testUtils/AutomatedActions"

const config: AutomatedActionsConfig = {
    chainId: 5,
    baseToken: "eth",
    prefundAmt: 0.001
}
AutomatedActionsTest(config)
