import * as THREE from '../../../../../build/three.module.js';
import { Enemy } from '../base/enemies.js';
import { CONFIG } from '../../../core/config.js';
import { CACODEMON_CONFIG, getCacodeemonConfig } from '../config/cacodeemonConfig.js';
import { CacodeemonProjectile, createCacodeemonProjectile } from '../systems/cacodeemonProjectile.js';

export class Cacodemon extends Enemy {
  constructor(position = [0, 0, 0], config = {}) {
    console.log(`Creating Cacodemon at position:`, position);
    
    // Get default configuration with difficulty scaling
    const defaultConfig = getCacodeemonConfig(config.difficulty || 'normal');
    
    const finalConfig = {
      ...defaultConfig,
      ...config
    };

    super(position, finalConfig);
    
    console.log(`Cacodemon constructor: position set to`, this.mesh.position);
    
    this.initializeCacodemon();
    this.loadModel();
    
    console.log(`Cacodemon created successfully at`, this.mesh.position);
  }

  initializeCacodemon() {
    // Attack system properties
    this.projectileSpeed = this.config.projectileSpeed;
    this.attackRange = this.config.attackRange;
    this.attackCooldown = this.config.attackCooldown;
    this.projectileDamage = this.config.projectileDamage;
    this.timeSinceLastAttack = 0;
    this.isAttacking = false;
    
    // Floating behavior properties
    this.floatAmplitude = this.config.floatAmplitude;
    this.floatFrequency = this.config.floatFrequency;
    this.floatTime = Math.random() * Math.PI * 2; // Random start phase
    this.baseY = this.mesh.position.y;
    
    // Reference to model
    this.model = null;
    
    // Idle behavior
    this.idleInitialized = false;
    this.idleRotationSpeed = 0.5;
    this.targetRotation = 0;
    
    // Line of sight and targeting
    this.hasLineOfSight = false;
    this.lastKnownPlayerPosition = new THREE.Vector3();
    
    // Projectile array (for cleanup)
    this.activeProjectiles = [];
  }

  async loadModel() {
    // TODO: Implement model loading when model details are provided
    // For now, create a placeholder geometry
    this.createPlaceholderGeometry();
  }

  createPlaceholderGeometry() {
    console.log('Creating Cacodemon placeholder geometry...');
    
    // Temporary placeholder - sphere with different color
    const geometry = new THREE.SphereGeometry(this.config.radius, 16, 16);
    const material = new THREE.MeshLambertMaterial({ 
      color: this.config.color,
      transparent: true,
      opacity: 0.8
    });
    
    this.placeholderMesh = new THREE.Mesh(geometry, material);
    this.mesh.add(this.placeholderMesh);
    
    console.log('Cacodemon main sphere created, adding details...');
    
    // Add some visual distinction (spikes or something)
    this.createPlaceholderDetails();
    
    console.log('Cacodemon placeholder geometry complete');
  }

