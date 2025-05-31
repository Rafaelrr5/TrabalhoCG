// ============================================================================
// SISTEMA DE CONTROLES E MOVIMENTAÇÃO
// ============================================================================
import { CONFIG } from './config.js';
import { startShooting, stopShooting} from './weapon.js';
import { wallColide } from './player.js';

// Estados de controle de movimento
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
function onKeyDown(event) {
    switch(event.key.toLowerCase()) {
        case 'w': case 'arrowup': moveState.forward = true; break;
        case 's': case 'arrowdown': moveState.backward = true; break;
        case 'a': case 'arrowleft': moveState.left = true; break;
        case 'd': case 'arrowright': moveState.right = true; break;
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
    
    // Normaliza movimento diagonal
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
