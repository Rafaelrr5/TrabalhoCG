const WebSocket = require('ws');
const http = require('http');

class MultiplayerServer {
    constructor(port = 8080) {
        this.port = port;
        this.server = http.createServer();
        this.wss = new WebSocket.Server({ server: this.server });
        this.players = new Map(); // Map para armazenar informações dos jogadores
        this.maxPlayers = 2;
        this.gameState = {
            players: {},
            projectiles: [],
            enemies: [],
            keys: []
        };

        this.setupWebSocket();
        this.startServer();
    }

    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            console.log(`[MULTIPLAYER] Nova conexão de ${req.socket.remoteAddress}`);

            // Verificar se já atingiu o limite de jogadores
            if (this.players.size >= this.maxPlayers) {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Servidor cheio. Máximo de 2 jogadores permitido.'
                }));
                ws.close();
                return;
            }

            // Gerar ID único para o jogador
            const playerId = this.generatePlayerId();
            
            // Adicionar jogador
            this.players.set(playerId, {
                ws: ws,
                id: playerId,
                position: { x: 0, y: 150, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                health: 200,
                isAlive: true,
                keys: [],
                weapon: 'chaingun',
                lastUpdate: Date.now()
            });

            // Atualizar estado do jogo
            this.gameState.players[playerId] = {
                id: playerId,
                position: { x: 0, y: 150, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                health: 200,
                isAlive: true,
                keys: [],
                weapon: 'chaingun'
            };

            // Enviar confirmação de conexão
            ws.send(JSON.stringify({
                type: 'connected',
                playerId: playerId,
                gameState: this.gameState
            }));

                    // Notificar outros jogadores sobre o novo jogador
        // console.log(`[MULTIPLAYER] Broadcast playerJoined para outros jogadores:`, this.gameState.players[playerId]);
        this.broadcastToOthers(playerId, {
            type: 'playerJoined',
            player: this.gameState.players[playerId]
        });

            // Configurar handlers de mensagem
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleMessage(playerId, data);
                } catch (error) {
                    console.error('[MULTIPLAYER] Erro ao processar mensagem:', error);
                }
            });

            // Configurar handler de desconexão
            ws.on('close', () => {
                this.handlePlayerDisconnect(playerId);
            });

            // Configurar handler de erro
            ws.on('error', (error) => {
                console.error(`[MULTIPLAYER] Erro na conexão do jogador ${playerId}:`, error);
                this.handlePlayerDisconnect(playerId);
            });

            // console.log(`[MULTIPLAYER] Jogador ${playerId} conectado. Total: ${this.players.size}/${this.maxPlayers}`);
        });
    }

    handleMessage(playerId, data) {
        const player = this.players.get(playerId);
        if (!player) return;

        // console.log(`[MULTIPLAYER] Mensagem recebida de ${playerId}:`, data.type, data);

        switch (data.type) {
            case 'playerUpdate':
                this.updatePlayerState(playerId, data);
                break;
            case 'playerAction':
                this.handlePlayerAction(playerId, data);
                break;
            case 'projectileFired':
                this.handleProjectileFired(playerId, data);
                break;
            case 'enemyHit':
                this.handleEnemyHit(playerId, data);
                break;
            case 'keyCollected':
                this.handleKeyCollected(playerId, data);
                break;
            case 'playerDied':
                this.handlePlayerDeath(playerId, data);
                break;
            case 'playerRespawned':
                this.handlePlayerRespawn(playerId, data);
                break;
            default:
                console.log(`[MULTIPLAYER] Tipo de mensagem desconhecido: ${data.type}`);
        }
    }

    updatePlayerState(playerId, data) {
        const player = this.players.get(playerId);
        if (!player) return;

        // console.log(`[MULTIPLAYER] Atualizando estado do jogador ${playerId}:`, {
        //     position: data.position,
        //     rotation: data.rotation,
        //     health: data.health,
        //     weapon: data.weapon
        // });

        // Atualizar estado do jogador
        if (data.position) {
            player.position = data.position;
            this.gameState.players[playerId].position = data.position;
        }
        if (data.rotation) {
            player.rotation = data.rotation;
            this.gameState.players[playerId].rotation = data.rotation;
        }
        if (data.health !== undefined) {
            player.health = data.health;
            this.gameState.players[playerId].health = data.health;
        }
        if (data.weapon) {
            player.weapon = data.weapon;
            this.gameState.players[playerId].weapon = data.weapon;
        }

        player.lastUpdate = Date.now();

        // Broadcast para outros jogadores
        this.broadcastToOthers(playerId, {
            type: 'playerStateUpdate',
            playerId: playerId,
            position: player.position,
            rotation: player.rotation,
            health: player.health,
            weapon: player.weapon
        });
    }

    handlePlayerAction(playerId, data) {
        // Broadcast da ação para outros jogadores
        this.broadcastToOthers(playerId, {
            type: 'playerAction',
            playerId: playerId,
            action: data.action,
            data: data.data
        });
    }

    handleProjectileFired(playerId, data) {
        // Adicionar projétil ao estado do jogo
        const projectile = {
            id: this.generateProjectileId(),
            playerId: playerId,
            position: data.position,
            direction: data.direction,
            weapon: data.weapon,
            timestamp: Date.now()
        };

        this.gameState.projectiles.push(projectile);

        // Broadcast para todos os jogadores
        this.broadcastToAll({
            type: 'projectileFired',
            projectile: projectile
        });

        // Remover projétil após um tempo
        setTimeout(() => {
            this.removeProjectile(projectile.id);
        }, 5000);
    }

    handleEnemyHit(playerId, data) {
        console.log(`[MULTIPLAYER] Jogador ${playerId} acertou inimigo ${data.enemyId} com ${data.damage} de dano`);
        
        // Broadcast do hit para todos os jogadores
        this.broadcastToAll({
            type: 'enemyHit',
            playerId: playerId,
            enemyId: data.enemyId,
            damage: data.damage,
            position: data.position
        });
    }

    handleKeyCollected(playerId, data) {
        const player = this.players.get(playerId);
        if (!player) return;

        // Adicionar chave ao inventário do jogador
        if (!player.keys.includes(data.keyType)) {
            player.keys.push(data.keyType);
            this.gameState.players[playerId].keys = [...player.keys];
        }

        // Broadcast para todos os jogadores
        this.broadcastToAll({
            type: 'keyCollected',
            playerId: playerId,
            keyType: data.keyType,
            position: data.position
        });
    }

    handlePlayerDeath(playerId, data) {
        const player = this.players.get(playerId);
        if (!player) return;

        player.isAlive = false;
        this.gameState.players[playerId].isAlive = false;

        // Broadcast para todos os jogadores
        this.broadcastToAll({
            type: 'playerDied',
            playerId: playerId,
            position: data.position
        });
    }

    handlePlayerRespawn(playerId, data) {
        const player = this.players.get(playerId);
        if (!player) return;

        player.isAlive = true;
        player.health = 200;
        player.position = { x: 0, y: 150, z: 0 };
        player.rotation = { x: 0, y: 0, z: 0 };
        player.keys = [];

        this.gameState.players[playerId] = {
            ...this.gameState.players[playerId],
            isAlive: true,
            health: 200,
            position: { x: 0, y: 150, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            keys: []
        };

        // Broadcast para todos os jogadores
        this.broadcastToAll({
            type: 'playerRespawned',
            playerId: playerId,
            position: player.position
        });
    }

    handlePlayerDisconnect(playerId) {
        console.log(`[MULTIPLAYER] Jogador ${playerId} desconectado`);

        // Remover jogador das listas
        this.players.delete(playerId);
        delete this.gameState.players[playerId];

        // Notificar outros jogadores
        this.broadcastToAll({
            type: 'playerLeft',
            playerId: playerId
        });

        // console.log(`[MULTIPLAYER] Jogadores restantes: ${this.players.size}/${this.maxPlayers}`);
    }

    broadcastToAll(message) {
        // console.log(`[MULTIPLAYER] Broadcast para todos:`, message.type);
        this.players.forEach((player) => {
            if (player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify(message));
            }
        });
    }

    broadcastToOthers(excludePlayerId, message) {
        // console.log(`[MULTIPLAYER] Broadcast para outros (excluindo ${excludePlayerId}):`, message.type);
        let sentCount = 0;
        this.players.forEach((player, id) => {
            if (id !== excludePlayerId && player.ws.readyState === WebSocket.OPEN) {
                // console.log(`[MULTIPLAYER] Enviando mensagem ${message.type} para jogador ${id}`);
                player.ws.send(JSON.stringify(message));
                sentCount++;
            }
        });
        // console.log(`[MULTIPLAYER] Mensagem ${message.type} enviada para ${sentCount} jogador(es)`);
    }

    removeProjectile(projectileId) {
        this.gameState.projectiles = this.gameState.projectiles.filter(p => p.id !== projectileId);
    }

    generatePlayerId() {
        return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateProjectileId() {
        return 'projectile_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    startServer() {
        this.server.listen(this.port, () => {
            console.log(`[MULTIPLAYER] Servidor iniciado na porta ${this.port}`);
            console.log(`[MULTIPLAYER] Aguardando conexões... (máximo ${this.maxPlayers} jogadores)`);
        });
    }

    getServerInfo() {
        return {
            port: this.port,
            connectedPlayers: this.players.size,
            maxPlayers: this.maxPlayers,
            uptime: process.uptime()
        };
    }
}

// Iniciar servidor se este arquivo for executado diretamente
if (require.main === module) {
    const server = new MultiplayerServer();
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n[MULTIPLAYER] Encerrando servidor...');
        server.wss.close();
        server.server.close(() => {
            console.log('[MULTIPLAYER] Servidor encerrado.');
            process.exit(0);
        });
    });
}

module.exports = MultiplayerServer;
