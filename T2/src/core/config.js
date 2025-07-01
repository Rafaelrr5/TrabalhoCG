export const CONFIG = {
    // ============================================================================
    // CONFIGURAÇÕES DE DEBUG
    // ============================================================================
    DEBUG_SHOW_HITBOX: false,    // Mostra/oculta a hitbox do player
    DEBUG_SHOW_CAMERA: false,    // Mostra/oculta informações da câmera
    DEBUG_SHOW_WEAPON: true,    // Mostra/oculta informações da arma
    DEBUG_CONSOLE_LOGS: false,   // Ativa/desativa logs de debug no console
    
    // Configurações de movimento e física
    MOVE_SPEED: 90,
    PROJECTILE_SPEED: 150,
    PROJECTILE_LIFETIME: 3.5,
    SHOOT_RATE: 250,
    PROJECTILE_SIZE: 0.3,
    GRAVITY: -20,
      // Configurações do jogador
    CAMERA_HEIGHT: 1.8,
    GROUND_HEIGHT: 0,
    PLAYER_HEIGHT: 2.0,
    GUN_POSITION: { x: 0.0, y: -0.5, z: 0.0 },
    
    // Configurações da câmera
    CAMERA_FOV: 75,
    CAMERA_NEAR: 0.1,
    CAMERA_FAR: 1000,
    
    // Configurações da hitbox e colisão
    HITBOX_WIDTH: 1.0,
    HITBOX_DEPTH: 1.0,
    RAYCAST_DISTANCE: 1.2,
    COLLISION_MARGIN: 0.0001,
    WALL_COLLISION_FACTOR: 1.01,
    STAIR_DETECTION_MARGIN_X: 1.5,
    STAIR_DETECTION_MARGIN_Z: 1.0,
    STAIR_HEIGHT_TOLERANCE: 1.5,
    STAIR_MOVEMENT_SPEED: 0.2,
    COLLISION_SMOOTHING: 0.5, // Valor entre 0 e 0.5
    COLLISION_ANGLE_THRESHOLD: 15, // Margem para a ativação da suavisação extra
    
    
    // Configurações do mundo
    WORLD_SIZE: 500,
    WALL_HEIGHT: 20,
    WALL_Y_POSITION: 9.0,
    
    // Configurações das escadas
    STAIR_STEP_HEIGHT: 0.485,
    STAIR_STEP_DEPTH: 0.8,
    STAIR_WIDTH: 15.0,
    STAIR_INCLINATION: 0.5 / 0.8, // inclinação calculada
    STAIR_HEIGHT_OFFSET: 0.1,
    
    // Configurações das áreas
    AREA_HEIGHT: 4.0,
    AREA_Y_POSITION: 2.0,
    
    // ============================================================================
    // CONFIGURAÇÕES DE COLISÃO DOS INIMIGOS
    // ============================================================================
    LOST_SOUL_ENABLE_COLLISION: true,       // Habilita/desabilita colisão das Lost Souls
    LOST_SOUL_COLLISION_RADIUS: 0.6,        // Raio de colisão das Lost Souls (reduzido)
    LOST_SOUL_COLLISION_RAYS: 3,            // Número de raycasts para detecção (reduzido)
    LOST_SOUL_COLLISION_CORRECTION: 1.0,    // Fator de correção de colisão (reduzido)
    LOST_SOUL_WALL_AVOIDANCE: 0.8,          // Força do desvio de paredes (aumentado para melhor fluidez)
    
    // Configurações da arma
    GUN_RADIUS: 0.2,
    GUN_LENGTH: 1.5,
    GUN_TIP_OFFSET: -0.75,
    
    // Configurações de posicionamento inicial
    START_HEIGHT_OFFSET: 5,

    //Cnfigurações do elevador
    ELEVATOR_ACTIVATION_DISTANCE: 2.0,
    ELEVEVATOR_MOVEMENT_SPEED: 1.5,
    ELEVATOR_HEIGHT: 3.9, // Altura máxima do elevador

    // ============================================================================
    // CONFIGURAÇÕES DE ORIENTAÇÃO DA SKULL
    // ============================================================================
    SKULL_ORIENT_TO_MOVEMENT: true,         // Se true, skull olha na direção do movimento; se false, sempre olha para o target
    SKULL_SMOOTH_ROTATION: true,            // Aplica rotação suave (lerp) entre orientações
    SKULL_ROTATION_SPEED: 5.0,              // Velocidade da rotação suave (só se SKULL_SMOOTH_ROTATION = true)
    
    // ============================================================================
    // CONFIGURAÇÕES DE TRANSIÇÃO IDLE <-> ATIVO
    // ============================================================================
    ENEMY_SMOOTH_TRANSITION: true,          // Transição suave entre idle e ativo
    ENEMY_TRANSITION_DEBUG: true,           // Logs de debug para transições
    
    // Configurações da arma
};
