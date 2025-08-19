# 🚀 INÍCIO RÁPIDO - MULTIPLAYER

## ⚡ Passos para Jogar em 2 Jogadores

### 1️⃣ **Iniciar o Servidor** (em um computador)

#### Windows:
```bash
# Duplo clique no arquivo:
start-multiplayer.bat
```

#### Linux/Mac:
```bash
# No terminal:
chmod +x start-multiplayer.sh
./start-multiplayer.sh
```

#### Manual:
```bash
cd T2
npm install
npm start
```

✅ **Servidor rodando na porta 8080**

---

### 2️⃣ **Conectar os Jogadores** (em até 2 computadores)

1. **Abrir o jogo** (`index.html`) em cada computador
2. **Aguardar carregamento** completo
3. **Verificar conexão** no canto superior direito
4. **Status verde** = Conectado! 🟢

---

### 3️⃣ **Jogar!** 🎮

- **Jogador 1**: Controles padrão (WASD + Mouse)
- **Jogador 2**: Controles padrão (WASD + Mouse)
- **Sincronização automática** de posição, vida, chaves, etc.

---

## 🔧 **Solução de Problemas**

### ❌ **"Servidor cheio"**
- Máximo 2 jogadores por servidor
- Aguardar alguém desconectar

### ❌ **"Conectando..." por muito tempo**
- Verificar se servidor está rodando
- Verificar IP da rede local

### ❌ **Jogadores não aparecem**
- Verificar firewall
- Testar conectividade de rede

---

## 📱 **Interface Multiplayer**

- **🟢 Conectado**: Verde
- **🔴 Desconectado**: Vermelho  
- **👥 Jogadores**: Contador atual/máximo
- **🔌 Botões**: Conectar/Desconectar manual

---

## 🌐 **Configuração de Rede**

### IP Local (exemplo):
- **Servidor**: `192.168.1.100:8080`
- **Cliente 1**: `192.168.1.101`
- **Cliente 2**: `192.168.1.102`

### Modificar IP do Servidor:
```javascript
// Em src/core/config/multiplayerConfig.js
DEFAULT_SERVER_URL: 'ws://192.168.1.100:8080'
```

---

## 🎯 **Comandos de Debug**

### No Console do Navegador:
```javascript
// Status da conexão
getMultiplayerStatus()

// Conectar manualmente
connectToMultiplayer('ws://192.168.1.100:8080')

// Desconectar
disconnectFromMultiplayer()
```

---

## 📋 **Checklist de Verificação**

- [ ] Node.js instalado
- [ ] Servidor rodando (porta 8080)
- [ ] Computadores na mesma rede
- [ ] Firewall configurado
- [ ] Jogo carregado em ambos os clientes
- [ ] Status de conexão verde
- [ ] Contador de jogadores atualizado

---

## 🆘 **Precisa de Ajuda?**

1. **Verificar logs** do servidor
2. **Verificar console** do navegador
3. **Testar conectividade** de rede
4. **Reiniciar** servidor e clientes

---

**🎮 Divirta-se jogando em multiplayer!** 🎮
