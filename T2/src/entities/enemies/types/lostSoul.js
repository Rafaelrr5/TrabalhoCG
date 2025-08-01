import * as THREE from '../../../../../build/three.module.js';
import { Enemy } from '../base/enemies.js';
import { loadSkullModel, preloadSkullModel } from '../../../utils/skullLoader.js';
import { CONFIG } from '../../../core/config.js';
import { applyLostSoulCollisionCorrection, checkLostSoulInterCollision } from '../../../systems/collision.js';
import { ExplosionEffects } from '../utils/explosionEffects.js';
import { IdleBehaviors } from '../utils/idleBehaviors.js';
import { PersistentPursuitManager } from '../behaviors/persistentPursuit.js';
import { getLostSouls } from '../enemy.js';
import { getLostSoulConfig } from '../config/enemyConfig.js';

export class LostSoul extends Enemy {
  constructor(position = [0, 0, 0], config = {}) {
    // Use the centralized enemy config as base
    const baseConfig = getLostSoulConfig();
    const defaultConfig = {
      ...baseConfig,
      ...config // Allow override with custom config
    };

    super(position, defaultConfig);
    
    this.initializeLostSoul();
    this.loadSkull();
  }

  initializeLostSoul() {
    this.dashSpeed = this.config.dashSpeed;
    this.dashInterval = this.config.dashInterval;
    this.dashDuration = this.config.dashDuration;
    this.timeSinceLastDash = 0;
    this.isDashing = false;
    this.dashDirection = new THREE.Vector3();
    this.dashCooldown = 0;
    
    this.movementState = {
      isNearPlayer: false,
      lastPlayerDistance: Infinity,
      targetDirection: new THREE.Vector3(),
      smoothedVelocity: new THREE.Vector3(),
      collisionAvoidanceForce: new THREE.Vector3(),
      lastCollisionTime: 0,
      // Lost Soul inter-collision state
      separationForce: new THREE.Vector3(),
      lastInterCollisionCheck: 0,
      interCollisionCheckInterval: 100
    };
    
    this.lastCollisionCheck = 0;
    this.collisionCheckInterval = 1000 / 30;
    this.lastPosition = new THREE.Vector3();
    this.stuckTimer = 0;
    this.stuckThreshold = 2000;
    
    this.skullModel = null;
    
    this.pursuitBehavior = PersistentPursuitManager.attachPursuitBehavior(this, {
      baseAggressionLevel: 1.3,
      speedMultiplier: 1.5,
      attackRangeMultiplier: 1.0,
      activationDistanceMultiplier: 1.0,
      persistentChaseSpeedMultiplier: 2.5,
      maxTimeWithoutPlayer: 45.0
    });
    
    this.hasBeenActivated = false;
    this.aggressionLevel = 1.0;
    this.lastKnownPlayerPosition = new THREE.Vector3();
  }

  async loadSkull() {
    try {
      await preloadSkullModel();
      const loadedModel = await loadSkullModel()
      const skullWrapper = new THREE.Group();
      
      const clonedModel = loadedModel.clone();
      clonedModel.traverse(child => {
        if (child.isMesh) {
          child.userData.enemy = this;
          if (child.material) {
            child.material = Array.isArray(child.material) 
              ? child.material.map(mat => mat.clone())
              : child.material.clone();
          }
        }
      });
      
      const box = new THREE.Box3().setFromObject(clonedModel);
      const center = box.getCenter(new THREE.Vector3());
      
      clonedModel.position.sub(center);
      
      skullWrapper.add(clonedModel);
      
      // Não aplicar rotação inicial - será aplicada dinamicamente no orientSkull
      // skullWrapper.rotation.set(
      //   this.config.skullXRotationOffset,
      //   this.config.skullYRotationOffset,
      //   this.config.skullZRotationOffset
      // );
      
      skullWrapper.scale.setScalar(this.config.skullScale);
      
      skullWrapper.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      
      this.setupSkullModel(skullWrapper);
    } catch (error) {
      console.warn('Failed to load Lost Soul skull model:', error);
    }
  }

