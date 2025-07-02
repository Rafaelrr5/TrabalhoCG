/**
 * Cacodemon enemy manager for Area 2 (or specific area)
 */
import * as THREE from '../../../../build/three.module.js';
import { Cacodemon } from './types/cacodemon.js';
import { CONFIG } from '../../core/config.js';
import { CACODEMON_CONFIG, CACODEMON_AREAS } from './config/cacodeemonConfig.js';
import { isPlayerInArea2 } from '../../systems/environment.js';

console.log('CacodemonManager loaded, checking imports...');
console.log('Cacodemon class:', Cacodemon);
console.log('CONFIG:', CONFIG);
console.log('CACODEMON_CONFIG:', CACODEMON_CONFIG);

export const cacodemons = [];

// Safety check: Ensure no more than 3 cacodemons are ever created
const MAX_CACODEMONS = 3;

// Override push method to enforce limit
const originalPush = cacodemons.push;
cacodemons.push = function(...args) {
  if (this.length >= MAX_CACODEMONS) {
    console.warn(`[CacodeemonManager] SAFETY BLOCK: Attempted to create cacodemon #${this.length + 1}, but maximum is ${MAX_CACODEMONS}`);
    return this.length;
  }
  return originalPush.apply(this, args);
};

// Debug functions for cacodemon management
if (typeof window !== 'undefined') {
  window.getCacodemons = () => cacodemons;
  window.debugCacodemons = () => {
    console.log('=== CACODEMON DEBUG INFO ===');
    console.log('Total Cacodemons:', cacodemons.length);
    cacodemons.forEach((cacodemon, index) => {
      console.log(`Cacodemon ${index + 1}:`, {
        position: cacodemon.mesh.position,
        spawnPosition: cacodemon.spawnPosition,
        aiState: cacodemon.aiState,
        isAlive: cacodemon.isAlive,
        health: cacodemon.currentHealth,
        maxHealth: cacodemon.maxHealth,
        activationDistance: cacodemon.activationDistance,
        optimalAttackDistance: cacodemon.optimalAttackDistance
      });
    });
  };
  
  // Add function to reset cacodemon positions
  window.resetCacodemons = () => {
    console.log('Resetting Cacodemon positions...');
    cacodemons.forEach((cacodemon, index) => {
      cacodemon.mesh.position.copy(cacodemon.spawnPosition);
      cacodemon.baseY = cacodemon.originalSpawnY;
      cacodemon.aiState = 'IDLE';
      cacodemon.stateChangeTime = 0;
      console.log(`Cacodemon ${index + 1} reset to spawn position:`, cacodemon.spawnPosition);
    });
  };
  
  // Function to fix cacodemon count if there are more than 3
  window.fixCacodeemonCount = (scene) => {
    console.log('=== FIXING CACODEMON COUNT ===');
    console.log('Current count:', cacodemons.length);
    
    if (cacodemons.length > 3) {
      console.log('Too many cacodemons detected, removing extras...');
      // Remove extra cacodemons (keep first 3)
      const extraCacodemons = cacodemons.splice(3);
      extraCacodemons.forEach((cacodemon, index) => {
        console.log(`Removing extra cacodemon ${index + 4}`);
        if (cacodemon.mesh.parent) {
          cacodemon.mesh.parent.remove(cacodemon.mesh);
        }
        if (cacodemon.dispose) {
          cacodemon.dispose();
        }
      });
      console.log(`Removed ${extraCacodemons.length} extra cacodemons`);
    }
    
    console.log('Final count:', cacodemons.length);
    console.log('=== FIX COMPLETE ===');
  };
}

// Debug function to check smooth movement
if (typeof window !== 'undefined') {
  window.testCacodeemonMovement = () => {
    console.log('=== CACODEMON MOVEMENT TEST ===');
    cacodemons.forEach((cacodemon, index) => {
      console.log(`Cacodemon ${index + 1}:`, {
        position: cacodemon.mesh.position,
        velocity: cacodemon.velocity,
        targetVelocity: cacodemon.targetVelocity,
        acceleration: cacodemon.acceleration,
        maxSpeed: cacodemon.maxSpeed,
        aiState: cacodemon.aiState,
        smoothing: cacodemon.smoothing
      });
    });
  };
}

export async function preloadCacodemons() {
  // TODO: Implement model preloading when model details are provided
  console.log('Preloading Cacodemon assets...');
  console.log('Cacodemon preload complete');
}

