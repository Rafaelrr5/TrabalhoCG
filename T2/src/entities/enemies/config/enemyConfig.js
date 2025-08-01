// ============================================================================
// CONFIGURAÇÕES GERAIS DE INIMIGOS
// ============================================================================

export const ENEMY_CONFIG = {
  // Configurações gerais de colisão para inimigos
  COLLISION_ENABLED: true,          // Habilita colisão global para inimigos
  COLLISION_DEBUG: false,           // Debug visual das colisões
  
  // Configurações de morte e efeitos visuais
  DEATH_FADE_ENABLED: true,         // Habilita fade de opacidade na morte
  DEATH_FADE_DURATION: 2.0,         // Duração do fade em segundos
  DEATH_FADE_DELAY: 0.5,            // Delay antes de começar o fade
  DEATH_REMOVE_DELAY: 0.2,          // Delay adicional antes de remover da cena
  DEATH_SCALE_EFFECT: true,         // Aplica efeito de escala durante a morte
  DEATH_ROTATION_EFFECT: false,     // Aplica rotação durante a morte
  
  // Configurações de transição e animação
  SMOOTH_TRANSITION: true,          // Transição suave entre idle e ativo
  TRANSITION_DEBUG: true,           // Logs de debug para transições
};

// ============================================================================
// CONFIGURAÇÕES DAS LOST SOULS
// ============================================================================

export const LOST_SOUL_CONFIG = {
  // Configurações básicas
  RADIUS: 0.6,
  COLOR: 0x8B0000,
  MAX_HEALTH: 20,
  SPEED: 4.0,
  DASH_SPEED: 25.0,
  DASH_INTERVAL: 1.5,
  DASH_DURATION: 2.0,
  KAMIKAZE_DAMAGE: 30,
  COLLISION_RADIUS: 1.5,
  
  // Configurações do modelo 3D
  SKULL_SCALE: 1.0,
  SKULL_Y_ROTATION_OFFSET: Math.PI,
  SKULL_X_ROTATION_OFFSET: -90,
  SKULL_Z_ROTATION_OFFSET: 0,
  SKULL_ORIENT_TO_MOVEMENT: true,         // Se true, skull olha na direção do movimento; se false, sempre olha para o target
  SKULL_SMOOTH_ROTATION: true,            // Aplica rotação suave (lerp) entre orientações
  SKULL_ROTATION_SPEED: 5.0,              // Velocidade da rotação suave (só se SKULL_SMOOTH_ROTATION = true)
  
  // Configurações de colisão ambiental
  ENABLE_COLLISION: true,       // Habilita/desabilita colisão das Lost Souls
  COLLISION_RADIUS_ENV: 1.2,        // Raio de colisão das Lost Souls
  COLLISION_RAYS: 8,            // Número de raycasts para detecção
  COLLISION_CORRECTION: 0.8,    // Fator de correção de colisão (reduzido para menos flickering)
  WALL_AVOIDANCE: 0.6,          // Força do desvio de paredes (reduzido)
  COLLISION_DISTANCE: 1.8,      // Distância mínima das paredes
  OBSTACLE_AVOIDANCE: true,     // Sistema inteligente de desvio de obstáculos
  VERTICAL_COLLISION: true,     // Colisão vertical (teto e chão)
  SMOOTH_COLLISION: true,       // Colisão suave (sem teleporte brusco)
  RAYCAST_DISTANCE: 2.5,        // Distância máxima do raycast
  COLLISION_SMOOTHING: 0.15,    // Suavização da correção de posição
  
  // Configurações de colisão entre Lost Souls
  INTER_COLLISION: true,        // Habilita colisão entre Lost Souls
  INTER_COLLISION_RADIUS: 2.0,  // Raio de detecção entre Lost Souls
  SEPARATION_FORCE: 1.5,        // Força de separação entre Lost Souls
  SEPARATION_DISTANCE: 3.0,     // Distância mínima entre Lost Souls
  
  // Configurações de spawn
  SPAWN_AREAS: {
    area1: {
      positions: [
        [-170, 0, -140],  // Y será ajustado automaticamente
        [-160, 0, -130],
        [-150, 0, -135],
        [-155, 0, -120],
        [-140, 0, -145]
      ],
      maxCount: 5
    }
  }
};

