import * as THREE from '../../../build/three.module.js';
import { OBJLoader } from '../../../build/jsm/loaders/OBJLoader.js';
import { MTLLoader } from '../../../build/jsm/loaders/MTLLoader.js';

// Loader instances
const mtlLoader = new MTLLoader();
const objLoader = new OBJLoader();

// Cache for loaded model
let skullModel = null;
let isLoadingSkull = false;
const loadingPromises = [];

// Fix material properties to prevent shader errors
export function fixMaterial(material) {
  if (!material) return;
  if (!material.map) material.map = null;
  if (!material.normalMap) material.normalMap = null;
  if (!material.roughnessMap) material.roughnessMap = null;
  if (!material.metalnessMap) material.metalnessMap = null;
  if (!material.emissiveMap) material.emissiveMap = null;
  if (!material.emissive) material.emissive = new THREE.Color(0x000000);
  material.side = THREE.DoubleSide;
  material.needsUpdate = true;
}

// Simple fallback skull creation if model loading fails
export function createFallbackSkull() {
  const group = new THREE.Group();
  const skullGeometry = new THREE.SphereGeometry(0.8, 16, 16);
  const skullMaterial = new THREE.MeshLambertMaterial({ color: 0xdddddd, side: THREE.DoubleSide });
  const skull = new THREE.Mesh(skullGeometry, skullMaterial);
  group.add(skull);

  const eyeGeometry = new THREE.SphereGeometry(0.15, 8, 8);
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.25, 0.2, 0.6);
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.25, 0.2, 0.6);
  group.add(leftEye, rightEye);

  const noseGeometry = new THREE.ConeGeometry(0.1, 0.3, 6);
  const noseMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const nose = new THREE.Mesh(noseGeometry, noseMaterial);
  nose.position.set(0, -0.1, 0.7);
  nose.rotation.x = Math.PI;
  group.add(nose);

  group.scale.set(0.3, 0.3, 0.3);
  return group;
}

// Fallback OBJ loader without materials
function loadWithoutMaterials(resolve, reject) {
  objLoader.setMaterials(null);
  objLoader.setPath('./assets/models/');
  objLoader.load('skull.obj', (object) => {
    const simpleMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc, side: THREE.DoubleSide });
    object.traverse((child) => {
      if (child.isMesh) {
        child.material = simpleMaterial.clone();
        child.material.color.setHex(0xdddddd);
        fixMaterial(child.material);
      }
    });
    object.scale.set(0.3, 0.3, 0.3);
    object.rotation.x = Math.PI / 2;
    skullModel = object.clone();
    resolve(object);
  }, undefined, (error) => {
    console.warn('SkullLoader: failed without materials, using fallback', error);
    const fallback = createFallbackSkull();
    skullModel = fallback.clone();
    resolve(fallback);
  });
}

// Load skull model with optional MTL
export function loadSkullModel() {
  if (skullModel) return Promise.resolve(skullModel.clone());
  if (isLoadingSkull) return loadingPromises[loadingPromises.length - 1];
  isLoadingSkull = true;

  const promise = new Promise((resolve, reject) => {
    mtlLoader.setPath('./assets/textures/');
    mtlLoader.load('skull.mtl', (materials) => {
      try {
        materials.preload();
        objLoader.setMaterials(materials);
        objLoader.setPath('./assets/models/');
        objLoader.load('skull.obj', (object) => {
          object.traverse((child) => {
            if (child.isMesh && child.material) {
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach(fixMaterial);
            }
          });
          object.scale.set(0.3, 0.3, 0.3);
          object.rotation.x = Math.PI / 2;
          skullModel = object.clone();
          resolve(object);
        }, undefined, (err) => loadWithoutMaterials(resolve, reject));
      } catch (err) {
        console.warn('SkullLoader: mtl preload failed, fallback', err);
        loadWithoutMaterials(resolve, reject);
      }
    }, undefined, (err) => loadWithoutMaterials(resolve, reject));
  });

  loadingPromises.push(promise);
  return promise;
}

// Preload skull model for performance
export async function preloadSkullModel() {
  if (!skullModel) {
    try {
      await loadSkullModel();
      console.log('SkullLoader: preloaded skull model');
    } catch (error) {
      console.warn('SkullLoader: preload failed', error);
    }
  }
}
