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
import { updateElevator } from '../systems/elevator.js';
import { keyManager } from '../entities/items/key.js';
import { ambientAudioManager, playerAudioManager, gameAudioManager } from '../systems/index.js';
import { updateTotem, updateDoorAnimation, updateKeyAnimation, totem } from '../systems/door.js';

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
    // Hide health display if player is immortal
    if (CONFIG.PLAYER_IMMORTAL) {
      healthDisplay.style.display = 'none';
      return;
    }
    
    // Show health display if player is not immortal
    healthDisplay.style.display = 'block';
    
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
    
    // Hide health display if player is immortal
    if (CONFIG.PLAYER_IMMORTAL) {
        healthDisplay.style.display = 'none';
    } else {
        const healthStatus = player.getHealthStatus();
        healthDisplay.textContent = `Health: ${healthStatus.current}/${healthStatus.max}`;
    }
    
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
let environmentLoaded = false; // Track if environment is fully loaded
let loadingScreen = null; // Reference to loading screen

init();
animate();

// Create loading screen
function createLoadingScreen() {
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 99999;
        font-family: 'Courier New', monospace;
        color: #ff3c00ff;
    `;
    
    // Game title
    const title = document.createElement('h1');
    title.style.cssText = `
        font-size: 48px;
        margin-bottom: 20px;
        text-shadow: 0 0 20px #ff3300ff;
        letter-spacing: 3px;
        text-align: center;
        animation: pulse 2s infinite;
    `;
    title.textContent = 'Trabalho CG - Rafael e Vinicius';
    
    // Loading text
    const loadingText = document.createElement('p');
    loadingText.id = 'loading-text';
    loadingText.style.cssText = `
        font-size: 18px;
        margin-bottom: 30px;
        text-align: center;
        color: #cccccc;
        min-height: 25px;
    `;
    loadingText.textContent = 'Inicializando...';
    
    // Progress bar container
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
        width: 400px;
        height: 20px;
        background-color: #333;
        border: 2px solid #ff0000ff;
        border-radius: 10px;
        overflow: hidden;
        margin-bottom: 20px;
        box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
        position: relative;
    `;
    
    // Progress bar
    const progressBar = document.createElement('div');
    progressBar.id = 'loading-progress';
    progressBar.style.cssText = `
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, #ff0000ff, #ff0a0aff);
        transition: width 0.3s ease;
        box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
        position: relative;
    `;
    
    // Animated shine effect
    const shine = document.createElement('div');
    shine.style.cssText = `
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        animation: shine 2s infinite;
    `;
    progressBar.appendChild(shine);
    
    // Progress percentage
    const progressPercent = document.createElement('div');
    progressPercent.id = 'loading-percent';
    progressPercent.style.cssText = `
        font-size: 16px;
        color: #ff0000ff;
        text-shadow: 0 0 5px #ff0000ff;
        margin-top: 10px;
    `;
    progressPercent.textContent = '0%';
    
    // Loading dots animation
    const loadingDots = document.createElement('div');
    loadingDots.style.cssText = `
        font-size: 20px;
        color: #ff0000ff;
        margin-top: 20px;
        animation: dots 1.5s infinite;
    `;
    loadingDots.textContent = '...';
    
    // Controls instruction
    const controlsInfo = document.createElement('div');
    controlsInfo.style.cssText = `
        position: absolute;
        bottom: 50px;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
        color: #666;
        font-size: 14px;
        line-height: 1.5;
    `;
    controlsInfo.innerHTML = `
        <p><strong>CONTROLES:</strong></p>
        <p>WASD - Movimento | Mouse - Olhar | Click - Atirar</p>
        <p>1/2 - Trocar Arma</p>
    `;
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        
        @keyframes shine {
            0% { left: -100%; }
            100% { left: 100%; }
        }
        
        @keyframes dots {
            0%, 20% { content: '...'; }
            40% { content: ''; }
            60% { content: '.'; }
            80% { content: '..'; }
            100% { content: '...'; }
        }
    `;
    document.head.appendChild(style);
    
    // Assembly
    progressContainer.appendChild(progressBar);
    overlay.appendChild(title);
    overlay.appendChild(loadingText);
    overlay.appendChild(progressContainer);
    overlay.appendChild(progressPercent);
    overlay.appendChild(loadingDots);
    overlay.appendChild(controlsInfo);
    
    document.body.appendChild(overlay);
    return overlay;
}

// Update loading progress
function updateLoadingProgress(percent, text) {
    const progressBar = document.getElementById('loading-progress');
    const progressPercent = document.getElementById('loading-percent');
    const loadingText = document.getElementById('loading-text');
    
    if (progressBar) progressBar.style.width = percent + '%';
    if (progressPercent) progressPercent.textContent = Math.round(percent) + '%';
    if (loadingText && text) loadingText.textContent = text;
}

// Make loading progress available globally
window.updateLoadingProgress = updateLoadingProgress;

// Remove loading screen
function removeLoadingScreen() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        // Fade out animation
        overlay.style.transition = 'opacity 0.5s ease';
        overlay.style.opacity = '0';
        
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 500);
    }
}

async function init() {
    // Create and show loading screen
    loadingScreen = createLoadingScreen();
    updateLoadingProgress(0, 'Inicializando sistema...');
    
    // Small delay to ensure loading screen is visible
    await new Promise(resolve => setTimeout(resolve, 100));
    
    updateLoadingProgress(10, 'Configurando cena 3D...');
    setupScene();
    
    updateLoadingProgress(20, 'Configurando câmera...');
    setupCamera();
    
    updateLoadingProgress(30, 'Configurando iluminação...');
    lightingSystem.init(scene, renderer);
    
    updateLoadingProgress(40, 'Carregando ambiente e modelos...');
    await createEnvironment();
    
    updateLoadingProgress(70, 'Criando hitbox do jogador...');
    createHitbox(scene);
    
    updateLoadingProgress(80, 'Posicionando jogador...');
    // Reset player position AFTER environment is fully loaded
    resetPlayerPosition();
    
    updateLoadingProgress(85, 'Configurando controles...');
    setupControls();
    setupEventListeners(camera, scene);
    
    updateLoadingProgress(90, 'Criando interface...');
    createPlayerHealthHUD();
    createKeysHUD();
    
    updateLoadingProgress(95, 'Inicializando sistema de armas...');
    createWeaponManager(camera, scene);
    
    updateLoadingProgress(100, 'Carregamento concluído!');
    
    // Wait a moment before removing loading screen
    await new Promise(resolve => setTimeout(resolve, 500));
    removeLoadingScreen();
    
    // Atualizar HUD das chaves após criar o ambiente
    setTimeout(() => {
        updateKeysDisplay();
    }, 100);
    
    // Configurar callback para atualizar HUD quando inventário de chaves mudar
    keyManager.onInventoryChange((inventoryData) => {
        const { action, keyType, collectedKeys, collectedKeyCount } = inventoryData;
        
        // Atualizar display das chaves
        updateKeysDisplay();
        
        // Log da mudança para debug
        if (CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[MAIN] Inventory changed - Action: ${action}, Key: ${keyType}, Total: ${collectedKeyCount}`);
        }
    });
    
    // Event listener para atualizar o display quando uma chave é removida (compatibilidade)
    window.addEventListener('keyRemoved', () => {
        updateKeysDisplay();
    });
    
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
    // Use a fixed safe height for initial positioning
    const safeHeight = CONFIG.INITIAL_PLAYER_HEIGHT;
    
    camera.position.set(0, safeHeight, 0);
    player.resetPosition();
    
    console.log('[MAIN] Player position reset to:', camera.position);
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

