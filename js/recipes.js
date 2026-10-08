// =============================================================================
// js/recipes.js - Sistema e Registro de Receitas de Crafting (2x2 e 3x3)
// =============================================================================

class RecipeManager {
  constructor() {
    this.recipes = [];
    this.registerDefaultRecipes();
  }

  registerDefaultRecipes() {
    // -------------------------------------------------------------------------
    // RECEITAS BÁSICAS (CRAFTING 2x2 E 3x3)
    // -------------------------------------------------------------------------

    // 1. Madeira -> 4 Tábuas (Sem forma / Shapeless)
    this.addShapelessRecipe('planks', [
      { id: BLOCK_WOOD, count: 1 }
    ], { id: BLOCK_PLANKS, count: 4 });

    // 2. 2 Tábuas na vertical -> 4 Gravetos (Com forma)
    this.addShapedRecipe('sticks', [
      [BLOCK_PLANKS],
      [BLOCK_PLANKS]
    ], { id: ITEM_STICK, count: 4 });

    // 3. 4 Tábuas (2x2) -> 1 Bancada de Trabalho
    this.addShapedRecipe('crafting_table', [
      [BLOCK_PLANKS, BLOCK_PLANKS],
      [BLOCK_PLANKS, BLOCK_PLANKS]
    ], { id: BLOCK_CRAFTING_TABLE, count: 1 });

    // 4. Areia -> Vidro (Shapeless - processo direto de fundição por crafting)
    this.addShapelessRecipe('glass', [
      { id: BLOCK_SAND, count: 1 }
    ], { id: BLOCK_GLASS, count: 1 });

    // 5. 4 Pedras (2x2) -> 4 Tijolos
    this.addShapedRecipe('bricks', [
      [BLOCK_STONE, BLOCK_STONE],
      [BLOCK_STONE, BLOCK_STONE]
    ], { id: BLOCK_BRICKS, count: 4 });

    // 6. Minério de Ferro + Carvão -> 1 Lingote de Ferro (processamento até inclusão de fornalha)
    this.addShapelessRecipe('iron_ingot_from_coal', [
      { id: BLOCK_IRON_ORE, count: 1 },
      { id: ITEM_COAL, count: 1 }
    ], { id: ITEM_IRON_INGOT, count: 1 });

    // Permite também fundir 1 Minério de ferro direto com gravetos
    this.addShapelessRecipe('iron_ingot_from_sticks', [
      { id: BLOCK_IRON_ORE, count: 1 },
      { id: ITEM_STICK, count: 2 }
    ], { id: ITEM_IRON_INGOT, count: 1 });

    // -------------------------------------------------------------------------
    // RECEITAS DE PICARETAS (GRADE 3x3)
    // -------------------------------------------------------------------------

    // Picareta de Madeira
    this.addShapedRecipe('wooden_pickaxe', [
      [BLOCK_PLANKS, BLOCK_PLANKS, BLOCK_PLANKS],
      [null,         ITEM_STICK,   null],
      [null,         ITEM_STICK,   null]
    ], { id: ITEM_WOODEN_PICKAXE, count: 1, durability: 60, maxDurability: 60 });

    // Picareta de Pedra
    this.addShapedRecipe('stone_pickaxe', [
      [BLOCK_STONE, BLOCK_STONE, BLOCK_STONE],
      [null,        ITEM_STICK,  null],
      [null,        ITEM_STICK,  null]
    ], { id: ITEM_STONE_PICKAXE, count: 1, durability: 132, maxDurability: 132 });

    // Picareta de Ferro
    this.addShapedRecipe('iron_pickaxe', [
      [ITEM_IRON_INGOT, ITEM_IRON_INGOT, ITEM_IRON_INGOT],
      [null,            ITEM_STICK,      null],
      [null,            ITEM_STICK,      null]
    ], { id: ITEM_IRON_PICKAXE, count: 1, durability: 250, maxDurability: 250 });

    // -------------------------------------------------------------------------
    // RECEITAS DE MACHADOS (GRADE 3x3 OU 2x2)
    // -------------------------------------------------------------------------

    // Machado de Madeira (voltado para a esquerda ou direita)
    this.addShapedRecipe('wooden_axe_left', [
      [BLOCK_PLANKS, BLOCK_PLANKS],
      [BLOCK_PLANKS, ITEM_STICK],
      [null,         ITEM_STICK]
    ], { id: ITEM_WOODEN_AXE, count: 1, durability: 60, maxDurability: 60 }, true);

    // Machado de Pedra
    this.addShapedRecipe('stone_axe_left', [
      [BLOCK_STONE, BLOCK_STONE],
      [BLOCK_STONE, ITEM_STICK],
      [null,        ITEM_STICK]
    ], { id: ITEM_STONE_AXE, count: 1, durability: 132, maxDurability: 132 }, true);

    // Machado de Ferro
    this.addShapedRecipe('iron_axe_left', [
      [ITEM_IRON_INGOT, ITEM_IRON_INGOT],
      [ITEM_IRON_INGOT, ITEM_STICK],
      [null,            ITEM_STICK]
    ], { id: ITEM_IRON_AXE, count: 1, durability: 250, maxDurability: 250 }, true);

    // -------------------------------------------------------------------------
    // RECEITAS DE PÁS (GRADE 3x3 OU 1x3)
    // -------------------------------------------------------------------------

    // Pá de Madeira
    this.addShapedRecipe('wooden_shovel', [
      [BLOCK_PLANKS],
      [ITEM_STICK],
      [ITEM_STICK]
    ], { id: ITEM_WOODEN_SHOVEL, count: 1, durability: 60, maxDurability: 60 });

    // Pá de Pedra
    this.addShapedRecipe('stone_shovel', [
      [BLOCK_STONE],
      [ITEM_STICK],
      [ITEM_STICK]
    ], { id: ITEM_STONE_SHOVEL, count: 1, durability: 132, maxDurability: 132 });

    // Pá de Ferro
    this.addShapedRecipe('iron_shovel', [
      [ITEM_IRON_INGOT],
      [ITEM_STICK],
      [ITEM_STICK]
    ], { id: ITEM_IRON_SHOVEL, count: 1, durability: 250, maxDurability: 250 });

    // -------------------------------------------------------------------------
    // RECEITAS DE ESPADAS (GRADE 3x3 OU 1x3) - Requisito 41
    // -------------------------------------------------------------------------

    // Espada de Madeira (Dano 4)
    this.addShapedRecipe('wooden_sword', [
      [BLOCK_PLANKS],
      [BLOCK_PLANKS],
      [ITEM_STICK]
    ], { id: ITEM_WOODEN_SWORD, count: 1, durability: 60, maxDurability: 60 });

    // Espada de Pedra (Dano 5)
    this.addShapedRecipe('stone_sword', [
      [BLOCK_STONE],
      [BLOCK_STONE],
      [ITEM_STICK]
    ], { id: ITEM_STONE_SWORD, count: 1, durability: 132, maxDurability: 132 });

    // Espada de Ferro (Dano 6)
    this.addShapedRecipe('iron_sword', [
      [ITEM_IRON_INGOT],
      [ITEM_IRON_INGOT],
      [ITEM_STICK]
    ], { id: ITEM_IRON_SWORD, count: 1, durability: 250, maxDurability: 250 });

    // -------------------------------------------------------------------------
    // RECEITA DA FORNALHA (GRADE 3x3) - Requisito 19
    // -------------------------------------------------------------------------
    this.addShapedRecipe('furnace', [
      [BLOCK_STONE, BLOCK_STONE, BLOCK_STONE],
      [BLOCK_STONE, null,        BLOCK_STONE],
      [BLOCK_STONE, BLOCK_STONE, BLOCK_STONE]
    ], { id: BLOCK_FURNACE, count: 1 });
  }

