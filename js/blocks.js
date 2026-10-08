// =============================================================================
// js/blocks.js - Definição, Propriedades e Texturas Voxel Estilizadas Ricas
// =============================================================================

// Identificadores únicos dos blocos
const BLOCK_AIR = 0;
const BLOCK_GRASS = 1;
const BLOCK_DIRT = 2;
const BLOCK_STONE = 3;
const BLOCK_WOOD = 4;
const BLOCK_LEAVES = 5;
const BLOCK_SAND = 6;
const BLOCK_COAL_ORE = 7;
const BLOCK_IRON_ORE = 8;
const BLOCK_GLASS = 9;
const BLOCK_PLANKS = 10;
const BLOCK_BRICKS = 11;
const BLOCK_WATER = 12;
const BLOCK_CRAFTING_TABLE = 13;
const BLOCK_FURNACE = 14;

// Pseudo-ruído determinístico para geração de texturas procedurais
function pseudoNoise(x, y, seed = 1) {
  const val = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return val - Math.floor(val);
}

// Cria um canvas 2D 16x16 com desenho procedural de alta resolução de estilo
function drawTile(drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, 16, 16);
  return canvas;
}

// =============================================================================
// Geradores individuais de cada textura de 16x16 (Pixel art voxel rica e estilizada)
// =============================================================================

