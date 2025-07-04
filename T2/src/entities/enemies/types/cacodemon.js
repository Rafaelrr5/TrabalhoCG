import * as THREE from '../../../../../build/three.module.js';
import { loadGLTFModel, createFallbackModel } from '../../../utils/modelLoader.js';
import { Enemy } from '../base/enemies.js';
import { CONFIG } from '../../../core/config.js';
import { CACODEMON_CONFIG, getCacodeemonConfig } from '../config/cacodeemonConfig.js';
import { CacodeemonProjectile, createCacodeemonProjectile } from '../systems/cacodeemonProjectile.js';

export class Cacodemon extends Enemy {
  constructor(position = [0, 0, 0], config = {}) {
    const defaultConfig = getCacodeemonConfig(config.difficulty || 'normal');
    
    const finalConfig = {
      ...defaultConfig,
      ...config
    };

    super(position, finalConfig);
    
    this.initializeCacodemon();
    this.loadModel();
  }

  initializeCacodemon() {
    this.projectileSpeed = this.config.projectileSpeed;
    this.attackRange = this.config.attackRange;
    this.attackCooldown = this.config.attackCooldown;
    this.projectileDamage = this.config.projectileDamage;
    this.timeSinceLastAttack = 0;
    this.isAttacking = false;
    this.floatAmplitude = this.config.floatAmplitude;
    this.floatFrequency = this.config.floatFrequency;
    this.floatTime = Math.random() * Math.PI * 2; // Random start phase
    this.aiState = 'IDLE'; // IDLE, ACTIVATED, PURSUING, ATTACKING, CIRCLING
    this.stateChangeTime = 0;
    this.activationDistance = this.config.activationDistance || 60.0; // Increased activation distance
    this.optimalAttackDistance = this.config.optimalAttackDistance || 14.0; // Closer optimal distance
    this.maxAttackDistance = this.config.maxAttackDistance || 20.0; // Closer maximum attack distance
    this.velocity = new THREE.Vector3();
    this.targetVelocity = new THREE.Vector3();
    this.acceleration = this.config.acceleration || 10.0; // Increased acceleration
    this.maxSpeed = this.config.moveSpeed || 8.0; // Increased max speed
    this.smoothing = 0.95; // Velocity smoothing factor
    this.rotationSpeed = this.config.rotationSpeed || 3.0; // Increased rotation speed
    this.spawnPosition = new THREE.Vector3().copy(this.mesh.position);
    this.targetPosition = new THREE.Vector3().copy(this.mesh.position);
    this.moveSpeed = this.config.moveSpeed || 8.0; // Increased move speed
    this.circleRadius = 8.0; // Radius for circling behavior
    this.circleAngle = Math.random() * Math.PI * 2; // Random start angle
    this.circleSpeed = 1.0; // Speed of circling
    this.model = null;
    this.modelLoaded = false;
    this.idleInitialized = false;
    this.idleRotationSpeed = 0.5;
    this.targetRotation = 0;
    this.hasLineOfSight = false;
    this.lastKnownPlayerPosition = new THREE.Vector3();
    this.activeProjectiles = [];
    
    // Area 2 specific behavior - always ready to activate aggressively
    this.hasBeenActivated = false; // Track if ever been activated
    this.aggressionLevel = 1.0; // Multiplier for aggressive behavior
  }

  async loadModel() {
    try {
      const modelConfig = {
        scale: 0.005,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        pivotAtCenter: true,
        castShadow: true,
        receiveShadow: true,
        materialConfig: {
          transparent: false,
          opacity: 1.0,
          visible: true,
          side: THREE.DoubleSide
        },
        fallback: {
          type: 'sphere',
          radius: this.config.radius,
          color: this.config.color
        }
      };

      this.removePlaceholder();
      
      this.model = await loadGLTFModel('./assets/models/cacodemon.glb', modelConfig);
      
      this.mesh.add(this.model);
      
      // Ensure health bar is positioned correctly above the model
      this.repositionHealthBar();
      
      this.modelLoaded = true;
      
    } catch (error) {
      console.error('Failed to load Cacodemon GLB model:', error);
      this.createPlaceholderGeometry();
      this.repositionHealthBar();
      this.modelLoaded = false;
    }
  }

