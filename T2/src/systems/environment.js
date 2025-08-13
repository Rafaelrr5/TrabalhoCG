import * as THREE from '../../../build/three.module.js';
import { createGroundPlaneXZ } from "../../../libs/util/util.js";
import { WORLD_CONFIG } from '../core/config/worldConfig.js';
import { TEXTURE_CONFIG } from '../core/config/textureConfig.js';
import { ITEMS_CONFIG } from '../core/config/itemsConfig.js';
import { areAllArea1EnemiesDefeated, areAllArea2EnemiesDefeated, cleanupDeadEnemies } from '../entities/enemies/enemy.js';
import {createElevator} from '../systems/elevator.js';
import { enableShadowsForAll } from './lights.js';
import { keyManager, Key } from '../entities/items/key.js';
import { createDoor, createtotem } from './door.js';
import { loadOBJModel } from '../utils/modelLoader.js';
import { applyTexture, QuickTexture } from '../utils/textureUtils.js';
import { createArea3, isPlayerInsideHangar } from '../components/hangar.js';
import { createArea4Maze } from '../components/labirinth.js';
import { createArea4Totem, setArea4Walls } from './area4Access.js';

export let area1KeyPlatform = null;
export let area2KeyPlatform = null;

// Re-exportar funções do hangar para manter compatibilidade
export { isPlayerInsideHangar, createArea3 } from '../components/hangar.js';

export function createWalls(scene, collidableObjects) {
    let material = new THREE.MeshLambertMaterial({ color: 'orange' });
    let plane = createGroundPlaneXZ(WORLD_CONFIG.WORLD_SIZE, WORLD_CONFIG.WORLD_SIZE);
    plane.receiveShadow = true; 

    plane.position.y = WORLD_CONFIG.GROUND_HEIGHT;
    
    // Aplicar textura de piso intertravado no chão principal
    QuickTexture.floor(plane);
    
    scene.add(plane);
    plane.receiveShadow = true;
    collidableObjects.push(plane);

    // Cria geometria das paredes
    let wallGeometry = new THREE.PlaneGeometry(WORLD_CONFIG.WORLD_SIZE, WORLD_CONFIG.WALL_HEIGHT);
    
    // Cria as 4 paredes
    let wall0 = new THREE.Mesh(wallGeometry, material);
    let wall1 = new THREE.Mesh(wallGeometry, material);
    let wall2 = new THREE.Mesh(wallGeometry, material);    
    let wall3 = new THREE.Mesh(wallGeometry, material); 
    const walls = new THREE.Group();

    // Posiciona as paredes
    wall0.position.set(0.0, WORLD_CONFIG.WALL_Y_POSITION, (-WORLD_CONFIG.WORLD_SIZE/2)+0.1);
    wall1.position.set(0.0, WORLD_CONFIG.WALL_Y_POSITION, WORLD_CONFIG.WORLD_SIZE/2-0.1);
    wall1.rotateY(-1 * Math.PI);
    wall2.position.set((-WORLD_CONFIG.WORLD_SIZE/2)+0.1, WORLD_CONFIG.WALL_Y_POSITION, 0.0);
    wall2.rotateY(Math.PI / 2);
    wall3.position.set((WORLD_CONFIG.WORLD_SIZE/2)-0.1, WORLD_CONFIG.WALL_Y_POSITION, 0.0);
    wall3.rotateY(-1 * Math.PI / 2);

    // Adiciona paredes à cena
    walls.add(wall0);
    walls.add(wall1);
    walls.add(wall2);
    walls.add(wall3);
    walls.name = "MainWalls"; // Adiciona nome para identificar o grupo
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
    
    // Aplicar texturas após criação das áreas
    updateProgress(64, 'Aplicando texturas...');
    await applyEnvironmentTextures(scene);
    updateProgress(66, 'Texturas aplicadas!');
}

async function applyEnvironmentTextures(scene) {
    
    // Aplicar textura às paredes principais do mundo
    const mainWalls = scene.getObjectByName("MainWalls");
    if (mainWalls && mainWalls.children.length > 0) {
        QuickTexture.wall(mainWalls);
    }
    
    const area2Group = scene.getObjectByName("Area2");
    if (area2Group) {
        const metalBlocksGroup = area2Group.getObjectByName("MetalBlocks");
        if (metalBlocksGroup && metalBlocksGroup.children.length > 0) {
            QuickTexture.metal(metalBlocksGroup);
        }
    }
    
    // Aplicar texturas aos muros da área 4
    const area4Group = scene.getObjectByName("Area4");
    if (area4Group) {
        const wallsGroup = area4Group.getObjectByName("Area4Walls");
        if (wallsGroup && wallsGroup.children.length > 0) {
            // Aplicar textura neutra e discreta aos muros
            QuickTexture.stone(wallsGroup);
        }
        
        // Aplicar texturas ao labirinto
        const mazeGroup = area4Group.getObjectByName("Area4Maze");
        if (mazeGroup && mazeGroup.children.length > 0) {
            // Aplicar textura de pedra ao labirinto
            QuickTexture.stone(mazeGroup);
        }
    }
    
    console.log('[ENVIRONMENT] ✅ Texturas do ambiente processadas');
}

