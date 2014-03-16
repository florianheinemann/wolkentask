"use strict";
function WolkentaskController($scope, $http, $q, $window, $timeout, favoritesService, exceptionService, dropboxClientService) {

	var saveDelayTimer = null;
	var lastSaveTime = 0;
	var lastEditTime = 0;
	$scope.saveStatus = dropboxClientService.SaveStatusEnum.saved;

	$scope.staticMarkAllCheckboxT = true;
	$scope.staticMarkAllCheckboxF = false;
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

	$scope.$on('error', function(name, errorType, errorAction, message) {
		alert(message);

		if(errorAction === 2) {
			$window.location.href = '/logout';
		}
	});

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
							if($scope.saveStatus === dropboxClientService.SaveStatusEnum.saved) {
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
		return (!$scope.currentFolder || $scope.currentFolder === "" || $scope.currentFolder === "." || $scope.currentFolder === "/");
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

	$scope.getFile = function(path, isFavorite) {        
		var deferred = $q.defer();

		if($scope.saveStatus !== dropboxClientService.SaveStatusEnum.saved) {
			if(!confirm("There are still some unsaved changes. Are you sure you would like to load a different file and lose those changes?")) {
				deferred.reject("Unsaved changes detected");
				return deferred.promise;
			}
		}

		dropboxClientService.readFile(path).then(function(success) {
			$scope.currentFilePath = path;
			$scope.currentFileName = new Path(path).basename();
			$scope.currentFileData = parseFile(success.data);
			$scope.currentFileVersion = success.fileStat.versionTag;
			$scope.showNavMenu = false;

			$scope.saveStatus = dropboxClientService.SaveStatusEnum.saved;
			lastSaveTime = Date.now();
			lastEditTime = 0;
			if(saveDelayTimer) {
				$timeout.cancel(saveDelayTimer);
				saveDelayTimer = null;
			}

			deferred.resolve();         
		}, function(error) {
			deferred.reject();
			if(isFavorite && confirm("This file can't be retrieved. Would you like to remove this favorite from your list?")) {
					favoritesService.removeFavorite(path);
					return;
			}
			exceptionService.raiseError(error);
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

		$scope.staticMarkAllCheckboxT = true;
		$scope.staticMarkAllCheckboxF = false;
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

	function updateSaveStatus(ignoreSavingStatus) {
		ignoreSavingStatus = ignoreSavingStatus || false;
		if(!$scope.currentFileData) {
			$scope.saveStatus = dropboxClientService.SaveStatusEnum.saved;
		} else if(ignoreSavingStatus || $scope.saveStatus !== dropboxClientService.SaveStatusEnum.saving) {
			if(lastEditTime >= lastSaveTime)
				$scope.saveStatus = dropboxClientService.SaveStatusEnum.unsaved;
			else
				$scope.saveStatus = dropboxClientService.SaveStatusEnum.saved;
		}
	};

	function fileChanged() {
		lastEditTime = Date.now();
		updateSaveStatus();
		triggerSaveQueue();
	};

	function triggerSaveQueue() {

		if(saveDelayTimer) {
			$timeout.cancel(saveDelayTimer);
			saveDelayTimer = null;
		}

		saveDelayTimer = $timeout(function() {
			updateSaveStatus();

			switch($scope.saveStatus) {
				case dropboxClientService.SaveStatusEnum.unsaved:
					$scope.saveFile();
					triggerSaveQueue();
					break;

				case dropboxClientService.SaveStatusEnum.saving:
					triggerSaveQueue();
					break;

				case dropboxClientService.SaveStatusEnum.saved:
					$timeout.cancel(saveDelayTimer);
					saveDelayTimer = null;
					break;
			}
		}, 5000);	
	}

	$scope.saveFile = function() {
		var deferred = $q.defer();

		if($scope.currentFileData && $scope.saveStatus !== dropboxClientService.SaveStatusEnum.saved) {
			$scope.saveStatus = dropboxClientService.SaveStatusEnum.saving;

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

			var newSaveTime = Date.now();

			dropboxClientService.writeFile($scope.currentFilePath, dataToWrite).then(
							function(fileStat) {
								$scope.currentFileVersion = fileStat.versionTag;
								lastSaveTime = newSaveTime;
								updateSaveStatus(true);
								deferred.resolve();
							}, function(error) {
								exceptionService.raiseError(error);
								updateSaveStatus(true);
								deferred.reject();
							});

		} else {
			deferred.resolve();
		}
		
		return deferred.promise;
	};

	$scope.toggleNavMenu = function() {
		$scope.showNavMenu = !$scope.showNavMenu;
	}
}