# Trabalho T2 - Computação Gráfica

Jogar: https://rafaelrr5.github.io/TrabalhoCG/T2/

### Controles

| Tecla | Ação |
|---|---|
| W A S D / setas | mover |
| Shift | correr |
| Espaço | pular |
| Mouse | mirar / atirar |
| 1, 2 ou roda | trocar arma |
| Esc | pausar |
| Q | som on/off |
| G | modo deus |
| C | todas as chaves |

Objetivo: limpar o templo (chave vermelha), abrir a porta azul, limpar a arena (chave amarela),
abrir o hangar (chave azul), derrubar as muralhas da Área 4 e derrotar o Pain Elemental no labirinto.
O HUD mostra o objetivo atual.

`?debug` na URL expõe `window.__game` para testes automatizados.

### 📁 Estrutura do Projeto

```
T2/
├── 📄 index.html              # Arquivo principal HTML
├── 📄 README.md              # Documentação do projeto
├── 📁 src/                   # Código fonte
│   ├── 📁 core/              # Núcleo do jogo
│   │   ├── main.js           # Arquivo principal do jogo
│   │   └── config.js         # Configurações globais
│   ├── 📁 entities/          # Entidades do jogo
│   │   ├── 📄 index.js       # Exportações principais
│   │   ├── 📁 player/        # Sistema do jogador
│   │   │   ├── player.js     # Lógica do jogador
│   │   │   └── index.js      # Exportações do jogador
│   │   └── 📁 enemies/       # Sistema de inimigos
│   │       ├── 📄 index.js   # Exportações de inimigos
│   │       ├── 📄 enemy.js   # Gerenciador de inimigos
│   │       ├── 📁 base/      # Classes base de inimigos
│   │       │   ├── enemies.js # Classe Enemy base
│   │       │   └── index.js  # Exportações base
│   │       └── 📁 types/     # Tipos específicos de inimigos
│   │           ├── lostSoul.js # Inimigo Lost Soul
│   │           └── index.js  # Exportações de tipos
│   ├── 📁 systems/           # Sistemas do jogo
│   │   ├── controls.js       # Sistema de controles
│   │   ├── collision.js      # Sistema de colisão
│   │   ├── environment.js    # Sistema de ambiente
│   │   └── enemyManager.js   # Gerenciador de inimigos
│   ├── 📁 components/        # Componentes reutilizáveis
│   │   └── weapon.js         # Sistema de armas
│   └── 📁 utils/             # Utilitários
│       └── skullLoader.js    # Carregador de modelos 3D
└── 📁 assets/                # Recursos do jogo
    ├── 📁 models/            # Modelos 3D
    │   ├── cacodemon.glb     # Modelo do inimigo
    │   └── skull.obj         # Modelo do crânio
    ├── 📁 textures/          # Texturas
    │   ├── chaingun.png      # Textura da arma
    │   ├── skull.mtl         # Material do crânio
    │   ├── skull_blood_BaseColor.png
    │   ├── skull_blood_Metallic.png
    │   ├── skull_blood_Normal.png
    │   └── skull_Roughness.png
    └── 📁 sounds/            # Sons (vazia por enquanto)
```

### 🎮 Como Executar

1. **Servir o projeto**: Use um servidor local (como Live Server do VS Code)
2. **Abrir**: Navegue até `index.html`
3. **Jogar**: Clique na tela para ativar os controles

### 🎯 Organização do Código

- **Core**: Configurações e inicialização principal
- **Entities**: Objetos do jogo organizados por categoria
  - **Player**: Sistema completo do jogador
  - **Enemies**: Sistema de inimigos hierárquico
    - **Base**: Classes fundamentais (Enemy, futuramente Key)
    - **Types**: Implementações específicas (LostSoul etc.)
- **Systems**: Sistemas que processam lógica (colisão, controles)
- **Components**: Componentes reutilizáveis (armas)
- **Utils**: Utilitários e helpers
- **Assets**: Recursos estáticos organizados por tipo