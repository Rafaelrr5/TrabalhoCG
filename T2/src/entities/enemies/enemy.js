import * as THREE from '../../../../build/three.module.js';
import { LostSoul } from './types/lostSoul.js';
import { preloadSkullModel } from '../../utils/skullLoader.js';
import { CONFIG } from '../../core/config.js';
import { isPlayerInArea1 } from '../../systems/environment.js';
import { 
  cacodemons, 
  updateCacodemons, 
  cleanupDeadCacodemons, 
  preloadCacodemons,
  createCacodemons,
  getCacodeemonCount
} from './cacodemonManager.js';

export const enemies = [];

export async function preloadEnemies() {
  await preloadSkullModel();
  await preloadCacodemons();
}

export async function createEnemies(scene) {
  await preloadEnemies();
  
  const y = CONFIG.AREA_Y_POSITION + CONFIG.AREA_HEIGHT / 2 + 8.0;
  const positions = [
    [-170, y, -140],
    [-160, y, -130],
    [-150, y, -135],
    [-155, y, -120],
    [-140, y, -145]
  ];
  
  positions.forEach(([x, py, z]) => {
    const enemy = new LostSoul([x, py, z]);
    enemy.area = 'area1';
    enemies.push(enemy);
    scene.add(enemy.mesh);
  });
  await createCacodemons(scene, 'area2');
}

export function updateEnemies(delta, scene, camera, gun = null, collidableObjects = []) {
  const hitboxTop = new THREE.Vector3(
    camera.position.x,
    CONFIG.CAMERA_HEIGHT + CONFIG.PLAYER_HEIGHT,
    camera.position.z
  );
  
  enemies.forEach(enemy => {
    if (isPlayerInArea1(camera)) {
      enemy.update(delta, camera, hitboxTop, collidableObjects);
    } else if (typeof enemy.idleBehavior === 'function') {
      enemy.idleBehavior(delta);
    }
  });
  
  // Update Cacodemons
  updateCacodemons(delta, scene, camera, gun, collidableObjects);
}

export function cleanupDeadEnemies(scene) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    if (!enemy.isAlive && (!enemy.mesh.parent || enemy.fadeCompleted)) {
      if (enemy.mesh.parent) {
        enemy.mesh.parent.remove(enemy.mesh);
      }
      enemy.dispose();
      enemies.splice(i, 1);
    }
  }
  
  cleanupDeadCacodemons(scene);
}

export function areAllEnemiesDefeated() {
  const lostSoulsDefeated = enemies.length > 0 && enemies.every(e => !e.isAlive);
  const cacodemonsDefeated = cacodemons.length === 0 || cacodemons.every(c => !c.isAlive);
  return lostSoulsDefeated && cacodemonsDefeated;
}

export function areAllArea1EnemiesDefeated() {
  // Verifica apenas as Lost Souls da área 1
  const area1LostSouls = enemies.filter(e => e.area === 'area1');
  return area1LostSouls.length > 0 && area1LostSouls.every(e => !e.isAlive);
}

export function areAllArea2EnemiesDefeated() {
  // Verifica apenas os Cacodemons da área 2
  const cacodeemonCount = getCacodeemonCount();
  return cacodeemonCount.total > 0 && cacodeemonCount.alive === 0;
}

export function getAliveEnemies() {
  return enemies.filter(e => e.isAlive);
}

export function addEnemy(scene, position) {
  const enemy = new LostSoul(position);
  enemies.push(enemy);
  scene.add(enemy.mesh);
  return enemy;
}

export function damageEnemiesInArea(center, radius, damage) {
  return enemies
    .filter(e => e.isAlive && e.mesh.position.distanceTo(center) <= radius)
    .map(e => ({ enemy: e, died: e.takeDamage(damage) }));
}

export function getEnemyCount() {
  const alive = getAliveEnemies().length;
  const lostSoulCount = { total: enemies.length, alive, dead: enemies.length - alive };
  
  const cacodeemonCount = getCacodeemonCount();
  return {
    lostSouls: lostSoulCount,
    cacodemons: cacodeemonCount,
    total: {
      total: lostSoulCount.total + cacodeemonCount.total,
      alive: lostSoulCount.alive + cacodeemonCount.alive,
      dead: lostSoulCount.dead + cacodeemonCount.dead
    }
  };
}
