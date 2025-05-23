import * as THREE from '../build/three.module.js';
import { PointerLockControls } from '../build/jsm/controls/PointerLockControls.js';
import {
    initDefaultBasicLight,
    setDefaultMaterial,
    InfoBox,
    createGroundPlaneXZ} from "../libs/util/util.js";

// Constantes de configuração
const MOVE_SPEED = 10;
const PROJECTILE_SPEED = 150;
const PROJECTILE_LIFETIME = 5;
const SHOOT_RATE = 50;
const PROJECTILE_SIZE = 0.3;

let camera, scene, renderer, controls, player;
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
    setupLighting();
    createEnvironment();
    setupEventListeners();
    setupControls();
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
    camera.position.y = 1.6; // Posiciona acima do chão criado
}

// Inicializa controles de pointer lock para movimento de câmera estilo FPS
function setupControls() {
    // Cria controles que prendem o mouse
    controls = new PointerLockControls(
        camera, document.body);
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
    let material = setDefaultMaterial(); //seta um material default para as paredes

    // cria o chão e paredes
    let plane = createGroundPlaneXZ(500, 500);
    let paredeGeometry = new THREE.PlaneGeometry(500, 20);
    let parede0 = new THREE.Mesh(paredeGeometry, material);
    let parede1 = new THREE.Mesh (paredeGeometry, material);
    let parede2 = new THREE.Mesh (paredeGeometry, material);    
    let parede3 = new THREE.Mesh (paredeGeometry, material); 

    scene.add(plane);
    scene.add(parede0);
    scene.add(parede1);
    scene.add(parede2);
    scene.add(parede3);
    parede0.position.set(0.0, 3.0, -250.0);
    parede1.position.set(0.0, 3.0, 250.0);
    parede1.rotateY(-1*Math.PI);
    parede2.position.set(-250.0, 3.0, 0.0);
    parede2.rotateY(Math.PI/2);
    parede3.position.set(250.0, 3.0,0.0);
    parede3.rotateY(-1*Math.PI/2);

    //seta o material das areas
    let materialStair = new THREE.MeshBasicMaterial({color: 'blue'});
    let materialArea1 = new THREE.MeshBasicMaterial({color: 'lightblue'})
    let materialArea2 = new THREE.MeshBasicMaterial({color: 'red'})
    let materialArea3 = new THREE.MeshBasicMaterial({color: 'darkblue'})
    let materialArea4 = new THREE.MeshBasicMaterial({color: 'green'})

    //Criando as Areas estipuladas
    let AreaGeometry = new THREE.BoxGeometry(1, 1, 1);
    //Area1
    let Area1 = new THREE.Mesh(AreaGeometry, materialArea1);
    let Area1_left = new THREE.Mesh(AreaGeometry, materialArea1);
    let Area1_right = new THREE.Mesh(AreaGeometry, materialArea1);

    Area1.position.set(-152.25, 2.0, -131.0);
    Area1.scale.set(125.0,4.0,125.0);
    Area1_left.position.set(-209.8, 2.0, -66.0);
    Area1_left.scale.set(9.5,4.0,6.0);
    Area1_right.position.set(-140.0, 2.0, -66.0);
    Area1_right.scale.set(101.0,4.0,6.0);
    scene.add(Area1);
    scene.add(Area1_left);
    scene.add(Area1_right);
    scene.add(createStair(-197.75, 0.1, -62.8, 4.0, true));

    //Area2
    let Area2 = new THREE.Mesh(AreaGeometry, materialArea2);
    let Area2_left = new THREE.Mesh(AreaGeometry, materialArea2);
    let Area2_right = new THREE.Mesh(AreaGeometry, materialArea2);

    Area2.position.set(0.0, 2.0, -131.0);
    Area2.scale.set(125.0,4.0,125.0);
    Area2_left.position.set(-10.0, 2.0, -66.0);
    Area2_left.scale.set(105.0,4.0,6.0);
    Area2_right.position.set(60.0, 2.0, -66.0);
    Area2_right.scale.set(5.0,4.0,6.0);
    scene.add(Area2);
    scene.add(Area2_left);
    scene.add(Area2_right);
    let escada2 = createStair(50.0, 0.1, -62.8, 4.0, true);
    //scene.add(createStair(50.0, 0.1, -62.8, 4.0, true)); //cria a escada na posição (125,0,-125) com altura 2.0
    scene.add(escada2);

    //Area3
    let Area3 = new THREE.Mesh(AreaGeometry, materialArea3);
    let Area3_left = new THREE.Mesh(AreaGeometry, materialArea3);
    let Area3_right = new THREE.Mesh(AreaGeometry, materialArea3);

    Area3.position.set(156.25, 2.0, -131.0);
    Area3.scale.set(125.0,4.0,125.0);
    Area3_left.position.set(121.2, 2.0, -66.0);
    Area3_left.scale.set(55.0,4.0,6.0);
    Area3_right.position.set(191.2, 2.0, -66.0);
    Area3_right.scale.set(55.0,4.0,6.0);
    scene.add(Area3);
    scene.add(Area3_left);
    scene.add(Area3_right);
    scene.add(createStair(156.25, 0.1, -62.8, 4.0, true));

    //Area4
    let Area4 = new THREE.Mesh(AreaGeometry, materialArea4);
    let Area4_left = new THREE.Mesh(AreaGeometry, materialArea4);
    let Area4_right = new THREE.Mesh(AreaGeometry, materialArea4);
    Area4.position.set(0.0, 2.0, 131.0);
    Area4.scale.set(375.0,4.0,125.0);
    Area4_left.position.set(-97.5, 2.0, 66.0);
    Area4_left.scale.set(180.0,4.0,6.0);
    Area4_right.position.set(97.5, 2.0, 66.0);
    Area4_right.scale.set(180.0,4.0,6.0);

    scene.add(Area4);
    scene.add(Area4_left);
    scene.add(Area4_right);
    scene.add(createStair(0.0, 0.1, 62.8, 4.0, false));

    //funçã para cirar uma escada
    function createStair(x, y, z, h, direcao){ //função cria uma escada na posição (x,y,z) com alura h, cada degrau tem 0.15 unidades de altura.
    //drecao é se a escada está negativa ou positva em relação ao eixo z, true se negativa e false se positiva
    //cria a escada na posição (x,y,z)
    let grupoEscada = new THREE.Group();
    grupoEscada.position.set(x, y, z);
    //calcula o numero de degraus necessários
    let steps = Math.ceil(h/0.2);
    
    for (let i = 0; i < steps; i++){//cria a escada degrau por degrau
    //geormetria da escada
    let stairGeometry = new THREE.BoxGeometry(15.0,0.2,0.3);
    let step = new THREE.Mesh(stairGeometry, materialStair);
    //cria o degrau na posição (x,y,z) com incrementos para cada degrau
    step.position.y = i * 0.2 + 0.2/2;
    if (direcao == true) //se a escada for negativaS
        step.position.z = -i * 0.3;
    else
        step.position.z = i * 0.3;
    //adiciona o degrau na cena
    grupoEscada.add(step);
    }
    return grupoEscada;
    }

    // Adiciona à detecção de colisão
    collidableObjects.push(plane);
    collidableObjects.push(material);
    collidableObjects.push(materialArea1);
    collidableObjects.push(materialArea2);
    collidableObjects.push(materialArea3);
    collidableObjects.push(materialArea4);
    collidableObjects.push(materialStair);
    

}

// Cria um modelo visual de arma anexado à câmera
function createGun() {
    const gunGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1.5);
    const gunMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const gun = new THREE.Mesh(gunGeometry, gunMaterial);
    // Rotaciona para apontar para frente
    gun.rotation.x = Math.PI / 2;
    // Posiciona relativo à câmera (inferior-direita da visão)
    gun.position.set(0.0, -0.5, -1.0);
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

// Atualiza posição do Jogador baseado na entrada do usuário
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