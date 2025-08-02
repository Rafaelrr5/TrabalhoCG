import * as THREE from '../../../../../../build/three.module.js';

export class EnemyHealthBar {
  constructor(enemy) {
    this.enemy = enemy;
    this.enabled = enemy.config.healthBar?.enabled ?? true;
    this.healthBarGroup = null;
    this.healthBarFill = null;
    this.healthBarBg = null;
  }

  initialize() {
    if (!this.enabled) {
      return;
    }
    
    this.createHealthBar();
  }

  createHealthBar() {
    try {
      this.healthBarGroup = new THREE.Group();
      
      const config = this.enemy.config.healthBar;
      const width = config?.width || 1.0;
      const bgHeight = config?.height?.background || 0.1;
      const fillHeight = config?.height?.fill || 0.08;
      const offset = config?.offset || 0.3;
      
      // Background
      const bgGeometry = new THREE.PlaneGeometry(width, bgHeight);
      const bgMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000, 
        transparent: true, 
        opacity: 0.8 
      });
      this.healthBarBg = new THREE.Mesh(bgGeometry, bgMaterial);
      
      // Fill
      const fillGeometry = new THREE.PlaneGeometry(width, fillHeight);
      const fillMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      this.healthBarFill = new THREE.Mesh(fillGeometry, fillMaterial);
      this.healthBarFill.position.z = 0.001;
      
      // Position health bar above enemy
      const yOffset = this.enemy.config.radius + offset;
      this.healthBarGroup.position.set(0, yOffset, 0);
      
      this.healthBarGroup.add(this.healthBarBg);
      this.healthBarGroup.add(this.healthBarFill);
      this.enemy.mesh.add(this.healthBarGroup);
      
    } catch (error) {
      this.enabled = false;
    }
  }

  update(camera = null) {
    if (!this.enabled || !this.healthBarFill) return;
    
    try {
      // Update health percentage
      const healthPercent = Math.max(0, Math.min(1, this.enemy.currentHealth / this.enemy.maxHealth));
      this.healthBarFill.scale.x = healthPercent;
      
      // Update color based on health
      const color = healthPercent > 0.6 ? 0x00ff00 : 
                   healthPercent > 0.3 ? 0xffff00 : 0xff0000;
      
      this.healthBarFill.material.color.setHex(color);
      
      // Face camera if provided - this is crucial for visibility
      if (camera && this.healthBarGroup) {
        this.healthBarGroup.lookAt(camera.position);
        
        // Ensure the health bar is always visible by setting its visibility
        this.healthBarGroup.visible = true;
      }
    } catch (error) {
      this.enabled = false;
    }
  }

  hide() {
    if (this.healthBarGroup) {
      this.healthBarGroup.visible = false;
    }
  }

  show() {
    if (this.healthBarGroup) {
      this.healthBarGroup.visible = true;
    }
  }

  dispose() {
    if (this.healthBarBg) {
      this.healthBarBg.geometry.dispose();
      this.healthBarBg.material.dispose();
    }
    if (this.healthBarFill) {
      this.healthBarFill.geometry.dispose();
      this.healthBarFill.material.dispose();
    }
    
    this.healthBarGroup = null;
    this.healthBarBg = null;
    this.healthBarFill = null;
  }
}
