import * as THREE from '../../../../../build/three.module.js';
import { loadGLTFModel } from '../../../utils/modelLoader.js';
import { Enemy } from '../base/enemies.js';
import { getCacodeemonConfig } from '../config/enemyConfig.js';
import { LostSoul } from './lostSoul.js';
import {enemies} from '../enemy.js'

export class PainElemental extends Enemy {
  constructor(position = [0, 0, 0], config = {}) {
    const defaultConfig = {
      ...getCacodeemonConfig(config.difficulty || 'normal'),
      maxHealth: 100,
      isFlying: true,
      radius: 4.0,
      collisionRadius: 4.5,
      speed: 2.5,
      color: 0x9933cc,
      maxSpawnedSouls: 5, // Máximo de LostSouls que podem ser spawnadas
      spawnCooldown: 3.0, // Tempo entre spawns
      ...config
    };

    super(position, defaultConfig);

    // Configurações de detecção
    this.detection.fovAngle = Math.PI; // 180 graus
    this.detection.maxDistance = 30.0;
    this.detection.detectionCooldown = 500;

    // Controle de spawn de LostSouls
    this.spawnedSouls = 0; // Contador NÃO diminui quando uma LostSoul morre
    this.lastSpawnTime = 0;
    this.spawnedSoulsList = []; // Lista opcional (se quiser rastrear as almas)
    
    // Movimento
    this.attackMovementDirection = new THREE.Vector3();
    this.attackMovementTarget = null;
    this.attackMovementTime = 0;
    this.attackMovementDuration = 0.5;
    
    // Modelo
    this.model = null;
    this.modelLoaded = false;
    this.placeholderMesh = null;

    this.attack = this.attack.bind(this);
    this.loadModel();
  }

async loadModel() {
  try {
    const modelConfig = {
      scale: 0.5,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: -1 * (Math.PI/2), z: 0 },
      pivotAtCenter: true,
      castShadow: true,
      receiveShadow: true,
      materialConfig: {
        transparent: false,
        opacity: 1.0,
        visible: true,
        side: THREE.DoubleSide,
        map: await this.loadTexture('../../../../0_assetsT3/objects/pain/textures/pain_elemental_toy_diffuse.png'),
        normalMap: await this.loadTexture('../../../../0_assetsT3/objects/pain/textures/pain_elemental_toy_normal.png'),
        displacementMap: await this.loadTexture('../../../../0_assetsT3/objects/pain/textures/pain_elemental_toy_specularGlossiness.png'),
        displacementScale: 0.1
      },
      fallback: {
        type: 'sphere',
        radius: this.config.radius,
        color: this.config.color
      }
    };

    this.removePlaceholder();
    
    // Caminho corrigido para o modelo GLB
    this.model = await loadGLTFModel('../../../../0_assetsT3/objects/pain/painElemental.glb', modelConfig);
    
    this.mesh.add(this.model);
    this.modelLoaded = true;

    this.model.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.transparent = true;
        child.material.needsUpdate = true;
      }
    });

    // Ajuste da barra de vida após carregar o modelo
    if (this.healthBar && this.healthBar.healthBarGroup) {
      // Aumenta a altura da barra proporcionalmente ao aumento do modelo
      this.healthBar.healthBarGroup.position.y = this.config.radius * 3.5; // Ajuste este valor conforme necessário
  
      // Opcional: Aumentar o tamanho da barra também
      this.healthBar.healthBarGroup.scale.set(2.0, 1.5, 2.0); // Ajuste a escala conforme necessário
    }
    
  } catch (error) {
    console.error('Failed to load Pain Elemental GLB model:', error);
    this.createPlaceholderGeometry();
    this.modelLoaded = false;
  }
}

  async loadTexture(path) {
    const loader = new THREE.TextureLoader();
    return new Promise((resolve, reject) => {
      loader.load(
        path,
        texture => resolve(texture),
        undefined,
        error => reject(error)
      );
    });
  }

  removePlaceholder() {
    if (this.placeholderMesh) {
      this.mesh.remove(this.placeholderMesh);
      this.placeholderMesh.geometry.dispose();
      this.placeholderMesh.material.dispose();
      this.placeholderMesh = null;
    }
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
  }

attack(targetPosition) {
  if (!this.isAlive || this.isDying) return;

  const now = Date.now() / 1000;
  if (now - this.lastSpawnTime < this.config.spawnCooldown) return;

  // Se já spawnou o máximo de LostSouls, retorna sem fazer nada
  if (this.spawnedSouls >= this.config.maxSpawnedSouls) {
    return; // Mudei de chamar this.ai.update para apenas retornar
  }

  try {
    if (super.attack) {
      super.attack(targetPosition);
    }

    this.spawnLostSoul(targetPosition);
    this.applyRandomAttackMovement();

    if (this.audio) {
      this.audio.playAttackSound('pain_elemental_attack');
    }

    this.lastSpawnTime = now;
  } catch (error) {
    console.error('Pain Elemental attack error:', error);
  }
}

