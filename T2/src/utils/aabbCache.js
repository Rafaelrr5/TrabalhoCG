import * as THREE from '../../../build/three.module.js';

// World-space bounding box of a level object, cached until the object moves.
// Collision code used to rebuild Box3.setFromObject for every collidable on every call,
// for every enemy, every frame (tens of thousands of traversals per frame).
// shortcut: only the object's own position is tracked; a collidable moved via its parent
// would keep a stale box (none do today: doors, platforms and walls move themselves).
export function worldBox(obj) {
    const c = obj.userData._aabb;
    if (c && c.pos.equals(obj.position)) return c.box;
    const box = new THREE.Box3().setFromObject(obj);
    obj.userData._aabb = { box, pos: obj.position.clone() };
    return box;
}
