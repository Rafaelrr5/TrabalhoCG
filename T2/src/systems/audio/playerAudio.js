import * as THREE from '../../../../build/three.module.js';

export class PlayerAudioManager {
  constructor() {
    this.isInitialized = false;
    this.audioLoader = new THREE.AudioLoader();
    this.listener = null;
    
    // Player sounds
    this.hittingGroundSound = null;
    this.deathSound = null;
    this.injuredSound = null;
    
    // Sound paths
    this.soundPaths = {
      hittingGround: '/T2/assets/sounds/player/player_hitting_ground.wav',
      death: '/T2/assets/sounds/player/player_death.wav',
      injured: '/T2/assets/sounds/player/player_injured.wav'
    };
    
    // Sound volumes
    this.volumes = {
      hittingGround: 0.4,
      death: 0.6,
      injured: 0.5
    };
  }

  init(listener) {
    if (!listener) {
      console.warn('[PLAYER-AUDIO] Audio listener not available');
      return;
    }
    
    this.listener = listener;
    this.isInitialized = true;
    
    console.log('[PLAYER-AUDIO] Initializing player audio system...');
    this.loadSounds();
  }

  loadSounds() {
    // Create audio objects
    this.hittingGroundSound = new THREE.Audio(this.listener);
    this.deathSound = new THREE.Audio(this.listener);
    this.injuredSound = new THREE.Audio(this.listener);
    
    // Load hitting ground sound
    this.audioLoader.load(this.soundPaths.hittingGround, (buffer) => {
      this.hittingGroundSound.setBuffer(buffer);
      this.hittingGroundSound.setVolume(this.volumes.hittingGround);
      console.log('[PLAYER-AUDIO] Loaded hitting ground sound');
    }, undefined, (error) => {
      console.warn('[PLAYER-AUDIO] Failed to load hitting ground sound:', error);
    });
    
    // Load death sound
    this.audioLoader.load(this.soundPaths.death, (buffer) => {
      this.deathSound.setBuffer(buffer);
      this.deathSound.setVolume(this.volumes.death);
      console.log('[PLAYER-AUDIO] Loaded death sound');
    }, undefined, (error) => {
      console.warn('[PLAYER-AUDIO] Failed to load death sound:', error);
    });
    
    // Load injured sound
    this.audioLoader.load(this.soundPaths.injured, (buffer) => {
      this.injuredSound.setBuffer(buffer);
      this.injuredSound.setVolume(this.volumes.injured);
      console.log('[PLAYER-AUDIO] Loaded injured sound');
    }, undefined, (error) => {
      console.warn('[PLAYER-AUDIO] Failed to load injured sound:', error);
    });
  }

  // Play hitting ground sound (when player lands after falling)
  playHittingGroundSound() {
    if (!this.isInitialized) return;
    
    if (this.hittingGroundSound && this.hittingGroundSound.buffer && !this.hittingGroundSound.isPlaying) {
      try {
        this.hittingGroundSound.play();
        console.log('[PLAYER-AUDIO] Playing hitting ground sound');
      } catch (error) {
        console.debug('[PLAYER-AUDIO] Hitting ground sound play error:', error.message);
      }
    }
  }

  // Play death sound (when player dies)
  playDeathSound() {
    if (!this.isInitialized) return;
    
    if (this.deathSound && this.deathSound.buffer && !this.deathSound.isPlaying) {
      try {
        this.deathSound.play();
        console.log('[PLAYER-AUDIO] Playing death sound');
      } catch (error) {
        console.debug('[PLAYER-AUDIO] Death sound play error:', error.message);
      }
    }
  }

  // Play injured sound (when player takes damage)
  playInjuredSound() {
    if (!this.isInitialized) return;
    
    if (this.injuredSound && this.injuredSound.buffer && !this.injuredSound.isPlaying) {
      try {
        this.injuredSound.play();
        console.log('[PLAYER-AUDIO] Playing injured sound');
      } catch (error) {
        console.debug('[PLAYER-AUDIO] Injured sound play error:', error.message);
      }
    }
  }

  // Stop all sounds
  stopAllSounds() {
    const sounds = [this.hittingGroundSound, this.deathSound, this.injuredSound];
    sounds.forEach(sound => {
      if (sound && sound.isPlaying) {
        try {
          sound.stop();
        } catch (error) {
          console.debug('[PLAYER-AUDIO] Sound stop error:', error.message);
        }
      }
    });
  }

  dispose() {
    console.log('[PLAYER-AUDIO] Disposing player audio system');
    this.stopAllSounds();
    this.isInitialized = false;
    this.listener = null;
  }
}

// Create global instance
export const playerAudioManager = new PlayerAudioManager();
