"use strict";

var crypto = require('crypto');

exports.encryptString = function(key) {
	return function(plain_data) {
		var cipher = crypto.createCipher("aes192", key);
		return cipher.update(plain_data, 'utf8', 'base64') + cipher.final('base64')
	}
};

exports.decryptString = function(key) {
	return function(encrypted_data) {
		var decipher = crypto.createDecipher("aes192", key);
		return decipher.update(encrypted_data, 'base64', 'utf8') + decipher.final('utf8');
	}
};