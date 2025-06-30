import * as THREE from '../../../../../build/three.module.js';
import { gun } from '../../../components/weapon.js';
import { CONFIG } from '../../../core/config.js';
import { hitbox } from '../../player/player.js';

// Base Enemy class
export class Enemy {
  constructor(position = [0, 0, 0], config = {}) {
    // Default configuration
    this.config = {
      radius: 0.5,
      color: 0xff0000,
      maxHealth: 100,
      speed: 0.5,
      ...config
    };

    // Create enemy mesh (as container group)
    this.mesh = new THREE.Group();
    // Position the enemy
    this.mesh.position.set(position[0], position[1], position[2]);
    
    // Health system
    this.maxHealth = this.config.maxHealth;
    this.currentHealth = this.maxHealth;
    this.isAlive = true;
    
    // Physics properties for 6 degrees of freedom
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.angularVelocity = new THREE.Vector3(0, 0, 0);
    
    // Collision properties
    this.boundingBox = new THREE.Box3();
    this.updateBoundingBox();
    
    // Create health bar
    this.createHealthBar();
    
    // Add reference to this enemy in the mesh userData
    this.mesh.userData.enemy = this;
  }

  createHealthBar() {
    // Health bar background
    const bgGeometry = new THREE.PlaneGeometry(1, 0.1);
    const bgMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.8 });
    this.healthBarBg = new THREE.Mesh(bgGeometry, bgMaterial);
    
    // Health bar fill
    const fillGeometry = new THREE.PlaneGeometry(1, 0.08);
    const fillMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.healthBarFill = new THREE.Mesh(fillGeometry, fillMaterial);
    
    // Position health bars above enemy
    this.healthBarBg.position.set(0, this.config.radius + 0.3, 0);
    this.healthBarFill.position.set(0, this.config.radius + 0.3, 0.001);
    
    // Make health bars always face camera
    this.healthBarBg.lookAt(0, 0, 1);
    this.healthBarFill.lookAt(0, 0, 1);
    
    // Add to enemy mesh
    this.mesh.add(this.healthBarBg);
    this.mesh.add(this.healthBarFill);
  }

  updateHealthBar() {
    if (!this.healthBarFill) return;
    
    const healthPercent = this.currentHealth / this.maxHealth;
    this.healthBarFill.scale.x = healthPercent;
    
    // Change color based on health
    if (healthPercent > 0.6) {
      this.healthBarFill.material.color.setHex(0x00ff00); // Green
    } else if (healthPercent > 0.3) {
      this.healthBarFill.material.color.setHex(0xffff00); // Yellow
    } else {
      this.healthBarFill.material.color.setHex(0xff0000); // Red
    }
  }

  takeDamage(damage) {
    if (!this.isAlive) return false;
    
    this.currentHealth -= damage;
    this.updateHealthBar();
    
    if (this.currentHealth <= 0) {
      this.currentHealth = 0;
      this.isAlive = false;
      return true; // Enemy died
    }
    return false;
  }

  updateBoundingBox() {
    this.boundingBox.setFromObject(this.mesh);
  }

  checkCollision(otherBoundingBox) {
    return this.boundingBox.intersectsBox(otherBoundingBox);
  }

  moveTowards(targetPosition, delta) {
    if (!this.isAlive) return;
    
    // Calculate direction to target (ignoring Y axis for ground movement)
    const direction = new THREE.Vector3();
    direction.subVectors(targetPosition, this.mesh.position);
    direction.y = 0;
    direction.normalize();
    
    // Apply movement
    this.velocity.copy(direction).multiplyScalar(this.config.speed);
    this.mesh.position.addScaledVector(this.velocity, delta);
    
    // Update bounding box after movement
    this.updateBoundingBox();
  }

  update(delta, gun) {
    if (!this.isAlive) return;
    
    // Move towards camera/player
    this.moveTowards(gun, delta);
    
    // Make health bar face camera
    if (this.healthBarBg && this.healthBarFill) {
      this.healthBarBg.lookAt(gun.position);
      this.healthBarFill.lookAt(gun.position);
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

// Group to hold all enemies
export let enemiesGroup = null;
export let enemies = [];

// Initialize enemies and add to scene
export function initEnemies(scene) {
  enemiesGroup = new THREE.Group();
  enemiesGroup.name = 'EnemiesGroup';
  enemies = [];

  // Define initial enemy positions
  const positions = [
    [10, 0, 10],
    [-10, 0, 10],
    [10, 0, -10]
  ];

  positions.forEach(pos => {
    const enemy = new Enemy(pos);
    enemies.push(enemy);
    enemiesGroup.add(enemy.mesh);
  });

  scene.add(enemiesGroup);
}

// Update all enemies
export function updateEnemies(delta, gun) {
  if (!enemies || enemies.length === 0) return;
  
  enemies.forEach(enemy => {
    enemy.update(delta, gun);
  });
  
  // Remove dead enemies
  enemies = enemies.filter(enemy => {
    if (!enemy.isAlive) {
      enemiesGroup.remove(enemy.mesh);
      enemy.dispose();
      return false;
    }
    return true;
  });
}

// Get all alive enemies
export function getAliveEnemies() {
  return enemies.filter(enemy => enemy.isAlive);
}

// Add new enemy to the scene
export function addEnemy(position, config = {}) {
  if (!enemiesGroup) return null;
  
  const enemy = new Enemy(position, config);
  enemies.push(enemy);
  enemiesGroup.add(enemy.mesh);
  return enemy;
}
