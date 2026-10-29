import * as THREE from '../../../../../build/three.module.js';
// Death tuning lives in ENEMY_CONFIG (it used to be read from the debug config, where it never
// existed, so enemies vanished instantly and stayed in the enemies array forever)
import { ENEMY_CONFIG } from '../config/enemyConfig.js';
import { WORLD_CONFIG } from '../../../core/config/worldConfig.js';

export class EnemyDeathEffects {
  constructor(enemy) {
    this.enemy = enemy;
    this.isDying = false;
    this.fadeCompleted = false;
    this.deathStartTime = 0;
    this.originalOpacity = new Map();
    this.originalScale = null;
  }

  start() {
    if (this.isDying) return;
    
    if (!ENEMY_CONFIG.DEATH_FADE_ENABLED) {
      this.enemy.removeFromScene();
      return;
    }
    
    this.deathStartTime = performance.now();
    this.isDying = true;
    this.originalScale = this.enemy.mesh.scale.clone();
    
    // Store original opacity values
    this.enemy.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        // Clone first: loaded models share materials between instances, and fading a
        // shared material would fade every living enemy of the same type
        child.material = Array.isArray(child.material) ? child.material.map(m => m.clone()) : child.material.clone();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material, index) => {
          const key = `${child.uuid}_${index}`;
          this.originalOpacity.set(key, material.opacity !== undefined ? material.opacity : 1.0);
          material.transparent = true;
          material.needsUpdate = true;
        });
      }
    });
  }

  update() {
    if (!this.isDying || this.fadeCompleted) return;
    
    try {
      const currentTime = performance.now();
      const elapsedTime = (currentTime - this.deathStartTime) / 1000;
      const fadeDelay = ENEMY_CONFIG.DEATH_FADE_DELAY || 0.5;
      const fadeDuration = ENEMY_CONFIG.DEATH_FADE_DURATION || 2.0;
      
      if (elapsedTime < fadeDelay) return;
      
      const fadeElapsed = elapsedTime - fadeDelay;
      const fadeProgress = Math.min(fadeElapsed / fadeDuration, 1.0);
      const fadeFactor = Math.max(0, 1.0 - fadeProgress);
      
      // Apply fade effect
      this.applyFadeEffect(fadeFactor);
      
      // Apply additional effects
      this.applyScaleEffect(fadeFactor);
      this.applyRotationEffect(fadeFactor);
      
      if (fadeProgress >= 1.0) {
        this.fadeCompleted = true;
        setTimeout(() => {
          this.enemy.removeFromScene();
        }, (ENEMY_CONFIG.DEATH_REMOVE_DELAY || 0.2) * 1000);
      }
    } catch (error) {
      console.error(`[DEATH_EFFECTS] Update error:`, error);
      this.fadeCompleted = true;
      this.enemy.removeFromScene();
    }
  }

  applyFadeEffect(fadeFactor) {
    this.enemy.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        try {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material, index) => {
            const key = `${child.uuid}_${index}`;
            const originalOpacity = this.originalOpacity.get(key) || 1.0;
            material.opacity = originalOpacity * fadeFactor;
          });
        } catch (materialError) {
          console.warn(`[DEATH_EFFECTS] Material fade error:`, materialError.message);
        }
      }
    });
  }

  applyScaleEffect(fadeFactor) {
    if (ENEMY_CONFIG.DEATH_SCALE_EFFECT && this.originalScale) {
      const scaleMultiplier = 1.0 + (1.0 - fadeFactor) * 0.2;
      this.enemy.mesh.scale.copy(this.originalScale).multiplyScalar(scaleMultiplier);
    }
  }

  applyRotationEffect(fadeFactor) {
    if (ENEMY_CONFIG.DEATH_ROTATION_EFFECT) {
      const rotationAmount = (1.0 - fadeFactor) * Math.PI * 2;
      this.enemy.mesh.rotation.y = rotationAmount;
    }
  }

  dispose() {
    this.originalOpacity.clear();
    this.originalScale = null;
  }
}
