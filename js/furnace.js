// =============================================================================
// js/furnace.js - Bloco Fornalha, Sistema de Combustível, Fundição e Interface
// =============================================================================

class FurnaceManager {
  constructor(game) {
    this.game = game;

    // Dicionário de fornalhas no mundo: chave "x,y,z" -> FurnaceState
    this.furnaces = {};

    // Posição da fornalha atualmente aberta na UI ({ x, y, z } ou null)
    this.currentFurnacePos = null;

    // Receitas de fundição: Entrada -> Saída (Ferro, Areia e Carne)
    this.smeltRecipes = {
      [BLOCK_IRON_ORE]: { outputId: ITEM_IRON_INGOT, name: 'Barra de Ferro' },
      [BLOCK_SAND]: { outputId: BLOCK_GLASS, name: 'Vidro' },
      [ITEM_PORKCHOP]: { outputId: ITEM_COOKED_PORKCHOP, name: 'Carne Assada' }
    };

    // Duração de fundição por item (em segundos)
    this.smeltDuration = 6.0;

    // Tempo de queima por tipo de combustível (segundos)
    this.fuelBurnTimes = {
      [ITEM_COAL]: 48.0,
      [BLOCK_WOOD]: 15.0,
      [BLOCK_PLANKS]: 15.0,
      [ITEM_STICK]: 5.0
    };
    this.coalBurnDuration = 48.0;

    this.initDOM();
  }

  initDOM() {
    this.overlayEl = document.getElementById('screen-furnace');
    this.inputSlotEl = document.getElementById('furnace-input-slot');
    this.fuelSlotEl = document.getElementById('furnace-fuel-slot');
    this.outputSlotEl = document.getElementById('furnace-output-slot');
    this.fireIndicatorEl = document.getElementById('furnace-fire-fill');
    this.cookProgressBarEl = document.getElementById('furnace-cook-progress');

    // Botão de fechar
    document.getElementById('btn-close-furnace')?.addEventListener('click', () => {
      this.closeUI();
    });

    this.initSlotEvents();
  }

  // Cria ou recupera a fornalha na posição dada
  getFurnaceAt(x, y, z) {
    const key = `${x},${y},${z}`;
    if (!this.furnaces[key]) {
      this.furnaces[key] = {
        x, y, z,
        input: null,      // { id, count }
        fuel: null,       // { id, count }
        output: null,     // { id, count }
        cookProgress: 0,  // 0.0 a 1.0
        fuelTimeLeft: 0,  // segundos restantes de fogo
        maxFuelTime: 48.0
      };
    }
    return this.furnaces[key];
  }

  // Remove fornalha do dicionário e devolve drops dos itens internos
  removeFurnaceAt(x, y, z) {
    const key = `${x},${y},${z}`;
    const furnace = this.furnaces[key];
    if (!furnace) return;

    // Se estiver aberta pelo jogador, fecha a interface
    if (this.currentFurnacePos && this.currentFurnacePos.x === x && this.currentFurnacePos.y === y && this.currentFurnacePos.z === z) {
      this.closeUI();
    }

    // Devolve os itens que estavam dentro como drops no mundo
    const itemsToDrop = [furnace.input, furnace.fuel, furnace.output];
    itemsToDrop.forEach(item => {
      if (item && item.count > 0 && this.game.drops) {
        this.game.drops.spawnDrop(x + 0.5, y + 0.5, z + 0.5, item.id, item.count);
      }
    });

    delete this.furnaces[key];
  }

  // Abre a interface da fornalha
  openUI(x, y, z) {
    this.currentFurnacePos = { x, y, z };
    this.game.state = 'FURNACE';
    this.game.input.exitPointerLock();

    this.game.ui.hideAllMenus();
    this.game.ui.updateInventory();
    this.game.ui.updateHotbar();
    this.game.ui.updateCursorItem();

    if (this.game.ui.hotbarWrapperEl) {
      this.game.ui.hotbarWrapperEl.classList.remove('hidden');
    }
    if (this.overlayEl) {
      this.overlayEl.classList.remove('hidden');
    }

    this.updateUI();
  }

  // Fecha a interface e retorna ao jogo
  closeUI() {
    if (this.game.state === 'FURNACE') {
      if (this.game.inventory) {
        this.game.inventory.returnCursorItem();
      }
      this.currentFurnacePos = null;
      if (this.overlayEl) {
        this.overlayEl.classList.add('hidden');
      }
      this.game.enterGame();
    }
  }

