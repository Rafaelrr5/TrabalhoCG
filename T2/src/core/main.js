import * as THREE from '../../../build/three.module.js';
import { PointerLockControls } from '../../../build/jsm/controls/PointerLockControls.js';
import { createLightSphere, initDefaultBasicLight } from "../../../libs/util/util.js";

// Importa módulos do jogo
import { CONFIG } from './config.js';
import { createWalls, createAreas, updateArea1 } from '../systems/environment.js';
import { createGun, updateProjectiles } from '../components/weapon.js';
import { createEnemies, updateEnemies } from '../entities/enemies/enemy.js';
import { setupEventListeners, updateCameraMovement, continuousCameraDebug } from '../systems/controls.js';
import { applyGravity } from '../systems/collision.js';
import { createHitbox, hitbox, updateHitbox } from '../entities/player/player.js';
import { updateELevator } from '../systems/elevator.js';

// ============================================================================
// PLAYER HEALTH SYSTEM for Lost Soul kamikaze attacks
// ============================================================================
let playerHealth = 100;
let maxPlayerHealth = 100;

// Global function to handle player damage (called by Lost Soul kamikaze attacks)
window.playerTakeDamage = function(damage) {
  playerHealth = Math.max(0, playerHealth - damage);
  // Player health log removido para limpeza do console
  
  // Update HUD if it exists
  updatePlayerHealthDisplay();
  
  // Check for death
  if (playerHealth <= 0) {
    console.log('[PLAYER DEATH] Player died from Lost Soul kamikaze attack!');
    handlePlayerDeath();
  }
};

// Update health display on screen
function updatePlayerHealthDisplay() {
  const healthDisplay = document.getElementById('player-health');
  if (healthDisplay) {
    healthDisplay.textContent = `Health: ${playerHealth}/${maxPlayerHealth}`;
    healthDisplay.style.color = playerHealth < 30 ? 'red' : playerHealth < 60 ? 'orange' : 'green';
  }
}

// Handle player death
function handlePlayerDeath() {
  // Could implement respawn, game over screen, etc.
  alert('Game Over! Lost Souls defeated you!');
  // Reset for now
  playerHealth = maxPlayerHealth;
  updatePlayerHealthDisplay();
}

// Create simple health HUD
function createPlayerHealthHUD() {
  const healthDisplay = document.createElement('div');
  healthDisplay.id = 'player-health';
  healthDisplay.style.position = 'fixed';
  healthDisplay.style.top = '20px';
  healthDisplay.style.left = '20px';
  healthDisplay.style.color = 'green';
  healthDisplay.style.fontSize = '20px';
  healthDisplay.style.fontWeight = 'bold';
  healthDisplay.style.zIndex = '1000';
  healthDisplay.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
  healthDisplay.textContent = `Health: ${playerHealth}/${maxPlayerHealth}`;
  document.body.appendChild(healthDisplay);
}

// Cria HUD para mostrar status do debug
function createDebugHUD() {
  const debugHUD = document.createElement('div');
  debugHUD.id = 'debug-hud';
  debugHUD.style.position = 'fixed';
  debugHUD.style.top = '70px';
  debugHUD.style.left = '20px';
  debugHUD.style.color = 'cyan';
  debugHUD.style.fontSize = '14px';
  debugHUD.style.fontFamily = 'Courier New, monospace';
  debugHUD.style.zIndex = '1000';
  debugHUD.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
  debugHUD.style.backgroundColor = 'rgba(0,0,0,0.5)';
  debugHUD.style.padding = '10px';
  debugHUD.style.borderRadius = '5px';
  updateDebugHUD();
  document.body.appendChild(debugHUD);
}

// Atualiza o HUD de debug
function updateDebugHUD() {
  const debugHUD = document.getElementById('debug-hud');
  if (debugHUD) {
    debugHUD.innerHTML = `
      <strong>DEBUG STATUS</strong><br>
      F1 - Hitbox: ${CONFIG.DEBUG_SHOW_HITBOX ? '<span style="color:lime">ON</span>' : '<span style="color:red">OFF</span>'}<br>
      F2 - Arma: ${CONFIG.DEBUG_SHOW_WEAPON ? '<span style="color:lime">ON</span>' : '<span style="color:red">OFF</span>'}<br>
      F3 - Câmera: ${CONFIG.DEBUG_SHOW_CAMERA ? '<span style="color:lime">ON</span>' : '<span style="color:red">OFF</span>'}<br>
      F4 - Console: ${CONFIG.DEBUG_CONSOLE_LOGS ? '<span style="color:lime">ON</span>' : '<span style="color:red">OFF</span>'}
    `;
  }
}

