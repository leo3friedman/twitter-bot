const axios = require('axios');

const userIDs = {
    ethane1x: "1116902285945163776",
    freoleo02: "1475147960908271621",
    gafort: "1432840694171852802",
    nxv_singh: "1451320550693883908",
    julialikesnfts: "1277305221572628480",
    danieldessert: "2915156114"
}

const options = {
    headers: {
        Authorization: "Bearer AAAAAAAAAAAAAAAAAAAAAN8EYAEAAAAAN83bItWvS%2FLVb%2FgtMv4%2BvRZ7yvU%3DsZR1K6Fcc1eW55Jsv71u6omYk5UrZo3afA8eU1gKGN0xBvQnti"
    }
};

const { GoogleSpreadsheet } = require('google-spreadsheet');

const creds = require('./credentials.json'); // the file saved above

const doc = new GoogleSpreadsheet('1mwkrcICr-NKVO8NbmmmNHuxk557bQ27BIlqb_UPOx3I');

async function logData(sheet, data){
    await sheet.addRows(data);
}
function generateURL(id){
    const url = "https://api.twitter.com/2/users/%s/following?max_results=1000"
    return url.replace("%s", id);
}
function getDate(){
    const date = new Date();
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0'); //January is 0!
    const yyyy = date.getFullYear();
    return mm + '/' + dd + '/' + yyyy;
}

// function getAndLogData(user, options, sheet, blockedList, addToBlockList){
//     axios.get(generateURL(userIDs[user]), options)
//         .then(function (response) {
//             let data = [];
//             response.data.data.forEach((d)=>{
//                 let addToSheet = true;
//                 blockedList.forEach((username)=>{
//                     if(username === "@"+d.username){
//                         addToSheet = false;
//                     }
//                 })
//                 if(addToSheet){
//                     if(addToBlockList){
//                         data.push({date_collected: getDate(),username: "@" + d.username})
//                     } else {
//                         data.push({date_collected: getDate(),username: "@" + user, new_follower: "@" + d.username})
//                     }
//                 }
//             })
//             logData(sheet, data);
//         })
// }
async function getAndLogData(user, options, sheets, blockedList){
    // usersTracking.forEach((user)=>{
        axios.get(generateURL(user.id), options).then((response)=>{
            let data = []
            response.data.data.forEach((obj)=>{
                if(!blockedList.includes("@"+obj.username)){
                    data.push({date_collected: getDate(), tracked_account: user.username, new_follower: "@" + obj.username, blocked: "@" + obj.username})
                }
            })
            // logData(sheets.newFollowers, data)
            logData(sheets.blockedList, data)
        // })
    })
}

async function main(){





}

async function getUserTracking(){
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    const sheets = {
        newFollowers: doc.sheetsByIndex[0],
        usersTracking: doc.sheetsByIndex[1],
        blockedList: doc.sheetsByIndex[2]
    }
    const usersTrackingRows = await sheets.usersTracking.getRows();
    let usersTracking = [];
    usersTrackingRows.forEach((row)=>{
        usersTracking.push({username: row.username, id: row.id})
    })
    return usersTracking
}

async function getBlockedList(){
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    const sheets = {
        newFollowers: doc.sheetsByIndex[0],
        usersTracking: doc.sheetsByIndex[1],
        blockedList: doc.sheetsByIndex[2]
    }
    const blockedRows = await sheets.blockedList.getRows();
    let blockedList = [];
    blockedRows.forEach((row)=>{
        blockedList.push(row.blocked)
    })
    return blockedList
}

function start(){
    getUserTracking().then(value => {
        value.forEach(user=>{

        })
    })
}
start();

// (async function() {
//     await doc.useServiceAccountAuth(creds);
//     await doc.loadInfo();
//     console.log(doc.title);
//     const sheets = {
//         newFollowers: doc.sheetsByIndex[0],
//         usersTracking: doc.sheetsByIndex[1],
//         blockedList: doc.sheetsByIndex[2]
//     }
//
//     const usersTrackingRows = await sheets.usersTracking.getRows();
//     let usersTracking = [];
//     usersTrackingRows.forEach((row)=>{
//         usersTracking.push({username: row.username, id: row.id})
//     })
//     console.log(usersTracking)
// }());

(async function() {
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    console.log(doc.title);
    const sheets = {
        newFollowers: doc.sheetsByIndex[0],
        usersTracking: doc.sheetsByIndex[1],
        blockedList: doc.sheetsByIndex[2]
    }

    const usersTrackingRows = await sheets.usersTracking.getRows();
    let usersTracking = [];
    usersTrackingRows.forEach((row)=>{
        usersTracking.push({username: row.username, id: row.id})
    })
    // console.log(usersTracking)



    // usersTracking.forEach((user)=>{
    //     (async function(){
    //         const blockedRows = await sheets.blockedList.getRows();
    //         let blockedList = [];
    //         blockedRows.forEach((row)=>{
    //             blockedList.push(row.blocked)
    //         })
    //         return blockedList
    //         // await getAndLogData(user, options, sheets, blockedList)
    //     }()).then((value)=>{
    //         console.log(value)
    //         getAndLogData(user, options, sheets, value)
    //     })
    // })
    // const blockedRows = await sheets.blockedList.getRows();
    // let blockedList = [];
    // blockedRows.forEach((row)=>{
    //     blockedList.push(row.blocked)
    // })
    // console.log(blockedList)
    // await getAndLogData(usersTracking[0], options, sheets, blockedList)


    const blockedRows = await sheets.blockedList.getRows();
    let blockedList = [];
    blockedRows.forEach((row)=>{
        blockedList.push(row.username)
    })
    // await getAndLogData(usersTracking[0], options, sheets, blockedList)


    // getAndLogData("danieldessert", options, sheet2, blockList, true)
    // getAndLogData("danieldessert", options, sheet1, blockList, false)

    await sheets.newFollowers.saveUpdatedCells()
    await sheets.blockedList.saveUpdatedCells()
}());