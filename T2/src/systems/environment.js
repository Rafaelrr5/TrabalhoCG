import * as THREE from '../../../build/three.module.js';
import { setDefaultMaterial, createGroundPlaneXZ } from "../../../libs/util/util.js";
import { CONFIG } from '../core/config.js';
import { CSG } from '../../../libs/other/CSGMesh.js';
import { enemies, areAllEnemiesDefeated, areAllArea1EnemiesDefeated, areAllArea2EnemiesDefeated, cleanupDeadEnemies } from '../entities/enemies/enemy.js';
import {createElevator} from '../systems/elevator.js';
import { enableShadowsForAll } from './lights.js';
import { keyManager, Key } from '../entities/items/key.js';
import { createDoor, createtotem } from './door.js';
import { loadOBJModel } from '../utils/modelLoader.js';

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
    wall0.position.set(0.0, CONFIG.WALL_Y_POSITION, (-CONFIG.WORLD_SIZE/2)+0.1);
    wall1.position.set(0.0, CONFIG.WALL_Y_POSITION, CONFIG.WORLD_SIZE/2-0.1);
    wall1.rotateY(-1 * Math.PI);
    wall2.position.set((-CONFIG.WORLD_SIZE/2)+0.1, CONFIG.WALL_Y_POSITION, 0.0);
    wall2.rotateY(Math.PI / 2);
    wall3.position.set((CONFIG.WORLD_SIZE/2)-0.1, CONFIG.WALL_Y_POSITION, 0.0);
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
export async function createAreas(scene, collidableObjects) {
    // Materiais das áreas
    const materials = {
        stair: new THREE.MeshLambertMaterial({ color: 'blue' }),
        area1: new THREE.MeshLambertMaterial({color: 'lightblue'}),
        area2: new THREE.MeshLambertMaterial({color: 'red'}),
        area3: new THREE.MeshLambertMaterial({color: 'darkblue'}),
        area4: new THREE.MeshLambertMaterial({color: 'green'})
    };

    // Update loading progress function (if available globally)
    const updateProgress = window.updateLoadingProgress || function() {};
    
    updateProgress(52, 'Criando Área 1 (Templo Romano)...');
    createArea1(scene, materials, collidableObjects);
    
    updateProgress(54, 'Criando Área 2 (Labirinto Vermelho)...');
    createArea2(scene, materials, collidableObjects);
    
    updateProgress(56, 'Carregando Área 3 (Hangar)...');
    await createArea3(scene, materials, collidableObjects); // Await the hangar GLB loading
    
    updateProgress(62, 'Criando Área 4 (Zona Verde)...');
    createArea4(scene, materials, collidableObjects);
    
    // Armazena referência das plataformas
    const area1Group = scene.getObjectByName("Area1");
    if (area1Group) {
        area1KeyPlatform = area1Group.getObjectByName("KeyPlatform");
    }
    
    const area2Group = scene.getObjectByName("Area2");
    if (area2Group) {
        area2KeyPlatform = area2Group.getObjectByName("CentralBlock");
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
    
    // Adiciona estruturas de ruínas conectando as colunas
    const ruinStructures = createRuinStructures(scene);
    area1.add(ruinStructures);
    
    // Adiciona plataforma para a chave no centro da área
    const keyPlatform = createKeyPlatform(scene);
    area1.add(keyPlatform);
    
    scene.add(area1);
    stair1.add(createStair(-197.75, CONFIG.STAIR_HEIGHT_OFFSET, -62.8, CONFIG.AREA_HEIGHT, true, materials.stair));
    scene.add(stair1);
    markCollisionObject(area1, collidableObjects);
    markCollisionObject(stair1, collidableObjects);
    enableShadowsForAll(area1);
    enableShadowsForAll(stair1); 
    enableShadowsForAll(romanColumns);
    enableShadowsForAll(ruinStructures);
    enableShadowsForAll(keyPlatform);
}

// Cria a Área 2 (vermelha)
function createArea2(scene, materials, collidableObjects) {
    let areaGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    let area2_center = new THREE.Mesh(areaGeometry, materials.area2);
    let area2_left = new THREE.Mesh(areaGeometry, materials.area2);
    let area2_right = new THREE.Mesh(areaGeometry, materials.area2);

    const area2 = new THREE.Group();
    area2.name = "Area2";
    //const stair2 = new THREE.Group();

    area2_center.position.set(0.0, CONFIG.AREA_Y_POSITION, -131.0);
    area2_center.scale.set(125.0, CONFIG.AREA_HEIGHT, 125.0);
    area2_left.position.set(-10.0, CONFIG.AREA_Y_POSITION, -66.0);
    area2_left.scale.set(105.0, CONFIG.AREA_HEIGHT, 6.0);
    area2_right.position.set(60.0, CONFIG.AREA_Y_POSITION, -66.0);
    area2_right.scale.set(5.0, CONFIG.AREA_HEIGHT, 6.0);

    area2.add(area2_center);
    area2.add(area2_left);
    area2.add(area2_right);

    const point1 = {x: -54.5, z: -74.5};
    const point2 = {x: 56.5, z: -187.5};
    const blockgroup = createGradientBlocksWithGap(point1, point2, scene, 4.0, collidableObjects);
    area2.add(blockgroup);
  
    const centralBlock = createCentralBlockWithKey(scene);
    area2.add(centralBlock);
    
    scene.add(area2);

    markCollisionObject(area2, collidableObjects);
    markCollisionObject(centralBlock, collidableObjects); // Tornar o bloco central colidível

    createElevator(scene, collidableObjects, 50.0, -66.05);
    enableShadowsForAll(area2);

    createDoor(scene, collidableObjects, 50.0, -63, 15.0, 4.0, 'blue');
    createtotem(scene, collidableObjects, 60.0, -59.05, 'red');
}

// Cria a Área 3 (Hangar OBJ)
async function createArea3(scene, materials, collidableObjects) {
    const updateProgress = window.updateLoadingProgress || function() {};
    
    try {
        updateProgress(57, 'Carregando modelo do hangar...');
        
        const objPath = 'assets/models/Arched_hangar.obj';
        const mtlPath = 'assets/textures/Arched_hangar.mtl';
        
        
        let hangarModel = null;
        
        try {
            updateProgress(58, 'Carregando texturas do hangar...');
            hangarModel = await loadOBJModel(objPath, mtlPath, {
                scale: 5,
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                castShadow: true,
                receiveShadow: true,
                onProgress: (progress) => {
                    if (progress.total > 0) {
                        const loadPercent = (progress.loaded / progress.total * 100);
                        updateProgress(58 + (loadPercent * 0.02), `Carregando hangar: ${loadPercent.toFixed(1)}%`);
                    }
                }
            });
            updateProgress(60, 'Hangar carregado com materiais!');
        } catch (mtlError) {
            updateProgress(59, 'Carregando hangar sem texturas...');
            hangarModel = await loadOBJModel(objPath, null, {
                scale: 8.0,
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                castShadow: true,
                receiveShadow: true,
                onProgress: (progress) => {
                    if (progress.total > 0) {
                        const loadPercent = (progress.loaded / progress.total * 100);
                        updateProgress(59 + (loadPercent * 0.01), `Carregando hangar: ${loadPercent.toFixed(1)}%`);
                    }
                }
            });
            updateProgress(60, 'Hangar carregado!');
        }
        
        const area3 = new THREE.Group();
        area3.name = "Area3";
        
        hangarModel.position.set(156.25, CONFIG.AREA_Y_POSITION -2, -50.0);
        hangarModel.name = "HangarModel";
        
        hangarModel.visible = true;
        let hangarDoors = []; // Array to store door meshes for animation
        
        hangarModel.traverse((child) => {
            if (child.isMesh) {
                child.visible = true;
                child.castShadow = true;
                child.receiveShadow = true;
                
                const childName = (child.name || '').toLowerCase();
                if (childName.includes('door') || childName.includes('gate') || childName.includes('portal') ||
                    childName.includes('entrance') || childName.includes('opening')) {
                    hangarDoors.push(child);
                } else {
                    const bbox = new THREE.Box3().setFromObject(child);
                    const size = bbox.getSize(new THREE.Vector3());
                    const center = bbox.getCenter(new THREE.Vector3());
                    
                    const isVertical = size.y > size.x && size.y > size.z; // Taller than wide/deep
                    const isThin = (size.x < 5 || size.z < 5); // One dimension is thin
                    const isAtFront = Math.abs(center.z + 131.0) < 80; // Near the front of hangar area
                    
                    if (isVertical && isThin && isAtFront && size.y > 10) {
                        hangarDoors.push(child);
                    }
                }
                
                // Only apply fallback material if no material exists or it's a default basic material without name
                if (!child.material || 
                    (child.material.type === 'MeshBasicMaterial' && !child.material.name && !child.material.map)) {
                    child.material = new THREE.MeshLambertMaterial({
                        color: 0x888888, // Gray color for hangar
                        side: THREE.DoubleSide
                    });
                }
                
                if (child.material) {
                    child.material.needsUpdate = true;
                    // Ensure material is not transparent unless needed
                    if (child.material.transparent && child.material.opacity === 1.0) {
                        child.material.transparent = false;
                    }
                }
            }
        });
        hangarModel.userData.doors = hangarDoors;
        hangarModel.userData.doorsOpen = false;
        hangarModel.userData.animating = false;
        
        console.log(`[ENVIRONMENT] Found ${hangarDoors.length} door mesh(es) for animation`);
        
        area3.add(hangarModel);
        
        scene.add(area3);
        
        markCollisionObject(area3, collidableObjects);
        
        enableShadowsForAll(area3);
        
        console.log('[ENVIRONMENT] Hangar OBJ model loaded successfully!');
        console.log('[ENVIRONMENT] Hangar model position:', hangarModel.position);
        console.log('[ENVIRONMENT] Hangar model scale:', hangarModel.scale);
        console.log('[ENVIRONMENT] Hangar model bounding box:');
                
        try {
            updateProgress(61, 'Carregando avião...');

            const planeModel = await loadOBJModel('../../assets/objects/plane.obj', null, {
                scale: 0.5,
                position: { x: 0, y: 5, z: 0 }, // Position relative to hangar center
                rotation: { x: 0, y: Math.PI, z: 0 }, // Rotate 180 degrees to face forward
                castShadow: true,
                receiveShadow: true
            });
            
            planeModel.name = "PlaneModel";
            planeModel.position.set(156.25, CONFIG.AREA_Y_POSITION + 3, -50.0);
            
            area3.add(planeModel);
            
            console.log('[ENVIRONMENT] Plane model loaded and positioned inside hangar!');
            console.log('[ENVIRONMENT] Plane position:', planeModel.position);
            updateProgress(62, 'Avião carregado!');
            
        } catch (planeError) {
            console.error('[ENVIRONMENT] Error loading plane model:', planeError);
            console.log('[ENVIRONMENT] Continuing without plane...');
        }
        
        window.testHangarVisibility = function() {
            console.log('[DEBUG] Hangar visibility test:');
            console.log('  Hangar model visible:', hangarModel.visible);
            console.log('  Hangar position:', hangarModel.position);
            console.log('  Hangar in scene:', scene.getObjectByName('Area3') !== undefined);
            
            hangarModel.visible = true;
            hangarModel.traverse((child) => {
                if (child.isMesh) {
                    child.visible = true;
                    console.log('  Child mesh:', child.name, 'visible:', child.visible);
                }
            });
        };
        
        window.toggleHangarDoors = function() {
            console.log('[DEBUG] Toggling hangar doors...');
            animateHangarDoors(hangarModel, !hangarModel.userData.doorsOpen);
        };
        
    } catch (error) {
        console.error('[ENVIRONMENT] Error loading hangar OBJ model:', error);
        console.error('[ENVIRONMENT] Error details:', error.message);
        console.error('[ENVIRONMENT] Stack trace:', error.stack);
        
        console.log('[ENVIRONMENT] Creating fallback hangar...');
        
        const area3 = new THREE.Group();
        area3.name = "Area3";
        
        const hangarMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 }); // Dark gray
        
        const hangarBody = new THREE.BoxGeometry(100, 20, 80);
        const hangarMesh = new THREE.Mesh(hangarBody, hangarMaterial);
        hangarMesh.position.set(156.25, CONFIG.AREA_Y_POSITION + 12, -131.0); // Slightly above base plane
        hangarMesh.castShadow = true;
        hangarMesh.receiveShadow = true;
        area3.add(hangarMesh);
        
        for (let i = 0; i < 5; i++) {
            const roofGeometry = new THREE.BoxGeometry(100, 5, 10);
            const roofMesh = new THREE.Mesh(roofGeometry, hangarMaterial);
            const angle = (i - 2) * 0.3; // Create slight arch
            roofMesh.position.set(156.25, CONFIG.AREA_Y_POSITION + 22 + Math.cos(angle) * 5, -131.0 + (i - 2) * 15);
            roofMesh.rotation.x = angle;
            roofMesh.castShadow = true;
            roofMesh.receiveShadow = true;
            area3.add(roofMesh);
        }
        
        scene.add(area3);
                
        markCollisionObject(area3, collidableObjects);
        enableShadowsForAll(area3);
    }
}

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

