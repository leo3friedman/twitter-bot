const logNewFollowers = require("./bot.js");

exports.handler = async (event) => {
  await logNewFollowers();
};
