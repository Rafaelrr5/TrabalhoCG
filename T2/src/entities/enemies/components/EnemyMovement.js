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
    const {
      use6DOF = false,
      enableCollision = false,
      collidableObjects = [],
      speedMultiplier = 1.0
    } = options;

    if (!this.enemy.isAlive) return;

    // Delega a detecção de colisão totalmente para EnemyCollision
    if (enableCollision && collidableObjects.length > 0) {
      const avoidance = this.enemy.collision.getAvoidanceDirection(
        collidableObjects, 
        targetPosition,
        2.0 // lookaheadDistance
      );
      
      if (avoidance) {
        targetPosition = this.enemy.mesh.position.clone()
          .addScaledVector(avoidance, 2.0);
      }
    }

    // Cálculo de direção
    const direction = this._tempVector3
      .subVectors(targetPosition, this.enemy.mesh.position);

    if (!use6DOF) direction.setY(0);
    direction.normalize();

    // Aplica movimento
    this.enemy.velocity.copy(direction)
      .multiplyScalar(this.enemy.config.speed * speedMultiplier);
    
    this.enemy.mesh.position.addScaledVector(this.enemy.velocity, delta);
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
