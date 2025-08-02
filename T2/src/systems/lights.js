import * as THREE from '../../../build/three.module.js';

const LIGHTING_CONFIG = {
    ambient: {
        color: "rgb(100,100,100)",
        intensity: 0.8
    },
    directional: {
        color: 0xffffff,
        intensity: 5.0,
        position: { x: 300.00, y: 450, z: -300.00 },
        castShadow: true,
        shadow: {
            mapSize: { width: 4096, height: 4096 },
            camera: {
                near: 300,
                far: 880,
                left: -375,
                right: 375,
                top: 350,
                bottom: -260
            },
            bias: -0.0001
        }
    },
    helpers: {
        enabled: false,
        directionalLightHelperSize: 5
    },
    oposeLight: {
        color: "rgb(150,150,150)",
        intensity: 2.0,
        position: {x: -300.00, y:450, z:300.00},
        castShadow: false,
    }
};

class LightingSystem {
    constructor() {
        this.ambientLight = null;
        this.directionalLight = null;
        this.directionalLightHelper = null;
        this.directionalLightShadowHelper = null;
        this.oposeLight = null;
        this.oposeLightHelper = null;
        this.lights = [];
        this.helpers = [];
    }

    init(scene, renderer, options = {}) {
        const config = this._mergeConfig(LIGHTING_CONFIG, options);
        this._setupShadows(renderer);
        this._setupAmbientLight(scene, config.ambient);
        this._setupDirectionalLight(scene, config.directional);
        this._setupOposeLight(scene, config.oposeLight);
        if (config.helpers.enabled) {
            this._setupLightHelpers(scene, config.helpers);
            this._setupOposeLightHelpers(scene, config.helpers);
        }
    }

    _setupShadows(renderer) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.shadowMap.autoUpdate = true;
    }

    _setupAmbientLight(scene, config) {
        this.ambientLight = new THREE.AmbientLight(config.color, config.intensity);
        scene.add(this.ambientLight);
        this.lights.push(this.ambientLight);
    }

    _setupDirectionalLight(scene, config) {
    this.directionalLight = new THREE.DirectionalLight(config.color, config.intensity);
    this.directionalLight.position.set(
        config.position.x,
        config.position.y,
        config.position.z
    );
    if (config.castShadow) {
        this.directionalLight.castShadow = true;
        const shadow = this.directionalLight.shadow;
        shadow.mapSize.width = config.shadow.mapSize.width;
        shadow.mapSize.height = config.shadow.mapSize.height;
        const camera = shadow.camera;
        camera.near = config.shadow.camera.near;
        camera.far = config.shadow.camera.far;
        camera.left = config.shadow.camera.left;
        camera.right = config.shadow.camera.right;
        camera.top = config.shadow.camera.top;
        camera.bottom = config.shadow.camera.bottom;
        shadow.bias = config.shadow.bias;
        
        // Adiciona o helper da câmera de sombra
        //this.directionalLightShadowHelper = new THREE.CameraHelper(this.directionalLight.shadow.camera);
        //scene.add(this.directionalLightShadowHelper);
        //this.helpers.push(this.directionalLightShadowHelper);
    }
    this.directionalLight.shadow.normalBias = 0.02;
    scene.add(this.directionalLight);
    this.lights.push(this.directionalLight);
}

    _setupOposeLight(scene, config) {
        this.oposeLight = new THREE.DirectionalLight(config.color, config.intensity);
        this.oposeLight.position.set(
            config.position.x,
            config.position.y,
            config.position.z
        );
        if (config.castShadow) {
            this.directionalLight.castShadow = true;
            const shadow = this.directionalLight.shadow;
            shadow.mapSize.width = config.shadow.mapSize.width;
            shadow.mapSize.height = config.shadow.mapSize.height;
            const camera = shadow.camera;
            camera.near = config.shadow.camera.near;
            camera.far = config.shadow.camera.far;
            camera.left = config.shadow.camera.left;
            camera.right = config.shadow.camera.right;
            camera.top = config.shadow.camera.top;
            camera.bottom = config.shadow.camera.bottom;
            shadow.bias = config.shadow.bias;
        }
        scene.add(this.oposeLight);
        this.lights.push(this.oposeLight);
    }

    _setupLightHelpers(scene, config) {
        if (this.directionalLight) {
            this.directionalLightHelper = new THREE.DirectionalLightHelper(
                this.directionalLight,
                config.directionalLightHelperSize
            );
            scene.add(this.directionalLightHelper);
            this.helpers.push(this.directionalLightHelper);
        }
    }

    _setupOposeLightHelpers(scene, config) {
        if (this.oposeLight) {
            this.oposeLightHelper = new THREE.DirectionalLightHelper(
                this.oposeLight,
                config.directionalLightHelperSize
            );
            scene.add(this.oposeLightHelper);
            this.helpers.push(this.oposeLightHelper);
        }
    }

    _mergeConfig(defaultConfig, userConfig) {
        const result = { ...defaultConfig };
        for (const key in userConfig) {
            if (typeof userConfig[key] === 'object' && userConfig[key] !== null && !Array.isArray(userConfig[key])) {
                result[key] = this._mergeConfig(result[key] || {}, userConfig[key]);
            } else {
                result[key] = userConfig[key];
            }
        }
        return result;
    }

    updateAmbientLight(color, intensity) {
        if (this.ambientLight) {
            this.ambientLight.color.set(color);
            this.ambientLight.intensity = intensity;
        }
    }

    updateDirectionalLight(options = {}) {
        if (!this.directionalLight) return;
        if (options.color !== undefined) {
            this.directionalLight.color.set(options.color);
        }
        if (options.intensity !== undefined) {
            this.directionalLight.intensity = options.intensity;
        }
        if (options.position) {
            this.directionalLight.position.set(
                options.position.x || this.directionalLight.position.x,
                options.position.y || this.directionalLight.position.y,
                options.position.z || this.directionalLight.position.z
            );
        }
    }

    setHelpersVisible(visible) {
        this.helpers.forEach(helper => {
            helper.visible = visible;
        });
    }

    enableShadowsForAll(object) {
        object.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }

    dispose() {
        this.lights.forEach(light => {
            if (light.parent) {
                light.parent.remove(light);
            }
            if (light.dispose) {
                light.dispose();
            }
        });
        this.helpers.forEach(helper => {
            if (helper.parent) {
                helper.parent.remove(helper);
            }
            if (helper.dispose) {
                helper.dispose();
            }
        });
        this.lights = [];
        this.helpers = [];
        this.ambientLight = null;
        this.directionalLight = null;
        this.directionalLightHelper = null;
    }

    getAllLights() {
        return [...this.lights];
    }

    getLight(type) {
        switch (type.toLowerCase()) {
            case 'ambient':
                return this.ambientLight;
            case 'directional':
                return this.directionalLight;
            default:
                return null;
        }
    }
}

// Create and export singleton instance
const lightingSystem = new LightingSystem();

// Export the main class and instance
export { LightingSystem, lightingSystem };

// Export configuration for external customization
export { LIGHTING_CONFIG };

// Backward compatibility exports (to match existing function names)
export function setupLighting(scene, renderer, options) {
    return lightingSystem.init(scene, renderer, options);
}

export function enableShadowsForAll(object) {
    return lightingSystem.enableShadowsForAll(object);
}

// Export default as the singleton instance
export default lightingSystem;