// Cria estruturas de pedra em ruínas que conectam 3 colunas
function createRuinStructures(scene) {
    const ruinsGroup = new THREE.Group();
    ruinsGroup.name = "RuinStructures";
    
    // Material das ruínas (pedra mais escura e desgastada)
    const ruinMaterial = new THREE.MeshLambertMaterial({ 
        color: 0xd2b48c, // Tom de pedra mais escuro
        transparent: false
    });
    
    // Altura das colunas para calcular a posição das estruturas superiores
    const columnHeight = 12;
    const structureHeight = CONFIG.AREA_Y_POSITION + CONFIG.AREA_HEIGHT/2 + columnHeight + 1.5; // Acima dos capitéis
    
    // Definir grupos de colunas que serão conectadas por estruturas
    const ruinConnections = [
        // Estrutura principal: Grande estrutura conectando todos os pilares do lado norte (oposto à escada)
        // e se estendendo aos 2 primeiros pilares dos lados esquerdo e direito
        {
            columns: [
                // Lado esquerdo - 2 primeiros pilares
                { x: -152.25 - 50, z: -131.0 - 25 },
                { x: -152.25 - 50, z: -131.0 },
                // Lado norte (trás) - todos os 4 pilares
                { x: -152.25 - 40, z: -131.0 - 50 },
                { x: -152.25 - 15, z: -131.0 - 50 },
                { x: -152.25 + 15, z: -131.0 - 50 },
                { x: -152.25 + 40, z: -131.0 - 50 },
                // Lado direito - 2 primeiros pilares
                { x: -152.25 + 50, z: -131.0 - 25 },
                { x: -152.25 + 50, z: -131.0 }
            ],
            name: "MainRuinStructure"
        }
    ];
    
    ruinConnections.forEach((connection, index) => {
        const ruinStructure = createSingleRuinStructure(connection.columns, structureHeight, ruinMaterial);
        ruinStructure.name = connection.name;
        ruinsGroup.add(ruinStructure);
    });
    
    return ruinsGroup;
}

