import * as THREE from '../../../../build/three.module.js';

export class GameAudioManager {
  constructor() {
    this.isInitialized = false;
    this.audioLoader = new THREE.AudioLoader();
    this.listener = null;
    
    this.doorOpeningSound = null;
    this.itemPickupSound = null;
    this.liftStartingSound = null;
    this.liftStoppingSound = null;
    
    this.soundPaths = {
      doorOpening: '/T2/assets/sounds/ambient/door_opening.wav',
      itemPickup: '/T2/assets/sounds/ambient/item_pickup.wav',
      liftStarting: '/T2/assets/sounds/platform/lift_starting.wav',
      liftStopping: '/T2/assets/sounds/platform/lift_stopping.wav'
    };
    
    this.volumes = {
      doorOpening: 0.6,
      itemPickup: 0.4,
      liftStarting: 0.5,
      liftStopping: 0.5
    };
  }

  init(listener) {
    if (!listener) {
      console.warn('[GAME-AUDIO] Audio listener not available');
      return;
    }
    
    this.listener = listener;
    this.isInitialized = true;
    
    console.log('[GAME-AUDIO] Initializing game audio system...');
    this.loadSounds();
  }

  loadSounds() {
    this.doorOpeningSound = new THREE.Audio(this.listener);
    this.itemPickupSound = new THREE.Audio(this.listener);
    this.liftStartingSound = new THREE.Audio(this.listener);
    this.liftStoppingSound = new THREE.Audio(this.listener);
    
    this.audioLoader.load(this.soundPaths.doorOpening, (buffer) => {
      this.doorOpeningSound.setBuffer(buffer);
      this.doorOpeningSound.setVolume(this.volumes.doorOpening);
      console.log('[GAME-AUDIO] Loaded door opening sound');
    }, undefined, (error) => {
      console.warn('[GAME-AUDIO] Failed to load door opening sound:', error);
    });
    
    this.audioLoader.load(this.soundPaths.itemPickup, (buffer) => {
      this.itemPickupSound.setBuffer(buffer);
      this.itemPickupSound.setVolume(this.volumes.itemPickup);
      console.log('[GAME-AUDIO] Loaded item pickup sound');
    }, undefined, (error) => {
      console.warn('[GAME-AUDIO] Failed to load item pickup sound:', error);
    });
    
    this.audioLoader.load(this.soundPaths.liftStarting, (buffer) => {
      this.liftStartingSound.setBuffer(buffer);
      this.liftStartingSound.setVolume(this.volumes.liftStarting);
      console.log('[GAME-AUDIO] Loaded lift starting sound');
    }, undefined, (error) => {
      console.warn('[GAME-AUDIO] Failed to load lift starting sound:', error);
    });
    
    this.audioLoader.load(this.soundPaths.liftStopping, (buffer) => {
      this.liftStoppingSound.setBuffer(buffer);
      this.liftStoppingSound.setVolume(this.volumes.liftStopping);
      console.log('[GAME-AUDIO] Loaded lift stopping sound');
    }, undefined, (error) => {
      console.warn('[GAME-AUDIO] Failed to load lift stopping sound:', error);
    });
  }

  playDoorOpeningSound() {
    if (!this.isInitialized) return;
    
    if (this.doorOpeningSound && this.doorOpeningSound.buffer && !this.doorOpeningSound.isPlaying) {
      try {
        this.doorOpeningSound.play();
      } catch (error) {
        console.debug('[GAME-AUDIO] Door opening sound play error:', error.message);
      }
    }
  }

  playItemPickupSound() {
    if (!this.isInitialized) return;
    
    if (this.itemPickupSound && this.itemPickupSound.buffer && !this.itemPickupSound.isPlaying) {
      try {
        this.itemPickupSound.play();
      } catch (error) {
        console.debug('[GAME-AUDIO] Item pickup sound play error:', error.message);
      }
    }
  }

  playLiftStartingSound() {
    if (!this.isInitialized) return;
    
    if (this.liftStartingSound && this.liftStartingSound.buffer && !this.liftStartingSound.isPlaying) {
      try {
        this.liftStartingSound.play();
      } catch (error) {
        console.debug('[GAME-AUDIO] Lift starting sound play error:', error.message);
      }
    }
  }

  playLiftStoppingSound() {
    if (!this.isInitialized) return;
    
    if (this.liftStoppingSound && this.liftStoppingSound.buffer && !this.liftStoppingSound.isPlaying) {
      try {
        this.liftStoppingSound.play();
      } catch (error) {
        console.debug('[GAME-AUDIO] Lift stopping sound play error:', error.message);
      }
    }
  }

  stopAllSounds() {
    const sounds = [this.doorOpeningSound, this.itemPickupSound, this.liftStartingSound, this.liftStoppingSound];
    sounds.forEach(sound => {
      if (sound && sound.isPlaying) {
        try {
          sound.stop();
        } catch (error) {
          console.debug('[GAME-AUDIO] Sound stop error:', error.message);
        }
      }
    });
  }

  dispose() {
    console.log('[GAME-AUDIO] Disposing game audio system');
    this.stopAllSounds();
    this.isInitialized = false;
    this.listener = null;
  }
}

export const gameAudioManager = new GameAudioManager();
