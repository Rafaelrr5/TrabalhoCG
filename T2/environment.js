// ============================================================================
// CRIAÇÃO DO AMBIENTE
// ============================================================================
import * as THREE from '../build/three.module.js';
import { setDefaultMaterial, createGroundPlaneXZ } from "../libs/util/util.js";
import { CONFIG } from './config.js';

// Variáveis globais para gerenciamento da área 1
export let area1KeyPlatform = null;

// Cria as paredes do ambiente
export function createWalls(scene, collidableObjects) {
    let material = setDefaultMaterial('orange');    // Cria o chão
    let plane = createGroundPlaneXZ(CONFIG.WORLD_SIZE, CONFIG.WORLD_SIZE); //utils
    plane.position.y = CONFIG.GROUND_HEIGHT;
    scene.add(plane);
    collidableObjects.push(plane);

    // Cria geometria das paredes
    let wallGeometry = new THREE.PlaneGeometry(CONFIG.WORLD_SIZE, CONFIG.WALL_HEIGHT);
    
    // Cria as 4 paredes
    let wall0 = new THREE.Mesh(wallGeometry, material);
    let wall1 = new THREE.Mesh(wallGeometry, material);
    let wall2 = new THREE.Mesh(wallGeometry, material);    
    let wall3 = new THREE.Mesh(wallGeometry, material); 
    const walls = new THREE.Group();

    // Posiciona as paredes
    wall0.position.set(0.0, CONFIG.WALL_Y_POSITION, -CONFIG.WORLD_SIZE/2);
    wall1.position.set(0.0, CONFIG.WALL_Y_POSITION, CONFIG.WORLD_SIZE/2);
    wall1.rotateY(-1 * Math.PI);
    wall2.position.set(-CONFIG.WORLD_SIZE/2, CONFIG.WALL_Y_POSITION, 0.0);
    wall2.rotateY(Math.PI / 2);
    wall3.position.set(CONFIG.WORLD_SIZE/2, CONFIG.WALL_Y_POSITION, 0.0);
    wall3.rotateY(-1 * Math.PI / 2);

    // Adiciona paredes à cena
    walls.add(wall0);
    walls.add(wall1);
    walls.add(wall2);
    walls.add(wall3);
    scene.add(walls);
    markCollisionObject(walls, collidableObjects);
}

// Cria as áreas coloridas do jogo
export function createAreas(scene, collidableObjects) {
    // Materiais das áreas
    const materials = {
        stair: setDefaultMaterial('blue'),
        area1: setDefaultMaterial('lightblue'),
        area2: setDefaultMaterial('red'),
        area3: setDefaultMaterial('darkblue'),
        area4: setDefaultMaterial('green')
    };

    createArea1(scene, materials, collidableObjects);
    createArea2(scene, materials, collidableObjects);
    createArea3(scene, materials, collidableObjects);    createArea4(scene, materials, collidableObjects);
    
    // Armazena referência da plataforma
    const area1Group = scene.getObjectByName("Area1");
    if (area1Group) {
        area1KeyPlatform = area1Group.getObjectByName("KeyPlatform");
    }
}

// Cria a Área 1 (azul claro) - Templo Romano com colunas
function createArea1(scene, materials, collidableObjects) {
    let areaGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    let area1_center = new THREE.Mesh(areaGeometry, materials.area1);
    let area1_left = new THREE.Mesh(areaGeometry, materials.area1);
    let area1_right = new THREE.Mesh(areaGeometry, materials.area1);
    const area1 = new THREE.Group();
    area1.name = "Area1";
    const stair1 = new THREE.Group();

    area1_center.position.set(-152.25, CONFIG.AREA_Y_POSITION, -131.0);
    area1_center.scale.set(125.0, CONFIG.AREA_HEIGHT, 125.0);
    area1_left.position.set(-210.0, CONFIG.AREA_Y_POSITION, -66.0);
    area1_left.scale.set(9.5, CONFIG.AREA_HEIGHT, 6.0);
    area1_right.position.set(-140.0, CONFIG.AREA_Y_POSITION, -66.0);
    area1_right.scale.set(100.5, CONFIG.AREA_HEIGHT, 6.0);
    
    area1.add(area1_center);
    area1.add(area1_left);
    area1.add(area1_right);
    
    // Adiciona colunas romanas ao redor da área
    const romanColumns = createRomanColumns(scene);
    area1.add(romanColumns);
    
    // Adiciona plataforma para a chave no centro da área
    const keyPlatform = createKeyPlatform(scene);
    area1.add(keyPlatform);
    
    scene.add(area1);
    stair1.add(createStair(-197.75, CONFIG.STAIR_HEIGHT_OFFSET, -62.8, CONFIG.AREA_HEIGHT, true, materials.stair));
    scene.add(stair1);
    markCollisionObject(area1, collidableObjects);
    markCollisionObject(stair1, collidableObjects);
}

