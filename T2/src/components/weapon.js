import * as THREE from '../../../build/three.module.js';
import { WEAPONS_CONFIG } from '../core/config/weaponsConfig.js';
import { DEBUG_CONFIG } from '../core/config/debugConfig.js';
import { BaseWeapon } from './baseWeapon.js';
// Importa a NOVA função do seu modelLoader.js
import { loadOBJWithManualTextures, createFallbackModel } from '../utils/modelLoader.js';

export class Gun extends BaseWeapon {
    constructor(camera) {
        super(camera, WEAPONS_CONFIG.WEAPONS.LAUNCHER);
        this.projectileModel = null;
        this.modelsLoaded = false;

        this.originalPosition = new THREE.Vector3();
        this.recoilProgress = 1; // 0 = recuo máximo, 1 = em repouso
        this.recoilAmount = 0.3; // Distância do "coice" para trás
        this.recoilSpeed = 1 / (this.shootRate / 1000); // Recuperação em 500ms
        this.bigImpact = true; // rockets explode on impact
        // HDR colour so the bloom pass makes the exhaust glow
        this.glowGeometry = new THREE.SphereGeometry(0.22, 10, 10);
        this.glowMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 2.4, 0.6) });
    }

    // Textured rocket model (loaded in init) with a glowing exhaust; plain glow if not loaded yet
    createRocketMesh() {
        const group = new THREE.Group();
        const glow = new THREE.Mesh(this.glowGeometry, this.glowMaterial);
        group.add(glow);
        if (this.projectileModel) {
            if (!this.rocketTemplate) {
                // The OBJ comes in ~140 m long at scale 5: normalise it to a 0.9 m rocket and turn
                // the nose (model -Z) to +Z, which lookAt() points at the target
                const t = this.projectileModel.clone();
                const size = new THREE.Box3().setFromObject(t).getSize(new THREE.Vector3());
                t.scale.multiplyScalar(0.9 / Math.max(size.x, size.y, size.z));
                t.rotation.y = Math.PI;
                this.rocketTemplate = t;
            }
            const rocket = this.rocketTemplate.clone();
            group.add(rocket);
            glow.position.z = -0.4; // exhaust behind the nose (group +Z faces the target)
        }
        return group;
    }

    async init(scene) {
        super.init(scene);
        try {
            await Promise.all([
                this.createWeaponMesh(),
                this.loadProjectileModel()
            ]);
            this.modelsLoaded = true;
            if (DEBUG_CONFIG.DEBUG_CONSOLE_LOGS) {
                console.log("[GUN] Arma e projétil carregados com sucesso.");
            }
        } catch (error) {
            console.error("[GUN] Falha ao carregar os modelos da arma. Usando fallback.", error);
            this.mesh = createFallbackModel({ fallback: { type: 'cylinder' } });
            this.camera.add(this.mesh);
        }
        return true;
    }

    /**
     * Carrega o modelo 3D da arma usando o loader com texturas manuais.
     */
    async createWeaponMesh() {
        const modelPath = 'assets/models/rocketlauncher.obj';
        const texturePaths = {
            diffuse: 'assets/textures/gun_D.jpg',
            normal: 'assets/textures/gun_N.jpg',
            displacement: 'assets/textures/gun_H.jpg'
        };

        const weaponConfig = {
            scale: 0.05,
             rotation: { x: 0, y: Math.PI, z: 0 },
            pivotAtCenter: true,
            displacementScale: 0.01 // Ajuste fino do efeito de relevo
        };

        this.mesh = await loadOBJWithManualTextures(modelPath, texturePaths, weaponConfig);
        
        this.mesh.position.set(WEAPONS_CONFIG.GUN_POSITION.x, WEAPONS_CONFIG.GUN_POSITION.y, 0.5);
        
        // --- GUARDA A POSIÇÃO ORIGINAL PARA O RECUO ---
        this.originalPosition.copy(this.mesh.position);

         // Remove qualquer outra arma com o mesmo nome que já possa estar na câmera.
        const oldMesh = this.camera.getObjectByName("GunMesh");
        if (oldMesh) {
            this.camera.remove(oldMesh);
        }
        // Nomeia a nova malha para que possamos encontrá-la no futuro, se necessário.
        this.mesh.name = "GunMesh";

        this.mesh.visible = this.isVisible;
        this.camera.add(this.mesh);
    }

    async loadProjectileModel() {
        const modelPath = 'assets/models/rocket.obj';
        const texturePaths = {
            diffuse: 'assets/textures/rocket_D.jpg',
            normal: 'assets/textures/rocket_N.jpg',
            displacement: 'assets/textures/rocket_H.jpg'
        };

        const projectileConfig = {

            scale: 5.0, // Tente 5.0, 10.0 ou até mais, se necessário

            displacementScale: 0.01
        };

        this.projectileModel = await loadOBJWithManualTextures(modelPath, texturePaths, projectileConfig);
    }

   shoot() {
        // Ignora a checagem de modelos por enquanto
        if (!this.mesh) return;

        const projectile = this.createRocketMesh();

        // Sai abaixo da câmera (fora do near plane) e converge para o ponto sob a mira
        const startPosition = new THREE.Vector3(0, -0.6, -2);
        this.camera.localToWorld(startPosition);
        projectile.position.copy(startPosition);
        const direction = this.aimDirectionFrom(startPosition);
        projectile.lookAt(startPosition.clone().add(direction));
        
        // ==============================================================================
        //                           FIM DO TESTE DE VISIBILIDADE
        // ==============================================================================

        this.scene.add(projectile);

        this.projectiles.push({
            mesh: projectile,
            direction: direction,
            timeAlive: 0
        });

        // --- INICIA A ANIMAÇÃO DE RECUO ---
        this.recoilProgress = 0;

        this.onShoot();
        window.dispatchEvent(new CustomEvent('game:shot'));
        window.dispatchEvent(new CustomEvent('game:shake', { detail: 0.12 }));
    }

    updateProjectiles(delta) {
        // Chama a função original `updateProjectiles` da BaseWeapon para que os projéteis se movam.
        super.updateProjectiles(delta);
        // ==============================================================================

        // --- LÓGICA DA ANIMAÇÃO DE RECUO ---
        if (!this.mesh) return;

        if (this.recoilProgress < 1) {
            this.recoilProgress += this.recoilSpeed * delta;
            this.recoilProgress = Math.min(this.recoilProgress, 1);

            // Easing para um movimento suave de retorno
            const easedProgress = 1 - Math.pow(1 - this.recoilProgress, 3);
            const currentRecoil = this.recoilAmount * (1 - easedProgress);

            // Aplica o deslocamento apenas no eixo Z da posição original
            this.mesh.position.z = this.originalPosition.z + currentRecoil;
        }
    }


}


export let gun = null;

export function createGun(camera) {
    gun = new Gun(camera);
    return gun;
}

export function initGun(scene) {
    if (gun) {
        return gun.init(scene);
    }
    return false;
}

export function startShooting() {
    if (gun) {
        gun.startShooting();
    }
}

export function stopShooting() {
    if (gun) {
        gun.stopShooting();
    }
}

export function updateProjectiles(delta) {
    if (gun) {
        gun.updateProjectiles(delta);
    }
}

export function toggleWeaponVisibility() {
    if (gun) {
        gun.toggleVisibility();
    }
}

export function setWeaponVisibility(visible) {
    if (gun) {
        gun.setVisibility(visible);
    }
}

export function debugWeaponInfo() {
    if (gun) {
        gun.debugInfo();
    }
}

export function getProjectiles() {
    return gun ? gun.projectiles : [];
}

export function getGun() {
    return gun;
}