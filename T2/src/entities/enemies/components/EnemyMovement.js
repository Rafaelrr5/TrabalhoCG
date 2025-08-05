import * as THREE from '../../../../../../build/three.module.js';
import { checkLostSoulCollision, applyLostSoulCollisionCorrection } from '../../../systems/collision.js';
import { CONFIG } from '../../../core/config.js';

export class EnemyMovement {
  constructor(enemy) {
    this.enemy = enemy;
    this._tempVector3 = new THREE.Vector3();
    this._lastUpdate = 0;
    this.updateInterval = 100; // ms entre atualizações pesadas
  }

  moveTowards(targetPosition, delta, options = {}) {
    const now = performance.now();
    if (now - this._lastUpdate < this.updateInterval && !options.forceUpdate) {
      return this.enemy.velocity.clone();
    }
    if (!this.enemy.isAlive) return;
    
    const {
      use6DOF = false,
      enableCollision = false,
      collidableObjects = [],
      speedMultiplier = 1.0
    } = options;
    
    // Calculate direction
    const direction = this._tempVector3
      .subVectors(targetPosition, this.enemy.mesh.position);
    
    if (!use6DOF) {
      direction.setY(0);
    }
    
    direction.normalize();
    
    this.enemy.velocity.copy(direction).multiplyScalar(this.enemy.config.speed * speedMultiplier);
    
    if (enableCollision && collidableObjects.length > 0) {
      this.handleCollision(targetPosition, collidableObjects, delta);
    }
    
    // Apply movement
    this.enemy.mesh.position.addScaledVector(this.enemy.velocity, delta);
    this._lastUpdate = now;
    
    return this.enemy.velocity.clone();
  }

  handleCollision(targetPosition, collidableObjects, delta) {
    const collision = this.enemy.collision.checkEnvironmentCollision(collidableObjects);
  
    if (collision.hasCollision) {
      const escapeDir = this.enemy.collision.getAvoidanceDirection(
        collidableObjects, 
        targetPosition
      );
    
      if (escapeDir) {
        this.enemy.velocity.copy(escapeDir).multiplyScalar(this.enemy.config.speed);
      } else {
        this.enemy.velocity.multiplyScalar(0.2); // Reduz velocidade se não houver saída
      }
    }
  }

  checkEnvironmentCollision(targetPosition, collidableObjects, delta) {
    if (!CONFIG.LOST_SOUL_ENABLE_COLLISION || !collidableObjects.length) return null;
    
    const currentPosition = this.enemy.mesh.position;
    const intendedPosition = currentPosition.clone().addScaledVector(this.enemy.velocity, delta);
    
    return checkLostSoulCollision(
      currentPosition,
      intendedPosition,
      collidableObjects,
      this.enemy.config.radius || CONFIG.LOST_SOUL_COLLISION_RADIUS
    );
  }

  applyCollisionCorrection(targetPosition, collidableObjects) {
    if (!CONFIG.LOST_SOUL_ENABLE_COLLISION || !collidableObjects.length) return false;
    
    const correction = applyLostSoulCollisionCorrection(this.enemy, collidableObjects, targetPosition);
    if (correction.corrected) {
      this.enemy.velocity.copy(correction.newDirection)
        .multiplyScalar(this.enemy.config.speed * (CONFIG.LOST_SOUL_WALL_AVOIDANCE || 1.0));
      return true;
    }
    return false;
  }

  // Convenience methods
  moveTowards6DOF(targetPosition, delta) {
    return this.moveTowards(targetPosition, delta, { use6DOF: true });
  }

  moveTowardsWithCollision(targetPosition, delta, collidableObjects = []) {
    return this.moveTowards(targetPosition, delta, { 
      enableCollision: true, 
      collidableObjects 
    });
  }

  orientToTarget(model, targetPosition, options = {}) {
    if (!model) return;
    
    const {
      useVelocity = false,
      smoothRotation = true,
      rotationSpeed = 5.0
    } = options;
    
    let direction;
    
    if (useVelocity && this.enemy.velocity.length() > 0.1) {
      direction = this.enemy.velocity.clone().normalize();
    } else {
      direction = this._tempVector3
        .subVectors(targetPosition, this.enemy.mesh.position)
        .normalize();
    }
    
    const targetQuaternion = new THREE.Quaternion();
    const lookAtMatrix = new THREE.Matrix4();
    const up = new THREE.Vector3(0, 1, 0);
    const currentPos = model.position.clone();
    const targetPos = currentPos.clone().add(direction);
    
    lookAtMatrix.lookAt(currentPos, targetPos, up);
    targetQuaternion.setFromRotationMatrix(lookAtMatrix);
    
    if (smoothRotation) {
      const speed = rotationSpeed * 0.016; // Assuming 60fps
      model.quaternion.slerp(targetQuaternion, Math.min(speed, 1.0));
    } else {
      model.quaternion.copy(targetQuaternion);
    }
  }

  dispose() {
    this._tempVector3 = null;
  }
}
