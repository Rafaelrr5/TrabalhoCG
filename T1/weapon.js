// ============================================================================
// SISTEMA DE ARMA E PROJÉTEIS
// ============================================================================
import * as THREE from '../build/three.module.js';
import { CONFIG } from './config.js';

export let gun = null;
export let projectiles = [];
export let shootInterval = null;
const raycaster = new THREE.Raycaster();
const distanciaColisiao = CONFIG.PROJECTILE_SIZE * 2; // Distância de colisão para projéteis

// Cria um modelo visual de arma anexado à câmera
export function createGun(camera) {
    const gunGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1.5);
    const gunMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
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
    shoot(camera, scene);
    shootInterval = setInterval(() => shoot(camera, scene), CONFIG.SHOOT_RATE);
}

// Para o sistema de tiro contínuo
export function stopShooting() {
    clearInterval(shootInterval);
}

// Cria e dispara um projétil da posição da arma
function shoot(camera, scene) {
    if (!gun || !camera) return; // Verificação de segurança
    
    // Cria geometria e material do projétil
    const projectileGeometry = new THREE.SphereGeometry(CONFIG.PROJECTILE_SIZE);
    const projectileMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    
    // Pega direção que a câmera está olhando no momento do tiro
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    // Calcula posição mundial da ponta da arma com precisão
    const gunWorldPosition = new THREE.Vector3();
    gun.getWorldPosition(gunWorldPosition);
    
    // Calcula offset da ponta da arma no espaço local
    const gunTipOffset = new THREE.Vector3(0, 0, -0.75);
    
    // Aplica rotação da câmera ao offset para manter sincronização
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
        
        projectileData.timeAlive += delta;

        // Verifica colisão com paredes usando Raycaster
        raycaster.set(projectile.position, projectileData.direction);
        raycaster.far = CONFIG.PROJECTILE_SPEED * delta + distanciaColisiao; // Distância máxima de colisão

        const intersects = raycaster.intersectObjects(scene.children, true);

        //filtra as colisões 
        const validIntersects = intersects.filter(intersects =>{
            return intersects.object !== gun && 
                     intersects.object !== projectile && 
                     intersects.object.parent !== gun;
        });

        //Colidindo com algo, remove o projétil da cena
        if (validIntersects.length > 0) {
            scene.remove(projectile);
            projectiles.splice(i, 1);// splice remove o projetil do array
            continue; // Sai do loop para evitar erros de índice
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