// ============================================================================
// CONFIGURAÇÕES DOS CACODEMONS
// ============================================================================

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
  MIN_DISTANCE_TO_PLAYER: 8.0, // Decreased from 15.0 - get much closer
  MOVE_SPEED: 12.0, // Increased from 10.0 for faster movement
  ACTIVATION_DISTANCE: 100.0, // Increased from 80.0 for earlier activation
  OPTIMAL_ATTACK_DISTANCE: 6.0, // Decreased from 12.0 - attack much closer
  MAX_ATTACK_DISTANCE: 15.0, // Decreased from 25.0
  
  SPAWN_AREAS: {
    area2: {
      positions: [
        [-22.5, 18, -155.5],
        [25.5, 18, -123.5],
        [-6.5, 18, -107.5],
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

// ============================================================================
// CONFIGURAÇÕES PARA INIMIGOS TERRESTRES (FUTUROS)
// ============================================================================

export const GROUND_ENEMY_CONFIG = {
  COLLISION_RADIUS: 0.8,     // Raio de colisão para inimigos terrestres
  COLLISION_RAYS: 6,         // Número de raycasts para inimigos terrestres
  WALL_AVOIDANCE: 1.0,       // Força do desvio para inimigos terrestres
  VERTICAL_COLLISION: false, // Inimigos terrestres não precisam de colisão vertical
};

// ============================================================================
// FUNÇÕES DE DETECÇÃO DE ÁREAS
// ============================================================================

export const ENEMY_AREAS = {
  isPlayerInArea1: (camera) => {
    if (typeof window !== 'undefined' && window.isPlayerInArea1) {
      return window.isPlayerInArea1(camera);
    }
    // Implementação padrão para área 1 (Lost Souls)
    const playerX = camera.position.x;
    const playerZ = camera.position.z;
    return playerX >= -200 && playerX <= -100 && playerZ >= -200 && playerZ <= -100;
  },

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

// ============================================================================
// FUNÇÕES UTILITÁRIAS DE CONFIGURAÇÃO
// ============================================================================

export function getLostSoulConfig() {
  const baseConfig = { ...LOST_SOUL_CONFIG };
  return {
    ...baseConfig,
    radius: baseConfig.RADIUS,
    color: baseConfig.COLOR,
    maxHealth: baseConfig.MAX_HEALTH,
    speed: baseConfig.SPEED,
    dashSpeed: baseConfig.DASH_SPEED,
    dashInterval: baseConfig.DASH_INTERVAL,
    dashDuration: baseConfig.DASH_DURATION,
    kamikazeDamage: baseConfig.KAMIKAZE_DAMAGE,
    collisionRadius: baseConfig.COLLISION_RADIUS,
    skullScale: baseConfig.SKULL_SCALE,
    skullYRotationOffset: baseConfig.SKULL_Y_ROTATION_OFFSET,
    skullXRotationOffset: baseConfig.SKULL_X_ROTATION_OFFSET,
    skullZRotationOffset: baseConfig.SKULL_Z_ROTATION_OFFSET,
    maintainPivotOnScale: true,
    
    // Health bar configuration
    healthBar: {
      enabled: true,
      offset: 0.8,  // Higher offset for Lost Souls since they move more
      width: 1.2,
      height: {
        background: 0.12,
        fill: 0.10
      }
    }
  };
}

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
    floatFrequency: baseConfig.FLOAT_FREQUENCY,
    
    // Health bar configuration
    healthBar: {
      enabled: true,
      offset: 1.0,  // Higher offset for Cacodemons since they're larger
      width: 1.5,   // Wider bar for boss-like enemies
      height: {
        background: 0.15,
        fill: 0.12
      }
    }
  };
}

// ============================================================================
// FUNÇÕES DE CONVERSÃO PARA COMPATIBILIDADE COM CONFIG GLOBAL
// ============================================================================

// Função para converter configurações do enemy config para o formato esperado pelo CONFIG global
export function getConfigCompatibilityValues() {
  return {
    // Configurações gerais de inimigos
    ENEMY_COLLISION_ENABLED: ENEMY_CONFIG.COLLISION_ENABLED,
    ENEMY_COLLISION_DEBUG: ENEMY_CONFIG.COLLISION_DEBUG,
    
    // Lost Soul - configurações de colisão ambiental
    LOST_SOUL_ENABLE_COLLISION: LOST_SOUL_CONFIG.ENABLE_COLLISION,
    LOST_SOUL_COLLISION_RADIUS: LOST_SOUL_CONFIG.COLLISION_RADIUS_ENV,
    LOST_SOUL_COLLISION_RAYS: LOST_SOUL_CONFIG.COLLISION_RAYS,
    LOST_SOUL_COLLISION_CORRECTION: LOST_SOUL_CONFIG.COLLISION_CORRECTION,
    LOST_SOUL_WALL_AVOIDANCE: LOST_SOUL_CONFIG.WALL_AVOIDANCE,
    LOST_SOUL_COLLISION_DISTANCE: LOST_SOUL_CONFIG.COLLISION_DISTANCE,
    LOST_SOUL_OBSTACLE_AVOIDANCE: LOST_SOUL_CONFIG.OBSTACLE_AVOIDANCE,
    LOST_SOUL_VERTICAL_COLLISION: LOST_SOUL_CONFIG.VERTICAL_COLLISION,
    LOST_SOUL_SMOOTH_COLLISION: LOST_SOUL_CONFIG.SMOOTH_COLLISION,
    LOST_SOUL_RAYCAST_DISTANCE: LOST_SOUL_CONFIG.RAYCAST_DISTANCE,
    LOST_SOUL_COLLISION_SMOOTHING: LOST_SOUL_CONFIG.COLLISION_SMOOTHING,
    
    // Lost Soul - configurações de colisão entre Lost Souls
    LOST_SOUL_INTER_COLLISION: LOST_SOUL_CONFIG.INTER_COLLISION,
    LOST_SOUL_INTER_COLLISION_RADIUS: LOST_SOUL_CONFIG.INTER_COLLISION_RADIUS,
    LOST_SOUL_SEPARATION_FORCE: LOST_SOUL_CONFIG.SEPARATION_FORCE,
    LOST_SOUL_SEPARATION_DISTANCE: LOST_SOUL_CONFIG.SEPARATION_DISTANCE,
    
    // Lost Soul - configurações de modelo
    SKULL_ORIENT_TO_MOVEMENT: LOST_SOUL_CONFIG.SKULL_ORIENT_TO_MOVEMENT,
    SKULL_SMOOTH_ROTATION: LOST_SOUL_CONFIG.SKULL_SMOOTH_ROTATION,
    SKULL_ROTATION_SPEED: LOST_SOUL_CONFIG.SKULL_ROTATION_SPEED,
    
    // Configurações de morte e transição
    ENEMY_SMOOTH_TRANSITION: ENEMY_CONFIG.SMOOTH_TRANSITION,
    ENEMY_TRANSITION_DEBUG: ENEMY_CONFIG.TRANSITION_DEBUG,
    ENEMY_DEATH_FADE_ENABLED: ENEMY_CONFIG.DEATH_FADE_ENABLED,
    ENEMY_DEATH_FADE_DURATION: ENEMY_CONFIG.DEATH_FADE_DURATION,
    ENEMY_DEATH_FADE_DELAY: ENEMY_CONFIG.DEATH_FADE_DELAY,
    ENEMY_DEATH_REMOVE_DELAY: ENEMY_CONFIG.DEATH_REMOVE_DELAY,
    ENEMY_DEATH_SCALE_EFFECT: ENEMY_CONFIG.DEATH_SCALE_EFFECT,
    ENEMY_DEATH_ROTATION_EFFECT: ENEMY_CONFIG.DEATH_ROTATION_EFFECT,
    
    // Configurações para inimigos terrestres
    GROUND_ENEMY_COLLISION_RADIUS: GROUND_ENEMY_CONFIG.COLLISION_RADIUS,
    GROUND_ENEMY_COLLISION_RAYS: GROUND_ENEMY_CONFIG.COLLISION_RAYS,
    GROUND_ENEMY_WALL_AVOIDANCE: GROUND_ENEMY_CONFIG.WALL_AVOIDANCE,
    GROUND_ENEMY_VERTICAL_COLLISION: GROUND_ENEMY_CONFIG.VERTICAL_COLLISION,
  };
}
