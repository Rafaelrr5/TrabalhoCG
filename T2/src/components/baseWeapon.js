import * as THREE from '../../../build/three.module.js';
import { WEAPONS_CONFIG } from '../core/config/weaponsConfig.js';
import { DEBUG_CONFIG } from '../core/config/debugConfig.js';
import { enemies, getCacodemons } from '../entities/enemies/enemy.js';

export class BaseWeapon {
    constructor(camera, weaponConfig) {
        this.camera = camera;
        this.mesh = null;
        this.projectiles = [];
        this.shootInterval = null;
        this.lastShotTime = 0;
        this.isMousePressed = false;
        this.raycaster = new THREE.Raycaster();
        this.raycaster.camera = camera;
        this.collisionDistance = weaponConfig.PROJECTILE_SIZE * 2;
        
        // Weapon properties from config
        this.isVisible = DEBUG_CONFIG.DEBUG_SHOW_WEAPON;
        this.damage = weaponConfig.DAMAGE;
        this.shootRate = weaponConfig.SHOOT_RATE;
        this.projectileSpeed = weaponConfig.PROJECTILE_SPEED;
        this.projectileLifetime = weaponConfig.PROJECTILE_LIFETIME;
        this.projectileSize = weaponConfig.PROJECTILE_SIZE;
        this.projectileColor = weaponConfig.PROJECTILE_COLOR;
        this.projectileVisibility = weaponConfig.PROJECTILE_VISIBILITY
        
        this.id = this.generateId();
        this.scene = null;
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
        if (!this.mesh || !this.camera || !this.scene) return;
        
        // Atualiza timestamp do último disparo
        this.lastShotTime = performance.now();
        
        // Cria geometria e material do projétil
        const projectileGeometry = new THREE.SphereGeometry(this.projectileSize);
        const projectileMaterial = new THREE.MeshLambertMaterial({ color: this.projectileColor , visible: this.projectileVisibility});
        const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
        
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
        
        // Posiciona projétil na ponta da arma
        projectile.position.copy(gunWorldPosition);
        projectile.position.add(gunTipOffset);
        
        this.scene.add(projectile);
        
        // Armazena projétil com seus dados de movimento e tempo
        this.projectiles.push({
            mesh: projectile,
            direction: direction.clone(),
            timeAlive: 0
        });

        this.onShoot();

        if (DEBUG_CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[${this.constructor.name}] Projectile fired. Active projectiles: ${this.projectiles.length}`);
        }
    }

    // Hook para subclasses implementarem lógica específica após o tiro
    onShoot() {
        // Pode ser sobrescrito pelas subclasses
    }

    updateProjectiles(delta) {
        if (!this.scene) return;
        
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectileData = this.projectiles[i];
            const projectile = projectileData.mesh;
            
            projectileData.timeAlive += delta;
            
            // Verifica colisão com paredes usando Raycaster
            this.raycaster.set(projectile.position, projectileData.direction);
            this.raycaster.far = this.projectileSpeed * delta + this.collisionDistance;

            const intersects = this.raycaster.intersectObjects(this.scene.children, true);

            // Filtra as colisões - exclui sprites e objetos relacionados à arma
            const validIntersects = intersects.filter(intersect => {
                const obj = intersect.object;
                // Exclui o mesh da arma
                if (obj === this.mesh) return false;
                // Exclui o projétil atual
                if (obj === projectile) return false;
                // Exclui objetos filhos da arma
                if (obj.parent === this.mesh) return false;
                // Exclui sprites
                if (obj.type === 'Sprite') return false;
                
                return true;
            });

            // Se colidiu com inimigo, aplica dano e remove projétil
            let hitEnemy = false;
            for (const hit of validIntersects) {
                const obj = hit.object;
                let enemy = null;
                let currentObj = obj;
                
                while (currentObj && !enemy) {
                    if (currentObj.userData && currentObj.userData.enemy) {
                        enemy = currentObj.userData.enemy;
                        break;
                    }
                    // Check Lost Souls
                    enemy = enemies.find(e => e.mesh === currentObj);
                    if (enemy) break;
                    
                    // Check Cacodemons
                    const cacodemons = getCacodemons();
                    enemy = cacodemons.find(c => c.mesh === currentObj);
                    if (enemy) break;
                    
                    // Traverse up the hierarchy
                    currentObj = currentObj.parent;
                }
                
                if (enemy && enemy.isAlive) {
                    enemy.takeDamage(this.damage);
                    this.scene.remove(projectile);
                    this.projectiles.splice(i, 1);
                    hitEnemy = true;
                    break;
                }
            }
            if (hitEnemy) continue;
            
            // Colisão com ambiente, remove o projétil
            if (validIntersects.length > 0) {
                this.scene.remove(projectile);
                this.projectiles.splice(i, 1);
                continue;
            }
             
            // Move projétil na direção especificada
            projectile.position.add(
                projectileData.direction.clone().multiplyScalar(this.projectileSpeed * delta)
            );
             
            // Remove projétil após tempo limite
            if (projectileData.timeAlive > this.projectileLifetime) {
                this.scene.remove(projectile);
                this.projectiles.splice(i, 1);
            }
        }
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
        
        console.log(`=== DEBUG ${this.constructor.name.toUpperCase()} ===`);
        console.log(`ID: ${this.id}`);
        console.log(`Position: (${this.mesh?.position.x.toFixed(2)}, ${this.mesh?.position.y.toFixed(2)}, ${this.mesh?.position.z.toFixed(2)})`);
        console.log(`Rotation: (${this.mesh?.rotation.x.toFixed(2)}, ${this.mesh?.rotation.y.toFixed(2)}, ${this.mesh?.rotation.z.toFixed(2)})`);
        console.log(`Visible: ${this.mesh?.visible}`);
        console.log(`Active projectiles: ${this.projectiles.length}`);
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
        return this.projectiles.length;
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
    }

    setShootRate(rate) {
        this.shootRate = rate;
    }

    setProjectileSpeed(speed) {
        this.projectileSpeed = speed;
    }

    // Cleanup method
    destroy() {
        this.stopShooting();
        
        // Remove all projectiles
        this.projectiles.forEach(projectileData => {
            if (this.scene && projectileData.mesh) {
                this.scene.remove(projectileData.mesh);
            }
        });
        this.projectiles = [];
        
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
