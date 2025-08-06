import * as THREE from '../../../../../build/three.module.js';
import { CONFIG } from '../../../core/config.js';
import { SimpleEventEmitter } from '../components/SimpleEventEmitter.js';
import { EnemyAudio } from '../components/EnemyAudio.js';
import { EnemyHealthBar } from '../components/EnemyHealthBar.js';
import { EnemyMovement } from '../components/EnemyMovement.js';
import { EnemyCollision } from '../components/EnemyCollision.js';
import { EnemyDeathEffects } from '../components/EnemyDeathEffects.js';
import { EnemyIdleBehaviors } from '../components/EnemyIdleBehaviors.js';
import { player } from '../../player/player.js';
//import { EnemyAI } from './components/EnemyAI.js';

export const DEFAULT_ENEMY_CONFIG = {
  radius: 0.5,
  color: 0xff0000,
  maxHealth: 100,
  speed: 0.5,
  damage: 10,
  destroyOnHit: false,
  collisionRadius: null, // will use radius if null
  
  // Audio settings
  audio: {
    enabled: true,
    volume: 1.0,
    distances: {
      activation: 10,
      nearby: 5
    }
  },
  
  // Health bar settings
  healthBar: {
    enabled: true,
    offset: 0.3,
    width: 1.0,
    height: {
      background: 0.1,
      fill: 0.08
    }
  },
  
  // Performance settings
  performance: {
    boundingBoxUpdateInterval: 100,
    enableThrottling: true
  }
};

/**
 * Merges user config with default config
 * @param {Object} userConfig - User provided configuration
 * @returns {Object} Merged configuration
 */
export function mergeEnemyConfig(userConfig = {}) {
  return {
    ...DEFAULT_ENEMY_CONFIG,
    ...userConfig,
    audio: { 
      ...DEFAULT_ENEMY_CONFIG.audio, 
      ...(userConfig.audio || {}),
      distances: {
        ...DEFAULT_ENEMY_CONFIG.audio.distances,
        ...(userConfig.audio?.distances || {})
      }
    },
    healthBar: { 
      ...DEFAULT_ENEMY_CONFIG.healthBar, 
      ...(userConfig.healthBar || {}),
      height: {
        ...DEFAULT_ENEMY_CONFIG.healthBar.height,
        ...(userConfig.healthBar?.height || {})
      }
    },
    performance: {
      ...DEFAULT_ENEMY_CONFIG.performance,
      ...(userConfig.performance || {})
    }
  };
}

export class Enemy extends SimpleEventEmitter {
  constructor(position = [0, 0, 0], config = {}) {
    super(); // Initialize EventEmitter
    
    // Merge user config with defaults
    this.config = mergeEnemyConfig(config);
    
    // Basic properties
    this.id = this.generateId();
    this.mesh = new THREE.Group();
    this.mesh.position.set(position[0], position[1], position[2]);
    this.mesh.userData.enemy = this;
    this.maxHealth = this.config.maxHealth;
    this.currentHealth = this.maxHealth;
    this.isAlive = true;
    this.isDying = false;
    
    // Velocity for backward compatibility with custom enemy types
    this.velocity = new THREE.Vector3();
    
    // Components (Composition over inheritance)
    this.audio = new EnemyAudio(this);
    this.healthBar = new EnemyHealthBar(this);
    this.movement = new EnemyMovement(this);
    this.collision = new EnemyCollision(this);
    this.deathEffects = new EnemyDeathEffects(this);

    //configurações de deecção visual
    this.detection ={
      fovAngle: Math.PI / 3, // 60º
      maxDistance: 15, // Distância máxima de visão
      isPlayerVisible: false, // Inicialmente o jogador não está visível
      lastSeenPosition: null, // Posição onde o jogador foi visto pela última vez
      detectionCooldown: 3000,
      cooldownTimer: null, // Timer para cooldown de detecção
      hasSeenPlayer: false // Indica se o inimigo já viu o jogador
    }

    this.ai = new EnemyAI(this);
    
    this.initialize();
  }

