// ============================================================================
// SISTEMA DE CONTROLES E MOVIMENTAÇÃO
// ============================================================================
import { CONFIG } from './config.js';
import { startShooting, stopShooting } from './weapon.js';

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
    
    if (moveState.forward) controls.moveForward(distance);
    if (moveState.backward) controls.moveForward(-distance);
    if (moveState.left) controls.moveRight(-distance);
    if (moveState.right) controls.moveRight(distance);
}

// Lida com redimensionamento da janela
function onWindowResize() {
    // Esta função será chamada pelo main.js que tem acesso ao renderer
    // O main.js deve implementar sua própria versão
    console.log('Window resized - implement handler in main.js');
}
