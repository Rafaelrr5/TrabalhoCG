import { CONFIG } from '../core/config.js';
import { startShooting, stopShooting, toggleWeaponVisibility, debugWeaponInfo} from '../components/weapon.js';
import { wallColide } from './collision.js';
import { toggleHitboxVisibility } from '../entities/player/player.js';
import { enemies } from '../entities/enemies/enemy.js';

// Estados de controle de movimento (quais teclas estão ativas)
export let moveState = { 
    forward: false, 
    backward: false, 
    left: false, 
    right: false 
};

// Configura todos os event listeners
export function setupEventListeners(camera, scene) {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', () => startShooting(camera, scene));
    document.addEventListener('mouseup', stopShooting);
    // document.addEventListener('wheel', ()=> weaponSwitch(Date.now()))
    window.addEventListener('resize', onWindowResize);
}

// ===== CONTROLES DE MOVIMENTO =====
//atualiza pro estado de movimento correspondente
function onKeyDown(event) {
    switch(event.key.toLowerCase()) {
        case 'w': case 'arrowup': moveState.forward = true; break;
        case 's': case 'arrowdown': moveState.backward = true; break;
        case 'a': case 'arrowleft': moveState.left = true; break;
        case 'd': case 'arrowright': moveState.right = true; break;
        
        // ===== CONTROLES DE DEBUG =====
        case 'f1': // Alterna visibilidade da hitbox
            event.preventDefault();
            toggleHitboxVisibility();
            if (typeof window.updateDebugHUD === 'function') window.updateDebugHUD();
            break;
        case 'f2': // Alterna visibilidade da arma
            event.preventDefault();
            toggleWeaponVisibility();
            if (typeof window.updateDebugHUD === 'function') window.updateDebugHUD();
            break;
        case 'f3': // Alterna debug da câmera
            event.preventDefault();
            CONFIG.DEBUG_SHOW_CAMERA = !CONFIG.DEBUG_SHOW_CAMERA;
            console.log(`[DEBUG] Debug da câmera: ${CONFIG.DEBUG_SHOW_CAMERA ? 'ATIVADO' : 'DESATIVADO'}`);
            if (typeof window.updateDebugHUD === 'function') window.updateDebugHUD();
            break;
        case 'f4': // Alterna logs de debug
            event.preventDefault();
            CONFIG.DEBUG_CONSOLE_LOGS = !CONFIG.DEBUG_CONSOLE_LOGS;
            console.log(`[DEBUG] Console logs: ${CONFIG.DEBUG_CONSOLE_LOGS ? 'ATIVADOS' : 'DESATIVADOS'}`);
            if (typeof window.updateDebugHUD === 'function') window.updateDebugHUD();
            break;
        case 'f5': // Mostra info da arma
            event.preventDefault();
            debugWeaponInfo();
            break;
        case 'f6': // Alterna modo de orientação da skull
            event.preventDefault();
            CONFIG.SKULL_ORIENT_TO_MOVEMENT = !CONFIG.SKULL_ORIENT_TO_MOVEMENT;
            console.log(`[DEBUG] Orientação da skull: ${CONFIG.SKULL_ORIENT_TO_MOVEMENT ? 'MOVIMENTO' : 'TARGET'}`);
            break;
        case 'f7': // Alterna rotação suave da skull
            event.preventDefault();
            CONFIG.SKULL_SMOOTH_ROTATION = !CONFIG.SKULL_SMOOTH_ROTATION;
            console.log(`[DEBUG] Rotação suave da skull: ${CONFIG.SKULL_SMOOTH_ROTATION ? 'ATIVADA' : 'DESATIVADA'}`);
            break;
        case 'f8': // Alterna colisão das Lost Souls
            event.preventDefault();
            CONFIG.LOST_SOUL_ENABLE_COLLISION = !CONFIG.LOST_SOUL_ENABLE_COLLISION;
            console.log(`[DEBUG] Colisão das Lost Souls: ${CONFIG.LOST_SOUL_ENABLE_COLLISION ? 'ATIVADA' : 'DESATIVADA'}`);
            break;
        case 'f8': // Alterna colisão das Lost Souls
            event.preventDefault();
            CONFIG.LOST_SOUL_ENABLE_COLLISION = !CONFIG.LOST_SOUL_ENABLE_COLLISION;
            console.log(`[DEBUG] Colisão das Lost Souls: ${CONFIG.LOST_SOUL_ENABLE_COLLISION ? 'ATIVADA' : 'DESATIVADA'}`);
            break;
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

// Atualiza posição do jogador baseado na entrada do usuário
export function updateCameraMovement(delta, controls) {
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
    console.log('Window resized - implement handler in main.js');
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

// ============================================================================
// INSTRUÇÕES DE DEBUG E CONTROLES
// ============================================================================

// Mostra as instruções de controle de debug no console
export function showDebugInstructions() {
    console.log('%c=== CONTROLES DE DEBUG ===', 'color: #00ff00; font-weight: bold');
    console.log('%cF1%c - Alternar visibilidade da hitbox do player', 'color: #ffff00', 'color: #ffffff');
    console.log('%cF2%c - Alternar visibilidade da arma', 'color: #ffff00', 'color: #ffffff');
    console.log('%cF3%c - Alternar debug da câmera', 'color: #ffff00', 'color: #ffffff');
    console.log('%cF4%c - Alternar logs de debug no console', 'color: #ffff00', 'color: #ffffff');
    console.log('%cF5%c - Mostrar informações da arma', 'color: #ffff00', 'color: #ffffff');
    console.log('%cF6%c - Alternar orientação da skull (movimento vs target)', 'color: #ffff00', 'color: #ffffff');
    console.log('%cF7%c - Alternar rotação suave da skull', 'color: #ffff00', 'color: #ffffff');
    console.log('%cF8%c - Alternar colisão das Lost Souls', 'color: #ffff00', 'color: #ffffff');
    console.log('%c=========================', 'color: #00ff00; font-weight: bold');
}
