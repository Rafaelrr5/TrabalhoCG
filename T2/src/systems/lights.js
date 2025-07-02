/**
 * Centralized Lighting System
 * 
 * This module handles all lighting setup and configuration for the game.
 * It provides a unified interface for managing ambient lighting, directional lighting,
 * shadows, and light helpers.
 */

import * as THREE from '../../../build/three.module.js';

/**
 * Configuration for the lighting system
 */
const LIGHTING_CONFIG = {
    ambient: {
        color: "rgb(80,80,80)",
        intensity: 0.8
    },
    directional: {
        color: 0xffffff,
        intensity: 5.0,
        position: { x: 481.86, y: 300, z: -458.45 },
        castShadow: true,
        shadow: {
            mapSize: { width: 2048, height: 2048 },
            camera: {
                near: 0.5,
                far: 1000,
                left: -500,
                right: 500,
                top: 500,
                bottom: -500
            },
            bias: -0.0001
        }
    },
    helpers: {
        enabled: true,
        directionalLightHelperSize: 5
    }
};

/**
 * Main lighting system class
 */
class LightingSystem {
    constructor() {
        this.ambientLight = null;
        this.directionalLight = null;
        this.directionalLightHelper = null;
        this.lights = [];
        this.helpers = [];
    }

    /**
     * Initialize the complete lighting system for a scene
     * @param {THREE.Scene} scene - The Three.js scene to add lights to
     * @param {THREE.WebGLRenderer} renderer - The Three.js renderer for shadow configuration
     * @param {Object} options - Optional configuration overrides
     */
    init(scene, renderer, options = {}) {
        // Merge options with default config
        const config = this._mergeConfig(LIGHTING_CONFIG, options);
        
        // Configure renderer for shadows
        this._setupShadows(renderer);
        
        // Setup ambient lighting
        this._setupAmbientLight(scene, config.ambient);
        
        // Setup directional lighting
        this._setupDirectionalLight(scene, config.directional);
        
        // Setup light helpers if enabled
        if (config.helpers.enabled) {
            this._setupLightHelpers(scene, config.helpers);
        }
        
        console.log('Lighting system initialized');
    }

    /**
     * Configure renderer shadow settings
     * @param {THREE.WebGLRenderer} renderer 
     */
    _setupShadows(renderer) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        renderer.shadowMap.autoUpdate = true;
    }

    /**
     * Setup ambient lighting
     * @param {THREE.Scene} scene 
     * @param {Object} config 
     */
    _setupAmbientLight(scene, config) {
        this.ambientLight = new THREE.AmbientLight(config.color, config.intensity);
        scene.add(this.ambientLight);
        this.lights.push(this.ambientLight);
    }

    /**
     * Setup directional lighting with shadows
     * @param {THREE.Scene} scene 
     * @param {Object} config 
     */
    _setupDirectionalLight(scene, config) {
        this.directionalLight = new THREE.DirectionalLight(config.color, config.intensity);
        
        // Position
        this.directionalLight.position.set(
            config.position.x,
            config.position.y,
            config.position.z
        );
        
        // Shadow configuration
        if (config.castShadow) {
            this.directionalLight.castShadow = true;
            
            // Shadow map configuration
            const shadow = this.directionalLight.shadow;
            shadow.mapSize.width = config.shadow.mapSize.width;
            shadow.mapSize.height = config.shadow.mapSize.height;
            
            // Shadow camera configuration
            const camera = shadow.camera;
            camera.near = config.shadow.camera.near;
            camera.far = config.shadow.camera.far;
            camera.left = config.shadow.camera.left;
            camera.right = config.shadow.camera.right;
            camera.top = config.shadow.camera.top;
            camera.bottom = config.shadow.camera.bottom;
            
            // Shadow bias to reduce artifacts
            shadow.bias = config.shadow.bias;
        }
        
        scene.add(this.directionalLight);
        this.lights.push(this.directionalLight);
    }

    /**
     * Setup light helpers for debugging
     * @param {THREE.Scene} scene 
     * @param {Object} config 
     */
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

    /**
     * Merge configuration objects recursively
     * @param {Object} defaultConfig 
     * @param {Object} userConfig 
     * @returns {Object}
     */
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

    /**
     * Update ambient light color and intensity
     * @param {string|number} color - Light color
     * @param {number} intensity - Light intensity
     */
    updateAmbientLight(color, intensity) {
        if (this.ambientLight) {
            this.ambientLight.color.set(color);
            this.ambientLight.intensity = intensity;
        }
    }

    /**
     * Update directional light properties
     * @param {Object} options - Light properties to update
     */
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

    /**
     * Show or hide light helpers
     * @param {boolean} visible 
     */
    setHelpersVisible(visible) {
        this.helpers.forEach(helper => {
            helper.visible = visible;
        });
    }

    /**
     * Enable shadows for all meshes in a scene or object
     * @param {THREE.Scene|THREE.Object3D} object - Scene or object to enable shadows for
     */
    enableShadowsForAll(object) {
        object.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }

    /**
     * Dispose of all lights and helpers
     */
    dispose() {
        // Dispose lights
        this.lights.forEach(light => {
            if (light.parent) {
                light.parent.remove(light);
            }
            if (light.dispose) {
                light.dispose();
            }
        });
        
        // Dispose helpers
        this.helpers.forEach(helper => {
            if (helper.parent) {
                helper.parent.remove(helper);
            }
            if (helper.dispose) {
                helper.dispose();
            }
        });
        
        // Clear arrays
        this.lights = [];
        this.helpers = [];
        this.ambientLight = null;
        this.directionalLight = null;
        this.directionalLightHelper = null;
    }

    /**
     * Get all lights in the system
     * @returns {Array<THREE.Light>}
     */
    getAllLights() {
        return [...this.lights];
    }

    /**
     * Get specific light by type
     * @param {string} type - 'ambient' or 'directional'
     * @returns {THREE.Light|null}
     */
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
