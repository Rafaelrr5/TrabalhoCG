// area4Access.js - Sistema específico para acesso à área 4
// Sistema replicado da área 2 para manter consistência no comportamento das chaves
// Usa chave azul (obtida na área 3) para abaixar os muros da área 4
import * as THREE from '../../../build/three.module.js';
import { keyManager } from '../entities/items/key.js';
import { gameAudioManager } from './index.js';

export let area4Totem = null;
export let area4Walls = null;

// Estado da animação dos muros da área 4
let wallsAnimationState = {
    isAnimating: false,
    animationProgress: 0,
    animationSpeed: 0.8, // Velocidade mais lenta para efeito dramático
    originalPositions: [], // Posições originais dos muros
    targetPositions: [], // Posições finais (abaixados)
    hasStarted: false
};

// Estado da animação da chave no totem da área 4
let area4KeyAnimationState = {
    isAnimating: false,
    animationProgress: 0,
    animationSpeed: 1.5,
    keyMesh: null,
    keyObject: null,
    startPosition: null,
    endPosition: null,
    onComplete: null
};

export function createArea4Totem(scene, collidableObjects, x, z, totemColor) {
    const totemMaterial = new THREE.MeshLambertMaterial({ color: totemColor });
    const totemGeometry = new THREE.CylinderGeometry(0.25, 0.25, 1.5, 32);
    area4Totem = new THREE.Mesh(totemGeometry, totemMaterial);
    area4Totem.position.set(x, 0.75, z);
    area4Totem.name = "Area4Totem";
    scene.add(area4Totem);
    collidableObjects.push(area4Totem);
    area4Totem.castShadow = true;
    area4Totem.receiveShadow = true;
}

export function setArea4Walls(wallsGroup) {
    area4Walls = wallsGroup;
    
    // Armazenar posições originais dos muros
    wallsAnimationState.originalPositions = [];
    wallsAnimationState.targetPositions = [];
    
    if (area4Walls && area4Walls.children) {
        area4Walls.children.forEach((wall, index) => {
            if (wall.isMesh) {
                // Posição original
                wallsAnimationState.originalPositions.push({
                    x: wall.position.x,
                    y: wall.position.y,
                    z: wall.position.z
                });
                
                // Posição final (abaixado no chão)
                wallsAnimationState.targetPositions.push({
                    x: wall.position.x,
                    y: -30,
                    z: wall.position.z
                });
            }
        });
    }
    
    console.log('[AREA4ACCESS] ✅ Muros da área 4 configurados para animação:', wallsAnimationState.originalPositions.length, 'muros');
}

export function updateArea4Totem(delta, scene, hitbox, collidableObjects) {
    if (!scene || !hitbox || !area4Totem || !area4Walls) return;

    const playerDistance = new THREE.Vector3(
        hitbox.position.x - area4Totem.position.x, 
        hitbox.position.y - area4Totem.position.y,
        hitbox.position.z - area4Totem.position.z
    ).length();

    const hasBlueKey = keyManager.hasKey('blue');

    // Se não começou a animação e o jogador tem a chave azul e está próximo
    if (playerDistance <= 3.5 && hasBlueKey && !wallsAnimationState.hasStarted && !area4KeyAnimationState.isAnimating) {
        
        // Busca a chave azul coletada
        const collectedBlueKey = keyManager.getAllKeys().find(key => 
            key.getType() === 'blue' && key.isCollectedKey()
        );
        
        if (collectedBlueKey && collectedBlueKey.getMesh()) {
            // Prepara a chave azul para a animação
            prepareArea4KeyForAnimation(collectedBlueKey, scene);
            
            // Inicia a animação da chave
            startArea4KeyAnimation(() => {
                // Callback executado quando a animação da chave termina
                
                // Toca o som de abertura (pode ser o mesmo da porta)
                if (gameAudioManager && gameAudioManager.playDoorOpeningSound) {
                    gameAudioManager.playDoorOpeningSound();
                }
                
                // Inicia a animação dos muros descendo
                wallsAnimationState.isAnimating = true;
                wallsAnimationState.hasStarted = true;
                                
                // Remove os muros da lista de colisão imediatamente para permitir passagem
                if (area4Walls && area4Walls.children) {
                    area4Walls.children.forEach(wall => {
                        if (wall.isMesh) {
                            const index = collidableObjects.indexOf(wall);
                            if (index !== -1) {
                                collidableObjects.splice(index, 1);
                            }
                        }
                    });
                    console.log('[AREA4ACCESS] ✅ Todos os muros removidos das colisões - passagem liberada!');
                }
            });

            // Dispara um evento customizado para atualizar o display das chaves (igual à área 2)
            window.dispatchEvent(new CustomEvent('keyRemoved', { detail: { keyType: 'blue' } }));
        }
    }
}

function prepareArea4KeyForAnimation(keyObject, scene) {
    const keyMesh = keyObject.getMesh();
    if (!keyMesh) return;
    
    // Configurar estado da animação
    area4KeyAnimationState.keyMesh = keyMesh;
    area4KeyAnimationState.keyObject = keyObject;
    area4KeyAnimationState.startPosition = keyMesh.position.clone();
    area4KeyAnimationState.endPosition = area4Totem.position.clone();
    area4KeyAnimationState.endPosition.y += 1.0; // Um pouco acima do totem
    
    console.log('[AREA4ACCESS] Chave azul preparada para animação do totem');
}

