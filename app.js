var config = require('./config');
var express = require('express');
var MongoStore = require('connect-mongostore')(express);
var routes = require('./routes');
var http = require('http');
var passport = require('passport');
var path = require('path');
var Mongoose = require('mongoose');
var enforce = require('express-sslify');
var userModel = require('./models/User.js');
var middleware = require('./controllers/Middleware.js');

var app = express();

var db = Mongoose.createConnection(config.mongodb.uri);
var User = db.model('users', userModel.UserSchema);

// all environments
app.set('port', config.http.port);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon('public/images/favicon.ico'));
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());

if(config.http.enforce_ssl) {
	app.use(enforce.HTTPS(config.http.trust_proxy));
}

app.use(express.cookieParser());
app.use(express.session({	secret: config.http.cookie_secret,
							cookie: {maxAge: 60*60*24*365*10},
						    store: new MongoStore( { db: config.mongodb.database,
						    						host: config.mongodb.host,
						    						port: config.mongodb.port,
						    						username: config.mongodb.user, 
						    						password: config.mongodb.password })}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(userModel.dropboxOAuth2Strategy(User, config.dropbox.app_key, 
						config.dropbox.app_secret, config.dropbox.auth_callback_url_host 
													+ config.dropbox.auth_callback_url));

passport.serializeUser(userModel.serializeUser);
passport.deserializeUser(userModel.deserializeUser(User));

app.use(middleware.embedGoogleAnalytics(config.ga.id, config.ga.domain));

app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', middleware.ensureAuthenticated, routes.index(config.dropbox.app_key));
app.get('/login', middleware.ensureNotAuthenticated, routes.login);
app.get('/logout', routes.logout);

app.get('/auth/dropbox', passport.authenticate('dropbox-oauth2'), function(req, res){
    // The request will be redirected to Dropbox for authentication, so this
    // function will not be called.
});

// if OAuth authentication doesn't have to be redirected
if(!config.oauth.redirect_host) {
	// GET /auth/dropbox/callback
	//   Use passport.authenticate() as route middleware to authenticate the
	//   request.  If authentication fails, the user will be redirected back to the
	//   login page.  Otherwise, the primary route function function will be called,
	//   which, in this example, will redirect the user to the home page.
	app.get(config.dropbox.auth_callback_url, 
		passport.authenticate('dropbox-oauth2', { successRedirect: '/',
	                                      failureRedirect: '/login' }));
} else {
	app.get(config.dropbox.auth_callback_url, middleware.forwardOAuth(
					config.oauth.redirect_host + config.dropbox.auth_callback_url + '/redirect'));

	// as above (+"/redirect")
	app.get(config.dropbox.auth_callback_url + '/redirect', 
		passport.authenticate('dropbox-oauth2', { successRedirect: '/',
	                                      failureRedirect: '/login' }));
}

// Static sites
app.get('/:name', routes.sites);

// Partials
app.get('/partials/:name', routes.partials);

// Favorites
app.get('/user/favorites', middleware.ensureAuthenticated, routes.listFavorites(User, userModel));
app.put('/user/favorite.json', middleware.ensureAuthenticated, routes.addFavorite(User, userModel));
app.delete('/user/favorites/:id', middleware.ensureAuthenticated, routes.removeFavorit(User, userModel));

http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});


