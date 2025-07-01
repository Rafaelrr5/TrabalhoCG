import * as THREE from '../../../../../build/three.module.js';
import { Enemy } from '../base/enemies.js';
import { loadSkullModel, preloadSkullModel, applyScaleWithFixedPivot } from '../../../utils/skullLoader.js';
import { isPlayerInArea1 } from '../../../systems/environment.js';
import { checkLostSoulCollision, applyLostSoulCollisionCorrection } from '../../../systems/collision.js';
import { CONFIG } from '../../../core/config.js';

/**
 * Lost Soul enemy - Kamikaze attacker that dashes at player
 */
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
      
      // Precarregar o modelo (opcional, para performance)
      await preloadSkullModel();
      
      // Carregar o modelo original
      const loadedModel = await loadSkullModel();
      
      // Criar um grupo wrapper para controlar o pivot point
      const skullWrapper = new THREE.Group();
      
      // Clone model with unique materials
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
      const size = box.getSize(new THREE.Vector3());
      
      // Mover o modelo carregado para que seu centro fique na origem do grupo
      clonedModel.position.sub(center);
      
      // Adicionar o modelo ao grupo
      skullWrapper.add(clonedModel);
      
      // Aplicar configurações iniciais ao grupo (agora centralizado)
      skullWrapper.rotation.set(
        Math.PI / 2, // rotação X padrão
        this.config.skullYRotationOffset,
        this.config.skullZRotationOffset
      );
      skullWrapper.scale.setScalar(this.config.skullScale);
      
      // Habilitar sombras
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

  moveTowards6DOF(targetPosition, delta, collidableObjects = []) {
    if (!this.isAlive || this.isDashing) return;

    const distanceToTarget = this.mesh.position.distanceTo(targetPosition);
    const direction = new THREE.Vector3()
      .subVectors(targetPosition, this.mesh.position)
      .normalize();
    
    // Adjust speed based on distance
    const speedMultiplier = distanceToTarget > 15.0 ? 1.0 : 
                           distanceToTarget > 8.0 ? 1.2 : 0.5;
    
    this.velocity.copy(direction).multiplyScalar(this.config.speed * speedMultiplier);
    
    // Apply collision detection if enabled
    if (CONFIG.LOST_SOUL_ENABLE_COLLISION && collidableObjects.length > 0) {
      const intendedPosition = this.mesh.position.clone()
        .addScaledVector(this.velocity, delta);
      
      const collision = checkLostSoulCollision(
        this.mesh.position, 
        intendedPosition, 
        collidableObjects, 
        CONFIG.LOST_SOUL_COLLISION_RADIUS
      );
      
      if (collision.hasCollision && collision.distance < CONFIG.LOST_SOUL_COLLISION_RADIUS * 0.7) {
        const correction = applyLostSoulCollisionCorrection(this, collidableObjects, targetPosition);
        if (correction.corrected) {
          this.velocity.copy(correction.newDirection)
            .multiplyScalar(this.config.speed * CONFIG.LOST_SOUL_WALL_AVOIDANCE);
        }
      }
    }
    
    this.mesh.position.addScaledVector(this.velocity, delta);
    this.orientSkull(targetPosition);
    this.updateBoundingBox();
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
    
    const distanceToTarget = this.mesh.position.distanceTo(targetPosition);
    const DASH_TRIGGER_DISTANCE = 8.0;
    const DASH_MAX_DISTANCE = 15.0;
    
    // Start dash
    if (!this.isDashing && 
        this.timeSinceLastDash >= this.config.dashInterval &&
        distanceToTarget < DASH_MAX_DISTANCE && 
        distanceToTarget > 2.0) {
      
      this.isDashing = true;
      this.timeSinceLastDash = 0;
      this.dashDirection.subVectors(targetPosition, this.mesh.position).normalize();
      
      // Kamikaze dash log removido para limpeza do console
    }
    
    // End dash
    if (this.isDashing && this.timeSinceLastDash >= this.config.dashDuration) {
      this.isDashing = false;
      this.timeSinceLastDash = 0;
    }
    
    // Execute dash movement
    if (this.isDashing) {
      const dashVelocity = this.dashDirection.clone()
        .multiplyScalar(this.dashSpeed * 1.5);
      
      // Check collision during dash
      if (collidableObjects.length > 0) {
        const intendedPosition = this.mesh.position.clone()
          .addScaledVector(dashVelocity, delta);
        
        const collision = checkLostSoulCollision(
          this.mesh.position, 
          intendedPosition, 
          collidableObjects, 
          CONFIG.LOST_SOUL_COLLISION_RADIUS * 0.8
        );
        
        if (collision.hasCollision) {
          this.isDashing = false;
          this.timeSinceLastDash = this.config.dashInterval * 0.5;
          return;
        }
      }
      
      this.mesh.position.addScaledVector(dashVelocity, delta);
      this.checkPlayerCollision(targetPosition);
    }
  }

  moveTowards(targetPosition, delta, collidableObjects = []) {
    if (!this.isAlive || this.isDashing) return;
    this.moveTowards6DOF(targetPosition, delta, collidableObjects);
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
    
    // Gentle floating motion
    this.mesh.position.x = this.baseX + Math.sin(time * 1.2 + this.timeOffset) * 0.2;
    this.mesh.position.y = this.baseY + Math.sin(time * 1.5 + this.timeOffset) * 0.15;
    this.mesh.position.z = this.baseZ + Math.cos(time * 1.3 + this.timeOffset) * 0.15;
    
    // Gentle skull rotation
    if (this.skullModel) {
      this.skullModel.rotation.x = Math.sin(time * 0.6 + this.timeOffset) * 0.05;
      this.skullModel.rotation.y = Math.cos(time * 0.4 + this.timeOffset) * 0.1;
      this.skullModel.rotation.z = Math.sin(time * 0.7 + this.timeOffset) * 0.03;
    }
  }

  onDeath() {
    super.onDeath();
    this.deathTimer = 0;
    this.deathDuration = 2.0;
  }

  checkPlayerCollision(targetPosition) {
    if (!this.isDashing) return false;
    
    const distanceToPlayer = this.mesh.position.distanceTo(targetPosition);
    
    if (distanceToPlayer <= this.config.collisionRadius) {
      // Kamikaze hit log removido para limpeza do console
      
      this.dealDamageToPlayer(this.config.kamikazeDamage);
      this.createExplosionEffect();
      this.performKamikazeDeath();
      
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
  
  createExplosionEffect() {
    const explosionGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const explosionMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xFF4444, 
      transparent: true, 
      opacity: 0.8 
    });
    const explosionMesh = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosionMesh.position.copy(this.mesh.position);
    
    if (this.mesh.parent) {
      this.mesh.parent.add(explosionMesh);
      
      let scale = 0.1;
      let opacity = 0.8;
      const animate = () => {
        scale += 0.3;
        opacity -= 0.1;
        
        explosionMesh.scale.set(scale, scale, scale);
        explosionMaterial.opacity = opacity;
        
        if (opacity > 0) {
          requestAnimationFrame(animate);
        } else {
          if (explosionMesh?.parent) {
            explosionMesh.parent.remove(explosionMesh);
          }
          explosionGeometry.dispose();
          explosionMaterial.dispose();
        }
      };
      animate();
    }
  }
  
  performKamikazeDeath() {
    this.isAlive = false;
    this.mesh.visible = false;
    
    setTimeout(() => {
      if (this.mesh?.parent) {
        this.mesh.parent.remove(this.mesh);
      }
      this.dispose();
    }, 100);
  }

  update(delta, camera, targetPosition, collidableObjects = []) {
    if (!this.isAlive) return;
    
    this.updateDash(delta, targetPosition, collidableObjects);
    this.moveTowards(targetPosition, delta, collidableObjects);
    
    if (this.healthBarGroup && camera) {
      this.healthBarGroup.lookAt(camera.position);
    }
  }

  dispose() {
    super.dispose();
  }
}
