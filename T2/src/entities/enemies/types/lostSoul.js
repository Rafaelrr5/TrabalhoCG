import * as THREE from '../../../../../build/three.module.js';
import { Enemy } from '../base/enemies.js';
import { loadSkullModel, preloadSkullModel } from '../../../utils/skullLoader.js';
import { getLostSoulConfig } from '../config/enemyConfig.js';

export class LostSoul extends Enemy {
  constructor(position = [0, 0, 0], config = {}) {
    const baseConfig = {
      ...getLostSoulConfig(),
      // Configurações específicas
      heightAdjustSpeed: 2.0,     // Velocidade de ajuste de altura
      minHeightAboveGround: 1.0,  // Altura mínima sobre o chão
      maxHeightAboveGround: 5.0,  // Altura máxima sobre o chão
      preferredHeightOffset: 0.5, // Offset em relação à altura do jogador
      chargeSpeed: 15.0, //velocidade durante a carga
      chargeDuration: 2.0, //duração da carga em segundos
      cooldownDuration: 2.0, //tempo de recarga após a carga
      wanderSpeed: 3.0, //velocidade ao vagar
      detectionRange: 20.0, //distância para detectar o jogador
      isFlying: true, //indica que voa
      skullScale: 1.2,
      ...config
    };
    
    super(position, baseConfig);
    this.detection.fovAngle = Math.PI / 2; // 180 graus
    this.detection.maxDistance = baseConfig.detectionRange;

    //estado específico
    this.targetHeight = position[1]; // Altura inicial
    this.lastHeightAdjustTime = 0;
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

    // Atualiza a altura alvo baseado na posição do jogador
    this.updateTargetHeight(targetPosition);
    
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
      this.executeCharge(delta, targetPosition, collidableObjects);
    } else if (!this.isOnCooldown && canSeePlayer && distanceToPlayer < this.config.detectionRange) {
      this.startCharge(targetPosition);
    } else {
      this.wander(delta, collidableObjects);
    }
    
    // Atualiza componentes visuais/auditivos
    this.audio.updateProximity(camera?.position);
    this.healthBar.update(camera);
    this.collision.updateBoundingBox();
  }

   updateTargetHeight(targetPosition) {
  const now = Date.now();
  // Atualiza mais frequentemente para resposta mais imediata
  if (now - this.lastHeightAdjustTime > 300) { // A cada 300ms
    this.lastHeightAdjustTime = now;
    
    // Usa a altura do alvo diretamente (jogador/câmera)
    this.targetHeight = targetPosition.y;
    
    // Aplica um pequeno offset aleatório para parecer mais natural
    const randomOffset = (Math.random() - 0.5) * 0.5; // Entre -0.25 e +0.25
    this.targetHeight += randomOffset;
    
    // Limita a altura dentro dos limites configurados
    this.targetHeight = Math.max(
      this.config.minHeightAboveGround,
      Math.min(this.config.maxHeightAboveGround, this.targetHeight)
    );
  }
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
  }

  executeCharge(delta, targetPosition, collidableObjects) {
  // Direção completa (incluindo vertical)
  this.chargeDirection = new THREE.Vector3()
    .subVectors(targetPosition, this.mesh.position)
    .normalize();
  
  // Ajuste de altura mais agressivo durante o ataque
  const heightDifference = this.targetHeight - this.mesh.position.y;
  const verticalAdjustment = heightDifference * this.config.heightAdjustSpeed * delta;
  
  // Combina movimento de carga com ajuste vertical
  const moveDirection = new THREE.Vector3(
    this.chargeDirection.x,
    this.chargeDirection.y + verticalAdjustment,
    this.chargeDirection.z
  ).normalize();
  
  const moveOptions = {
    delta: delta,
    speedMultiplier: this.config.chargeSpeed / this.config.speed,
    collidableObjects: collidableObjects,
    use6DOF: true // Importante para movimento 3D
  };
  
  // Cria um ponto à frente na direção do movimento
  const chargeTarget = new THREE.Vector3(
    this.mesh.position.x + moveDirection.x * 10,
    this.mesh.position.y + moveDirection.y * 10,
    this.mesh.position.z + moveDirection.z * 10
  );
  
  this.moveTowards(chargeTarget, moveOptions);
  
  // Rotação mais dinâmica incluindo componente vertical
  const targetQuat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    moveDirection.clone().normalize()
  );
  this.mesh.quaternion.slerp(targetQuat, 0.3); // Mais rápido durante o ataque
}


  endCharge() {
    this.isCharging = false;
    this.isOnCooldown = true;
    this.cooldownTime = 0;
    this.chargeTime = 0;
  }

   wander(delta, collidableObjects) {
  // Muda de direção periodicamente com mais variação vertical
  if (Math.random() < 0.02 * delta * 60) {
    this.wanderDirection = new THREE.Vector3(
      Math.random() - 0.5,
      (Math.random() - 0.5) * 0.7, // Mais variação vertical
      Math.random() - 0.5
    ).normalize();
  }
  
  // Ajuste de altura suave durante o wander
  const heightDifference = this.targetHeight - this.mesh.position.y;
  const verticalAdjustment = heightDifference * this.config.heightAdjustSpeed * delta * 0.3;
  
  // Combina movimento errático com ajuste de altura
  const targetPosition = new THREE.Vector3(
    this.mesh.position.x + this.wanderDirection.x * 3,
    this.mesh.position.y + this.wanderDirection.y + verticalAdjustment,
    this.mesh.position.z + this.wanderDirection.z * 3
  );
  
  const moveOptions = {
    delta: delta,
    speedMultiplier: this.config.wanderSpeed / this.config.speed,
    collidableObjects: collidableObjects,
    use6DOF: true
  };
  
  this.moveTowards(targetPosition, moveOptions);
  
  // Rotação suave incluindo componente vertical reduzida
  if (this.wanderDirection.length() > 0.1) {
    const smoothedDirection = new THREE.Vector3(
      this.wanderDirection.x,
      this.wanderDirection.y * 0.3, // Reduz influência vertical na rotação
      this.wanderDirection.z
    ).normalize();
    
    const targetQuat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      smoothedDirection
    );
    this.mesh.quaternion.slerp(targetQuat, 0.1);
  }
}

  attack(targetPosition) {
    // Sobrescreve o método de ataque padrão para usar o comportamento de carga
    if (!this.isCharging && !this.isOnCooldown) {
      this.startCharge(targetPosition);
    }
  }
}
