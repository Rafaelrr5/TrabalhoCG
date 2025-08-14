import { PLAYER_CONFIG } from '../core/config/playerConfig.js';
import { DEBUG_CONFIG } from '../core/config/debugConfig.js';
import { WEAPONS_CONFIG } from '../core/config/weaponsConfig.js';
import { wallColide } from './collision.js';
import { toggleHitboxVisibility, player } from '../entities/player/player.js';
import { enemies } from '../entities/enemies/enemy.js';
import { nextWeapon, previousWeapon, switchWeapon, startShooting, stopShooting} from '../components/weaponManager.js';
import { keyManager } from '../entities/items/key.js';
import { audioManager } from './audio/audioManager.js';
import { calculateSafeMovement } from './collision.js'; // Importa a nova função
import { hitbox } from '../entities/player/player.js'; // Precisamos da referência da hitbox
import * as THREE from '../../../build/three.module.js'; // Precisamos do THREE para o Vector3

// Estados de controle de movimento (quais teclas estão ativas)
export let moveState = { 
    forward: false, 
    backward: false, 
    left: false, 
    right: false,
    sprint: false  // Estado da tecla Shift para corrida
};

let lastWeaponSwitch = 0; // Timestamp do último switch de arma
let isMousePressed = false; // Estado do botão do mouse
let gameScene = null; // Referência para a cena do jogo

// Configura todos os event listeners
export function setupEventListeners(camera, scene,) {
    gameScene = scene; // Armazena referência da cena
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('wheel', (e)=> weaponSwitch(Date.now(), e.deltaY));
    window.addEventListener('resize', onWindowResize);
}

function onMouseDown() {
    if (!isMousePressed) {
        isMousePressed = true;
        startShooting();
    }
}

function onMouseUp() {
    if (isMousePressed) {
        isMousePressed = false;
        stopShooting();
    }
}

// ===== CONTROLES DE MOVIMENTO =====
//atualiza pro estado de movimento correspondente
function onKeyDown(event) {
    switch(event.key.toLowerCase()) {
        case 'w': case 'arrowup': moveState.forward = true; break;
        case 's': case 'arrowdown': moveState.backward = true; break;
        case 'a': case 'arrowleft': moveState.left = true; break;
        case 'd': case 'arrowright': moveState.right = true; break;
        case 'shift': moveState.sprint = true; break; // Tecla Shift para corrida
        case 'q': toggleAudio(); break; // Tecla Q para alternar sons
        case 'g': togglePlayerImmortality(); break;
        case 'c': giveAllKeys(); break; // Dar todas as chaves ao jogador
        case '1': switchWeapon(0); break; // Arma 1
        case '2': switchWeapon(1); break; // Arma 2
    }
}

function onKeyUp(event) {
    switch(event.key.toLowerCase()) {
        case 'w': case 'arrowup': moveState.forward = false; break;
        case 's': case 'arrowdown': moveState.backward = false; break;
        case 'a': case 'arrowleft': moveState.left = false; break;
        case 'd': case 'arrowright': moveState.right = false; break;
        case 'shift': moveState.sprint = false; break; // Tecla Shift para corrida
    }
}

function weaponSwitch(timestamp, deltaY) {
    if (timestamp - lastWeaponSwitch < WEAPONS_CONFIG.WEAPON_SWITCH_COOLDOWN) return;
    
    const direction = deltaY < 0 ? 1 : -1;
    lastWeaponSwitch = timestamp;

    if (direction > 0)
        nextWeapon();
    else
        previousWeapon();
}


// Atualiza posição do jogador baseado na entrada do usuário
export function updateCameraMovement(delta, controls, collidableObjects) {
    if (!controls || !hitbox) {
        return;
    }

    const speed = (PLAYER_CONFIG.MOVE_SPEED * delta) * (moveState.sprint ? PLAYER_CONFIG.SPRINT_MULTIPLIER : 1);

    // 1. Pega os vetores de direção da câmera (no plano XZ)
    const forward = new THREE.Vector3();
    controls.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    // --- LINHA CORRIGIDA ---
    // A ordem correta para obter o vetor "direita" é (frente X cima)
    const right = new THREE.Vector3();
    right.crossVectors(forward, controls.camera.up); 
    // A linha anterior estava: right.crossVectors(controls.camera.up, forward); que resultava no vetor "esquerda".

    // 2. Calcula a direção final baseada nas teclas pressionadas
    const direction = new THREE.Vector3();
    if (moveState.forward) {
        direction.add(forward);
    }
    if (moveState.backward) {
        direction.sub(forward);
    }
    if (moveState.left) {
        direction.sub(right); // Agora subtrai o vetor "direita" real, movendo para a esquerda
    }
    if (moveState.right) {
        direction.add(right); // Agora adiciona o vetor "direita" real, movendo para a direita
    }
    
    if (direction.lengthSq() === 0) {
        return;
    }

    direction.normalize();

    // 3. Calcula o vetor de movimento total desejado
    const totalMovementVector = direction.multiplyScalar(speed);

    // 4. Usa o Sweep Test para obter o vetor de movimento seguro
    const safeMovementVector = calculateSafeMovement(totalMovementVector, collidableObjects);

    // 5. Aplica o movimento seguro diretamente na posição do objeto de controle
    controls.getObject().position.add(safeMovementVector);
}

