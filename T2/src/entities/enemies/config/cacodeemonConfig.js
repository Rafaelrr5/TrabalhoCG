export const CACODEMON_CONFIG = {
  // Basic Properties
  RADIUS: 1.2,
  COLOR: 0x8B0000,
  MAX_HEALTH: 50,
  SPEED: 3.5,
  
  // Combat Properties
  ATTACK_RANGE: 40.0,
  ATTACK_COOLDOWN: 2.5,
  PROJECTILE_SPEED: 12.0,
  PROJECTILE_DAMAGE: 20,
  PROJECTILE_RADIUS: 0.4,
  PROJECTILE_COLOR: 0xFFFF00,
  
  // Floating Behavior
  FLOAT_AMPLITUDE: 1.5,
  FLOAT_FREQUENCY: 0.8,
  IDLE_ROTATION_SPEED: 0.3,
  
  // Model Properties
  MODEL_SCALE: 1.0,
  MODEL_Y_ROTATION_OFFSET: 0,
  MODEL_X_ROTATION_OFFSET: 0,
  MODEL_Z_ROTATION_OFFSET: 0,
  MODEL_PATH: null,
  
  // Animation Properties
  ATTACK_ANIMATION_DURATION: 0.5,
  DEATH_ANIMATION_DURATION: 2.0,
  FADE_OUT_SPEED: 0.02,
  
  // AI Properties
  LINE_OF_SIGHT_RANGE: 60.0,
  AGGRO_RANGE: 40.0,
  PATROL_RADIUS: 8.0,
  PURSUIT_RANGE: 45.0,
  MIN_DISTANCE_TO_PLAYER: 12.0,
  MOVE_SPEED: 3.5,
  ACTIVATION_DISTANCE: 50.0,
  OPTIMAL_ATTACK_DISTANCE: 16.0,
  MAX_ATTACK_DISTANCE: 22.0,
  
  // Spawn Properties
  SPAWN_AREAS: {
    area2: {
      positions: [
        [37.5, 34.0, -125.0],
        [-30, 19.0, -125.0],
        [-30, 24.0, -145.0],
      ],
      maxCount: 3
    },
    area3: {
      positions: [
        [100, 20, 100],
        [110, 22, 110],
      ],
      maxCount: 2
    },
    boss_area: {
      positions: [
        [0, 25, 100],
        [-20, 25, 120],
        [20, 25, 120],
      ],
      maxCount: 3
    }
  },
  
  // Sound Properties
  SOUNDS: {
    ATTACK: null,
    DEATH: null,
    IDLE: null,
    PROJECTILE_HIT: null,
  },
  
  // Effects Properties
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
  
  isPlayerInArea3: (camera) => {
    return false;
  },
  
  isPlayerInBossArea: (camera) => {
    return false;
  }
};

// Difficulty scaling
export const CACODEMON_DIFFICULTY = {
  easy: {
    healthMultiplier: 0.7,
    damageMultiplier: 0.8,
    speedMultiplier: 0.8,
    attackCooldownMultiplier: 1.3,
    accelerationMultiplier: 0.7,
    rotationSpeedMultiplier: 0.8
  },
  normal: {
    healthMultiplier: 1.0,
    damageMultiplier: 1.0,
    speedMultiplier: 1.0,
    attackCooldownMultiplier: 1.0,
    accelerationMultiplier: 1.0,
    rotationSpeedMultiplier: 1.0
  },
  hard: {
    healthMultiplier: 1.5,
    damageMultiplier: 1.3,
    speedMultiplier: 1.3,
    attackCooldownMultiplier: 0.7,
    accelerationMultiplier: 1.4,
    rotationSpeedMultiplier: 1.3
  }
};

export function getCacodeemonConfig(difficulty = 'normal') {
  const baseConfig = { ...CACODEMON_CONFIG };
  const difficultyConfig = CACODEMON_DIFFICULTY[difficulty] || CACODEMON_DIFFICULTY.normal;
  
  return {
    ...baseConfig,
    maxHealth: Math.round(baseConfig.MAX_HEALTH * difficultyConfig.healthMultiplier),
    projectileDamage: Math.round(baseConfig.PROJECTILE_DAMAGE * difficultyConfig.damageMultiplier),
    speed: baseConfig.SPEED * difficultyConfig.speedMultiplier,
    moveSpeed: baseConfig.MOVE_SPEED * difficultyConfig.speedMultiplier,
    attackCooldown: baseConfig.ATTACK_COOLDOWN * difficultyConfig.attackCooldownMultiplier,
    acceleration: 8.0 * (difficultyConfig.accelerationMultiplier || 1.0),
    rotationSpeed: 2.0 * (difficultyConfig.rotationSpeedMultiplier || 1.0),
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
