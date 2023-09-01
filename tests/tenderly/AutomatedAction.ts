import { AutomatedActionsConfig, AutomatedActionsTest } from "../testUtils/AutomatedActions"

const config: AutomatedActionsConfig = {
    chainId: 36865,
    baseToken: "eth",
    prefundAmt: 0.2
}
AutomatedActionsTest(config)
