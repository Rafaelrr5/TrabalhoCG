import * as THREE from '../../../build/three.module.js';
import { PointerLockControls } from '../../../build/jsm/controls/PointerLockControls.js';
import { CAMERA_CONFIG } from './config/cameraConfig.js';
import { PLAYER_CONFIG } from './config/playerConfig.js';
import { DEBUG_CONFIG } from './config/debugConfig.js';
import { createWalls, createAreas, updateArea1, updateArea2, isPlayerInArea1, isPlayerInArea2, isPlayerInArea3, isPlayerInArea4 } from '../systems/environment.js';
import { updateHangarDoors } from '../components/hangar.js';
import { createWeaponManager, updateProjectiles } from '../components/weaponManager.js';
import { createEnemies, updateEnemies, enemies, areAllArea4EnemiesDefeated } from '../entities/enemies/enemy.js';
import { setupEventListeners, updateCameraMovement, continuousCameraDebug } from '../systems/controls.js';
import { lightingSystem } from '../systems/lights.js';
import { initHangarLighting, updateHangarLighting } from '../systems/hangarLights.js';
import { applyGravity} from '../systems/collision.js';
import { createHitbox, hitbox, player } from '../entities/player/player.js';
import { updateElevator } from '../systems/elevator.js';
import { keyManager } from '../entities/items/key.js';
import { ambientAudioManager, playerAudioManager, gameAudioManager, audioManager } from '../systems/index.js';
import { updateTotem, updateDoorAnimation, updateKeyAnimation } from '../systems/door.js';
import { updateArea4Totem, updateArea4KeyAnimation, updateArea4WallsAnimation } from '../systems/area4Access.js';
import { updateHangarTotem, updateHangarKeyAnimation, updateHangarDoorsAnimation } from '../systems/hangarAccess.js';
import { loadSky } from '../systems/sky.js';
import { initializeArea4Victory, checkArea4Victory, updateArea4Victory } from '../systems/area4Victory.js';
import { hud, CONTROLS_HTML } from '../ui/hud.js';
import { PostFX } from '../systems/postfx.js';
import { CameraFeel } from '../systems/feel.js';
import { Effects } from '../systems/fx.js';

// Expor keyManager globalmente para debug
window.keyManager = keyManager;

window.playerTakeDamage = function(damage) {
  const before = player.health;
  const isAlive = player.takeDamage(damage);
  if (player.health < before) {
    postfx?.flashDamage(Math.min(0.9, 0.25 + damage / 40));
    feel?.shake(Math.min(0.6, 0.15 + damage / 60));
  }
  
  updatePlayerHealthDisplay();
  
  if (!isAlive) {
    handlePlayerDeath();
  }
};

function updatePlayerHealthDisplay() {
  const healthStatus = player.getHealthStatus();
  hud.setHealth(healthStatus.current, healthStatus.max, PLAYER_CONFIG.PLAYER_IMMORTAL);
  postfx?.setLowHealth(healthStatus.percentage);
}

function handlePlayerDeath() {
  if (controls.isLocked) {
    controls.unlock();
  }
  
  showGameOverPopup();
}

function showVictoryScreen() {
  gameOver = true;
  hud.running = false;
  hud.setObjective('');
  controls.unlock();
  const { kills, time } = hud.stats();
  const overlay = document.createElement('div');
  overlay.id = 'game-over-overlay';
  overlay.className = 'hud-overlay on';
  overlay.innerHTML = `<div><h1 style="color:#ffb03b">Vitória</h1><p>A base foi libertada. As muralhas caíram.</p>
    <div class="hud-statgrid"><div>${kills}<span>Abates</span></div><div>${time}<span>Tempo</span></div></div>
    <button class="hud-btn">Jogar de novo</button></div>`;
  document.body.appendChild(overlay);
  // A full reload is the only reset that also restores the lowered victory walls
  overlay.querySelector('button').addEventListener('click', () => location.reload());
}

