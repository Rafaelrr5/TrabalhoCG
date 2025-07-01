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

// ============================================================================
// SISTEMA DE COLISÃO PARA LOST SOULS
// ============================================================================

// Verifica colisão de uma Lost Soul com o ambiente
export function checkLostSoulCollision(lostSoulPosition, targetPosition, collidableObjects, radius = 0.8) {
    const raycaster = new THREE.Raycaster();
    const maxDistance = radius * 1.5; // Reduzido para ser menos agressivo
    
    // Calcula direção do movimento - APENAS direção principal
    const direction = new THREE.Vector3();
    direction.subVectors(targetPosition, lostSoulPosition);
    direction.normalize();
    
    // Verifica colisão apenas na direção principal do movimento
    raycaster.set(lostSoulPosition, direction);
    raycaster.far = maxDistance;
    
    const intersects = raycaster.intersectObjects(collidableObjects, true);
    
    if (intersects.length > 0) {
        const hit = intersects[0];
        if (hit.distance < maxDistance) {
            // Retorna informações da colisão
            return {
                hasCollision: true,
                point: hit.point,
                normal: hit.face.normal,
                distance: hit.distance,
                object: hit.object
            };
        }
    }
    
    return { hasCollision: false };
}

// Aplica correção de posição para evitar que a Lost Soul atravesse paredes
export function applyLostSoulCollisionCorrection(lostSoul, collidableObjects, targetPosition) {
    const collision = checkLostSoulCollision(lostSoul.mesh.position, targetPosition, collidableObjects, lostSoul.config.radius);
    
    if (collision.hasCollision) {
        // ========================================================================
        // SISTEMA INTELIGENTE DE DESVIO DE OBSTÁCULOS
        // ========================================================================
        
        // Calcula direção original para o target
        const originalDirection = new THREE.Vector3();
        originalDirection.subVectors(targetPosition, lostSoul.mesh.position);
        originalDirection.normalize();
        
        // Tenta encontrar uma rota alternativa usando pathfinding simples
        const alternativeDirections = [
            // Desvio horizontal (esquerda e direita)
            new THREE.Vector3().crossVectors(originalDirection, new THREE.Vector3(0, 1, 0)).normalize(),
            new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), originalDirection).normalize(),
            // Desvio vertical (cima e baixo)
            new THREE.Vector3().crossVectors(originalDirection, new THREE.Vector3(1, 0, 0)).normalize(),
            new THREE.Vector3().crossVectors(new THREE.Vector3(1, 0, 0), originalDirection).normalize(),
        ];
        
        // Testa cada direção alternativa para encontrar uma rota livre
        for (const altDir of alternativeDirections) {
            // Combina direção alternativa com direção original (80% original, 20% desvio)
            const testDirection = originalDirection.clone().multiplyScalar(0.8);
            testDirection.add(altDir.clone().multiplyScalar(0.2));
            testDirection.normalize();
            
            // Testa se esta direção está livre
            const testPosition = lostSoul.mesh.position.clone();
            testPosition.addScaledVector(testDirection, lostSoul.config.radius * 2);
            
            const testCollision = checkLostSoulCollision(lostSoul.mesh.position, testPosition, collidableObjects, lostSoul.config.radius);
            
            if (!testCollision.hasCollision) {
                // Encontrou uma rota livre!
                return {
                    corrected: true,
                    newDirection: testDirection,
                    collision: collision
                };
            }
        }
        
        // Se nenhuma rota alternativa foi encontrada, usa deflexão baseada na normal
        const deflectedDirection = originalDirection.clone();
        const normal = collision.normal.clone();
        
        // Aplica deflexão usando a normal da superfície
        deflectedDirection.reflect(normal);
        
        // Mistura direção deflectida com direção original para manter movimento em direção ao target
        const finalDirection = originalDirection.clone().multiplyScalar(0.6);
        finalDirection.add(deflectedDirection.multiplyScalar(0.4));
        finalDirection.normalize();
        
        return {
            corrected: true,
            newDirection: finalDirection,
            collision: collision
        };
    }
    
    return { corrected: false };
}