  // Atualização dos processos de fundição a cada quadro
  update(dt) {
    for (const key in this.furnaces) {
      const f = this.furnaces[key];
      if (!f) continue;

      const recipe = f.input ? this.smeltRecipes[f.input.id] : null;
      const canSmeltItem = recipe && (!f.output || (f.output.id === recipe.outputId && f.output.count < 64));

      // Se há combustível queimando
      if (f.fuelTimeLeft > 0) {
        f.fuelTimeLeft -= dt;
        if (f.fuelTimeLeft < 0) f.fuelTimeLeft = 0;
      }

      // Se precisa acender novo combustível e há item pronto para fundir
      if (f.fuelTimeLeft <= 0 && canSmeltItem) {
        if (f.fuel && this.fuelBurnTimes[f.fuel.id] !== undefined && f.fuel.count > 0) {
          const burnDuration = this.fuelBurnTimes[f.fuel.id];
          f.fuel.count -= 1;
          if (f.fuel.count <= 0) f.fuel = null;
          f.fuelTimeLeft = burnDuration;
          f.maxFuelTime = burnDuration;
        }
      }

      // Se o fogo está aceso e há receita válida na entrada
      if (f.fuelTimeLeft > 0 && canSmeltItem) {
        f.cookProgress += dt / this.smeltDuration;

        // Concluiu fundição de 1 item
        if (f.cookProgress >= 1.0) {
          f.cookProgress = 0;

          // Consome 1 item da entrada
          f.input.count -= 1;
          if (f.input.count <= 0) f.input = null;

          // Adiciona ao slot de saída
          if (!f.output) {
            f.output = { id: recipe.outputId, count: 1 };
          } else {
            f.output.count += 1;
          }
        }
      } else {
        // Sem fogo ou sem item válido: reseta progresso suavemente
        if (f.cookProgress > 0) {
          f.cookProgress = Math.max(0, f.cookProgress - dt * 0.5);
        }
      }
    }

    // Se a interface estiver aberta, atualiza elementos visuais em tempo real
    if (this.game.state === 'FURNACE' && this.currentFurnacePos) {
      this.updateUI();
    }
  }

  // Atualiza slots e barras de progresso na interface
  updateUI() {
    if (!this.currentFurnacePos) return;
    const { x, y, z } = this.currentFurnacePos;
    const f = this.getFurnaceAt(x, y, z);
    if (!f) return;

    // 1. Slot de Entrada
    this.renderSlot(this.inputSlotEl, f.input);

    // 2. Slot de Combustível
    this.renderSlot(this.fuelSlotEl, f.fuel);

    // 3. Slot de Saída
    this.renderSlot(this.outputSlotEl, f.output);

    // 4. Indicador de Fogo (Chama)
    if (this.fireIndicatorEl) {
      const fuelPct = f.maxFuelTime > 0 ? (f.fuelTimeLeft / f.maxFuelTime) * 100 : 0;
      this.fireIndicatorEl.style.height = `${Math.min(100, Math.max(0, fuelPct))}%`;
    }

    // 5. Barra de Progresso de Fundição
    if (this.cookProgressBarEl) {
      const cookPct = Math.round(f.cookProgress * 100);
      this.cookProgressBarEl.style.width = `${cookPct}%`;
    }
  }

  renderSlot(slotEl, item) {
    if (!slotEl) return;
    const imgEl = slotEl.querySelector('.slot-icon');
    const countEl = slotEl.querySelector('.slot-count');

    if (item && item.count > 0) {
      imgEl.src = getItemOrBlockIcon(item.id);
      imgEl.style.display = 'block';
      countEl.textContent = item.count > 1 ? String(item.count) : '';
    } else {
      imgEl.style.display = 'none';
      countEl.textContent = '';
    }
  }

