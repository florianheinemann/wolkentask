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
				var iconEl = $element.find("i");

				if($attrs.wtType == "folder") {
					iconEl.addClass("fa-folder");
				} else if($attrs.wtType == "back") {
					iconEl.addClass("fa-chevron-circle-left");
				} else {
					iconEl.addClass("fa-file");
				}

				return function ($scope, $element, $attrs, $controller) {
					$scope.open = function() {
						$scope.loading = true;
						$scope.wtOpen().then(function() {
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

	wolkentask.directive("inlineEdit", function() {
		return {
			restrict: "E",
			scope: {
				wtData: '=',
				wtSave: '&',
				wtDelete: '&'
			},
			controller: function($scope) {
				$scope.cancel = function() {
					$scope.wtData = $scope.originalText;
					$scope.displayEdit = false;
				};

				$scope.showEdit = function() {
					$scope.originalText = $scope.wtData;
					$scope.displayEdit = true;
				};

				$scope.save = function() {
					$scope.displayEdit = false;
					$scope.wtSave();
				};
			},
			replace: true,
			templateUrl: "/partials/inlineEdit"
		};
	});

	wolkentask.directive("syncButton", function() {
		return {
			restrict: "E",
			scope: {
				wtStatus: '=',
				wtSave: '&'
			},
			link: function($scope, $element, $attrs) {
				var buttonEl = $element;

				$scope.$watch('wtStatus', function() {
					buttonEl.removeClass("btn-default btn-warning btn-success btn-info");
					if($scope.wtStatus == "saving") {
						buttonEl.addClass("btn-info");
						buttonEl.text("Saving...");
						buttonEl.prop("disabled", true);
					} else if($scope.wtStatus == "saved") {
						buttonEl.addClass("btn-success");
						buttonEl.text("Saved");
						buttonEl.prop("disabled", true);
					} else { // unsaved
						buttonEl.addClass("btn-warning");
						buttonEl.text("Save");
						buttonEl.prop("disabled", false);
					} 
				});
			},
			replace: true,
			templateUrl: "/partials/syncButton"
		};
	});

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
			if(!input || input == "" || input == "/" || input == ".")
				return "Home";
			else if(input[0] == "/")
				return input;
			else
				return "/" + input;
		}
	});