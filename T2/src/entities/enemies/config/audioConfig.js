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
      hit: '../../../../assets/sounds/lost_soul/lost_soul_injured.wav',
      death: '../../../../assets/sounds/lost_soul/lost_soul_death.wav',
      attack: '../../../../assets/sounds/lost_soul/lost_soul_attack.wav',
      nearby: '../../../../assets/sounds/lost_soul/lost_soul_nearby.wav',
      sight: '../../../../assets/sounds/lost_soul/lost_soul_nearby.wav' // Using nearby for sight
    },
    Cacodemon: {
      hit: '../../../../assets/sounds/cacodemon/cacodemon_injured.wav',
      death: '../../../../assets/sounds/cacodemon/cacodemon_death.wav',
      attack: '../../../../assets/sounds/cacodemon/cacodemon_attack.wav',
      nearby: '../../../../assets/sounds/cacodemon/cacodemon_nearby.wav',
      sight: '../../../../assets/sounds/cacodemon/cacodemon_sight.wav'
    },
    PainElemental: {
      hit: '../../../../../../0_assetsT3/sounds/painElemental/injured.wav',
      death: '../../../../assets/sounds/cacodemon/cacodemon_death.wav',
      attack: '../../../../../../0_assetsT3/sounds/painElemental/painAttack.wav',
      nearby: '../../../../assets/sounds/cacodemon/cacodemon_nearby.wav',
      sight: '../../../../../../0_assetsT3/sounds/painElemental/painAttack.wav'
    },
    Zombieman: {
      hit: '../../../../../0_assetsT3/sounds/soldier/injured.wav',
      death: '../../../../../0_assetsT3/sounds/soldier/injured.wav',
      attack: '../../../../../0_assetsT3/sounds/soldier/soldierAttack.wav',
      nearby: '../../../../../0_assetsT3/sounds/soldier/soldierSight.wav',
      sight: '../../../../../0_assetsT3/sounds/soldier/soldierSight.wav'
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
