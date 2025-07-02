import * as THREE from '../../../build/three.module.js';

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
