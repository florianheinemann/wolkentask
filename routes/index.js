"use strict";

exports.index = function(dropboxAppKey) {
	return function(req, res){
		res.render('index', { title: 'Wolkentask',
							dropboxAppKey: dropboxAppKey,
	  						providerId : req.user.providerId,
	  						providerToken : req.user.providerToken });
	};
};

exports.login = function(req, res){
  res.render('login', { title: 'Wolkentask' });
};

exports.logout = function(req, res){
	req.logout();
	res.redirect('/');
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