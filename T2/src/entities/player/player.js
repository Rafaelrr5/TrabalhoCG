import * as THREE from '../../../../build/three.module.js';
import { PLAYER_CONFIG } from '../../core/config/playerConfig.js';
import { DEBUG_CONFIG } from '../../core/config/debugConfig.js';
import { playerAudioManager } from '../../systems/index.js';

export class Player {
    constructor() {
        this.hitbox = null;
        this.health = 200;
        this.maxHealth = 200;
        this.isAlive = true;
        this.position = new THREE.Vector3(0, PLAYER_CONFIG.CAMERA_HEIGHT, 0);
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
            PLAYER_CONFIG.HITBOX_WIDTH, 
            PLAYER_CONFIG.PLAYER_HEIGHT, 
            PLAYER_CONFIG.HITBOX_DEPTH
        );
        
        const hitboxMaterial = new THREE.MeshBasicMaterial({
            color: 'darkgreen', 
            transparent: true, 
            opacity: DEBUG_CONFIG.DEBUG_SHOW_HITBOX ? 0.3 : 0.0,
            wireframe: DEBUG_CONFIG.DEBUG_SHOW_HITBOX
        });
        
        this.hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
        this.hitbox.position.set(0.0, PLAYER_CONFIG.CAMERA_HEIGHT + PLAYER_CONFIG.PLAYER_HEIGHT/2, 0.0);
        this.hitbox.visible = DEBUG_CONFIG.DEBUG_SHOW_HITBOX;
        
        scene.add(this.hitbox);
    }

    updateHitbox(camera) {
        if (!this.hitbox || !camera) {
            // Only log error if we expect these to be initialized (after game setup)
            if (typeof window !== 'undefined' && window.gameInitialized) {
                console.error("Hitbox or camera is missing");
            }
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
        
        DEBUG_CONFIG.DEBUG_SHOW_HITBOX = this.hitbox.visible;
    }

    setHitboxVisibility(visible) {
        if (!this.hitbox) return;
        
        this.hitbox.visible = visible;
        this.hitbox.material.opacity = visible ? 0.3 : 0.0;
        this.hitbox.material.wireframe = visible;
    }

    resetPosition() {
        // Use a fixed safe height for initial positioning
        const safeHeight = PLAYER_CONFIG.INITIAL_PLAYER_HEIGHT;
        this.position.set(0, safeHeight, 0);

        if (this.hitbox) {
            this.hitbox.position.set(0, safeHeight - 1.0, 0);
        }
        
        console.log('[PLAYER] Position reset to:', this.position);
    }

    takeDamage(damage) {
        if (!this.isAlive) return false;

        // Check if player is immortal
        if (PLAYER_CONFIG.PLAYER_IMMORTAL) {
            if (DEBUG_CONFIG.DEBUG_CONSOLE_LOGS) {
                console.log(`[PLAYER] Immortal mode - ignored ${damage} damage. Health: ${this.health}/${this.maxHealth}`);
            }
            return true; // Player doesn't take damage but is still alive
        }

        this.health = Math.max(0, this.health - damage);
        
        // Play injured sound when taking damage
        playerAudioManager.playInjuredSound();
        
        if (DEBUG_CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[PLAYER] Took ${damage} damage. Health: ${this.health}/${this.maxHealth}`);
        }
        
        // Check for death
        if (this.health <= 0) {
            this.isAlive = false;
            // Play death sound when player dies
            playerAudioManager.playDeathSound();
            console.log('[PLAYER DEATH] Player died!');
            return false;
        }
        
        return true;
    }

    heal(amount) {
        if (!this.isAlive) return;
        
        this.health = Math.min(this.maxHealth, this.health + amount);
        
        if (DEBUG_CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[PLAYER] Healed ${amount}. Health: ${this.health}/${this.maxHealth}`);
        }
    }

    respawn() {
        this.health = this.maxHealth;
        this.isAlive = true;
        this.resetPosition();
        
        if (DEBUG_CONFIG.DEBUG_CONSOLE_LOGS) {
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
