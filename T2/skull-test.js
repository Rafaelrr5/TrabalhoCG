import * as THREE from '../build/three.module.js';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import { loadSkullModel, preloadSkullModel } from './src/utils/skullLoader.js';

// Variáveis globais
let scene, camera, renderer, controls;
let skullObject = null;
let isAnimating = false;
let animationId = null;

// Configurações iniciais
const initialSettings = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: Math.PI / 2, y: 0, z: 0 },
    scale: 0.3
};

// Inicialização
async function init() {
    console.log('Iniciando aplicação...');
    
    // Criar cena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    
    // Criar câmera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);
    
    // Criar renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('container').appendChild(renderer.domElement);
    
    // Adicionar controles de órbita
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Adicionar iluminação
    setupLighting();
    
    // Adicionar um plano como referência
    addGroundPlane();
    
    // Carregar o skull
    await loadSkull();
    
    // Configurar controles da interface
    setupControls();
    
    // Esconder loading e mostrar controles
    document.getElementById('loading').style.display = 'none';
    document.getElementById('controls').style.display = 'block';
    
    // Iniciar loop de renderização
    animate();
    
    console.log('Aplicação iniciada com sucesso!');
}

// Configurar iluminação
function setupLighting() {
    // Luz ambiente
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    // Luz direcional principal
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Luz pontual para realçar o skull
    const pointLight = new THREE.PointLight(0xff6b6b, 0.5, 10);
    pointLight.position.set(-2, 3, 2);
    scene.add(pointLight);
    
    // Helper para visualizar a luz pontual (opcional)
    const pointLightHelper = new THREE.PointLightHelper(pointLight, 0.1);
    scene.add(pointLightHelper);
}

// Adicionar plano de referência
function addGroundPlane() {
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x333333,
        transparent: true,
        opacity: 0.7
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -2;
    plane.receiveShadow = true;
    scene.add(plane);
    
    // Adicionar grid como referência
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    gridHelper.position.y = -1.99;
    scene.add(gridHelper);
}

// Carregar o modelo do skull
async function loadSkull() {
    try {
        console.log('Carregando modelo do skull...');
        
        // Precarregar o modelo (opcional, para performance)
        await preloadSkullModel();
        
        // Carregar o modelo original
        const loadedModel = await loadSkullModel();
        
        // Criar um grupo wrapper para controlar o pivot point
        skullObject = new THREE.Group();
        
        // Calcular o centro geométrico do modelo
        const box = new THREE.Box3().setFromObject(loadedModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Mover o modelo carregado para que seu centro fique na origem do grupo
        loadedModel.position.sub(center);
        
        // Adicionar o modelo ao grupo
        skullObject.add(loadedModel);
        
        // Aplicar configurações iniciais ao grupo (agora centralizado)
        skullObject.position.set(
            initialSettings.position.x,
            initialSettings.position.y,
            initialSettings.position.z
        );
        skullObject.rotation.set(
            initialSettings.rotation.x,
            initialSettings.rotation.y,
            initialSettings.rotation.z
        );
        skullObject.scale.setScalar(initialSettings.scale);
        
        // Habilitar sombras
        skullObject.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        // Adicionar à cena
        scene.add(skullObject);
        
        console.log('Skull carregado com sucesso!');
        console.log('Centro calculado:', center);
        console.log('Tamanho do modelo:', size);
        console.log('Informações do skull:', {
            position: skullObject.position,
            rotation: skullObject.rotation,
            scale: skullObject.scale,
            children: skullObject.children.length
        });
        
    } catch (error) {
        console.error('Erro ao carregar skull:', error);
        document.getElementById('loading').textContent = 'Erro ao carregar skull. Verifique o console.';
    }
}

// Configurar controles da interface
function setupControls() {
    if (!skullObject) return;
    
    // Controles de posição
    const posX = document.getElementById('posX');
    const posY = document.getElementById('posY');
    const posZ = document.getElementById('posZ');
    const posXValue = document.getElementById('posXValue');
    const posYValue = document.getElementById('posYValue');
    const posZValue = document.getElementById('posZValue');
    
    posX.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        skullObject.position.x = value;
        posXValue.textContent = value.toFixed(1);
    });
    
    posY.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        skullObject.position.y = value;
        posYValue.textContent = value.toFixed(1);
    });
    
    posZ.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        skullObject.position.z = value;
        posZValue.textContent = value.toFixed(1);
    });
    
    // Controles de rotação
    const rotX = document.getElementById('rotX');
    const rotY = document.getElementById('rotY');
    const rotZ = document.getElementById('rotZ');
    const rotXValue = document.getElementById('rotXValue');
    const rotYValue = document.getElementById('rotYValue');
    const rotZValue = document.getElementById('rotZValue');
    
    rotX.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        skullObject.rotation.x = value;
        rotXValue.textContent = value.toFixed(2);
    });
    
    rotY.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        skullObject.rotation.y = value;
        rotYValue.textContent = value.toFixed(2);
    });
    
    rotZ.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        skullObject.rotation.z = value;
        rotZValue.textContent = value.toFixed(2);
    });
    
    // Controle de escala
    const scale = document.getElementById('scale');
    const scaleValue = document.getElementById('scaleValue');
    
    scale.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        skullObject.scale.setScalar(value);
        scaleValue.textContent = value.toFixed(1);
    });
    
    // Botão de reset
    const resetBtn = document.getElementById('resetBtn');
    resetBtn.addEventListener('click', resetSkull);
    
    // Botão de animação
    const animateBtn = document.getElementById('animateBtn');
    animateBtn.addEventListener('click', toggleAnimation);
}