// Lida com redimensionamento da janela
function onWindowResize() {
    // Esta função será chamada pelo main.js que tem acesso ao renderer
    // O main.js deve implementar sua própria versão
}

// ============================================================================
// FUNÇÕES DE DEBUG PARA CÂMERA
// ============================================================================

// Mostra informações de debug da câmera no console
export function debugCameraInfo(camera, controls) {
    if (!DEBUG_CONFIG.DEBUG_CONSOLE_LOGS) return;
    
    // Debug logs removidos para limpeza do console
}

// Debug contínuo da câmera (chama a cada X segundos)
let lastCameraDebugTime = 0;
export function continuousCameraDebug(camera, controls, delta, interval = 3.0) {
    if (!DEBUG_CONFIG.DEBUG_SHOW_CAMERA) return;
    
    lastCameraDebugTime += delta;
    if (lastCameraDebugTime >= interval) {
        debugCameraInfo(camera, controls);
        lastCameraDebugTime = 0;
    }
}

// Função para alternar imortalidade do jogador
function togglePlayerImmortality() {
    PLAYER_CONFIG.PLAYER_IMMORTAL = !PLAYER_CONFIG.PLAYER_IMMORTAL;
    
    // Atualiza a exibição de vida na interface
    const healthDisplay = document.getElementById('player-health');
    const immortalityIndicator = document.getElementById('immortality-indicator');
    
    if (PLAYER_CONFIG.PLAYER_IMMORTAL) {
        // Esconde display de vida e mostra indicador de imortalidade
        if (healthDisplay) healthDisplay.style.display = 'none';
        if (immortalityIndicator) immortalityIndicator.style.display = 'block';
        console.log('[IMMORTALITY] Player immortality ENABLED');
    } else {
        // Mostra display de vida e esconde indicador de imortalidade
        if (healthDisplay) {
            healthDisplay.style.display = 'block';
            // Atualiza o display com a vida atual do jogador
            if (typeof player !== 'undefined' && player.getHealthStatus) {
                const healthStatus = player.getHealthStatus();
                healthDisplay.textContent = `Health: ${healthStatus.current}/${healthStatus.max}`;
            }
        }
        if (immortalityIndicator) immortalityIndicator.style.display = 'none';
        console.log('[IMMORTALITY] Player immortality DISABLED');
    }
    
    // Mostra notificação visual temporária
    showImmortilityNotification(PLAYER_CONFIG.PLAYER_IMMORTAL);
}

// Função para mostrar notificação visual de mudança de imortalidade
function showImmortilityNotification(isImmortal) {
    // Remove notificação existente se houver
    const existingNotification = document.getElementById('immortality-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Cria nova notificação
    const notification = document.createElement('div');
    notification.id = 'immortality-notification';
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: ${isImmortal ? '#4CAF50' : '#f44336'};
        color: white;
        padding: 15px 30px;
        border-radius: 10px;
        font-size: 18px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        transition: opacity 0.3s ease;
    `;
    notification.textContent = isImmortal ? 'IMORTALIDADE ON' : 'IMORTALIDADE OFF';
    
    document.body.appendChild(notification);
    
    // Remove a notificação após 2 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 200);
}

function giveAllKeys() {
    const addedCount = keyManager.addAllKeysToInventory(gameScene);
    
    console.log(`[CHEAT] Player received all keys (${addedCount} keys added)`);
    
    showKeysCheatNotification(addedCount);
}

function showKeysCheatNotification(keyCount) {
    const existingNotification = document.getElementById('keys-cheat-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.id = 'keys-cheat-notification';
    notification.style.cssText = `
        position: fixed;
        top: 40%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: #FFD700;
        color: #333;
        padding: 15px 30px;
        border-radius: 10px;
        font-size: 18px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        transition: opacity 0.3s ease;
        border: 2px solid #FFA500;
    `;
    notification.textContent = keyCount > 0 ? `RECEBEU ${keyCount} CHAVES! 🔑` : 'TODAS AS CHAVES JÁ POSSUÍDAS! 🔑';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function toggleAudio() {
    const isEnabled = audioManager.toggleAudio();
    console.log(`[CONTROLS] Áudio ${isEnabled ? 'ativado' : 'desativado'} via tecla Q`);
}