function showGameOverPopup() {
  document.getElementById('game-over-overlay')?.remove();
  gameOver = true;
  const { kills, time } = hud.stats();
  const overlay = document.createElement('div');
  overlay.id = 'game-over-overlay';
  overlay.className = 'hud-overlay on';
  overlay.innerHTML = `<div><h1>Você morreu</h1><p>Os demônios tomaram a base.</p>
    <div class="hud-statgrid"><div>${kills}<span>Abates</span></div><div>${time}<span>Tempo</span></div></div>
    <button id="restart-button" class="hud-btn">Tentar de novo</button></div>`;
  document.body.appendChild(overlay);
  const restartButton = overlay.querySelector('#restart-button');
  restartButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    overlay.remove();
    // Areas, doors, keys and enemies are built once at load; a reload is the only
    // reset that restores all of them consistently (the old in-place reset lost the keys)
    location.reload();
  });
  setTimeout(() => restartButton.focus(), 100);
}

function initializeImmortalityIndicator() {
    updatePlayerHealthDisplay();
}

// Update keys display
function updateKeysDisplay() {
    hud.setKeys(keyManager.getCollectedKeys());
}
function showDebugInstructions() {
    // Debug instructions removed
}

let camera, scene, renderer, controls, gun, postfx, feel, fx;
let gameStarted = false; // START was pressed
let gameOver = false;    // death or victory overlay is up
let clock = new THREE.Clock();
let collidableObjects = [];
let currentPlayerArea = 'none'; // Track current area for ambient music
let environmentLoaded = false; // Track if environment is fully loaded
let loadingScreen = null; // Reference to loading screen

init();
animate();

// Create loading screen
function createLoadingScreen() {
    const style = document.createElement('style');
    style.textContent = `
      #loading-overlay { position: fixed; inset: 0; z-index: 99999; display: grid; place-items: center; overflow: hidden;
        background: radial-gradient(ellipse at 50% 120%, #5a0d06 0%, #1a0504 45%, #050101 100%);
        font-family: 'Rajdhani', 'Segoe UI', sans-serif; color: #f2ece4; text-transform: uppercase; letter-spacing: .12em; text-align: center; }
      #loading-overlay::before { content: ''; position: absolute; inset: -50%; background:
        repeating-linear-gradient(0deg, rgba(255,255,255,.025) 0 1px, transparent 1px 3px); animation: lsScan 8s linear infinite; pointer-events: none; }
      #loading-overlay .ls-kicker { font-size: 14px; opacity: .55; letter-spacing: .5em; }
      #loading-overlay h1 { margin: 8px 0 4px; font-size: clamp(48px, 9vw, 112px); line-height: .9; font-weight: 700; color: #ff4a2a;
        text-shadow: 0 0 40px rgba(255,60,20,.55), 0 4px 0 #5a0d06; }
      #loading-overlay .ls-sub { font-size: 16px; opacity: .7; letter-spacing: .3em; }
      #loading-overlay .ls-bar { width: min(460px, 80vw); height: 4px; margin: 34px auto 10px; background: rgba(255,255,255,.08); border-radius: 2px; overflow: hidden; }
      #loading-progress { height: 100%; width: 0; background: linear-gradient(90deg, #ff2d2d, #ffb03b); box-shadow: 0 0 14px #ff5a2a; transition: width .3s ease; }
      #loading-overlay .ls-status { display: flex; justify-content: space-between; width: min(460px, 80vw); margin: 0 auto; font-size: 13px; opacity: .65; }
      #start-button { margin-top: 30px; }
      @keyframes lsScan { to { transform: translateY(3px); } }
    `;
    document.head.appendChild(style);
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.innerHTML = `<div>
        <div class="ls-kicker">Computação Gráfica · UFJF</div>
        <h1>Base Infernal</h1>
        <div class="ls-sub">Rafael &amp; Vinicius</div>
        <div class="ls-bar"><div id="loading-progress"></div></div>
        <div class="ls-status"><span id="loading-text">Inicializando...</span><span id="loading-percent">0%</span></div>
        <div id="start-slot"></div>
        <div class="hud-controls">${CONTROLS_HTML}</div>
      </div>`;
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
  const slot = document.getElementById('start-slot');
  if (!slot) return;
  const startBtn = document.createElement('button');
  startBtn.id = 'start-button';
  startBtn.className = 'hud-btn';
  startBtn.textContent = 'Jogar';
  startBtn.addEventListener('click', () => {
    removeLoadingScreen();
    gameStarted = true;
    hud.show();
    controls.lock();
  });
  slot.appendChild(startBtn);
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
    initializeImmortalityIndicator();
    
    updateLoadingProgress(95, 'Inicializando sistema de armas...');
    createWeaponManager(camera, scene);
    
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
    
    
    window.gameInitialized = true;

    // Test/debug handle, only with ?debug in the URL
    if (new URLSearchParams(location.search).has('debug')) {
        window.__game = { THREE, scene, camera, renderer, controls, player, enemies, keyManager, collidableObjects };
    }
}

