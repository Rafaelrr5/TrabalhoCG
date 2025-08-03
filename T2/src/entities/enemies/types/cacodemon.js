import * as THREE from '../../../../../build/three.module.js';
import { loadGLTFModel } from '../../../utils/modelLoader.js';
import { Enemy } from '../base/enemies.js';
import { getCacodeemonConfig } from '../config/enemyConfig.js';

export class Cacodemon extends Enemy {
  constructor(position = [0, 0, 0], config = {}) {
    const defaultConfig = getCacodeemonConfig(config.difficulty || 'normal');
    
    const finalConfig = {
      ...defaultConfig,
      ...config
    };

    super(position, finalConfig);
    
    this.model = null;
    this.modelLoaded = false;
    this.placeholderMesh = null;
    this.loadModel();
  }

  async loadModel() {
    try {
      const modelConfig = {
        scale: 0.005,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        pivotAtCenter: true,
        castShadow: true,
        receiveShadow: true,
        materialConfig: {
          transparent: false,
          opacity: 1.0,
          visible: true,
          side: THREE.DoubleSide
        },
        fallback: {
          type: 'sphere',
          radius: this.config.radius,
          color: this.config.color
        }
      };

      this.removePlaceholder();
      
      this.model = await loadGLTFModel('./assets/models/cacodemon.glb', modelConfig);
      
      this.mesh.add(this.model);
      
      this.modelLoaded = true;
      
    } catch (error) {
      console.error('Failed to load Cacodemon GLB model:', error);
      this.createPlaceholderGeometry();
      this.modelLoaded = false;
    }
  }

  removePlaceholder() {
    if (this.placeholderMesh) {
      this.mesh.remove(this.placeholderMesh);
      this.placeholderMesh.geometry.dispose();
      this.placeholderMesh.material.dispose();
      this.placeholderMesh = null;
    }
    
    const spikesToRemove = [];
    this.mesh.children.forEach(child => {
      if (child.geometry && child.geometry.type === 'ConeGeometry') {
        spikesToRemove.push(child);
      }
    });
    spikesToRemove.forEach(spike => {
      this.mesh.remove(spike);
      spike.geometry.dispose();
      spike.material.dispose();
    });
  }

  createPlaceholderGeometry() {
    const geometry = new THREE.SphereGeometry(this.config.radius, 16, 12);
    const material = new THREE.MeshLambertMaterial({ 
      color: this.config.color,
      transparent: true,
      opacity: 0.8
    });
    
    this.placeholderMesh = new THREE.Mesh(geometry, material);
    this.placeholderMesh.castShadow = true;
    this.placeholderMesh.receiveShadow = true;
    
    this.mesh.add(this.placeholderMesh);
    
    this.createSpikes();
  }

  createSpikes() {
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

  update(delta, camera, playerHitbox, collidableObjects = [], otherEnemies = []) {
    // Call base update first (essential!)
    super.update(delta, camera, playerHitbox, otherEnemies);
    
    if (!this.isAlive || this.deathEffects.isDying) return;

    // Minimal update - inherited behaviors handle the rest
  }

  dispose() {
    if (this.model) {
      this.model.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) {
            child.geometry.dispose();
          }
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
      this.mesh.remove(this.model);
      this.model = null;
    }
    
    if (this.placeholderMesh) {
      this.placeholderMesh.geometry.dispose();
      this.placeholderMesh.material.dispose();
      this.mesh.remove(this.placeholderMesh);
      this.placeholderMesh = null;
    }
    
    super.dispose();
  }
}
