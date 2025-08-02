import * as THREE from '../../../../build/three.module.js';
import { LostSoul } from './types/lostSoul.js';
import { Cacodemon } from './types/cacodemon.js';
import { preloadSkullModel } from '../../utils/skullLoader.js';
import { CONFIG } from '../../core/config.js';
import { isPlayerInArea1, isPlayerInArea2 } from '../../systems/environment.js';
import { cleanupAllProjectiles } from './systems/cacodeemonProjectile.js';
import { EnemyPersistentPursuitManager } from './components/EnemyPersistentPursuitBehavior.js';
import { forceShowAllHealthBars, debugAllHealthBars } from './base/enemies.js';

export const enemies = [];

let area1LostSoulsActivated = false;
let area2CacodemonsActivated = false;

// Health bar debugging - remove this in production
let healthBarDebugCounter = 0;
const HEALTH_BAR_DEBUG_INTERVAL = 300; // Every 5 seconds at 60fps

export async function preloadEnemies() {
  await preloadSkullModel();
}

export async function createEnemies(scene) {
  await preloadEnemies();
  
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

  const cacodeemonPositions = [
    [-22.5, 20, -155.5],
    [25.5, 20, -123.5],
    [-6.5, 20, -107.0],
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
  
  const aliveEnemies = enemies.filter(e => e.isAlive);
  
  // Health bar debugging - periodically check and force visibility
  healthBarDebugCounter++;
  if (healthBarDebugCounter >= HEALTH_BAR_DEBUG_INTERVAL) {
    forceShowAllHealthBars(aliveEnemies);
    healthBarDebugCounter = 0;
  }
  
  enemies.forEach(enemy => {
    if (shouldUpdateEnemy(camera, enemy)) {
      const otherEnemies = aliveEnemies.filter(e => e !== enemy);
      enemy.update(delta, camera, hitboxTop, collidableObjects, otherEnemies);
    } else if (typeof enemy.idleBehavior === 'function') {
      enemy.idleBehavior(delta);
    }
  });
}

function shouldUpdateEnemy(camera, enemy) {
  switch (enemy.area) {
    case 'area1':
      const playerInArea1 = isPlayerInArea1(camera);
      if (playerInArea1) {
        activateLostSoulsInArea1();
      }
      
      if (enemy.enemyType === 'LostSoul' && enemy.pursuitBehavior && enemy.pursuitBehavior.hasBeenActivated) {
        return true;
      }
      return playerInArea1;
    case 'area2':
      const playerInArea2 = isPlayerInArea2(camera);
      if (playerInArea2) {
        activateCacodemonsInArea2();
      }
      
      if (enemy.enemyType === 'Cacodemon' && enemy.pursuitBehavior && enemy.pursuitBehavior.hasBeenActivated) {
        return true;
      }
      
      return playerInArea2;
    default:
      return true;
  }
}

export function cleanupDeadEnemies(scene) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    if (!enemy.isAlive && enemy.mesh && (!enemy.mesh.parent || enemy.fadeCompleted)) {
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

export function cleanupAllEnemyProjectiles(scene) {
  const cacodemons = getCacodemons();
  cleanupAllProjectiles(scene, cacodemons);
}

export function activateCacodemonsInArea2() {
  if (area2CacodemonsActivated) return;
  
  const cacodemons = getCacodemons().filter(c => c.area === 'area2' && c.isAlive);
  
  cacodemons.forEach(cacodemon => {
    if (cacodemon.pursuitBehavior) {
      cacodemon.pursuitBehavior.activate();
    }
    if (cacodemon.aiState === 'IDLE') {
      cacodemon.changeState('ACTIVATED');
    }
  });
  
  area2CacodemonsActivated = true;
  console.log(`Activated ${cacodemons.length} Cacodemons in Area 2!`);
}

export function resetArea2Activation() {
  area2CacodemonsActivated = false;
  EnemyPersistentPursuitManager.resetAllPursuitBehaviors(getCacodemons());
}

// ============================================================================
// DEBUG FUNCTIONS FOR HEALTH BARS
// ============================================================================

/**
 * Debug function to check health bar status - can be called from browser console
 */
window.debugEnemyHealthBars = function() {
  debugAllHealthBars(enemies);
  
  // Special focus on Lost Souls since they were having issues
  const lostSouls = enemies.filter(e => e.constructor.name === 'LostSoul');
  
  return enemies.map(enemy => ({
    type: enemy.constructor.name,
    alive: enemy.isAlive,
    health: `${enemy.currentHealth}/${enemy.maxHealth}`,
    hasHealthBar: !!enemy.healthBar,
    healthBarEnabled: enemy.healthBar?.enabled,
    healthBarVisible: enemy.healthBar?.healthBarGroup?.visible
  }));
};

/**
 * Force all health bars to show - can be called from browser console
 */
window.forceShowHealthBars = function() {
  forceShowAllHealthBars(enemies);
};

export function activateLostSoulsInArea1() {
  if (area1LostSoulsActivated) return;
  
  const lostSouls = getLostSouls().filter(ls => ls.area === 'area1' && ls.isAlive);
  
  lostSouls.forEach(lostSoul => {
    if (lostSoul.pursuitBehavior) {
      lostSoul.pursuitBehavior.activate();
    }
    lostSoul.playSightSound();
  });
  
  area1LostSoulsActivated = true;
  console.log(`Activated ${lostSouls.length} Lost Souls in Area 1!`);
}

export function resetArea1Activation() {
  area1LostSoulsActivated = false;
  EnemyPersistentPursuitManager.resetAllPursuitBehaviors(getLostSouls());
}

// Debug functions for development
if (typeof window !== 'undefined') {
  // Keep some legacy functions for backward compatibility
  window.getEnemies = () => enemies;
  window.getCacodemons = () => getCacodemons();
  window.getLostSouls = () => getLostSouls();
  
  // Additional utility functions
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
      
      // Reset pursuit behavior if available
      if (enemy.pursuitBehavior) {
        enemy.pursuitBehavior.reset();
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
}
