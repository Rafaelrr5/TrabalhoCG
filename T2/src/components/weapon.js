import * as THREE from '../../../build/three.module.js';
import { setDefaultMaterial } from '../../../libs/util/util.js';
import { CONFIG } from '../core/config.js';
import { enemies } from '../entities/enemies/enemy.js';

export let gun = null;
export let projectiles = [];
export let shootInterval = null;
let lastShotTime = 0; // Timestamp do último disparo
let isMousePressed = false; // Estado do mouse
const raycaster = new THREE.Raycaster();
const collisionDistance = CONFIG.PROJECTILE_SIZE * 2; // Distância de colisão para projéteis

// Cria um modelo visual de arma anexado à câmera
export function createGun(camera) {
    const gunGeometry = new THREE.CylinderGeometry(CONFIG.GUN_RADIUS, CONFIG.GUN_RADIUS, CONFIG.GUN_LENGTH);
    const gunMaterial = setDefaultMaterial('darkgrey');
    gun = new THREE.Mesh(gunGeometry, gunMaterial);
    
    // Rotaciona para apontar para frente
    gun.rotation.x = Math.PI / 2;
    // Posiciona relativo à câmera (inferior-direita da visão)
    gun.position.set(CONFIG.GUN_POSITION.x, CONFIG.GUN_POSITION.y, CONFIG.GUN_POSITION.z);
    
    // Anexa a arma na câmera para mover com o jogador
    camera.add(gun);
    
    return gun;
}

// Inicia o sistema de tiro contínuo
export function startShooting(camera, scene) {
    if (isMousePressed) return; // Evita múltiplas chamadas
    isMousePressed = true;
    
    // Dispara imediatamente apenas se passou tempo suficiente
    const now = performance.now();
    if (now - lastShotTime >= CONFIG.SHOOT_RATE) {
        shoot(camera, scene);
        lastShotTime = now;
    }
    
    // Inicia o interval para disparos contínuos
    shootInterval = setInterval(() => {
        if (isMousePressed) {
            shoot(camera, scene);
        }
    }, CONFIG.SHOOT_RATE);
}

// Para o sistema de tiro contínuo
export function stopShooting() {
    isMousePressed = false;
    clearInterval(shootInterval);
}

// Cria e dispara um projétil da posição da arma
function shoot(camera, scene) {
    if (!gun || !camera) return; // Verificação de segurança
    
    // Atualiza timestamp do último disparo
    lastShotTime = performance.now();
    
    // Cria geometria e material do projétil
    const projectileGeometry = new THREE.SphereGeometry(CONFIG.PROJECTILE_SIZE);
    const projectileMaterial = setDefaultMaterial('lightgreen');
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    
    // Pega direção que a câmera está olhando no momento do tiro
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    // Calcula posição mundial da ponta da arma com precisão
    const gunWorldPosition = new THREE.Vector3();
    gun.getWorldPosition(gunWorldPosition);
      // Calcula offset da ponta da arma no espaço local
    const gunTipOffset = new THREE.Vector3(0, 0, CONFIG.GUN_TIP_OFFSET);
    
    // Quando soma o vetor quer representa a ponta da arma à posição global da arma, o projétil sai exatamente na ponta do cano
    const cameraRotationMatrix = new THREE.Matrix4();
    cameraRotationMatrix.extractRotation(camera.matrixWorld);
    gunTipOffset.applyMatrix4(cameraRotationMatrix);
    
    // Posiciona projétil na ponta da arma
    projectile.position.copy(gunWorldPosition);
    projectile.position.add(gunTipOffset);
    
    scene.add(projectile);
    
    // Armazena projétil com seus dados de movimento e tempo
    projectiles.push({
        mesh: projectile,
        direction: direction.clone(),
        timeAlive: 0
    });
}

// Atualiza todos os projéteis na cena
export function updateProjectiles(delta, scene) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectileData = projectiles[i];
        const projectile = projectileData.mesh;
        
        projectileData.timeAlive += delta;        // Verifica colisão com paredes usando Raycaster
        raycaster.set(projectile.position, projectileData.direction);
        raycaster.far = CONFIG.PROJECTILE_SPEED * delta + collisionDistance; // Distância máxima de colisão

        const intersects = raycaster.intersectObjects(scene.children, true);

        // filtra as colisões 
        const validIntersects = intersects.filter(intersects =>{
            return intersects.object !== gun && 
                     intersects.object !== projectile && 
                     intersects.object.parent !== gun;
        });

        // Se colidiu com inimigo, aplica dano e remove projétil
        let hitEnemy = false;
        for (const hit of validIntersects) {
            // identifica se objeto ou seu parent é inimigo
            const obj = hit.object;
            // Check for enemy userData in hit object or its ancestors
            let enemy = null;
            let currentObj = obj;
            while (currentObj && !enemy) {
                if (currentObj.userData && currentObj.userData.enemy) {
                    enemy = currentObj.userData.enemy;
                    break;
                }
                // Also check if this object IS an enemy mesh
                enemy = enemies.find(e => e.mesh === currentObj);
                if (enemy) break;
                // Traverse up the hierarchy
                currentObj = currentObj.parent;
            }
            if (enemy && enemy.isAlive) {
                console.log('Hit enemy!', enemy);
                enemy.takeDamage(10);
                scene.remove(projectile);
                projectiles.splice(i, 1);
                hitEnemy = true;
                break;
            }
        }
        if (hitEnemy) continue;
        // colisão com ambiente, remove o projétil
        if (validIntersects.length > 0) {
            scene.remove(projectile);
            projectiles.splice(i, 1);
            continue; // evita erros de índice
        }
         
         // Move projétil na direção especificada
         projectile.position.add(
             projectileData.direction.clone().multiplyScalar(CONFIG.PROJECTILE_SPEED * delta)
         );
         
         // Remove projétil após tempo limite
         if (projectileData.timeAlive > CONFIG.PROJECTILE_LIFETIME) {
             scene.remove(projectile);
             projectiles.splice(i, 1);
         }
     }
}

//export function weaponSwitch (now){
 //   if (now - lastSwitch < CD) return;

   // lastSwitch = now;

    //direção do Scroll
    //const dir = Math.sign(event.deltaY);

//}
