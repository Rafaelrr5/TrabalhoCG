import * as THREE from '../../../../../../build/three.module.js';

export class EnemyCollision {
  constructor(enemy) {
    this.enemy = enemy;
    this.boundingBox = new THREE.Box3();
    this.lastUpdate = 0;
    this.updateInterval = enemy.config.performance?.boundingBoxUpdateInterval || 100;
    this.enableThrottling = enemy.config.performance?.enableThrottling ?? true;
  }

  updateBoundingBox(force = false) {
    if (!this.enableThrottling || force) {
      this.boundingBox.setFromObject(this.enemy.mesh);
      return;
    }
    
    const now = performance.now();
    if (now - this.lastUpdate >= this.updateInterval) {
      this.boundingBox.setFromObject(this.enemy.mesh);
      this.lastUpdate = now;
    }
  }

  checkCollision(otherBoundingBox) {
    return this.boundingBox.intersectsBox(otherBoundingBox);
  }

  checkPlayerCollision(playerPosition, options = {}) {
    const {
      collisionRadius = this.enemy.config.collisionRadius || this.enemy.config.radius,
      radiusMultiplier = 1.0,
      damage = this.enemy.config.damage || 10
    } = options;
    
    const distanceToPlayer = this.enemy.mesh.position.distanceTo(playerPosition);
    const effectiveRadius = collisionRadius * radiusMultiplier;
    
    if (distanceToPlayer <= effectiveRadius) {
      this.dealDamageToPlayer(damage);
      return true;
    }
    
    return false;
  }

  dealDamageToPlayer(damage) {
    if (typeof window.playerTakeDamage === 'function') {
      window.playerTakeDamage(damage);
      console.log(`[${this.enemy.constructor.name}] Dealt ${damage} damage to player`);
    } else {
      console.warn(`[${this.enemy.constructor.name}] Player damage system not available!`);
    }
  }

  dispose() {
    this.boundingBox = null;
  }
}
