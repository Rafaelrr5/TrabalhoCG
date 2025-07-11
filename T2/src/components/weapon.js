import * as THREE from '../../../build/three.module.js';
import { CONFIG } from '../core/config.js';
import { BaseWeapon } from './baseWeapon.js';

export class Gun extends BaseWeapon {
    constructor(camera) {
        super(camera, CONFIG.WEAPONS.LAUNCHER);
    }

    createWeaponMesh() {
        const gunGeometry = new THREE.CylinderGeometry(CONFIG.GUN_RADIUS, CONFIG.GUN_RADIUS, CONFIG.GUN_LENGTH);
        const gunMaterial = new THREE.MeshLambertMaterial({color:'darkgrey'});
        this.mesh = new THREE.Mesh(gunGeometry, gunMaterial);
        
        // Rotaciona para apontar para frente
        this.mesh.rotation.x = Math.PI / 2;
        // Posiciona relativo à câmera (inferior-direita da visão)
        this.mesh.position.set(CONFIG.GUN_POSITION.x, CONFIG.GUN_POSITION.y, CONFIG.GUN_POSITION.z);
        
        // Define visibilidade baseada nas configurações de debug
        this.mesh.visible = this.isVisible;
        
        // Anexa a arma na câmera para mover com o jogador
        this.camera.add(this.mesh);
        
        if (CONFIG.DEBUG_CONSOLE_LOGS) {
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