// Função global para atualizar o HUD (pode ser chamada de outros arquivos)
window.updateDebugHUD = updateDebugHUD;

// ============================================================================
// SISTEMA DE DEBUG
// ============================================================================

// Mostra as instruções de debug no console
function showDebugInstructions() {
    // Debug instructions removed
}

// ============================================================================
// GAME VARIABLES AND INITIALIZATION
// ============================================================================

let camera, scene, renderer, controls, gun;
let clock = new THREE.Clock();
let collidableObjects = [];

init();
animate();

// Função principal de inicialização - configura todos os componentes do jogo
function init() {
    setupScene();
    setupCamera();
    setupLighting();
    createEnvironment();
    createHitbox(scene);
    resetPlayerPosition();
    setupControls();
    setupEventListeners(camera, scene);
    createPlayerHealthHUD(); // Create health display for kamikaze attacks
    createDebugHUD(); // Create debug status HUD
    
    // Mostra instruções de debug
    showDebugInstructions();
}

// Cria a cena principal e o renderizador WebGL, ajustando os tamanhos
function setupScene() {
    scene = new THREE.Scene();
    // Enable antialiasing to smooth edges and prevent black artifacts
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.shadowMap.enabled = true; // Ativa sombras
    renderer.shadowMap.type = THREE.PCFShadowMap; // Define o tipo de sombra
    renderer.shadowMap.autoUpdate = true; // Atualiza sombras automaticamente
    // Use device pixel ratio for crisp rendering on high-DPI screens
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    const container = document.getElementById('webgl-output') || document.body;
    container.appendChild(renderer.domElement);
}

// Configura a câmera do jogo
function setupCamera() {
    camera = new THREE.PerspectiveCamera(CONFIG.CAMERA_FOV, window.innerWidth/window.innerHeight, CONFIG.CAMERA_NEAR, CONFIG.CAMERA_FAR);
    camera.position.y = CONFIG.CAMERA_HEIGHT;
}

//coloca camera e hitbox na posição inicial do jogador
function resetPlayerPosition() {
    const startHeight = CONFIG.CAMERA_HEIGHT + CONFIG.START_HEIGHT_OFFSET;
    camera.position.set(0, startHeight, 0);

    if(hitbox) {
        hitbox.position.set(0, startHeight, 0);
        hitbox.position.y -= 1.0;
    }
}

// Inicializa controles de pointer lock para movimento de câmera estilo FPS
function setupControls() {
    controls = new PointerLockControls(camera, document.body);

    //inicia quando clica na tela
    document.addEventListener('click', () => controls.lock());
    scene.add(controls.getObject());
    
    // Adiciona handler de resize específico do main.js
    window.addEventListener('resize', onWindowResize);
}

// Configura iluminação básica para a cena
function setupLighting() {
    let ambientColor = "rgb(80,80,80)";
    let ambientLight = new THREE.AmbientLight(ambientColor, 0.8);
    scene.add(ambientLight);
    
    // Configuração da luz direcional
    let light = new THREE.DirectionalLight(0xffffff, 5.0);
    light.position.set(481.86, 300, -458.45);
    light.castShadow = true;
    
    // Ajuste fino do mapa de sombras
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 1000;
    light.shadow.camera.left = -500;
    light.shadow.camera.right = 500;
    light.shadow.camera.top = 500;
    light.shadow.camera.bottom = -500;
    light.shadow.bias = -0.0001; // Ajuste para evitar artefatos
    
    scene.add(light);
    
    // Adicione um helper para visualizar a luz (opcional, para debug)
    const helper = new THREE.DirectionalLightHelper(light, 5);
    scene.add(helper);
}

// Cria o ambiente do jogo (chão, paredes, áreas e arma)
function createEnvironment() {
    createWalls(scene, collidableObjects);
    createAreas(scene, collidableObjects);
    gun = createGun(camera); // Captura a referência da arma
    // Spawn Lost Soul enemies (they will idle until Area 1 entry)
    createEnemies(scene);
}

// Loop principal de animação
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    updateHitbox(camera);
    applyGravity(delta, collidableObjects, camera);
    updateCameraMovement(delta, controls);
    updateProjectiles(delta, scene);
    updateArea1(delta, scene, camera);
    // Update enemy behavior - now targets the gun position WITH collision detection
    updateEnemies(delta, scene, camera, gun, collidableObjects);
    updateELevator(delta);
    
    // Debug da câmera (se ativado)
    continuousCameraDebug(camera, controls, delta);
    
    renderer.render(scene, camera);
}

// Lida com redimensionamento da janela
// ============================================================================
// SISTEMA DE WINDOW RESIZE
// ============================================================================

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}