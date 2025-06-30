import * as THREE from '../../../../../build/three.module.js';
import { Enemy } from '../base/enemies.js';
import { loadSkullModel, preloadSkullModel } from '../../../utils/skullLoader.js';
import { isPlayerInArea1 } from '../../../systems/environment.js';

// Lost Soul enemy class with dash ability
export class LostSoul extends Enemy {
  constructor(position = [0, 0, 0], config = {}) {
    // Default configuration for Lost Souls
    const defaultConfig = {
      radius: 0.6,
      color: 0x8B0000, // Dark red
      maxHealth: 20,
      speed: 2.0,       // normal move speed
      dashSpeed: 15.0,  // dash speed when chasing
      dashInterval: 3.0, // seconds between dashes
      dashDuration: 1.0, // dash lasts 1 second
      ...config
    };

    super(position, defaultConfig);

    // Replace placeholder sphere mesh with a container group
    const oldMesh = this.mesh;
    const healthBar = this.healthBarGroup;
    // Dispose placeholder geometry and material
    if (oldMesh.geometry) oldMesh.geometry.dispose();
    if (oldMesh.material) oldMesh.material.dispose();
    // Remove health bar from old mesh
    if (healthBar && oldMesh.children.includes(healthBar)) {
      oldMesh.remove(healthBar);
    }
    // Create new container group
    const container = new THREE.Group();
    container.position.set(position[0], position[1], position[2]);
    // Add health bar group
    if (healthBar) container.add(healthBar);
    this.mesh = container;

    // Dash-specific properties
    this.dashSpeed = this.config.dashSpeed;
    this.dashInterval = this.config.dashInterval;
    this.dashDuration = this.config.dashDuration;
    this.timeSinceLastDash = 0;
    this.isDashing = false;
    this.dashDirection = new THREE.Vector3();

    // Store reference to skull model for rotation
    this.skullModel = null;

    // Load skull model to replace placeholder
    this.loadSkull();
  }

