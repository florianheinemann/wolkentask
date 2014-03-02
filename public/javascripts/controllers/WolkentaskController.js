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
            $window.location.href = '/logout';
        }
    });

    $scope.logout = function() {
        $window.location.href = '/logout';
    }

    $scope.initialize = function(providerId, providerToken, dropboxAppKey) {

        dropboxClientService.initialize(providerId, providerToken, dropboxAppKey);

        dropboxClientService.trackChanges().then(function() {}, function() {}, 
            function() {
                $scope.requestFolderContent($scope.currentFolder);

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

        if(!saveQueue) {
            saveQueue = true;
            
            $timeout(function() {}, 5000).then(function() {
                return $scope.saveFile();
            }).finally(function() {
                saveQueue = false;
            });
        } else {
            // No point in backlogging several timers
            if(saveDelayTimer)
                $timeout.cancel(saveDelayTimer);
            saveDelayTimer = $timeout(function() { fileChanged(); }, 1000);
        }
    };

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

            dropboxClientService.writeFile($scope.currentFilePath, dataToWrite, 
                        { lastVersionTag: $scope.currentFileVersion }).then(
                            function(fileStat) {
                                $scope.currentFileVersion = fileStat.versionTag;
                                $scope.saveStatus = "saved";
                            }, function(error) {
                                exceptionService.raiseError(error);
                                $scope.saveStatus = "unsaved";
                            }).finally(function() {
                                deferred.resolve();
                            });

            return deferred.promise;
        } else {
            return $q.reject("No data to be saved.");
        }
    };

    $scope.toggleNavMenu = function() {
        $scope.showNavMenu = !$scope.showNavMenu;
    }
}