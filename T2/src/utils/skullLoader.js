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
  // Create a wrapper group to handle pivot point correctly
  const wrapperGroup = new THREE.Group();
  
  // Create the skull components
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

  // Calculate center and adjust positioning
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  group.position.sub(center); // Center the skull at origin
  
  // Apply rotation to the skull components
  group.rotation.x = Math.PI / 2;
  
  // Add centered group to wrapper
  wrapperGroup.add(group);
  
  // Apply scale to the wrapper group
  wrapperGroup.scale.set(0.3, 0.3, 0.3);
  
  return wrapperGroup;
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
    
    // Create a wrapper group to handle pivot point correctly
    const wrapperGroup = new THREE.Group();
    
    // Calculate the center of the loaded model
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    
    // Move the model so its center is at the wrapper's origin
    object.position.sub(center);
    
    // Apply rotation to the model
    object.rotation.x = Math.PI / 2;
    
    // Add the centered and rotated model to the wrapper
    wrapperGroup.add(object);
    
    // Apply scale to the wrapper group
    wrapperGroup.scale.set(0.3, 0.3, 0.3);
    
    // Force matrix updates
    wrapperGroup.updateMatrixWorld(true);
    
    skullModel = wrapperGroup.clone();
    resolve(wrapperGroup);
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
          
          // Create a wrapper group to handle pivot point correctly
          const wrapperGroup = new THREE.Group();
          
          // Calculate the center of the loaded model
          const box = new THREE.Box3().setFromObject(object);
          const center = box.getCenter(new THREE.Vector3());
          
          // Move the model so its center is at the wrapper's origin
          object.position.sub(center);
          
          // Apply rotation to the model
          object.rotation.x = Math.PI / 2;
          
          // Add the centered and rotated model to the wrapper
          wrapperGroup.add(object);
          
          // Apply scale to the wrapper group
          wrapperGroup.scale.set(0.3, 0.3, 0.3);
          
          // Force matrix updates
          wrapperGroup.updateMatrixWorld(true);
          
          skullModel = wrapperGroup.clone();
          resolve(wrapperGroup);
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
    } catch (error) {
      console.warn('SkullLoader: preload failed', error);
    }
  }
}

// Aplica escala a um modelo mantendo o pivot point no centro
export function applyScaleWithFixedPivot(model, scale) {
  if (!model || scale <= 0) return;
  
  // Salva a posição atual
  const originalPosition = model.position.clone();
  
  // Reset para escala 1.0 para calcular centro base
  model.scale.set(1, 1, 1);
  model.updateMatrixWorld(true);
  
  // Calcula centro base
  const baseBox = new THREE.Box3().setFromObject(model);
  const baseCenter = baseBox.getCenter(new THREE.Vector3());
  
  // Aplica nova escala
  model.scale.set(scale, scale, scale);
  model.updateMatrixWorld(true);
  
  // Calcula novo centro após escala
  const scaledBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
  
  // Calcula offset necessário para manter o centro
  const centerOffset = baseCenter.clone().sub(scaledCenter);
  
  // Aplica correção de posição
  model.position.copy(originalPosition).add(centerOffset);
  
  return {
    originalPosition,
    baseCenter,
    scaledCenter,
    centerOffset,
    finalPosition: model.position.clone()
  };
}

// Verifica se um modelo está centrado corretamente
export function verifyModelCentering(model) {
  if (!model) return null;
  
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  
  return {
    center,
    size,
    isCentered: center.length() < 0.001 // Tolerância para considerar "centrado"
  };
}
