// ============================================================================
// SISTEMA DE HITBOX DO JOGADOR
// ============================================================================
import * as THREE from '../build/three.module.js';

export let hitbox = null;

// Cria hitbox invisível para o jogador
export function createHitbox(scene) {
    const hitboxGeometry = new THREE.BoxGeometry(1.0, 2.0, 1.0);
    const hitboxMaterial = new THREE.MeshBasicMaterial();
    hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    hitbox.position.set(0.0, 1.0, 0.0);
    hitbox.visible = false;
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
