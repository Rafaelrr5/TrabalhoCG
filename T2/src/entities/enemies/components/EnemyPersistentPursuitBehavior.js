import * as THREE from '../../../../../build/three.module.js';

export class EnemyPersistentPursuitBehavior {
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

    this.hasBeenActivated = false;
    this.aggressionLevel = 1.0;
    this.lastKnownPlayerPosition = new THREE.Vector3();
    this.timeWithoutPlayer = 0;
    this.maxTimeWithoutPlayer = config.maxTimeWithoutPlayer || 30.0;
  }

  shouldActivate(playerPosition, activationDistance) {
    if (this.hasBeenActivated) return true;
    
    if (!playerPosition) return false;
    
    const distance = this.enemy.mesh.position.distanceTo(playerPosition);
    return distance <= activationDistance;
  }

  activate() {
    if (this.hasBeenActivated) return;
    
    this.hasBeenActivated = true;
    this.aggressionLevel = this.config.baseAggressionLevel;
    
    this.applyAggressionBonuses();
    
    if (this.enemy.playSightSound) {
      this.enemy.playSightSound();
    }
  }

  applyAggressionBonuses() {
    const enemy = this.enemy;
    
    if (enemy.maxSpeed) {
      enemy.maxSpeed = (enemy.config.moveSpeed || enemy.config.speed) * this.aggressionLevel;
    }
    if (enemy.config.speed) {
      enemy.config.speed *= this.aggressionLevel;
    }
    
    if (enemy.attackRange && enemy.config.attackRange) {
      enemy.attackRange = enemy.config.attackRange * this.config.attackRangeMultiplier;
    }
    
    if (enemy.activationDistance && enemy.config.activationDistance) {
      enemy.activationDistance = enemy.config.activationDistance * this.config.activationDistanceMultiplier;
    }
  }

  updatePlayerPosition(playerPosition, delta) {
    if (playerPosition) {
      this.lastKnownPlayerPosition.copy(playerPosition);
      this.timeWithoutPlayer = 0;
    } else if (this.hasBeenActivated) {
      this.timeWithoutPlayer += delta;
    }
  }

  getEffectiveTarget(currentPlayerPosition) {
   if (currentPlayerPosition) {
      return currentPlayerPosition.clone();
    }
  
    if (this.hasBeenActivated && 
        this.timeWithoutPlayer < this.maxTimeWithoutPlayer &&
        this.lastKnownPlayerPosition.length() > 0) {
      const target = this.lastKnownPlayerPosition.clone();
      target.y = this.enemy.mesh.position.y;
      return target;
    }
  
    return null;
  }

  getSpeedMultiplier(distance) {
    if (!this.hasBeenActivated) return 1.0;
    
    let multiplier = this.aggressionLevel;
    
    if (distance > 40.0) {
      multiplier *= this.config.persistentChaseSpeedMultiplier;
    } else if (distance > 20.0) {
      multiplier *= 2.2;
    } else if (distance > 10.0) {
      multiplier *= 1.8;
    } else if (distance > 5.0) {
      multiplier *= 1.5;
    }
    
    return multiplier;
  }

  shouldPursue() {
    return this.hasBeenActivated;
  }

  reset() {
    this.hasBeenActivated = false;
    this.aggressionLevel = 1.0;
    this.lastKnownPlayerPosition.set(0, 0, 0);
    this.timeWithoutPlayer = 0;
    
    this.resetEnemyStats();
  }

  resetEnemyStats() {
    const enemy = this.enemy;
    
    if (enemy.maxSpeed && enemy.config.moveSpeed) {
      enemy.maxSpeed = enemy.config.moveSpeed;
    }
    if (enemy.config.speed) {
    }
    
    if (enemy.attackRange && enemy.config.attackRange) {
      enemy.attackRange = enemy.config.attackRange;
    }
    
    if (enemy.activationDistance && enemy.config.activationDistance) {
      enemy.activationDistance = enemy.config.activationDistance;
    }
  }

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

export class EnemyPersistentPursuitManager {
  static attachPursuitBehavior(enemy, config = {}) {
    enemy.pursuitBehavior = new EnemyPersistentPursuitBehavior(enemy, config);
    return enemy.pursuitBehavior;
  }

  static updatePursuitBehavior(enemy, playerPosition, delta, activationDistance) {
    if (!enemy.pursuitBehavior) return false;
    
    const pursuit = enemy.pursuitBehavior;
    
    pursuit.updatePlayerPosition(playerPosition, delta);
    
    if (pursuit.shouldActivate(playerPosition, activationDistance)) {
      pursuit.activate();
    }
    
    return pursuit.shouldPursue();
  }

  static getEffectiveTarget(enemy, currentPlayerPosition) {
    if (!enemy.pursuitBehavior) return currentPlayerPosition;
    return enemy.pursuitBehavior.getEffectiveTarget(currentPlayerPosition);
  }

  static resetPursuitBehavior(enemy) {
    if (enemy.pursuitBehavior) {
      enemy.pursuitBehavior.reset();
    }
  }

  static resetAllPursuitBehaviors(enemies) {
    enemies.forEach(enemy => {
      if (enemy && enemy.pursuitBehavior) {
        enemy.pursuitBehavior.reset();
      }
    });
  }

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