// Cria uma estrutura de ruína conectando múltiplas colunas
function createSingleRuinStructure(columnPositions, height, material) {
    const structureGroup = new THREE.Group();
    
    if (columnPositions.length < 3) {
        console.warn('Estrutura de ruína precisa de pelo menos 3 colunas');
        return structureGroup;
    }
    
    // Criar a estrutura principal com 8 colunas
    createMainRuinStructure(columnPositions, height, material, structureGroup);
    
    return structureGroup;
}

// Cria a estrutura principal de ruínas conectando 8 colunas
function createMainRuinStructure(columnPositions, height, material, structureGroup) {
    // Separar as colunas por grupos
    const leftColumns = columnPositions.slice(0, 2);   // 2 primeiros (lado esquerdo)
    const backColumns = columnPositions.slice(2, 6);   // 4 do meio (lado norte/trás)
    const rightColumns = columnPositions.slice(6, 8);  // 2 últimos (lado direito)
    
    // Criar viga principal horizontal conectando todo o lado norte
    const backCenterX = (backColumns[0].x + backColumns[3].x) / 2;
    const backCenterZ = backColumns[0].z; // Todos têm o mesmo Z
    const backLength = Math.abs(backColumns[3].x - backColumns[0].x) + 6;
    
    const mainBackBeam = createDetailedBeamWithCSG(backLength, 3, 4, material);
    mainBackBeam.position.set(backCenterX, height, backCenterZ);
    structureGroup.add(mainBackBeam);
    
    // Criar vigas conectoras do lado esquerdo
    const leftBeamLength = Math.abs(leftColumns[0].z - backColumns[0].z) + 4;
    const leftBeam1 = createDetailedBeamWithCSG(4, 3, leftBeamLength, material);
    leftBeam1.position.set(leftColumns[0].x, height, (leftColumns[0].z + backColumns[0].z) / 2);
    structureGroup.add(leftBeam1);
    
    const leftBeam2 = createDetailedBeamWithCSG(4, 3, leftBeamLength - 10, material);
    leftBeam2.position.set(leftColumns[1].x, height, (leftColumns[1].z + backColumns[1].z) / 2);
    structureGroup.add(leftBeam2);
    
    // Criar vigas conectoras do lado direito
    const rightBeamLength = Math.abs(rightColumns[0].z - backColumns[3].z) + 4;
    const rightBeam1 = createDetailedBeamWithCSG(4, 3, rightBeamLength, material);
    rightBeam1.position.set(rightColumns[0].x, height, (rightColumns[0].z + backColumns[3].z) / 2);
    structureGroup.add(rightBeam1);
    
    const rightBeam2 = createDetailedBeamWithCSG(4, 3, rightBeamLength - 10, material);
    rightBeam2.position.set(rightColumns[1].x, height, (rightColumns[1].z + backColumns[2].z) / 2);
    structureGroup.add(rightBeam2);
    
    // Criar arcos entre as colunas do lado norte
    for (let i = 0; i < backColumns.length - 1; i++) {
        const pos1 = backColumns[i];
        const pos2 = backColumns[i + 1];
        const midX = (pos1.x + pos2.x) / 2;
        const midZ = (pos1.z + pos2.z) / 2;
        const distance = Math.abs(pos2.x - pos1.x);
        
        const archGroup = createBrokenArch(distance, material);
        archGroup.position.set(midX, height - 1, midZ);
        structureGroup.add(archGroup);
    }
    
    // Criar arcos conectores nos lados
    // Lado esquerdo
    const leftArch1 = createBrokenArch(Math.abs(leftColumns[0].z - backColumns[0].z), material);
    leftArch1.position.set(leftColumns[0].x, height - 1, (leftColumns[0].z + backColumns[0].z) / 2);
    leftArch1.rotation.y = Math.PI / 2;
    structureGroup.add(leftArch1);
    
    // Lado direito
    const rightArch1 = createBrokenArch(Math.abs(rightColumns[0].z - backColumns[3].z), material);
    rightArch1.position.set(rightColumns[0].x, height - 1, (rightColumns[0].z + backColumns[3].z) / 2);
    rightArch1.rotation.y = Math.PI / 2;
    structureGroup.add(rightArch1);
    
    // Adicionar capitéis decorativos e fragmentos em todas as colunas
    columnPositions.forEach((pos, i) => {
        const decorativeCapital = createDamagedCapital(material);
        decorativeCapital.position.set(pos.x, height + 2, pos.z);
        structureGroup.add(decorativeCapital);
        
        createComplexFragments(pos.x, pos.z, height, material, structureGroup);
    });
    
    // Adicionar detalhes arquitetônicos romanos na viga principal
    createRomanArchitecturalDetails(backCenterX, backCenterZ, height, backLength, 4, material, structureGroup, true);
    
    // Adicionar torres de ruínas nas extremidades
    createRuinTower(backColumns[0].x, backColumns[0].z, height, material, structureGroup);
    createRuinTower(backColumns[3].x, backColumns[3].z, height, material, structureGroup);
}

