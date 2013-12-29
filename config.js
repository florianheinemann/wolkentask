var config = {};
config.mongodb = {};
config.dropbox = {};
config.http = {};

config.mongodb.host = process.env.MONGO_HOST || '127.0.0.1';
config.mongodb.port = process.env.MONGO_PORT || 27017;
config.mongodb.user = process.env.MONGO_USER || '';
config.mongodb.password = process.env.MONGO_PASSWORD || '';
config.mongodb.database = process.env.MONGO_DATABASE || 'wolkentask';

// Format:     mongodb://[username:password@]host1[:port1][/[database]

config.mongodb.uri = "mongodb://"
if(config.mongodb.user.length && config.mongodb.password.length)
	config.mongodb.uri += config.mongodb.user + ":" + config.mongodb.password + "@";
config.mongodb.uri += config.mongodb.host;
if(config.mongodb.port.toString().length)
	config.mongodb.uri += ":" + config.mongodb.port.toString();
if(config.mongodb.database.length)
	config.mongodb.uri += "/" + config.mongodb.database;

config.dropbox.app_key = process.env.DROPBOX_APP_KEY || 'YOUR APP KEY';
config.dropbox.app_secret = process.env.DROPBOX_APP_SECRET || 'YOUR APP SECRET';
config.dropbox.auth_callback_url = process.env.DROPBOX_APP_CALLBACK || 'http://YOUR SERVER:PORT/auth/dropbox/callback';

config.http.port = process.env.PORT || 3000;
config.http.cookie_secret = process.env.HTTP_COOKIE_SECRET || 'YOUR COOKIE SECRET';

module.exports = config;