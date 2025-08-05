import * as THREE from '../../../../../build/three.module.js';
import { CONFIG } from '../../../core/config.js';
import { SimpleEventEmitter } from '../components/SimpleEventEmitter.js';
import { EnemyAudio } from '../components/EnemyAudio.js';
import { EnemyHealthBar } from '../components/EnemyHealthBar.js';
import { EnemyMovement } from '../components/EnemyMovement.js';
import { EnemyCollision } from '../components/EnemyCollision.js';
import { EnemyDeathEffects } from '../components/EnemyDeathEffects.js';
import { EnemyIdleBehaviors } from '../components/EnemyIdleBehaviors.js';
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
    this.collision = new EnemyCollision(this, {performance:{raycastUpdateInterval: 50}});
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
  return true;
}
  
  updateDetection(delta, playerPosition, collidableObjects){
    //guarda os objetos colidiveis
    this.collidableObjects = collidableObjects;

    //verifica se o jogador está visível
    const canSeePlayer = this.checkPlayerVisibility(playerPosition);
    //Atualiza o cooldown de detecção
    if(!canSeePlayer && this.detection.isPlayerVisible){
      this.detection.cooldownTimer -= delta;
      if (this.detection.cooldownTimer <= 0) {
        this.detection.isPlayerVisible = false;
        this.detection.lastSeenPosition = null;
      }
    }

    //logica adicional de detecção
    if (this.detection.isPlayerVsible) {
      this.OnPlayerDetected(playerPosition);
    }
    else if (this.detection.lastSeenPosition){
      this.OnPlayerLost();
    }    
  }

  OnPlayerDetected(playerPosition) {
    //Comportamento base quando o jogador é detectado
    if (!this.audio.isPlayingAttackSound()) {
      this.audio.playSightSound();
    }

    //lógica de perseguição ou ataque base
    if (this.movement) {
      this.movement.moveTowards(playerPosition, delta);
    }

    //onPlayerLost() {
      //comportamento base quando perde o jogador de vista

    //}

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

    // Atualiza a detecção do jogador
    this.updateDetection(delta, targetPosition, collidableObjects);

    // Sempre atualiza se já viu o jogador ou se está na área correta
    // (a decisão já foi tomada pelo manager)
    this.ai.update(delta, targetPosition, collidableObjects);

    // Atualiza componentes
    this.audio.updateProximity(camera?.position);
    this.healthBar.update(camera);
    this.collision.updateBoundingBox();
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

    // Atualiza a detecção do jogador
    this.updateDetection(delta, targetPosition, collidableObjects);

    // Verifica se o jogador está na área correta
    const isPlayerInArea = this.area === 'area1' ? 
      window.isPlayerInArea1(camera) : window.isPlayerInArea2(camera);

    // Ativa o inimigo se o jogador estiver na área ou se já tiver visto o jogador
    if (isPlayerInArea || this.detection.hasSeenPlayer) {
      this.ai.update(delta, targetPosition, collidableObjects);
    } else {
      // Comportamento idle quando fora da área
      this.ai.idleBehavior(delta);
    }

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
    this.state = 'IDLE'; // 'IDLE', 'PATROL', 'CHASE', 'ATTACK', 'DISENGAGE'
    this.lastStateChange = 0;
    this.patrolPoints = [];
    this.currentPatrolIndex = 0;
    this.idleTime = 0;
    this.maxIdleTime = 3 + Math.random() * 4;
    this.patrolRadius = 10;
    this.hasSeenPlayer = false;
    this.lastAttackTime = 0;
    this.attackCooldown = 2.0; // segundos entre ataques
    this.disengageDirection = null;
    this.disengageDistance = 5 + Math.random() * 5; // Distância para se afastar
    this.searchCenter = null; // Centro da nova área de busca
    
    this.spawnPosition = enemy.mesh.position.clone();
    this.generatePatrolPoints(3 + Math.floor(Math.random() * 3));
  }

  generatePatrolPoints(count) {
    this.patrolPoints = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const distance = 3 + Math.random() * (this.patrolRadius - 3);
      
      const point = new THREE.Vector3(
        this.spawnPosition.x + Math.cos(angle) * distance,
        this.spawnPosition.y,
        this.spawnPosition.z + Math.sin(angle) * distance
      );
      
      this.patrolPoints.push(point);
    }
    this.currentPatrolIndex = 0;
  }

 update(delta, playerPosition, collidableObjects) {
    if (!this.enemy.isAlive) return;

  // Reduz a frequência de verificações pesadas
  const now = performance.now();
  if (now - this._lastAIUpdate < 200) { // Atualiza a cada 200ms
    return;
  }
  this._lastAIUpdate = now;

  // Verificação de visão otimizada
  const simpleDistanceCheck = this.enemy.mesh.position.distanceTo(playerPosition) < 20;
  if (!simpleDistanceCheck) return;
    
    // Verifica visibilidade do jogador
    const canSeePlayer = this.enemy.checkPlayerVisibility(playerPosition, collidableObjects);
    
    // Atualiza o status de detecção
    if (canSeePlayer) {
      this.hasSeenPlayer = true;
      this.enemy.detection.hasSeenPlayer = true;
    }

    // State transitions
    if (canSeePlayer) {
      if (this.state !== 'ATTACK' && this.state !== 'DISENGAGE') {
        this.state = 'CHASE';
      }
    } else if (this.state === 'CHASE' || this.state === 'ATTACK') {
      this.state = 'DISENGAGE';
      this.searchCenter = this.enemy.mesh.position.clone();
      this.generatePatrolPoints(3);
    }
    
    // State behaviors
    switch (this.state) {
      case 'IDLE':
        this.idleBehavior(delta);
        this.idleTime += delta;
        if (this.idleTime >= this.maxIdleTime) {
          this.state = 'PATROL';
          this.idleTime = 0;
        }
        break;
        
      case 'PATROL':
        this.patrolBehavior(delta);
        break;
        
      case 'CHASE':
        this.chaseBehavior(delta, playerPosition, collidableObjects);
        break;
        
      case 'ATTACK':
        this.attackBehavior(delta, playerPosition);
        break;
        
      case 'DISENGAGE':
        this.disengageBehavior(delta, collidableObjects);
        break;
    }
  }

  idleBehavior(delta) {
    // Use the existing idle behaviors
    EnemyIdleBehaviors.combinedIdleBehavior(this.enemy, delta, {
      movement: this.enemy.config.isFlying ? '6dof' : 'ground',
      enableModelRotation: true,
      model: this.enemy.skullModel || this.enemy.model,
      pulse: {
        baseScale: 1.0,
        amplitude: 0.05,
        speed: 1.5
      }
    });
  }

  patrolBehavior(delta) {
    const targetPoint = this.patrolPoints[this.currentPatrolIndex];
    this.enemy.movement.moveTowards(targetPoint, delta, {
      speedMultiplier: 0.5,
      enableCollision: true,
      collidableObjects: this.enemy.collidableObjects
    });
    
    // Randomly change direction sometimes
    if (Math.random() < 0.01) {
      this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
    }
  }

  chaseBehavior(delta, playerPosition, collidableObjects) {
    const distanceToPlayer = this.enemy.mesh.position.distanceTo(playerPosition);
    const attackRange = this.enemy.config.attackRange || 3.0;
    
    if (distanceToPlayer <= attackRange) {
      this.state = 'ATTACK';
      this.lastAttackTime = Date.now() / 1000;
      return;
    }
    
    // Persegue com velocidade reduzida para parecer menos agressivo
    this.enemy.movement.moveTowards(playerPosition, delta, {
      speedMultiplier: 0.7,
      enableCollision: true,
      collidableObjects: collidableObjects
    });
  }

  attackBehavior(delta, playerPosition) {
    const currentTime = Date.now() / 1000;
    
    // Executa o ataque uma vez e depois se prepara para se afastar
    if (currentTime - this.lastAttackTime > this.attackCooldown) {
      if (this.enemy.attack) {
        this.enemy.attack(playerPosition);
      }
      
      // Define uma direção aleatória para se afastar
      const angle = Math.random() * Math.PI * 2;
      this.disengageDirection = new THREE.Vector3(
        Math.cos(angle),
        0,
        Math.sin(angle)
      ).normalize();
      
      this.state = 'DISENGAGE';
      this.searchCenter = this.enemy.mesh.position.clone(); // Define novo centro
      this.generatePatrolPoints(3); // Gera novos pontos em torno da posição atual
    }
  }

  disengageBehavior(delta, collidableObjects) {
    // Se ainda não se afastou o suficiente, continua se movendo
    if (this.disengageDirection && 
        this.enemy.mesh.position.distanceTo(this.searchCenter) < this.disengageDistance) {
      const targetPosition = this.enemy.mesh.position.clone()
        .addScaledVector(this.disengageDirection, this.disengageDistance);
      
      this.enemy.movement.moveTowards(targetPosition, delta, {
        speedMultiplier: 0.5,
        enableCollision: true,
        collidableObjects: collidableObjects
      });
    } else {
      // Volta a patrulhar na nova área
      this.state = 'PATROL';
      this.disengageDirection = null;
    }
  }

  searchBehavior(delta, playerPosition, collidableObjects) {
    // If we have a last known position, go there
    if (this.enemy.detection.lastSeenPosition) {
      const reachedLastPosition = this.enemy.mesh.position.distanceTo(
        this.enemy.detection.lastSeenPosition
      ) < 2.0;
      
      if (reachedLastPosition) {
        // Look around for a bit then return to patrol
        if (this.idleTime < 3.0) {
          this.idleBehavior(delta);
          this.idleTime += delta;
        } else {
          this.state = 'PATROL';
          this.idleTime = 0;
        }
      } else {
        this.enemy.movement.moveTowards(this.enemy.detection.lastSeenPosition, delta, {
          speedMultiplier: 0.7,
          enableCollision: true,
          collidableObjects: collidableObjects
        });
      }
    } else {
      // No last known position, return to patrol
      this.state = 'PATROL';
    }
  }

  reset() {
    this.state = 'IDLE';
    this.hasSeenPlayer = false;
    this.idleTime = 0;
    this.generatePatrolPoints(3 + Math.floor(Math.random() * 3));
  }
}
