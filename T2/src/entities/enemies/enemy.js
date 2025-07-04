import * as THREE from '../../../../build/three.module.js';
import { LostSoul } from './types/lostSoul.js';
import { Cacodemon } from './types/cacodemon.js';
import { preloadSkullModel } from '../../utils/skullLoader.js';
import { CONFIG } from '../../core/config.js';
import { isPlayerInArea1, isPlayerInArea2 } from '../../systems/environment.js';
import { cleanupAllProjectiles } from './systems/cacodeemonProjectile.js';

export const enemies = [];

// Track if cacodemons have been activated in area 2
let area2CacodemonsActivated = false;

export async function preloadEnemies() {
  await preloadSkullModel();
  // Preload Cacodemon assets here if needed
}

export async function createEnemies(scene) {
  await preloadEnemies();
  
  // Create Lost Souls for Area 1
  const lostSoulY = CONFIG.AREA_Y_POSITION + CONFIG.AREA_HEIGHT / 2 + 8.0;
  const lostSoulPositions = [
    [-170, lostSoulY, -140],
    [-160, lostSoulY, -130],
    [-150, lostSoulY, -135],
    [-155, lostSoulY, -120],
    [-140, lostSoulY, -145]
  ];
  
  lostSoulPositions.forEach(([x, y, z]) => {
    const enemy = new LostSoul([x, y, z]);
    enemy.area = 'area1';
    enemy.enemyType = 'LostSoul';
    enemies.push(enemy);
    scene.add(enemy.mesh);
  });

  // Create Cacodemons for Area 2
  const cacodeemonPositions = [
    [37.5, 34.0, -125.0],
    [-30, 19.0, -125.0],
    [-30, 24.0, -145.0],
  ];

  cacodeemonPositions.forEach(([x, y, z]) => {
    const enemy = new Cacodemon([x, y, z]);
    enemy.area = 'area2';
    enemy.enemyType = 'Cacodemon';
    enemies.push(enemy);
    scene.add(enemy.mesh);
  });
}

export function updateEnemies(delta, scene, camera, gun = null, collidableObjects = []) {
  const hitboxTop = new THREE.Vector3(
    camera.position.x,
    CONFIG.CAMERA_HEIGHT + CONFIG.PLAYER_HEIGHT,
    camera.position.z
  );
  
  enemies.forEach(enemy => {
    if (shouldUpdateEnemy(camera, enemy)) {
      enemy.update(delta, camera, hitboxTop, collidableObjects);
    } else if (typeof enemy.idleBehavior === 'function') {
      enemy.idleBehavior(delta);
    }
  });
}

function shouldUpdateEnemy(camera, enemy) {
  switch (enemy.area) {
    case 'area1':
      return isPlayerInArea1(camera);
    case 'area2':
      const playerInArea2 = isPlayerInArea2(camera);
      // Activate all cacodemons aggressively when player first enters area 2
      if (playerInArea2) {
        activateCacodemonsInArea2();
      }
      return playerInArea2;
    default:
      return true;
  }
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
}

export function areAllEnemiesDefeated() {
  return enemies.length > 0 && enemies.every(e => !e.isAlive);
}

export function areAllArea1EnemiesDefeated() {
  const area1Enemies = enemies.filter(e => e.area === 'area1');
  return area1Enemies.length > 0 && area1Enemies.every(e => !e.isAlive);
}

export function areAllArea2EnemiesDefeated() {
  const area2Enemies = enemies.filter(e => e.area === 'area2');
  return area2Enemies.length > 0 && area2Enemies.every(e => !e.isAlive);
}

export function getAliveEnemies() {
  return enemies.filter(e => e.isAlive);
}

export function getLostSouls() {
  return enemies.filter(e => e.enemyType === 'LostSoul');
}

export function getCacodemons() {
  return enemies.filter(e => e.enemyType === 'Cacodemon');
}

export function addEnemy(scene, position, type = 'LostSoul') {
  let enemy;
  if (type === 'Cacodemon') {
    enemy = new Cacodemon(position);
    enemy.area = 'area2';
    enemy.enemyType = 'Cacodemon';
  } else {
    enemy = new LostSoul(position);
    enemy.area = 'area1';
    enemy.enemyType = 'LostSoul';
  }
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
  const lostSouls = getLostSouls();
  const cacodemons = getCacodemons();
  
  return {
    lostSouls: {
      total: lostSouls.length,
      alive: lostSouls.filter(e => e.isAlive).length,
      dead: lostSouls.filter(e => !e.isAlive).length
    },
    cacodemons: {
      total: cacodemons.length,
      alive: cacodemons.filter(e => e.isAlive).length,
      dead: cacodemons.filter(e => !e.isAlive).length
    },
    total: {
      total: enemies.length,
      alive: enemies.filter(e => e.isAlive).length,
      dead: enemies.filter(e => !e.isAlive).length
    }
  };
}

