/* Reading the config details from config.json file */
require('../global_constant');
var fs = require('fs');
console.log("WEBSITE_ROOT_PATH");
console.log(WEBSITE_ROOT_PATH);
configPath = WEBSITE_ROOT_PATH + "config/config.json";
var parsed = JSON.parse(fs.readFileSync(configPath, 'UTF-8'));
exports.storageConfig = parsed;