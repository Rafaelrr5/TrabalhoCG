# Teste de Carregamento do Skull

Este exemplo demonstra como usar o `skullLoader.js` para carregar e manipular o modelo 3D do skull.

## Arquivos

- `skull-test.html` - Interface HTML com controles
- `skull-test.js` - Lógica principal do exemplo
- `src/utils/skullLoader.js` - Loader do modelo skull

## Como usar

1. Abra o arquivo `skull-test.html` em um navegador web
2. O modelo do skull será carregado automaticamente
3. Use os controles na interface para manipular o skull

## Controles da Interface

### Sliders
- **Posição X/Y/Z**: Move o skull no espaço 3D
- **Rotação X/Y/Z**: Rotaciona o skull nos eixos
- **Escala**: Altera o tamanho do skull

### Botões
- **Reset**: Volta o skull para a posição inicial
- **Animar**: Ativa/desativa animação automática

### Controles de Teclado
- **WASD**: Move o skull horizontalmente
- **Q/E**: Move o skull verticalmente
- **R**: Reset para posição inicial
- **Space**: Toggle da animação
- **Mouse**: Controla a câmera (clique e arraste + scroll)

## Funcionalidades Demonstradas

1. **Carregamento do modelo**: Usa `loadSkullModel()` para carregar o skull
2. **Pré-carregamento**: Demonstra `preloadSkullModel()` para performance
3. **Manipulação em tempo real**: Posição, rotação e escala
4. **Animação procedural**: Movimento automático suave
5. **Controles de câmera**: OrbitControls para visualização
6. **Iluminação**: Luz ambiente, direcional e pontual
7. **Sombras**: Habilitadas para realismo
8. **Fallback**: Usa modelo alternativo se o carregamento falhar

## Estrutura da Cena

- **Skull**: Modelo principal carregado
- **Plano de referência**: Grid no chão
- **Luzes**: Múltiplas fontes de iluminação
- **Câmera**: Com controles de órbita

## Informações Técnicas

- **Engine**: Three.js
- **Loader**: OBJLoader + MTLLoader
- **Materiais**: Suporte a texturas e propriedades PBR
- **Sombras**: PCFSoftShadowMap
- **Controles**: OrbitControls para câmera

## Troubleshooting

- Se o skull não carregar, verifique se os arquivos existem em:
  - `assets/models/skull.obj`
  - `assets/textures/skull.mtl`
- Verifique o console do navegador para erros
- O sistema usa fallback automático se o modelo não carregar

## Exemplo de Uso Programático

```javascript
import { loadSkullModel, preloadSkullModel } from './src/utils/skullLoader.js';

// Pré-carregar para performance
await preloadSkullModel();

// Carregar e usar
const skull = await loadSkullModel();
skull.position.set(0, 0, 0);
skull.scale.setScalar(0.5);
scene.add(skull);
```
