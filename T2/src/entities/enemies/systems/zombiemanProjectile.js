import * as THREE from '../../../../../build/three.module.js';

export class ZombiemanProjectile {
  constructor(startPosition, direction, config = {}) {
    this.config = {
      speed: 30,
      damage: 2,
      radius: 0.2,
      maxDistance: 100,
      ...config
    };
    
    this.startPosition = startPosition.clone();
    this.direction = direction.clone().normalize();
    this.velocity = this.direction.clone().multiplyScalar(this.config.speed);
    this.traveledDistance = 0;
    this.isActive = true;
    
    // 1. TORNAR O PROJÉTIL VISÍVEL (como no Cacodemon)
    const geometry = new THREE.SphereGeometry(this.config.radius, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.mesh = new THREE.Mesh(geometry, material);
    
    this.mesh.position.copy(this.startPosition);
    this.mesh.userData.projectile = this;
  }
  
 update(delta) { // Não precisa mais de outros parâmetros aqui
    if (!this.isActive) return;

    const moveDistance = this.config.speed * delta;
    this.mesh.position.addScaledVector(this.direction, moveDistance);
    this.traveledDistance += moveDistance;

    if (this.traveledDistance >= this.config.maxDistance) {
      this.destroy(); // O projétil se autodestrói ao atingir a distância máxima
    }
  }

  checkCollision(player) {
    if (!this.isActive || !player) return false;

    const distanceToPlayer = this.mesh.position.distanceTo(player.position);
    if (distanceToPlayer < this.config.radius + player.radius) {
      this.onHit(player);
      return true;
    }
    return false;
  }

  onHit(target) {
    this.isActive = false; // Apenas marca como inativo. O Zombieman cuidará da destruição.
  }

 destroy() {
    this.isActive = false;
    if (this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
  }
}