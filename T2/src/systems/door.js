import * as THREE from '../../../build/three.module.js';

export let door = null;

export function createDoor(scene, collidableObjects, x, z, doorWidth, doorHeight, doorColor) {
    const doorMaterial = new THREE.MeshLambertMaterial({ color: doorColor });
    const doorGeometry = new THREE.PlaneGeometry(doorWidth, doorHeight);
    door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(x, doorHeight / 2, z);
    scene.add(door);
    collidableObjects.push(door);
    door.castShadow = true; // Ativa sombras na porta
    door.receiveShadow = true; // Ativa recebimento de sombras na porta
}

export function createtoten(scene, collidableObjects, x, z, totemColor) {
    const totenMaterial = new THREE.MeshLambertMaterial({ color: totemColor });
    const totenGeometry = new THREE.CylinderGeometry(0.25,0.25,1.0,32);
    const toten = new THREE.Mesh(totenGeometry, totenMaterial);
    toten.position.set(x, 0.5, z);
    scene.add(toten);
    collidableObjects.push(toten);
    toten.castShadow = true; // Ativa sombras no totem
    toten.receiveShadow = true; // Ativa recebimento de sombras no totem
}