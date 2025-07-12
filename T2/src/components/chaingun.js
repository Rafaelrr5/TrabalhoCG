import * as THREE from '../../../build/three.module.js';
import { CONFIG } from '../core/config.js';
import { BaseWeapon } from './baseWeapon.js';
import { SpriteMixer } from '../utils/spriteMixer.js';

export class Chaingun extends BaseWeapon {
    constructor(camera) {
        super(camera, CONFIG.WEAPONS.CHAINGUN);
        
        if (CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log('[CHAINGUN] Constructor called');
        }
        
        // Chaingun specific properties
        this.activationDelay = CONFIG.WEAPONS.CHAINGUN.ACTIVATION_DELAY;
        this.activationTimer = 0;
        this.isActivating = false;
        this.actions = {};
        this.chaingunSprite = null;
        this.spriteMixer = null;
        this.loader = null;
        this.isLoaded = false;
        this.pendingVisibility = null;

        //flag de animação
        //this.preparingIslooping = false;
        //this.shootingIslooping = false;
        this.isShootingAnimationActive = false;
        this.onLoop = "none";
        
        // Audio system
        this.fireSound = null;
        this.audioLoader = new THREE.AudioLoader();
        this.isAudioInitialized = false;
        
        if (CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[CHAINGUN] Constructor finished, ID: ${this.id}`);
        }
    }

    // Sobrescreve o método abstrato da BaseWeapon
    createWeaponMesh() {
        this.createSprite();
    }

    update(delta) {
        // Atualiza as animações do sprite
        if (this.spriteMixer) {
            this.spriteMixer.update(delta);
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
            this.fireSound.setVolume(0.3);
            this.isAudioInitialized = true;
        }, undefined, (error) => {
            console.warn('[CHAINGUN] Failed to load chaingun fire sound:', error);
        });
    }

    // Sobrescreve os hooks da BaseWeapon para lógica específica da Chaingun
    onStartShooting() {
    this.isActivating = true;
    this.activationTimer = 0;
    
    // Inicia animação de preparação apenas se não estiver ativa
    //if (this.onLoop != 'preparing') {
    //    this.actions.preparing.playLoop();
    //    this.onLoop = 'preparing';
    //}
}

    onStopShooting() {
    this.isActivating = false;
    this.activationTimer = 0;
    this.isShootingAnimationActive = false; // Reseta o estado

    // Para todas as animações
    //if (this.onLoop === 'preparing') {
    //    this.actions.preparing.stop();
    //    this.onLoop = 'none';
    //}
    if (this.onLoop === "shooting") {
        this.actions.shooting.stop();
        this.onLoop = "none";
    }
    if (this.chaingunSprite) {
        this.chaingunSprite.setFrame(0);
    }
}


    // Sobrescreve o método startShooting para implementar delay de ativação
    // Sobrescreve o método startShooting para implementar delay de ativação
startShooting() {
    if (this.isMousePressed) return; // Já está disparando, não faz nada

    this.isMousePressed = true;
    this.onStartShooting();

    this.shootInterval = setInterval(() => {
        this.activationTimer += this.shootRate;

        // Transição para 'shooting' após o delay
        if (this.activationTimer >= this.activationDelay && this.isMousePressed) {
            this.isActivating = false;

            // Verifica se a animação de shooting já está rodando
            

            if (this.onLoop === "shooting") {
                this.shoot();
                return;
            }
                        
            // Para qualquer animação anterior e inicia 'shooting' em loop
            if (this.onLoop !== "shooting") {
                // Para a animação atual se houver uma
                ///if (this.actions[this.onLoop]) {
                //    this.actions[this.onLoop].stop();
                //}
                
                this.actions.shooting.playLoop(); // Mantém em loop
                this.onLoop = "shooting";
            }

            this.shoot();
        }
    }, this.shootRate);
}

// Modifique também o onStopShooting para manter consistência
onStopShooting() {
    this.isActivating = false;
    this.activationTimer = 0;
    this.isShootingAnimationActive = false;

    // Para a animação de shooting se estiver ativa
    if (this.onLoop === 'shooting') {
        this.actions.shooting.stop();
        this.onLoop = 'none';
    }
    
    // Reseta para o frame inicial
    if (this.chaingunSprite) {
        this.chaingunSprite.setFrame(0);
    }
}
    // Sobrescreve onShoot para adicionar som
    onShoot() {
        this.playFireSound();
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

    isActivatingWeapon() {
       return this.isActivating && this.activationTimer < this.activationDelay;
    }

    // Sobrescreve getMesh para retornar o sprite
    getMesh() {
        return this.chaingunSprite;
    }

    // Sobrescreve setVisibility para lidar com carregamento assíncrono
    setVisibility(visible) {
        this.isVisible = visible;
        
        if (this.isLoaded && this.chaingunSprite) {
            this.chaingunSprite.visible = visible;
            if (CONFIG.DEBUG_CONSOLE_LOGS) {
                console.log(`[CHAINGUN] Weapon visibility set to: ${visible ? 'VISIBLE' : 'HIDDEN'}`);
            }
        } else {
            // Salva para aplicar quando carregar
            this.pendingVisibility = visible;
            if (CONFIG.DEBUG_CONSOLE_LOGS) {
                console.log(`[CHAINGUN] Weapon visibility pending: ${visible ? 'VISIBLE' : 'HIDDEN'}`);
            }
        }
    }

    // Sobrescreve o init para inicializar o áudio também
    init(scene) {
        const result = super.init(scene);
        if (result) {
            this.initAudio();
        }
        return result;
    }

    createSprite() {
        try {
            this.spriteMixer = SpriteMixer();
            this.loader = new THREE.TextureLoader();
            
            // Lista de possíveis caminhos para a textura
            const possiblePaths = [
                'assets/textures/chaingun.png',
                './assets/textures/chaingun.png',
                '/T2/assets/textures/chaingun.png',
                '../assets/textures/chaingun.png'
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
                        
                        this.chaingunSprite = this.spriteMixer.ActionSprite(texture, 3, 1);
                        this.chaingunSprite.setFrame(0);
                        
                        // Ajustar o recorte vertical da textura
                        if (this.chaingunSprite.material && this.chaingunSprite.material.map) {
                            const tex = this.chaingunSprite.material.map;
                            tex.repeat.y = 0.99;
                            tex.needsUpdate = true;
                        }
                        
                        // Configurar propriedades do material do sprite
                        if (this.chaingunSprite.material) {
                            this.chaingunSprite.material.transparent = true;
                            this.chaingunSprite.material.alphaTest = 0.1;
                            this.chaingunSprite.material.side = THREE.DoubleSide;
                        }
                        
                        // Cria as ações de animação
                        //this.actions.preparing = this.spriteMixer.Action(this.chaingunSprite, 0, 1, 20);
                        this.actions.shooting = this.spriteMixer.Action(this.chaingunSprite, 1, 2, 40);

                        //this.chaingunSprite.matrixAutoUpdate = true;
                        //this.chaingunSprite.frustumCulled = false;

                        // Posiciona o sprite relativo à câmera
                        this.chaingunSprite.position.set(CONFIG.GUN_POSITION.x, CONFIG.GUN_POSITION.y , CONFIG.GUN_POSITION.z -1.0);
                        
                        // Ajustar a geometria do sprite
                        if (this.chaingunSprite.geometry) {
                            this.chaingunSprite.scale.set(1, 0.8, 0.9);
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
                        
                        if (CONFIG.DEBUG_CONSOLE_LOGS) {
                            console.log(`[Chaingun] Sprite carregado! Visibilidade: ${finalVisibility ? 'VISÍVEL' : 'OCULTA'}`);
                        }
                    },
                    (progress) => {
                        if (CONFIG.DEBUG_CONSOLE_LOGS && progress.total > 0) {
                            console.log(`[Chaingun] Carregando sprite: ${Math.round((progress.loaded / progress.total) * 100)}%`);
                        }
                    },
                    (error) => {
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
        this.chaingunSprite.position.set(CONFIG.GUN_POSITION.x, CONFIG.GUN_POSITION.y - 0.2, CONFIG.GUN_POSITION.z - 0.4);
        
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

// Backward compatibility exports (mantendo a mesma interface)
export let gun = null;

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
    if (gun && gun.setVisibility) {
        gun.setVisibility(true);
    }
}

export function updateWeapon(delta) {
    if (gun && gun.update) {
        gun.update(delta);
    }
}

export function getProjectiles() {
    return gun ? gun.projectiles : [];
}

export function getGun() {
    return gun;
}
