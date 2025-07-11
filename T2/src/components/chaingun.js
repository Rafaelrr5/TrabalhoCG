import * as THREE from '../../../build/three.module.js';
import { setDefaultMaterial } from '../../../libs/util/util.js';
import { CONFIG } from '../core/config.js';
import { enemies } from '../entities/enemies/enemy.js';
import { getCacodemons } from '../entities/enemies/enemy.js';
import { SpriteMixer } from '../utils/spriteMixer.js';

export class Chaingun {
    constructor(camera) {
        if (CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log('[CHAINGUN] Constructor called');
        }
        
        this.camera = camera;
        this.mesh = null;
        this.projectiles = [];
        this.shootInterval = null;
        this.lastShotTime = 0;
        this.isMousePressed = false;
        this.raycaster = new THREE.Raycaster();
        this.raycaster.camera = camera; // Necessário para raycast com sprites
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
        this.isLoaded = false; // Flag para indicar se o sprite foi carregado
        this.pendingVisibility = null; // Visibilidade pendente para quando carregar
        
        // Gun properties
        this.isVisible = CONFIG.DEBUG_SHOW_WEAPON;
        this.damage = CONFIG.WEAPONS.CHAINGUN.DAMAGE;
        this.shootRate = CONFIG.WEAPONS.CHAINGUN.SHOOT_RATE;
        this.projectileSpeed = CONFIG.WEAPONS.CHAINGUN.PROJECTILE_SPEED;
        this.projectileLifetime = CONFIG.WEAPONS.CHAINGUN.PROJECTILE_LIFETIME;

        this.id = Chaingun.generateId();
        
        if (CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[CHAINGUN] Constructor finished, ID: ${this.id}`);
        }
        
        // Audio system
        this.fireSound = null;
        this.audioLoader = new THREE.AudioLoader();
        this.isAudioInitialized = false;
    }

    static generateId() {
        return `chaingun_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    init(scene) {
        if (CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[CHAINGUN] Init called for ${this.id}`);
        }
        
        if (!scene) {
            console.error("Scene is required for gun initialization");
            return false;
        }
        
        this.scene = scene;
        this.createSprite();
        this.initAudio();
        
        if (CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[CHAINGUN] Init completed for ${this.id}`);
        }
        
        return true;
    }

    update(delta) {
        // Atualiza as animações do sprite
        if (this.spriteMixer) {
            this.spriteMixer.update(delta);
        }
    }

    // update method moved earlier in the class
    
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
        if (this.isMousePressed || this.shootInterval) {
            if (CONFIG.DEBUG_CONSOLE_LOGS) {
                console.log('[CHAINGUN] startShooting() called but already shooting or interval exists');
            }
            return;
        }
        
        if (CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log('[CHAINGUN] Starting shooting');
        }
        
        this.isMousePressed = true;
        this.isActivating = true;
        this.activationTimer = 0;
        
        // Inicia animação de preparação se o sprite estiver carregado
        if (this.actions.preparing) {
            this.actions.preparing.playLoop();
        }
        
        // Não dispara imediatamente, espera o tempo de ativação
        this.shootInterval = setInterval(() => {
            this.activationTimer += this.shootRate;
        
            if (this.activationTimer >= this.activationDelay && this.isMousePressed) {
                this.isActivating = false;
                
                // Troca para animação de tiro
                if (this.actions.preparing) {
                    this.actions.preparing.stop();
                }
                if (this.actions.shooting) {
                    this.actions.shooting.playLoop();
                }
                
                this.shoot();
            }
        }, this.shootRate);
    }

    stopShooting() {
        this.isMousePressed = false;
        this.isActivating = false;
        this.activationTimer = 0;
        
        // Limpa o interval se existir
        if (this.shootInterval) {
            clearInterval(this.shootInterval);
            this.shootInterval = null;
            
            if (CONFIG.DEBUG_CONSOLE_LOGS) {
                console.log('[CHAINGUN] Shooting stopped, interval cleared');
            }
        }
        
        // Para todas as animações e volta ao frame inicial
        if (this.actions.preparing) {
            this.actions.preparing.stop();
        }
        if (this.actions.shooting) {
            this.actions.shooting.stop();
        }
        if (this.chaingunSprite) {
            this.chaingunSprite.setFrame(0);
        }
    }

