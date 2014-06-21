var config = {};
config.mongodb = {};
config.dropbox = {};
config.oauth = {};
config.data = {};
config.http = {};
config.ga = {};

config.mongodb.host = process.env.MONGODB_HOST || '127.0.0.1';
// TODO: Wait for bugfix of dokku mongodb plugin
config.mongodb.port = /*process.env.MONGODB_PORT ||*/ 27017;
config.mongodb.user = process.env.MONGODB_USERNAME || '';
config.mongodb.password = process.env.MONGODB_PASSWORD || '';
config.mongodb.database = process.env.MONGODB_DATABASE || 'wolkentask';

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
config.dropbox.auth_callback_url_host = process.env.DROPBOX_APP_CALLBACK_HOST || 'http://YOUR SERVER:PORT';
config.dropbox.auth_callback_url = process.env.DROPBOX_APP_CALLBACK || '/auth/dropbox/callback';

// Allows to redirect the OAuth callback to another host
config.oauth.redirect_host = process.env.OAUTH_REDIRECT_HOST || '';

config.data.data_sym_crypt_key = process.env.DATA_SYM_CRYPT_KEY || 'SOME CRYPT KEY';

config.http.port = process.env.PORT || 3000;
config.http.cookie_secret = process.env.HTTP_COOKIE_SECRET || 'YOUR COOKIE SECRET';
config.http.enforce_ssl = process.env.HTTP_ENFORCE_SSL || false;
config.http.trust_proxy = process.env.HTTP_TRUST_PROXY || false;

config.ga.id = process.env.GA_ID || '';
config.ga.domain = process.env.GA_DOMAIN || '';

module.exports = config;