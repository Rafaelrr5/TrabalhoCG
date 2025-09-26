import * as THREE from '../../../../build/three.module.js';
import { WEAPONS_CONFIG } from '../core/config/weaponsConfig.js';
import { DEBUG_CONFIG } from '../core/config/debugConfig.js';
import { createProjectileSystem, LegacyUtils } from '../systems/projectiles/index.js';

/**
 * Versão refatorada do BaseWeapon que usa o sistema unificado de projéteis
 * Mantém compatibilidade com a API existente
 */
export class BaseWeapon {
    constructor(camera, weaponConfig) {
        this.camera = camera;
        this.mesh = null;
        this.shootInterval = null;
        this.lastShotTime = 0;
        this.isMousePressed = false;
        
        // Weapon properties from config
        this.isVisible = DEBUG_CONFIG.DEBUG_SHOW_WEAPON;
        this.damage = weaponConfig.DAMAGE;
        this.shootRate = weaponConfig.SHOOT_RATE;
        this.projectileSpeed = weaponConfig.PROJECTILE_SPEED;
        this.projectileLifetime = weaponConfig.PROJECTILE_LIFETIME;
        this.projectileSize = weaponConfig.PROJECTILE_SIZE;
        this.projectileColor = weaponConfig.PROJECTILE_COLOR;
        this.projectileVisibility = weaponConfig.PROJECTILE_VISIBILITY;
        
        this.id = this.generateId();
        this.scene = null;
        
        // Sistema de projéteis - será inicializado no init()
        this.projectileSystem = null;
        this.projectileType = LegacyUtils.mapWeaponToProjectileType(weaponConfig);
    }

