load(){
    node test/loader.js            
}

pDeploy(){
    node test/paymasterDeployer.js
}

all(){
    load
    pDeploy
}