  addShapelessRecipe(id, ingredients, result) {
    this.recipes.push({
      id,
      type: 'shapeless',
      ingredients: ingredients.map(ing => ({ id: ing.id, count: ing.count || 1 })),
      result: { ...result }
    });
  }

  addShapedRecipe(id, pattern, result, allowMirror = false) {
    this.recipes.push({
      id,
      type: 'shaped',
      pattern,
      result: { ...result }
    });

    if (allowMirror) {
      // Cria variante espelhada horizontalmente
      const mirrored = pattern.map(row => [...row].reverse());
      this.recipes.push({
        id: id + '_mirrored',
        type: 'shaped',
        pattern: mirrored,
        result: { ...result }
      });
    }
  }

  /**
   * Encontra a receita compatível com os itens colocados na grade.
   * grid: Array de itens `{ id, count }` ou null.
   * width: 2 ou 3 (colunas da grade).
   * height: 2 ou 3 (linhas da grade).
   */
  findMatch(grid, width, height) {
    // 1. Tenta receitas sem forma (shapeless)
    for (const recipe of this.recipes) {
      if (recipe.type === 'shapeless') {
        if (this.matchShapeless(grid, recipe)) {
          return { recipe, result: { ...recipe.result } };
        }
      }
    }

    // 2. Tenta receitas com forma (shaped)
    for (const recipe of this.recipes) {
      if (recipe.type === 'shaped') {
        if (this.matchShaped(grid, width, height, recipe)) {
          return { recipe, result: { ...recipe.result } };
        }
      }
    }

    return null;
  }

