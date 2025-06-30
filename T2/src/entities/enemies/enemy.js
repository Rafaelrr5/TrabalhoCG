// ============================================================================
// Enemy implementation for Lost Soul-like behavior in Area 1
// ============================================================================
import { LostSoul } from './types/lostSoul.js';
import { preloadSkullModel } from '../../utils/skullLoader.js';
import { CONFIG } from '../../core/config.js';
import { isPlayerInArea1 } from '../../systems/environment.js';

// Manager for Lost Soul enemies in Area 1
export const enemies = [];

// Preload assets before spawning enemies
export async function preloadEnemies() {
  await preloadSkullModel();
}

// Create Lost Soul enemies at predefined positions
export async function createEnemies(scene) {
  await preloadEnemies();
  const y = CONFIG.AREA_Y_POSITION + CONFIG.AREA_HEIGHT / 2 + 1.0;
  const positions = [
    [-170, y, -140],
    [-160, y, -130],
    [-150, y, -135],
    [-155, y, -120],
    [-140, y, -145]
  ];
  positions.forEach(([x, py, z]) => {
    const enemy = new LostSoul([x, py, z]);
    enemies.push(enemy);
    scene.add(enemy.mesh);
  });
}

// Update all enemies; fade out dead ones
export function updateEnemies(delta, scene, camera) {
  // Update all enemies; they handle idle vs chase internally
  enemies.forEach(enemy => {
    if (isPlayerInArea1(camera)) {
      // Active behavior: chase with dashes
      enemy.update(delta, camera);
    } else if (typeof enemy.idleBehavior === 'function') {
      // Idle floating outside area
      enemy.idleBehavior(delta);
    }
  });
}

// Remove fully dead enemies from scene and memory
export function cleanupDeadEnemies(scene) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (!e.isAlive && e.mesh.visible === false) {
      scene.remove(e.mesh);
      e.dispose();
      enemies.splice(i, 1);
    }
  }
}

// Check if all Lost Souls are defeated
export function areAllEnemiesDefeated() {
  return enemies.length > 0 && enemies.every(e => !e.isAlive);
}

// Utility: get alive enemies
export function getAliveEnemies() {
  return enemies.filter(e => e.isAlive);
}

// Utility: spawn a new Lost Soul
export function addEnemy(scene, position) {
  const enemy = new LostSoul(position);
  enemies.push(enemy);
  scene.add(enemy.mesh);
  return enemy;
}

// Utility: damage enemies within radius
export function damageEnemiesInArea(center, radius, damage) {
  const result = [];
  enemies.forEach(e => {
    if (e.isAlive && e.mesh.position.distanceTo(center) <= radius) {
      const died = e.takeDamage(damage);
      result.push({ enemy: e, died });
    }
  });
  return result;
}

// Utility: collision detection
export function checkEnemyCollisions(box) {
  return enemies.filter(e => e.isAlive && e.checkCollision(box));
}

// Debug: log status
export function logEnemyStatus() {
  console.log('Enemies:', enemies.length, 'alive:', getAliveEnemies().length);
  enemies.forEach((e, i) => console.log(i, e.isAlive ? 'ALIVE' : 'DEAD', `HP:${e.currentHealth}/${e.maxHealth}`));
}

// Utility: count enemies
export function getEnemyCount() {
  const alive = getAliveEnemies().length;
  return { total: enemies.length, alive, dead: enemies.length - alive };
}
