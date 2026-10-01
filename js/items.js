// =============================================================================
// js/items.js - Definição, Ícones Procedurais e Propriedades dos Itens e Ferramentas
// =============================================================================

// Identificadores únicos dos itens (iniciados em 100 para distinguir de blocos)
const ITEM_STICK = 100;
const ITEM_COAL = 101;
const ITEM_IRON_INGOT = 102;

const ITEM_WOODEN_PICKAXE = 103;
const ITEM_STONE_PICKAXE = 104;
const ITEM_IRON_PICKAXE = 105;

const ITEM_WOODEN_AXE = 106;
const ITEM_STONE_AXE = 107;
const ITEM_IRON_AXE = 108;

const ITEM_WOODEN_SHOVEL = 109;
const ITEM_STONE_SHOVEL = 110;
const ITEM_IRON_SHOVEL = 111;

// Geradores procedurais 16x16 para os ícones dos itens
const itemIcons = {};

// Helper: desenha cabo diagonal de madeira (graveto) do canto inferior esquerdo ao centro
function drawHandle(ctx) {
  const handleColor = '#8a5e35';
  const handleHighlight = '#a77647';
  const handleShadow = '#59391e';

  const coords = [
    [2, 13], [3, 12], [4, 11], [5, 10], [6, 9], [7, 8], [8, 7], [9, 6], [10, 5], [11, 4]
  ];

  coords.forEach(([x, y]) => {
    ctx.fillStyle = handleColor;
    ctx.fillRect(x, y, 1, 1);
    ctx.fillStyle = handleHighlight;
    ctx.fillRect(x, y - 1, 1, 1);
    ctx.fillStyle = handleShadow;
    ctx.fillRect(x + 1, y, 1, 1);
  });
}

// 1. Graveto (Stick)
itemIcons[ITEM_STICK] = drawTile((ctx) => {
  drawHandle(ctx);
  // Extensão do graveto
  ctx.fillStyle = '#8a5e35';
  ctx.fillRect(12, 3, 1, 1);
  ctx.fillRect(13, 2, 1, 1);
  ctx.fillStyle = '#a77647';
  ctx.fillRect(12, 2, 1, 1);
});