  initialize() {
    this.audio.initialize();
    this.healthBar.initialize();
    this.collision.updateBoundingBox();
  }

checkPlayerVisibility(playerPosition) {
  const enemyPos = this.mesh.position;
  const toPlayer = new THREE.Vector3().subVectors(playerPosition, enemyPos);
  const distance = toPlayer.length();

  // Verifica a distancia máxima
  if (distance > this.detection.maxDistance) {
    this.detection.isPlayerVisible = false;
    return false;
  }

  // Verifica o ângulo de visão
  const direction = toPlayer.clone().normalize();
  
  // Corrigido: usar this.mesh.forward ou this.mesh.getWorldDirection()
  const forward = new THREE.Vector3();
  this.mesh.getWorldDirection(forward); // Obtém a direção frontal do inimigo
  
  const angleToPlayer = forward.angleTo(direction); // Corrigido de foward para forward

  if (angleToPlayer > this.detection.fovAngle / 2) {
    this.detection.isPlayerVisible = false;
    return false;
  }

  // Verifica se há obstáculos entre o inimigo e o jogador
  const raycaster = new THREE.Raycaster(
    enemyPos,
    direction,
    0.1, // Pequeno deslocamento para evitar colisões com o próprio inimigo
    distance
  );

  const intersects = raycaster.intersectObjects(this.collidableObjects || []);

  if(intersects.length > 0){
    this.detection.isPlayerVisible = false;
    return false;
  }

  // jogador visivel
  this.detection.isPlayerVisible = true;
  this.detection.lastSeenPosition = playerPosition.clone();
  this.detection.cooldownTimer = Date.now() + this.detection.detectionCooldown;
  console.log(`Player visible: ${this.detection.isPlayerVisible}`);
  console.log(`Distance to player: ${distance}`);
  console.log(`FOV angle: ${angleToPlayer} (max: ${this.detection.fovAngle / 2})`);
  console.log(`Player visible: ${this.detection.isPlayerVisible}`);
  return true;
}

moveTowards(targetPosition, options = {}) {
  // Delega totalmente para EnemyMovement
  return this.movement.moveTowards(
    targetPosition, 
    options.delta || 0.016, 
    {
      use6DOF: this.config.isFlying,
      enableCollision: options.enableCollision,
      collidableObjects: options.collidableObjects || [],
      speedMultiplier: options.speedMultiplier || 1.0
    }
  );
}
  
updateDetection(playerPosition, collidableObjects) {
  this.collidableObjects = collidableObjects;
  return this.checkPlayerVisibility(playerPosition);
}
    