// Cria uma torre de ruína decorativa
function createRuinTower(x, z, height, material, parentGroup) {
    const towerGroup = new THREE.Group();
    
    // Base da torre
    const baseGeometry = new THREE.CylinderGeometry(2.5, 3, 2, 12);
    const baseMesh = new THREE.Mesh(baseGeometry, material);
    baseMesh.position.set(x, height + 3, z);
    towerGroup.add(baseMesh);
    
    // Corpo da torre (quebrado)
    const bodyGeometry = new THREE.CylinderGeometry(2, 2.5, 4, 8);
    const bodyMesh = new THREE.Mesh(bodyGeometry, material);
    bodyMesh.position.set(x, height + 6, z);
    // Inclinar ligeiramente para parecer danificada
    bodyMesh.rotation.z = (Math.random() - 0.5) * 0.3;
    towerGroup.add(bodyMesh);
    
    // Adicionar danos à torre
    const damageCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < damageCount; i++) {
        const damageGeometry = new THREE.SphereGeometry(0.3 + Math.random() * 0.4);
        const damageMesh = new THREE.Mesh(damageGeometry, material);
        damageMesh.position.set(
            x + (Math.random() - 0.5) * 3,
            height + 3 + Math.random() * 5,
            z + (Math.random() - 0.5) * 3
        );
        
        const holeMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x3a3a3a,
            transparent: true,
            opacity: 0.6
        });
        damageMesh.material = holeMaterial;
        towerGroup.add(damageMesh);
    }
    
    towerGroup.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    
    parentGroup.add(towerGroup);
}

// Cria uma viga detalhada usando operações CSG
function createDetailedBeamWithCSG(length, height, width, material) {
    const beamGroup = new THREE.Group();
    
    // Viga principal
    const mainBeamGeometry = new THREE.BoxGeometry(length, height, width);
    const mainBeamMesh = new THREE.Mesh(mainBeamGeometry, material);
    
    try {
        // Criar molduras decorativas usando CSG
        const moldingHeight = height * 0.3;
        const moldingGeometry1 = new THREE.BoxGeometry(length + 0.5, moldingHeight, width + 0.5);
        const molding1 = new THREE.Mesh(moldingGeometry1, material);
        molding1.position.y = height/2 - moldingHeight/2;
        
        const moldingGeometry2 = new THREE.BoxGeometry(length + 0.5, moldingHeight, width + 0.5);
        const molding2 = new THREE.Mesh(moldingGeometry2, material);
        molding2.position.y = -height/2 + moldingHeight/2;
        
        beamGroup.add(mainBeamMesh);
        beamGroup.add(molding1);
        beamGroup.add(molding2);
        
        // Adicionar danos usando CSG (buracos e rachaduras)
        const damageCount = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < damageCount; i++) {
            const damageSize = 0.5 + Math.random() * 1.0;
            const damageGeometry = new THREE.SphereGeometry(damageSize);
            const damageMesh = new THREE.Mesh(damageGeometry, material);
            damageMesh.position.set(
                (Math.random() - 0.5) * length * 0.8,
                (Math.random() - 0.5) * height * 0.6,
                (Math.random() - 0.5) * width * 0.8
            );
            
            // Criar material escuro para os buracos
            const holeMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x4a4a4a,
                transparent: true,
                opacity: 0.8
            });
            damageMesh.material = holeMaterial;
            beamGroup.add(damageMesh);
        }
        
    } catch (error) {
        console.warn('CSG operation failed, using simple beam:', error);
        beamGroup.add(mainBeamMesh);
    }
    
    beamGroup.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    
    return beamGroup;
}

