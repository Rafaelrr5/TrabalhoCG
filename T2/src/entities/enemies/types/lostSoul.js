import * as THREE from '../../../../../build/three.module.js';
import { Enemy } from '../base/enemies.js';
import { loadSkullModel, preloadSkullModel } from '../../../utils/skullLoader.js';
import { CONFIG } from '../../../core/config.js';
import { applyLostSoulCollisionCorrection } from '../../../systems/collision.js';

export class LostSoul extends Enemy {
  constructor(position = [0, 0, 0], config = {}) {
    const defaultConfig = {
      radius: 0.6,
      color: 0x8B0000,
      maxHealth: 20,
      speed: 4.0,
      dashSpeed: 25.0,
      dashInterval: 1.5,
      dashDuration: 2.0,
      kamikazeDamage: 30,
      collisionRadius: 1.5,
      skullScale: 1.0,
      skullYRotationOffset: Math.PI,
      skullXRotationOffset: -90,
      skullZRotationOffset: 0,
      maintainPivotOnScale: true,
      ...config
    };

    super(position, defaultConfig);
    
    this.initializeLostSoul();
    this.loadSkull();
  }

  initializeLostSoul() {
    // Dash system properties
    this.dashSpeed = this.config.dashSpeed;
    this.dashInterval = this.config.dashInterval;
    this.dashDuration = this.config.dashDuration;
    this.timeSinceLastDash = 0;
    this.isDashing = false;
    this.dashDirection = new THREE.Vector3();
    this.dashCooldown = 0;
    
    // Movement state management
    this.movementState = {
      isNearPlayer: false,
      lastPlayerDistance: Infinity,
      targetDirection: new THREE.Vector3(),
      smoothedVelocity: new THREE.Vector3(),
      collisionAvoidanceForce: new THREE.Vector3(),
      lastCollisionTime: 0
    };
    
    // Performance optimization
    this.lastCollisionCheck = 0;
    this.collisionCheckInterval = 1000 / 30; // 30 FPS collision checks
    this.lastPosition = new THREE.Vector3();
    this.stuckTimer = 0;
    this.stuckThreshold = 2000; // 2 seconds
    
    // Reference to skull model
    this.skullModel = null;
    
    // Idle behavior
    this.idleInitialized = false;
    this.baseX = this.mesh.position.x;
    this.baseY = this.mesh.position.y;
    this.baseZ = this.mesh.position.z;
    this.timeOffset = Math.random() * Math.PI * 2;
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
      
      // Calcular o centro geométrico do modelo
      const box = new THREE.Box3().setFromObject(clonedModel);
      const center = box.getCenter(new THREE.Vector3());
      
      clonedModel.position.sub(center);
      
      skullWrapper.add(clonedModel);
      
      skullWrapper.rotation.set(
        Math.PI / 2, // rotação X padrão
        this.config.skullYRotationOffset,
        this.config.skullZRotationOffset
      );
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
    
    // Create new group
    const group = new THREE.Group();
    group.position.copy(oldPosition);
    group.rotation.copy(oldRotation);
    group.add(model);
    
    // O modelo já vem preparado com pivot centralizado, rotação e escala aplicados
    this.skullModel = model;
    
    // Re-add health bar
    if (this.healthBarGroup) group.add(this.healthBarGroup);
    
    this.mesh = group;
    this.mesh.userData.enemy = this;
    this.mesh.visible = true;
    
    parent.add(this.mesh);
    this.updateBoundingBox();
  }

  // ============================================================================
  // SISTEMA DE MOVIMENTO INTELIGENTE
  // ============================================================================

