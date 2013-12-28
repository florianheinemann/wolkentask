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