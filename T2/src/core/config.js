export const CONFIG = {
    DEBUG_SHOW_HITBOX: false,
    DEBUG_SHOW_CAMERA: false,
    DEBUG_SHOW_WEAPON: true,
    DEBUG_CONSOLE_LOGS: false,


    // Configurações de armas
    WEAPON_SWITCH_COOLDOWN: 300, // Tempo em milissegundos para
    WEAPONS:{
      LAUNCHER:{
        NAME: 'Laucher',
        PROJECTILE_SPEED: 150,
        PROJECTILE_LIFETIME: 3.5,
        SHOOT_RATE: 250,
        PROJECTILE_SIZE: 0.2,
        PROJECTILE_COLOR: 'lightgreen',
        DAMAGE: 10,
      },
      CHAINGUN:{
        NAME: 'Chaingun',
        PROJECTILE_SPEED: 200,
        PROJECTILE_LIFETIME: 2.0,
        SHOOT_RATE: 50,
        PROJECTILE_SIZE: 0.1,
        PROJECTILE_COLOR: 'lightyellow',
        DAMAGE: 0.4,
      },
    },
    
    // Configurações de movimento e física
    MOVE_SPEED: 90,
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
    
    // Configurações gerais de colisão para inimigos
    ENEMY_COLLISION_ENABLED: true,          // Habilita colisão global para inimigos
    ENEMY_COLLISION_DEBUG: false,           // Debug visual das colisões
    
    // Lost Souls
    LOST_SOUL_ENABLE_COLLISION: true,       // Habilita/desabilita colisão das Lost Souls
    LOST_SOUL_COLLISION_RADIUS: 1.2,        // Raio de colisão das Lost Souls
    LOST_SOUL_COLLISION_RAYS: 8,            // Número de raycasts para detecção
    LOST_SOUL_COLLISION_CORRECTION: 0.8,    // Fator de correção de colisão (reduzido para menos flickering)
    LOST_SOUL_WALL_AVOIDANCE: 0.6,          // Força do desvio de paredes (reduzido)
    LOST_SOUL_COLLISION_DISTANCE: 1.8,      // Distância mínima das paredes
    LOST_SOUL_OBSTACLE_AVOIDANCE: true,     // Sistema inteligente de desvio de obstáculos
    LOST_SOUL_VERTICAL_COLLISION: true,     // Colisão vertical (teto e chão)
    LOST_SOUL_SMOOTH_COLLISION: true,       // Colisão suave (sem teleporte brusco)
    LOST_SOUL_RAYCAST_DISTANCE: 2.5,        // Distância máxima do raycast
    LOST_SOUL_COLLISION_SMOOTHING: 0.15,    // Suavização da correção de posição
    
    // Lost Soul vs Lost Soul collision
    LOST_SOUL_INTER_COLLISION: true,        // Habilita colisão entre Lost Souls
    LOST_SOUL_INTER_COLLISION_RADIUS: 2.0,  // Raio de detecção entre Lost Souls
    LOST_SOUL_SEPARATION_FORCE: 1.5,        // Força de separação entre Lost Souls
    LOST_SOUL_SEPARATION_DISTANCE: 3.0,     // Distância mínima entre Lost Souls
    
    // Configurações para outros tipos de inimigos
    GROUND_ENEMY_COLLISION_RADIUS: 0.8,     // Raio de colisão para inimigos terrestres
    GROUND_ENEMY_COLLISION_RAYS: 6,         // Número de raycasts para inimigos terrestres
    GROUND_ENEMY_WALL_AVOIDANCE: 1.0,       // Força do desvio para inimigos terrestres
    GROUND_ENEMY_VERTICAL_COLLISION: false, // Inimigos terrestres não precisam de colisão vertical
    
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

    SKULL_ORIENT_TO_MOVEMENT: true,         // Se true, skull olha na direção do movimento; se false, sempre olha para o target
    SKULL_SMOOTH_ROTATION: true,            // Aplica rotação suave (lerp) entre orientações
    SKULL_ROTATION_SPEED: 5.0,              // Velocidade da rotação suave (só se SKULL_SMOOTH_ROTATION = true)
    
    ENEMY_SMOOTH_TRANSITION: true,          // Transição suave entre idle e ativo
    ENEMY_TRANSITION_DEBUG: true,           // Logs de debug para transições
    
    ENEMY_DEATH_FADE_ENABLED: true,         // Habilita fade de opacidade na morte
    ENEMY_DEATH_FADE_DURATION: 2.0,         // Duração do fade em segundos
    ENEMY_DEATH_FADE_DELAY: 0.5,            // Delay antes de começar o fade
    ENEMY_DEATH_REMOVE_DELAY: 0.2,          // Delay adicional antes de remover da cena
    ENEMY_DEATH_SCALE_EFFECT: true,         // Aplica efeito de escala durante a morte
    ENEMY_DEATH_ROTATION_EFFECT: false,     // Aplica rotação durante a morte
};
