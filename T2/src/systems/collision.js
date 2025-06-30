import * as THREE from '../../../build/three.module.js';
import { CONFIG } from '../core/config.js';
import { hitbox } from '../entities/player/player.js';

export let velocityY = 0;
export let isGrounded = false;
export let wallColide = { x: false, z: false };

const raycaster = new THREE.Raycaster();
const raySize = CONFIG.RAYCAST_DISTANCE;
const rays = [
    { dir: new THREE.Vector3(1, 0, 0), axis: 'x', offset: new THREE.Vector3(0.5, CONFIG.PLAYER_HEIGHT/2, 0) },
    { dir: new THREE.Vector3(-1, 0, 0), axis: 'x', offset: new THREE.Vector3(-0.5, CONFIG.PLAYER_HEIGHT/2, 0) },
    { dir: new THREE.Vector3(0, 0, 1), axis: 'z', offset: new THREE.Vector3(0, CONFIG.PLAYER_HEIGHT/2, 0.5) },
    { dir: new THREE.Vector3(0, 0, -1), axis: 'z', offset: new THREE.Vector3(0, CONFIG.PLAYER_HEIGHT/2, -0.5) }
];

function checkGroundCollisions(collidableObjects, camera) {
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

function checkWallCollisions(collidableObjects, camera) {
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
        const origin = hitbox.position.clone().add(ray.offset);
        const intercepts = detectRayCollisions(origin, ray.dir, validObjects, raySize * 0.95, false);
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
    checkGroundCollisions(collidableObjects, camera);
    checkWallCollisions(collidableObjects, camera);
    camera.position.y = hitbox.position.y + CONFIG.PLAYER_HEIGHT/2;
}
