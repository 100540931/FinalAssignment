var App = angular.module('finalAssignment', []);

// Directive to apply class to the selected model.
App.directive('model', function() {
  return {
    restrict : 'C',
    link: function(scope, element, attrs) {
      element.bind('click', function() {
        element.parent().parent().children().removeClass('selected');
        element.parent().addClass('selected');
      })
    },
  }
});

// Directive used for our upload method
App.directive('fileModel', ['$parse', function ($parse) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      var model = $parse(attrs.fileModel);
      var modelSetter = model.assign;
      
      element.bind('change', function(){
        scope.$apply(function(){
          modelSetter(scope, element[0].files[0]);
        });
      });
    }
  };
}]);

// Setting up angular services .
App.service('httpTools', ['$http', '$rootScope', '$timeout', function ($http, $rootScope, $timeout) {
  //
  this.models = function(){
    $http.get(url).success(function (data) {
      console.log('List of models successfully refreshed!');
      $rootScope.models = data;
    }).error(function (data, status, headers, config) {
      $rootScope.models = {};
      console.log("Couldn't refresh the list of models, error # " + status);
    });
  }
  
  // If the model was uploaded with success, it is added at the end of the list.
  this.uploadModel = function(file, uploadUrl){
    var fd = new FormData();
    fd.append('file', file);
    $http.put(uploadUrl, fd, {
      transformRequest: angular.identity,
      headers: {'Content-Type': undefined}
    }).success(function(data, status, headers, config) {
      console.log(file.name + " Successful Uploaded");
    });
  }
  
  // If the model was deleted with success, it is showed a message.
  this.deleteModel = function(url){
    $http.delete(url, {
      headers: {'Content-Type': undefined}
    }).success(function(data, status, headers, config) {
      console.log(url.substr(url.lastIndexOf('/')+1) + " Successful Deleted");
    });
  }
}]);

// Setting up controllers and objects' behaviour.
App.controller('modelsCtrl', ['$scope', 'httpTools', function ($scope, httpTools) {    
 
  // Clear list of models.
  $scope.clear = function () {
    $scope.models = {};
    console.log('clean list of models');

    // Return the scope in case the caller wants to manually update.
    return $scope;
  };
  
  // Verifies the current model name.
  $scope.checkCurrentModel = function(name) {
    return currentModel === name;
  }
  
  // Function to start a file upload
  $scope.uploadFile = function(){
    var file = $scope.myFile;
    var uploadUrl = server + file.name;
    
    console.log('Uploading -> ' + file.name);
    httpTools.uploadModel(file, uploadUrl);
  };
  
  // Function to delete a model
  $scope.deleteModel = function(event, elem, name) {
    modelUrl = server + name;
    console.log('Deleting -> ' + name);
    httpTools.deleteModel(modelUrl);    
  }
  
  // Function to display the selected model
  $scope.loadModel = function(event, name) {
    modelUrl = server + name;
    if(scene.children !== null){
      var allChildren = scene.children;
      var lastObject = allChildren[allChildren.length-1];
      if (lastObject instanceof THREE.Mesh) {
          scene.remove(lastObject);
      }
    }
    currentModel = name;
    console.log('Loading -> ' + name);
    addModel(modelUrl, 0x55B663);
    console.log(name + " Successful Loaded");
    camera.position.set(0, 0, 50);
    camera.rotation.set(0, 0, 0);
    camera.lookAt(scene.position);
    controls.reset();
  }
}]);