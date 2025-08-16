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
        const safeHeight = PLAYER_CONFIG.INITIAL_PLAYER_HEIGHT;
        this.position.set(0, safeHeight, 0);

        if (this.hitbox) {
            this.hitbox.position.set(0, safeHeight - 1.0, 0);
        }
    }

    takeDamage(damage) {
        if (!this.isAlive) return false;

        if (PLAYER_CONFIG.PLAYER_IMMORTAL) {
            return true;
        }

        this.health = Math.max(0, this.health - damage);
        
        playerAudioManager.playInjuredSound();
                
        if (this.health <= 0) {
            this.isAlive = false;
            playerAudioManager.playDeathSound();
            console.log('[PLAYER DEATH] Player died!');
            return false;
        }
        
        return true;
    }

    heal(amount) {
        if (!this.isAlive) return;
        
        this.health = Math.min(this.maxHealth, this.health + amount);
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
        console.log(`Player Position (X, Z): ${this.position.x.toFixed(2)}, ${this.position.z.toFixed(2)}`);
    }
}

export const player = new Player();

export let hitbox = null;

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