// Projectile cleanup for game restart
export function cleanupAllEnemyProjectiles(scene) {
  const cacodemons = getCacodemons();
  cleanupAllProjectiles(scene, cacodemons);
}

// Activate all cacodemons in area 2 when player enters the area
export function activateCacodemonsInArea2() {
  if (area2CacodemonsActivated) return;
  
  const cacodemons = getCacodemons().filter(c => c.area === 'area2' && c.isAlive);
  
  cacodemons.forEach(cacodemon => {
    if (cacodemon.aiState === 'IDLE') {
      cacodemon.changeState('ACTIVATED');
    }
  });
  
  area2CacodemonsActivated = true;
  console.log(`Activated ${cacodemons.length} Cacodemons in Area 2!`);
}

export function resetArea2Activation() {
  area2CacodemonsActivated = false;
}

// Debug functions for development
if (typeof window !== 'undefined') {
  window.getEnemies = () => enemies;
  window.getCacodemons = () => getCacodemons();
  window.getLostSouls = () => getLostSouls();
  
  window.debugEnemies = () => {
    console.log('=== ENEMY DEBUG INFO ===');
    console.log('Total Enemies:', enemies.length);
    
    const lostSouls = getLostSouls();
    console.log('Lost Souls:', lostSouls.length);
    lostSouls.forEach((enemy, index) => {
      console.log(`Lost Soul ${index + 1}:`, {
        position: enemy.mesh.position,
        aiState: enemy.aiState,
        isAlive: enemy.isAlive,
        health: enemy.currentHealth,
        area: enemy.area
      });
    });
    
    const cacodemons = getCacodemons();
    console.log('Cacodemons:', cacodemons.length);
    cacodemons.forEach((enemy, index) => {
      console.log(`Cacodemon ${index + 1}:`, {
        position: enemy.mesh.position,
        aiState: enemy.aiState,
        isAlive: enemy.isAlive,
        health: enemy.currentHealth,
        area: enemy.area
      });
    });
  };
  
  window.resetEnemies = () => {
    enemies.forEach((enemy) => {
      if (enemy.spawnPosition) {
        enemy.mesh.position.copy(enemy.spawnPosition);
      }
      if (enemy.baseY !== undefined && enemy.originalSpawnY !== undefined) {
        enemy.baseY = enemy.originalSpawnY;
      }
      enemy.aiState = 'IDLE';
      if (enemy.stateChangeTime !== undefined) {
        enemy.stateChangeTime = 0;
      }
    });
  };
  
  window.fixEnemyCount = (scene) => {
    const maxLostSouls = 5;
    const maxCacodemons = 3;
    
    const lostSouls = getLostSouls();
    const cacodemons = getCacodemons();
    
    if (lostSouls.length > maxLostSouls) {
      const extraLostSouls = lostSouls.splice(maxLostSouls);
      extraLostSouls.forEach((enemy) => {
        if (enemy.mesh.parent) {
          enemy.mesh.parent.remove(enemy.mesh);
        }
        if (enemy.dispose) {
          enemy.dispose();
        }
        const index = enemies.indexOf(enemy);
        if (index > -1) {
          enemies.splice(index, 1);
        }
      });
    }
    
    if (cacodemons.length > maxCacodemons) {
      const extraCacodemons = cacodemons.splice(maxCacodemons);
      extraCacodemons.forEach((enemy) => {
        if (enemy.mesh.parent) {
          enemy.mesh.parent.remove(enemy.mesh);
        }
        if (enemy.dispose) {
          enemy.dispose();
        }
        const index = enemies.indexOf(enemy);
        if (index > -1) {
          enemies.splice(index, 1);
        }
      });
    }
  };
  
  // Debug functions for testing cacodemon behavior
  window.activateAllCacodemons = () => {
    const cacodemons = getCacodemons();
    cacodemons.forEach(c => {
      if (c.isAlive) {
        c.changeState('ACTIVATED');
      }
    });
    console.log(`Manually activated ${cacodemons.length} cacodemons`);
  };
  
  window.getCacodeemonStates = () => {
    const cacodemons = getCacodemons();
    cacodemons.forEach((c, i) => {
      console.log(`Cacodemon ${i + 1}:`, {
        state: c.aiState,
        isAlive: c.isAlive,
        hasBeenActivated: c.hasBeenActivated,
        aggressionLevel: c.aggressionLevel,
        position: c.mesh.position,
        area: c.area
      });
    });
  };
  
  window.forceArea2Activation = () => {
    area2CacodemonsActivated = false;
    activateCacodemonsInArea2();
  };
}
