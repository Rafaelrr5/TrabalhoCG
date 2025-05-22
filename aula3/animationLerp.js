import * as THREE from 'three';
import GUI from '../libs/util/dat.gui.module.js'
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

// Variables that will be used for linear interpolation
const esf1Config = {
  destination: new THREE.Vector3(0.0, 0.2, 0.0),
  alpha: 0.01,
  move: true
}

const esf2Config = {
  destination: new THREE.Vector3(0.0, 0.2, 0.9),
  alpha: 0.09,
  move: true
}

buildInterface();
render();

function buildInterface()
{     
  let gui = new GUI();

  let esf1 = gui.addFolder("Esfera 1");
    esf1.open();   
    esf1.add(esf1Config, "move",  true)
            .name("Move Object");

  let esf2 = gui.addFolder("Esfera 2");
    esf2.open();     
      esf2.add(esf2Config, "move",  true)
            .name("Move Object");

  var controls = new function () {
    this.onReset = function () {
      obj1.position.set(-3, 0.2, -3)
      obj2.position.set(-3, 0.2, 0)
      };
   };
            
  let reset = gui.addFolder("Ambos");
      reset.open();
        reset.add(controls,  'onReset')
          .name("Reset both")

}

function render()
{
  trackballControls.update();

  if(esf1Config.move) obj1.position.lerp(esf1Config.destination, esf1Config.alpha);
  if(esf2Config.move) obj2.position.lerp(esf2Config.destination, esf2Config.alpha);

  requestAnimationFrame(render);
  renderer.render(scene, camera) // Render scene
}