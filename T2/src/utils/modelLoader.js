import * as THREE from '../../../build/three.module.js';
import { GLTFLoader } from '../../../build/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from '../../../build/jsm/loaders/OBJLoader.js';
import { MTLLoader } from '../../../build/jsm/loaders/MTLLoader.js';

let gltfLoader = null;
let objLoader = null;
let mtlLoader = null;

function initializeLoaders() {
  if (!gltfLoader) gltfLoader = new GLTFLoader();
  if (!objLoader) objLoader = new OBJLoader();
  if (!mtlLoader) mtlLoader = new MTLLoader();
}

const modelCache = new Map();
const loadingPromises = new Map();
const materialCache = new WeakMap();

export const MODEL_DEFAULTS = Object.freeze({
  scale: 1.0,
  position: Object.freeze({ x: 0, y: 0, z: 0 }),
  rotation: Object.freeze({ x: 0, y: 0, z: 0 }),
  pivotAtCenter: true,
  castShadow: true,
  receiveShadow: true,
  materialConfig: Object.freeze({
    transparent: false,
    opacity: 1.0,
    visible: true,
    side: THREE.DoubleSide
  })
});

function validateConfig(config = {}) {
  const validated = { ...MODEL_DEFAULTS, ...config };
  
  if (validated.scale <= 0) {
    console.warn('Invalid scale value, using default:', MODEL_DEFAULTS.scale);
    validated.scale = MODEL_DEFAULTS.scale;
  }
  
  if (!validated.position || typeof validated.position !== 'object') {
    validated.position = { ...MODEL_DEFAULTS.position };
  }
  
  if (!validated.rotation || typeof validated.rotation !== 'object') {
    validated.rotation = { ...MODEL_DEFAULTS.rotation };
  }
  
  return validated;
}

export function fixMaterial(material, config = MODEL_DEFAULTS.materialConfig) {
  if (!material) return;
  
  if (materialCache.has(material)) return;
  
  const properties = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'];
  properties.forEach(prop => {
    if (!(prop in material)) material[prop] = null;
  });
  
  if (!material.isMeshBasicMaterial && !material.emissive) {
    material.emissive = new THREE.Color(0x000000);
  }
  
  Object.assign(material, config);
  material.needsUpdate = true;
  
  materialCache.set(material, true);
}

export function configureLoadedModel(model, options = {}) {
  if (!model) {
    throw new Error('Model is required for configuration');
  }
  
  const config = validateConfig(options);
  const wrapper = new THREE.Group();
  
  if (config.pivotAtCenter) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
  }
  
  model.position.set(config.position.x, config.position.y, config.position.z);
  model.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
  
  const materials = new Set();
  
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = config.castShadow;
      child.receiveShadow = config.receiveShadow;
      child.visible = true;
      
      const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
      childMaterials.forEach(mat => {
        if (mat && !materials.has(mat)) {
          fixMaterial(mat, config.materialConfig);
          materials.add(mat);
        }
      });
    }
  });
  
  wrapper.add(model);
  wrapper.scale.setScalar(config.scale);
  
  return wrapper;
}

function cloneModelWithUniqueMaterials(model) {
  const clonedModel = model.clone();
  
  clonedModel.traverse((child) => {
    if (child.isMesh && child.material) {
      if (Array.isArray(child.material)) {
        child.material = child.material.map(mat => mat.clone());
      } else {
        child.material = child.material.clone();
      }
    }
  });
  
  return clonedModel;
}

export async function loadGLTFModel(path, options = {}) {
  if (!path || typeof path !== 'string') {
    throw new Error('Valid path is required for GLTF loading');
  }
  
  const cacheKey = `gltf_${path}_${JSON.stringify({
    scale: options.scale,
    pivotAtCenter: options.pivotAtCenter,
    castShadow: options.castShadow,
    receiveShadow: options.receiveShadow
  })}`;
  
  if (modelCache.has(cacheKey)) {
    return cloneModelWithUniqueMaterials(modelCache.get(cacheKey));
  }
  
  if (loadingPromises.has(cacheKey)) {
    const cachedModel = await loadingPromises.get(cacheKey);
    return cloneModelWithUniqueMaterials(cachedModel);
  }
  
  initializeLoaders();
  
  const loadingPromise = new Promise((resolve, reject) => {
    gltfLoader.load(
      path,
      (gltf) => {
        try {
          const configuredModel = configureLoadedModel(gltf.scene, options);
          modelCache.set(cacheKey, configuredModel);
          loadingPromises.delete(cacheKey);
          resolve(configuredModel);
        } catch (error) {
          console.error('Error configuring GLTF model:', error);
          loadingPromises.delete(cacheKey);
          reject(error);
        }
      },
      (progress) => {
        if (options.onProgress && typeof options.onProgress === 'function') {
          options.onProgress(progress);
        }
      },
      (error) => {
        console.error('Error loading GLTF model:', error);
        loadingPromises.delete(cacheKey);
        reject(error);
      }
    );
  });
  
  loadingPromises.set(cacheKey, loadingPromise);
  return loadingPromise;
}

