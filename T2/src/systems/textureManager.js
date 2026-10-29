import * as THREE from '../../../build/three.module.js';

class SimpleTextureManager {
    constructor() {
        this.loader = new THREE.TextureLoader();
        this.cache = new Map();    // file name -> Promise<Texture|null>
        this.variants = new Map(); // name|repeat|colour -> Texture
    }

    // One download per file (the promise is cached, so parallel callers share it);
    // each repeat/colour-space combination gets its own lightweight clone.
    async load(name, options = {}, isColor = false) {
        if (!this.cache.has(name)) {
            this.cache.set(name, new Promise((resolve) => {
                this.loader.load(`assets/textures/${name}`, resolve, undefined, () => {
                    console.warn(`❌ Textura não encontrada: ${name}`);
                    resolve(null);
                });
            }));
        }
        const base = await this.cache.get(name);
        if (!base) return null;

        const r = options && options.repeat;
        const key = `${name}|${r ? `${r.x}x${r.y}` : ''}|${isColor}`;
        if (this.variants.has(key)) return this.variants.get(key);
        const texture = base.clone();
        this.variants.set(key, texture);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = 8; // three clamps this to the GPU maximum
        if (isColor) texture.colorSpace = THREE.SRGBColorSpace;
        if (options && options.repeat) texture.repeat.set(options.repeat.x || 1, options.repeat.y || 1);
        texture.needsUpdate = true;
        return texture;
    }

    // Criar material com qualquer tipo e propriedades
    async createMaterial(textureName, materialType = 'standard', properties = {}) {
        const texture = await this.load(textureName, properties.textureOptions, true);
        
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
