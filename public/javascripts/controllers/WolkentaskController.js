"use strict";
function WolkentaskController($scope, $http, $q, $window, $timeout, favoritesService, exceptionService, dropboxClientService) {

	var saveQueue = false;
	var saveDelayTimer = null;
	$scope.showNavMenu = true;
	$scope.filesAndFolders = [];
	$scope.parentFolder = '';
	$scope.currentFolder = '';
	$scope.currentFilePath = '';
	$scope.currentFileName = '';
	$scope.currentFileData = [];
	$scope.currentFileVersion = '';
	$scope.favorites = [];
	$scope.backString = "..";
	$scope.newTodo = {
		rawData: ""
	};
	$scope.saveStatus = "saved";

	$scope.$on('error', function(name, errorType, errorAction, message) {
		alert(message);

		if(errorAction === 2) {
			$scope.logout();
		}
	});

	$scope.logout = function() {
		$window.location.href = '/logout';
	}

	$scope.initialize = function(providerId, providerToken, dropboxAppKey) {

		dropboxClientService.initialize(providerId, providerToken, dropboxAppKey);

		dropboxClientService.trackChanges().then(function() {}, 
			function(error) {
				exceptionService.raiseError(error);
			}, 
			function(changedFiles) {

				// Avoid refresh of file list if the only change is an update of the currently opened file
				if(changedFiles.changes.length !== 1 ||
					changedFiles.changes[0].path.toLowerCase() !== $scope.currentFilePath.toLowerCase() || 
					changedFiles.changes[0].wasRemoved) {
						$scope.requestFolderContent($scope.currentFolder);
				}

				// Refresh currently shown file to latest version if not edited
				if($scope.currentFileName) {
					dropboxClientService.fileMetaData($scope.currentFilePath).then(function(fileStat) {
						if($scope.currentFileVersion !== fileStat.versionTag) {
							if($scope.saveStatus === "saved") {
								$scope.getFile($scope.currentFilePath);
							}
						}
					});
				}
			});

		$scope.requestFolderContent('');

		favoritesService.receiveFavorites(true).then(function(data) {
			$scope.favorites = data;
		});
	};

	$scope.isInRootFolder = function() {
		return (!$scope.currentFolder || $scope.currentFolder == "" || $scope.currentFolder == "." || $scope.currentFolder == "/");
	}

	$scope.requestFolderContent = function(path) {
		var deferred = $q.defer();

		dropboxClientService.listDirectoryContent(path).then(
			function(data) {
				$scope.filesAndFolders = data;
				$scope.parentFolder = new Path(path).dirname();
				$scope.currentFolder = path;
				deferred.resolve();
			}, function(error) {
				exceptionService.raiseError(error);
				deferred.reject();
			});

		return deferred.promise;
	};

	$scope.createNewFile = function(path) {
		var deferred = $q.defer();
		dropboxClientService.writeFile(path, "- [ ] Your first todo", 
				{ noOverwrite: true }).then(
				function(success) {
					$scope.requestFolderContent($scope.currentFolder).then(function(fileStat) {
						deferred.resolve();
					});
				}, function(error) {
					exceptionService.raiseError(error);
					deferred.reject();
				});
		return deferred.promise;
	};

	$scope.getFile = function(path) {        
		var deferred = $q.defer();

		dropboxClientService.readFile(path).then(function(success) {
			$scope.currentFilePath = path;
			$scope.currentFileName = new Path(path).basename();
			$scope.currentFileData = parseFile(success.data);
			$scope.currentFileVersion = success.fileStat.versionTag;
			$scope.showNavMenu = false;
			$scope.saveStatus = "saved";  
			if(saveDelayTimer)
				$timeout.cancel(saveDelayTimer);
			saveQueue = false;
			deferred.resolve();         
		}, function(error) {
			exceptionService.raiseError(error);
			deferred.reject();
		});

		return deferred.promise;
	};

	function parseFile(dataAsString) {

		var parsedData = [];
		var splittedString = dataAsString.split("\n");
		splittedString.forEach(function(line) {
			var regexToFindTodo = /^\s*-*\s*\[\s*_*(x|X)?\s*\]/g;
			var regexToFindLine = /^\s*-*\s*/g;

			var parsedDataLine = {  rawData: line,
								displayData: line.trim(),
								display: true,
								inTodoFormat : false,
								done : false,
								changed : false };

			if(parsedDataLine.displayData == "") {
			   parsedDataLine.display = false;
			} else {
				var regexResults = regexToFindTodo.exec(parsedDataLine.displayData);
				parsedDataLine.inTodoFormat = regexResults != null;
				if(parsedDataLine.inTodoFormat) {
					parsedDataLine.displayData = parsedDataLine.displayData.substr(regexToFindTodo.lastIndex).trim();
					parsedDataLine.done = !(typeof regexResults[1] === "undefined");
				} else {
					var match = regexToFindLine.exec(parsedDataLine.displayData);
					if(match) 
						parsedDataLine.displayData = parsedDataLine.displayData.substr(regexToFindLine.lastIndex).trim();
				}
			}

			parsedData.push(parsedDataLine);
		});

		return parsedData;
	};

	$scope.addNewTodo = function() {
		if($scope.newTodo.rawData && $scope.currentFileData) {
			var newTodoData = {  rawData: $scope.newTodo.rawData,
								displayData: $scope.newTodo.rawData.trim(),
								display: true,
								inTodoFormat : true,
								done : false,
								changed : true };

			$scope.currentFileData.unshift(newTodoData);
			$scope.newTodo.rawData = "";
			fileChanged();
		}
	};

	$scope.markAllTodosAs = function(ticked) {
		if(!$scope.currentFileData)
			return;

		var anyChange = false;
		$scope.currentFileData.forEach(function(todo) {
			if(todo.done !== ticked) {
				todo.changed = true;
				todo.done = ticked;
				anyChange = true;
			}
		});

		if(anyChange)
			fileChanged();
	};

	$scope.updateTodo = function(todo) {
		if($scope.currentFileData) {
			todo.changed = true;
			todo.rawData = todo.displayData;
			fileChanged();
		}
	};

	$scope.deleteTodo = function(todo) {
		if($scope.currentFileData) {
			var indexOfTodo = $scope.currentFileData.indexOf(todo);
			if(indexOfTodo >= 0) {
				$scope.currentFileData.splice(indexOfTodo, 1);
				fileChanged();
			}
		}
	};

	function fileChanged() {
		$scope.saveStatus = "unsaved";
		queueSave();
	};

	function queueSave() {
		if(!saveQueue) {
			saveQueue = true;
			$timeout(function() {}, 5000).then(function() {
				$scope.saveFile().finally(function() {
					saveQueue = false;
				});
			});
		} else {
			// No point in backlogging several timers
			if(saveDelayTimer) {
				$timeout.cancel(saveDelayTimer);
			}

			saveDelayTimer = $timeout(function() { queueSave(); }, 1000);
		}		
	}

	$scope.saveFile = function() {
		var deferred = $q.defer();

		if($scope.currentFileData && $scope.saveStatus === "unsaved") {
			$scope.saveStatus = "saving";

			var dataToWrite = "";
			$scope.currentFileData.forEach(function(line) {
				if(line.changed) {
					if(line.done) {
						dataToWrite += "- [x] " + line.displayData + "\n";
					} else {
						dataToWrite += "- [ ] " + line.displayData + "\n";
					}
				} else {
					dataToWrite += line.rawData + "\n";
				}
			});

			if(dataToWrite.length > 0)
				dataToWrite = dataToWrite.substr(0, dataToWrite.length - 1);

			dropboxClientService.writeFile($scope.currentFilePath, dataToWrite).then(
							function(fileStat) {
								$scope.currentFileVersion = fileStat.versionTag;
								$scope.saveStatus = "saved";
							}, function(error) {
								exceptionService.raiseError(error);
								$scope.saveStatus = "unsaved";
							}).finally(function() {
								deferred.resolve();
							});

		} else {
			deferred.reject("No data to be saved.");
		}
		
		return deferred.promise;
	};

	$scope.toggleNavMenu = function() {
		$scope.showNavMenu = !$scope.showNavMenu;
	}
}