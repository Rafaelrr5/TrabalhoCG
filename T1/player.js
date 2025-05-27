// ============================================================================
// SISTEMA DE HITBOX DO JOGADOR
// ============================================================================
import * as THREE from '../build/three.module.js';
import { CONFIG } from './config.js';

export let hitbox = null;
let velocityY = 0;
let isGrounded = false;
const playerBox = new THREE.Box3();
const tempBox = new THREE.Box3();

// Cria hitbox invisível para o jogador
export function createHitbox(scene) {
    const hitboxGeometry = new THREE.BoxGeometry(1.0, CONFIG.PLAYER_HEIGHT, 1.0);
    const hitboxMaterial = new THREE.MeshBasicMaterial();
    hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    hitbox.visible = false; // Torna a hitbox invisível
    hitbox.position.set(0.0, 100.0, 0.0);
    scene.add(hitbox);
    
    return hitbox;
}

// Atualiza a posição da hitbox para acompanhar o jogador
export function updateHitbox(camera) {
    if (hitbox && camera) {
        hitbox.position.copy(camera.position);
        hitbox.position.y -= 1.0;
    }
}

// Aplica gravidade e verifica colisões
export function applyGravity(delta, collidableObjects, camera) {
    if (!hitbox) return;
    
    // Aplica gravidade apenas se não estiver no chão
    if (!isGrounded) {
        velocityY += CONFIG.GRAVITY * delta;
    } else {
        velocityY = 0;
    }
    
    // Move verticalmente
    hitbox.position.y += velocityY * delta;
    camera.position.y += velocityY * delta;
    
    // Verifica colisão com o chão e outros objetos
    checkCollisions(collidableObjects, camera);
}

// Verifica colisões AABB com resposta mais precisa
function checkCollisions(collidableObjects, camera) {
    isGrounded = false;
    playerBox.setFromObject(hitbox);
    
    // Verifica colisão com todos os objetos
    for (const object of collidableObjects) {
        if (!object.geometry || !object.visible) continue;
        
        tempBox.setFromObject(object);
        
        if (playerBox.intersectsBox(tempBox)) {
            // Calcula a sobreposição em cada eixo
            const overlapX = Math.min(playerBox.max.x - tempBox.min.x, tempBox.max.x - playerBox.min.x);
            const overlapY = Math.min(playerBox.max.y - tempBox.min.y, tempBox.max.y - playerBox.min.y);
            const overlapZ = Math.min(playerBox.max.z - tempBox.min.z, tempBox.max.z - playerBox.min.z);
            
            // Encontra o eixo de menor sobreposição (colisão mais provável)
            if (overlapY < overlapX && overlapY < overlapZ) {
                // Colisão vertical
                if (velocityY < 0) {
                    // Colisão com o chão
                    const correction = tempBox.max.y - playerBox.min.y + 0.001;
                    hitbox.position.y += correction;
                    camera.position.y += correction;
                    velocityY = 0;
                    isGrounded = true;
                } else if (velocityY > 0) {
                    // Colisão com o teto
                    const correction = tempBox.min.y - playerBox.max.y - 0.001;
                    hitbox.position.y += correction;
                    camera.position.y += correction;
                    velocityY = 0;
                }
            }
        }
    }
}