    isActivating() {
       return this.isActivating && this.activationTimer < this.activationDelay;
    }

    shoot() {
        if (!this.chaingunSprite || !this.camera || !this.scene) return; // Verificação de segurança
        
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
        this.chaingunSprite.getWorldPosition(gunWorldPosition);
        
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
    }

    playFireSound() {
        if (this.fireSound && this.isAudioInitialized) {
            try {
                // Para o som anterior se ainda estiver tocando
                if (this.fireSound.isPlaying) {
                    this.fireSound.stop();
                }
                this.fireSound.play();
            } catch (error) {
                console.debug('[CHAINGUN] Fire sound play error:', error.message);
            }
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

            // Filtra as colisões - exclui sprites e objetos relacionados à arma
            const validIntersects = intersects.filter(intersect => {
                const obj = intersect.object;
                // Exclui o sprite da chaingun
                if (obj === this.chaingunSprite) return false;
                // Exclui o projétil atual
                if (obj === projectile) return false;
                // Exclui objetos filhos do sprite da chaingun
                if (obj.parent === this.chaingunSprite) return false;
                // Exclui outros sprites que podem estar na cena
                if (obj.type === 'Sprite') return false;
                
                return true;
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
        this.isVisible = !this.isVisible;
        
        if (this.isLoaded && this.chaingunSprite) {
            this.chaingunSprite.visible = this.isVisible;
            
            // Atualiza a configuração global
            CONFIG.DEBUG_SHOW_WEAPON = this.isVisible;
            
            if (CONFIG.DEBUG_CONSOLE_LOGS) {
                console.log(`[Chaingun] Arma: ${this.isVisible ? 'VISÍVEL' : 'OCULTA'}`);
            }
        } else {
            this.pendingVisibility = this.isVisible;
            if (CONFIG.DEBUG_CONSOLE_LOGS) {
                console.log(`[Chaingun] Toggle pendente, será aplicado quando carregar`);
            }
        }
    }

    setVisibility(visible) {
        this.isVisible = visible;
        
        if (this.isLoaded && this.chaingunSprite) {
            this.chaingunSprite.visible = visible;
            if (CONFIG.DEBUG_CONSOLE_LOGS) {
                console.log(`[Chaingun] Arma definida como: ${visible ? 'VISÍVEL' : 'OCULTA'} - Aplicado imediatamente`);
            }
        } else {
            // Armazena a visibilidade para aplicar quando o sprite carregar
            this.pendingVisibility = visible;
            if (CONFIG.DEBUG_CONSOLE_LOGS) {
                console.log(`[Chaingun] Sprite não carregado, visibilidade pendente: ${visible ? 'VISÍVEL' : 'OCULTA'}`);
            }
        }
    }

    forceVisible() {
        if (this.chaingunSprite) {
            this.chaingunSprite.visible = true;
            this.isVisible = true;
            console.log('[CHAINGUN] Forçando visibilidade do sprite');
            console.log('[CHAINGUN] Sprite position:', this.chaingunSprite.position);
            console.log('[CHAINGUN] Sprite scale:', this.chaingunSprite.scale);
            console.log('[CHAINGUN] Sprite visible:', this.chaingunSprite.visible);
            console.log('[CHAINGUN] Camera position:', this.camera.position);
            console.log('[CHAINGUN] Camera rotation:', this.camera.rotation);
        }
    }

    debugInfo() {
        if (!CONFIG.DEBUG_CONSOLE_LOGS) return;
        
        console.log('=== DEBUG CHAINGUN ===');
        console.log(`ID: ${this.id}`);
        console.log(`Sprite carregado: ${this.isLoaded}`);
        console.log(`Sprite existe: ${!!this.chaingunSprite}`);
        console.log(`isVisible: ${this.isVisible}`);
        console.log(`Sprite visible: ${this.chaingunSprite?.visible}`);
        console.log(`Visibilidade pendente: ${this.pendingVisibility}`);
        console.log(`Posição da arma: (${this.chaingunSprite?.position.x.toFixed(2)}, ${this.chaingunSprite?.position.y.toFixed(2)}, ${this.chaingunSprite?.position.z.toFixed(2)})`);
        console.log(`Rotação da arma: (${this.chaingunSprite?.rotation.x.toFixed(2)}, ${this.chaingunSprite?.rotation.y.toFixed(2)}, ${this.chaingunSprite?.rotation.z.toFixed(2)})`);
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
        
        // Remove sprite
        if (this.chaingunSprite && this.camera) {
            this.camera.remove(this.chaingunSprite);
        }
        
        this.chaingunSprite = null;
        this.mesh = null;
        this.scene = null;
        this.camera = null;
        
        if (CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[Chaingun] Chaingun ${this.id} destroyed`);
        }
    }

    createSprite(){
        try {
            this.spriteMixer = SpriteMixer();
            this.loader = new THREE.TextureLoader();
            
            // Lista de possíveis caminhos para a textura
            const possiblePaths = [
                'assets/textures/ChaingunSpriteAtirando.png',
                './assets/textures/ChaingunSpriteAtirando.png',
                '/T2/assets/textures/ChaingunSpriteAtirando.png',
                '../assets/textures/ChaingunSpriteAtirando.png'
            ];
            
            const tryLoadTexture = (pathIndex = 0) => {
                if (pathIndex >= possiblePaths.length) {
                    console.error('[Chaingun] Todos os caminhos falharam, usando fallback');
                    this.createFallbackMesh();
                    return;
                }
                
                const currentPath = possiblePaths[pathIndex];
                if (CONFIG.DEBUG_CONSOLE_LOGS) {
                    console.log(`[Chaingun] Tentando carregar: ${currentPath}`);
                }
                
                this.loader.load(currentPath, 
                    (texture) => {
                        // Callback de sucesso
                        if (CONFIG.DEBUG_CONSOLE_LOGS) {
                            console.log(`[Chaingun] Sucesso ao carregar: ${currentPath}`);
                        }
                        
                        this.chaingunSprite = this.spriteMixer.ActionSprite(texture, 4, 1);
                        this.chaingunSprite.setFrame(0);
                        
                        // Ajustar o recorte vertical da textura para remover áreas vazias
                        if (this.chaingunSprite.material && this.chaingunSprite.material.map) {
                            const tex = this.chaingunSprite.material.map;
                            // Limita a área vertical da textura
                            tex.repeat.y = 0.99;  // Tira 1% pra nao mostrar a linha da imagem acima da sprite
                            tex.needsUpdate = true;
                        }
                        
                        // Configurar propriedades do material do sprite
                        if (this.chaingunSprite.material) {
                            this.chaingunSprite.material.transparent = true;
                            this.chaingunSprite.material.alphaTest = 0.1;
                            this.chaingunSprite.material.side = THREE.DoubleSide;
                        }
                        
                        // Cria as ações de animação
                        this.actions.preparing = this.spriteMixer.Action(this.chaingunSprite, 0, 1, 40);
                        this.actions.shooting = this.spriteMixer.Action(this.chaingunSprite, 2, 3, 40);

                        this.chaingunSprite.matrixAutoUpdate = true;
                        this.chaingunSprite.frustumCulled = false;

                        // Posiciona o sprite relativo à câmera - ajustado para ser mais visível
                        this.chaingunSprite.position.set(CONFIG.GUN_POSITION.x + 0.3, CONFIG.GUN_POSITION.y + 0.2, CONFIG.GUN_POSITION.z - 0.5);
                        
                        // Ajustar a geometria do sprite para uma proporção melhor
                        if (this.chaingunSprite.geometry) {
                            // Reduz a altura da geometria para cortar as partes vazias
                            this.chaingunSprite.scale.set(0.5, 0.3, 0.5); // Escala Y menor para cortar vertical
                        }

                        // Anexa o sprite na câmera
                        this.camera.add(this.chaingunSprite);
                        this.mesh = this.chaingunSprite;
                        
                        // Marca como carregado
                        this.isLoaded = true;
                        
                        // Aplica visibilidade pendente ou padrão
                        const finalVisibility = this.pendingVisibility !== null ? this.pendingVisibility : this.isVisible;
                        this.chaingunSprite.visible = finalVisibility;
                        this.isVisible = finalVisibility;
                        
                        // Verifica se o sprite está realmente visível
                        setTimeout(() => {
                            if (this.chaingunSprite && this.chaingunSprite.visible !== finalVisibility) {
                                this.chaingunSprite.visible = finalVisibility;
                                console.log(`[Chaingun] Corrigindo visibilidade do sprite para: ${finalVisibility}`);
                            }
                            
                            // Debug adicional após carregamento
                            if (CONFIG.DEBUG_CONSOLE_LOGS) {
                                console.log(`[Chaingun] Verificação pós-carregamento:`);
                                console.log(`[Chaingun] - Sprite visible: ${this.chaingunSprite?.visible}`);
                                console.log(`[Chaingun] - Sprite position: (${this.chaingunSprite?.position.x}, ${this.chaingunSprite?.position.y}, ${this.chaingunSprite?.position.z})`);
                                console.log(`[Chaingun] - Na camera: ${this.camera.children.includes(this.chaingunSprite)}`);
                            }
                        }, 50);
                        
                        if (CONFIG.DEBUG_CONSOLE_LOGS) {
                            console.log(`[Chaingun] Sprite carregado! Visibilidade aplicada: ${finalVisibility ? 'VISÍVEL' : 'OCULTA'}`);
                            console.log(`[Chaingun] Sprite adicionado à câmera, position:`, this.chaingunSprite.position);
                            console.log(`[Chaingun] Sprite scale:`, this.chaingunSprite.scale);
                            console.log(`[Chaingun] Sprite material:`, this.chaingunSprite.material);
                            console.log(`[Chaingun] Sprite parent:`, this.chaingunSprite.parent?.type);
                            console.log(`[Chaingun] Camera children count:`, this.camera.children.length);
                        }
                    },
                    (progress) => {
                        // Callback de progresso
                        if (CONFIG.DEBUG_CONSOLE_LOGS && progress.total > 0) {
                            console.log(`[Chaingun] Carregando sprite: ${Math.round((progress.loaded / progress.total) * 100)}%`);
                        }
                    },
                    (error) => {
                        // Callback de erro - tenta próximo caminho
                        console.warn(`[Chaingun] Falha ao carregar: ${currentPath}`, error);
                        tryLoadTexture(pathIndex + 1);
                    }
                );
            };
            
            tryLoadTexture();
            
        } catch (error) {
            console.error('[Chaingun] Error creating sprite:', error);
            this.createFallbackMesh();
        }
    }

    createFallbackMesh() {
        // Cria um modelo 3D simples como fallback
        const gunGeometry = new THREE.CylinderGeometry(CONFIG.GUN_RADIUS, CONFIG.GUN_RADIUS, CONFIG.GUN_LENGTH);
        const gunMaterial = new THREE.MeshLambertMaterial({color:'darkgrey'});
        this.chaingunSprite = new THREE.Mesh(gunGeometry, gunMaterial);
        
        this.chaingunSprite.rotation.x = Math.PI / 2;
        this.chaingunSprite.position.set(CONFIG.GUN_POSITION.x + 0.3, CONFIG.GUN_POSITION.y + 0.2, CONFIG.GUN_POSITION.z - 0.5);
        
        this.camera.add(this.chaingunSprite);
        this.mesh = this.chaingunSprite;
        
        // Marca como carregado e aplica visibilidade
        this.isLoaded = true;
        const finalVisibility = this.pendingVisibility !== null ? this.pendingVisibility : this.isVisible;
        this.chaingunSprite.visible = finalVisibility;
        this.isVisible = finalVisibility;
        
        console.warn('[Chaingun] Using fallback 3D mesh instead of sprite');
    }

    isReady() {
        return this.isLoaded;
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

export function forceWeaponVisible() {
    if (gun) {
        gun.forceVisible();
    }
}

export function updateWeapon(delta) {
    if (gun) {
        gun.update(delta);
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