  updateMovementState(targetPosition, delta) {
    const currentDistance = this.mesh.position.distanceTo(targetPosition);
    const state = this.movementState;
    
    // Atualiza estado de proximidade com player
    state.lastPlayerDistance = currentDistance;
    state.isNearPlayer = currentDistance <= (this.config.collisionRadius + 2.0);
    
    // Calcula direção suavizada para o target
    const rawDirection = new THREE.Vector3()
      .subVectors(targetPosition, this.mesh.position)
      .normalize();
    
    // Aplica suavização na direção para movimento mais fluido
    const smoothingFactor = Math.min(delta * 8.0, 1.0);
    state.targetDirection.lerp(rawDirection, smoothingFactor);
    
    // Detecta se está "preso" (stuck detection)
    const positionChange = this.mesh.position.distanceTo(this.lastPosition);
    if (positionChange < 0.1) {
      this.stuckTimer += delta * 1000;
    } else {
      this.stuckTimer = 0;
    }
    this.lastPosition.copy(this.mesh.position);
  }

  calculateOptimalSpeed(distance) {
    // Sistema de velocidade adaptativa baseado na distância
    let speedMultiplier = 1.0;
    
    if (distance > 20.0) {
      speedMultiplier = 1.5; // Mais rápido quando longe
    } else if (distance > 10.0) {
      speedMultiplier = 1.2;
    } else if (distance > 5.0) {
      speedMultiplier = 1.0;
    } else if (distance > 2.0) {
      speedMultiplier = 0.8; // Mais devagar quando próximo
    } else {
      speedMultiplier = 1.5; // Rápido no ataque final
    }
    
    // Reduz velocidade se estiver "preso"
    if (this.stuckTimer > 1000) {
      speedMultiplier *= 0.5;
    }
    
    return this.config.speed * speedMultiplier;
  }

  performCollisionCheck(targetPosition, collidableObjects, delta) {
    const currentTime = Date.now();
    const state = this.movementState;
    
    // Otimização: só verifica colisão a cada intervalo definido
    if (currentTime - this.lastCollisionCheck < this.collisionCheckInterval) {
      return false;
    }
    this.lastCollisionCheck = currentTime;
    
    // Não verifica colisão se muito próximo do player (permite ataque)
    if (state.isNearPlayer) {
      state.collisionAvoidanceForce.set(0, 0, 0);
      return false;
    }
    
    // Se não há objetos colidíveis ou sistema desabilitado
    if (!CONFIG.LOST_SOUL_ENABLE_COLLISION || !collidableObjects.length) {
      state.collisionAvoidanceForce.set(0, 0, 0);
      return false;
    }
    
    // Verifica colisão apenas se necessário
    const collisionResult = applyLostSoulCollisionCorrection(
      this, 
      collidableObjects, 
      targetPosition
    );
    
    if (collisionResult.corrected) {
      state.lastCollisionTime = currentTime;
      
      // Aplica força de evitação suave
      if (collisionResult.newDirection) {
        const avoidanceStrength = Math.min(1.0, (currentTime - state.lastCollisionTime) / 500);
        state.collisionAvoidanceForce.lerp(collisionResult.newDirection, avoidanceStrength);
      }
      
      return true;
    }
    
    // Reduz gradualmente a força de evitação se não há colisão
    state.collisionAvoidanceForce.multiplyScalar(0.9);
    return false;
  }

  calculateFinalMovement(targetPosition, delta) {
    const state = this.movementState;
    const distance = state.lastPlayerDistance;
    const speed = this.calculateOptimalSpeed(distance);
    
    // Combina direção do target com força de evitação de colisão
    let finalDirection = state.targetDirection.clone();
    
    // Se há força de evitação, mistura com a direção do target
    if (state.collisionAvoidanceForce.length() > 0.1) {
      const avoidanceWeight = Math.min(0.7, state.collisionAvoidanceForce.length());
      const targetWeight = 1.0 - avoidanceWeight;
      
      finalDirection.multiplyScalar(targetWeight)
        .addScaledVector(state.collisionAvoidanceForce, avoidanceWeight)
        .normalize();
    }
    
    // Sistema anti-stuck: adiciona movimento aleatório se preso
    if (this.stuckTimer > this.stuckThreshold) {
      const randomDirection = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 2
      ).normalize();
      
      finalDirection.lerp(randomDirection, 0.3);
    }
    
    // Calcula velocidade final suavizada
    const targetVelocity = finalDirection.multiplyScalar(speed);
    const velocitySmoothing = Math.min(delta * 6.0, 1.0);
    
