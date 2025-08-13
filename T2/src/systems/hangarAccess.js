import * as THREE from '../../../build/three.module.js';
import { keyManager } from '../entities/items/key.js';
import { gameAudioManager } from './index.js';

export let hangarTotem = null;
export let hangarDoors = [];

let doorsAnimationState = {
    isAnimating: false,
    animationProgress: 0,
    animationSpeed: 2.0,
    originalPositions: [],
    targetPositions: [],
    hasStarted: false
};

let hangarKeyAnimationState = {
    isAnimating: false,
    animationProgress: 0,
    animationSpeed: 1.5,
    keyMesh: null,
    keyObject: null,
    startPosition: null,
    endPosition: null,
    onComplete: null
};

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t) {
    return t * t * t;
}

export function createHangarTotem(scene, collidableObjects, x, z, totemColor) {
    const totemMaterial = new THREE.MeshLambertMaterial({ color: totemColor });
    const totemGeometry = new THREE.CylinderGeometry(0.25, 0.25, 1.5, 32);
    hangarTotem = new THREE.Mesh(totemGeometry, totemMaterial);
    hangarTotem.position.set(x, 0.75, z);
    hangarTotem.name = "HangarTotem";
    scene.add(hangarTotem);
    collidableObjects.push(hangarTotem);
    hangarTotem.castShadow = true;
    hangarTotem.receiveShadow = true; 
}

export function setHangarDoors(hangarModel) {
    hangarDoors = [];
    doorsAnimationState.originalPositions = [];
    doorsAnimationState.targetPositions = [];
    
    if (hangarModel) {
        hangarModel.traverse((child) => {
            if (child.isMesh && child.userData && child.userData.isDoor) {
                hangarDoors.push(child);
                
                // Posição original
                doorsAnimationState.originalPositions.push({
                    x: child.position.x,
                    y: child.position.y,
                    z: child.position.z
                });
                
                let targetX = child.position.x;
                if (child.userData.isLeftDoor) {
                    targetX = child.position.x - 30;
                } else if (child.userData.isRightDoor) {
                    targetX = child.position.x + 30;
                }
                
                doorsAnimationState.targetPositions.push({
                    x: targetX,
                    y: child.position.y,
                    z: child.position.z
                });
            }
        });
    }
}

export function updateHangarTotem(delta, scene, hitbox, collidableObjects) {
    if (!scene || !hitbox || !hangarTotem || hangarDoors.length === 0) return;

    const playerDistance = new THREE.Vector3(
        hitbox.position.x - hangarTotem.position.x, 
        hitbox.position.y - hangarTotem.position.y,
        hitbox.position.z - hangarTotem.position.z
    ).length();

    const hasRedKey = keyManager.hasKey('red');

    if (playerDistance <= 3.5 && hasRedKey && !doorsAnimationState.hasStarted && !hangarKeyAnimationState.isAnimating) {
        
        const collectedRedKey = keyManager.getAllKeys().find(key => 
            key.getType() === 'red' && key.isCollectedKey()
        );
        
        if (collectedRedKey && collectedRedKey.getMesh()) {
            prepareHangarKeyForAnimation(collectedRedKey, scene);
            
            startHangarKeyAnimation(() => {
                if (gameAudioManager && gameAudioManager.playDoorOpeningSound) {
                    gameAudioManager.playDoorOpeningSound();
                }
                
                doorsAnimationState.isAnimating = true;
                doorsAnimationState.hasStarted = true;
                                
                hangarDoors.forEach(door => {
                    const index = collidableObjects.indexOf(door);
                    if (index !== -1) {
                        collidableObjects.splice(index, 1);
                    }
                });
                
                removeDoorBlockerFromCollisions(collidableObjects);
                
                console.log('[HANGAR ACCESS] ✅ Todas as portas removidas das colisões - passagem liberada!');
            });

            window.dispatchEvent(new CustomEvent('keyRemoved', { detail: { keyType: 'red' } }));
        }
    }
}

function prepareHangarKeyForAnimation(keyObject, scene) {
    const keyMesh = keyObject.getMesh();
    if (!keyMesh) return;
    
    hangarKeyAnimationState.keyMesh = keyMesh;
    hangarKeyAnimationState.keyObject = keyObject;
    
    hangarKeyAnimationState.startPosition = new THREE.Vector3(
        hangarTotem.position.x,
        hangarTotem.position.y + 3.0,
        hangarTotem.position.z
    );
    
    hangarKeyAnimationState.endPosition = new THREE.Vector3(
        hangarTotem.position.x,
        hangarTotem.position.y + 1.2,
        hangarTotem.position.z
    );
    
    const result = keyObject.prepareForTotemAnimation(hangarKeyAnimationState.startPosition, hangarKeyAnimationState.endPosition, scene);
    
}

function startHangarKeyAnimation(onComplete) {
    hangarKeyAnimationState.isAnimating = true;
    hangarKeyAnimationState.animationProgress = 0;
    hangarKeyAnimationState.onComplete = onComplete;
}