function createArea1(scene, materials, collidableObjects) {
    let areaGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    let area1_center = new THREE.Mesh(areaGeometry, materials.area1);
    let area1_left = new THREE.Mesh(areaGeometry, materials.area1);
    let area1_right = new THREE.Mesh(areaGeometry, materials.area1);
    const area1 = new THREE.Group();
    area1.name = "Area1";
    const stair1 = new THREE.Group();

    area1_center.position.set(-152.25, WORLD_CONFIG.AREA_Y_POSITION, -131.0);
    area1_center.scale.set(125.0, WORLD_CONFIG.AREA_HEIGHT, 125.0);
    area1_left.position.set(-210.0, WORLD_CONFIG.AREA_Y_POSITION, -66.0);
    area1_left.scale.set(9.5, WORLD_CONFIG.AREA_HEIGHT, 6.0);
    area1_right.position.set(-140.0, WORLD_CONFIG.AREA_Y_POSITION, -66.0);
    area1_right.scale.set(100.5, WORLD_CONFIG.AREA_HEIGHT, 6.0);
    
    area1.add(area1_center);
    area1.add(area1_left);
    area1.add(area1_right);
    
    const romanColumns = createRomanColumns(scene);
    area1.add(romanColumns);
    
    const ruinStructures = createRuinStructures(scene);
    area1.add(ruinStructures);
    
    const keyPlatform = createKeyPlatform(scene);
    area1.add(keyPlatform);
    
    scene.add(area1);
    stair1.add(createStair(-197.75, WORLD_CONFIG.STAIR_HEIGHT_OFFSET, -62.8, WORLD_CONFIG.AREA_HEIGHT, true, materials.stair));
    scene.add(stair1);
    markCollisionObject(area1, collidableObjects);
    markCollisionObject(stair1, collidableObjects);
    enableShadowsForAll(area1);
    enableShadowsForAll(stair1); 
    enableShadowsForAll(romanColumns);
    enableShadowsForAll(ruinStructures);
    enableShadowsForAll(keyPlatform);
}

function createArea2(scene, materials, collidableObjects) {
    let areaGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    let area2_center = new THREE.Mesh(areaGeometry, materials.area2);
    let area2_left = new THREE.Mesh(areaGeometry, materials.area2);
    let area2_right = new THREE.Mesh(areaGeometry, materials.area2);

    const area2 = new THREE.Group();
    area2.name = "Area2";

    area2_center.position.set(0.0, WORLD_CONFIG.AREA_Y_POSITION, -131.0);
    area2_center.scale.set(125.0, WORLD_CONFIG.AREA_HEIGHT, 125.0);
    area2_left.position.set(-10.0, WORLD_CONFIG.AREA_Y_POSITION, -66.0);
    area2_left.scale.set(105.0, WORLD_CONFIG.AREA_HEIGHT, 6.0);
    area2_right.position.set(60.0, WORLD_CONFIG.AREA_Y_POSITION, -66.0);
    area2_right.scale.set(5.0, WORLD_CONFIG.AREA_HEIGHT, 6.0);

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
    markCollisionObject(centralBlock, collidableObjects);

    createElevator(scene, collidableObjects, 50.0, -66.05);
    enableShadowsForAll(area2);

    createDoor(scene, collidableObjects, 50.0, -63, 15.0, 4.0, 'blue');
    createtotem(scene, collidableObjects, 60.0, -59.05, 'red');
}

function createArea4(scene, materials, collidableObjects) {
    // Criar apenas o grupo principal, o labirinto interno e os muros
    const area4 = new THREE.Group();
    area4.name = "Area4";
    
    // Criar o labirinto dentro da área 4
    const mazeGroup = createArea4Maze(scene, collidableObjects, WORLD_CONFIG);
    area4.add(mazeGroup);
    
    // Criar muros altos ao redor da área 4 para ocultá-la completamente
    const area4Walls = createArea4Walls(materials);
    area4.add(area4Walls);
    
    scene.add(area4);
    
    // Criar totem para acesso à área 4 (usa sistema específico)
    // Posicionado na frente do muro sul da área 4
    // Cálculo: area4CenterZ (131) - expandedHalfDepth (67.5) - wallThickness/2 (2.5) - distância segura (5)
    const totemX = 0.0; // Centralizado
    const totemZ = 54.0; // Na frente do muro sul (61.0 - 7.0 de distância)
    createArea4Totem(scene, collidableObjects, totemX, totemZ, 'blue');
    
    // Configurar os muros para o sistema de animação
    setArea4Walls(area4Walls);
    
    markCollisionObject(area4Walls, collidableObjects);
    enableShadowsForAll(area4Walls); // Ativa sombras apenas nos muros
    enableShadowsForAll(mazeGroup); // Ativa sombras no labirinto
    
    console.log('[ENVIRONMENT] ✅ Área 4 criada com totem de acesso funcional');
}

