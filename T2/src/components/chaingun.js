import * as THREE from '../../../build/three.module.js';
import { setDefaultMaterial } from '../../../libs/util/util.js';
import { CONFIG } from '../core/config.js';
import { enemies } from '../entities/enemies/enemy.js';
import { getCacodemons } from '../entities/enemies/enemy.js';
import { SpriteMixer } from '../utils/spriteMixer.js';

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
        this.activationDelay = CONFIG.WEAPONS.CHAINGUN.ACTIVATION_DELAY;
        this.activationTimer = 0;
        this.isActivating = false;
        this.actions = {};
        this.chaingunSprite = null;
        this.spriteMixer;
        this.preparing;
        this.shooting;
        this.loader;
        
        // Gun properties
        this.isVisible = CONFIG.DEBUG_SHOW_WEAPON;
        this.damage = CONFIG.WEAPONS.CHAINGUN.DAMAGE;
        this.shootRate = CONFIG.WEAPONS.CHAINGUN.SHOOT_RATE;
        this.projectileSpeed = CONFIG.WEAPONS.CHAINGUN.PROJECTILE_SPEED;
        this.projectileLifetime = CONFIG.WEAPONS.CHAINGUN.PROJECTILE_LIFETIME;

        this.id = Chaingun.generateId();
        
        // Audio system
        this.fireSound = null;
        this.audioLoader = new THREE.AudioLoader();
        this.isAudioInitialized = false;
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
        //this.createSprite();
        this.initAudio();
        
        if (CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[Chaingun] Chaingun created with ID: ${this.id}`);
        }
        
        return true;
    }

    createGunMesh() {
        const gunGeometry = new THREE.CylinderGeometry(CONFIG.GUN_RADIUS, CONFIG.GUN_RADIUS, CONFIG.GUN_LENGTH);
        const gunMaterial = new THREE.MeshLambertMaterial({color:'darkgrey'});
        this.mesh = new THREE.Mesh(gunGeometry, gunMaterial);
        //this.mesh = this.createSprite();
        
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

    initAudio() {
        // Check if audio listener is available
        if (!window.listener) {
            console.warn('[CHAINGUN] Audio listener not available, skipping sound initialization');
            return;
        }
        
        this.fireSound = new THREE.Audio(window.listener);
        
        // Load chaingun fire sound
        this.audioLoader.load('/T2/assets/sounds/weapon/chaingun_fire.wav', (buffer) => {
            this.fireSound.setBuffer(buffer);
            this.fireSound.setVolume(0.3); // Lower volume to not overpower ambient music
            this.isAudioInitialized = true;
            console.log('[CHAINGUN] Loaded chaingun fire sound');
        }, undefined, (error) => {
            console.warn('[CHAINGUN] Failed to load chaingun fire sound:', error);
        });
    }

    playFireSound() {
        if (this.isAudioInitialized && this.fireSound && this.fireSound.buffer && !this.fireSound.isPlaying) {
            try {
                this.fireSound.play();
            } catch (error) {
                console.debug('[CHAINGUN] Fire sound play error:', error.message);
            }
        }
    }

    startShooting() {
        if (this.isMousePressed) return;
        this.isMousePressed = true;
        this.isActivating = true;
        this.activationTimer = 0;
        //this.actions.preparing.playLoop();
        // Não dispara imediatamente, espera o tempo de ativação
        this.shootInterval = setInterval(() => {
            this.activationTimer += this.shootRate;
        
            if (this.activationTimer >= this.activationDelay && this.isMousePressed) {
                this.isActivating = false;
                //this.actions.shooting.playLoop();
                this.shoot();
            }
        }, this.shootRate);
    }

    stopShooting() {
        this.isMousePressed = false;
        this.isActivating = false;
        this.activationTimer = 0;
        clearInterval(this.shootInterval);
        this.shootInterval = null;
    }

    isActivating() {
       return this.isActivating && this.activationTimer < this.activationDelay;
    }

    shoot() {
        if (!this.mesh || !this.camera || !this.scene) return; // Verificação de segurança
        
        // Atualiza timestamp do último disparo
        this.lastShotTime = performance.now();
        
        // Cria geometria e material do projétil
        const projectileGeometry = new THREE.SphereGeometry(CONFIG.WEAPONS.CHAINGUN.PROJECTILE_SIZE);
        const projectileMaterial = new THREE.MeshLambertMaterial({ color: CONFIG.WEAPONS.CHAINGUN.PROJECTILE_COLOR });
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

        // Play fire sound
        this.playFireSound();

        if (CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[GUN] Projectile fired. Active projectiles: ${this.projectiles.length}`);
        }
    }

    playFireSound() {
        if (this.fireSound && this.isAudioInitialized) {
            this.fireSound.play();
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
        if (this.mesh && this.chaingunSprite) {
            this.mesh.visible = !this.mesh.visible;
            this.chaingunSprite.visible = !this.chaingunSprite.visible;
            this.isVisible = this.mesh.visible;
            
            // Atualiza a configuração global
            CONFIG.DEBUG_SHOW_WEAPON = this.mesh.visible;
            
            if (CONFIG.DEBUG_CONSOLE_LOGS) {
                console.log(`[GUN] Arma: ${this.mesh.visible ? 'VISÍVEL' : 'OCULTA'}`);
            }
        }
    }

    setVisibility(visible) {
        if (this.mesh && this.chaingunSprite) {
            this.chaingunSprite.visible = visible;
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
        return this.chaingunSprite;
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
        if (!this.chaingunSprite) return null;
        
        const worldPosition = new THREE.Vector3();
        this.chaingunSprite.getWorldPosition(worldPosition);
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
        if (this.chaingunSprite && this.camera) {
            this.camera.remove(this.chaingunSprite);
        }
        
        this.chaingunSprite = null;
        this.scene = null;
        this.camera = null;
        
        if (CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[GUN] Gun ${this.id} destroyed`);
        }
    }

    createSprite(){
        this.spriteMixer = SpriteMixer();
        let preparing, shooting;
        this.loader = new THREE.TextureLoader();
        this.loader.load('./assets/textures/ChaingunSpriteAtirando.png', (texture) => {
            this.chaingunSprite = this.spriteMixer.ActionSprite(texture, 4, 1);
            //chaingunSprite.add(axesHelperSprite);
            this.chaingunSprite.setFrame(0);
            this.actions.preparing = this.spriteMixer.Action(this.chaingunSprite, 0, 1, 40);
            this.actions.shooting = this.spriteMixer.Action(this.chaingunSprite, 2, 3, 40);
            this.preparing = preparing;
            this.shooting = shooting;

            this.chaingunSprite.visible = false;

            this.chaingunSprite.matrixautoUpdate = true;
            this.chaingunSprite.frustums = false;


            this.chaingunSprite.position.set(CONFIG.GUN_POSITION.x, -0.5, -1.0);
            this.chaingunSprite.scale.set(1.0,1.0,1.0);
            this.camera.add(this.chaingunSprite);
            this.mesh = this.chaingunSprite;
        });
        //return this.loader;
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