  removePlaceholder() {
    if (this.placeholderMesh) {
      this.mesh.remove(this.placeholderMesh);
      this.placeholderMesh.geometry.dispose();
      this.placeholderMesh.material.dispose();
      this.placeholderMesh = null;
    }
    
    const spikesToRemove = [];
    this.mesh.children.forEach(child => {
      if (child.geometry && child.geometry.type === 'ConeGeometry') {
        spikesToRemove.push(child);
      }
    });
    spikesToRemove.forEach(spike => {
      this.mesh.remove(spike);
      spike.geometry.dispose();
      spike.material.dispose();
    });
  }

  createPlaceholderGeometry() {
    const geometry = new THREE.SphereGeometry(this.config.radius, 16, 12);
    const material = new THREE.MeshLambertMaterial({ 
      color: this.config.color,
      transparent: true,
      opacity: 0.8
    });
    
    this.placeholderMesh = new THREE.Mesh(geometry, material);
    this.placeholderMesh.castShadow = true;
    this.placeholderMesh.receiveShadow = true;
    
    this.mesh.add(this.placeholderMesh);
    
    // Create spikes for more menacing appearance
    this.createSpikes();
  }

  repositionHealthBar() {
    if (!this.healthBarGroup) return;
    
    // Get the height of the model to position health bar above it
    let modelHeight = this.config.radius * 2; // Default fallback
    
    if (this.model) {
      const box = new THREE.Box3().setFromObject(this.model);
      modelHeight = box.max.y - box.min.y;
    }
    
    // Position health bar above the model with some padding
    const yOffset = modelHeight / 2 + 0.5;
    this.healthBarGroup.position.set(0, yOffset, 0);
  }

  createSpikes() {
    const spikeGeometry = new THREE.ConeGeometry(0.1, 0.5, 6);
    const spikeMaterial = new THREE.MeshLambertMaterial({ color: 0x660000 });
    
    for (let i = 0; i < 8; i++) {
      const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
      const angle = (i / 8) * Math.PI * 2;
      spike.position.set(
        Math.cos(angle) * this.config.radius,
        0,
        Math.sin(angle) * this.config.radius
      );
      spike.lookAt(
        spike.position.x * 2,
        0,
        spike.position.z * 2
      );
      this.mesh.add(spike);
    }
  }

  update(delta, camera, playerHitbox, collidableObjects = []) {
    // Call parent update first to handle death fade animation
    super.update(delta, camera, playerHitbox, collidableObjects);
    
    // Always update projectiles, even when dying, so they continue moving
    this.updateProjectiles(delta, collidableObjects, camera);
    
    // Only process other Cacodemon specific behavior if alive and not dying
    if (!this.isAlive || this.isDying) return;

    // Update floating animation
    this.updateFloatingBehavior(delta);
    
    // Update attack system
    this.updateAttackSystem(delta, camera, playerHitbox);
    
    // Apply movement and collision
    this.updateMovement(delta, collidableObjects, camera);
    
    // Update health bar and make it face camera
    this.updateHealthBar();
    if (this.healthBarGroup && camera) {
      this.healthBarGroup.lookAt(camera.position);
    }
    
    // Update bounding box
    this.updateBoundingBox();
  }

  updateFloatingBehavior(delta) {
    // Floating up and down motion
    this.floatTime += delta * this.floatFrequency;
    const floatOffset = Math.sin(this.floatTime) * this.floatAmplitude;

    // Store the base Y position (position without floating effect)
    if (!this.hasStoredBaseY) {
      this.originalBaseY = this.mesh.position.y;
      this.hasStoredBaseY = true;
    }

    // Apply floating motion on top of the base Y position
    this.mesh.position.y = this.originalBaseY + floatOffset;
  }

  // Smooth movement method similar to lost souls
  smoothMoveTowards(targetPosition, speed, delta) {
    // Calculate desired direction and velocity
    const direction = new THREE.Vector3()
      .subVectors(targetPosition, this.mesh.position)
      .normalize();
    
    // Set target velocity based on direction and speed
    this.targetVelocity.copy(direction).multiplyScalar(speed);
    
    // Smoothly interpolate current velocity towards target velocity
    this.velocity.lerp(this.targetVelocity, this.acceleration * delta);
    
    // Apply velocity smoothing to prevent jittery movement
    this.velocity.multiplyScalar(this.smoothing);
    
    // Apply the velocity to the position (excluding Y axis for ground-based movement)
    const movement = this.velocity.clone();
    movement.y = 0; // Keep floating behavior separate
    this.mesh.position.addScaledVector(movement, delta);
  }