// Cria arcos quebrados entre as colunas
function createBrokenArchesBetweenColumns(columnPositions, height, material, parentGroup, isHorizontal) {
    for (let i = 0; i < columnPositions.length - 1; i++) {
        const pos1 = columnPositions[i];
        const pos2 = columnPositions[i + 1];
        
        const midX = (pos1.x + pos2.x) / 2;
        const midZ = (pos1.z + pos2.z) / 2;
        const distance = Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.z - pos1.z, 2));
        
        // Criar arco quebrado
        const archGroup = createBrokenArch(distance, material);
        archGroup.position.set(midX, height - 1, midZ);
        
        // Orientar o arco corretamente
        if (!isHorizontal) {
            archGroup.rotation.y = Math.PI / 2;
        }
        
        parentGroup.add(archGroup);
    }
}

// Cria um arco quebrado usando CSG
function createBrokenArch(span, material) {
    const archGroup = new THREE.Group();
    
    try {
        const archRadius = span / 2.5;
        const archThickness = 1.5;
        const archHeight = archRadius * 1.2;
        
        // Criar geometria do arco usando torus e box
        const archGeometry = new THREE.TorusGeometry(archRadius, archThickness / 2, 8, 16, Math.PI);
        const archMesh = new THREE.Mesh(archGeometry, material);
        archMesh.rotation.z = Math.PI;
        
        // Adicionar pilares do arco
        const pillarGeometry = new THREE.BoxGeometry(archThickness, archHeight, archThickness);
        const leftPillar = new THREE.Mesh(pillarGeometry, material);
        const rightPillar = new THREE.Mesh(pillarGeometry, material);
        
        leftPillar.position.set(-archRadius, -archHeight/2, 0);
        rightPillar.position.set(archRadius, -archHeight/2, 0);
        
        archGroup.add(archMesh);
        archGroup.add(leftPillar);
        archGroup.add(rightPillar);
        
        // Adicionar danos aleatórios ao arco
        if (Math.random() > 0.3) {
            const breakGeometry = new THREE.BoxGeometry(
                archThickness * 2,
                archThickness,
                archThickness * 2
            );
            const breakMesh = new THREE.Mesh(breakGeometry, material);
            breakMesh.position.set(
                (Math.random() - 0.5) * archRadius,
                Math.random() * archHeight * 0.5,
                0
            );
            
            const holeMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x3a3a3a,
                transparent: true,
                opacity: 0.7
            });
            breakMesh.material = holeMaterial;
            archGroup.add(breakMesh);
        }
        
    } catch (error) {
        console.warn('Failed to create arch with CSG, using simple geometry:', error);
        // Fallback simples
        const simpleArchGeometry = new THREE.BoxGeometry(span, 1, 1.5);
        const simpleArch = new THREE.Mesh(simpleArchGeometry, material);
        archGroup.add(simpleArch);
    }
    
    archGroup.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    
    return archGroup;
}

// Cria um capitel danificado
function createDamagedCapital(material) {
    const capitalGroup = new THREE.Group();
    
    // Base do capitel
    const baseGeometry = new THREE.CylinderGeometry(3, 2.5, 0.8, 12);
    const baseMesh = new THREE.Mesh(baseGeometry, material);
    capitalGroup.add(baseMesh);
    
    // Ábaco (parte superior quadrada)
    const abacusGeometry = new THREE.BoxGeometry(3.5, 0.4, 3.5);
    const abacusMesh = new THREE.Mesh(abacusGeometry, material);
    abacusMesh.position.y = 0.6;
    capitalGroup.add(abacusMesh);
    
    // Adicionar volutas (decorações enroladas) danificadas
    for (let i = 0; i < 4; i++) {
        if (Math.random() > 0.3) { // Algumas volutas podem estar quebradas
            const volutaGeometry = new THREE.TorusGeometry(0.3, 0.1, 6, 12);
            const volutaMesh = new THREE.Mesh(volutaGeometry, material);
            const angle = (i / 4) * Math.PI * 2;
            volutaMesh.position.set(
                Math.cos(angle) * 1.2,
                0.2,
                Math.sin(angle) * 1.2
            );
            volutaMesh.rotation.z = Math.PI / 2;
            volutaMesh.rotation.y = angle;
            capitalGroup.add(volutaMesh);
        }
    }
    
    // Adicionar danos
    const damageCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < damageCount; i++) {
        const damageGeometry = new THREE.SphereGeometry(0.2 + Math.random() * 0.3);
        const damageMesh = new THREE.Mesh(damageGeometry, material);
        damageMesh.position.set(
            (Math.random() - 0.5) * 2,
            Math.random() * 0.8,
            (Math.random() - 0.5) * 2
        );
        
        const holeMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x4a4a4a,
            transparent: true,
            opacity: 0.6
        });
        damageMesh.material = holeMaterial;
        capitalGroup.add(damageMesh);
    }
    
    capitalGroup.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    
    return capitalGroup;
}

