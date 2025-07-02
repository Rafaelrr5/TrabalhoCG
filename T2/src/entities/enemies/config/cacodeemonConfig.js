/**
 * Cacodemon Configuration
 * TODO: Update these values when specific requirements are provided
 */

export const CACODEMON_CONFIG = {
  // Basic Properties
  RADIUS: 1.2,
  COLOR: 0x8B0000, // Dark red
  MAX_HEALTH: 50, // Updated to 50 HP as specified
  SPEED: 3.5, // Adjusted for smoother movement
  
  // Combat Properties
  ATTACK_RANGE: 40.0, // Good range for area combat
  ATTACK_COOLDOWN: 2.5, // Reasonable firing rate
  PROJECTILE_SPEED: 12.0, // Moderate speed for dodgeable projectiles
  PROJECTILE_DAMAGE: 20, // Balanced damage
  PROJECTILE_RADIUS: 0.4, // Slightly larger for visibility
  PROJECTILE_COLOR: 0xFFFF00, // Yellow as specified
  
  // Floating Behavior - adjusted for smoother movement
  FLOAT_AMPLITUDE: 1.5, // Reduced for less jarring movement
  FLOAT_FREQUENCY: 0.8, // Slightly slower floating
  IDLE_ROTATION_SPEED: 0.3, // Slower rotation for smoother feel
  
  // Model Properties (to be configured)
  MODEL_SCALE: 1.0,
  MODEL_Y_ROTATION_OFFSET: 0,
  MODEL_X_ROTATION_OFFSET: 0,
  MODEL_Z_ROTATION_OFFSET: 0,
  MODEL_PATH: null, // TODO: Set model path when available
  
  // Animation Properties (to be configured)
  ATTACK_ANIMATION_DURATION: 0.5,
  DEATH_ANIMATION_DURATION: 2.0,
  FADE_OUT_SPEED: 0.02,
  
  // AI Properties - adjusted for smooth movement
  LINE_OF_SIGHT_RANGE: 60.0,
  AGGRO_RANGE: 40.0,
  PATROL_RADIUS: 8.0, // Reduced for tighter movement
  PURSUIT_RANGE: 45.0, // Range within which they pursue the player
  MIN_DISTANCE_TO_PLAYER: 12.0, // Minimum distance to maintain from player
  MOVE_SPEED: 3.5, // Consistent with SPEED
  ACTIVATION_DISTANCE: 50.0, // Distance to start following player
  OPTIMAL_ATTACK_DISTANCE: 16.0, // Slightly closer for better targeting
  MAX_ATTACK_DISTANCE: 22.0, // Adjusted to work with optimal distance
  
  // Spawn Properties
  SPAWN_AREAS: {
    area2: {
      positions: [
        // Positioned on top of the 3 main rectangular blocks in Area 2
        [37.5, 34.0, -125.0],    // On top of bloco2 (center: Y=22, scale: 20, top: Y=32, spawn: Y=34)
        [-30, 19.0, -125.0],     // On top of bloco4 (center: Y=9.5, scale: 15, top: Y=17, spawn: Y=19)  
        [-30, 24.0, -145.0],     // On top of bloco6 (center: Y=12, scale: 20, top: Y=22, spawn: Y=24)
      ],
      maxCount: 3
    },
    area3: {
      positions: [
        // TODO: Configure specific positions for area 3
        [100, 20, 100],
        [110, 22, 110],
      ],
      maxCount: 2
    },
    boss_area: {
      positions: [
        // TODO: Configure positions for boss area
        [0, 25, 100],
        [-20, 25, 120],
        [20, 25, 120],
      ],
      maxCount: 3
    }
  },
  
  // Sound Properties (to be configured)
  SOUNDS: {
    ATTACK: null,    // TODO: Set attack sound path
    DEATH: null,     // TODO: Set death sound path
    IDLE: null,      // TODO: Set idle sound path
    PROJECTILE_HIT: null, // TODO: Set projectile hit sound path
  },
  
  // Effects Properties (to be configured)
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
    // Import the function from environment system
    if (typeof window !== 'undefined' && window.isPlayerInArea2) {
      return window.isPlayerInArea2(camera);
    }
    // Fallback implementation if not available
    const playerX = camera.position.x;
    const playerZ = camera.position.z;
    
    // Area 2 bounds (simplified)
    const inArea2 = playerX >= -62.5 && playerX <= 62.5 && 
                    playerZ >= -193.5 && playerZ <= -63.0;
    
    return inArea2;
  },
  
  isPlayerInArea3: (camera) => {
    // Placeholder - implement when area 3 bounds are defined
    return false;
  },
  
  isPlayerInBossArea: (camera) => {
    // Placeholder - implement when boss area bounds are defined
    return false;
  }
};

// Difficulty scaling - adjusted for smooth movement
export const CACODEMON_DIFFICULTY = {
  easy: {
    healthMultiplier: 0.7,
    damageMultiplier: 0.8,
    speedMultiplier: 0.8, // Slower for easier difficulty
    attackCooldownMultiplier: 1.3, // Longer cooldowns
    accelerationMultiplier: 0.7, // Slower acceleration
    rotationSpeedMultiplier: 0.8 // Slower turning
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
    speedMultiplier: 1.3, // Faster for harder difficulty
    attackCooldownMultiplier: 0.7, // Shorter cooldowns
    accelerationMultiplier: 1.4, // Faster acceleration
    rotationSpeedMultiplier: 1.3 // Faster turning
  }
};

// Helper function to get configuration based on difficulty
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
    // Smooth movement properties
    acceleration: 8.0 * (difficultyConfig.accelerationMultiplier || 1.0),
    rotationSpeed: 2.0 * (difficultyConfig.rotationSpeedMultiplier || 1.0),
    pursuitRange: baseConfig.PURSUIT_RANGE,
    minDistanceToPlayer: baseConfig.MIN_DISTANCE_TO_PLAYER,
    activationDistance: baseConfig.ACTIVATION_DISTANCE,
    optimalAttackDistance: baseConfig.OPTIMAL_ATTACK_DISTANCE,
    maxAttackDistance: baseConfig.MAX_ATTACK_DISTANCE,
    // Combat properties
    radius: baseConfig.RADIUS,
    color: baseConfig.COLOR,
    attackRange: baseConfig.ATTACK_RANGE,
    projectileSpeed: baseConfig.PROJECTILE_SPEED,
    // Floating behavior
    floatAmplitude: baseConfig.FLOAT_AMPLITUDE,
    floatFrequency: baseConfig.FLOAT_FREQUENCY
  };
}
