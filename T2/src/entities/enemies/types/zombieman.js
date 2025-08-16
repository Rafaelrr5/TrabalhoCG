import * as THREE from '../../../../../build/three.module.js';
import { Enemy } from '../base/enemies.js';
import { ZombiemanProjectile } from '../systems/zombiemanProjectile.js';
import { SpriteMixer } from '../../../../../libs/sprites/SpriteMixer.js';
import { hitbox } from '../../player/player.js';

export class Zombieman extends Enemy {
   constructor(position = [0, 0, 0], config = {}) {
    const defaultConfig = {
      maxHealth: 30,
      damage: 2,
      attackRange: 25,
      attackCooldown: 1.5,
      speed: 2.0,
      radius: 0.5,
      height: 4.0,
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
    this.player = hitbox;

    this.loadSprite();
    this.createHitbox();
    
    this.camera = null;
    this.scene = null;
    this.attack = this.attack.bind(this);

    if (this.healthBar && this.healthBar.healthBarGroup) {
      const zombiemanHeight = 4.0; // Altura do sprite do Zombieman
      const offset = 0.3; // Espaço extra acima da cabeça
      this.healthBar.healthBarGroup.position.y = zombiemanHeight + offset;
    }
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
    const direction = this.getAttackDirection(targetPosition, this.camera);
    const attackAction = this.getAttackAction(direction);
    
    if (attackAction) {
      attackAction.playLoop();
    }
    
    this.fireProjectile(targetPosition);
    
    if (this.audio) {
      this.audio.playAttackSound();
    }
    
    this.lastAttackTime = now;

    this.applyRandomMovement();

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
  }

  applyRandomMovement() {
    const randomAngle = Math.random() * 2 * Math.PI;
    const direction = new THREE.Vector3(Math.cos(randomAngle), 0, Math.sin(randomAngle));

    // Define a velocidade do inimigo. O movimento será aplicado no 'update' principal.
    this.velocity.copy(direction).multiplyScalar(this.config.speed);
  }

   getAttackDirection(targetPosition, camera) {
    // 1. Vetor do inimigo para o jogador (projetado no plano XZ)
    const toPlayer = new THREE.Vector3().subVectors(targetPosition, this.mesh.position);
    toPlayer.y = 0;
    toPlayer.normalize();

    // 2. Vetor de direção da câmera (projetado no plano XZ)
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();

    // 3. Calcula o ângulo do ataque e o ângulo da câmera
    const attackAngle = Math.atan2(toPlayer.x, toPlayer.z);
    const cameraAngle = Math.atan2(cameraDirection.x, cameraDirection.z);
    
    // 4. A diferença entre os ângulos nos dá o ângulo relativo
    let relativeAngle = attackAngle - cameraAngle;

    // Normaliza o ângulo para o intervalo [-PI, PI] para evitar problemas de "wrap-around"
    if (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
    if (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

    // 5. Converte para graus e usa a mesma lógica de mapeamento de antes
    const angleDeg = THREE.MathUtils.radToDeg(relativeAngle);
    
    // O inimigo deve usar a animação "para cima" quando atira para longe da câmera
    // e "para baixo" quando atira em direção à câmera.
    if (angleDeg >= -22.5 && angleDeg < 22.5) return 'up';
    if (angleDeg >= 22.5 && angleDeg < 67.5) return 'lu'; // Invertido: Esquerda da câmera é direita do inimigo
    if (angleDeg >= 67.5 && angleDeg < 112.5) return 'left';
    if (angleDeg >= 112.5 && angleDeg < 157.5) return 'ld';
    if (angleDeg >= 157.5 || angleDeg < -157.5) return 'down';
    if (angleDeg >= -157.5 && angleDeg < -112.5) return 'rd'; // Invertido: Direita da câmera é esquerda do inimigo
    if (angleDeg >= -112.5 && angleDeg < -67.5) return 'right';
    if (angleDeg >= -67.5 && angleDeg < -22.5) return 'ru';
    
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
    if (!this.mesh.parent) {
      console.error("Zombieman não pode atirar: a malha do inimigo não foi adicionada a uma cena.");
      return;
    }

    const fireOffset = new THREE.Vector3(0, 1.0, 0); 
    const startPosition = this.mesh.position.clone().add(fireOffset);
    
    // Cria uma cópia da posição do alvo para não modificar o vetor original.
    const aimTargetPosition = targetPosition.clone();

    // Iguala a altura do alvo à altura de onde o projétil é disparado.
    // Isso garante que o tiro seja perfeitamente reto no plano horizontal.
    aimTargetPosition.y = startPosition.y;

    // Calcula a direção usando a posição do alvo "achatada".
    const projectileDirection = new THREE.Vector3().subVectors(aimTargetPosition, startPosition).normalize();

    const projectile = new ZombiemanProjectile(
      startPosition,
      projectileDirection, // Usa a nova direção reta
      { damage: this.config.damage }
    );

    this.activeProjectiles.push(projectile);
    this.mesh.parent.add(projectile.mesh);
  }
  
  update(delta, camera, targetPosition, collidableObjects, otherEnemies, scene) {
    this.camera = camera;

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
    
    // Agora passamos o objeto 'player' para o projétil.
    // Se o projétil retornar 'false', significa que ele se tornou inativo.
    if (!projectile.update(delta, this.player)) {
      this.activeProjectiles.splice(i, 1); // Removemos o projétil inativo da lista.
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
