/**
 * Configurações centralizadas para todos os tipos de projéteis
 */

export const PROJECTILE_TYPES = {
  // Projéteis do jogador
  PISTOL: {
    id: 'pistol',
    speed: 50,
    damage: 10,
    radius: 0.1,
    color: 0xffff00,
    lifetime: 2.0,
    maxDistance: 100,
    visible: false, // Projéteis de armas são invisíveis (hitscan simulado)
    emissive: 0xffff00,
    emissiveIntensity: 0.2,
    category: 'player'
  },
  
  SHOTGUN: {
    id: 'shotgun',
    speed: 45,
    damage: 8, // Por pellet
    radius: 0.08,
    color: 0xffaa00,
    lifetime: 1.5,
    maxDistance: 80,
    visible: false,
    pellets: 7, // Número de projéteis por disparo
    spread: 0.2, // Ângulo de dispersão
    emissive: 0xffaa00,
    emissiveIntensity: 0.2,
    category: 'player'
  },
  
  CHAINGUN: {
    id: 'chaingun',
    speed: 60,
    damage: 12,
    radius: 0.12,
    color: 0xffffff,
    lifetime: 2.5,
    maxDistance: 120,
    visible: false,
    emissive: 0xffffff,
    emissiveIntensity: 0.3,
    category: 'player'
  },
  
  // Projéteis dos inimigos
  CACODEMON: {
    id: 'cacodemon',
    speed: 15,
    damage: 20,
    radius: 0.4,
    color: 0xff6600,
    lifetime: 5.0,
    maxDistance: 100,
    visible: true, // Projéteis de inimigos são visíveis
    emissive: 0xff6600,
    emissiveIntensity: 0.5,
    glowRadius: 1.8,
    glowOpacity: 0.4,
    rotationSpeed: { x: 5, y: 3 },
    pulseEffect: true,
    category: 'enemy'
  },
  
  ZOMBIEMAN: {
    id: 'zombieman',
    speed: 30,
    damage: 5,
    radius: 0.2,
    color: 0xff0000,
    lifetime: 3.0,
    maxDistance: 100,
    visible: false, // Hitscan, mas pode ser tornado visível para debug
    emissive: 0xff0000,
    emissiveIntensity: 0.3,
    category: 'enemy'
  },
  
  LOST_SOUL: {
    id: 'lostsoul',
    speed: 25,
    damage: 15,
    radius: 0.3,
    color: 0xff9900,
    lifetime: 4.0,
    maxDistance: 80,
    visible: true,
    emissive: 0xff9900,
    emissiveIntensity: 0.4,
    trailEffect: true,
    category: 'enemy'
  }
};

/**
 * Retorna a configuração de um tipo de projétil
 * @param {string} type - Tipo do projétil
 * @returns {Object} Configuração do projétil
 */
export function getProjectileConfig(type) {
  const config = PROJECTILE_TYPES[type.toUpperCase()];
  if (!config) {
    console.warn(`[ProjectileTypes] Tipo de projétil desconhecido: ${type}`);
    return PROJECTILE_TYPES.PISTOL; // Fallback padrão
  }
  return { ...config }; // Retorna uma cópia para evitar mutações
}

/**
 * Retorna todos os tipos de projéteis de uma categoria
 * @param {string} category - Categoria ('player' ou 'enemy')
 * @returns {Array} Array com as configurações dos projéteis
 */
export function getProjectilesByCategory(category) {
  return Object.values(PROJECTILE_TYPES).filter(config => config.category === category);
}

/**
 * Valida se um tipo de projétil existe
 * @param {string} type - Tipo do projétil
 * @returns {boolean} True se o tipo existe
 */
export function isValidProjectileType(type) {
  return PROJECTILE_TYPES.hasOwnProperty(type.toUpperCase());
}