    state.smoothedVelocity.lerp(targetVelocity, velocitySmoothing);
    this.velocity.copy(state.smoothedVelocity);
    
    return state.smoothedVelocity.clone();
  }

  orientSkull(targetPosition) {
    if (!this.skullModel) return;
    
    const orientationDirection = CONFIG.SKULL_ORIENT_TO_MOVEMENT && this.velocity.length() > 0.1
      ? this.velocity.clone().normalize()
      : new THREE.Vector3().subVectors(targetPosition, this.mesh.position).normalize();
    
    // Create target quaternion
    const targetQuaternion = new THREE.Quaternion();
    const lookAtMatrix = new THREE.Matrix4();
    const up = new THREE.Vector3(0, 1, 0);
    const currentPos = this.skullModel.position.clone();
    const targetPos = currentPos.clone().add(orientationDirection);
    
    lookAtMatrix.lookAt(currentPos, targetPos, up);
    targetQuaternion.setFromRotationMatrix(lookAtMatrix);
    
    // Apply rotation offsets
    this.applyRotationOffsets(targetQuaternion);
    
    // Apply rotation
    if (CONFIG.SKULL_SMOOTH_ROTATION) {
      const rotationSpeed = CONFIG.SKULL_ROTATION_SPEED * 0.016; // Assuming 60fps
      this.skullModel.quaternion.slerp(targetQuaternion, Math.min(rotationSpeed, 1.0));
    } else {
      this.skullModel.quaternion.copy(targetQuaternion);
    }
  }

  applyRotationOffsets(quaternion) {
    const offsets = [
      { axis: new THREE.Vector3(0, 1, 0), angle: this.config.skullYRotationOffset },
      { axis: new THREE.Vector3(1, 0, 0), angle: this.config.skullXRotationOffset },
      { axis: new THREE.Vector3(0, 0, 1), angle: this.config.skullZRotationOffset }
    ];
    
    offsets.forEach(({ axis, angle }) => {
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
    
    // Condições melhoradas para iniciar dash
    const canStartDash = !this.isDashing && 
                        this.dashCooldown <= 0 &&
                        this.timeSinceLastDash >= this.config.dashInterval &&
                        distanceToTarget >= DASH_MIN_DISTANCE && 
                        distanceToTarget <= DASH_MAX_DISTANCE &&
                        !this.movementState.isNearPlayer;
    
    // Start dash
    if (canStartDash) {
      this.isDashing = true;
      this.timeSinceLastDash = 0;
      this.dashCooldown = this.config.dashInterval * 0.5; // Cooldown adicional
      
      // Calcula direção do dash com predição da posição do player
      const playerVelocity = new THREE.Vector3(); // TODO: obter velocidade real do player se disponível
      const predictedPlayerPos = targetPosition.clone().add(playerVelocity.multiplyScalar(0.5));
      this.dashDirection.subVectors(predictedPlayerPos, this.mesh.position).normalize();
    }
    
    // End dash com condições melhoradas
    const shouldEndDash = this.isDashing && 
                         (this.timeSinceLastDash >= this.config.dashDuration || 
                          distanceToTarget <= 1.0);
    
    if (shouldEndDash) {
      this.isDashing = false;
      this.timeSinceLastDash = 0;
      this.dashCooldown = this.config.dashInterval * 0.3; // Pequeno cooldown após dash
    }
  }

  executeMovement(targetPosition, delta, collidableObjects = []) {
    if (!this.isAlive) return;
    
    // Atualiza estado do movimento
    this.updateMovementState(targetPosition, delta);
    
    // Durante dash, movimento especial
    if (this.isDashing) {
      return this.executeDashMovement(targetPosition, delta, collidableObjects);
    }
    
    // Movimento normal otimizado
    return this.executeNormalMovement(targetPosition, delta, collidableObjects);
  }
  
  executeDashMovement(targetPosition, delta, collidableObjects = []) {
    const dashVelocity = this.dashDirection.clone().multiplyScalar(this.dashSpeed);
    const newPosition = this.mesh.position.clone().addScaledVector(dashVelocity, delta);
    
    // Verifica colisão durante dash apenas com objetos sólidos
    if (CONFIG.LOST_SOUL_ENABLE_COLLISION && collidableObjects.length > 0) {
      const collisionResult = applyLostSoulCollisionCorrection(
        { mesh: { position: newPosition }, config: this.config }, 
        collidableObjects, 
        targetPosition
      );
      
      if (collisionResult.corrected) {
        // Se colidiu durante dash, termina o dash e desvia
        this.isDashing = false;
        this.dashCooldown = this.config.dashInterval * 0.5;
        
        if (collisionResult.newDirection) {
          this.dashDirection.copy(collisionResult.newDirection);
          const correctedVelocity = collisionResult.newDirection.multiplyScalar(this.config.speed);
          this.mesh.position.addScaledVector(correctedVelocity, delta);
        }
        return correctedVelocity || new THREE.Vector3();
      }
    }
    
    // Aplica movimento de dash
    this.mesh.position.copy(newPosition);
    this.velocity.copy(dashVelocity);
    
    return dashVelocity;
  }
  
  executeNormalMovement(targetPosition, delta, collidableObjects = []) {
    // Verifica colisão primeiro
    this.performCollisionCheck(targetPosition, collidableObjects, delta);
    
    // Calcula movimento final otimizado
    const finalVelocity = this.calculateFinalMovement(targetPosition, delta);
    
    // Aplica movimento
    this.mesh.position.addScaledVector(finalVelocity, delta);
    
    return finalVelocity;
  }

  idleBehavior(delta) {
    this.idleBehavior6DOF(delta);
  }

  idleBehavior6DOF(delta) {
    if (!this.idleInitialized) {
      this.idleInitialized = true;
      this.baseX = this.mesh.position.x;
      this.baseY = this.mesh.position.y;
      this.baseZ = this.mesh.position.z;
      this.timeOffset = Math.random() * Math.PI * 2;
    }
    
    const time = Date.now() * 0.001;
    
    // Movimento flutuante suave com variação individual
    const floatAmplitude = 0.15 + Math.sin(this.timeOffset) * 0.05;
    this.mesh.position.x = this.baseX + Math.sin(time * 1.2 + this.timeOffset) * floatAmplitude;
    this.mesh.position.y = this.baseY + Math.sin(time * 0.8 + this.timeOffset * 1.3) * floatAmplitude * 0.7;
    this.mesh.position.z = this.baseZ + Math.cos(time * 1.1 + this.timeOffset * 0.8) * floatAmplitude;
    
    // Rotação suave do crânio durante idle
    if (this.skullModel) {
      this.skullModel.rotation.x = Math.sin(time * 0.6 + this.timeOffset) * 0.04;
      this.skullModel.rotation.y = Math.cos(time * 0.4 + this.timeOffset) * 0.08;
      this.skullModel.rotation.z = Math.sin(time * 0.7 + this.timeOffset) * 0.02;
    }
    
    // Atualiza posição de referência gradualmente para evitar drift
    const driftCorrection = 0.001;
    this.baseX = THREE.MathUtils.lerp(this.baseX, this.mesh.position.x, driftCorrection);
    this.baseY = THREE.MathUtils.lerp(this.baseY, this.mesh.position.y, driftCorrection);
    this.baseZ = THREE.MathUtils.lerp(this.baseZ, this.mesh.position.z, driftCorrection);
  }

  onDeath() {
    // Call parent death method which handles the fade animation
    super.onDeath();
  }

  checkPlayerCollision(targetPosition) {
    const distanceToPlayer = this.mesh.position.distanceTo(targetPosition);
    
    // Colisão mais precisa usando raio dinâmico
    const effectiveRadius = this.isDashing ? 
      this.config.collisionRadius * 1.2 : // Maior durante dash
      this.config.collisionRadius;
    
    if (distanceToPlayer <= effectiveRadius) {
      this.dealDamageToPlayer(this.config.kamikazeDamage);
      this.createExplosionEffect();
      this.currentHealth = 0;
      this.isAlive = false;
      this.onDeath();
      
      return true;
    }
    
    return false;
  }
  
  dealDamageToPlayer(damage) {
    if (typeof window.playerTakeDamage === 'function') {
      window.playerTakeDamage(damage);
    } else {
      console.warn('[KAMIKAZE] Player damage system not available!');
    }
 }

  update(delta, camera, targetPosition, collidableObjects = []) {
    // Call parent update which handles death fade animation
    super.update(delta, camera, targetPosition, collidableObjects);
    
    // Only process Lost Soul specific behavior if alive and not dying
    if (!this.isAlive || this.isDying) return;
    
    // Sistema de movimento otimizado
    this.updateDash(delta, targetPosition, collidableObjects);
    const currentVelocity = this.executeMovement(targetPosition, delta, collidableObjects);
    
    // Atualiza orientação baseada na velocidade atual
    this.orientSkull(targetPosition);
    this.updateBoundingBox();
    
    // Verifica colisão com player (sempre ativo)
    this.checkPlayerCollision(targetPosition);
    
    // Atualiza health bar
    if (this.healthBarGroup && camera) {
      this.healthBarGroup.lookAt(camera.position);
    }
  }

  dispose() {
    super.dispose();
  }

  createExplosionEffect() {
    if (!this.mesh || !this.mesh.parent) return;
    
    // Efeito de explosão mais elaborado
    const particleCount = 8;
    const colors = [0xff4444, 0xff6666, 0xff8888, 0xffaaaa];
    
    for (let i = 0; i < particleCount; i++) {
      const particleSize = 0.08 + Math.random() * 0.06;
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(particleSize, 6, 6),
        new THREE.MeshBasicMaterial({ 
          color: colors[Math.floor(Math.random() * colors.length)],
          transparent: true,
          opacity: 0.9
        })
      );
      
      particle.position.copy(this.mesh.position);
      
      // Direção aleatória mais variada
      const phi = Math.random() * Math.PI * 2;
      const cosTheta = Math.random() * 2 - 1;
      const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
      
      const direction = new THREE.Vector3(
        sinTheta * Math.cos(phi),
        cosTheta,
        sinTheta * Math.sin(phi)
      );
      
      const speed = 2 + Math.random() * 4;
      direction.multiplyScalar(speed);
      
      this.mesh.parent.add(particle);
      
      // Animação melhorada das partículas
      let life = 1.0;
      let initialScale = 1.0;
      const animateParticle = () => {
        if (life > 0) {
          // Movimento com gravidade sutil
          direction.y -= 0.01;
          particle.position.addScaledVector(direction, 0.016);
          
          // Fade e scaling
          life -= 0.016 * (2 + Math.random());
          particle.material.opacity = life * 0.9;
          
          // Escala variável
          const scale = initialScale * (0.5 + life * 0.5);
          particle.scale.setScalar(scale);
          
          requestAnimationFrame(animateParticle);
        } else {
          if (particle.parent) particle.parent.remove(particle);
          particle.geometry.dispose();
          particle.material.dispose();
        }
      };
      animateParticle();
    }
    
    // Efeito de flash adicional
    this.createFlashEffect();
  }
  
  createFlashEffect() {
    if (!this.mesh || !this.mesh.parent) return;
    
    // Cria um flash rápido na posição da explosão
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(2.0, 12, 12),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6
      })
    );
    
    flash.position.copy(this.mesh.position);
    this.mesh.parent.add(flash);
    
    // Anima o flash
    let flashLife = 1.0;
    const animateFlash = () => {
      if (flashLife > 0) {
        flashLife -= 0.033; // ~30fps fade
        flash.material.opacity = flashLife * 0.6;
        flash.scale.setScalar(1 + (1 - flashLife) * 2);
        requestAnimationFrame(animateFlash);
      } else {
        if (flash.parent) flash.parent.remove(flash);
        flash.geometry.dispose();
        flash.material.dispose();
      }
    };
    animateFlash();
  }
}
