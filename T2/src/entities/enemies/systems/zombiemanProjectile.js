import * as THREE from '../../../../../build/three.module.js';

export class ZombiemanProjectile {
  constructor(startPosition, direction, config = {}) {
    this.config = {
      speed: 30, // Mais rápido que o do Cacodemon
      damage: 2, // Dano definido como 2
      radius: 0.2, // Raio pequeno para a hitbox
      maxDistance: 100,
      ...config
    };
    
    this.startPosition = startPosition.clone();
    this.direction = direction.clone().normalize();
    this.velocity = this.direction.clone().multiplyScalar(this.config.speed);
    this.traveledDistance = 0;
    this.isActive = true;
    
    // O projétil é invisível, então não criamos uma malha visível.
    // Apenas a lógica de colisão será usada.
    this.mesh = new THREE.Object3D();
    this.mesh.position.copy(this.startPosition);
    this.mesh.userData.projectile = this;
  }
  
  update(delta, collidableObjects = [], camera = null) {
    if (!this.isActive) return;

    const moveDistance = this.config.speed * delta;
    this.mesh.position.addScaledVector(this.direction, moveDistance);
    this.traveledDistance += moveDistance;

    if (this.traveledDistance >= this.config.maxDistance) {
      this.destroy();
    }
  }

  checkCollision(player) {
    if (!this.isActive || !player) return false;

    // A verificação de colisão pode ser uma simples verificação de distância
    const distanceToPlayer = this.mesh.position.distanceTo(player.position);
    if (distanceToPlayer < this.config.radius + player.radius) {
      this.onHit(player);
      return true;
    }

    return false;
  }

  onHit(target) {
    // Lógica para quando o projétil atinge um alvo (o jogador)
    this.isActive = false;
    // A lógica de dano ao jogador será tratada no Zombieman ou no sistema de jogo
  }

  destroy() {
    this.isActive = false;
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
  }
}