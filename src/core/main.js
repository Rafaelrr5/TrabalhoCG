import * as THREE from '../../../build/three.module.js';
import { PointerLockControls } from '../../../build/jsm/controls/PointerLockControls.js';
import { CONFIG } from './config.js';
import { createWalls, createAreas, updateArea1, updateArea2, area1KeyPlatform, area2KeyPlatform, isPlayerInArea1, isPlayerInArea2 } from '../systems/environment.js';
import { createGun } from '../components/weapon.js';
import { createWeaponManager, updateProjectiles } from '../components/weaponManager.js';
import { createEnemies, updateEnemies, cleanupDeadEnemies, enemies, cleanupAllEnemyProjectiles, resetArea2Activation, resetArea1Activation } from '../entities/enemies/enemy.js';
import { setupEventListeners, updateCameraMovement, continuousCameraDebug } from '../systems/controls.js';
import { lightingSystem } from '../systems/lights.js';
import { applyGravity} from '../systems/collision.js';
import { createHitbox, hitbox, player } from '../entities/player/player.js';
import { updateELevator } from '../systems/elevator.js';
import { keyManager } from '../entities/items/key.js';
import { ambientAudioManager, playerAudioManager, gameAudioManager } from '../systems/index.js';
import { updateTotem } from '../systems/door.js';

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
    console.log('[MAIN] Initializing audio systems...');
    ambientAudioManager.init(window.listener);
    playerAudioManager.init(window.listener);
    gameAudioManager.init(window.listener);
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
    updateTotem(delta, scene, hitbox ,"red", collidableObjects);
    
    
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

function updateAmbientMusic() {
  let newArea = 'none';
  
  if (isPlayerInArea1(camera)) {
    newArea = 'area1';
  } else if (isPlayerInArea2(camera)) {
    newArea = 'area2';
  }
  
  if (newArea !== currentPlayerArea) {
    currentPlayerArea = newArea;
    ambientAudioManager.playAreaMusic(newArea);
  }
}

async function restartGame() {
  try {
    player.respawn();
    updatePlayerHealthDisplay();
    
    camera.position.set(0, CONFIG.CAMERA_HEIGHT, 0);
    camera.rotation.set(0, 0, 0);
    
    camera.lookAt(0, CONFIG.CAMERA_HEIGHT, -10);
    
    cleanupAllEnemyProjectiles(scene);
    
    cleanupDeadEnemies(scene);
    
    enemies.length = 0;
    
    await resetGameAreas();
    
    await createEnemies(scene);
    
    keyManager.clearAll();
    updateKeysDisplay();
    
    currentPlayerArea = 'none';
    ambientAudioManager.playAreaMusic('none');
    
    
  } catch (error) {
    console.error('[RESTART] Error restarting game:', error);
  }
}

async function resetGameAreas() {
  
  try {
    // Reset enemy activation states
    resetArea1Activation();
    resetArea2Activation();
    
    if (area1KeyPlatform) {
      console.log('[RESTART] Resetting area 1 platform');
      area1KeyPlatform.userData.shouldRaise = false;
      area1KeyPlatform.userData.isRaised = false;
      
      const platform = area1KeyPlatform.userData.platform;
      const keyInstance = area1KeyPlatform.userData.keyInstance;
      
      if (platform) {
        platform.position.y = CONFIG.AREA_Y_POSITION - 2;
      }
      if (keyInstance && keyInstance.getMesh()) {
        keyInstance.getMesh().position.y = CONFIG.AREA_Y_POSITION - 1.0;
        keyInstance.getMesh().visible = false;
      }
    } else {
      console.log('[RESTART] Area 1 platform not found');
    }
    
    if (area2KeyPlatform) {
      console.log('[RESTART] Resetting area 2 platform');
      area2KeyPlatform.userData.shouldRaise = false;
      area2KeyPlatform.userData.isRaised = false;
      
      const platform = area2KeyPlatform.userData.platform;
      const keyInstance = area2KeyPlatform.userData.keyInstance;
      
      if (platform) {
        platform.position.y = CONFIG.AREA_Y_POSITION - 2;
      }
      if (keyInstance && keyInstance.getMesh()) {
        keyInstance.getMesh().position.y = CONFIG.AREA_Y_POSITION - 1.0;
        keyInstance.getMesh().position.x = 20.0;
        keyInstance.getMesh().visible = false;
      }
    }

  } catch (error) {
    console.error('[RESTART] Error resetting game areas:', error);
  }
}

window.testAmbientMusic = function(area) {  
  if (area) {
    currentPlayerArea = 'none'; // Force change
    ambientAudioManager.playAreaMusic(area);
    currentPlayerArea = area;
  }
};


window.testEnemyAudio = function() {
  const enemyMesh = scene.getObjectByName('EnemiesGroup');
  if (enemyMesh && enemyMesh.children.length > 0) {
    const firstEnemyMesh = enemyMesh.children[0];
    const enemy = firstEnemyMesh.userData.enemy;
    
    if (enemy && enemy.hitSound && enemy.hitSound.buffer) {
      enemy.hitSound.play();
    }
  } else {
    console.log('[DEBUG] No enemies found');
  }

};

window.startAmbientMusic = function() {
  ambientAudioManager.forcePlayAreaMusic('none');
};

window.testPlayerAudio = function() {
  playerAudioManager.playHittingGroundSound();
  
  setTimeout(() => {
    playerAudioManager.playInjuredSound();
  }, 1000);
  
  setTimeout(() => {
    playerAudioManager.playDeathSound();
  }, 2000);
};

window.testGameAudio = function() {
  gameAudioManager.playItemPickupSound();
  
  setTimeout(() => {
    gameAudioManager.playDoorOpeningSound();
  }, 1000);
  
  setTimeout(() => {
    gameAudioManager.playLiftStartingSound();
  }, 2000);
  
  setTimeout(() => {
    gameAudioManager.playLiftStoppingSound();
  }, 3000);
};