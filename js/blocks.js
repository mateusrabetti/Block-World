// =============================================================================
// js/blocks.js - Definição, Propriedades e Texturas Procedurais dos Blocos
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

// Pseudo-ruído determinístico para geração de texturas procedurais
function pseudoNoise(x, y, seed = 1) {
  const val = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return val - Math.floor(val);
}

// Cria um canvas 2D 16x16 com desenho procedural
function drawTile(drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, 16, 16);
  return canvas;
}

// =============================================================================
// Geradores individuais de cada textura de 16x16
// =============================================================================

// Tile 0: Grama Topo
const tileGrassTop = drawTile((ctx) => {
  const colors = ['#5a9632', '#4e8629', '#63a637', '#427421', '#6bb33c'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(pseudoNoise(x, y, 11) * colors.length);
      ctx.fillStyle = colors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// Tile 1: Grama Lado
const tileGrassSide = drawTile((ctx) => {
  const dirtColors = ['#866043', '#77543a', '#91694a', '#6c4b32', '#5e402a'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(pseudoNoise(x, y, 22) * dirtColors.length);
      ctx.fillStyle = dirtColors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const grassColors = ['#5a9632', '#4e8629', '#63a637', '#427421'];
  for (let x = 0; x < 16; x++) {
    const grassDepth = 3 + Math.floor(pseudoNoise(x, 1, 33) * 3);
    for (let y = 0; y < grassDepth; y++) {
      const idx = Math.floor(pseudoNoise(x, y, 44) * grassColors.length);
      ctx.fillStyle = grassColors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// Tile 2: Terra
const tileDirt = drawTile((ctx) => {
  const dirtColors = ['#866043', '#77543a', '#91694a', '#6c4b32', '#5e402a'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(pseudoNoise(x, y, 55) * dirtColors.length);
      ctx.fillStyle = dirtColors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// Tile 3: Pedra
const tileStone = drawTile((ctx) => {
  const stoneColors = ['#7f8285', '#727578', '#8c8f92', '#646769', '#5b5d5f'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(pseudoNoise(x, y, 66) * stoneColors.length);
      ctx.fillStyle = stoneColors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// Tile 4: Areia
const tileSand = drawTile((ctx) => {
  const sandColors = ['#d9cb9e', '#cfbf8d', '#e5d8af', '#c4b37d', '#dfd2a5'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(pseudoNoise(x, y, 77) * sandColors.length);
      ctx.fillStyle = sandColors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// Tile 5: Tronco Lateral (Wood Bark)
const tileWoodSide = drawTile((ctx) => {
  const barkColors = ['#6e5233', '#5d4428', '#7c5d3b', '#513a21', '#886742'];
  for (let x = 0; x < 16; x++) {
    const baseColIdx = Math.floor(pseudoNoise(x, 0, 88) * barkColors.length);
    for (let y = 0; y < 16; y++) {
      const noise = pseudoNoise(x, y, 99);
      const colIdx = (baseColIdx + (noise > 0.6 ? 1 : (noise < 0.2 ? -1 : 0)) + barkColors.length) % barkColors.length;
      ctx.fillStyle = barkColors[colIdx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// Tile 6: Tronco Topo (Wood Rings)
const tileWoodTop = drawTile((ctx) => {
  const ringColors = ['#a57e4e', '#916d40', '#b68c59', '#7c5b33'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const dx = x - 7.5;
      const dy = y - 7.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ring = Math.floor(dist * 0.9 + pseudoNoise(x, y, 110) * 0.4) % ringColors.length;
      ctx.fillStyle = ringColors[ring];
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// Tile 7: Folhas
const tileLeaves = drawTile((ctx) => {
  const leafColors = ['#3d7a27', '#32681e', '#499030', '#285417', '#54a337'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const idx = Math.floor(pseudoNoise(x, y, 121) * leafColors.length);
      ctx.fillStyle = leafColors[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// Tile 8: Minério de Carvão
const tileCoalOre = drawTile((ctx) => {
  const stoneColors = ['#7f8285', '#727578', '#8c8f92', '#646769', '#5b5d5f'];
  const coalColors = ['#1a1a1a', '#292929', '#111111'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const n = pseudoNoise(x, y, 132);
      if (n > 0.65) {
        const cIdx = Math.floor(pseudoNoise(x, y, 133) * coalColors.length);
        ctx.fillStyle = coalColors[cIdx];
      } else {
        const sIdx = Math.floor(n * stoneColors.length);
        ctx.fillStyle = stoneColors[sIdx];
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// Tile 9: Minério de Ferro
const tileIronOre = drawTile((ctx) => {
  const stoneColors = ['#7f8285', '#727578', '#8c8f92', '#646769', '#5b5d5f'];
  const ironColors = ['#d8af93', '#bc8b6c', '#a67252'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const n = pseudoNoise(x, y, 143);
      if (n > 0.68) {
        const iIdx = Math.floor(pseudoNoise(x, y, 144) * ironColors.length);
        ctx.fillStyle = ironColors[iIdx];
      } else {
        const sIdx = Math.floor(n * stoneColors.length);
        ctx.fillStyle = stoneColors[sIdx];
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// Tile 10: Vidro
const tileGlass = drawTile((ctx) => {
  ctx.fillStyle = 'rgba(195, 235, 255, 0.45)';
  ctx.fillRect(0, 0, 16, 16);
  // Borda sutil
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillRect(0, 0, 16, 1);
  ctx.fillRect(0, 0, 1, 16);
  ctx.fillRect(15, 0, 1, 16);
  ctx.fillRect(0, 15, 16, 1);
  // Brilho diagonal
  ctx.fillRect(3, 3, 2, 2);
  ctx.fillRect(4, 5, 2, 2);
  ctx.fillRect(11, 10, 2, 2);
});

// Tile 11: Tábuas de Madeira (Planks)
const tilePlanks = drawTile((ctx) => {
  const plankColors = ['#b88a53', '#ab7d47', '#c4955d', '#9e733e'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const plankRow = Math.floor(y / 4);
      const isSeam = (y % 4 === 0) || (plankRow % 2 === 0 && x === 8) || (plankRow % 2 === 1 && (x === 4 || x === 12));
      if (isSeam) {
        ctx.fillStyle = '#6e4f27';
      } else {
        const n = pseudoNoise(x, y, 155);
        const idx = Math.floor(n * plankColors.length);
        ctx.fillStyle = plankColors[idx];
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
});

// Tile 12: Tijolos (Bricks)
const tileBricks = drawTile((ctx) => {
  const brickColors = ['#9c4938', '#8f3e2e', '#a85240', '#7e3526'];
  const mortarColor = '#c4b7a6';
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

// Tile 13: Água
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

// Tile 14: Bancada Lateral (Crafting Table Side)
const tileCraftingTableSide = drawTile((ctx) => {
  // Base de tábuas de carvalho
  const plankColors = ['#b88a53', '#ab7d47', '#c4955d', '#9e733e'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const n = pseudoNoise(x, y, 188);
      ctx.fillStyle = plankColors[Math.floor(n * plankColors.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Borda escura reforçada
  ctx.fillStyle = '#614322';
  ctx.fillRect(0, 0, 16, 2);
  ctx.fillRect(0, 14, 16, 2);
  ctx.fillRect(0, 0, 2, 16);
  ctx.fillRect(14, 0, 2, 16);

  // Silhueta de ferramentas penduradas (serrote e tesoura / martelo)
  // Serrote à esquerda
  ctx.fillStyle = '#8c8f92';
  ctx.fillRect(4, 5, 2, 7);
  ctx.fillRect(3, 7, 1, 4);
  ctx.fillStyle = '#5c3917'; // cabo
  ctx.fillRect(4, 3, 2, 2);

  // Martelo à direita
  ctx.fillStyle = '#5c3917'; // cabo
  ctx.fillRect(10, 5, 2, 7);
  ctx.fillStyle = '#727578'; // cabeça de pedra/ferro
  ctx.fillRect(9, 4, 4, 3);
});

// Tile 15: Bancada Topo (Crafting Table Top - Grade 3x3 e detalhes)
const tileCraftingTableTop = drawTile((ctx) => {
  // Base de madeira
  const woodColors = ['#9e733e', '#ab7d47', '#b88a53'];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const n = pseudoNoise(x, y, 199);
      ctx.fillStyle = woodColors[Math.floor(n * woodColors.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Borda reforçada
  ctx.fillStyle = '#614322';
  ctx.fillRect(0, 0, 16, 1);
  ctx.fillRect(0, 15, 16, 1);
  ctx.fillRect(0, 0, 1, 16);
  ctx.fillRect(15, 0, 1, 16);

  // Grade de 3x3 central
  ctx.fillStyle = '#503519';
  // Linhas verticais da grade
  ctx.fillRect(6, 2, 1, 12);
  ctx.fillRect(10, 2, 1, 12);
  // Linhas horizontais da grade
  ctx.fillRect(2, 6, 12, 1);
  ctx.fillRect(2, 10, 12, 1);

  // Marcas nos cantos
  ctx.fillStyle = '#d4a373';
  ctx.fillRect(3, 3, 2, 2);
  ctx.fillRect(12, 3, 2, 2);
  ctx.fillRect(3, 12, 2, 2);
  ctx.fillRect(12, 12, 2, 2);
});

// Lista ordenada de tiles do atlas (0 a 15, preenchendo o atlas 4x4)
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
  tileCraftingTableTop    // 15
];

// Monta o Texture Atlas em um Canvas 4x4 (64x64 pixels)
const ATLAS_COLS = 4;
const ATLAS_ROWS = 4;
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

// Cria texturas Three.js para o atlas
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
// Onde: +X: direita, -X: esquerda, +Y: topo, -Y: baixo, +Z: frente, -Z: trás
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
    dropItem: BLOCK_DIRT, // Quebrar grama dropa terra (como no Minecraft)
    tiles: [1, 1, 0, 2, 1, 1], // [Lado, Lado, Topo, Baixo, Lado, Lado]
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
    requiredHarvestLevel: 1, // Exige picareta (madeira ou superior) para dropar
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
    tiles: [5, 5, 6, 6, 5, 5], // Lados com casca, topo/baixo com anéis
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
    dropItem: BLOCK_LEAVES, // mineração pode dar graveto por sorteio em mining.js
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
    requiredHarvestLevel: 1, // Exige picareta (madeira ou superior)
    dropItem: null, // tratado em mining.js para dropar ITEM_COAL
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
    requiredHarvestLevel: 2, // Exige picareta de pedra ou ferro
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
    // [ +X: Lado(14), -X: Lado(14), +Y: Topo(15), -Y: Fundo Tábuas(11), +Z: Lado(14), -Z: Lado(14) ]
    tiles: [14, 14, 15, 11, 14, 14],
    iconTile: 15
  }
};

// Cache de DataURLs para renderizar ícones na UI rapidamente
const BLOCK_ICON_CACHE = {};

function getBlockIconDataUrl(id) {
  if (id === undefined || id === null) return '';

  // Se for item (ID >= 100), busca no gerador de itens
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

// Helper para calcular UVs de uma face no Texture Atlas
function getTileUVs(tileIdx) {
  const col = tileIdx % ATLAS_COLS;
  const row = Math.floor(tileIdx / ATLAS_COLS);

  const uMin = col / ATLAS_COLS;
  const uMax = (col + 1) / ATLAS_COLS;
  // Canvas Y cresce para baixo, Three.js V cresce para cima
  const vMin = 1 - (row + 1) / ATLAS_ROWS;
  const vMax = 1 - row / ATLAS_ROWS;

  return { uMin, uMax, vMin, vMax };
}
