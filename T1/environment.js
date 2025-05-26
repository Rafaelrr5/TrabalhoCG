// ============================================================================
// CRIAÇÃO DO AMBIENTE
// ============================================================================
import * as THREE from '../build/three.module.js';
import { setDefaultMaterial, createGroundPlaneXZ } from "../libs/util/util.js";

// Cria as paredes do ambiente
export function createWalls(scene, collidableObjects) {
    let material = setDefaultMaterial();

    // Cria o chão
    let plane = createGroundPlaneXZ(500, 500);
    scene.add(plane);
    collidableObjects.push(plane);

    // Cria geometria das paredes
    let paredeGeometry = new THREE.PlaneGeometry(500, 20);
    
    // Cria as 4 paredes
    let parede0 = new THREE.Mesh(paredeGeometry, material);
    let parede1 = new THREE.Mesh(paredeGeometry, material);
    let parede2 = new THREE.Mesh(paredeGeometry, material);    
    let parede3 = new THREE.Mesh(paredeGeometry, material); 
    const Paredes = new THREE.Group();

    // Posiciona as paredes
    parede0.position.set(0.0, 9.0, -250.0);
    parede1.position.set(0.0, 9.0, 250.0);
    parede1.rotateY(-1 * Math.PI);
    parede2.position.set(-250.0, 9.0, 0.0);
    parede2.rotateY(Math.PI / 2);
    parede3.position.set(250.0, 9.0, 0.0);
    parede3.rotateY(-1 * Math.PI / 2);

    // Adiciona paredes à cena
    Paredes.add(parede0);
    Paredes.add(parede1);
    Paredes.add(parede2);
    Paredes.add(parede3);
    scene.add(Paredes);
}

// Cria as áreas coloridas do jogo
export function createAreas(scene) {
    // Materiais das áreas
    const materials = {
        stair: new THREE.MeshBasicMaterial({color: 'blue'}),
        area1: new THREE.MeshBasicMaterial({color: 'lightblue'}),
        area2: new THREE.MeshBasicMaterial({color: 'red'}),
        area3: new THREE.MeshBasicMaterial({color: 'darkblue'}),
        area4: new THREE.MeshBasicMaterial({color: 'green'})
    };

    createArea1(scene, materials);
    createArea2(scene, materials);
    createArea3(scene, materials);
    createArea4(scene, materials);
}

// Cria a Área 1 (azul claro)
function createArea1(scene, materials) {
    let AreaGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    let Area1_centro = new THREE.Mesh(AreaGeometry, materials.area1);
    let Area1_left = new THREE.Mesh(AreaGeometry, materials.area1);
    let Area1_right = new THREE.Mesh(AreaGeometry, materials.area1);
    const Area1 = new THREE.Group();
    const Escada1 = new THREE.Group();

    Area1_centro.position.set(-152.25, 2.0, -131.0);
    Area1_centro.scale.set(125.0, 4.0, 125.0);
    Area1_left.position.set(-209.8, 2.0, -66.0);
    Area1_left.scale.set(9.5, 4.0, 6.0);
    Area1_right.position.set(-140.0, 2.0, -66.0);
    Area1_right.scale.set(101.0, 4.0, 6.0);
    
    Area1.add(Area1_centro);
    Area1.add(Area1_left);
    Area1.add(Area1_right);
    scene.add(Area1)
    Escada1.add(createStair(-197.75, 0.1, -62.8, 4.0, true, materials.stair));
    scene.add(Escada1);
}

// Cria a Área 2 (vermelha)
function createArea2(scene, materials) {
    let AreaGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    let Area2_centro = new THREE.Mesh(AreaGeometry, materials.area2);
    let Area2_left = new THREE.Mesh(AreaGeometry, materials.area2);
    let Area2_right = new THREE.Mesh(AreaGeometry, materials.area2);
    const Area2 = new THREE.Group();
    const Escada2 = new THREE.Group();

    Area2_centro.position.set(0.0, 2.0, -131.0);
    Area2_centro.scale.set(125.0, 4.0, 125.0);
    Area2_left.position.set(-10.0, 2.0, -66.0);
    Area2_left.scale.set(105.0, 4.0, 6.0);
    Area2_right.position.set(60.0, 2.0, -66.0);
    Area2_right.scale.set(5.0, 4.0, 6.0);
    
    Area2.add(Area2_centro);
    Area2.add(Area2_left);
    Area2.add(Area2_right);
    scene.add(Area2)
    Escada2.add(createStair(50.0, 0.1, -62.8, 4.0, true, materials.stair));
    scene.add(Escada2);
}

// Cria a Área 3 (azul escuro)
function createArea3(scene, materials) {
    let AreaGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    let Area3_centro = new THREE.Mesh(AreaGeometry, materials.area3);
    let Area3_left = new THREE.Mesh(AreaGeometry, materials.area3);
    let Area3_right = new THREE.Mesh(AreaGeometry, materials.area3);
    const Area3 = new THREE.Group();
    const Escada3 = new THREE.Group();

    Area3_centro.position.set(156.25, 2.0, -131.0);
    Area3_centro.scale.set(125.0, 4.0, 125.0);
    Area3_left.position.set(121.2, 2.0, -66.0);
    Area3_left.scale.set(55.0, 4.0, 6.0);
    Area3_right.position.set(191.2, 2.0, -66.0);
    Area3_right.scale.set(55.0, 4.0, 6.0);
    
    Area3.add(Area3_centro);
    Area3.add(Area3_left);
    Area3.add(Area3_right);
    scene.add(Area3);
    Escada3.add(createStair(156.25, 0.1, -62.8, 4.0, true, materials.stair));
    scene.add(Escada3);
}

// Cria a Área 4 (verde)
function createArea4(scene, materials) {
    let AreaGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    let Area4_centro = new THREE.Mesh(AreaGeometry, materials.area4);
    let Area4_left = new THREE.Mesh(AreaGeometry, materials.area4);
    let Area4_right = new THREE.Mesh(AreaGeometry, materials.area4);
    const Area4 = new THREE.Group();
    const Escada4 = new THREE.Group();
    
    Area4_centro.position.set(0.0, 2.0, 131.0);
    Area4_centro.scale.set(375.0, 4.0, 125.0);
    Area4_left.position.set(-97.5, 2.0, 66.0);
    Area4_left.scale.set(180.0, 4.0, 6.0);
    Area4_right.position.set(97.5, 2.0, 66.0);
    Area4_right.scale.set(180.0, 4.0, 6.0);

    Area4.add(Area4_centro);
    Area4.add(Area4_left);
    Area4.add(Area4_right);
    scene.add(Area4);
    Escada4.add(createStair(0.0, 0.1, 62.8, 4.0, false, materials.stair));
    scene.add(Escada4);
}

// Função para criar uma escada
function createStair(x, y, z, h, direcao, material) {
    let grupoEscada = new THREE.Group();
    grupoEscada.position.set(x, y, z);
    
    // Calcula o número de degraus necessários
    let steps = Math.ceil(h / 0.2);
    
    for (let i = 0; i < steps; i++) {
        // Geometria da escada
        let stairGeometry = new THREE.BoxGeometry(15.0, 0.2, 0.3);
        let step = new THREE.Mesh(stairGeometry, material);
        
        // Posiciona o degrau
        step.position.y = i * 0.2 + 0.2 / 2;
        if (direcao === true) {
            step.position.z = -i * 0.3;
        } else {
            step.position.z = i * 0.3;
        }
        
        grupoEscada.add(step);
    }
    
    return grupoEscada;
}
