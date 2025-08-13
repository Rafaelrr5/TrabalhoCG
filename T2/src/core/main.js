import * as THREE from '../../../build/three.module.js';
import { PointerLockControls } from '../../../build/jsm/controls/PointerLockControls.js';
import { CAMERA_CONFIG } from './config/cameraConfig.js';
import { PLAYER_CONFIG } from './config/playerConfig.js';
import { WORLD_CONFIG } from './config/worldConfig.js';
import { DEBUG_CONFIG } from './config/debugConfig.js';
import { createWalls, createAreas, updateArea1, updateArea2, area1KeyPlatform, area2KeyPlatform, isPlayerInArea1, isPlayerInArea2 } from '../systems/environment.js';
import { updateHangarDoors } from '../components/hangar.js';
import { createWeaponManager, updateProjectiles } from '../components/weaponManager.js';
import { createEnemies, updateEnemies, cleanupDeadEnemies, enemies, cleanupAllEnemyProjectiles, resetArea2Activation, resetArea1Activation } from '../entities/enemies/enemy.js';
import { setupEventListeners, updateCameraMovement, continuousCameraDebug } from '../systems/controls.js';
import { lightingSystem } from '../systems/lights.js';
import { applyGravity} from '../systems/collision.js';
import { createHitbox, hitbox, player } from '../entities/player/player.js';
import { updateElevator } from '../systems/elevator.js';
import { keyManager } from '../entities/items/key.js';
import { ambientAudioManager, playerAudioManager, gameAudioManager, audioManager } from '../systems/index.js';
import { updateTotem, updateDoorAnimation, updateKeyAnimation, totem } from '../systems/door.js';
import { updateArea4Totem, updateArea4KeyAnimation, updateArea4WallsAnimation } from '../systems/area4Access.js';
import { loadSky } from '../systems/sky.js';

// Expor keyManager globalmente para debug
window.keyManager = keyManager;

window.playerTakeDamage = function(damage) {
  const isAlive = player.takeDamage(damage);
  
  updatePlayerHealthDisplay();
  
  if (!isAlive) {
    handlePlayerDeath();
  }
};

