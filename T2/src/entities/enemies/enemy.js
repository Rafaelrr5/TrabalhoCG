import * as THREE from '../../../../build/three.module.js';
import { LostSoul } from './types/lostSoul.js';
import { Cacodemon } from './types/cacodemon.js';
import { preloadSkullModel } from '../../utils/skullLoader.js';
import { PainElemental } from './types/painElemental.js';
import { DEBUG_CONFIG } from '../../core/config/debugConfig.js';
import { WORLD_CONFIG } from '../../core/config/worldConfig.js';
import { PLAYER_CONFIG } from '../../core/config/playerConfig.js';
import { isPlayerInArea1, isPlayerInArea2, isPlayerInArea3, isPlayerInsideHangar, isPlayerInArea4 } from '../../systems/environment.js';
import { cleanupAllProjectiles } from './systems/cacodeemonProjectile.js';
import { forceShowAllHealthBars, debugAllHealthBars } from './base/enemies.js';
import { Zombieman } from './types/zombieman.js';
import { spawnPoints } from '../../systems/environment.js';

export const enemies = [];

let area1LostSoulsActivated = false;
let area2CacodemonsActivated = false;
let area3ZombiemenActivated = false;
// NOVO: Variável de estado para a Área 4 (Labirinto)
let area4EnemiesActivated = false;

export async function preloadEnemies() {
  await preloadSkullModel();
}

export async function createEnemies(scene) {
  await preloadEnemies();
  
  const lostSoulY = WORLD_CONFIG.AREA_Y_POSITION + WORLD_CONFIG.AREA_HEIGHT / 2 + 8.0;
  const lostSoulPositions = [
    [-170, 6.0, -140],
    [-160, lostSoulY, -130],
    [-150, lostSoulY, -135],
    [-155, lostSoulY, -120],
    [-140, lostSoulY, -145]
  ];
  
  lostSoulPositions.forEach(([x, y, z]) => {
    const enemy = new LostSoul([x, y, z]);
    enemy.area = 'area1';
    enemy.enemyType = 'LostSoul';
    enemies.push(enemy);
    scene.add(enemy.mesh);
    console.log(`Created LostSoul at ${x}, ${y}, ${z}`);
  });

  const cacodeemonPositions = [
    [-22.5, 20, -155.5],
    [25.5, 20, -123.5],
    [-6.5, 20, -107.0],
  ];

  cacodeemonPositions.forEach(([x, y, z]) => {
    const enemy = new Cacodemon([x, y, z]);
    enemy.area = 'area2';
    enemy.enemyType = 'Cacodemon';
    enemies.push(enemy);
    scene.add(enemy.mesh);
    console.log(`Created Cacodemon at ${x}, ${y}, ${z}`);
  });

  // --- LÓGICA DE SPAWN DA ÁREA 4 (LABIRINTO) - ALTERADO ---
  if (spawnPoints && spawnPoints.length > 0) {
    // O primeiro ponto de spawn é para o Pain Elemental
    const painElemental = new PainElemental(spawnPoints[0]);
    painElemental.area = 'area4';
    painElemental.enemyType = 'PainElemental';
    enemies.push(painElemental);
    scene.add(painElemental.mesh);
    console.log(`Created PainElemental for Area 4 at ${spawnPoints[0]}`);

    // Os 4 pontos seguintes são para os Cacodemons
    for (let i = 1; i < 5; i++) {
      if (spawnPoints[i]) {
        const cacodemon = new Cacodemon(spawnPoints[i]);
        cacodemon.area = 'area4';
        cacodemon.enemyType = 'Cacodemon';
        enemies.push(cacodemon);
        scene.add(cacodemon.mesh);
        console.log(`Created Cacodemon for Area 4 at ${spawnPoints[i]}`);
      }
    }
  } else {
    console.warn("spawnPoints array is empty or not defined. Cannot create Area 4 enemies.");
  }
  // --- FIM DA LÓGICA DE SPAWN DA ÁREA 4 ---

  const zombiemanY = WORLD_CONFIG.AREA_Y_POSITION - 2; // Ligeiramente acima do chão
  const hangarCenterX = 156.25; // Centro do hangar em X
  const hangarCenterZ = -130.0; // Centro do hangar em Z
  const hangarBackZ = hangarCenterZ - 10;
  
  const zombiemanPositions = [
    // Linha traseira (4 Zombiemen)
    [hangarCenterX - 30, zombiemanY, hangarBackZ],
    [hangarCenterX - 10, zombiemanY, hangarBackZ],
    [hangarCenterX + 10, zombiemanY, hangarBackZ],
    [hangarCenterX + 30, zombiemanY, hangarBackZ],
    // Linha do meio (4 Zombiemen)
    [hangarCenterX - 25, zombiemanY, hangarBackZ + 15],
    [hangarCenterX - 5, zombiemanY, hangarBackZ + 15],
    [hangarCenterX + 5, zombiemanY, hangarBackZ + 15],
    [hangarCenterX + 25, zombiemanY, hangarBackZ + 15]
  ];

  zombiemanPositions.forEach(([x, y, z], index) => {
    const enemy = new Zombieman([x, y, z]);
    enemy.area = 'area3';
    enemy.enemyType = 'Zombieman';
    enemies.push(enemy);
    scene.add(enemy.mesh);
  });
}

