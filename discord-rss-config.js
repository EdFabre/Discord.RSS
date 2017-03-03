const nconf = require('nconf');
const fs = require('fs-extra');

module.exports = {
  init: function(conf) {
    var conf_file = 'discord-rss-config-runtime.json';
    // if (!fs.existsSync(conf_file)) {
    fs.writeFileSync(conf_file, JSON.stringify(conf, null, 2));
    // }
    nconf.file({
      file: conf_file
    });
  }
}
