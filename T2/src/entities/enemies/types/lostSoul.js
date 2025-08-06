import * as THREE from '../../../../../build/three.module.js';
import { Enemy } from '../base/enemies.js';
import { loadSkullModel, preloadSkullModel } from '../../../utils/skullLoader.js';
import { getLostSoulConfig } from '../config/enemyConfig.js';

export class LostSoul extends Enemy {
  constructor(position = [0, 0, 0], config = {}) {
    const baseConfig = {
      ...getLostSoulConfig(),
      // Configurações específicas que não afetam comportamento
      skullScale: 1.2,
      ...config
    };
    
    super(position, baseConfig);
    this.skullModel = null;
    this.loadSkull();
  }


  async loadSkull() {
    try {
      await preloadSkullModel();
      const loadedModel = await loadSkullModel();
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
      
      // Garante que a barra de vida está visível após configurar o modelo
      if (this.healthBar && this.healthBar.healthBarGroup) {
        this.healthBar.show();
      }
    } catch (error) {
      console.warn('Failed to load Lost Soul skull model:', error);
      // Se falhar, o inimigo usará o comportamento base com a geometria padrão
    }
  }

  setupSkullModel(model) {
    if (!this.mesh || !this.mesh.parent) return;
    
    const parent = this.mesh.parent;
    const oldPosition = this.mesh.position.clone();
    const oldRotation = this.mesh.rotation.clone();
    
    // Preserva a barra de vida antes de remover a mesh
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
    
    // Re-adiciona a barra de vida preservada
    if (preservedHealthBar) {
      group.add(preservedHealthBar);
    } else if (this.healthBar) {
      // Se não existir grupo de barra de vida, tenta recriá-lo
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

  update(delta, camera, targetPosition, collidableObjects = [], otherEnemies = []) {
    super.update(delta, camera, targetPosition, collidableObjects, otherEnemies);
    
    if (!this.isAlive || this.deathEffects.isDying) return;

    // Orientação visual apenas
    if (this.skullModel) {
      this.movement.orientToTarget(this.skullModel, targetPosition, {
        smoothRotation: true,
        rotationSpeed: 5.0
      });
    }
  }
}