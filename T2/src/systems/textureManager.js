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
        
        // Carregar texturas adicionais se especificadas
        let normalMap = null;
        let displacementMap = null;
        
        if (properties.normalMap) {
            normalMap = await this.load(properties.normalMap, properties.textureOptions);
        }
        
        if (properties.displacementMap) {
            displacementMap = await this.load(properties.displacementMap, properties.textureOptions);
        }
        
        // Separate textureOptions from material properties
        const { textureOptions, normalMap: normalMapName, displacementMap: displacementMapName, 
                normalScale, displacementScale, ...materialProps } = properties;
        
        const defaultProps = {
            map: texture,
            color: properties.color || 0xffffff,
            ...materialProps  // Only spread actual material properties
        };

        // Adicionar normal map se disponível
        if (normalMap) {
            defaultProps.normalMap = normalMap;
            if (normalScale) {
                defaultProps.normalScale = new THREE.Vector2(normalScale.x || 1, normalScale.y || 1);
            }
        }

        // Adicionar displacement map se disponível
        if (displacementMap) {
            defaultProps.displacementMap = displacementMap;
            if (displacementScale !== undefined) {
                defaultProps.displacementScale = displacementScale;
            }
        }

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

    // Função helper para configurar múltiplas texturas com repeat
    setTextureOptions(material, repeatU, repeatV) {
        if (material.map) {
            material.map.repeat.set(repeatU, repeatV);
            material.map.wrapS = material.map.wrapT = THREE.RepeatWrapping;
        }
        
        if (material.normalMap) {
            material.normalMap.repeat.set(repeatU, repeatV);
            material.normalMap.wrapS = material.normalMap.wrapT = THREE.RepeatWrapping;
        }
        
        if (material.displacementMap) {
            material.displacementMap.repeat.set(repeatU, repeatV);
            material.displacementMap.wrapS = material.displacementMap.wrapT = THREE.RepeatWrapping;
        }
    }
}

let instance = null;
export function getTextureManager() {
    if (!instance) instance = new SimpleTextureManager();
    return instance;
}
