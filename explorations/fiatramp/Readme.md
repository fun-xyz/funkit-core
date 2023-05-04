# ON/OFF Ramp Exploration
Most of the fiat onramp providers have a live website widget which takes paramters in the url. Today, the Fun onramp implementation shown in this branch adds `.onramp()` and `.offramp()` functions to the highest level `FunWallet` class. These functions simply create a url which should be passed into an iframe on the frontend, or crafted into a javascript component in the coming web SDK. 

Currently, the on and off ramp is implemented in Transak with a test API key, in thier staging environment. Good news is that it works! Bad news is that it does not offer an offramp service. To use it, sign up for an account and grab the staging enviornment api key from the dashboard. 

I have left comments on how to refactor the code to use MoonPay, which does offer an offramp service. Unfortuantley, it does not make sense to implement Moonpay until getting in contact with them, because they need to provide a dashboard login on their end. However, the refactor is relatively simple, with only the addition of singing in the AWS api. 

## Shootout
For choice of providers, I have looked at the following options sorted best first with reasonings:
- MoonPay - built on the same market maker as Stripe and Transak, and is the only solution to offer an offramp in the United States. Like all the other options, this will require KYB. Moonpay seems to come up frequently in discord discussions as a better alternative for onramping. This takes the place over Transak due to the fact that it offers an offramp service, and still has manageable overhead. The current implementation using Transak matches the same pattern as MoonPay's browser integration.
- Transak - All the similar benefits of moonpay including active support, but does not offer an offramp in the United States.
- Stripe - This is the most trusted brand but does not offer an offramp service and will require more complex session management. 
- Onramper - does not quite match our needs. seems to be for folks who already have one onramp service and want to add more easily. They also have a 200/month fee on top of the provider's fees. Does not offer onramp despite the sales rep saying they do. 
- ramp - seems to be a dead project according to the discord having tons of people asking questions with no response. their configuration options did not work. 

## Offramp with moonpay
The offramp with moonpay uses PLAID and waits for the user to transfer to thier address, similar to the coinbase flow. This means that in the webSDK the user must have access to the transfer function at the same time as the offramp iFrame. A good solution could be to provide a custom javascript object with the moonpay frame embedded and a transfer button exposed (possibly pre-populated with the moonpay ETH address)
