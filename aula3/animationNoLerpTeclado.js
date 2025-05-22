import * as THREE from 'three';
import GUI from '../libs/util/dat.gui.module.js'
import KeyboardState from '../libs/util/KeyboardState.js'
import {TrackballControls} from '../build/jsm/controls/TrackballControls.js';
import {initRenderer, 
        initDefaultSpotlight,
        initCamera,
        createGroundPlane,
        onWindowResize} from "../libs/util/util.js";

let scene    = new THREE.Scene();    // Create main scene
let renderer = initRenderer();    // View function in util/utils
let light    = initDefaultSpotlight(scene, new THREE.Vector3(7.0, 7.0, 7.0), 300); 
let camera   = initCamera(new THREE.Vector3(3.6, 4.6, 8.2)); // Init camera in this position
let trackballControls = new TrackballControls(camera, renderer.domElement );

//Usar teclado
var keyboard = new KeyboardState();

// To be used to manage keyboard
let clock = new THREE.Clock();

// Show axes 
let axesHelper = new THREE.AxesHelper( 5 );
  axesHelper.translateY(0.1);
scene.add( axesHelper );

// Listen window size changes
window.addEventListener( 'resize', function(){onWindowResize(camera, renderer)}, false );

let groundPlane = createGroundPlane(10, 10, 40, 40); // width, height, resolutionW, resolutionH
  groundPlane.rotateX(THREE.MathUtils.degToRad(-90));
scene.add(groundPlane);

// Create sphere
let geometry1 = new THREE.SphereGeometry( 0.2, 32, 16 );
let material1 = new THREE.MeshPhongMaterial({color:"red", shininess:"200"});
let obj1 = new THREE.Mesh(geometry1, material1);
  obj1.castShadow = true;
  obj1.position.set(-3, 0.2, -3);
scene.add(obj1);

let geometry2 = new THREE.SphereGeometry( 0.2, 32, 16 );
let material2 = new THREE.MeshPhongMaterial({color:"blue", shininess:"200"});
let obj2 = new THREE.Mesh(geometry2, material2);
  obj2.castShadow = true;
  obj2.position.set(-3, 0.2, 0);
scene.add(obj2);

render();

function keyboardUpdate() {

  keyboard.update();

  var speed = 30;
  var moveDistance = speed * clock.getDelta();

  // Keyboard.down - execute only once per key pressed
  if ( keyboard.down("left") )   obj1.translateX( -1 );
  if ( keyboard.down("right") )  obj1.translateX(  1 );
  if ( keyboard.down("up") )     obj1.translateZ(  1 );
  if ( keyboard.down("down") )   obj1.translateZ( -1 );

  if ( keyboard.down("A") )  obj2.translateX( -1 );
  if ( keyboard.down("D") )  obj2.translateX(  1 );
  if ( keyboard.down("W") )  obj2.translateZ(  1 );
  if ( keyboard.down("S") )  obj2.translateZ( -1 );

}

function render()
{
  trackballControls.update();
  
  requestAnimationFrame(render);
  keyboardUpdate();
  renderer.render(scene, camera) // Render scene
}