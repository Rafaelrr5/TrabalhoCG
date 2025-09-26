/**
 * Exemplo de uso do Sistema Unificado de Projéteis
 * Este arquivo demonstra como integrar o novo sistema ao projeto existente
 */

import * as THREE from '../../../../build/three.module.js';
import { initProjectileSystem } from '../systems/projectiles/index.js';

/**
 * Exemplo de integração com um game manager
 */
export class GameManagerExample {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.enemies = [];
        this.environmentObjects = [];
        
        // Inicializa o sistema unificado de projéteis
        this.projectileSystem = initProjectileSystem(scene, {
            debug: true,                    // Habilita logs de debug
            enableTrails: false,           // Desabilita rastros por performance
            maxProjectiles: 150,           // Pool size para muitos projéteis
            collisionDistance: 0.3         // Distância de colisão
        });

        // Configura eventos do sistema
        this.setupProjectileEvents();
    }

    /**
     * Configura listeners para eventos do sistema de projéteis
     */
    setupProjectileEvents() {
        // Quando um projétil é criado
        this.projectileSystem.on('projectile:created', (data) => {
            console.log(`[GameManager] Projétil ${data.config.id} criado por ${data.owner}`);
        });

        // Quando um projétil atinge algo
        this.projectileSystem.on('projectile:hit', (data) => {
            const { projectile, hit } = data;
            
            console.log(`[GameManager] ${projectile.config.id} atingiu ${hit.type}`);
            
            // Cria efeitos baseados no tipo de alvo
            this.createHitEffect(hit);
            
            // Toca som de impacto
            this.playHitSound(projectile.config, hit.type);
        });

        // Quando um projétil é destruído
        this.projectileSystem.on('projectile:destroyed', (data) => {
            // Útil para estatísticas ou cleanup adicional
        });
    }

    /**
     * Atualiza o jogo (chamado no game loop)
     */
    update(delta) {
        // Atualiza projéteis com alvos atuais
        this.projectileSystem.update(delta, {
            enemies: this.enemies.filter(e => e.isAlive),
            environment: this.environmentObjects,
            player: {
                position: this.camera.position,
                radius: 1.0
            }
        });
    }

    /**
     * Exemplo: Jogador atira com pistola
     */
    playerShootPistol() {
        const gunPosition = this.getGunPosition();
        const direction = this.getAimDirection();
        
        this.projectileSystem.shoot('PISTOL', gunPosition, direction, {
            owner: 'player',
            weaponType: 'pistol'
        });
    }

    /**
     * Exemplo: Jogador atira com shotgun
     */
    playerShootShotgun() {
        const gunPosition = this.getGunPosition();
        const direction = this.getAimDirection();
        
        // Shotgun automaticamente cria múltiplos pellets
        const pellets = this.projectileSystem.shoot('SHOTGUN', gunPosition, direction, {
            owner: 'player',
            weaponType: 'shotgun'
        });
        
        console.log(`Shotgun disparou ${pellets.length} pellets`);
    }

    /**
     * Exemplo: Cacodemon atira no jogador
     */
    cacodeemonShoot(cacodemonPosition, targetPosition) {
        const direction = targetPosition.clone()
            .sub(cacodemonPosition)
            .normalize();
        
        this.projectileSystem.shoot('CACODEMON', cacodemonPosition, direction, {
            owner: 'cacodemon',
            enemyId: 'cacodemon_01'
        });
    }

    /**
     * Exemplo: Zombieman atira no jogador (hitscan)
     */
    zombiemanShoot(zombiemanPosition, targetPosition) {
        const direction = targetPosition.clone()
            .sub(zombiemanPosition)
            .normalize();
        
        this.projectileSystem.shoot('ZOMBIEMAN', zombiemanPosition, direction, {
            owner: 'zombieman',
            enemyId: 'zombieman_01'
        });
    }

    /**
     * Cria efeitos visuais baseados no tipo de impacto
     */
    createHitEffect(hitData) {
        const { point, type, object } = hitData;
        
        switch (type) {
            case 'enemy':
                this.createBloodEffect(point);
                break;
            case 'environment':
                this.createSparkEffect(point);
                break;
            case 'player':
                this.createPlayerHitEffect();
                break;
        }
    }

    /**
     * Cria efeito de sangue quando projétil atinge inimigo
     */
    createBloodEffect(position) {
        // Criar partículas vermelhas
        for (let i = 0; i < 8; i++) {
            const particle = this.createParticle(position, 0x660000, 0.1);
            this.animateParticle(particle, 1.0);
        }
    }

    /**
     * Cria efeito de faíscas quando projétil atinge parede
     */
    createSparkEffect(position) {
        // Criar partículas amarelas/brancas
        for (let i = 0; i < 5; i++) {
            const particle = this.createParticle(position, 0xffff88, 0.05);
            this.animateParticle(particle, 0.5);
        }
    }

    /**
     * Cria efeito quando jogador é atingido
     */
    createPlayerHitEffect() {
        // Efeito na tela, shake da câmera, etc.
        console.log('[GameManager] Jogador foi atingido!');
        
        // Exemplo: screen flash vermelho
        this.flashScreen(0xff0000, 0.3);
    }

    /**
     * Toca som baseado no tipo de projétil e alvo
     */
    playHitSound(projectileConfig, hitType) {
        let soundFile = '';
        
        if (hitType === 'enemy') {
            soundFile = 'hit_flesh.wav';
        } else if (hitType === 'environment') {
            soundFile = 'hit_wall.wav';
        } else if (hitType === 'player') {
            soundFile = 'player_hurt.wav';
        }
        
        if (soundFile) {
            // this.audioSystem.play(soundFile);
            console.log(`[GameManager] Playing sound: ${soundFile}`);
        }
    }

    /**
     * Utilitários para posicionamento
     */
    getGunPosition() {
        // Simula posição da ponta da arma
        const offset = new THREE.Vector3(0.2, -0.1, 0.5);
        const cameraMatrix = new THREE.Matrix4();
        cameraMatrix.extractRotation(this.camera.matrixWorld);
        offset.applyMatrix4(cameraMatrix);
        
        return this.camera.position.clone().add(offset);
    }

    getAimDirection() {
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        return direction;
    }

    /**
     * Cria uma partícula para efeitos
     */
    createParticle(position, color, size) {
        const geometry = new THREE.SphereGeometry(size, 6, 6);
        const material = new THREE.MeshBasicMaterial({ 
            color: color,
            transparent: true 
        });
        
        const particle = new THREE.Mesh(geometry, material);
        particle.position.copy(position);
        
        // Velocidade aleatória
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            Math.random() * 4 + 1,
            (Math.random() - 0.5) * 8
        );
        
        this.scene.add(particle);
        return particle;
    }

    /**
     * Anima uma partícula
     */
    animateParticle(particle, lifetime) {
        const startTime = Date.now();
        const animate = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = elapsed / lifetime;
            
            if (progress >= 1) {
                this.scene.remove(particle);
                particle.geometry.dispose();
                particle.material.dispose();
                return;
            }
            
            // Move partícula
            particle.position.add(
                particle.velocity.clone().multiplyScalar(0.016)
            );
            
            // Aplica gravidade
            particle.velocity.y -= 15 * 0.016;
            
            // Fade out
            particle.material.opacity = 1 - progress;
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    /**
     * Flash na tela
     */
    flashScreen(color, duration) {
        console.log(`[GameManager] Screen flash: ${color.toString(16)} for ${duration}s`);
        // Implementar overlay na tela
    }

    /**
     * Obtém estatísticas do sistema
     */
    getProjectileStats() {
        return this.projectileSystem.getStats();
    }

    /**
     * Limpa todos os projéteis
     */
    clearAllProjectiles() {
        this.projectileSystem.clear();
    }

    /**
     * Cleanup quando o jogo termina
     */
    destroy() {
        if (this.projectileSystem) {
            this.projectileSystem.dispose();
            this.projectileSystem = null;
        }
    }
}

