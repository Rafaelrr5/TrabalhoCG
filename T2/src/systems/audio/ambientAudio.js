import * as THREE from '../../../../build/three.module.js';

export class AmbientAudioManager {
  constructor() {
    this.currentAmbientMusic = null;
    this.currentArea = 'none';
    this.audioLoader = new THREE.AudioLoader();
    this.isInitialized = false;
    this.fadeSpeed = 0.8; // Faster fade for better transitions
    this.maxVolume = 0.6; // Higher volume for ambient music (main audio)
    this.isEnabled = true;
    this.isTransitioning = false; // Prevent overlapping transitions
    
    this.areaMusicMap = {
      'none': '/T2/assets/sounds/ambient/nenhumaarea.wav',
      'area1': '/T2/assets/sounds/ambient/area1.wav',
      'area2': '/T2/assets/sounds/ambient/area2.wav'
    };
  }

  init(listener) {
    if (!listener) {
      console.warn('[AMBIENT] Audio listener not available');
      return;
    }
    
    this.listener = listener;
    this.isInitialized = true;
    
    this.forcePlayAreaMusic('none');
  }

  playAreaMusic(areaName) {
    if (!this.isInitialized || !this.isEnabled) {
      console.log(`[AMBIENT] System not ready - would play: ${areaName}`);
      return;
    }
    
    if (this.isTransitioning) {
      console.log(`[AMBIENT] Already transitioning, ignoring request for: ${areaName}`);
      return;
    }

    if (this.currentArea === areaName) return;
    
    this.isTransitioning = true;
    
    this.stopCurrentMusic(() => {
      this.currentArea = areaName;
      this.loadAndPlayMusic(areaName);
    });
  }

  forcePlayAreaMusic(areaName) {
    if (!this.isInitialized || !this.isEnabled) {
      console.log(`[AMBIENT] System not ready - would force play: ${areaName}`);
      return;
    }
    
    console.log(`[AMBIENT] Force starting music for area: ${areaName}`);
    
    this.isTransitioning = false;
    
    if (this.currentAmbientMusic) {
      if (this.currentAmbientMusic.isPlaying) {
        this.currentAmbientMusic.stop();
      }
      this.currentAmbientMusic = null;
    }
    
    this.currentArea = areaName;
    this.loadAndPlayMusic(areaName);
  }

  loadAndPlayMusic(areaName) {
    if (!this.isEnabled) {
      console.log('[AMBIENT] System disabled, skipping music load');
      this.isTransitioning = false;
      return;
    }
    
    const musicPath = this.areaMusicMap[areaName] || this.areaMusicMap['none'];
    console.log(`[AMBIENT] Loading music: ${musicPath}`);

    // Create new audio object
    this.currentAmbientMusic = new THREE.Audio(this.listener);
    
    this.audioLoader.load(musicPath, (buffer) => {
      
      if (this.currentAmbientMusic && this.currentArea === areaName) {
        this.currentAmbientMusic.setBuffer(buffer);
        this.currentAmbientMusic.setLoop(true);
        this.currentAmbientMusic.setVolume(0); // Start at 0 for fade in
        
        try {
          this.currentAmbientMusic.play();
          
          // Fade in the music
          this.fadeIn(() => {
            this.isTransitioning = false; // Transition complete
          });
        } catch (error) {
          console.error(`[AMBIENT] Failed to play music: ${error.message}`);
          this.isTransitioning = false;
        }
      } else {
        console.warn('[AMBIENT] Music load callback called but context changed');
        this.isTransitioning = false;
      }
    }, undefined, (error) => {
      console.warn(`[AMBIENT] Could not load ambient music: ${musicPath}`, error);
      // Fallback to no music for this area
      this.currentAmbientMusic = null;
      this.isTransitioning = false;
    });
  }

  stopCurrentMusic(callback) {
    if (this.currentAmbientMusic && this.currentAmbientMusic.isPlaying) {
      console.log('[AMBIENT] Stopping current music with fade out');
      this.fadeOut(() => {
        if (this.currentAmbientMusic) {
          this.currentAmbientMusic.stop();
          this.currentAmbientMusic = null;
        }
        if (callback) callback();
      });
    } else if (this.currentAmbientMusic) {
      // If not playing, just clean up
      this.currentAmbientMusic.stop();
      this.currentAmbientMusic = null;
      if (callback) callback();
    } else {
      // No current music, proceed immediately
      if (callback) callback();
    }
  }

  fadeIn(callback) {
    if (!this.currentAmbientMusic) {
      if (callback) callback();
      return;
    }
    
    const fadeInInterval = setInterval(() => {
      if (!this.currentAmbientMusic || !this.currentAmbientMusic.isPlaying) {
        clearInterval(fadeInInterval);
        if (callback) callback();
        return;
      }
      
      const currentVolume = this.currentAmbientMusic.getVolume();
      const newVolume = Math.min(currentVolume + this.fadeSpeed * 0.1, this.maxVolume);
      
      this.currentAmbientMusic.setVolume(newVolume);
      
      if (newVolume >= this.maxVolume) {
        clearInterval(fadeInInterval);
        if (callback) callback();
      }
    }, 100);
  }

  fadeOut(callback) {
    if (!this.currentAmbientMusic) {
      if (callback) callback();
      return;
    }
    
    const fadeOutInterval = setInterval(() => {
      if (!this.currentAmbientMusic) {
        clearInterval(fadeOutInterval);
        if (callback) callback();
        return;
      }
      
      const currentVolume = this.currentAmbientMusic.getVolume();
      const newVolume = Math.max(currentVolume - this.fadeSpeed * 0.1, 0);
      
      this.currentAmbientMusic.setVolume(newVolume);
      
      if (newVolume <= 0) {
        clearInterval(fadeOutInterval);
        if (callback) callback();
      }
    }, 100);
  }

  setVolume(volume) {
    this.maxVolume = Math.max(0, Math.min(1, volume));
    if (this.currentAmbientMusic) {
      this.currentAmbientMusic.setVolume(this.maxVolume);
    }
  }

  getCurrentArea() {
    return this.currentArea;
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
    this.stopCurrentMusic();
  }

  isPlaying() {
    return this.currentAmbientMusic && this.currentAmbientMusic.isPlaying;
  }

  getCurrentMusic() {
    return this.currentArea;
  }

  reloadCurrentMusic() {
    if (this.isEnabled && this.currentArea) {
      const currentArea = this.currentArea;
      this.currentArea = null; // Force reload
      this.playAreaMusic(currentArea);
    }
  }

  ensureAmbientMusicPlaying() {
    if (this.isEnabled && this.isInitialized && this.currentAmbientMusic) {
      if (!this.currentAmbientMusic.isPlaying && this.currentAmbientMusic.buffer) {
        this.currentAmbientMusic.play();
      }
    }
  }

  dispose() {
    console.log('[AMBIENT] Disposing ambient audio system');
    this.stopCurrentMusic();
    this.isInitialized = false;
    this.isEnabled = false;
    this.isTransitioning = false;
    this.listener = null;
    this.currentArea = 'none';
  }
}

export const ambientAudioManager = new AmbientAudioManager();