  setupSkullModel(model) {
    if (!this.mesh || !this.mesh.parent) return;
    
    const parent = this.mesh.parent;
    const oldPosition = this.mesh.position.clone();
    const oldRotation = this.mesh.rotation.clone();
    
    parent.remove(this.mesh);
    
    const group = new THREE.Group();
    group.position.copy(oldPosition);
    group.rotation.copy(oldRotation);
    
    group.add(model);
    
    this.skullModel = model;
    
    if (this.healthBarGroup) group.add(this.healthBarGroup);
    
    this.mesh = group;
    this.mesh.userData.enemy = this;
    this.mesh.visible = true;
    
    parent.add(this.mesh);
    this.updateBoundingBox();
  }

  updateMovementState(targetPosition, delta) {
    const currentDistance = this.mesh.position.distanceTo(targetPosition);
    const state = this.movementState;
    
    state.lastPlayerDistance = currentDistance;
    // When player is immortal, don't consider being "near" the player to allow dash-through behavior
    const nearPlayerThreshold = CONFIG.PLAYER_IMMORTAL ? 0.5 : (this.config.collisionRadius + 2.0);
    state.isNearPlayer = currentDistance <= nearPlayerThreshold;
    
    const rawDirection = new THREE.Vector3()
      .subVectors(targetPosition, this.mesh.position)
      .normalize();
    
    const smoothingFactor = Math.min(delta * 8.0, 1.0);
    state.targetDirection.lerp(rawDirection, smoothingFactor);
    
    const positionChange = this.mesh.position.distanceTo(this.lastPosition);
    if (positionChange < 0.1) {
      this.stuckTimer += delta * 1000;
    } else {
      this.stuckTimer = 0;
    }
    this.lastPosition.copy(this.mesh.position);
  }

  calculateOptimalSpeed(distance) {
    let speedMultiplier = 1.0;
    
    if (distance > 50.0) {
      speedMultiplier = 2.5;
    } else if (distance > 20.0) {
      speedMultiplier = 1.8;
    } else if (distance > 10.0) {
      speedMultiplier = 1.4;
    } else if (distance > 5.0) {
      speedMultiplier = 1.0;
    } else if (distance > 2.0) {
      speedMultiplier = 0.8;
    } else {
      speedMultiplier = 1.5;
    }
    
    if (this.pursuitBehavior.hasBeenActivated) {
      const pursuitSpeedMultiplier = this.pursuitBehavior.getSpeedMultiplier(distance);
      speedMultiplier *= pursuitSpeedMultiplier;
    }
    
    if (this.stuckTimer > 1000) {
      speedMultiplier *= 0.5;
    }
    
    return this.config.speed * speedMultiplier;
  }

  performCollisionCheck(targetPosition, collidableObjects, delta) {
    const currentTime = Date.now();
    const state = this.movementState;
    
    if (currentTime - this.lastCollisionCheck < this.collisionCheckInterval) {
      return false;
    }
    this.lastCollisionCheck = currentTime;
    
    if (state.isNearPlayer) {
      state.collisionAvoidanceForce.set(0, 0, 0);
      return false;
    }
    
    if (!CONFIG.LOST_SOUL_ENABLE_COLLISION || !collidableObjects.length) {
      state.collisionAvoidanceForce.set(0, 0, 0);
      return false;
    }
    
    const collisionResult = applyLostSoulCollisionCorrection(
      this, 
      collidableObjects, 
      targetPosition
    );
    
    if (collisionResult.corrected) {
      state.lastCollisionTime = currentTime;
      
      if (collisionResult.newDirection) {
        const avoidanceStrength = Math.min(1.0, (currentTime - state.lastCollisionTime) / 500);
        state.collisionAvoidanceForce.lerp(collisionResult.newDirection, avoidanceStrength);
      }
      
      return true;
    }
    
    state.collisionAvoidanceForce.multiplyScalar(0.9);
    return false;
  }

