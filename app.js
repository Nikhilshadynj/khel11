const express = require("express");
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const path = require('path');
const globalConstant = require("./global_constant");
const routes = require("./routes");
const config = require('./config/config').storageConfig;
/* Server Side Form Validation */
const expressValidator 	= require('express-validator');
app.use(expressValidator());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
/** Required for Session */
var cookieSession = require('cookie-session');
app.use(cookieSession({
    name: 'session',
    keys: ['NodeJs9799530SecretKey515'],
    maxAge: 365 * 24 * 60 * 60 * 1000 // 1 Year
}));
app.listen(config.port, () => {
    console.log("Server is running on port: " + config.port);
});
routes.configure(app);

