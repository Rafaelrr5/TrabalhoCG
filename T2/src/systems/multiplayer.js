import * as THREE from '../../../../build/three.module.js';
import { MULTIPLAYER_CONFIG } from '../core/config/multiplayerConfig.js';

class MultiplayerClient {
    constructor() {
        this.ws = null;
        this.playerId = null;
        this.connected = false;
        this.reconnecting = false;
        this.serverUrl = 'ws://localhost:8080';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        
        // Estado dos outros jogadores
        this.otherPlayers = new Map();
        this.otherPlayerMeshes = new Map();
        
        // Configurações de sincronização
        this.updateInterval = 50; // 20 FPS para sincronização
        this.lastUpdate = 0;
        this.interpolationDelay = 100; // Delay para interpolação
        
        // Callbacks
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onPlayerUpdate = null;
        this.onProjectileFired = null;
        this.onEnemyHit = null;
        this.onKeyCollected = null;
        this.onPlayerDied = null;
        this.onPlayerRespawned = null;
    }

    connect(serverUrl = null) {
        if (serverUrl) {
            this.serverUrl = serverUrl;
        }

        if (this.connected || this.reconnecting) {
            console.log('[MULTIPLAYER] Já conectado ou tentando reconectar');
            return;
        }

        console.log(`[MULTIPLAYER] Tentando conectar ao servidor: ${this.serverUrl}`);
        
        try {
            this.ws = new WebSocket(this.serverUrl);
            this.setupWebSocketHandlers();
        } catch (error) {
            console.error('[MULTIPLAYER] Erro ao criar conexão WebSocket:', error);
            this.scheduleReconnect();
        }
    }

    setupWebSocketHandlers() {
        this.ws.onopen = () => {
            console.log('[MULTIPLAYER] Conectado ao servidor');
            this.connected = true;
            this.reconnecting = false;
            this.reconnectAttempts = 0;
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleServerMessage(data);
            } catch (error) {
                console.error('[MULTIPLAYER] Erro ao processar mensagem do servidor:', error);
            }
        };

        this.ws.onclose = (event) => {
            console.log('[MULTIPLAYER] Conexão fechada:', event.code, event.reason);
            this.connected = false;
            this.handleDisconnection();
        };

