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
      maxHealth: 50,               // 50 HP como no DOOM2
      damage: 8,                   // Dano do projétil
      projectileSpeed: 15,         // Velocidade do projétil
      attackRange: 20,             // Alcance de ataque
      attackCooldown: 2.0,         // Tempo entre ataques
      isFlying: true,              // Flutua como no DOOM
      radius: 1.2,                 // Tamanho do hitbox
      color: 0xcc0000,             // Vermelho mais escuro
      ...defaultConfig,
      ...config
    };

    super(position, doom2Config);

    // Configurações de detecção
    this.detection.fovAngle = Math.PI / 1.5; // 120 graus
    this.detection.maxDistance = 25;
    
    // Projéteis
    this.activeProjectiles = [];
    this.lastAttackTime = 0;
    
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
    // Call base class attack if it exists
    if (super.attack) {
      super.attack(targetPosition);
    }

    // Cacodemon-specific behavior
    if (this.modelLoaded) {
      this.model.rotation.x = Math.PI / 4;
    }
    
    this.fireProjectile(targetPosition);
    
    if (this.audio) {
      this.audio.playAttackSound('cacodemon_attack');
    }
    
    this.lastAttackTime = now;
  } catch (error) {
    console.error('Cacodemon attack error:', error);
  }
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

  // 1. Atualiza componentes básicos
  this.audio.updateProximity(camera?.position);
  this.healthBar.update(camera);
  this.collision.updateBoundingBox();

  // 2. Atualiza projéteis
  this.updateProjectiles(delta, collidableObjects, camera);
  
  // 3. Comportamento de IA
  this.ai.update(delta, targetPosition, collidableObjects);
  
  // 4. Orientação durante o ataque
  if (this.ai.state === 'ATTACK' && this.modelLoaded) {
    this.movement.orientToTarget(this.model, targetPosition, {
      smoothRotation: true,
      rotationSpeed: 10.0
    });
  }
  
  // 5. Flutuação suave ajustada (alterações aqui)
  const currentPosition = this.mesh.position;
  const baseHeight = this.spawnPosition?.y ?? currentPosition.y;
  
  // Parâmetros ajustáveis para a flutuação
  const floatSpeed = 0.5;    // Reduz a velocidade da oscilação
  const floatAmount = 0.1;   // Reduz a amplitude do movimento
  const smoothFactor = 0.1;  // Adiciona suavização
  
  // Cálculo da flutuação suavizada
  const targetFloat = Math.sin(Date.now() * 0.001 * floatSpeed) * floatAmount;
  const currentFloat = currentPosition.y - baseHeight;
  const newFloat = currentFloat + (targetFloat - currentFloat) * smoothFactor;
  
  currentPosition.y = baseHeight + newFloat;
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