function createArea4Walls(materials) {
    const wallsGroup = new THREE.Group();
    wallsGroup.name = "Area4Walls";
    
    // Altura dos muros (do chão até bem alto para ocultar completamente a área)
    const wallHeight = 30;
    const wallThickness = 5; // Muros mais espessos para melhor ocultação
    
    // Dimensões da área 4 para calcular posições dos muros
    const area4CenterWidth = 375.0;
    const area4CenterDepth = 125.0;
    const area4CenterX = 0.0;
    const area4CenterZ = 131.0;
    
    // Material para os muros (cor neutra para não chamar atenção)
    const wallMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x404040, // Cinza escuro para discrição
        transparent: false
    });
    
    // Calcular posições dos muros com base na área central
    const halfWidth = area4CenterWidth / 2;
    const halfDepth = area4CenterDepth / 2;
    
    // Posição Y: do chão base até o topo
    const wallYPosition = WORLD_CONFIG.GROUND_HEIGHT + wallHeight / 2;
    
    // Expandir um pouco os muros para garantir ocultação completa
    const expansionFactor = 10; // Margem extra para garantir que nada seja visível
    const expandedWidth = area4CenterWidth + expansionFactor;
    const expandedDepth = area4CenterDepth + expansionFactor;
    const expandedHalfWidth = expandedWidth / 2;
    const expandedHalfDepth = expandedDepth / 2;
    
    // Muro Norte (trás) - COMPLETAMENTE FECHADO
    const northWallGeometry = new THREE.BoxGeometry(expandedWidth + wallThickness * 2, wallHeight, wallThickness);
    const northWall = new THREE.Mesh(northWallGeometry, wallMaterial);
    northWall.position.set(area4CenterX, wallYPosition, area4CenterZ + expandedHalfDepth + wallThickness / 2);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    wallsGroup.add(northWall);
    
    // Muro Sul (frente)
    const southWallGeometry = new THREE.BoxGeometry(expandedWidth + wallThickness * 2, wallHeight, wallThickness);
    const southWall = new THREE.Mesh(southWallGeometry, wallMaterial);
    southWall.position.set(area4CenterX, wallYPosition, area4CenterZ - expandedHalfDepth - wallThickness / 2);
    southWall.castShadow = true;
    southWall.receiveShadow = true;
    wallsGroup.add(southWall);
    
    const westWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, expandedDepth + wallThickness * 2);
    const westWall = new THREE.Mesh(westWallGeometry, wallMaterial);
    westWall.position.set(area4CenterX - expandedHalfWidth - wallThickness / 2, wallYPosition, area4CenterZ);
    westWall.castShadow = true;
    westWall.receiveShadow = true;
    wallsGroup.add(westWall);
    
    // Muro Leste (direita)
    const eastWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, expandedDepth + wallThickness * 2);
    const eastWall = new THREE.Mesh(eastWallGeometry, wallMaterial);
    eastWall.position.set(area4CenterX + expandedHalfWidth + wallThickness / 2, wallYPosition, area4CenterZ);
    eastWall.castShadow = true;
    eastWall.receiveShadow = true;
    wallsGroup.add(eastWall);
    
    
    // Adicionar detalhes decorativos aos muros (sem torres, para manter discreto)
    addWallDetails(wallsGroup, wallMaterial, wallHeight, true); // true = modo oculto
    
    return wallsGroup;
}

