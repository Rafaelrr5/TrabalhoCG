import * as THREE from '../../../../../build/three.module.js';
import { loadGLTFModel } from '../../../utils/modelLoader.js';
import { Enemy } from '../base/enemies.js';
import { getCacodeemonConfig } from '../config/enemyConfig.js';
import { createCacodeemonProjectile } from '../systems/cacodeemonProjectile.js';
import { EnemyPersistentPursuitManager } from '../components/EnemyPersistentPursuitBehavior.js';

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
    this.floatTime = Math.random() * Math.PI * 2;
    this.aiState = 'IDLE'; // IDLE, ACTIVATED, PURSUING, ATTACKING, CIRCLING
    this.stateChangeTime = 0;
    this.activationDistance = 30.0;
    this.optimalAttackDistance = 10.0;
    this.maxAttackDistance = 14.0;
    // Remove duplicate velocity - use inherited one
    this.targetVelocity = new THREE.Vector3();
    this.acceleration = 8.0;
    this.maxSpeed = 4.0;
    this.smoothing = 0.92;
    this.rotationSpeed = this.config.rotationSpeed || 4.0;
    this.spawnPosition = new THREE.Vector3().copy(this.mesh.position);
    this.targetPosition = new THREE.Vector3().copy(this.mesh.position);
    this.moveSpeed = 4.0;
    this.circleRadius = 6.0;
    this.circleAngle = Math.random() * Math.PI * 2;
    this.circleSpeed = 1.0;
    this.model = null;
    this.modelLoaded = false;
    this.idleInitialized = false;
    this.idleRotationSpeed = 0.5;
    this.activeProjectiles = [];
    
    this.pursuitBehavior = EnemyPersistentPursuitManager.attachPursuitBehavior(this, {
      baseAggressionLevel: 1.5,
      speedMultiplier: 2.0,
      attackRangeMultiplier: 1.3,
      activationDistanceMultiplier: 1.5,
      persistentChaseSpeedMultiplier: 2.8
    });
    
    this.hasBeenActivated = false;
    this.aggressionLevel = 1.0;
    this.lastKnownPlayerPosition = new THREE.Vector3();
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
      
      this.modelLoaded = true;
      
    } catch (error) {
      console.error('Failed to load Cacodemon GLB model:', error);
      this.createPlaceholderGeometry();
      this.modelLoaded = false;
    }
  }

  adjustHeightToPlayer(playerPosition, delta) {
  const targetHeight = playerPosition.y;
  const currentHeight = this.mesh.position.y;
  const heightDifference = targetHeight - currentHeight;
  
  // Configurações de suavização
  const maxSpeed = 5.0;          // Velocidade máxima de ajuste
  const acceleration = 8.0;      // Aceleração do movimento
  const damping = 0.4;           // Suavização na aproximação do alvo
  
  // Calcula a direção e aplica aceleração
  let speed = Math.min(Math.abs(heightDifference) * acceleration, maxSpeed);
  speed *= Math.sign(heightDifference);
  
  // Aplica damping quando próximo do alvo
  if (Math.abs(heightDifference) < 1.0) {
    speed *= Math.abs(heightDifference) * damping;
  }
  
  // Movimento suave baseado em delta time
  this.mesh.position.y += speed * delta;
  
  // Trava a altura se estiver muito próximo (evita oscilação)
  if (Math.abs(heightDifference) < 0.1) {
    this.mesh.position.y = targetHeight;
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
    
    this.createSpikes();
  }

  repositionHealthBar() {
    if (!this.healthBarGroup) return;
    
    let modelHeight = this.config.radius * 2;
    
    if (this.model) {
      const box = new THREE.Box3().setFromObject(this.model);
      modelHeight = box.max.y - box.min.y;
    }
    
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

  update(delta, camera, playerHitbox, collidableObjects = [], otherEnemies = []) {
    // Call base update first (essential!)
    super.update(delta, camera, playerHitbox, otherEnemies);
    
    // Ensure health bar exists (for consistency with Lost Souls)
    if (!this.healthBar?.healthBarGroup) {
      this.healthBar?.initialize();
    }
    
    // Update projectiles
    this.updateProjectiles(delta, collidableObjects, camera);
    
    if (!this.isAlive || this.deathEffects.isDying) return;

    // Cacodemon-specific behaviors
    this.updateFloatingBehavior(delta);
    this.updateAttackSystem(delta, camera, playerHitbox);
    this.updateMovement(delta, collidableObjects, camera, otherEnemies);
    
    // Always face the player when close enough or in combat states
    const distanceToPlayer = camera ? this.mesh.position.distanceTo(camera.position) : Infinity;
    if (camera && (distanceToPlayer <= this.attackRange * 2.0 || this.isAttacking || 
        this.aiState === 'ATTACKING' || this.aiState === 'PURSUING' || this.aiState === 'CIRCLING')) {
      this.smoothLookAt(camera.position, 10.0, delta);
    }
  }

  updateFloatingBehavior(delta) {
  // Se estiver ajustando a altura, não aplica flutuação
  if (this.aiState !== 'IDLE') return;
  
  this.floatTime += delta * this.floatFrequency;
  const floatOffset = Math.sin(this.floatTime) * this.floatAmplitude;
  
  if (!this.hasStoredBaseY) {
    this.originalBaseY = this.mesh.position.y;
    this.hasStoredBaseY = true;
  }
  
  this.mesh.position.y = this.originalBaseY + floatOffset;
}

  smoothMoveTowards(targetPosition, speed, delta, otherEnemies = []) {
    const direction = new THREE.Vector3()
      .subVectors(targetPosition, this.mesh.position)
      .normalize();
    
    this.targetVelocity.copy(direction).multiplyScalar(speed);
    
    // Add collision avoidance
    if (otherEnemies && otherEnemies.length > 0) {
      const separationRadius = 8.0;
      const separationForce = new THREE.Vector3();
      
      for (const other of otherEnemies) {
        if (other === this || !other.isAlive) continue;
        
        const distance = this.mesh.position.distanceTo(other.mesh.position);
        if (distance < separationRadius && distance > 0) {
          const pushDirection = new THREE.Vector3()
            .subVectors(this.mesh.position, other.mesh.position)
            .normalize();
          const pushStrength = (separationRadius - distance) / separationRadius;
          separationForce.addScaledVector(pushDirection, pushStrength * speed * 2.0);
        }
      }
      
      this.targetVelocity.add(separationForce);
    }
    
    this.velocity.lerp(this.targetVelocity, this.acceleration * delta);
    this.velocity.multiplyScalar(this.smoothing);
    
    const movement = this.velocity.clone();
    movement.y = 0;
    this.mesh.position.addScaledVector(movement, delta);
  }

  smoothLookAt(targetPosition, rotationSpeed = 2.0, delta) {
    if (!targetPosition) return;
    
    const direction = new THREE.Vector3()
      .subVectors(targetPosition, this.mesh.position)
      .normalize();
    
    const targetRotation = Math.atan2(direction.x, direction.z);
    let currentRotation = this.mesh.rotation.y;
    let angleDiff = targetRotation - currentRotation;
    
    // Normalize angle difference to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    
    const maxRotationChange = rotationSpeed * delta;
    const rotationChange = Math.max(-maxRotationChange, Math.min(maxRotationChange, angleDiff));
    
    this.mesh.rotation.y = currentRotation + rotationChange;
  }

  updateAttackSystem(delta, camera, playerHitbox) {
  this.timeSinceLastAttack += delta;
  const distanceToPlayer = this.mesh.position.distanceTo(camera.position);

  // Alinha a altura sempre que o jogador estiver dentro do alcance de ataque
  if (distanceToPlayer <= this.attackRange * 2.0) {
    this.adjustHeightToPlayer(camera.position, delta);
  }

  if (distanceToPlayer <= this.attackRange && 
      this.timeSinceLastAttack >= this.attackCooldown &&
      !this.isAttacking) {
    this.attemptAttack(camera.position);
  }
}

  attemptAttack(playerPosition) {
    this.isAttacking = true;
    this.timeSinceLastAttack = 0;
    
    // Instantly face the player before attacking
    const direction = new THREE.Vector3()
      .subVectors(playerPosition, this.mesh.position)
      .normalize();
    this.mesh.rotation.y = Math.atan2(direction.x, direction.z);
    
    // Use wrapper method
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

  updateMovement(delta, collidableObjects, camera, otherEnemies = []) {
    const playerPosition = camera ? camera.position : null;
    
    const isPursuing = EnemyPersistentPursuitManager.updatePursuitBehavior(
      this, playerPosition, delta, this.activationDistance
    );
    
    const effectiveTarget = EnemyPersistentPursuitManager.getEffectiveTarget(this, playerPosition);
    
    // Update legacy properties for compatibility
    this.hasBeenActivated = this.pursuitBehavior.hasBeenActivated;
    this.aggressionLevel = this.pursuitBehavior.aggressionLevel;
    this.lastKnownPlayerPosition.copy(this.pursuitBehavior.lastKnownPlayerPosition);
    
    if (!effectiveTarget) {
      this.idleBehavior(delta, otherEnemies);
      return;
    }
    
    this.updateAIState(effectiveTarget, delta);
    
    switch (this.aiState) {
      case 'IDLE':
        this.executeIdleBehavior(delta, otherEnemies);
        break;
      case 'ACTIVATED':
        this.executeActivatedBehavior(effectiveTarget, delta, otherEnemies);
        break;
      case 'PURSUING':
        this.executePursuingBehavior(effectiveTarget, delta, collidableObjects, otherEnemies);
        break;
      case 'ATTACKING':
        this.executeAttackingBehavior(effectiveTarget, delta, otherEnemies);
        break;
      case 'CIRCLING':
        this.executeCirclingBehavior(effectiveTarget, delta, otherEnemies);
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
          this.playSightSound();
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
        break;
        
      case 'ATTACKING':
        if (distanceToPlayer > this.maxAttackDistance) {
          this.changeState('PURSUING');
        } else if (distanceToPlayer < this.optimalAttackDistance * 0.4) {
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
    this.aiState = newState;
    this.stateChangeTime = 0;
  }

  executeIdleBehavior(delta) {
    this.mesh.rotation.y += this.idleRotationSpeed * 0.3 * delta;
    
    const distanceToSpawn = this.mesh.position.distanceTo(this.spawnPosition);
    if (distanceToSpawn > 2.0) {
      const returnSpeed = this.maxSpeed * 0.3;
      this.smoothMoveTowards(this.spawnPosition, returnSpeed, delta);
    } else {
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
    const activationSpeed = this.maxSpeed * 0.8;
    this.smoothMoveTowards(playerPosition, activationSpeed, delta);
    // Use wrapper method
    this.updateProximityAudio(playerPosition);
  }

  executePursuingBehavior(playerPosition, delta, collidableObjects, otherEnemies = []) {
    const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
    const speedMultiplier = this.pursuitBehavior.getSpeedMultiplier(distanceToPlayer);
    let pursuitSpeed = this.maxSpeed * speedMultiplier;

    // Movimento base em direção ao jogador
    const targetPosition = playerPosition.clone();
    targetPosition.y = this.mesh.position.y; // Mantém a altura atual
    
    // Verificar se há colisão com o ambiente
    const avoidanceDirection = this.getCollisionAvoidance(collidableObjects, targetPosition, 2.0);
    
    let finalDirection;
    if (avoidanceDirection) {
      // Usar direção de evasão se há obstáculo
      finalDirection = avoidanceDirection.normalize();
    } else {
      // Movimento normal em direção ao jogador
      finalDirection = new THREE.Vector3()
        .subVectors(targetPosition, this.mesh.position)
        .normalize();
    }
    
    // Adicionar separação de outros inimigos (mais suave)
    const separationResult = this.checkEnemyCollisions(otherEnemies);
    if (separationResult.hasCollision) {
      this.applySeparationForce(separationResult.separationForce, delta, 0.3);
    }
    
    // Aplicar movimento
    const velocity = finalDirection.clone().multiplyScalar(pursuitSpeed);
    this.mesh.position.addScaledVector(velocity, delta);
    
    // Prevenir overlap de forma suave
    this.preventOverlap(collidableObjects, delta);
    
    // Orientar para a direção do movimento
    if (finalDirection.length() > 0) {
      this.mesh.lookAt(
        this.mesh.position.x + finalDirection.x,
        this.mesh.position.y,
        this.mesh.position.z + finalDirection.z
      );
    }
  }

  executeAttackingBehavior(playerPosition, delta, otherEnemies = []) {
    const targetPos = playerPosition.clone();
    targetPos.y = this.mesh.position.y; // Mantém a altura atual (já alinhada)

    const adjustSpeed = this.maxSpeed * 0.8;
    
    // Verificar separação de outros inimigos (mais suave)
    const separationResult = this.checkEnemyCollisions(otherEnemies);
    if (separationResult.hasCollision) {
      this.applySeparationForce(separationResult.separationForce, delta, 0.2);
    }
    
    this.smoothMoveTowards(targetPos, adjustSpeed, delta, otherEnemies);
    
    // Prevenir overlap suavemente
    this.preventOverlap([], delta);
  }

  executeCirclingBehavior(playerPosition, delta, otherEnemies = []) {
    this.circleAngle += this.circleSpeed * delta;
    
    const targetX = playerPosition.x + Math.cos(this.circleAngle) * this.circleRadius;
    const targetZ = playerPosition.z + Math.sin(this.circleAngle) * this.circleRadius;
    const targetY = playerPosition.y; // Usa a altura do jogador

    const circleTarget = new THREE.Vector3(targetX, targetY, targetZ);
    
    // Verificar separação de outros inimigos (mais suave)
    const separationResult = this.checkEnemyCollisions(otherEnemies);
    if (separationResult.hasCollision) {
      this.applySeparationForce(separationResult.separationForce, delta, 0.2);
    }
    
    this.smoothMoveTowards(circleTarget, this.maxSpeed * 0.8, delta, otherEnemies);
    
    // Prevenir overlap suavemente
    this.preventOverlap([], delta);
  }

  checkCollision(newPosition, collidableObjects) {
    return false;
  }

  idleBehavior(delta) {
    this.updateFloatingBehavior(delta);
    this.mesh.rotation.y += (this.idleRotationSpeed * 0.5) * delta;
    
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
    
    this.smoothMoveTowards(idleTarget, this.maxSpeed * 0.15, delta);
    // Remove updateHealthBar() call - it's handled by base class
  }

  takeDamage(damage) {
    return super.takeDamage(damage);
  }

  die() {
    if (this.isDying) return;
    
    super.die();
  }

  handleDeathAnimation(delta) {
    if (this.fadeCompleted) {
      return;
    }
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
