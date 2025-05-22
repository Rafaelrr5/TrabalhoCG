import * as THREE from '../build/three.module.js';
import { PointerLockControls } from '../build/jsm/controls/PointerLockControls.js';
import { initDefaultBasicLight } from "../libs/util/util.js";

// Constantes de configuração
const MOVE_SPEED = 5;
const PROJECTILE_SPEED = 50;
const PROJECTILE_LIFETIME = 5;
const SHOOT_RATE = 500;
const PROJECTILE_SIZE = 0.5;

let camera, scene, renderer, controls;
let clock = new THREE.Clock(); // Para calcular tempo delta
let projectiles = []; // Array para armazenar projéteis ativos
let collidableObjects = []; // Array de objetos que podem colidir
let moveState = { forward: false, backward: false, left: false, right: false }; // Rastrear teclas pressionadas
let shootInterval; // Intervalo entre tiros

//inicia a aplicação
init();
animate();

// Função principal de inicialização - configura todos os componentes do jogo
function init() {
    setupScene();
    setupCamera();
    setupControls();
    setupLighting();
    createEnvironment();
    setupEventListeners();
}

// Cria a cena principal e o renderizador WebGL
function setupScene() {
    // Cria a cena principal
    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    const container = document.getElementById('webgl-output') || document.body;
    container.appendChild(renderer.domElement);
}

function setupCamera() {
    // Cria câmera perspectiva: 75° FOV, proporção da tela, plano próximo, plano distante
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.y = 10; // Posiciona acima do chão criado
}

// Inicializa controles de pointer lock para movimento de câmera estilo FPS
function setupControls() {
    // Cria controles que prendem o mouse
    controls = new PointerLockControls(camera, document.body);
    // Prende o ponteiro quando clica na tela
    document.addEventListener('click', () => controls.lock());
    // Adiciona os controles à cena
    scene.add(controls.getObject());
}

// Configura iluminação básica para a cena
function setupLighting() {
    // Usa iluminação básica padrão
    initDefaultBasicLight(scene);
}

// Cria o ambiente do jogo (chão e arma)
function createEnvironment() {
    createBase();
    createGun();
}

// Cria o plano do chão que serve como base/piso
function createBase() {
    const geometry = new THREE.PlaneGeometry(500, 500);
    const material = new THREE.MeshPhongMaterial({ color: 0x808080 });
    const plane = new THREE.Mesh(geometry, material);
    // Rotaciona para ficar horizontal (chão)
    plane.rotation.x = -Math.PI / 2; //= 90 graus
    scene.add(plane);
    // Adiciona à detecção de colisão
    collidableObjects.push(plane);
}

// Cria um modelo visual de arma anexado à câmera
function createGun() {
    const gunGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2);
    const gunMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const gun = new THREE.Mesh(gunGeometry, gunMaterial);
    // Rotaciona para apontar para frente
    gun.rotation.x = Math.PI / 2;
    // Posiciona relativo à câmera (inferior-direita da visão)
    gun.position.set(0.5, -0.5, -1.5);
    // Anexa a arma na câmera para mover com o jogador
    camera.add(gun);
}


function setupEventListeners() {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', startShooting);
    document.addEventListener('mouseup', stopShooting);
    window.addEventListener('resize', onWindowResize);
}

// Começa o movimento quando a tecla é pressionada
function onKeyDown(event) {
    switch(event.key.toLowerCase()) {
        case 'w': case 'arrowup': moveState.forward = true; break;
        case 's': case 'arrowdown': moveState.backward = true; break;
        case 'a': case 'arrowleft': moveState.left = true; break;
        case 'd': case 'arrowright': moveState.right = true; break;
    }
}

// Para o movimento quando a tecla é solta
function onKeyUp(event) {
    switch(event.key.toLowerCase()) {
        case 'w': case 'arrowup': moveState.forward = false; break;
        case 's': case 'arrowdown': moveState.backward = false; break;
        case 'a': case 'arrowleft': moveState.left = false; break;
        case 'd': case 'arrowright': moveState.right = false; break;
    }
}

// Inicia o tiro quando o mouse é pressionado
function startShooting() {
    shoot(); // Tiro imediato
    shootInterval = setInterval(shoot, SHOOT_RATE);
}

// Para o tiro quando o mouse é solto
function stopShooting() {
    clearInterval(shootInterval); // Limpa o intervalo de tiro pra não atrapalhar depois
}

// Cria e dispara um projétil da posição da câmera
function shoot() {
    // Cria geometria e material do projétil
    const projectileGeometry = new THREE.SphereGeometry(PROJECTILE_SIZE);
    const projectileMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    
    // Pega direção q a câmera está olhando e cria um vetor
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    // Posiciona projétil na posição da câmera, um pouco abaixo
    projectile.position.copy(camera.position);
    projectile.position.y -= 1;
    
    scene.add(projectile);
    // Armazena projétil com seus dados de movimento e tempo
    projectiles.push({
        mesh: projectile,
        direction: direction.clone(),
        timeAlive: 0 // Tempo que o projétil está vivo
    });
}

// Anima a cena - chamado a cada frame
function animate() {
    requestAnimationFrame(animate);
    
    // Calcula tempo delta
    const delta = clock.getDelta();
    
    // Atualiza câmera e objetos
    updateCameraMovement(delta);
    updateProjectiles(delta);
    
    // Renderiza a cena
    renderer.render(scene, camera);
}

// Atualiza posição da câmera baseado na entrada do usuário
function updateCameraMovement(delta) {
    const distance = MOVE_SPEED * delta;
    
    if (moveState.forward) controls.moveForward(distance);
    if (moveState.backward) controls.moveForward(-distance);
    if (moveState.left) controls.moveRight(-distance);
    if (moveState.right) controls.moveRight(distance);
}

// Atualiza todos os projéteis na cena
function updateProjectiles(delta) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectileData = projectiles[i];
        const projectile = projectileData.mesh;
        
        // Atualiza tempo de vida do projétil
        projectileData.timeAlive += delta;
        
        // Move projétil para frente com velocidade maior
        projectile.position.add(projectileData.direction.clone().multiplyScalar(PROJECTILE_SPEED * delta));
        
        // Remove projétil após tempo definido
        if (projectileData.timeAlive > PROJECTILE_LIFETIME) {
            scene.remove(projectile);
            projectiles.splice(i, 1);
        }
    }
}

// Lida com eventos de redimensionar janela
function onWindowResize() {
    // Atualiza proporção da câmera e tamanho do renderizador
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}