function startArea4KeyAnimation(onComplete) {
    area4KeyAnimationState.isAnimating = true;
    area4KeyAnimationState.animationProgress = 0;
    area4KeyAnimationState.onComplete = onComplete;
    
    console.log('[AREA4ACCESS] Animação da chave azul iniciada');
}

export function updateArea4KeyAnimation(delta, scene) {
    if (!area4KeyAnimationState.isAnimating || !area4KeyAnimationState.keyMesh) return;
    
    // Incrementar progresso da animação
    area4KeyAnimationState.animationProgress += area4KeyAnimationState.animationSpeed * delta;
    
    // Clamp o progresso entre 0 e 1
    area4KeyAnimationState.animationProgress = Math.min(area4KeyAnimationState.animationProgress, 1.0);
    
    // Aplicar easing suave (ease-in-out) igual à área 2
    const easedProgress = 0.5 - 0.5 * Math.cos(area4KeyAnimationState.animationProgress * Math.PI);
    
    // Interpolar posição usando lerpVectors (igual à área 2)
    area4KeyAnimationState.keyMesh.position.lerpVectors(
        area4KeyAnimationState.startPosition,
        area4KeyAnimationState.endPosition,
        easedProgress
    );
    
    // Adicionar rotação na chave para dinamismo (igual à área 2)
    area4KeyAnimationState.keyMesh.rotation.y = easedProgress * Math.PI * 2;
    
    // Verificar se a animação terminou
    if (area4KeyAnimationState.animationProgress >= 1.0) {
        // Finalizar animação da chave
        area4KeyAnimationState.isAnimating = false;
        
        // Finaliza a animação da chave, deixando-a encaixada no totem (igual à área 2)
        if (area4KeyAnimationState.keyObject) {
            area4KeyAnimationState.keyObject.finishTotemAnimation();
        }
        
        // Agora que a animação terminou, remove a chave do inventário usando o método oficial
        // (igual à área 2 - usa keyManager.useKey())
        if (area4KeyAnimationState.keyObject) {
            const keyType = area4KeyAnimationState.keyObject.getType();
            if (keyType) {
                // Usa o método oficial do KeyManager para remover e notificar mudanças no inventário
                keyManager.useKey(keyType);
                console.log('[AREA4ACCESS] ✅ Chave azul removida do inventário pelo KeyManager');
            }
        }
        
        // Limpa as referências após um breve delay (igual à área 2)
        setTimeout(() => {
            area4KeyAnimationState.keyMesh = null;
            area4KeyAnimationState.keyObject = null;
        }, 500);
        
        // Executar callback
        if (area4KeyAnimationState.onComplete) {
            area4KeyAnimationState.onComplete();
            area4KeyAnimationState.onComplete = null;
        }
        
        console.log('[AREA4ACCESS] ✅ Chave azul totalmente processada - sistema igual à área 2');
    }
}

export function updateArea4WallsAnimation(delta, scene) {
    if (!wallsAnimationState.isAnimating || !area4Walls) return;
    
    // Incrementar progresso da animação
    wallsAnimationState.animationProgress += wallsAnimationState.animationSpeed * delta;
    
    const progress = Math.min(wallsAnimationState.animationProgress, 1.0);
    const easeProgress = easeInCubic(progress); // Aceleração para simular queda
    
    // Animar cada muro descendo
    if (area4Walls.children && wallsAnimationState.originalPositions.length > 0) {
        area4Walls.children.forEach((wall, index) => {
            if (wall.isMesh && wallsAnimationState.originalPositions[index] && wallsAnimationState.targetPositions[index]) {
                const original = wallsAnimationState.originalPositions[index];
                const target = wallsAnimationState.targetPositions[index];
                
                // Interpolar posição Y (descida)
                wall.position.y = original.y + (target.y - original.y) * easeProgress;
            }
        });
    }
    
    // Verificar se a animação terminou
    if (progress >= 1.0) {
        wallsAnimationState.isAnimating = false;
    }
}

// Função de easing para animação suave
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t) {
    return t * t * t;
}

// Função para resetar o sistema (útil para testes)
export function resetArea4Access() {
    wallsAnimationState.isAnimating = false;
    wallsAnimationState.animationProgress = 0;
    wallsAnimationState.hasStarted = false;
    
    area4KeyAnimationState.isAnimating = false;
    area4KeyAnimationState.animationProgress = 0;
    
    // Restaurar posições originais dos muros se necessário
    if (area4Walls && wallsAnimationState.originalPositions.length > 0) {
        area4Walls.children.forEach((wall, index) => {
            if (wall.isMesh && wallsAnimationState.originalPositions[index]) {
                const original = wallsAnimationState.originalPositions[index];
                wall.position.set(original.x, original.y, original.z);
            }
        });
    }
    
    console.log('[AREA4ACCESS] Sistema da área 4 resetado');
}
