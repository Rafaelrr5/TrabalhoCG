// ============================================================================
// SISTEMA DE HITBOX DO JOGADOR
// ============================================================================
import * as THREE from '../build/three.module.js';
import { setDefaultMaterial } from '../libs/util/util.js';
import { CONFIG } from './config.js';

export let hitbox = null;
// Cria hitbox invisível para o jogador
export function createHitbox(scene) {
    //verificação de segurança
    if (!scene) {
        console.error("Scene is not defined. Cannot create hitbox.");
        return null;
    }    
    const hitboxGeometry = new THREE.BoxGeometry(CONFIG.HITBOX_WIDTH, CONFIG.PLAYER_HEIGHT, CONFIG.HITBOX_DEPTH);
    const hitboxMaterial = setDefaultMaterial('blue');
    hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    //hitbox.visible = false; // Torna a hitbox invisível
    hitbox.position.set(0.0, CONFIG.CAMERA_HEIGHT + CONFIG.PLAYER_HEIGHT/2, 0.0);
    scene.add(hitbox);
    
    return hitbox;
}

// Atualiza a posição da hitbox para acompanhar o jogador
export function updateHitbox(camera) {
    //verificação de segurança
    if (!hitbox || !camera) {
        console.error("Hitbox or camera is not defined. Cannot update hitbox position.");
        return;
    }
    if (hitbox && camera) {
        hitbox.position.x = camera.position.x;
        hitbox.position.z = camera.position.z;
    }
}