spawnLostSoul(targetPosition) {
  if (!this.mesh.parent) return;

  const direction = new THREE.Vector3()
    .subVectors(targetPosition, this.mesh.position)
    .normalize();
  
  const spawnPosition = this.mesh.position.clone()
    .add(direction.clone().multiplyScalar(this.config.radius * 1.5));
  
  const lostSoul = new LostSoul(
    [spawnPosition.x, spawnPosition.y, spawnPosition.z],
    { 
      isSpawned: true,
      spawner: this,
      alwaysActive: true,
      detection: { 
        hasSeenPlayer: true,
        lastSeenTime: Date.now(),
        fovAngle: Math.PI / 2,
        maxDistance: 40.0
      },
      ai: {
        initialState: 'PATROL'
      }
    }
  );
  
  lostSoul.ai.changeState('PATROL');
  lostSoul.detection.hasSeenPlayer = true;
  
  if (lostSoul.startCharge) {
    lostSoul.startCharge(targetPosition);
  }
  
  this.mesh.parent.add(lostSoul.mesh);
  this.spawnedSouls++;
  this.spawnedSoulsList.push(lostSoul);
  
  // ADICIONE A LOST SOUL AO GERENCIADOR PRINCIPAL DE INIMIGOS
  enemies.push(lostSoul); // <-- ADICIONE ESTA LINHA

  return lostSoul;
}

forceUpdateSpawnedSouls() {
  this.spawnedSoulsList.forEach(soul => {
    soul.detection.hasSeenPlayer = true;
    if (soul.ai.state === 'IDLE') {
      soul.ai.changeState('PATROL');
    }
  });
}

  applyRandomAttackMovement() {
    const randomY = (Math.random() - 0.5) * 0.5;
    
    this.attackMovementDirection.set(
      (Math.random() - 0.5) * 1.0,
      randomY,
      (Math.random() - 0.5) * 1.0
    ).normalize();
    
    const movementDistance = 8 + Math.random() * 4;
    
    this.attackMovementTarget = this.mesh.position.clone().add(
      this.attackMovementDirection.clone().multiplyScalar(movementDistance)
    );
    
    this.attackMovementDuration = 1.5 + Math.random() * 0.5;
    this.attackMovementTime = this.attackMovementDuration;
  }

  takeDamage(damage) {
  if (!this.isAlive || this.isDying) return false;

  this.currentHealth -= damage;
  this.emit('damaged', { enemy: this, damage });

  if (this.currentHealth <= 0) {
    this.currentHealth = 0;
    this.isAlive = false;
    this.isDying = true;
    this.deathEffects.start(); // Força o início da animação de morte
    this.emit('death', { enemy: this });
    return true;
  }
  return false;
}

  update(delta, camera, targetPosition, collidableObjects = []) {
    if (this.isDying) {
    this.deathEffects.update(); // Garante que a animação de morte continue
    return; // Ignora o resto da lógica de movimento, etc.
    }

  if (!this.isAlive) return;

    if (!this.isAlive) return;

    // Update detection
    const isPlayerVisible = this.checkPlayerVisibility(targetPosition, collidableObjects);
    
    // Update basic components
    this.audio.updateProximity(camera?.position);
    this.healthBar.update(camera);
    this.collision.updateBoundingBox();

    // Movement options
    const moveOptions = {
      delta: delta,
      enableCollision: true,
      collidableObjects: collidableObjects,
      use6DOF: this.config.isFlying
    };

    // Only attack if player is visible and we haven't spawned max souls
    if (isPlayerVisible && this.spawnedSouls < this.config.maxSpawnedSouls) {
      // Attack movement
      if (this.attackMovementTime > 0) {
        moveOptions.speedMultiplier = 2.0;
        this.moveTowards(this.attackMovementTarget, moveOptions);
        this.attackMovementTime -= delta;
      } 
    else {
        this.ai.update(delta, targetPosition, collidableObjects);
    }
      // Normal attack
      if (this.attackMovementTime <= 0 || Math.random() < 0.3) {
        this.ai.update(delta, targetPosition, collidableObjects);
      }

      // Rotate to face target
      const direction = new THREE.Vector3()
        .subVectors(targetPosition, this.mesh.position)
        .normalize();
      const targetAngle = Math.atan2(direction.x, direction.z);
      this.mesh.rotation.set(0, targetAngle, 0);
    } else {
      // Behavior when not seeing player or can't spawn more souls
      this.ai.update(delta, targetPosition, collidableObjects);
    }
    
    // Gentle floating motion
    const floatAmount = Math.sin(Date.now() * 0.001) * 0.05;
    this.mesh.position.x += floatAmount;
    this.mesh.position.z += floatAmount * 0.5;
    
    // Collision correction
    if (collidableObjects.length > 0) {
      this.collision.preventOverlap(collidableObjects, delta);
    }

    const MIN_HEIGHT = 2.3; // Defina a altura mínima de voo desejada
    const MAX_HEIGHT = 20.0; // Altura máxima de voo

    this.mesh.position.y = Math.max(MIN_HEIGHT, this.mesh.position.y); // Impede de atravessar o chão
    this.mesh.position.y = Math.min(this.mesh.position.y, MAX_HEIGHT); // Impede de voar muito alto
  }

  dispose() {
    
    // Clean up model and placeholder
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