// Função para adicionar detalhes decorativos aos muros
function addWallDetails(wallsGroup, wallMaterial, wallHeight, hiddenMode = false) {
    // Se estiver em modo oculto, adicionar apenas detalhes mínimos e discretos
    if (hiddenMode) {
        // Adicionar apenas algumas vigas de reforço discretas
        const reinforcementCount = 3;
        
        wallsGroup.children.forEach((wall, index) => {
            if (wall.isMesh && wall.geometry.parameters) {
                const wallBox = new THREE.Box3().setFromObject(wall);
                const wallSize = wallBox.getSize(new THREE.Vector3());
                const wallCenter = wallBox.getCenter(new THREE.Vector3());
                
                // Adicionar vigas de reforço horizontais discretas
                for (let i = 0; i < reinforcementCount; i++) {
                    const beamHeight = 0.3;
                    const beamWidth = Math.min(wallSize.x, wallSize.z) * 0.8;
                    const beamDepth = 0.2;
                    
                    const beamGeometry = new THREE.BoxGeometry(
                        wallSize.x > wallSize.z ? beamWidth : beamDepth,
                        beamHeight,
                        wallSize.x > wallSize.z ? beamDepth : beamWidth
                    );
                    const beam = new THREE.Mesh(beamGeometry, wallMaterial);
                    
                    beam.position.set(
                        wallCenter.x,
                        wallCenter.y - wallHeight/2 + (i + 1) * (wallHeight / (reinforcementCount + 1)),
                        wallCenter.z
                    );
                    
                    beam.castShadow = true;
                    beam.receiveShadow = true;
                    wallsGroup.add(beam);
                }
            }
        });
        
        return; // Não adicionar torres ou merlões em modo oculto
    }
    
    // Código original para modo decorativo (não usado em modo oculto)
    // Adicionar merlões (ameias) no topo dos muros
    const merlonHeight = 2;
    const merlonWidth = 3;
    const merlonDepth = 2;
    
    // Obter as dimensões dos muros para posicionar os merlões
    wallsGroup.children.forEach((wall, index) => {
        if (wall.isMesh) {
            const wallBox = new THREE.Box3().setFromObject(wall);
            const wallSize = wallBox.getSize(new THREE.Vector3());
            const wallCenter = wallBox.getCenter(new THREE.Vector3());
            
            // Determinar quantos merlões adicionar com base no tamanho do muro
            const longestSide = Math.max(wallSize.x, wallSize.z);
            const merlonCount = Math.floor(longestSide / (merlonWidth * 2));
            
            for (let i = 0; i < merlonCount; i++) {
                const merlonGeometry = new THREE.BoxGeometry(merlonWidth, merlonHeight, merlonDepth);
                const merlon = new THREE.Mesh(merlonGeometry, wallMaterial);
                
                // Posicionar merlões ao longo do topo do muro
                let offsetX = 0;
                let offsetZ = 0;
                
                if (wallSize.x > wallSize.z) { // Muro horizontal
                    offsetX = (i - (merlonCount - 1) / 2) * (merlonWidth * 2);
                } else { // Muro vertical
                    offsetZ = (i - (merlonCount - 1) / 2) * (merlonWidth * 2);
                }
                
                merlon.position.set(
                    wallCenter.x + offsetX,
                    wallCenter.y + wallHeight/2 + merlonHeight/2,
                    wallCenter.z + offsetZ
                );
                
                merlon.castShadow = true;
                merlon.receiveShadow = true;
                wallsGroup.add(merlon);
            }
        }
    });
    
    // Adicionar torres nas esquinas
    const towerRadius = 4;
    const towerHeight = wallHeight + 5;
    const towerMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x1a4a1a // Verde ainda mais escuro para as torres
    });
    
    // Calcular posições das torres baseadas nas dimensões da área 4
    const area4CenterWidth = 375.0;
    const area4CenterDepth = 125.0;
    const area4CenterX = 0.0;
    const area4CenterZ = 131.0;
    const halfWidth = area4CenterWidth / 2;
    const halfDepth = area4CenterDepth / 2;
    const wallThickness = 3;
    
    const cornerPositions = [
        { x: area4CenterX - halfWidth - wallThickness, z: area4CenterZ - halfDepth - wallThickness },   // Esquina sudoeste
        { x: area4CenterX + halfWidth + wallThickness, z: area4CenterZ - halfDepth - wallThickness },   // Esquina sudeste
        { x: area4CenterX - halfWidth - wallThickness, z: area4CenterZ + halfDepth + wallThickness },   // Esquina noroeste
        { x: area4CenterX + halfWidth + wallThickness, z: area4CenterZ + halfDepth + wallThickness }    // Esquina nordeste
    ];
    
    cornerPositions.forEach((pos, index) => {
        const towerGeometry = new THREE.CylinderGeometry(towerRadius, towerRadius * 1.2, towerHeight, 12);
        const tower = new THREE.Mesh(towerGeometry, towerMaterial);
        tower.position.set(pos.x, WORLD_CONFIG.AREA_Y_POSITION + towerHeight / 2, pos.z);
        tower.castShadow = true;
        tower.receiveShadow = true;
        
        // Adicionar um topo cônico à torre
        const roofGeometry = new THREE.ConeGeometry(towerRadius * 1.1, 3, 12);
        const roof = new THREE.Mesh(roofGeometry, towerMaterial);
        roof.position.set(pos.x, WORLD_CONFIG.AREA_Y_POSITION + towerHeight + 1.5, pos.z);
        roof.castShadow = true;
        roof.receiveShadow = true;
        
        wallsGroup.add(tower);
        wallsGroup.add(roof);
    });
}

