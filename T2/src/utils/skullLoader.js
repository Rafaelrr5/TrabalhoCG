import * as THREE from '../../../build/three.module.js';
import { loadOBJModel, createFallbackModel } from './modelLoader.js';

let skullModel = null;

const SKULL_CONFIG = Object.freeze({
  scale: 0.3,
  rotation: { x: Math.PI / 2, y: 0, z: 0 },
  pivotAtCenter: true,
  castShadow: true,
  receiveShadow: true,
  fallback: {
    type: 'sphere',
    radius: 0.8,
    color: 0xdddddd
  }
});

export function createFallbackSkull() {
  const baseModel = createFallbackModel({
    ...SKULL_CONFIG,
    scale: 1.0
  });
  
  const mainSphere = baseModel.children[0];
  const skullGroup = new THREE.Group();
  skullGroup.add(mainSphere);
  
  addFacialFeatures(skullGroup);
  
  const wrapper = new THREE.Group();
  skullGroup.rotation.x = SKULL_CONFIG.rotation.x;
  wrapper.add(skullGroup);
  wrapper.scale.setScalar(SKULL_CONFIG.scale);
  
  return wrapper;
}

function addFacialFeatures(skullGroup) {
  // Eyes
  const eyeGeometry = new THREE.SphereGeometry(0.15, 8, 8);
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.25, 0.2, 0.6);
  
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.25, 0.2, 0.6);
  
  skullGroup.add(leftEye, rightEye);
  
  // Nose
  const noseGeometry = new THREE.ConeGeometry(0.1, 0.3, 6);
  const noseMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const nose = new THREE.Mesh(noseGeometry, noseMaterial);
  nose.position.set(0, -0.1, 0.7);
  nose.rotation.x = Math.PI;
  
  skullGroup.add(nose);
}

export async function loadSkullModel() {
  if (skullModel) {
    return skullModel.clone();
  }

  try {
    const loadedModel = await loadOBJModel(
      './assets/models/skull.obj',
      './assets/textures/skull.mtl',
      SKULL_CONFIG
    );
    
    skullModel = loadedModel;
    return loadedModel.clone();
  } catch (error) {
    // Failed to load skull model, using enhanced fallback
    const fallback = createFallbackSkull();
    skullModel = fallback;
    return fallback.clone();
  }
}

export async function preloadSkullModel() {
  if (!skullModel) {
    try {
      await loadSkullModel();
    } catch (error) {
      // Preload failed, fallback will be used
    }
  }
}

export function clearSkullCache() {
  skullModel = null;
}

export function applyScaleWithFixedPivot(model, scale) {
  if (!model || scale <= 0) return;
  
  const originalPosition = model.position.clone();
  
  model.scale.set(1, 1, 1);
  model.updateMatrixWorld(true);
  
  const baseBox = new THREE.Box3().setFromObject(model);
  const baseCenter = baseBox.getCenter(new THREE.Vector3());
  
  model.scale.set(scale, scale, scale);
  model.updateMatrixWorld(true);
  
  const scaledBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
  
  const centerOffset = baseCenter.clone().sub(scaledCenter);
  
  model.position.copy(originalPosition).add(centerOffset);
  
  return {
    originalPosition,
    baseCenter,
    scaledCenter,
    centerOffset,
    finalPosition: model.position.clone()
  };
}

export function verifyModelCentering(model) {
  if (!model) return null;
  
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  
  return {
    center,
    size,
    isCentered: center.length() < 0.001
  };
}
