import * as THREE from '../../../../../build/three.module.js';
import { Enemy } from '../base/enemies.js';
import { ZombiemanProjectile } from '../systems/zombiemanProjectile.js';
import { SpriteMixer } from '../../../../../libs/sprites/SpriteMixer.js';

export class Zombieman extends Enemy {
  constructor(position = [0, 0, 0], config = {}) {
    const defaultConfig = {
      maxHealth: 30,
      damage: 2,
      attackRange: 25,
      attackCooldown: 1.5,
      speed: 2.0,
      radius: 0.5,
      isFlying: false, // Zombieman anda no chão
      ...config
    };

    super(position, defaultConfig);
    
    this.activeProjectiles = [];
    this.lastAttackTime = 0;
    
    this.spriteMixer = null;
    this.actionSprite = null;
    this.actions = {};

    this.loadSprite();
    this.createHitbox();
    
    this.attack = this.attack.bind(this);
  }

  loadSprite() {
    const loader = new THREE.TextureLoader();
    const texturePath = '../../../../../assets/textures/sprites/zombieman.png';
    loader.load(texturePath, (texture) => {
      this.spriteMixer = new SpriteMixer();
      
      this.actionSprite = this.spriteMixer.ActionSprite(texture, 8, 8);
      this.actionSprite.position.y = 0.9;
      this.mesh.add(this.actionSprite);

      this.actions.idle = this.spriteMixer.Action(this.actionSprite, 500, 0, 0, 0, 0);
      this.actions.walk = this.spriteMixer.Action(this.actionSprite, 100, 0, 0, 3, 0);
      this.actions.attack = this.spriteMixer.Action(this.actionSprite, 200, 4, 0, 5, 0);
      
      // NOVO: Adiciona a animação de morte (die)
      // Usando os frames 6 e 7, como em SpritesExample2.js
      this.actions.die = this.spriteMixer.Action(this.actionSprite, 200, 6, 0, 7, 0);
      this.actions.die.loop = false; // Garante que a animação não se repita

      this.actions.idle.play();
    });
  }
  
  createHitbox() {
    const hitboxGeometry = new THREE.CylinderGeometry(this.config.radius, this.config.radius, 2, 8);
    const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const hitboxMesh = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    hitboxMesh.position.y = 1;
    this.mesh.add(hitboxMesh);
  }

  // NOVO: Sobrescreve o método die() para usar a animação da sprite
  die() {
    if (this.isDying) return;

    this.isDying = true;
    this.isAlive = false;
    
    if (this.ai) {
      this.ai.stop(); // Para a IA
    }
    
    // Para todas as outras animações e inicia a de morte
    if (this.actions.die) {
        Object.values(this.actions).forEach(action => action.stop());
        this.actions.die.play();
    }
    
    this.healthBar.dispose(); // Remove a barra de vida

    // Aqui dá pra adicionar lógica para remover o inimigo da cena
    // após a animação terminar, se necessário.
    // A duração seria (7 - 6 + 1) frames * 200ms/frame = 400ms.
    // setTimeout(() => {
    //   if (this.mesh.parent) {
    //     this.mesh.parent.remove(this.mesh);
    //   }
    // }, 400);
  }
  
  attack(targetPosition) {
    if (!this.isAlive || this.isDying) return;
    const now = Date.now() / 1000;
    if (now - this.lastAttackTime < this.config.attackCooldown) return;
    
    this.fireProjectile(targetPosition);
    
    if (this.audio) {
      this.audio.playAttackSound();
    }
    
    this.lastAttackTime = now;

    if (this.ai) {
      this.ai.changeState('DISENGAGE');
    }
  }

  fireProjectile(targetPosition) {
    const direction = new THREE.Vector3().subVectors(targetPosition, this.mesh.position).normalize();
    const projectile = new ZombiemanProjectile(this.mesh.position, direction);
    
    this.activeProjectiles.push(projectile);
    
    if (this.mesh.parent) {
      this.mesh.parent.add(projectile.mesh);
    }
  }
  
  update(delta, camera, targetPosition, collidableObjects, otherEnemies) {
    // MODIFICADO: Atualiza o mixer durante a animação de morte e para a execução
    if (this.isDying) {
        if (this.spriteMixer) {
            this.spriteMixer.update(delta);
        }
        if (this.actionSprite) {
           this.actionSprite.quaternion.copy(camera.quaternion);
        }
        return;
    }
    
    if (!this.isAlive) return;

    this.ai.update(delta, targetPosition, collidableObjects);

    this.audio.updateProximity(camera?.position);
    this.healthBar.update(camera);
    this.collision.updateBoundingBox();
    
    if (this.spriteMixer) {
        this.spriteMixer.update(delta);
    }
    
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
        const projectile = this.activeProjectiles[i];
        projectile.update(delta);
        
        if(projectile.checkCollision({position: targetPosition, radius: 1.0})) {
            this.emit('dealDamage', { damage: projectile.config.damage });
            projectile.destroy();
            this.activeProjectiles.splice(i, 1);
        } else if (!projectile.isActive) {
            this.activeProjectiles.splice(i, 1);
        }
    }
    
    if (this.actionSprite) {
        this.actionSprite.quaternion.copy(camera.quaternion);
    }
  }
}