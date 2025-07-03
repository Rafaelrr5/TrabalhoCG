import * as THREE from '../../../../../build/three.module.js';
import { CONFIG } from '../../../core/config.js';

import { checkLostSoulCollision, applyLostSoulCollisionCorrection } from '../../../systems/collision.js';

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
    // Check if audio listener is available
    if (!window.listener) {
      console.warn('[ENEMY] Audio listener not available, skipping sound initialization');
      return;
    }
    
    // Carrega e vincula sons específicos conforme o tipo de inimigo
    // Use regular Audio instead of PositionalAudio for better compatibility
    this.hitSound = new THREE.Audio(window.listener);
    this.deathSound = new THREE.Audio(window.listener);
    this.attackSound = new THREE.Audio(window.listener);
    this.nearbySound = new THREE.Audio(window.listener);
    this.sightSound = new THREE.Audio(window.listener);
    
    const loader = new THREE.AudioLoader();
    const type = this.constructor.name;
    let hitPath, deathPath, attackPath, nearbyPath, sightPath;
    
    if (type === 'LostSoul') {
      hitPath = '/T2/assets/sounds/lost_soul/lost_soul_injured.wav';
      deathPath = '/T2/assets/sounds/lost_soul/lost_soul_death.wav';
      attackPath = '/T2/assets/sounds/lost_soul/lost_soul_attack.wav';
      nearbyPath = '/T2/assets/sounds/lost_soul/lost_soul_nearby.wav';
      // Lost Soul não tem som de sight separado, usar nearby
      sightPath = '/T2/assets/sounds/lost_soul/lost_soul_nearby.wav';
    } else if (type === 'Cacodemon') {
      hitPath = '/T2/assets/sounds/cacodemon/cacodemon_injured.wav';
      deathPath = '/T2/assets/sounds/cacodemon/cacodemon_death.wav';
      attackPath = '/T2/assets/sounds/cacodemon/cacodemon_attack.wav';
      nearbyPath = '/T2/assets/sounds/cacodemon/cacodemon_nearby.wav';
      sightPath = '/T2/assets/sounds/cacodemon/cacodemon_sight.wav';
    } else {
      return;
    }
    
    // Carrega todos os sons
    loader.load(hitPath, buffer => {
      this.hitSound.setBuffer(buffer);
      this.hitSound.setVolume(0.25); // Lower volume for enemy sounds
      console.log(`[ENEMY] Loaded hit sound for ${type}`);
    });
    loader.load(deathPath, buffer => {
      this.deathSound.setBuffer(buffer);
      this.deathSound.setVolume(0.3); // Slightly higher for death sound
      console.log(`[ENEMY] Loaded death sound for ${type}`);
    });
    loader.load(attackPath, buffer => {
      this.attackSound.setBuffer(buffer);
      this.attackSound.setVolume(0.35); // Medium volume for attack sound
      console.log(`[ENEMY] Loaded attack sound for ${type}`);
    });
    loader.load(nearbyPath, buffer => {
      this.nearbySound.setBuffer(buffer);
      this.nearbySound.setVolume(0.15); // Very low for ambient nearby sound
      this.nearbySound.setLoop(true); // Som de proximidade em loop
      console.log(`[ENEMY] Loaded nearby sound for ${type}`);
    });
    loader.load(sightPath, buffer => {
      this.sightSound.setBuffer(buffer);
      this.sightSound.setVolume(0.4); // Noticeable but not overpowering
      console.log(`[ENEMY] Loaded sight sound for ${type}`);
    });
    
    // Adiciona todos os sons ao mesh
    this.mesh.add(this.hitSound);
    this.mesh.add(this.deathSound);
    this.mesh.add(this.attackSound);
    this.mesh.add(this.nearbySound);
    this.mesh.add(this.sightSound);
    
    // Controle de estado dos sons
    this.lastNearbyTime = 0;
    this.nearbyPlaying = false;
    this.hasSightedPlayer = false;
  }

  // Audio control methods
  playAttackSound() {
    if (this.attackSound && this.attackSound.buffer && !this.attackSound.isPlaying) {
      try {
        this.attackSound.play();
        console.log('[ENEMY] Playing attack sound');
      } catch (error) {
        console.debug('[AUDIO] Attack sound play error:', error.message);
      }
    } else {
      console.debug('[AUDIO] Attack sound not available or already playing');
    }
  }
  
  playSightSound() {
    if (this.sightSound && this.sightSound.buffer && !this.sightSound.isPlaying && !this.hasSightedPlayer) {
      try {
        this.sightSound.play();
        this.hasSightedPlayer = true;
        console.log('[ENEMY] Playing sight sound');
      } catch (error) {
        console.debug('[AUDIO] Sight sound play error:', error.message);
      }
    }
  }
  
  playNearbySound() {
    if (this.nearbySound && this.nearbySound.buffer && !this.nearbySound.isPlaying) {
      try {
        this.nearbySound.play();
        this.nearbyPlaying = true;
        console.log('[ENEMY] Playing nearby sound');
      } catch (error) {
        console.debug('[AUDIO] Nearby sound play error:', error.message);
      }
    }
  }
  
  stopNearbySound() {
    if (this.nearbySound && this.nearbySound.isPlaying) {
      try {
        this.nearbySound.stop();
        this.nearbyPlaying = false;
        console.log('[ENEMY] Stopping nearby sound');
      } catch (error) {
        console.debug('[AUDIO] Nearby sound stop error:', error.message);
      }
    }
  }
  
  updateProximityAudio(playerPosition, activationDistance = 15.0, nearbyDistance = 8.0) {
    const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
    
    // Som de avistamento (apenas uma vez quando vê o jogador pela primeira vez)
    if (distanceToPlayer <= activationDistance && !this.hasSightedPlayer) {
      this.playSightSound();
    }
    
    // Som de proximidade (quando está muito perto)
    if (distanceToPlayer <= nearbyDistance) {
      if (!this.nearbyPlaying) {
        this.playNearbySound();
      }
    } else {
      if (this.nearbyPlaying) {
        this.stopNearbySound();
      }
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
    
    // Play hit sound with additional checks
    if (this.hitSound && this.hitSound.buffer) {
      if (!this.hitSound.isPlaying) {
        try {
          this.hitSound.play();
          console.log('[ENEMY] Playing hit sound');
        } catch (error) {
          console.debug('[AUDIO] Hit sound play error:', error.message);
        }
      }
    }
    
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
    
    // Play death sound with additional checks
    if (this.deathSound && this.deathSound.buffer) {
      if (!this.deathSound.isPlaying) {
        try {
          this.deathSound.play();
          console.log('[ENEMY] Playing death sound');
        } catch (error) {
          console.debug('[AUDIO] Death sound play error:', error.message);
        }
      }
    }
    
    if (CONFIG.ENEMY_DEATH_FADE_ENABLED) {
      this.startDeathFade();
    } else {
      this.removeFromScene();
    }
  }

  startDeathFade() {
    if (this.isDying) return; // Evita reinicialização
    
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
    // Stop any playing audio before removing (safely)
    const sounds = [this.hitSound, this.deathSound, this.attackSound, this.nearbySound, this.sightSound];
    sounds.forEach(sound => {
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

  // Generic collision detection for enemies
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

  // Apply collision correction for any enemy type
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

  // Basic movement toward target (ground-based)
  moveTowards(targetPosition, delta) {
    if (!this.isAlive) return;
    const direction = new THREE.Vector3()
      .subVectors(targetPosition, this.mesh.position)
      .setY(0)
      .normalize();
    this.velocity.copy(direction).multiplyScalar(this.config.speed);
    this.mesh.position.addScaledVector(this.velocity, delta);
    this.updateBoundingBox();
  }

  // 6DOF movement for flying enemies
  moveTowards6DOF(targetPosition, delta) {
    if (!this.isAlive) return;
    const direction = new THREE.Vector3()
      .subVectors(targetPosition, this.mesh.position)
      .normalize();
    this.velocity.copy(direction).multiplyScalar(this.config.speed);
    this.mesh.position.addScaledVector(this.velocity, delta);
    this.updateBoundingBox();
  }

  // Enhanced movement with collision detection
  moveTowardsWithCollision(targetPosition, delta, collidableObjects = []) {
    if (!this.isAlive) return;
    
    const direction = new THREE.Vector3()
      .subVectors(targetPosition, this.mesh.position)
      .setY(0) // Keep on ground for non-flying enemies
      .normalize();
    
    this.velocity.copy(direction).multiplyScalar(this.config.speed);
    
    // Check for collision
    const collision = this.checkEnvironmentCollision(targetPosition, collidableObjects, delta);
    
    if (collision && collision.hasCollision) {
      const safeDistance = CONFIG.LOST_SOUL_COLLISION_DISTANCE || 2.0;
      
      if (collision.distance < safeDistance) {
        // Try to apply collision correction
        const corrected = this.applyCollisionCorrection(targetPosition, collidableObjects);
        
        if (!corrected) {
          // If no correction possible, slow down movement
          this.velocity.multiplyScalar(0.2);
        }
      }
    }
    
    this.mesh.position.addScaledVector(this.velocity, delta);
    this.updateBoundingBox();
  }

  // Enhanced 6DOF movement with collision detection  
  moveTowards6DOFWithCollision(targetPosition, delta, collidableObjects = []) {
    if (!this.isAlive) return;
    
    const direction = new THREE.Vector3()
      .subVectors(targetPosition, this.mesh.position)
      .normalize();
    
    this.velocity.copy(direction).multiplyScalar(this.config.speed);
    
    // Check for collision
    const collision = this.checkEnvironmentCollision(targetPosition, collidableObjects, delta);
    
    if (collision && collision.hasCollision) {
      const safeDistance = CONFIG.LOST_SOUL_COLLISION_DISTANCE || 2.0;
      
      if (collision.distance < safeDistance) {
        // Try to apply collision correction
        const corrected = this.applyCollisionCorrection(targetPosition, collidableObjects);
        
        if (!corrected) {
          // If no correction possible, slow down movement
          this.velocity.multiplyScalar(0.2);
        }
      }
    }
    
    this.mesh.position.addScaledVector(this.velocity, delta);
    this.updateBoundingBox();
  }

  update(delta, camera, targetPosition, collidableObjects = []) {
    // Update death fade animation if dying
    if (this.isDying) {
      this.updateDeathFade(performance.now());
      return; // Don't process normal behavior while dying
    }
    
    if (!this.isAlive) return;
    
    // Update proximity audio based on player position
    if (camera && camera.position) {
      this.updateProximityAudio(camera.position);
    }
    
    this.moveTowards(targetPosition || camera.position, delta);
    
    // Make health bar face camera
    if (this.healthBarGroup && camera) {
      this.healthBarGroup.lookAt(camera.position);
    }
  }

  dispose() {
    // Stop and clean up all audio safely
    const sounds = [this.hitSound, this.deathSound, this.attackSound, this.nearbySound, this.sightSound];
    sounds.forEach(sound => {
      if (sound) {
        try {
          if (sound.isPlaying) {
            sound.stop();
          }
          // Only disconnect if the sound is actually connected
          if (sound.source && sound.context && sound.context.state !== 'closed') {
            sound.disconnect();
          }
        } catch (error) {
          // Silently handle disconnect errors - they're not critical
          console.debug('[AUDIO] Audio disconnect error (non-critical):', error.message);
        }
      }
    });
    
    // Clean up geometry and materials
    if (this.healthBarBg) {
      this.healthBarBg.geometry.dispose();
      this.healthBarBg.material.dispose();
    }
    if (this.healthBarFill) {
      this.healthBarFill.geometry.dispose();
      this.healthBarFill.material.dispose();
    }
  }
}

// Enemy Manager - Simplified version
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
    
    // Remove dead enemies
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
