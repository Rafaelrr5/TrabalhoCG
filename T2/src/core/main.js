import * as THREE from '../../../build/three.module.js';
import { PointerLockControls } from '../../../build/jsm/controls/PointerLockControls.js';
import { CONFIG } from './config.js';
import { createWalls, createAreas, updateArea1, updateArea2, area1KeyPlatform, area2KeyPlatform, isPlayerInArea1, isPlayerInArea2 } from '../systems/environment.js';
import { createGun } from '../components/weapon.js';
import { createWeaponManager, updateProjectiles } from '../components/weaponManager.js';
import { createEnemies, updateEnemies, cleanupDeadEnemies, enemies } from '../entities/enemies/enemy.js';
import { cacodemons } from '../entities/enemies/cacodemonManager.js';
import { setupEventListeners, updateCameraMovement, continuousCameraDebug } from '../systems/controls.js';
import { lightingSystem } from '../systems/lights.js';
import { applyGravity } from '../systems/collision.js';
import { createHitbox, hitbox, player } from '../entities/player/player.js';
import { updateELevator } from '../systems/elevator.js';
import { keyManager } from '../entities/items/key.js';
import { cleanupAllProjectiles } from '../entities/enemies/systems/cacodeemonProjectile.js';
import { ambientAudioManager } from '../systems/ambientAudio.js';

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
  // Unlock pointer controls to allow interaction with popup
  if (controls.isLocked) {
    controls.unlock();
  }
  
  // Show game over popup
  showGameOverPopup();
}

