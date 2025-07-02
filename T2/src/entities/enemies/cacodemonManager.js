import * as THREE from '../../../../build/three.module.js';
import { Cacodemon } from './types/cacodemon.js';
import { CONFIG } from '../../core/config.js';
import { CACODEMON_CONFIG, CACODEMON_AREAS } from './config/cacodeemonConfig.js';
import { isPlayerInArea2 } from '../../systems/environment.js';

export const cacodemons = [];

const MAX_CACODEMONS = 3;

const originalPush = cacodemons.push;
cacodemons.push = function(...args) {
  if (this.length >= MAX_CACODEMONS) {
    return this.length;
  }
  return originalPush.apply(this, args);
};

if (typeof window !== 'undefined') {
  window.getCacodemons = () => cacodemons;
  window.debugCacodemons = () => {
    console.log('=== CACODEMON DEBUG INFO ===');
    console.log('Total Cacodemons:', cacodemons.length);
    cacodemons.forEach((cacodemon, index) => {
      console.log(`Cacodemon ${index + 1}:`, {
        position: cacodemon.mesh.position,
        aiState: cacodemon.aiState,
        isAlive: cacodemon.isAlive,
        health: cacodemon.currentHealth
      });
    });
  };
  
  window.resetCacodemons = () => {
    cacodemons.forEach((cacodemon) => {
      cacodemon.mesh.position.copy(cacodemon.spawnPosition);
      cacodemon.baseY = cacodemon.originalSpawnY;
      cacodemon.aiState = 'IDLE';
      cacodemon.stateChangeTime = 0;
    });
  };
  
  window.fixCacodeemonCount = (scene) => {
    if (cacodemons.length > 3) {
      const extraCacodemons = cacodemons.splice(3);
      extraCacodemons.forEach((cacodemon) => {
        if (cacodemon.mesh.parent) {
          cacodemon.mesh.parent.remove(cacodemon.mesh);
        }
        if (cacodemon.dispose) {
          cacodemon.dispose();
        }
      });
    }
  };
}

export async function preloadCacodemons() {
  // Preload assets silently
}

export async function createCacodemons(scene, area = 'area2') {
  if (cacodemons.length > 0) {
    return;
  }
  
  await preloadCacodemons();
  
  const positions = getCacodeemonPositions(area);
  const maxCacodemons = 3;
  const positionsToUse = positions.slice(0, maxCacodemons);
  
  let createdCount = 0;
  positionsToUse.forEach(([x, y, z], index) => {
    if (cacodemons.length >= maxCacodemons) {
      return;
    }
    
    try {
      const cacodemon = new Cacodemon([x, y, z]);
      cacodemons.push(cacodemon);
      scene.add(cacodemon.mesh);
      createdCount++;
    } catch (error) {
      console.error(`[CacodeemonManager] Error creating Cacodemon ${index + 1}:`, error);
    }
  });
  
  if (cacodemons.length > maxCacodemons) {
    console.error(`[CacodeemonManager] CRITICAL ERROR: Created ${cacodemons.length} cacodemons, exceeds maximum of ${maxCacodemons}!`);
  }
}

function getCacodeemonPositions(area) {
  if (CACODEMON_CONFIG.SPAWN_AREAS[area]) {
    return CACODEMON_CONFIG.SPAWN_AREAS[area].positions;
  }
  
  const baseY = CONFIG.AREA_Y_POSITION + CONFIG.AREA_HEIGHT / 2 + 10.0;
  
  switch (area) {
    case 'area2':
      return [
        [37.5, 34.0, -125.0],
        [-30, 19.0, -125.0],
        [-30, 24.0, -145.0],
      ];
    case 'area3':
      return [
        [100, baseY, 100],
        [110, baseY, 110],
      ];
    default:
      return [
        [0, baseY, 50],
        [20, baseY, 60],
      ];
  }
}

export function updateCacodemons(delta, scene, camera, gun = null, collidableObjects = []) {
  const hitboxTop = new THREE.Vector3(
    camera.position.x,
    CONFIG.CAMERA_HEIGHT + CONFIG.PLAYER_HEIGHT,
    camera.position.z
  );
  
  cacodemons.forEach(cacodemon => {
    if (shouldUpdateCacodemon(camera, cacodemon)) {
      cacodemon.update(delta, camera, hitboxTop, collidableObjects);
    } else if (typeof cacodemon.idleBehavior === 'function') {
      cacodemon.idleBehavior(delta);
    }
  });
}

function shouldUpdateCacodemon(camera, cacodemon) {
  if (isPlayerInArea2(camera)) {
    return true;
  }
  
  const distance = camera.position.distanceTo(cacodemon.mesh.position);
  return distance < 80;
}

export function cleanupDeadCacodemons(scene) {
  for (let i = cacodemons.length - 1; i >= 0; i--) {
    const cacodemon = cacodemons[i];
    
    if (!cacodemon.isAlive && (!cacodemon.mesh.parent || cacodemon.fadeCompleted)) {
      if (cacodemon.mesh.parent) {
        cacodemon.mesh.parent.remove(cacodemon.mesh);
      }
      cacodemon.dispose();
      cacodemons.splice(i, 1);
    }
  }
}

export function areAllCacodemonsDefeated() {
  return cacodemons.length > 0 && cacodemons.every(c => !c.isAlive);
}

export function getAliveCacodemons() {
  return cacodemons.filter(c => c.isAlive);
}

export function addCacodemon(scene, position, config = {}) {
  const cacodemon = new Cacodemon(position, config);
  cacodemons.push(cacodemon);
  scene.add(cacodemon.mesh);
  return cacodemon;
}

export function damageCacodemonsInArea(center, radius, damage) {
  return cacodemons
    .filter(c => c.isAlive && c.mesh.position.distanceTo(center) <= radius)
    .map(c => ({ enemy: c, died: c.takeDamage(damage) }));
}

export function getCacodeemonCount() {
  const alive = getAliveCacodemons().length;
  return { total: cacodemons.length, alive, dead: cacodemons.length - alive };
}

export function updateCacodeemonProjectiles(delta, scene, collidableObjects = []) {
  cacodemons.forEach(cacodemon => {
    if (cacodemon.isAlive && cacodemon.activeProjectiles) {
      // Projectile collision and cleanup handled in individual Cacodemon update
    }
  });
}

export function getAllCacodeemonProjectiles() {
  const allProjectiles = [];
  cacodemons.forEach(cacodemon => {
    if (cacodemon.activeProjectiles) {
      allProjectiles.push(...cacodemon.activeProjectiles);
    }
  });
  return allProjectiles;
}

export async function spawnCacodemonsInArea(scene, areaName, count = 1) {
  // TODO: Implement area-specific spawning logic
}

export function removeCacodemonsFromArea(scene, areaName) {
  // TODO: Implement area-specific removal logic
}
