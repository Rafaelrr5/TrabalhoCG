import * as THREE from '../../../../../build/three.module.js';
import { CONFIG } from '../../../core/config.js';
import { checkLostSoulCollision, applyLostSoulCollisionCorrection } from '../../../systems/collision.js';
import { getEnemySoundConfig, ENEMY_AUDIO_CONFIG } from '../config/audioConfig.js';

export class Enemy {
  constructor(position = [0, 0, 0], config = {}) {
    this.config = {
      radius: config.radius || 0.5,
      color: config.color || 0xff0000,
      maxHealth: config.maxHealth || 100,
      speed: config.speed || 0.5,
      ...config
    };

    this.mesh = new THREE.Group();
    this.mesh.position.set(position[0], position[1], position[2]);
    this.mesh.userData.enemy = this;
    this.maxHealth = this.config.maxHealth;
    this.currentHealth = this.maxHealth;
    this.isAlive = true;
    this.isDying = false;
    this.fadeCompleted = false;
    this.velocity = new THREE.Vector3();
    this.boundingBox = new THREE.Box3();
    
    // Performance optimization: reusable objects
    this._tempVector3 = new THREE.Vector3();
    this._tempQuaternion = new THREE.Quaternion();
    this._tempMatrix4 = new THREE.Matrix4();
    
    // Throttling for expensive operations
    this.lastBoundingBoxUpdate = 0;
    this.boundingBoxUpdateInterval = 100; // ms
    
    this.initializeEnemy();
  }

  initializeEnemy() {
    this.createHealthBar();
    this.updateBoundingBox();
    this.initSounds();
  }

