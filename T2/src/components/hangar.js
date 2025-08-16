import * as THREE from '../../../../build/three.module.js';
import { WORLD_CONFIG } from '../core/config/worldConfig.js';
import { loadOBJModel } from '../utils/modelLoader.js';
import { enableShadowsForAll } from '../systems/lights.js';
import { CSG } from '../../../../libs/other/CSGMesh.js';
import { keyManager, Key } from '../entities/items/key.js';
import { QuickTexture } from '../utils/textureUtils.js'

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t) {
    return t * t * t;
}

export function createHangar(opts = {}) {
    const {
        width = 20,
        height = 10,
        depth = 15,
        wallThickness = 0.5,
        roofOverhang = 1,
        doorWidth = 14,
        doorHeight = 8,
        color = 0xcccccc,
        metalness = 0.25,
        roughness = 0.8,
    } = opts;

    const hangarGroup = new THREE.Group();
    hangarGroup.name = "CustomHangar";

    // Material do hangar
    const hangarMaterial = new THREE.MeshStandardMaterial({
        color: color,
        metalness: metalness,
        roughness: roughness,
        side: THREE.DoubleSide,
    });

    try {
        const outerGeometry = new THREE.BoxGeometry(width, height, depth);
        const outerMesh = new THREE.Mesh(outerGeometry, hangarMaterial);
        outerMesh.position.set(0, height / 2, 0);

        const innerGeometry = new THREE.BoxGeometry(
            width - wallThickness * 2,
            height,
            depth - wallThickness * 2
        );
        const innerMesh = new THREE.Mesh(innerGeometry, hangarMaterial);
        innerMesh.position.set(0, height / 2, 0);

        let hangarBody;
        if (typeof CSG !== 'undefined') {
            try {
                outerMesh.updateMatrix();
                innerMesh.updateMatrix();
                
                const outerBSP = CSG.fromMesh(outerMesh);
                const innerBSP = CSG.fromMesh(innerMesh);
                const hollowBSP = outerBSP.subtract(innerBSP);
                
                hangarBody = CSG.toMesh(hollowBSP, new THREE.Matrix4());
                hangarBody.material = hangarMaterial;
            } catch (csgError) {
                console.warn('[HANGAR] CSG subtract failed, using solid body:', csgError);
                hangarBody = outerMesh;
            }
        } else {
            console.warn('[HANGAR] CSG not available, using solid body');
            hangarBody = outerMesh;
        }

        const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, depth + 2);
        const doorMesh = new THREE.Mesh(doorGeometry, hangarMaterial);
        doorMesh.position.set(0, doorHeight / 2, depth / 2);

        let hangarWithDoor;
        if (typeof CSG !== 'undefined' && hangarBody.geometry) {
            try {
                hangarBody.updateMatrix();
                doorMesh.updateMatrix();
                
                const bodyBSP = CSG.fromMesh(hangarBody);
                const doorBSP = CSG.fromMesh(doorMesh);
                const finalBSP = bodyBSP.subtract(doorBSP);
                
                hangarWithDoor = CSG.toMesh(finalBSP, new THREE.Matrix4());
                hangarWithDoor.material = hangarMaterial;
            } catch (csgError) {
                console.warn('[HANGAR] CSG door subtract failed:', csgError);
                hangarWithDoor = hangarBody;
            }
        } else {
            hangarWithDoor = hangarBody;
        }

        hangarGroup.add(hangarWithDoor);

        QuickTexture.hangarWalls(hangarWithDoor)
        
        // thickness do arco do teto
        const roofThickness = 1.0;  // ajuste esse valor para ficar mais grosso ou mais fino

        const outerRadius = width / 2 + roofOverhang;
        const innerRadius = outerRadius - roofThickness;
        const roofLength = depth + 2 * roofOverhang;
        
        // desenha um semicírculo “oco”
        const shape = new THREE.Shape();
        shape.moveTo(-outerRadius, 0);
        shape.absarc(0, 0, outerRadius, Math.PI, 0, false);
        shape.absarc(0, 0, innerRadius, 0, Math.PI, true);
        shape.closePath();

        const extrudeSettings = {
            depth: roofLength,
            bevelEnabled: false
        };

        const roofGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        // gira para alinhar o arco como teto (profundidade no Z)
        roofGeometry.rotateX(Math.PI / 2);
        // centralizar o extrude ao longo de Z
        roofGeometry.translate(0, height - roofThickness + outerRadius, -roofLength / 2);

        const roofMesh = new THREE.Mesh(roofGeometry, hangarMaterial);
        roofMesh.castShadow = true;
        roofMesh.receiveShadow = true;
        roofMesh.rotation.x = Math.PI / 2; // alinha ao eixo Z (profundidade)

        hangarGroup.add(roofMesh);
        QuickTexture.hangarWalls(roofMesh);
        
        const columnGeometry = new THREE.BoxGeometry(wallThickness, height, wallThickness);
        const columnMaterial = hangarMaterial.clone();
        
        const colLeft = new THREE.Mesh(columnGeometry, columnMaterial);
        const colRight = new THREE.Mesh(columnGeometry, columnMaterial);
        
        const halfDoor = doorWidth / 2 + wallThickness;
        colLeft.position.set(-halfDoor - wallThickness, height / 2, depth / 2 - wallThickness / 2);
        colRight.position.set(halfDoor + wallThickness, height / 2, depth / 2 - wallThickness / 2);
        
        hangarGroup.add(colLeft, colRight);
        
        const doorPanelWidth = doorWidth / 2 - 1; // Duas portas que se abrem para os lados
        const doorPanelGeometry = new THREE.BoxGeometry(doorPanelWidth, doorHeight, wallThickness);
        const doorPanelMaterial = new THREE.MeshStandardMaterial({
            color: color * 0.8,
            metalness: metalness * 1.2,
            roughness: roughness * 0.8,
        });

        const leftDoor = new THREE.Mesh(doorPanelGeometry, doorPanelMaterial);
        leftDoor.position.set(-doorPanelWidth / 2 - 0.5, doorHeight / 2, depth / 2 + wallThickness / 2);
        leftDoor.userData.isDoor = true;
        leftDoor.userData.isLeftDoor = true;
        leftDoor.userData.originalX = leftDoor.position.x;
        leftDoor.name = "HangarLeftDoor";

        const rightDoor = new THREE.Mesh(doorPanelGeometry, doorPanelMaterial);
        rightDoor.position.set(doorPanelWidth / 2 + 0.5, doorHeight / 2, depth / 2 + wallThickness / 2);
        rightDoor.userData.isDoor = true;
        rightDoor.userData.isRightDoor = true;
        rightDoor.userData.originalX = rightDoor.position.x;
        rightDoor.name = "HangarRightDoor";

        hangarGroup.add(leftDoor, rightDoor);

        const beamGeometry = new THREE.BoxGeometry(width + roofOverhang * 2, wallThickness * 0.7, wallThickness);
        const frontBeam = new THREE.Mesh(beamGeometry, hangarMaterial);
        frontBeam.position.set(0, height - wallThickness, depth / 2 - wallThickness);
        
        const backBeam = new THREE.Mesh(beamGeometry, hangarMaterial);
        backBeam.position.set(0, height - wallThickness, -depth / 2 + wallThickness);
        
        hangarGroup.add(frontBeam, backBeam);

    } catch (error) {
        console.error('[HANGAR] Error creating hangar with CSG:', error);
        
        const fallbackGeometry = new THREE.BoxGeometry(width, height, depth);
        const fallbackMesh = new THREE.Mesh(fallbackGeometry, hangarMaterial);
        fallbackMesh.position.set(0, height / 2, 0);
        hangarGroup.add(fallbackMesh);
    }

    hangarGroup.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    createSimpleHangarCollisions(hangarGroup, width, height, depth, doorWidth, doorHeight);

    hangarGroup.position.y = 0;

    const floorGeometry = new THREE.PlaneGeometry(width, depth);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,
        metalness: 0.2,
        roughness: 0.8,
        side: THREE.DoubleSide
    });
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2; // Rotacionar para ficar no plano XZ
    floorMesh.position.y = 0; // Posicionar no nível do chão

    QuickTexture.hangarFloor(floorMesh);

    hangarGroup.add(floorMesh);

    return hangarGroup;
}

