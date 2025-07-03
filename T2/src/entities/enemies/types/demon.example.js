// Example of how to add a new enemy type with custom audio

import { Enemy } from '../base/enemies.js';
import { registerEnemySounds } from '../config/audioConfig.js';

// Register sounds for the new enemy type
registerEnemySounds('Demon', {
  hit: '/T2/assets/sounds/demon/demon_injured.wav',
  death: '/T2/assets/sounds/demon/demon_death.wav',
  attack: '/T2/assets/sounds/demon/demon_attack.wav',
  nearby: '/T2/assets/sounds/demon/demon_nearby.wav',
  sight: '/T2/assets/sounds/demon/demon_sight.wav'
});

export class Demon extends Enemy {
  constructor(position = [0, 0, 0], config = {}) {
    const defaultConfig = {
      radius: 1.0,
      color: 0x8B0000,
      maxHealth: 80,
      speed: 2.5,
      ...config
    };

    super(position, defaultConfig);
    
    // Custom initialization for Demon
    this.initializeDemon();
  }

  initializeDemon() {
    // Demon-specific properties
    this.fireballCooldown = 0;
    this.fireballInterval = 3.0;
  }

  update(delta, camera, targetPosition, collidableObjects = []) {
    // Call parent update (includes audio management)
    super.update(delta, camera, targetPosition, collidableObjects);
    
    // Demon-specific update logic
    this.updateDemonBehavior(delta, camera, targetPosition);
  }

  updateDemonBehavior(delta, camera, targetPosition) {
    // Custom behavior logic here
    // The audio system is already handled by the parent class
  }

  // Override attack method to use custom sound
  attack(target) {
    this.playAttackSound(); // Uses the registered attack sound
    // Attack logic here
  }
}
