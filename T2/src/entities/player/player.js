import * as THREE from '../../../../build/three.module.js';
import { CONFIG } from '../../core/config.js';

export class Player {
    constructor() {
        this.hitbox = null;
        this.health = 100;
        this.maxHealth = 100;
        this.isAlive = true;
        this.position = new THREE.Vector3(0, CONFIG.CAMERA_HEIGHT, 0);
    }

    init(scene) {
        if (!scene) {
            console.error("Scene is required for player initialization");
            return false;
        }
        
        this.createHitbox(scene);
        this.resetPosition();
        return true;
    }

    createHitbox(scene) {
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
        
        this.hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
        this.hitbox.position.set(0.0, CONFIG.CAMERA_HEIGHT + CONFIG.PLAYER_HEIGHT/2, 0.0);
        this.hitbox.visible = CONFIG.DEBUG_SHOW_HITBOX;
        
        scene.add(this.hitbox);
    }

    updateHitbox(camera) {
        if (!this.hitbox || !camera) {
            console.error("Hitbox or camera is missing");
            return;
        }
        
        this.hitbox.position.x = camera.position.x;
        this.hitbox.position.z = camera.position.z;
        this.position.copy(camera.position);
    }

    toggleHitboxVisibility() {
        if (!this.hitbox) return;
        
        this.hitbox.visible = !this.hitbox.visible;
        this.hitbox.material.opacity = this.hitbox.visible ? 0.3 : 0.0;
        this.hitbox.material.wireframe = this.hitbox.visible;
        
        CONFIG.DEBUG_SHOW_HITBOX = this.hitbox.visible;
    }

    setHitboxVisibility(visible) {
        if (!this.hitbox) return;
        
        this.hitbox.visible = visible;
        this.hitbox.material.opacity = visible ? 0.3 : 0.0;
        this.hitbox.material.wireframe = visible;
    }

    resetPosition() {
        const startHeight = CONFIG.CAMERA_HEIGHT + (CONFIG.START_HEIGHT_OFFSET || 0);
        this.position.set(0, startHeight, 0);

        if (this.hitbox) {
            this.hitbox.position.set(0, startHeight - 1.0, 0);
        }
    }

    takeDamage(damage) {
        if (!this.isAlive) return false;

        this.health = Math.max(0, this.health - damage);
        
        if (CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[PLAYER] Took ${damage} damage. Health: ${this.health}/${this.maxHealth}`);
        }
        
        // Check for death
        if (this.health <= 0) {
            this.isAlive = false;
            console.log('[PLAYER DEATH] Player died!');
            return false;
        }
        
        return true;
    }

    heal(amount) {
        if (!this.isAlive) return;
        
        this.health = Math.min(this.maxHealth, this.health + amount);
        
        if (CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[PLAYER] Healed ${amount}. Health: ${this.health}/${this.maxHealth}`);
        }
    }

    respawn() {
        this.health = this.maxHealth;
        this.isAlive = true;
        this.resetPosition();
        
        if (CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log('[PLAYER] Respawned');
        }
    }

    getHealthPercentage() {
        return this.health / this.maxHealth;
    }

    getHitbox() {
        return this.hitbox;
    }

    getPosition() {
        return this.position;
    }

    getHealthStatus() {
        return {
            current: this.health,
            max: this.maxHealth,
            percentage: this.getHealthPercentage(),
            isAlive: this.isAlive
        };
    }

    update(delta, camera) {
        this.updateHitbox(camera);
    }
}

// Create a singleton instance for backward compatibility
export const player = new Player();

// Export the hitbox for backward compatibility
export let hitbox = null;

// Backward compatibility functions
export function createHitbox(scene) {
    const success = player.init(scene);
    hitbox = player.getHitbox();
    return hitbox;
}

export function updateHitbox(camera) {
    player.updateHitbox(camera);
}

export function toggleHitboxVisibility() {
    player.toggleHitboxVisibility();
}

export function setHitboxVisibility(visible) {
    player.setHitboxVisibility(visible);
}
