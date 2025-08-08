import * as THREE from '../../../../../build/three.module.js';
import { Enemy } from '../base/enemies.js';
import { loadSkullModel, preloadSkullModel } from '../../../utils/skullLoader.js';
import { getLostSoulConfig } from '../config/enemyConfig.js';

export class LostSoul extends Enemy {
  constructor(position = [0, 0, 0], config = {}) {
    const baseConfig = {
      ...getLostSoulConfig(),
      // Configurações específicas
      chargeSpeed: 15.0,
      chargeDuration: 0.5,
      cooldownDuration: 2.0,
      wanderSpeed: 3.0,
      detectionRange: 20.0,
      skullScale: 1.2,
      ...config
    };
    
    super(position, baseConfig);
    this.detection.fovAngle = Math.PI / 2; // 180 graus
    this.detection.maxDistance = baseConfig.detectionRange;

    //estado específico
    this.chargeTime = 0.0;
    this.isCharging = false;
    this.cooldownTime = 0.0;
    this.chargeDirection = new THREE.Vector3();
    this.wanderDirection = new THREE.Vector3(
      Math.random() -0.5,
      Math.random() -0.5,
      Math.random() -0.5
    ).normalize();


    this.skullModel = null;
    this.loadSkull();
  }


  async loadSkull() {
    try {
      await preloadSkullModel();
      const loadedModel = await loadSkullModel();
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

      clonedModel.rotation.set(0, 0, 0);
      clonedModel.position.sub(center);
      
      skullWrapper.add(clonedModel);
      skullWrapper.scale.setScalar(this.config.skullScale);
      
      skullWrapper.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      this.setupSkullModel(skullWrapper);
      
      if (this.healthBar && this.healthBar.healthBarGroup) {
        this.healthBar.show();
      }
    } catch (error) {
      console.warn('Failed to load Lost Soul skull model:', error);
    }
  }

  setupSkullModel(model) {
    if (!this.mesh || !this.mesh.parent) return;
    
    const parent = this.mesh.parent;
    const oldPosition = this.mesh.position.clone();
    const oldRotation = this.mesh.rotation.clone();
    
    // Preserva a barra de vida antes de remover a mesh
    let preservedHealthBar = null;
    if (this.healthBar && this.healthBar.healthBarGroup) {
      preservedHealthBar = this.healthBar.healthBarGroup;
    }
    
    parent.remove(this.mesh);
    
    const group = new THREE.Group();
    group.position.copy(oldPosition);
    group.rotation.copy(oldRotation);
    
    group.add(model);
    
    this.skullModel = model;
    
    // Re-adiciona a barra de vida preservada
    if (preservedHealthBar) {
      group.add(preservedHealthBar);
    } else if (this.healthBar) {
      // Se não existir grupo de barra de vida, tenta recriá-lo
      this.healthBar.initialize();
      if (this.healthBar.healthBarGroup) {
        group.add(this.healthBar.healthBarGroup);
      }
    }
    
    this.mesh = group;
    this.mesh.userData.enemy = this;
    this.mesh.visible = true;
    
    parent.add(this.mesh);
    this.updateBoundingBox();
  }

  update(delta, camera, targetPosition, collidableObjects) {
    if (!this.isAlive || this.isDying) return;
    
    // Atualiza temporizadores
    if (this.isCharging) {
      this.chargeTime += delta;
      if (this.chargeTime >= this.config.chargeDuration) {
        this.endCharge();
      }
    }
    
    if (this.isOnCooldown) {
      this.cooldownTime += delta;
      if (this.cooldownTime >= this.config.cooldownDuration) {
        this.isOnCooldown = false;
        this.cooldownTime = 0;
      }
    }
    
    // Verifica se pode ver o jogador
    const canSeePlayer = this.checkPlayerVisibility(targetPosition, collidableObjects);
    const distanceToPlayer = this.mesh.position.distanceTo(targetPosition);
    
    // Comportamento baseado no estado
    if (this.isCharging) {
      this.executeCharge(delta);
    } else if (!this.isOnCooldown && canSeePlayer && distanceToPlayer < this.config.detectionRange) {
      this.startCharge(targetPosition);
    } else {
      this.wander(delta);
    }
    
    // Atualiza componentes visuais/auditivos
    this.audio.updateProximity(camera?.position);
    this.healthBar.update(camera);
    this.collision.updateBoundingBox();
  }

  startCharge(targetPosition) {
    if (this.isCharging || this.isOnCooldown) return;
    
    // Calcula direção do ataque
    this.chargeDirection = new THREE.Vector3()
      .subVectors(targetPosition, this.mesh.position)
      .normalize();
    
    this.isCharging = true;
    this.chargeTime = 0;
    this.playAttackSound();
    
    // Emite evento de ataque
    this.emit('charging', {
      enemy: this,
      direction: this.chargeDirection.clone()
    });
  }

  executeCharge(delta) {
    // Move rapidamente na direção do ataque
    const moveAmount = this.config.chargeSpeed * delta;
    this.mesh.position.addScaledVector(this.chargeDirection, moveAmount);
    
    // Rotação para parecer que está "mirando" no jogador
    const targetQuat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      this.chargeDirection.clone().normalize()
    );
    this.mesh.quaternion.slerp(targetQuat, 0.2);
  }

  endCharge() {
    this.isCharging = false;
    this.isOnCooldown = true;
    this.cooldownTime = 0;
    this.chargeTime = 0;
    
    // Pequeno recuo após o ataque
    this.chargeDirection.multiplyScalar(-0.3);
  }

  wander(delta) {
    // Muda de direção periodicamente
    if (Math.random() < 0.01 * delta * 60) { // ~1% chance por frame (ajustado para delta time)
      this.wanderDirection = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
    }
    
    // Movimento errático
    const moveAmount = this.config.wanderSpeed * delta;
    this.mesh.position.addScaledVector(this.wanderDirection, moveAmount);
    
    // Rotação suave para a direção do movimento
    if (this.wanderDirection.length() > 0.1) {
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        this.wanderDirection.clone().normalize()
      );
      this.mesh.quaternion.slerp(targetQuat, 0.05);
    }
  }

  attack(targetPosition) {
    // Sobrescreve o método de ataque padrão para usar o comportamento de carga
    if (!this.isCharging && !this.isOnCooldown) {
      this.startCharge(targetPosition);
    }
  }
}