  createHealthBar() {
    this.healthBarGroup = new THREE.Group();
    const bgGeometry = new THREE.PlaneGeometry(1, 0.1);
    const bgMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.8 });
    this.healthBarBg = new THREE.Mesh(bgGeometry, bgMaterial);
    const fillGeometry = new THREE.PlaneGeometry(1, 0.08);
    const fillMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.healthBarFill = new THREE.Mesh(fillGeometry, fillMaterial);
    this.healthBarFill.position.z = 0.001;
    const yOffset = this.config.radius + 0.3;
    this.healthBarGroup.position.set(0, yOffset, 0);
    this.healthBarGroup.add(this.healthBarBg);
    this.healthBarGroup.add(this.healthBarFill);
    this.mesh.add(this.healthBarGroup);
  }

  initSounds() {
    if (!window.listener) {
      console.warn('[ENEMY] Audio listener not available, skipping sound initialization');
      return;
    }
    
    this.sounds = {};
    this.audioState = {
      lastNearbyTime: 0,
      nearbyPlaying: false,
      hasSightedPlayer: false
    };
    
    this.loadEnemySounds();
  }

  loadEnemySounds() {
    const soundConfig = this.getSoundConfig();
    if (!soundConfig) return;
    
    const loader = new THREE.AudioLoader();
    
    Object.entries(soundConfig).forEach(([soundType, config]) => {
      const audio = new THREE.Audio(window.listener);
      
      loader.load(
        config.path, 
        buffer => {
          this.sounds[soundType] = audio;
          audio.setBuffer(buffer);
          audio.setVolume(config.volume);
          if (config.loop) audio.setLoop(true);
          this.mesh.add(audio);
        },
        undefined,
        error => {
          console.warn(`[ENEMY] Failed to load ${soundType} sound for ${this.constructor.name}:`, error);
          console.warn(`[ENEMY] Path attempted: ${config.path}`);
        }
      );
    });
  }

  getSoundConfig() {
    const type = this.constructor.name;
    return getEnemySoundConfig(type);
  }

  playSound(soundType) {
    try {
      const sound = this.sounds[soundType];
      if (!sound || !sound.buffer || sound.isPlaying) return false;
      
      sound.play();
      return true;
    } catch (error) {
      console.warn(`[ENEMY] Failed to play ${soundType} sound for ${this.constructor.name}:`, error.message);
      // Mark sound as failed to avoid repeated attempts
      if (this.sounds[soundType]) {
        this.sounds[soundType].failed = true;
      }
      return false;
    }
  }

  stopSound(soundType) {
    try {
      const sound = this.sounds[soundType];
      if (!sound || !sound.isPlaying || sound.failed) return false;
      
      sound.stop();
      console.log(`[ENEMY] Stopping ${soundType} sound`);
      return true;
    } catch (error) {
      console.warn(`[ENEMY] Failed to stop ${soundType} sound:`, error.message);
      return false;
    }
  }

  playAttackSound() { this.playSound('attack'); }
  
  playSightSound() {
    if (!this.audioState.hasSightedPlayer) {
      this.playSound('sight');
      this.audioState.hasSightedPlayer = true;
    }
  }
  
  playNearbySound() {
    if (!this.audioState.nearbyPlaying) {
      this.playSound('nearby');
      this.audioState.nearbyPlaying = true;
    }
  }
  
  stopNearbySound() {
    if (this.audioState.nearbyPlaying) {
      this.stopSound('nearby');
      this.audioState.nearbyPlaying = false;
    }
  }

  updateProximityAudio(playerPosition, activationDistance = ENEMY_AUDIO_CONFIG.DISTANCES.ACTIVATION, nearbyDistance = ENEMY_AUDIO_CONFIG.DISTANCES.NEARBY) {
    const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
    
    if (distanceToPlayer <= activationDistance && !this.audioState.hasSightedPlayer) {
      this.playSightSound();
    }
    
    if (distanceToPlayer <= nearbyDistance) {
      this.playNearbySound();
    } else {
      this.stopNearbySound();
    }
  }

  updateHealthBar() {
    try {
      if (!this.healthBarFill || !this.healthBarFill.material) return;
      
      const healthPercent = Math.max(0, Math.min(1, this.currentHealth / this.maxHealth));
      this.healthBarFill.scale.x = healthPercent;
      
      const color = healthPercent > 0.6 ? 0x00ff00 : 
                   healthPercent > 0.3 ? 0xffff00 : 0xff0000;
      
      this.healthBarFill.material.color.setHex(color);
    } catch (error) {
      console.warn(`[ENEMY] Health bar update error for ${this.constructor.name}:`, error.message);
      // Disable health bar if it's consistently failing
      this.healthBarFill = null;
    }
  }

  takeDamage(damage) {
    try {
      if (!this.isAlive) return false;
      
      // Validate damage value
      const validDamage = Math.max(0, Number(damage) || 0);
      if (validDamage === 0) {
        console.warn(`[ENEMY] Invalid damage value: ${damage}`);
        return false;
      }
      
      this.currentHealth = Math.max(0, this.currentHealth - validDamage);
      this.updateHealthBar();
      
      this.playSound('hit');
      
      if (this.currentHealth <= 0) {
        this.isAlive = false;
        this.onDeath();
        return true;
      }
      return false;
    } catch (error) {
      console.error(`[ENEMY] Error in takeDamage for ${this.constructor.name}:`, error);
      // Fail gracefully - still apply damage but don't crash
      this.currentHealth = Math.max(0, this.currentHealth - (damage || 0));
      if (this.currentHealth <= 0) {
        this.isAlive = false;
        return true;
      }
      return false;
    }
  }

  onDeath() {
    if (this.healthBarGroup) {
      this.healthBarGroup.visible = false;
    }
    
    this.playSound('death');
    
    if (CONFIG.ENEMY_DEATH_FADE_ENABLED) {
      this.startDeathFade();
    } else {
      this.removeFromScene();
    }
  }

  startDeathFade() {
    if (this.isDying) return;
    
    this.deathStartTime = performance.now();
    this.isDying = true;
    this.originalOpacity = new Map();
    this.originalScale = this.mesh.scale.clone();
    
    this.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material, index) => {
          const key = `${child.uuid}_${index}`;
          this.originalOpacity.set(key, material.opacity !== undefined ? material.opacity : 1.0);
          material.transparent = true;
          material.needsUpdate = true;
        });
      }
    });
  }

  updateDeathFade(currentTime) {
    try {
      if (!this.isDying || !this.originalOpacity) return;
      
      const elapsedTime = (currentTime - this.deathStartTime) / 1000;
      const fadeDelay = CONFIG.ENEMY_DEATH_FADE_DELAY || 0.5;
      const fadeDuration = CONFIG.ENEMY_DEATH_FADE_DURATION || 2.0;
      
      if (elapsedTime < fadeDelay) return;
      
      const fadeElapsed = elapsedTime - fadeDelay;
      const fadeProgress = Math.min(fadeElapsed / fadeDuration, 1.0);
      const fadeFactor = Math.max(0, 1.0 - fadeProgress);
      
      this.mesh.traverse((child) => {
        if (child.isMesh && child.material) {
          try {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((material, index) => {
              const key = `${child.uuid}_${index}`;
              const originalOpacity = this.originalOpacity.get(key) || 1.0;
              material.opacity = originalOpacity * fadeFactor;
            });
          } catch (materialError) {
            console.warn(`[ENEMY] Material fade error:`, materialError.message);
          }
        }
      });
      
      if (CONFIG.ENEMY_DEATH_SCALE_EFFECT) {
        const scaleMultiplier = 1.0 + (1.0 - fadeFactor) * 0.2;
        this.mesh.scale.copy(this.originalScale).multiplyScalar(scaleMultiplier);
      }
      
      if (CONFIG.ENEMY_DEATH_ROTATION_EFFECT) {
        const rotationAmount = (1.0 - fadeFactor) * Math.PI * 2;
        this.mesh.rotation.y = rotationAmount;
      }
      
      if (fadeProgress >= 1.0) {
        this.fadeCompleted = true;
        setTimeout(() => {
          this.removeFromScene();
        }, (CONFIG.ENEMY_DEATH_REMOVE_DELAY || 0.2) * 1000);
      }
    } catch (error) {
      console.error(`[ENEMY] Death fade error for ${this.constructor.name}:`, error);
      // Fallback: just remove immediately
      this.fadeCompleted = true;
      this.removeFromScene();
    }
  }

  removeFromScene() {
    Object.values(this.sounds || {}).forEach(sound => {
      if (sound && sound.isPlaying) {
        try {
          sound.stop();
        } catch (error) {
          console.debug('[AUDIO] Audio stop error (non-critical):', error.message);
        }
      }
    });
    
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
    this.dispose();
  }

  updateBoundingBox(force = false) {
    const now = performance.now();
    if (!force && now - this.lastBoundingBoxUpdate < this.boundingBoxUpdateInterval) {
      return;
    }
    
    this.boundingBox.setFromObject(this.mesh);
    this.lastBoundingBoxUpdate = now;
  }

  checkCollision(otherBoundingBox) {
    return this.boundingBox.intersectsBox(otherBoundingBox);
  }

  checkEnvironmentCollision(targetPosition, collidableObjects, delta) {
    if (!CONFIG.LOST_SOUL_ENABLE_COLLISION || !collidableObjects.length) return null;
    const currentPosition = this.mesh.position;
    const intendedPosition = currentPosition.clone().addScaledVector(this.velocity, delta);
    return checkLostSoulCollision(
      currentPosition,
      intendedPosition,
      collidableObjects,
      this.config.radius || CONFIG.LOST_SOUL_COLLISION_RADIUS
    );
  }

  applyCollisionCorrection(targetPosition, collidableObjects) {
    if (!CONFIG.LOST_SOUL_ENABLE_COLLISION || !collidableObjects.length) return false;
    const correction = applyLostSoulCollisionCorrection(this, collidableObjects, targetPosition);
    if (correction.corrected) {
      this.velocity.copy(correction.newDirection)
        .multiplyScalar(this.config.speed * (CONFIG.LOST_SOUL_WALL_AVOIDANCE || 1.0));
      return true;
    }
    return false;
  }

  moveTowardsTarget(targetPosition, delta, options = {}) {
    if (!this.isAlive) return;
    
    const {
      use6DOF = false,
      enableCollision = false,
      collidableObjects = [],
      speedMultiplier = 1.0
    } = options;
    
    // Reuse temp vector instead of creating new ones
    const direction = this._tempVector3
      .subVectors(targetPosition, this.mesh.position);
    
    if (!use6DOF) {
      direction.setY(0);
    }
    
    direction.normalize();
    
    this.velocity.copy(direction).multiplyScalar(this.config.speed * speedMultiplier);
    
    if (enableCollision && collidableObjects.length > 0) {
      const collision = this.checkEnvironmentCollision(targetPosition, collidableObjects, delta);
      
      if (collision && collision.hasCollision) {
        const safeDistance = CONFIG.LOST_SOUL_COLLISION_DISTANCE || 2.0;
        
        if (collision.distance < safeDistance) {
          const corrected = this.applyCollisionCorrection(targetPosition, collidableObjects);
          
          if (!corrected) {
            this.velocity.multiplyScalar(0.2);
          }
        }
      }
    }
    
    this.mesh.position.addScaledVector(this.velocity, delta);
    this.updateBoundingBox();
    
    return this.velocity.clone();
  }

  moveTowards(targetPosition, delta) {
    return this.moveTowardsTarget(targetPosition, delta, { use6DOF: false });
  }

  moveTowards6DOF(targetPosition, delta) {
    return this.moveTowardsTarget(targetPosition, delta, { use6DOF: true });
  }

  moveTowardsWithCollision(targetPosition, delta, collidableObjects = []) {
    return this.moveTowardsTarget(targetPosition, delta, { 
      use6DOF: false, 
      enableCollision: true, 
      collidableObjects 
    });
  }

  moveTowards6DOFWithCollision(targetPosition, delta, collidableObjects = []) {
    return this.moveTowardsTarget(targetPosition, delta, { 
      use6DOF: true, 
      enableCollision: true, 
      collidableObjects 
    });
  }

  checkPlayerCollision(targetPosition, options = {}) {
    const {
      collisionRadius = this.config.collisionRadius || this.config.radius,
      radiusMultiplier = 1.0,
      damage = 10,
      destroyOnHit = false
    } = options;
    
    const distanceToPlayer = this.mesh.position.distanceTo(targetPosition);
    const effectiveRadius = collisionRadius * radiusMultiplier;
    
    if (distanceToPlayer <= effectiveRadius) {
      this.playAttackSound();
      
      this.dealDamageToPlayer(damage);
      
      if (destroyOnHit) {
        this.currentHealth = 0;
        this.isAlive = false;
        this.onDeath();
      }
      
      return true;
    }
    
    return false;
  }

  dealDamageToPlayer(damage) {
    if (typeof window.playerTakeDamage === 'function') {
      window.playerTakeDamage(damage);
      console.log(`[${this.constructor.name}] Dealt ${damage} damage to player`);
    } else {
      console.warn(`[${this.constructor.name}] Player damage system not available!`);
    }
  }

  orientModelToTarget(model, targetPosition, options = {}) {
    if (!model) return;
    
    const {
      useVelocity = false,
      smoothRotation = true,
      rotationSpeed = 5.0,
      rotationOffsets = {}
    } = options;
    
    let direction;
    
    if (useVelocity && this.velocity && this.velocity.length() > 0.1) {
      direction = this.velocity.clone().normalize();
    } else {
      // Reuse temp vector for direction calculation
      direction = this._tempVector3
        .subVectors(targetPosition, this.mesh.position)
        .normalize();
    }
    
    // Reuse temp objects for rotation calculation
    const targetQuaternion = this._tempQuaternion;
    const lookAtMatrix = this._tempMatrix4;
    const up = new THREE.Vector3(0, 1, 0);
    const currentPos = model.position.clone();
    const targetPos = currentPos.clone().add(direction);
    
    lookAtMatrix.lookAt(currentPos, targetPos, up);
    targetQuaternion.setFromRotationMatrix(lookAtMatrix);
    
    this.applyRotationOffsets(targetQuaternion, rotationOffsets);
    
    if (smoothRotation) {
      const speed = rotationSpeed * 0.016; // Assuming 60fps
      model.quaternion.slerp(targetQuaternion, Math.min(speed, 1.0));
    } else {
      model.quaternion.copy(targetQuaternion);
    }
  }

  applyRotationOffsets(quaternion, offsets = {}) {
    const {
      x = 0,
      y = 0,
      z = 0
    } = offsets;
    
    const rotationOffsets = [
      { axis: new THREE.Vector3(0, 1, 0), angle: y },
      { axis: new THREE.Vector3(1, 0, 0), angle: x },
      { axis: new THREE.Vector3(0, 0, 1), angle: z }
    ];
    
    rotationOffsets.forEach(({ axis, angle }) => {
      if (angle !== 0) {
        const adjustment = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        quaternion.multiplyQuaternions(quaternion, adjustment);
      }
    });
  }

  update(delta, camera, targetPosition, collidableObjects = []) {
    if (this.isDying) {
      this.updateDeathFade(performance.now());
      return;
    }

    if (!this.isAlive) return;

    if (camera && camera.position) {
      this.updateProximityAudio(camera.position);
    }

    this.updateBoundingBox();

    if (this.healthBarGroup && camera) {
      this.healthBarGroup.lookAt(camera.position);
    }
  }

  dispose() {
    // Audio cleanup
    Object.values(this.sounds || {}).forEach(sound => {
      if (sound) {
        try {
          if (sound.isPlaying) sound.stop();
          if (sound.source && sound.context && sound.context.state !== 'closed') {
            sound.disconnect();
          }
        } catch (error) {
          console.debug('[AUDIO] Audio disconnect error (non-critical):', error.message);
        }
      }
    });
    
    // Health bar cleanup
    if (this.healthBarBg) {
      this.healthBarBg.geometry.dispose();
      this.healthBarBg.material.dispose();
    }
    if (this.healthBarFill) {
      this.healthBarFill.geometry.dispose();
      this.healthBarFill.material.dispose();
    }
    
    // Complete mesh cleanup
    if (this.mesh) {
      this.mesh.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) {
            child.geometry.dispose();
          }
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
      
      // Remove from parent if still attached
      if (this.mesh.parent) {
        this.mesh.parent.remove(this.mesh);
      }
    }
    
    // Clear references to prevent memory leaks
    this.sounds = null;
    this.healthBarGroup = null;
    this.healthBarBg = null;
    this.healthBarFill = null;
    this.mesh = null;
    this.velocity = null;
    this.boundingBox = null;
    this.originalOpacity = null;
    this.config = null;
    this._tempVector3 = null;
    this._tempQuaternion = null;
    this._tempMatrix4 = null;
  }
}

