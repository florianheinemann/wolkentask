var passport = require('passport');
var DropboxOAuth2Strategy = require('passport-dropbox-oauth2').Strategy;
var Mongoose = require('mongoose');

exports.FavoriteSchema = new Mongoose.Schema({ 
    path: { type: String, required: true },
    name: { type: String, required: true }
});

exports.UserSchema = new Mongoose.Schema({
    email : { type : String, required : false },
    displayName : { type : String, required : false },
    provider : { type: String, required: true },
    providerId : { type: Number, required: true },
    providerToken: { type: String, required: true },
    providerSecret: { type: String, required: false },
    favorites : [exports.FavoriteSchema]
});

exports.findAllFavoritesOfUser = function(User, user_id, callback) {
    exports.findUserById(User, user_id, function(error, user) {
        if(user)
            callback(error, user.favorites);
        else
            callback(error, []);
    });
};

exports.addFavoritToUserIfNotExisting = function(User, user_id, path, name, callback) {
    User.findOne( { _id: user_id }, 
        function(error, foundUser) {
                        if(error) {
                            callback(error)
                        } else if(!foundUser) {
                            callback("User not found");
                        } else { // user found
                            var found = false;
                            foundUser.favorites.forEach(function(singleFav) {
                                if(singleFav.path.toLowerCase().trim() == path.toLowerCase().trim())
                                    found = true;
                            });
                            if(!found) {
                                foundUser.favorites.push({
                                    path: path,
                                    name: name
                                });
                                foundUser.save(callback);
                            }
                            callback(null, foundUser);
                        }
                });
};

exports.removeFavoritOfUser = function(User, user_id, favorite, callback) {
    User.findById(user_id, function(error, foundUser) {
                    if(error) {
                        callback(error)
                    } else if(!foundUser) {
                        callback("User not found");
                    } else { // user found
                        for (var i = foundUser.favorites.length - 1; i >= 0; i--) {
                            if(foundUser.favorites[i]._id.equals(favorite)) {
                                foundUser.favorites.splice(i, 1);
                                foundUser.save(callback);
                                return;                               
                            }
                        };
                        callback("Favorite not found");
                    }
            });
};

exports.findUserById = function(User, id, callback) {
    User.findById(id, callback);
};

exports.findOrCreateOAuthUser = function(User, user, callback) {
    User.findOne( { provider: user.provider,
                    providerId : user.providerId
                }, function(error, foundUser) {
                        if(error) {
                            callback(error)
                        } else if(!foundUser) {
                            user.save(callback);
                        } else {
                            foundUser.providerToken = user.providerToken;
                            foundUser.providerSecret = user.providerSecret;
                            foundUser.save(callback);
                        }
                });
};

exports.dropboxOAuth2Strategy = function(User, clientID, clientSecret, callbackUrl) {
    return new DropboxOAuth2Strategy ( {
                    clientID: clientID,
                    clientSecret: clientSecret,
                    callbackURL: callbackUrl
                },
                function(accessToken, refreshToken, profile, done) {
                    var user = new User( {
                        email : profile.emails[0],
                        displayName : profile.displayName,
                        provider : "dropbox - oauth2",
                        providerId : profile.id,
                        providerToken : accessToken,
                        providerSecret : refreshToken
                    });
                    exports.findOrCreateOAuthUser(User, user, done);
                }
        );
};

exports.serializeUser = function(user, done) {
    done(null, user.id);
};

exports.deserializeUser = function(User, id, done) {
    return function(id, done) {
        exports.findUserById(User, id, function(err, user) {
            done(err, user);
        });
    };
};