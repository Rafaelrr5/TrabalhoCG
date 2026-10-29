import * as THREE from '../../../build/three.module.js';
import { WEAPONS_CONFIG } from '../core/config/weaponsConfig.js';
import { DEBUG_CONFIG } from '../core/config/debugConfig.js';
import { BaseWeapon } from './baseWeapon.js';
import { SpriteMixer } from '../utils/spriteMixer.js';

export class Chaingun extends BaseWeapon {
    constructor(camera) {
        super(camera, WEAPONS_CONFIG.WEAPONS.CHAINGUN);
        
        if (DEBUG_CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log('[CHAINGUN] Constructor called');
        }
        
        // Chaingun specific properties
        this.activationDelay = WEAPONS_CONFIG.WEAPONS.CHAINGUN.ACTIVATION_DELAY;
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
        //this.isShootingAnimationActive = false;
        this.onLoop = false;
        
        // Audio system
        this.fireSound = null;
        this.audioLoader = new THREE.AudioLoader();
        this.isAudioInitialized = false;
        
    }

    // Sobrescreve o método abstrato da BaseWeapon
    createWeaponMesh() {
        this.createSprite();
    }

    update(delta) {
        if (!this.isLoaded || !this.chaingunSprite?.setFrame) return;
        const ms = delta * 1000;

        // 0..1 barrel speed: ~0.45 s to spin up, ~0.7 s to wind down
        this.spin = Math.min(1, Math.max(0, (this.spin || 0) + (this.isMousePressed ? delta / 0.45 : -delta / 0.7)));
        const firing = this.isMousePressed && this.spin >= 1;

        if (firing) {
            this.fireAcc = (this.fireAcc || 0) + ms;
            while (this.fireAcc >= this.shootRate) { this.fireAcc -= this.shootRate; this.shoot(); }
        } else {
            this.fireAcc = this.shootRate; // first shot leaves as soon as the barrel is up to speed
        }

        // Frames 0/1 are the barrel turning, 2/3 add the muzzle flash
        if (this.spin <= 0) { this.chaingunSprite.setFrame(0); this.frameAcc = 0; return; }
        const period = 220 - 180 * this.spin; // ms per frame: 220 at rest -> 40 at full speed
        this.frameAcc = (this.frameAcc || 0) + ms;
        if (this.frameAcc < period) return;
        this.frameAcc %= period;
        this.frameStep = ((this.frameStep || 0) + 1) % 4;
        const frames = firing ? [0, 2, 1, 3] : [0, 1, 0, 1];
        this.chaingunSprite.setFrame(frames[this.frameStep]);
    }
    
    initAudio() {
        // Check if audio listener is available
        if (!window.listener) {
            console.warn('[CHAINGUN] Audio listener not available, skipping sound initialization');
            return;
        }
        
        this.fireSound = new THREE.Audio(window.listener);
        
        const possibleAudioPaths = [
            'assets/sounds/weapon/chaingun_fire.wav',
            'assets/sounds/weapon/chaingun_fire.wav',
            'assets/sounds/weapon/chaingun_fire.wav'
        ];
        
        const tryLoadAudio = (pathIndex = 0) => {
            if (pathIndex >= possibleAudioPaths.length) {
                console.warn('[CHAINGUN] All audio paths failed, chaingun will be silent');
                return;
            }
            
            const currentPath = possibleAudioPaths[pathIndex];
            this.audioLoader.load(currentPath, (buffer) => {
                this.fireSound.setBuffer(buffer);
                this.fireSound.setVolume(0.3);
                this.isAudioInitialized = true;
                if (DEBUG_CONFIG.DEBUG_CONSOLE_LOGS) {
                    console.log(`[CHAINGUN] Audio loaded from: ${currentPath}`);
                }
            }, undefined, (error) => {
                tryLoadAudio(pathIndex + 1);
            });
        };
        
        tryLoadAudio();
    }

    // Trigger handling is frame-driven (see update): the barrel spins up slowly, only fires
    // once it is at full speed, and winds down after release, like the Doom chaingun.
    startShooting() {
        if (!this.isLoaded) return;
        this.isMousePressed = true;
    }

    stopShooting() {
        this.isMousePressed = false;
    }

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

    getMesh() {
        return this.chaingunSprite;
    }

