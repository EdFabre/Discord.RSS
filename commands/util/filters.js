const fileOps = require('../../util/fileOps.js')
var rek = require('rekuire');
var config = rek('discord-rss-config-runtime.json');
const channelTracker = require('../../util/channelTracker.js')
const validFilterTypes = ['Title', 'Description', 'Summary', 'Author', 'Tag']

function isEmptyObject(obj) {
    for(var prop in obj) {
      if(obj.hasOwnProperty(prop)) return false;
    }
    return JSON.stringify(obj) === JSON.stringify({});
}

function getObjLength(obj) {
  var count = 0
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) count++;
  }
  return count
}

exports.add = function(message, rssIndex, role) {
  var guildRss = require(`../../sources/${message.guild.id}.json`)
  var rssList = guildRss.sources

  if (!rssList[rssIndex].filters) rssList[rssIndex].filters = {};
  if (role && !rssList[rssIndex].filters.roleSubscriptions) rssList[rssIndex].filters.roleSubscriptions = {};
  if (role && !rssList[rssIndex].filters.roleSubscriptions[role.id])
    rssList[rssIndex].filters.roleSubscriptions[role.id] = {
      roleName: role.name,
      filters: {}
    }

  var filterList = (role) ? rssList[rssIndex].filters.roleSubscriptions[role.id].filters : rssList[rssIndex].filters
  var msg = `\`\`\`Markdown\n# Chosen Feed: ${rssList[rssIndex].link}\n# List of available filters to add\`\`\`\`\`\`Markdown\n`
  for (let filterType in validFilterTypes) {
    msg += `\n[Filter Category]: ${validFilterTypes[filterType]}\n`;
  }

  message.channel.sendMessage(msg + '```\n**Type the filter category for which you would like you add a filter to, or type exit to cancel.**').catch(err => console.log(`Promise Warning: filterAdd 1: ${err}`))

  const filter = m => m.author.id == message.author.id
  const filterTypeCollect = message.channel.createCollector(filter,{time:240000})
  channelTracker.addCollector(message.channel.id)

  filterTypeCollect.on('message', function (filterType) {
    if (filterType.content === 'exit') return filterTypeCollect.stop('Feed Filter Addition menu closed.');
    var chosenFilterType = '';

    for (let a in validFilterTypes) {
      if (filterType.content.toLowerCase() == validFilterTypes[a].toLowerCase()) chosenFilterType = validFilterTypes[a];
    }


    if (!chosenFilterType) return message.channel.sendMessage('That is not a valid filter category. Try again.').catch(err => console.log(`Promise Warning: filterAdd 2: ${err}`));
    else {
      filterTypeCollect.stop();
      message.channel.sendMessage(`Type the filter word/phrase you would like to add in the category \`${chosenFilterType}\` by typing it, type multiple word/phrases on different lines to add more than one, or type \`{exit}\` to cancel. The filter will be applied as **case insensitive** to feeds.`).catch(err => console.log(`Promise Warning: filterAdd 3: ${err}`));

      const filterCollect = message.channel.createCollector(filter,{time:240000});
      channelTracker.addCollector(message.channel.id);

      filterCollect.on('message', function(chosenFilter) {
        if (chosenFilter.content == '{exit}') return filterCollect.stop('Feed Filter Addition menu closed.');
        else {
          if (!role) delete rssList[rssIndex].roleSubscriptions;
          if (!filterList[chosenFilterType]) filterList[chosenFilterType] = [];
          message.channel.sendMessage(`Updating filters...`)
          .then(editing => {
            filterCollect.stop()
            var addList = chosenFilter.content.trim().split('\n')
            var addedList = ''
            var invalidItems = ''
            for (var item in addList) {
              if (!filterList[chosenFilterType].includes(addList[item].trim()) && addList[item].trim()) {
                filterList[chosenFilterType].push(addList[item].trim());
                addedList += `\n${addList[item].trim()}`;
              }
              else invalidItems += `\n${addList[item]}`;
            }
            fileOps.updateFile(message.guild.id, guildRss, `../sources/${message.guild.id}.json`)
            if (!role) {
              console.log(`RSS Filters: (${message.guild.id}, ${message.guild.name}) => New filter(s) [${addedList.trim().split('\n')}] added to '${chosenFilterType}' for ${rssList[rssIndex].link}.`);
              let msg = `The following filter(s) have been successfully added for the filter category \`${chosenFilterType}\`:\`\`\`\n\n${addedList}\`\`\``;
              if (invalidItems) msg += `\n\nThe following filter(s) could not be added because they already exist:\n\`\`\`\n\n${invalidItems}\`\`\``;
              editing.edit(`${msg}\n\nYou may test your filters via \`${config.botSettings.prefix}rsstest\` and see what feeds pass through.`).catch(err => console.log(`Promise Warning: filterAdd 4a: ${err}`));
            }
            else {
              console.log(`RSS Roles: (${message.guild.id}, ${message.guild.name}) => Role (${role.id}, ${role.name}) => New filter(s) [${addedList.trim().split('\n')}] added to '${chosenFilterType}' for ${rssList[rssIndex].link}.`);
              let msg = `Subscription updated for role \`${role.name}\`. The following filter(s) have been successfully added for the filter category \`${chosenFilterType}\`:\`\`\`\n\n${addedList}\`\`\``;
              if (invalidItems) msg += `\n\nThe following filter(s) could not be added because they already exist:\n\`\`\`\n\n${invalidItems}\`\`\``;
              editing.edit(`${msg}\n\nYou may test your filters via \`${config.botSettings.prefix}rsstest\` and see what feeds will mention the role`).catch(err => console.log(`Promise Warning: filterAdd 4b: ${err}`));
            }
          })
          .catch(err => console.log(`Promise Warning: filterAdd 4: ${err}`));
        }
      });
      filterCollect.on('end', (collected, reason) => {
        channelTracker.removeCollector(message.channel.id)
        if (reason === 'time') return message.channel.sendMessage(`I have closed the menu due to inactivity.`).catch(err => {});
        else if (reason !== 'user') return message.channel.sendMessage(reason);
      });
    }
  })

  filterTypeCollect.on('end', (collected, reason) => {
    channelTracker.removeCollector(message.channel.id)
    if (reason === 'time') return message.channel.sendMessage(`I have closed the menu due to inactivity.`).catch(err => {});
    else if (reason !== 'user') return message.channel.sendMessage(reason);
  })
}

