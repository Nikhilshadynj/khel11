const config = require('./config').storageConfig;
const mongoUrl = config.mongoUrl;
const MongoClient = require('mongodb').MongoClient;
let _db;

module.exports = {
	connectToServer: function (callback) {
		MongoClient.connect(mongoUrl, { useUnifiedTopology: true, useNewUrlParser: true }, (error, client) => {
			_db = client.db(config.database);
			console.log("Connection established to ", mongoUrl);
			return callback(error);
		});
	},

	getDb: function () {
		return _db;
	}
};