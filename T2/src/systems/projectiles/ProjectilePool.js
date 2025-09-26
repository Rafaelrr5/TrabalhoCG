import * as THREE from '../../../../build/three.module.js';
import { getProjectileConfig } from './ProjectileTypes.js';

/**
 * Pool de objetos para reutilização eficiente de projéteis
 */
export class ProjectilePool {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.available = [];
    this.inUse = new Set();
    this.geometries = new Map(); // Cache de geometrias por tipo
    this.materials = new Map();  // Cache de materiais por tipo
  }

  /**
   * Obtém uma instância de projétil do pool
   * @param {string} type - Tipo do projétil
   * @returns {THREE.Mesh} Mesh do projétil
   */
  acquire(type) {
    const config = getProjectileConfig(type);
    
    // Tenta reutilizar um projétil existente
    const existing = this.available.find(p => p.userData.type === config.id);
    if (existing) {
      this.available = this.available.filter(p => p !== existing);
      this.inUse.add(existing);
      this.resetProjectile(existing, config);
      return existing;
    }

    // Se o pool está cheio, força a liberação do mais antigo
    if (this.inUse.size >= this.maxSize) {
      const oldest = this.inUse.values().next().value;
      this.release(oldest);
    }

    // Cria um novo projétil
    const projectile = this.createProjectile(config);
    this.inUse.add(projectile);
    return projectile;
  }

  /**
   * Libera um projétil de volta para o pool
   * @param {THREE.Mesh} projectile - Projétil a ser liberado
   */
  release(projectile) {
    if (!this.inUse.has(projectile)) return;
    
    this.inUse.delete(projectile);
    
    // Remove da cena se estiver presente
    if (projectile.parent) {
      projectile.parent.remove(projectile);
    }

    // Reset do estado
    projectile.position.set(0, 0, 0);
    projectile.rotation.set(0, 0, 0);
    projectile.visible = false;
    projectile.userData.active = false;
    
    // Adiciona de volta ao pool se há espaço
    if (this.available.length < this.maxSize * 0.5) { // Mantém no máximo 50% como disponível
      this.available.push(projectile);
    } else {
      // Descarta definitivamente
      this.disposeProjectile(projectile);
    }
  }

  /**
   * Cria um novo projétil
   * @param {Object} config - Configuração do projétil
   * @returns {THREE.Mesh} Novo projétil
   */
  createProjectile(config) {
    const geometry = this.getGeometry(config);
    const material = this.getMaterial(config);
    
    const projectile = new THREE.Mesh(geometry, material);
    projectile.visible = config.visible;
    
    // Dados do projétil
    projectile.userData = {
      type: config.id,
      active: false,
      timeAlive: 0,
      traveledDistance: 0,
      config: config
    };

    // Adiciona efeitos especiais se necessário
    if (config.glowRadius) {
      this.addGlowEffect(projectile, config);
    }

    return projectile;
  }

  /**
   * Obtém geometria cached ou cria nova
   * @param {Object} config - Configuração do projétil
   * @returns {THREE.BufferGeometry} Geometria
   */
  getGeometry(config) {
    const key = `${config.id}_${config.radius}`;
    
    if (!this.geometries.has(key)) {
      const geometry = new THREE.SphereGeometry(config.radius, 12, 12);
      this.geometries.set(key, geometry);
    }
    
    return this.geometries.get(key);
  }

  /**
   * Obtém material cached ou cria novo
   * @param {Object} config - Configuração do projétil
   * @returns {THREE.Material} Material
   */
  getMaterial(config) {
    const key = `${config.id}_${config.color}`;
    
    if (!this.materials.has(key)) {
      const material = new THREE.MeshLambertMaterial({
        color: config.color,
        transparent: !config.visible,
        opacity: config.visible ? 1.0 : 0.0,
        emissive: config.emissive || config.color,
        emissiveIntensity: config.emissiveIntensity || 0
      });
      this.materials.set(key, material);
    }
    
    return this.materials.get(key);
  }

  /**
   * Adiciona efeito de brilho ao projétil
   * @param {THREE.Mesh} projectile - Projétil
   * @param {Object} config - Configuração
   */
  addGlowEffect(projectile, config) {
    const glowGeometry = new THREE.SphereGeometry(config.radius * config.glowRadius, 12, 12);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: config.glowOpacity || 0.4,
      side: THREE.BackSide
    });

    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.userData.isGlow = true;
    projectile.add(glowMesh);
  }

  /**
   * Reseta um projétil para reutilização
   * @param {THREE.Mesh} projectile - Projétil
   * @param {Object} config - Nova configuração
   */
  resetProjectile(projectile, config) {
    projectile.userData.active = true;
    projectile.userData.timeAlive = 0;
    projectile.userData.traveledDistance = 0;
    projectile.userData.config = config;
    projectile.visible = config.visible;
    projectile.rotation.set(0, 0, 0);
  }

  /**
   * Descarta um projétil definitivamente
   * @param {THREE.Mesh} projectile - Projétil
   */
  disposeProjectile(projectile) {
    // Remove filhos (como efeitos de brilho)
    projectile.children.forEach(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    
    projectile.clear();
    
    // Nota: Não disposamos geometry e material aqui porque são compartilhados
  }

  /**
   * Limpa todo o pool
   */
  dispose() {
    // Libera todos os projéteis em uso
    this.inUse.forEach(projectile => {
      this.disposeProjectile(projectile);
    });
    
    // Libera todos os projéteis disponíveis
    this.available.forEach(projectile => {
      this.disposeProjectile(projectile);
    });

    // Libera geometrias e materiais cached
    this.geometries.forEach(geometry => geometry.dispose());
    this.materials.forEach(material => material.dispose());

    // Limpa os maps
    this.geometries.clear();
    this.materials.clear();
    this.available.length = 0;
    this.inUse.clear();
  }

  /**
   * Estatísticas do pool
   * @returns {Object} Estatísticas
   */
  getStats() {
    return {
      inUse: this.inUse.size,
      available: this.available.length,
      totalCreated: this.inUse.size + this.available.length,
      maxSize: this.maxSize,
      geometriesCached: this.geometries.size,
      materialsCached: this.materials.size
    };
  }
}