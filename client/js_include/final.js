// Keep global variables clean.
var renderer = null;
var scene = null;
var camera = null;
var controls = null;
var view = null;
var timer = null;
var currentModel = null;
var ws = null;
var server = "//localhost:8080/models/";
var url = server + '?format=json&name=1';

// Initialize a scene with an id, model, and colour.
function initScene(){  
  var parent = document.getElementById('container');

  // Create a renderer.
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });

  // Use the full window size with clear background.
  renderer.setSize(parent.offsetWidth, parent.offsetHeight);
  renderer.setClearColor(0x000000, 0);

  // Add the renderer to the DOM.
  parent.appendChild(renderer.domElement);

  view = renderer.domElement;
  
  // Create a scene.
  scene = new THREE.Scene();

  // Create a camera.
  camera = new THREE.PerspectiveCamera(45, parent.offsetWidth / parent.offsetHeight, 1, 2000 );

  // Don't get too close.
  camera.position.z = 50;
  
  // Add the camera to the scene.
  scene.add(camera);

  
  // Add some simple controls to look at the pretty model.
  controls = new THREE.TrackballControls(camera, renderer.domElement, function(object)
	      {
	      var message = 
	        {
	        action: 'update',
	        name: currentModel,
	        update: object
	        };

	      ws.send(JSON.stringify(message));
	      });

  // Set up the controls with some good defaults.
  controls.rotateSpeed = 1.0;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.2;

  controls.noZoom = false;
  controls.noPan = false;

  controls.staticMoving = false;
  controls.dynamicDampingFactor = 0.3;

  controls.minDistance = 1.1;
  controls.maxDistance = 100;

  // [ rotateKey, zoomKey, panKey ]
  controls.keys = [ 16, 17, 18 ];

  // Set up some mood lighting.
  var dirLight = new THREE.DirectionalLight(0xffffff, 0.95);

  dirLight.position.set(-3, 3, 7);
  dirLight.position.normalize();
  scene.add(dirLight);
 
  // And some additional lighting.
  var pointLight = new THREE.PointLight(0xFFFFFF, 5, 50);

  pointLight.position.set(10, 20, -10);
  scene.add(pointLight); 
}

function addModel(modelSource, color){
  // Now load the model.
  var jsonLoader = new THREE.JSONLoader();

  jsonLoader.load(modelSource, function(geometry){
    // Compute vertex normals to make the entire model smooth.
    geometry.computeVertexNormals();
    
    var model = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({color: color}));
    
    // Set the rotation center to center of the object
    THREE.GeometryUtils.center(geometry);
    
    // Add the model.
    scene.add(model);

    requestAnimationFrame(function(){
      renderer.render(scene, camera);
    });
        
    // Increase or decrease to object to fit it on the scenario
    geometry.computeBoundingBox();    
    var modelSize = geometry.boundingBox.size().length() * 0.5;
    var distToCenter = modelSize/Math.sin( Math.PI / 180.0 * camera.fov * 0.5);
    var target = controls.target;
    var vec = new THREE.Vector3();
    vec.subVectors( camera.position, target );
    vec.setLength( distToCenter );
    camera.position.addVectors(  vec , target );
  });
}

// Start listening for events.
function listenToEvents(){
  // Listen for the start of user interaction.
  view.addEventListener('mousedown', startListeningToEvents);
  view.addEventListener('touchstart', startListeningToEvents);
  
  // The mouse wheel event is special, just manually update it.
  view.addEventListener('mousewheel', updateMouseWheel);
  view.addEventListener('DOMMouseScroll', updateMouseWheel);
}

// Manually update the display in response to mouse wheel events.
function updateMouseWheel(){
  requestAnimationFrame(function(){
    controls.update();
    renderer.render(scene, camera);
  });
}
 
// Start listening for mouse events. 
function startListeningToEvents(){
  // Set up a timer to update the display independently from user interface events.
  timer = setInterval(function(){
              requestAnimationFrame(function(){
                controls.update();      
                renderer.render(scene, camera);
              });
            },
          10);
      
  // Now listen for user interface vents.
  view.addEventListener('mouseup', stopListeningToEvents);
  view.addEventListener('mouseout', stopListeningToEvents);
  view.addEventListener('touchend', stopListeningToEvents);
}

