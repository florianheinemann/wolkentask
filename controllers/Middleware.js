"use strict";

exports.ensureAuthenticated = function(req, res, next) {
	if (req.isAuthenticated()) 
		return next(); 
	res.redirect('/login')
};

exports.ensureNotAuthenticated = function(req, res, next) {
	if (req.isAuthenticated()) 
		res.redirect('/');
	else
		next(); 
};

exports.forwardOAuth = function(redirectURL) {
	return function(req, res, next) {
		res.redirect(redirectURL + "?code=" + req.query.code);
	}
};