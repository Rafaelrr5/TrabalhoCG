import * as THREE from '../../../build/three.module.js';
import { Gun } from './weapon.js';
import { Chaingun } from './chaingun.js';
import { CONFIG } from '../core/config.js';

export class WeaponManager {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;
        this.weapons = [];
        this.currentWeaponIndex = 0;
        this.activeProjectiles = [];
        
        this.initWeapons();
        // Garante que a Gun/Launcher está visível se DEBUG_SHOW_WEAPON for true
        if (this.weapons.length > 0) {
        this.weapons[0].setVisibility(CONFIG.DEBUG_SHOW_WEAPON);
    }
    }
    
    initWeapons() {
        // Cria instâncias de todas as armas
        this.weapons = [
            new Gun(this.camera), //indice 0
            new Chaingun(this.camera)
        ];
        
        // Inicializa todas as armas
        this.weapons.forEach(weapon => {
            weapon.init(this.scene);
            weapon.setVisibility(false); // Todas começam ocultas
        });
        
        // Ativa a primeira arma por padrão
        this.switchWeapon(0);
    }
    
    switchWeapon(index) {
        if (index >= 0 && index < this.weapons.length && this.currentWeaponIndex !== index) {
            // Esconde a arma atual
            if (this.weapons[this.currentWeaponIndex]) {
                this.weapons[this.currentWeaponIndex].stopShooting();
                this.weapons[this.currentWeaponIndex].setVisibility(false);
            }
            
            // Mostra a nova arma
            this.currentWeaponIndex = index;
            this.weapons[this.currentWeaponIndex].setVisibility(CONFIG.DEBUG_SHOW_WEAPON);
            
            if (CONFIG.DEBUG_CONSOLE_LOGS) {
                console.log(`[WEAPON] Switched to weapon ${index}`);
            }
        }
    }
    
    nextWeapon() {
        const nextIndex = (this.currentWeaponIndex + 1) % this.weapons.length;
        this.switchWeapon(nextIndex);
    }
    
    previousWeapon() {
        const prevIndex = (this.currentWeaponIndex - 1 + this.weapons.length) % this.weapons.length;
        this.switchWeapon(prevIndex);
    }
    
    getCurrentWeapon() {
        return this.weapons[this.currentWeaponIndex];
    }
    
    // Métodos para encaminhar chamadas para a arma atual
    startShooting() {
        this.getCurrentWeapon()?.startShooting();
    }
    
    stopShooting() {
        this.getCurrentWeapon()?.stopShooting();
    }
    
      updateProjectiles(delta) {
        //atualiza os projéteis de todas as armas
        this.weapons.forEach(weapon => weapon.updateProjectiles(delta));
    }
    
    
    toggleVisibility() {
        this.getCurrentWeapon()?.toggleVisibility();
    }
    
    setVisibility(visible) {
        this.getCurrentWeapon()?.setVisibility(visible);
    }
    
    debugInfo() {
        this.getCurrentWeapon()?.debugInfo();
    }
}

// Singleton instance
export let weaponManager = null;

// Backward compatibility functions
export function createWeaponManager(camera, scene) {
    weaponManager = new WeaponManager(camera, scene);
    return weaponManager;
}

export function startShooting() {
    weaponManager?.startShooting();
}

export function stopShooting() {
    weaponManager?.stopShooting();
}

export function updateProjectiles(delta) {
    weaponManager?.updateProjectiles(delta);
}

export function toggleWeaponVisibility() {
    weaponManager?.toggleVisibility();
}

export function setWeaponVisibility(visible) {
    weaponManager?.setVisibility(visible);
}

export function debugWeaponInfo() {
    weaponManager?.debugInfo();
}

export function switchWeapon(index) {
    weaponManager?.switchWeapon(index);
}

export function nextWeapon() {
    weaponManager?.nextWeapon();
}

export function previousWeapon() {
    weaponManager?.previousWeapon();
}

export function getCurrentWeapon() {
    return weaponManager?.getCurrentWeapon();
}