function updatePlayerHealthDisplay() {
  const healthDisplay = document.getElementById('player-health');
  if (healthDisplay) {
    if (PLAYER_CONFIG.PLAYER_IMMORTAL) {
      healthDisplay.style.display = 'none';
      return;
    }
    
    healthDisplay.style.display = 'block';
    
    const healthStatus = player.getHealthStatus();
    healthDisplay.textContent = `Health: ${healthStatus.current}/${healthStatus.max}`;
    
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

function handlePlayerDeath() {
  if (controls.isLocked) {
    controls.unlock();
  }
  
  showGameOverPopup();
}

function showGameOverPopup() {
  console.log('[RESTART] Creating game over popup');
  
  const existingOverlay = document.getElementById('game-over-overlay');
  if (existingOverlay) {
    document.body.removeChild(existingOverlay);
  }
  
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
    
    if (PLAYER_CONFIG.PLAYER_IMMORTAL) {
        healthDisplay.style.display = 'none';
    } else {
        const healthStatus = player.getHealthStatus();
        healthDisplay.textContent = `Health: ${healthStatus.current}/${healthStatus.max}`;
    }
    
    document.body.appendChild(healthDisplay);
}

function initializeImmortalityIndicator() {
    const immortalityIndicator = document.getElementById('immortality-indicator');
    if (immortalityIndicator) {
        immortalityIndicator.style.display = PLAYER_CONFIG.PLAYER_IMMORTAL ? 'block' : 'none';
    }
}

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
    
    const progressPercent = document.createElement('div');
    progressPercent.id = 'loading-percent';
    progressPercent.style.cssText = `
        font-size: 16px;
        color: #ff0000ff;
        text-shadow: 0 0 5px #ff0000ff;
        margin-top: 10px;
    `;
    progressPercent.textContent = '0%';
    
    const loadingDots = document.createElement('div');
    loadingDots.style.cssText = `
        font-size: 20px;
        color: #ff0000ff;
        margin-top: 20px;
        animation: dots 1.5s infinite;
    `;
    loadingDots.textContent = '...';
    
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

function updateLoadingProgress(percent, text) {
    const progressBar = document.getElementById('loading-progress');
    const progressPercent = document.getElementById('loading-percent');
    const loadingText = document.getElementById('loading-text');
    
    if (progressBar) progressBar.style.width = percent + '%';
    if (progressPercent) progressPercent.textContent = Math.round(percent) + '%';
    if (loadingText && text) loadingText.textContent = text;
}

window.updateLoadingProgress = updateLoadingProgress;

function removeLoadingScreen() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
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
    loadingScreen = createLoadingScreen();
    updateLoadingProgress(0, 'Inicializando sistema...');
    
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
    resetPlayerPosition();
    
    updateLoadingProgress(85, 'Configurando controles...');
    setupControls();
    setupEventListeners(camera, scene);
    
    updateLoadingProgress(90, 'Criando interface...');
    createPlayerHealthHUD();
    createKeysHUD();
    initializeImmortalityIndicator();
    
    updateLoadingProgress(95, 'Inicializando sistema de armas...');
    createWeaponManager(camera, scene);
    
    updateLoadingProgress(100, 'Carregamento concluído!');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    removeLoadingScreen();
    
    setTimeout(() => {
        updateKeysDisplay();
    }, 100);
    
    keyManager.onInventoryChange((inventoryData) => {
        const { action, keyType, collectedKeys, collectedKeyCount } = inventoryData;
        
        updateKeysDisplay();
        
        if (DEBUG_CONFIG.DEBUG_CONSOLE_LOGS) {
            console.log(`[MAIN] Inventory changed - Action: ${action}, Key: ${keyType}, Total: ${collectedKeyCount}`);
        }
    });
    
    window.addEventListener('keyRemoved', () => {
        updateKeysDisplay();
    });
    
    setTimeout(() => {
        console.log('[MAIN] Force starting ambient music...');
        ambientAudioManager.forcePlayAreaMusic('none');
    }, 500);
    
    window.gameInitialized = true;
}

function setupScene() {
    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    const container = document.getElementById('webgl-output') || document.body;
    container.appendChild(renderer.domElement);
}

function setupCamera() {
    camera = new THREE.PerspectiveCamera(CAMERA_CONFIG.CAMERA_FOV, window.innerWidth/window.innerHeight, CAMERA_CONFIG.CAMERA_NEAR, CAMERA_CONFIG.CAMERA_FAR);
    camera.position.y = CAMERA_CONFIG.CAMERA_HEIGHT;
    window.listener = new THREE.AudioListener();
    
    const originalSetMasterVolume = window.listener.setMasterVolume;
    window.listener.setMasterVolume = function(value) {
        if (isFinite(value) && value >= 0 && value <= 1) {
            originalSetMasterVolume.call(this, value);
        }
    };
    
    const originalUpdateMatrixWorld = window.listener.updateMatrixWorld;
    window.listener.updateMatrixWorld = function(force) {
        try {
            if (this.parent && this.parent.position) {
                const pos = this.parent.position;
                if (!isFinite(pos.x) || !isFinite(pos.y) || !isFinite(pos.z)) {
                    pos.set(0, PLAYER_CONFIG.INITIAL_PLAYER_HEIGHT || 7, 0);
                }
            }
            originalUpdateMatrixWorld.call(this, force);
        } catch (error) {
            console.warn('[AUDIO] AudioListener update error:', error.message);
        }
    };
    
    camera.add(window.listener);
    
    console.log('[MAIN] Initializing audio systems...');
    ambientAudioManager.init(window.listener);
    playerAudioManager.init(window.listener);
    gameAudioManager.init(window.listener);
}

function resetPlayerPosition() {
    const safeHeight = PLAYER_CONFIG.INITIAL_PLAYER_HEIGHT;   
    camera.position.set(0, safeHeight, 0);
    player.resetPosition();
}

function setupControls() {
    controls = new PointerLockControls(camera, document.body);

    renderer.domElement.addEventListener('click', () => {
        const gameOverPopup = document.getElementById('game-over-overlay');
        if (!gameOverPopup) {
            controls.lock();
        }
    });
    scene.add(controls.getObject());
    
    window.addEventListener('resize', onWindowResize);
}

async function createEnvironment() {
    keyManager.clearAll();
    
    updateLoadingProgress(45, 'Criando paredes e chão...');
    createWalls(scene, collidableObjects);
    
    updateLoadingProgress(50, 'Carregando áreas do jogo...');
    await createAreas(scene, collidableObjects);
    
    updateLoadingProgress(55, 'Carregando céu...');
    // Load sky
    loadSky(scene, 'panorama1Red.jpg');
    
    updateLoadingProgress(65, 'Criando inimigos...');
    createEnemies(scene);
    
    environmentLoaded = true;
    console.log('[MAIN] Environment fully loaded, enabling gravity');
}

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    // Validar valores da câmera para evitar problemas de áudio
    if (camera && camera.position) {
        const pos = camera.position;
        if (!isFinite(pos.x)) pos.x = 0;
        if (!isFinite(pos.y)) pos.y = PLAYER_CONFIG.INITIAL_PLAYER_HEIGHT || 7;
        if (!isFinite(pos.z)) pos.z = 0;
    }
    
    // Only proceed with camera/controls dependent updates if they are initialized
    if (camera && controls) {
        player.update(delta, camera);
        
        // Only apply gravity after environment is fully loaded
        if (environmentLoaded) {
            applyGravity(delta, collidableObjects, camera);
        }
        
        updateCameraMovement(delta, controls);
        updateEnemies(delta, scene, camera, gun, collidableObjects);
        
        // Update ambient music based on player position
        updateAmbientMusic();
        
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
        
        // Sistema de acesso ao hangar baseado em proximidade (área 3)
        updateHangarDoors(delta, camera, scene, collidableObjects, keyManager);
    }
    
    // These updates don't require camera/controls, so they can run always
    updateProjectiles(delta);
    updateArea1(delta);
    updateArea2(delta);
    updateElevator(delta);
    updateTotem(delta, scene, hitbox, 'red', collidableObjects); // Totem da área 2 (requer chave vermelha)
    updateArea4Totem(delta, scene, hitbox, collidableObjects); // Totem da área 4 (chave verde)
    updateKeyAnimation(delta, scene); // Atualiza animação da chave (área 2)
    updateDoorAnimation(delta, scene); // Atualiza animação da porta (área 2)
    updateArea4KeyAnimation(delta, scene); // Atualiza animação da chave (área 4)
    updateArea4WallsAnimation(delta, scene); // Atualiza animação dos muros (área 4)
    
    // Ensure ambient music keeps playing
    ambientAudioManager.ensureAmbientMusicPlaying();
    
    // Atualizar sistema de chaves
    keyManager.updateKeys(delta);
    
    // Only do rendering if scene exists and camera position is valid
    if (scene && camera && renderer) {
        continuousCameraDebug(camera, controls, delta);
        renderer.render(scene, camera);
    }
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
    const safeHeight = PLAYER_CONFIG.INITIAL_PLAYER_HEIGHT;
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
        platform.position.y = WORLD_CONFIG.AREA_Y_POSITION - 2;
      }
      if (keyInstance && keyInstance.getMesh()) {
        keyInstance.getMesh().position.y = WORLD_CONFIG.AREA_Y_POSITION - 1.0;
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
        centralBlock.position.y = WORLD_CONFIG.AREA_Y_POSITION + 6; // Posição original do bloco
      }
      if (keyInstance && keyInstance.getMesh()) {
        const redKeyTargetY = WORLD_CONFIG.AREA_Y_POSITION + WORLD_CONFIG.AREA_HEIGHT/2 + 0.5;
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

// Debug function to test hangar door animation
window.testHangarDoors = function() {
  const area3 = scene.getObjectByName('Area3');
  if (area3) {
    const hangar = area3.getObjectByName('HangarModel');
    if (hangar && hangar.userData.doors) {
      console.log('[DEBUG] Testing hangar door animation...');
      const shouldOpen = !hangar.userData.doorsOpen;
      
      // Import the animation function dynamically
      import('../systems/environment.js').then(module => {
        module.animateHangarDoors(hangar, shouldOpen);
      });
    } else {
      console.log('[DEBUG] Hangar model or doors not found');
    }
  } else {
    console.log('[DEBUG] Area3 not found');
  }
};

// Debug function to test dynamic texture application
window.testDynamicTextures = function() {
  console.log('[DEBUG] Testando aplicação dinâmica de texturas...');
  
  // Import the dynamic texture system
  import('../systems/dynamicTextures.js').then(module => {
    const { DynamicTextureApplicator, QuickTexture } = module;
    
    // Criar instância do aplicador
    const textureApplicator = new DynamicTextureApplicator(scene);
    
    // Aplicar textura de metal nos blocos da área 2
    QuickTexture.applyMetal(scene, 'MetalBlocks', 'caixametal.jpg')
      .then(success => {
        if (success) {
          console.log('[DEBUG] ✅ Textura de metal aplicada nos blocos!');
        } else {
          console.log('[DEBUG] ❌ Falha ao aplicar textura de metal');
        }
      });
      
    // Aplicar texturas em objetos por critério
    textureApplicator.applyTextureByCriteria(
      { userData: { isBlock: true } },
      'caixametal.jpg',
      { materialType: 'metal', roughness: 0.2, metalness: 0.95 }
    ).then(count => {
      console.log(`[DEBUG] Texturas aplicadas em ${count} blocos por critério`);
    });
    
    // Mostrar informações sobre texturas aplicadas
    setTimeout(() => {
      const info = textureApplicator.getAppliedTexturesInfo();
      console.log('[DEBUG] Informações sobre texturas aplicadas:', info);
    }, 2000);
  });
};

// Function to demonstrate different texture applications
window.applyTextureVariations = function() {
  console.log('[DEBUG] Aplicando variações de texturas...');
  
  import('../systems/dynamicTextures.js').then(module => {
    const { DynamicTextureApplicator } = module;
    const applicator = new DynamicTextureApplicator(scene);
    
    // Lista de variações de textura para testar
    const textureVariations = [
      { name: 'MetalBlocks', texture: 'caixametal.jpg', type: 'metal' },
      // Adicione mais variações conforme necessário
    ];
    
    textureVariations.forEach(async (variation, index) => {
      setTimeout(async () => {
        try {
          const success = await applicator.applyTextureByName(
            variation.name, 
            variation.texture, 
            { 
              materialType: variation.type,
              roughness: 0.2 + (index * 0.2),
              metalness: 0.9 - (index * 0.1)
            }
          );
          
          if (success) {
            console.log(`[DEBUG] ✅ Variação ${index + 1} aplicada: ${variation.texture}`);
          }
        } catch (error) {
          console.log(`[DEBUG] ❌ Erro na variação ${index + 1}:`, error);
        }
      }, index * 1000);
    });
  });
};

// Initialize dynamic texture system on game start
window.initializeDynamicTextures = function() {
  if (!scene) {
    console.log('[DEBUG] Cena não está pronta ainda');
    return;
  }
  
  import('../systems/dynamicTextures.js').then(module => {
    const { getGlobalTextureApplicator } = module;
    const applicator = getGlobalTextureApplicator(scene);
    
    // Aplicar texturas padrão
    applicator.applyDefaultTextures().then(() => {
      console.log('[DEBUG] ✅ Sistema de texturas dinâmicas inicializado');
    });
  });
};
