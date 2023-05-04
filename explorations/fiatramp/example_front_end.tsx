const {FunWallet} = require("../../../wallet")
const {configureEnvironment} = require("../../../managers")
const {Eoa} = require("../../../auth")
const { ethers } = require("ethers")
const {useState} = require("react")

declare global {
  interface Window {
    ethereum: any
  }
}

export default function Page() {
  const [visible, setVisible] = useState(false);
  const [onrampStr, setOnrampStr] = useState("");

  const show = () => {
    setVisible(true);
  }

  const hide = () => {
    setVisible(false);
  }

  const handleOn = async () => {
    await configureEnvironment({
        apiKey: "dzRNnQ3C567eKkTMnbB3R1JgNnEYcxNO7Fc4EhqE"
    })
    let provider;
    if (window.ethereum == null) {
        console.log("MetaMask not installed; using read-only defaults")
        provider = ethers.getDefaultProvider()

    } else {
        provider = new ethers.BrowserProvider(window.ethereum)
    }
    await provider.send('eth_requestAccounts', [])
    const eoa = provider
    const auth = new Eoa({ provider: eoa })
    const uniqueId = await auth.getUniqueId()
    const wallet = new FunWallet({ uniqueId })
    const url =  await wallet.onramp()
    setOnrampStr(url)
    show()
  }

  const handleOff = async () => {
    await configureEnvironment({
        apiKey: "dzRNnQ3C567eKkTMnbB3R1JgNnEYcxNO7Fc4EhqE"
    })
    let provider;
    if (window.ethereum == null) {
        console.log("MetaMask not installed; using read-only defaults")
        provider = ethers.getDefaultProvider()

    } else {
        provider = new ethers.BrowserProvider(window.ethereum)
    }
    await provider.send('eth_requestAccounts', [])
    const eoa = provider
    const auth = new Eoa({ provider: eoa })
    const uniqueId = await auth.getUniqueId()
    const wallet = new FunWallet({ uniqueId })
    const url =  await wallet.offramp()
    setOnrampStr(url)
    show()
  }

  return (
  <>
  <div className="flex flex-col justify-between">
    <button className="mb-4" onClick={handleOn}>onramp</button>
    <button onClick={handleOff}>offramp</button>
  </div>


      {visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50"></div>

          <div className="relative z-10">
            <button onClick={hide}>Close</button>

            <iframe
              className="border-radius: 4px; border: 1px solid #58585f; margin: auto;max-width: 420px"
              src={onrampStr}
              height="630px"
              width="420px"
              title="Onramper widget"
              allow="accelerometer; autoplay; camera; gyroscope; payment">
            </iframe>
          </div>
        </div>
      )}
    </>
  )
}