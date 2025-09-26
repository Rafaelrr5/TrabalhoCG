/**
 * Ponto de entrada para o sistema unificado de projéteis
 * Exporta todas as classes e utilitários necessários
 */

// Classes principais
export { ProjectileSystem } from './ProjectileSystem.js';
export { ProjectilePool } from './ProjectilePool.js';
export { ProjectileRenderer } from './ProjectileRenderer.js';

// Configurações e tipos
export { 
  PROJECTILE_TYPES, 
  getProjectileConfig, 
  getProjectilesByCategory,
  isValidProjectileType 
} from './ProjectileTypes.js';

/**
 * Cria uma instância completa do sistema de projéteis
 * @param {THREE.Scene} scene - Cena do Three.js
 * @param {Object} options - Opções de configuração
 * @returns {Object} Instância do sistema completo
 */
export function createProjectileSystem(scene, options = {}) {
  const system = new ProjectileSystem(scene, {
    enableDebug: options.enableDebug || false,
    poolSize: options.poolSize || 100,
    collisionDistance: options.collisionDistance || 0.5,
    ...options
  });

  const renderer = new ProjectileRenderer(scene, {
    enableTrails: options.enableTrails || false,
    trailLength: options.trailLength || 10,
    enableInstancing: options.enableInstancing || false,
    ...options
  });

  return {
    system,
    renderer,
    
    /**
     * Dispara um projétil
     * @param {string} type - Tipo do projétil
     * @param {THREE.Vector3} position - Posição inicial
     * @param {THREE.Vector3} direction - Direção normalizada
     * @param {Object} options - Opções adicionais
     */
    shoot(type, position, direction, options = {}) {
      return system.shoot(type, position, direction, options);
    },

    /**
     * Atualiza o sistema
     * @param {number} delta - Tempo decorrido
     * @param {Object} collisionTargets - Alvos para colisão
     */
    update(delta, collisionTargets = {}) {
      system.update(delta, collisionTargets);
      
      // Atualiza efeitos de renderização
      system.projectiles.forEach(projectile => {
        renderer.renderProjectileEffects(projectile, delta);
      });
    },

    /**
     * Remove todos os projéteis
     */
    clear() {
      system.clear();
      renderer.clear();
    },

    /**
     * Destrói o sistema
     */
    dispose() {
      system.dispose();
      renderer.dispose();
    },

    /**
     * Obtém estatísticas
     */
    getStats() {
      return {
        ...system.getStats(),
        renderer: {
          trails: renderer.trailSystem.size,
          instancedMeshes: renderer.instancedMeshes.size
        }
      };
    },

    /**
     * Registra listener de evento
     */
    on(event, callback) {
      return system.on(event, callback);
    },

    /**
     * Remove listener de evento
     */
    off(event, callback) {
      return system.off(event, callback);
    }
  };
}

/**
 * Utilitários para migração de sistemas antigos
 */
export const LegacyUtils = {
  /**
   * Converte configuração de BaseWeapon para o novo sistema
   * @param {Object} weaponConfig - Configuração antiga da arma
   * @returns {string} Tipo de projétil correspondente
   */
  mapWeaponToProjectileType(weaponConfig) {
    if (weaponConfig.PROJECTILE_COLOR === 0xffff00) return 'PISTOL';
    if (weaponConfig.PROJECTILE_COLOR === 0xffaa00) return 'SHOTGUN';
    if (weaponConfig.PROJECTILE_COLOR === 0xffffff) return 'CHAINGUN';
    return 'PISTOL'; // Default
  },

  /**
   * Converte projétil antigo do Cacodemon
   * @param {Object} oldProjectile - Projétil antigo
   * @returns {Object} Configuração para o novo sistema
   */
  convertCacodeemonProjectile(oldProjectile) {
    return {
      type: 'CACODEMON',
      position: oldProjectile.startPosition,
      direction: oldProjectile.direction,
      options: {
        owner: 'cacodemon'
      }
    };
  },

  /**
   * Converte projétil antigo do Zombieman
   * @param {Object} oldProjectile - Projétil antigo
   * @returns {Object} Configuração para o novo sistema
   */
  convertZombiemanProjectile(oldProjectile) {
    return {
      type: 'ZOMBIEMAN',
      position: oldProjectile.startPosition,
      direction: oldProjectile.direction,
      options: {
        owner: 'zombieman'
      }
    };
  }
};

/**
 * Função de inicialização rápida
 * @param {THREE.Scene} scene - Cena do Three.js
 * @param {Object} gameConfig - Configuração do jogo
 * @returns {Object} Sistema de projéteis configurado
 */
export function initProjectileSystem(scene, gameConfig = {}) {
  console.log('[ProjectileSystem] Inicializando sistema unificado de projéteis...');

  const projectileSystem = createProjectileSystem(scene, {
    enableDebug: gameConfig.debug || false,
    enableTrails: gameConfig.enableTrails || false,
    poolSize: gameConfig.maxProjectiles || 100,
    ...gameConfig.projectiles
  });

  // Registra eventos de debug se habilitado
  if (gameConfig.debug) {
    projectileSystem.on('projectile:created', (data) => {
      console.log(`[Debug] Projétil criado:`, data.config.id);
    });

    projectileSystem.on('projectile:hit', (data) => {
      console.log(`[Debug] Projétil atingiu:`, data.hit.type);
    });

    projectileSystem.on('projectile:destroyed', (data) => {
      console.log(`[Debug] Projétil destruído:`, data.config.id);
    });
  }

  console.log('[ProjectileSystem] Sistema inicializado com sucesso!');
  return projectileSystem;
}

/**
 * Versão do sistema de projéteis
 */
export const VERSION = '1.0.0';