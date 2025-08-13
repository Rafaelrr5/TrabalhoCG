import * as THREE from '../../../build/three.module.js';
import { lightingSystem } from './lights.js';
import { isPlayerInsideHangar } from '../components/hangar.js';

class HangarLightingSystem {
    constructor() {
        this.isInsideHangar = false;
        this.hangarLight = null;
        this.originalMainLightIntensity = 5.0;
        this.originalAmbientIntensity = 0.8;
        this.hangarLightIntensity = 2.5; // Luz mais fraca para o interior
        this.hangarAmbientIntensity = 0.4; // Ambiente mais escuro
        this.transitionSpeed = 1.0; // Velocidade da transição
        this.isTransitioning = false;
        this.targetMainIntensity = this.originalMainLightIntensity;
        this.targetAmbientIntensity = this.originalAmbientIntensity;
        this.scene = null;
    }

    init(scene) {
        this.scene = scene;
        this._createHangarLight();
        console.log('[HANGAR LIGHTS] Sistema de iluminação do hangar inicializado');
    }

    _createHangarLight() {
        if (!this.scene) return;

        this.hangarLight = new THREE.DirectionalLight(0xffffff, 0);
        this.hangarLight.position.set(0, 300, -200);
        this.hangarLight.castShadow = false;
        this.hangarLight.visible = false;
        
        this.scene.add(this.hangarLight);
        console.log('[HANGAR LIGHTS] Luz secundária do hangar criada');
    }

    update(delta, camera) {
        if (!this.scene || !camera) return;

        const playerIsInside = isPlayerInsideHangar(camera, this.scene);
        
        if (playerIsInside !== this.isInsideHangar) {
            this.isInsideHangar = playerIsInside;
            this._triggerLightTransition();
        }

        this._updateLightTransition(delta);
    }

    _triggerLightTransition() {
        const mainLight = lightingSystem.getLight('directional');
        const ambientLight = lightingSystem.getLight('ambient');

        if (!mainLight || !ambientLight) return;

        this.isTransitioning = true;

        if (this.isInsideHangar) {
            this.targetMainIntensity = 0; // Desligar luz principal
            this.targetAmbientIntensity = this.hangarAmbientIntensity;
            this.hangarLight.visible = true;
            this.hangarLight.intensity = this.hangarLightIntensity;
            
            console.log('[HANGAR LIGHTS] 🏢 Jogador entrou no hangar - ativando iluminação interna');
        } else {
            this.targetMainIntensity = this.originalMainLightIntensity;
            this.targetAmbientIntensity = this.originalAmbientIntensity;
            
            console.log('[HANGAR LIGHTS] 🌞 Jogador saiu do hangar - restaurando iluminação externa');
        }
    }

    _updateLightTransition(delta) {
        if (!this.isTransitioning) return;

        const mainLight = lightingSystem.getLight('directional');
        const ambientLight = lightingSystem.getLight('ambient');

        if (!mainLight || !ambientLight) return;

        const transitionAmount = this.transitionSpeed * delta;
        let transitionComplete = true;

        const mainIntensityDiff = this.targetMainIntensity - mainLight.intensity;
        if (Math.abs(mainIntensityDiff) > 0.01) {
            const change = Math.sign(mainIntensityDiff) * Math.min(Math.abs(mainIntensityDiff), transitionAmount);
            mainLight.intensity += change;
            transitionComplete = false;
        } else {
            mainLight.intensity = this.targetMainIntensity;
        }

        const ambientIntensityDiff = this.targetAmbientIntensity - ambientLight.intensity;

        if (Math.abs(ambientIntensityDiff) > 0.01) {
            const change = Math.sign(ambientIntensityDiff) * Math.min(Math.abs(ambientIntensityDiff), transitionAmount * 0.5);
            ambientLight.intensity += change;
            transitionComplete = false;
        } else {
            ambientLight.intensity = this.targetAmbientIntensity;
        }

        if (transitionComplete) {
            this.isTransitioning = false;
            
            if (!this.isInsideHangar && this.hangarLight) {
                this.hangarLight.visible = false;
                this.hangarLight.intensity = 0;
            }

            console.log('[HANGAR LIGHTS] ✅ Transição de iluminação concluída');
        }
    }

    setHangarLightIntensity(intensity) {
        this.hangarLightIntensity = Math.max(0, intensity);
        if (this.hangarLight && this.isInsideHangar) {
            this.hangarLight.intensity = this.hangarLightIntensity;
        }
    }

    setHangarAmbientIntensity(intensity) {
        this.hangarAmbientIntensity = Math.max(0, intensity);
        if (this.isInsideHangar) {
            this.targetAmbientIntensity = this.hangarAmbientIntensity;
        }
    }

    setTransitionSpeed(speed) {
        this.transitionSpeed = Math.max(0.1, speed);
    }

    resetToExternalLighting() {
        const mainLight = lightingSystem.getLight('directional');
        const ambientLight = lightingSystem.getLight('ambient');

        if (mainLight) mainLight.intensity = this.originalMainLightIntensity;
        if (ambientLight) ambientLight.intensity = this.originalAmbientIntensity;
        if (this.hangarLight) {
            this.hangarLight.visible = false;
            this.hangarLight.intensity = 0;
        }

        this.isInsideHangar = false;
        this.isTransitioning = false;
        
        console.log('[HANGAR LIGHTS] 🔄 Iluminação resetada para externa');
    }

    getStatus() {
        const mainLight = lightingSystem.getLight('directional');
        const ambientLight = lightingSystem.getLight('ambient');

        return {
            isInsideHangar: this.isInsideHangar,
            isTransitioning: this.isTransitioning,
            mainLightIntensity: mainLight ? mainLight.intensity : 0,
            ambientLightIntensity: ambientLight ? ambientLight.intensity : 0,
            hangarLightIntensity: this.hangarLight ? this.hangarLight.intensity : 0,
            hangarLightVisible: this.hangarLight ? this.hangarLight.visible : false
        };
    }

    dispose() {
        if (this.hangarLight && this.scene) {
            this.scene.remove(this.hangarLight);
            this.hangarLight = null;
        }
        
        this.resetToExternalLighting();
        console.log('[HANGAR LIGHTS] Sistema de iluminação do hangar finalizado');
    }
}

const hangarLightingSystem = new HangarLightingSystem();

export { HangarLightingSystem, hangarLightingSystem };

export function initHangarLighting(scene) {
    return hangarLightingSystem.init(scene);
}

export function updateHangarLighting(delta, camera) {
    return hangarLightingSystem.update(delta, camera);
}

export function resetHangarLighting() {
    return hangarLightingSystem.resetToExternalLighting();
}

export function getHangarLightingStatus() {
    return hangarLightingSystem.getStatus();
}

export default hangarLightingSystem;