// ============================================================================
// CRIAÇÃO DO AMBIENTE
// ============================================================================
import * as THREE from '../build/three.module.js';
import { setDefaultMaterial, createGroundPlaneXZ } from "../libs/util/util.js";
import { CONFIG } from './config.js';

// Cria as paredes do ambiente
export function createWalls(scene, collidableObjects) {
    let material = setDefaultMaterial();    // Cria o chão
    let plane = createGroundPlaneXZ(CONFIG.WORLD_SIZE, CONFIG.WORLD_SIZE);
    plane.position.y = CONFIG.ALTURA_CHAO;
    scene.add(plane);
    collidableObjects.push(plane);

    // Cria geometria das paredes
    let paredeGeometry = new THREE.PlaneGeometry(CONFIG.WORLD_SIZE, CONFIG.WALL_HEIGHT);
    
    // Cria as 4 paredes
    let parede0 = new THREE.Mesh(paredeGeometry, material);
    let parede1 = new THREE.Mesh(paredeGeometry, material);
    let parede2 = new THREE.Mesh(paredeGeometry, material);    
    let parede3 = new THREE.Mesh(paredeGeometry, material); 
    const Paredes = new THREE.Group();    // Posiciona as paredes
    parede0.position.set(0.0, CONFIG.WALL_Y_POSITION, -CONFIG.WORLD_SIZE/2);
    parede1.position.set(0.0, CONFIG.WALL_Y_POSITION, CONFIG.WORLD_SIZE/2);
    parede1.rotateY(-1 * Math.PI);
    parede2.position.set(-CONFIG.WORLD_SIZE/2, CONFIG.WALL_Y_POSITION, 0.0);
    parede2.rotateY(Math.PI / 2);
    parede3.position.set(CONFIG.WORLD_SIZE/2, CONFIG.WALL_Y_POSITION, 0.0);
    parede3.rotateY(-1 * Math.PI / 2);

    // Adiciona paredes à cena
    Paredes.add(parede0);
    Paredes.add(parede1);
    Paredes.add(parede2);
    Paredes.add(parede3);
    scene.add(Paredes);
    marcarColidivel(Paredes, collidableObjects);
}

// Cria as áreas coloridas do jogo
export function createAreas(scene, collidableObjects) {
    // Materiais das áreas
    const materials = {
        stair: new THREE.MeshBasicMaterial({color: 'blue'}),
        area1: new THREE.MeshBasicMaterial({color: 'lightblue'}),
        area2: new THREE.MeshBasicMaterial({color: 'red'}),
        area3: new THREE.MeshBasicMaterial({color: 'darkblue'}),
        area4: new THREE.MeshBasicMaterial({color: 'green'})
    };

    createArea1(scene, materials, collidableObjects);
    createArea2(scene, materials, collidableObjects);
    createArea3(scene, materials, collidableObjects);
    createArea4(scene, materials, collidableObjects);
}

// Cria a Área 1 (azul claro)
function createArea1(scene, materials, collidableObjects) {
    let AreaGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    let Area1_centro = new THREE.Mesh(AreaGeometry, materials.area1);
    let Area1_left = new THREE.Mesh(AreaGeometry, materials.area1);
    let Area1_right = new THREE.Mesh(AreaGeometry, materials.area1);
    const Area1 = new THREE.Group();
    Area1.name = "Area1";
    const Escada1 = new THREE.Group();    Area1_centro.position.set(-152.25, CONFIG.AREA_Y_POSITION, -131.0);
    Area1_centro.scale.set(125.0, CONFIG.AREA_HEIGHT, 125.0);
    Area1_left.position.set(-209.8, CONFIG.AREA_Y_POSITION, -66.0);
    Area1_left.scale.set(9.5, CONFIG.AREA_HEIGHT, 6.0);
    Area1_right.position.set(-140.0, CONFIG.AREA_Y_POSITION, -66.0);
    Area1_right.scale.set(101.0, CONFIG.AREA_HEIGHT, 6.0);
    
    Area1.add(Area1_centro);
    Area1.add(Area1_left);
    Area1.add(Area1_right);
    scene.add(Area1)
    Escada1.add(createStair(-197.75, CONFIG.STAIR_HEIGHT_OFFSET, -62.8, CONFIG.AREA_HEIGHT, true, materials.stair));
    scene.add(Escada1);
    marcarColidivel(Area1, collidableObjects);
    marcarColidivel(Escada1, collidableObjects);
}

// Cria a Área 2 (vermelha)
function createArea2(scene, materials, collidableObjects) {
    let AreaGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    let Area2_centro = new THREE.Mesh(AreaGeometry, materials.area2);
    let Area2_left = new THREE.Mesh(AreaGeometry, materials.area2);
    let Area2_right = new THREE.Mesh(AreaGeometry, materials.area2);
    const Area2 = new THREE.Group();
    Area2.name = "Area2";
    const Escada2 = new THREE.Group();    Area2_centro.position.set(0.0, CONFIG.AREA_Y_POSITION, -131.0);
    Area2_centro.scale.set(125.0, CONFIG.AREA_HEIGHT, 125.0);
    Area2_left.position.set(-10.0, CONFIG.AREA_Y_POSITION, -66.0);
    Area2_left.scale.set(105.0, CONFIG.AREA_HEIGHT, 6.0);
    Area2_right.position.set(60.0, CONFIG.AREA_Y_POSITION, -66.0);
    Area2_right.scale.set(5.0, CONFIG.AREA_HEIGHT, 6.0);
    
    Area2.add(Area2_centro);
    Area2.add(Area2_left);
    Area2.add(Area2_right);
    scene.add(Area2)
    Escada2.add(createStair(50.0, CONFIG.STAIR_HEIGHT_OFFSET, -62.8, CONFIG.AREA_HEIGHT, true, materials.stair));
    scene.add(Escada2);
    marcarColidivel(Area2, collidableObjects);
    marcarColidivel(Escada2, collidableObjects);
}