export class EnemyManager {
  constructor() {
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
    
    this.enemies.set(enemy.id, enemy);
    this.enemiesGroup.add(enemy.mesh);
    
    console.log(`[ENEMY_MANAGER] Added enemy ${enemy.id} (${enemy.constructor.name})`);
    return enemy;
  }

  removeEnemy(enemyId) {
    const enemy = this.enemies.get(enemyId);
    if (!enemy) return false;
    
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

  update(delta, camera, targetPosition) {
    const deadEnemies = [];
    
    // Update all enemies and collect dead ones
    this.enemies.forEach((enemy, enemyId) => {
      if (enemy.isAlive) {
        try {
          enemy.update(delta, camera, targetPosition);
        } catch (error) {
          console.error(`[ENEMY_MANAGER] Update error for enemy ${enemyId}:`, error);
          // Mark as dead if update fails
          enemy.isAlive = false;
          deadEnemies.push(enemyId);
        }
      } else {
        deadEnemies.push(enemyId);
      }
    });
    
    // Remove dead enemies
    deadEnemies.forEach(enemyId => {
      this.removeEnemy(enemyId);
    });
  }

  getAliveEnemies() {
    const aliveEnemies = [];
    this.enemies.forEach(enemy => {
      if (enemy.isAlive) {
        aliveEnemies.push(enemy);
      }
    });
    return aliveEnemies;
  }

  getEnemiesByType(enemyType) {
    const typeEnemies = [];
    this.enemies.forEach(enemy => {
      if (enemy.constructor.name === enemyType) {
        typeEnemies.push(enemy);
      }
    });
    return typeEnemies;
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
  }
}
