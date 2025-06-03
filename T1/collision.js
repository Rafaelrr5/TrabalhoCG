import * as THREE from '../build/three.module.js';
import { CONFIG } from './config.js';
import { hitbox } from './player.js';

export let velocityY = 0;
export let isGrounded = false;
export let wallColide = { x: false, z: false };

const playerBox = new THREE.Box3();
const tempBox = new THREE.Box3();
const raycaster = new THREE.Raycaster();
const raySize = CONFIG.RAYCAST_DISTANCE;
const rays = [
    { dir: new THREE.Vector3(1, 0, 0), axis: 'x', offset: new THREE.Vector3(0.5, CONFIG.PLAYER_HEIGHT/2, 0) },
    { dir: new THREE.Vector3(-1, 0, 0), axis: 'x', offset: new THREE.Vector3(-0.5, CONFIG.PLAYER_HEIGHT/2, 0) },
    { dir: new THREE.Vector3(0, 0, 1), axis: 'z', offset: new THREE.Vector3(0, CONFIG.PLAYER_HEIGHT/2, 0.5) },
    { dir: new THREE.Vector3(0, 0, -1), axis: 'z', offset: new THREE.Vector3(0, CONFIG.PLAYER_HEIGHT/2, -0.5) }
];

function detectStairCollision(hitboxPos, collidableObjects) {
    for (const object of collidableObjects) {
        if (!object.geometry || !object.visible) continue;
        if (object.parent && object.parent.name.includes("Escada")) {
            tempBox.setFromObject(object);
            if (
                hitboxPos.x >= tempBox.min.x - CONFIG.STAIR_DETECTION_MARGIN_X &&
                hitboxPos.x <= tempBox.max.x + CONFIG.STAIR_DETECTION_MARGIN_X &&
                hitboxPos.z >= tempBox.min.z - CONFIG.STAIR_DETECTION_MARGIN_Z &&
                hitboxPos.z <= tempBox.max.z + CONFIG.STAIR_DETECTION_MARGIN_Z
            ) {
                const inclination = CONFIG.STAIR_INCLINATION;
                let stairHeight;
                if (object.position.z < 0) {
                    stairHeight = tempBox.min.y + (tempBox.max.z - hitboxPos.z) * inclination;
                } else {
                    stairHeight = tempBox.min.y + (hitboxPos.z - tempBox.min.z) * inclination;
                }
                stairHeight += CONFIG.STAIR_HEIGHT_OFFSET;
                if (Math.abs(hitboxPos.y - (stairHeight + CONFIG.PLAYER_HEIGHT/2)) < CONFIG.STAIR_HEIGHT_TOLERANCE) {
                    return { isOnStair: true, stairHeight, stairObject: object };
                }
            }
        }
    }
    return { isOnStair: false };
}

// function checkGroundCollisions(hitbox, collidableObjects, camera) {
function checkGroundCollisions(hitbox, collidableObjects, camera) {
    // Raycast for ground and stairs
    isGrounded = false;
    const downDir = new THREE.Vector3(0, -1, 0);
    const hits = detectRayCollisions(hitbox.position.clone(), downDir, collidableObjects, raySize, true);
    if (hits.length > 0) {
        const hit = hits[0];
        if (hit.distance < raySize) {
            const correction = raySize - hit.distance;
            hitbox.position.y += correction;
            camera.position.y += correction;
            velocityY = 0;
            isGrounded = true;
        }
    }
}

function checkWallCollisions(hitbox, collidableObjects, camera) {
    wallColide.x = false;
    wallColide.z = false;
    const validObjects = collidableObjects.filter(obj => {
        if (!obj?.isMesh || !obj.visible) return false;
        const isStair = obj.parent && obj.parent.name.includes("Escada");
        if (obj.isGroup) {
            let validChildren = false;
            obj.traverse(child => {
                if (child.isMesh && child.visible && !isStair) {
                    validChildren = true;
                }
            });
            return validChildren && !isStair;
        }
        return !isStair;
    });
    for (const ray of rays) {
        const intercepts = detectRayCollisions(hitbox.position.clone(), ray.dir, validObjects, raySize * 0.95, false);
        if (intercepts.length > 0 && intercepts[0].distance < raySize * 0.95) {
            const correction = (intercepts[0].distance - raySize) * CONFIG.WALL_COLLISION_FACTOR;
            if (ray.axis === 'x') {
                wallColide.x = true;
                hitbox.position.x += ray.dir.x * correction;
                camera.position.x += ray.dir.x * correction;
            } else if (ray.axis === 'z') {
                wallColide.z = true;
                hitbox.position.z += ray.dir.z * correction;
                camera.position.z += ray.dir.z * correction;
            }
        }
    }
}

// Generic ray-based collision detection
export function detectRayCollisions(origin, direction, objects, maxDistance, recursive = false) {
    raycaster.set(origin, direction);
    raycaster.far = maxDistance;
    return raycaster.intersectObjects(objects, recursive);
}

export function applyGravity(delta, collidableObjects, camera) {
    if (!hitbox || !camera || !collidableObjects) return;

    if (!isGrounded) {
        velocityY += CONFIG.GRAVITY * delta;
    } else {
        velocityY = 0;
    }
    hitbox.position.y += velocityY * delta;
    camera.position.y += velocityY * delta;
    checkGroundCollisions(hitbox, collidableObjects, camera);
    checkWallCollisions(hitbox, collidableObjects, camera);
    camera.position.y = hitbox.position.y + CONFIG.PLAYER_HEIGHT/2;
}
