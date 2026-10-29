import * as THREE from '../../../build/three.module.js';

// World-space bounding box of a level object, cached until its world matrix changes.
// Collision code used to rebuild Box3.setFromObject for every collidable on every call,
// for every enemy, every frame (tens of thousands of traversals per frame).
// The world matrix (parents included) is the cache key: keying on the local position
// served stale boxes for children of moved groups, which shoved the player sideways.
// shortcut: a child animating inside the object keeps the old box (none do today).
export function worldBox(obj) {
    obj.updateWorldMatrix(true, false);
    const c = obj.userData._aabb;
    if (c && c.matrix.equals(obj.matrixWorld)) return c.box;
    const box = new THREE.Box3().setFromObject(obj);
    obj.userData._aabb = { box, matrix: obj.matrixWorld.clone() };
    return box;
}