// Cria a Área 2 (vermelha)
function createArea2(scene, materials, collidableObjects) {
    let areaGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    let area2_center = new THREE.Mesh(areaGeometry, materials.area2);
    let area2_left = new THREE.Mesh(areaGeometry, materials.area2);
    let area2_right = new THREE.Mesh(areaGeometry, materials.area2);
    const area2 = new THREE.Group();
    area2.name = "Area2";
    const stair2 = new THREE.Group();

    area2_center.position.set(0.0, CONFIG.AREA_Y_POSITION, -131.0);
    area2_center.scale.set(125.0, CONFIG.AREA_HEIGHT, 125.0);
    area2_left.position.set(-10.0, CONFIG.AREA_Y_POSITION, -66.0);
    area2_left.scale.set(105.0, CONFIG.AREA_HEIGHT, 6.0);
    area2_right.position.set(60.0, CONFIG.AREA_Y_POSITION, -66.0);
    area2_right.scale.set(5.0, CONFIG.AREA_HEIGHT, 6.0);
    
    area2.add(area2_center);
    area2.add(area2_left);
    area2.add(area2_right);
    scene.add(area2);
    stair2.add(createStair(50.0, CONFIG.STAIR_HEIGHT_OFFSET, -62.8, CONFIG.AREA_HEIGHT, true, materials.stair));
    scene.add(stair2);
    markCollisionObject(area2, collidableObjects);
    markCollisionObject(stair2, collidableObjects);
}

// Cria a Área 3 (azul escuro)
function createArea3(scene, materials, collidableObjects) {
    let areaGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    let area3_center = new THREE.Mesh(areaGeometry, materials.area3);
    let area3_left = new THREE.Mesh(areaGeometry, materials.area3);
    let area3_right = new THREE.Mesh(areaGeometry, materials.area3);
    const area3 = new THREE.Group();
    area3.name = "Area3";
    const stair3 = new THREE.Group();

    area3_center.position.set(156.25, CONFIG.AREA_Y_POSITION, -131.0);
    area3_center.scale.set(125.0, CONFIG.AREA_HEIGHT, 125.0);
    area3_left.position.set(121.2, CONFIG.AREA_Y_POSITION, -66.0);
    area3_left.scale.set(55.0, CONFIG.AREA_HEIGHT, 6.0);
    area3_right.position.set(191.2, CONFIG.AREA_Y_POSITION, -66.0);
    area3_right.scale.set(55.0, CONFIG.AREA_HEIGHT, 6.0);
    
    area3.add(area3_center);
    area3.add(area3_left);
    area3.add(area3_right);
    scene.add(area3);
    stair3.add(createStair(156.25, CONFIG.STAIR_HEIGHT_OFFSET, -62.8, CONFIG.AREA_HEIGHT, true, materials.stair));
    scene.add(stair3);
    markCollisionObject(area3, collidableObjects);
    markCollisionObject(stair3, collidableObjects);
}

// Cria a Área 4 (verde)
function createArea4(scene, materials, collidableObjects) {
    let areaGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    let area4_center = new THREE.Mesh(areaGeometry, materials.area4);
    let area4_left = new THREE.Mesh(areaGeometry, materials.area4);
    let area4_right = new THREE.Mesh(areaGeometry, materials.area4);
    const area4 = new THREE.Group();
    area4.name = "Area4";
    const stair4 = new THREE.Group();
    
    area4_center.position.set(0.0, CONFIG.AREA_Y_POSITION, 131.0);
    area4_center.scale.set(375.0, CONFIG.AREA_HEIGHT, 125.0);
    area4_left.position.set(-97.5, CONFIG.AREA_Y_POSITION, 66.0);
    area4_left.scale.set(180.0, CONFIG.AREA_HEIGHT, 6.0);
    area4_right.position.set(97.5, CONFIG.AREA_Y_POSITION, 66.0);
    area4_right.scale.set(180.0, CONFIG.AREA_HEIGHT, 6.0);

    area4.add(area4_center);
    area4.add(area4_left);
    area4.add(area4_right);
    scene.add(area4);
    stair4.add(createStair(0.0, CONFIG.STAIR_HEIGHT_OFFSET, 62.8, CONFIG.AREA_HEIGHT, false, materials.stair));
    scene.add(stair4);
    markCollisionObject(area4, collidableObjects);
    markCollisionObject(stair4, collidableObjects);
}