function setupScene() {
    scene = new THREE.Scene();
    // area4Victory.js and the weapons read the level collision list from here
    window.collidableObjects = collidableObjects;
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    hud.init();
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
    postfx = new PostFX(renderer, scene, camera);
    feel = new CameraFeel(camera, CAMERA_CONFIG.CAMERA_FOV);
    fx = new Effects(scene, camera);
    addEventListener('game:weapon', (e) => hud.setWeapon(e.detail));
    
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

    const resume = () => { if (gameStarted && !gameOver) controls.lock(); };
    renderer.domElement.addEventListener('click', resume);
    hud.pause.addEventListener('click', resume);
    controls.addEventListener('lock', () => hud.setPaused(false));
    controls.addEventListener('unlock', () => hud.setPaused(gameStarted && !gameOver));
    addEventListener('game:god', updatePlayerHealthDisplay);
    addEventListener('game:victory', showVictoryScreen);
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
    loadSky(scene, 'panorama1Red.jpg'); // resolved under assets/textures/
    
    updateLoadingProgress(65, 'Criando inimigos...');
    createEnemies(scene);
    
    updateLoadingProgress(70, 'Inicializando sistema de vitória...');
    initializeArea4Victory(scene);
    
    environmentLoaded = true;
    console.log('[MAIN] Environment fully loaded, enabling gravity');
}

function animate() {
    requestAnimationFrame(animate);
    
    const delta = Math.min(clock.getDelta(), 0.1); // avoid huge steps after a tab switch
    const paused = gameStarted && !gameOver && !(controls && controls.isLocked);
    hud.update(delta, paused);
    if (paused) {
        if (renderer) postfx.render(0);
        return;
    }
    
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
        
        if (controls.isLocked) updateCameraMovement(delta, controls, collidableObjects);
        feel.update(delta, controls.isLocked);
        fx.update(delta);
        updateEnemies(delta, scene, camera, gun, collidableObjects);
        
        // Verificar vitória na área 4
        // Victory only counts once the player has reached the maze
        if (isPlayerInArea4(camera)) checkArea4Victory(areAllArea4EnemiesDefeated);
        
        // Update ambient music based on player position
        updateAmbientMusic();
        
        // Verificar coletas de chaves
        // null: each totem positions its key itself (passing the area-2 totem teleported every key there)
        const collectedKeys = keyManager.checkCollisions(camera.position, 1.5, null);
        if (collectedKeys.length > 0) {
            updateKeysDisplay(); // Atualizar display das chaves
            const next = {
                red: 'Use a chave vermelha no totem da porta azul',
                yellow: 'Leve a chave amarela até o hangar',
                blue: 'Use a chave azul no totem ao sul da base'
            };
            const names = { red: 'vermelha', yellow: 'amarela', blue: 'azul' };
            collectedKeys.forEach(k => {
                hud.toast(`Chave ${names[k.getType()] || ''} coletada`);
                if (next[k.getType()]) hud.setObjective(next[k.getType()]);
            });
            console.log(`[KEYS] Collected ${collectedKeys.length} key(s):`, collectedKeys.map(k => k.getType()));
            
            // Log adicional para debug
            console.log(`[KEYS] Total keys collected: ${keyManager.getCollectedKeyCount()}`);
            console.log(`[KEYS] Available key types:`, keyManager.getCollectedKeys());
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
    
    // Only do rendering if scene exists and camera position is valid
    if (scene && camera && renderer) {
        continuousCameraDebug(camera, controls, delta);
        feel.apply();
        postfx.render(delta);
        feel.restore();
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    postfx.setSize(window.innerWidth, window.innerHeight);
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