// Show game over popup with restart option
function showGameOverPopup() {
  console.log('[RESTART] Creating game over popup');
  
  // Remove any existing popup first
  const existingOverlay = document.getElementById('game-over-overlay');
  if (existingOverlay) {
    document.body.removeChild(existingOverlay);
  }
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'game-over-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 99999;
    font-family: Arial, sans-serif;
    pointer-events: auto;
  `;
  
  // Create popup content
  const popup = document.createElement('div');
  popup.style.cssText = `
    background-color: #2a2a2a;
    border: 3px solid #ff4444;
    border-radius: 10px;
    padding: 30px;
    text-align: center;
    color: white;
    box-shadow: 0 0 20px rgba(255, 68, 68, 0.5);
    position: relative;
    z-index: 100000;
    pointer-events: auto;
  `;
  
  // Create elements separately for better control
  const title = document.createElement('h2');
  title.style.cssText = 'color: #ff4444; margin: 0 0 20px 0; font-size: 32px;';
  title.textContent = 'GAME OVER';
  
  const message = document.createElement('p');
  message.style.cssText = 'margin: 0 0 30px 0; font-size: 18px;';
  message.textContent = 'Você foi derrotado pelos inimigos!';
  
  const instruction = document.createElement('p');
  instruction.style.cssText = 'margin: 0 0 20px 0; font-size: 14px; color: #cccccc;';
  instruction.textContent = 'Clique em "Continuar" para jogar novamente';
  
  const restartButton = document.createElement('button');
  restartButton.id = 'restart-button';
  restartButton.style.cssText = `
    background-color: #ff4444;
    border: none;
    color: white;
    padding: 15px 30px;
    font-size: 18px;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s;
    position: relative;
    z-index: 100001;
    pointer-events: auto;
    outline: none;
  `;
  restartButton.textContent = 'Continuar';
  
  // Add event listeners directly
  restartButton.addEventListener('mouseenter', () => {
    restartButton.style.backgroundColor = '#ff6666';
  });
  
  restartButton.addEventListener('mouseleave', () => {
    restartButton.style.backgroundColor = '#ff4444';
  });
  
  restartButton.addEventListener('click', (event) => {
    console.log('[RESTART] Restart button clicked!');
    event.preventDefault();
    event.stopPropagation();
    
    try {
      // Remove the overlay
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      console.log('[RESTART] Overlay removed, calling restartGame');
      restartGame();
    } catch (error) {
      console.error('[RESTART] Error handling restart button click:', error);
    }
  });
  
  // Assemble the popup
  popup.appendChild(title);
  popup.appendChild(message);
  popup.appendChild(instruction);
  popup.appendChild(restartButton);
  overlay.appendChild(popup);
  
  // Add to document
  document.body.appendChild(overlay);
  
  // Focus the button to ensure it's interactive
  setTimeout(() => {
    restartButton.focus();
    console.log('[RESTART] Popup created and button focused');
  }, 100);
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

// Create keys HUD
function createKeysHUD() {
    const keysDisplay = document.createElement('div');
    keysDisplay.id = 'keys-display';
    keysDisplay.style.position = 'fixed';
    keysDisplay.style.top = '50px';
    keysDisplay.style.left = '20px';
    keysDisplay.style.color = 'gold';
    keysDisplay.style.fontSize = '16px';
    keysDisplay.style.fontWeight = 'bold';
    keysDisplay.style.zIndex = '1000';
    keysDisplay.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
    keysDisplay.textContent = 'Keys: None'; // Estado inicial sem chamar updateKeysDisplay()
    document.body.appendChild(keysDisplay);
}

// Update keys display
function updateKeysDisplay() {
    const keysDisplay = document.getElementById('keys-display');
    if (keysDisplay) {
        const collectedKeys = keyManager.getCollectedKeys();
        
        const keyColors = {
            red: '🔴',
            blue: '🔵', 
            green: '🟢',
            yellow: '🟡',
            gold: '🟠'
        };
        
        if (collectedKeys.length === 0) {
            keysDisplay.textContent = 'Keys: None';
        } else {
            const keyIcons = collectedKeys.map(keyType => keyColors[keyType] || '🔑').join(' ');
            keysDisplay.textContent = `Keys: ${keyIcons} (${collectedKeys.length})`;
        }
    }
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
let currentPlayerArea = 'none'; // Track current area for ambient music

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
    createKeysHUD();
    createDebugHUD();
    createWeaponManager(camera, scene);
    
    // Atualizar HUD das chaves após criar o ambiente
    setTimeout(() => {
        updateKeysDisplay();
    }, 100);
    
    // Force start ambient music after everything is loaded
    setTimeout(() => {
        console.log('[MAIN] Force starting ambient music...');
        ambientAudioManager.forcePlayAreaMusic('none');
    }, 500); // Reduced delay
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
    
    // Initialize ambient audio system
    console.log('[MAIN] Initializing ambient audio system...');
    ambientAudioManager.init(window.listener);
}

function resetPlayerPosition() {
    const startHeight = CONFIG.CAMERA_HEIGHT + (CONFIG.START_HEIGHT_OFFSET || 0);
    camera.position.set(0, startHeight, 0);
    player.resetPosition();
}

function setupControls() {
    controls = new PointerLockControls(camera, document.body);

    // Add click listener only to canvas/renderer element, not entire document
    renderer.domElement.addEventListener('click', () => {
        // Only try to lock if not in a popup/modal
        const gameOverPopup = document.getElementById('game-over-overlay');
        if (!gameOverPopup) {
            controls.lock();
        }
    });
    scene.add(controls.getObject());
    
    // Adiciona handler de resize específico do main.js
    window.addEventListener('resize', onWindowResize);
}

function createEnvironment() {
    // Limpar estado anterior das chaves
    keyManager.clearAll();
    
    // Temporariamente comentando o reset para debug
    // resetAllEnemies();
    
    createWalls(scene, collidableObjects);
    createAreas(scene, collidableObjects);
    //gun = createGun(camera); // Captura a referência da arma
    //gun.init(scene); // Inicializa a arma com a cena
    // Spawn Lost Soul enemies (they will idle until Area 1 entry)
    createEnemies(scene);
}

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    player.update(delta, camera);
    applyGravity(delta, collidableObjects, camera);
    updateCameraMovement(delta, controls);
    updateProjectiles(delta);
    updateArea1(delta);
    updateArea2(delta);
    
    updateEnemies(delta, scene, camera, gun, collidableObjects);
    updateELevator(delta);
    
    // Update ambient music based on player position
    updateAmbientMusic();
    
    // Ensure ambient music keeps playing
    ambientAudioManager.ensureAmbientMusicPlaying();
    
    // Atualizar sistema de chaves
    keyManager.updateKeys(delta);
    
    // Verificar coletas de chaves
    const collectedKeys = keyManager.checkCollisions(camera.position, 1.5);
    if (collectedKeys.length > 0) {
        updateKeysDisplay(); // Atualizar display das chaves
        console.log(`[KEYS] Collected ${collectedKeys.length} key(s):`, collectedKeys.map(k => k.getType()));
        
        // Log adicional para debug
        console.log(`[KEYS] Total keys collected: ${keyManager.getCollectedKeyCount()}`);
        console.log(`[KEYS] Available key types:`, keyManager.getCollectedKeys());
    }
  
    continuousCameraDebug(camera, controls, delta);
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Update ambient music based on player area
function updateAmbientMusic() {
  let newArea = 'none';
  
  // Check which area the player is in
  if (isPlayerInArea1(camera)) {
    newArea = 'area1';
  } else if (isPlayerInArea2(camera)) {
    newArea = 'area2';
  }
  
  // Change music if area changed
  if (newArea !== currentPlayerArea) {
    console.log(`[AMBIENT] Player moved from ${currentPlayerArea} to ${newArea}`);
    console.log(`[AMBIENT] Player position: x=${camera.position.x.toFixed(2)}, z=${camera.position.z.toFixed(2)}`);
    currentPlayerArea = newArea;
    ambientAudioManager.playAreaMusic(newArea);
  }
}

// Restart the entire game
async function restartGame() {
  console.log('[RESTART] Restarting game...');
  
  try {
    // 1. Reset player
    console.log('[RESTART] Step 1: Resetting player');
    player.respawn();
    updatePlayerHealthDisplay();
    
    // 2. Reset camera position to spawn
    console.log('[RESTART] Step 2: Resetting camera position');
    camera.position.set(0, CONFIG.CAMERA_HEIGHT, 0);
    camera.rotation.set(0, 0, 0);
    
    // Reset camera look direction (PointerLockControls doesn't have target)
    camera.lookAt(0, CONFIG.CAMERA_HEIGHT, -10);
    
    // 3. Clean up all projectiles first
    console.log('[RESTART] Step 3: Cleaning up projectiles');
    cleanupAllProjectiles(scene, cacodemons);
    
    // 4. Clean up all enemies
    console.log('[RESTART] Step 4: Cleaning up enemies');
    cleanupDeadEnemies(scene);
    
    // 5. Reset enemy arrays
    console.log('[RESTART] Step 5: Resetting enemy arrays');
    enemies.length = 0;
    cacodemons.length = 0;
    
    // 6. Reset areas and platforms
    console.log('[RESTART] Step 6: Resetting areas and platforms');
    await resetGameAreas();
    
    // 7. Recreate enemies
    console.log('[RESTART] Step 7: Recreating enemies');
    await createEnemies(scene);
    
    // 8. Reset keys
    console.log('[RESTART] Step 8: Resetting keys');
    keyManager.clearAll();
    updateKeysDisplay();
    
    // 9. Reset ambient music
    console.log('[RESTART] Step 9: Resetting ambient music');
    currentPlayerArea = 'none';
    ambientAudioManager.playAreaMusic('none');
    
    console.log('[RESTART] Game restarted successfully!');
    
  } catch (error) {
    console.error('[RESTART] Error restarting game:', error);
  }
}

// Reset game areas and platforms
async function resetGameAreas() {
  console.log('[RESTART] Resetting game areas...');
  
  try {
    // Reset area 1 platform
    if (area1KeyPlatform) {
      console.log('[RESTART] Resetting area 1 platform');
      area1KeyPlatform.userData.shouldRaise = false;
      area1KeyPlatform.userData.isRaised = false;
      
      // Move platform back down
      const platform = area1KeyPlatform.userData.platform;
      const keyInstance = area1KeyPlatform.userData.keyInstance;
      
      if (platform) {
        platform.position.y = CONFIG.AREA_Y_POSITION - 2;
      }
      if (keyInstance && keyInstance.getMesh()) {
        keyInstance.getMesh().position.y = CONFIG.AREA_Y_POSITION - 1.0;
        keyInstance.getMesh().visible = false; // Hide key until platform rises
      }
    } else {
      console.log('[RESTART] Area 1 platform not found');
    }
    
    // Reset area 2 platform
    if (area2KeyPlatform) {
      console.log('[RESTART] Resetting area 2 platform');
      area2KeyPlatform.userData.shouldRaise = false;
      area2KeyPlatform.userData.isRaised = false;
      
      // Move platform back down
      const platform = area2KeyPlatform.userData.platform;
      const keyInstance = area2KeyPlatform.userData.keyInstance;
      
      if (platform) {
        platform.position.y = CONFIG.AREA_Y_POSITION - 2;
      }
      if (keyInstance && keyInstance.getMesh()) {
        keyInstance.getMesh().position.y = CONFIG.AREA_Y_POSITION - 1.0;
        keyInstance.getMesh().position.x = 20.0; // Posição X atualizada para corresponder à plataforma
        keyInstance.getMesh().visible = false; // Hide key until platform rises
      }
    } else {
      console.log('[RESTART] Area 2 platform not found');
    }
    
    console.log('[RESTART] Game areas reset complete');
  } catch (error) {
    console.error('[RESTART] Error resetting game areas:', error);
  }
}

// Debug function to test ambient music (call from console)
window.testAmbientMusic = function(area) {
  console.log(`[DEBUG] Testing ambient music for area: ${area}`);
  console.log(`[DEBUG] Current area: ${currentPlayerArea}`);
  console.log(`[DEBUG] Ambient system initialized: ${ambientAudioManager.isInitialized}`);
  console.log(`[DEBUG] Ambient system enabled: ${ambientAudioManager.isEnabled}`);
  
  if (area) {
    currentPlayerArea = 'none'; // Force change
    ambientAudioManager.playAreaMusic(area);
    currentPlayerArea = area;
  }
};

// Debug function to check player position relative to areas
window.checkPlayerArea = function() {
  console.log(`[DEBUG] Player position: x=${camera.position.x.toFixed(2)}, y=${camera.position.y.toFixed(2)}, z=${camera.position.z.toFixed(2)}`);
  console.log(`[DEBUG] In Area 1: ${isPlayerInArea1(camera)}`);
  console.log(`[DEBUG] In Area 2: ${isPlayerInArea2(camera)}`);
  console.log(`[DEBUG] Current area: ${currentPlayerArea}`);
};

// Debug function to test enemy sounds (call from console)
window.testEnemyAudio = function() {
  console.log('[DEBUG] Testing enemy audio system...');
  
  // Find first enemy
  const enemyMesh = scene.getObjectByName('EnemiesGroup');
  if (enemyMesh && enemyMesh.children.length > 0) {
    const firstEnemyMesh = enemyMesh.children[0];
    const enemy = firstEnemyMesh.userData.enemy;
    
    if (enemy) {
      console.log(`[DEBUG] Found enemy: ${enemy.constructor.name}`);
      console.log(`[DEBUG] Hit sound available: ${!!(enemy.hitSound && enemy.hitSound.buffer)}`);
      console.log(`[DEBUG] Attack sound available: ${!!(enemy.attackSound && enemy.attackSound.buffer)}`);
      console.log(`[DEBUG] Death sound available: ${!!(enemy.deathSound && enemy.deathSound.buffer)}`);
      
      // Test hit sound
      if (enemy.hitSound && enemy.hitSound.buffer) {
        console.log('[DEBUG] Playing hit sound...');
        enemy.hitSound.play();
      }
    }
  } else {
    console.log('[DEBUG] No enemies found');
  }
};

// Debug function to manually start ambient music (call from console)
window.startAmbientMusic = function() {
  console.log('[DEBUG] Manually starting ambient music...');
  console.log(`[DEBUG] System initialized: ${ambientAudioManager.isInitialized}`);
  console.log(`[DEBUG] System enabled: ${ambientAudioManager.isEnabled}`);
  console.log(`[DEBUG] Current area: ${ambientAudioManager.currentArea}`);
  console.log(`[DEBUG] Is playing: ${ambientAudioManager.isPlaying()}`);
  
  ambientAudioManager.forcePlayAreaMusic('none');
};