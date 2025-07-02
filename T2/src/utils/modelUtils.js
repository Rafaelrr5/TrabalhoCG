import * as THREE from '../../../build/three.module.js';
import { configureLoadedModel, MODEL_DEFAULTS } from './modelLoader.js';

export function prepareAssetModel(object3D, options = {}) {
  if (!object3D) {
    throw new Error('object3D is required for model preparation');
  }
  
  const config = {
    ...MODEL_DEFAULTS,
    pivotAtCenter: true,
    rotation: { x: 0, y: 0, z: 0 },
    scale: 3,
    castShadow: true,
    receiveShadow: true,
    ...options
  };

  return configureLoadedModel(object3D, config);
}

export function applyScaleWithFixedPivot(model, scale) {
  if (!model || !model.isObject3D) {
    console.warn('Invalid model provided to applyScaleWithFixedPivot');
    return null;
  }
  
  if (typeof scale !== 'number' || scale <= 0) {
    console.warn('Invalid scale value provided:', scale);
    return null;
  }
  
  const originalPosition = model.position.clone();
  const originalScale = model.scale.clone();
  
  model.scale.set(1, 1, 1);
  model.updateMatrixWorld(true);
  
  const baseBox = new THREE.Box3().setFromObject(model);
  const baseCenter = baseBox.getCenter(new THREE.Vector3());
  
  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);
  
  const scaledBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
  
  const centerOffset = baseCenter.clone().sub(scaledCenter);
  model.position.copy(originalPosition).add(centerOffset);
  
  return {
    originalPosition,
    originalScale,
    baseCenter,
    scaledCenter,
    centerOffset,
    finalPosition: model.position.clone(),
    appliedScale: scale
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

export function createBoundingBoxHelper(model, color = 0x00ff00) {
  const box = new THREE.Box3().setFromObject(model);
  const helper = new THREE.Box3Helper(box, color);
  return helper;
}

export function batchPrepareModels(models, options = {}) {
  if (!Array.isArray(models)) {
    console.warn('batchPrepareModels expects an array of models');
    return [];
  }
  
  return models
    .filter(model => model && model.isObject3D)
    .map(model => {
      try {
        return prepareAssetModel(model, options);
      } catch (error) {
        console.error('Error preparing model in batch:', error);
        return null;
      }
    })
    .filter(Boolean);
}

export function deepCloneModel(model, cloneMaterials = true) {
  if (!model || !model.isObject3D) {
    console.warn('Invalid model provided to deepCloneModel');
    return null;
  }
  
  const clone = model.clone();
  
  if (cloneMaterials) {
    const materialMap = new Map();
    
    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        
        const clonedMaterials = materials.map(mat => {
          if (materialMap.has(mat)) {
            return materialMap.get(mat);
          }
          const clonedMat = mat.clone();
          materialMap.set(mat, clonedMat);
          return clonedMat;
        });
        
        child.material = Array.isArray(child.material) ? clonedMaterials : clonedMaterials[0];
      }
    });
  }
  
  return clone;
}
