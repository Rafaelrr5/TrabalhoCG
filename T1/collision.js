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

function checkGroundCollisions(hitbox, collidableObjects, camera) {
    isGrounded = false;
    playerBox.setFromObject(hitbox);
    const hitboxPos = hitbox.position;
    const stairInfo = detectStairCollision(hitboxPos, collidableObjects);
    if (stairInfo.isOnStair) {
        const expectedHeight = stairInfo.stairHeight + CONFIG.PLAYER_HEIGHT / 2;
        const diff = expectedHeight - hitboxPos.y;
        hitbox.position.y += diff * CONFIG.STAIR_MOVEMENT_SPEED;
        camera.position.y += diff * CONFIG.STAIR_MOVEMENT_SPEED;
        velocityY = 0;
        isGrounded = true;
        return;
    }
    for (const object of collidableObjects) {
        if (!object.geometry || !object.visible) continue;
        tempBox.setFromObject(object);
        if (playerBox.intersectsBox(tempBox)) {
            const overlapX = Math.min(playerBox.max.x - tempBox.min.x, tempBox.max.x - playerBox.min.x);
            const overlapY = Math.min(playerBox.max.y - tempBox.min.y, tempBox.max.y - playerBox.min.y);
            const overlapZ = Math.min(playerBox.max.z - tempBox.min.z, tempBox.max.z - playerBox.min.z);
            if (overlapY < overlapX && overlapY < overlapZ) {
                if (velocityY < 0) {
                    const correction = tempBox.max.y - playerBox.min.y + CONFIG.COLLISION_MARGIN;
                    hitbox.position.y += correction;
                    camera.position.y += correction;
                    velocityY = 0;
                    isGrounded = true;
                } else if (velocityY > 0) {
                    const correction = tempBox.min.y - playerBox.max.y - CONFIG.COLLISION_MARGIN;
                    hitbox.position.y += correction;
                    camera.position.y += correction;
                    velocityY = 0;
                }
            }
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
        raycaster.set(hitbox.position, ray.dir);
        const intercepts = raycaster.intersectObjects(validObjects, false);
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
