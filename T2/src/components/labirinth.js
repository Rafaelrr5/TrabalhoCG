import * as THREE from '../../../build/three.module.js';

// A assinatura da função foi alterada para aceitar o array de spawn points
export function createMazeArea(opts = {}, spawnPointsArray = null) {
  const {
    areaWidth = 375,
    areaDepth = 125,
    cellSize = 5,
    centerFreeSize = { width: 80, depth: 40 },
    wallHeight = 10,
    wallThickness = 1,
    wallColor = 0x333333,
    position = new THREE.Vector3(0, 0, 131),
    southEntrance = false,
  } = opts;

  const cols = Math.max(5, Math.floor(areaWidth / cellSize));
  const rows = Math.max(5, Math.floor(areaDepth / cellSize));
  
  const gridCols = cols % 2 === 0 ? cols - 1 : cols;
  const gridRows = rows % 2 === 0 ? rows - 1 : rows;

  const maze = Array.from({ length: gridRows }, () => Array(gridCols).fill(0));
  
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

  function generateMaze() {
    let startRow, startCol;
    if (southEntrance) {
      startRow = 1;
      startCol = Math.floor(gridCols / 2);
      if (startCol % 2 === 0) startCol -= 1;
    } else {
      startRow = 1;
      startCol = 1;
    }

    const stack = [];
    maze[startRow][startCol] = 1;
    stack.push([startRow, startCol]);

    while (stack.length > 0) {
      const [currentRow, currentCol] = stack[stack.length - 1];
      
      const directions = [
        [-2, 0],
        [0, 2],
        [2, 0],
        [0, -2],
      ];
      
      shuffle(directions);
      
      let foundUnvisited = false;
      
      for (const [dRow, dCol] of directions) {
        const newRow = currentRow + dRow;
        const newCol = currentCol + dCol;
        
        if (isValid(newRow, newCol) && maze[newRow][newCol] === 0) {
          maze[newRow][newCol] = 1;
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

  generateMaze();

  const finalAreaWidth = Math.max(3, Math.floor(centerFreeSize.width / cellSize));
  const finalAreaDepth = Math.max(3, Math.floor(centerFreeSize.depth / cellSize));
  
  const finalStartCol = Math.floor((gridCols - finalAreaWidth) / 2);
  const finalStartRow = gridRows - finalAreaDepth - 1;

  for (let r = finalStartRow; r < finalStartRow + finalAreaDepth; r++) {
    for (let c = finalStartCol; c < finalStartCol + finalAreaWidth; c++) {
      if (isValid(r, c)) {
        maze[r][c] = 1;
      }
    }
  }

  if (southEntrance) {
    const entranceCol = Math.floor(gridCols / 2);
    if (entranceCol % 2 === 0) entranceCol -= 1;
    
    maze[0][entranceCol] = 1;
    if (isValid(0, entranceCol - 1)) maze[0][entranceCol - 1] = 1
    if (isValid(0, entranceCol + 1)) maze[0][entranceCol + 1] = 1
    
    let currentRow = 1;
    let currentCol = entranceCol;
    let direction = 1;
    
    while (currentRow < finalStartRow - 2) {
      if (isValid(currentRow, currentCol)) {
        maze[currentRow][currentCol] = 1;
      }
      
      const horizontalSteps = Math.floor(Math.random() * 4) + 2;
      for (let i = 0; i < horizontalSteps && currentCol > 2 && currentCol < gridCols - 3; i++) {
        currentCol += direction * 2;
        if (isValid(currentRow, currentCol)) {
          maze[currentRow][currentCol] = 1;
          if (isValid(currentRow, currentCol - direction)) {
            maze[currentRow][currentCol - direction] = 1;
          }
        }
      }
      
      const verticalSteps = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < verticalSteps && currentRow < finalStartRow - 2; i++) {
        currentRow += 2;
        if (isValid(currentRow, currentCol)) {
          maze[currentRow][currentCol] = 1;
          if (isValid(currentRow - 1, currentCol)) {
            maze[currentRow - 1][currentCol] = 1;
          }
        }
      }
      
      direction *= -1;
      
      if (Math.random() > 0.7) {
        currentCol += (Math.random() > 0.5 ? 2 : -2);
        currentCol = Math.max(1, Math.min(gridCols - 2, currentCol));
      }
    }
    
    const connectRow = finalStartRow - 1;
    if (isValid(connectRow, currentCol)) {
      maze[connectRow][currentCol] = 1;
    }
    
    const finalCenterCol = Math.floor((finalStartCol + finalStartCol + finalAreaWidth) / 2);
    for (let c = Math.min(currentCol, finalCenterCol); c <= Math.max(currentCol, finalCenterCol); c++) {
      if (isValid(connectRow, c)) {
        maze[connectRow][c] = 1;
      }
    }
  }

  // <<< INÍCIO DA ÚNICA PARTE ADICIONADA >>>
  if (spawnPointsArray && Array.isArray(spawnPointsArray)) {
    // 1. Criar uma lista de todas as células livres (corredores)
    const freeCells = [];
    for (let i = 0; i < gridRows; i++) {
      for (let j = 0; j < gridCols; j++) {
        if (maze[i][j] === 1) {
          freeCells.push({ row: i, col: j });
        }
      }
    }

    // 2. Encontrar e adicionar o ponto central da área livre
    const centerRow = finalStartRow + Math.floor(finalAreaDepth / 2);
    const centerCol = finalStartCol + Math.floor(finalAreaWidth / 2);
    const centerPointPos = cellToPos(centerRow, centerCol);
    spawnPointsArray.push(new THREE.Vector3(centerPointPos.x, 0, centerPointPos.z));

    // 3. Remover o ponto central da lista de candidatos para os outros pontos
    const centerPointIndex = freeCells.findIndex(cell => cell.row === centerRow && cell.col === centerCol);
    if (centerPointIndex > -1) {
      freeCells.splice(centerPointIndex, 1);
    }
    
    // 4. Escolher os 4 pontos restantes de forma aleatória da lista de células livres
    const remainingPoints = 4;
    for (let i = 0; i < remainingPoints && freeCells.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * freeCells.length);
      const randomCell = freeCells[randomIndex];
      const randomPointPos = cellToPos(randomCell.row, randomCell.col);
      spawnPointsArray.push(new THREE.Vector3(randomPointPos.x, 0, randomPointPos.z));

      // Remover a célula escolhida para garantir que não haja duplicatas
      freeCells.splice(randomIndex, 1);
    }
  }
  // <<< FIM DA ÚNICA PARTE ADICIONADA >>>

  const group = new THREE.Group();
  group.position.copy(position);
  group.position.y = 0;

  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, metalness: 0.2, roughness: 0.9 });

  console.log('=== DEBUG MAZE ===');
  console.log('Grid size:', gridRows, 'x', gridCols);
  console.log('Cell size:', cellSize);
  console.log('Area dimensions:', areaWidth, 'x', areaDepth);
  
  let wallCells = 0, corridorCells = 0;
  for (let i = 0; i < gridRows; i++) {
    for (let j = 0; j < gridCols; j++) {
      if (maze[i][j] === 0) wallCells++;
      else corridorCells++;
    }
  }
  console.log('Wall cells:', wallCells, 'Corridor cells:', corridorCells);
  
  let wallCount = 0;

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

  for (let j = 0; j < gridCols; j++) {
    let spanStart = null;
    for (let i = 0; i < gridRows; i++) {
      const isWall = maze[i][j] === 0;
      if (isWall && spanStart === null) {
        spanStart = i;
      }
      if ((!isWall || i === gridRows - 1) && spanStart !== null) {
        let spanEnd = isWall && i === gridRows - 1 ? i : i - 1;
        
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

// A assinatura da função foi alterada para aceitar e repassar o array
export function createArea4Maze(scene, collidableObjects, WORLD_CONFIG, outSpawnPoints) {
  // O array `outSpawnPoints` é passado para a função principal
  const mazeGroup = createMazeArea({
    areaWidth: 350,
    areaDepth: 100,
    cellSize: 8,
    centerFreeSize: { width: 60, depth: 30 },
    wallHeight: WORLD_CONFIG.AREA_HEIGHT * 2,
    wallThickness: 1,
    wallColor: 0x2d5a2d,
    position: new THREE.Vector3(0, WORLD_CONFIG.AREA_Y_POSITION + WORLD_CONFIG.AREA_HEIGHT/2, 131),
    southEntrance: true
  }, outSpawnPoints); // <--- AQUI

  mazeGroup.name = "Area4Maze";
  
  mazeGroup.traverse((child) => {
    if (child.isMesh) {
      collidableObjects.push(child);
    }
  });

  return mazeGroup;
}