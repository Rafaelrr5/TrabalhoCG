// ============================================================================
// CONFIGURAÇÕES DO JOGO
// ============================================================================

export const CONFIG = {
    // Configurações de movimento e física
    MOVE_SPEED: 20,
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
    RAYCAST_DISTANCE: 1.0,
    COLLISION_MARGIN: 0.0001,
    WALL_COLLISION_FACTOR: 1.01,
    STAIR_DETECTION_MARGIN_X: 1.5,
    STAIR_DETECTION_MARGIN_Z: 1.0,
    STAIR_HEIGHT_TOLERANCE: 1.5,
    STAIR_MOVEMENT_SPEED: 0.2,
    COLLISION_SMOOTHING: 0.6, // Valor entre 0 e 1 
    
    // Configurações do mundo
    WORLD_SIZE: 500,
    WALL_HEIGHT: 20,
    WALL_Y_POSITION: 9.0,
    
    // Configurações das escadas
    STAIR_STEP_HEIGHT: 0.5,
    STAIR_STEP_DEPTH: 0.8,
    STAIR_WIDTH: 15.0,
    STAIR_INCLINATION: 0.5 / 0.8, // inclinação calculada
    STAIR_HEIGHT_OFFSET: 0.1,
    
    // Configurações das áreas
    AREA_HEIGHT: 4.0,
    AREA_Y_POSITION: 2.0,
    
    // Configurações da arma
    GUN_RADIUS: 0.2,
    GUN_LENGTH: 1.5,
    GUN_TIP_OFFSET: -0.75,
    
    // Configurações de posicionamento inicial
    START_HEIGHT_OFFSET: 5
};
