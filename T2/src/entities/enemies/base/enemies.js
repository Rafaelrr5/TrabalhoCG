import * as THREE from '../../../../../build/three.module.js';
import { CONFIG } from '../../../core/config.js';
import { SimpleEventEmitter } from '../components/SimpleEventEmitter.js';
import { EnemyAudio } from '../components/EnemyAudio.js';
import { EnemyHealthBar } from '../components/EnemyHealthBar.js';
import { EnemyMovement } from '../components/EnemyMovement.js';
import { EnemyCollision } from '../components/EnemyCollision.js';
import { EnemyDeathEffects } from '../components/EnemyDeathEffects.js';

export const DEFAULT_ENEMY_CONFIG = {
  radius: 0.5,
  color: 0xff0000,
  maxHealth: 100,
  speed: 0.5,
  damage: 10,
  destroyOnHit: false,
  collisionRadius: null, // will use radius if null
  
  // Audio settings
  audio: {
    enabled: true,
    volume: 1.0,
    distances: {
      activation: 10,
      nearby: 5
    }
  },
  
  // Health bar settings
  healthBar: {
    enabled: true,
    offset: 0.3,
    width: 1.0,
    height: {
      background: 0.1,
      fill: 0.08
    }
  },
  
  // Performance settings
  performance: {
    boundingBoxUpdateInterval: 100,
    enableThrottling: true
  }
};

/**
 * Merges user config with default config
 * @param {Object} userConfig - User provided configuration
 * @returns {Object} Merged configuration
 */
export function mergeEnemyConfig(userConfig = {}) {
  return {
    ...DEFAULT_ENEMY_CONFIG,
    ...userConfig,
    audio: { 
      ...DEFAULT_ENEMY_CONFIG.audio, 
      ...(userConfig.audio || {}),
      distances: {
        ...DEFAULT_ENEMY_CONFIG.audio.distances,
        ...(userConfig.audio?.distances || {})
      }
    },
    healthBar: { 
      ...DEFAULT_ENEMY_CONFIG.healthBar, 
      ...(userConfig.healthBar || {}),
      height: {
        ...DEFAULT_ENEMY_CONFIG.healthBar.height,
        ...(userConfig.healthBar?.height || {})
      }
    },
    performance: {
      ...DEFAULT_ENEMY_CONFIG.performance,
      ...(userConfig.performance || {})
    }
  };
}

export class Enemy extends SimpleEventEmitter {
  constructor(position = [0, 0, 0], config = {}) {
    super(); // Initialize EventEmitter
    
    // Merge user config with defaults
    this.config = mergeEnemyConfig(config);
    
    // Validate configuration
    this.validateConfig();

    // Basic properties
    this.id = this.generateId();
    this.mesh = new THREE.Group();
    this.mesh.position.set(position[0], position[1], position[2]);
    this.mesh.userData.enemy = this;
    this.maxHealth = this.config.maxHealth;
    this.currentHealth = this.maxHealth;
    this.isAlive = true;
    this.isDying = false;
    
    // Velocity for backward compatibility with custom enemy types
    this.velocity = new THREE.Vector3();
    
    // Components (Composition over inheritance)
    this.audio = new EnemyAudio(this);
    this.healthBar = new EnemyHealthBar(this);
    this.movement = new EnemyMovement(this);
    this.collision = new EnemyCollision(this);
    this.deathEffects = new EnemyDeathEffects(this);
    
    this.initialize();
  }

  /**
   * Validates the enemy configuration
   * @throws {Error} If configuration is invalid
   */
  validateConfig() {
    if (this.config.maxHealth <= 0) {
      throw new Error(`[ENEMY] Invalid maxHealth: ${this.config.maxHealth}. Must be > 0`);
    }
    
    if (this.config.speed < 0) {
      throw new Error(`[ENEMY] Invalid speed: ${this.config.speed}. Must be >= 0`);
    }
    
    if (this.config.radius <= 0) {
      throw new Error(`[ENEMY] Invalid radius: ${this.config.radius}. Must be > 0`);
    }
    
    // Set collision radius to radius if not specified
    if (this.config.collisionRadius === null) {
      this.config.collisionRadius = this.config.radius;
    }
  }

  initialize() {
    this.audio.initialize();
    this.healthBar.initialize();
    this.collision.updateBoundingBox();
  }

