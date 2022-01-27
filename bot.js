const { format } = require("date-fns");
const axios = require("axios");

const options = {
  headers: {
    Authorization:
      "Bearer AAAAAAAAAAAAAAAAAAAAAN8EYAEAAAAAN83bItWvS%2FLVb%2FgtMv4%2BvRZ7yvU%3DsZR1K6Fcc1eW55Jsv71u6omYk5UrZo3afA8eU1gKGN0xBvQnti",
  },
};

const { GoogleSpreadsheet } = require("google-spreadsheet");

const creds = require("./credentials.json"); // the file saved above

const doc = new GoogleSpreadsheet(
  "1mwkrcICr-NKVO8NbmmmNHuxk557bQ27BIlqb_UPOx3I"
);

async function logDataToSheet(data, sheet) {
  await sheet.addRows(data);
}

function generateURL(id) {
  const url = "https://api.twitter.com/2/users/%s/following?max_results=1000";
  return url.replace("%s", id);
}

function getDate() {
  const date = new Date();
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0"); //January is 0!
  const yyyy = date.getFullYear();
  return mm + "/" + dd + "/" + yyyy;
}

function getUserFollowing(id, options) {
  return axios.get(`https://api.twitter.com/2/users/${id}/following`, options);
  // return axios.get(generateURL(user.id), options);
}
function getUserInfo(id) {
  return axios.get(
    `https://api.twitter.com/2/users?ids=${id}&user.fields=public_metrics`,
    options
  );
}

function getNewFollowers(data, blockedList) {
  return data.filter((a) => !blockedList.includes(a));
}

async function getUserTracking() {
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  const sheets = {
    newFollowers: doc.sheetsByIndex[0],
    usersTracking: doc.sheetsByIndex[2],
    blockedList: doc.sheetsByIndex[3],
  };
  const usersTrackingRows = await sheets.usersTracking.getRows();
  let usersTracking = [];
  usersTrackingRows.forEach((row) => {
    usersTracking.push({ username: row.username, id: row.id });
  });
  return usersTracking;
}

async function getBlockedList() {
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  const sheets = {
    newFollowers: doc.sheetsByIndex[0],
    usersTracking: doc.sheetsByIndex[1],
    blockedList: doc.sheetsByIndex[3],
    blockedList2: doc.sheetsByIndex[4],
  };
  // const blockedRows = await sheets.blockedList.getRows();
  const blockedRows = await sheets.blockedList2.getRows();
  let blockedList = [];
  blockedRows.forEach((row) => {
    blockedList.push(row.blocked);
  });
  return blockedList;
}

function isNotable(followers, following) {
  return (followers + 1) / (following + 1) > 10;
}

async function reorderUserTracking(users, sheet) {
  await sheet.loadCells("A1:B20").then(() => {
    for (let i = 1; i < users.length; i++) {
      const aCell = sheet.getCell(i, 0);
      const bCell = sheet.getCell(i, 1);

      aCell.value = users[i].username;
      bCell.value = users[i].id;
    }
    const lastACell = sheet.getCell(users.length, 0);
    const lastBCell = sheet.getCell(users.length, 1);

    lastACell.value = users[0].username;
    lastBCell.value = users[0].id;
  });
  await sheet.saveUpdatedCells();
}

async function main() {
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  const sheets = {
    newFollowers: doc.sheetsByIndex[0],
    newFollowers2: doc.sheetsByIndex[1],
    usersTracking: doc.sheetsByIndex[2],
    blockedList: doc.sheetsByIndex[3],
    blockedList2: doc.sheetsByIndex[4],
  };

  const usersTracking = await getUserTracking();

  await reorderUserTracking(usersTracking, sheets.usersTracking);
  const user = usersTracking[0];
  console.log("tracking... " + user.username);
  if (user.username === "gafort") console.log("Last One!");
  const twitterData = await getUserFollowing(user.id, options);
  // const userFollowing = twitterData.data.data.map((a) => a.username);
  const userFollowing = twitterData.data.data.map((a) => a.id);

  const blockedList = await getBlockedList();

  const newFollowers = getNewFollowers(userFollowing, blockedList);

  const idString = newFollowers.join(",");

  const followingInfo = (await getUserInfo(idString)).data.data;

  const notableNewFollowers = followingInfo.filter((user) =>
    isNotable(
      user.public_metrics.followers_count,
      user.public_metrics.following_count
    )
  );
  const date = format(new Date(), "MMM dd HH:mm");
  const loggableNewFollowerData = notableNewFollowers.map((user) => {
    return {
      date_collected: date,
      new_follower: user.username,
      follower_count: user.public_metrics.followers_count,
      following_count: user.public_metrics.following_count,
      link_to: `https://twitter.com/${user.username}`,
    };
  });

  // return;
  const loggableNewBlockedData = notableNewFollowers.map((user) => {
    return {
      blocked: user.id,
      username: user.username,
    };
  });

  // const loggableData = newFollowers.map((a) => {
  //   return {
  //     date_collected: getDate(),
  //     tracked_account: user.username,
  //     new_follower: a,
  //     link_to: "https://twitter.com/" + a,
  //     blocked: a,
  //   };
  // });

  await logDataToSheet(loggableNewFollowerData, sheets.newFollowers2);
  await logDataToSheet(loggableNewBlockedData, sheets.blockedList2);

  await sheets.newFollowers2.saveUpdatedCells();
  await sheets.blockedList2.saveUpdatedCells();

  // await sheets.newFollowers2.saveUpdatedCells();
  // await sheets.blockedList2.saveUpdatedCells();

  return;
  await logDataToSheet(loggableData, sheets.newFollowers);
  await logDataToSheet(loggableData, sheets.blockedList);
}
main();

// return;
// const id = ["1116902285945163776", "1432840694171852802"];
// const url = `https://api.twitter.com/2/users?ids=${id}&user.fields=public_metrics`;
//
// axios.get(url, options).then((resp) => {
//   console.log(resp.data.data);
// });
// axios
//   .get(
//     "https://api.twitter.com/2/users?ids=1116902285945163776&user.fields=public_metrics",
//     options
//   )
//   .then((resp) => {
//     console.log(resp.data.data);
//   });

// getUserInfo(1116902285945163776).then((resp) => {
//   console.log(resp);
// });
