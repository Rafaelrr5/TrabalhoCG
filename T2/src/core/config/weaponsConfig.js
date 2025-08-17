export const WEAPONS_CONFIG = {
    WEAPON_SWITCH_COOLDOWN: 300,
    
    WEAPONS: {
        LAUNCHER: {
            NAME: 'Laucher',
            PROJECTILE_SPEED: 150,
            PROJECTILE_LIFETIME: 3.5,
            SHOOT_RATE: 500,
            PROJECTILE_SIZE: 0.2,
            PROJECTILE_COLOR: 'lightgreen',
            PROJECTILE_VISIBILITY: true,
            DAMAGE: 10,
        },
        CHAINGUN: {
            NAME: 'Chaingun',
            PROJECTILE_SPEED: 200,
            PROJECTILE_LIFETIME: 2.0,
            SHOOT_RATE: 50,
            PROJECTILE_SIZE: 0.1,
            PROJECTILE_COLOR: 'lightyellow',
            PROJECTILE_VISIBILITY: false,
            DAMAGE: 2.0,
            ACTIVATION_DELAY: 100,
        },
    },
    
    GUN_RADIUS: 0.2,
    GUN_LENGTH: 1.5,
    GUN_TIP_OFFSET: -0.75,
    GUN_POSITION: { x: 0.0, y: -0.5, z: 0.0 }
};