// Função para criar colisões simples do hangar (apenas onde necessário)
function createSimpleHangarCollisions(hangarGroup, width, height, depth, doorWidth, doorHeight) {
    // Material invisível para colisões
    const invisibleMaterial = new THREE.MeshBasicMaterial({ 
        transparent: true,
        opacity: 0,
        visible: false
    });
    
    const wallThickness = 2; // Paredes mais grossas para colisão confiável
    
    // === PAREDES LATERAIS (sempre ativas para não atravessar) ===
    
    // Parede esquerda
    const leftWallGeometry = new THREE.BoxGeometry(wallThickness, height, depth);
    const leftWall = new THREE.Mesh(leftWallGeometry, invisibleMaterial);
    leftWall.position.set(-width / 2 - wallThickness / 2, height / 2, 0);
    leftWall.userData.isHangarWall = true;
    leftWall.name = "HangarLeftWall";
    hangarGroup.add(leftWall);
    
    // Parede direita
    const rightWallGeometry = new THREE.BoxGeometry(wallThickness, height, depth);
    const rightWall = new THREE.Mesh(rightWallGeometry, invisibleMaterial);
    rightWall.position.set(width / 2 + wallThickness / 2, height / 2, 0);
    rightWall.userData.isHangarWall = true;
    rightWall.name = "HangarRightWall";
    hangarGroup.add(rightWall);
    
    // === PAREDE TRASEIRA (sempre ativa) ===
    const backWallGeometry = new THREE.BoxGeometry(width + wallThickness * 2, height, wallThickness);
    const backWall = new THREE.Mesh(backWallGeometry, invisibleMaterial);
    backWall.position.set(0, height / 2, -depth / 2 - wallThickness / 2);
    backWall.userData.isHangarWall = true;
    backWall.name = "HangarBackWall";
    hangarGroup.add(backWall);
    
    // === PAREDES FRONTAIS (ao lado da porta - sempre ativas) ===
    const frontWallWidth = (width - doorWidth) / 2;
    
    if (frontWallWidth > 0) {
        // Parede frontal esquerda
        const frontLeftGeometry = new THREE.BoxGeometry(frontWallWidth, height, wallThickness);
        const frontLeftWall = new THREE.Mesh(frontLeftGeometry, invisibleMaterial);
        frontLeftWall.position.set(-(doorWidth / 2 + frontWallWidth / 2), height / 2, depth / 2 + wallThickness / 2);
        frontLeftWall.userData.isHangarWall = true;
        frontLeftWall.name = "HangarFrontLeftWall";
        hangarGroup.add(frontLeftWall);
        
        // Parede frontal direita  
        const frontRightGeometry = new THREE.BoxGeometry(frontWallWidth, height, wallThickness);
        const frontRightWall = new THREE.Mesh(frontRightGeometry, invisibleMaterial);
        frontRightWall.position.set((doorWidth / 2 + frontWallWidth / 2), height / 2, depth / 2 + wallThickness / 2);
        frontRightWall.userData.isHangarWall = true;
        frontRightWall.name = "HangarFrontRightWall";
        hangarGroup.add(frontRightWall);
    }
    
    // === BLOQUEADOR DA PORTA (dinâmico) ===
    const doorBlockerGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, wallThickness);
    const doorBlocker = new THREE.Mesh(doorBlockerGeometry, invisibleMaterial);
    doorBlocker.position.set(0, doorHeight / 2, depth / 2 + wallThickness / 2);
    doorBlocker.userData.isDoorBlocker = true;
    doorBlocker.name = "HangarDoorBlocker";
    hangarGroup.add(doorBlocker);
    
    console.log('[HANGAR] Colisões criadas: paredes fixas + bloqueador dinâmico da porta');
}