export function updateHangarKeyAnimation(delta, scene) {
    if (!hangarKeyAnimationState.isAnimating || !hangarKeyAnimationState.keyMesh) return;

    if (!hangarKeyAnimationState.keyMesh.parent) {
        scene.add(hangarKeyAnimationState.keyMesh);
    }
    
    hangarKeyAnimationState.animationProgress += hangarKeyAnimationState.animationSpeed * delta;

    hangarKeyAnimationState.animationProgress = Math.min(hangarKeyAnimationState.animationProgress, 1);

    const easedProgress = 0.5 - 0.5 * Math.cos(hangarKeyAnimationState.animationProgress * Math.PI);

    hangarKeyAnimationState.keyMesh.position.lerpVectors(
        hangarKeyAnimationState.startPosition, 
        hangarKeyAnimationState.endPosition, 
        easedProgress
    );

    hangarKeyAnimationState.keyMesh.rotation.y = easedProgress * Math.PI * 2;

    if (hangarKeyAnimationState.animationProgress >= 1) {
        hangarKeyAnimationState.isAnimating = false;
        
        if (hangarKeyAnimationState.keyObject) {
            hangarKeyAnimationState.keyObject.finishTotemAnimation();
        }
        
        const keyType = hangarKeyAnimationState.keyObject ? hangarKeyAnimationState.keyObject.getType() : null;
        if (keyType) {
            keyManager.useKey(keyType);
            console.log('[HANGAR ACCESS] ✅ Chave vermelha removida do inventário pelo KeyManager');
        }
        
        setTimeout(() => {
            hangarKeyAnimationState.keyMesh = null;
            hangarKeyAnimationState.keyObject = null;
        }, 500);
        
        if (hangarKeyAnimationState.onComplete) {
            hangarKeyAnimationState.onComplete();
            hangarKeyAnimationState.onComplete = null;
        }
    }
}

export function updateHangarDoorsAnimation(delta, scene, collidableObjects) {
    if (!doorsAnimationState.isAnimating || hangarDoors.length === 0) return;

    doorsAnimationState.animationProgress += doorsAnimationState.animationSpeed * delta;

    doorsAnimationState.animationProgress = Math.min(doorsAnimationState.animationProgress, 1);

    const easedProgress = easeOutCubic(doorsAnimationState.animationProgress);

    hangarDoors.forEach((door, index) => {
        if (doorsAnimationState.originalPositions[index] && doorsAnimationState.targetPositions[index]) {
            const original = doorsAnimationState.originalPositions[index];
            const target = doorsAnimationState.targetPositions[index];
            
            door.position.x = original.x + (target.x - original.x) * easedProgress;
            door.position.y = original.y + (target.y - original.y) * easedProgress;
            door.position.z = original.z + (target.z - original.z) * easedProgress;
        }
    });

    if (doorsAnimationState.animationProgress >= 1) {
        doorsAnimationState.isAnimating = false;
        console.log('[HANGAR ACCESS] ✅ Animação das portas concluída');
    }
}

function removeDoorBlockerFromCollisions(collidableObjects) {
    const blockersToRemove = collidableObjects.filter(obj => 
        obj.userData && obj.userData.isDoorBlocker
    );
    
    blockersToRemove.forEach(blocker => {
        const index = collidableObjects.indexOf(blocker);
        if (index !== -1) {
            collidableObjects.splice(index, 1);
            console.log('[HANGAR ACCESS] ✅ Bloqueador da porta removido das colisões');
        }
    });
}

export function resetHangarAccess() {
    doorsAnimationState.isAnimating = false;
    doorsAnimationState.animationProgress = 0;
    doorsAnimationState.hasStarted = false;
    
    hangarKeyAnimationState.isAnimating = false;
    hangarKeyAnimationState.animationProgress = 0;
    
    if (hangarDoors.length > 0 && doorsAnimationState.originalPositions.length > 0) {
        hangarDoors.forEach((door, index) => {
            if (doorsAnimationState.originalPositions[index]) {
                const original = doorsAnimationState.originalPositions[index];
                door.position.set(original.x, original.y, original.z);
            }
        });
    }
}

export function areHangarDoorsOpen() {
    return doorsAnimationState.hasStarted;
}

export function isPlayerInHangarEntranceZone(camera, hangarModel) {
    if (!hangarModel || !hangarTotem) return false;
    
    const playerPos = camera.position;
    const totemPos = hangarTotem.position;
    
    const entranceWidth = 50;
    const entranceDepth = 50;
    
    const minX = totemPos.x - entranceWidth / 2;
    const maxX = totemPos.x + entranceWidth / 2;
    const minZ = totemPos.z - entranceDepth / 2;
    const maxZ = totemPos.z + entranceDepth / 2;
    
    const inEntranceX = playerPos.x >= minX && playerPos.x <= maxX;
    const inEntranceZ = playerPos.z >= minZ && playerPos.z <= maxZ;
    
    return inEntranceX && inEntranceZ;
}