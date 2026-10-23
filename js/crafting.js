// =============================================================================
// js/crafting.js - Gerenciador do Sistema de Crafting (Grades 2x2 e 3x3)
// =============================================================================

class CraftingController {
  constructor(game) {
    this.game = game;

    // Grade 2x2 do inventário
    this.invGrid = new Array(4).fill(null);
    this.invOutput = null;

    // Grade 3x3 da Bancada de Trabalho
    this.tableGrid = new Array(9).fill(null);
    this.tableOutput = null;
  }

  getGrid(isTable) {
    return isTable ? this.tableGrid : this.invGrid;
  }

  getDimensions(isTable) {
    return isTable ? { width: 3, height: 3 } : { width: 2, height: 2 };
  }

  getOutput(isTable) {
    return isTable ? this.tableOutput : this.invOutput;
  }

  setOutput(isTable, item) {
    if (isTable) {
      this.tableOutput = item;
    } else {
      this.invOutput = item;
    }
  }

  // Atualiza a verificação de receitas na grade
  updateMatch(isTable) {
    const grid = this.getGrid(isTable);
    const { width, height } = this.getDimensions(isTable);

    const match = window.recipeManager.findMatch(grid, width, height);
    if (match) {
      this.setOutput(isTable, { ...match.result });
    } else {
      this.setOutput(isTable, null);
    }
  }

  // Clique esquerdo em um slot da grade de crafting
  handleGridLeftClick(slotIndex, isTable) {
    const grid = this.getGrid(isTable);
    if (slotIndex < 0 || slotIndex >= grid.length) return;

    const currentSlot = grid[slotIndex];
    const cursor = this.game.inventory.cursorItem;

    if (!cursor) {
      // Sem item no cursor: pega o item da grade
      if (currentSlot) {
        this.game.inventory.cursorItem = { ...currentSlot };
        grid[slotIndex] = null;
      }
    } else {
      // Com item no cursor
      const itemDef = getItemOrBlockDef(cursor.id);
      const maxStack = itemDef?.maxStack || 64;

      if (!currentSlot) {
        // Slot vazio: deposita todo o stack do cursor
        grid[slotIndex] = { ...cursor };
        this.game.inventory.cursorItem = null;
      } else if (currentSlot.id === cursor.id) {
        // Mesmo tipo: empilha até o limite
        const space = maxStack - currentSlot.count;
        if (space > 0) {
          const moveAmount = Math.min(space, cursor.count);
          currentSlot.count += moveAmount;
          cursor.count -= moveAmount;
          if (cursor.count <= 0) {
            this.game.inventory.cursorItem = null;
          }
        }
      } else {
        // Tipos diferentes: troca de posição
        const temp = { ...currentSlot };
        grid[slotIndex] = { ...cursor };
        this.game.inventory.cursorItem = temp;
      }
    }

    this.updateMatch(isTable);
  }

  // Clique direito em um slot da grade de crafting
  handleGridRightClick(slotIndex, isTable) {
    const grid = this.getGrid(isTable);
    if (slotIndex < 0 || slotIndex >= grid.length) return;

    const currentSlot = grid[slotIndex];
    const cursor = this.game.inventory.cursorItem;

    if (!cursor) {
      // Sem item no cursor: divide o stack da grade pela metade
      if (currentSlot && currentSlot.count > 0) {
        const half = Math.ceil(currentSlot.count / 2);
        const remainder = currentSlot.count - half;

        this.game.inventory.cursorItem = { ...currentSlot, count: half };
        if (remainder > 0) {
          currentSlot.count = remainder;
        } else {
          grid[slotIndex] = null;
        }
      }
    } else {
      // Com item no cursor: deposita 1 unidade
      const itemDef = getItemOrBlockDef(cursor.id);
      const maxStack = itemDef?.maxStack || 64;

      if (!currentSlot) {
        grid[slotIndex] = { ...cursor, count: 1 };
        cursor.count -= 1;
        if (cursor.count <= 0) {
          this.game.inventory.cursorItem = null;
        }
      } else if (currentSlot.id === cursor.id && currentSlot.count < maxStack) {
        currentSlot.count += 1;
        cursor.count -= 1;
        if (cursor.count <= 0) {
          this.game.inventory.cursorItem = null;
        }
      }
    }

    this.updateMatch(isTable);
  }

  // Clique no slot de resultado (Output)
  handleOutputClick(isTable) {
    const output = this.getOutput(isTable);
    if (!output) return;

    const cursor = this.game.inventory.cursorItem;
    const itemDef = getItemOrBlockDef(output.id);
    const maxStack = itemDef?.maxStack || 64;

    let canTake = false;

    if (!cursor) {
      // Cursor vazio: pega o resultado
      this.game.inventory.cursorItem = { ...output };
      canTake = true;
    } else if (cursor.id === output.id && cursor.count + output.count <= maxStack) {
      // Mesmo item e cabe no cursor: empilha
      cursor.count += output.count;
      canTake = true;
    }

    if (canTake) {
      // Toca som de crafting / pegar item
      if (this.game.player) {
        this.game.player.playSound('place');
      }

      // Consome 1 de cada ingrediente na grade
      const grid = this.getGrid(isTable);
      window.recipeManager.consumeIngredients(grid);

      // Atualiza a verificação de receita com o que sobrou
      this.updateMatch(isTable);
    }
  }

  // Transferência rápida (Shift + Clique) no slot de saída do Crafting (Requisito 6B)
  handleOutputShiftClick(isTable) {
    let output = this.getOutput(isTable);
    if (!output) return;

    const grid = this.getGrid(isTable);
    let craftedAny = false;

    while (output) {
      const unplaced = this.game.inventory.addItemToHotbarFirst(
        output.id,
        output.count,
        output.durability,
        output.maxDurability
      );

      if (unplaced === output.count) {
        // Sem espaço no inventário
        break;
      }

      craftedAny = true;
      window.recipeManager.consumeIngredients(grid);
      this.updateMatch(isTable);
      output = this.getOutput(isTable);

      if (unplaced > 0) {
        break;
      }
    }

    if (craftedAny && this.game.player) {
      this.game.player.playSound('place');
    }
  }

  // Devolve todos os itens da grade para o inventário ao fechar (ou dropa no mundo se lotado)
  returnGridItems(isTable) {
    const grid = this.getGrid(isTable);
    for (let i = 0; i < grid.length; i++) {
      const item = grid[i];
      if (item && item.count > 0) {
        const remaining = this.game.inventory ? this.game.inventory.addItem(item.id, item.count, item.durability, item.maxDurability) : item.count;
        if (remaining > 0 && this.game.drops && this.game.player) {
          this.game.drops.spawnDrop(
            this.game.player.position.x,
            this.game.player.position.y + 0.5,
            this.game.player.position.z,
            item.id,
            remaining
          );
        }
        grid[i] = null;
      }
    }
    this.setOutput(isTable, null);
  }
}