  async loadSkull() {
    try {
      await preloadSkullModel();
      let model = await loadSkullModel();
      // Clone model with unique materials to prevent shared material issues
      model = model.clone();
      // Ensure each enemy has its own materials
      model.traverse(child => {
        if (child.isMesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map(mat => mat.clone());
          } else {
            child.material = child.material.clone();
          }
        }
      });
      // Align skull bottom to group origin
      const bbox = new THREE.Box3().setFromObject(model);
      const minY = bbox.min.y;
      model.position.y = -minY;
      // Reset skull rotation to neutral position
      // The lookAt logic will handle proper orientation
      model.rotation.set(0, 0, 0);
      // Set userData on skull model for hit detection
      model.userData.enemy = this;
      model.traverse(child => {
        if (child.isMesh) child.userData.enemy = this;
      });
      // Remove old mesh from parent
      if (this.mesh && this.mesh.parent) {
        const parent = this.mesh.parent;
        // Save old position and rotation
        const oldPosition = this.mesh.position.clone();
        const oldRotation = this.mesh.rotation.clone();
        parent.remove(this.mesh);
        // Create group for model and effects
        const group = new THREE.Group();
        // Position group at spawn location
        group.position.copy(oldPosition);
        group.rotation.copy(oldRotation);
        // Add skull model
        group.add(model);
        // Store reference to skull model for rotation
        this.skullModel = model;
        // Re-add health bar group above skull
        if (this.healthBarGroup) group.add(this.healthBarGroup);
        // assign new mesh
        this.mesh = group;
        // Store reference for collision/hits
        this.mesh.userData.enemy = this;
        // Update bounding box to match new asset
        if (typeof this.updateBoundingBox === 'function') {
          this.updateBoundingBox();
        }
        // Show the skull asset
        this.mesh.visible = true;
        parent.add(this.mesh);
      }
    } catch (e) {
      console.warn('Failed to load Lost Soul skull model:', e);
    }
  }

  updateDash(delta, targetPosition) {
    this.timeSinceLastDash += delta;
    if (!this.isDashing && this.timeSinceLastDash >= this.config.dashInterval) {
      this.isDashing = true;
      this.timeSinceLastDash = 0;
      // Prepare dash direction towards target
      this.dashDirection.subVectors(targetPosition, this.mesh.position);
      this.dashDirection.y = 0;
      this.dashDirection.normalize();
    } else if (this.isDashing && this.timeSinceLastDash >= this.config.dashDuration) {
      this.isDashing = false;
      this.timeSinceLastDash = 0;
    }
  }

  moveTowards(targetPosition, delta) {
    if (!this.isAlive) return;

    if (this.isDashing) {
      // During dash, movement is handled in updateDash
      return;
    }

    // Normal movement when not dashing
    super.moveTowards(targetPosition, delta);
  }

  // Add idle behavior when player not in Area 1
  idleBehavior(delta) {
    // Initialize float parameters once
    if (this.originalY === undefined) {
      this.originalY = this.mesh.position.y;
      this.floatOffset = Math.random() * Math.PI * 2;
    }
    // Vertical bobbing
    this.mesh.position.y = this.originalY + Math.sin(Date.now() * 0.003 + this.floatOffset) * 0.2;
    // Don't rotate the entire mesh during idle - let the skull face the player
  }

  takeDamage(damage) {
    const died = super.takeDamage(damage);
    if (died) {
      // Initialize death fade-out
      this.deathTimer = 0;
      this.deathDuration = 2.0; // seconds
      // Hide health bar and glow/particles immediately
      if (this.healthBarGroup) this.healthBarGroup.visible = false;
      if (this.glowMesh) this.glowMesh.visible = false;
      if (this.particleSystem) this.particleSystem.visible = false;
    }
    return died;
  }

  update(delta, camera) {
    // Handle death fade-out transition
    if (!this.isAlive) {
      if (this.deathTimer < this.deathDuration) {
        this.deathTimer += delta;
        const progress = Math.min(this.deathTimer / this.deathDuration, 1.0);
        // Fade out all mesh materials
        // Only fade out this specific enemy's materials
        this.mesh.traverse(child => {
          if (child.isMesh && child.material && child.userData.enemy === this) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => {
              mat.transparent = true;
              mat.opacity = 1.0 - progress;
              mat.needsUpdate = true;
            });
          }
        });
        if (progress >= 1.0) {
          this.mesh.visible = false;
        }
      }
      return;
    }
    // Update health bar and make it face camera
    if (this.healthBarGroup) {
      this.updateHealthBar();
      this.healthBarGroup.lookAt(camera.position);
    }
    
    // Make skull face the player (only Y rotation to keep upright)
    if (this.skullModel) {
      // Get enemy and player positions
      const enemyPos = this.mesh.position;
      const playerPos = camera.position;
      
      // Calculate direction vector (from enemy to player)
      const deltaX = playerPos.x - enemyPos.x;
      const deltaZ = playerPos.z - enemyPos.z;
      
      // Calculate angle to face the player
      // Using atan2(deltaX, deltaZ) makes the "front" of the skull face the player
      const targetAngle = Math.atan2(deltaX, deltaZ);
      
      // Apply the rotation
      this.skullModel.rotation.y = targetAngle;
    }
    if (isPlayerInArea1(camera)) {
      // Chase player with dash
      this.updateDash(delta, camera.position);
      if (this.isDashing) {
        this.mesh.position.addScaledVector(this.dashDirection, this.config.dashSpeed * delta);
        // Update bounding box after movement
        this.updateBoundingBox();
      } else {
        this.moveTowards(camera.position, delta);
      }
      // Update bounding box after position change
      this.updateBoundingBox();
    } else {
      // Idle animation outside Area 1
      this.idleBehavior(delta);
    }
  }

  dispose() {
    // Clean up additional materials and geometries
    if (this.glowMesh) {
      this.glowMesh.geometry.dispose();
      this.glowMesh.material.dispose();
    }
    if (this.particleSystem) {
      this.particleSystem.geometry.dispose();
      this.particleSystem.material.dispose();
    }
    
    super.dispose();
  }
}