  checkLostSoulInterCollision(delta) {
    const currentTime = Date.now();
    const state = this.movementState;
    
    // Throttle inter-collision checks for performance
    if (currentTime - state.lastInterCollisionCheck < state.interCollisionCheckInterval) {
      return false;
    }
    state.lastInterCollisionCheck = currentTime;
    
    if (!CONFIG.LOST_SOUL_INTER_COLLISION) {
      state.separationForce.set(0, 0, 0);
      return false;
    }
    
    // Get other alive Lost Souls
    const otherLostSouls = getLostSouls().filter(ls => ls !== this && ls.isAlive);
    
    if (otherLostSouls.length === 0) {
      state.separationForce.set(0, 0, 0);
      return false;
    }
    
    const collisionResult = checkLostSoulInterCollision(this, otherLostSouls);
    
    if (collisionResult.hasCollision) {
      // Apply separation force with smoothing
      const smoothingFactor = Math.min(delta * 3.0, 1.0);
      state.separationForce.lerp(collisionResult.separationForce, smoothingFactor);
      return true;
    } else {
      // Gradually reduce separation force when no collision
      state.separationForce.multiplyScalar(0.9);
      return false;
    }
  }

  calculateFinalMovement(targetPosition, delta) {
    const state = this.movementState;
    const distance = state.lastPlayerDistance;
    const speed = this.calculateOptimalSpeed(distance);
    
    let finalDirection = state.targetDirection.clone();
    
    // Apply environmental collision avoidance
    if (state.collisionAvoidanceForce.length() > 0.1) {
      const avoidanceWeight = Math.min(0.7, state.collisionAvoidanceForce.length());
      const targetWeight = 1.0 - avoidanceWeight;
      
      finalDirection.multiplyScalar(targetWeight)
        .addScaledVector(state.collisionAvoidanceForce, avoidanceWeight)
        .normalize();
    }
    
    // Apply Lost Soul separation force (reduced when very close to player)
    if (state.separationForce.length() > 0.1) {
      // Reduce separation force when very close to player to allow final approach
      const playerDistanceFactor = Math.min(1.0, distance / 5.0);
      const separationWeight = Math.min(0.4, state.separationForce.length()) * playerDistanceFactor;
      finalDirection.addScaledVector(state.separationForce, separationWeight).normalize();
    }
    
    if (this.stuckTimer > this.stuckThreshold) {
      const randomDirection = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 2
      ).normalize();
      
      finalDirection.lerp(randomDirection, 0.3);
    }
    
    const targetVelocity = finalDirection.multiplyScalar(speed);
    const velocitySmoothing = Math.min(delta * 6.0, 1.0);
    
    state.smoothedVelocity.lerp(targetVelocity, velocitySmoothing);
    this.velocity.copy(state.smoothedVelocity);
    