// Cria colunas romanas ao redor da Área 1
function createRomanColumns(scene) {
    const columnsGroup = new THREE.Group();
    columnsGroup.name = "RomanColumns";
    
    // Material das colunas (mármore branco/cinza)
    const columnMaterial = new THREE.MeshLambertMaterial({ 
        color: 0xf5f5dc, // Bege claro (mármore)
        transparent: false
    });
    
    // Configurações das colunas
    const columnHeight = 12;
    const columnRadius = 2;
    const columnSegments = 12;
    const capitalHeight = 1.5;
    const baseHeight = 1;
    
    // Posições das colunas ao redor da área, EVITANDO a área da escada (X=-197.75)
    // Área 1: centro (-152.25, -131.0), dimensões 125x125
    const columnPositions = [
        // Frente (sul) - borda interna
        { x: -152.25 - 40, z: -131.0 + 50 },
        { x: -152.25 - 15, z: -131.0 + 50 },
        { x: -152.25 + 15, z: -131.0 + 50 },
        { x: -152.25 + 40, z: -131.0 + 50 },
        
        // Trás (norte) - borda interna
        { x: -152.25 - 40, z: -131.0 - 50 },
        { x: -152.25 - 15, z: -131.0 - 50 },
        { x: -152.25 + 15, z: -131.0 - 50 },
        { x: -152.25 + 40, z: -131.0 - 50 },
        
        // Esquerda (oeste) - borda interna - REMOVIDA a coluna mais próxima da escada
        { x: -152.25 - 50, z: -131.0 - 25 },
        { x: -152.25 - 50, z: -131.0 },
        { x: -152.25 - 50, z: -131.0 + 25 },
        
        // Direita (leste) - borda interna
        { x: -152.25 + 50, z: -131.0 - 25 },
        { x: -152.25 + 50, z: -131.0 },
        { x: -152.25 + 50, z: -131.0 + 25 }
    ];
    
    columnPositions.forEach((pos, index) => {
        const column = createSingleColumn(columnRadius, columnHeight, columnSegments, capitalHeight, baseHeight, columnMaterial);
        // Posiciona a coluna apoiada sobre a superfície da área
        column.position.set(pos.x, CONFIG.AREA_Y_POSITION + CONFIG.AREA_HEIGHT/2 + columnHeight/2, pos.z);
        columnsGroup.add(column);
    });
    
    return columnsGroup;
}

// Cria uma única coluna romana com base, fuste e capitel
function createSingleColumn(radius, height, segments, capitalHeight, baseHeight, material) {
    const columnGroup = new THREE.Group();
    
    // Base da coluna (mais larga)
    const baseGeometry = new THREE.CylinderGeometry(radius * 1.3, radius * 1.4, baseHeight, segments);
    const base = new THREE.Mesh(baseGeometry, material);
    base.position.y = -height/2 + baseHeight/2;
    columnGroup.add(base);
    
    // Fuste da coluna (corpo principal)
    const shaftGeometry = new THREE.CylinderGeometry(radius, radius, height - capitalHeight - baseHeight, segments);
    const shaft = new THREE.Mesh(shaftGeometry, material);
    shaft.position.y = -capitalHeight/2;
    columnGroup.add(shaft);
    
    // Capitel da coluna (topo decorativo)
    const capitalGeometry = new THREE.CylinderGeometry(radius * 1.2, radius, capitalHeight, segments);
    const capital = new THREE.Mesh(capitalGeometry, material);
    capital.position.y = height/2 - capitalHeight/2;
    columnGroup.add(capital);
    
    return columnGroup;
}

