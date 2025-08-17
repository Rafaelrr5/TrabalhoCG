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
    
    const geometry = new THREE.SphereGeometry(this.config.radius, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.visible = false;
    
    this.mesh.position.copy(this.startPosition);
    this.mesh.userData.projectile = this;
  }
  
  update(delta, player) {
    if (!this.isActive) return false; // Retorna falso se inativo

    const moveDistance = this.config.speed * delta;
    this.mesh.position.addScaledVector(this.direction, moveDistance);
    this.traveledDistance += moveDistance;

    // Verifica a colisão
    if (this.checkCollision(player)) {
      this.destroy();
      return false; // Projétil se torna inativo após a colisão
    }

    // Verifica a distância máxima
    if (this.traveledDistance >= this.config.maxDistance) {
      this.destroy();
      return false; // Projétil se torna inativo
    }

    return true; // Permanece ativo
  }

  checkCollision(player) {
  if (!this.isActive || !player || !player.position) return false;

  const playerRadius = player.radius || 1.0; 
  const distanceToPlayer = this.mesh.position.distanceTo(player.position);

  if (distanceToPlayer < this.config.radius + playerRadius) {
    this.onHit(player); // Chama onHit ao colidir
    return true;
  }
  return false;
}

  onHit(target) {
    // Dispara um evento global quando atinge o jogador3
     if (typeof window.playerTakeDamage === 'function') {
    window.playerTakeDamage(this.config.damage);
    } else {
    console.warn('Função window.playerTakeDamage() não encontrada!');
    }
  }

  destroy() {
    this.isActive = false;
    if (this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
    // Opcional: Liberar memória da geometria e material
    if (this.mesh.geometry) this.mesh.geometry.dispose();
    if (this.mesh.material) this.mesh.material.dispose();
  }
}