// Cria colunas romanas ao redor da Área 1
function createRomanColumns(scene) {
    const columnsGroup = new THREE.Group();
    columnsGroup.name = "RomanColumns";
    
    const textureLoader = new THREE.TextureLoader();
    
    const baseMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xf5f5dc, // Bege claro (mármore/pedra)
        roughness: 0.8,
        metalness: 0.0,
        transparent: false
    });
    
    let columnMaterial = baseMaterial;
    
    textureLoader.load(
        'assets/textures/pedradifusa.png',
        function(stoneTexture) {
            console.log('✅ Textura de pedra carregada com sucesso');
            
            stoneTexture.wrapS = THREE.RepeatWrapping;
            stoneTexture.wrapT = THREE.RepeatWrapping;
            stoneTexture.repeat.set(2, 4);
            
            textureLoader.load(
                'assets/textures/pedradifusa.png',
                function(displacementTexture) {
                    console.log('✅ Textura para normal map carregada com sucesso');
                    displacementTexture.wrapS = THREE.RepeatWrapping;
                    displacementTexture.wrapT = THREE.RepeatWrapping;
                    displacementTexture.repeat.set(2, 4);
                    
                    const texturedMaterial = new THREE.MeshStandardMaterial({
                        map: stoneTexture,
                        normalMap: stoneTexture,
                        normalScale: new THREE.Vector2(0.8, 0.8), 
                        roughness: 0.8,
                        metalness: 0.0,
                        color: 0xffffff,
                        transparent: false
                    });
                    
                    // Aplicar o material texturizado em todas as colunas existentes
                    let texturedCount = 0;
                    columnsGroup.traverse((child) => {
                        if (child.isMesh) {
                            child.material = texturedMaterial;
                            child.material.needsUpdate = true;
                            texturedCount++;
                        }
                    });
                },
                // onProgress para normal map
                function(progress) {
                    console.log('Carregando normal map:', (progress.loaded / progress.total * 100).toFixed(1) + '%');
                },
                function(error) {
                    console.warn('⚠️ Erro ao carregar normal map:', error);
                    console.log('Usando apenas textura difusa sem normal mapping...');
                    // Usar apenas a textura difusa sem normal mapping
                    const simpleTexturedMaterial = new THREE.MeshStandardMaterial({
                        map: stoneTexture,
                        roughness: 0.8,
                        metalness: 0.0,
                        color: 0xffffff,
                        transparent: false
                    });
                    
                    let texturedCount = 0;
                    columnsGroup.traverse((child) => {
                        if (child.isMesh) {
                            child.material = simpleTexturedMaterial;
                            child.material.needsUpdate = true;
                            texturedCount++;
                        }
                    });
                    console.log(`✅ Textura difusa aplicada a ${texturedCount} meshes das colunas`);
                }
            );
        },
        function(progress) {
            if (progress.total > 0) {
                const percent = (progress.loaded / progress.total * 100).toFixed(1);
                console.log('Carregando textura principal:', percent + '%');
            }
        },
        function(error) {
            console.error('❌ Erro ao carregar textura de pedra:', error);
            console.log('📁 Tentando caminhos alternativos...');
            
            const alternatePaths = [
                '../assets/textures/pedradifusa.png',
                '../../assets/textures/pedradifusa.png',
                './assets/textures/pedradifusa.png',
                'T2/assets/textures/pedradifusa.png',
                'src/assets/textures/pedradifusa.png'
            ];
            
            let pathIndex = 0;
            function tryNextPath() {
                if (pathIndex >= alternatePaths.length) {
                    console.log('❌ Todos os caminhos de textura falharam. Usando material de pedra padrão (bege)');
                    return;
                }
                
                const currentPath = alternatePaths[pathIndex];
                
                textureLoader.load(
                    currentPath,
                    function(stoneTexture) {
                        console.log(`✅ Textura encontrada em: ${currentPath}`);
                        stoneTexture.wrapS = THREE.RepeatWrapping;
                        stoneTexture.wrapT = THREE.RepeatWrapping;
                        stoneTexture.repeat.set(2, 4);
                        
                        const simpleTexturedMaterial = new THREE.MeshStandardMaterial({
                            map: stoneTexture,
                            roughness: 0.8,
                            metalness: 0.0,
                            color: 0xffffff,
                            transparent: false
                        });
                        
                        let texturedCount = 0;
                        columnsGroup.traverse((child) => {
                            if (child.isMesh) {
                                child.material = simpleTexturedMaterial;
                                child.material.needsUpdate = true;
                                texturedCount++;
                            }
                        });
                        console.log(`✅ Textura alternativa aplicada a ${texturedCount} meshes das colunas`);
                    },
                    undefined,
                    function(altError) {
                        console.log(`❌ Falhou: ${currentPath}`);
                        pathIndex++;
                        tryNextPath();
                    }
                );
            }
            
            tryNextPath();
        }
    );
    
    const columnHeight = 12;
    const columnRadius = 2;
    const columnSegments = 24; // Reduzido para performance, ainda mantendo qualidade
    const columnHeightSegments = 8; // Reduzido para performance
    const capitalHeight = 1.5;
    const baseHeight = 1;
    
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
        
        // Esquerda (oeste)
        { x: -152.25 - 50, z: -131.0 - 25 },
        { x: -152.25 - 50, z: -131.0 },
        { x: -152.25 - 50, z: -131.0 + 25 },
        
        // Direita (leste) - borda interna
        { x: -152.25 + 50, z: -131.0 - 25 },
        { x: -152.25 + 50, z: -131.0 },
        { x: -152.25 + 50, z: -131.0 + 25 }
    ];
    
    columnPositions.forEach((pos, index) => {
        const column = createSingleColumn(columnRadius, columnHeight, columnSegments, columnHeightSegments, capitalHeight, baseHeight, columnMaterial);
        // Posiciona a coluna apoiada sobre a superfície da área
        column.position.set(pos.x, WORLD_CONFIG.AREA_Y_POSITION + WORLD_CONFIG.AREA_HEIGHT/2 + columnHeight/2, pos.z);
        
        // Garantir que todas as meshes da coluna tenham sombras ativadas
        column.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        columnsGroup.add(column);
    });
    
    return columnsGroup;
}

