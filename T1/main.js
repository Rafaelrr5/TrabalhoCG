// ============================================================================
// ARQUIVO PRINCIPAL - COORDENA TODOS OS MÓDULOS
// ============================================================================
import * as THREE from '../build/three.module.js';
import { PointerLockControls } from '../build/jsm/controls/PointerLockControls.js';
import { initDefaultBasicLight } from "../libs/util/util.js";

// Importa módulos do jogo
import { CONFIG } from './config.js';
import { createWalls, createAreas } from './environment.js';
import { createGun, updateProjectiles } from './weapon.js';
import { setupEventListeners, updateCameraMovement } from './controls.js';
import { applyGravity, createHitbox, hitbox, updateHitbox } from './player.js';

// ============================================================================
// VARIÁVEIS GLOBAIS PRINCIPAIS
// ============================================================================
let camera, scene, renderer, controls;
let clock = new THREE.Clock();
let collidableObjects = [];

// ============================================================================
// INICIALIZAÇÃO PRINCIPAL
// ============================================================================
init();
animate();

// ============================================================================
// FUNÇÕES DE INICIALIZAÇÃO
// ============================================================================

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

// Cria a cena principal e o renderizador WebGL
function setupScene() {
    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    const container = document.getElementById('webgl-output') || document.body;
    container.appendChild(renderer.domElement);
}

// Configura a câmera do jogo
function setupCamera() {
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.y = CONFIG.CAMERA_HEIGHT;
}

function resetPlayerPosition() {
    const startHeight = CONFIG.CAMERA_HEIGHT + 5;
    camera.position.set(0, startHeight, 0);

    if(hitbox) {
        hitbox.position.set(0, startHeight, 0);
        hitbox.position.y -= 1.0;
    }
}

// Inicializa controles de pointer lock para movimento de câmera estilo FPS
function setupControls() {
    controls = new PointerLockControls(camera, document.body);
    document.addEventListener('click', () => controls.lock());
    scene.add(controls.getObject());
    
    // Adiciona handler de resize específico do main.js
    window.addEventListener('resize', onWindowResize);
}

// Configura iluminação básica para a cena
function setupLighting() {
    initDefaultBasicLight(scene);
}

// ============================================================================
// CRIAÇÃO DO AMBIENTE
// ============================================================================

// Cria o ambiente do jogo (chão, paredes, áreas e arma)
function createEnvironment() {
    createWalls(scene, collidableObjects);
    createAreas(scene);
    createGun(camera);
}

// ============================================================================
// LOOP PRINCIPAL
// ============================================================================

// Loop principal de animação
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    updateHitbox(camera);
    applyGravity(delta, collidableObjects, camera);
    updateCameraMovement(delta, controls);
    updateProjectiles(delta, scene);
    
    renderer.render(scene, camera);
}

// Lida com redimensionamento da janela
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}