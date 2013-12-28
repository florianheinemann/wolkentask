function WolkentaskController($scope, $http, $q, favoritesService) {

    $scope.dropboxClient = null;

    $scope.accountInfo = {
        quota: 0,
        usedQuota: 0
    };

    $scope.userCredentials = {
            providerId : null,
            providerToken: null,
            userId: null
    };

    $scope.dropboxAppKey = '';
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

    $scope.initialize = function(providerId, providerToken, userId, dropboxAppKey) {
        $scope.userCredentials.providerId = providerId;
        $scope.userCredentials.providerToken = providerToken;
        $scope.userCredentials.userId = userId;
        $scope.dropboxAppKey = dropboxAppKey;
        $scope.dropboxClient = new Dropbox.Client({ key: dropboxAppKey,
                                                    token: providerToken,
                                                    uid: providerId });

        favoritesService.receiveFavorites(true).then(function(data) {
            $scope.favorites = data;
        });
    };

    $scope.isInRootFolder = function() {
        return (!$scope.currentFolder || $scope.currentFolder == "" || $scope.currentFolder == "." || $scope.currentFolder == "/");
    }

    $scope.refreshAccountInfo = function() {
        $scope.dropboxClient.getAccountInfo(null, function(error, info, json_info) {
            $scope.$apply(function() {
                if(!error) {
                    $scope.accountInfo.quota = info.quota;
                    $scope.accountInfo.usedQuota = info.usedQuota;
                }     
            })
        });
    };

    $scope.requestFolderContent = function(path) {
        var deferred = $q.defer();

        $scope.dropboxClient.readdir(path, {}, function(error, childNames, folderStat, childStats) {
            $scope.$apply(function() {
                if(!error) {
                    $scope.filesAndFolders = [];
                    childStats.forEach(function(childStat) {
                        $scope.filesAndFolders.push({
                            path : childStat.path,
                            name : childStat.name,
                            isFolder : childStat.isFolder
                        });
                    });
                    $scope.parentFolder = new Path(path).dirname();
                    $scope.currentFolder = path;
                }
                deferred.resolve();
            })
        });

        return deferred.promise;
    };

    $scope.getFile = function(path) {        
        var deferred = $q.defer();

        $scope.dropboxClient.readFile(path, {}, function(error, data, fileStat, range) {
            $scope.$apply(function() {
                if(!error) {
                    $scope.currentFilePath = path;
                    $scope.currentFileName = new Path(path).basename();
                    $scope.currentFileData = parseFile(data);
                    $scope.currentFileVersion = fileStat.versionTag;
                    $scope.saveStatus = "saved";
                }
                deferred.resolve();
            })
        });

        return deferred.promise;
    };

    function parseFile(dataAsString) {
        
        // if(stringIsHtml(dataAsString))
            // return parseHtml(dataAsString);

        var parsedData = [];
        splittedString = dataAsString.split("\n");
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
    };

    $scope.saveFile = function() {
        if($scope.currentFileData) {
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

            $scope.dropboxClient.writeFile($scope.currentFilePath, dataToWrite, 
                                            { lastVersionTag: $scope.currentFileVersion }, 
                                            function(error, fileStat) {
                $scope.$apply(function() {
                    if(!error) {
                        $scope.currentFileVersion = fileStat.versionTag;
                        $scope.saveStatus = "saved";
                    } else {
                        $scope.saveStatus = "unsaved";
                    }
                })
            });
        }
    };
}