    return state.smoothedVelocity.clone();
  }

  orientSkull(targetPosition) {
    if (!this.skullModel) return;
    
    // Calcular direção para o target
    let direction;
    
    if (this.config.skullOrientToMovement && this.velocity && this.velocity.length() > 0.1) {
      direction = this.velocity.clone().normalize();
    } else {
      direction = new THREE.Vector3()
        .subVectors(targetPosition, this.mesh.position)
        .normalize();
    }
    
    // Criar quaternion base para olhar na direção do target
    const targetQuaternion = new THREE.Quaternion();
    const lookAtMatrix = new THREE.Matrix4();
    const up = new THREE.Vector3(0, 1, 0);
    const currentPos = this.skullModel.position.clone();
    const targetPos = currentPos.clone().add(direction);
    
    lookAtMatrix.lookAt(currentPos, targetPos, up);
    targetQuaternion.setFromRotationMatrix(lookAtMatrix);
    
    // Aplicar os offsets de rotação
    this.applySkullRotationOffsets(targetQuaternion);
    
    // Aplicar rotação suave ou direta
    if (this.config.skullSmoothRotation) {
      const speed = (this.config.skullRotationSpeed || 5.0) * 0.016; // Assuming 60fps
      this.skullModel.quaternion.slerp(targetQuaternion, Math.min(speed, 1.0));
    } else {
      this.skullModel.quaternion.copy(targetQuaternion);
    }
  }

  applySkullRotationOffsets(quaternion) {
    const rotationOffsets = [
      { axis: new THREE.Vector3(0, 1, 0), angle: this.config.skullYRotationOffset },
      { axis: new THREE.Vector3(1, 0, 0), angle: this.config.skullXRotationOffset },
      { axis: new THREE.Vector3(0, 0, 1), angle: this.config.skullZRotationOffset }
    ];
    
    rotationOffsets.forEach(({ axis, angle }) => {
      if (angle !== 0) {
        const adjustment = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        quaternion.multiplyQuaternions(quaternion, adjustment);
      }
    });
  }

  updateDash(delta, targetPosition, collidableObjects = []) {
    this.timeSinceLastDash += delta;
    this.dashCooldown = Math.max(0, this.dashCooldown - delta);
    
    const distanceToTarget = this.mesh.position.distanceTo(targetPosition);
    const DASH_MIN_DISTANCE = 3.0;
    const DASH_MAX_DISTANCE = 15.0;
    
    const canStartDash = !this.isDashing && 
                        this.dashCooldown <= 0 &&
                        this.timeSinceLastDash >= this.config.dashInterval &&
                        distanceToTarget >= DASH_MIN_DISTANCE && 
                        distanceToTarget <= DASH_MAX_DISTANCE &&
                        !this.movementState.isNearPlayer;
    
    if (canStartDash) {
      this.audio.playAttackSound();
      
      this.isDashing = true;
      this.timeSinceLastDash = 0;
      this.dashCooldown = this.config.dashInterval * 0.5;
      
      const playerVelocity = new THREE.Vector3();
      const predictedPlayerPos = targetPosition.clone().add(playerVelocity.multiplyScalar(0.5));
      this.dashDirection.subVectors(predictedPlayerPos, this.mesh.position).normalize();
    }
    
    const shouldEndDash = this.isDashing && 
                         (this.timeSinceLastDash >= this.config.dashDuration || 
                          distanceToTarget <= 1.0);
    
    if (shouldEndDash) {
      this.isDashing = false;
      this.timeSinceLastDash = 0;
      this.dashCooldown = this.config.dashInterval * 0.3;
    }
  }

  executeMovement(targetPosition, delta, collidableObjects = []) {
    if (!this.isAlive) return;
    
    this.updateMovementState(targetPosition, delta);
    
    if (this.isDashing) {
      return this.executeDashMovement(targetPosition, delta, collidableObjects);
    }
    
    return this.executeNormalMovement(targetPosition, delta, collidableObjects);
  }
  
  executeDashMovement(targetPosition, delta, collidableObjects = []) {
    const dashVelocity = this.dashDirection.clone().multiplyScalar(this.dashSpeed);
    const newPosition = this.mesh.position.clone().addScaledVector(dashVelocity, delta);
    
    // Check for Lost Soul inter-collision during dash (with reduced impact)
    this.checkLostSoulInterCollision(delta);
    
    // Apply reduced separation force during dash to prevent overlap but maintain dash aggression
    const state = this.movementState;
    if (state.separationForce.length() > 0.1) {
      const dashSeparationWeight = 0.2; // Reduced weight during dash
      const separationVelocity = state.separationForce.clone().multiplyScalar(this.config.speed * dashSeparationWeight);
      newPosition.addScaledVector(separationVelocity, delta);
    }
    
    if (CONFIG.LOST_SOUL_ENABLE_COLLISION && collidableObjects.length > 0) {
      const collisionResult = applyLostSoulCollisionCorrection(
        { mesh: { position: newPosition }, config: this.config }, 
        collidableObjects, 
        targetPosition
      );
      
      if (collisionResult.corrected) {
        this.isDashing = false;
        this.dashCooldown = this.config.dashInterval * 0.5;
        
        let correctedVelocity = new THREE.Vector3();
        if (collisionResult.newDirection) {
          this.dashDirection.copy(collisionResult.newDirection);
          correctedVelocity = collisionResult.newDirection.multiplyScalar(this.config.speed);
          this.mesh.position.addScaledVector(correctedVelocity, delta);
        }
        return correctedVelocity;
      }
    }
    
    this.mesh.position.copy(newPosition);
    this.velocity.copy(dashVelocity);
    
    return dashVelocity;
  }
  
  executeNormalMovement(targetPosition, delta, collidableObjects = []) {
    this.performCollisionCheck(targetPosition, collidableObjects, delta);
    this.checkLostSoulInterCollision(delta);
    
    const finalVelocity = this.calculateFinalMovement(targetPosition, delta);
    
    this.mesh.position.addScaledVector(finalVelocity, delta);
    
    return finalVelocity;
  }

  idleBehavior(delta) {
    IdleBehaviors.combinedIdleBehavior(this, delta, {
      movement: '6dof',
      enableModelRotation: true,
      model: this.skullModel,
      amplitude: 0.15,
      amplitudeVariation: 0.05
    });
  }

  onDeath() {
    super.onDeath();
  }

  checkPlayerCollision(targetPosition) {
    // When player is immortal, Lost Souls should not explode on collision
    const shouldDestroy = !CONFIG.PLAYER_IMMORTAL;
    
    return super.checkPlayerCollision(targetPosition, {
      collisionRadius: this.config.collisionRadius,
      radiusMultiplier: this.isDashing ? 1.2 : 1.0,
      damage: this.config.kamikazeDamage,
      destroyOnHit: shouldDestroy
    });
  }

  update(delta, camera, targetPosition, collidableObjects = []) {
    // Call base update first (essential!)
    super.update(delta, camera, targetPosition);
    
    if (!this.isAlive || this.deathEffects.isDying) return;

    const activationDistance = 30.0;
    const isPursuing = PersistentPursuitManager.updatePursuitBehavior(
      this, targetPosition, delta, activationDistance
    );
    
    const effectiveTarget = PersistentPursuitManager.getEffectiveTarget(this, targetPosition);
    
    this.hasBeenActivated = this.pursuitBehavior.hasBeenActivated;
    this.aggressionLevel = this.pursuitBehavior.aggressionLevel;
    this.lastKnownPlayerPosition.copy(this.pursuitBehavior.lastKnownPlayerPosition);
    
    if (!effectiveTarget) return;
    
    this.updateDash(delta, effectiveTarget, collidableObjects);
    this.executeMovement(effectiveTarget, delta, collidableObjects);
    
    this.orientSkull(effectiveTarget);
    
    if (targetPosition) {
      const collisionOccurred = this.checkPlayerCollision(targetPosition);
      
      if (collisionOccurred && this.mesh && this.mesh.parent) {
        // Only create explosion effect if player is not immortal
        if (!CONFIG.PLAYER_IMMORTAL) {
          this.createExplosionEffect();
        }
      }
    }
  }

  dispose() {
    super.dispose();
  }

  createExplosionEffect() {
    if (!this.mesh || !this.mesh.parent) return;
    
    ExplosionEffects.createExplosion(this.mesh.position, this.mesh.parent, {
      particles: {
        particleCount: 8,
        colors: [0xff4444, 0xff6666, 0xff8888, 0xffaaaa],
        minSize: 0.08,
        maxSize: 0.14,
        minSpeed: 2,
        maxSpeed: 6,
        gravity: 0.01,
        fadeSpeed: 2
      },
      flash: {
        color: 0xffffff,
        size: 2.0,
        opacity: 0.6,
        duration: 1.0,
        expansionFactor: 2.0
      }
    });
  }
}