// Stop listening for user interface events.  
function stopListeningToEvents(){
  // Stop updating the display.
  clearInterval(timer);
  
  view.removeEventListener('mouseup', stopListeningToEvents);
  view.removeEventListener('mouseout', stopListeningToEvents);
  view.removeEventListener('touchend', stopListeningToEvents);
}

// Verifies if the server is on-line or not.
function checkServer(){
  jQuery.ajaxSetup({async:false});
  re="";
  r=Math.round(Math.random() * 10000);
  $.get(server, {format:'json',name:'1',subins:r},function(d){
    re=true;
  }).error(function(){
    re=false;
  });
  return re;
}

function isServerOnline(){
  // Check if server is on-line.
  if(!checkServer()){
    //If yes, deactivate the Connect button
    $('#connect').addClass("deactivated");
    // Show the Server Offline message
    $('.error').fadeIn();
    
    // Keep verifying the server while it is offline
    var online = setInterval( function() {
      // If server online
      if(checkServer()){
        // Hide the message
        $('.error').fadeOut();
        // Turn on the connect button
        $('#connect').removeClass("deactivated");
        // Disable the loop
        clearInterval(online);
      }      
    }, 5000);
  }
}
  
// Once the document is ready, set up the interface and bind functions to 
// DOM elements.
$(document).ready(function() {
  initScene();          
  listenToEvents();
  
  // Function Is Server Online?
  isServerOnline();
     
  // Hide sections Upload and Models.
  $('#uploadContainer').css('display', 'none');
  $('hr').css('display', 'none');
  $('#models').css('display', 'none');
  
  
  // Bind function to establish connection to connect button.        
  $("#connect").click(function () {
    var that = this;
    
    if(!$(this).hasClass("deactivated")){
      // Connect the global variable to the server.
      ws = new WebSocket("ws://localhost:8080");

      // I am connected.
      ws.onopen = function(){
        // Enable disconnect button.
        $("#disconnect").removeClass("deactivated");
        // Disable connect button.
        $(that).addClass("deactivated");
        
        // Show sections Upload and Models.
        $('#uploadContainer').fadeIn();
        $('hr').fadeIn();
        $('#models').fadeIn();
        
        // Load Models.
        angular.element(document).injector().get('httpTools').models();
      };
      
      // Handle a message from the server.
      ws.onmessage = function(event){ 
        // WebSockets does text and binary, not structured data.
        // Manually parse the JSON.
        var message = JSON.parse(event.data);
        
        if(message.action == 'update'){
          // Only update the model if it matches the current model.
          if(message.name == currentModel){
            controls.handleRemoteEvent(message.update);

            requestAnimationFrame(function(){
              renderer.render(scene, camera);
            });
          }
        } else if(message.action == 'newmodel' || message.action == 'deletemodel'){
          
          // Load models
          angular.element(document).injector().get('httpTools').models();
          
          if(message.action == 'deletemodel' && message.name == currentModel){ // If the current model was deleted
            var allChildren = scene.children;
            var lastObject = allChildren[allChildren.length-1];
            scene.remove(lastObject);
            
            // Clear the display
            renderer.render(scene, camera);
            // Empty the current model variable
            currentModel = "";
          } else { // If a newmodel action or a delect action of a non current model
            var modelElem = "span:contains('" + message.name + "')";
            
            // Add the selected class to the last current model
            $(modelElem).parent().addClass('selected');
          }
        }
      };
      
      // Let the user know that the connection was closed.
      ws.onclose = function() {        
        // Clear things out.
        angular.element($('#modelsList')).scope().clear().$apply();
      
        // Hide sections Upload and Models.
        $('#uploadContainer').fadeOut();
        $('hr').fadeOut();
        $('#models').fadeOut();
        
        // Enable connect button.
        $(that).removeClass("deactivated");
        
        // Disable disconnect button.
        $("#disconnect").addClass("deactivated");
        
        // Function "Is Server Online?"
        isServerOnline();
      };
    }
  });
  
  // Bind function to disconnect from server.
  $("#disconnect").click(function () {
    if(!$(this).hasClass("deactivated")){
      // Manually disconnect from web sockets, even though I don't need to.
      ws.close();
    }
  });
  
  // Show to user the name of select file
  $("#btnUpload").change(function () {
    var name = $(this).val();
    if(name === '') 
      name = "No file selected";
    $("#filename").css("display","block").html(name.substr(name.lastIndexOf('\\')+1));
  });
});