// Função para criar a área 3 completa (hangar + avião)
export async function createArea3(scene, materials, collidableObjects) {
    const updateProgress = window.updateLoadingProgress || function() {};
    
    updateProgress(57, 'Criando hangar com objetos básicos...');
    
    const area3 = new THREE.Group();
    area3.name = "Area3";
    
    // Criar hangar usando objetos básicos e CSG
    const hangarModel = createHangar({
        width: 160,        // Muito mais largo (era 120)
        height: 35,        // Mantém a altura
        depth: 120,        // Muito mais profundo para trás (era 80)
        wallThickness: 1.5,
        roofOverhang: 4,
        doorWidth: 100,    // Porta ainda mais larga para proporcionalidade (era 80)
        doorHeight: 28,    // Mantém altura da porta
        color: 0xaaaaaa,   // Cor mais clara
        metalness: 0.4,
        roughness: 0.6
    });
    
    hangarModel.position.set(156.25, 0, -130.0); // Ajustado para ficar no nível do chão
    hangarModel.name = "HangarModel";
    
    // Configurar portas do hangar para animação
    const hangarDoors = [];
    hangarModel.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Identificar portas por posição (objetos na frente do hangar)
            if (child.userData && child.userData.isDoor) {
                hangarDoors.push(child);
            }
        }
    });
    
    hangarModel.userData.doors = hangarDoors;
    hangarModel.userData.doorsOpen = false;
    hangarModel.userData.animating = false;
    
    console.log(`[ENVIRONMENT] Created hangar with ${hangarDoors.length} door element(s)`);
    
    area3.add(hangarModel);
    
    updateProgress(60, 'Hangar criado!');
    
    // Tentar carregar avião (opcional)
    try {
        updateProgress(61, 'Carregando avião...');

        const planeModel = await loadOBJModel('../assets/objects/plane.obj', '../assets/objects/plane.mtl', {
            scale: 0.5,
            position: { x: 0, y: -8, z: -200 },
            rotation: { x: 0, y: -Math.PI/2, z: 0 },
            castShadow: true,
            receiveShadow: true,
            mtlBasePath: '../assets/objects/',
            onProgress: (progress) => {
                if (progress.total > 0) {
                    const loadPercent = (progress.loaded / progress.total * 100);
                    updateProgress(61 + (loadPercent * 0.01), `Carregando avião: ${loadPercent.toFixed(1)}%`);
                }
            }
        });
        
        planeModel.name = "PlaneModel";
        planeModel.position.set(156.25, 5, -50.0); // Ajustado para acompanhar o hangar
        
        area3.add(planeModel);
        
        updateProgress(62, 'Avião carregado!');
        
    } catch (planeError) {
        console.error('[ENVIRONMENT] Error loading plane model:', planeError);
        console.log('[ENVIRONMENT] Continuing without plane...');
    }
    
    scene.add(area3);
    
    // IMPORTANTE: Colisões separadas para hangar
    // 1. Marcar colisões estáticas (paredes, teto, mas NÃO as portas)
    markHangarStaticCollisions(area3, collidableObjects);
    
    // 2. Gerenciar colisões dinâmicas das portas
    setupDynamicDoorCollisions(hangarModel, collidableObjects);
    
    // 3. Salvar referência para debug/testes
    hangarModel.userData.collidableObjectsRef = collidableObjects;
    
    enableShadowsForAll(area3);
    
    const blueKeyPosition = new THREE.Vector3(156.25, WORLD_CONFIG.AREA_Y_POSITION + 2, -80.0); // Dentro do hangar
    const blueKeyInstance = new Key('blue', blueKeyPosition);
    
    if (keyManager.addKey(blueKeyInstance, scene)) {
        if (blueKeyInstance.getMesh()) {
            blueKeyInstance.getMesh().position.copy(blueKeyPosition);
            blueKeyInstance.position.copy(blueKeyPosition);
            blueKeyInstance.originalY = blueKeyPosition.y;
        }
    }
}

