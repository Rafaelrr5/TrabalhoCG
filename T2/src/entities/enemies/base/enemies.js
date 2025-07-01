import * as THREE from '../../../../../build/three.module.js';
import { CONFIG } from '../../../core/config.js';

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
  }

  updateBoundingBox() {
    this.boundingBox.setFromObject(this.mesh);
  }

  checkCollision(otherBoundingBox) {
    return this.boundingBox.intersectsBox(otherBoundingBox);
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

  update(delta, camera, targetPosition) {
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
