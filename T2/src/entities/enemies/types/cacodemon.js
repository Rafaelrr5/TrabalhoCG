import * as THREE from '../../../../../build/three.module.js';
import { loadGLTFModel } from '../../../utils/modelLoader.js';
import { Enemy } from '../base/enemies.js';
import { getCacodeemonConfig } from '../config/enemyConfig.js';
import { CacodeemonProjectile } from '../systems/cacodeemonProjectile.js';

export class Cacodemon extends Enemy {
  constructor(position = [0, 0, 0], config = {}) {
    const defaultConfig = getCacodeemonConfig(config.difficulty || 'normal');
    
    // Configurações específicas do DOOM2
    const doom2Config = {
      maxHealth: 50,
      damage: 8,
      projectileSpeed: 15,
      attackRange: 20,
      attackCooldown: 2.0,
      isFlying: true,
      radius: 1.2,
      collisionRadius: 1.5,
      speed: 3.0, // Velocidade base para todos os movimentos
      color: 0xcc0000,
      ...defaultConfig,
      ...config
    };

    super(position, doom2Config);

    // Configurações de detecção
    this.detection.fovAngle = Math.PI; // 180 graus (anterior era 270)
    this.detection.maxDistance = 30.0; // Reduzido de 40 para melhor performance
    this.detection.detectionCooldown = 500; // Mais reativo
    
    // Projéteis
    this.activeProjectiles = [];
    this.lastAttackTime = 0;
    
    // Movimento de ataque
    this.attackMovementDirection = new THREE.Vector3();
    this.attackMovementTarget = null;
    this.attackMovementTime = 0;
    this.attackMovementDuration = 0.5;
    
    // Modelo e placeholder
    this.model = null;
    this.modelLoaded = false;
    this.placeholderMesh = null;

    this.attack = this.attack.bind(this);
    this.loadModel();
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

 attack(targetPosition) {
    if (!this.isAlive || this.isDying) return;
    
    const now = Date.now() / 1000;
    if (now - this.lastAttackTime < this.config.attackCooldown) return;

    try {
        if (super.attack) {
            super.attack(targetPosition);
        }
        
        this.fireProjectile(targetPosition);
        this.applyRandomAttackMovement();
        
        if (this.audio) {
            this.audio.playAttackSound('cacodemon_attack');
        }
        
        this.lastAttackTime = now;
    } catch (error) {
        console.error('Cacodemon attack error:', error);
    }
}

 applyRandomAttackMovement() {
    // Movimento mais suave e menos extremo
    const randomY = Math.min((Math.random() - 0.5) * 0.3, 0.2);
    
    this.attackMovementDirection.set(
        (Math.random() - 0.5) * 1.5, // Reduzido de 2 para 1.5
        randomY,
        (Math.random() - 0.5) * 1.5
    ).normalize();
    
    // Distância menor para o alvo
    this.attackMovementTarget = this.mesh.position.clone().add(
        this.attackMovementDirection.clone().multiplyScalar(5) // Reduzido de 10 para 5
    );
    
    // Duração menor do movimento
    this.attackMovementDuration = 1.0; // Reduzido de 2.0
    this.attackMovementTime = this.attackMovementDuration;
}

  fireProjectile(targetPosition) {
    if (!this.mesh.parent) return; // Precisa estar na cena
    
    const startPosition = this.mesh.position.clone();
    const direction = new THREE.Vector3().subVectors(targetPosition, startPosition).normalize();
    
    // Ajusta a posição inicial para sair da "boca" do Cacodemon
    startPosition.add(direction.clone().multiplyScalar(this.config.radius));
    
    const projectileConfig = {
      speed: this.config.projectileSpeed,
      damage: this.config.damage,
      radius: 0.3,
      color: 0xffcc00, // Amarelo como no DOOM
      maxDistance: 50
    };
    
    const projectile = new CacodeemonProjectile(startPosition, direction, projectileConfig);
    this.mesh.parent.add(projectile.mesh);
    this.activeProjectiles.push(projectile);
  }

 update(delta, camera, targetPosition, collidableObjects = []) {
    if (this.isDying) {
        this.deathEffects.update();
        return;
    }

    if (!this.isAlive) return;

    // Atualiza detecção - só considera visível se passar por todos os checks
    const isPlayerVisible = this.checkPlayerVisibility(targetPosition, collidableObjects);
    
    // Atualiza componentes básicos
    this.audio.updateProximity(camera?.position);
    this.healthBar.update(camera);
    this.collision.updateBoundingBox();

    // Atualiza projéteis
    this.updateProjectiles(delta, collidableObjects, camera);
    
    // Configurações de movimento
    const moveOptions = {
        delta: delta,
        enableCollision: true,
        collidableObjects: collidableObjects,
        use6DOF: this.config.isFlying
    };

    // Só ataca se o jogador estiver visível
    if (isPlayerVisible) {
        // Movimento de ataque
        if (this.attackMovementTime > 0) {
            moveOptions.speedMultiplier = 2.0;
            this.moveTowards(this.attackMovementTarget, moveOptions);
            this.attackMovementTime -= delta;
        } 
        
        // Ataque normal
        if (this.attackMovementTime <= 0 || Math.random() < 0.3) {
            this.ai.update(delta, targetPosition, collidableObjects);
        }

        // Rotação para olhar para o alvo
        const direction = new THREE.Vector3().subVectors(targetPosition, this.mesh.position).normalize();
        const targetAngle = Math.atan2(direction.x, direction.z);
        this.mesh.rotation.set(0, targetAngle, 0);
    } else {
        // Comportamento quando não vê o jogador
        this.ai.update(delta, targetPosition, collidableObjects);
    }
    
    // Flutuação suave
    const floatAmount = Math.sin(Date.now() * 0.001) * 0.05;
    this.mesh.position.x += floatAmount;
    this.mesh.position.z += floatAmount * 0.5;
    
    // Correção de colisão
    if (collidableObjects.length > 0) {
        this.collision.preventOverlap(collidableObjects, delta);
    }

    // Limite de altura
    this.mesh.position.y = Math.min(this.mesh.position.y, 20.0);
}

  updateProjectiles(delta, collidableObjects, camera) {
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const projectile = this.activeProjectiles[i];
      
      if (!projectile.update(delta, collidableObjects, camera)) {
        // Remove projéteis inativos
        if (projectile.mesh.parent) {
          projectile.mesh.parent.remove(projectile.mesh);
        }
        this.activeProjectiles.splice(i, 1);
      }
    }
  }


   dispose() {
    // Limpa projéteis
    this.activeProjectiles.forEach(projectile => {
      if (projectile.mesh.parent) {
        projectile.mesh.parent.remove(projectile.mesh);
      }
      projectile.destroy();
    });
    this.activeProjectiles = [];
    
    // Limpa modelo e placeholder
    if (this.model) {
      this.model.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
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
}
