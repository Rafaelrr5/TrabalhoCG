export const CACODEMON_CONFIG = {
  RADIUS: 1.2,
  COLOR: 0x8B0000,
  MAX_HEALTH: 50,
  SPEED: 4.5, // Increased from 3.5
  
  ATTACK_RANGE: 60.0, // Increased from 45.0 for longer range attacks
  ATTACK_COOLDOWN: 1.5, // Decreased from 1.8 for even more frequent attacks
  PROJECTILE_SPEED: 40.0, // Increased from 35.0 for faster projectiles
  PROJECTILE_DAMAGE: 15, // Increased from 12 for more damage
  PROJECTILE_RADIUS: 0.4,
  PROJECTILE_COLOR: 0xFFFF00,
  
  FLOAT_AMPLITUDE: 1.5,
  FLOAT_FREQUENCY: 0.8,
  IDLE_ROTATION_SPEED: 0.3,
  
  MODEL_SCALE: 1.0,
  MODEL_Y_ROTATION_OFFSET: 0,
  MODEL_X_ROTATION_OFFSET: 0,
  MODEL_Z_ROTATION_OFFSET: 0,
  MODEL_PATH: null,
  
  ATTACK_ANIMATION_DURATION: 0.5,
  DEATH_ANIMATION_DURATION: 1.2,
  FADE_OUT_SPEED: 0.2,
  
  LINE_OF_SIGHT_RANGE: 80.0,
  AGGRO_RANGE: 50.0, // Increased from 40.0
  PATROL_RADIUS: 8.0,
  PURSUIT_RANGE: 100.0, // Increased from 70.0 for extended pursuit
  MIN_DISTANCE_TO_PLAYER: 15.0, // Decreased from 18.0 - get even closer
  MOVE_SPEED: 10.0, // Increased from 8.0 for faster movement
  ACTIVATION_DISTANCE: 80.0, // Increased from 60.0 for earlier activation
  OPTIMAL_ATTACK_DISTANCE: 12.0, // Decreased from 14.0 - attack even closer
  MAX_ATTACK_DISTANCE: 25.0, // Increased from 20.0
  
  SPAWN_AREAS: {
    area2: {
      positions: [
        [37.5, 34.0, -125.0],
        [-30, 19.0, -125.0],
        [-30, 24.0, -145.0],
      ],
      maxCount: 3
    },
  },
  
  SOUNDS: {
    ATTACK: null,
    DEATH: null,
    IDLE: null,
    PROJECTILE_HIT: null,
  },
  
  EFFECTS: {
    MUZZLE_FLASH: {
      enabled: true,
      color: 0xFF8800,
      size: 1.0,
      duration: 0.1
    },
    DEATH_EXPLOSION: {
      enabled: true,
      color: 0xFF0000,
      size: 2.0,
      duration: 0.5
    },
    PROJECTILE_TRAIL: {
      enabled: true,
      color: 0xFF4444,
      length: 3.0
    }
  }
};

// Area detection functions
export const CACODEMON_AREAS = {
  isPlayerInArea2: (camera) => {
    if (typeof window !== 'undefined' && window.isPlayerInArea2) {
      return window.isPlayerInArea2(camera);
    }
    
    const playerX = camera.position.x;
    const playerZ = camera.position.z;
    
    const inArea2 = playerX >= -62.5 && playerX <= 62.5 && 
                    playerZ >= -193.5 && playerZ <= -63.0;
    
    return inArea2;
  },
};

export function getCacodeemonConfig() {
  const baseConfig = { ...CACODEMON_CONFIG };
  return {
    ...baseConfig,
    maxHealth: baseConfig.MAX_HEALTH,
    projectileDamage: baseConfig.PROJECTILE_DAMAGE,
    speed: baseConfig.SPEED,
    moveSpeed: baseConfig.MOVE_SPEED,
    attackCooldown: baseConfig.ATTACK_COOLDOWN,
  
    acceleration: 10.0, // Increased from 8.0
    rotationSpeed: 3.0, // Increased from 2.0
    
    pursuitRange: baseConfig.PURSUIT_RANGE,
    minDistanceToPlayer: baseConfig.MIN_DISTANCE_TO_PLAYER,
    activationDistance: baseConfig.ACTIVATION_DISTANCE,
    optimalAttackDistance: baseConfig.OPTIMAL_ATTACK_DISTANCE,
    maxAttackDistance: baseConfig.MAX_ATTACK_DISTANCE,
    
    radius: baseConfig.RADIUS,
    color: baseConfig.COLOR,
    attackRange: baseConfig.ATTACK_RANGE,
    projectileSpeed: baseConfig.PROJECTILE_SPEED,
    floatAmplitude: baseConfig.FLOAT_AMPLITUDE,
    floatFrequency: baseConfig.FLOAT_FREQUENCY
  };
}