function markHangarStaticCollisions(area3, collidableObjects) {
    area3.traverse((child) => {
        if (child.isMesh) {
            if (child.userData?.isHangarWall) {
                collidableObjects.push(child);
            }
        }
    });
}

function setupDynamicDoorCollisions(hangarModel, collidableObjects) {
    const doors = [];
    hangarModel.traverse((child) => {
        if (child.userData && child.userData.isDoor) {
            doors.push(child);
        }
    });
    
    let doorBlocker = null;
    hangarModel.traverse((child) => {
        if (child.userData && child.userData.isDoorBlocker) {
            doorBlocker = child;
        }
    });
    
    doors.forEach(door => {
        collidableObjects.push(door);
        console.log('[HANGAR] Porta adicionada às colisões (fechada):', door.name || 'unnamed door');
    });
    
    if (doorBlocker) {
        collidableObjects.push(doorBlocker);
        console.log('[HANGAR] Bloqueador da porta adicionado às colisões (porta fechada)');
    }
    
    hangarModel.userData.doorCollisions = doors.map(door => ({
        door: door,
        inCollisions: true
    }));
    
    hangarModel.userData.doorBlocker = {
        blocker: doorBlocker,
        inCollisions: true
    };
}

function manageDoorCollisions(hangarModel, collidableObjects, shouldOpen) {
    if (!hangarModel.userData.doorCollisions) return;
    
    hangarModel.userData.doorCollisions.forEach(doorData => {
        const { door } = doorData;
        const index = collidableObjects.indexOf(door);
        
        if (shouldOpen && index !== -1) {
            collidableObjects.splice(index, 1);
            doorData.inCollisions = false;
        } else if (!shouldOpen && index === -1) {
            collidableObjects.push(door);
            doorData.inCollisions = true;
        }
    });
    
    if (hangarModel.userData.doorBlocker) {
        const { blocker } = hangarModel.userData.doorBlocker;
        const index = collidableObjects.indexOf(blocker);
        
        if (!shouldOpen && index === -1) {
            // Adicionar bloqueador quando porta fechar
            collidableObjects.push(blocker);
            console.log('[HANGAR] Bloqueador adicionado às colisões (porta fechada)');
            hangarModel.userData.doorBlocker.inCollisions = true;
        } else if (shouldOpen && index !== -1) {
            // Remover bloqueador quando porta abrir
            collidableObjects.splice(index, 1);
            console.log('[HANGAR] Bloqueador removido das colisões (porta aberta)');
            hangarModel.userData.doorBlocker.inCollisions = false;
        }
    }
}

