export const MULTIPLAYER_CONFIG = {
    // Configurações de conexão
    DEFAULT_SERVER_URL: 'ws://localhost:8080',
    RECONNECT_ATTEMPTS: 5,
    RECONNECT_DELAY: 2000,
    
    // Configurações de sincronização
    UPDATE_INTERVAL: 50, // 20 FPS para sincronização
    INTERPOLATION_DELAY: 100, // Delay para interpolação
    
    // Configurações visuais dos outros jogadores
    OTHER_PLAYER_COLOR: 0x00ff00,
    OTHER_PLAYER_OPACITY: 0.8,
    OTHER_PLAYER_GEOMETRY: {
        radius: 0.5,
        height: 1.5,
        segments: 4,
        rings: 8
    },
    
    // Cores baseadas na vida
    HEALTH_COLORS: {
        LOW: 0xff0000,      // Vermelho (< 30%)
        MEDIUM: 0xffaa00,   // Laranja (30-60%)
        HIGH: 0x00ff00      // Verde (> 60%)
    },
    
    // Configurações de debug
    DEBUG_SHOW_CONNECTION_STATUS: true,
    DEBUG_SHOW_PLAYER_COUNT: true,
    DEBUG_LOG_MESSAGES: false,
    
    // Configurações de performance
    MAX_PROJECTILES_SYNC: 100,
    PROJECTILE_LIFETIME: 5000, // 5 segundos
    
    // Configurações de rede
    NETWORK_TIMEOUT: 10000,
    PING_INTERVAL: 5000,
    
    // Configurações de sincronização de estado
    SYNC_POSITION_THRESHOLD: 0.1,    // Só sincroniza se mudança > 0.1
    SYNC_ROTATION_THRESHOLD: 0.1,    // Só sincroniza se mudança > 0.1
    SYNC_HEALTH_THRESHOLD: 1,        // Só sincroniza se mudança > 1
    
    // Configurações de interpolação
    INTERPOLATION_SPEED: 10,         // Velocidade da interpolação
    MAX_INTERPOLATION_TIME: 1000,    // Tempo máximo para interpolação
    
    // Configurações de anti-cheat básico
    MAX_MOVEMENT_SPEED: 50,          // Velocidade máxima permitida
    MAX_HEALTH: 200,                 // Vida máxima permitida
    VALID_WEAPONS: ['chaingun', 'rocket'], // Armas válidas
    
    // Configurações de spawn
    SPAWN_POSITIONS: [
        { x: 0, y: 150, z: 0 },
        { x: 10, y: 150, z: 10 },
        { x: -10, y: 150, z: -10 },
        { x: 15, y: 150, z: -15 }
    ],
    
    // Configurações de área segura
    SAFE_ZONE_RADIUS: 20,
    SAFE_ZONE_HEIGHT: 10
};
