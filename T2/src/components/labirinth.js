import * as THREE from '../../../build/three.module.js';

export function createMazeArea(opts = {}) {
  const {
    areaWidth = 375,
    areaDepth = 125,
    cellSize = 5,
    centerFreeSize = { width: 80, depth: 40 }, // região central livre
    wallHeight = 10,
    wallThickness = 1,
    wallColor = 0x333333,
    position = new THREE.Vector3(0, 0, 131),
  } = opts;

  // Grid (número de células em X e Z)
  const cols = Math.max(3, Math.floor(areaWidth / cellSize));
  const rows = Math.max(3, Math.floor(areaDepth / cellSize));

  // Forçamos grid ímpar para ficar simétrico ao centro
  const gridCols = cols % 2 === 0 ? cols - 1 : cols;
  const gridRows = rows % 2 === 0 ? rows - 1 : rows;

  // Matriz de células (true = parede/visitada flag depende do algoritmo)
  // Vamos usar representação de labirinto onde cada célula corresponde a uma "célula de corredor".
  const maze = Array.from({ length: gridRows }, () => Array(gridCols).fill(0));
  // 0 = não visitada, 1 = corredor visitado

  // Helper: converte índice de célula para coordenada no espaço (centro da célula)
  const originX = - (gridCols * cellSize) / 2 + cellSize / 2;
  const originZ = - (gridRows * cellSize) / 2 + cellSize / 2;

  function cellToPos(i, j) {
    const x = originX + j * cellSize;
    const z = originZ + i * cellSize;
    return { x, z };
  }

  // Área central livre: calcular índices de células que devem permanecer livres (não gerar paredes por dentro)
  const centerCellWidth = Math.max(1, Math.floor(centerFreeSize.width / cellSize));
  const centerCellDepth = Math.max(1, Math.floor(centerFreeSize.depth / cellSize));
  const centerStartCol = Math.floor((gridCols - centerCellWidth) / 2);
  const centerStartRow = Math.floor((gridRows - centerCellDepth) / 2);

  // Marca as células centrais como já visitadas (e preservadas como espaço livre)
  for (let r = centerStartRow; r < centerStartRow + centerCellDepth; r++) {
    for (let c = centerStartCol; c < centerStartCol + centerCellWidth; c++) {
      maze[r][c] = 1; // tratado como corredor livre
    }
  }

  // Algoritmo DFS backtracker para preencher o labirinto em torno da área livre
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const k = Math.floor(Math.random() * (i + 1));
      [array[i], array[k]] = [array[k], array[i]];
    }
  }

  function inBounds(r, c) {
    return r >= 0 && r < gridRows && c >= 0 && c < gridCols;
  }

  // Escolhe um início fora da área central (procura a primeira célula não marcada)
  let startR = 0, startC = 0;
  outer:
  for (let i = 0; i < gridRows; i++) {
    for (let j = 0; j < gridCols; j++) {
      if (maze[i][j] === 0) { startR = i; startC = j; break outer; }
    }
  }

  const stack = [[startR, startC]];
  maze[startR][startC] = 1;

  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const neighbors = [];

    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    shuffle(dirs);
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      if (maze[nr][nc] === 0) neighbors.push([nr, nc]);
    }

    if (neighbors.length > 0) {
      const [nr, nc] = neighbors[Math.floor(Math.random() * neighbors.length)];
      // marca como corredor
      maze[nr][nc] = 1;
      // empilha
      stack.push([nr, nc]);
    } else {
      stack.pop();
    }
  }

  const group = new THREE.Group();
  group.position.copy(position); // posiciona o centro da área onde você queria
  group.position.y = 0; // y base (pode ajustar com WORLD_CONFIG.AREA_Y_POSITION)

  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, metalness: 0.2, roughness: 0.9 });

  for (let i = 0; i < gridRows; i++) {
    // Otimização por linha: agrupar spans contínuos
    let spanStart = null;
    for (let j = 0; j < gridCols; j++) {
      const isWall = maze[i][j] === 0;
      if (isWall && spanStart === null) spanStart = j;
      if ((!isWall || j === gridCols - 1) && spanStart !== null) {
        // se a última célula da linha é wall e j==end, precisamos ajustar fim
        let spanEnd = isWall && j === gridCols - 1 ? j : j - 1;
        const spanWidth = (spanEnd - spanStart + 1) * cellSize;
        const midCol = (spanStart + spanEnd) / 2;
        const pos = cellToPos(i, midCol);

        const wallGeom = new THREE.BoxGeometry(spanWidth - 0.02, wallHeight, cellSize - 0.02);
        const wallMesh = new THREE.Mesh(wallGeom, wallMat);
        wallMesh.position.set(pos.x, wallHeight / 2, pos.z);
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        group.add(wallMesh);

        spanStart = null;
      }
    }
  }

  for (let j = 0; j < gridCols; j++) {
    let spanStart = null;
    for (let i = 0; i < gridRows; i++) {
      const isWall = maze[i][j] === 0;
      if (isWall && spanStart === null) spanStart = i;
      if ((!isWall || i === gridRows - 1) && spanStart !== null) {
        let spanEnd = isWall && i === gridRows - 1 ? i : i - 1;
        // Criar bloco vertical que cobre spanStart..spanEnd
        const spanDepth = (spanEnd - spanStart + 1) * cellSize;
        const midRow = (spanStart + spanEnd) / 2;
        const pos = cellToPos(midRow, j);

        const wallGeom = new THREE.BoxGeometry(cellSize - 0.02, wallHeight, spanDepth - 0.02);
        const wallMesh = new THREE.Mesh(wallGeom, wallMat);
        wallMesh.position.set(pos.x, wallHeight / 2, pos.z);
        wallMesh.position.x += 0.0001; // tiny offset to avoid z-fighting
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        group.add(wallMesh);

        spanStart = null;
      }
    }
  }

  const borderGeom = new THREE.BoxGeometry(areaWidth + cellSize, wallHeight, wallThickness);
  const borderFront = new THREE.Mesh(borderGeom, wallMat);
  borderFront.position.set(0, wallHeight / 2, (areaDepth / 2) + (wallThickness / 2) - cellSize / 2);
  borderFront.castShadow = true;
  borderFront.receiveShadow = true;
  group.add(borderFront);

  const borderBack = borderFront.clone();
  borderBack.position.set(0, wallHeight / 2, - (areaDepth / 2) - (wallThickness / 2) + cellSize / 2);
  borderBack.castShadow = true;
  borderBack.receiveShadow = true;
  group.add(borderBack);

  const borderLeft = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, areaDepth + cellSize), wallMat);
  borderLeft.position.set(-(areaWidth / 2) - (wallThickness / 2) + cellSize / 2, wallHeight / 2, 0);
  borderLeft.castShadow = true;
  borderLeft.receiveShadow = true;
  group.add(borderLeft);

  const borderRight = borderLeft.clone();
  borderRight.position.set((areaWidth / 2) + (wallThickness / 2) - cellSize / 2, wallHeight / 2, 0);
  borderRight.castShadow = true;
  borderRight.receiveShadow = true;
  group.add(borderRight);

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
    position: new THREE.Vector3(0, WORLD_CONFIG.AREA_Y_POSITION + WORLD_CONFIG.AREA_HEIGHT/2, 131)
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