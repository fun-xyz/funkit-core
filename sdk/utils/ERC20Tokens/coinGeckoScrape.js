const list = require('./coinGecko.json')
const fetch = require('node-fetch')
var fs = require('fs');
const res = []
// list.map((x)=>{
// fetch(`https://api.coingecko.com/api/v3/coins/${"usd-coin"}`).then(res=>res.json()).then(r=>(r.detail_platforms))
// })
const promises = []
const awaitTimeout = delay =>
    new Promise(resolve => setTimeout(resolve, delay));
const main = () => {
    for (let i = 0; i < list.length; i++) {

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
        promises.push(
            awaitTimeout(10000*i).then(() => {

                fetch(`https://api.coingecko.com/api/v3/coins/${list[i].id}`).then(res => res.json()).then(r => {
                    let obj = {
                        detail_platforms: r.detail_platforms,
                        ...list[i]
                    }
                    res.push(obj)
                    console.log(obj,r.status)
                })
            })
        )
    }
    Promise.all(promises).then(() => {
        const json = JSON.stringify(res)
        fs.writeFile('result.json', json, 'utf8', () => { });
    })
}


main()

