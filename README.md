
#Discord.RSS
This is a fork of synzen's 'Discord RSS bot with customizable
feeds'. I have converted it into a module which can be added to your existing
bot.

For steps on how to host the bot on your own, and on using the bot itself, see https://github.com/synzen/Discord.RSS/wiki.

##Built With		
* [Node.js] (https://nodejs.org/en/)		
* [Discord.js] (https://www.npmjs.com/package/discord.js)

####Core Functions
 * [Feedparser] (https://www.npmjs.com/package/feedparser)		
 * [fetch] (https://www.npmjs.com/package/fetch)
 * Datebase Manager (one of two options)		
  * [sqlite3] (https://www.npmjs.com/package/sqlite3) (default)		
  * [mysql] (https://www.npmjs.com/package/mysql)

####Customization Functions
 * [striptags] (https://www.npmjs.com/package/striptags) - Remove HTML content
 * [entities] (https://www.npmjs.com/package/entities) - Replace HTML content
 * [moment-timezone] (https://www.npmjs.com/package/moment-timezone) - Customizable timezones