// Função para animar as portas do hangar
export function animateHangarDoors(hangarModel, shouldOpen, collidableObjects = null) {
    if (!hangarModel || hangarModel.userData.animating) {
        console.log('[HANGAR] Cannot animate doors - missing model or already animating');
        return;
    }
    
    // Encontrar as portas criadas pela nossa função createHangar
    const doors = [];
    hangarModel.traverse((child) => {
        if (child.userData && child.userData.isDoor) {
            doors.push(child);
        }
    });
    
    if (doors.length === 0) {
        console.log('[HANGAR] No doors found for animation');
        return;
    }
    
    // Gerenciar colisões das portas imediatamente ao começar a animação
    if (collidableObjects) {
        manageDoorCollisions(hangarModel, collidableObjects, shouldOpen);
    }
        
    hangarModel.userData.animating = true;
    hangarModel.userData.doorsOpen = shouldOpen;
    const animationDuration = 3000; // 3 segundos
    const startTime = Date.now();
    
    // Calcular posições iniciais e finais das portas
    const doorStates = doors.map(door => {
        const isLeftDoor = door.userData.isLeftDoor;
        const isRightDoor = door.userData.isRightDoor;
        const originalX = door.userData.originalX;
        
        let targetX = originalX;
        if (shouldOpen) {
            if (isLeftDoor) {
                targetX = originalX - 15; // Move para a esquerda
            } else if (isRightDoor) {
                targetX = originalX + 15; // Move para a direita
            }
        }
        
        return {
            door: door,
            startX: door.position.x,
            targetX: targetX,
            originalX: originalX
        };
    });
    
    function animateFrame() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / animationDuration, 1.0);
        
        // Usar easing para suavizar a animação
        const easedProgress = shouldOpen ? easeOutCubic(progress) : easeInCubic(progress);
        
        doorStates.forEach(({ door, startX, targetX }) => {
            // Interpolação linear entre posição inicial e final
            door.position.x = startX + (targetX - startX) * easedProgress;
        });
        
        if (progress < 1.0) {
            requestAnimationFrame(animateFrame);
        } else {
            hangarModel.userData.animating = false;
            console.log(`[HANGAR] Doors ${shouldOpen ? 'opened' : 'closed'} successfully`);
        }
    }
    
    requestAnimationFrame(animateFrame);
}

