"use strict";
var wolkentask = angular.module('wolkentask', []);

	wolkentask.directive("folderPath", function() {
		return {
			restrict: "E",
			scope: {
				wtPath: '=',
			},
			replace: true,
			templateUrl: "/partials/folderPath"
		};
	});

	wolkentask.directive("fileListing", function() {
		return {
			restrict: "E",
			scope: {
				wtName: '=',
				wtType: '=',
				wtOpen: '&'
			},
			compile: function ($element, $attrs) {
				var iconEl = $element.find("i")[0];

				if($attrs.wtType === "folder") {
					iconEl.className += " fa-folder";
				} else if($attrs.wtType === "back") {
					iconEl.className += " fa-chevron-circle-left";
				} else {
					iconEl.className += " fa-file";
				}

				return function ($scope, $element, $attrs, $controller) {
					$scope.open = function() {
						$scope.loading = true;
						$scope.wtOpen().finally(function() {
							$scope.loading = false;
						});
					};
				};
			},
			replace: true,
			templateUrl: "/partials/fileListing"
		};
	});

	wolkentask.directive("favoriteStar", ['favoritesService', function(favoritesService) {
		return {
			restrict: "E",
			scope: {
				wtPath: '='
			},
			link: function($scope, $element, $attrs) {

				var starEl = $element.find("i");

				function setStarCorrectly() {
					starEl.removeClass("fa-star fa-star-o fa-star-half-o");
					if(favoritesService.isFavorite($scope.wtPath)) {
						starEl.addClass("fa-star");
					} else {
						starEl.addClass("fa-star-o");
					}
				}

				function setStarOnHold() {
					starEl.removeClass("fa-star fa-star-o fa-star-half-o");
					starEl.addClass("fa-star-half-o");		
				}

				$scope.changeFavorite = function() {
					setStarOnHold();
					if(favoritesService.isFavorite($scope.wtPath)) {
						favoritesService.removeFavorite($scope.wtPath).finally(
							function() {
								setStarCorrectly();
							});
					} else {
						favoritesService.addFavorite($scope.wtPath).finally(
							function() {
								setStarCorrectly();
							});
					}
				}

				$scope.$watch('wtPath', function() {
					setStarCorrectly();
				});
			},
			replace: true,
			templateUrl: "/partials/favoriteStar"
		};
	}]);

	wolkentask.directive("singleTodo", function($timeout) {
		return {
			restrict: "E",
			scope: {
				wtData: '=',
				wtDone: '=',
				wtSave: '&',
				wtDelete: '&',
				wtUpdate: '&'
			},
			link: function($scope, $element) {

				var inputBoxEl = $element.find("input")[1];
				var oldText = "";
				var saved = false;

				$element.on('mouseup', function(e){
                    e.preventDefault();
                });

				$scope.cancel = function() {
					if(!saved) {
						$scope.wtData = oldText;
						$scope.editData = "";
					}
				}

				$scope.showEdit = function() {
					$scope.editData = oldText = $scope.wtData;
					$scope.wtData = "";
					saved = false;
					$timeout(function() {
						inputBoxEl.selectionStart = 0;
						inputBoxEl.selectionEnd = inputBoxEl.value.length;
					});
				};

				$scope.mouseUp = function(e) {
					return false;
				};

				$scope.save = function() {
					saved = true;
					$scope.wtData = $scope.editData;
					$scope.editData = "";
					$scope.wtSave();
					inputBoxEl.blur();
				};

				$scope.update = function() {
					$scope.wtUpdate();
				}
			},
			replace: true,
			templateUrl: "/partials/singleTodo"
		};
	});

	wolkentask.directive("newFile", function($timeout) {
		return {
			restrict: "E",
			scope: {
				wtPath: '=',
				wtCreate: '&'
			},
			link: function ($scope, element) {
				$scope.fileName = '';
				$scope.displayError = false;
				$scope.waiting = false;

				var resetFields = function() {
					$scope.fileName = '';
					$scope.displayError = false;
					$scope.waiting = false;
				}

				var validFileExt = ['', '.applescript', '.as', '.as3', '.c', '.cc', '.clisp', '.coffee', '.cpp', '.cs', 
									'.css', '.csv', '.cxx', '.def', '.diff', '.erl', '.fountain', '.ft', '.h', '.hpp',
									'.htm', '.html', '.hxx', '.inc', '.ini', '.java', '.js', '.json', '.less', '.log',
									'.lua', '.m', '.markdown', '.mat', '.md', '.mdown', '.mkdn', '.mm', '.mustache',
									'.mxml', '.patch', '.php', '.phtml', '.pl', '.plist', '.properties', '.py', '.rb',
									'.sass', '.scss', '.sh', '.shtml', '.sql', '.taskpaper', '.tex', '.text', '.tmpl',
									'.tsv', '.txt', '.url', '.vb', '.xhtml', '.xml', '.yaml', '.yml'];

				$scope.onSaveSubmit = function() {
					var lowerFileExt = new Path($scope.fileName).extname().toLowerCase();
					var found = false;
					for (var i = validFileExt.length - 1; i >= 0; i--) {
						if(validFileExt[i] === lowerFileExt) {
							found = true;
							break;
						}
					};
					if(!found) {
						$scope.displayError = true;
						return;
					};

					var path = $scope.wtPath;
					var lastChar = (path.length > 0) ? path[path.length - 1] : '';
					if(lastChar !== '/' && lastChar !== '\\')
						path += '/';
					path += $scope.fileName;

					$scope.waiting = true;

					$timeout(function() {
						$scope.wtCreate({ path: path }).finally(function() {
							resetFields();
						})
					});
				};

				$scope.cancel = function() {
					resetFields();
				}
			},
			replace: true,
			templateUrl: "/partials/newFile"
		};
	});

	wolkentask.directive("syncButton", function(dropboxClientService) {
		return {
			restrict: "E",
			scope: {
				wtStatus: '=',
				wtSave: '&',
			},
			link: function($scope, $element, $attrs) {
				var buttonEl = $element;
				$scope.buttonText = "Saved";

				$scope.$watch('wtStatus', function() {
					buttonEl.removeClass("btn-warning btn-success btn-info");
					if($scope.wtStatus === dropboxClientService.SaveStatusEnum.saving) {
						buttonEl.addClass("btn-info");
						$scope.buttonText = "Saving...";
						buttonEl.prop("disabled", true);
					} else if($scope.wtStatus === dropboxClientService.SaveStatusEnum.saved) {
						buttonEl.addClass("btn-success");
						$scope.buttonText = "Saved";
						buttonEl.prop("disabled", true);
					} else { // unsaved
						buttonEl.addClass("btn-warning");
						$scope.buttonText = "Save";
						buttonEl.prop("disabled", false);
					} 
				});
			},
			replace: true,
			templateUrl: "/partials/syncButton"
		};
	});

	wolkentask.service('dropboxClientService', ['$q', '$timeout', function(q, timeout) {
		var dropboxClient = null;
		var cancelLongPoll = false;

		this.SaveStatusEnum = Object.freeze ({ saved: "saved", unsaved: "unsaved", saving: "saving" });

		this.initialize = function(providerId, providerToken, dropboxAppKey) {
			dropboxClient = new Dropbox.Client({ key: dropboxAppKey,
                                                token: providerToken,
                                                uid: providerId });
		};

		this.listDirectoryContent = function(path) {
	        var deferred = q.defer();

	        dropboxClient.readdir(path, {}, function(error, childNames, folderStat, childStats) {
                if(!error) {
                    var filesAndFolders = [];
                    childStats.forEach(function(childStat) {
                        filesAndFolders.push({
                            path : childStat.path,
                            name : childStat.name,
                            isFolder : childStat.isFolder
                        });
                    });
                    deferred.resolve(filesAndFolders);
                } else {
                	deferred.reject(error);
                }
	        });

	        return deferred.promise;
		};

		this.fileMetaData = function(path) {
	        var deferred = q.defer();

	        dropboxClient.stat(path, null, 
                function(error, fileStat) {
                    if(!error) {	
                        deferred.resolve(fileStat);
                    } else {
                        deferred.reject(error);
                    }
                });

	        return deferred.promise;			
		}

		this.writeFile = function(path, data, options) {
	        var deferred = q.defer();

	        dropboxClient.writeFile(path, data, options, 
                function(error, fileStat) {
                    if(!error) {	
                        deferred.resolve(fileStat);
                    } else {
                        deferred.reject(error);
                    }
                });

	        return deferred.promise;
		};

		this.readFile = function(path) {
			var deferred = q.defer();

			dropboxClient.readFile(path, {}, function(error, data, fileStat, range) {
				if(!error) {
					deferred.resolve( {
						data: data,
						fileStat: fileStat
					} );
				} else {
					deferred.reject(error);
				}
			});

			return deferred.promise;
		};

		this.cancelTrackChanges = function() {
			cancelLongPoll = true;
		}

		this.trackChanges = function() {
			var deferred = q.defer();
			var cursor = null;

			cancelLongPoll = false; 

			// Pulls all changes as long as Dropbox signals that more changes are to come
			var pullAllChanges = function(deferred, cursor) {
				dropboxClient.pullChanges(cursor, function(error, pulledChanges) {
					if(!error) {
						if(pulledChanges.shouldPullAgain) {
							deferred.notify(pulledChanges);
							pullAllChanges(deferred, pulledChanges);
						} else {
							deferred.resolve(pulledChanges);
						}
					} else {
						deferred.reject(error);
					}
				});

				return deferred.promise;
			};

			var long_poll = function() {
				dropboxClient.pollForChanges(cursor, null, function(poll_error, changes) {
					if(!poll_error) {
						if(changes && changes.hasChanges) {

							pullAllChanges(q.defer(), cursor).then(
								function(success) {
									deferred.notify(success);
									cursor = success;
									if(cancelLongPoll)
										return deferred.reject();
									timeout(function() { long_poll(); }, changes.retryAfter);
								},
								function(error) {
									if(cancelLongPoll)
										return deferred.reject();
									timeout(function() { long_poll(); }, 10 * 1000);
								},
								function(notify) {
									deferred.notify(notify);
								});

						} else {
							if(cancelLongPoll)
								return deferred.reject();
							timeout(function() { long_poll(); }, changes.retryAfter);
						}
					} else {
						if(cancelLongPoll)
							return deferred.reject();
						timeout(function() { long_poll(); }, 10 * 1000);
					}
				});				
			};	

			// Baseline cursor
			pullAllChanges(q.defer(), null).then(
				function(success) {
					cursor = success;
					return long_poll();
				},
				function(error) {
					return deferred.reject();
				});

			return deferred.promise;
		};
	}]);

	wolkentask.service('exceptionService', ['$rootScope', '$q', function(rootScope, q) {
		var ErrorEnum = { information:1, warning:2, fault:3 };
		var ErrorActionEnum = { inform:1, logout:2 };
		if(Object.freeze) {
			Object.freeze(ErrorEnum);
			Object.freeze(ErrorActionEnum);
		}

		this.raiseError = function(errorType, errorAction, message) {
			if(errorType instanceof Dropbox.ApiError) {
				var error = errorType;
				if(error.status === Dropbox.ApiError.INVALID_TOKEN)
					this.raiseError(ErrorEnum.warning, ErrorActionEnum.logout, "Your login details are not valid anymore. Please re-authorize wolkentask.");
				else if(error.status === Dropbox.ApiError.NOT_FOUND)
					this.raiseError(ErrorEnum.warning, ErrorActionEnum.inform, "This folder / file doesn't exist.");
				else if(error.status === Dropbox.ApiError.RATE_LIMITED)
					this.raiseError(ErrorEnum.warning, ErrorActionEnum.inform, "You have exceeded the number of queries to the Dropbox API. Please retry in a couple of minutes.")
				else if (error.status === Dropbox.ApiError.OVER_QUOTA)
					this.raiseError(ErrorEnum.fault, ErrorActionEnum.inform, "You've run out of storage. Your request couldn't be completed.")
				else
					this.raiseError(ErrorEnum.fault, ErrorActionEnum.inform, "A critical issue occurred: " + error.responseText);
			} else {
				rootScope.$broadcast('error', errorType, errorAction, message);
			}
		};

	}]);

	wolkentask.service('favoritesService', ['$http', '$q', function(http, q) {

		var favorites = null;
		var self = this;

		var getIndexForPath = function(path) {
			if(favorites === null || !path || !path.length)
				return null;
			for (var i = favorites.length - 1; i >= 0; i--) {
				if(favorites[i].path.toLowerCase().trim() === path.toLowerCase().trim())
					return i;
			};
			return null;
		};

		var getIdForPath = function(path) {
			var i = getIndexForPath(path);
			if(i === null)
				return null;
			else
				return favorites[i]._id;
		};

		this.isFavorite = function(path) {
			return (getIndexForPath(path) !== null);
		};

		this.receiveFavorites = function(forceReload) {
			if(forceReload || favorites === null) {
				return http.get('/user/favorites').then(function (returnData) {
						favorites = angular.copy(returnData.data.favorites, favorites);
						return favorites;
					});
			} else {
				var deferred = q.defer();
				deferred.resolve(favorites);
				return deferred.promise;
			}
		};
		
		this.addFavorite = function(path) {
			if(!path || !path.length)
				return q.reject("No path provided");
			var favId = getIdForPath(path);
			if(favId !== null) {
				var deferred = q.defer();
				deferred.resolve(favId);
				return deferred.promise;
			}
			var name = new Path(path).basename();
			return http.put('/user/favorite.json', 
							{ 	path: path,
								name: name
							}).then(function(returnData) {
								return self.receiveFavorites(true);
							})
		},

		this.removeFavorite = function(path) {
			var favIndex = getIndexForPath(path);
			var favId = favorites[favIndex]._id.toString();
			if(favIndex === null || favId === null)
				return q.reject("Favorite doesn't exist");

			return http.delete('/user/favorites/' + favId).success(function(data) {
				favorites.splice(favIndex, 1);
			});
		};
	}]);

	wolkentask.filter('ensureHomePath', function() {
		return function(input) {
			input = input.trim();
			if(!input || input === "" || input === "/" || input === ".")
				return "Home";
			else if(input[0] == "/")
				return input;
			else
				return "/" + input;
		}
	});