export async function createCacodemons(scene, area = 'area2') {
  console.log(`[CacodeemonManager] Creating Cacodemons for ${area}...`);
  console.log(`[CacodeemonManager] Current cacodemon count before creation: ${cacodemons.length}`);
  
  // Check if we already have cacodemons to prevent duplicates
  if (cacodemons.length > 0) {
    console.log(`[CacodeemonManager] Cacodemons already exist (${cacodemons.length}), skipping creation`);
    return;
  }
  
  await preloadCacodemons();
  
  // TODO: Configure positions based on specific area when details are provided
  const positions = getCacodeemonPositions(area);
  console.log(`[CacodeemonManager] Cacodemon spawn positions for ${area}:`, positions);
  
  // Ensure we only create exactly 3 Cacodemons maximum - STRICT LIMIT
  const maxCacodemons = 3;
  const positionsToUse = positions.slice(0, maxCacodemons);
  
  console.log(`[CacodeemonManager] Creating ${positionsToUse.length} Cacodemons (max: ${maxCacodemons})`);
  console.log(`[CacodeemonManager] STRICT CHECK: Will not create more than ${maxCacodemons} total cacodemons`);
  
  let createdCount = 0;
  positionsToUse.forEach(([x, y, z], index) => {
    // Double check to never exceed 3 cacodemons total
    if (cacodemons.length >= maxCacodemons) {
      console.warn(`[CacodeemonManager] SAFETY LIMIT: Already have ${cacodemons.length} cacodemons, stopping creation`);
      return;
    }
    
    console.log(`[CacodeemonManager] Creating Cacodemon ${index + 1} at position [${x}, ${y}, ${z}]`);
    try {
      const cacodemon = new Cacodemon([x, y, z]);
      cacodemons.push(cacodemon);
      scene.add(cacodemon.mesh);
      createdCount++;
      console.log(`[CacodeemonManager] Cacodemon ${index + 1} successfully added to scene`);
      console.log(`[CacodeemonManager] Mesh position:`, cacodemon.mesh.position);
      console.log(`[CacodeemonManager] Total cacodemons now: ${cacodemons.length}`);
    } catch (error) {
      console.error(`[CacodeemonManager] Error creating Cacodemon ${index + 1}:`, error);
    }
  });
  
  console.log(`[CacodeemonManager] FINAL RESULT: Created ${createdCount} new Cacodemons`);
  console.log(`[CacodeemonManager] FINAL COUNT: ${cacodemons.length} total Cacodemons in ${area}`);
  
  // Final safety check
  if (cacodemons.length > maxCacodemons) {
    console.error(`[CacodeemonManager] CRITICAL ERROR: Created ${cacodemons.length} cacodemons, exceeds maximum of ${maxCacodemons}!`);
  }
}

function getCacodeemonPositions(area) {
  console.log(`[CacodeemonManager] Getting Cacodemon positions for ${area}`);
  
  // Get positions from configuration
  if (CACODEMON_CONFIG.SPAWN_AREAS[area]) {
    const positions = CACODEMON_CONFIG.SPAWN_AREAS[area].positions;
    console.log(`[CacodeemonManager] Using config positions for ${area}:`, positions);
    return positions;
  }
  
  // Fallback to default positions
  const baseY = CONFIG.AREA_Y_POSITION + CONFIG.AREA_HEIGHT / 2 + 10.0;
  console.log(`[CacodeemonManager] Using fallback positions for ${area}, baseY: ${baseY}`);
  
  switch (area) {
    case 'area2':
      const positions = [
        [37.5, 34.0, -125.0],    // On top of bloco2 (updated position)
        [-30, 19.0, -125.0],     // On top of bloco4 (updated position)  
        [-30, 24.0, -145.0],     // On top of bloco6 (updated position)
      ];
      console.log(`[CacodeemonManager] Area2 fallback positions:`, positions);
      return positions;
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
    // TODO: Implement area-specific update logic when area functions are available
    // For now, update all cacodemons if they exist
    if (shouldUpdateCacodemon(camera, cacodemon)) {
      cacodemon.update(delta, camera, hitboxTop, collidableObjects);
    } else if (typeof cacodemon.idleBehavior === 'function') {
      cacodemon.idleBehavior(delta);
    }
  });
}

function shouldUpdateCacodemon(camera, cacodemon) {
  // Check if player is in Area 2 (main area for cacodemons)
  if (isPlayerInArea2(camera)) {
    return true;
  }
  
  // Also update if cacodemon is within reasonable distance for other areas
  const distance = camera.position.distanceTo(cacodemon.mesh.position);
  return distance < 80; // Slightly larger range than lost souls
}

export function cleanupDeadCacodemons(scene) {
  for (let i = cacodemons.length - 1; i >= 0; i--) {
    const cacodemon = cacodemons[i];
    
    // Remove cacodemons that have completed their death animation
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

// Projectile management for all cacodemons
export function updateCacodeemonProjectiles(delta, scene, collidableObjects = []) {
  cacodemons.forEach(cacodemon => {
    if (cacodemon.isAlive && cacodemon.activeProjectiles) {
      // TODO: Implement projectile collision and cleanup
      // This will be handled in the individual Cacodemon update for now
    }
  });
}

// Helper function to get all active projectiles from all cacodemons
export function getAllCacodeemonProjectiles() {
  const allProjectiles = [];
  cacodemons.forEach(cacodemon => {
    if (cacodemon.activeProjectiles) {
      allProjectiles.push(...cacodemon.activeProjectiles);
    }
  });
  return allProjectiles;
}

// Area-specific spawn functions (to be implemented when areas are defined)
export async function spawnCacodemonsInArea(scene, areaName, count = 1) {
  // TODO: Implement area-specific spawning logic
  console.log(`TODO: Spawn ${count} Cacodemons in ${areaName}`);
}

export function removeCacodemonsFromArea(scene, areaName) {
  // TODO: Implement area-specific removal logic
  console.log(`TODO: Remove Cacodemons from ${areaName}`);
}
