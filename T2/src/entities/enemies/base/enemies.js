import * as THREE from '../../../../../build/three.module.js';
import { CONFIG } from '../../../core/config.js';

// Import collision functions
import { checkLostSoulCollision, applyLostSoulCollisionCorrection } from '../../../systems/collision.js';

// Base Enemy class with simplified configuration and cleaner structure
export class Enemy {
  constructor(position = [0, 0, 0], config = {}) {
    this.config = {
      radius: config.radius || 0.5,
      color: config.color || 0xff0000,
      maxHealth: config.maxHealth || 100,
      speed: config.speed || 0.5,
      ...config
    };

    // Create main container
    this.mesh = new THREE.Group();
    this.mesh.position.set(position[0], position[1], position[2]);
    this.mesh.userData.enemy = this;
    
    // Health system
    this.maxHealth = this.config.maxHealth;
    this.currentHealth = this.maxHealth;
    this.isAlive = true;
    
    // Death animation system
    this.isDying = false;
    this.fadeCompleted = false;
    
    // Movement properties
    this.velocity = new THREE.Vector3();
    this.boundingBox = new THREE.Box3();
    
    this.initializeEnemy();
  }

  initializeEnemy() {
    this.createHealthBar();
    this.updateBoundingBox();
  }

  createHealthBar() {
    // Create health bar group for better organization
    this.healthBarGroup = new THREE.Group();
    
    // Background
    const bgGeometry = new THREE.PlaneGeometry(1, 0.1);
    const bgMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x000000, 
      transparent: true, 
      opacity: 0.8 
    });
    this.healthBarBg = new THREE.Mesh(bgGeometry, bgMaterial);
    
    // Health fill
    const fillGeometry = new THREE.PlaneGeometry(1, 0.08);
    const fillMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.healthBarFill = new THREE.Mesh(fillGeometry, fillMaterial);
    this.healthBarFill.position.z = 0.001; // Slightly in front
    
    // Position above enemy
    const yOffset = this.config.radius + 0.3;
    this.healthBarGroup.position.set(0, yOffset, 0);
    
    this.healthBarGroup.add(this.healthBarBg);
    this.healthBarGroup.add(this.healthBarFill);
    this.mesh.add(this.healthBarGroup);
  }

  updateHealthBar() {
    if (!this.healthBarFill) return;
    
    const healthPercent = Math.max(0, this.currentHealth / this.maxHealth);
    this.healthBarFill.scale.x = healthPercent;
    
    // Color based on health percentage
    const color = healthPercent > 0.6 ? 0x00ff00 : 
                  healthPercent > 0.3 ? 0xffff00 : 0xff0000;
    this.healthBarFill.material.color.setHex(color);
  }

  takeDamage(damage) {
    if (!this.isAlive) return false;
    
    this.currentHealth = Math.max(0, this.currentHealth - damage);
    this.updateHealthBar();
    
    if (this.currentHealth <= 0) {
      this.isAlive = false;
      this.onDeath();
      return true;
    }
    return false;
  }

  onDeath() {
    // Override in subclasses for custom death behavior
    if (this.healthBarGroup) {
      this.healthBarGroup.visible = false;
    }
    
    // Start death fade animation if enabled
    if (CONFIG.ENEMY_DEATH_FADE_ENABLED) {
      this.startDeathFade();
    } else {
      // Immediate removal if fade is disabled
      this.removeFromScene();
    }
  }

  startDeathFade() {
    // Initialize death animation properties
    this.deathStartTime = performance.now();
    this.isDying = true;
    this.originalOpacity = new Map();
    this.originalScale = this.mesh.scale.clone();
    
    // Store original opacity values for all materials
    this.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        
        materials.forEach((material, index) => {
          const key = `${child.uuid}_${index}`;
          this.originalOpacity.set(key, material.opacity || 1.0);
          
          // Ensure material supports transparency
          material.transparent = true;
          material.needsUpdate = true;
        });
      }
    });
  }

  updateDeathFade(currentTime) {
    if (!this.isDying) return;
    
    const elapsedTime = (currentTime - this.deathStartTime) / 1000; // Convert to seconds
    const fadeDelay = CONFIG.ENEMY_DEATH_FADE_DELAY || 0.5;
    const fadeDuration = CONFIG.ENEMY_DEATH_FADE_DURATION || 2.0;
    
    if (elapsedTime < fadeDelay) {
      // Still in delay period, no fading yet
      return;
    }
    
    const fadeElapsed = elapsedTime - fadeDelay;
    const fadeProgress = Math.min(fadeElapsed / fadeDuration, 1.0);
    
    // Calculate fade factor (1.0 = fully visible, 0.0 = fully transparent)
    const fadeFactor = 1.0 - fadeProgress;
    
    // Apply opacity fade
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
    
    // Apply scale effect if enabled
    if (CONFIG.ENEMY_DEATH_SCALE_EFFECT) {
      const scaleMultiplier = 1.0 + (1.0 - fadeFactor) * 0.2; // Slight growth during fade
      this.mesh.scale.copy(this.originalScale).multiplyScalar(scaleMultiplier);
    }
    
    // Apply rotation effect if enabled
    if (CONFIG.ENEMY_DEATH_ROTATION_EFFECT) {
      const rotationAmount = (1.0 - fadeFactor) * Math.PI * 2;
      this.mesh.rotation.y = rotationAmount;
    }
    
    // Remove from scene when fade is complete
    if (fadeProgress >= 1.0) {
      this.fadeCompleted = true;
      setTimeout(() => {
        this.removeFromScene();
      }, (CONFIG.ENEMY_DEATH_REMOVE_DELAY || 0.2) * 1000);
    }
  }

  removeFromScene() {
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
    
    // Use Lost Soul collision system as base (works for all enemies)
    const collision = checkLostSoulCollision(
      currentPosition,
      intendedPosition,
      collidableObjects,
      this.config.radius || CONFIG.LOST_SOUL_COLLISION_RADIUS
    );
    
    return collision;
  }

  // Apply collision correction for any enemy type
  applyCollisionCorrection(targetPosition, collidableObjects) {
    if (!CONFIG.LOST_SOUL_ENABLE_COLLISION || !collidableObjects.length) return false;
    
    const correction = applyLostSoulCollisionCorrection(this, collidableObjects, targetPosition);
    
    if (correction.corrected) {
      // Apply the corrected direction
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
      .setY(0) // Keep on ground
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
    
    this.moveTowards(targetPosition || camera.position, delta);
    
    // Make health bar face camera
    if (this.healthBarGroup && camera) {
      this.healthBarGroup.lookAt(camera.position);
    }
  }

  dispose() {
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
