import * as THREE from '../../../../../build/three.module.js';
import { Enemy } from '../base/enemies.js';
import { loadSkullModel, preloadSkullModel } from '../../../utils/skullLoader.js';
import { isPlayerInArea1 } from '../../../systems/environment.js';

// Lost Soul enemy class with enhanced 6DOF movement and dash ability
// Now properly targets camera position (player's eyes) instead of weapon position
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

    // Attack properties for close combat
    this.isAttacking = false;
    this.attackCooldown = 0;
    this.attackInterval = 2.0; // seconds between attacks
    this.attackRange = 1.2; // distance to trigger attack

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
      
      // The model is already centered and properly structured from skullLoader
      // No need to re-center it here as it's already in a wrapper group
      
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
        // Add skull model (already properly centered from loader)
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

  // Full 6DOF movement towards target (gun position - player's weapon)
  // DIRECT APPROACH - No orbiting, skulls go straight to player's weapon/hands
  moveTowards6DOF(targetPosition, delta) {
    if (!this.isAlive) return;

    // Calculate distance to target
    const distanceToTarget = this.mesh.position.distanceTo(targetPosition);
    
    // Calculate full 3D direction vector (including Y axis for 6DOF)
    const direction = new THREE.Vector3();
    direction.subVectors(targetPosition, this.mesh.position);
    direction.normalize();
    
    // Debug logs every 2 seconds with detailed info
    if (!this.lastDebugTime) this.lastDebugTime = 0;
    this.lastDebugTime += delta;
    if (this.lastDebugTime >= 2.0) {
      console.log(`[Lost Soul Debug]`);
      console.log(`  Gun at: (${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)})`);
      console.log(`  Skull at:  (${this.mesh.position.x.toFixed(2)}, ${this.mesh.position.y.toFixed(2)}, ${this.mesh.position.z.toFixed(2)})`);
      console.log(`  Distance: ${distanceToTarget.toFixed(2)}`);
      console.log(`  Direction: (${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}, ${direction.z.toFixed(2)})`);
      if (this.skullModel) {
        console.log(`  Skull rotation: (${this.skullModel.rotation.x.toFixed(2)}, ${this.skullModel.rotation.y.toFixed(2)}, ${this.skullModel.rotation.z.toFixed(2)})`);
      }
      console.log(`  Velocity: (${this.velocity.x.toFixed(2)}, ${this.velocity.y.toFixed(2)}, ${this.velocity.z.toFixed(2)})`);
      console.log(`---`);
      this.lastDebugTime = 0;
    }
    
    let moveSpeed = this.config.speed;
    
    // MOVIMENTO NATURAL: Desaceleração gradual baseada na distância
    if (distanceToTarget > 10.0) {
      // Longe: velocidade total
      this.velocity.copy(direction).multiplyScalar(moveSpeed);
    } else if (distanceToTarget > 3.0) {
      // Aproximando: reduzir velocidade gradualmente
      const speedFactor = Math.max(0.3, distanceToTarget / 10.0);
      this.velocity.copy(direction).multiplyScalar(moveSpeed * speedFactor);
    } else {
      // Muito perto: velocidade bem baixa para aproximação suave
      this.velocity.copy(direction).multiplyScalar(moveSpeed * 0.15);
    }
    
    // Apply movement in all 3 dimensions (6DOF) - properly scaled by delta
    this.mesh.position.addScaledVector(this.velocity, delta);
    
    // Full 3D orientation - skull looks at target position with smooth rotation
    if (this.skullModel) {
      // Smooth rotation towards target for natural look
      this.skullModel.lookAt(targetPosition);
      
      // Add subtle banking/roll based on movement direction for dynamic feel
      const bankingAmount = this.velocity.x * 0.1; // Reduced banking for subtlety
      this.skullModel.rotation.z += bankingAmount * delta; // Scale by delta for frame-rate independence
    }
    
    this.updateBoundingBox();
  }

  // Enhanced dash system with 6DOF movement
  updateDash(delta, targetPosition) {
    this.timeSinceLastDash += delta;
    
    // Check distance to target for dash decision
    const distanceToTarget = this.mesh.position.distanceTo(targetPosition);
    const DASH_TRIGGER_DISTANCE = 5.0; // Increased range for more dynamic dashes
    const DASH_MIN_DISTANCE = 1.0;     // Don't dash if too close
    
    if (!this.isDashing && 
        this.timeSinceLastDash >= this.config.dashInterval &&
        distanceToTarget > DASH_MIN_DISTANCE && 
        distanceToTarget < DASH_TRIGGER_DISTANCE) {
      this.isDashing = true;
      this.timeSinceLastDash = 0;
      
      // Prepare dash direction towards target (FULL 3D - including Y axis)
      this.dashDirection.subVectors(targetPosition, this.mesh.position);
      this.dashDirection.normalize();
      
      // Add some randomness to make dash less predictable
      const randomOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.3
      );
      this.dashDirection.add(randomOffset);
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

    // Use 6DOF movement instead of base class movement
    this.moveTowards6DOF(targetPosition, delta);
  }

  // Add idle behavior when player not in Area 1 (DEPRECATED - use idleBehavior6DOF)
  idleBehavior(delta) {
    // This method is kept for backward compatibility
    // The actual implementation now uses idleBehavior6DOF
    this.idleBehavior6DOF(delta);
  }

  // Enhanced idle behavior with natural 6DOF floating
  idleBehavior6DOF(delta) {
    // Initialize float parameters once
    if (this.idle6DOFInitialized === undefined) {
      this.idle6DOFInitialized = true;
      // Store natural position without artificial offsets
      this.originalY = this.mesh.position.y;
      this.originalX = this.mesh.position.x;
      this.originalZ = this.mesh.position.z;
      // Random phase offsets for natural variation
      this.floatOffset = Math.random() * Math.PI * 2;
      this.floatOffsetX = Math.random() * Math.PI * 2;
      this.floatOffsetZ = Math.random() * Math.PI * 2;
    }
    
    const time = Date.now() * 0.001;
    
    // Subtle multi-axis floating motion (reduced amplitude for naturalness)
    this.mesh.position.y = this.originalY + Math.sin(time * 1.5 + this.floatOffset) * 0.15;
    this.mesh.position.x = this.originalX + Math.sin(time * 1.2 + this.floatOffsetX) * 0.2;
    this.mesh.position.z = this.originalZ + Math.cos(time * 1.3 + this.floatOffsetZ) * 0.15;
    
    // Gentle rotational floating (reduced for subtlety)
    if (this.skullModel) {
      this.skullModel.rotation.x = Math.sin(time * 0.6 + this.floatOffset) * 0.05;
      this.skullModel.rotation.y = Math.cos(time * 0.4 + this.floatOffsetX) * 0.1;
      this.skullModel.rotation.z = Math.sin(time * 0.7 + this.floatOffsetZ) * 0.03;
    }
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

  // Main update method called from enemy manager
  update(delta, camera, targetPosition) {
    if (!this.isAlive) return;
    
    // Update dash system
    this.updateDash(delta, targetPosition);
    
    // Move towards target using 6DOF movement
    this.moveTowards(targetPosition, delta);
    
    // Update health bar to face camera
    if (this.healthBarGroup && camera) {
      this.healthBarGroup.lookAt(camera.position);
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