// Cria fragmentos complexos ao redor das colunas
function createComplexFragments(x, z, height, material, parentGroup) {
    const fragmentCount = 3 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < fragmentCount; i++) {
        const fragmentGroup = new THREE.Group();
        
        // Criar fragmentos com formas variadas
        const shapes = ['box', 'cylinder', 'cone'];
        const shapeType = shapes[Math.floor(Math.random() * shapes.length)];
        
        let fragmentGeometry;
        const size = 0.3 + Math.random() * 0.8;
        
        switch (shapeType) {
            case 'box':
                fragmentGeometry = new THREE.BoxGeometry(
                    size,
                    size * (0.5 + Math.random()),
                    size * (0.5 + Math.random())
                );
                break;
            case 'cylinder':
                fragmentGeometry = new THREE.CylinderGeometry(
                    size * 0.5,
                    size * 0.7,
                    size,
                    8
                );
                break;
            case 'cone':
                fragmentGeometry = new THREE.ConeGeometry(
                    size * 0.6,
                    size * 1.2,
                    8
                );
                break;
        }
        
        const fragmentMesh = new THREE.Mesh(fragmentGeometry, material);
        
        // Posicionar fragmentos ao redor da coluna
        const angle = Math.random() * Math.PI * 2;
        const distance = 3 + Math.random() * 4;
        fragmentMesh.position.set(
            x + Math.cos(angle) * distance,
            height - 2 + Math.random() * 3,
            z + Math.sin(angle) * distance
        );
        
        // Rotação aleatória para parecer caído naturalmente
        fragmentMesh.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        
        fragmentMesh.castShadow = true;
        fragmentMesh.receiveShadow = true;
        fragmentGroup.add(fragmentMesh);
        
        parentGroup.add(fragmentGroup);
    }
}

// Adiciona detalhes arquitetônicos romanos
function createRomanArchitecturalDetails(centerX, centerZ, height, length, width, material, parentGroup, isHorizontal) {
    // Criar friso decorativo
    const friezeHeight = 0.6;
    const friezeGeometry = new THREE.BoxGeometry(
        isHorizontal ? length : width,
        friezeHeight,
        isHorizontal ? width : length
    );
    const friezeMesh = new THREE.Mesh(friezeGeometry, material);
    friezeMesh.position.set(centerX, height + 2, centerZ);
    
    // Adicionar decorações ao friso
    const decorationCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < decorationCount; i++) {
        const decorationGeometry = new THREE.SphereGeometry(0.1 + Math.random() * 0.1);
        const decorationMesh = new THREE.Mesh(decorationGeometry, material);
        
        const spacing = (isHorizontal ? length : width) / (decorationCount + 1);
        decorationMesh.position.set(
            centerX + (isHorizontal ? (i - decorationCount/2) * spacing * 0.8 : 0),
            height + 2,
            centerZ + (!isHorizontal ? (i - decorationCount/2) * spacing * 0.8 : 0)
        );
        
        decorationMesh.castShadow = true;
        decorationMesh.receiveShadow = true;
        parentGroup.add(decorationMesh);
    }
    
    friezeMesh.castShadow = true;
    friezeMesh.receiveShadow = true;
    parentGroup.add(friezeMesh);
    
    // Adicionar cornija quebrada
    if (Math.random() > 0.4) {
        const corniceGeometry = new THREE.BoxGeometry(
            isHorizontal ? length * 1.1 : width * 1.1,
            0.4,
            isHorizontal ? width * 1.1 : length * 1.1
        );
        const corniceMesh = new THREE.Mesh(corniceGeometry, material);
        corniceMesh.position.set(centerX, height + 2.8, centerZ);
        
        // Adicionar quebra na cornija
        const breakSize = 0.8 + Math.random() * 0.4;
        const breakGeometry = new THREE.BoxGeometry(breakSize, 0.6, breakSize);
        const breakMesh = new THREE.Mesh(breakGeometry, material);
        breakMesh.position.set(
            centerX + (Math.random() - 0.5) * (isHorizontal ? length : width) * 0.6,
            height + 2.8,
            centerZ + (Math.random() - 0.5) * (isHorizontal ? width : length) * 0.6
        );
        
        const holeMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x2a2a2a,
            transparent: true,
            opacity: 0.8
        });
        breakMesh.material = holeMaterial;
        
        corniceMesh.castShadow = true;
        corniceMesh.receiveShadow = true;
        breakMesh.castShadow = true;
        breakMesh.receiveShadow = true;
        
        parentGroup.add(corniceMesh);
        parentGroup.add(breakMesh);
    }
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

function createCentralBlockWithKey(scene) {
    const blockGroup = new THREE.Group();
    blockGroup.name = "CentralBlock";
    
    const blockMaterial = new THREE.MeshLambertMaterial({ color: 0x8B0000 }); // Vermelho escuro
    
    // Criar bloco central como um cubo grande
    const blockGeometry = new THREE.BoxGeometry(12, 12, 12);
    const centralBlock = new THREE.Mesh(blockGeometry, blockMaterial);
    centralBlock.position.set(0.0, CONFIG.AREA_Y_POSITION + 6, -131.0); // Posição inicial no chão
    centralBlock.castShadow = true;
    centralBlock.receiveShadow = true;
    blockGroup.add(centralBlock);
    
    // Criar a chave amarela na posição final (mesma altura da chave vermelha após subir)
    const redKeyTargetY = CONFIG.AREA_Y_POSITION + CONFIG.AREA_HEIGHT/2 + 0.5;
    const finalKeyHeight = redKeyTargetY + 1.0; // Mesma altura da chave vermelha após subir
    const keyPosition = new THREE.Vector3(0.0, finalKeyHeight, -131.0);
    const yellowKeyInstance = new Key('yellow', keyPosition);
    
    if (keyManager.addKey(yellowKeyInstance, scene)) {
        if (yellowKeyInstance.getMesh()) {
            yellowKeyInstance.getMesh().visible = false; // Inicialmente invisível
            yellowKeyInstance.getMesh().position.copy(keyPosition);
            yellowKeyInstance.position.copy(keyPosition);
            yellowKeyInstance.originalY = finalKeyHeight;
        }
    }
    
    // Configurar userData para controle da animação
    blockGroup.userData.centralBlock = centralBlock;
    blockGroup.userData.keyInstance = yellowKeyInstance;
    blockGroup.userData.isRaised = false;
    blockGroup.userData.shouldRaise = false;
    blockGroup.userData.originalY = CONFIG.AREA_Y_POSITION + 6;
    blockGroup.userData.targetY = CONFIG.AREA_Y_POSITION + 20; // Altura final
    
    return blockGroup;
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
        area2KeyPlatform.userData.shouldRaise = true;
        setTimeout(() => {
            cleanupDeadEnemies(area2KeyPlatform.parent);
        }, 1000);
    }
    
    if (area2KeyPlatform.userData.shouldRaise && !area2KeyPlatform.userData.isRaised) {
        raiseCentralBlock(area2KeyPlatform, delta);
    }
}

