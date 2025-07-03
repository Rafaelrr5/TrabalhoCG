import * as THREE from '../../../build/three.module.js';
import { setDefaultMaterial } from '../../../libs/util/util.js';
import { CONFIG } from '../core/config.js';
import { enemies } from '../entities/enemies/enemy.js';
import { cacodemons } from '../entities/enemies/cacodemonManager.js';

export class Chaingun {
    constructor(camera) {
        this.camera = camera;
        this.mesh = null;
        this.projectiles = [];
        this.shootInterval = null;
        this.lastShotTime = 0;
        this.isMousePressed = false;
        this.raycaster = new THREE.Raycaster();
        this.collisionDistance = CONFIG.WEAPONS.CHAINGUN.PROJECTILE_SIZE * 2;
        
        // Gun properties
        this.isVisible = CONFIG.DEBUG_SHOW_WEAPON;
        this.damage = CONFIG.WEAPONS.CHAINGUN.DAMAGE;
        this.shootRate = CONFIG.WEAPONS.CHAINGUN.SHOOT_RATE;
        this.projectileSpeed = CONFIG.WEAPONS.CHAINGUN.PROJECTILE_SPEED;
        this.projectileLifetime = CONFIG.WEAPONS.CHAINGUN.PROJECTILE_LIFETIME;

        this.id = Chaingun.generateId();
    }

    static generateId() {
        return `chaingun_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    init(scene) {
        if (!scene) {
            console.error("Scene is required for gun initialization");
            return false;
        }
        
        this.scene = scene;
        this.createGunMesh();
        
        if (CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[Chaingun] Chaingun created with ID: ${this.id}`);
        }
        
        return true;
    }

    createGunMesh() {
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
            console.log(`[Chaingun] Chaingun mesh created and attached to camera`);
        }
    }

    startShooting() {
        if (this.isMousePressed) return; // Evita múltiplas chamadas
        this.isMousePressed = true;
        
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
        clearInterval(this.shootInterval);
        this.shootInterval = null;
    }

    shoot() {
        if (!this.mesh || !this.camera || !this.scene) return; // Verificação de segurança
        
        // Atualiza timestamp do último disparo
        this.lastShotTime = performance.now();
        
        // Cria geometria e material do projétil
        const projectileGeometry = new THREE.SphereGeometry(CONFIG.PROJECTILE_SIZE);
        const projectileMaterial = new THREE.MeshLambertMaterial({ color: 'lightgreen' });
        const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
        
        // Pega direção que a câmera está olhando no momento do tiro
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        
        // Calcula posição mundial da ponta da arma com precisão
        const gunWorldPosition = new THREE.Vector3();
        this.mesh.getWorldPosition(gunWorldPosition);
        
        // Calcula offset da ponta da arma no espaço local
        const gunTipOffset = new THREE.Vector3(0, 0, CONFIG.GUN_TIP_OFFSET);
        
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

        if (CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[GUN] Projectile fired. Active projectiles: ${this.projectiles.length}`);
        }
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

            // Filtra as colisões 
            const validIntersects = intersects.filter(intersect => {
                return intersect.object !== this.mesh && 
                       intersect.object !== projectile && 
                       intersect.object.parent !== this.mesh;
            });

            // Se colidiu com inimigo, aplica dano e remove projétil
            let hitEnemy = false;
            for (const hit of validIntersects) {
                // Identifica se objeto ou seu parent é inimigo
                const obj = hit.object;
                // Check for enemy userData in hit object or its ancestors
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
        if (this.mesh) {
            this.mesh.visible = !this.mesh.visible;
            this.isVisible = this.mesh.visible;
            
            // Atualiza a configuração global
            CONFIG.DEBUG_SHOW_WEAPON = this.mesh.visible;
            
            if (CONFIG.DEBUG_CONSOLE_LOGS) {
                console.log(`[GUN] Arma: ${this.mesh.visible ? 'VISÍVEL' : 'OCULTA'}`);
            }
        }
    }

    setVisibility(visible) {
        if (this.mesh) {
            this.mesh.visible = visible;
            this.isVisible = visible;
            if (CONFIG.DEBUG_CONSOLE_LOGS) {
                console.log(`[GUN] Arma definida como: ${visible ? 'VISÍVEL' : 'OCULTA'}`);
            }
        }
    }

    debugInfo() {
        if (!CONFIG.DEBUG_CONSOLE_LOGS) return;
        
        console.log('=== DEBUG ARMA ===');
        console.log(`ID: ${this.id}`);
        console.log(`Posição da arma: (${this.mesh?.position.x.toFixed(2)}, ${this.mesh?.position.y.toFixed(2)}, ${this.mesh?.position.z.toFixed(2)})`);
        console.log(`Rotação da arma: (${this.mesh?.rotation.x.toFixed(2)}, ${this.mesh?.rotation.y.toFixed(2)}, ${this.mesh?.rotation.z.toFixed(2)})`);
        console.log(`Visível: ${this.mesh?.visible}`);
        console.log(`Projéteis ativos: ${this.projectiles.length}`);
        console.log(`Dano: ${this.damage}`);
        console.log(`Taxa de tiro: ${this.shootRate}ms`);
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
        
        // Remove gun mesh
        if (this.mesh && this.camera) {
            this.camera.remove(this.mesh);
        }
        
        this.mesh = null;
        this.scene = null;
        this.camera = null;
        
        if (CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[GUN] Gun ${this.id} destroyed`);
        }
    }
}

// Create a singleton instance for backward compatibility
export let gun = null;

// Backward compatibility functions
export function createGun(camera) {
    gun = new Chaingun(camera);
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
