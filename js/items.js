// =============================================================================
// js/items.js - Definição, Ícones Procedurais Ricos, Ferramentas, Espadas e Carne
// =============================================================================

// Identificadores únicos dos itens (>= 100)
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

const ITEM_PORKCHOP = 112;

const ITEM_WOODEN_SWORD = 113;
const ITEM_STONE_SWORD = 114;
const ITEM_IRON_SWORD = 115;

// Geradores procedurais 16x16 para os ícones dos itens
const itemIcons = {};

// Helper: desenha cabo diagonal de madeira de carvalho com sombreado
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
  ctx.fillStyle = '#8a5e35';
  ctx.fillRect(12, 3, 1, 1);
  ctx.fillRect(13, 2, 1, 1);
  ctx.fillStyle = '#a77647';
  ctx.fillRect(12, 2, 1, 1);
  // Detalhe de galho pequeno saindo
  ctx.fillStyle = '#734c26';
  ctx.fillRect(7, 7, 1, 1);
});

// 2. Carvão (Coal) - Fragmento facetado de antracito negro com reflexo
itemIcons[ITEM_COAL] = drawTile((ctx) => {
  const coalColors = ['#151515', '#282828', '#383838', '#0c0c0c'];
  for (let x = 3; x <= 12; x++) {
    for (let y = 4; y <= 12; y++) {
      const dx = x - 7.5;
      const dy = y - 8;
      if (dx * dx + dy * dy <= 16 + pseudoNoise(x, y, 201) * 7) {
        const n = pseudoNoise(x, y, 202);
        ctx.fillStyle = coalColors[Math.floor(n * coalColors.length)];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  // Facetas reflexivas e arestas polidas
  ctx.fillStyle = '#6b6b6b';
  ctx.fillRect(6, 6, 2, 1);
  ctx.fillRect(9, 7, 1, 2);
  ctx.fillRect(7, 9, 2, 1);
  ctx.fillStyle = '#999999';
  ctx.fillRect(6, 6, 1, 1);
});

// 3. Lingote de Ferro (Iron Ingot) - Barra metálica chanfrada com brilho reluzente
itemIcons[ITEM_IRON_INGOT] = drawTile((ctx) => {
  const bodyColor = '#d2d6d9';
  const shadowColor = '#8e9396';
  const darkShadow = '#626668';
  const highlight = '#ffffff';

  // Corpo do lingote
  ctx.fillStyle = bodyColor;
  ctx.fillRect(4, 7, 8, 4);

  // Topo chanfrado e iluminado
  ctx.fillStyle = highlight;
  ctx.fillRect(4, 6, 8, 1);
  ctx.fillRect(4, 7, 2, 1);

  // Bordas e sombras laterais
  ctx.fillStyle = shadowColor;
  ctx.fillRect(3, 8, 1, 3);
  ctx.fillRect(12, 7, 1, 4);

  // Base em sombra profunda
  ctx.fillStyle = darkShadow;
  ctx.fillRect(3, 11, 10, 1);
});

// Helper para desenhar cabeças de picareta
function drawPickaxeHead(ctx, mainColor, highlightColor, shadowColor, extraDesign = null) {
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

  if (extraDesign) extraDesign(ctx);
}

// 4. Picareta de Madeira - Feita de tábuas de carvalho reforçadas
itemIcons[ITEM_WOODEN_PICKAXE] = drawTile((ctx) => {
  drawHandle(ctx);
  drawPickaxeHead(ctx, '#9e733e', '#c4955d', '#6e4f27', (c) => {
    // Amarração rústica de cipó/corda
    c.fillStyle = '#654b2d';
    c.fillRect(7, 5, 2, 2);
  });
});

// 5. Picareta de Pedra - Rocha talhada com pontas agudas de sílex
itemIcons[ITEM_STONE_PICKAXE] = drawTile((ctx) => {
  drawHandle(ctx);
  drawPickaxeHead(ctx, '#7c7f82', '#a8abae', '#525456', (c) => {
    // Textura de pedra lascada
    c.fillStyle = '#424446';
    c.fillRect(6, 4, 1, 1);
    c.fillRect(10, 5, 1, 1);
  });
});

// 6. Picareta de Ferro - Aço forjado com chanfro brilhante e bicos duplos
itemIcons[ITEM_IRON_PICKAXE] = drawTile((ctx) => {
  drawHandle(ctx);
  drawPickaxeHead(ctx, '#d0d5d8', '#ffffff', '#888d90', (c) => {
    // Reforço central de ferro polido
    c.fillStyle = '#ffffff';
    c.fillRect(7, 3, 2, 1);
    c.fillRect(12, 6, 1, 1);
    c.fillRect(3, 6, 1, 1);
  });
});

// Helper para cabeças de machado
function drawAxeHead(ctx, mainColor, highlightColor, shadowColor, bladeTipColor) {
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

  ctx.fillStyle = highlightColor;
  ctx.fillRect(8, 2, 4, 1);
  ctx.fillRect(12, 3, 1, 2);

  ctx.fillStyle = shadowColor;
  ctx.fillRect(7, 3, 1, 2);
  ctx.fillRect(9, 6, 2, 1);

  if (bladeTipColor) {
    ctx.fillStyle = bladeTipColor;
    ctx.fillRect(12, 2, 1, 3);
  }
}

// 7. Machado de Madeira
itemIcons[ITEM_WOODEN_AXE] = drawTile((ctx) => {
  drawHandle(ctx);
  drawAxeHead(ctx, '#9e733e', '#c4955d', '#6e4f27', '#b5844e');
});

// 8. Machado de Pedra
itemIcons[ITEM_STONE_AXE] = drawTile((ctx) => {
  drawHandle(ctx);
  drawAxeHead(ctx, '#7c7f82', '#a8abae', '#525456', '#babec0');
});

// 9. Machado de Ferro
itemIcons[ITEM_IRON_AXE] = drawTile((ctx) => {
  drawHandle(ctx);
  drawAxeHead(ctx, '#d0d5d8', '#ffffff', '#888d90', '#ffffff');
});

// Helper para cabeças de pá
function drawShovelHead(ctx, mainColor, highlightColor, shadowColor) {
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

  ctx.fillStyle = highlightColor;
  ctx.fillRect(10, 2, 2, 1);
  ctx.fillRect(9, 3, 1, 2);

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
  drawShovelHead(ctx, '#7c7f82', '#a8abae', '#525456');
});

// 12. Pá de Ferro
itemIcons[ITEM_IRON_SHOVEL] = drawTile((ctx) => {
  drawHandle(ctx);
  drawShovelHead(ctx, '#d0d5d8', '#ffffff', '#888d90');
});

// =============================================================================
// 13, 14, 15: ESPADAS (Espada de Madeira, Pedra e Ferro com lâminas e guarda)
// =============================================================================
function drawSword(ctx, bladeColor, bladeHighlight, bladeShadow, guardColor) {
  // 1. Cabo (inferior esquerdo)
  ctx.fillStyle = '#654321';
  ctx.fillRect(2, 13, 2, 2);
  ctx.fillStyle = '#8a5e35';
  ctx.fillRect(3, 12, 2, 2);

  // 2. Guarda / Cruzeta transversal
  ctx.fillStyle = guardColor;
  ctx.fillRect(3, 10, 2, 2);
  ctx.fillRect(5, 12, 2, 2);
  ctx.fillRect(4, 11, 2, 2);

  // 3. Lâmina diagonal afiada subindo até o canto superior direito (13, 2)
  const bladeCoords = [
    [5, 10], [6, 9], [7, 8], [8, 7], [9, 6], [10, 5], [11, 4], [12, 3]
  ];

  bladeCoords.forEach(([x, y]) => {
    ctx.fillStyle = bladeColor;
    ctx.fillRect(x, y, 2, 2);
    // Fio cortante iluminado (superior)
    ctx.fillStyle = bladeHighlight;
    ctx.fillRect(x, y - 1, 1, 1);
    ctx.fillRect(x - 1, y, 1, 1);
    // Costas / Sombra da lâmina
    ctx.fillStyle = bladeShadow;
    ctx.fillRect(x + 1, y, 1, 1);
  });

  // Ponta afiada da espada
  ctx.fillStyle = bladeHighlight;
  ctx.fillRect(13, 2, 1, 1);
  ctx.fillRect(12, 2, 1, 1);
}

// Espada de Madeira (Dano 4)
itemIcons[ITEM_WOODEN_SWORD] = drawTile((ctx) => {
  drawSword(ctx, '#a57843', '#c9985b', '#6d4c24', '#7c5428');
});

// Espada de Pedra (Dano 5)
itemIcons[ITEM_STONE_SWORD] = drawTile((ctx) => {
  drawSword(ctx, '#7c7f82', '#a8abae', '#4c4e50', '#5f6264');
});

// Espada de Ferro (Dano 6)
itemIcons[ITEM_IRON_SWORD] = drawTile((ctx) => {
  drawSword(ctx, '#d0d5d8', '#ffffff', '#808588', '#9da2a5');
});

// 16. Carne de Porco Crua (Porkchop) - Bife marmorizado com osso e gordura
itemIcons[ITEM_PORKCHOP] = drawTile((ctx) => {
  // Forma orgânica do bife
  const meatPixels = [
    [5, 4], [6, 4], [7, 4], [8, 4],
    [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5],
    [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6],
    [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7], [10, 7],
    [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [10, 8], [11, 8],
    [4, 9], [5, 9], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9],
    [5, 10], [6, 10], [7, 10], [8, 10], [9, 10],
    [6, 11], [7, 11], [8, 11]
  ];

  // Vermelho rosado de carne suína
  meatPixels.forEach(([x, y]) => {
    ctx.fillStyle = '#e86a77';
    ctx.fillRect(x, y, 1, 1);
  });

  // Marmoreio de gordura clara e borda
  const fatPixels = [
    [5, 4], [6, 4], [4, 5], [3, 6], [3, 7], [4, 8],
    [7, 6], [8, 6], [6, 8], [7, 8]
  ];
  fatPixels.forEach(([x, y]) => {
    ctx.fillStyle = '#fce2e5';
    ctx.fillRect(x, y, 1, 1);
  });

  // Pedaço de osso pequeno no canto
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(10, 7, 2, 2);
  ctx.fillStyle = '#dbdbdb';
  ctx.fillRect(11, 8, 1, 1);

  // Sombra de profundidade na carne
  const darkMeat = [
    [5, 9], [6, 10], [7, 10], [8, 10], [9, 10], [6, 11], [7, 11], [8, 11]
  ];
  darkMeat.forEach(([x, y]) => {
    ctx.fillStyle = '#b83b49';
    ctx.fillRect(x, y, 1, 1);
  });
});

// =============================================================================
// Registro Central de Itens, Ferramentas, Espadas e Alimentos
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
    isFuel: true,
    fuelDuration: 80, // Queima até 8 operações na fornalha
    maxStack: 64
  },
  [ITEM_IRON_INGOT]: {
    id: ITEM_IRON_INGOT,
    name: 'Barra de Ferro',
    isBlock: false,
    isTool: false,
    maxStack: 64
  },
  [ITEM_PORKCHOP]: {
    id: ITEM_PORKCHOP,
    name: 'Carne Crua',
    isBlock: false,
    isTool: false,
    isFood: true,
    healAmount: 4,
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
    damage: 2,
    speed: 2.2,
    harvestLevel: 1,
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
    damage: 3,
    speed: 4.5,
    harvestLevel: 2,
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
    damage: 4,
    speed: 7.5,
    harvestLevel: 3,
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
    damage: 3,
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
    damage: 4,
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
    damage: 5,
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
    damage: 1,
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
    damage: 2,
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
    damage: 3,
    speed: 8.0,
    harvestLevel: 3,
    maxDurability: 250,
    maxStack: 1
  },

  // ESPADAS (Requisitos 40 e 58: Madeira 4 dmg, Pedra 5 dmg, Ferro 6 dmg)
  [ITEM_WOODEN_SWORD]: {
    id: ITEM_WOODEN_SWORD,
    name: 'Espada de Madeira',
    isBlock: false,
    isTool: true,
    isWeapon: true,
    toolType: 'sword',
    material: 'wood',
    damage: 4,
    speed: 1.0,
    maxDurability: 60,
    maxStack: 1
  },
  [ITEM_STONE_SWORD]: {
    id: ITEM_STONE_SWORD,
    name: 'Espada de Pedra',
    isBlock: false,
    isTool: true,
    isWeapon: true,
    toolType: 'sword',
    material: 'stone',
    damage: 5,
    speed: 1.0,
    maxDurability: 132,
    maxStack: 1
  },
  [ITEM_IRON_SWORD]: {
    id: ITEM_IRON_SWORD,
    name: 'Espada de Ferro',
    isBlock: false,
    isTool: true,
    isWeapon: true,
    toolType: 'sword',
    material: 'iron',
    damage: 6,
    speed: 1.0,
    maxDurability: 250,
    maxStack: 1
  }
};