export function isPlayerInArea1(camera) {
    if (!camera) return false;
    
    const playerX = camera.position.x;
    const playerZ = camera.position.z;
    
    // Área 1 - posições baseadas nas definições em createArea1
    // Centro: (-152.25, -131.0), dimensões 125x125
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

function createGradientBlocksWithGap(point1, point2, scene, baseHeight, collidableObjects) {
    // Determinar os limites da área
    const minX = Math.min(point1.x, point2.x);
    const maxX = Math.max(point1.x, point2.x);
    const minZ = Math.min(point1.z, point2.z);
    const maxZ = Math.max(point1.z, point2.z);
    
    // Calcular o centro da área
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    
    // Tamanho do bloco e espaço total entre blocos
    const blockSize = 4.0;
    const gapSize = 12.0;
    const totalSpacing = blockSize + gapSize;
    
    // Criar um grupo para os blocos
    const blocksGroup = new THREE.Group();
    
    // Array para armazenar todos os blocos criados
    const blocks = [];
    
    // Gerar blocos com o espaçamento correto
    for (let x = minX; x <= maxX; x += totalSpacing) {
        for (let z = minZ; z <= maxZ; z += totalSpacing) {
            // Calcular distância normalizada do centro (0 a 1)
            const maxDistX = (maxX - minX) / 2;
            const maxDistZ = (maxZ - minZ) / 2;
            const distX = Math.abs(x - centerX) / maxDistX;
            const distZ = Math.abs(z - centerZ) / maxDistZ;
            // Usar a maior distância (X ou Z) para determinar a altura
            const dist = Math.max(distX, distZ);
            
            // Calcular altura baseada na distância (2.5 nas bordas, 20 no centro)
            const heightVariation = 2.5 + (20 - 2.5) * (1 - dist);
            
            // Altura final é a baseHeight + a variação
            const finalHeight = baseHeight + (heightVariation/2);
            
            // Criar geometria do bloco
            const geometry = new THREE.BoxGeometry(blockSize, heightVariation, blockSize);
            const material = new THREE.MeshLambertMaterial({ color: 'red' });
            const block = new THREE.Mesh(geometry, material);
            
            // Posicionar o bloco considerando a baseHeight
            block.position.set(x, finalHeight, z);
            
            // Armazenar informações do bloco
            blocks.push({
                mesh: block,
                x: x,
                z: z,
                distanceToCenter: Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(z - centerZ, 2))
            });
            
            // Adicionar ao grupo
            blocksGroup.add(block);
        }
    }
    
    // Ordenar blocos por proximidade ao centro
    blocks.sort((a, b) => a.distanceToCenter - b.distanceToCenter);
    
    // Determinar quantos blocos remover (1 se ímpar, 4 se par)
    const blocksToRemove = blocks.length % 2 === 1 ? 
        [blocks[0]] : // Se ímpar, remover o mais central
        blocks.slice(0, 4); // Se par, remover os 4 mais centrais
    
    // Remover os blocos centrais
    for (const block of blocksToRemove) {
        blocksGroup.remove(block.mesh);
        // Opcional: adicionar um marcador visual no espaço vazio
        //const markerGeometry = new THREE.SphereGeometry(0.5);
        //const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        //const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        //marker.position.set(block.x, baseHeight + 0.5, block.z);
        //blocksGroup.add(marker);
    }
    
    // Adicionar o grupo à cena
    scene.add(blocksGroup);
    markCollisionObject(blocksGroup, collidableObjects);

    return blocksGroup;
}

function raiseCentralBlock(blockGroup, delta) {
    const centralBlock = blockGroup.userData.centralBlock;
    const keyInstance = blockGroup.userData.keyInstance;
    const originalY = blockGroup.userData.originalY;
    const targetY = blockGroup.userData.targetY;
    
    if (centralBlock.position.y < targetY) {
        const riseSpeed = 3; // Velocidade de elevação
        const deltaY = riseSpeed * delta;
        
        // Elevar o bloco central
        centralBlock.position.y += deltaY;
        
        // Tornar a chave visível quando o bloco começar a se elevar
        if (keyInstance && keyInstance.getMesh()) {
            const keyMesh = keyInstance.getMesh();
            
            if (!keyMesh.visible) {
                keyMesh.visible = true;
            }
        }
        
        if (centralBlock.position.y >= targetY) {
            centralBlock.position.y = targetY;
            
            // Quando o bloco atinge a altura final, posicionar a chave na mesma altura da chave vermelha
            if (keyInstance && keyInstance.getMesh()) {
                // Altura final da chave vermelha = targetY + 1.0 onde targetY = CONFIG.AREA_Y_POSITION + CONFIG.AREA_HEIGHT/2 + 0.5
                const redKeyTargetY = CONFIG.AREA_Y_POSITION + CONFIG.AREA_HEIGHT/2 + 0.5;
                const finalKeyHeight = redKeyTargetY + 1.0; // Mesma altura da chave vermelha após subir
                keyInstance.getMesh().position.y = finalKeyHeight;
                keyInstance.position.y = finalKeyHeight;
                keyInstance.originalY = finalKeyHeight;
            }
            
            blockGroup.userData.isRaised = true;
        }
    }
}