export async function loadOBJModel(objPath, mtlPath = null, options = {}) {
  const cacheKey = `obj_${objPath}_${mtlPath || 'no-mtl'}_${JSON.stringify(options)}`;
  
  if (modelCache.has(cacheKey)) {
    return modelCache.get(cacheKey).clone();
  }
  
  if (loadingPromises.has(cacheKey)) {
    const cachedModel = await loadingPromises.get(cacheKey);
    return cachedModel.clone();
  }
  
  initializeLoaders();
  
  const loadingPromise = new Promise((resolve, reject) => {
    const loadOBJ = (materials = null) => {
      if (materials) {
        objLoader.setMaterials(materials);
      } else {
        objLoader.setMaterials(null);
      }
      
      objLoader.load(
        objPath,
        (object) => {
          try {
            if (!materials) {
              const defaultMaterial = new THREE.MeshLambertMaterial({ 
                color: 0xcccccc, 
                side: THREE.DoubleSide 
              });
              
              object.traverse((child) => {
                if (child.isMesh) {
                  child.material = defaultMaterial.clone();
                }
              });
            }
            
            const configuredModel = configureLoadedModel(object, options);
            modelCache.set(cacheKey, configuredModel);
            loadingPromises.delete(cacheKey);
            resolve(configuredModel);
          } catch (error) {
            console.error('Error configuring OBJ model:', error);
            reject(error);
          }
        },
        options.onProgress,
        (error) => {
          console.error('Error loading OBJ model:', error);
          loadingPromises.delete(cacheKey);
          reject(error);
        }
      );
    };
    
    if (mtlPath) {
      let mtlFilename = mtlPath;
      if (options.mtlBasePath) {
        if (mtlPath.startsWith(options.mtlBasePath)) {
          mtlFilename = mtlPath.substring(options.mtlBasePath.length);
        } else {
          mtlFilename = mtlPath.split('/').pop();
        }
        mtlLoader.setPath(options.mtlBasePath);
        console.log(`Loading MTL: basePath="${options.mtlBasePath}", filename="${mtlFilename}"`);
      } else {
        console.log(`Loading MTL: fullPath="${mtlPath}"`);
      }
      
      mtlLoader.load(
        mtlFilename,
        (materials) => {
          try {
            materials.preload();
            if (options.mtlBasePath) {
              mtlLoader.setPath('');
            }
            loadOBJ(materials);
          } catch (error) {
            console.warn('MTL preload failed, loading OBJ without materials:', error);
            if (options.mtlBasePath) {
              mtlLoader.setPath('');
            }
            loadOBJ();
          }
        },
        options.onProgress,
        (error) => {
          console.warn('MTL loading failed, loading OBJ without materials:', error);
          if (options.mtlBasePath) {
            mtlLoader.setPath('');
          }
          loadOBJ();
        }
      );
    } else {
      loadOBJ();
    }
  });
  
  loadingPromises.set(cacheKey, loadingPromise);
  return loadingPromise;
}

export function createFallbackModel(options = {}) {
  const config = { ...MODEL_DEFAULTS, ...options };
  const fallbackConfig = {
    type: 'sphere',
    radius: 1.0,
    color: 0xcccccc,
    ...config.fallback
  };
  
  const wrapper = new THREE.Group();
  let geometry, material, mesh;
  
  switch (fallbackConfig.type) {
    case 'box':
      geometry = new THREE.BoxGeometry(fallbackConfig.radius * 2, fallbackConfig.radius * 2, fallbackConfig.radius * 2);
      break;
    case 'cone':
      geometry = new THREE.ConeGeometry(fallbackConfig.radius, fallbackConfig.radius * 2, 8);
      break;
    default:
      geometry = new THREE.SphereGeometry(fallbackConfig.radius, 16, 16);
  }
  
  material = new THREE.MeshLambertMaterial({ 
    color: fallbackConfig.color,
    side: THREE.DoubleSide
  });
  
  mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = config.castShadow;
  mesh.receiveShadow = config.receiveShadow;
  
  wrapper.add(mesh);
  wrapper.scale.set(config.scale, config.scale, config.scale);
  
  return wrapper;
}