// Função para atualizar as portas do hangar baseado na proximidade do jogador e se tem a chave
export function updateHangarDoors(delta, camera, scene, collidableObjects, keyManager = null) {
    const area3 = scene.getObjectByName('Area3');
    if (!area3) {
        console.log('[HANGAR DEBUG] Area3 não encontrada');
        return;
    }
    
    const hangar = area3.getObjectByName('HangarModel');
    if (!hangar || !hangar.userData.doors) {
        console.log('[HANGAR DEBUG] HangarModel não encontrado ou sem doors');
        return;
    }
    
    const playerPosition = camera.position;
    const hangarPosition = hangar.position;
    const distance = Math.sqrt(
        Math.pow(playerPosition.x - hangarPosition.x, 2) + 
        Math.pow(playerPosition.z - hangarPosition.z, 2)
    ); // Calcular distância apenas no plano horizontal (X, Z)
    
    const openDistance = 80; // Aumentar distância para abrir
    
    const hasHangarKey = keyManager ? keyManager.hasKey('yellow') : false;
    
    if (distance < openDistance && !hangar.userData.doorsOpen && !hangar.userData.animating) {
        if (hasHangarKey) {
            console.log('[HANGAR DEBUG] ✅ Abrindo portas do hangar!');
            
            if (keyManager && keyManager.useKey) {
                keyManager.useKey('yellow');
                console.log('[HANGAR DEBUG] ✅ Chave amarela removida do inventário');
                
                window.dispatchEvent(new CustomEvent('keyRemoved', { detail: { keyType: 'yellow' } }));
            }
            
            animateHangarDoors(hangar, true, collidableObjects);
            
            hangar.userData.permanentlyOpen = true;
        }
    } 
}

export function isPlayerInsideHangar(camera, scene) {
    const area3 = scene.getObjectByName('Area3');
    if (!area3) return false;
    
    const hangar = area3.getObjectByName('HangarModel');
    if (!hangar) return false;
    
    const playerPos = camera.position;
    const hangarPos = hangar.position;
    const hangarWidth = 160;  // Atualizado para nova largura
    const hangarDepth = 120;  // Atualizado para nova profundidade
    const hangarHeight = 35;
    
    const minX = hangarPos.x - hangarWidth / 2;
    const maxX = hangarPos.x + hangarWidth / 2;
    const minY = hangarPos.y;
    const maxY = hangarPos.y + hangarHeight;
    const minZ = hangarPos.z - hangarDepth / 2;
    const maxZ = hangarPos.z + hangarDepth / 2;
    
    const insideX = playerPos.x >= minX && playerPos.x <= maxX;
    const insideY = playerPos.y >= minY && playerPos.y <= maxY;
    const insideZ = playerPos.z >= minZ && playerPos.z <= maxZ;
    
    return insideX && insideY && insideZ;
}