        this.ws.onerror = (error) => {
            console.error('[MULTIPLAYER] Erro na conexão WebSocket:', error);
        };
    }

    handleServerMessage(data) {
        console.log(`[MULTIPLAYER] Mensagem recebida do servidor:`, data.type, data);
        
        switch (data.type) {
            case 'connected':
                this.handleConnection(data);
                break;
            case 'playerJoined':
                this.handlePlayerJoined(data);
                break;
            case 'playerLeft':
                this.handlePlayerLeft(data);
                break;
            case 'playerStateUpdate':
                this.handlePlayerStateUpdate(data);
                break;
            case 'playerAction':
                this.handlePlayerAction(data);
                break;
            case 'projectileFired':
                this.handleProjectileFired(data);
                break;
            case 'enemyHit':
                this.handleEnemyHit(data);
                break;
            case 'keyCollected':
                this.handleKeyCollected(data);
                break;
            case 'playerDied':
                this.handlePlayerDied(data);
                break;
            case 'playerRespawned':
                this.handlePlayerRespawned(data);
                break;
            case 'error':
                console.error('[MULTIPLAYER] Erro do servidor:', data.message);
                break;
            default:
                console.log('[MULTIPLAYER] Mensagem desconhecida do servidor:', data);
        }
    }

    handleConnection(data) {
        this.playerId = data.playerId;
        this.connected = true;
        console.log(`[MULTIPLAYER] Conectado com ID: ${this.playerId}`);
        console.log(`[MULTIPLAYER] Dados recebidos:`, data);
        
        // Criar representações visuais para outros jogadores existentes
        if (data.gameState && data.gameState.players) {
            console.log(`[MULTIPLAYER] Jogadores existentes:`, data.gameState.players);
            Object.values(data.gameState.players).forEach(playerData => {
                if (playerData.id !== this.playerId) {
                    console.log(`[MULTIPLAYER] Criando mesh para jogador existente:`, playerData);
                    this.createOtherPlayerMesh(playerData);
                }
            });
        }
        
        // Notificar que a conexão foi estabelecida
        if (this.onPlayerJoined) {
            this.onPlayerJoined({ id: this.playerId, type: 'connection' });
        }
    }

    handlePlayerJoined(data) {
        console.log(`[MULTIPLAYER] Novo jogador entrou:`, data.player);
        console.log(`[MULTIPLAYER] Meu ID: ${this.playerId}`);
        console.log(`[MULTIPLAYER] ID do novo jogador: ${data.player.id}`);
        
        // Verificar se não é o próprio jogador
        if (data.player.id === this.playerId) {
            console.log(`[MULTIPLAYER] Ignorando próprio jogador: ${data.player.id}`);
            return;
        }
        
        console.log(`[MULTIPLAYER] Chamando createOtherPlayerMesh para jogador: ${data.player.id}`);
        this.createOtherPlayerMesh(data.player);
        
        if (this.onPlayerJoined) {
            this.onPlayerJoined(data.player);
        }
    }

    handlePlayerLeft(data) {
        console.log(`[MULTIPLAYER] Jogador saiu: ${data.playerId}`);
        this.removeOtherPlayerMesh(data.playerId);
        
        if (this.onPlayerLeft) {
            this.onPlayerLeft(data.playerId);
        }
    }

    handlePlayerStateUpdate(data) {
        console.log(`[MULTIPLAYER] Recebida atualização do jogador ${data.playerId}:`, {
            position: data.position,
            rotation: data.rotation,
            health: data.health,
            weapon: data.weapon
        });
        
        const otherPlayer = this.otherPlayers.get(data.playerId);
        if (otherPlayer) {
            // Atualizar estado com timestamp para interpolação
            otherPlayer.targetPosition = new THREE.Vector3(data.position.x, data.position.y, data.position.z);
            otherPlayer.targetRotation = new THREE.Euler(data.rotation.x, data.rotation.y, data.rotation.z);
            otherPlayer.targetHealth = data.health;
            otherPlayer.targetWeapon = data.weapon;
            otherPlayer.lastUpdate = Date.now();
            
            console.log(`[MULTIPLAYER] Estado atualizado para jogador ${data.playerId}`);
        } else {
            console.warn(`[MULTIPLAYER] Jogador ${data.playerId} não encontrado para atualização`);
        }
        
        if (this.onPlayerUpdate) {
            this.onPlayerUpdate(data);
        }
    }

    handlePlayerAction(data) {
        if (this.onPlayerAction) {
            this.onPlayerAction(data);
        }
    }

    handleProjectileFired(data) {
        if (this.onProjectileFired) {
            this.onProjectileFired(data.projectile);
        }
    }

    handleEnemyHit(data) {
        if (this.onEnemyHit) {
            this.onEnemyHit(data);
        }
    }

    handleKeyCollected(data) {
        if (this.onKeyCollected) {
            this.onKeyCollected(data);
        }
    }

    handlePlayerDied(data) {
        const otherPlayer = this.otherPlayers.get(data.playerId);
        if (otherPlayer) {
            otherPlayer.isAlive = false;
        }
        
        if (this.onPlayerDied) {
            this.onPlayerDied(data);
        }
    }

    handlePlayerRespawned(data) {
        const otherPlayer = this.otherPlayers.get(data.playerId);
        if (otherPlayer) {
            otherPlayer.isAlive = true;
            otherPlayer.health = 200;
        }
        
        if (this.onPlayerRespawned) {
            this.onPlayerRespawned(data);
        }
    }

    createOtherPlayerMesh(playerData) {
        console.log(`[MULTIPLAYER] Criando mesh para jogador:`, playerData);
        
        // Verificar se já existe um mesh para este jogador
        if (this.otherPlayerMeshes.has(playerData.id)) {
            console.log(`[MULTIPLAYER] Mesh já existe para jogador ${playerData.id}, removendo...`);
            this.removeOtherPlayerMesh(playerData.id);
        }
        
        // Verificar se o jogo está pronto
        if (!window.scene || !window.camera || !window.renderer) {
            console.log(`[MULTIPLAYER] Jogo ainda não está pronto, aguardando...`);
            // Tentar novamente em 100ms
            setTimeout(() => {
                this.createOtherPlayerMesh(playerData);
            }, 100);
            return;
        }
        
        // Criar geometria para o outro jogador - modelo mais bonito
        const geometry = new THREE.CapsuleGeometry(0.4, 1.2, 8, 12);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0x00aaff, // Azul para outros jogadores
            transparent: true, 
            opacity: 0.9,
            shininess: 100
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Adicionar uma luz ambiente suave para o jogador
        const light = new THREE.PointLight(0x00aaff, 0.5, 8);
        light.position.set(0, 1.5, 0);
        mesh.add(light);
        
        // Adicionar um contorno para melhor visibilidade
        const outlineGeometry = new THREE.CapsuleGeometry(0.45, 1.3, 8, 12);
        const outlineMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.3,
            side: THREE.BackSide
        });
        const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
        mesh.add(outline);
        
        // Posicionar o jogador (com fallback para posições padrão)
        const posX = playerData.position?.x || 0;
        const posY = playerData.position?.y || 2;
        const posZ = playerData.position?.z || 0;
        mesh.position.set(posX, posY, posZ);
        
        // Adicionar nome para identificação
        mesh.name = `OtherPlayer_${playerData.id}`;
        
        // Adicionar à cena
        window.scene.add(mesh);
        console.log(`[MULTIPLAYER] Mesh adicionado à cena para jogador ${playerData.id}`);
        console.log(`[MULTIPLAYER] Posição do mesh:`, mesh.position);
        console.log(`[MULTIPLAYER] Cena tem ${window.scene.children.length} objetos`);
        
        // Forçar renderização para garantir que o jogador apareça
        console.log(`[MULTIPLAYER] Forçando renderização...`);
        window.renderer.render(window.scene, window.camera);
        
        // Armazenar referências
        this.otherPlayerMeshes.set(playerData.id, mesh);
        this.otherPlayers.set(playerData.id, {
            id: playerData.id,
            position: new THREE.Vector3(posX, posY, posZ),
            rotation: new THREE.Euler(
                playerData.rotation?.x || 0,
                playerData.rotation?.y || 0,
                playerData.rotation?.z || 0
            ),
            health: playerData.health || 200,
            weapon: playerData.weapon || 'chaingun',
            isAlive: playerData.isAlive !== false,
            keys: playerData.keys || [],
            targetPosition: new THREE.Vector3(posX, posY, posZ),
            targetRotation: new THREE.Euler(
                playerData.rotation?.x || 0,
                playerData.rotation?.y || 0,
                playerData.rotation?.z || 0
            ),
            lastUpdate: Date.now()
        });
        
        console.log(`[MULTIPLAYER] Mesh criado com sucesso para jogador ${playerData.id} em posição (${posX}, ${posY}, ${posZ})`);
    }

    removeOtherPlayerMesh(playerId) {
        const mesh = this.otherPlayerMeshes.get(playerId);
        if (mesh && window.scene) {
            window.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
            console.log(`[MULTIPLAYER] Mesh removido para jogador ${playerId}`);
        }
        
        this.otherPlayerMeshes.delete(playerId);
        this.otherPlayers.delete(playerId);
    }

    updateOtherPlayers(delta) {
        // Verificar se o jogo está pronto
        if (!window.scene || !window.camera || !window.renderer) {
            return; // Aguardar o jogo estar pronto
        }
        
        const now = Date.now();
        
        this.otherPlayers.forEach((otherPlayer, playerId) => {
            const mesh = this.otherPlayerMeshes.get(playerId);
            if (!mesh || !otherPlayer.isAlive) return;
            
            // Interpolação suave da posição
            if (otherPlayer.targetPosition) {
                const lerpFactor = Math.min(1, delta * 8); // Velocidade de interpolação mais suave
                mesh.position.lerp(otherPlayer.targetPosition, lerpFactor);
            }
            
            // Interpolação suave da rotação
            if (otherPlayer.targetRotation) {
                mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, otherPlayer.targetRotation.x, delta * 8);
                mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, otherPlayer.targetRotation.y, delta * 8);
                mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, otherPlayer.targetRotation.z, delta * 8);
            }
            
            // Atualizar cor baseada na vida
            if (otherPlayer.targetHealth !== undefined) {
                const healthPercent = otherPlayer.targetHealth / 200;
                if (healthPercent < 0.3) {
                    mesh.material.color.setHex(0xff4444); // Vermelho suave
                } else if (healthPercent < 0.6) {
                    mesh.material.color.setHex(0xffaa44); // Laranja suave
                } else {
                    mesh.material.color.setHex(0x44ff44); // Verde suave
                }
            }
            
            // Fazer o jogador "pulsar" suavemente para ser mais visível
            const pulseScale = 1.0 + 0.05 * Math.sin(now * 0.005);
            mesh.scale.setScalar(pulseScale);
            
            // Debug: mostrar posição do outro jogador (menos frequente)
            if (MULTIPLAYER_CONFIG.DEBUG_LOG_MESSAGES && Math.random() < 0.005) { // 0.5% de chance por frame
                console.log(`[MULTIPLAYER] Jogador ${playerId} em posição:`, mesh.position);
            }
        });
    }

    sendPlayerUpdate(position, rotation, health, weapon) {
        if (!this.connected || !this.ws) return;
        
        const now = Date.now();
        if (now - this.lastUpdate < this.updateInterval) return;
        
        const message = {
            type: 'playerUpdate',
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            },
            rotation: {
                x: rotation.x,
                y: rotation.y,
                z: rotation.z
            },
            health: health,
            weapon: weapon
        };
        
        try {
            this.ws.send(JSON.stringify(message));
            this.lastUpdate = now;
        } catch (error) {
            console.error('[MULTIPLAYER] Erro ao enviar atualização:', error);
        }
    }

    sendPlayerAction(action, data) {
        if (!this.connected || !this.ws) return;
        
        const message = {
            type: 'playerAction',
            action: action,
            data: data
        };
        
        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error('[MULTIPLAYER] Erro ao enviar ação:', error);
        }
    }

    sendProjectileFired(position, direction, weapon) {
        if (!this.connected || !this.ws) return;
        
        const message = {
            type: 'projectileFired',
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            },
            direction: {
                x: direction.x,
                y: direction.y,
                z: direction.z
            },
            weapon: weapon
        };
        
        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error('[MULTIPLAYER] Erro ao enviar projétil:', error);
        }
    }

    sendEnemyHit(enemyId, damage, position) {
        if (!this.connected || !this.ws) return;
        
        const message = {
            type: 'enemyHit',
            enemyId: enemyId,
            damage: damage,
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            }
        };
        
        try {
            console.log(`[MULTIPLAYER] Enviando hit no inimigo ${enemyId} com ${damage} de dano`);
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error('[MULTIPLAYER] Erro ao enviar hit:', error);
        }
    }

    sendKeyCollected(keyType, position) {
        if (!this.connected || !this.ws) return;
        
        const message = {
            type: 'keyCollected',
            keyType: keyType,
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            }
        };
        
        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error('[MULTIPLAYER] Erro ao enviar coleta de chave:', error);
        }
    }

    sendPlayerDied(position) {
        if (!this.connected || !this.ws) return;
        
        const message = {
            type: 'playerDied',
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            }
        };
        
        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error('[MULTIPLAYER] Erro ao enviar morte:', error);
        }
    }

    sendPlayerRespawned(position) {
        if (!this.connected || !this.ws) return;
        
        const message = {
            type: 'playerRespawned',
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            }
        };
        
        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error('[MULTIPLAYER] Erro ao enviar respawn:', error);
        }
    }

    handleDisconnection() {
        if (this.reconnecting) return;
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
        } else {
            console.error('[MULTIPLAYER] Máximo de tentativas de reconexão atingido');
            this.reconnecting = false;
        }
    }

    scheduleReconnect() {
        this.reconnecting = true;
        this.reconnectAttempts++;
        
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        console.log(`[MULTIPLAYER] Tentativa de reconexão ${this.reconnectAttempts} em ${delay}ms`);
        
        setTimeout(() => {
            this.connect();
        }, delay);
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
        this.connected = false;
        this.reconnecting = false;
        this.playerId = null;
        
        // Limpar outros jogadores
        this.otherPlayers.forEach((_, playerId) => {
            this.removeOtherPlayerMesh(playerId);
        });
    }

    isConnected() {
        return this.connected;
    }

    getPlayerId() {
        return this.playerId;
    }

    getOtherPlayers() {
        return Array.from(this.otherPlayers.values());
    }

    getOtherPlayerCount() {
        return this.otherPlayers.size;
    }
}

// Instância global do cliente multiplayer
export const multiplayerClient = new MultiplayerClient();

// Funções de conveniência para uso global
export function connectToMultiplayer(serverUrl = null) {
    multiplayerClient.connect(serverUrl);
}

export function disconnectFromMultiplayer() {
    multiplayerClient.disconnect();
}

export function isMultiplayerConnected() {
    return multiplayerClient.isConnected();
}

export function getMultiplayerPlayerId() {
    return multiplayerClient.getPlayerId();
}

export function getOtherPlayers() {
    return multiplayerClient.getOtherPlayers();
}

export function getOtherPlayerCount() {
    return multiplayerClient.getOtherPlayerCount();
}
