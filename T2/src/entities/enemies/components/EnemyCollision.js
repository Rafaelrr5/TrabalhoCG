import * as THREE from '../../../../../../build/three.module.js';

export class EnemyCollision {
  constructor(enemy) {
    this.enemy = enemy;
    this.boundingBox = new THREE.Box3();
    this.lastUpdate = 0;
    this.updateInterval = enemy.config.performance?.boundingBoxUpdateInterval || 100;
    this.enableThrottling = enemy.config.performance?.enableThrottling ?? true;
    this.lastPlayerCollisionTime = 0;
    this.playerCollisionCooldown = 100;
    
    // Throttling para correções de posição
    this.lastCorrectionTime = 0;
    this.correctionInterval = 50; // 50ms entre correções
    this.lastSeparationTime = 0;
    this.separationInterval = 30; // 30ms entre separações
  }

  updateBoundingBox(force = false) {
    if (!this.enableThrottling || force) {
      this.boundingBox.setFromObject(this.enemy.mesh);
      return;
    }
    
    const now = performance.now();
    if (now - this.lastUpdate >= this.updateInterval) {
      this.boundingBox.setFromObject(this.enemy.mesh);
      this.lastUpdate = now;
    }
  }

  checkCollision(otherBoundingBox) {
    return this.boundingBox.intersectsBox(otherBoundingBox);
  }

  checkPlayerCollision(playerPosition, options = {}) {
    const {
      collisionRadius = this.enemy.config.collisionRadius || this.enemy.config.radius,
      radiusMultiplier = 1.0,
      damage = this.enemy.config.damage || this.enemy.config.kamikazeDamage || 10,
      destroyOnHit = true,
      cooldownOverride = null
    } = options;
    
    const now = performance.now();
    const cooldown = cooldownOverride !== null ? cooldownOverride : this.playerCollisionCooldown;
    
    if (now - this.lastPlayerCollisionTime < cooldown) {
      return false;
    }
    
    const distanceToPlayer = this.enemy.mesh.position.distanceTo(playerPosition);
    const effectiveRadius = collisionRadius * radiusMultiplier;
    
    if (distanceToPlayer <= effectiveRadius) {
      this.lastPlayerCollisionTime = now;
      this.dealDamageToPlayer(damage);
      
      if (destroyOnHit) {
        this.enemy.die();
      }
      
      return true;
    }
    
    return false;
  }

  checkEnvironmentCollision(collidableObjects, newPosition = null) {
    if (!collidableObjects || collidableObjects.length === 0) {
      return { hasCollision: false };
    }
    
    const checkPosition = newPosition || this.enemy.mesh.position;
    const radius = this.enemy.config.collisionRadius || this.enemy.config.radius || 1.0;
    
    // Criar bounding box do inimigo na posição a ser testada
    const enemyBox = new THREE.Box3().setFromCenterAndSize(
      checkPosition,
      new THREE.Vector3(radius * 2, radius * 2, radius * 2)
    );
    
    for (const obj of collidableObjects) {
      const objectBox = new THREE.Box3().setFromObject(obj);
      
      if (enemyBox.intersectsBox(objectBox)) {
        // Calcular direção de escape
        const objectCenter = objectBox.getCenter(new THREE.Vector3());
        const escapeDirection = new THREE.Vector3()
          .subVectors(checkPosition, objectCenter)
          .normalize();
        
        // Se a direção é zero (posições idênticas), usar direção padrão
        if (escapeDirection.length() === 0) {
          escapeDirection.set(1, 0, 0);
        }
        
        return {
          hasCollision: true,
          object: obj,
          normal: escapeDirection,
          distance: 0,
          point: checkPosition
        };
      }
    }
    
    return { hasCollision: false };
  }

