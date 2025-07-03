// Enemy Audio Configuration
export const ENEMY_AUDIO_CONFIG = {
  // Volume levels
  VOLUMES: {
    HIT: 0.25,
    DEATH: 0.3,
    ATTACK: 0.35,
    NEARBY: 0.15,
    SIGHT: 0.4
  },
  
  // Distance settings
  DISTANCES: {
    ACTIVATION: 15.0,  // Distance to trigger sight sound
    NEARBY: 8.0        // Distance to trigger nearby sound
  },
  
  // Audio paths by enemy type
  SOUND_PATHS: {
    LostSoul: {
      hit: '/T2/assets/sounds/lost_soul/lost_soul_injured.wav',
      death: '/T2/assets/sounds/lost_soul/lost_soul_death.wav',
      attack: '/T2/assets/sounds/lost_soul/lost_soul_attack.wav',
      nearby: '/T2/assets/sounds/lost_soul/lost_soul_nearby.wav',
      sight: '/T2/assets/sounds/lost_soul/lost_soul_nearby.wav' // Using nearby for sight
    },
    Cacodemon: {
      hit: '/T2/assets/sounds/cacodemon/cacodemon_injured.wav',
      death: '/T2/assets/sounds/cacodemon/cacodemon_death.wav',
      attack: '/T2/assets/sounds/cacodemon/cacodemon_attack.wav',
      nearby: '/T2/assets/sounds/cacodemon/cacodemon_nearby.wav',
      sight: '/T2/assets/sounds/cacodemon/cacodemon_sight.wav'
    }
  },
  
  // Sound properties by type
  SOUND_PROPERTIES: {
    hit: { loop: false },
    death: { loop: false },
    attack: { loop: false },
    nearby: { loop: true },
    sight: { loop: false }
  }
};

// Helper function to get sound configuration for an enemy type
export function getEnemySoundConfig(enemyType) {
  const paths = ENEMY_AUDIO_CONFIG.SOUND_PATHS[enemyType];
  const volumes = ENEMY_AUDIO_CONFIG.VOLUMES;
  const properties = ENEMY_AUDIO_CONFIG.SOUND_PROPERTIES;
  
  if (!paths) {
    console.warn(`[ENEMY_AUDIO] No sound configuration found for enemy type: ${enemyType}`);
    return null;
  }
  
  const config = {};
  
  Object.keys(paths).forEach(soundType => {
    config[soundType] = {
      path: paths[soundType],
      volume: volumes[soundType.toUpperCase()] || 0.25,
      loop: properties[soundType]?.loop || false
    };
  });
  
  return config;
}

// Add new enemy sound configurations here
export function registerEnemySounds(enemyType, soundPaths) {
  ENEMY_AUDIO_CONFIG.SOUND_PATHS[enemyType] = soundPaths;
  console.log(`[ENEMY_AUDIO] Registered sound configuration for ${enemyType}`);
}

// Debug function to test audio paths
export function debugAudioPaths() {
  console.log('[ENEMY_AUDIO] Available sound paths:');
  Object.entries(ENEMY_AUDIO_CONFIG.SOUND_PATHS).forEach(([enemyType, paths]) => {
    console.log(`${enemyType}:`, paths);
  });
}

// Function to validate audio file existence (for debugging)
export async function validateAudioPaths() {
  const results = {};
  
  for (const [enemyType, paths] of Object.entries(ENEMY_AUDIO_CONFIG.SOUND_PATHS)) {
    results[enemyType] = {};
    
    for (const [soundType, path] of Object.entries(paths)) {
      try {
        const response = await fetch(path, { method: 'HEAD' });
        results[enemyType][soundType] = {
          path,
          exists: response.ok,
          status: response.status
        };
      } catch (error) {
        results[enemyType][soundType] = {
          path,
          exists: false,
          error: error.message
        };
      }
    }
  }
  
  console.log('[ENEMY_AUDIO] Audio path validation results:', results);
  return results;
}
