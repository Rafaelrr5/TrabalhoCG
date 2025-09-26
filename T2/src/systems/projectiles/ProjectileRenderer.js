import * as THREE from '../../../../build/three.module.js';
import { ProjectileSystem } from './ProjectileSystem.js';

/**
 * Renderizador otimizado para projéteis
 * Gerencia renderização eficiente de múltiplos projéteis
 */
export class ProjectileRenderer {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = {
      enableTrails: options.enableTrails || false,
      trailLength: options.trailLength || 10,
      enableInstancing: options.enableInstancing || false,
      ...options
    };

    // Sistema de trails
    this.trailSystem = new Map(); // projectileId -> trail data
    
    // Sistema de instancing (para muitos projéteis do mesmo tipo)
    this.instancedMeshes = new Map(); // type -> InstancedMesh
    
    // Materiais compartilhados
    this.sharedMaterials = new Map();
  }

  /**
   * Renderiza efeitos especiais de um projétil
   * @param {Object} projectileData - Dados do projétil
   * @param {number} delta - Tempo decorrido
   */
  renderProjectileEffects(projectileData, delta) {
    const { config, id } = projectileData;

    // Renderiza trail se habilitado
    if (this.options.enableTrails && config.trailEffect) {
      this.updateTrail(projectileData, delta);
    }

    // Outros efeitos especiais podem ser adicionados aqui
    // Como partículas, distorção, etc.
  }

  /**
   * Atualiza trail de um projétil
   * @param {Object} projectileData - Dados do projétil
   * @param {number} delta - Tempo decorrido
   */
  updateTrail(projectileData, delta) {
    const { mesh, id, config } = projectileData;
    
    if (!this.trailSystem.has(id)) {
      this.createTrail(projectileData);
    }

    const trailData = this.trailSystem.get(id);
    const currentPosition = mesh.position.clone();

    // Adiciona posição atual ao trail
    trailData.positions.unshift(currentPosition);

    // Remove posições antigas
    if (trailData.positions.length > this.options.trailLength) {
      trailData.positions = trailData.positions.slice(0, this.options.trailLength);
    }

    // Atualiza geometria do trail
    this.updateTrailGeometry(trailData, config);
  }

  /**
   * Cria trail para um projétil
   * @param {Object} projectileData - Dados do projétil
   */
  createTrail(projectileData) {
    const { id, config } = projectileData;
    
    // Cria geometria do trail
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.6,
      linewidth: 2
    });

    const line = new THREE.Line(geometry, material);
    this.scene.add(line);

    // Armazena dados do trail
    this.trailSystem.set(id, {
      line: line,
      geometry: geometry,
      material: material,
      positions: []
    });
  }

  /**
   * Atualiza geometria do trail
   * @param {Object} trailData - Dados do trail
   * @param {Object} config - Configuração do projétil
   */
  updateTrailGeometry(trailData, config) {
    const { positions, geometry } = trailData;
    
    if (positions.length < 2) return;

    // Converte posições para array de números
    const vertices = [];
    positions.forEach(pos => {
      vertices.push(pos.x, pos.y, pos.z);
    });

    // Atualiza geometria
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }

  /**
   * Remove trail de um projétil
   * @param {string} projectileId - ID do projétil
   */
  removeTrail(projectileId) {
    if (!this.trailSystem.has(projectileId)) return;

    const trailData = this.trailSystem.get(projectileId);
    
    // Remove da cena
    this.scene.remove(trailData.line);
    
    // Libera recursos
    trailData.geometry.dispose();
    trailData.material.dispose();
    
    // Remove do sistema
    this.trailSystem.delete(projectileId);
  }

  /**
   * Cria efeito de impacto
   * @param {THREE.Vector3} position - Posição do impacto
   * @param {Object} config - Configuração do projétil
   * @param {string} surfaceType - Tipo da superfície atingida
   */
  createImpactEffect(position, config, surfaceType = 'default') {
    // Sistema básico de partículas para impacto
    const particleCount = config.category === 'enemy' ? 15 : 8;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      const particle = this.createImpactParticle(position, config, surfaceType);
      particles.push(particle);
      this.scene.add(particle.mesh);
    }

    // Anima e remove partículas após um tempo
    this.animateImpactParticles(particles, config);
  }

  /**
   * Cria uma partícula de impacto
   * @param {THREE.Vector3} position - Posição do impacto
   * @param {Object} config - Configuração do projétil
   * @param {string} surfaceType - Tipo da superfície
   * @returns {Object} Dados da partícula
   */
  createImpactParticle(position, config, surfaceType) {
    const size = config.radius * 0.3;
    const geometry = new THREE.SphereGeometry(size, 6, 6);
    
    // Cor baseada no tipo de superfície e projétil
    let color = config.color;
    if (surfaceType === 'metal') {
      color = 0xffffff; // Faíscas brancas
    } else if (surfaceType === 'flesh') {
      color = 0x660000; // Sangue
    }

    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);

    // Velocidade aleatória
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      Math.random() * 5 + 2,
      (Math.random() - 0.5) * 10
    );

    return {
      mesh: mesh,
      velocity: velocity,
      life: 0,
      maxLife: 0.5 + Math.random() * 0.3
    };
  }

  /**
   * Anima partículas de impacto
   * @param {Array} particles - Array de partículas
   * @param {Object} config - Configuração do projétil
   */
  animateImpactParticles(particles, config) {
    const animate = () => {
      const delta = 0.016; // Assume 60fps
      let aliveCount = 0;

      particles.forEach(particle => {
        if (particle.life >= particle.maxLife) return;

        particle.life += delta;
        const progress = particle.life / particle.maxLife;

        // Move partícula
        particle.mesh.position.add(
          particle.velocity.clone().multiplyScalar(delta)
        );

        // Aplica gravidade
        particle.velocity.y -= 20 * delta;

        // Fade out
        particle.mesh.material.opacity = 1 - progress;

        // Scale down
        const scale = 1 - progress * 0.5;
        particle.mesh.scale.setScalar(scale);

        if (particle.life < particle.maxLife) {
          aliveCount++;
        } else {
          // Remove partícula
          this.scene.remove(particle.mesh);
          particle.mesh.geometry.dispose();
          particle.mesh.material.dispose();
        }
      });

      // Continue animando se há partículas vivas
      if (aliveCount > 0) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  /**
   * Obtém material compartilhado
   * @param {string} type - Tipo do material
   * @param {Object} config - Configuração
   * @returns {THREE.Material} Material
   */
  getSharedMaterial(type, config) {
    const key = `${type}_${config.color}`;
    
    if (!this.sharedMaterials.has(key)) {
      const material = new THREE.MeshLambertMaterial({
        color: config.color,
        transparent: !config.visible,
        opacity: config.visible ? 1.0 : 0.0,
        emissive: config.emissive || config.color,
        emissiveIntensity: config.emissiveIntensity || 0
      });
      this.sharedMaterials.set(key, material);
    }

    return this.sharedMaterials.get(key);
  }

  /**
   * Limpa todos os efeitos
   */
  clear() {
    // Remove todos os trails
    this.trailSystem.forEach((trailData, id) => {
      this.removeTrail(id);
    });

    // Remove meshes instanciados
    this.instancedMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.dispose();
    });
    this.instancedMeshes.clear();
  }

  /**
   * Destrói o renderizador
   */
  dispose() {
    this.clear();
    
    // Libera materiais compartilhados
    this.sharedMaterials.forEach(material => material.dispose());
    this.sharedMaterials.clear();

    console.log('[ProjectileRenderer] Renderizador de projéteis destruído');
  }
}