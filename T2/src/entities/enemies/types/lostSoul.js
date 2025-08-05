import * as THREE from '../../../../../build/three.module.js';
import { Enemy } from '../base/enemies.js';
import { loadSkullModel, preloadSkullModel } from '../../../utils/skullLoader.js';
import { getLostSoulConfig } from '../config/enemyConfig.js';

export class LostSoul extends Enemy {
  constructor(position = [0, 0, 0], config = {}) {
    // Use the centralized enemy config as base
    const baseConfig = getLostSoulConfig();
    const defaultConfig = {
      ...baseConfig,
      ...config // Allow override with custom config
    };

    super(position, defaultConfig);
    
    //configurações específicas do Lost Soul
    this.detection.fovAngle = Math.PI / 2; // 90 graus
    this.detection.maxDistance = 20;

    this.skullModel = null;
    this.loadSkull();
  }

  async loadSkull() {
    try {
      await preloadSkullModel();
      const loadedModel = await loadSkullModel()
      const skullWrapper = new THREE.Group();
      
      const clonedModel = loadedModel.clone();
      clonedModel.traverse(child => {
        if (child.isMesh) {
          child.userData.enemy = this;
          if (child.material) {
            child.material = Array.isArray(child.material) 
              ? child.material.map(mat => mat.clone())
              : child.material.clone();
          }
        }
      });
      
      const box = new THREE.Box3().setFromObject(clonedModel);
      const center = box.getCenter(new THREE.Vector3());
      
      clonedModel.position.sub(center);
      
      skullWrapper.add(clonedModel);
      
      skullWrapper.scale.setScalar(this.config.skullScale);
      
      skullWrapper.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      this.setupSkullModel(skullWrapper);
      
      // Ensure health bar is visible after model setup
      if (this.healthBar && this.healthBar.healthBarGroup) {
        this.healthBar.show();
      }
    } catch (error) {
      console.warn('Failed to load Lost Soul skull model:', error);
    }
  }

  setupSkullModel(model) {
    if (!this.mesh || !this.mesh.parent) return;
    
    const parent = this.mesh.parent;
    const oldPosition = this.mesh.position.clone();
    const oldRotation = this.mesh.rotation.clone();
    
    // Preserve the health bar before removing the mesh
    let preservedHealthBar = null;
    if (this.healthBar && this.healthBar.healthBarGroup) {
      preservedHealthBar = this.healthBar.healthBarGroup;
    }
    
    parent.remove(this.mesh);
    
    const group = new THREE.Group();
    group.position.copy(oldPosition);
    group.rotation.copy(oldRotation);
    
    group.add(model);
    
    this.skullModel = model;
    
    // Re-add the preserved health bar
    if (preservedHealthBar) {
      group.add(preservedHealthBar);
    } else if (this.healthBar) {
      // If no health bar group exists, try to recreate it
      this.healthBar.initialize();
      if (this.healthBar.healthBarGroup) {
        group.add(this.healthBar.healthBarGroup);
      }
    }
    
    this.mesh = group;
    this.mesh.userData.enemy = this;
    this.mesh.visible = true;
    
    parent.add(this.mesh);
    this.updateBoundingBox();
  }

  attack(targetPosition) {
    // Comportamento kamikaze - causa dano mas também se destrói
    super.attack(targetPosition);
    
    // Dano aumentado para compensar a auto-destruição
    this.dealDamageToPlayer(this.config.kamikazeDamage || 15);
    
    // Auto-destruição
    this.takeDamage(this.currentHealth);
    
    // Efeito especial
    if (this.deathEffects) {
      this.deathEffects.start();
    }
  }

  update(delta, camera, targetPosition, collidableObjects = [], otherEnemies = []) {
    
    super.update(delta, camera, targetPosition, collidableObjects, otherEnemies);
    
    if (!this.isAlive || this.deathEffects.isDying) return;

    // Comportamento específico durante a perseguição
    if (this.ai.state === 'CHASE') {
      // Movimento mais errático com pequenas variações de direção
      const erraticDirection = new THREE.Vector3(
        Math.sin(Date.now() * 0.001) * 0.3,
        0,
        Math.cos(Date.now() * 0.001) * 0.3
      );
      
      const targetWithOffset = targetPosition.clone().add(erraticDirection);
      this.movement.moveTowards(targetWithOffset, delta, {
        speedMultiplier: 1.5,
        enableCollision: true,
        collidableObjects: collidableObjects
      });
    }
  }
}

