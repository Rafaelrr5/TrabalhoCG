/**
 * Player hitbox system for collision detection
 */
import * as THREE from '../../../../build/three.module.js';
import { CONFIG } from '../../core/config.js';

export let hitbox = null;

export function createHitbox(scene) {
    if (!scene) {
        console.error("Scene is required for hitbox creation");
        return null;
    }
    
    const hitboxGeometry = new THREE.BoxGeometry(
        CONFIG.HITBOX_WIDTH, 
        CONFIG.PLAYER_HEIGHT, 
        CONFIG.HITBOX_DEPTH
    );
    
    const hitboxMaterial = new THREE.MeshBasicMaterial({
        color: 'darkgreen', 
        transparent: true, 
        opacity: CONFIG.DEBUG_SHOW_HITBOX ? 0.3 : 0.0,
        wireframe: CONFIG.DEBUG_SHOW_HITBOX
    });
    
    hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    hitbox.position.set(0.0, CONFIG.CAMERA_HEIGHT + CONFIG.PLAYER_HEIGHT/2, 0.0);
    hitbox.visible = CONFIG.DEBUG_SHOW_HITBOX;
    
    scene.add(hitbox);
    return hitbox;
}

export function updateHitbox(camera) {
    if (!hitbox || !camera) {
        console.error("Hitbox or camera is missing");
        return;
    }
    
    hitbox.position.x = camera.position.x;
    hitbox.position.z = camera.position.z;
}

export function toggleHitboxVisibility() {
    if (!hitbox) return;
    
    hitbox.visible = !hitbox.visible;
    hitbox.material.opacity = hitbox.visible ? 0.3 : 0.0;
    hitbox.material.wireframe = hitbox.visible;
    
    CONFIG.DEBUG_SHOW_HITBOX = hitbox.visible;
    
    if (CONFIG.DEBUG_CONSOLE_LOGS) {
        console.log(`[DEBUG] Player hitbox: ${hitbox.visible ? 'VISIBLE' : 'HIDDEN'}`);
    }
}

export function setHitboxVisibility(visible) {
    if (!hitbox) return;
    
    hitbox.visible = visible;
    hitbox.material.opacity = visible ? 0.3 : 0.0;
    hitbox.material.wireframe = visible;
    
    if (CONFIG.DEBUG_CONSOLE_LOGS) {
        console.log(`[DEBUG] Player hitbox set to: ${visible ? 'VISIBLE' : 'HIDDEN'}`);
    }
}
