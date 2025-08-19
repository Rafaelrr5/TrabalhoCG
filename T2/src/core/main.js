import * as THREE from '../../../build/three.module.js';
import { PointerLockControls } from '../../../build/jsm/controls/PointerLockControls.js';
import { CAMERA_CONFIG } from './config/cameraConfig.js';
import { PLAYER_CONFIG } from './config/playerConfig.js';
import { WORLD_CONFIG } from './config/worldConfig.js';
import { DEBUG_CONFIG } from './config/debugConfig.js';
import { createWalls, createAreas, updateArea1, updateArea2, area1KeyPlatform, area2KeyPlatform, isPlayerInArea1, isPlayerInArea2, isPlayerInArea3 } from '../systems/environment.js';
import { updateHangarDoors } from '../components/hangar.js';
import { createWeaponManager, updateProjectiles } from '../components/weaponManager.js';
import { createEnemies, updateEnemies, cleanupDeadEnemies, enemies, cleanupAllEnemyProjectiles, resetArea2Activation, resetArea1Activation, resetArea3Activation, areAllArea4EnemiesDefeated } from '../entities/enemies/enemy.js';
import { setupEventListeners, updateCameraMovement, continuousCameraDebug } from '../systems/controls.js';
import { lightingSystem } from '../systems/lights.js';
import { initHangarLighting, updateHangarLighting, resetHangarLighting } from '../systems/hangarLights.js';
import { applyGravity} from '../systems/collision.js';
import { createHitbox, hitbox, player } from '../entities/player/player.js';
import { updateElevator } from '../systems/elevator.js';
import { keyManager } from '../entities/items/key.js';
import { ambientAudioManager, playerAudioManager, gameAudioManager, audioManager } from '../systems/index.js';
import { updateTotem, updateDoorAnimation, updateKeyAnimation, totem } from '../systems/door.js';
import { updateArea4Totem, updateArea4KeyAnimation, updateArea4WallsAnimation } from '../systems/area4Access.js';
import { updateHangarTotem, updateHangarKeyAnimation, updateHangarDoorsAnimation } from '../systems/hangarAccess.js';
import { loadSky } from '../systems/sky.js';
import { initializeArea4Victory, checkArea4Victory, updateArea4Victory, resetArea4Victory } from '../systems/area4Victory.js';
import { multiplayerClient, connectToMultiplayer, disconnectFromMultiplayer, isMultiplayerConnected, getOtherPlayerCount } from '../systems/multiplayer.js';
import { MULTIPLAYER_CONFIG } from './config/multiplayerConfig.js';

// Expor keyManager globalmente para debug
window.keyManager = keyManager;

// Expor enemies globalmente para debug do multiplayer
window.enemies = enemies;

window.playerTakeDamage = function(damage) {
  const isAlive = player.takeDamage(damage);
  
  updatePlayerHealthDisplay();
  
  if (!isAlive) {
    handlePlayerDeath();
    
    // Sincronizar morte com multiplayer
    if (multiplayerClient && multiplayerClient.isConnected()) {
      multiplayerClient.sendPlayerDied(camera.position);
    }
  }
};

