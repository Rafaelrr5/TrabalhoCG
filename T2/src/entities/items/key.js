import * as THREE from '../../../../build/three.module.js';
import { CONFIG } from '../../core/config.js';
import { CSG } from '../../../../libs/other/CSGMesh.js';

export class Key {
    constructor(keyType = 'red', position = new THREE.Vector3(0, 0, 0)) {
        this.keyType = keyType;
        this.position = position.clone();
        this.mesh = null;
        this.isCollected = false;
        this.rotationSpeed = 0.02;
        this.floatAmplitude = 0.3;
        this.floatSpeed = 2.0;
        this.floatOffset = 0;
        this.originalY = position.y;
        this.collectionDistance = 2.0; // Distance to trigger collection
        
        // Key properties
        this.colors = {
            red: 0xff0000,
            blue: 0x0000ff,
            green: 0x00ff00,
            yellow: 0xffff00,
            gold: 0xffd700
        };
        
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
        
        const keyColor = this.colors[this.keyType] || this.colors.red;
        const keyMaterial = new THREE.MeshPhongMaterial({ 
            color: keyColor, 
            shininess: 50, 
            specular: 0x444444 
        });

        // Create key using CSG operations
        // Base cube
        const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), keyMaterial);
        
        // Cylindrical holes
        const holeGeom = new THREE.CylinderGeometry(0.25, 0.25, 1.4, 32);
        const holeX = new THREE.Mesh(holeGeom, keyMaterial);
        holeX.rotation.z = Math.PI / 2;
        const holeY = new THREE.Mesh(holeGeom, keyMaterial);
        holeY.rotation.x = Math.PI / 2;
        const holeZ = new THREE.Mesh(holeGeom, keyMaterial);

        // Update matrices for CSG operations
        [cube, holeX, holeY, holeZ].forEach(mesh => mesh.updateMatrix());

        // Perform CSG operations if CSG library is available
        if (typeof CSG !== 'undefined') {
            let csgBSP = CSG.fromMesh(cube)
                .subtract(CSG.fromMesh(holeX))
                .subtract(CSG.fromMesh(holeY))
                .subtract(CSG.fromMesh(holeZ));
            const finalMesh = CSG.toMesh(csgBSP, new THREE.Matrix4());
            finalMesh.material = keyMaterial;
            keyGroup.add(finalMesh);
        } else {
            // Fallback: simple key shape without holes
            keyGroup.add(cube);
        }

        // Position the key
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
        if (!this.mesh || this.isCollected) return;

        // Rotate the key
        this.mesh.rotation.y += this.rotationSpeed;

        // Float animation (apenas local)
        this.floatOffset += this.floatSpeed * delta;
        const floatY = this.originalY + Math.sin(this.floatOffset) * this.floatAmplitude;
        this.mesh.position.y = floatY;
        
        // Update position reference usando posição global no mundo
        const worldPosition = new THREE.Vector3();
        this.mesh.getWorldPosition(worldPosition);
        this.position.copy(worldPosition);
    }

    checkCollision(playerPosition, collectionDistance = null) {
        if (this.isCollected) return false;

        const distance = this.position.distanceTo(playerPosition);
        const checkDistance = collectionDistance || this.collectionDistance;
        
        return distance <= checkDistance;
    }

    collect() {
        if (this.isCollected) return false;

        this.isCollected = true;
        
        // Create collection effect
        this.createCollectionEffect();
        
        // Hide the key
        if (this.mesh) {
            this.mesh.visible = false;
        }

        if (CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[KEY] ${this.keyType} key collected!`);
        }

        return true;
    }

    createCollectionEffect() {
        if (!this.mesh) return;

        // Create a simple sparkle effect
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

            // Animate sparkles
            const startTime = Date.now();
            const animateSparkle = () => {
                const elapsed = Date.now() - startTime;
                const progress = elapsed / 1000; // 1 second animation
                
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

    // Static methods for key management
    static createRedKey(position) {
        return new Key('red', position);
    }

    static createBlueKey(position) {
        return new Key('blue', position);
    }

    static createGreenKey(position) {
        return new Key('green', position);
    }

    static createYellowKey(position) {
        return new Key('yellow', position);
    }

    static createGoldKey(position) {
        return new Key('gold', position);
    }
}

// Key Manager class to handle multiple keys
export class KeyManager {
    constructor() {
        this.keys = new Map();
        this.collectedKeys = new Set();
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

    checkCollisions(playerPosition, collectionDistance = null) {
        const collectedKeys = [];

        this.keys.forEach(key => {
            if (!key.isCollectedKey() && key.checkCollision(playerPosition, collectionDistance)) {
                if (key.collect()) {
                    collectedKeys.push(key);
                    this.collectedKeys.add(key.getType());
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

    // Clear all keys (useful for level resets)
    clearAll() {
        this.keys.forEach(key => key.remove());
        this.keys.clear();
        this.collectedKeys.clear();
    }
}

// Create a global key manager instance
export const keyManager = new KeyManager();

// Backward compatibility functions
export function createKey(keyType, position, scene) {
    const key = new Key(keyType, position);
    return keyManager.addKey(key, scene) ? key : null;
}

export function updateKeys(delta) {
    keyManager.updateKeys(delta);
}

export function checkKeyCollections(playerPosition, collectionDistance = null) {
    return keyManager.checkCollisions(playerPosition, collectionDistance);
}

export function hasCollectedKey(keyType) {
    return keyManager.hasKey(keyType);
}

export function getCollectedKeys() {
    return keyManager.getCollectedKeys();
}
