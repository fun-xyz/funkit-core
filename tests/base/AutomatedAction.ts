import { AutomatedActionsConfig, AutomatedActionsTest } from "../testUtils/AutomatedActions"

const config: AutomatedActionsConfig = {
    chainId: 8453,
    baseToken: "eth",
    prefundAmt: 0.025
}
AutomatedActionsTest(config)