function updatePlayerHealthDisplay() {
  const healthStatus = player.getHealthStatus();
  const healthPercentage = healthStatus.percentage;
  
  // Atualizar a barra de vida 3D - sempre visível
  const healthBarGroup = camera.getObjectByName('PlayerHealthBar');
  if (healthBarGroup) {
    healthBarGroup.visible = true;
    
    const healthBarFill = healthBarGroup.getObjectByName('PlayerHealthBarFill');
    if (healthBarFill) {
      // Atualizar escala da barra baseada na porcentagem de vida
      healthBarFill.scale.x = Math.max(0.01, healthPercentage); // Mínimo para ser visível
      
      // Mudar cor baseada na porcentagem de vida
      if (healthPercentage < 0.3) {
        healthBarFill.material.color.setHex(0xff0000); // Vermelho
      } else if (healthPercentage < 0.6) {
        healthBarFill.material.color.setHex(0xffaa00); // Laranja
      } else {
        healthBarFill.material.color.setHex(0x00ff00); // Verde
      }
    }
  }
  
  const healthText = document.getElementById('player-health-text');
  if (healthText) {
    healthText.style.display = 'block';
    if (PLAYER_CONFIG.PLAYER_IMMORTAL) {
    } else {
      healthText.textContent = `${healthStatus.current}/${healthStatus.max}`;
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
    // Criar um grupo para a barra de vida 3D
    const healthBarGroup = new THREE.Group();
    healthBarGroup.name = 'PlayerHealthBar';
    
    // Configurações da barra
    const barWidth = 0.8;
    const barHeight = 0.06;
    const barDepth = 0.01;
    
    // Background da barra (preto)
    const bgGeometry = new THREE.BoxGeometry(barWidth, barHeight, barDepth);
    const bgMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000, 
        transparent: true, 
        opacity: 0.8 
    });
    const healthBarBg = new THREE.Mesh(bgGeometry, bgMaterial);
    
    // Preenchimento da barra (verde inicialmente)
    const fillGeometry = new THREE.BoxGeometry(barWidth, barHeight * 0.8, barDepth * 1.1);
    const fillMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const healthBarFill = new THREE.Mesh(fillGeometry, fillMaterial);
    healthBarFill.name = 'PlayerHealthBarFill';
    
    // Posicionar no canto superior esquerdo da tela
    healthBarGroup.position.set(-2.6, 1.4, -2);
    
    healthBarGroup.add(healthBarBg);
    healthBarGroup.add(healthBarFill);
    
    // Adicionar à câmera para que siga o jogador
    camera.add(healthBarGroup);
    
    // Criar texto para mostrar valores numéricos
    const healthDisplay = document.createElement('div');
    healthDisplay.id = 'player-health-text';
    healthDisplay.style.cssText = `
        position: fixed;
        top: 50px;
        left: 20px;
        color: white;
        font-size: 14px;
        font-weight: bold;
        z-index: 1000;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        font-family: Arial, sans-serif;
    `;
    
    healthBarGroup.visible = true;
    
    document.body.appendChild(healthDisplay);
}

