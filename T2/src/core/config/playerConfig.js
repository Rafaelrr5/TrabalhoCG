// Configurações do jogador
export const PLAYER_CONFIG = {
    // Movimento e física
    MOVE_SPEED: 30,
    SPRINT_MULTIPLIER: 3,
    GRAVITY: -20,
    
    // Dimensões físicas
    CAMERA_HEIGHT: 1.8,
    PLAYER_HEIGHT: 2.0,
    PLAYER_RADIUS: 0.5,
    
    // Configurações de hitbox e colisão
    HITBOX_WIDTH: 1.0,
    HITBOX_DEPTH: 1.0,
    RAYCAST_DISTANCE: 1.2,
    COLLISION_MARGIN: 0.0001,
    WALL_COLLISION_FACTOR: 1.01,
    COLLISION_SMOOTHING: 0.5,
    COLLISION_ANGLE_THRESHOLD: 15,
    SPHERE_CAST_OFFSET: 0.1,
    
    // Escadas
    STAIR_DETECTION_MARGIN_X: 1.5,
    STAIR_DETECTION_MARGIN_Z: 1.0,
    STAIR_HEIGHT_TOLERANCE: 1.5,
    STAIR_MOVEMENT_SPEED: 0.2,
    
    // Posicionamento inicial
    INITIAL_PLAYER_HEIGHT: 10.0,
    
    // Estado do jogador
    PLAYER_IMMORTAL: true
};