export async function loadModelWithFallback(path, options = {}) {
  try {
    const extension = path.split('.').pop().toLowerCase();
    
    if (extension === 'glb' || extension === 'gltf') {
      return await loadGLTFModel(path, options);
    } else if (extension === 'obj') {
      const mtlPath = options.mtlPath || path.replace('.obj', '.mtl');
      return await loadOBJModel(path, mtlPath, options);
    } else {
      throw new Error(`Unsupported file format: ${extension}`);
    }
  } catch (error) {
    console.warn(`Failed to load model from ${path}, using fallback:`, error);
    return createFallbackModel(options);
  }
}

export async function preloadModels(modelPaths) {
  const loadPromises = modelPaths.map(pathInfo => {
    if (typeof pathInfo === 'string') {
      return loadModelWithFallback(pathInfo);
    } else {
      return loadModelWithFallback(pathInfo.path, pathInfo.options || {});
    }
  });
  
  try {
    return await Promise.all(loadPromises);
  } catch (error) {
    console.warn('Some models failed to preload:', error);
    return [];
  }
}

export function clearModelCache() {
  modelCache.clear();
  console.log('Model cache cleared');
}

export function getCacheStats() {
  return {
    cachedModels: modelCache.size,
    loadingPromises: loadingPromises.size
  };
}

/**
 * Carrega um modelo OBJ e aplica texturas manualmente a partir de caminhos fornecidos.
 * Útil quando não há um arquivo .mtl disponível.
 * @param {string} objPath Caminho para o arquivo .obj
 * @param {object} texturePaths Objeto com caminhos para as texturas. Ex: { diffuse: 'path/to/diffuse.jpg', normal: '...' }
 * @param {object} config Configurações de escala, rotação, etc.
 * @returns {Promise<THREE.Object3D>} O modelo 3D carregado.
 */
export function loadOBJWithManualTextures(objPath, texturePaths = {}, config = {}) {
  initializeLoaders(); // Garante que os loaders do three.js foram inicializados
  const validatedConfig = validateConfig(config);

  return new Promise((resolve, reject) => {
    const textureLoader = new THREE.TextureLoader();
    const material = new THREE.MeshStandardMaterial();

    // Carrega e atribui cada textura se o caminho for fornecido
    if (texturePaths.diffuse) {
      material.map = textureLoader.load(texturePaths.diffuse);
    }
    if (texturePaths.normal) {
      material.normalMap = textureLoader.load(texturePaths.normal);
    }
    if (texturePaths.displacement) {
      material.displacementMap = textureLoader.load(texturePaths.displacement);
      material.displacementScale = validatedConfig.displacementScale || 0.01;
    }
    // Você pode adicionar mais texturas aqui (ex: roughnessMap, aoMap) se necessário

    // Carrega a geometria do modelo .obj
    objLoader.load(objPath,
      (object) => {
        // Aplica o material criado a todas as malhas (meshes) dentro do modelo
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = material;
          }
        });

        // Aplica as configurações de escala, rotação, etc.
        applyConfigToObject(object, validatedConfig);
        
        resolve(object); // Retorna o objeto pronto
      },
      undefined,
      (error) => {
        console.error(`Erro ao carregar o modelo OBJ (manual texture): ${objPath}`, error);
        reject(error);
      }
    );
  });
}

// Esta função auxiliar provavelmente já existe no seu arquivo, mas se não existir, adicione-a também.
// Ela aplica as configurações de escala/rotação ao objeto.
export function applyConfigToObject(object, config) {
    if (config.scale) {
        object.scale.setScalar(config.scale);
    }
    if (config.rotation) {
        object.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
    }
    if (config.pivotAtCenter) {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        object.position.sub(center);
    }
    if (config.castShadow) {
        object.traverse(child => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
            }
        });
    }
     if (config.receiveShadow) {
        object.traverse(child => {
            if (child instanceof THREE.Mesh) {
                child.receiveShadow = true;
            }
        });
    }
}
