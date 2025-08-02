import * as THREE from '../../../../build/three.module.js';

export class PlayerAudioManager {
  constructor() {
    this.isInitialized = false;
    this.audioLoader = new THREE.AudioLoader();
    this.listener = null;
    
    this.hittingGroundSound = null;
    this.deathSound = null;
    this.injuredSound = null;
    
    this.soundPaths = {
      hittingGround: '/T2/assets/sounds/player/player_hitting_ground.wav',
      death: '/T2/assets/sounds/player/player_death.wav',
      injured: '/T2/assets/sounds/player/player_injured.wav'
    };
    
    this.volumes = {
      hittingGround: 0.4,
      death: 0.6,
      injured: 0.5
    };
  }

  init(listener) {
    if (!listener) {
      return;
    }
    
    this.listener = listener;
    this.isInitialized = true;
    
    this.loadSounds();
  }

  loadSounds() {
    this.hittingGroundSound = new THREE.Audio(this.listener);
    this.deathSound = new THREE.Audio(this.listener);
    this.injuredSound = new THREE.Audio(this.listener);
    
    this.audioLoader.load(this.soundPaths.hittingGround, (buffer) => {
      this.hittingGroundSound.setBuffer(buffer);
      this.hittingGroundSound.setVolume(this.volumes.hittingGround);
    }, undefined, (error) => {
      // Sound loading failed
    });
    
    this.audioLoader.load(this.soundPaths.death, (buffer) => {
      this.deathSound.setBuffer(buffer);
      this.deathSound.setVolume(this.volumes.death);
    }, undefined, (error) => {
      // Sound loading failed
    });
    
    this.audioLoader.load(this.soundPaths.injured, (buffer) => {
      this.injuredSound.setBuffer(buffer);
      this.injuredSound.setVolume(this.volumes.injured);
    }, undefined, (error) => {
      // Sound loading failed
    });
  }

  playHittingGroundSound() {
    if (!this.isInitialized) return;
    
    if (this.hittingGroundSound && this.hittingGroundSound.buffer && !this.hittingGroundSound.isPlaying) {
      try {
        this.hittingGroundSound.play();
      } catch (error) {
        // Sound play error
      }
    }
  }

  playDeathSound() {
    if (!this.isInitialized) return;
    
    if (this.deathSound && this.deathSound.buffer && !this.deathSound.isPlaying) {
      try {
        this.deathSound.play();
      } catch (error) {
        // Sound play error
      }
    }
  }

  playInjuredSound() {
    if (!this.isInitialized) return;
    
    if (this.injuredSound && this.injuredSound.buffer && !this.injuredSound.isPlaying) {
      try {
        this.injuredSound.play();
      } catch (error) {
        // Sound play error
      }
    }
  }

  stopAllSounds() {
    const sounds = [this.hittingGroundSound, this.deathSound, this.injuredSound];
    sounds.forEach(sound => {
      if (sound && sound.isPlaying) {
        try {
          sound.stop();
        } catch (error) {
          // Sound stop error
        }
      }
    });
  }

  dispose() {
    this.stopAllSounds();
    this.isInitialized = false;
    this.listener = null;
  }
}

export const playerAudioManager = new PlayerAudioManager();
