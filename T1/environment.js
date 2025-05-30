// ============================================================================
// CRIAÇÃO DO AMBIENTE
// ============================================================================
import * as THREE from '../build/three.module.js';
import { setDefaultMaterial, createGroundPlaneXZ } from "../libs/util/util.js";
import { CONFIG } from './config.js';

// Cria as paredes do ambiente
export function createWalls(scene, collidableObjects) {
    let material = setDefaultMaterial('orange');    // Cria o chão
    let plane = createGroundPlaneXZ(CONFIG.WORLD_SIZE, CONFIG.WORLD_SIZE);
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
    createArea3(scene, materials, collidableObjects);
    createArea4(scene, materials, collidableObjects);
}

// Cria a Área 1 (azul claro)
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
    area1_left.position.set(-209.8, CONFIG.AREA_Y_POSITION, -66.0);
    area1_left.scale.set(9.5, CONFIG.AREA_HEIGHT, 6.0);
    area1_right.position.set(-140.0, CONFIG.AREA_Y_POSITION, -66.0);
    area1_right.scale.set(100.5, CONFIG.AREA_HEIGHT, 6.0);
    
    area1.add(area1_center);
    area1.add(area1_left);
    area1.add(area1_right);    scene.add(area1);
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
    area2.add(area2_right);    scene.add(area2);
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

// Função para criar uma escada
function createStair(x, y, z, h, direction, material) {
    let stairGroup = new THREE.Group();
    stairGroup.name = "Escada";
    stairGroup.position.set(x, y, z);
    const stepHeight = CONFIG.STAIR_STEP_HEIGHT; // Altura de cada degrau
    const stepDepth = CONFIG.STAIR_STEP_DEPTH; // Profundidade de cada degrau
      // Calcula o número de degraus necessários
    let steps = Math.ceil(h / stepHeight);
    
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