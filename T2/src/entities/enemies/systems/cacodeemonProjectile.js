import * as THREE from '../../../../../build/three.module.js';
import { CACODEMON_CONFIG } from '../config/cacodeemonConfig.js';

export class CacodeemonProjectile {
  constructor(startPosition, direction, config = {}) {
    this.config = {
      speed: config.speed || CACODEMON_CONFIG.PROJECTILE_SPEED,
      damage: config.damage || CACODEMON_CONFIG.PROJECTILE_DAMAGE,
      radius: config.radius || CACODEMON_CONFIG.PROJECTILE_RADIUS,
      color: config.color || CACODEMON_CONFIG.PROJECTILE_COLOR,
      maxDistance: config.maxDistance || 100,
      ...config
    };
    
    this.startPosition = startPosition.clone();
    this.direction = direction.clone().normalize();
    this.velocity = this.direction.clone().multiplyScalar(this.config.speed);
    this.traveledDistance = 0;
    this.isActive = true;
    
    this.createMesh();
  }
  
  createMesh() {
    // Create main projectile sphere (yellow)
    const geometry = new THREE.SphereGeometry(this.config.radius, 12, 12);
    const material = new THREE.MeshLambertMaterial({ 
      color: this.config.color,
      transparent: false,
      emissive: this.config.color,
      emissiveIntensity: 0.3
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.startPosition);
    this.mesh.userData.projectile = this;
    
    // Add glow effect for better visibility
    this.createGlowEffect();
  }
  
  createGlowEffect() {
    // Create a larger, more transparent sphere for glow effect
    const glowGeometry = new THREE.SphereGeometry(this.config.radius * 1.8, 12, 12);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: this.config.color,
      transparent: true,
      opacity: 0.4,
      side: THREE.BackSide
    });
    
    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.mesh.add(this.glowMesh);
  }
  
  update(delta, collidableObjects = []) {
    if (!this.isActive) return false;
    
    // Move projectile
    const deltaMovement = this.velocity.clone().multiplyScalar(delta);
    this.mesh.position.add(deltaMovement);
    this.traveledDistance += deltaMovement.length();
    
    // Check if projectile has traveled too far
    if (this.traveledDistance >= this.config.maxDistance) {
      this.destroy();
      return false;
    }
    
    // TODO: Implement collision detection with environment and player
    const hit = this.checkCollisions(collidableObjects);
    if (hit) {
      this.onHit(hit);
      return false;
    }
    
    // Update visual effects
    this.updateEffects(delta);
    
    return true;
  }
  
  checkCollisions(collidableObjects) {
    const projectilePosition = this.mesh.position;
    const projectileRadius = this.config.radius;
    
    // Check collision with player (camera)
    // Assuming camera represents player position
    if (typeof window !== 'undefined' && window.camera) {
      const playerPosition = window.camera.position;
      const distanceToPlayer = projectilePosition.distanceTo(playerPosition);
      
      if (distanceToPlayer <= projectileRadius + 1.0) { // Player collision radius
        return { 
          object: { userData: { isPlayer: true } }, 
          point: projectilePosition.clone() 
        };
      }
    }
    
    // Check collision with environment objects
    const projectileBox = new THREE.Box3().setFromCenterAndSize(
      projectilePosition,
      new THREE.Vector3(projectileRadius * 2, projectileRadius * 2, projectileRadius * 2)
    );
    
    for (const object of collidableObjects) {
      if (object.geometry && object.position) {
        const objectBox = new THREE.Box3().setFromObject(object);
        if (projectileBox.intersectsBox(objectBox)) {
          return { object, point: projectilePosition.clone() };
        }
      }
    }
    
    return null;
  }
  
  onHit(hitInfo) {
    
    // Create hit effect
    this.createHitEffect(hitInfo.point);
    
    // Apply damage if hit object is player
    if (hitInfo.object && hitInfo.object.userData && hitInfo.object.userData.isPlayer) {
      // Use the global player damage function
      if (typeof window !== 'undefined' && typeof window.playerTakeDamage === 'function') {
        window.playerTakeDamage(this.config.damage);
      }
    }
    
    this.destroy();
  }
  
  createHitEffect(position) {
    // TODO: Implement hit particle effect
    console.log('Creating hit effect at:', position);
  }
  
  updateEffects(delta) {
    // Rotate the projectile for visual effect
    this.mesh.rotation.x += delta * 5;
    this.mesh.rotation.y += delta * 3;
    
    // Pulse the glow
    if (this.glowMesh) {
      const pulse = Math.sin(Date.now() * 0.01) * 0.1 + 0.4;
      this.glowMesh.material.opacity = pulse;
    }
  }
  
  destroy() {
    this.isActive = false;
    
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
    
    // Dispose of materials and geometry
    if (this.mesh) {
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) this.mesh.material.dispose();
      
      if (this.glowMesh) {
        if (this.glowMesh.geometry) this.glowMesh.geometry.dispose();
        if (this.glowMesh.material) this.glowMesh.material.dispose();
      }
    }
  }
  
  getDamage() {
    return this.config.damage;
  }
  
  getPosition() {
    return this.mesh.position.clone();
  }
  
  isAlive() {
    return this.isActive;
  }
}

// Utility functions for projectile management
export function createCacodeemonProjectile(scene, startPosition, targetPosition, config = {}) {
  const direction = targetPosition.clone().sub(startPosition).normalize();
  const projectile = new CacodeemonProjectile(startPosition, direction, config);
  scene.add(projectile.mesh);
  return projectile;
}

export function updateProjectiles(projectiles, delta, collidableObjects = []) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i];
    
    if (!projectile.update(delta, collidableObjects)) {
      // Remove inactive projectiles
      projectiles.splice(i, 1);
    }
  }
}

export function cleanupProjectiles(projectiles) {
  projectiles.forEach(projectile => {
    if (projectile.isActive) {
      projectile.destroy();
    }
  });
  projectiles.length = 0;
}

// Projectile pool for better performance (TODO: implement when needed)
export class ProjectilePool {
  constructor(maxSize = 50) {
    this.pool = [];
    this.maxSize = maxSize;
  }
  
  get() {
    // TODO: Implement object pooling for better performance
    return null;
  }
  
  release(projectile) {
    // TODO: Implement object pooling for better performance
  }
}
