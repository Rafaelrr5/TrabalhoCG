import * as THREE from '../../../build/three.module.js';
import { WEAPONS_CONFIG } from '../core/config/weaponsConfig.js';
import { DEBUG_CONFIG } from '../core/config/debugConfig.js';
import { BaseWeapon } from './baseWeapon.js';

export class Gun extends BaseWeapon {
    constructor(camera) {
        super(camera, WEAPONS_CONFIG.WEAPONS.LAUNCHER);
    }

    createWeaponMesh() {
        const gunGeometry = new THREE.CylinderGeometry(WEAPONS_CONFIG.GUN_RADIUS, WEAPONS_CONFIG.GUN_RADIUS, WEAPONS_CONFIG.GUN_LENGTH);
        const gunMaterial = new THREE.MeshLambertMaterial({color:'darkgrey'});
        this.mesh = new THREE.Mesh(gunGeometry, gunMaterial);
        
        // Rotaciona para apontar para frente
        this.mesh.rotation.x = Math.PI / 2;
        // Posiciona relativo à câmera (inferior-direita da visão)
        this.mesh.position.set(WEAPONS_CONFIG.GUN_POSITION.x, WEAPONS_CONFIG.GUN_POSITION.y, WEAPONS_CONFIG.GUN_POSITION.z);
        
        // Define visibilidade baseada nas configurações de debug
        this.mesh.visible = this.isVisible;
        
        // Anexa a arma na câmera para mover com o jogador
        this.camera.add(this.mesh);
        
        if (DEBUG_CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[GUN] Gun mesh created and attached to camera`);
        }
    }
}

// Create a singleton instance for backward compatibility
export let gun = null;

// Backward compatibility functions
export function createGun(camera) {
    gun = new Gun(camera);
    return gun;
}

export function initGun(scene) {
    if (gun) {
        return gun.init(scene);
    }
    return false;
}

export function startShooting() {
    if (gun) {
        gun.startShooting();
    }
}

export function stopShooting() {
    if (gun) {
        gun.stopShooting();
    }
}

export function updateProjectiles(delta) {
    if (gun) {
        gun.updateProjectiles(delta);
    }
}

export function toggleWeaponVisibility() {
    if (gun) {
        gun.toggleVisibility();
    }
}

export function setWeaponVisibility(visible) {
    if (gun) {
        gun.setVisibility(visible);
    }
}

export function debugWeaponInfo() {
    if (gun) {
        gun.debugInfo();
    }
}

// Export projectiles array for backward compatibility
export function getProjectiles() {
    return gun ? gun.projectiles : [];
}

// Export gun instance for direct access if needed
export function getGun() {
    return gun;
}
