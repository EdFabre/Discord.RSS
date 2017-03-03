var rek = require('rekuire');
var config = rek('discord-rss-config-runtime.json');
var fetchInterval
var refreshTime = (config.feedSettings.refreshTimeMinutes) ? config.feedSettings.refreshTimeMinutes : 15

exports.startSchedule = function (command) {
  fetchInterval = setInterval(command, refreshTime*60000)
}

exports.stopSchedule = function () {
  clearInterval(fetchInterval)
}