// Easing functions for smooth animation
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t) {
    return t * t * t;
}

// Animate hangar doors opening/closing
export function animateHangarDoors(hangarModel, shouldOpen) {
    if (!hangarModel || !hangarModel.userData.doors || hangarModel.userData.animating) {
        console.log('[HANGAR] Cannot animate doors - missing model, doors, or already animating');
        return;
    }
    
    const doors = hangarModel.userData.doors;
    if (doors.length === 0) {
        console.log('[HANGAR] No doors found for animation');
        return;
    }
    
    console.log(`[HANGAR] Starting door animation - ${shouldOpen ? 'Opening' : 'Closing'} ${doors.length} door(s)`);
    
    hangarModel.userData.animating = true;
    const animationDuration = 3000; // 3 seconds
    const startTime = Date.now();
    
    // Store initial positions/rotations for all doors
    const doorInitialStates = doors.map(door => ({
        door: door,
        initialPosition: door.position.clone(),
        initialRotation: door.rotation.clone(),
        // Calculate movement based on door position and orientation
        moveDirection: calculateDoorMovement(door, hangarModel)
    }));
    
    function animateFrame() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / animationDuration, 1.0);
        
        // Use easing for smooth animation
        const easedProgress = shouldOpen ? easeOutCubic(progress) : easeInCubic(progress);
        
        doorInitialStates.forEach(({ door, initialPosition, initialRotation, moveDirection }) => {
            // Calculate animation progress for this door
            const animProgress = shouldOpen ? easedProgress : (1.0 - easedProgress);
            
            // Apply movement based on door type
            if (moveDirection.type === 'slide') {
                // Sliding doors (horizontal movement)
                door.position.copy(initialPosition);
                door.position.add(moveDirection.direction.clone().multiplyScalar(animProgress * moveDirection.distance));
            } else if (moveDirection.type === 'swing') {
                // Swinging doors (rotation)
                door.rotation.copy(initialRotation);
                door.rotation.y += animProgress * moveDirection.angle;
            } else if (moveDirection.type === 'fold') {
                // Folding doors (up/down movement)
                door.position.copy(initialPosition);
                door.position.y += animProgress * moveDirection.distance;
            }
        });
        
        if (progress < 1.0) {
            requestAnimationFrame(animateFrame);
        } else {
            // Animation complete
            hangarModel.userData.animating = false;
            hangarModel.userData.doorsOpen = shouldOpen;
        }
    }
    
    requestAnimationFrame(animateFrame);
}

// Calculate how each door should move based on its position and orientation
function calculateDoorMovement(door, hangarModel) {
    const doorBbox = new THREE.Box3().setFromObject(door);
    const hangarBbox = new THREE.Box3().setFromObject(hangarModel);
    
    const doorCenter = doorBbox.getCenter(new THREE.Vector3());
    const hangarCenter = hangarBbox.getCenter(new THREE.Vector3());
    const doorSize = doorBbox.getSize(new THREE.Vector3());
    
    // Determine door type based on size and position
    const isWide = doorSize.x > doorSize.z;
    const isTall = doorSize.y > Math.max(doorSize.x, doorSize.z);
    
    // Check if door is at the front/back of hangar
    const isAtFront = doorCenter.z > hangarCenter.z;
    const isAtSide = Math.abs(doorCenter.x - hangarCenter.x) > Math.abs(doorCenter.z - hangarCenter.z);
    
    if (isTall && isWide && isAtFront) {
        // Large front doors - slide horizontally
        return {
            type: 'slide',
            direction: new THREE.Vector3(doorCenter.x > hangarCenter.x ? 1 : -1, 0, 0),
            distance: doorSize.x * 0.8 // Move by 80% of door width
        };
    } else if (isTall && !isWide) {
        // Tall narrow doors - swing open
        return {
            type: 'swing',
            angle: doorCenter.x > hangarCenter.x ? Math.PI / 2 : -Math.PI / 2 // 90 degrees
        };
    } else if (!isTall && isWide) {
        // Wide low doors - fold up/down
        return {
            type: 'fold',
            distance: doorSize.y * 2 // Move up by twice the door height
        };
    } else {
        // Default: slide away from center
        const direction = new THREE.Vector3()
            .subVectors(doorCenter, hangarCenter)
            .normalize();
        direction.y = 0; // Keep movement horizontal
        
        return {
            type: 'slide',
            direction: direction,
            distance: Math.max(doorSize.x, doorSize.z) * 1.2
        };
    }
}

// Update function to handle automatic door opening based on player proximity
export function updateHangarDoors(delta, camera, scene) {
    const area3 = scene.getObjectByName('Area3');
    if (!area3) return;
    
    const hangar = area3.getObjectByName('HangarModel');
    if (!hangar || !hangar.userData.doors) return;
    
    // Auto-open doors when player is near
    const playerPosition = camera.position;
    const hangarPosition = hangar.position;
    const distance = playerPosition.distanceTo(hangarPosition);
    
    const openDistance = 60; // Distance to open doors
    const closeDistance = 100; // Distance to close doors
    
    if (distance < openDistance && !hangar.userData.doorsOpen && !hangar.userData.animating) {
        animateHangarDoors(hangar, true);
    } else if (distance > closeDistance && hangar.userData.doorsOpen && !hangar.userData.animating) {
        animateHangarDoors(hangar, false);
    }
}