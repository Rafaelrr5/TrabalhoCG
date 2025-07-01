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

let camera, scene, renderer, controls, gun;
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
    light.position.set(481.86, 300, -458.45);
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
    gun = createGun(camera); // Captura a referência da arma
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
    // Update enemy behavior - now targets the gun position
    updateEnemies(delta, scene, camera, gun);
    updateELevator(delta);
    
    renderer.render(scene, camera);
}

// Lida com redimensionamento da janela
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================================================
// FUNÇÕES DE TESTE DE ESCALA DAS SKULLS
// ============================================================================

// Função para alterar a escala de todas as skulls ativas
window.setSkullScale = function(newScale) {
    console.log(`[SKULL TEST] Alterando escala das skulls para: ${newScale}`);
    
    // Importar dinâmicamente o array de inimigos
    import('../entities/enemies/enemy.js').then(({ enemies }) => {
        let skullCount = 0;
        
        enemies.forEach(enemy => {
            // Verificar se é uma Lost Soul (skull)
            if (enemy.constructor.name === 'LostSoul' && enemy.mesh) {
                // Se o mesh é um grupo com skull model
                if (enemy.skullModel) {
                    // Aplicar escala ao modelo skull interno
                    enemy.skullModel.scale.setScalar(newScale);
                    skullCount++;
                    console.log(`[SKULL TEST] Skull ${skullCount} - Nova escala: ${newScale}`);
                } else if (enemy.mesh) {
                    // Fallback: aplicar escala ao mesh principal
                    enemy.mesh.scale.setScalar(newScale);
                    skullCount++;
                    console.log(`[SKULL TEST] Skull ${skullCount} (fallback) - Nova escala: ${newScale}`);
                }
            }
        });
        
        // Atualizar interface
        const scaleElement = document.getElementById('current-scale');
        const skullsElement = document.getElementById('active-skulls');
        if (scaleElement) scaleElement.textContent = newScale.toFixed(2);
        if (skullsElement) skullsElement.textContent = skullCount;
        
        console.log(`[SKULL TEST] Total de skulls alteradas: ${skullCount}`);
    }).catch(err => {
        console.error('[SKULL TEST] Erro ao acessar enemies:', err);
    });
};

// Função para testar movimento das skulls
window.testSkullMovement = function() {
    console.log('[SKULL TEST] Iniciando teste de movimento...');
    
    import('../entities/enemies/enemy.js').then(({ enemies }) => {
        enemies.forEach((enemy, index) => {
            if (enemy.constructor.name === 'LostSoul' && enemy.mesh) {
                console.log(`[SKULL TEST] Skull ${index + 1}:`);
                console.log(`  Posição: (${enemy.mesh.position.x.toFixed(2)}, ${enemy.mesh.position.y.toFixed(2)}, ${enemy.mesh.position.z.toFixed(2)})`);
                console.log(`  Escala: ${enemy.mesh.scale.x.toFixed(3)}`);
                if (enemy.skullModel) {
                    console.log(`  Escala do modelo: ${enemy.skullModel.scale.x.toFixed(3)}`);
                }
                
                // Testar movimento forçado
                const direction = new THREE.Vector3();
                direction.subVectors(gun.position, enemy.mesh.position);
                console.log(`  Direção para arma: (${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}, ${direction.z.toFixed(2)})`);
                console.log(`  Distância: ${direction.length().toFixed(2)}`);
            }
        });
    });
};

// Função para resetar teste
window.resetSkullTest = function() {
    console.log('[SKULL TEST] Resetando teste...');
    window.setSkullScale(0.3); // Escala padrão
};

// Função para atualizar contador de skulls na interface
function updateSkullCounter() {
    import('../entities/enemies/enemy.js').then(({ enemies }) => {
        const skullCount = enemies.filter(enemy => 
            enemy.constructor.name === 'LostSoul' && enemy.isAlive
        ).length;
        
        const skullsElement = document.getElementById('active-skulls');
        if (skullsElement) skullsElement.textContent = skullCount;
    }).catch(err => {
        console.error('[SKULL TEST] Erro ao contar skulls:', err);
    });
}

// Atualizar contador de skulls a cada 2 segundos
setInterval(updateSkullCounter, 2000);

console.log('[SKULL TEST] Funções de teste carregadas! Use os botões na interface.');