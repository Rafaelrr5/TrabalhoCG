// door.js - versão corrigida
import * as THREE from '../../../build/three.module.js';
import { CONFIG } from '../core/config.js';
import { keyManager, removeKeyType } from '../entities/items/key.js';

export let door = null;
export let totem = null;

export function createDoor(scene, collidableObjects, x, z, doorWidth, doorHeight, doorColor) {
    const doorMaterial = new THREE.MeshLambertMaterial({ color: doorColor });
    const doorGeometry = new THREE.PlaneGeometry(doorWidth, doorHeight);
    door = new THREE.Mesh(doorGeometry, doorMaterial);

    door.userData = {
        isObstacle: true,
        isDoor: true
    };

    door.position.set(x, doorHeight / 2, z);
    scene.add(door);
    collidableObjects.push(door);
    door.castShadow = true;
    door.receiveShadow = true;
}

export function createtotem(scene, collidableObjects, x, z, totemColor) {
    const totemMaterial = new THREE.MeshLambertMaterial({ color: totemColor });
    const totemGeometry = new THREE.CylinderGeometry(0.25, 0.25, 1.5, 32);
    totem = new THREE.Mesh(totemGeometry, totemMaterial);
    totem.position.set(x, 0.75, z);
    scene.add(totem);
    collidableObjects.push(totem);
    totem.castShadow = true;
    totem.receiveShadow = true;
}

export function updateTotem(delta, scene, hitbox, keyType, collidableObjects) {
    if (!scene || !hitbox || !totem || !door) return;

    const playerDistance = new THREE.Vector3(
        hitbox.position.x - totem.position.x, 
        hitbox.position.y - totem.position.y,
        hitbox.position.z - totem.position.z
    ).length();

    const hasKey = keyManager.hasKey(keyType);

    if (playerDistance <= 3.5 && hasKey) {        
        // Remove a porta
        scene.remove(door);
        door.geometry.dispose();
        door.material.dispose();
        
        // Remove da lista de colisão
        const index = collidableObjects.indexOf(door);
        if (index !== -1) {
            collidableObjects.splice(index, 1);
        }
        door = null;

        // Remove a chave do inventário e atualiza o display
        removeKeyType(keyType);
        
        // Dispara um evento customizado para atualizar o display das chaves
        window.dispatchEvent(new CustomEvent('keyRemoved', { detail: { keyType } }));
        
        console.log("Porta aberta e chave removida!");
    }
}