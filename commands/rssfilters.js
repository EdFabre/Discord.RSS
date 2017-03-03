const filters = require('./util/filters.js')
const getIndex = require('./util/printFeeds.js')
var rek = require('rekuire');
var config = rek('discord-rss-config-runtime.json');
const fileOps = require('../util/fileOps.js')

function isEmptyObject(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }
    return JSON.stringify(obj) === JSON.stringify({});
}

module.exports = function (bot, message, command, role) {

  getIndex(bot, message, command, function (rssIndex) {
    var guildRss = require(`../sources/${message.guild.id}.json`)
    var rssList = guildRss.sources

    var menu = {embed: {
      color: config.botSettings.menuColor,
      description: `**Feed Title:** ${rssList[rssIndex].title}\n**Feed Link:** ${rssList[rssIndex].link}\n\nSelect an option by typing its number, or type *exit* to cancel. Only messages that contain any of the words defined in these feed filters will be sent to Discord.\n_____`,
      author: {name: `Feed Filters Customization`},
      fields: [{name: `1) Add feed filter(s)`, value: `Add new filter(s) to a specific category in a feed.`},
              {name: `2) Remove feed filter(s)`, value: `Remove existing filter(s), if any.`},
              {name: `3) Remove all feed filters`, value: `Remove all filters, if any.`},
              {name: `4) List existing filters`, value: `List all filters in all categories, if any.`}],
      footer: {}
    }}

    message.channel.sendMessage('', menu).catch(err => `Promise Warning: rssFilters 1: ${err}`)

    const filter = m => m.author.id == message.author.id;
    const collector = message.channel.createCollector(filter,{time:60000});

    collector.on('message', function (m) {
      if (m.content.toLowerCase() == 'exit') return collector.stop('RSS Filter Action selection menu closed.');
      if (m.content == 1) {
        collector.stop();
        return filters.add(message, rssIndex);
      }
      else if (m.content == 2) {
        collector.stop();
        return filters.remove(message, rssIndex);
      }
      else if (m.content == 3 || m.content == 4) {
        collector.stop();
        var foundFilters = [];
        if (rssList[rssIndex].filters != null && typeof rssList[rssIndex].filters == 'object') {
          for (let prop in rssList[rssIndex].filters)
            if (rssList[rssIndex].filters.hasOwnProperty(prop) && prop !== 'roleSubscriptions') foundFilters.push(prop);
        }

        if (foundFilters.length == 0) return message.channel.sendMessage('There are no feed filters assigned to this feed.').catch(err => `Promise Warning: rssFilter 2: ${err}`);

        let filterList = rssList[rssIndex].filters;
        if (m.content == 3) {
          for (let filterCategory in filterList) {
            if (filterCategory !== 'roleSubscriptions') delete filterList[filterCategory];
          }
          if (isEmptyObject(filterList)) delete rssList[rssIndex].filters;
          fileOps.updateFile(message.guild.id, guildRss, `../sources/${message.guild.id}.json`);
          return message.channel.sendMessage(`All feed filters have been successfully removed from this feed.`).catch(err => `Promise Warning: rssFilters 3: ${err}`);
        }
        else if (m.content == 4) {

          var msg = {embed: {
            color: config.botSettings.menuColor,
            description: `**Feed Title:** ${rssList[rssIndex].title}\n**Feed Link:** ${rssList[rssIndex].link}\n\nBelow are the filter categories with their words/phrases under each.\n_____`,
            author: {name: `List of Assigned Filters`},
            fields: [],
            footer: {}
          }}

          for (let filterCategory in filterList)  {
            var field = {name: filterCategory, value: '', inline: true};
            if (filterCategory !== 'roleSubscriptions') {
              for (let filter in filterList[filterCategory])
                field.value += `${filterList[filterCategory][filter]}\n`;
            }
            msg.embed.fields.push(field);
          }
          message.channel.sendMessage('', msg).catch(err => {
            console.log('promise error! cannot send embed of filters listings, the embed is: \n', msg.embed, '\n\nthe fields is:\n', msg.fields)
          });
        }
      }
      else message.channel.sendMessage('That is not a valid choice. Try again.').catch(err => `Promise Warning: rssFilters 4: ${err}`);
    })

    collector.on('end', (collected, reason) => {
      if (reason == 'time') return message.channel.sendMessage(`I have closed the menu due to inactivity.`).catch(err => {});
      else if (reason !== 'user') return message.channel.sendMessage(reason);
    })
  })
}
