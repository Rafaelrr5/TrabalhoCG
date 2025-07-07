import * as THREE from '../../../../build/three.module.js';
import { CONFIG } from '../../core/config.js';
import { CSG } from '../../../../libs/other/CSGMesh.js';
import { gameAudioManager } from '../../systems/index.js';

export class Key {
    constructor(keyType = 'red', position = new THREE.Vector3(0, 0, 0)) {
        this.keyType = keyType;
        this.position = position.clone();
        this.mesh = null;
        this.isCollected = false;
        this.isInTotemAnimation = false;
        this.floatOffset = 0;
        this.originalY = position.y;
        this.id = Key.generateId();
    }

    static generateId() {
        return `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    init(scene) {
        if (!scene) {
            console.error("Scene is required for key initialization");
            return false;
        }
        
        this.createKeyMesh();
        scene.add(this.mesh);
        
        return true;
    }

    createKeyMesh() {
        const keyGroup = new THREE.Group();
        keyGroup.name = `${this.keyType}Key`;
        
        const keyColor = CONFIG.KEYS.COLORS[this.keyType] || CONFIG.KEYS.COLORS.red;
        const keyMaterial = new THREE.MeshPhongMaterial({ 
            color: keyColor, 
            shininess: CONFIG.KEYS.MATERIAL.SHININESS, 
            specular: CONFIG.KEYS.MATERIAL.SPECULAR 
        });

        const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), keyMaterial);
        
        const holeGeom = new THREE.CylinderGeometry(0.25, 0.25, 1.4, 32);
        const holeX = new THREE.Mesh(holeGeom, keyMaterial);
        holeX.rotation.z = Math.PI / 2;
        const holeY = new THREE.Mesh(holeGeom, keyMaterial);
        holeY.rotation.x = Math.PI / 2;
        const holeZ = new THREE.Mesh(holeGeom, keyMaterial);

        [cube, holeX, holeY, holeZ].forEach(mesh => mesh.updateMatrix());

        if (typeof CSG !== 'undefined') {
            let csgBSP = CSG.fromMesh(cube)
                .subtract(CSG.fromMesh(holeX))
                .subtract(CSG.fromMesh(holeY))
                .subtract(CSG.fromMesh(holeZ));
            const finalMesh = CSG.toMesh(csgBSP, new THREE.Matrix4());
            finalMesh.material = keyMaterial;
            keyGroup.add(finalMesh);
        } else {
            keyGroup.add(cube);
        }

        keyGroup.position.copy(this.position);
        keyGroup.userData = {
            keyType: this.keyType,
            keyId: this.id,
            isKey: true
        };

        this.mesh = keyGroup;
        this.originalY = this.position.y;
    }

    update(delta) {
        if (!this.mesh) return;
        
        if (this.isCollected && !this.isInTotemAnimation) return;

        this.mesh.rotation.y += CONFIG.KEYS.ANIMATION.ROTATION_SPEED;

        if (!this.isCollected) {
            this.floatOffset += CONFIG.KEYS.ANIMATION.FLOAT_SPEED * delta;
            const floatY = this.originalY + Math.sin(this.floatOffset) * CONFIG.KEYS.ANIMATION.FLOAT_AMPLITUDE;
            this.mesh.position.y = floatY;
            
            const worldPosition = new THREE.Vector3();
            this.mesh.getWorldPosition(worldPosition);
            this.position.copy(worldPosition);
        }
    }

    checkCollision(playerPosition, collectionDistance = null) {
        if (this.isCollected) return false;

        const distance = this.position.distanceTo(playerPosition);
        const checkDistance = collectionDistance || CONFIG.KEYS.ANIMATION.COLLECTION_DISTANCE;
        
        return distance <= checkDistance;
    }

    collect(totemPosition = null) {
        if (this.isCollected) return false;

        this.isCollected = true;
        
        gameAudioManager.playItemPickupSound();
        this.createCollectionEffect();
        
        if (totemPosition && this.mesh) {
            this.mesh.position.set(
                totemPosition.x,
                totemPosition.y + CONFIG.KEYS.TOTEM.HEIGHT_OFFSET,
                totemPosition.z
            );
            this.mesh.visible = false;
            this.originalY = totemPosition.y + CONFIG.KEYS.TOTEM.HEIGHT_OFFSET;
        } else {
            if (this.mesh) {
                this.mesh.visible = false;
            }
        }

        if (CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[KEY] ${this.keyType} key collected!`);
        }

        return true;
    }

    createCollectionEffect() {
        if (!this.mesh) return;

        const sparkleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const sparkleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 1.0
        });

        for (let i = 0; i < 8; i++) {
            const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial.clone());
            const angle = (i / 8) * Math.PI * 2;
            const radius = 1.5;
            sparkle.position.set(
                this.position.x + Math.cos(angle) * radius,
                this.position.y + Math.random() * 0.5,
                this.position.z + Math.sin(angle) * radius
            );

            this.mesh.parent.add(sparkle);

            const startTime = Date.now();
            const animateSparkle = () => {
                const elapsed = Date.now() - startTime;
                const progress = elapsed / 1000;
                
                if (progress >= 1.0) {
                    sparkle.parent?.remove(sparkle);
                    return;
                }

                sparkle.material.opacity = 1.0 - progress;
                sparkle.position.y += 0.02;
                sparkle.scale.setScalar(1.0 + progress);

                requestAnimationFrame(animateSparkle);
            };

            animateSparkle();
        }
    }

    remove() {
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
        this.mesh = null;
    }

    // Getters
    getType() {
        return this.keyType;
    }

    getId() {
        return this.id;
    }

    getPosition() {
        return this.position.clone();
    }

    getMesh() {
        return this.mesh;
    }

    isCollectedKey() {
        return this.isCollected;
    }

    showKey() {
        if (this.mesh) {
            this.mesh.visible = true;
        }
    }

    prepareForTotemAnimation(startPosition, endPosition, scene) {
        if (!this.mesh) return false;
        
        if (!this.mesh.parent) {
            scene.add(this.mesh);
        }
        
        this.mesh.position.copy(startPosition);
        this.originalY = endPosition.y;
        this.isInTotemAnimation = true;
        
        this.mesh.visible = true;
        this.mesh.scale.set(1, 1, 1);
        
        this.mesh.traverse((child) => {
            if (child.material) {
                child.material.transparent = false;
                child.material.opacity = 1.0;
                child.material.needsUpdate = true;
            }
        });
        
        this.showKey();
        this.floatOffset = 0;
        
        return true;
    }

    finishTotemAnimation() {
        this.isInTotemAnimation = false;
    }

    use() {
        if (!this.isCollected) {
            console.warn(`[KEY] Trying to use a key that hasn't been collected: ${this.keyType}`);
            return false;
        }

        const success = keyManager.useKey(this.keyType);
        
        if (success && CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[KEY] ${this.keyType} key used and removed from inventory!`);
        }

        return success;
    }

    static getCollectedKeyOfType(keyType) {
        const keys = keyManager.getAllKeys();
        return keys.find(key => key.getType() === keyType && key.isCollectedKey());
    }

    static create(keyType, position) {
        if (!CONFIG.KEYS.COLORS[keyType]) {
            console.warn(`Unknown key type: ${keyType}. Using red as default.`);
            keyType = 'red';
        }
        return new Key(keyType, position);
    }

    static createRedKey(position) { return this.create('red', position); }
    static createBlueKey(position) { return this.create('blue', position); }
}

export class KeyManager {
    constructor() {
        this.keys = new Map();
        this.collectedKeys = new Set();
        this.inventoryChangeCallbacks = new Set();
    }

    addKey(key, scene) {
        if (!(key instanceof Key)) {
            console.error('[KEY MANAGER] Invalid key object');
            return false;
        }

        const success = key.init(scene);
        if (success) {
            this.keys.set(key.getId(), key);
            
            if (CONFIG.DEBUG_CONSOLE_LOGS) {
                console.log(`[KEY MANAGER] Added ${key.getType()} key with ID: ${key.getId()}`);
            }
        }

        return success;
    }

    removeKey(keyId) {
        const key = this.keys.get(keyId);
        if (key) {
            key.remove();
            this.keys.delete(keyId);
            return true;
        }
        return false;
    }

    updateKeys(delta) {
        this.keys.forEach(key => {
            key.update(delta);
        });
    }

    checkCollisions(playerPosition, collectionDistance = null, totemPosition = null) {
        const collectedKeys = [];

        this.keys.forEach(key => {
            if (!key.isCollectedKey() && key.checkCollision(playerPosition, collectionDistance)) {
                if (key.collect(totemPosition)) {
                    collectedKeys.push(key);
                    this.collectedKeys.add(key.getType());
                    this.notifyInventoryChange('added', key.getType());
                }
            }
        });

        return collectedKeys;
    }

    hasKey(keyType) {
        return this.collectedKeys.has(keyType);
    }

    getCollectedKeys() {
        return Array.from(this.collectedKeys);
    }

    getAllKeys() {
        return Array.from(this.keys.values());
    }

    getKeyCount() {
        return this.keys.size;
    }

    getCollectedKeyCount() {
        return this.collectedKeys.size;
    }

    clearAll() {
        this.keys.forEach(key => key.remove());
        this.keys.clear();
        this.collectedKeys.clear();
        this.notifyInventoryChange('cleared', null);
    }

    // Use a key (removes from inventory when used at totem)
    useKey(keyType) {
        if (!this.hasKey(keyType)) {
            console.warn(`[KEY MANAGER] Trying to use key that is not in inventory: ${keyType}`);
            return false;
        }

        this.collectedKeys.delete(keyType);
        this.notifyInventoryChange('used', keyType);
        
        if (CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[KEY MANAGER] Used ${keyType} key - removed from inventory`);
        }

        return true;
    }

    getKeyByType(keyType) {
        for (let key of this.keys.values()) {
            if (key.getType() === keyType) {
                return key;
            }
        }
        return null;
    }

    canUseKey(keyType) {
        return this.hasKey(keyType);
    }

    useKeyAndGetInstance(keyType) {
        if (!this.canUseKey(keyType)) {
            return null;
        }

        const keyInstance = this.getKeyByType(keyType);
        const success = this.useKey(keyType);
        
        return success ? keyInstance : null;
    }

    onInventoryChange(callback) {
        if (typeof callback === 'function') {
            this.inventoryChangeCallbacks.add(callback);
        }
    }

    removeInventoryChangeCallback(callback) {
        this.inventoryChangeCallbacks.delete(callback);
    }

    notifyInventoryChange(action, keyType) {
        this.inventoryChangeCallbacks.forEach(callback => {
            try {
                callback({
                    action: action,
                    keyType: keyType,
                    collectedKeys: this.getCollectedKeys(),
                    collectedKeyCount: this.getCollectedKeyCount()
                });
            } catch (error) {
                console.error('[KEY MANAGER] Error in inventory change callback:', error);
            }
        });
    }
}

// Create a global key manager instance
export const keyManager = new KeyManager();
