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
      isFlying: false,
      ...config
    };

    super(position, defaultConfig);
    
    this.activeProjectiles = [];
    this.lastAttackTime = 0;
    
    this.spriteMixer = null;
    this.actionSprite = null;
    this.actions = {};
    this.lastRunning = null;
    this.isMoving = false;

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
      this.actionSprite.position.y = 2.0;
      this.mesh.add(this.actionSprite);

      // Todas as animações como no exemplo
      this.actions.runDown = this.spriteMixer.Action(this.actionSprite, 100, 0, 0, 3, 0);
      this.actions.runLD = this.spriteMixer.Action(this.actionSprite, 100, 0, 1, 3, 1);
      this.actions.runLeft = this.spriteMixer.Action(this.actionSprite, 100, 0, 2, 3, 2);
      this.actions.runLU = this.spriteMixer.Action(this.actionSprite, 100, 0, 3, 3, 3);
      this.actions.runUp = this.spriteMixer.Action(this.actionSprite, 100, 0, 4, 3, 4);
      this.actions.runRU = this.spriteMixer.Action(this.actionSprite, 100, 0, 5, 3, 5);
      this.actions.runRight = this.spriteMixer.Action(this.actionSprite, 100, 0, 6, 3, 6);
      this.actions.runRD = this.spriteMixer.Action(this.actionSprite, 100, 0, 7, 3, 7);

      this.actions.Die = this.spriteMixer.Action(this.actionSprite, 200, 6, 0, 7, 0);
      this.actions.Die.loop = false;

      this.actions.ShootingDown = this.spriteMixer.Action(this.actionSprite, 100, 4, 0, 5, 0);
      this.actions.ShootingLD = this.spriteMixer.Action(this.actionSprite, 100, 4, 1, 5, 1);
      this.actions.ShootingLeft = this.spriteMixer.Action(this.actionSprite, 100, 4, 2, 5, 2);
      this.actions.ShootingLU = this.spriteMixer.Action(this.actionSprite, 100, 4, 3, 5, 3);
      this.actions.ShootingUp = this.spriteMixer.Action(this.actionSprite, 100, 4, 4, 5, 4);
      this.actions.ShootingRU = this.spriteMixer.Action(this.actionSprite, 100, 4, 5, 5, 5);
      this.actions.ShootingRight = this.spriteMixer.Action(this.actionSprite, 100, 4, 6, 5, 6);
      this.actions.ShootingRD = this.spriteMixer.Action(this.actionSprite, 100, 4, 7, 5, 7);

      this.actionSprite.scale.set(4,4,4);

      // Inicia com idle
      this.setIdleFrame();
    });
  }
  
  createHitbox() {
    const hitboxGeometry = new THREE.CylinderGeometry(2, 2, 4, 8);
    const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const hitboxMesh = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    hitboxMesh.position.y = 2;
    this.mesh.add(hitboxMesh);
  }

  setIdleFrame() {
    if (!this.lastRunning) return;
    
    const idleFrames = {
      'down': [4, 0],
      'ld': [4, 1],
      'left': [4, 2],
      'lu': [4, 3],
      'up': [4, 4],
      'ru': [4, 5],
      'right': [4, 6],
      'rd': [4, 7]
    };
    
    if (idleFrames[this.lastRunning]) {
      this.actionSprite.setFrame(...idleFrames[this.lastRunning]);
    }
  }


   die() {
    if (this.isDying) return;

    this.isDying = true;
    this.isAlive = false;
    
    if (this.ai) {
      this.ai.stop();
    }
    
    if (this.actions.Die) {
      Object.values(this.actions).forEach(action => action.stop());
      this.actions.Die.playOnce(true);
    }
    
    this.healthBar.dispose();

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
    
    // Para a movimentação atual antes de atirar
    this.velocity.set(0, 0, 0);
    this.isMoving = false;
    if (this.ai) {
      Object.values(this.actions).forEach(action => action.stop());
    }

    // Determina a direção do ataque baseado na posição do jogador
    const direction = this.getAttackDirection(targetPosition);
    const attackAction = this.getAttackAction(direction);
    
    if (attackAction) {
      attackAction.playLoop();
    }
    
    this.fireProjectile(targetPosition);
    
    if (this.audio) {
      this.audio.playAttackSound();
    }
    
    this.lastAttackTime = now;

    // --- NOVA LÓGICA DE FUGA ---
    // Define uma direção de movimento aleatória após atirar.
    const escapeDirection = new THREE.Vector3(
      Math.random() - 0.5,
      0, // Mantém o movimento no plano XZ
      Math.random() - 0.5
    ).normalize();

    // Aplica a direção à IA para que o estado 'DISENGAGE' a utilize.
    if (this.ai) {
      this.ai.currentDirection = escapeDirection;
      this.ai.changeState('DISENGAGE');
    }
    // --- FIM DA NOVA LÓGICA ---
  }

   getAttackDirection(targetPosition) {
    const toPlayer = new THREE.Vector3().subVectors(targetPosition, this.mesh.position).normalize();
    const forward = new THREE.Vector3(0, 0, 1);
    const angle = Math.atan2(toPlayer.x, toPlayer.z);
    const angleDeg = THREE.MathUtils.radToDeg(angle);
    
    // Mapeia o ângulo para uma direção
    if (angleDeg >= -22.5 && angleDeg < 22.5) return 'up';
    if (angleDeg >= 22.5 && angleDeg < 67.5) return 'ru';
    if (angleDeg >= 67.5 && angleDeg < 112.5) return 'right';
    if (angleDeg >= 112.5 && angleDeg < 157.5) return 'rd';
    if (angleDeg >= 157.5 || angleDeg < -157.5) return 'down';
    if (angleDeg >= -157.5 && angleDeg < -112.5) return 'ld';
    if (angleDeg >= -112.5 && angleDeg < -67.5) return 'left';
    if (angleDeg >= -67.5 && angleDeg < -22.5) return 'lu';
    
    return 'up';
  }

  getAttackAction(direction) {
    const attackActions = {
      'down': this.actions.ShootingDown,
      'ld': this.actions.ShootingLD,
      'left': this.actions.ShootingLeft,
      'lu': this.actions.ShootingLU,
      'up': this.actions.ShootingUp,
      'ru': this.actions.ShootingRU,
      'right': this.actions.ShootingRight,
      'rd': this.actions.ShootingRD
    };
    
    return attackActions[direction];
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
    if (this.isDying) {
      if (this.spriteMixer) this.spriteMixer.update(delta);
      if (this.actionSprite) this.actionSprite.quaternion.copy(camera.quaternion);
      return;
    }
    
    if (!this.isAlive) return;

    // Atualiza IA e verifica movimento
    const wasMoving = this.isMoving;
    this.ai.update(delta, targetPosition, collidableObjects);
    this.isMoving = this.velocity.length() > 0.1;

    // Determina a direção atual
    const currentDirection = this.getMovementDirection();

    // Atualiza animações
    if (this.isMoving && currentDirection) {
      if (!this.actions[currentDirection].isInLoop) {
        Object.values(this.actions).forEach(action => action.stop());
        this.actions[currentDirection].playLoop();
        this.lastRunning = currentDirection;
      }
    } else if (!this.isMoving && wasMoving) {
      this.setIdleFrame();
    }

    // Atualiza componentes
    this.audio.updateProximity(camera?.position);
    this.healthBar.update(camera);
    this.collision.updateBoundingBox();
    
    if (this.spriteMixer) this.spriteMixer.update(delta);
    
    // Atualiza projéteis
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

  getMovementDirection() {
    if (this.velocity.length() < 0.1) return null;
    
    const angle = Math.atan2(this.velocity.x, this.velocity.z);
    const angleDeg = THREE.MathUtils.radToDeg(angle);
    
    // Mapeia o ângulo para uma direção
    if (angleDeg >= -22.5 && angleDeg < 22.5) return 'runUp';
    if (angleDeg >= 22.5 && angleDeg < 67.5) return 'runRU';
    if (angleDeg >= 67.5 && angleDeg < 112.5) return 'runRight';
    if (angleDeg >= 112.5 && angleDeg < 157.5) return 'runRD';
    if (angleDeg >= 157.5 || angleDeg < -157.5) return 'runDown';
    if (angleDeg >= -157.5 && angleDeg < -112.5) return 'runLD';
    if (angleDeg >= -112.5 && angleDeg < -67.5) return 'runLeft';
    if (angleDeg >= -67.5 && angleDeg < -22.5) return 'runLU';
    
    return 'runUp';
  }

}
