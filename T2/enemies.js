import * as THREE from '../build/three.module.js';
import { CONFIG } from './config.js';

// Group to hold all enemies
export let enemiesGroup = null;

// Initialize enemies and add to scene
export function initEnemies(scene) {
  enemiesGroup = new THREE.Group();
  enemiesGroup.name = 'EnemiesGroup';

  // Define initial enemy positions
  const positions = [
    [10, 0, 10],
    [-10, 0, 10],
    [10, 0, -10]
  ];

  positions.forEach(pos => {
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    const enemy = new THREE.Mesh(geometry, material);
    // Position slightly above ground
    enemy.position.set(pos[0], CONFIG.CAMERA_HEIGHT / 2, pos[2]);
    // Behavior parameters
    enemy.userData = {
      baseSpeed: 0.5,
      dashSpeed: 3.0,
      dashInterval: 5.0,
      dashDuration: 1.0,
      timeSinceLastDash: 0,
      isDashing: false
    };
    enemiesGroup.add(enemy);
  });

  scene.add(enemiesGroup);
}

// Update enemy movement towards the camera
export function updateEnemies(delta, camera) {
  if (!enemiesGroup) return;
  enemiesGroup.children.forEach(enemy => {
    const ud = enemy.userData;
    // Update dash timer
    ud.timeSinceLastDash += delta;
    if (ud.isDashing) {
      if (ud.timeSinceLastDash >= ud.dashDuration) {
        ud.isDashing = false;
        ud.timeSinceLastDash = 0;
      }
    } else if (ud.timeSinceLastDash >= ud.dashInterval) {
      ud.isDashing = true;
      ud.timeSinceLastDash = 0;
    }
    // Determine speed
    const speed = ud.isDashing ? ud.dashSpeed : ud.baseSpeed;
    // Compute direction towards camera, ignoring vertical
    const dir = new THREE.Vector3();
    dir.subVectors(camera.position, enemy.position);
    dir.y = 0;
    dir.normalize();
    // Move enemy
    enemy.position.addScaledVector(dir, speed * delta);
  });
}