// --- FUNÇÃO shouldUpdateEnemy - ALTERADO ---
export function shouldUpdateEnemy(camera, enemy) {
  // Lógica especial para a Área 4: só depende do estado de ativação da área
  if (enemy.area === 'area4') {
    return area4EnemiesActivated;
  }

  // 1. Inimigos que devem estar sempre ativos (exceto os da Área 4, já tratados)
  if ( enemy.alwaysActive || 
      (enemy.spawner && enemy.spawner.enemyType === 'PainElemental') ||
      enemy.isSpawned ||
      enemy.detection?.hasSeenPlayer) {
    return true;
  }
  
  // 2. Inimigos ativados por área
  if (enemy.area === 'area1' && area1LostSoulsActivated) {
    return true;
  }
  
  if (enemy.area === 'area2' && area2CacodemonsActivated) {
    return true;
  }

  if (enemy.area === 'area3' && area3ZombiemenActivated) {
    return true;
  }

  // 3. Inimigos que já viram o jogador (redundante com a verificação no ponto 1, mas mantido por segurança)
  if (enemy.detection?.hasSeenPlayer) {
    return true;
  }

  return false;
}

// --- FUNÇÃO updateEnemies - ALTERADO ---
export function updateEnemies(delta, scene, camera, gun = null, collidableObjects = []) {
  const hitboxTop = new THREE.Vector3(
    camera.position.x,
    PLAYER_CONFIG.CAMERA_HEIGHT + PLAYER_CONFIG.PLAYER_HEIGHT,
    camera.position.z
  );
  
  const aliveEnemies = enemies.filter(e => e.isAlive);
  const inArea1 = isPlayerInArea1(camera);
  const inArea2 = isPlayerInArea2(camera);
  const inArea3 = isPlayerInArea3(camera);
  const inArea4 = isPlayerInArea4(camera);

  // Ativação única das áreas 1, 2 e 3
  if (inArea1 && !area1LostSoulsActivated) {
    activateLostSoulsInArea1();
  }

  if (inArea2 && !area2CacodemonsActivated) {
    activateCacodemonsInArea2();
  }

  if (inArea3 && !area3ZombiemenActivated) {
    activateZombiemenInArea3();
  }

  // NOVO: Lógica de ativação/desativação para a Área 4
  if (inArea4 && !area4EnemiesActivated) {
    activateArea4Enemies();
  } else if (!inArea4 && area4EnemiesActivated) {
    deactivateArea4Enemies();
  }

   enemies.forEach(enemy => {
    const shouldUpdate = shouldUpdateEnemy(camera, enemy);

    if (shouldUpdate) {
      // Força o estado 'PATROL' se a IA estiver em 'IDLE' ao ser ativada
      if (enemy.ai.state === 'IDLE') {
        enemy.ai.changeState('PATROL');
      }
      
      const otherEnemies = aliveEnemies.filter(e => e !== enemy);
      enemy.update(delta, camera, hitboxTop, collidableObjects, otherEnemies);
    } else if (typeof enemy.idleBehavior === 'function') {
      // Este bloco só deve ser executado para inimigos inativos
      enemy.idleBehavior(delta);
    }
  });
}

