/**
 * Cacodemon Configuration
 * TODO: Update these values when specific requirements are provided
 */

export const CACODEMON_CONFIG = {
  // Basic Properties
  RADIUS: 1.2,
  COLOR: 0x8B0000, // Dark red
  MAX_HEALTH: 50, // Updated to 50 HP as specified
  SPEED: 2.0, // Slower since they're ranged attackers
  
  // Combat Properties
  ATTACK_RANGE: 40.0, // Good range for area combat
  ATTACK_COOLDOWN: 2.5, // Reasonable firing rate
  PROJECTILE_SPEED: 12.0, // Moderate speed for dodgeable projectiles
  PROJECTILE_DAMAGE: 20, // Balanced damage
  PROJECTILE_RADIUS: 0.4, // Slightly larger for visibility
  PROJECTILE_COLOR: 0xFFFF00, // Yellow as specified
  
  // Floating Behavior
  FLOAT_AMPLITUDE: 2.0,
  FLOAT_FREQUENCY: 1.0,
  IDLE_ROTATION_SPEED: 0.5,
  
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
  
  // AI Properties
  LINE_OF_SIGHT_RANGE: 60.0,
  AGGRO_RANGE: 40.0,
  PATROL_RADIUS: 10.0,
  
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

// Difficulty scaling
export const CACODEMON_DIFFICULTY = {
  easy: {
    healthMultiplier: 0.7,
    damageMultiplier: 0.8,
    speedMultiplier: 0.9,
    attackCooldownMultiplier: 1.2
  },
  normal: {
    healthMultiplier: 1.0,
    damageMultiplier: 1.0,
    speedMultiplier: 1.0,
    attackCooldownMultiplier: 1.0
  },
  hard: {
    healthMultiplier: 1.5,
    damageMultiplier: 1.3,
    speedMultiplier: 1.2,
    attackCooldownMultiplier: 0.8
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
    attackCooldown: baseConfig.ATTACK_COOLDOWN * difficultyConfig.attackCooldownMultiplier
  };
}
