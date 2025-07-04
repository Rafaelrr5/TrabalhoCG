import * as THREE from '../../../build/three.module.js';
import { setDefaultMaterial, createGroundPlaneXZ } from "../../../libs/util/util.js";
import { CONFIG } from '../core/config.js';
import { CSG } from '../../../libs/other/CSGMesh.js';
import { enemies, areAllEnemiesDefeated, areAllArea1EnemiesDefeated, areAllArea2EnemiesDefeated, cleanupDeadEnemies } from '../entities/enemies/enemy.js';
import {createElevator} from '../systems/elevator.js';
import { enableShadowsForAll } from './lights.js';
import { keyManager, Key } from '../entities/items/key.js';
import { createDoor, createtotem } from './door.js';

export let area1KeyPlatform = null;
export let area2KeyPlatform = null;

export function createWalls(scene, collidableObjects) {
    let material = new THREE.MeshLambertMaterial({ color: 'orange' });
    let plane = createGroundPlaneXZ(CONFIG.WORLD_SIZE, CONFIG.WORLD_SIZE);
    plane.receiveShadow = true; 

    plane.position.y = CONFIG.GROUND_HEIGHT;
    scene.add(plane);
    plane.receiveShadow = true;
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
    enableShadowsForAll(walls); // Ativa sombras para todas as paredes
    
}