// Cria uma única coluna romana com base, fuste e capitel
function createSingleColumn(radius, height, segments, heightSegments, capitalHeight, baseHeight, material) {
    const columnGroup = new THREE.Group();
    
    // Base da coluna (mais larga) - aumentar segmentos para displacement
    const baseGeometry = new THREE.CylinderGeometry(radius * 1.3, radius * 1.4, baseHeight, segments, 4);
    const base = new THREE.Mesh(baseGeometry, material);
    base.position.y = -height/2 + baseHeight/2;
    columnGroup.add(base);
    
    // Fuste da coluna (corpo principal) - aumentar segmentos para displacement
    const shaftGeometry = new THREE.CylinderGeometry(radius, radius, height - capitalHeight - baseHeight, segments, heightSegments);
    const shaft = new THREE.Mesh(shaftGeometry, material);
    shaft.position.y = -capitalHeight/2;
    columnGroup.add(shaft);
    
    // Capitel da coluna (topo decorativo) - aumentar segmentos para displacement
    const capitalGeometry = new THREE.CylinderGeometry(radius * 1.2, radius, capitalHeight, segments, 4);
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
    const structureHeight = WORLD_CONFIG.AREA_Y_POSITION + WORLD_CONFIG.AREA_HEIGHT/2 + columnHeight + 1.5; // Acima dos capitéis
    
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

function createDamagedCapital(material) {
    const capitalGroup = new THREE.Group();
    
    const baseGeometry = new THREE.CylinderGeometry(3, 2.5, 0.8, 12);
    const baseMesh = new THREE.Mesh(baseGeometry, material);
    capitalGroup.add(baseMesh);
    
    const abacusGeometry = new THREE.BoxGeometry(3.5, 0.4, 3.5);
    const abacusMesh = new THREE.Mesh(abacusGeometry, material);
    abacusMesh.position.y = 0.6;
    capitalGroup.add(abacusMesh);
    
    for (let i = 0; i < 4; i++) {
        if (Math.random() > 0.3) {
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

function createComplexFragments(x, z, height, material, parentGroup) {
    const fragmentCount = 3 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < fragmentCount; i++) {
        const fragmentGroup = new THREE.Group();
        
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
        
        const angle = Math.random() * Math.PI * 2;
        const distance = 3 + Math.random() * 4;
        fragmentMesh.position.set(
            x + Math.cos(angle) * distance,
            height - 2 + Math.random() * 3,
            z + Math.sin(angle) * distance
        );
        
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

function createRomanArchitecturalDetails(centerX, centerZ, height, length, width, material, parentGroup, isHorizontal) {
    const friezeHeight = 0.6;
    const friezeGeometry = new THREE.BoxGeometry(
        isHorizontal ? length : width,
        friezeHeight,
        isHorizontal ? width : length
    );
    const friezeMesh = new THREE.Mesh(friezeGeometry, material);
    friezeMesh.position.set(centerX, height + 2, centerZ);
    
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
    
    if (Math.random() > 0.4) {
        const corniceGeometry = new THREE.BoxGeometry(
            isHorizontal ? length * 1.1 : width * 1.1,
            0.4,
            isHorizontal ? width * 1.1 : length * 1.1
        );
        const corniceMesh = new THREE.Mesh(corniceGeometry, material);
        corniceMesh.position.set(centerX, height + 2.8, centerZ);
        
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

function createKeyPlatform(scene) {
    const platformGroup = new THREE.Group();
    platformGroup.name = "KeyPlatform";
    
    const platformMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); 
    const platformGeometry = new THREE.CylinderGeometry(3, 3, 0.5, 16);
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.set(-152.25, WORLD_CONFIG.AREA_Y_POSITION - 2, -131.0);
    platformGroup.add(platform);
    
    const keyPosition = new THREE.Vector3(-152.25, WORLD_CONFIG.AREA_Y_POSITION - 1.0, -131.0);
    const redKeyInstance = new Key('red', keyPosition);
    
    if (keyManager.addKey(redKeyInstance, scene)) {
        if (redKeyInstance.getMesh()) {
            redKeyInstance.getMesh().visible = false;
            redKeyInstance.getMesh().position.set(-152.25, WORLD_CONFIG.AREA_Y_POSITION - 1.0, -131.0);
            redKeyInstance.position.copy(redKeyInstance.getMesh().position);
            redKeyInstance.originalY = WORLD_CONFIG.AREA_Y_POSITION - 1.0;
        }
    }
    
    platformGroup.userData.platform = platform;
    platformGroup.userData.keyInstance = redKeyInstance;
    platformGroup.userData.isRaised = false;
    platformGroup.userData.targetY = WORLD_CONFIG.AREA_Y_POSITION + WORLD_CONFIG.AREA_HEIGHT/2 + 0.5;
    
    return platformGroup;
}

function createCentralBlockWithKey(scene) {
    const blockGroup = new THREE.Group();
    blockGroup.name = "CentralBlock";
    
    const blockMaterial = new THREE.MeshLambertMaterial({ color: 0x8B0000 });
    
    const blockGeometry = new THREE.BoxGeometry(12, 12, 12);
    const centralBlock = new THREE.Mesh(blockGeometry, blockMaterial);
    centralBlock.position.set(0.0, WORLD_CONFIG.AREA_Y_POSITION + 6, -131.0);
    centralBlock.castShadow = true;
    centralBlock.receiveShadow = true;
    blockGroup.add(centralBlock);
    
    const redKeyTargetY = WORLD_CONFIG.AREA_Y_POSITION + WORLD_CONFIG.AREA_HEIGHT/2 + 0.5;
    const finalKeyHeight = redKeyTargetY + 1.0;
    const keyPosition = new THREE.Vector3(0.0, finalKeyHeight, -131.0);
    const yellowKeyInstance = new Key('yellow', keyPosition);
    
    if (keyManager.addKey(yellowKeyInstance, scene)) {
        if (yellowKeyInstance.getMesh()) {
            yellowKeyInstance.getMesh().visible = false;
            yellowKeyInstance.getMesh().position.copy(keyPosition);
            yellowKeyInstance.position.copy(keyPosition);
            yellowKeyInstance.originalY = finalKeyHeight;
        }
    }
    
    blockGroup.userData.centralBlock = centralBlock;
    blockGroup.userData.keyInstance = yellowKeyInstance;
    blockGroup.userData.isRaised = false;
    blockGroup.userData.shouldRaise = false;
    blockGroup.userData.originalY = WORLD_CONFIG.AREA_Y_POSITION + 6;
    blockGroup.userData.targetY = WORLD_CONFIG.AREA_Y_POSITION + 20;
    
    return blockGroup;
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
    
    const inCenter = playerX >= centerMinX && playerX <= centerMaxX && 
                     playerZ >= centerMinZ && playerZ <= centerMaxZ;
                     
    const inLeft = playerX >= leftMinX && playerX <= leftMaxX && 
                   playerZ >= leftMinZ && playerZ <= leftMaxZ;
                   
    const inRight = playerX >= rightMinX && playerX <= rightMaxX && 
                    playerZ >= rightMinZ && playerZ <= rightMaxZ;
    
    return inCenter || inLeft || inRight;
}

export function isPlayerInArea2(camera) {
    if (!camera) return false;
    
    const playerX = camera.position.x;
    const playerZ = camera.position.z;
    
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
    
    const inCenter = playerX >= centerMinX && playerX <= centerMaxX && 
                     playerZ >= centerMinZ && playerZ <= centerMaxZ;
                     
    const inLeft = playerX >= leftMinX && playerX <= leftMaxX && 
                   playerZ >= leftMinZ && playerZ <= leftMaxZ;
                   
    const inRight = playerX >= rightMinX && playerX <= rightMaxX && 
                    playerZ >= rightMinZ && playerZ <= rightMaxZ;
    
    return inCenter || inLeft || inRight;
}

function raisePlatform(platformGroup, delta) {
    const platform = platformGroup.userData.platform;
    const keyInstance = platformGroup.userData.keyInstance;
    const targetY = platformGroup.userData.targetY;
    
    if (platform.position.y < targetY) {
        const riseSpeed = 2;
        const deltaY = riseSpeed * delta;
        
        platform.position.y += deltaY;
        
        if (keyInstance && keyInstance.getMesh()) {
            const keyMesh = keyInstance.getMesh();
            
            keyMesh.position.y = platform.position.y + 1.0;
            
            keyInstance.position.y = keyMesh.position.y;
            keyInstance.originalY = keyMesh.position.y;
            
            if (!keyMesh.visible) {
                keyMesh.visible = true;
            }
        }
        
        if (platform.position.y >= targetY) {
            platform.position.y = targetY;
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

function createStair(x, y, z, h, direction, material) {
    let stairGroup = new THREE.Group();
    stairGroup.name = "Escada";
    stairGroup.position.set(x, y, z);
    const stepHeight = WORLD_CONFIG.STAIR_STEP_HEIGHT;
    const stepDepth = WORLD_CONFIG.STAIR_STEP_DEPTH;
      
    let steps = Math.floor(h / stepHeight);
    
    for (let i = 0; i < steps; i++) {
        let stairGeometry = new THREE.BoxGeometry(WORLD_CONFIG.STAIR_WIDTH, stepHeight, stepDepth);
        let step = new THREE.Mesh(stairGeometry, material);
        
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

function markCollisionObject(object, collidableObjects){
    object.traverse(child => {
        if (child.isMesh) {
            collidableObjects.push(child);
        }
    });
}

function createGradientBlocksWithGap(point1, point2, scene, baseHeight, collidableObjects) {
    const minX = Math.min(point1.x, point2.x);
    const maxX = Math.max(point1.x, point2.x);
    const minZ = Math.min(point1.z, point2.z);
    const maxZ = Math.max(point1.z, point2.z);
    
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    
    const blockSize = 4.0;
    const gapSize = 12.0;
    const totalSpacing = blockSize + gapSize;
    
    const waveAmplitude = 10.0;
    const waveFrequency = 0.1;
    
    const blocksGroup = new THREE.Group();
    blocksGroup.name = "MetalBlocks";
    
    const blocks = [];
        
    for (let x = minX; x <= maxX; x += totalSpacing) {
        for (let z = minZ; z <= maxZ; z += totalSpacing) {
            const maxDistX = (maxX - minX) / 2;
            const maxDistZ = (maxZ - minZ) / 2;
            const distX = Math.abs(x - centerX) / maxDistX;
            const distZ = Math.abs(z - centerZ) / maxDistZ;
            const dist = Math.max(distX, distZ);
            
            const heightVariation = 6.0 + (20 - 6.0) * (1 - dist);
            
            const waveFactor = Math.sin(x * waveFrequency) * Math.sin(z * waveFrequency);
            
            const waveEffect = waveAmplitude * waveFactor;
            const minHeight = baseHeight + (heightVariation / 2);
            const finalHeight = Math.max(minHeight, minHeight + waveEffect);
            
            const geometry = new THREE.BoxGeometry(blockSize, heightVariation, blockSize);
            
            const tempMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x8b4513,
                roughness: 0.3,
                metalness: 0.8
            });
            const block = new THREE.Mesh(geometry, tempMaterial);
            
            block.userData.isBlock = true;
            block.userData.blockType = 'metal';
            block.userData.needsMetalTexture = true;
            
            block.position.set(x, finalHeight, z);
            
            block.castShadow = true;
            block.receiveShadow = true;
            
            blocks.push({
                mesh: block,
                x: x,
                z: z,
                distanceToCenter: Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(z - centerZ, 2))
            });
            
            blocksGroup.add(block);
        }
    }
    
    blocks.sort((a, b) => a.distanceToCenter - b.distanceToCenter);
    
    // Determinar quantos blocos remover (1 se ímpar, 4 se par)
    const blocksToRemove = blocks.length % 2 === 1 ? 
        [blocks[0]] : // Se ímpar, remover o mais central
        blocks.slice(0, 4); // Se par, remover os 4 mais centrais
    
    for (const block of blocksToRemove) {
        blocksGroup.remove(block.mesh);
        const index = blocks.findIndex(b => b.mesh === block.mesh);
        if (index > -1) {
            blocks.splice(index, 1);
        }
    }
        
    QuickTexture.metal(blocksGroup);
    
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
        const riseSpeed = 3;
        const deltaY = riseSpeed * delta;
        
        centralBlock.position.y += deltaY;
        
        if (keyInstance && keyInstance.getMesh()) {
            const keyMesh = keyInstance.getMesh();
            
            if (!keyMesh.visible) {
                keyMesh.visible = true;
            }
        }
        
        if (centralBlock.position.y >= targetY) {
            centralBlock.position.y = targetY;
            
            if (keyInstance && keyInstance.getMesh()) {
                const redKeyTargetY = WORLD_CONFIG.AREA_Y_POSITION + WORLD_CONFIG.AREA_HEIGHT/2 + 0.5;
                const finalKeyHeight = redKeyTargetY + 1.0;
                keyInstance.getMesh().position.y = finalKeyHeight;
                keyInstance.position.y = finalKeyHeight;
                keyInstance.originalY = finalKeyHeight;
            }
            
            blockGroup.userData.isRaised = true;
        }
    }
}
