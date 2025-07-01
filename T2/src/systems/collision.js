import * as THREE from '../../../build/three.module.js';
import { CONFIG } from '../core/config.js';
import { hitbox, player } from '../entities/player/player.js';

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

// Sistema de colisão estável com raycaster para Lost Souls
export function checkLostSoulCollision(lostSoulPosition, targetPosition, collidableObjects, radius = 1.2) {
    if (!collidableObjects || collidableObjects.length === 0) {
        return { hasCollision: false };
    }

    const raycaster = new THREE.Raycaster();
    const maxDistance = CONFIG.LOST_SOUL_RAYCAST_DISTANCE || 2.5;
    
    // Filtrar objetos válidos para colisão
    const validObjects = collidableObjects.filter(obj => {
        if (!obj || !obj.visible) return false;
        if (obj.userData && obj.userData.enemy) return false; // Não colidir com outros inimigos
        return obj.isMesh || (obj.isGroup && obj.children.length > 0);
    });

    if (validObjects.length === 0) {
        return { hasCollision: false };
    }

    // Direção principal do movimento
    const mainDirection = new THREE.Vector3()
        .subVectors(targetPosition, lostSoulPosition)
        .normalize();

    // Sistema de múltiplos raycasts em formato esférico
    const rayDirections = [];
    const numRays = CONFIG.LOST_SOUL_COLLISION_RAYS || 8;
    
    // Adiciona direção principal (peso maior)
    rayDirections.push({ direction: mainDirection.clone(), weight: 1.0 });
    
    // Adiciona raycasts em círculo horizontal
    for (let i = 0; i < numRays; i++) {
        const angle = (i / numRays) * Math.PI * 2;
        const offset = 0.3; // 30% de desvio da direção principal
        
        // Vetores perpendiculares para criar o círculo
        const perpendicular1 = new THREE.Vector3().crossVectors(mainDirection, new THREE.Vector3(0, 1, 0)).normalize();
        const perpendicular2 = new THREE.Vector3().crossVectors(mainDirection, perpendicular1).normalize();
        
        const rayDirection = mainDirection.clone().multiplyScalar(1 - offset);
        rayDirection.addScaledVector(perpendicular1, Math.cos(angle) * offset);
        rayDirection.addScaledVector(perpendicular2, Math.sin(angle) * offset);
        rayDirection.normalize();
        
        rayDirections.push({ direction: rayDirection, weight: 0.5 });
    }

    // Raycasts verticais se habilitado
    if (CONFIG.LOST_SOUL_VERTICAL_COLLISION) {
        rayDirections.push({ direction: new THREE.Vector3(0, 1, 0), weight: 0.3 });
        rayDirections.push({ direction: new THREE.Vector3(0, -1, 0), weight: 0.3 });
    }

    let closestCollision = null;
    let minWeightedDistance = Infinity;

    // Executa raycasts
    for (const rayData of rayDirections) {
        raycaster.set(lostSoulPosition, rayData.direction);
        raycaster.far = maxDistance;
        raycaster.near = 0.1;

        const intersects = raycaster.intersectObjects(validObjects, true);
        
        if (intersects.length > 0) {
            const hit = intersects[0];
            const weightedDistance = hit.distance / rayData.weight;
            
            if (weightedDistance < minWeightedDistance) {
                minWeightedDistance = weightedDistance;
                closestCollision = {
                    hasCollision: true,
                    point: hit.point.clone(),
                    normal: hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 1, 0),
                    distance: hit.distance,
                    object: hit.object,
                    direction: rayData.direction.clone(),
                    weight: rayData.weight
                };
            }
        }
    }

    return closestCollision || { hasCollision: false };
}

