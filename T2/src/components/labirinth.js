import * as THREE from '../../../build/three.module.js';

export function createMazeArea(opts = {}) {
  const {
    areaWidth = 375,
    areaDepth = 125,
    cellSize = 5,
    centerFreeSize = { width: 80, depth: 40 }, // região final livre
    wallHeight = 10,
    wallThickness = 1,
    wallColor = 0x333333,
    position = new THREE.Vector3(0, 0, 131),
    southEntrance = false,
  } = opts;

  // Grid sempre ímpar para algoritmo de labirinto tradicional
  const cols = Math.max(5, Math.floor(areaWidth / cellSize));
  const rows = Math.max(5, Math.floor(areaDepth / cellSize));
  
  const gridCols = cols % 2 === 0 ? cols - 1 : cols;
  const gridRows = rows % 2 === 0 ? rows - 1 : rows;

  // Matriz do labirinto: 0 = parede, 1 = corredor
  // Inicializar tudo como parede
  const maze = Array.from({ length: gridRows }, () => Array(gridCols).fill(0));
  
  // Helper functions
  const originX = - (gridCols * cellSize) / 2 + cellSize / 2;
  const originZ = - (gridRows * cellSize) / 2 + cellSize / 2;

  function cellToPos(i, j) {
    const x = originX + j * cellSize;
    const z = originZ + i * cellSize;
    return { x, z };
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const k = Math.floor(Math.random() * (i + 1));
      [array[i], array[k]] = [array[k], array[i]];
    }
  }

  function isValid(row, col) {
    return row >= 0 && row < gridRows && col >= 0 && col < gridCols;
  }

  // Algoritmo de geração de labirinto recursivo backtracking melhorado
  function generateMaze() {
    // Começar da entrada sul se southEntrance for true
    let startRow, startCol;
    if (southEntrance) {
      startRow = 1; // segunda linha (primeira são bordas)
      startCol = Math.floor(gridCols / 2);
      if (startCol % 2 === 0) startCol -= 1; // garantir posição ímpar
    } else {
      startRow = 1;
      startCol = 1;
    }

    const stack = [];
    maze[startRow][startCol] = 1; // marcar como corredor
    stack.push([startRow, startCol]);

    while (stack.length > 0) {
      const [currentRow, currentCol] = stack[stack.length - 1];
      
      // Direções: cima, direita, baixo, esquerda (pulando uma célula)
      const directions = [
        [-2, 0], // cima
        [0, 2],  // direita
        [2, 0],  // baixo
        [0, -2]  // esquerda
      ];
      
      shuffle(directions);
      
      let foundUnvisited = false;
      
      for (const [dRow, dCol] of directions) {
        const newRow = currentRow + dRow;
        const newCol = currentCol + dCol;
        
        if (isValid(newRow, newCol) && maze[newRow][newCol] === 0) {
          // Marcar a célula de destino como corredor
          maze[newRow][newCol] = 1;
          // Marcar a célula entre origem e destino como corredor (quebrar a parede)
          maze[currentRow + dRow / 2][currentCol + dCol / 2] = 1;
          
          stack.push([newRow, newCol]);
          foundUnvisited = true;
          break;
        }
      }
      
      if (!foundUnvisited) {
        stack.pop();
      }
    }
  }

  // Gerar o labirinto principal
  generateMaze();

  // Criar área final livre (no fundo do labirinto para ser mais desafiador)
  const finalAreaWidth = Math.max(3, Math.floor(centerFreeSize.width / cellSize));
  const finalAreaDepth = Math.max(3, Math.floor(centerFreeSize.depth / cellSize));
  
  // Posicionar área final no fundo (norte) do labirinto
  const finalStartCol = Math.floor((gridCols - finalAreaWidth) / 2);
  const finalStartRow = gridRows - finalAreaDepth - 1;

  // Limpar área final
  for (let r = finalStartRow; r < finalStartRow + finalAreaDepth; r++) {
    for (let c = finalStartCol; c < finalStartCol + finalAreaWidth; c++) {
      if (isValid(r, c)) {
        maze[r][c] = 1; // corredor livre
      }
    }
  }

  // Garantir pelo menos um caminho da entrada até a área final
  if (southEntrance) {
    const entranceCol = Math.floor(gridCols / 2);
    if (entranceCol % 2 === 0) entranceCol -= 1;
    
    // Garantir que a primeira linha (entrada sul) tenha um corredor de entrada
    maze[0][entranceCol] = 1; // entrada na primeira linha
    if (isValid(0, entranceCol - 1)) maze[0][entranceCol - 1] = 1; // expandir entrada
    if (isValid(0, entranceCol + 1)) maze[0][entranceCol + 1] = 1; // expandir entrada
    
    // Criar caminho em zigue-zague da entrada até a área final
    let currentRow = 1;
    let currentCol = entranceCol;
    let direction = 1; // 1 = direita, -1 = esquerda
    
    while (currentRow < finalStartRow - 2) {
      // Marcar posição atual como corredor
      if (isValid(currentRow, currentCol)) {
        maze[currentRow][currentCol] = 1;
      }
      
      // Mover algumas células horizontalmente (criar zigue-zague)
      const horizontalSteps = Math.floor(Math.random() * 4) + 2; // 2 a 5 passos
      for (let i = 0; i < horizontalSteps && currentCol > 2 && currentCol < gridCols - 3; i++) {
        currentCol += direction * 2;
        if (isValid(currentRow, currentCol)) {
          maze[currentRow][currentCol] = 1;
          // Conectar o caminho
          if (isValid(currentRow, currentCol - direction)) {
            maze[currentRow][currentCol - direction] = 1;
          }
        }
      }
      
      // Mover verticalmente
      const verticalSteps = Math.floor(Math.random() * 3) + 2; // 2 a 4 passos
      for (let i = 0; i < verticalSteps && currentRow < finalStartRow - 2; i++) {
        currentRow += 2;
        if (isValid(currentRow, currentCol)) {
          maze[currentRow][currentCol] = 1;
          // Conectar o caminho
          if (isValid(currentRow - 1, currentCol)) {
            maze[currentRow - 1][currentCol] = 1;
          }
        }
      }
      
      // Mudar direção para criar zigue-zague
      direction *= -1;
      
      // Adicionar alguma aleatoriedade para evitar padrões muito previsíveis
      if (Math.random() > 0.7) {
        currentCol += (Math.random() > 0.5 ? 2 : -2);
        currentCol = Math.max(1, Math.min(gridCols - 2, currentCol));
      }
    }
    
    // Conectar à área final com um caminho final
    const connectRow = finalStartRow - 1;
    if (isValid(connectRow, currentCol)) {
      maze[connectRow][currentCol] = 1;
    }
    
    // Criar conexão direta da posição final até a área central
    const finalCenterCol = Math.floor((finalStartCol + finalStartCol + finalAreaWidth) / 2);
    for (let c = Math.min(currentCol, finalCenterCol); c <= Math.max(currentCol, finalCenterCol); c++) {
      if (isValid(connectRow, c)) {
        maze[connectRow][c] = 1;
      }
    }
  }

  // Criar grupo 3D
  const group = new THREE.Group();
  group.position.copy(position);
  group.position.y = 0;

  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, metalness: 0.2, roughness: 0.9 });

  console.log('=== DEBUG MAZE ===');
  console.log('Grid size:', gridRows, 'x', gridCols);
  console.log('Cell size:', cellSize);
  console.log('Area dimensions:', areaWidth, 'x', areaDepth);
  
  // Contar células
  let wallCells = 0, corridorCells = 0;
  for (let i = 0; i < gridRows; i++) {
    for (let j = 0; j < gridCols; j++) {
      if (maze[i][j] === 0) wallCells++;
      else corridorCells++;
    }
  }
  console.log('Wall cells:', wallCells, 'Corridor cells:', corridorCells);
  
  let wallCount = 0;

  // Criar paredes conectadas usando spans horizontais e verticais
  // Primeiro passada: paredes horizontais
  for (let i = 0; i < gridRows; i++) {
    let spanStart = null;
    for (let j = 0; j < gridCols; j++) {
      const isWall = maze[i][j] === 0;
      if (isWall && spanStart === null) {
        spanStart = j;
      }
      if ((!isWall || j === gridCols - 1) && spanStart !== null) {
        let spanEnd = isWall && j === gridCols - 1 ? j : j - 1;
        const spanWidth = (spanEnd - spanStart + 1) * cellSize;
        const midCol = (spanStart + spanEnd) / 2;
        const pos = cellToPos(i, midCol);

        const wallGeom = new THREE.BoxGeometry(spanWidth, wallHeight, cellSize);
        const wallMesh = new THREE.Mesh(wallGeom, wallMat);
        wallMesh.position.set(pos.x, wallHeight / 2, pos.z);
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        group.add(wallMesh);
        wallCount++;

        spanStart = null;
      }
    }
  }

  // Segunda passada: paredes verticais (apenas para células que não foram cobertas horizontalmente)
  for (let j = 0; j < gridCols; j++) {
    let spanStart = null;
    for (let i = 0; i < gridRows; i++) {
      const isWall = maze[i][j] === 0;
      if (isWall && spanStart === null) {
        spanStart = i;
      }
      if ((!isWall || i === gridRows - 1) && spanStart !== null) {
        let spanEnd = isWall && i === gridRows - 1 ? i : i - 1;
        
        // Só criar parede vertical se não há sobreposição significativa com paredes horizontais
        if (spanEnd - spanStart >= 1) {
          const spanDepth = (spanEnd - spanStart + 1) * cellSize;
          const midRow = (spanStart + spanEnd) / 2;
          const pos = cellToPos(midRow, j);

          const wallGeom = new THREE.BoxGeometry(cellSize, wallHeight, spanDepth);
          const wallMesh = new THREE.Mesh(wallGeom, wallMat);
          wallMesh.position.set(pos.x, wallHeight / 2, pos.z);
          wallMesh.castShadow = true;
          wallMesh.receiveShadow = true;
          group.add(wallMesh);
          wallCount++;
        }

        spanStart = null;
      }
    }
  }

  console.log('Total walls created:', wallCount);
  console.log('Final group children count:', group.children.length);
  return group;
}

export function createArea4Maze(scene, collidableObjects, WORLD_CONFIG) {
  const mazeGroup = createMazeArea({
    areaWidth: 350, // Um pouco menor que os muros externos para não colidir
    areaDepth: 100,  // Um pouco menor que os muros externos
    cellSize: 8,     // Tamanho das células do labirinto
    centerFreeSize: { width: 60, depth: 30 }, // Área central livre
    wallHeight: WORLD_CONFIG.AREA_HEIGHT * 2, // Altura das paredes do labirinto
    wallThickness: 1,
    wallColor: 0x2d5a2d, // Verde escuro para combinar com o tema
    position: new THREE.Vector3(0, WORLD_CONFIG.AREA_Y_POSITION + WORLD_CONFIG.AREA_HEIGHT/2, 131),
    southEntrance: true // adicionar entrada ao sul
  });

  mazeGroup.name = "Area4Maze";
  
  // Marcar todas as paredes do labirinto como objetos colidíveis
  mazeGroup.traverse((child) => {
    if (child.isMesh) {
      collidableObjects.push(child);
    }
  });

  return mazeGroup;
}