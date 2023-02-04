const list = require('./coinGecko.json')
const fetch = require('node-fetch')
var fs = require('fs');
const res = []
// list.map((x)=>{
// fetch(`https://api.coingecko.com/api/v3/coins/${"usd-coin"}`).then(res=>res.json()).then(r=>(r.detail_platforms))
// })
const promises = []
// const awaitTimeout = delay =>new Promise(resolve => setTimeout(resolve, delay));

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function getInfo(data){
    return fetch(`https://api.coingecko.com/api/v3/coins/${data.id}`).then(res => res.json()).then(r => {
        let obj = {
            detail_platforms: r.detail_platforms,
            ...data
        }
        return obj

    })
}
const main = async () => {
    for (let i = 0; i < list.length; i++) {
        try{
            await timeout(10000)
            const obj=await getInfo(list[i])
            res.push(obj)
            const json = JSON.stringify(res)
            fs.writeFile('result.json', json, 'utf8', () => { });
            console.log(obj, r.status, i)
        }
        catch{
            i--;
        }
        
        // promises.push(
        //     setTimeout(() => {
        //         fetch(`https://api.coingecko.com/api/v3/coins/${list[i].id}`).then(res => res.json()).then(r => {
        //             let obj = {
        //                 detail_platforms: r.detail_platforms,
        //                 ...list[i]
        //             }
        //             res.push(obj)
        //             console.log(obj)
        //         })
        //     }, 5000 * i)

        // )



    })

    // Promise.all(promises).then(() => {
    //     const json = JSON.stringify(res)
    //     fs.writeFile('result.json', json, 'utf8', () => { });
    // })
}


main()

