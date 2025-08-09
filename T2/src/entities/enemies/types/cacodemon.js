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
    this.detection.fovAngle = Math.PI / 1.5;
    this.detection.maxDistance = 25;
    
    // Projéteis
    this.activeProjectiles = [];
    this.lastAttackTime = 0;
    
    // Movimento de ataque
    this.attackMovementDirection = new THREE.Vector3();
    this.attackMovementTarget = null;
    this.attackMovementTime = 0;
    this.attackMovementDuration = 2.0;
    
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

      if (this.modelLoaded) {
        this.model.rotation.x = Math.PI / 4;
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
    // Gera uma direção aleatória (com pequeno componente vertical)
    this.attackMovementDirection.set(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 2
    ).normalize();
    
    // Define um alvo temporário na direção do movimento
    this.attackMovementTarget = this.mesh.position.clone().add(
      this.attackMovementDirection.clone().multiplyScalar(10)
    );
    
    // Reinicia o temporizador do movimento
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

    // Atualiza componentes básicos
    this.audio.updateProximity(camera?.position);
    this.healthBar.update(camera);
    this.collision.updateBoundingBox();

    // Atualiza projéteis
    this.updateProjectiles(delta, collidableObjects, camera);
    
    // Configurações comuns para todos os movimentos
    const moveOptions = {
      delta: delta,
      enableCollision: true,
      collidableObjects: collidableObjects,
      use6DOF: this.config.isFlying
    };

    // Movimento de ataque
    if (this.attackMovementTime > 0) {
      moveOptions.speedMultiplier = 2.0; // Velocidade aumentada durante ataque
      this.moveTowards(this.attackMovementTarget, moveOptions);
      this.attackMovementTime -= delta;
      
      // Rotação suave durante ataque
      if (this.attackMovementDirection.length() > 0.1) {
        const targetQuat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          this.attackMovementDirection.clone().normalize()
        );
        this.mesh.quaternion.slerp(targetQuat, 0.2);
      }
    } 
    // Movimento normal (IA)
    else {
      this.ai.update(delta, targetPosition, collidableObjects);
    }
    
    // Flutuação suave (ajuste vertical independente)
    const currentPosition = this.mesh.position;
    const baseHeight = this.spawnPosition?.y ?? currentPosition.y;
    const floatHeight = Math.sin(Date.now() * 0.001 * 0.5) * 0.1;
    currentPosition.y = baseHeight + floatHeight;
    
    // Correção final de colisão
    if (collidableObjects.length > 0) {
      this.collision.preventOverlap(collidableObjects, delta);
    }
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
