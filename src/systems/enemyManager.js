// Example usage of the Enemy class system
import { Enemy, initEnemies, updateEnemies, addEnemy, getAliveEnemies } from '../entities/enemies/base/enemies.js';
import { LostSoul } from '../entities/enemies/types/lostSoul.js';

// Example of how to create different types of enemies

// Function to spawn a mix of regular enemies and lost souls
export function spawnMixedEnemies(scene) {
  // Initialize the basic enemy system
  initEnemies(scene);

  // Add some Lost Souls
  const lostSoulPositions = [
    [15, 0, 5],
    [-15, 0, -5],
    [5, 0, -15]
  ];

  lostSoulPositions.forEach(pos => {
    const lostSoul = addEnemy(pos, {
      radius: 0.6,
      color: 0x8B0000,
      maxHealth: 150,
      speed: 0.7
    });
    
    // Replace the regular enemy with a LostSoul instance
    if (lostSoul) {
      // Remove the regular enemy
      const enemiesGroup = scene.getObjectByName('EnemiesGroup');
      enemiesGroup.remove(lostSoul.mesh);
      
      // Create and add Lost Soul
      const newLostSoul = new LostSoul(pos);
      enemiesGroup.add(newLostSoul.mesh);
      
      // You might want to add the LostSoul to your enemies array
      // This would require modifying the enemies.js to allow custom enemy types
    }
  });
}

// Example of collision detection with player
export function checkEnemyCollisions(playerBoundingBox) {
  const aliveEnemies = getAliveEnemies();
  const collidingEnemies = [];

  aliveEnemies.forEach(enemy => {
    if (enemy.checkCollision(playerBoundingBox)) {
      collidingEnemies.push(enemy);
    }
  });

  return collidingEnemies;
}

// Example of dealing damage to enemies
export function damageEnemiesInArea(centerPosition, radius, damage) {
  const aliveEnemies = getAliveEnemies();
  const damagedEnemies = [];

  aliveEnemies.forEach(enemy => {
    const distance = enemy.mesh.position.distanceTo(centerPosition);
    if (distance <= radius) {
      const died = enemy.takeDamage(damage);
      damagedEnemies.push({ enemy, died });
    }
  });

  return damagedEnemies;
}
