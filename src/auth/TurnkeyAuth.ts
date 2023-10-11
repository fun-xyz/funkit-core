import { TurnkeyClient, getWebAuthnAttestation } from "@turnkey/http"
import { createAccount } from "@turnkey/viem"
import { WebauthnStamper } from "@turnkey/webauthn-stamper"
import axios from "axios"
import { createWalletClient, http } from "viem"
import { goerli } from "viem/chains"
import { Auth } from "./Auth"
import { AuthInput } from "./types"

export class TurnkeyAuth extends Auth {
    rpId: string
    subOrgId?: string
    constructor(authInput: AuthInput, rpId: string, subOrgId?: string) {
        super(authInput)
        // Create this.client and set it to the viem client
        this.rpId = rpId
        this.subOrgId = subOrgId
    }

    async getSubOrgId(): Promise<string> {
        if (this.subOrgId) {
            return this.subOrgId
        }
        const challenge = generateRandomBuffer()
        const subOrgName = `Turnkey Viem+Passkey Demo - ${humanReadableDateTime()}`
        const authenticatorUserId = generateRandomBuffer()

        const attestation = await getWebAuthnAttestation({
            publicKey: {
                rp: {
                    id: "localhost",
                    name: "Turnkey Viem Passkey Demo"
                },
                challenge,
                pubKeyCredParams: [
                    {
                        type: "public-key",
                        // All algorithms can be found here: https://www.iana.org/assignments/cose/cose.xhtml#algorithms
                        // Turnkey only supports ES256 at the moment.
                        alg: -7
                    }
                ],
                user: {
                    id: authenticatorUserId,
                    name: subOrgName,
                    displayName: subOrgName
                }
            }
        })

        const res = await axios.post("/api/createSubOrg", {
            subOrgName: subOrgName,
            attestation,
            challenge: base64UrlEncode(challenge)
        })
        this.subOrgId = res.data.subOrgId
        return this.subOrgId!
    }

    override async init(): Promise<void> {
        if (this.inited) {
            return
        }

        const stamper = new WebauthnStamper({
            rpId: this.rpId
        })
        const passkeyHttpClient = new TurnkeyClient(
            {
                baseUrl: "https://api.turnkey.com"
            },
            stamper
        )
        const signedRequest = await passkeyHttpClient.stampCreatePrivateKeys({
            type: "ACTIVITY_TYPE_CREATE_PRIVATE_KEYS_V2",
            organizationId: await this.getSubOrgId(),
            timestampMs: String(Date.now()),
            parameters: {
                privateKeys: [
                    {
                        privateKeyName: `ETH Key ${Math.floor(Math.random() * 1000)}`,
                        curve: "CURVE_SECP256K1",
                        addressFormats: ["ADDRESS_FORMAT_ETHEREUM"],
                        privateKeyTags: []
                    }
                ]
            }
        })
        const response = await axios.post("/api/createKey", signedRequest)
        const privateKey = {
            id: response.data["privateKeyId"],
            address: response.data["address"]
        }
        const viemAccount = await createAccount({
            client: passkeyHttpClient,
            organizationId: await this.getSubOrgId(),
            privateKeyId: privateKey.id,
            ethereumAddress: privateKey.address
        })

        const viemClient = createWalletClient({
            account: viemAccount,
            chain: goerli,
            transport: http()
        })
        this.client = viemClient
        this.account = viemAccount.address
        this.authId ??= this.account
        this.inited = true
    }
}

const humanReadableDateTime = (): string => {
    return new Date().toLocaleString().replace(/\//g, "-").replace(/:/g, ".")
}

const base64UrlEncode = (challenge: ArrayBuffer): string => {
    return Buffer.from(challenge).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

const generateRandomBuffer = (): ArrayBuffer => {
    const arr = new Uint8Array(32)
    crypto.getRandomValues(arr)
    return arr.buffer
}