// --- NOVAS FUNÇÕES DE ATIVAÇÃO/DESATIVAÇÃO PARA A ÁREA 4 ---

export function activateArea4Enemies() {
  if (area4EnemiesActivated) return;
  area4EnemiesActivated = true;
  
  const area4Enemies = enemies.filter(e => e.area === 'area4' && e.isAlive);
  console.log(`[AREA4_LABIRINTO] Ativando ${area4Enemies.length} inimigos.`);

  area4Enemies.forEach(enemy => {
    if (enemy.ai.state === 'IDLE') {
      enemy.ai.changeState('PATROL');
    }
    if (typeof enemy.playSightSound === 'function') {
      enemy.playSightSound();
    }
  });
}

export function deactivateArea4Enemies() {
  if (!area4EnemiesActivated) return;
  area4EnemiesActivated = false;

  const area4Enemies = enemies.filter(e => e.area === 'area4');
  console.log(`[AREA4_LABIRINTO] Desativando ${area4Enemies.length} inimigos.`);

  area4Enemies.forEach(enemy => {
    // Reseta o estado da IA para IDLE para que não fiquem "travados"
    enemy.ai.changeState('IDLE');
    // Reseta o estado de detecção para que não ataquem imediatamente ao reentrar
    if (enemy.detection) {
      enemy.detection.hasSeenPlayer = false;
    }
  });
}

// --- O RESTANTE DO ARQUIVO PERMANECE IGUAL ---

export function cleanupDeadEnemies(scene) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    if (!enemy.isAlive && enemy.mesh && (!enemy.mesh.parent || enemy.fadeCompleted)) {
      if (enemy.mesh.parent) {
        enemy.mesh.parent.remove(enemy.mesh);
      }
      enemy.dispose();
      enemies.splice(i, 1);
    }
  }
}

export function areAllEnemiesDefeated() {
  return enemies.length > 0 && enemies.every(e => !e.isAlive);
}

export function areAllArea1EnemiesDefeated() {
  const area1Enemies = enemies.filter(e => e.area === 'area1');
  return area1Enemies.length > 0 && area1Enemies.every(e => !e.isAlive);
}

export function areAllArea2EnemiesDefeated() {
  const area2Enemies = enemies.filter(e => e.area === 'area2');
  return area2Enemies.length > 0 && area2Enemies.every(e => !e.isAlive);
}

export function areAllArea4EnemiesDefeated() {
  const area4Enemies = enemies.filter(e => e.area === 'area4');
  return area4Enemies.length > 0 && area4Enemies.every(e => !e.isAlive);
}

export function areAllArea3EnemiesDefeated() {
  const area3Enemies = enemies.filter(e => e.area === 'area3');
  return area3Enemies.length > 0 && area3Enemies.every(e => !e.isAlive);
}

export function getAliveEnemies() {
  return enemies.filter(e => e.isAlive);
}

export function getLostSouls() {
  return enemies.filter(e => e.enemyType === 'LostSoul');
}

export function getCacodemons() {
  return enemies.filter(e => e.enemyType === 'Cacodemon');
}

export function getZombiemen() {
  return enemies.filter(e => e.enemyType === 'Zombieman');
}

