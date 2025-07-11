import { getConfigCompatibilityValues } from '../entities/enemies/config/enemyConfig.js';

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
        ACTIVATION_DELAY: 100, // Tempo de ativação em milissegundos
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
    PLAYER_RADIUS: 0.5, // Raio aproximado do jogador para colisões esféricas
    SPHERE_CAST_OFFSET: 0.1, // Offset para evitar flickering

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
    
    KEYS: {
        COLORS: {
            red: 0xff0000,
            blue: 0x0000ff,
            yellow: 0xffff00
        },
        ANIMATION: {
            ROTATION_SPEED: 0.02,
            FLOAT_AMPLITUDE: 0.3,
            FLOAT_SPEED: 2.0,
            COLLECTION_DISTANCE: 2.0
        },
        MATERIAL: {
            SHININESS: 50,
            SPECULAR: 0x444444
        },
        TOTEM: {
            HEIGHT_OFFSET: 2.5
        }
    },
    
    // Configurações de inimigos (importadas do enemyConfig.js)
    ...getConfigCompatibilityValues()
};