/**
 * Exemplo de integração com arma específica
 */
export class WeaponExample {
    constructor(scene, camera, projectileSystem) {
        this.scene = scene;
        this.camera = camera;
        this.projectileSystem = projectileSystem;
        this.currentWeapon = 'PISTOL';
        this.ammo = {
            pistol: 200,
            shotgun: 50,
            chaingun: 300
        };
    }

    /**
     * Muda arma atual
     */
    switchWeapon(weaponType) {
        const weaponMap = {
            'pistol': 'PISTOL',
            'shotgun': 'SHOTGUN', 
            'chaingun': 'CHAINGUN'
        };
        
        if (weaponMap[weaponType]) {
            this.currentWeapon = weaponMap[weaponType];
            console.log(`[Weapon] Switched to ${weaponType}`);
        }
    }

    /**
     * Atira com arma atual
     */
    shoot() {
        const weaponType = this.currentWeapon.toLowerCase();
        
        // Verifica munição
        if (this.ammo[weaponType] <= 0) {
            console.log(`[Weapon] No ammo for ${weaponType}!`);
            return false;
        }

        const gunPosition = this.getGunPosition();
        const direction = this.getAimDirection();
        
        // Dispara usando sistema unificado
        const projectile = this.projectileSystem.shoot(
            this.currentWeapon, 
            gunPosition, 
            direction, 
            {
                owner: 'player',
                weaponType: this.currentWeapon
            }
        );

        // Consome munição
        if (Array.isArray(projectile)) {
            // Shotgun - múltiplos pellets, mas conta como 1 tiro
            this.ammo[weaponType]--;
        } else {
            this.ammo[weaponType]--;
        }

        console.log(`[Weapon] Shot ${this.currentWeapon}, ammo left: ${this.ammo[weaponType]}`);
        return true;
    }

    getGunPosition() {
        const offset = new THREE.Vector3(0.2, -0.1, 0.5);
        const cameraMatrix = new THREE.Matrix4();
        cameraMatrix.extractRotation(this.camera.matrixWorld);
        offset.applyMatrix4(cameraMatrix);
        return this.camera.position.clone().add(offset);
    }

    getAimDirection() {
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        return direction;
    }
}

// Exemplo de uso:
/*
const gameManager = new GameManagerExample(scene, camera);
const weaponSystem = new WeaponExample(scene, camera, gameManager.projectileSystem);

// No game loop
function gameLoop(delta) {
    gameManager.update(delta);
}

// Para atirar
document.addEventListener('click', () => {
    weaponSystem.shoot();
});

// Para trocar arma
document.addEventListener('keydown', (event) => {
    if (event.key === '1') weaponSystem.switchWeapon('pistol');
    if (event.key === '2') weaponSystem.switchWeapon('shotgun');
    if (event.key === '3') weaponSystem.switchWeapon('chaingun');
});
*/