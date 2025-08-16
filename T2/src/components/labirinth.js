import * as THREE from 'three';

/**
 * Creates a 3D maze area.
 * @param {object} opts - The options for creating the maze.
 * @param {Array} spawnPointsArray - An array to be filled with spawn points. // <<< ALTERADO
 */
export function createMazeArea(opts = {}, spawnPointsArray = null) { // <<< ALTERADO
  const {
    areaWidth = 100,
    areaDepth = 100,
    cellSize = 10,
    centerFreeSize = {
      width: 5,
      depth: 3
    },
    wallHeight = 5,
    wallThickness = 1,
    wallColor = 0xaaaaaa,
    position = new THREE.Vector3(0, 0, 0),
    southEntrance = false,
  } = opts;

  const cols = Math.floor(areaWidth / cellSize);
  const rows = Math.floor(areaDepth / cellSize);

  const gridCols = cols % 2 === 0 ? cols - 1 : cols;
  const gridRows = rows % 2 === 0 ? rows - 1 : rows;

  const maze = Array(gridRows).fill(null).map(() => Array(gridCols).fill(0));

  function generateMaze(row, col) {
    const directions = [
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2]
    ];
    const stack = [
      [row, col]
    ];
    maze[row][col] = 1;

    function shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const k = Math.floor(Math.random() * (i + 1));
        [array[i], array[k]] = [array[k], array[i]];
      }
    }

    while (stack.length > 0) {
      const [currentRow, currentCol] = stack[stack.length - 1];
      shuffle(directions);
      let found = false;
      for (const [nextRowOffset, nextColOffset] of directions) {
        const nextRow = currentRow + nextRowOffset;
        const nextCol = currentCol + nextColOffset;
        if (nextRow >= 0 && nextRow < gridRows && nextCol >= 0 && nextCol < gridCols && maze[nextRow][nextCol] === 0) {
          maze[nextRow][nextCol] = 1;
          maze[currentRow + nextRowOffset / 2][currentCol + nextColOffset / 2] = 1;
          stack.push([nextRow, nextCol]);
          found = true;
          break;
        }
      }
      if (!found) {
        stack.pop();
      }
    }
  }

  generateMaze(1, 1);

  const finalAreaWidth = Math.floor(centerFreeSize.width / 2) * 2 + 1;
  const finalAreaDepth = Math.floor(centerFreeSize.depth / 2) * 2 + 1;
  const finalStartCol = Math.floor((gridCols - finalAreaWidth) / 2);
  const finalStartRow = Math.floor(gridRows * 0.1);

  for (let i = finalStartRow; i < finalStartRow + finalAreaDepth; i++) {
    for (let j = finalStartCol; j < finalStartCol + finalAreaWidth; j++) {
      if (i >= 0 && i < gridRows && j >= 0 && j < gridCols) {
        maze[i][j] = 1;
      }
    }
  }

  if (southEntrance) {
    let currentCol = Math.floor(gridCols / 2);
    if (currentCol % 2 === 0) currentCol++;
    let currentRow = gridRows - 1;

    for (let r = gridRows - 1; r > gridRows - 4 && r >= 0; r--) {
      maze[r][currentCol] = 1;
    }
    currentRow = gridRows - 4;

    while (currentRow > finalStartRow + finalAreaDepth) {
      const horizontalSteps = Math.floor(Math.random() * 4) + 2;
      const verticalSteps = Math.floor(Math.random() * 3) + 2;

      let direction = (currentCol < finalStartCol) ? 1 : (currentCol > finalStartCol + finalAreaWidth - 1) ? -1 : (Math.random() > 0.5 ? 1 : -1);

      for (let i = 0; i < horizontalSteps; i++) {
        if ((direction === 1 && currentCol + 1 < gridCols) || (direction === -1 && currentCol - 1 >= 0)) {
          currentCol += direction;
          maze[currentRow][currentCol] = 1;
        }
      }

      for (let i = 0; i < verticalSteps; i++) {
        if (currentRow - 1 >= 0) {
          currentRow--;
          maze[currentRow][currentCol] = 1;
        }
      }
      if (Math.random() > 0.7) {
        const randomTurn = Math.random() > 0.5 ? 1 : -1;
        if ((randomTurn === 1 && currentCol + 1 < gridCols) || (randomTurn === -1 && currentCol - 1 >= 0)) {
          currentCol += randomTurn;
          maze[currentRow][currentCol] = 1;
        }
      }
    }

    let finalCol = finalStartCol + Math.floor(finalAreaWidth / 2);
    while (currentCol !== finalCol) {
      maze[currentRow][currentCol] = 1;
      currentCol += (currentCol < finalCol) ? 1 : -1;
    }
  }

  function cellToPos(i, j) {
    return {
      x: j * cellSize - (gridCols * cellSize) / 2 + cellSize / 2,
      z: i * cellSize - (gridRows * cellSize) / 2 + cellSize / 2
    };
  }

  // <<< INÍCIO DA LÓGICA DE SPAWN POINTS (NOVO) >>>
  if (spawnPointsArray && Array.isArray(spawnPointsArray)) {
    const freeCells = [];
    for (let i = 0; i < gridRows; i++) {
        for (let j = 0; j < gridCols; j++) {
            if (maze[i][j] === 1) {
                freeCells.push({ row: i, col: j });
            }
        }
    }

    // Ponto 1: No centro da área livre
    const centerRow = finalStartRow + Math.floor(finalAreaDepth / 2);
    const centerCol = finalStartCol + Math.floor(finalAreaWidth / 2);
    const centerPoint = cellToPos(centerRow, centerCol);
    spawnPointsArray.push(new THREE.Vector3(centerPoint.x, 0, centerPoint.z));

    // Remove o ponto central da lista de células livres para não ser escolhido novamente
    const centerPointIndex = freeCells.findIndex(cell => cell.row === centerRow && cell.col === centerCol);
    if (centerPointIndex > -1) {
        freeCells.splice(centerPointIndex, 1);
    }
    
    // Pontos 2 a 5: Aleatórios em outros locais livres
    const remainingPoints = 4;
    for (let i = 0; i < remainingPoints && freeCells.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * freeCells.length);
        const randomCell = freeCells[randomIndex];
        const randomPoint = cellToPos(randomCell.row, randomCell.col);
        spawnPointsArray.push(new THREE.Vector3(randomPoint.x, 0, randomPoint.z));

        // Remove a célula escolhida para garantir que não haja duplicatas
        freeCells.splice(randomIndex, 1);
    }
  }
  // <<< FIM DA LÓGICA DE SPAWN POINTS >>>


  const group = new THREE.Group();
  group.position.copy(position);
  const material = new THREE.MeshStandardMaterial({
    color: wallColor
  });

  for (let i = 0; i < gridRows; i++) {
    for (let j = 0; j < gridCols; j++) {
      if (maze[i][j] === 0) {
        let startJ = j;
        while (j + 1 < gridCols && maze[i][j + 1] === 0) {
          j++;
        }
        const wallWidth = (j - startJ + 1) * cellSize;
        const wallPosX = startJ * cellSize - (gridCols * cellSize) / 2 + wallWidth / 2;
        const wallPosZ = i * cellSize - (gridRows * cellSize) / 2 + cellSize / 2;
        const geometry = new THREE.BoxGeometry(wallWidth, wallHeight, wallThickness);
        const wallMesh = new THREE.Mesh(geometry, material);
        wallMesh.position.set(wallPosX, wallHeight / 2, wallPosZ);
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        group.add(wallMesh);
      }
    }
  }
  for (let j = 0; j < gridCols; j++) {
    for (let i = 0; i < gridRows; i++) {
      if (maze[i][j] === 0) {
        let startI = i;
        while (i + 1 < gridRows && maze[i + 1][j] === 0) {
          i++;
        }
        if (startI === i) {
          let isHorizontalWall = false;
          if (j > 0 && maze[startI][j - 1] === 0) isHorizontalWall = true;
          if (j < gridCols - 1 && maze[startI][j + 1] === 0) isHorizontalWall = true;
          if (isHorizontalWall) continue;
        }

        const wallDepth = (i - startI + 1) * cellSize;
        const wallPosX = j * cellSize - (gridCols * cellSize) / 2 + cellSize / 2;
        const wallPosZ = startI * cellSize - (gridRows * cellSize) / 2 + wallDepth / 2;

        const geometry = new THREE.BoxGeometry(wallThickness, wallHeight, wallDepth);
        const wallMesh = new THREE.Mesh(geometry, material);
        wallMesh.position.set(wallPosX, wallHeight / 2, wallPosZ);
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        group.add(wallMesh);
      }
    }
  }

  return group;
}


/**
 * @param {THREE.Scene} scene
 * @param {Array} collidableObjects
 * @param {object} WORLD_CONFIG
 * @param {Array} outSpawnPoints - An array that will be populated with spawn points. // <<< ALTERADO
 */
export function createArea4Maze(scene, collidableObjects, WORLD_CONFIG, outSpawnPoints) { // <<< ALTERADO
  const mazeGroup = createMazeArea({
    areaWidth: 350,
    areaDepth: 100,
    cellSize: 8,
    wallHeight: 8,
    wallThickness: 8,
    wallColor: 0x228B22, // ForestGreen
    centerFreeSize: {
      width: 7,
      depth: 5
    },
    southEntrance: true,
  }, outSpawnPoints); // <<< ALTERADO: Passando o array para a função

  mazeGroup.name = "Area4Maze";

  mazeGroup.traverse((child) => {
    if (child.isMesh) {
      collidableObjects.push(child);
    }
  });

  mazeGroup.position.set(0, 0, WORLD_CONFIG.floorSize / 2 + (100) / 2);

  return mazeGroup;
}