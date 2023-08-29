import { AutomatedActionsConfig, AutomatedActionsTest } from "../testUtils/AutomatedActions"

const config: AutomatedActionsConfig = {
    chainId: 5,
    baseToken: "matic",
    prefundAmt: 1
}
AutomatedActionsTest(config)
