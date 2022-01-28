const { format } = require("date-fns");
const axios = require("axios");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require("./credentials.json");

const options = {
  headers: {
    Authorization:
      "Bearer AAAAAAAAAAAAAAAAAAAAAN8EYAEAAAAAN83bItWvS%2FLVb%2FgtMv4%2BvRZ7yvU%3DsZR1K6Fcc1eW55Jsv71u6omYk5UrZo3afA8eU1gKGN0xBvQnti",
  },
};

const doc = new GoogleSpreadsheet(
  "1mwkrcICr-NKVO8NbmmmNHuxk557bQ27BIlqb_UPOx3I"
);

function getUserFollowing(id, options) {
  return axios.get(`https://api.twitter.com/2/users/${id}/following`, options);
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

  // const usersTracking = await getUserTracking();
  const usersTracking = (await sheets.usersTracking.getRows()).map(
    (row) => row._rawData
  );

  const lastTrackedArr = usersTracking.map((user) => parseInt(user[0]));
  const indexOfUserToTrack = lastTrackedArr.indexOf(
    Math.min.apply(Math, lastTrackedArr)
  );

  const userTracking = {
    username: usersTracking[indexOfUserToTrack][1],
    id: usersTracking[indexOfUserToTrack][2],
  };

  await sheets.usersTracking.loadCells();
  console.log(userTracking);
  sheets.usersTracking.getCell(indexOfUserToTrack + 1, 0).value = Date.now();
  await sheets.usersTracking.saveUpdatedCells();
  return;

  // const userTracking = {
  //   username: usersTracking[0][0],
  //   id: usersTracking[0][1],
  // };
  //TODO: instead of reordering, just update the last checked (Date.now()) and always run on oldest

  // await reorderUserTracking(usersTracking, sheets.usersTracking);

  console.log("tracking... " + userTracking.username);
  if (userTracking.username === "ethane1x") console.log("Last One!");

  const twitterData = await getUserFollowing(userTracking.id, options);
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

  const loggableNewBlockedData = notableNewFollowers.map((user) => {
    return {
      blocked: user.id,
      username: user.username,
    };
  });

  await sheets.newFollowers2.addRows(loggableNewFollowerData);
  await sheets.blockedList2.addRows(loggableNewBlockedData);
  await sheets.newFollowers2.saveUpdatedCells();
  await sheets.blockedList2.saveUpdatedCells();
}
main();