exports.remove = function (message, rssIndex, role) {
  var guildRss = require(`../../sources/${message.guild.id}.json`)
  var rssList = guildRss.sources

  //null role = not adding a filter for a role
  var filterList = (role) ? rssList[rssIndex].filters.roleSubscriptions[role.id].filters : rssList[rssIndex].filters
  if (!filterList || typeof filterList !== 'object') return message.channel.sendMessage(`There are no filters to remove for ${rssList[rssIndex].link}.`).catch(err => `Promise Warning: filterRemove 1: ${err}`);

  var isEmptyFilter = true

  if (rssList[rssIndex].filters && typeof rssList[rssIndex].filters == 'object') {
    for (let prop in rssList[rssIndex].filters) if (prop !== 'roleSubscriptions') isEmptyFilter = false;
  }

  if (!role && isEmptyFilter) return message.channel.sendMessage(`There are no filters to remove for ${rssList[rssIndex].link}.`).catch(err => `Promise Warning: filterRemove 2: ${err}`);

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
      for (let filter in filterList[filterCategory]) field.value += `${filterList[filterCategory][filter]}\n`;
    }
    msg.embed.fields.push(field);
  }

  message.channel.sendMessage('**Type the filter category for which you would like you remove a filter from, type \`{reset}\` to remove all filters, or type exit to cancel.**', msg).catch(err => console.log(`Promise Warning: filterRemove 3: ${err}`))

  const filter = m => m.author.id == message.author.id
  const filterTypeCollect = message.channel.createCollector(filter,{time:240000})
  channelTracker.addCollector(message.channel.id)

  filterTypeCollect.on('message', function(filterType) {
    if (filterType.content == 'exit') return filterTypeCollect.stop('Feed Filter Removal menu closed.');
    var chosenFilterType = ''

    for (let a in validFilterTypes) {
      if (filterType.content.toLowerCase() == validFilterTypes[a].toLowerCase()) chosenFilterType = validFilterTypes[a];
    }

    if (chosenFilterType == '{reset}') {
      message.channel.sendMessage(`Resetting all filters...`)
      .then(resetMsg => {
        filterTypeCollect.stop();
        delete filterList;
        fileOps.updateFile(message.guild.id, guildRss, `../sources/${message.guild.id}.json`);
        return resetMsg.edit('All filters have been removed.').catch(err => console.log(`Promise Warning: filterRemove 4a: ${err}`));
      })
      .catch(err => console.log(`Promise Warning: filterRemove 4: ${err}`));
    }
    else if (!chosenFilterType) return message.channel.sendMessage('That is not a valid filter category. Try again.').catch(err => console.log(`Promise Warning: filterRemove 5: ${err}`));
    else {
      filterTypeCollect.stop();
      message.channel.sendMessage(`Confirm the filter word/phrase you would like to remove in the category \`${chosenFilterType}\` by typing one or multiple word/phrases separated by new lines (case sensitive).`).catch(err => console.log(`Promise Warning: filterRemove 6: ${err}`));

      const filterCollect = message.channel.createCollector(filter,{time:240000});
      channelTracker.addCollector(message.channel.id)

      filterCollect.on('message', function(chosenFilter) {
        var validFilter = false
        var validIndexes = []
        var removeList = chosenFilter.content.trim().split('\n')
        var invalidItems = ''

        for (var item in removeList) {
          let valid = false;
          for (var filterIndex in filterList[chosenFilterType]) {
            if (filterList[chosenFilterType][filterIndex] == removeList[item]) {
              valid = true;
              if (typeof validFilter !== 'object') validFilter = [];
              validFilter.push({filter: removeList[item], index: filterIndex});
            }
          }
          if (!valid && removeList[item]) invalidItems += `\n${removeList[item]}`;
        }

        if (chosenFilter.content == 'exit') return filterCollect.stop('Feed Filter Removal menu closed.');
        else if (!validFilter) return message.channel.sendMessage(`That is not a valid filter to remove from \`${chosenFilterType}\`. Try again.`).catch(err => console.log(`Promise Warning: filterRemove 7: ${err}`));
        else message.channel.sendMessage(`Removing filter ${chosenFilter.content} from category ${chosenFilterType}...`)
        .then(editing => {
          filterCollect.stop()
          var deletedList = ''
          // delete from highest index to lowest
          for (var i = validFilter.length - 1; i >= 0; i--) {
            deletedList += `\n${validFilter[i].filter}`;
            filterList[chosenFilterType].splice(validFilter[i].index, 1);
            if (filterList[chosenFilterType].length === 0) delete filterList[chosenFilterType];
          }

          if (role && isEmptyObject(filterList)) delete rssList[rssIndex].filters.roleSubscriptions[role.id];
          if (role && isEmptyObject(rssList[rssIndex].filters.roleSubscriptions)) delete rssList[rssIndex].filters.roleSubscriptions;
          if (isEmptyObject(rssList[rssIndex].filters)) delete rssList[rssIndex].filters;

          fileOps.updateFile(message.guild.id, guildRss, `../sources/${message.guild.id}.json`);
          if (!role) {
            console.log(`RSS Filters: (${message.guild.id}, ${message.guild.name}) => Filter(s) [${deletedList.trim().split('\n')}] removed from '${chosenFilterType}' for ${rssList[rssIndex].link}.`);
            let msg = `The following filter(s) have been successfully removed from the filter category \`${chosenFilterType}\`:\`\`\`\n\n${deletedList}\`\`\``;
            if (invalidItems) msg += `\n\nThe following filter(s) were unable to be deleted because they do not exist:\n\`\`\`\n\n${invalidItems}\`\`\``;
            editing.edit(msg).catch(err =>console.log(`Promise Warning: filterRemove 8a: ${err}`));
          }
          else {
            console.log(`RSS Roles: (${message.guild.id}, ${message.guild.name}) => Role (${role.id}, ${role.name}) => Filter(s) [${deletedList.trim().split('\n')}] removed from '${chosenFilterType}' for ${rssList[rssIndex].link}.`);
            let msg = `Subscription updated for role \`${role.name}\`. The following filter(s) have been successfully removed from the filter category \`${chosenFilterType}\`:\`\`\`\n\n${deletedList}\`\`\``;
            if (invalidItems) msg += `\n\nThe following filters were unable to be removed because they do not exist:\n\`\`\`\n\n${invalidItems}\`\`\``;
            editing.edit(msg).catch(err => console.log(`Promise Warning: filterRemove 8b: ${err}`));
          }
        })
        .catch(err => console.log(`Promise Warning: filterRemove 8: ${err}`));
      })
      filterCollect.on('end', (collected, reason) => {
        channelTracker.removeCollector(message.channel.id)
        if (reason === 'time') return message.channel.sendMessage(`I have closed the menu due to inactivity.`).catch(err => {});
        else if (reason !== 'user') return message.channel.sendMessage(reason);
      });
    }
  })
  filterTypeCollect.on('end', (collected, reason) => {
    channelTracker.removeCollector(message.channel.id)
    if (reason === 'time') return message.channel.sendMessage(`I have closed the menu due to inactivity.`).catch(err => {});
    else if (reason !== 'user') return message.channel.sendMessage(reason);
  });
}