  getAvoidanceDirection(collidableObjects, targetPosition, lookaheadDistance = 2.0) {
    if (!collidableObjects || collidableObjects.length === 0) {
      return null;
    }
    
    const currentPos = this.enemy.mesh.position;
    const radius = this.enemy.config.collisionRadius || this.enemy.config.radius || 1.0;
    
    // Verificar colisão atual
    const collision = this.checkEnvironmentCollision(collidableObjects);
    
    if (collision.hasCollision) {
      // Se há colisão, empurrar na direção oposta
      const pushDirection = collision.normal.clone();
      pushDirection.y = 0; // Manter no plano horizontal
      pushDirection.normalize();
      
      return pushDirection.multiplyScalar(2.0);
    }
    
    // Verificar colisão futura baseada na direção de movimento
    if (targetPosition) {
      const direction = new THREE.Vector3()
        .subVectors(targetPosition, currentPos)
        .normalize();
      
      const futurePosition = currentPos.clone()
        .addScaledVector(direction, lookaheadDistance);
      
      const futureCollision = this.checkEnvironmentCollision(collidableObjects, futurePosition);
      
      if (futureCollision.hasCollision) {
        // Tentar direções alternativas
        const testDirections = [
          direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), // 90° esquerda
          direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2), // 90° direita
          direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4), // 45° esquerda
          direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 4), // 45° direita
        ];
        
        for (const testDir of testDirections) {
          const testPos = currentPos.clone().addScaledVector(testDir, lookaheadDistance);
          const testCollision = this.checkEnvironmentCollision(collidableObjects, testPos);
          
          if (!testCollision.hasCollision) {
            return testDir;
          }
        }
        
        // Se todas as direções testadas falharam, usar a normal da colisão
        return futureCollision.normal.clone().multiplyScalar(1.5);
      }
    }
    
    return null;
  }

  checkEnemyCollisions(otherEnemies, separationRadius = null) {
    if (!otherEnemies || otherEnemies.length === 0) {
      return { hasCollision: false, separationForce: new THREE.Vector3() };
    }
    
    const radius = separationRadius || (this.enemy.config.collisionRadius * 2.5);
    const separationForce = new THREE.Vector3();
    let collisionCount = 0;
    
    for (const other of otherEnemies) {
      if (other === this.enemy || !other.isAlive) continue;
      
      const distance = this.enemy.mesh.position.distanceTo(other.mesh.position);
      if (distance < radius && distance > 0.1) {
        const pushDirection = new THREE.Vector3()
          .subVectors(this.enemy.mesh.position, other.mesh.position)
          .normalize();
        
        // Força de separação mais suave - diminui conforme a distância aumenta
        const pushStrength = Math.pow((radius - distance) / radius, 2) * 0.8;
        separationForce.addScaledVector(pushDirection, pushStrength);
        collisionCount++;
      }
    }
    
    if (collisionCount > 0) {
      // Normalizar e aplicar força mais suave
      separationForce.normalize().multiplyScalar(1.0);
      return { hasCollision: true, separationForce, collisionCount };
    }
    
    return { hasCollision: false, separationForce: new THREE.Vector3(), collisionCount: 0 };
  }

  applySeparationForce(separationForce, delta, strength = 1.0) {
    const now = performance.now();
    if (now - this.lastSeparationTime < this.separationInterval) {
      return false; // Throttle da separação
    }
    
    if (separationForce.length() > 0) {
      this.lastSeparationTime = now;
      
      // Aplicar força ainda mais suave e limitada
      const maxForce = this.enemy.config.speed * 0.3; // Força máxima reduzida
      const clampedForce = separationForce.clone().clampLength(0, maxForce);
      
      const separationVelocity = clampedForce.multiplyScalar(strength * 0.5); // Reduzir ainda mais
      this.enemy.mesh.position.addScaledVector(separationVelocity, delta);
      return true;
    }
    
    return false;
  }

  // Método simplificado para validar se pode mover para uma posição
  canMoveTo(targetPosition, collidableObjects) {
    if (!collidableObjects || collidableObjects.length === 0) {
      return true;
    }
    
    const collision = this.checkEnvironmentCollision(collidableObjects, targetPosition);
    return !collision.hasCollision;
  }

  // Método para corrigir posição quando há colisão
  correctPosition(collidableObjects, delta = 0.016) {
    const now = performance.now();
    if (now - this.lastCorrectionTime < this.correctionInterval) {
      return false; // Throttle das correções
    }
    
    const collision = this.checkEnvironmentCollision(collidableObjects);
    
    if (collision.hasCollision) {
      this.lastCorrectionTime = now;
      
      const radius = this.enemy.config.collisionRadius || this.enemy.config.radius || 1.0;
      const correctionDistance = radius * 0.05; // Correção muito pequena e suave
      
      const correctionVector = collision.normal.clone()
        .multiplyScalar(correctionDistance);
      
      // Aplicar correção muito suave baseada no delta time
      const smoothingFactor = Math.min(1.0, delta * 5.0); // Suavização mais lenta
      correctionVector.multiplyScalar(smoothingFactor);
      
      this.enemy.mesh.position.add(correctionVector);
      return true;
    }
    
    return false;
  }

  // Método para prevenir overlap gradualmente
  preventOverlap(collidableObjects, delta = 0.016) {
    const now = performance.now();
    if (now - this.lastCorrectionTime < this.correctionInterval) {
      return false; // Throttle das correções
    }
    
    if (!collidableObjects || collidableObjects.length === 0) {
      return false;
    }
    
    const radius = this.enemy.config.collisionRadius || this.enemy.config.radius || 1.0;
    const currentPos = this.enemy.mesh.position;
    let totalCorrection = new THREE.Vector3();
    let correctionCount = 0;
    
    for (const obj of collidableObjects) {
      const objectBox = new THREE.Box3().setFromObject(obj);
      const objectCenter = objectBox.getCenter(new THREE.Vector3());
      const distance = currentPos.distanceTo(objectCenter);
      
      // Calcular a distância mínima necessária
      const objectSize = objectBox.getSize(new THREE.Vector3());
      const minDistance = radius + Math.max(objectSize.x, objectSize.z) * 0.5;
      
      if (distance < minDistance && distance > 0.1) {
        const pushDirection = new THREE.Vector3()
          .subVectors(currentPos, objectCenter)
          .normalize();
        
        const overlap = minDistance - distance;
        const correctionStrength = Math.min(overlap * 0.3, radius * 0.1); // Mais limitado
        
        totalCorrection.addScaledVector(pushDirection, correctionStrength);
        correctionCount++;
      }
    }
    
    if (correctionCount > 0) {
      this.lastCorrectionTime = now;
      
      // Aplicar correção muito suave
      const smoothingFactor = Math.min(1.0, delta * 4.0); // Mais suave ainda
      totalCorrection.multiplyScalar(smoothingFactor / correctionCount);
      
      this.enemy.mesh.position.add(totalCorrection);
      return true;
    }
    
    return false;
  }

  dealDamageToPlayer(damage) {
    if (typeof window.playerTakeDamage === 'function') {
      window.playerTakeDamage(damage);
      console.log(`[${this.enemy.constructor.name}] Dealt ${damage} damage to player`);
    } else {
      console.warn(`[${this.enemy.constructor.name}] Player damage system not available!`);
    }
  }

  dispose() {
    this.boundingBox = null;
    this.enemy = null;
  }

  getValidMovementDirection(targetPosition, collidableObjects, lookahead = 2.0) {
  this.updateBoundingBox();
  
  // 1. Verifica colisão direta
  const directCollision = this.checkEnvironmentCollision(collidableObjects, targetPosition);
  if (!directCollision.hasCollision) {
    return new THREE.Vector3().subVectors(targetPosition, this.enemy.mesh.position).normalize();
  }

  // 2. Calcula direção de evasão
  const avoidance = this.getAvoidanceDirection(collidableObjects, targetPosition, lookahead);
  return avoidance || directCollision.normal;
}
}