// Reset do skull para posição inicial
function resetSkull() {
    if (!skullObject) return;
    
    skullObject.position.set(
        initialSettings.position.x,
        initialSettings.position.y,
        initialSettings.position.z
    );
    skullObject.rotation.set(
        initialSettings.rotation.x,
        initialSettings.rotation.y,
        initialSettings.rotation.z
    );
    skullObject.scale.setScalar(initialSettings.scale);
    
    // Atualizar controles da interface
    document.getElementById('posX').value = initialSettings.position.x;
    document.getElementById('posY').value = initialSettings.position.y;
    document.getElementById('posZ').value = initialSettings.position.z;
    document.getElementById('rotX').value = initialSettings.rotation.x;
    document.getElementById('rotY').value = initialSettings.rotation.y;
    document.getElementById('rotZ').value = initialSettings.rotation.z;
    document.getElementById('scale').value = initialSettings.scale;
    
    document.getElementById('posXValue').textContent = initialSettings.position.x;
    document.getElementById('posYValue').textContent = initialSettings.position.y;
    document.getElementById('posZValue').textContent = initialSettings.position.z;
    document.getElementById('rotXValue').textContent = initialSettings.rotation.x.toFixed(2);
    document.getElementById('rotYValue').textContent = initialSettings.rotation.y.toFixed(2);
    document.getElementById('rotZValue').textContent = initialSettings.rotation.z.toFixed(2);
    document.getElementById('scaleValue').textContent = initialSettings.scale;
    
    console.log('Skull resetado para posição inicial');
}

// Toggle da animação
function toggleAnimation() {
    isAnimating = !isAnimating;
    const btn = document.getElementById('animateBtn');
    btn.textContent = isAnimating ? 'Parar' : 'Animar';
    
    if (isAnimating) {
        console.log('Iniciando animação do skull');
    } else {
        console.log('Parando animação do skull');
    }
}

// Loop de animação
function animate() {
    requestAnimationFrame(animate);
    
    // Atualizar controles
    controls.update();
    
    // Animação do skull se ativada
    if (isAnimating && skullObject) {
        const time = Date.now() * 0.001;
        
        // Rotação suave
        skullObject.rotation.y = Math.sin(time * 0.5) * 0.5;
        skullObject.rotation.z = Math.cos(time * 0.3) * 0.2;
        
        // Movimento vertical suave
        skullObject.position.y = Math.sin(time * 2) * 0.5;
        
        // Escala pulsante
        const scaleValue = 0.3 + Math.sin(time * 3) * 0.05;
        skullObject.scale.setScalar(scaleValue);
    }
    
    // Renderizar
    renderer.render(scene, camera);
}

// Redimensionamento da janela
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Event listeners
window.addEventListener('resize', onWindowResize);

// Adicionar alguns controles de teclado
window.addEventListener('keydown', (event) => {
    if (!skullObject) return;
    
    const moveSpeed = 0.1;
    const rotSpeed = 0.1;
    
    switch (event.code) {
        case 'KeyW':
            skullObject.position.z -= moveSpeed;
            break;
        case 'KeyS':
            skullObject.position.z += moveSpeed;
            break;
        case 'KeyA':
            skullObject.position.x -= moveSpeed;
            break;
        case 'KeyD':
            skullObject.position.x += moveSpeed;
            break;
        case 'KeyQ':
            skullObject.position.y += moveSpeed;
            break;
        case 'KeyE':
            skullObject.position.y -= moveSpeed;
            break;
        case 'KeyR':
            resetSkull();
            break;
        case 'Space':
            event.preventDefault();
            toggleAnimation();
            break;
    }
});

// Inicializar aplicação
init().catch(error => {
    console.error('Erro na inicialização:', error);
    document.getElementById('loading').textContent = 'Erro na inicialização. Verifique o console.';
});

// Log de informações úteis
console.log('Controles disponíveis:');
console.log('- WASD: mover skull');
console.log('- Q/E: mover skull para cima/baixo');
console.log('- R: resetar posição');
console.log('- Space: toggle animação');
console.log('- Mouse: controlar câmera');
