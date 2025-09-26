import * as THREE from '../../../../build/three.module.js';
import { getProjectileConfig } from './ProjectileTypes.js';
import { ProjectilePool } from './ProjectilePool.js';

/**
 * Sistema unificado de projéteis
 * Gerencia todos os projéteis do jogo de forma eficiente
 */
export class ProjectileSystem {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.projectiles = [];
    this.pool = new ProjectilePool(options.poolSize || 100);
    this.raycaster = new THREE.Raycaster();
    
    // Configurações
    this.options = {
      enableDebug: options.enableDebug || false,
      collisionDistance: options.collisionDistance || 0.5,
      ...options
    };

    // Eventos
    this.eventListeners = new Map();
  }

  /**
   * Cria e dispara um projétil
   * @param {string} type - Tipo do projétil
   * @param {THREE.Vector3} position - Posição inicial
   * @param {THREE.Vector3} direction - Direção normalizada
   * @param {Object} options - Opções adicionais
   * @returns {Object} Dados do projétil criado
   */
  shoot(type, position, direction, options = {}) {
    const config = getProjectileConfig(type);
    const projectileMesh = this.pool.acquire(type);
    
    // Configuração básica
    projectileMesh.position.copy(position);
    projectileMesh.userData.active = true;
    projectileMesh.userData.timeAlive = 0;
    projectileMesh.userData.traveledDistance = 0;

    // Se é shotgun, criar múltiplos pellets
    if (config.pellets && config.pellets > 1) {
      return this.shootSpread(type, position, direction, config, options);
    }

    // Cria os dados do projétil
    const projectileData = {
      mesh: projectileMesh,
      direction: direction.clone().normalize(),
      velocity: direction.clone().normalize().multiplyScalar(config.speed),
      config: config,
      owner: options.owner || 'unknown',
      id: this.generateId(),
      ...options
    };

    // Adiciona à cena e lista ativa
    this.scene.add(projectileMesh);
    this.projectiles.push(projectileData);

    // Dispara evento
    this.emit('projectile:created', projectileData);

    if (this.options.enableDebug) {
      console.log(`[ProjectileSystem] Projétil ${type} criado. Total ativo: ${this.projectiles.length}`);
    }

    return projectileData;
  }

  /**
   * Cria projéteis com dispersão (shotgun)
   * @param {string} type - Tipo do projétil
   * @param {THREE.Vector3} position - Posição inicial
   * @param {THREE.Vector3} direction - Direção base
   * @param {Object} config - Configuração do projétil
   * @param {Object} options - Opções adicionais
   * @returns {Array} Array com os dados dos projéteis criados
   */
  shootSpread(type, position, direction, config, options = {}) {
    const projectiles = [];
    const spread = config.spread || 0.1;
    
    for (let i = 0; i < config.pellets; i++) {
      // Calcula direção com dispersão
      const spreadDirection = direction.clone();
      spreadDirection.x += (Math.random() - 0.5) * spread;
      spreadDirection.y += (Math.random() - 0.5) * spread;
      spreadDirection.z += (Math.random() - 0.5) * spread;
      spreadDirection.normalize();

      // Cria projétil individual
      const projectile = this.shoot(type, position, spreadDirection, {
        ...options,
        isPellet: true,
        pelletIndex: i
      });
      
      projectiles.push(projectile);
    }

    return projectiles;
  }

  /**
   * Atualiza todos os projéteis
   * @param {number} delta - Tempo decorrido
   * @param {Object} collisionTargets - Alvos para colisão
   */
  update(delta, collisionTargets = {}) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      
      if (!this.updateProjectile(projectile, delta, collisionTargets)) {
        // Remove projétil inativo
        this.destroyProjectile(i);
      }
    }
  }

  /**
   * Atualiza um projétil específico
   * @param {Object} projectileData - Dados do projétil
   * @param {number} delta - Tempo decorrido
   * @param {Object} collisionTargets - Alvos para colisão
   * @returns {boolean} True se o projétil continua ativo
   */
  updateProjectile(projectileData, delta, collisionTargets) {
    const { mesh, config, velocity } = projectileData;
    
    if (!mesh.userData.active) return false;

    // Atualiza tempo de vida
    mesh.userData.timeAlive += delta;
    
    // Verifica tempo limite
    if (mesh.userData.timeAlive > config.lifetime) {
      return false;
    }

    // Move o projétil
    const movement = velocity.clone().multiplyScalar(delta);
    mesh.position.add(movement);
    mesh.userData.traveledDistance += movement.length();

    // Verifica distância máxima
    if (mesh.userData.traveledDistance > config.maxDistance) {
      return false;
    }

    // Atualiza efeitos visuais
    this.updateProjectileEffects(projectileData, delta);

    // Verifica colisões
    const hit = this.checkCollisions(projectileData, collisionTargets);
    if (hit) {
      this.handleHit(projectileData, hit);
      return false;
    }

    return true;
  }

  /**
   * Atualiza efeitos visuais do projétil
   * @param {Object} projectileData - Dados do projétil
   * @param {number} delta - Tempo decorrido
   */
  updateProjectileEffects(projectileData, delta) {
    const { mesh, config } = projectileData;

    // Rotação
    if (config.rotationSpeed) {
      mesh.rotation.x += config.rotationSpeed.x * delta;
      mesh.rotation.y += config.rotationSpeed.y * delta;
    }

    // Efeito de pulso no brilho
    if (config.pulseEffect) {
      const glowMesh = mesh.children.find(child => child.userData.isGlow);
      if (glowMesh) {
        const pulse = Math.sin(Date.now() * 0.01) * 0.1 + (config.glowOpacity || 0.4);
        glowMesh.material.opacity = pulse;
      }
    }
  }

  /**
   * Verifica colisões do projétil
   * @param {Object} projectileData - Dados do projétil
   * @param {Object} collisionTargets - Alvos para colisão
   * @returns {Object|null} Dados da colisão ou null
   */
  checkCollisions(projectileData, collisionTargets = {}) {
    const { mesh, config, direction } = projectileData;
    
    // Configuração do raycaster
    this.raycaster.set(mesh.position, direction);
    this.raycaster.far = config.speed * 0.016 + this.options.collisionDistance; // Assume ~60fps

    // Verifica colisão com jogador (se projétil de inimigo)
    if (config.category === 'enemy' && collisionTargets.player) {
      const distanceToPlayer = mesh.position.distanceTo(collisionTargets.player.position);
      const playerRadius = collisionTargets.player.radius || 1.0;
      
      if (distanceToPlayer <= config.radius + playerRadius) {
        return {
          type: 'player',
          object: collisionTargets.player,
          point: mesh.position.clone(),
          distance: distanceToPlayer
        };
      }
    }

    // Verifica colisão com inimigos (se projétil do jogador)
    if (config.category === 'player' && collisionTargets.enemies) {
      for (const enemy of collisionTargets.enemies) {
        if (!enemy.isAlive || !enemy.mesh) continue;
        
        const intersects = this.raycaster.intersectObject(enemy.mesh, true);
        if (intersects.length > 0) {
          return {
            type: 'enemy',
            object: enemy,
            point: intersects[0].point,
            distance: intersects[0].distance
          };
        }
      }
    }

    // Verifica colisão com ambiente
    if (collisionTargets.environment) {
      const validObjects = collisionTargets.environment.filter(obj => {
        return obj !== mesh && 
               obj.type !== 'Sprite' && 
               !obj.userData.isProjectile;
      });

      const intersects = this.raycaster.intersectObjects(validObjects, true);
      if (intersects.length > 0) {
        return {
          type: 'environment',
          object: intersects[0].object,
          point: intersects[0].point,
          distance: intersects[0].distance
        };
      }
    }

    return null;
  }

  /**
   * Manipula evento de colisão
   * @param {Object} projectileData - Dados do projétil
   * @param {Object} hitData - Dados da colisão
   */
  handleHit(projectileData, hitData) {
    const { config } = projectileData;

    // Aplica dano
    if (hitData.type === 'player' && typeof window.playerTakeDamage === 'function') {
      window.playerTakeDamage(config.damage);
    } else if (hitData.type === 'enemy' && hitData.object.takeDamage) {
      hitData.object.takeDamage(config.damage);
    }

    // Cria efeito de impacto
    this.createHitEffect(hitData.point, config);

    // Dispara evento
    this.emit('projectile:hit', {
      projectile: projectileData,
      hit: hitData
    });

    if (this.options.enableDebug) {
      console.log(`[ProjectileSystem] Projétil ${config.id} atingiu ${hitData.type}`);
    }
  }

  /**
   * Cria efeito visual de impacto
   * @param {THREE.Vector3} position - Posição do impacto
   * @param {Object} config - Configuração do projétil
   */
  createHitEffect(position, config) {
    // TODO: Implementar sistema de partículas para efeitos de impacto
    // Por enquanto, apenas um placeholder
    if (this.options.enableDebug) {
      console.log(`[ProjectileSystem] Efeito de impacto em`, position);
    }
  }

  /**
   * Destrói um projétil
   * @param {number} index - Índice do projétil na lista
   */
  destroyProjectile(index) {
    if (index < 0 || index >= this.projectiles.length) return;

    const projectileData = this.projectiles[index];
    
    // Remove da cena
    if (projectileData.mesh.parent) {
      this.scene.remove(projectileData.mesh);
    }

    // Libera para o pool
    this.pool.release(projectileData.mesh);

    // Remove da lista
    this.projectiles.splice(index, 1);

    // Dispara evento
    this.emit('projectile:destroyed', projectileData);
  }

  /**
   * Remove todos os projéteis
   */
  clear() {
    while (this.projectiles.length > 0) {
      this.destroyProjectile(0);
    }

    if (this.options.enableDebug) {
      console.log('[ProjectileSystem] Todos os projéteis removidos');
    }
  }

  /**
   * Gera ID único para projétil
   * @returns {string} ID único
   */
  generateId() {
    return `projectile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sistema de eventos
   * @param {string} event - Nome do evento
   * @param {Function} callback - Função callback
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Remove listener de evento
   * @param {string} event - Nome do evento
   * @param {Function} callback - Função callback
   */
  off(event, callback) {
    if (!this.eventListeners.has(event)) return;
    
    const listeners = this.eventListeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Dispara evento
   * @param {string} event - Nome do evento
   * @param {*} data - Dados do evento
   */
  emit(event, data) {
    if (!this.eventListeners.has(event)) return;
    
    this.eventListeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[ProjectileSystem] Erro no listener do evento ${event}:`, error);
      }
    });
  }

  /**
   * Obtém estatísticas do sistema
   * @returns {Object} Estatísticas
   */
  getStats() {
    return {
      activeProjectiles: this.projectiles.length,
      poolStats: this.pool.getStats(),
      events: Array.from(this.eventListeners.keys())
    };
  }

  /**
   * Destrói o sistema e libera recursos
   */
  dispose() {
    this.clear();
    this.pool.dispose();
    this.eventListeners.clear();
    this.raycaster = null;
    this.scene = null;

    console.log('[ProjectileSystem] Sistema de projéteis destruído');
  }
}