// Cache de DataURLs para ícones dos itens
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

// Global scope
window.ITEM_STICK = ITEM_STICK;
window.ITEM_COAL = ITEM_COAL;
window.ITEM_IRON_INGOT = ITEM_IRON_INGOT;
window.ITEM_WOODEN_PICKAXE = ITEM_WOODEN_PICKAXE;
window.ITEM_STONE_PICKAXE = ITEM_STONE_PICKAXE;
window.ITEM_IRON_PICKAXE = ITEM_IRON_PICKAXE;
window.ITEM_WOODEN_AXE = ITEM_WOODEN_AXE;
window.ITEM_STONE_AXE = ITEM_STONE_AXE;
window.ITEM_IRON_AXE = ITEM_IRON_AXE;
window.ITEM_WOODEN_SHOVEL = ITEM_WOODEN_SHOVEL;
window.ITEM_STONE_SHOVEL = ITEM_STONE_SHOVEL;
window.ITEM_IRON_SHOVEL = ITEM_IRON_SHOVEL;
window.ITEM_PORKCHOP = ITEM_PORKCHOP;
window.ITEM_WOODEN_SWORD = ITEM_WOODEN_SWORD;
window.ITEM_STONE_SWORD = ITEM_STONE_SWORD;
window.ITEM_IRON_SWORD = ITEM_IRON_SWORD;
window.ITEM_TYPES = ITEM_TYPES;
window.getItemIconDataUrl = getItemIconDataUrl;
window.isItem = isItem;
window.getItemOrBlockDef = getItemOrBlockDef;
window.getItemOrBlockName = getItemOrBlockName;
window.getItemOrBlockIcon = getItemOrBlockIcon;
