import * as THREE from '../../../build/three.module.js';
import { PointerLockControls } from '../../../build/jsm/controls/PointerLockControls.js';
import { createLightSphere, initDefaultBasicLight } from "../../../libs/util/util.js";

// Importa módulos do jogo
import { CONFIG } from './config.js';
import { createWalls, createAreas, updateArea1 } from '../systems/environment.js';
import { createGun, updateProjectiles } from '../components/weapon.js';
import { createEnemies, updateEnemies } from '../entities/enemies/enemy.js';
import { setupEventListeners, updateCameraMovement } from '../systems/controls.js';
import { applyGravity } from '../systems/collision.js';
import { createHitbox, hitbox, updateHitbox } from '../entities/player/player.js';
import { updateELevator } from '../systems/elevator.js';

let camera, scene, renderer, controls;
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
    light.position.set(-481.86, 300, 458.45);
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
    createGun(camera);
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
    // Update enemy behavior
    updateEnemies(delta, scene, camera);
    updateELevator(delta);
    
    renderer.render(scene, camera);
}

// Lida com redimensionamento da janela
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}