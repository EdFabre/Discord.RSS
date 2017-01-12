
const updateConfig = require('../util/updateJSON.js')

module.exports = function(commands, message, rssIndex) {
  var rssConfig = require('../config.json')
  var rssList = rssConfig.sources[message.guild.id]

  if (rssList[rssIndex].filters == null || rssList[rssIndex].filters == "") rssList[rssIndex].filters = {};

  //recycled from filterRemove.js
  var filterList = rssList[rssIndex].filters;
  let filterObj = {
    title: {exists: false, loc: filterList.title},
    description: {exists: false, loc: filterList.description},
    summary: {exists: false, loc: filterList.summary}
  }



  var msg = `\`\`\`Markdown\n# Chosen Feed: ${rssList[rssIndex].link}\n# List of available filters to add\`\`\`\`\`\`Markdown\n`

  for (let filterType in filterObj) {
    msg += `\n[Filter Category]: ${filterType}\n`;
  }

  message.channel.sendMessage(msg + "```\n**Type the filter category for which you would like you add a filter to, or type exit to cancel.**");

  const filter = m => m.author.id == message.author.id;
  const filterTypeCollect = message.channel.createCollector(filter,{time:240000});
  filterTypeCollect.on('message', function (chosenFilterType) {
    var validFilterType = false;
    for (let a in filterObj) if (chosenFilterType.content.toLowerCase() == a) validFilterType = true;

    if (chosenFilterType.content == "exit") return filterTypeCollect.stop("RSS Filter Addition menu closed.");

    else if (!validFilterType) return message.channel.sendMessage("That is not a valid filter category. Try again.");
    else if (validFilterType) {
      filterTypeCollect.stop();
      message.channel.sendMessage(`Type the filter word/phrase you would like to add in the category \`${chosenFilterType.content.toLowerCase()}\` by typing it, or type \`{exit}\` to cancel. The filter will be applied as **case insensitive** to feeds.`)

      const filterCollect = message.channel.createCollector(filter,{time:240000});
      filterCollect.on('message', function(chosenFilter) {
        if (chosenFilter.content == "{exit}") return filterCollect.stop("RSS Filter Addition menu closed.");
        else {
          if (rssList[rssIndex].filters[chosenFilterType.content] == null || rssList[rssIndex].filters[chosenFilterType.content] == "") rssList[rssIndex].filters[chosenFilterType.content] = [];

          message.channel.startTyping();
          filterCollect.stop();
          rssList[rssIndex].filters[chosenFilterType.content].push(chosenFilter.content);
          updateConfig('./config.json', rssConfig);
          console.log(`The filter \`${chosenFilter.content}\` has been successfully added for the filter category \`${chosenFilterType.content}\` for the feed ${rssList[rssIndex].link}.`);
          message.channel.stopTyping();
          return message.channel.sendMessage(`The filter \`${chosenFilter.content}\` has been successfully added for the filter category \`${chosenFilterType.content}\` for the feed ${rssList[rssIndex].link}.`)
        }
      })
      filterCollect.on('end', (collected, reason) => {
        if (reason == "time") return message.channel.sendMessage(`I have closed the menu due to inactivity.`);
        else if (reason !== "user") return message.channel.sendMessage(reason);
      });
    }

  })
  filterTypeCollect.on('end', (collected, reason) => {
    if (reason == "time") return message.channel.sendMessage(`I have closed the menu due to inactivity.`);
    else if (reason !== "user") return message.channel.sendMessage(reason);
  });


}