  generateId() {
    return `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Audio wrappers for backward compatibility
  playAttackSound() {
    this.audio.playAttackSound();
  }

  playSightSound() {
    this.audio.playSightSound();
  }

  updateProximityAudio(playerPosition) {
    this.audio.updateProximity(playerPosition);
  }

  // Collision wrapper for backward compatibility
  updateBoundingBox() {
    this.collision.updateBoundingBox();
  }

  checkPlayerCollision(playerPosition, options = {}) {
    return this.collision.checkPlayerCollision(playerPosition, options);
  }

  checkEnvironmentCollision(collidableObjects, newPosition = null) {
    return this.collision.checkEnvironmentCollision(collidableObjects, newPosition);
  }

  getCollisionAvoidance(collidableObjects, targetPosition, lookaheadDistance = 2.0) {
    return this.collision.getAvoidanceDirection(collidableObjects, targetPosition, lookaheadDistance);
  }

  checkEnemyCollisions(otherEnemies, separationRadius = null) {
    return this.collision.checkEnemyCollisions(otherEnemies, separationRadius);
  }

  applySeparationForce(separationForce, delta, strength = 1.0) {
    return this.collision.applySeparationForce(separationForce, delta, strength);
  }

  canMoveTo(targetPosition, collidableObjects) {
    return this.collision.canMoveTo(targetPosition, collidableObjects);
  }

  getValidMovementDirection(targetPosition, collidableObjects) {
    return this.collision.getValidMovementDirection(targetPosition, collidableObjects);
  }

  correctPosition(collidableObjects, delta) {
    return this.collision.correctPosition(collidableObjects, delta);
  }

  preventOverlap(collidableObjects, delta) {
    return this.collision.preventOverlap(collidableObjects, delta);
  }

  // Base update method (specific enemies should override this)
  update(delta, camera, targetPosition, collidableObjects = [], otherEnemies = []) {
  if (this.deathEffects.isDying) {
    this.deathEffects.update();
    return;
  }

  if (!this.isAlive) return;

  // Atualiza a IA (que agora gerencia completamente o comportamento)
  this.ai.update(delta, targetPosition, collidableObjects);

  // Atualiza componentes visuais/auditivos
  this.audio.updateProximity(camera?.position);
  this.healthBar.update(camera);
  this.collision.updateBoundingBox();
  
  // Aplica forças de separação entre inimigos
  const { separationForce } = this.collision.checkEnemyCollisions(otherEnemies);
  this.collision.applySeparationForce(separationForce, delta);
}
  dispose() {
    // Emit dispose event before cleanup
    this.emit('disposing', { enemy: this });

    // Dispose components
    this.audio.dispose();
    this.healthBar.dispose();
    this.movement.dispose();
    this.collision.dispose();
    this.deathEffects.dispose();
    
    // Clean up mesh
    if (this.mesh) {
      this.mesh.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach(material => {
              if (material.map) material.map.dispose();
              if (material.normalMap) material.normalMap.dispose();
              if (material.roughnessMap) material.roughnessMap.dispose();
              if (material.metalnessMap) material.metalnessMap.dispose();
              material.dispose();
            });
          }
        }
      });
    }
    
    // Clear references
    this.mesh = null;
    this.velocity = null;
    this.config = null;
    
    // Clear event listeners
    this.removeAllListeners();
  }
}

export class EnemyManager extends SimpleEventEmitter {
  constructor() {
    super(); // Initialize EventEmitter
    this.enemies = new Map(); // Use Map for better performance
    this.enemiesGroup = null;
    this.nextEnemyId = 1;
  }

  initialize(scene) {
    this.enemiesGroup = new THREE.Group();
    this.enemiesGroup.name = 'EnemiesGroup';
    scene.add(this.enemiesGroup);
  }

  generateEnemyId() {
    return `enemy_${this.nextEnemyId++}`;
  }

  addEnemy(enemy) {
    // Assign unique ID to enemy if it doesn't have one
    if (!enemy.id) {
      enemy.id = this.generateEnemyId();
    }
    
    // Listen to enemy events
    enemy.on('death', (eventData) => {
      this.emit('enemyDeath', eventData);
      // Auto-remove dead enemies after fade
      setTimeout(() => {
        this.removeEnemy(enemy.id);
      }, 3000); // Give time for death animation
    });

    enemy.on('damaged', (eventData) => {
      this.emit('enemyDamaged', eventData);
    });

    enemy.on('playerCollision', (eventData) => {
      this.emit('playerCollision', eventData);
    });

    enemy.on('playerSighted', (eventData) => {
      this.emit('playerSighted', eventData);
    });

    enemy.on('error', (eventData) => {
      this.emit('enemyError', eventData);
      console.error(`[ENEMY_MANAGER] Enemy ${enemy.id} error:`, eventData.error);
    });
    
    this.enemies.set(enemy.id, enemy);
    this.enemiesGroup.add(enemy.mesh);
    
    // Emit enemy added event
    this.emit('enemyAdded', { enemy, id: enemy.id });
    
    console.log(`[ENEMY_MANAGER] Added enemy ${enemy.id} (${enemy.constructor.name})`);
    return enemy;
  }

  removeEnemy(enemyId) {
    const enemy = this.enemies.get(enemyId);
    if (!enemy) return false;
    
    // Emit enemy removed event
    this.emit('enemyRemoved', { enemy, id: enemyId });
    
    this.enemiesGroup.remove(enemy.mesh);
    enemy.dispose();
    this.enemies.delete(enemyId);
    
    console.log(`[ENEMY_MANAGER] Removed enemy ${enemyId}`);
    return true;
  }

  getEnemy(enemyId) {
    return this.enemies.get(enemyId);
  }

  hasEnemy(enemyId) {
    return this.enemies.has(enemyId);
  }

  attack(targetPosition) {
    // Método base que pode ser sobrescrito por inimigos específicos
    this.playAttackSound();
    
    // Verifica colisão simples com o jogador
    const distance = this.mesh.position.distanceTo(targetPosition);
    if (distance <= (this.config.attackRange || 3.0)) {
      this.dealDamageToPlayer(this.config.damage || 10);
    }
    
    // Emite evento de ataque
    this.emit('attacked', {
      enemy: this,
      position: this.mesh.position.clone(),
      damage: this.config.damage || 10
    });
  }

  dealDamageToPlayer(damage) {
    if (typeof window.playerTakeDamage === 'function') {
      window.playerTakeDamage(damage);
    }
  }

  update(delta, camera, targetPosition, collidableObjects = [], otherEnemies = []) {
  if (this.deathEffects.isDying) {
    this.deathEffects.update();
    return;
  }

  if (!this.isAlive) return;

  // Atualiza detecção do jogador
  const isPlayerVisible = this.checkPlayerVisibility(targetPosition, collidableObjects);
  
  // Atualiza a AI
  this.ai.update(delta, targetPosition, collidableObjects);

  // Atualiza componentes
  this.audio.updateProximity(camera?.position);
  this.healthBar.update(camera);
  this.collision.updateBoundingBox();
}


  getEnemiesInRadius(position, radius) {
    const nearbyEnemies = [];
    this.enemies.forEach(enemy => {
      if (enemy.isAlive && enemy.mesh.position.distanceTo(position) <= radius) {
        nearbyEnemies.push(enemy);
      }
    });
    return nearbyEnemies;
  }

  getEnemyCount() {
    let alive = 0;
    let total = this.enemies.size;
    
    this.enemies.forEach(enemy => {
      if (enemy.isAlive) alive++;
    });
    
    return { total, alive, dead: total - alive };
  }

  clear() {
    this.enemies.forEach(enemy => {
      this.enemiesGroup.remove(enemy.mesh);
      enemy.dispose();
    });
    this.enemies.clear();
  }

  dispose() {
    this.clear();
    
    if (this.enemiesGroup && this.enemiesGroup.parent) {
      this.enemiesGroup.parent.remove(this.enemiesGroup);
    }
    
    this.enemiesGroup = null;
    
    // Clear all event listeners
    this.removeAllListeners();
  }
}

// ============================================================================
// UTILITY FUNCTIONS FOR HEALTH BAR DEBUGGING
// ============================================================================

/**
 * Forces all enemy health bars to be visible (debugging utility)
 */
export function forceShowAllHealthBars(enemies) {
  enemies.forEach((enemy, index) => {
    if (enemy && enemy.healthBar) {
      enemy.healthBar.show();
    }
  });
}

/**
 * Logs health bar status for all enemies (debugging utility)
 */
export function debugAllHealthBars(enemies) {
  enemies.forEach((enemy, index) => {
    if (enemy && enemy.healthBar) {
      const hb = enemy.healthBar;
      // Debug information available but not logged
    }
  });
}

export class EnemyAI {
  constructor(enemy) {
    this.enemy = enemy;
  this.state = 'IDLE';
  this.lastStateChange = 0;
  this.patrolPoints = [];
  this.currentPatrolIndex = 0;
  this.idleTime = 0;
  this.maxIdleTime = 3 + Math.random() * 4;
  this.hasSeenPlayer = false;
  this.lastAttackTime = 0;
  this.attackCooldown = 2.0;
  this.disengageTime = 0;
  this.disengageDuration = 3.0;
  
  this.currentDirection = new THREE.Vector3(
    Math.random() - 0.5,
    0,
    Math.random() - 0.5
  ).normalize();
  this.changeDirectionTime = 0;
  this.directionChangeInterval = 2 + Math.random() * 3;
  this.movementSpeed = this.enemy.config.speed * 0.5;
  }

  update(delta, playerPosition, collidableObjects) {
    if (!this.enemy.isAlive) return;

    const canSeePlayer = this.enemy.checkPlayerVisibility(playerPosition, collidableObjects);
    const distanceToPlayer = this.enemy.mesh.position.distanceTo(playerPosition);

    // Transições de estado
    if (canSeePlayer) {
      if (distanceToPlayer > this.enemy.config.attackRange && this.state !== 'CHASE') {
        this.changeState('CHASE');
      } else if (distanceToPlayer <= this.enemy.config.attackRange && this.state !== 'ATTACK') {
        this.changeState('ATTACK');
      }
    } else if (this.state === 'CHASE' || this.state === 'ATTACK') {
      this.changeState('DISENGAGE');
    }

    // Comportamentos
    switch (this.state) {
      case 'IDLE':
        this.idleBehavior(delta);
        break;
      case 'PATROL':
        this.movingBehavior(delta, playerPosition, canSeePlayer);
        break;
      case 'CHASE':
        this.chaseBehavior(delta, playerPosition, collidableObjects);
        break;
      case 'ATTACK':
        this.attackBehavior(delta, playerPosition);
        break;
      case 'DISENGAGE':
        this.disengageBehavior(delta);
        break;
    }
    console.log(`Current state: ${this.state}`);
    console.log(`Can see player: ${canSeePlayer}`);
    console.log(`Distance to player: ${distanceToPlayer}`);
  }

  changeState(newState) {
  if (this.state === newState) return;
  
  console.log(`Enemy ${this.enemy.id} changing state from ${this.state} to ${newState}`);
  this.state = newState;
  this.lastStateChange = Date.now() / 1000;
  
  // Resetar tempos quando necessário
  if (newState === 'DISENGAGE') {
    this.disengageTime = this.lastStateChange;
  }
}

  chaseBehavior(delta, playerPosition, collidableObjects) {
    const moveOptions = {
      speedMultiplier: 1.0,
      enableCollision: true,
      collidableObjects: collidableObjects,
      use6DOF: this.enemy.config.isFlying
    };
    
    this.enemy.movement.moveTowards(playerPosition, delta, moveOptions);
  }


  idleBehavior(delta) {
    // Comportamento quando não está ativado
    EnemyIdleBehaviors.combinedIdleBehavior(this.enemy, delta, {
      movement: this.enemy.config.isFlying ? '6dof' : 'ground'
    });
  }

  movingBehavior(delta, playerPosition, isPlayerVisible) {
  // Garante que temos uma direção válida
  if (!this.currentDirection || this.currentDirection.length() === 0) {
    this.changeRandomDirection();
  }

  try {
    // Muda de direção periodicamente
    this.changeDirectionTime += delta;
    if (this.changeDirectionTime >= this.directionChangeInterval) {
      this.changeDirectionTime = 0;
      this.directionChangeInterval = 2 + Math.random() * 3;
      this.changeRandomDirection();
    }

    // Movimento seguro com verificação de direção
    if (this.currentDirection && this.currentDirection.length() > 0) {
      const moveAmount = this.movementSpeed * delta;
      this.enemy.mesh.position.addScaledVector(this.currentDirection, moveAmount);

      // Rotação suave
      const forward = new THREE.Vector3(0, 0, 1);
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(
        forward, 
        this.currentDirection.clone().normalize()
      );
      this.enemy.mesh.quaternion.slerp(targetQuat, 0.1);
    }

    // Verifica se detectou o jogador
    if (isPlayerVisible) {
      this.changeState('CHASE');
    }
  } catch (error) {
    console.error('Error in movingBehavior:', error);
    this.changeRandomDirection();
  }
}

  changeRandomDirection() {
  // Cria uma nova direção aleatória com verificação de segurança
  try {
    this.currentDirection = new THREE.Vector3(
      Math.random() - 0.5,
      this.enemy.config.isFlying ? (Math.random() - 0.5) * 0.5 : 0,
      Math.random() - 0.5
    ).normalize();
    
    // Garante que a direção seja válida
    if (isNaN(this.currentDirection.x)) {
      this.currentDirection.set(1, 0, 0);
    }
  } catch (error) {
    console.error('Error generating random direction:', error);
    this.currentDirection = new THREE.Vector3(1, 0, 0);
  }
}

  attackBehavior(delta, playerPosition) {
    // Executa o ataque uma vez
    if (this.enemy.attack) {
      this.enemy.attack(playerPosition);
    }

    // Muda para estado de desengajamento após o ataque
    this.state = 'DISENGAGE';
    this.disengageTime = Date.now() / 1000;

    // Define uma nova direção aleatória para desengajar
    this.changeRandomDirection();
  }

  disengageBehavior(delta) {
  const currentTime = Date.now() / 1000;
  
  // Verifica se currentDirection existe antes de usar
  if (this.currentDirection && this.currentDirection.length() > 0) {
    this.enemy.mesh.position.addScaledVector(
      this.currentDirection, 
      this.movementSpeed * 0.7 * delta
    );
  }

  if (currentTime - this.disengageTime >= this.disengageDuration) {
    this.changeState('IDLE');
  }
}

  reset() {
    this.state = 'IDLE';
    this.hasSeenPlayer = false;
    this.changeDirectionTime = 0;
    this.currentDirection.set(0, 0, 0);
  }
}