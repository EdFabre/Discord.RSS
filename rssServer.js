// Grab env variables from config.
var rek = require('rekuire');
var nconf = rek('discord-rss-config.js');

const fs = require('fs-extra');
// console.log(config);


/**
 * This module attaches the rss module to the bot.
 */
module.exports = function(bot, options) {
  // Initialize configuration.

  var config = JSON.parse(options.config);
  nconf.init(config);
  console.log(`Inserted RSS module to your bot.`);
  console.log(`rssServer Config`);
  console.log(config);

  const startInit = require('./util/initFeeds.js')
  const fetchInterval = require('./util/fetchInterval.js')
  const startFeedSchedule = require('./util/startFeedSchedule.js')
  if (config.logging.logDates) require('./util/logDates.js')();

  if (!config.botSettings.token)
    throw 'Warning! Vital config missing: token undefined in config.';
  else if (!config.botSettings.prefix)
    throw 'Warning! Vital config missing: prefix undefined in config';
  else if (!config.feedManagement.databaseName)
    throw 'Warning! Vital config missing: databaseName undefined in config.';
  // else if (!config.feedManagement.sqlType || typeof config.feedManagement.sqlType !== 'string' || (config.feedManagement.sqlType !== 'mysql' && config.feedManagement !== 'sqlite3'))
  //   throw 'Warning! Vital config missing: sqlType incorrectly defined in config.';
  else if (!config.feedSettings.defaultMessage)
    throw 'Warning! Vital config missing: defaultMssage undefined in config.';

  fetchInterval.changedGuilds = {}
  var initialized = false

  function beginFeedCycle(deleteCache) {
    if (deleteCache)
      delete require.cache[require.resolve(`./util/startFeedSchedule.js`)];
    require('./util/startFeedSchedule.js')(bot)
  }

  function startCmdServer() {
    console.log("Starting Command Server");
    initialized = true;
    // var arg = [options.config];
    const cmdServer = require('child_process').fork('./cmdServer.js', {
      env: {
        isCmdServer: true
      }
    })

    cmdServer.on('message', function(guildFile) {
      if (guildFile === 'kill') process.exit();
      fetchInterval.changedGuilds[guildFile.id] = guildFile.contents
      if (fetchInterval.cycleInProgress) return;
      try {
        delete require.cache[require.resolve(`../sources/${guildId}.json`)]
        console.log('RSS Module deleted cache for profile of guild ID: ' + guildId)
        delete fetchInterval.changedGuilds[guildId]
      } catch (e) {}
    })

    process.on('uncaughtException', function(err) {
      console.log(`Fatal Error for RSS Module! Stopping bot, printing error:

`, err.stack)
      cmdServer.send('kill')
      process.exit(1)
    })
    beginFeedCycle()
  }

  (function login() {
    if (typeof config.botSettings.defaultGame === "string" && config.botSettings.defaultGame !== "") bot.user.setGame(config.botSettings.defaultGame);
    console.log("Discord.RSS RSS Module has started.");
    if (!initialized) startInit(bot, startCmdServer);
    else beginFeedCycle(true);
  })()

  bot.once('disconnect', function(e) {
    console.log('Error: RSS Module Disconnected from Discord. Attempting to reconnect and restart feed cycle.')
    var timer = setInterval(function() {
      if (fetchInterval.cycleInProgress) return console.log('Feed retrieval cycle currently in progress. Waiting until cycle ends to reconnect.');
      fetchInterval.stopSchedule()
      clearInterval(timer)
    }, 10000)
  })

  process.on('unhandledRejection', (err, promise) => {
    console.log('Unhandled Rejection at: Promise', promise, 'reason:', err)
  })
}
