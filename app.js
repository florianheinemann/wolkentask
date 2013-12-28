var config = require('./config');
var express = require('express');
var MongoStore = require('connect-mongostore')(express);
var routes = require('./routes');
var http = require('http');
var passport = require('passport');
var path = require('path');
var Mongoose = require('mongoose');
var userModel = require('./models/User.js');
var middleware = require('./controllers/Middleware.js');

var app = express();

var db = Mongoose.createConnection(config.mongodb.uri);
var User = db.model('users', userModel.UserSchema);

// all environments
app.set('port', config.http.port);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
// to use put and delete in addition to post and get
app.use(express.methodOverride());

app.use(express.cookieParser());
app.use(express.session({	secret: config.http.cookie_secret,
						    store: new MongoStore( { db: config.mongodb.database,
						    						host: config.mongodb.host,
						    						port: config.mongodb.port,
						    						username: config.mongodb.user, 
						    						password: config.mongodb.password })}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(userModel.dropboxOAuth2Strategy(User, config.dropbox.app_key, 
						config.dropbox.app_secret, config.dropbox.auth_callback_url));

passport.serializeUser(userModel.serializeUser);
passport.deserializeUser(userModel.deserializeUser(User));

app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', middleware.ensureAuthenticated, routes.index(config.dropbox.app_key));
app.get('/login', routes.login);
app.get('/logout', routes.logout);

app.get('/auth/dropbox', passport.authenticate('dropbox-oauth2'), function(req, res){
    // The request will be redirected to Dropbox for authentication, so this
    // function will not be called.
});

// GET /auth/dropbox/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/dropbox/callback', 
	passport.authenticate('dropbox-oauth2', { successRedirect: '/',
                                      failureRedirect: '/login' }));

// Favorites
app.get('/user/favorites', middleware.ensureAuthenticated, routes.listFavorites(User, userModel));
app.put('/user/favorite.json', middleware.ensureAuthenticated, routes.addFavorite(User, userModel));
app.delete('/user/favorites/:id', middleware.ensureAuthenticated, routes.removeFavorit(User, userModel));

app.get('/partials/:name', routes.partials);

http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});


