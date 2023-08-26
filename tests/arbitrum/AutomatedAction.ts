import { AutomatedActionsConfig, AutomatedActionsTest } from "../testUtils/AutomatedActions"

const config: AutomatedActionsConfig = {
    chainId: 5,
    outToken: "0x712110295e4eCc0F46dC06684AA21263613b08dd",
    baseToken: "eth",
    prefundAmt: 0.001
}
AutomatedActionsTest(config)
