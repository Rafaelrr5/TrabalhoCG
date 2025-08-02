import { CONFIG } from '../core/config.js';
import { wallColide } from './collision.js';
import { toggleHitboxVisibility, player } from '../entities/player/player.js';
import { enemies } from '../entities/enemies/enemy.js';
import { nextWeapon, previousWeapon, switchWeapon, startShooting, stopShooting} from '../components/weaponManager.js';

// Estados de controle de movimento (quais teclas estão ativas)
export let moveState = { 
    forward: false, 
    backward: false, 
    left: false, 
    right: false 
};

let lastWeaponSwitch = 0; // Timestamp do último switch de arma
let isMousePressed = false; // Estado do botão do mouse

// Configura todos os event listeners
export function setupEventListeners(camera, scene,) {
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
        case 'g': togglePlayerImmortality(); break;
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
    }
}

function weaponSwitch(timestamp, deltaY) {
    if (timestamp - lastWeaponSwitch < CONFIG.WEAPON_SWITCH_COOLDOWN) return;
    
    const direction = deltaY < 0 ? 1 : -1;
    lastWeaponSwitch = timestamp;

    if (direction > 0)
        nextWeapon();
    else
        previousWeapon();
}


// Atualiza posição do jogador baseado na entrada do usuário
export function updateCameraMovement(delta, controls) {
    // Guard against undefined controls
    if (!controls || !controls.moveRight || !controls.moveForward) {
        return;
    }
    
    const distance = CONFIG.MOVE_SPEED * delta;
    
    // Calcula os vetores de movimento
    let moveX = 0;
    let moveZ = 0;
    
    if (moveState.forward) moveZ += distance;
    if (moveState.backward) moveZ -= distance;
    if (moveState.left) moveX -= distance;
    if (moveState.right) moveX += distance;
    
    // Normaliza movimento diagonal (mantém velocidade constante nas diagonais)
    if (moveX !== 0 && moveZ !== 0) {
        const factor = Math.sqrt(0.5);
        moveX *= factor;
        moveZ *= factor;
    }
    
    // --- Suavização adaptativa para ângulos próximos a 90º ---
    if (wallColide.x || wallColide.z) {
        // Calcula o ângulo do movimento (em radianos)
        const angle = Math.atan2(moveZ, moveX);
        const angleDeg = Math.abs(angle * (180 / Math.PI));
        
        // Fator de suavização baseado no ângulo:
        // - Quanto mais próximo de 0º ou 90º, mais suavização é aplicada.
        // - Para diagonais (45º), mantém a suavização padrão.
        let smoothingFactor = CONFIG.COLLISION_SMOOTHING;
        
        // Ajusta o fator para movimentos laterais (ângulos próximos a 0º ou 90º)
        const angleThreshold = CONFIG.COLLISION_ANGLE_THRESHOLD; // Margem para considerar "próximo a 90º"
        if (angleDeg <= angleThreshold || angleDeg >= 90 - angleThreshold) {
            smoothingFactor *= 2; // Dobra a suavização para movimentos retos
        }
        
        // Aplica suavização apenas no eixo colidido
        if (wallColide.x) moveX *= smoothingFactor;
        if (wallColide.z) moveZ *= smoothingFactor;
    }
    
    // Aplica movimento
    controls.moveRight(moveX);
    controls.moveForward(moveZ);
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
    if (!CONFIG.DEBUG_CONSOLE_LOGS) return;
    
    // Debug logs removidos para limpeza do console
}

// Debug contínuo da câmera (chama a cada X segundos)
let lastCameraDebugTime = 0;
export function continuousCameraDebug(camera, controls, delta, interval = 3.0) {
    if (!CONFIG.DEBUG_SHOW_CAMERA) return;
    
    lastCameraDebugTime += delta;
    if (lastCameraDebugTime >= interval) {
        debugCameraInfo(camera, controls);
        lastCameraDebugTime = 0;
    }
}

// Função para alternar imortalidade do jogador
function togglePlayerImmortality() {
    CONFIG.PLAYER_IMMORTAL = !CONFIG.PLAYER_IMMORTAL;
    
    // Atualiza a exibição de vida na interface
    const healthDisplay = document.getElementById('player-health');
    const immortalityIndicator = document.getElementById('immortality-indicator');
    
    if (CONFIG.PLAYER_IMMORTAL) {
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
    showImmortilityNotification(CONFIG.PLAYER_IMMORTAL);
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