  generateId() {
    return `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Wrapper method for backward compatibility
  updateHealthBar() {
    this.healthBar.update();
  }

  // Audio wrappers for backward compatibility
  playAttackSound() {
    this.audio.playAttackSound();
  }

  playSightSound() {
    this.audio.playSightSound();
  }

  updateProximityAudio(playerPosition) {
    this.audio.updateProximity(playerPosition);
  }

  // Collision wrapper for backward compatibility
  updateBoundingBox() {
    this.collision.updateBoundingBox();
  }

  checkPlayerCollision(playerPosition, options = {}) {
    return this.collision.checkPlayerCollision(playerPosition, options);
  }

  checkEnvironmentCollision(collidableObjects, newPosition = null) {
    return this.collision.checkEnvironmentCollision(collidableObjects, newPosition);
  }

  getCollisionAvoidance(collidableObjects, targetPosition, lookaheadDistance = 2.0) {
    return this.collision.getAvoidanceDirection(collidableObjects, targetPosition, lookaheadDistance);
  }

  checkEnemyCollisions(otherEnemies, separationRadius = null) {
    return this.collision.checkEnemyCollisions(otherEnemies, separationRadius);
  }

  applySeparationForce(separationForce, delta, strength = 1.0) {
    return this.collision.applySeparationForce(separationForce, delta, strength);
  }

  canMoveTo(targetPosition, collidableObjects) {
    return this.collision.canMoveTo(targetPosition, collidableObjects);
  }

  getValidMovementDirection(targetPosition, collidableObjects) {
    return this.collision.getValidMovementDirection(targetPosition, collidableObjects);
  }

  correctPosition(collidableObjects, delta) {
    return this.collision.correctPosition(collidableObjects, delta);
  }

  preventOverlap(collidableObjects, delta) {
    return this.collision.preventOverlap(collidableObjects, delta);
  }

  takeDamage(damage) {
    if (!this.isAlive) return false;
    
    const validDamage = Math.max(0, Number(damage) || 0);
    if (validDamage === 0) return false;

    const previousHealth = this.currentHealth;
    this.currentHealth = Math.max(0, this.currentHealth - validDamage);
    
    this.healthBar.update();
    this.audio.playHitSound();
    
    // Emit damage event
    this.emit('damaged', {
      enemy: this,
      damage: validDamage,
      previousHealth,
      currentHealth: this.currentHealth,
      healthPercent: this.currentHealth / this.maxHealth
    });
    
    if (this.currentHealth <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  die() {
    this.isAlive = false;
    this.emit('death', {
      enemy: this,
      position: this.mesh.position.clone(),
      finalHealth: this.currentHealth
    });

    this.healthBar.hide();
    this.audio.playDeathSound();
    this.deathEffects.start();
    
    // Call onDeath hook for derived classes
    this.onDeath();
  }
  
  // Override this method in derived classes for custom death behavior
  onDeath() {
    // Base implementation - can be overridden
  }

  // Base collision check (can be overridden by specific enemies)
  checkPlayerCollision(playerPosition, options = {}) {
    const result = this.collision.checkPlayerCollision(playerPosition, options);
    
    if (result) {
      this.emit('playerCollision', {
        enemy: this,
        playerPosition: playerPosition.clone(),
        damage: options.damage || this.config.damage
      });
      
      this.audio.playAttackSound();
    }
    
    return result;
  }

  // Base update method (specific enemies should override this)
  update(delta, camera, targetPosition, collidableObjects = [], otherEnemies = []) {
    if (this.deathEffects.isDying) {
      this.deathEffects.update();
      return;
    }

    if (!this.isAlive) return;

    this.audio.updateProximity(camera?.position);
    this.healthBar.update(camera);
    this.collision.updateBoundingBox();
  }

  removeFromScene() {
    if (this.mesh?.parent) {
      this.mesh.parent.remove(this.mesh);
    }
    this.dispose();
  }

  dispose() {
    // Emit dispose event before cleanup
    this.emit('disposing', { enemy: this });

    // Dispose components
    this.audio.dispose();
    this.healthBar.dispose();
    this.movement.dispose();
    this.collision.dispose();
    this.deathEffects.dispose();
    
    // Clean up mesh
    if (this.mesh) {
      this.mesh.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach(material => {
              if (material.map) material.map.dispose();
              if (material.normalMap) material.normalMap.dispose();
              if (material.roughnessMap) material.roughnessMap.dispose();
              if (material.metalnessMap) material.metalnessMap.dispose();
              material.dispose();
            });
          }
        }
      });
    }
    
    // Clear references
    this.mesh = null;
    this.velocity = null;
    this.config = null;
    
    // Clear event listeners
    this.removeAllListeners();
  }
}

export class EnemyManager extends SimpleEventEmitter {
  constructor() {
    super(); // Initialize EventEmitter
    this.enemies = new Map(); // Use Map for better performance
    this.enemiesGroup = null;
    this.nextEnemyId = 1;
  }

  initialize(scene) {
    this.enemiesGroup = new THREE.Group();
    this.enemiesGroup.name = 'EnemiesGroup';
    scene.add(this.enemiesGroup);
  }

  generateEnemyId() {
    return `enemy_${this.nextEnemyId++}`;
  }

  addEnemy(enemy) {
    // Assign unique ID to enemy if it doesn't have one
    if (!enemy.id) {
      enemy.id = this.generateEnemyId();
    }
    
    // Listen to enemy events
    enemy.on('death', (eventData) => {
      this.emit('enemyDeath', eventData);
      // Auto-remove dead enemies after fade
      setTimeout(() => {
        this.removeEnemy(enemy.id);
      }, 3000); // Give time for death animation
    });

    enemy.on('damaged', (eventData) => {
      this.emit('enemyDamaged', eventData);
    });

    enemy.on('playerCollision', (eventData) => {
      this.emit('playerCollision', eventData);
    });

    enemy.on('playerSighted', (eventData) => {
      this.emit('playerSighted', eventData);
    });

    enemy.on('error', (eventData) => {
      this.emit('enemyError', eventData);
      console.error(`[ENEMY_MANAGER] Enemy ${enemy.id} error:`, eventData.error);
    });
    
    this.enemies.set(enemy.id, enemy);
    this.enemiesGroup.add(enemy.mesh);
    
    // Emit enemy added event
    this.emit('enemyAdded', { enemy, id: enemy.id });
    
    console.log(`[ENEMY_MANAGER] Added enemy ${enemy.id} (${enemy.constructor.name})`);
    return enemy;
  }

  removeEnemy(enemyId) {
    const enemy = this.enemies.get(enemyId);
    if (!enemy) return false;
    
    // Emit enemy removed event
    this.emit('enemyRemoved', { enemy, id: enemyId });
    
    this.enemiesGroup.remove(enemy.mesh);
    enemy.dispose();
    this.enemies.delete(enemyId);
    
    console.log(`[ENEMY_MANAGER] Removed enemy ${enemyId}`);
    return true;
  }

  getEnemy(enemyId) {
    return this.enemies.get(enemyId);
  }

  hasEnemy(enemyId) {
    return this.enemies.has(enemyId);
  }

  update(delta, camera, targetPosition) {
    const deadEnemies = [];
    
    // Update all enemies and collect dead ones
    this.enemies.forEach((enemy, enemyId) => {
      if (enemy.isAlive) {
        try {
          enemy.update(delta, camera, targetPosition);
        } catch (error) {
          console.error(`[ENEMY_MANAGER] Update error for enemy ${enemyId}:`, error);
          // Mark as dead if update fails
          enemy.isAlive = false;
          deadEnemies.push(enemyId);
        }
      } else {
        deadEnemies.push(enemyId);
      }
    });
    
    // Remove dead enemies
    deadEnemies.forEach(enemyId => {
      this.removeEnemy(enemyId);
    });
  }

  getAliveEnemies() {
    const aliveEnemies = [];
    this.enemies.forEach(enemy => {
      if (enemy.isAlive) {
        aliveEnemies.push(enemy);
      }
    });
    return aliveEnemies;
  }

  getEnemiesByType(enemyType) {
    const typeEnemies = [];
    this.enemies.forEach(enemy => {
      if (enemy.constructor.name === enemyType) {
        typeEnemies.push(enemy);
      }
    });
    return typeEnemies;
  }

  getEnemiesInRadius(position, radius) {
    const nearbyEnemies = [];
    this.enemies.forEach(enemy => {
      if (enemy.isAlive && enemy.mesh.position.distanceTo(position) <= radius) {
        nearbyEnemies.push(enemy);
      }
    });
    return nearbyEnemies;
  }

  getEnemyCount() {
    let alive = 0;
    let total = this.enemies.size;
    
    this.enemies.forEach(enemy => {
      if (enemy.isAlive) alive++;
    });
    
    return { total, alive, dead: total - alive };
  }

  clear() {
    this.enemies.forEach(enemy => {
      this.enemiesGroup.remove(enemy.mesh);
      enemy.dispose();
    });
    this.enemies.clear();
  }

  dispose() {
    this.clear();
    
    if (this.enemiesGroup && this.enemiesGroup.parent) {
      this.enemiesGroup.parent.remove(this.enemiesGroup);
    }
    
    this.enemiesGroup = null;
    
    // Clear all event listeners
    this.removeAllListeners();
  }
}
