import * as THREE from '../../../build/three.module.js';
import { PointerLockControls } from '../../../build/jsm/controls/PointerLockControls.js';
import { CONFIG } from './config.js';
import { createWalls, createAreas, updateArea1 } from '../systems/environment.js';
import { createGun, updateProjectiles } from '../components/weapon.js';
import { createEnemies, updateEnemies } from '../entities/enemies/enemy.js';
import { setupEventListeners, updateCameraMovement, continuousCameraDebug } from '../systems/controls.js';
import { lightingSystem } from '../systems/lights.js';
import { applyGravity } from '../systems/collision.js';
import { createHitbox, hitbox, player } from '../entities/player/player.js';
import { updateELevator } from '../systems/elevator.js';

// Global function to handle player damage (called by Lost Soul kamikaze attacks)
window.playerTakeDamage = function(damage) {
  const isAlive = player.takeDamage(damage);
  
  updatePlayerHealthDisplay();
  
  if (!isAlive) {
    handlePlayerDeath();
  }
};

// Update health display on screen
function updatePlayerHealthDisplay() {
  const healthDisplay = document.getElementById('player-health');
  if (healthDisplay) {
    const healthStatus = player.getHealthStatus();
    healthDisplay.textContent = `Health: ${healthStatus.current}/${healthStatus.max}`;
    
    // Color coding based on health percentage
    const healthPercentage = healthStatus.percentage;
    if (healthPercentage < 0.3) {
      healthDisplay.style.color = 'red';
    } else if (healthPercentage < 0.6) {
      healthDisplay.style.color = 'orange';
    } else {
      healthDisplay.style.color = 'green';
    }
  }
}

// Handle player death
function handlePlayerDeath() {
  // Could implement respawn, game over screen, etc.
  alert('Game Over! Lost Souls defeated you!');
  // Reset for now
  player.respawn();
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
  const healthStatus = player.getHealthStatus();
  healthDisplay.textContent = `Health: ${healthStatus.current}/${healthStatus.max}`;
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
    // Import cacodemons array (if available)
    let cacodemons = [];
    try {
      if (window.getCacodemons) {
        cacodemons = window.getCacodemons();
      }
    } catch (e) {
      // Ignore error if function not available
    }

    debugHUD.innerHTML = `
      <strong>DEBUG STATUS</strong><br>
      F1 - Hitbox: ${CONFIG.DEBUG_SHOW_HITBOX ? '<span style="color:lime">ON</span>' : '<span style="color:red">OFF</span>'}<br>
      F2 - Arma: ${CONFIG.DEBUG_SHOW_WEAPON ? '<span style="color:lime">ON</span>' : '<span style="color:red">OFF</span>'}<br>
      F3 - Câmera: ${CONFIG.DEBUG_SHOW_CAMERA ? '<span style="color:lime">ON</span>' : '<span style="color:red">OFF</span>'}<br>
      F4 - Console: ${CONFIG.DEBUG_CONSOLE_LOGS ? '<span style="color:lime">ON</span>' : '<span style="color:red">OFF</span>'}
      <br><br>
      <strong>CACODEMONS</strong><br>
      Total: <span style="color:yellow">${cacodemons.length}</span><br>
      ${cacodemons.slice(0, 3).map((c, i) => 
        `#${i+1}: [${c.mesh.position.x.toFixed(1)}, ${c.mesh.position.y.toFixed(1)}, ${c.mesh.position.z.toFixed(1)}]<br>`
      ).join('')}
    `;
  }
}

window.updateDebugHUD = updateDebugHUD;
function showDebugInstructions() {
    // Debug instructions removed
}

let camera, scene, renderer, controls, gun;
let clock = new THREE.Clock();
let collidableObjects = [];

init();
animate();

function init() {
    setupScene();
    setupCamera();
    lightingSystem.init(scene, renderer);
    createEnvironment();
    createHitbox(scene);
    resetPlayerPosition();
    setupControls();
    setupEventListeners(camera, scene);
    createPlayerHealthHUD();
    createDebugHUD();
    
    // Mostra instruções de debug
    showDebugInstructions();
}

function setupScene() {
    scene = new THREE.Scene();
    // Enable antialiasing to smooth edges and prevent black artifacts
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance"
    });
    // Use device pixel ratio for crisp rendering on high-DPI screens
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    const container = document.getElementById('webgl-output') || document.body;
    container.appendChild(renderer.domElement);
}

function setupCamera() {
    camera = new THREE.PerspectiveCamera(CONFIG.CAMERA_FOV, window.innerWidth/window.innerHeight, CONFIG.CAMERA_NEAR, CONFIG.CAMERA_FAR);
    camera.position.y = CONFIG.CAMERA_HEIGHT;
    // Adiciona listener de áudio à câmera para sons 3D
    window.listener = new THREE.AudioListener();
    camera.add(window.listener);
}

function resetPlayerPosition() {
    const startHeight = CONFIG.CAMERA_HEIGHT + (CONFIG.START_HEIGHT_OFFSET || 0);
    camera.position.set(0, startHeight, 0);
    player.resetPosition();
}

function setupControls() {
    controls = new PointerLockControls(camera, document.body);

    //inicia quando clica na tela
    document.addEventListener('click', () => controls.lock());
    scene.add(controls.getObject());
    
    // Adiciona handler de resize específico do main.js
    window.addEventListener('resize', onWindowResize);
}

function createEnvironment() {
    createWalls(scene, collidableObjects);
    createAreas(scene, collidableObjects);
    gun = createGun(camera); // Captura a referência da arma
    gun.init(scene); // Inicializa a arma com a cena
    // Spawn Lost Soul enemies (they will idle until Area 1 entry)
    createEnemies(scene);
}

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    player.update(delta, camera);
    applyGravity(delta, collidableObjects, camera);
    updateCameraMovement(delta, controls);
    updateProjectiles(delta, scene);
    updateArea1(delta, scene, camera);
    updateEnemies(delta, scene, camera, gun, collidableObjects);
    updateELevator(delta);
  
    continuousCameraDebug(camera, controls, delta);
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}