  // Enhanced smooth rotation towards target
  smoothLookAt(targetPosition, rotationSpeed = 2.0, delta) {
    const direction = new THREE.Vector3()
      .subVectors(targetPosition, this.mesh.position)
      .normalize();
    
    // Calculate target rotation
    const targetRotation = Math.atan2(direction.x, direction.z);
    
    // Get current rotation
    let currentRotation = this.mesh.rotation.y;
    
    // Handle angle wrapping
    let angleDiff = targetRotation - currentRotation;
    if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    // Smoothly interpolate rotation
    const maxRotationChange = rotationSpeed * delta;
    const rotationChange = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), maxRotationChange);
    
    this.mesh.rotation.y = currentRotation + rotationChange;
  }

  updateAttackSystem(delta, camera, playerHitbox) {
    this.timeSinceLastAttack += delta;
    
    const distanceToPlayer = this.mesh.position.distanceTo(camera.position);
    
    // Attack more frequently and at longer range, especially when activated
    let effectiveAttackRange = this.attackRange * 1.2; // Increased attack range
    let effectiveAttackCooldown = this.attackCooldown * 0.7; // Faster attack rate
    
    // If cacodemon has been activated (pursuing player), extend range even more
    if (this.hasBeenActivated) {
      effectiveAttackRange *= 1.5; // Much longer range for activated cacodemons
      effectiveAttackCooldown *= 0.8; // Even faster attacks when activated
    }
    
    if (distanceToPlayer <= effectiveAttackRange && 
        this.timeSinceLastAttack >= effectiveAttackCooldown &&
        !this.isAttacking) {
      
      this.attemptAttack(camera.position);
    }
    
    this.updateProximityAudio(camera.position);
  }

  attemptAttack(playerPosition) {
    this.isAttacking = true;
    this.timeSinceLastAttack = 0;
    
    // Play attack sound
    this.playAttackSound();
    
    const startPosition = this.mesh.position.clone();
    startPosition.y += 1.0;
    
    const projectile = createCacodeemonProjectile(
      this.mesh.parent,
      startPosition,
      playerPosition,
      {
        damage: this.projectileDamage,
        speed: this.projectileSpeed
      }
    );
    
    this.activeProjectiles.push(projectile);
    
    setTimeout(() => {
      this.isAttacking = false;
    }, 500);
  }

  updateProjectiles(delta, collidableObjects, camera = null) {
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const projectile = this.activeProjectiles[i];
      
      if (!projectile.update(delta, collidableObjects, camera)) {
        this.activeProjectiles.splice(i, 1);
      }
    }
  }

  updateMovement(delta, collidableObjects, camera) {
    const playerPosition = camera ? camera.position : null;
    
    if (!playerPosition) {
      // If no player position but cacodemon has been activated, use last known position
      if (this.hasBeenActivated && this.lastKnownPlayerPosition.length() > 0) {
        const lastKnownPos = this.lastKnownPlayerPosition;
        this.updateAIState(lastKnownPos, delta);
        this.executePursuingBehavior(lastKnownPos, delta, collidableObjects);
        return;
      }
      this.idleBehavior(delta);
      return;
    }
    
    this.updateAIState(playerPosition, delta);
    
    switch (this.aiState) {
      case 'IDLE':
        this.executeIdleBehavior(delta);
        break;
      case 'ACTIVATED':
        this.executeActivatedBehavior(playerPosition, delta);
        break;
      case 'PURSUING':
        this.executePursuingBehavior(playerPosition, delta, collidableObjects);
        break;
      case 'ATTACKING':
        this.executeAttackingBehavior(playerPosition, delta);
        break;
      case 'CIRCLING':
        this.executeCirclingBehavior(playerPosition, delta);
        break;
    }
  }

  updateAIState(playerPosition, delta) {
    this.stateChangeTime += delta;
    const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
    
    switch (this.aiState) {
      case 'IDLE':
        if (distanceToPlayer <= this.activationDistance || distanceToPlayer <= 60.0) {
          this.changeState('ACTIVATED');
          this.playSightSound(); // Play sight sound when first detecting player
        }
        break;
        
      case 'ACTIVATED':
        if (this.stateChangeTime > 0.5) { 
          this.changeState('PURSUING');
        }
        break;
        
      case 'PURSUING':
        if (distanceToPlayer <= this.optimalAttackDistance) {
          this.changeState('ATTACKING');
        }
        // Once activated, never return to IDLE - keep pursuing indefinitely
        // This ensures they chase the player even outside area 2
        break;
        
      case 'ATTACKING':
        if (distanceToPlayer > this.maxAttackDistance) {
          this.changeState('PURSUING');
        } else if (distanceToPlayer < this.optimalAttackDistance * 0.6) {
          this.changeState('CIRCLING');
        }
        break;
        
      case 'CIRCLING':
        if (distanceToPlayer > this.optimalAttackDistance * 1.3) {
          this.changeState('ATTACKING');
        } else if (distanceToPlayer > this.maxAttackDistance) {
          this.changeState('PURSUING');
        }
        break;
    }
  }

  changeState(newState) {
    // Special behavior when transitioning to ACTIVATED state (similar to Lost Soul aggression)
    if (newState === 'ACTIVATED' && this.aiState === 'IDLE') {
      this.playSightSound(); // Alert player with sound
      
      // Mark as activated and increase aggression
      if (!this.hasBeenActivated) {
        this.hasBeenActivated = true;
        this.aggressionLevel = 1.3; // Increase aggression permanently once activated
        
        // Boost stats when first activated (like Lost Souls becoming aggressive)
        this.maxSpeed = this.config.moveSpeed * this.aggressionLevel;
        this.attackRange = this.config.attackRange * 1.15;
        this.activationDistance = this.config.activationDistance * 1.2;
      }
    }
    
    this.aiState = newState;
    this.stateChangeTime = 0;
  }

  executeIdleBehavior(delta) {
    // Gentle floating and slow rotation at spawn position
    this.mesh.rotation.y += this.idleRotationSpeed * 0.3 * delta;
    
    // Slowly return to spawn position if drifted
    const distanceToSpawn = this.mesh.position.distanceTo(this.spawnPosition);
    if (distanceToSpawn > 2.0) {
      // Use smooth movement to return to spawn
      const returnSpeed = this.maxSpeed * 0.3;
      this.smoothMoveTowards(this.spawnPosition, returnSpeed, delta);
    } else {
      // Apply gentle idle floating motion when near spawn
      const time = Date.now() * 0.001;
      const idleOffset = new THREE.Vector3(
        Math.sin(time * 0.7) * 0.5,
        0,
        Math.cos(time * 0.5) * 0.5
      );
      const idleTarget = this.spawnPosition.clone().add(idleOffset);
      this.smoothMoveTowards(idleTarget, this.maxSpeed * 0.1, delta);
    }
  }

  executeActivatedBehavior(playerPosition, delta) {
    // More aggressive activation behavior - immediately start moving towards player
    this.smoothLookAt(playerPosition, 5.0, delta); // Faster rotation
    
    // Immediate movement towards player with higher speed
    const activationSpeed = this.maxSpeed * 0.8; // Increased from 0.5
    this.smoothMoveTowards(playerPosition, activationSpeed, delta);
    
    // Play proximity sound to alert player
    this.updateProximityAudio(playerPosition);
  }

  executePursuingBehavior(playerPosition, delta, collidableObjects) {
    const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
    
    // More aggressive pursuit speed - like Lost Souls
    let pursuitSpeed = this.maxSpeed * 1.5; // Increased base speed
    
    // Adjust speed based on distance for more dynamic pursuit
    // Maintain high speed even at long distances for persistent chase
    if (distanceToPlayer < 8.0) {
      pursuitSpeed *= 0.8; // Slow down when very close
    } else if (distanceToPlayer > 50.0) {
      pursuitSpeed *= 2.2; // Much faster when very far (chasing outside area)
    } else if (distanceToPlayer > 25.0) {
      pursuitSpeed *= 1.8; // Much faster when far away
    } else if (distanceToPlayer > 15.0) {
      pursuitSpeed *= 1.4; // Faster when medium distance
    }
    
    // Add some unpredictability to movement like Lost Souls
    const time = Date.now() * 0.001;
    const variation = new THREE.Vector3(
      Math.sin(time * 1.7) * 1.2, // Increased variation
      0,
      Math.cos(time * 1.3) * 1.2
    );
    
    const targetWithVariation = playerPosition.clone().add(variation);
    
    // More aggressive movement towards player
    this.smoothMoveTowards(targetWithVariation, pursuitSpeed, delta);
    
    // Faster rotation to track player
    this.smoothLookAt(playerPosition, 6.0, delta); // Increased from 4.0
    
    // Update last known player position for persistent tracking
    this.lastKnownPlayerPosition.copy(playerPosition);
  }

  executeAttackingBehavior(playerPosition, delta) {
    // More aggressive attacking behavior - maintain optimal distance but stay mobile
    const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
    const distanceDiff = distanceToPlayer - this.optimalAttackDistance;
    
    let targetPos = playerPosition.clone();
    
    if (Math.abs(distanceDiff) > 1.0) { // Reduced threshold for more responsive positioning
      // Calculate position at optimal distance
      const direction = new THREE.Vector3()
        .subVectors(this.mesh.position, playerPosition)
        .normalize();
      
      targetPos = playerPosition.clone().add(
        direction.multiplyScalar(this.optimalAttackDistance)
      );
    } else {
      // Add slight movement variation to avoid being a static target
      const time = Date.now() * 0.001;
      const movement = new THREE.Vector3(
        Math.sin(time * 2.0) * 1.5,
        0,
        Math.cos(time * 1.8) * 1.5
      );
      targetPos = this.mesh.position.clone().add(movement);
    }
    
    // More responsive movement for attacking
    const adjustSpeed = this.maxSpeed * 0.6; // Increased from 0.4
    this.smoothMoveTowards(targetPos, adjustSpeed, delta);
    
    // Always face the player smoothly with faster rotation
    this.smoothLookAt(playerPosition, 7.0, delta); // Increased from 5.0
  }

  executeCirclingBehavior(playerPosition, delta) {
    // Update circle angle for smooth circular motion
    this.circleAngle += this.circleSpeed * delta;
    
    // Calculate target position on circle around player
    const targetX = playerPosition.x + Math.cos(this.circleAngle) * this.circleRadius;
    const targetZ = playerPosition.z + Math.sin(this.circleAngle) * this.circleRadius;
    const targetY = this.mesh.position.y; // Maintain current Y position
    
    const circleTarget = new THREE.Vector3(targetX, targetY, targetZ);
    
    // Use smooth movement for circling
    const circleSpeed = this.maxSpeed * 0.8;
    this.smoothMoveTowards(circleTarget, circleSpeed, delta);
    
    // Always face the player while circling
    this.smoothLookAt(playerPosition, 4.0, delta);
  }

  checkCollision(newPosition, collidableObjects) {
    return false;
  }

  idleBehavior(delta) {
    // Behavior when player is not in area - gentle floating motion
    this.updateFloatingBehavior(delta);
    
    // Gentle rotation
    this.mesh.rotation.y += (this.idleRotationSpeed * 0.5) * delta;
    
    // Subtle idle movement around spawn position
    if (!this.idleInitialized) {
      this.idleInitialized = true;
      this.idleTimeOffset = Math.random() * Math.PI * 2;
    }
    
    const time = Date.now() * 0.001;
    const idleRadius = 1.5;
    const idleTarget = this.spawnPosition.clone().add(new THREE.Vector3(
      Math.sin(time * 0.3 + this.idleTimeOffset) * idleRadius,
      0,
      Math.cos(time * 0.4 + this.idleTimeOffset) * idleRadius
    ));
    
    // Very slow smooth movement for idle behavior
    this.smoothMoveTowards(idleTarget, this.maxSpeed * 0.15, delta);
    
    this.updateHealthBar();
  }

  takeDamage(damage) {
    // Use the parent takeDamage method which handles death properly
    return super.takeDamage(damage);
  }

  die() {
    if (this.isDying) return;
    
    this.isAlive = false;
    this.onDeath(); // This will call super.onDeath() which handles the fade
  }

  handleDeathAnimation(delta) {
    // This method is no longer needed as we use the parent class fade system
    // Keeping for backward compatibility
    if (this.fadeCompleted) {
      return;
    }
  }

  onDeath() {
    // Call parent death method which handles the fade animation
    super.onDeath();
  }

  dispose() {
    // Clean up projectiles
    this.activeProjectiles.forEach(projectile => {
      if (projectile.parent) {
        projectile.parent.remove(projectile);
      }
    });
    this.activeProjectiles = [];
    
    if (this.model) {
      this.model.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) {
            child.geometry.dispose();
          }
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
      this.mesh.remove(this.model);
      this.model = null;
    }
    
    if (this.placeholderMesh) {
      this.placeholderMesh.geometry.dispose();
      this.placeholderMesh.material.dispose();
      this.mesh.remove(this.placeholderMesh);
      this.placeholderMesh = null;
    }
    
    // Call parent cleanup
    super.dispose();
  }

  getAttackRange() {
    return this.attackRange;
  }

  isInAttackRange(position) {
    return this.mesh.position.distanceTo(position) <= this.attackRange;
  }

  getProjectileCount() {
    return this.activeProjectiles.length;
  }
}