async function createEnvironment() {
    // Limpar estado anterior das chaves
    keyManager.clearAll();
    
    // Temporariamente comentando o reset para debug
    // resetAllEnemies();
    
    updateLoadingProgress(45, 'Criando paredes e chão...');
    createWalls(scene, collidableObjects);
    
    updateLoadingProgress(50, 'Carregando áreas do jogo...');
    await createAreas(scene, collidableObjects);
    
    updateLoadingProgress(65, 'Criando inimigos...');
    //gun = createGun(camera); // Captura a referência da arma
    //gun.init(scene); // Inicializa a arma com a cena
    // Spawn Lost Soul enemies (they will idle until Area 1 entry)
    createEnemies(scene);
    
    // Mark environment as fully loaded
    environmentLoaded = true;
    console.log('[MAIN] Environment fully loaded, enabling gravity');
}

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    player.update(delta, camera);
    
    // Only apply gravity after environment is fully loaded
    if (environmentLoaded) {
        applyGravity(delta, collidableObjects, camera);
    }
    
    updateCameraMovement(delta, controls);
    updateProjectiles(delta);
    updateArea1(delta);
    updateArea2(delta);
    
    updateEnemies(delta, scene, camera, gun, collidableObjects);
    updateElevator(delta);

    updateTotem(delta, scene, hitbox, 'red', collidableObjects);
    updateKeyAnimation(delta, scene); // Atualiza animação da chave
    updateDoorAnimation(delta, scene); // Atualiza animação da porta
    
    // Update ambient music based on player position
    updateAmbientMusic();
    
    // Ensure ambient music keeps playing
    ambientAudioManager.ensureAmbientMusicPlaying();
    
    // Atualizar sistema de chaves
    keyManager.updateKeys(delta);
    
    // Verificar coletas de chaves
    const totemPosition = totem ? totem.position : null;
    const collectedKeys = keyManager.checkCollisions(camera.position, 1.5, totemPosition);
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
    
    // Reset player to safe position using fixed height
    const safeHeight = CONFIG.INITIAL_PLAYER_HEIGHT;
    camera.position.set(0, safeHeight, 0);
    camera.rotation.set(0, 0, 0);
    
    camera.lookAt(0, safeHeight, -10);
    
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
      console.log('[RESTART] Resetting area 2 central block');
      area2KeyPlatform.userData.shouldRaise = false;
      area2KeyPlatform.userData.isRaised = false;
      
      const centralBlock = area2KeyPlatform.userData.centralBlock;
      const keyInstance = area2KeyPlatform.userData.keyInstance;
      
      if (centralBlock) {
        centralBlock.position.y = CONFIG.AREA_Y_POSITION + 6; // Posição original do bloco
      }
      if (keyInstance && keyInstance.getMesh()) {
        const redKeyTargetY = CONFIG.AREA_Y_POSITION + CONFIG.AREA_HEIGHT/2 + 0.5;
        const finalKeyHeight = redKeyTargetY + 1.0; // Mesma altura da chave vermelha após subir
        keyInstance.getMesh().position.y = finalKeyHeight;
        keyInstance.getMesh().position.x = 0.0;
        keyInstance.getMesh().position.z = -131.0;
        keyInstance.getMesh().visible = false;
        keyInstance.position.y = finalKeyHeight;
        keyInstance.originalY = finalKeyHeight;
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