function initializeImmortalityIndicator() {
    const immortalityIndicator = document.getElementById('immortality-indicator');
    if (immortalityIndicator) {
        immortalityIndicator.style.display = PLAYER_CONFIG.PLAYER_IMMORTAL ? 'block' : 'none';
    }
    
    // Manter a barra de vida sempre visível, apenas atualizar o texto
    updatePlayerHealthDisplay();
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

    // Interface de conexão multiplayer
    const multiplayerInfo = document.createElement('div');
    multiplayerInfo.style.cssText = `
        position: absolute;
        bottom: 120px;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
        color: #ff0000;
        font-size: 14px;
        line-height: 1.5;
    `;
    multiplayerInfo.innerHTML = `
        <p><strong>MULTIPLAYER:</strong></p>
        <p>Conecte-se para jogar com até 2 jogadores</p>
        <p>Servidor: ${MULTIPLAYER_CONFIG.DEFAULT_SERVER_URL}</p>
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
    overlay.appendChild(multiplayerInfo);
    
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
// At the end of loading, show Start button for player to enter the game
function showStartButton() {
  const overlay = document.getElementById('loading-overlay');
  if (!overlay) return;

  const startBtn = document.createElement('button');
  startBtn.id = 'start-button';
  startBtn.textContent = 'START';
  startBtn.style.cssText = `
    margin-top: 20px;
    padding: 15px 30px;
    font-size: 20px;
    color: white;
    background-color: #28a745;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    outline: none;
    z-index: 100001;
  `;
  startBtn.addEventListener('click', () => {
    removeLoadingScreen();
    if (controls && controls.lock) controls.lock();
  });
  overlay.appendChild(startBtn);
  startBtn.focus();
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
    initHangarLighting(scene);
    
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
    
    updateLoadingProgress(97, 'Inicializando multiplayer...');
    initializeMultiplayer();
    
    updateLoadingProgress(100, 'Carregamento concluído!');
    
  await new Promise(resolve => setTimeout(resolve, 500));
  // Show start button to let player enter the game
  showStartButton();
    
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

function initializeMultiplayer() {
    // Inicializar variável de controle de atualização do status
    window.lastMultiplayerStatusUpdate = 0;
    
    // Configurar callbacks do multiplayer
    multiplayerClient.onPlayerJoined = (player) => {
        console.log(`[MULTIPLAYER] Jogador ${player.id} entrou no jogo`);
        console.log(`[MULTIPLAYER] Dados do jogador:`, player);
        
        // Atualizar status imediatamente
        updateMultiplayerStatus();
        
        // Atualizar novamente após um pequeno delay para garantir sincronização
        setTimeout(updateMultiplayerStatus, 100);
    };
    
    multiplayerClient.onPlayerLeft = (playerId) => {
        console.log(`[MULTIPLAYER] Jogador ${playerId} saiu do jogo`);
        
        // Atualizar status imediatamente
        updateMultiplayerStatus();
        
        // Atualizar novamente após um pequeno delay para garantir sincronização
        setTimeout(updateMultiplayerStatus, 100);
    };
    
    multiplayerClient.onPlayerUpdate = (data) => {
        // Atualizações de outros jogadores são tratadas automaticamente
        if (MULTIPLAYER_CONFIG.DEBUG_LOG_MESSAGES) {
            console.log(`[MULTIPLAYER] Atualização do jogador ${data.playerId}`);
        }
    };
    
    multiplayerClient.onProjectileFired = (projectile) => {
        // Criar projétil visual para outros jogadores
        createOtherPlayerProjectile(projectile);
    };
    
    multiplayerClient.onEnemyHit = (data) => {
        // Sincronizar hits em inimigos
        console.log(`[MULTIPLAYER] Jogador ${data.playerId} acertou inimigo ${data.enemyId} com ${data.damage} de dano`);
        
        // Aplicar dano ao inimigo localmente
        if (enemies && enemies.length > 0) {
            const enemy = enemies.find(e => e.id === data.enemyId);
            if (enemy) {
                console.log(`[MULTIPLAYER] Aplicando dano ${data.damage} ao inimigo ${data.enemyId}`);
                console.log(`[MULTIPLAYER] Vida atual do inimigo: ${enemy.currentHealth}/${enemy.maxHealth}`);
                
                enemy.takeDamage(data.damage);
                
                // Verificar se o inimigo morreu
                if (enemy.currentHealth <= 0) {
                    console.log(`[MULTIPLAYER] Inimigo ${data.enemyId} morreu por dano multiplayer`);
                    enemy.removeFromScene();
                    
                    // Remover do array enemies também
                    const enemyIndex = enemies.findIndex(e => e.id === data.enemyId);
                    if (enemyIndex !== -1) {
                        enemies.splice(enemyIndex, 1);
                        console.log(`[MULTIPLAYER] Inimigo ${data.enemyId} removido do array enemies. Total restante: ${enemies.length}`);
                    }
                } else {
                    console.log(`[MULTIPLAYER] Inimigo ${data.enemyId} sobreviveu com ${enemy.currentHealth} de vida`);
                }
            } else {
                console.warn(`[MULTIPLAYER] Inimigo ${data.enemyId} não encontrado para aplicar dano`);
                console.log(`[MULTIPLAYER] Inimigos disponíveis:`, enemies.map(e => ({ id: e.id, health: e.currentHealth })));
            }
        } else {
            console.warn(`[MULTIPLAYER] Array de inimigos vazio ou não definido`);
        }
    };
    
    multiplayerClient.onKeyCollected = (data) => {
        // Sincronizar coleta de chaves
        if (MULTIPLAYER_CONFIG.DEBUG_LOG_MESSAGES) {
            console.log(`[MULTIPLAYER] Jogador ${data.playerId} coletou chave ${data.keyType}`);
        }
    };
    
    multiplayerClient.onPlayerDied = (data) => {
        // Sincronizar morte de jogadores
        if (MULTIPLAYER_CONFIG.DEBUG_LOG_MESSAGES) {
            console.log(`[MULTIPLAYER] Jogador ${data.playerId} morreu`);
        }
    };
    
    multiplayerClient.onPlayerRespawned = (data) => {
        // Sincronizar respawn de jogadores
        if (MULTIPLAYER_CONFIG.DEBUG_LOG_MESSAGES) {
            console.log(`[MULTIPLAYER] Jogador ${data.playerId} respawnou`);
        }
    };
    
    // Tentar conectar automaticamente
    console.log('[MULTIPLAYER] Tentando conectar ao servidor...');
    connectToMultiplayer();
    
    // Criar interface de status multiplayer
    createMultiplayerStatusUI();
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
    
    // Expor variáveis globalmente para o multiplayer
    window.scene = scene;
    window.renderer = renderer;
    console.log('[MULTIPLAYER] Scene e Renderer expostos globalmente');
}

function setupCamera() {
    camera = new THREE.PerspectiveCamera(CAMERA_CONFIG.CAMERA_FOV, window.innerWidth/window.innerHeight, CAMERA_CONFIG.CAMERA_NEAR, CAMERA_CONFIG.CAMERA_FAR);
    camera.position.y = CAMERA_CONFIG.CAMERA_HEIGHT;
    
    // Expor câmera globalmente para o multiplayer
    window.camera = camera;
    console.log('[MULTIPLAYER] Camera exposta globalmente');
    
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
    
    updateLoadingProgress(70, 'Inicializando sistema de vitória...');
    initializeArea4Victory(scene);
    
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
        
        updateCameraMovement(delta, controls, collidableObjects);
        updateEnemies(delta, scene, camera, gun, collidableObjects);
        
        // Verificar vitória na área 4
        checkArea4Victory(areAllArea4EnemiesDefeated);
        
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
            
            // Sincronizar coleta de chaves com multiplayer
            if (multiplayerClient && multiplayerClient.isConnected()) {
                collectedKeys.forEach(key => {
                    multiplayerClient.sendKeyCollected(key.getType(), camera.position);
                });
            }
        }
        
        // Sistema de acesso ao hangar baseado em proximidade (área 3)
        updateHangarDoors(delta, camera, scene, collidableObjects, keyManager);
        
        // Sistema de iluminação do hangar
        updateHangarLighting(delta, camera);
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
    updateHangarTotem(delta, scene, hitbox, collidableObjects); // Sistema de acesso ao hangar com totem
    updateHangarKeyAnimation(delta, scene); // Animação da chave do hangar
    updateHangarDoorsAnimation(delta, scene, collidableObjects); // Animação das portas do hangar
    
    // Sistema de vitória da área 4
    updateArea4Victory(delta);
    
    // Ensure ambient music keeps playing
    ambientAudioManager.ensureAmbientMusicPlaying();
    
    // Atualizar sistema de chaves
    keyManager.updateKeys(delta);
    
    // Atualizar multiplayer
    if (multiplayerClient && multiplayerClient.isConnected()) {
        multiplayerClient.updateOtherPlayers(delta);
        
        // Enviar atualizações do jogador
        const playerHealth = player.getHealthStatus();
        multiplayerClient.sendPlayerUpdate(
            camera.position,
            camera.rotation,
            playerHealth.current,
            'chaingun' // TODO: Pegar arma atual do weapon manager
        );
        
        // Atualizar status multiplayer a cada segundo
        if (Math.floor(Date.now() / 1000) !== Math.floor(window.lastMultiplayerStatusUpdate / 1000)) {
            updateMultiplayerStatus();
            window.lastMultiplayerStatusUpdate = Date.now();
        }
    }
    
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
  } else if (isPlayerInArea3(camera)) {
    newArea = 'area3';
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
    
    // Sincronizar respawn com multiplayer
    if (multiplayerClient && multiplayerClient.isConnected()) {
      multiplayerClient.sendPlayerRespawned(camera.position);
    }
    
    // Reset iluminação do hangar
    resetHangarLighting();
    
    // Reset sistema de vitória da área 4
    resetArea4Victory();
    
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
    resetArea3Activation();
    
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

// Debug functions for hangar lighting system
window.testHangarLighting = function() {
  import('../systems/hangarLights.js').then(module => {
    const { getHangarLightingStatus } = module;
    const status = getHangarLightingStatus();
    console.log('[DEBUG] Status da iluminação do hangar:', status);
  });
};

window.resetHangarLights = function() {
  import('../systems/hangarLights.js').then(module => {
    const { resetHangarLighting } = module;
    resetHangarLighting();
    console.log('[DEBUG] Iluminação do hangar resetada');
  });
};

window.configureHangarLighting = function(hangarIntensity = 2.5, ambientIntensity = 0.4, transitionSpeed = 2.0) {
  import('../systems/hangarLights.js').then(module => {
    const { hangarLightingSystem } = module;
    hangarLightingSystem.setHangarLightIntensity(hangarIntensity);
    hangarLightingSystem.setHangarAmbientIntensity(ambientIntensity);
    hangarLightingSystem.setTransitionSpeed(transitionSpeed);
    console.log(`[DEBUG] Configuração da iluminação do hangar atualizada:
    - Intensidade do hangar: ${hangarIntensity}
    - Intensidade ambiente: ${ambientIntensity}
    - Velocidade de transição: ${transitionSpeed}`);
  });
};

// Funções auxiliares do multiplayer
function createMultiplayerStatusUI() {
    const statusDiv = document.createElement('div');
    statusDiv.id = 'multiplayer-status';
    statusDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        z-index: 1000;
        min-width: 200px;
    `;
    
    statusDiv.innerHTML = `
        <div><strong>MULTIPLAYER</strong></div>
        <div id="connection-status">Conectando...</div>
        <div id="player-count">Jogadores: 0/2</div>
        <div id="server-info">Servidor: ${MULTIPLAYER_CONFIG.DEFAULT_SERVER_URL}</div>
        <button id="connect-btn" style="margin-top: 5px; padding: 3px 8px; font-size: 10px;">Conectar</button>
        <button id="disconnect-btn" style="margin-top: 5px; margin-left: 5px; padding: 3px 8px; font-size: 10px;">Desconectar</button>
    `;
    
    document.body.appendChild(statusDiv);
    
    // Configurar botões
    const connectBtn = document.getElementById('connect-btn');
    const disconnectBtn = document.getElementById('disconnect-btn');
    
    connectBtn.addEventListener('click', () => {
        if (!multiplayerClient.isConnected()) {
            connectToMultiplayer();
        }
    });
    
    disconnectBtn.addEventListener('click', () => {
        if (multiplayerClient.isConnected()) {
            disconnectFromMultiplayer();
        }
    });
    
    // Atualizar status inicial
    updateMultiplayerStatus();
}

