function Path(path) {
   this.path = path;
}

Path.prototype.dirname = function() {
	var result = this.splitPath(this.path),
	root = result[0],
	dir = result[1];

	if (!root && !dir) {
		return '.';
	}

	if (dir) {
	// It has a dirname, strip trailing slash
		dir = dir.substr(0, dir.length - 1);
	}

	return root + dir;
};

Path.prototype.splitPath = function() {
	var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
	return splitPathRe.exec(this.path).slice(1);
};

Path.prototype.basename = function(ext) {
	var f = this.splitPath(this.path)[2];
	// TODO: make this comparison case-insensitive on windows?
	if (ext && f.substr(-1 * ext.length) === ext) {
		f = f.substr(0, f.length - ext.length);
	}
	return f;
};