export function addEnemy(scene, position, type = 'LostSoul') {
  let enemy;
  if (type === 'Cacodemon') {
    enemy = new Cacodemon(position);
    enemy.area = 'area2';
    enemy.enemyType = 'Cacodemon';
  } else if (type === 'Zombieman') {
    enemy = new Zombieman(position);
    enemy.area = 'area3';
    enemy.enemyType = 'Zombieman';
  } else {
    enemy = new LostSoul(position);
    enemy.area = 'area1';
    enemy.enemyType = 'LostSoul';
  }
  enemies.push(enemy);
  scene.add(enemy.mesh);
  return enemy;
}

export function damageEnemiesInArea(center, radius, damage) {
  return enemies
    .filter(e => e.isAlive && e.mesh.position.distanceTo(center) <= radius)
    .map(e => ({ enemy: e, died: e.takeDamage(damage) }));
}

export function getEnemyCount() {
  const lostSouls = getLostSouls();
  const cacodemons = getCacodemons();
  const zombiemen = getZombiemen();
  
  return {
    lostSouls: {
      total: lostSouls.length,
      alive: lostSouls.filter(e => e.isAlive).length,
      dead: lostSouls.filter(e => !e.isAlive).length
    },
    cacodemons: {
      total: cacodemons.length,
      alive: cacodemons.filter(e => e.isAlive).length,
      dead: cacodemons.filter(e => !e.isAlive).length
    },
    zombiemen: {
      total: zombiemen.length,
      alive: zombiemen.filter(e => e.isAlive).length,
      dead: zombiemen.filter(e => !e.isAlive).length
    },
    total: {
      total: enemies.length,
      alive: enemies.filter(e => e.isAlive).length,
      dead: enemies.filter(e => !e.isAlive).length
    }
  };
}

export function cleanupAllEnemyProjectiles(scene) {
  const cacodemons = getCacodemons();
  const zombiemen = getZombiemen();
  cleanupAllProjectiles(scene, cacodemons);
  
  // Limpar projéteis dos Zombiemen também
  zombiemen.forEach(zombieman => {
    if (zombieman.activeProjectiles) {
      zombieman.activeProjectiles.forEach(projectile => {
        if (projectile.mesh && projectile.mesh.parent) {
          projectile.mesh.parent.remove(projectile.mesh);
        }
      });
      zombieman.activeProjectiles = [];
    }
  });
}

export function activateCacodemonsInArea2() {
  if (area2CacodemonsActivated) return;
  
  const cacodemons = getCacodemons().filter(c => c.area === 'area2' && c.isAlive);
  console.log(`Activating ${cacodemons.length} Cacodemons in Area 2`);
  
  cacodemons.forEach(cacodemon => {
    if (cacodemon.ai.state === 'IDLE') {
      cacodemon.ai.changeState('PATROL');
    }
    cacodemon.playSightSound();
    console.log(`Activated Cacodemon at ${cacodemon.mesh.position.toArray()}`);
  });
  
  area2CacodemonsActivated = true;
}

export function resetArea2Activation() {
  area2CacodemonsActivated = false;
}

export function activateZombiemenInArea3() {
  if (area3ZombiemenActivated) return;
  
  const zombiemen = getZombiemen().filter(z => z.area === 'area3' && z.isAlive);
  console.log(`[AREA3_HANGAR] Activating ${zombiemen.length} Zombiemen in Area 3`);
  
  zombiemen.forEach(zombieman => {
    if (zombieman.ai.state === 'IDLE') {
      zombieman.ai.changeState('PATROL');
    }
    if (zombieman.playSightSound) {
      zombieman.playSightSound();
    }
    console.log(`[AREA3_HANGAR] Activated Zombieman at ${zombieman.mesh.position.toArray()}`);
  });
  
  area3ZombiemenActivated = true;
}

export function resetArea3Activation() {
  area3ZombiemenActivated = false;
}

// ============================================================================
// DEBUG FUNCTIONS FOR HEALTH BARS
// ============================================================================

/**
 * Debug function to check health bar status - can be called from browser console
 */