function updateMultiplayerStatus() {
    const statusDiv = document.getElementById('multiplayer-status');
    if (!statusDiv) return;
    
    const connectionStatus = document.getElementById('connection-status');
    const playerCount = document.getElementById('player-count');
    
    if (multiplayerClient.isConnected()) {
        connectionStatus.textContent = 'Conectado';
        connectionStatus.style.color = '#00ff00';
        const otherCount = getOtherPlayerCount();
        playerCount.textContent = `Jogadores: ${otherCount + 1}/2`;
        
        // Log detalhado para debug
        console.log(`[MULTIPLAYER UI] Status atualizado: ${otherCount + 1}/2 jogadores`);
        console.log(`[MULTIPLAYER UI] Outros jogadores:`, multiplayerClient.getOtherPlayers());
    } else {
        connectionStatus.textContent = 'Desconectado';
        connectionStatus.style.color = '#ff0000';
        playerCount.textContent = 'Jogadores: 0/2';
    }
}

function createOtherPlayerProjectile(projectile) {
    // Criar projétil visual para outros jogadores
    const geometry = new THREE.SphereGeometry(0.1, 8, 6);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0xff0000, 
        transparent: true, 
        opacity: 0.8 
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(projectile.position.x, projectile.position.y, projectile.position.z);
    mesh.name = `OtherProjectile_${projectile.id}`;
    
    if (scene) {
        scene.add(mesh);
        
        // Animar projétil
        const direction = new THREE.Vector3(projectile.direction.x, projectile.direction.y, projectile.direction.z);
        const speed = 50;
        
        // Remover projétil após um tempo
        setTimeout(() => {
            if (scene && mesh.parent) {
                scene.remove(mesh);
                mesh.geometry.dispose();
                mesh.material.dispose();
            }
        }, MULTIPLAYER_CONFIG.PROJECTILE_LIFETIME);
    }
}

// Funções globais para debug do multiplayer
window.connectToMultiplayer = function(serverUrl = null) {
    connectToMultiplayer(serverUrl);
};

window.disconnectFromMultiplayer = function() {
    disconnectFromMultiplayer();
};

window.getMultiplayerStatus = function() {
    return {
        connected: multiplayerClient.isConnected(),
        playerId: multiplayerClient.getPlayerId(),
        otherPlayers: multiplayerClient.getOtherPlayers(),
        otherPlayerCount: multiplayerClient.getOtherPlayerCount()
    };
};

// Função de debug para verificar status dos inimigos
window.debugEnemies = function() {
    console.log('=== DEBUG INIMIGOS ===');
    console.log('Total de inimigos:', enemies.length);
    console.log('IDs dos inimigos:', enemies.map(e => e.id));
    console.log('Status dos inimigos:', enemies.map(e => ({
        id: e.id,
        health: e.currentHealth,
        maxHealth: e.maxHealth,
        isAlive: e.isAlive,
        area: e.area,
        enemyType: e.enemyType
    })));
    console.log('=====================');
};