// Cria a Área 3 (azul escuro)
function createArea3(scene, materials, colidibleObjects) {
    let AreaGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    let Area3_centro = new THREE.Mesh(AreaGeometry, materials.area3);
    let Area3_left = new THREE.Mesh(AreaGeometry, materials.area3);
    let Area3_right = new THREE.Mesh(AreaGeometry, materials.area3);
    const Area3 = new THREE.Group();
    Area3.name = "Area3";
    const Escada3 = new THREE.Group();    Area3_centro.position.set(156.25, CONFIG.AREA_Y_POSITION, -131.0);
    Area3_centro.scale.set(125.0, CONFIG.AREA_HEIGHT, 125.0);
    Area3_left.position.set(121.2, CONFIG.AREA_Y_POSITION, -66.0);
    Area3_left.scale.set(55.0, CONFIG.AREA_HEIGHT, 6.0);
    Area3_right.position.set(191.2, CONFIG.AREA_Y_POSITION, -66.0);
    Area3_right.scale.set(55.0, CONFIG.AREA_HEIGHT, 6.0);
    
    Area3.add(Area3_centro);
    Area3.add(Area3_left);
    Area3.add(Area3_right);
    scene.add(Area3);
    Escada3.add(createStair(156.25, CONFIG.STAIR_HEIGHT_OFFSET, -62.8, CONFIG.AREA_HEIGHT, true, materials.stair));
    scene.add(Escada3);
    marcarColidivel(Area3, colidibleObjects);
    marcarColidivel(Escada3, colidibleObjects);
}

// Cria a Área 4 (verde)
function createArea4(scene, materials, collidableObjects) {
    let AreaGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    let Area4_centro = new THREE.Mesh(AreaGeometry, materials.area4);
    let Area4_left = new THREE.Mesh(AreaGeometry, materials.area4);
    let Area4_right = new THREE.Mesh(AreaGeometry, materials.area4);
    const Area4 = new THREE.Group();
    Area4.name = "Area4";
    const Escada4 = new THREE.Group();
      Area4_centro.position.set(0.0, CONFIG.AREA_Y_POSITION, 131.0);
    Area4_centro.scale.set(375.0, CONFIG.AREA_HEIGHT, 125.0);
    Area4_left.position.set(-97.5, CONFIG.AREA_Y_POSITION, 66.0);
    Area4_left.scale.set(180.0, CONFIG.AREA_HEIGHT, 6.0);
    Area4_right.position.set(97.5, CONFIG.AREA_Y_POSITION, 66.0);
    Area4_right.scale.set(180.0, CONFIG.AREA_HEIGHT, 6.0);

    Area4.add(Area4_centro);
    Area4.add(Area4_left);
    Area4.add(Area4_right);
    scene.add(Area4);
    Escada4.add(createStair(0.0, CONFIG.STAIR_HEIGHT_OFFSET, 62.8, CONFIG.AREA_HEIGHT, false, materials.stair));
    scene.add(Escada4);
    marcarColidivel(Area4, collidableObjects);
    marcarColidivel(Escada4, collidableObjects);
}

// Função para criar uma escada
function createStair(x, y, z, h, direcao, material) {    let grupoEscada = new THREE.Group();
    grupoEscada.name = "Escada";
    grupoEscada.position.set(x, y, z);
    const alturaDegrau = CONFIG.STAIR_STEP_HEIGHT; // Altura de cada degrau
    const profundidadeDegrau = CONFIG.STAIR_STEP_DEPTH; // Profundidade de cada degrau
    
    // Calcula o número de degraus necessários
    let steps = Math.ceil(h / alturaDegrau);
      for (let i = 0; i < steps; i++) {
        // Geometria da escada
        let stairGeometry = new THREE.BoxGeometry(CONFIG.STAIR_WIDTH, alturaDegrau, profundidadeDegrau);
        let step = new THREE.Mesh(stairGeometry, material);
        
        // Posiciona o degrau
        step.position.y = i * alturaDegrau + alturaDegrau / 2;
        if (direcao === true) {
            step.position.z = -i * profundidadeDegrau;
        } else {
            step.position.z = i * profundidadeDegrau;
        }
        
        grupoEscada.add(step);
    }
    
    return grupoEscada;
}

//Esse médodo serve para marcar um objeto, pertencente a um grupo, como colidivel
function marcarColidivel(Object, collidableObjects){
    Object.traverse(child => {
        if (child.isMesh) {
            collidableObjects.push(child);
        }
    });
}