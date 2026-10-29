// Post-processing: bloom, vignette with a red damage pulse, filmic tone mapping.
import * as THREE from '../../../build/three.module.js';
import { EffectComposer } from '../../../build/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../../../build/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../../../build/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from '../../../build/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from '../../../build/jsm/postprocessing/OutputPass.js';

const VignetteDamageShader = {
    uniforms: {
        tDiffuse: { value: null },
        uDamage: { value: 0.0 },   // 0..1, red flash after taking a hit
        uLowHealth: { value: 0.0 }, // 0..1, steady red edge when health is low
        uTime: { value: 0.0 }
    },
    vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform float uDamage, uLowHealth, uTime;
        varying vec2 vUv;
        void main() {
            vec4 c = texture2D(tDiffuse, vUv);
            vec2 d = vUv - 0.5;
            float r = length(d * vec2(1.25, 1.0));
            float vig = smoothstep(0.85, 0.25, r);
            c.rgb *= mix(0.55, 1.0, vig);
            float pulse = 0.65 + 0.35 * sin(uTime * 6.0);
            float edge = smoothstep(0.35, 0.95, r);
            float red = clamp(uDamage + uLowHealth * pulse * 0.6, 0.0, 1.0) * edge;
            c.rgb = mix(c.rgb, vec3(0.55, 0.0, 0.0), red * 0.85);
            gl_FragColor = c;
        }`
};

export class PostFX {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;

        const size = renderer.getSize(new THREE.Vector2());
        this.composer = new EffectComposer(renderer);
        this.composer.addPass(new RenderPass(scene, camera));
        this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.45, 0.5, 0.82);
        this.composer.addPass(this.bloom);
        this.vignette = new ShaderPass(VignetteDamageShader);
        this.composer.addPass(this.vignette);
        this.composer.addPass(new OutputPass());
        this.damage = 0;
    }

    flashDamage(amount = 0.6) {
        this.damage = Math.min(1, this.damage + amount);
    }

    setLowHealth(fraction) {
        this.vignette.uniforms.uLowHealth.value = fraction < 0.3 ? 1 - fraction / 0.3 : 0;
    }

    setSize(w, h) {
        this.composer.setSize(w, h);
        this.bloom.resolution.set(w / 2, h / 2);
    }

    render(delta) {
        this.damage = Math.max(0, this.damage - delta * 1.8);
        const u = this.vignette.uniforms;
        u.uDamage.value = this.damage;
        u.uTime.value += delta;
        this.composer.render(delta);
    }
}
