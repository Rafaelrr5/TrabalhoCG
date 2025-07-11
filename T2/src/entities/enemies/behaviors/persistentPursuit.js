import * as THREE from '../../../../../build/three.module.js';

export class PersistentPursuitBehavior {
  constructor(enemy, config = {}) {
    this.enemy = enemy;
    this.config = {
      baseAggressionLevel: config.baseAggressionLevel || 1.3,
      speedMultiplier: config.speedMultiplier || 1.5,
      attackRangeMultiplier: config.attackRangeMultiplier || 1.15,
      activationDistanceMultiplier: config.activationDistanceMultiplier || 1.2,
      persistentChaseSpeedMultiplier: config.persistentChaseSpeedMultiplier || 2.2,
      ...config
    };

    // Initialize pursuit state
    this.hasBeenActivated = false;
    this.aggressionLevel = 1.0;
    this.lastKnownPlayerPosition = new THREE.Vector3();
    this.timeWithoutPlayer = 0;
    this.maxTimeWithoutPlayer = config.maxTimeWithoutPlayer || 30.0; // 30 seconds max pursuit without player
  }

  /**
   * Check if the enemy should activate pursuit based on distance or other conditions
   */
  shouldActivate(playerPosition, activationDistance) {
    if (this.hasBeenActivated) return true;
    
    if (!playerPosition) return false;
    
    const distance = this.enemy.mesh.position.distanceTo(playerPosition);
    return distance <= activationDistance;
  }

  /**
   * Activate persistent pursuit mode
   */
  activate() {
    if (this.hasBeenActivated) return;
    
    this.hasBeenActivated = true;
    this.aggressionLevel = this.config.baseAggressionLevel;
    
    // Apply aggression bonuses to enemy stats
    this.applyAggressionBonuses();
    
    // Play sight sound if available
    if (this.enemy.playSightSound) {
      this.enemy.playSightSound();
    }
  }

  /**
   * Apply stat bonuses when enemy becomes aggressive
   */
  applyAggressionBonuses() {
    const enemy = this.enemy;
    
    // Speed bonuses
    if (enemy.maxSpeed) {
      enemy.maxSpeed = (enemy.config.moveSpeed || enemy.config.speed) * this.aggressionLevel;
    }
    if (enemy.config.speed) {
      enemy.config.speed *= this.aggressionLevel;
    }
    
    // Attack range bonus
    if (enemy.attackRange && enemy.config.attackRange) {
      enemy.attackRange = enemy.config.attackRange * this.config.attackRangeMultiplier;
    }
    
    // Activation distance bonus
    if (enemy.activationDistance && enemy.config.activationDistance) {
      enemy.activationDistance = enemy.config.activationDistance * this.config.activationDistanceMultiplier;
    }
  }

  /**
   * Update player position tracking
   */
  updatePlayerPosition(playerPosition, delta) {
    if (playerPosition) {
      this.lastKnownPlayerPosition.copy(playerPosition);
      this.timeWithoutPlayer = 0;
    } else if (this.hasBeenActivated) {
      this.timeWithoutPlayer += delta;
    }
  }

  /**
   * Get effective target position (current player or last known position)
   */
  getEffectiveTarget(currentPlayerPosition) {
    // Always prefer current player position if available
    if (currentPlayerPosition) {
      return currentPlayerPosition;
    }
    
    // If activated and we have a last known position within time limit
    if (this.hasBeenActivated && 
        this.timeWithoutPlayer < this.maxTimeWithoutPlayer &&
        this.lastKnownPlayerPosition.length() > 0) {
      return this.lastKnownPlayerPosition;
    }
    
    return null;
  }

  /**
   * Calculate speed multiplier based on distance and activation state
   */
  getSpeedMultiplier(distance) {
    if (!this.hasBeenActivated) return 1.0;
    
    let multiplier = this.aggressionLevel;
    
    // More aggressive distance-based speed scaling for persistent pursuit
    if (distance > 40.0) {
      multiplier *= this.config.persistentChaseSpeedMultiplier; // Very fast when very far
    } else if (distance > 20.0) {
      multiplier *= 2.2; // Much faster when far
    } else if (distance > 10.0) {
      multiplier *= 1.8; // Fast when medium distance
    } else if (distance > 5.0) {
      multiplier *= 1.5; // Still fast when close
    }
    
    return multiplier;
  }

