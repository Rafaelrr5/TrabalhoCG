import { ambientAudioManager } from './ambientAudio.js';
import { playerAudioManager } from './playerAudio.js';
import { gameAudioManager } from './gameAudio.js';
import { enemies } from '../../entities/enemies/enemy.js';

export class AudioManager {
    constructor() {
        this.isEnabled = true;
        this.previousAmbientState = true;
        
        this.audioManagers = {
            ambient: ambientAudioManager,
            player: playerAudioManager,
            game: gameAudioManager
        };
    }

    toggleAudio() {
        if (this.isEnabled) {
            this.disableAudio();
        } else {
            this.enableAudio();
        }
        return this.isEnabled;
    }

    disableAudio() {
        console.log('[AUDIO MANAGER] Desativando todos os sons...');
        
        this.previousAmbientState = this.audioManagers.ambient.isEnabled;
        
        if (this.audioManagers.ambient.disable) {
            this.audioManagers.ambient.disable();
        }
        
        if (this.audioManagers.player.stopAllSounds) {
            this.audioManagers.player.stopAllSounds();
        }
        
        if (this.audioManagers.game.stopAllSounds) {
            this.audioManagers.game.stopAllSounds();
        }
        
        this.disableEnemyAudio();
        
        this.isEnabled = false;
        this.showAudioStatus('🔇 Sons desativados');
    }

    enableAudio() {
        console.log('[AUDIO MANAGER] Ativando todos os sons...');
        
        if (this.previousAmbientState && this.audioManagers.ambient.enable) {
            this.audioManagers.ambient.enable();
            
            if (this.audioManagers.ambient.reloadCurrentMusic) {
                this.audioManagers.ambient.reloadCurrentMusic();
            }
        }
        
        this.enableEnemyAudio();
        
        this.isEnabled = true;
        this.showAudioStatus('🔊 Sons ativados');
    }

    isAudioEnabled() {
        return this.isEnabled;
    }

    showAudioStatus(message) {
        const existingStatus = document.getElementById('audio-status');
        if (existingStatus) {
            existingStatus.remove();
        }

        const statusElement = document.createElement('div');
        statusElement.id = 'audio-status';
        statusElement.textContent = message;
        statusElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            font-weight: bold;
            z-index: 1000;
            border: 2px solid ${this.isEnabled ? '#4CAF50' : '#f44336'};
            transition: opacity 0.3s ease;
        `;

        document.body.appendChild(statusElement);

        setTimeout(() => {
            if (statusElement && statusElement.parentNode) {
                statusElement.style.opacity = '0';
                setTimeout(() => {
                    if (statusElement.parentNode) {
                        statusElement.parentNode.removeChild(statusElement);
                    }
                }, 300);
            }
        }, 3000);
    }

    forceStopAllSounds() {
        Object.values(this.audioManagers).forEach(manager => {
            if (manager && typeof manager.stopAllSounds === 'function') {
                manager.stopAllSounds();
            }
        });
        
        this.disableEnemyAudio();
    }

    disableEnemyAudio() {
        if (enemies && Array.isArray(enemies)) {
            enemies.forEach(enemy => {
                if (enemy && enemy.audio && typeof enemy.audio.disable === 'function') {
                    enemy.audio.disable();
                }
            });
        }
    }

    enableEnemyAudio() {
        if (enemies && Array.isArray(enemies)) {
            enemies.forEach(enemy => {
                if (enemy && enemy.audio && typeof enemy.audio.enable === 'function') {
                    enemy.audio.enable();
                }
            });
        }
    }

    getAudioStats() {
        const enemyStats = {
            total: enemies ? enemies.length : 0,
            audioEnabled: 0
        };
        
        if (enemies && Array.isArray(enemies)) {
            enemyStats.audioEnabled = enemies.filter(enemy => 
                enemy && enemy.audio && enemy.audio.enabled
            ).length;
        }
        
        return {
            enabled: this.isEnabled,
            ambient: {
                enabled: this.audioManagers.ambient.isEnabled,
                playing: this.audioManagers.ambient.isPlaying ? this.audioManagers.ambient.isPlaying() : false,
                currentArea: this.audioManagers.ambient.getCurrentArea ? this.audioManagers.ambient.getCurrentArea() : 'unknown'
            },
            enemies: enemyStats
        };
    }
}

export const audioManager = new AudioManager();