// 2. Carvão (Coal)
itemIcons[ITEM_COAL] = drawTile((ctx) => {
  const coalColors = ['#1a1a1a', '#2d2d2d', '#3e3e3e', '#111111'];
  // Formato orgânico de pedra de carvão
  const shape = [
    [5, 4, 6, 8],
    [4, 5, 8, 6],
    [3, 7, 10, 3],
    [4, 10, 7, 2]
  ];
  for (let x = 3; x <= 12; x++) {
    for (let y = 4; y <= 12; y++) {
      const dx = x - 7.5;
      const dy = y - 8;
      if (dx * dx + dy * dy <= 16 + pseudoNoise(x, y, 201) * 6) {
        const n = pseudoNoise(x, y, 202);
        ctx.fillStyle = coalColors[Math.floor(n * coalColors.length)];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  // Brilho facetado do carvão
  ctx.fillStyle = '#555555';
  ctx.fillRect(6, 6, 2, 1);
  ctx.fillRect(9, 7, 1, 2);
  ctx.fillRect(7, 9, 2, 1);
});

// 3. Lingote de Ferro (Iron Ingot)
itemIcons[ITEM_IRON_INGOT] = drawTile((ctx) => {
  // Base do lingote
  const bodyColor = '#d8d8d8';
  const shadowColor = '#949494';
  const darkShadow = '#686868';
  const highlight = '#ffffff';

  // Face frontal / superior inclinada
  ctx.fillStyle = bodyColor;
  ctx.fillRect(4, 7, 8, 4);

  // Topo iluminado
  ctx.fillStyle = highlight;
  ctx.fillRect(5, 6, 7, 1);
  ctx.fillRect(4, 7, 2, 1);

  // Borda lateral escura
  ctx.fillStyle = shadowColor;
  ctx.fillRect(3, 8, 1, 3);
  ctx.fillRect(12, 7, 1, 4);

  // Fundo com sombra
  ctx.fillStyle = darkShadow;
  ctx.fillRect(4, 11, 8, 1);
  ctx.fillRect(3, 11, 1, 1);
  ctx.fillRect(12, 11, 1, 1);
});

// Helper para desenhar cabeças de picareta
function drawPickaxeHead(ctx, mainColor, highlightColor, shadowColor) {
  // Arco superior da picareta
  const arc = [
    [6, 3], [7, 3], [8, 3], [9, 3], [10, 4], [11, 5], [12, 6], [13, 7],
    [5, 4], [4, 5], [3, 6], [2, 7]
  ];

  arc.forEach(([x, y]) => {
    ctx.fillStyle = mainColor;
    ctx.fillRect(x, y, 2, 2);
    ctx.fillStyle = highlightColor;
    ctx.fillRect(x, y, 1, 1);
  });

  // Pontas afiadas
  ctx.fillStyle = shadowColor;
  ctx.fillRect(1, 8, 1, 1);
  ctx.fillRect(14, 8, 1, 1);
}

// 4. Picareta de Madeira
itemIcons[ITEM_WOODEN_PICKAXE] = drawTile((ctx) => {
  drawHandle(ctx);
  drawPickaxeHead(ctx, '#9e733e', '#c4955d', '#6e4f27');
});

// 5. Picareta de Pedra
itemIcons[ITEM_STONE_PICKAXE] = drawTile((ctx) => {
  drawHandle(ctx);
  drawPickaxeHead(ctx, '#7f8285', '#a8abae', '#555759');
});

// 6. Picareta de Ferro
itemIcons[ITEM_IRON_PICKAXE] = drawTile((ctx) => {
  drawHandle(ctx);
  drawPickaxeHead(ctx, '#d0d3d4', '#ffffff', '#8a8d8e');
});

// Helper para desenhar cabeças de machado
function drawAxeHead(ctx, mainColor, highlightColor, shadowColor) {
  // Lâmina curvada no topo do cabo
  const blade = [
    [8, 2], [9, 2], [10, 2], [11, 2],
    [7, 3], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3],
    [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4],
    [8, 5], [9, 5], [10, 5], [11, 5],
    [9, 6], [10, 6]
  ];

  blade.forEach(([x, y]) => {
    ctx.fillStyle = mainColor;
    ctx.fillRect(x, y, 1, 1);
  });

  // Fio da lâmina iluminado
  ctx.fillStyle = highlightColor;
  ctx.fillRect(8, 2, 4, 1);
  ctx.fillRect(12, 3, 1, 2);

  // Sombra interior
  ctx.fillStyle = shadowColor;
  ctx.fillRect(7, 3, 1, 2);
  ctx.fillRect(9, 6, 2, 1);
}

// 7. Machado de Madeira
itemIcons[ITEM_WOODEN_AXE] = drawTile((ctx) => {
  drawHandle(ctx);
  drawAxeHead(ctx, '#9e733e', '#c4955d', '#6e4f27');
});

// 8. Machado de Pedra
itemIcons[ITEM_STONE_AXE] = drawTile((ctx) => {
  drawHandle(ctx);
  drawAxeHead(ctx, '#7f8285', '#a8abae', '#555759');
});

// 9. Machado de Ferro
itemIcons[ITEM_IRON_AXE] = drawTile((ctx) => {
  drawHandle(ctx);
  drawAxeHead(ctx, '#d0d3d4', '#ffffff', '#8a8d8e');
});

// Helper para desenhar cabeças de pá
function drawShovelHead(ctx, mainColor, highlightColor, shadowColor) {
  // Lâmina pontiaguda no topo
  const spade = [
    [10, 2], [11, 2],
    [9, 3], [10, 3], [11, 3], [12, 3],
    [9, 4], [10, 4], [11, 4], [12, 4],
    [10, 5], [11, 5]
  ];

  spade.forEach(([x, y]) => {
    ctx.fillStyle = mainColor;
    ctx.fillRect(x, y, 1, 1);
  });

  // Brilho na ponta
  ctx.fillStyle = highlightColor;
  ctx.fillRect(10, 2, 2, 1);
  ctx.fillRect(9, 3, 1, 2);

  // Sombra na base
  ctx.fillStyle = shadowColor;
  ctx.fillRect(12, 3, 1, 2);
  ctx.fillRect(10, 5, 2, 1);
}

// 10. Pá de Madeira
itemIcons[ITEM_WOODEN_SHOVEL] = drawTile((ctx) => {
  drawHandle(ctx);
  drawShovelHead(ctx, '#9e733e', '#c4955d', '#6e4f27');
});

// 11. Pá de Pedra
itemIcons[ITEM_STONE_SHOVEL] = drawTile((ctx) => {
  drawHandle(ctx);
  drawShovelHead(ctx, '#7f8285', '#a8abae', '#555759');
});

// 12. Pá de Ferro
itemIcons[ITEM_IRON_SHOVEL] = drawTile((ctx) => {
  drawHandle(ctx);
  drawShovelHead(ctx, '#d0d3d4', '#ffffff', '#8a8d8e');
});

// =============================================================================
// Registro Central de Itens e Ferramentas
// =============================================================================
const ITEM_TYPES = {
  [ITEM_STICK]: {
    id: ITEM_STICK,
    name: 'Graveto',
    isBlock: false,
    isTool: false,
    maxStack: 64
  },
  [ITEM_COAL]: {
    id: ITEM_COAL,
    name: 'Carvão',
    isBlock: false,
    isTool: false,
    maxStack: 64
  },
  [ITEM_IRON_INGOT]: {
    id: ITEM_IRON_INGOT,
    name: 'Lingote de Ferro',
    isBlock: false,
    isTool: false,
    maxStack: 64
  },

  // PICARETAS
  [ITEM_WOODEN_PICKAXE]: {
    id: ITEM_WOODEN_PICKAXE,
    name: 'Picareta de Madeira',
    isBlock: false,
    isTool: true,
    toolType: 'pickaxe',
    material: 'wood',
    speed: 2.2,
    harvestLevel: 1, // Pode minerar pedra e carvão
    maxDurability: 60,
    maxStack: 1
  },
  [ITEM_STONE_PICKAXE]: {
    id: ITEM_STONE_PICKAXE,
    name: 'Picareta de Pedra',
    isBlock: false,
    isTool: true,
    toolType: 'pickaxe',
    material: 'stone',
    speed: 4.5,
    harvestLevel: 2, // Pode minerar pedra, carvão e minério de ferro
    maxDurability: 132,
    maxStack: 1
  },
  [ITEM_IRON_PICKAXE]: {
    id: ITEM_IRON_PICKAXE,
    name: 'Picareta de Ferro',
    isBlock: false,
    isTool: true,
    toolType: 'pickaxe',
    material: 'iron',
    speed: 7.5,
    harvestLevel: 3, // Mineração super rápida de todos os minérios
    maxDurability: 250,
    maxStack: 1
  },

  // MACHADOS
  [ITEM_WOODEN_AXE]: {
    id: ITEM_WOODEN_AXE,
    name: 'Machado de Madeira',
    isBlock: false,
    isTool: true,
    toolType: 'axe',
    material: 'wood',
    speed: 2.5,
    harvestLevel: 1,
    maxDurability: 60,
    maxStack: 1
  },
  [ITEM_STONE_AXE]: {
    id: ITEM_STONE_AXE,
    name: 'Machado de Pedra',
    isBlock: false,
    isTool: true,
    toolType: 'axe',
    material: 'stone',
    speed: 5.0,
    harvestLevel: 2,
    maxDurability: 132,
    maxStack: 1
  },
  [ITEM_IRON_AXE]: {
    id: ITEM_IRON_AXE,
    name: 'Machado de Ferro',
    isBlock: false,
    isTool: true,
    toolType: 'axe',
    material: 'iron',
    speed: 8.0,
    harvestLevel: 3,
    maxDurability: 250,
    maxStack: 1
  },

  // PÁS
  [ITEM_WOODEN_SHOVEL]: {
    id: ITEM_WOODEN_SHOVEL,
    name: 'Pá de Madeira',
    isBlock: false,
    isTool: true,
    toolType: 'shovel',
    material: 'wood',
    speed: 2.5,
    harvestLevel: 1,
    maxDurability: 60,
    maxStack: 1
  },
  [ITEM_STONE_SHOVEL]: {
    id: ITEM_STONE_SHOVEL,
    name: 'Pá de Pedra',
    isBlock: false,
    isTool: true,
    toolType: 'shovel',
    material: 'stone',
    speed: 5.0,
    harvestLevel: 2,
    maxDurability: 132,
    maxStack: 1
  },
  [ITEM_IRON_SHOVEL]: {
    id: ITEM_IRON_SHOVEL,
    name: 'Pá de Ferro',
    isBlock: false,
    isTool: true,
    toolType: 'shovel',
    material: 'iron',
    speed: 8.0,
    harvestLevel: 3,
    maxDurability: 250,
    maxStack: 1
  }
};

// Cache de DataURLs para os ícones dos itens
const ITEM_ICON_CACHE = {};

function getItemIconDataUrl(itemId) {
  if (ITEM_ICON_CACHE[itemId]) return ITEM_ICON_CACHE[itemId];

  const canvas = itemIcons[itemId];
  if (canvas) {
    ITEM_ICON_CACHE[itemId] = canvas.toDataURL();
    return ITEM_ICON_CACHE[itemId];
  }
  return '';
}

// Helpers unificados para blocos e itens
function isItem(id) {
  return typeof id === 'number' && id >= 100;
}

function getItemOrBlockDef(id) {
  if (isItem(id)) {
    return ITEM_TYPES[id] || null;
  }
  return BLOCK_TYPES[id] || null;
}

function getItemOrBlockName(id) {
  const def = getItemOrBlockDef(id);
  return def ? def.name : 'Desconhecido';
}

function getItemOrBlockIcon(id) {
  if (isItem(id)) {
    return getItemIconDataUrl(id);
  }
  return getBlockIconDataUrl(id);
}

// Torna acessível no escopo global
window.isItem = isItem;
window.ITEM_TYPES = ITEM_TYPES;
window.getItemIconDataUrl = getItemIconDataUrl;
window.getItemOrBlockDef = getItemOrBlockDef;
window.getItemOrBlockName = getItemOrBlockName;
window.getItemOrBlockIcon = getItemOrBlockIcon;
