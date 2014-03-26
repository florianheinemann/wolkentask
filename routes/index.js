"use strict";

var http = require('https');

exports.index = function(dropboxAppKey, decrypt) {
	return function(req, res) {
		// To ensure legacy users are reauthorized 
		var decryptedToken = '';
		try {
			decryptedToken = decrypt(req.user.providerToken);
		}
		catch (e) {
			req.logout();
			res.redirect('/');
			return;
		}

		res.render('index', { dropboxAppKey: dropboxAppKey,
	  						providerId : req.user.providerId,
	  						providerToken : decryptedToken,
	  						authenticated: req.isAuthenticated() });
	};
};

exports.login = function(req, res){
	res.render('about', { authenticated: req.isAuthenticated() });
};

exports.logout = function(decrypt) {
	return function(req, res) {
		var options = {
			hostname: "api.dropbox.com",
			port: 443,
			path: "/1/disable_access_token?access_token=" + decrypt(req.user.providerToken),
			method: "POST"
		};

		var request = http.request(options, function(result) {
			console.log('STATUS: ' + result.statusCode);
			console.log('HEADERS: ' + JSON.stringify(result.headers));
			result.setEncoding('utf8');

			result.on('data', function (chunk) {
				console.log('BODY: ' + chunk);
			});
		});

		request.on('error', function(e) {
			console.log('problem with request: ' + e.message);
		});

		request.end();

		req.logout();
		res.redirect('/');
	};
};

exports.sites = function(req, res) {
    res.render(req.params.name, { authenticated: req.isAuthenticated() });
};

exports.partials = function(req, res) {
    res.render('partials/' + req.params.name);
};

exports.listFavorites = function(User, userModel) {
    return function(req, res, next) {
		userModel.findAllFavoritesOfUser(User, req.user.id, 
				function(error, favorites) {
		            if(error || !favorites) {
		            	next(error);
		            } else {
		                res.json({ favorites : favorites });
		            }
				})     
    };
};

exports.addFavorite = function(User, userModel) {
    return function(req, res, next) {
    	if(!req.body.path || !req.body.name) {
    		res.json({ error: "No data" });
    	} else {
			userModel.addFavoritToUserIfNotExisting(User, req.user.id, req.body.path, req.body.name, 
					function(error, user) {
			            if(error) {
			                next(error);
			            } else {
			                res.json({ user : user.id });
			            }
					})
		}       
    };
};

exports.removeFavorit = function(User, userModel) {
    return function(req, res, next) {
    	if(!req.params.id || !req.params.id.length) {
    		res.json({ error: "No data" });
    	} else {
			userModel.removeFavoritOfUser(User, req.user.id, req.params.id, 
					function(error, user) {
			            if(error) {
			                next(error);
			            } else {
			                res.json({ favorites : user.favorites });
			            }
					})
		}       
    };
};