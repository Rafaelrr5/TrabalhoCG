// ============================================================================
// SISTEMA DE HITBOX DO JOGADOR
// ============================================================================
import * as THREE from '../build/three.module.js';
import { CONFIG } from './config.js';

export let hitbox = null;
export let velocityY = 0;
export let isGrounded = false;
const playerBox = new THREE.Box3();
const tempBox = new THREE.Box3();
const raycaster = new THREE.Raycaster();
const tamanhoRaio = 1.0;
//criação dos raios
const rays = [
    {dir: new THREE.Vector3(1, 0, 0), axis: 'x', offset: new THREE.Vector3(0.5, 0, 0)}, //Direita
    {dir: new THREE.Vector3(-1, 0, 0), axis: 'x', offset: new THREE.Vector3(-0.5, 0, 0)}, //Esquerda
    {dir: new THREE.Vector3(0, 0, 1), axis: 'z', offset: new THREE.Vector3(0, 0, 0.5)}, //Frente
    {dir: new THREE.Vector3(0, 0, -1), axis: 'z', offet: new THREE.Vector3(0, 0, -0.5)} //Trás
];//Se quisermos usar o raycaster para o chão é só adiconar mais direções aqui e adaptar o código

// Cria hitbox invisível para o jogador
export function createHitbox(scene) {
    //verificação de segurança
    if (!scene) {
        console.error("Scene is not defined. Cannot create hitbox.");
        return null;
    }
    const hitboxGeometry = new THREE.BoxGeometry(1.0, CONFIG.PLAYER_HEIGHT, 1.0);
    const hitboxMaterial = new THREE.MeshBasicMaterial({wireframe: true, color: 0xff0000}); // Material de wireframe para visualização
    hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    //hitbox.visible = false; // Torna a hitbox invisível
    hitbox.position.set(0.0, CONFIG.CAMERA_HEIGHT + CONFIG.ALTURA_PLAYER/2, 0.0);
    scene.add(hitbox);
    
    return hitbox;
}

// Atualiza a posição da hitbox para acompanhar o jogador
export function updateHitbox(camera) {
    //verificação de segurança
    if (!hitbox || !camera) {
        console.error("Hitbox or camera is not defined. Cannot update hitbox position.");
        return;
    }
    if (hitbox && camera) {
        hitbox.position.x = camera.position.x;
        hitbox.position.z = camera.position.z;
    }
}

// Aplica gravidade e verifica colisões
export function applyGravity(delta, collidableObjects, camera) {
    if (!hitbox || !camera || !collidableObjects) return;
    
    // Aplica gravidade apenas se não estiver no chão
    if (!isGrounded) {
        velocityY += CONFIG.GRAVITY * delta;
    } else {
        velocityY = 0;
    }
    
    // Move verticalmente
    hitbox.position.y += velocityY * delta;
    camera.position.y += velocityY * delta;
    
    // Verifica colisão com o chão e outros objetos
    checkGroundCollisions(collidableObjects, camera);
    checkWallCollisions(collidableObjects, camera);

    //Atuliza a camera para acompanhar a hitbox
    camera.position.y = hitbox.position.y + CONFIG.ALTURA_PLAYER/2
}

// Verifica colisões com o chão usando o sistema AABB
function checkGroundCollisions(collidableObjects, camera) {
    if (!hitbox || !collidableObjects || !camera) return;
    isGrounded = false;
    playerBox.setFromObject(hitbox);
    
    // Verifica colisão com todos os objetos
    for (const object of collidableObjects) {
        if (!object.geometry || !object.visible) continue;
        
        tempBox.setFromObject(object);
        
        if (playerBox.intersectsBox(tempBox)) {
            // Calcula a sobreposição em cada eixo
            const overlapX = Math.min(playerBox.max.x - tempBox.min.x, tempBox.max.x - playerBox.min.x);
            const overlapY = Math.min(playerBox.max.y - tempBox.min.y, tempBox.max.y - playerBox.min.y);
            const overlapZ = Math.min(playerBox.max.z - tempBox.min.z, tempBox.max.z - playerBox.min.z);
            
            // Encontra o eixo de menor sobreposição (colisão mais provável)
            if (overlapY < overlapX && overlapY < overlapZ) {
                // Colisão vertical
                if (velocityY < 0) { // Se estiver caindo
                    // Colisão com o chão
                    const correction = tempBox.max.y - playerBox.min.y + 0.001; //esse valor de 0.001 evita que a hitbox fique presa no chão
                    hitbox.position.y += correction;
                    camera.position.y += correction;
                    velocityY = 0;
                    isGrounded = true;
                } else if (velocityY > 0) {//Embora a gente não pule, coloquei esse metodo caso outros trabahos precisem
                    // Colisão com o teto
                    const correction = tempBox.min.y - playerBox.max.y - 0.001;
                    hitbox.position.y += correction;
                    camera.position.y += correction;
                    velocityY = 0;
                }
            }
        }
    }
}

function checkWallCollisions(collidableObjects, camera) {
    if (!hitbox || !collidableObjects || !camera) return;

    const validObjects = collidableObjects.filter(obj => {
        if(!obj?.isMesh || !obj.visible) return false;
        
        if (obj.isGroup) {
            let filhosValidos = false;
            obj.traverse(child => {
                if (child.isMesh && child.visible) {
                    filhosValidos = true;
                }
            });
            return filhosValidos;
        }
        return true; // Se for um mesh visível, é válido
    });

    for (const ray of rays){
        raycaster.set(hitbox.position, ray.dir);

        const interpts = raycaster.intersectObjects(validObjects, false);
        console.log(interpts);

        if (interpts.length > 0 && interpts[0].distance < tamanhoRaio) {
            // Colisão com a parede
            const correction = (interpts[0].distance - tamanhoRaio) * 1.05; // 1.05 é um fator de correção para evitar que a hitbox fique presa na parede
            console.log("Colisão detectada com a parede:", ray.axis, correction);

            if (ray.axis === 'x') {
                hitbox.position.x += ray.dir.x * correction;
                camera.position.x += ray.dir.x * correction;
            }
            else if (ray.axis === 'z') {
                hitbox.position.z += ray.dir.z * correction;
                camera.position.z += ray.dir.z * correction;
            }
            
        }
    }
}