  matchShapeless(grid, recipe) {
    // Extrai todos os itens presentes na grade
    const presentItems = [];
    for (let i = 0; i < grid.length; i++) {
      const slot = grid[i];
      if (slot && slot.count > 0) {
        presentItems.push(slot.id);
      }
    }

    // Se o número total de ingredientes for diferente, descarta
    const expected = [];
    for (const ing of recipe.ingredients) {
      for (let c = 0; c < ing.count; c++) {
        expected.push(ing.id);
      }
    }

    if (presentItems.length !== expected.length) return false;

    // Compara listas ordenadas
    const sortedPresent = [...presentItems].sort((a, b) => a - b);
    const sortedExpected = [...expected].sort((a, b) => a - b);

    for (let i = 0; i < sortedPresent.length; i++) {
      if (sortedPresent[i] !== sortedExpected[i]) return false;
    }

    return true;
  }

  matchShaped(grid, width, height, recipe) {
    const pat = recipe.pattern;
    const patH = pat.length;
    const patW = pat[0].length;

    // Encontra o bounding box dos itens na grade
    let minR = height, maxR = -1;
    let minC = width, maxC = -1;
    let hasItems = false;

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const item = grid[r * width + c];
        if (item && item.count > 0) {
          hasItems = true;
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
        }
      }
    }

    if (!hasItems) return false;

    const boxH = maxR - minR + 1;
    const boxW = maxC - minC + 1;

    // As dimensões do bounding box devem ser idênticas às do padrão
    if (boxH !== patH || boxW !== patW) return false;

    // Compara item a item no bounding box
    for (let r = 0; r < patH; r++) {
      for (let c = 0; c < patW; c++) {
        const expectedId = pat[r][c];
        const actualItem = grid[(minR + r) * width + (minC + c)];
        const actualId = (actualItem && actualItem.count > 0) ? actualItem.id : null;

        if (expectedId === null) {
          if (actualId !== null) return false;
        } else {
          if (actualId !== expectedId) return false;
        }
      }
    }

    return true;
  }

  /**
   * Consome 1 unidade de cada ingrediente utilizado na grade após o crafting
   */
  consumeIngredients(grid) {
    for (let i = 0; i < grid.length; i++) {
      const slot = grid[i];
      if (slot && slot.count > 0) {
        slot.count -= 1;
        if (slot.count <= 0) {
          grid[i] = null;
        }
      }
    }
  }
}

// Instância global de receitas
window.recipeManager = new RecipeManager();
