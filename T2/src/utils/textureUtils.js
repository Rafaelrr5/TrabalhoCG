import { getTextureManager } from '../systems/textureManager.js';
import { TEXTURE_CONFIG } from '../core/config/textureConfig.js';

// Função principal - aplicar textura simples
export async function applyTexture(object, textureName, materialType = 'standard', properties = {}) {
    const manager = getTextureManager();
    const material = await manager.createMaterial(textureName, materialType, properties);
    
    if (object.isMesh) {
        object.material = material;
    } else {
        object.traverse(child => {
            if (child.isMesh) {
                child.material = material;
            }
        });
    }
    
    console.log(`✅ Textura ${textureName} aplicada`);
}

// Aplicar texturas por critérios
export async function applyTextureByCriteria(scene, criteria, textureName, materialType = 'standard', properties = {}) {
    let count = 0;
    
    scene.traverse(object => {
        if (matchesCriteria(object, criteria)) {
            applyTexture(object, textureName, materialType, properties);
            count++;
        }
    });
    
    console.log(`Textura ${textureName} aplicada em ${count} objetos`);
    return count;
}

function matchesCriteria(object, criteria) {
    if (criteria.name && !object.name.includes(criteria.name)) return false;
    if (criteria.userData) {
        for (const [key, value] of Object.entries(criteria.userData)) {
            if (object.userData[key] !== value) return false;
        }
    }
    return true;
}

// Presets rápidos para tipos comuns (usando configurações modulares)
export const TexturePresets = {
    metal: (roughness = TEXTURE_CONFIG.MATERIAL_PRESETS.METAL.ROUGHNESS, metalness = TEXTURE_CONFIG.MATERIAL_PRESETS.METAL.METALNESS) => ({
        materialType: 'standard',
        properties: { roughness, metalness }
    }),
    
    stone: (roughness = TEXTURE_CONFIG.MATERIAL_PRESETS.STONE.ROUGHNESS) => ({
        materialType: 'standard', 
        properties: { roughness, metalness: TEXTURE_CONFIG.MATERIAL_PRESETS.STONE.METALNESS }
    }),
    
    wood: (roughness = TEXTURE_CONFIG.MATERIAL_PRESETS.WOOD.ROUGHNESS) => ({
        materialType: 'standard',
        properties: { roughness, metalness: TEXTURE_CONFIG.MATERIAL_PRESETS.WOOD.METALNESS }
    }),
    
    concrete: (roughness = TEXTURE_CONFIG.MATERIAL_PRESETS.CONCRETE.ROUGHNESS) => ({
        materialType: 'standard',
        properties: { roughness, metalness: TEXTURE_CONFIG.MATERIAL_PRESETS.CONCRETE.METALNESS }
    }),

    plastic: (roughness = TEXTURE_CONFIG.MATERIAL_PRESETS.PLASTIC.ROUGHNESS) => ({
        materialType: 'standard',
        properties: { roughness, metalness: TEXTURE_CONFIG.MATERIAL_PRESETS.PLASTIC.METALNESS }
    }),

    glass: (opacity = 0.3) => ({
        materialType: 'standard',
        properties: { roughness: 0.0, metalness: 0.0, transparent: true, opacity }
    }),

    fabric: (roughness = 0.9) => ({
        materialType: 'lambert',
        properties: { roughness }
    })
};

// Função para aplicar com preset
export async function applyTextureWithPreset(object, textureName, presetName, customProps = {}) {
    const preset = TexturePresets[presetName];
    if (!preset) {
        console.warn(`Preset ${presetName} não encontrado`);
        return;
    }
    
    const config = preset();
    const finalProps = { ...config.properties, ...customProps };
    
    await applyTexture(object, textureName, config.materialType, finalProps);
}

// Aplicar texturas aleatórias
export async function applyRandomTextures(objects, textureNames, materialType = 'standard') {
    for (const object of objects) {
        const randomTexture = textureNames[Math.floor(Math.random() * textureNames.length)];
        await applyTexture(object, randomTexture, materialType);
    }
}

// Aplicar variações de um mesmo material
export async function applyMaterialVariations(objects, textureName, variations) {
    for (let i = 0; i < objects.length; i++) {
        const variation = variations[i % variations.length];
        await applyTexture(objects[i], textureName, 'standard', variation);
    }
}

// Funções de conveniência para os tipos mais usados (usando configurações)
export const QuickTexture = {
    metal: async (object, textureName = TEXTURE_CONFIG.METAL_BLOCKS.NAME) => 
        await applyTextureWithPreset(object, textureName, 'metal'),
        
    stone: async (object, textureName = 'pedra.jpg') => 
        await applyTextureWithPreset(object, textureName, 'stone'),
        
    wood: async (object, textureName = 'madeira.jpg') => 
        await applyTextureWithPreset(object, textureName, 'wood'),
        
    floor: async (object, textureName = TEXTURE_CONFIG.FLOOR_TEXTURE.NAME) => 
        await applyTexture(object, textureName, 'standard', {
            roughness: TEXTURE_CONFIG.FLOOR_TEXTURE.ROUGHNESS,
            metalness: TEXTURE_CONFIG.FLOOR_TEXTURE.METALNESS,
            textureOptions: { repeat: TEXTURE_CONFIG.FLOOR_TEXTURE.REPEAT }
        }),
        
    wall: async (object, textureName = TEXTURE_CONFIG.WALL_TEXTURE.NAME) => 
        await applyTexture(object, textureName, 'standard', {
            roughness: TEXTURE_CONFIG.WALL_TEXTURE.ROUGHNESS,
            metalness: TEXTURE_CONFIG.WALL_TEXTURE.METALNESS,
            textureOptions: { repeat: TEXTURE_CONFIG.WALL_TEXTURE.REPEAT }
        }),
        
    area4Walls: async (object, textureName = TEXTURE_CONFIG.AREA4_WALLS.NAME) => 
        await applyTexture(object, textureName, 'standard', {
            roughness: TEXTURE_CONFIG.AREA4_WALLS.ROUGHNESS,
            metalness: TEXTURE_CONFIG.AREA4_WALLS.METALNESS,
            textureOptions: { repeat: TEXTURE_CONFIG.AREA4_WALLS.REPEAT }
        })
};
