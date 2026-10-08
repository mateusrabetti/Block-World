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

    // Receitas de fundição: Entrada -> Saída
    this.smeltRecipes = {
      [BLOCK_IRON_ORE]: { outputId: ITEM_IRON_INGOT, name: 'Barra de Ferro' },
      [BLOCK_SAND]: { outputId: BLOCK_GLASS, name: 'Vidro' }
    };

    // Duração de fundição por item (em segundos)
    this.smeltDuration = 6.0;

    // Tempo de queima por unidade de Carvão (48 segundos = funde até 8 itens)
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

      // Se precisa acender novo carvão e há item pronto para fundir
      if (f.fuelTimeLeft <= 0 && canSmeltItem) {
        if (f.fuel && f.fuel.id === ITEM_COAL && f.fuel.count > 0) {
          f.fuel.count -= 1;
          if (f.fuel.count <= 0) f.fuel = null;
          f.fuelTimeLeft = this.coalBurnDuration;
          f.maxFuelTime = this.coalBurnDuration;
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
    // Clique na Entrada
    this.inputSlotEl?.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleSlotInteraction('input', e.button === 2);
    });

    // Clique no Combustível
    this.fuelSlotEl?.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleSlotInteraction('fuel', e.button === 2);
    });

    // Clique na Saída (Apenas retirada)
    this.outputSlotEl?.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleOutputInteraction();
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
      // Se for slot de combustível, apenas aceita CARVÃO
      if (slotType === 'fuel' && cursor.id !== ITEM_COAL) {
        if (this.game.ui) this.game.ui.showToast('Apenas Carvão pode ser usado como combustível!');
        return;
      }

      // Se for slot de entrada, apenas aceita itens fundíveis (ferro ou areia)
      if (slotType === 'input' && !this.smeltRecipes[cursor.id]) {
        if (this.game.ui) this.game.ui.showToast('Apenas Minério de Ferro e Areia podem ser fundidos!');
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
        // Troca de itens
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
    } else if (cursor.id === f.output.id && cursor.count + f.output.count <= 64) {
      cursor.count += f.output.count;
      f.output = null;
    }

    this.updateUI();
    this.game.ui.updateCursorItem();
    this.game.ui.updateInventory();
    this.game.ui.updateHotbar();
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
