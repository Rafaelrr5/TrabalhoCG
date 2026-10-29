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
    document.addEventListener('wheel', (e) => { if (document.pointerLockElement) weaponSwitch(Date.now(), e.deltaY); });
    // Releasing the pointer (Esc) must not leave keys or the trigger stuck
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement) return;
        Object.keys(moveState).forEach(k => { moveState[k] = false; });
        onMouseUp();
    });
    window.addEventListener('resize', onWindowResize);
}

function onMouseDown(event) {
    // Only shoot while playing (pointer locked), never when clicking menus
    if (!document.pointerLockElement || event.button !== 0) return;
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
    if (!document.pointerLockElement) return; // ignore keys while paused or in menus
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

const toast = (text) => window.dispatchEvent(new CustomEvent('game:toast', { detail: text }));

// Função para alternar imortalidade do jogador
function togglePlayerImmortality() {
    PLAYER_CONFIG.PLAYER_IMMORTAL = !PLAYER_CONFIG.PLAYER_IMMORTAL;
    window.dispatchEvent(new CustomEvent('game:god'));
    toast(PLAYER_CONFIG.PLAYER_IMMORTAL ? 'Modo deus ativado' : 'Modo deus desativado');
}

function giveAllKeys() {
    const addedCount = keyManager.addAllKeysToInventory(gameScene);
    toast(addedCount > 0 ? `+${addedCount} chaves` : 'Você já tem todas as chaves');
}

function toggleAudio() {
    const isEnabled = audioManager.toggleAudio();
    toast(isEnabled ? 'Som ligado' : 'Som desligado');
}
