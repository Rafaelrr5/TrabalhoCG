import * as THREE from '../../../build/three.module.js';
import { WORLD_CONFIG } from '../core/config/worldConfig.js';
import { PLAYER_CONFIG } from '../core/config/playerConfig.js';
import { hitbox } from '../entities/player/player.js';
import { gameAudioManager } from './index.js';
import { QuickTexture } from '../utils/textureUtils.js';

export let elevator = null;
const returnDistance = WORLD_CONFIG.ELEVATOR_ACTIVATION_DISTANCE;
const riseSpeed = WORLD_CONFIG.ELEVEVATOR_MOVEMENT_SPEED;
const elevatorHeight = WORLD_CONFIG.ELEVATOR_HEIGHT;

export function createElevator(scene, collidableObjects, x, z) {
    let elevatorMaterial = new THREE.MeshLambertMaterial({ color: 'blue' });
    let elevatorGeometry = new THREE.BoxGeometry(15.0, 4.0, 4.8);
    elevator = new THREE.Mesh(elevatorGeometry, elevatorMaterial);
    elevator.position.set(x, -1.9, z);
    elevator.userData = {
        isElevator: true,
        originalY: -1.91,
        targetY: elevatorHeight/2,
        isMoving: false,
        isRising: false,
        playerWasOnElevator: false
    };
    scene.add(elevator);
    QuickTexture.hangarWalls(elevator);
    collidableObjects.push(elevator);
    elevator.castShadow = true; // Ativa sombras no elevador
    elevator.receiveShadow = true; // Ativa recebimento de sombras no elevador
}

export function updateElevator(delta) {
    if (!elevator || !hitbox) return;

    // Calcula distância horizontal do jogador ao elevador
    const horizontalDistance = new THREE.Vector2(
        hitbox.position.x - elevator.position.x,
        hitbox.position.z - elevator.position.z
    ).length();

    // Verifica se o jogador está em cima do elevador
    const playerOnElevator = (
        horizontalDistance < 7.5 && // Metade da largura do elevador
        hitbox.position.y - PLAYER_CONFIG.PLAYER_HEIGHT < elevator.position.y + 2.0 // Logo acima do elevador
    );

    // Verifica se o jogador está longe o suficiente para o elevador voltar
    const playerFarAway = horizontalDistance > returnDistance;

    // Lógica de ativação/desativação
    if (playerOnElevator) {
        elevator.userData.playerWasOnElevator = true;
        
        // Ativa a subida se estiver no chão
        if (!elevator.userData.isMoving && !elevator.userData.isRising && 
            Math.abs(elevator.position.y - elevator.userData.originalY) < 0.5) {
            elevator.userData.isMoving = true;
            elevator.userData.isRising = true;
            // Play lift starting sound
            gameAudioManager.playLiftStartingSound();
        }
    } 
    else if (playerFarAway && elevator.userData.playerWasOnElevator) {
        // Ativa a descida se estiver no topo
        if (!elevator.userData.isMoving && elevator.userData.isRising && 
            Math.abs(elevator.position.y - elevator.userData.targetY) < 0.5) {
            elevator.userData.isMoving = true;
            elevator.userData.isRising = false;
            // Play lift starting sound
            gameAudioManager.playLiftStartingSound();
        }
    }

    // Movimenta o elevador
    if (elevator.userData.isMoving) {
        const direction = elevator.userData.isRising ? 1 : -1;
        const newY = elevator.position.y + (riseSpeed * delta * direction);

        // Limita o movimento entre a posição original e a altura máxima
        if (direction > 0) {
            elevator.position.y = Math.min(newY, elevator.userData.targetY);
        } else {
            elevator.position.y = Math.max(newY, elevator.userData.originalY);
        }

        // Move o jogador junto com o elevador se estiver em cima e subindo
        if (playerOnElevator && direction > 0) {
            hitbox.position.y += riseSpeed * delta;
        }

        // Verifica se chegou ao destino
        if ((direction > 0 && elevator.position.y >= elevator.userData.targetY) || 
            (direction < 0 && elevator.position.y <= elevator.userData.originalY)) {
            elevator.userData.isMoving = false;
            // Play lift stopping sound
            gameAudioManager.playLiftStoppingSound();
            
            // Reseta o flag se o elevador voltou ao chão
            if (direction < 0) {
                elevator.userData.playerWasOnElevator = false;
            }
        }
    }
}
