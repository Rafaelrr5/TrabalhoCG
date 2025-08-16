import * as THREE from '../../../build/three.module.js';

let victoryTriggered = false;
let exitWalls = [];
let wallsAnimationState = {
    isAnimating: false,
    animationProgress: 0,
    animationSpeed: 0.8, // Mesma velocidade do area4Access
    originalPositions: [],
    targetPositions: []
};

export function initializeArea4Victory(scene) {
    // Procura pelo grupo das paredes principais (externas) do mapa
    const mainWallsGroup = scene.getObjectByName("MainWalls");
    if (!mainWallsGroup) {
        console.warn('[AREA4_VICTORY] MainWalls group not found');
        return;
    }

    // Coleta apenas as paredes externas do mapa
    exitWalls = [];
    mainWallsGroup.traverse((child) => {
        if (child.isMesh && child.geometry instanceof THREE.PlaneGeometry) {
            exitWalls.push(child);
        }
    });

    // Adiciona também a parede traseira do labirinto (paralela à entrada)
    const area4Group = scene.getObjectByName("Area4");
    if (area4Group) {
        const mazeGroup = area4Group.getObjectByName("Area4Maze");
        if (mazeGroup) {
            // Identifica as paredes traseiras do labirinto (parte norte, oposta à entrada)
            const allMazeWalls = [];
            mazeGroup.traverse((child) => {
                if (child.isMesh && child.geometry instanceof THREE.BoxGeometry) {
                    allMazeWalls.push(child);
                }
            });

            // Encontra o Z máximo para identificar as paredes traseiras do labirinto
            if (allMazeWalls.length > 0) {
                const maxZ = Math.max(...allMazeWalls.map(wall => wall.position.z));
                const threshold = 5; // Tolerância para considerar parede traseira

                // Filtra e adiciona as paredes traseiras do labirinto
                const backWalls = allMazeWalls.filter(wall => 
                    wall.position.z >= maxZ - threshold
                );
                
                backWalls.forEach(wall => exitWalls.push(wall));
            }
        }
    }

    
    wallsAnimationState.originalPositions = [];
    wallsAnimationState.targetPositions = [];
    
    exitWalls.forEach((wall, index) => {
        wall.userData.isExitWall = true;
        wall.userData.exitWallIndex = index;
        
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
    });

    victoryTriggered = false;
    wallsAnimationState.isAnimating = false;
    wallsAnimationState.animationProgress = 0;
}

/**
 * Verifica se a vitória foi alcançada e inicia a sequência de abertura
 */
export function checkArea4Victory(areAllArea4EnemiesDefeated) {
    if (victoryTriggered) return false;

    if (areAllArea4EnemiesDefeated()) {
        console.log('[AREA4_VICTORY] 🎉 All Area 4 enemies defeated! Opening exit...');
        triggerVictory();
        return true;
    }

    return false;
}

/**
 * Inicia a sequência de vitória
 */
function triggerVictory() {
    if (victoryTriggered) return;
    
    victoryTriggered = true;
    wallsAnimationState.isAnimating = true;
    wallsAnimationState.animationProgress = 0;

    // Mostra mensagem simples de vitória
    showVictoryMessage();
    
    // Remove TODAS as paredes da lista de colisão imediatamente
    exitWalls.forEach(wall => {
        if (window.collidableObjects) {
            const index = window.collidableObjects.indexOf(wall);
            if (index !== -1) {
                window.collidableObjects.splice(index, 1);
            }
        }
    });

    console.log(`[AREA4_VICTORY] Victory sequence started! Lowering ${exitWalls.length} walls (external + maze back)`);
}

/**
 * Atualiza a animação de descida das paredes (igual ao area4Access)
 */
