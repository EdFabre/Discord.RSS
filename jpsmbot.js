// Log Manager - instantiated using npm package 'winston'.

// Discord Client requires these
const Client = require('discord.js').Client;

const fs = require('fs-extra');
var config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

const token = config["JPSM_BOT"].bot_token;
const prefix = config["MY_GUILD"].guild_prefix;

// Create the bot.
const bot = new Client();

// Plugins to be attached to bot.
const rssServer = require('./rssServer.js');
console.log('BOT');
console.log(config);
// Starts the Bot then attach additional plugins.
bot.login(token).then(function(success) {
  rssServer(bot, {
    prefix: `${prefix}`,
    config: JSON.stringify(config)
  });
})
  .catch(function(err) {
    console.error(err);
  });
