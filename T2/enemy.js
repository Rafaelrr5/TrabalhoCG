// ============================================================================
// Enemy implementation for Lost Soul-like behavior in Area 1
// ============================================================================
import * as THREE from '../build/three.module.js';
import { CONFIG } from './config.js';
import { isPlayerInArea1 } from './environment.js';

const enemies = [];
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
        enemies.push(enemy);
    });
}

// Update all enemies: idle outside Area 1, chase when player enters
export function updateEnemies(delta, scene, camera) {
    enemies.forEach(enemy => {
        if (isPlayerInArea1(camera)) {
            // Chase player
            const dir = new THREE.Vector3();
            dir.subVectors(camera.position, enemy.position).normalize();
            enemy.position.add(dir.multiplyScalar(ENEMY_SPEED * delta));
            // Face player
            enemy.lookAt(camera.position.x, enemy.position.y, camera.position.z);
        } else {
            // Idle rotation
            enemy.rotation.y += delta;
        }
    });
}
