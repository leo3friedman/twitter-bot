const { format } = require("date-fns");
const axios = require("axios");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require("./google-credentials.json");
const twitterCreds = require("./twitter-credentials.json");

const axiosOptions = {
  headers: twitterCreds,
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
    axiosOptions
  );
}

function getNewFollowers(data, blockedList) {
  return data.filter((a) => !blockedList.includes(a));
}

async function getBlockedList() {
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  const sheets = {
    newFollowers: doc.sheetsById[2078509453],
    usersTracking: doc.sheetsById[919336525],
    blockedList: doc.sheetsById[690408661],
  };
  const blockedRows = await sheets.blockedList.getRows();
  let blockedList = [];
  blockedRows.forEach((row) => {
    blockedList.push(row.blocked);
  });
  return blockedList;
}

function isNotable(followers, following) {
  return (followers + 1) / (following + 1) > 10;
}

async function logNewFollowers() {
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  const sheets = {
    newFollowers: doc.sheetsById[2078509453],
    usersTracking: doc.sheetsById[919336525],
    blockedList: doc.sheetsById[690408661],
  };

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
  sheets.usersTracking.getCell(indexOfUserToTrack + 1, 0).value = Date.now();
  await sheets.usersTracking.saveUpdatedCells();

  console.log("tracking... " + userTracking.username);
  if (userTracking.username === "ethane1x") console.log("Last One!");

  const twitterData = await getUserFollowing(userTracking.id, axiosOptions);
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

  await sheets.newFollowers.addRows(loggableNewFollowerData);
  await sheets.blockedList.addRows(loggableNewBlockedData);
  await sheets.newFollowers.saveUpdatedCells();
  await sheets.blockedList.saveUpdatedCells();
}
module.exports = logNewFollowers;
