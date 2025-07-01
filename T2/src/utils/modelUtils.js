import * as THREE from '../../../build/three.module.js';

/**
 * Prepara um modelo 3D para uso em cena:
 * - Centraliza o pivot no centro geométrico
 * - Aplica rotação inicial
 * - Aplica escala uniforme
 * - Habilita sombras nos meshes
 * 
 * @param {THREE.Object3D} object3D O modelo a ser preparado
 * @param {Object} options
 * @param {boolean} [options.pivotAtCenter=true] Se deve centralizar pivot
 * @param {Object} [options.rotation={x:0,y:0,z:0}] Rotação inicial em radianos
 * @param {number} [options.scale=1] Escala uniforme
 * @param {boolean} [options.castShadow=true]
 * @param {boolean} [options.receiveShadow=true]
 * @returns {THREE.Group} Wrapper contendo o modelo preparado
 */
export function prepareAssetModel(
  object3D,
  {
    pivotAtCenter = true,
    rotation = { x: 0, y: 0, z: 0 },
    scale = 3,
    castShadow = true,
    receiveShadow = true
  } = {}
) {
  const wrapper = new THREE.Group();

  // Centraliza pivot
  if (pivotAtCenter) {
    const box = new THREE.Box3().setFromObject(object3D);
    const center = box.getCenter(new THREE.Vector3());
    object3D.position.sub(center);
  }

  // Aplica rotação
  object3D.rotation.set(rotation.x, rotation.y, rotation.z);
  wrapper.add(object3D);

  // Aplica escala
  wrapper.scale.set(scale, scale, scale);

  // Habilita sombras
  wrapper.traverse(child => {
    if (child.isMesh) {
      child.castShadow = castShadow;
      child.receiveShadow = receiveShadow;
    }
  });

  return wrapper;
}