// Tile 0: Grama Topo - Textura vibrante com tufos de grama sombreados e iluminados
const tileGrassTop = drawTile((ctx) => {
  const greens = [
    '#5ea632', '#529629', '#68b438', '#458220', '#74c23f',
    '#4b8c24', '#60a833', '#3d721b', '#6cb839'
  ];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const n = pseudoNoise(x, y, 11);
      const idx = Math.floor(n * greens.length);
      ctx.fillStyle = greens[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Detalhes estilizados de lâminas de relva
  ctx.fillStyle = '#7cd044';
  const highlights = [[2, 3], [5, 7], [10, 2], [13, 8], [7, 12], [3, 13], [12, 13]];
  highlights.forEach(([hx, hy]) => {
    ctx.fillRect(hx, hy, 1, 2);
    ctx.fillStyle = '#3f741c';
    ctx.fillRect(hx + 1, hy, 1, 2);
  });
});

// Tile 1: Grama Lado - Camada de grama irregular descendo sobre terra rica
const tileGrassSide = drawTile((ctx) => {
  // Base de terra texturizada
  const dirtColors = ['#865b38', '#784f30', '#926540', '#674226', '#59381e'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(pseudoNoise(x, y, 22) * dirtColors.length);
      ctx.fillStyle = dirtColors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Camada superior de grama com caimento ondulado natural
  const grassTones = ['#5ea632', '#529629', '#68b438', '#458220', '#74c23f'];
  for (let x = 0; x < 16; x++) {
    const depth = 3 + Math.floor(pseudoNoise(x, 1, 33) * 3);
    for (let y = 0; y < depth; y++) {
      const idx = Math.floor(pseudoNoise(x, y, 44) * grassTones.length);
      ctx.fillStyle = grassTones[idx];
      ctx.fillRect(x, y, 1, 1);
    }
    // Sombra abaixo das lâminas de grama
    ctx.fillStyle = '#4c301a';
    ctx.fillRect(x, depth, 1, 1);
  }
});

// Tile 2: Terra - Terra fértil com pequenas pedras e variações orgânicas
const tileDirt = drawTile((ctx) => {
  const dirtColors = ['#865b38', '#784f30', '#926540', '#674226', '#59381e', '#805534'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(pseudoNoise(x, y, 55) * dirtColors.length);
      ctx.fillStyle = dirtColors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Pequenas pedrinhas incrustadas na terra
  const pebbles = [[3, 4], [8, 11], [12, 5], [6, 8], [13, 13]];
  pebbles.forEach(([px, py]) => {
    ctx.fillStyle = '#9e8574';
    ctx.fillRect(px, py, 1, 1);
    ctx.fillStyle = '#4a3320';
    ctx.fillRect(px + 1, py, 1, 1);
  });
});

// Tile 3: Pedra - Textura de rocha maciça com fraturas sutis e relevo mineral
const tileStone = drawTile((ctx) => {
  const stoneColors = ['#7c7f82', '#707376', '#888b8e', '#65676a', '#5a5c5e', '#828588'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(pseudoNoise(x, y, 66) * stoneColors.length);
      ctx.fillStyle = stoneColors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Fissuras e destaques de luz
  const cracks = [[3, 3], [4, 4], [5, 4], [6, 5], [10, 8], [11, 9], [12, 9], [8, 12], [9, 13]];
  cracks.forEach(([cx, cy]) => {
    ctx.fillStyle = '#4a4b4d';
    ctx.fillRect(cx, cy, 1, 1);
    ctx.fillStyle = '#9aa0a3';
    ctx.fillRect(cx, cy - 1, 1, 1);
  });
});

// Tile 4: Areia - Areia suave de deserto com ondas e grãos quentes
const tileSand = drawTile((ctx) => {
  const sandColors = ['#dbc998', '#d0bc88', '#e5d4a4', '#c5b17b', '#deb0a2', '#d7c492'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const wave = Math.sin((x + y * 0.5) * 0.8) * 0.5;
      const n = pseudoNoise(x, y, 77) + wave * 0.2;
      const idx = Math.min(sandColors.length - 1, Math.max(0, Math.floor(n * sandColors.length)));
      ctx.fillStyle = sandColors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// Tile 5: Tronco Lateral (Casca de Carvalho com veios verticais profundos)
const tileWoodSide = drawTile((ctx) => {
  const barkColors = ['#6d4e2f', '#5e4125', '#7b5936', '#4f351d', '#86633e'];
  for (let x = 0; x < 16; x++) {
    const colBase = Math.floor(pseudoNoise(x, 0, 88) * barkColors.length);
    for (let y = 0; y < 16; y++) {
      const n = pseudoNoise(x, y, 99);
      // Ranhura vertical marcada na casca
      const isGroove = (x === 3 || x === 7 || x === 12);
      if (isGroove && (y % 6 !== 0)) {
        ctx.fillStyle = '#3e2915';
      } else {
        const cIdx = (colBase + (n > 0.6 ? 1 : 0)) % barkColors.length;
        ctx.fillStyle = barkColors[cIdx];
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// Tile 6: Tronco Topo (Anéis de crescimento e centro de cerne)
const tileWoodTop = drawTile((ctx) => {
  const ringColors = ['#ad8451', '#9a723f', '#bd935c', '#835f32'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const dx = x - 7.5;
      const dy = y - 7.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= 7) {
        ctx.fillStyle = '#5e4125'; // Casca externa
      } else {
        const ring = Math.floor(dist * 0.9 + pseudoNoise(x, y, 110) * 0.35) % ringColors.length;
        ctx.fillStyle = ringColors[ring];
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// Tile 7: Folhas - Folhagem exuberante com claraboias e sombras
const tileLeaves = drawTile((ctx) => {
  const leafColors = ['#387824', '#2d651c', '#448c2c', '#235015', '#4f9d33', '#1e4412'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(pseudoNoise(x, y, 121) * leafColors.length);
      ctx.fillStyle = leafColors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// Tile 8: Minério de Carvão - Rocha profunda incrustada com nódulos brilhantes de carvão negro
const tileCoalOre = drawTile((ctx) => {
  const stoneColors = ['#7c7f82', '#707376', '#888b8e', '#65676a'];
  const coalColors = ['#151515', '#242424', '#0d0d0d', '#2f2f2f'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const n = pseudoNoise(x, y, 132);
      if (n > 0.64) {
        const cIdx = Math.floor(pseudoNoise(x, y, 133) * coalColors.length);
        ctx.fillStyle = coalColors[cIdx];
      } else {
        const sIdx = Math.floor(n * stoneColors.length);
        ctx.fillStyle = stoneColors[sIdx];
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Brilho especular do carvão
  ctx.fillStyle = '#555555';
  [[4, 5], [10, 6], [7, 10], [12, 12]].forEach(([cx, cy]) => {
    ctx.fillRect(cx, cy, 1, 1);
  });
});

// Tile 9: Minério de Ferro - Rocha com pepitas minerais metálicas em tom bronzeado/ferroso
const tileIronOre = drawTile((ctx) => {
  const stoneColors = ['#7c7f82', '#707376', '#888b8e', '#65676a'];
  const ironColors = ['#e2bca2', '#c9987b', '#b38062', '#ffd5bc'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const n = pseudoNoise(x, y, 143);
      if (n > 0.65) {
        const iIdx = Math.floor(pseudoNoise(x, y, 144) * ironColors.length);
        ctx.fillStyle = ironColors[iIdx];
      } else {
        const sIdx = Math.floor(n * stoneColors.length);
        ctx.fillStyle = stoneColors[sIdx];
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Brilhos metálicos
  ctx.fillStyle = '#fff0e5';
  [[5, 4], [9, 7], [6, 11], [11, 10]].forEach(([ix, iy]) => {
    ctx.fillRect(ix, iy, 1, 1);
  });
});

// Tile 10: Vidro - Vidro cristalino com bordas polidas e brilho diagonal vítreo
const tileGlass = drawTile((ctx) => {
  ctx.fillStyle = 'rgba(205, 238, 255, 0.40)';
  ctx.fillRect(0, 0, 16, 16);
  // Borda nítida
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.fillRect(0, 0, 16, 1);
  ctx.fillRect(0, 15, 16, 1);
  ctx.fillRect(0, 0, 1, 16);
  ctx.fillRect(15, 0, 1, 16);
  // Brilhos e reflexos diagonais
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fillRect(2, 2, 2, 2);
  ctx.fillRect(4, 4, 2, 1);
  ctx.fillRect(10, 9, 2, 2);
  ctx.fillRect(12, 11, 1, 2);
});

// Tile 11: Tábuas de Madeira - Tábuas de carvalho encaixadas com nós e pregos
const tilePlanks = drawTile((ctx) => {
  const plankColors = ['#b88a53', '#ab7d47', '#c4955d', '#9e733e'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const plankRow = Math.floor(y / 4);
      const isSeam = (y % 4 === 0) || (plankRow % 2 === 0 && x === 8) || (plankRow % 2 === 1 && (x === 4 || x === 12));
      if (isSeam) {
        ctx.fillStyle = '#654721';
      } else {
        const n = pseudoNoise(x, y, 155);
        ctx.fillStyle = plankColors[Math.floor(n * plankColors.length)];
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// Tile 12: Tijolos - Alvenaria de tijolos de terracota assentados com argamassa
const tileBricks = drawTile((ctx) => {
  const brickColors = ['#a04a37', '#93402e', '#ad5441', '#823727'];
  const mortarColor = '#c7bca9';
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const row = Math.floor(y / 4);
      const isHorizMortar = (y % 4 === 0);
      const isVertMortar = (row % 2 === 0 ? x % 8 === 0 : (x + 4) % 8 === 0);
      if (isHorizMortar || isVertMortar) {
        ctx.fillStyle = mortarColor;
      } else {
        const idx = Math.floor(pseudoNoise(x, y, 166) * brickColors.length);
        ctx.fillStyle = brickColors[idx];
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// Tile 13: Água - Água cristalina estilizada com gradientes ondulados
const tileWater = drawTile((ctx) => {
  const waterColors = ['#2979ff', '#1e88e5', '#3d8bfd', '#1565c0'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(pseudoNoise(x, y, 177) * waterColors.length);
      ctx.fillStyle = waterColors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// Tile 14: Bancada Lateral - Bancada com madeira e silhuetas de ferramentas
const tileCraftingTableSide = drawTile((ctx) => {
  const plankColors = ['#b88a53', '#ab7d47', '#c4955d', '#9e733e'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const n = pseudoNoise(x, y, 188);
      ctx.fillStyle = plankColors[Math.floor(n * plankColors.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.fillStyle = '#614322';
  ctx.fillRect(0, 0, 16, 2);
  ctx.fillRect(0, 14, 16, 2);
  ctx.fillRect(0, 0, 2, 16);
  ctx.fillRect(14, 0, 2, 16);
  // Ferramentas penduradas
  ctx.fillStyle = '#8c8f92';
  ctx.fillRect(4, 5, 2, 7);
  ctx.fillRect(3, 7, 1, 4);
  ctx.fillStyle = '#5c3917';
  ctx.fillRect(4, 3, 2, 2);
  ctx.fillStyle = '#5c3917';
  ctx.fillRect(10, 5, 2, 7);
  ctx.fillStyle = '#727578';
  ctx.fillRect(9, 4, 4, 3);
});

// Tile 15: Bancada Topo - Grade quadriculada 3x3 e reforços de canto
const tileCraftingTableTop = drawTile((ctx) => {
  const woodColors = ['#9e733e', '#ab7d47', '#b88a53'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      ctx.fillStyle = woodColors[Math.floor(pseudoNoise(x, y, 199) * woodColors.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.fillStyle = '#614322';
  ctx.fillRect(0, 0, 16, 1);
  ctx.fillRect(0, 15, 16, 1);
  ctx.fillRect(0, 0, 1, 16);
  ctx.fillRect(15, 0, 1, 16);
  ctx.fillStyle = '#503519';
  ctx.fillRect(6, 2, 1, 12);
  ctx.fillRect(10, 2, 1, 12);
  ctx.fillRect(2, 6, 12, 1);
  ctx.fillRect(2, 10, 12, 1);
  ctx.fillStyle = '#d4a373';
  ctx.fillRect(3, 3, 2, 2);
  ctx.fillRect(12, 3, 2, 2);
  ctx.fillRect(3, 12, 2, 2);
  ctx.fillRect(12, 12, 2, 2);
});

// Tile 16: Fornalha Frente (Inativa) - Pedra talhada com abertura em arco e grelha de ferro
const tileFurnaceFront = drawTile((ctx) => {
  // Base de pedra
  const stoneColors = ['#7c7f82', '#707376', '#888b8e', '#65676a'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      ctx.fillStyle = stoneColors[Math.floor(pseudoNoise(x, y, 211) * stoneColors.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Borda externa reforçada
  ctx.fillStyle = '#4a4c4e';
  ctx.fillRect(0, 0, 16, 1);
  ctx.fillRect(0, 15, 16, 1);
  ctx.fillRect(0, 0, 1, 16);
  ctx.fillRect(15, 0, 1, 16);

  // Abertura da fornalha (Câmara de combustão)
  ctx.fillStyle = '#1c1c1c';
  ctx.fillRect(3, 5, 10, 8);
  ctx.fillStyle = '#111111';
  ctx.fillRect(4, 6, 8, 6);

  // Arco superior de pedra
  ctx.fillStyle = '#4a4c4e';
  ctx.fillRect(3, 4, 10, 1);
  ctx.fillRect(4, 3, 8, 1);

  // Grelha de ferro no fundo
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(5, 8, 6, 1);
  ctx.fillRect(5, 10, 6, 1);
  ctx.fillRect(6, 7, 1, 4);
  ctx.fillRect(9, 7, 1, 4);
});

// Tile 17: Fornalha Lado / Trás - Pedra talhada com ranhuras de ventilação térmica
const tileFurnaceSide = drawTile((ctx) => {
  const stoneColors = ['#7c7f82', '#707376', '#888b8e', '#65676a'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      ctx.fillStyle = stoneColors[Math.floor(pseudoNoise(x, y, 222) * stoneColors.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Moldura chanfrada de pedra
  ctx.fillStyle = '#4e5052';
  ctx.fillRect(1, 1, 14, 1);
  ctx.fillRect(1, 14, 14, 1);
  ctx.fillRect(1, 1, 1, 14);
  ctx.fillRect(14, 1, 1, 14);
  // Fissuras horizontais sutis
  ctx.fillStyle = '#424446';
  ctx.fillRect(3, 5, 10, 1);
  ctx.fillRect(3, 10, 10, 1);
});

// Tile 18: Fornalha Topo - Placa de pedra com borda biselada
const tileFurnaceTop = drawTile((ctx) => {
  const stoneColors = ['#7c7f82', '#707376', '#888b8e', '#65676a'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      ctx.fillStyle = stoneColors[Math.floor(pseudoNoise(x, y, 233) * stoneColors.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Borda chanfrada de topo
  ctx.fillStyle = '#9aa0a3';
  ctx.fillRect(0, 0, 16, 1);
  ctx.fillRect(0, 0, 1, 16);
  ctx.fillStyle = '#4a4c4e';
  ctx.fillRect(0, 15, 16, 1);
  ctx.fillRect(15, 0, 1, 16);
});

// =============================================================================
// Texture Atlas (6 colunas x 6 linhas = 36 slots, 96x96 px)
// =============================================================================
const ALL_TILES = [
  tileGrassTop,           // 0
  tileGrassSide,          // 1
  tileDirt,               // 2
  tileStone,              // 3
  tileSand,               // 4
  tileWoodSide,           // 5
  tileWoodTop,            // 6
  tileLeaves,             // 7
  tileCoalOre,            // 8
  tileIronOre,            // 9
  tileGlass,              // 10
  tilePlanks,             // 11
  tileBricks,             // 12
  tileWater,              // 13
  tileCraftingTableSide,  // 14
  tileCraftingTableTop,   // 15
  tileFurnaceFront,       // 16
  tileFurnaceSide,        // 17
  tileFurnaceTop          // 18
];

const ATLAS_COLS = 6;
const ATLAS_ROWS = 6;
const TILE_PX = 16;
const atlasCanvas = document.createElement('canvas');
atlasCanvas.width = ATLAS_COLS * TILE_PX;
atlasCanvas.height = ATLAS_ROWS * TILE_PX;
const atlasCtx = atlasCanvas.getContext('2d');

ALL_TILES.forEach((tileCanvas, i) => {
  const col = i % ATLAS_COLS;
  const row = Math.floor(i / ATLAS_COLS);
  atlasCtx.drawImage(tileCanvas, col * TILE_PX, row * TILE_PX);
});

// Textura Three.js otimizada para voxel pixel-perfect
const atlasTexture = new THREE.CanvasTexture(atlasCanvas);
atlasTexture.magFilter = THREE.NearestFilter;
atlasTexture.minFilter = THREE.NearestFilter;
atlasTexture.generateMipmaps = false;

// Materiais reutilizáveis
const BLOCK_MATERIAL_OPAQUE = new THREE.MeshLambertMaterial({
  map: atlasTexture,
  transparent: false,
  alphaTest: 0.5
});

const BLOCK_MATERIAL_TRANSPARENT = new THREE.MeshLambertMaterial({
  map: atlasTexture,
  transparent: true,
  opacity: 0.72,
  depthWrite: false,
  side: THREE.DoubleSide
});

// =============================================================================
// Definições de cada bloco (Propriedades, Colisão, Drops, Texturas)
// =============================================================================

// Mapeamento das 6 faces: [+X, -X, +Y, -Y, +Z, -Z]
const BLOCK_TYPES = {
  [BLOCK_AIR]: {
    id: BLOCK_AIR,
    name: 'Ar',
    solid: false,
    transparent: true,
    isLiquid: false,
    breakable: false,
    hardness: 0,
    dropItem: null,
    tiles: [0, 0, 0, 0, 0, 0]
  },
  [BLOCK_GRASS]: {
    id: BLOCK_GRASS,
    name: 'Grama',
    solid: true,
    transparent: false,
    isLiquid: false,
    breakable: true,
    hardness: 0.6,
    preferredTool: 'shovel',
    dropItem: BLOCK_DIRT,
    tiles: [1, 1, 0, 2, 1, 1],
    iconTile: 1
  },
  [BLOCK_DIRT]: {
    id: BLOCK_DIRT,
    name: 'Terra',
    solid: true,
    transparent: false,
    isLiquid: false,
    breakable: true,
    hardness: 0.6,
    preferredTool: 'shovel',
    dropItem: BLOCK_DIRT,
    tiles: [2, 2, 2, 2, 2, 2],
    iconTile: 2
  },
  [BLOCK_STONE]: {
    id: BLOCK_STONE,
    name: 'Pedra',
    solid: true,
    transparent: false,
    isLiquid: false,
    breakable: true,
    hardness: 2.2,
    preferredTool: 'pickaxe',
    requiredHarvestLevel: 1,
    dropItem: BLOCK_STONE,
    tiles: [3, 3, 3, 3, 3, 3],
    iconTile: 3
  },
  [BLOCK_WOOD]: {
    id: BLOCK_WOOD,
    name: 'Tronco de Madeira',
    solid: true,
    transparent: false,
    isLiquid: false,
    breakable: true,
    hardness: 2.0,
    preferredTool: 'axe',
    dropItem: BLOCK_WOOD,
    tiles: [5, 5, 6, 6, 5, 5],
    iconTile: 5
  },
  [BLOCK_LEAVES]: {
    id: BLOCK_LEAVES,
    name: 'Folhas',
    solid: true,
    transparent: false,
    isLiquid: false,
    breakable: true,
    hardness: 0.25,
    preferredTool: null,
    dropItem: BLOCK_LEAVES,
    tiles: [7, 7, 7, 7, 7, 7],
    iconTile: 7
  },
  [BLOCK_SAND]: {
    id: BLOCK_SAND,
    name: 'Areia',
    solid: true,
    transparent: false,
    isLiquid: false,
    breakable: true,
    hardness: 0.5,
    preferredTool: 'shovel',
    dropItem: BLOCK_SAND,
    tiles: [4, 4, 4, 4, 4, 4],
    iconTile: 4
  },
  [BLOCK_COAL_ORE]: {
    id: BLOCK_COAL_ORE,
    name: 'Minério de Carvão',
    solid: true,
    transparent: false,
    isLiquid: false,
    breakable: true,
    hardness: 3.0,
    preferredTool: 'pickaxe',
    requiredHarvestLevel: 1,
    dropItem: null, // Dropa ITEM_COAL em mining.js
    tiles: [8, 8, 8, 8, 8, 8],
    iconTile: 8
  },
  [BLOCK_IRON_ORE]: {
    id: BLOCK_IRON_ORE,
    name: 'Minério de Ferro',
    solid: true,
    transparent: false,
    isLiquid: false,
    breakable: true,
    hardness: 3.5,
    preferredTool: 'pickaxe',
    requiredHarvestLevel: 2,
    dropItem: BLOCK_IRON_ORE,
    tiles: [9, 9, 9, 9, 9, 9],
    iconTile: 9
  },
  [BLOCK_GLASS]: {
    id: BLOCK_GLASS,
    name: 'Vidro',
    solid: true,
    transparent: true,
    isLiquid: false,
    breakable: true,
    hardness: 0.35,
    preferredTool: null,
    dropItem: BLOCK_GLASS,
    tiles: [10, 10, 10, 10, 10, 10],
    iconTile: 10
  },
  [BLOCK_PLANKS]: {
    id: BLOCK_PLANKS,
    name: 'Tábuas de Madeira',
    solid: true,
    transparent: false,
    isLiquid: false,
    breakable: true,
    hardness: 1.8,
    preferredTool: 'axe',
    dropItem: BLOCK_PLANKS,
    tiles: [11, 11, 11, 11, 11, 11],
    iconTile: 11
  },
  [BLOCK_BRICKS]: {
    id: BLOCK_BRICKS,
    name: 'Tijolos',
    solid: true,
    transparent: false,
    isLiquid: false,
    breakable: true,
    hardness: 2.5,
    preferredTool: 'pickaxe',
    requiredHarvestLevel: 1,
    dropItem: BLOCK_BRICKS,
    tiles: [12, 12, 12, 12, 12, 12],
    iconTile: 12
  },
  [BLOCK_WATER]: {
    id: BLOCK_WATER,
    name: 'Água',
    solid: false,
    transparent: true,
    isLiquid: true,
    breakable: false,
    hardness: 0,
    dropItem: null,
    tiles: [13, 13, 13, 13, 13, 13],
    iconTile: 13
  },
  [BLOCK_CRAFTING_TABLE]: {
    id: BLOCK_CRAFTING_TABLE,
    name: 'Bancada de Trabalho',
    solid: true,
    transparent: false,
    isLiquid: false,
    breakable: true,
    hardness: 2.2,
    preferredTool: 'axe',
    dropItem: BLOCK_CRAFTING_TABLE,
    tiles: [14, 14, 15, 11, 14, 14],
    iconTile: 15
  },
  [BLOCK_FURNACE]: {
    id: BLOCK_FURNACE,
    name: 'Fornalha',
    solid: true,
    transparent: false,
    isLiquid: false,
    breakable: true,
    hardness: 2.8,
    preferredTool: 'pickaxe',
    requiredHarvestLevel: 1,
    dropItem: BLOCK_FURNACE,
    // [ +X: Lado(17), -X: Lado(17), +Y: Topo(18), -Y: Fundo Pedra(3), +Z: Frente(16), -Z: Lado(17) ]
    tiles: [17, 17, 18, 3, 16, 17],
    iconTile: 16
  }
};

// Cache de DataURLs para renderizar ícones na UI rapidamente
const BLOCK_ICON_CACHE = {};

function getBlockIconDataUrl(id) {
  if (id === undefined || id === null) return '';

  if (id >= 100) {
    if (typeof getItemIconDataUrl === 'function') {
      return getItemIconDataUrl(id);
    }
    if (window.getItemIconDataUrl) {
      return window.getItemIconDataUrl(id);
    }
  }

  if (BLOCK_ICON_CACHE[id]) return BLOCK_ICON_CACHE[id];

  const def = BLOCK_TYPES[id];
  if (!def || def.iconTile === undefined) return '';

  const tileIdx = def.iconTile;
  const canvas = ALL_TILES[tileIdx];
  if (canvas) {
    BLOCK_ICON_CACHE[id] = canvas.toDataURL();
    return BLOCK_ICON_CACHE[id];
  }
  return '';
}

// Helper para calcular UVs de uma face no Texture Atlas (6x6)
function getTileUVs(tileIdx) {
  const col = tileIdx % ATLAS_COLS;
  const row = Math.floor(tileIdx / ATLAS_COLS);

  const uMin = col / ATLAS_COLS;
  const uMax = (col + 1) / ATLAS_COLS;
  const vMin = 1 - (row + 1) / ATLAS_ROWS;
  const vMax = 1 - row / ATLAS_ROWS;

  return { uMin, uMax, vMin, vMax };
}

// Global scope
window.BLOCK_AIR = BLOCK_AIR;
window.BLOCK_GRASS = BLOCK_GRASS;
window.BLOCK_DIRT = BLOCK_DIRT;
window.BLOCK_STONE = BLOCK_STONE;
window.BLOCK_WOOD = BLOCK_WOOD;
window.BLOCK_LEAVES = BLOCK_LEAVES;
window.BLOCK_SAND = BLOCK_SAND;
window.BLOCK_COAL_ORE = BLOCK_COAL_ORE;
window.BLOCK_IRON_ORE = BLOCK_IRON_ORE;
window.BLOCK_GLASS = BLOCK_GLASS;
window.BLOCK_PLANKS = BLOCK_PLANKS;
window.BLOCK_BRICKS = BLOCK_BRICKS;
window.BLOCK_WATER = BLOCK_WATER;
window.BLOCK_CRAFTING_TABLE = BLOCK_CRAFTING_TABLE;
window.BLOCK_FURNACE = BLOCK_FURNACE;
window.BLOCK_TYPES = BLOCK_TYPES;
window.getBlockIconDataUrl = getBlockIconDataUrl;
window.getTileUVs = getTileUVs;