// Cria as áreas coloridas do jogo
export function createAreas(scene, collidableObjects) {
    // Materiais das áreas
    const materials = {
        stair: new THREE.MeshLambertMaterial({ color: 'blue' }),
        area1: new THREE.MeshLambertMaterial({color: 'lightblue'}),
        area2: new THREE.MeshLambertMaterial({color: 'red'}),
        area3: new THREE.MeshLambertMaterial({color: 'darkblue'}),
        area4: new THREE.MeshLambertMaterial({color: 'green'})
    };

    createArea1(scene, materials, collidableObjects);
    createArea2(scene, materials, collidableObjects);
    createArea3(scene, materials, collidableObjects);    createArea4(scene, materials, collidableObjects);
    
    // Armazena referência das plataformas
    const area1Group = scene.getObjectByName("Area1");
    if (area1Group) {
        area1KeyPlatform = area1Group.getObjectByName("KeyPlatform");
    }
    
    const area2Group = scene.getObjectByName("Area2");
    if (area2Group) {
        area2KeyPlatform = area2Group.getObjectByName("BlueKeyPlatform");
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
    enableShadowsForAll(area1); // Ativa sombras na área 1
    enableShadowsForAll(stair1); // Ativa sombras na escada
    enableShadowsForAll(romanColumns); // Ativa sombras nas colunas romanas
    enableShadowsForAll(keyPlatform); // Ativa sombras na plataforma da chave
}

// Cria a Área 2 (vermelha)
function createArea2(scene, materials, collidableObjects) {
    let areaGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    let area2_center = new THREE.Mesh(areaGeometry, materials.area2);
    let area2_left = new THREE.Mesh(areaGeometry, materials.area2);
    let area2_right = new THREE.Mesh(areaGeometry, materials.area2);

    let bloco1 = new THREE.Mesh(areaGeometry, materials.area2);
    let bloco2 = new THREE.Mesh(areaGeometry, materials.area2);
    let bloco3 = new THREE.Mesh(areaGeometry, materials.area2);
    let bloco4 = new THREE.Mesh(areaGeometry, materials.area2);
    let bloco5 = new THREE.Mesh(areaGeometry, materials.area2);
    let bloco6 = new THREE.Mesh(areaGeometry, materials.area2);
    let bloco7 = new THREE.Mesh(areaGeometry, materials.area2);


    const area2 = new THREE.Group();
    area2.name = "Area2";
    //const stair2 = new THREE.Group();

    area2_center.position.set(0.0, CONFIG.AREA_Y_POSITION, -131.0);
    area2_center.scale.set(125.0, CONFIG.AREA_HEIGHT, 125.0);
    area2_left.position.set(-10.0, CONFIG.AREA_Y_POSITION, -66.0);
    area2_left.scale.set(105.0, CONFIG.AREA_HEIGHT, 6.0);
    area2_right.position.set(60.0, CONFIG.AREA_Y_POSITION, -66.0);
    area2_right.scale.set(5.0, CONFIG.AREA_HEIGHT, 6.0);

    bloco1.scale.set(4.0 , 6.0, 100.0);
    bloco1.position.set (0.0, CONFIG.AREA_Y_POSITION + 3.0, -125.0);
    bloco2.scale.set(30.0, 20.0, 30.0);
    bloco2.position.set(37.5, CONFIG.AREA_Y_POSITION + 20.0, -125.0);
    bloco3.scale.set(60, 30.0, 4.0)
    bloco3.position.set(31.25, CONFIG.AREA_Y_POSITION + 15.0, -185,5);
    bloco4.scale.set(5.0, 15.0, 5.0);
    bloco4.position.set(-30, CONFIG.AREA_Y_POSITION + 7.5, -125.0);
    bloco5.scale.set(5.0,10.0,5.0);
    bloco5.position.set(-30, CONFIG.AREA_Y_POSITION + 5.0, -105.0);
    bloco6.scale.set(5.0, 20.0, 5.0);
    bloco6.position.set(-30, CONFIG.AREA_Y_POSITION + 10.0, -145.0);
    bloco7.scale.set(15.0, 2.0, 4.0);
    bloco7.position.set(37.5, CONFIG.AREA_Y_POSITION + 20.0, -145.0);
    
    area2.add(area2_center);
    area2.add(area2_left);
    area2.add(area2_right);
    area2.add(bloco1);
    area2.add(bloco2);
    area2.add(bloco3);
    area2.add(bloco4);
    area2.add(bloco5);
    area2.add(bloco6);
    area2.add(bloco7);
    
    // Adiciona plataforma para a chave azul no centro da área 2
    const blueKeyPlatform = createBlueKeyPlatform(scene);
    area2.add(blueKeyPlatform);
    
    scene.add(area2);

    //stair2.add(createStair(50.0, CONFIG.STAIR_HEIGHT_OFFSET, -62.8, CONFIG.AREA_HEIGHT, true, materials.stair));
    //scene.add(stair2);
    markCollisionObject(area2, collidableObjects);
    //markCollisionObject(stair2, collidableObjects);
    createElevator(scene, collidableObjects, 50.0, -66.05);
    enableShadowsForAll(area2); // Ativa sombras na área 2
    enableShadowsForAll(blueKeyPlatform); // Ativa sombras na plataforma da chave

    //createDoor(scene, collidableObjects, 50.0, -63, 15.0, 4.0, 'red'); // Porta vermelha para a Área 3
    createtotem(scene, collidableObjects, 60.0, -59.05, 'red'); // Totem vermelho para a Área 3

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
    enableShadowsForAll(area3); // Ativa sombras na área 3  
    enableShadowsForAll(stair3); // Ativa sombras na escada
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
    area4.castShadow = true; // Ativa sombras na área 4
    stair4.castShadow = true; // Ativa sombras na escada
    enableShadowsForAll(area4); // Ativa sombras na área 4
    enableShadowsForAll(stair4); // Ativa sombras na escada
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
    
    // Criar chave vermelha usando o sistema Key
    const keyPosition = new THREE.Vector3(-152.25, CONFIG.AREA_Y_POSITION - 1.0, -131.0);
    const redKeyInstance = new Key('red', keyPosition);
    
    // Adicionar a chave ao keyManager e à cena
    if (keyManager.addKey(redKeyInstance, scene)) {
        console.log('[ENVIRONMENT] Red key added to KeyManager successfully');
        // Esconder a chave inicialmente (será mostrada quando a plataforma subir)
        if (redKeyInstance.getMesh()) {
            redKeyInstance.getMesh().visible = false;
            // Posicionar inicialmente abaixo do chão com a plataforma
            redKeyInstance.getMesh().position.set(-152.25, CONFIG.AREA_Y_POSITION - 1.0, -131.0);
            redKeyInstance.position.copy(redKeyInstance.getMesh().position);
            redKeyInstance.originalY = CONFIG.AREA_Y_POSITION - 1.0;
        }
    }
    
    // Armazena referências globais para animação
    platformGroup.userData.platform = platform;
    platformGroup.userData.keyInstance = redKeyInstance; // Referência para o objeto Key
    platformGroup.userData.isRaised = false;
    platformGroup.userData.targetY = CONFIG.AREA_Y_POSITION + CONFIG.AREA_HEIGHT/2 + 0.5;
    
    return platformGroup;
}

function createBlueKeyPlatform(scene) {
    const platformGroup = new THREE.Group();
    platformGroup.name = "BlueKeyPlatform";
    
    const platformMaterial = new THREE.MeshLambertMaterial({ color: 0x4169E1 }); // Azul royal
    
    const platformGeometry = new THREE.CylinderGeometry(3, 3, 0.5, 16);
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.set(20.0, CONFIG.AREA_Y_POSITION - 2, -131.0); // Movida para X = 20.0
    platformGroup.add(platform);
    
    const keyPosition = new THREE.Vector3(20.0, CONFIG.AREA_Y_POSITION - 1.0, -131.0);
    const blueKeyInstance = new Key('blue', keyPosition);
    
    if (keyManager.addKey(blueKeyInstance, scene)) {
        console.log('[ENVIRONMENT] Blue key added to KeyManager successfully');
        // Esconder a chave inicialmente (será mostrada quando a plataforma subir)
        if (blueKeyInstance.getMesh()) {
            blueKeyInstance.getMesh().visible = false;
            // Posicionar inicialmente abaixo do chão com a plataforma (posição X atualizada)
            blueKeyInstance.getMesh().position.set(20.0, CONFIG.AREA_Y_POSITION - 1.0, -131.0);
            blueKeyInstance.position.copy(blueKeyInstance.getMesh().position);
            blueKeyInstance.originalY = CONFIG.AREA_Y_POSITION - 1.0;
        }
    }
    
    platformGroup.userData.platform = platform;
    platformGroup.userData.keyInstance = blueKeyInstance;
    platformGroup.userData.isRaised = false;
    platformGroup.userData.shouldRaise = false;
    platformGroup.userData.targetY = CONFIG.AREA_Y_POSITION + CONFIG.AREA_HEIGHT/2 + 0.5;
    
    return platformGroup;
}

export function updateArea1(delta) {
    if (!area1KeyPlatform) return;
    
    if (!area1KeyPlatform.userData.shouldRaise && areAllArea1EnemiesDefeated()) {
        console.log('Todas Lost Souls da área 1 derrotadas! Subindo plataforma.');
        area1KeyPlatform.userData.shouldRaise = true;
        setTimeout(() => {
            cleanupDeadEnemies(area1KeyPlatform.parent);
        }, 1000);
    }
    if (area1KeyPlatform.userData.shouldRaise && !area1KeyPlatform.userData.isRaised) {
        raisePlatform(area1KeyPlatform, delta);
    }
}

export function updateArea2(delta) {
    if (!area2KeyPlatform) return;
    
    if (!area2KeyPlatform.userData.shouldRaise && areAllArea2EnemiesDefeated()) {
        console.log('Todos Cacodemons da área 2 derrotados! Subindo plataforma.');
        area2KeyPlatform.userData.shouldRaise = true;
        setTimeout(() => {
            cleanupDeadEnemies(area2KeyPlatform.parent);
        }, 1000);
    }
    if (area2KeyPlatform.userData.shouldRaise && !area2KeyPlatform.userData.isRaised) {
        raisePlatform(area2KeyPlatform, delta);
    }
}

export function isPlayerInArea1(camera) {
    if (!camera) return false;
    
    const playerX = camera.position.x;
    const playerZ = camera.position.z;
    
    // Área 1 - posições baseadas nas definições em createArea1
    // Centro: (-152.25, -131.0) com escala (125.0, 125.0)
    // Esquerda: (-210.0, -66.0) com escala (9.5, 6.0)
    // Direita: (-140.0, -66.0) com escala (100.5, 6.0)
    
    // Centro da área 1 (maior retângulo)
    const centerMinX = -152.25 - 125.0/2;  // -214.75
    const centerMaxX = -152.25 + 125.0/2;  // -89.75
    const centerMinZ = -131.0 - 125.0/2;   // -193.5
    const centerMaxZ = -131.0 + 125.0/2;   // -68.5
    
    // Parte esquerda
    const leftMinX = -210.0 - 9.5/2;       // -214.75
    const leftMaxX = -210.0 + 9.5/2;       // -205.25
    const leftMinZ = -66.0 - 6.0/2;        // -69.0
    const leftMaxZ = -66.0 + 6.0/2;        // -63.0
    
    // Parte direita
    const rightMinX = -140.0 - 100.5/2;    // -190.25
    const rightMaxX = -140.0 + 100.5/2;    // -89.75
    const rightMinZ = -66.0 - 6.0/2;       // -69.0
    const rightMaxZ = -66.0 + 6.0/2;       // -63.0
    
    // Verifica se está em alguma das partes da Área 1
    const inCenter = playerX >= centerMinX && playerX <= centerMaxX && 
                     playerZ >= centerMinZ && playerZ <= centerMaxZ;
                     
    const inLeft = playerX >= leftMinX && playerX <= leftMaxX && 
                   playerZ >= leftMinZ && playerZ <= leftMaxZ;
                   
    const inRight = playerX >= rightMinX && playerX <= rightMaxX && 
                    playerZ >= rightMinZ && playerZ <= rightMaxZ;
    
    return inCenter || inLeft || inRight;
}

// Verifica se o jogador está dentro da Área 2
export function isPlayerInArea2(camera) {
    if (!camera) return false;
    
    const playerX = camera.position.x;
    const playerZ = camera.position.z;
    
    // Área 2 - posições baseadas nas definições em createArea2
    // Centro: (0.0, -131.0) com escala (125.0, 125.0)
    // Esquerda: (-10.0, -66.0) com escala (105.0, 6.0)
    // Direita: (60.0, -66.0) com escala (5.0, 6.0)
    
    // Centro da área 2
    const centerMinX = 0.0 - 125.0/2;     // -62.5
    const centerMaxX = 0.0 + 125.0/2;     // 62.5
    const centerMinZ = -131.0 - 125.0/2;  // -193.5
    const centerMaxZ = -131.0 + 125.0/2;  // -68.5
    
    // Parte esquerda
    const leftMinX = -10.0 - 105.0/2;     // -62.5
    const leftMaxX = -10.0 + 105.0/2;     // 42.5
    const leftMinZ = -66.0 - 6.0/2;       // -69.0
    const leftMaxZ = -66.0 + 6.0/2;       // -63.0
    
    // Parte direita
    const rightMinX = 60.0 - 5.0/2;       // 57.5
    const rightMaxX = 60.0 + 5.0/2;       // 62.5
    const rightMinZ = -66.0 - 6.0/2;      // -69.0
    const rightMaxZ = -66.0 + 6.0/2;      // -63.0
    
    // Verifica se está em alguma das partes da Área 2
    const inCenter = playerX >= centerMinX && playerX <= centerMaxX && 
                     playerZ >= centerMinZ && playerZ <= centerMaxZ;
                     
    const inLeft = playerX >= leftMinX && playerX <= leftMaxX && 
                   playerZ >= leftMinZ && playerZ <= leftMaxZ;
                   
    const inRight = playerX >= rightMinX && playerX <= rightMaxX && 
                    playerZ >= rightMinZ && playerZ <= rightMaxZ;
    
    return inCenter || inLeft || inRight;
}

// Anima a subida suave da plataforma
function raisePlatform(platformGroup, delta) {
    const platform = platformGroup.userData.platform;
    const keyInstance = platformGroup.userData.keyInstance; // Agora é uma instância de Key
    const targetY = platformGroup.userData.targetY;
    
    if (platform.position.y < targetY) {
        const riseSpeed = 2; // Velocidade de subida
        const deltaY = riseSpeed * delta;
        
        // Mover a plataforma
        platform.position.y += deltaY;
        
        // Atualizar posição da chave Key instance para acompanhar a plataforma
        if (keyInstance && keyInstance.getMesh()) {
            const keyMesh = keyInstance.getMesh();
            
            // Manter a chave sempre 1 unidade acima da plataforma
            keyMesh.position.y = platform.position.y + 1.0;
            
            // Atualizar a posição interna da instância Key também
            keyInstance.position.y = keyMesh.position.y;
            keyInstance.originalY = keyMesh.position.y; // Atualizar Y base para flutuação
            
            // Tornar a chave visível quando a plataforma começar a subir
            if (!keyMesh.visible) {
                keyMesh.visible = true;
                console.log(`[ENVIRONMENT] ${keyInstance.getType()} key is now visible!`);
            }
        }
        
        if (platform.position.y >= targetY) {
            platform.position.y = targetY;
            // Position key further above the raised platform
            if (keyInstance && keyInstance.getMesh()) {
                const finalKeyY = targetY + 1.0;
                keyInstance.getMesh().position.y = finalKeyY;
                keyInstance.position.y = finalKeyY;
                keyInstance.originalY = finalKeyY;
            }
            platformGroup.userData.isRaised = true;
            console.log(`[ENVIRONMENT] Platform fully raised with ${keyInstance ? keyInstance.getType() : 'unknown'} key!`);
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
