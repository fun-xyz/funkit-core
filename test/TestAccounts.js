const { DataServer} = require('../utils/DataServer')
require('dotenv').config();

const dataServer = new DataServer(process.env.API_KEY);

async function main(){
  try {
    await dataServer.init();
    await saveAccount();
    await getAccount("user-1")
    await getAccounts()
  } catch(e){
    console.log(e)
  }
}

async function saveAccount(){
  console.log("Saving a test wallet");
  try {
    await dataServer.storeWallet({
      user_id: "user-1",
      address: "0xe748a6517a8c793ade77587ef3bf5b637be6fcaab3ce85c74016a7b63339c34d",
      chain_id: "1",
      roles: [
          {
              "role_hash": "0x68bd0727895fad9287e479f200ec59c8d8788eb7db1c1ea45d79a9d18fb3f679",
              "modules": [
                  {
                      "module_address": "0xee4d7c2cfa2e14714dd39b2b2be948194e7ae779444a48f08f0b2fbd3197fc65",
                      "constraints": [
                          { // constraint_index
                              "authType": "eoa",
                              "action": "erc-20-token-swap", // action_id (not ready)
                              "target": "0x3beea18c26b1aea7a418ac95162e59e8f2dbcc37df36454d412680bd6aa297547046124bf4da2eac0509f7615395a95e105205341d32ed8d7423ce3ef44631b1", // bytes
                              "keyword": 0, // keyword_enum_index
                              "extent": 1000 // extent
                          }
                      ]
                  }
              ]
          }
      ],
      users: [
        {
          "user_hash": "0xa9a71280343340eeab53383677453040a928576f11f080b8a34adb47f8a25f43",
          "roles": [
              "0x68bd0727895fad9287e479f200ec59c8d8788eb7db1c1ea45d79a9d18fb3f679", // role_hash
              "0xe5ac0d1c8da59efb9db254194a1c06a111873d0b6c080a26cbd0d81913b45707"
          ]
        }
      ] //users data
    })

    await dataServer.storeWallet({
      user_id: "user-2",
      address: "0xt5votye5otep4tvetodetke48otyven475yot7n5cteoe4mdte4octetcoe5",
      chain_id: "43113",
      roles: [
          {
              "role_hash": "0x354o5v34o5nyn5o3hfo3drh3orch3kroc3rhm43orc43",
              "modules": [
                  {
                      "module_address": "0xee4d7c2cfa2e14714dd39b2b2be948194e7ae779444a48f08f0b2fbd3197fc65",
                      "constraints": [
                          { // constraint_index
                              "authType": "eoa",
                              "action": "erc-20-token-swap", // action_id (not ready)
                              "target": "0x3beea18c26b1aea7a418ac95162e59e8f2dbcc37df36454d412680bd6aa297547046124bf4da2eac0509f7615395a95e105205341d32ed8d7423ce3ef44631b1", // bytes
                              "keyword": 0, // keyword_enum_index
                              "extent": 1000 // extent
                          }
                      ]
                  }
              ]
          }
      ],
      users: [
        {
          "user_hash": "0xtvhe4toe4hntetdoecntoe5theo4rskwrcn4eh7togen5gxke5gcne5og",
          "roles": [
              "0x354o5v34o5nyn5o3hfo3drh3orch3kroc3rhm43orc43", // role_hash
              "0xe5ac0d1c8da59efb9db254194a1c06a111873d0b6c080a26cbd0d81913b45707"
          ]
        }
      ] //users data
    })

    console.log("Saved");
  } catch(e){
    console.log(e)
  }
}

async function getAccount(user_id){
  console.log("Getting an account")
  try {
    const account = await dataServer.getUserData(user_id);
    console.log(account)
  } catch(e) {
    console.log(e)
  }
}

async function getAccounts(){
  console.log("Getting all accounts from api key org")
  try {
    const accounts = await dataServer.getAllUserData();
    console.log(accounts)
  } catch(e) {
    console.log(e)
  }
}

main()

