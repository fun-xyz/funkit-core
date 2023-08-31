import { AutomatedActionsConfig, AutomatedActionsTest } from "../testUtils/AutomatedActions"

const config: AutomatedActionsConfig = {
    chainId: 1,
    baseToken: "eth",
    prefundAmt: 0.025
}
AutomatedActionsTest(config)