// Cria a plataforma para a chave vermelha
function createKeyPlatform(scene) {
    const platformGroup = new THREE.Group();
    platformGroup.name = "KeyPlatform";
    
    // Material da plataforma
    const platformMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Marrom
    
    // Plataforma circular
    const platformGeometry = new THREE.CylinderGeometry(3, 3, 0.5, 16);
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.set(-152.25, CONFIG.AREA_Y_POSITION - 2, -131.0); // Começa subterrânea
    platformGroup.add(platform);
    
    // Chave vermelha
    const redKey = createRedKey();
    redKey.position.set(-152.25, CONFIG.AREA_Y_POSITION - 1.5, -131.0);
    platformGroup.add(redKey);
    
    // Armazena referências globais para animação
    platformGroup.userData.platform = platform;
    platformGroup.userData.key = redKey;
    platformGroup.userData.isRaised = false;
    platformGroup.userData.targetY = CONFIG.AREA_Y_POSITION + CONFIG.AREA_HEIGHT/2 + 1;
    
    return platformGroup;
}

// Cria a chave vermelha
function createRedKey() {
    const keyGroup = new THREE.Group();
    keyGroup.name = "RedKey";
    
    // Material vermelho brilhante
    const keyMaterial = new THREE.MeshLambertMaterial({ 
        color: 0xff0000,
        emissive: 0x440000
    });
    
    // Corpo da chave
    const shaftGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
    const shaft = new THREE.Mesh(shaftGeometry, keyMaterial);
    shaft.rotation.z = Math.PI / 2;
    keyGroup.add(shaft);
    
    // Cabeça da chave (círculo)
    const headGeometry = new THREE.TorusGeometry(0.5, 0.1, 8, 16);
    const head = new THREE.Mesh(headGeometry, keyMaterial);
    head.position.x = -1;
    head.rotation.y = Math.PI / 2;
    keyGroup.add(head);
    
    // Dentes da chave
    const tooth1Geometry = new THREE.BoxGeometry(0.3, 0.1, 0.1);
    const tooth1 = new THREE.Mesh(tooth1Geometry, keyMaterial);
    tooth1.position.set(0.7, 0, 0.1);
    keyGroup.add(tooth1);
    
    const tooth2 = new THREE.Mesh(tooth1Geometry, keyMaterial);
    tooth2.position.set(0.9, 0, 0.1);
    keyGroup.add(tooth2);
    
    // Adiciona rotação contínua
    keyGroup.userData.rotationSpeed = 0.02;
    
    return keyGroup;
}

// Função para ser chamada no main.js para atualizar a área 1
export function updateArea1(delta, scene) {
    // Atualiza rotação da chave
    if (area1KeyPlatform) {
        const key = area1KeyPlatform.userData.key;
        if (key) {
            key.rotation.y += key.userData.rotationSpeed;
        }
          // Como não há inimigos, a plataforma sobe automaticamente
        if (!area1KeyPlatform.userData.isRaised) {
            raisePlatform(area1KeyPlatform, delta);
        }
    }
}

// Anima a subida suave da plataforma
function raisePlatform(platformGroup, delta) {
    const platform = platformGroup.userData.platform;
    const key = platformGroup.userData.key;
    const targetY = platformGroup.userData.targetY;
    
    if (platform.position.y < targetY) {
        const riseSpeed = 2; // Velocidade de subida
        platform.position.y += riseSpeed * delta;
        key.position.y += riseSpeed * delta;
        
        if (platform.position.y >= targetY) {
            platform.position.y = targetY;
            key.position.y = targetY + 0.5;
            platformGroup.userData.isRaised = true;
        }
    }
}

// Função para criar uma escada
function createStair(x, y, z, h, direction, material) {
    let stairGroup = new THREE.Group();
    stairGroup.name = "Escada";
    stairGroup.position.set(x, y, z);
    const stepHeight = CONFIG.STAIR_STEP_HEIGHT; // Altura de cada degrau
    const stepDepth = CONFIG.STAIR_STEP_DEPTH; // Profundidade de cada degrau
      
    // Calcula o número de degraus necessários
    let steps = Math.floor(h / stepHeight);
    
    for (let i = 0; i < steps; i++) {
        // Geometria da escada
        let stairGeometry = new THREE.BoxGeometry(CONFIG.STAIR_WIDTH, stepHeight, stepDepth);
        let step = new THREE.Mesh(stairGeometry, material);
        
        // Posiciona o degrau
        step.position.y = i * stepHeight + stepHeight / 2;
        if (direction === true) {
            step.position.z = -i * stepDepth;
        } else {
            step.position.z = i * stepDepth;
        }
        
        stairGroup.add(step);
    }
    
    return stairGroup;
}

//Esse médodo serve para marcar um objeto, pertencente a um grupo, como colidivel
function markCollisionObject(object, collidableObjects){
    object.traverse(child => {
        if (child.isMesh) {
            collidableObjects.push(child);
        }
    });
}