  createPlaceholderDetails() {
    // Add some spikes or details to distinguish from other enemies
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

  update(delta, camera, playerHitbox, collidableObjects = []) {
    if (!this.isAlive) {
      this.handleDeathAnimation(delta);
      return;
    }

    // Update floating animation
    this.updateFloatingBehavior(delta);
    
    // Update attack system
    this.updateAttackSystem(delta, camera, playerHitbox);
    
    // Update projectiles
    this.updateProjectiles(delta, collidableObjects);
    
    // Apply movement and collision
    this.updateMovement(delta, collidableObjects);
    
    // Update health bar
    this.updateHealthBar();
    
    // Update bounding box
    this.updateBoundingBox();
  }

  updateFloatingBehavior(delta) {
    // Implement floating up and down motion
    this.floatTime += delta * this.floatFrequency;
    const floatOffset = Math.sin(this.floatTime) * this.floatAmplitude;
    this.mesh.position.y = this.baseY + floatOffset;
  }

  updateAttackSystem(delta, camera, playerHitbox) {
    this.timeSinceLastAttack += delta;
    
    const distanceToPlayer = this.mesh.position.distanceTo(camera.position);
    
    // Check if player is in range and we can attack
    if (distanceToPlayer <= this.attackRange && 
        this.timeSinceLastAttack >= this.attackCooldown &&
        !this.isAttacking) {
      
      // TODO: Implement line of sight check
      this.attemptAttack(camera.position);
    }
  }

  attemptAttack(playerPosition) {
    // TODO: Implement actual projectile attack
    this.isAttacking = true;
    this.timeSinceLastAttack = 0;
    
    // Create and fire projectile
    const startPosition = this.mesh.position.clone();
    startPosition.y += 1.0; // Fire from slightly above center
    
    const projectile = createCacodeemonProjectile(
      this.mesh.parent, // scene
      startPosition,
      playerPosition,
      {
        damage: this.projectileDamage,
        speed: this.projectileSpeed
      }
    );
    
    this.activeProjectiles.push(projectile);
    
    setTimeout(() => {
      this.isAttacking = false;
    }, 500);
    
    console.log('Cacodemon fired projectile');
  }

  updateProjectiles(delta, collidableObjects) {
    // Update all active projectiles
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const projectile = this.activeProjectiles[i];
      
      if (!projectile.update(delta, collidableObjects)) {
        // Remove inactive projectiles
        this.activeProjectiles.splice(i, 1);
      }
    }
  }

  updateMovement(delta, collidableObjects) {
    // TODO: Implement specific movement behavior
    // For now, just basic idle rotation
    if (!this.isAttacking) {
      this.mesh.rotation.y += this.idleRotationSpeed * delta;
    }
  }

  idleBehavior(delta) {
    // Behavior when player is not in area
    this.updateFloatingBehavior(delta);
    this.mesh.rotation.y += (this.idleRotationSpeed * 0.5) * delta;
    this.updateHealthBar();
  }

  takeDamage(damage) {
    if (!this.isAlive || this.isDying) return false;
    
    this.currentHealth -= damage;
    
    if (this.currentHealth <= 0) {
      this.currentHealth = 0;
      this.die();
      return true;
    }
    
    return false;
  }

  die() {
    if (this.isDying) return;
    
    this.isDying = true;
    this.isAlive = false;
    
    // TODO: Implement death animation and effects
    this.startDeathAnimation();
  }

  startDeathAnimation() {
    // TODO: Implement specific death animation
    // For now, just fade out
    const originalMaterial = this.placeholderMesh?.material;
    if (originalMaterial) {
      const fadeOut = () => {
        if (originalMaterial.opacity > 0) {
          originalMaterial.opacity -= 0.02;
          requestAnimationFrame(fadeOut);
        } else {
          this.fadeCompleted = true;
        }
      };
      fadeOut();
    }
  }

  handleDeathAnimation(delta) {
    // TODO: Implement death animation handling
    // For now, just check if fade is completed
    if (this.fadeCompleted) {
      return;
    }
  }

  dispose() {
    // Clean up projectiles
    this.activeProjectiles.forEach(projectile => {
      if (projectile.parent) {
        projectile.parent.remove(projectile);
      }
    });
    this.activeProjectiles = [];
    
    // Clean up model and materials
    if (this.model) {
      // TODO: Proper model cleanup when implemented
    }
    
    if (this.placeholderMesh) {
      this.placeholderMesh.geometry.dispose();
      this.placeholderMesh.material.dispose();
    }
    
    // Call parent cleanup
    super.dispose();
  }

  // Getters for external systems
  getAttackRange() {
    return this.attackRange;
  }

  isInAttackRange(position) {
    return this.mesh.position.distanceTo(position) <= this.attackRange;
  }

  getProjectileCount() {
    return this.activeProjectiles.length;
  }
}
