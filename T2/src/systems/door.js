// door.js - versão corrigida
import * as THREE from '../../../build/three.module.js';
import { CONFIG } from '../core/config.js';
import { keyManager, removeKeyType } from '../entities/items/key.js';
import { gameAudioManager } from './index.js';

export let door = null;
export let totem = null;

// Estados da animação da porta
let doorAnimationState = {
    isAnimating: false,
    animationProgress: 0,
    animationSpeed: 2.0, // Velocidade da animação
    originalPosition: null,
    targetOffset: null, // Offset para onde a porta vai se mover
    hasStarted: false
};

export function createDoor(scene, collidableObjects, x, z, doorWidth, doorHeight, doorColor) {
    const doorMaterial = new THREE.MeshLambertMaterial({ color: doorColor });
    const doorGeometry = new THREE.PlaneGeometry(doorWidth, doorHeight);
    door = new THREE.Mesh(doorGeometry, doorMaterial);

    door.userData = {
        isObstacle: true,
        isDoor: true
    };

    door.position.set(x, doorHeight / 2, z);
    
    // Armazena a posição original para animação
    doorAnimationState.originalPosition = door.position.clone();
    doorAnimationState.targetOffset = new THREE.Vector3(0, -doorHeight, 0); // Porta desce para baixo
    
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

    // Se não começou a animação e o jogador tem a chave e está próximo
    if (playerDistance <= 3.5 && hasKey && !doorAnimationState.hasStarted) {
      
        // Toca o som de abertura da porta
        gameAudioManager.playDoorOpeningSound();
        
        // Inicia a animação
        doorAnimationState.isAnimating = true;
        doorAnimationState.hasStarted = true;
        
        // Remove a porta da lista de colisão imediatamente para permitir passagem
        const index = collidableObjects.indexOf(door);
        if (index !== -1) {
            collidableObjects.splice(index, 1);
        }

        // Remove a chave do inventário e atualiza o display
        removeKeyType(keyType);
        
        // Dispara um evento customizado para atualizar o display das chaves
        window.dispatchEvent(new CustomEvent('keyRemoved', { detail: { keyType } }));
    }
}

// Função para atualizar a animação da porta
export function updateDoorAnimation(delta, scene) {
    if (!door || !doorAnimationState.isAnimating) return;

    // Incrementa o progresso da animação
    doorAnimationState.animationProgress += doorAnimationState.animationSpeed * delta;

    // Clamp o progresso entre 0 e 1
    doorAnimationState.animationProgress = Math.min(doorAnimationState.animationProgress, 1);

    // Aplicar easing suave (ease-out)
    const easedProgress = 1 - Math.pow(1 - doorAnimationState.animationProgress, 3);

    // Interpola a posição da porta
    const currentPosition = doorAnimationState.originalPosition.clone();
    const targetPosition = doorAnimationState.originalPosition.clone().add(doorAnimationState.targetOffset);
    
    door.position.lerpVectors(currentPosition, targetPosition, easedProgress);

    // Opcional: adiciona uma leve rotação no eixo X para simular descida em trilho
    door.rotation.x = easedProgress * 0.1; // Rotação muito sutil no eixo X

    // Efeito de transparência gradual
    if (door.material) {
        door.material.transparent = true;
        door.material.opacity = Math.max(0.1, 1 - (easedProgress * 0.9)); // Fica quase transparente no final
    }

    // Verifica se a animação terminou
    if (doorAnimationState.animationProgress >= 1) {
        doorAnimationState.isAnimating = false;
        
        setTimeout(() => {
            if (door && scene) {
                scene.remove(door);
                door.geometry.dispose();
                door.material.dispose();
                door = null;
            }
        }, 1000); 
    }
}

// Função para resetar o estado da animação (útil para múltiplas portas)
export function resetDoorAnimationState() {
    doorAnimationState = {
        isAnimating: false,
        animationProgress: 0,
        animationSpeed: 0.5,
        originalPosition: null,
        targetOffset: null,
        hasStarted: false
    };
}