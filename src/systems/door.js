// door.js - versão corrigida
import * as THREE from '../../../build/three.module.js';
import { CONFIG } from '../core/config.js';
import { keyManager } from '../entities/items/key.js';
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

// Estados da animação da chave no totem
let keyAnimationState = {
    isAnimating: false,
    animationProgress: 0,
    animationSpeed: 1.5, // Velocidade da animação da chave
    keyMesh: null, // Referência para a chave CSG existente
    keyObject: null, // Referência para o objeto Key completo
    startPosition: null,
    endPosition: null,
    onComplete: null
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
    if (playerDistance <= 3.5 && hasKey && !doorAnimationState.hasStarted && !keyAnimationState.isAnimating) {
        
        // Busca a chave CSG coletada do tipo correto
        const collectedKey = keyManager.getAllKeys().find(key => 
            key.getType() === keyType && key.isCollectedKey()
        );
        
        if (collectedKey && collectedKey.getMesh()) {
            // Prepara a chave CSG existente para a animação
            prepareKeyForAnimation(collectedKey, keyType, scene);
            
            // Inicia a animação da chave
            startKeyAnimation(() => {
                // Callback executado quando a animação da chave termina
                
                // Toca o som de abertura da porta
                gameAudioManager.playDoorOpeningSound();
                
                // Inicia a animação da porta
                doorAnimationState.isAnimating = true;
                doorAnimationState.hasStarted = true;
                
                // Remove a porta da lista de colisão imediatamente para permitir passagem
                const index = collidableObjects.indexOf(door);
                if (index !== -1) {
                    collidableObjects.splice(index, 1);
                }
            });

            // COMENTADO: Não remove a chave ainda, pois vamos usar ela na animação
            // removeKeyType(keyType);
            
            // Dispara um evento customizado para atualizar o display das chaves
            window.dispatchEvent(new CustomEvent('keyRemoved', { detail: { keyType } }));
        }
    }
}

// Função para preparar a chave CSG existente para a animação
function prepareKeyForAnimation(keyObject, keyType, scene) {
    // Usa a chave CSG existente
    keyAnimationState.keyMesh = keyObject.getMesh();
    keyAnimationState.keyObject = keyObject; // Armazena referência para o objeto completo
    
    // Posição inicial da chave (acima do totem)
    keyAnimationState.startPosition = new THREE.Vector3(
        totem.position.x,
        totem.position.y + 3.0, // Mais alto para ficar bem visível
        totem.position.z
    );
    
    // Posição final da chave (no topo do totem)
    keyAnimationState.endPosition = new THREE.Vector3(
        totem.position.x,
        totem.position.y + 1.2, // Mais alto que o totem para ficar visível
        totem.position.z
    );
    
    // Prepara a chave para a animação
    const result = keyObject.prepareForTotemAnimation(keyAnimationState.startPosition, keyAnimationState.endPosition, scene);
}

// Função para iniciar a animação da chave
function startKeyAnimation(onComplete) {
    keyAnimationState.isAnimating = true;
    keyAnimationState.animationProgress = 0;
    keyAnimationState.onComplete = onComplete;
}

// Função para atualizar a animação da chave
export function updateKeyAnimation(delta, scene) {
    if (!keyAnimationState.isAnimating || !keyAnimationState.keyMesh) return;

    // SE A CHAVE FOI REMOVIDA DA CENA DURANTE A ANIMAÇÃO, ADICIONA DE VOLTA!
    if (!keyAnimationState.keyMesh.parent) {
        scene.add(keyAnimationState.keyMesh);
    }

    // Incrementa o progresso da animação
    keyAnimationState.animationProgress += keyAnimationState.animationSpeed * delta;

    // Clamp o progresso entre 0 e 1
    keyAnimationState.animationProgress = Math.min(keyAnimationState.animationProgress, 1);

    // Aplicar easing suave (ease-in-out)
    const easedProgress = 0.5 - 0.5 * Math.cos(keyAnimationState.animationProgress * Math.PI);

    // Interpola a posição da chave
    keyAnimationState.keyMesh.position.lerpVectors(
        keyAnimationState.startPosition, 
        keyAnimationState.endPosition, 
        easedProgress
    );

    // Adiciona uma leve rotação na chave para dar mais dinamismo
    keyAnimationState.keyMesh.rotation.y = easedProgress * Math.PI * 2;

    // Verifica se a animação terminou
    if (keyAnimationState.animationProgress >= 1) {
        keyAnimationState.isAnimating = false;
        
        // Finaliza a animação da chave, deixando-a encaixada no totem
        if (keyAnimationState.keyObject) {
            keyAnimationState.keyObject.finishTotemAnimation();
        }
        
        // Agora que a animação terminou, podemos remover a chave do inventário
        // mas deixar o mesh visível na cena para representar a chave inserida no totem
        const keyType = keyAnimationState.keyObject ? keyAnimationState.keyObject.getType() : null;
        if (keyType) {
            // Usa o método oficial do KeyManager para remover e notificar mudanças no inventário
            keyManager.useKey(keyType);
        }
        
        // Limpa as referências após um breve delay
        setTimeout(() => {
            keyAnimationState.keyMesh = null;
            keyAnimationState.keyObject = null;
        }, 500);
        
        // Executa o callback
        if (keyAnimationState.onComplete) {
            keyAnimationState.onComplete();
            keyAnimationState.onComplete = null;
        }
    }
}

export function updateDoorAnimation(delta, scene) {
    if (!door || !doorAnimationState.isAnimating) return;

    doorAnimationState.animationProgress += doorAnimationState.animationSpeed * delta;

    // Clamp o progresso entre 0 e 1
    doorAnimationState.animationProgress = Math.min(doorAnimationState.animationProgress, 1);

    // Aplicar easing suave (ease-out)
    const easedProgress = 1 - Math.pow(1 - doorAnimationState.animationProgress, 3);

    // Interpola a posição da porta
    const currentPosition = doorAnimationState.originalPosition.clone();
    const targetPosition = doorAnimationState.originalPosition.clone().add(doorAnimationState.targetOffset);
    
    door.position.lerpVectors(currentPosition, targetPosition, easedProgress);

    door.rotation.x = easedProgress * 0.1;

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

export function resetDoorAnimationState() {
    doorAnimationState = {
        isAnimating: false,
        animationProgress: 0,
        animationSpeed: 2.0,
        originalPosition: null,
        targetOffset: null,
        hasStarted: false
    };
    
    keyAnimationState = {
        isAnimating: false,
        animationProgress: 0,
        animationSpeed: 1.5,
        keyMesh: null,
        keyObject: null,
        startPosition: null,
        endPosition: null,
        onComplete: null
    };
}