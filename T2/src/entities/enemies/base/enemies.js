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
    const sound = this.sounds[soundType];
    if (!sound || !sound.buffer || sound.isPlaying) return;
    
    try {
      sound.play();
    } catch (error) {
      console.debug(`[AUDIO] ${soundType} sound play error:`, error.message);
    }
  }

  stopSound(soundType) {
    const sound = this.sounds[soundType];
    if (!sound || !sound.isPlaying) return;
    
    try {
      sound.stop();
      console.log(`[ENEMY] Stopping ${soundType} sound`);
    } catch (error) {
      console.debug(`[AUDIO] ${soundType} sound stop error:`, error.message);
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
    if (!this.healthBarFill) return;
    const healthPercent = Math.max(0, this.currentHealth / this.maxHealth);
    this.healthBarFill.scale.x = healthPercent;
    const color = healthPercent > 0.6 ? 0x00ff00 : healthPercent > 0.3 ? 0xffff00 : 0xff0000;
    this.healthBarFill.material.color.setHex(color);
  }

  takeDamage(damage) {
    if (!this.isAlive) return false;
    this.currentHealth = Math.max(0, this.currentHealth - damage);
    this.updateHealthBar();
    
    this.playSound('hit');
    
    if (this.currentHealth <= 0) {
      this.isAlive = false;
      this.onDeath();
      return true;
    }
    return false;
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
    if (!this.isDying || !this.originalOpacity) return;
    const elapsedTime = (currentTime - this.deathStartTime) / 1000;
    const fadeDelay = CONFIG.ENEMY_DEATH_FADE_DELAY || 0.5;
    const fadeDuration = CONFIG.ENEMY_DEATH_FADE_DURATION || 2.0;
    if (elapsedTime < fadeDelay) return;
    const fadeElapsed = elapsedTime - fadeDelay;
    const fadeProgress = Math.min(fadeElapsed / fadeDuration, 1.0);
    const fadeFactor = 1.0 - fadeProgress;
    this.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material, index) => {
          const key = `${child.uuid}_${index}`;
          const originalOpacity = this.originalOpacity.get(key) || 1.0;
          material.opacity = originalOpacity * fadeFactor;
        });
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

  updateBoundingBox() {
    this.boundingBox.setFromObject(this.mesh);
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
    
    const direction = new THREE.Vector3()
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
      direction = new THREE.Vector3()
        .subVectors(targetPosition, this.mesh.position)
        .normalize();
    }
    
    const targetQuaternion = new THREE.Quaternion();
    const lookAtMatrix = new THREE.Matrix4();
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
  }
}

export class EnemyManager {
  constructor() {
    this.enemies = [];
    this.enemiesGroup = null;
  }

  initialize(scene) {
    this.enemiesGroup = new THREE.Group();
    this.enemiesGroup.name = 'EnemiesGroup';
    scene.add(this.enemiesGroup);
  }

  addEnemy(enemy) {
    this.enemies.push(enemy);
    this.enemiesGroup.add(enemy.mesh);
    return enemy;
  }

  update(delta, camera, targetPosition) {
    this.enemies.forEach(enemy => {
      enemy.update(delta, camera, targetPosition);
    });
    
    this.enemies = this.enemies.filter(enemy => {
      if (!enemy.isAlive) {
        this.enemiesGroup.remove(enemy.mesh);
        enemy.dispose();
        return false;
      }
      return true;
    });
  }

  getAliveEnemies() {
    return this.enemies.filter(enemy => enemy.isAlive);
  }

  getEnemyCount() {
    const alive = this.getAliveEnemies().length;
    return { total: this.enemies.length, alive, dead: this.enemies.length - alive };
  }

  dispose() {
    this.enemies.forEach(enemy => enemy.dispose());
    this.enemies = [];
  }
}
