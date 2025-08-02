import * as THREE from '../../../../../build/three.module.js';
import { getEnemySoundConfig } from '../config/audioConfig.js';

export class EnemyAudio {
  constructor(enemy) {
    this.enemy = enemy;
    this.sounds = {};
    this.enabled = enemy.config.audio?.enabled ?? true;
    this.audioState = {
      nearbyPlaying: false,
      hasSightedPlayer: false
    };
  }

  initialize() {
    if (!this.enabled || !window.listener) {
      console.log(`[AUDIO] Audio disabled for ${this.enemy.constructor.name}`);
      return;
    }
    
    this.loadSounds();
  }

  loadSounds() {
    const soundConfig = this.getSoundConfig();
    if (!soundConfig) return;
    
    const loader = new THREE.AudioLoader();
    
    Object.entries(soundConfig).forEach(([soundType, config]) => {
      const audio = new THREE.Audio(window.listener);
      
      loader.load(
        config.path, 
        buffer => {
          this.sounds[soundType] = audio;
          audio.setBuffer(buffer);
          audio.setVolume(config.volume || 0.5);
          if (config.loop) audio.setLoop(true);
          this.enemy.mesh.add(audio);
        },
        undefined,
        error => {
          console.warn(`[AUDIO] Failed to load ${soundType} sound:`, error.message);
        }
      );
    });
  }

  getSoundConfig() {
    const type = this.enemy.constructor.name;
    return getEnemySoundConfig(type);
  }

  playSound(soundType) {
    if (!this.enabled) return false; // Verificar se está habilitado
    
    try {
      const sound = this.sounds[soundType];
      if (!sound || !sound.buffer || sound.isPlaying) return false;
      
      sound.play();
      return true;
    } catch (error) {
      console.warn(`[AUDIO] Failed to play ${soundType} sound:`, error.message);
      return false;
    }
  }

  stopSound(soundType) {
    try {
      const sound = this.sounds[soundType];
      if (!sound || !sound.isPlaying) return false;
      
      sound.stop();
      return true;
    } catch (error) {
      console.warn(`[AUDIO] Failed to stop ${soundType} sound:`, error.message);
      return false;
    }
  }

  playAttackSound() { return this.playSound('attack'); }
  playHitSound() { return this.playSound('hit'); }
  playDeathSound() { return this.playSound('death'); }
  
  playSightSound() {
    if (!this.audioState.hasSightedPlayer) {
      this.playSound('sight');
      this.audioState.hasSightedPlayer = true;
    }
  }
  
  playNearbySound() {
    if (!this.audioState.nearbyPlaying) {
      this.playSound('nearby');
      this.audioState.nearbyPlaying = true;
    }
  }
  
  stopNearbySound() {
    if (this.audioState.nearbyPlaying) {
      this.stopSound('nearby');
      this.audioState.nearbyPlaying = false;
    }
  }

  updateProximity(playerPosition) {
    if (!this.enabled || !playerPosition) return;
    
    const activationDistance = this.enemy.config.audio?.distances?.activation || 10;
    const nearbyDistance = this.enemy.config.audio?.distances?.nearby || 5;
    
    const distance = this.enemy.mesh.position.distanceTo(playerPosition);
    
    if (distance <= activationDistance && !this.audioState.hasSightedPlayer) {
      this.playSightSound();
    }
    
    if (distance <= nearbyDistance) {
      this.playNearbySound();
    } else {
      this.stopNearbySound();
    }
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
    this.stopAllSounds();
  }

  stopAllSounds() {
    Object.keys(this.sounds).forEach(soundType => {
      this.stopSound(soundType);
    });
  }

  dispose() {
    Object.values(this.sounds).forEach(sound => {
      if (sound?.isPlaying) {
        try {
          sound.stop();
        } catch (error) {
          console.debug('[AUDIO] Stop error (non-critical):', error.message);
        }
      }
    });
    this.sounds = {};
  }
}