  initSlotEvents() {
    const updateCursorPos = (e) => {
      if (this.game.ui && this.game.ui.cursorItemEl) {
        this.game.ui.cursorItemEl.style.left = `${e.clientX}px`;
        this.game.ui.cursorItemEl.style.top = `${e.clientY}px`;
      }
    };

    // Clique na Entrada
    this.inputSlotEl?.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      updateCursorPos(e);
      if (e.shiftKey && e.button === 0) {
        this.handleSlotShiftClick('input');
      } else {
        this.handleSlotInteraction('input', e.button === 2);
      }
    });

    // Clique no Combustível
    this.fuelSlotEl?.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      updateCursorPos(e);
      if (e.shiftKey && e.button === 0) {
        this.handleSlotShiftClick('fuel');
      } else {
        this.handleSlotInteraction('fuel', e.button === 2);
      }
    });

    // Clique na Saída (Apenas retirada ou Shift+Clique para transferência rápida)
    this.outputSlotEl?.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      updateCursorPos(e);
      if (e.shiftKey && e.button === 0) {
        this.handleOutputShiftClick();
      } else {
        this.handleOutputInteraction();
      }
    });
  }

  handleSlotInteraction(slotType, isRightClick) {
    if (!this.currentFurnacePos) return;
    const f = this.getFurnaceAt(this.currentFurnacePos.x, this.currentFurnacePos.y, this.currentFurnacePos.z);
    if (!f) return;

    const currentSlot = f[slotType];
    const cursor = this.game.inventory.cursorItem;

    if (!cursor) {
      // Pega item do slot
      if (currentSlot && currentSlot.count > 0) {
        if (isRightClick) {
          // Pega metade
          const half = Math.ceil(currentSlot.count / 2);
          const rem = currentSlot.count - half;
          this.game.inventory.cursorItem = { id: currentSlot.id, count: half };
          if (rem > 0) currentSlot.count = rem;
          else f[slotType] = null;
        } else {
          // Pega tudo
          this.game.inventory.cursorItem = { ...currentSlot };
          f[slotType] = null;
        }
      }
    } else {
      // Deposita do cursor no slot
      // Se for slot de combustível, verifica combustíveis aceitos
      if (slotType === 'fuel' && this.fuelBurnTimes[cursor.id] === undefined) {
        if (this.game.ui) this.game.ui.showToast('Combustível inválido! Use Carvão, Madeira ou Gravetos.');
        return;
      }

      // Se for slot de entrada, apenas aceita itens com receita registrada
      if (slotType === 'input' && !this.smeltRecipes[cursor.id]) {
        if (this.game.ui) this.game.ui.showToast('Este item não pode ser fundido na fornalha!');
        return;
      }

      if (!currentSlot) {
        if (isRightClick) {
          f[slotType] = { id: cursor.id, count: 1 };
          cursor.count -= 1;
          if (cursor.count <= 0) this.game.inventory.cursorItem = null;
        } else {
          f[slotType] = { ...cursor };
          this.game.inventory.cursorItem = null;
        }
      } else if (currentSlot.id === cursor.id) {
        if (isRightClick) {
          if (currentSlot.count < 64) {
            currentSlot.count += 1;
            cursor.count -= 1;
            if (cursor.count <= 0) this.game.inventory.cursorItem = null;
          }
        } else {
          const space = 64 - currentSlot.count;
          const toMove = Math.min(space, cursor.count);
          currentSlot.count += toMove;
          cursor.count -= toMove;
          if (cursor.count <= 0) this.game.inventory.cursorItem = null;
        }
      } else {
        // Troca de itens - valida antes
        if (slotType === 'fuel' && this.fuelBurnTimes[cursor.id] === undefined) return;
        if (slotType === 'input' && !this.smeltRecipes[cursor.id]) return;
        const temp = { ...currentSlot };
        f[slotType] = { ...cursor };
        this.game.inventory.cursorItem = temp;
      }
    }

    this.updateUI();
    this.game.ui.updateCursorItem();
    this.game.ui.updateInventory();
    this.game.ui.updateHotbar();
  }

  handleOutputInteraction() {
    if (!this.currentFurnacePos) return;
    const f = this.getFurnaceAt(this.currentFurnacePos.x, this.currentFurnacePos.y, this.currentFurnacePos.z);
    if (!f || !f.output) return;

    const cursor = this.game.inventory.cursorItem;

    if (!cursor) {
      this.game.inventory.cursorItem = { ...f.output };
      f.output = null;
    } else if (cursor.id === f.output.id && cursor.count < 64) {
      const space = 64 - cursor.count;
      const toMove = Math.min(space, f.output.count);
      cursor.count += toMove;
      f.output.count -= toMove;
      if (f.output.count <= 0) f.output = null;
    }

    this.updateUI();
    this.game.ui.updateCursorItem();
    this.game.ui.updateInventory();
    this.game.ui.updateHotbar();
  }

  // Transferência rápida (Shift + Clique) da saída da Fornalha para Hotbar / Inventário (Requisito 6B)
  handleOutputShiftClick() {
    if (!this.currentFurnacePos) return;
    const f = this.getFurnaceAt(this.currentFurnacePos.x, this.currentFurnacePos.y, this.currentFurnacePos.z);
    if (!f || !f.output || f.output.count <= 0) return;

    const unplaced = this.game.inventory.addItemToHotbarFirst(
      f.output.id,
      f.output.count,
      f.output.durability,
      f.output.maxDurability
    );

    const moved = f.output.count - unplaced;
    if (moved > 0) {
      f.output.count = unplaced;
      if (f.output.count <= 0) f.output = null;

      if (this.game.player) this.game.player.playSound('place');
      this.updateUI();
      if (this.game.ui) {
        this.game.ui.updateInventory();
        this.game.ui.updateHotbar();
      }
    }
  }

  // Transferência rápida (Shift + Clique) dos slots internos (Entrada / Combustível) de volta ao inventário (Requisito 6B)
  handleSlotShiftClick(slotType) {
    if (!this.currentFurnacePos) return;
    const f = this.getFurnaceAt(this.currentFurnacePos.x, this.currentFurnacePos.y, this.currentFurnacePos.z);
    if (!f || !f[slotType] || f[slotType].count <= 0) return;

    const item = f[slotType];
    const unplaced = this.game.inventory.addItemToHotbarFirst(
      item.id,
      item.count,
      item.durability,
      item.maxDurability
    );

    const moved = item.count - unplaced;
    if (moved > 0) {
      item.count = unplaced;
      if (item.count <= 0) f[slotType] = null;

      if (this.game.player) this.game.player.playSound('place');
      this.updateUI();
      if (this.game.ui) {
        this.game.ui.updateInventory();
        this.game.ui.updateHotbar();
      }
    }
  }

  // Transferência rápida do inventário do jogador para a Fornalha ao Shift-clicar um item (Requisito 6B)
  transferFromInventorySlot(slotIndex) {
    if (!this.currentFurnacePos || !this.game.inventory) return false;
    const f = this.getFurnaceAt(this.currentFurnacePos.x, this.currentFurnacePos.y, this.currentFurnacePos.z);
    if (!f) return false;

    const item = this.game.inventory.slots[slotIndex];
    if (!item || item.count <= 0) return false;

    // 1. Se for minério / item fundível, prioriza slot de Entrada
    if (this.smeltRecipes[item.id]) {
      if (!f.input) {
        f.input = { id: item.id, count: item.count };
        this.game.inventory.slots[slotIndex] = null;
        if (this.game.player) this.game.player.playSound('place');
        this.updateUI();
        return true;
      } else if (f.input.id === item.id && f.input.count < 64) {
        const space = 64 - f.input.count;
        const toMove = Math.min(space, item.count);
        f.input.count += toMove;
        item.count -= toMove;
        if (item.count <= 0) this.game.inventory.slots[slotIndex] = null;
        if (this.game.player) this.game.player.playSound('place');
        this.updateUI();
        return true;
      }
    }

    // 2. Se for combustível válido, prioriza slot de Combustível
    if (this.fuelBurnTimes[item.id] !== undefined) {
      if (!f.fuel) {
        f.fuel = { id: item.id, count: item.count };
        this.game.inventory.slots[slotIndex] = null;
        if (this.game.player) this.game.player.playSound('place');
        this.updateUI();
        return true;
      } else if (f.fuel.id === item.id && f.fuel.count < 64) {
        const space = 64 - f.fuel.count;
        const toMove = Math.min(space, item.count);
        f.fuel.count += toMove;
        item.count -= toMove;
        if (item.count <= 0) this.game.inventory.slots[slotIndex] = null;
        if (this.game.player) this.game.player.playSound('place');
        this.updateUI();
        return true;
      }
    }

    return false;
  }

  // Serialização para persistência
  serialize() {
    return this.furnaces;
  }

  // Desserialização
  deserialize(data) {
    if (!data) return;
    this.furnaces = { ...data };
  }
}

window.FurnaceManager = FurnaceManager;
