// Enemy Audio Configuration
export const ENEMY_AUDIO_CONFIG = {
  VOLUMES: {
    HIT: 0.25,
    DEATH: 0.3,
    ATTACK: 0.35,
    NEARBY: 0.15,
    SIGHT: 0.4
  },
  
  DISTANCES: {
    ACTIVATION: 15.0,  // Distance to trigger sight sound
    NEARBY: 8.0        // Distance to trigger nearby sound
  },
  
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
  
  SOUND_PROPERTIES: {
    hit: { loop: false },
    death: { loop: false },
    attack: { loop: false },
    nearby: { loop: true },
    sight: { loop: false }
  }
};

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