// Sistema de correção de colisão suave e estável
export function applyLostSoulCollisionCorrection(lostSoul, collidableObjects, targetPosition) {
    const collision = checkLostSoulCollision(lostSoul.mesh.position, targetPosition, collidableObjects, lostSoul.config.radius);
    
    if (!collision.hasCollision) {
        return { corrected: false };
    }

    const currentPos = lostSoul.mesh.position;
    const originalDirection = new THREE.Vector3().subVectors(targetPosition, currentPos).normalize();
    const safeDistance = CONFIG.LOST_SOUL_COLLISION_DISTANCE || 1.8;
    
    // Se está muito próximo da parede, aplica correção suave de posição
    if (collision.distance < safeDistance) {
        if (CONFIG.LOST_SOUL_SMOOTH_COLLISION) {
            // Correção suave da posição para manter distância segura
            const penetrationDepth = safeDistance - collision.distance;
            const pushBackDirection = collision.normal.clone();
            
            // Aplica a correção gradualmente para evitar flickering
            const correctionStrength = CONFIG.LOST_SOUL_COLLISION_SMOOTHING || 0.15;
            const positionCorrection = pushBackDirection.multiplyScalar(penetrationDepth * correctionStrength);
            
            // Aplica a correção suavemente
            lostSoul.mesh.position.add(positionCorrection);
        }

        // Sistema inteligente de pathfinding
        if (CONFIG.LOST_SOUL_OBSTACLE_AVOIDANCE) {
            return findAlternativePath(currentPos, targetPosition, collision, collidableObjects, lostSoul.config.radius);
        } else {
            // Deflexão simples baseada na normal
            return applySimpleDeflection(originalDirection, collision);
        }
    }

    return { corrected: false };
}

// Encontra uma rota alternativa inteligente
function findAlternativePath(currentPos, targetPosition, collision, collidableObjects, radius) {
    const originalDirection = new THREE.Vector3().subVectors(targetPosition, currentPos).normalize();
    const normal = collision.normal.clone();
    
    // Gera direções alternativas baseadas na normal da superfície
    const alternativeDirections = [];
    
    // Deflexão lateral (deslizar ao longo da parede)
    const slideDirection1 = new THREE.Vector3().crossVectors(normal, new THREE.Vector3(0, 1, 0)).normalize();
    const slideDirection2 = slideDirection1.clone().multiplyScalar(-1);
    
    // Deflexão vertical (para cima/baixo se for parede vertical)
    const isVerticalWall = Math.abs(normal.y) < 0.3;
    if (isVerticalWall && CONFIG.LOST_SOUL_VERTICAL_COLLISION) {
        alternativeDirections.push(
            { direction: new THREE.Vector3(0, 1, 0), priority: 0.8 },
            { direction: new THREE.Vector3(0, -1, 0), priority: 0.6 }
        );
    }
    
    // Direções de deslizamento lateral
    alternativeDirections.push(
        { direction: slideDirection1, priority: 0.9 },
        { direction: slideDirection2, priority: 0.9 }
    );
    
    // Direções combinadas (original + deslizamento)
    const combineRatio = 0.7;
    alternativeDirections.push(
        { 
            direction: originalDirection.clone().multiplyScalar(combineRatio)
                .add(slideDirection1.clone().multiplyScalar(1 - combineRatio)).normalize(),
            priority: 1.0
        },
        {
            direction: originalDirection.clone().multiplyScalar(combineRatio)
                .add(slideDirection2.clone().multiplyScalar(1 - combineRatio)).normalize(),
            priority: 1.0
        }
    );

    // Testa cada direção alternativa
    for (const altData of alternativeDirections) {
        const testDistance = CONFIG.LOST_SOUL_RAYCAST_DISTANCE || 2.5;
        const testPosition = currentPos.clone().addScaledVector(altData.direction, testDistance);
        
        const testCollision = checkLostSoulCollision(currentPos, testPosition, collidableObjects, radius);
        
        if (!testCollision.hasCollision || testCollision.distance > CONFIG.LOST_SOUL_COLLISION_DISTANCE) {
            return {
                corrected: true,
                newDirection: altData.direction,
                collision: collision,
                priority: altData.priority
            };
        }
    }

    // Se nenhuma rota alternativa foi encontrada, usa deflexão simples
    return applySimpleDeflection(originalDirection, collision);
}

// Aplica deflexão simples baseada na normal
function applySimpleDeflection(originalDirection, collision) {
    const normal = collision.normal.clone();
    
    // Calcula direção deflectida
    const deflectedDirection = originalDirection.clone().reflect(normal);
    
    // Mistura direção original com deflectida para manter o objetivo
    const mixRatio = CONFIG.LOST_SOUL_COLLISION_CORRECTION || 0.8;
    const finalDirection = originalDirection.clone().multiplyScalar(1 - mixRatio)
        .add(deflectedDirection.multiplyScalar(mixRatio))
        .normalize();
    
    return {
        corrected: true,
        newDirection: finalDirection,
        collision: collision,
        priority: 0.5
    };
}