  /**
   * Check if enemy should continue pursuing (activated state)
   */
  shouldPursue() {
    return this.hasBeenActivated;
  }

  /**
   * Reset pursuit state (for area resets)
   */
  reset() {
    this.hasBeenActivated = false;
    this.aggressionLevel = 1.0;
    this.lastKnownPlayerPosition.set(0, 0, 0);
    this.timeWithoutPlayer = 0;
    
    // Reset enemy stats to default values
    this.resetEnemyStats();
  }

  /**
   * Reset enemy stats to original config values
   */
  resetEnemyStats() {
    const enemy = this.enemy;
    
    // Reset speed
    if (enemy.maxSpeed && enemy.config.moveSpeed) {
      enemy.maxSpeed = enemy.config.moveSpeed;
    }
    if (enemy.config.speed) {
      // Reset to original config speed (assuming it was stored)
      // This might need to be handled differently based on enemy type
    }
    
    // Reset attack range
    if (enemy.attackRange && enemy.config.attackRange) {
      enemy.attackRange = enemy.config.attackRange;
    }
    
    // Reset activation distance
    if (enemy.activationDistance && enemy.config.activationDistance) {
      enemy.activationDistance = enemy.config.activationDistance;
    }
  }

  /**
   * Get debug information about pursuit state
   */
  getDebugInfo() {
    return {
      hasBeenActivated: this.hasBeenActivated,
      aggressionLevel: this.aggressionLevel,
      timeWithoutPlayer: this.timeWithoutPlayer,
      hasLastKnownPosition: this.lastKnownPlayerPosition.length() > 0,
      lastKnownPosition: {
        x: this.lastKnownPlayerPosition.x.toFixed(2),
        y: this.lastKnownPlayerPosition.y.toFixed(2),
        z: this.lastKnownPlayerPosition.z.toFixed(2)
      }
    };
  }
}

/**
 * Utility functions for managing persistent pursuit behavior across enemy types
 */
export class PersistentPursuitManager {
  /**
   * Create and attach pursuit behavior to an enemy
   */
  static attachPursuitBehavior(enemy, config = {}) {
    enemy.pursuitBehavior = new PersistentPursuitBehavior(enemy, config);
    return enemy.pursuitBehavior;
  }

  /**
   * Update pursuit behavior for an enemy
   */
  static updatePursuitBehavior(enemy, playerPosition, delta, activationDistance) {
    if (!enemy.pursuitBehavior) return false;
    
    const pursuit = enemy.pursuitBehavior;
    
    // Update player position tracking
    pursuit.updatePlayerPosition(playerPosition, delta);
    
    // Check for activation
    if (pursuit.shouldActivate(playerPosition, activationDistance)) {
      pursuit.activate();
    }
    
    return pursuit.shouldPursue();
  }

  /**
   * Get effective target for enemy movement
   */
  static getEffectiveTarget(enemy, currentPlayerPosition) {
    if (!enemy.pursuitBehavior) return currentPlayerPosition;
    return enemy.pursuitBehavior.getEffectiveTarget(currentPlayerPosition);
  }

  /**
   * Reset pursuit behavior for an enemy
   */
  static resetPursuitBehavior(enemy) {
    if (enemy.pursuitBehavior) {
      enemy.pursuitBehavior.reset();
    }
  }

  /**
   * Reset all enemies with pursuit behavior in a collection
   */
  static resetAllPursuitBehaviors(enemies) {
    enemies.forEach(enemy => {
      if (enemy && enemy.pursuitBehavior) {
        enemy.pursuitBehavior.reset();
      }
    });
  }

  /**
   * Get debug info for all enemies with pursuit behavior
   */
  static getDebugInfo(enemies) {
    const debugInfo = {};
    
    enemies.forEach((enemy, index) => {
      if (enemy && enemy.pursuitBehavior) {
        const enemyType = enemy.constructor.name;
        debugInfo[`${enemyType}_${index}`] = enemy.pursuitBehavior.getDebugInfo();
      }
    });
    
    return debugInfo;
  }
}