export function updateArea4Victory(delta) {
    if (!wallsAnimationState.isAnimating || exitWalls.length === 0) return;

    // Incrementar progresso da animação
    wallsAnimationState.animationProgress += wallsAnimationState.animationSpeed * delta;
    
    const progress = Math.min(wallsAnimationState.animationProgress, 1.0);
    const easeProgress = easeInCubic(progress); // Aceleração para simular queda
    
    // Animar cada parede descendo
    exitWalls.forEach((wall, index) => {
        if (wallsAnimationState.originalPositions[index] && wallsAnimationState.targetPositions[index]) {
            const original = wallsAnimationState.originalPositions[index];
            const target = wallsAnimationState.targetPositions[index];
            
            // Interpolar posição Y (descida)
            wall.position.y = original.y + (target.y - original.y) * easeProgress;
        }
    });

    // Quando a animação termina
    if (progress >= 1.0) {
        wallsAnimationState.isAnimating = false;
        console.log('[AREA4_VICTORY] ✅ All external walls lowered! Map boundaries removed!');
        
        // Mostra mensagem final simples
        setTimeout(() => {
            showFinalVictoryMessage();
        }, 1000);
    }
}

function easeInCubic(t) {
    return t * t * t;
}

function showVictoryMessage() {
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        top: 30%;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 128, 0, 0.9);
        color: white;
        padding: 20px;
        font-size: 20px;
        border-radius: 5px;
        z-index: 10000;
        text-align: center;
    `;
    
    message.textContent = 'Pain Elemental derrotado! As paredes do mapa estão descendo...';
    
    document.body.appendChild(message);
    
    setTimeout(() => {
        if (message.parentNode) {
            message.parentNode.removeChild(message);
        }
    }, 3000);
}

function showFinalVictoryMessage() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 99999;
        font-family: Arial, sans-serif;
    `;
    
    const popup = document.createElement('div');
    popup.style.cssText = `
        background-color: #2a2a2a;
        border: 2px solid #4CAF50;
        border-radius: 10px;
        padding: 30px;
        text-align: center;
        color: white;
        max-width: 400px;
    `;
    
    popup.innerHTML = `
        <h2 style="color: #4CAF50; margin: 0 0 15px 0;">VITÓRIA!</h2>
        <p style="margin: 0 0 20px 0;">Você venceu o jogo! As paredes do mapa foram removidas.</p>
        <button id="victory-continue" style="
            background-color: #4CAF50;
            border: none;
            color: white;
            padding: 10px 20px;
            font-size: 16px;
            border-radius: 5px;
            cursor: pointer;
        ">
            Continuar
        </button>
    `;
    
    const continueButton = popup.querySelector('#victory-continue');
    continueButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
        
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
}

export function resetArea4Victory() {
    victoryTriggered = false;
    wallsAnimationState.isAnimating = false;
    wallsAnimationState.animationProgress = 0;
    
    // Restaura as paredes removidas
    if (exitWalls.length > 0 && wallsAnimationState.originalPositions.length > 0) {
        exitWalls.forEach((wall, index) => {
            if (wallsAnimationState.originalPositions[index]) {
                const original = wallsAnimationState.originalPositions[index];
                wall.position.set(original.x, original.y, original.z);
                wall.visible = true;
            }
        });
    }
    
    // Limpa as listas
    exitWalls = [];
    wallsAnimationState.originalPositions = [];
    wallsAnimationState.targetPositions = [];
    
    console.log('[AREA4_VICTORY] Victory system reset');
}

export function isVictoryTriggered() {
    return victoryTriggered;
}

// Debug functions
if (typeof window !== 'undefined') {
    window.debugArea4Victory = function() {
        console.log('[AREA4_VICTORY] Debug info:', {
            victoryTriggered,
            isAnimating: wallsAnimationState.isAnimating,
            animationProgress: wallsAnimationState.animationProgress,
            totalWallsCount: exitWalls.length
        });
    };
    
    window.forceArea4Victory = function() {
        console.log('[AREA4_VICTORY] Forcing victory...');
        triggerVictory();
    };
    
    window.resetArea4Victory = resetArea4Victory;
}