    setVisibility(visible) {
        this.isVisible = visible;
        
        if (this.isLoaded && this.chaingunSprite) {
            this.chaingunSprite.visible = visible;
            if (DEBUG_CONFIG.DEBUG_CONSOLE_LOGS) {
                console.log(`[CHAINGUN] Weapon visibility set to: ${visible ? 'VISIBLE' : 'HIDDEN'}`);
            }
        } else {
            // Salva para aplicar quando carregar
            this.pendingVisibility = visible;
            if (DEBUG_CONFIG.DEBUG_CONSOLE_LOGS) {
                console.log(`[CHAINGUN] Weapon visibility pending: ${visible ? 'VISIBLE' : 'HIDDEN'}`);
            }
        }
    }

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
            
            const possiblePaths = [
                'assets/sprites/ChaingunSpriteAtirando.png',
                'assets/sprites/ChaingunSpriteAtirando.png',
                'assets/sprites/ChaingunSpriteAtirando.png'
            ];
            
            const tryLoadTexture = (pathIndex = 0) => {
                if (pathIndex >= possiblePaths.length) {
                    console.error('[Chaingun] Todos os caminhos falharam, usando fallback');
                    this.createFallbackMesh();
                    return;
                }
                
                const currentPath = possiblePaths[pathIndex];
                
                this.loader.load(currentPath, 
                    (texture) => {
                        if (DEBUG_CONFIG.DEBUG_CONSOLE_LOGS) {
                            console.log(`[Chaingun] Sucesso ao carregar: ${currentPath}`);
                        }
                        
                        texture.colorSpace = THREE.SRGBColorSpace;
                        this.chaingunSprite = this.spriteMixer.ActionSprite(texture, 4, 1);
                        this.chaingunSprite.setFrame(0);
                        
                        if (this.chaingunSprite.material && this.chaingunSprite.material.map) {
                            const tex = this.chaingunSprite.material.map;
                            tex.repeat.y = 0.99;
                            tex.needsUpdate = true;
                        }
                        
                        if (this.chaingunSprite.material) {
                            this.chaingunSprite.material.transparent = true;
                            this.chaingunSprite.material.alphaTest = 0.1;
                            this.chaingunSprite.material.side = THREE.DoubleSide;
                        }
                        
                        this.actions.shooting = this.spriteMixer.Action(this.chaingunSprite, 1, 2, 40);
                        this.chaingunSprite.position.set(WEAPONS_CONFIG.GUN_POSITION.x, WEAPONS_CONFIG.GUN_POSITION.y , WEAPONS_CONFIG.GUN_POSITION.z -1.0);
                        
                        if (this.chaingunSprite.geometry) {
                            this.chaingunSprite.scale.set(1, 0.8, 0.9);
                        }
                        this.camera.add(this.chaingunSprite);
                        this.mesh = this.chaingunSprite;
                        
                        this.isLoaded = true;
                        
                        const finalVisibility = this.pendingVisibility !== null ? this.pendingVisibility : this.isVisible;
                        this.chaingunSprite.visible = finalVisibility;
                        this.isVisible = finalVisibility;
                        
                        if (DEBUG_CONFIG.DEBUG_CONSOLE_LOGS) {
                            console.log(`[Chaingun] Sprite carregado! Visibilidade: ${finalVisibility ? 'VISÍVEL' : 'OCULTA'}`);
                        }
                    },
                    (progress) => {
                        if (DEBUG_CONFIG.DEBUG_CONSOLE_LOGS && progress.total > 0) {
                            console.log(`[Chaingun] Carregando sprite: ${Math.round((progress.loaded / progress.total) * 100)}%`);
                        }
                    },
                    (error) => {
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
        const gunGeometry = new THREE.CylinderGeometry(WEAPONS_CONFIG.GUN_RADIUS, WEAPONS_CONFIG.GUN_RADIUS, WEAPONS_CONFIG.GUN_LENGTH);
        const gunMaterial = new THREE.MeshLambertMaterial({color:'darkgrey'});
        this.chaingunSprite = new THREE.Mesh(gunGeometry, gunMaterial);
        
        this.chaingunSprite.rotation.x = Math.PI / 2;
        this.chaingunSprite.position.set(WEAPONS_CONFIG.GUN_POSITION.x, WEAPONS_CONFIG.GUN_POSITION.y - 0.2, WEAPONS_CONFIG.GUN_POSITION.z - 0.4);
        
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
    if (gun && gun.isReady()) {
        gun.startShooting();
    } else if (gun && !gun.isReady()) {
        console.warn('[CHAINGUN] Cannot start shooting - weapon not ready yet');
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
