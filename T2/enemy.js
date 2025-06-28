// ============================================================================
// Enemy implementation for Lost Soul-like behavior in Area 1
// ============================================================================
import * as THREE from '../build/three.module.js';
import { CONFIG } from './config.js';
import { isPlayerInArea1 } from './environment.js';

export const enemies = [];
const ENEMY_SPEED = 20; // units per second

// Create placeholder enemies in Area 1
export function createEnemies(scene) {
    const enemyY = CONFIG.AREA_Y_POSITION + CONFIG.AREA_HEIGHT / 2 + 1.0; // float above area
    const positions = [
        new THREE.Vector3(-170, enemyY, -140),
        new THREE.Vector3(-160, enemyY, -130),
        new THREE.Vector3(-150, enemyY, -135),
        new THREE.Vector3(-155, enemyY, -120),
        new THREE.Vector3(-140, enemyY, -145)
    ];
    positions.forEach(pos => {
        const geom = new THREE.SphereGeometry(1.0, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const enemy = new THREE.Mesh(geom, mat);
        enemy.position.copy(pos);
        scene.add(enemy);
        // initialize HP and alive status
        enemy.userData = {
            hp: 20,
            alive: true,
            baseSpeed: 2.0,         // slow approach speed
            dashSpeed: 15.0,        // kamikaze dash speed
            dashInterval: 5.0,      // seconds between dashes
            dashDuration: 0.8,      // duration of dash
            dashTimer: 0.0,
            isDashing: false
        };
        // create health bar
        const barWidth = 2, barHeight = 0.2;
        const bgMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const fgMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const bgBar = new THREE.Mesh(new THREE.PlaneGeometry(barWidth, barHeight), bgMat);
        const fgBar = new THREE.Mesh(new THREE.PlaneGeometry(barWidth, barHeight), fgMat);
        fgBar.position.z = 0.01; // front
        const healthBar = new THREE.Group();
        healthBar.add(bgBar);
        healthBar.add(fgBar);
        healthBar.position.set(0, 1.5, 0); // above enemy
        healthBar.name = 'healthBar';
        enemy.add(healthBar);
        // store for updates
        enemy.userData.healthBar = fgBar;
        enemy.userData.healthBarMaxWidth = barWidth;
        enemies.push(enemy);
    });
}

// Update all enemies: idle outside Area 1, chase when player enters
export function updateEnemies(delta, scene, camera) {
    enemies.forEach(enemy => {
        // skip dead enemies
        if (!enemy.userData.alive || enemy.userData.hp <= 0) {
            enemy.visible = false;
            return;
        }
        // update health bar scale and position
        const fgBar = enemy.userData.healthBar;
        if (fgBar) {
            const ratio = Math.max(enemy.userData.hp / 20, 0);
            fgBar.scale.x = ratio;
            fgBar.position.x = - (enemy.userData.healthBarMaxWidth * (1 - ratio)) / 2;
        }

        if (isPlayerInArea1(camera)) {
            // update dash timer
            const ud = enemy.userData;
            ud.dashTimer += delta;
            if (!ud.isDashing && ud.dashTimer >= ud.dashInterval) {
                ud.isDashing = true;
                ud.dashTimer = 0;
            } else if (ud.isDashing && ud.dashTimer >= ud.dashDuration) {
                ud.isDashing = false;
                ud.dashTimer = 0;
            }
            // choose speed
            const speed = enemy.userData.isDashing ? enemy.userData.dashSpeed : enemy.userData.baseSpeed;
             // Chase player
            const dir = new THREE.Vector3().subVectors(camera.position, enemy.position).normalize();
            enemy.position.add(dir.multiplyScalar(speed * delta));
             // Face player
             enemy.lookAt(camera.position.x, enemy.position.y, camera.position.z);
         } else {
             // Idle rotation
             enemy.rotation.y += delta;
         }
    });
}
