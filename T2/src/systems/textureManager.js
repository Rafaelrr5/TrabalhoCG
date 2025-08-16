import * as THREE from '../../../build/three.module.js';

class SimpleTextureManager {
    constructor() {
        this.loader = new THREE.TextureLoader();
        this.cache = new Map();
    }

    async load(name, options = {}) {
        if (this.cache.has(name)) {
            return this.cache.get(name);
        }

        const paths = [
            `assets/textures/${name}`,
            `../assets/textures/${name}`,
            `../../assets/textures/${name}`
        ];

        for (const path of paths) {
            try {
                const texture = await new Promise((resolve, reject) => {
                    this.loader.load(path, resolve, undefined, reject);
                });
                
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                if (options.repeat) texture.repeat.set(options.repeat.x || 1, options.repeat.y || 1);
                
                this.cache.set(name, texture);
                return texture;
            } catch (e) {
                continue;
            }
        }
        
        console.warn(`❌ Textura não encontrada: ${name}`);
        return null;
    }

    // Criar material com qualquer tipo e propriedades
    async createMaterial(textureName, materialType = 'standard', properties = {}) {
        const texture = await this.load(textureName, properties.textureOptions);
        
        // Separate textureOptions from material properties
        const { textureOptions, ...materialProps } = properties;
        
        const defaultProps = {
            map: texture,
            color: 0xffffff,
            ...materialProps  // Only spread actual material properties
        };

        switch (materialType) {
            case 'standard':
                return new THREE.MeshStandardMaterial({
                    ...defaultProps,
                    roughness: properties.roughness ?? 0.5,
                    metalness: properties.metalness ?? 0.0
                });
            case 'lambert':
                return new THREE.MeshLambertMaterial(defaultProps);
            case 'phong':
                return new THREE.MeshPhongMaterial({
                    ...defaultProps,
                    shininess: properties.shininess ?? 30
                });
            default:
                return new THREE.MeshStandardMaterial(defaultProps);
        }
    }
}

let instance = null;
export function getTextureManager() {
    if (!instance) instance = new SimpleTextureManager();
    return instance;
}
