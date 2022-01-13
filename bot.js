const axios = require('axios');

const options = {
    headers: {
        Authorization: "Bearer AAAAAAAAAAAAAAAAAAAAAN8EYAEAAAAAN83bItWvS%2FLVb%2FgtMv4%2BvRZ7yvU%3DsZR1K6Fcc1eW55Jsv71u6omYk5UrZo3afA8eU1gKGN0xBvQnti"
    }
};

const { GoogleSpreadsheet } = require('google-spreadsheet');

const creds = require('./credentials.json'); // the file saved above

const doc = new GoogleSpreadsheet('1mwkrcICr-NKVO8NbmmmNHuxk557bQ27BIlqb_UPOx3I');

async function logDataToSheet(data, sheet){
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

function getTwitterData(user, options){
    return axios.get(generateURL(user.id),options)
}

function getNewFollowers(data, blockedList){
    return data.filter(a=>!blockedList.includes(a))
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

async function main(){
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    console.log(doc.title);
    const sheets = {
        newFollowers: doc.sheetsByIndex[0],
        usersTracking: doc.sheetsByIndex[1],
        blockedList: doc.sheetsByIndex[2]
    }

    const usersTracking = getUserTracking()

    usersTracking.then(response=>{
        const user = response[0];
        const twitterData = getTwitterData(user, options);
        twitterData.then(response=>{
            const twitterFollowing = response.data.data.map(a=>a.username);
            getBlockedList().then(response => {
                const newFollowers = getNewFollowers(twitterFollowing, response)
                const loggableData = newFollowers.map(a=> {
                        return {date_collected: getDate(),tracked_account:user.username, new_follower: a, blocked: a}
                    }
                )
                logDataToSheet(loggableData, sheets.newFollowers);
                logDataToSheet(loggableData, sheets.blockedList);
            })
        })
    })
    await sheets.newFollowers.saveUpdatedCells()
    await sheets.blockedList.saveUpdatedCells()
}
main();

