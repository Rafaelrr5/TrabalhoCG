export const TEXTURE_CONFIG = {
    FLOOR_TEXTURE: {
        NAME: 'pisointertravado.jpg',
        REPEAT: { x: 100, y: 100 },
        ROUGHNESS: 0,
        METALNESS: 0.0
    },
    
    METAL_BLOCKS: {
        NAME: 'caixametal.jpg',
        REPEAT: { x: 1, y: 1 },
        ROUGHNESS: 0.3,
        METALNESS: 0.9
    },
    
    WALL_TEXTURE: {
        NAME: 'concrete_tile_facade_diff_4k.jpg',
        REPEAT: { x: 10, y: 1 },
        ROUGHNESS: 1,
        METALNESS: 0
    },
    
    AREA4_WALLS: {
        NAME: 'fundo-de-metal-e-concreto.jpg',
        REPEAT: { x: 100, y: 30 },
        ROUGHNESS: 1.0,
        METALNESS: 0.3
    },

    METALLIC_SCRATCHED1: {
        NAME: 'resumo-fundo-metalico-perfurado-com-arranhoes-e-manchas.jpg',
        REPEAT: { x: 10, y: 1 },
        ROUGHNESS: 0.5,
        METALNESS: 0.8
    },

    METALLIC_SCRATCHED2: {
        NAME: 'resumo-fundo-metalico-perfurado-com-arranhoes-e-manchas.jpg',
        REPEAT: { x: 8, y: 2 },
        ROUGHNESS: 0.5,
        METALNESS: 0.8
    },

    FINISHED_CONCRETE: {
        NAME: 'concretoacabado.jpg',
        REPEAT: { x: 5, y: 5 },
        ROUGHNESS: 0.7,
        METALNESS: 0.1
    },

    DIRTY_CONCRETE: {
        NAME: 'concretosujo.jpg',
        REPEAT: { x: 5, y: 5 },
        ROUGHNESS: 0.9,
        METALNESS: 0.2
    },

    GRUNGE_CONCRETE1: {
        NAME: 'fundo-estilo-de-grunge-com-uma-textura-de-concreto.jpg',
        REPEAT: { x: 2, y: 1 },
        ROUGHNESS: 0.8,
        METALNESS: 0.15
    },

    GRUNGE_CONCRETE2: {
        NAME: 'fundo-estilo-de-grunge-com-uma-textura-de-concreto.jpg',
        REPEAT: { x: 5, y: 5 },
        ROUGHNESS: 0.8,
        METALNESS: 0.15
    },

    HANGAR_FLOOR: {
        NAME: 'hangarfloor.jpg',
        REPEAT: { x: 5, y: 5 },
        ROUGHNESS: 0.8,
        METALNESS: 0.15
    },

    HANGAR_WALLS: {
        NAME: 'hangarwalls.jpg',
        REPEAT: { x: 2, y: 2 },
        ROUGHNESS: 0.8,
        METALNESS: 0.5
    },

    ROMAN_COLUMNS: {
        NAME: 'rustic_stone_wall_02_diff_4k.jpg',        // Textura difusa (cor base)
        NORMAL_MAP: 'rustic_stone_wall_02_nor_gl_4k.jpg', // Normal map para detalhes de iluminação
        DISPLACEMENT_MAP: 'rustic_stone_wall_02_disp_4k.jpg', // Displacement map para relevo real
        REPEAT: { x: 2, y: 4 },
        ROUGHNESS: 0.8,
        METALNESS: 0.0,
        MATERIAL_TYPE: 'standard',
        NORMAL_SCALE: { x: 0.7, y: 0.7 },
        DISPLACEMENT_SCALE: 0.3,
        COLOR: 0xffffff  // Cor branca para não alterar a textura difusa
    },
    
    MATERIAL_PRESETS: {
        STONE: {
            ROUGHNESS: 1.0,  // Máxima rugosidade para efeito difuso
            METALNESS: 0.0   // Zero metalness para material não metálico
        },
        WOOD: {
            ROUGHNESS: 0.7,
            METALNESS: 0.0
        },
        METAL: {
            ROUGHNESS: 0.3,
            METALNESS: 0.9
        },
        CONCRETE: {
            ROUGHNESS: 0.9,
            METALNESS: 0.0
        },
        PLASTIC: {
            ROUGHNESS: 0.1,
            METALNESS: 0.0
        }
    }
};