window.debugEnemyHealthBars = function() {
  debugAllHealthBars(enemies);
  
  // Special focus on Lost Souls since they were having issues
  const lostSouls = enemies.filter(e => e.constructor.name === 'LostSoul');
  
  return enemies.map(enemy => ({
    type: enemy.constructor.name,
    alive: enemy.isAlive,
    health: `${enemy.currentHealth}/${enemy.maxHealth}`,
    hasHealthBar: !!enemy.healthBar,
    healthBarEnabled: enemy.healthBar?.enabled,
    healthBarVisible: enemy.healthBar?.healthBarGroup?.visible
  }));
};

/**
 * Force all health bars to show - can be called from browser console
 */
window.forceShowHealthBars = function() {
  forceShowAllHealthBars(enemies);
};

export function activateLostSoulsInArea1() {
  if (area1LostSoulsActivated) return;
  
  const lostSouls = getLostSouls().filter(ls => ls.area === 'area1' && ls.isAlive);
  console.log(`Activating ${lostSouls.length} Lost Souls in Area 1`);
  
  lostSouls.forEach(lostSoul => {
    // A mudança de estado é crucial aqui
    if (lostSoul.ai.state === 'IDLE') {
      lostSoul.ai.changeState('PATROL'); 
    }
    lostSoul.playSightSound();
    console.log(`Activated LostSoul at ${lostSoul.mesh.position.toArray()}`);
  });
  
  area1LostSoulsActivated = true;
}


export function resetArea1Activation() {
  area1LostSoulsActivated = false;
}

// Debug functions for development
if (typeof window !== 'undefined') {
  // Keep some legacy functions for backward compatibility
  window.getEnemies = () => enemies;
  window.getCacodemons = () => getCacodemons();
  window.getLostSouls = () => getLostSouls();
  window.getZombiemen = () => getZombiemen();
  
  // Additional utility functions
  window.resetEnemies = () => {
    enemies.forEach((enemy) => {
      if (enemy.spawnPosition) {
        enemy.mesh.position.copy(enemy.spawnPosition);
      }
      if (enemy.baseY !== undefined && enemy.originalSpawnY !== undefined) {
        enemy.baseY = enemy.originalSpawnY;
      }
      enemy.aiState = 'IDLE';
      if (enemy.stateChangeTime !== undefined) {
        enemy.stateChangeTime = 0;
      }
    });
  };
  
  window.fixEnemyCount = (scene) => {
    const maxLostSouls = 5;
    const maxCacodemons = 3;
    const maxZombiemen = 8;
    
    const lostSouls = getLostSouls();
    const cacodemons = getCacodemons();
    const zombiemen = getZombiemen();
    
    if (lostSouls.length > maxLostSouls) {
      const extraLostSouls = lostSouls.splice(maxLostSouls);
      extraLostSouls.forEach((enemy) => {
        if (enemy.mesh.parent) {
          enemy.mesh.parent.remove(enemy.mesh);
        }
        if (enemy.dispose) {
          enemy.dispose();
        }
        const index = enemies.indexOf(enemy);
        if (index > -1) {
          enemies.splice(index, 1);
        }
      });
    }
    
    if (cacodemons.length > maxCacodemons) {
      const extraCacodemons = cacodemons.splice(maxCacodemons);
      extraCacodemons.forEach((enemy) => {
        if (enemy.mesh.parent) {
          enemy.mesh.parent.remove(enemy.mesh);
        }
        if (enemy.dispose) {
          enemy.dispose();
        }
        const index = enemies.indexOf(enemy);
        if (index > -1) {
          enemies.splice(index, 1);
        }
      });
    }

    if (zombiemen.length > maxZombiemen) {
      const extraZombiemen = zombiemen.splice(maxZombiemen);
      extraZombiemen.forEach((enemy) => {
        if (enemy.mesh.parent) {
          enemy.mesh.parent.remove(enemy.mesh);
        }
        if (enemy.dispose) {
          enemy.dispose();
        }
        const index = enemies.indexOf(enemy);
        if (index > -1) {
          enemies.splice(index, 1);
        }
      });
    }
  };
}