    generateId() {
        const className = this.constructor.name.toLowerCase();
        return `${className}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    init(scene) {
        if (!scene) {
            console.error(`[${this.constructor.name}] Scene is required for weapon initialization`);
            return false;
        }
        
        this.scene = scene;
        
        // Inicializa o sistema de projéteis
        this.projectileSystem = createProjectileSystem(scene, {
            enableDebug: DEBUG_CONFIG.DEBUG_CONSOLE_LOGS,
            poolSize: 50 // Menor que o sistema global
        });
        
        this.createWeaponMesh();
        
        if (DEBUG_CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[${this.constructor.name}] Weapon created with ID: ${this.id}`);
        }
        
        return true;
    }

    // Método abstrato - deve ser implementado pelas subclasses
    createWeaponMesh() {
        throw new Error('createWeaponMesh must be implemented by subclass');
    }

    startShooting() {
        if (this.isMousePressed || this.shootInterval) {
            if (DEBUG_CONFIG.DEBUG_CONSOLE_LOGS) {
                console.log(`[${this.constructor.name}] startShooting() called but already shooting or interval exists`);
            }
            return;
        }
        
        if (DEBUG_CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[${this.constructor.name}] Starting shooting`);
        }
        
        this.isMousePressed = true;
        this.onStartShooting();
        
        // Dispara imediatamente apenas se passou tempo suficiente
        const now = performance.now();
        if (now - this.lastShotTime >= this.shootRate) {
            this.shoot();
            this.lastShotTime = now;
        }
        
        // Inicia o interval para disparos contínuos
        this.shootInterval = setInterval(() => {
            if (this.isMousePressed) {
                this.shoot();
            }
        }, this.shootRate);
    }

    stopShooting() {
        this.isMousePressed = false;
        
        // Limpa o interval se existir
        if (this.shootInterval) {
            clearInterval(this.shootInterval);
            this.shootInterval = null;
            
            if (DEBUG_CONFIG.DEBUG_CONSOLE_LOGS) {
                console.log(`[${this.constructor.name}] Shooting stopped, interval cleared`);
            }
        }
        
        this.onStopShooting();
    }

    // Métodos que podem ser sobrescritos pelas subclasses
    onStartShooting() {
        // Hook para subclasses implementarem lógica específica
    }

    onStopShooting() {
        // Hook para subclasses implementarem lógica específica
    }

    shoot() {
        if (!this.mesh || !this.camera || !this.scene || !this.projectileSystem) return;
        
        // Atualiza timestamp do último disparo
        this.lastShotTime = performance.now();
        
        // Pega direção que a câmera está olhando no momento do tiro
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        
        // Calcula posição mundial da ponta da arma com precisão
        const gunWorldPosition = new THREE.Vector3();
        this.mesh.getWorldPosition(gunWorldPosition);
        
        // Calcula offset da ponta da arma no espaço local
        const gunTipOffset = new THREE.Vector3(0, 0, WEAPONS_CONFIG.GUN_TIP_OFFSET);
        
        // Quando soma o vetor que representa a ponta da arma à posição global da arma, o projétil sai exatamente na ponta do cano
        const cameraRotationMatrix = new THREE.Matrix4();
        cameraRotationMatrix.extractRotation(this.camera.matrixWorld);
        gunTipOffset.applyMatrix4(cameraRotationMatrix);
        
        // Posição final do projétil
        const projectilePosition = gunWorldPosition.clone().add(gunTipOffset);
        
        // Usa o novo sistema de projéteis
        const projectileData = this.projectileSystem.shoot(
            this.projectileType,
            projectilePosition,
            direction,
            {
                owner: this.id,
                weaponType: this.constructor.name
            }
        );

        this.onShoot(projectileData);

        if (DEBUG_CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[${this.constructor.name}] Projectile fired using unified system. Type: ${this.projectileType}`);
        }
    }

    // Hook para subclasses implementarem lógica específica após o tiro
    onShoot(projectileData) {
        // Pode ser sobrescrito pelas subclasses
    }

    updateProjectiles(delta) {
        if (!this.projectileSystem) return;
        
        // Atualiza projéteis usando o novo sistema
        this.projectileSystem.update(delta, {
            enemies: this.getEnemyTargets(),
            environment: this.getEnvironmentTargets()
        });
    }

    /**
     * Obtém alvos inimigos para colisão
     * @returns {Array} Lista de inimigos
     */
    getEnemyTargets() {
        // Compatibilidade com o sistema antigo
        const targets = [];
        
        // Adiciona enemies do sistema antigo se existir
        if (typeof window !== 'undefined') {
            if (window.enemies) {
                targets.push(...window.enemies.filter(e => e.isAlive));
            }
            
            if (window.getCacodemons) {
                const cacodemons = window.getCacodemons();
                targets.push(...cacodemons.filter(c => c.isAlive));
            }
        }

        return targets;
    }

    /**
     * Obtém objetos do ambiente para colisão
     * @returns {Array} Lista de objetos do ambiente
     */
    getEnvironmentTargets() {
        if (!this.scene) return [];
        
        return this.scene.children.filter(obj => {
            // Filtra objetos válidos para colisão
            return obj.type !== 'Sprite' && 
                   !obj.userData.isProjectile &&
                   !obj.userData.isWeapon &&
                   obj !== this.mesh &&
                   obj.geometry; // Tem que ter geometria para colidir
        });
    }

    toggleVisibility() {
        this.isVisible = !this.isVisible;
        this.setVisibility(this.isVisible);
    }

    setVisibility(visible) {
        this.isVisible = visible;
        
        if (this.mesh) {
            this.mesh.visible = visible;
            if (DEBUG_CONFIG.DEBUG_CONSOLE_LOGS) {
                console.log(`[${this.constructor.name}] Weapon visibility set to: ${visible ? 'VISIBLE' : 'HIDDEN'}`);
            }
        }
    }

    debugInfo() {
        if (!DEBUG_CONFIG.DEBUG_CONSOLE_LOGS) return;
        
        const stats = this.projectileSystem ? this.projectileSystem.getStats() : { activeProjectiles: 0 };
        
        console.log(`=== DEBUG ${this.constructor.name.toUpperCase()} ===`);
        console.log(`ID: ${this.id}`);
        console.log(`Position: (${this.mesh?.position.x.toFixed(2)}, ${this.mesh?.position.y.toFixed(2)}, ${this.mesh?.position.z.toFixed(2)})`);
        console.log(`Rotation: (${this.mesh?.rotation.x.toFixed(2)}, ${this.mesh?.rotation.y.toFixed(2)}, ${this.mesh?.rotation.z.toFixed(2)})`);
        console.log(`Visible: ${this.mesh?.visible}`);
        console.log(`Active projectiles: ${stats.activeProjectiles}`);
        console.log(`Projectile type: ${this.projectileType}`);
        console.log(`Damage: ${this.damage}`);
        console.log(`Shoot rate: ${this.shootRate}ms`);
        console.log(`Currently shooting: ${this.isMousePressed}`);
        console.log('================');
    }

    // Getters
    getMesh() {
        return this.mesh;
    }

    getId() {
        return this.id;
    }

    getProjectileCount() {
        return this.projectileSystem ? this.projectileSystem.getStats().activeProjectiles : 0;
    }

    isCurrentlyShooting() {
        return this.isMousePressed;
    }

    getPosition() {
        if (!this.mesh) return null;
        
        const worldPosition = new THREE.Vector3();
        this.mesh.getWorldPosition(worldPosition);
        return worldPosition;
    }

    // Setters
    setDamage(damage) {
        this.damage = damage;
        // TODO: Atualizar configuração do tipo de projétil dinamicamente
    }

    setShootRate(rate) {
        this.shootRate = rate;
    }

    setProjectileSpeed(speed) {
        this.projectileSpeed = speed;
        // TODO: Atualizar configuração do tipo de projétil dinamicamente
    }

    // Compatibility methods para código legado
    get projectiles() {
        if (!this.projectileSystem) return [];
        
        // Retorna array no formato antigo para compatibilidade
        return this.projectileSystem.system.projectiles.map(p => ({
            mesh: p.mesh,
            direction: p.direction,
            timeAlive: p.mesh.userData.timeAlive
        }));
    }

    // Cleanup method
    destroy() {
        this.stopShooting();
        
        // Destrói o sistema de projéteis
        if (this.projectileSystem) {
            this.projectileSystem.dispose();
            this.projectileSystem = null;
        }
        
        // Remove weapon mesh
        if (this.mesh && this.camera) {
            this.camera.remove(this.mesh);
        }
        
        this.mesh = null;
        this.scene = null;
        this.camera = null;
        
        if (DEBUG_CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[${this.constructor.name}] Weapon ${this.id} destroyed`);
        }
    }
}

// Exporta a classe original também para compatibilidade
export { BaseWeapon as BaseWeaponLegacy };