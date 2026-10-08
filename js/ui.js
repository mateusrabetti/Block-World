// =============================================================================
// js/ui.js - Interface de Usuário: Menus, Hotbar, Inventário, Crafting 2x2 e 3x3, HUD
// =============================================================================

class UI {
  constructor(game) {
    this.game = game;

    // Modo de jogo selecionado para novo mundo
    this.selectedMode = 'survival';

    // ID do mundo atualmente selecionado na lista de mundos
    this.selectedWorldId = null;

    // Cache de elementos do DOM
    this.initElements();

    // Constrói os slots estáticos da Hotbar, Inventário e Bancada de Trabalho
    this.buildHotbarDOM();
    this.buildInventoryDOM();
    this.buildCraftingTableDOM();
    this.buildCreativeInventoryDOM();

    // Eventos de clique nos menus e seletores
    this.initMenuEvents();

    // Eventos do mouse no inventário (arrastar / soltar itens)
    this.initInventoryMouseEvents();
  }

  initElements() {
    // Telas principais
    this.mainMenuEl = document.getElementById('screen-main-menu');
    this.worldsMenuEl = document.getElementById('screen-worlds');
    this.createWorldMenuEl = document.getElementById('screen-create-world');
    this.pauseMenuEl = document.getElementById('screen-pause');
    this.inventoryOverlayEl = document.getElementById('screen-inventory');
    this.craftingTableOverlayEl = document.getElementById('screen-crafting-table');
    this.furnaceOverlayEl = document.getElementById('screen-furnace');
    this.creativeInventoryOverlayEl = document.getElementById('screen-creative-inventory');
    this.deathScreenEl = document.getElementById('screen-death');
    this.settingsMenuEl = document.getElementById('screen-settings');

    // Elementos do HUD
    this.crosshairEl = document.getElementById('crosshair');
    this.topHudEl = document.getElementById('top-hud');
    this.hudDayEl = document.getElementById('hud-day');
    this.coordsEl = document.getElementById('hud-coords');
    this.biomeEl = document.getElementById('hud-biome');
    this.flyBadgeEl = document.getElementById('hud-fly-badge');
    this.hotbarWrapperEl = document.getElementById('hotbar-wrapper');
    this.hotbarContainer = document.getElementById('hotbar');
    this.selectedBlockName = document.getElementById('selected-block-name');

    // Catálogo Criativo
    this.creativeCatalogGrid = document.getElementById('creative-catalog-grid');
    this.creativeHotbarGrid = document.getElementById('creative-hotbar-grid');
    this.currentCreativeTab = 'blocks';

    // Barra de progresso de mineração
    this.miningProgressContainer = document.getElementById('mining-progress-container');
    this.miningProgressBar = document.getElementById('mining-progress-bar');

    // Elemento do item segurado pelo cursor no inventário
    this.cursorItemEl = document.getElementById('inventory-cursor-item');

    // Notificações Toast
    this.toastEl = document.getElementById('toast-notification');
  }

  // ===========================================================================
  // CONSTRUÇÃO E ATUALIZAÇÃO DA HOTBAR (9 SLOTS INFERIORES)
  // ===========================================================================
  buildHotbarDOM() {
    this.hotbarContainer.innerHTML = '';

    for (let i = 0; i < 9; i++) {
      const slotEl = document.createElement('div');
      slotEl.className = 'hotbar-slot';
      slotEl.dataset.index = i;

      const imgEl = document.createElement('img');
      imgEl.className = 'slot-icon';
      imgEl.alt = 'Item';

      const keyEl = document.createElement('span');
      keyEl.className = 'slot-key';
      keyEl.textContent = String(i + 1);

      const countEl = document.createElement('span');
      countEl.className = 'slot-count';

      // Barra de durabilidade da ferramenta
      const durEl = document.createElement('div');
      durEl.className = 'slot-durability-track hidden';
      const durFill = document.createElement('div');
      durFill.className = 'slot-durability-fill';
      durEl.appendChild(durFill);

      slotEl.appendChild(imgEl);
      slotEl.appendChild(keyEl);
      slotEl.appendChild(countEl);
      slotEl.appendChild(durEl);

      // Clique direto no slot da hotbar
      slotEl.addEventListener('click', () => {
        this.selectHotbarSlot(i);
      });

      this.hotbarContainer.appendChild(slotEl);
    }
  }

  updateHotbar() {
    if (!this.game.inventory) return;

    const selectedIndex = this.game.inventory.selectedHotbarIndex;
    const slots = this.hotbarContainer.querySelectorAll('.hotbar-slot');

    slots.forEach((slotEl, idx) => {
      const item = this.game.inventory.slots[idx];
      const imgEl = slotEl.querySelector('.slot-icon');
      const countEl = slotEl.querySelector('.slot-count');
      const durTrack = slotEl.querySelector('.slot-durability-track');
      const durFill = slotEl.querySelector('.slot-durability-fill');

      if (idx === selectedIndex) {
        slotEl.classList.add('active');
      } else {
        slotEl.classList.remove('active');
      }

      if (item && item.count > 0) {
        imgEl.src = getItemOrBlockIcon(item.id);
        imgEl.style.display = 'block';
        countEl.textContent = item.count > 1 ? String(item.count) : '';

        // Durabilidade
        this.renderDurability(durTrack, durFill, item);
      } else {
        imgEl.style.display = 'none';
        countEl.textContent = '';
        if (durTrack) durTrack.classList.add('hidden');
      }
    });

    // Atualiza o rótulo com o nome do item selecionado
    const currentItem = this.game.inventory.getSelectedHotbarItem();
    if (currentItem && currentItem.count > 0) {
      const name = getItemOrBlockName(currentItem.id);
      const def = getItemOrBlockDef(currentItem.id);
      if (def?.isTool && currentItem.durability !== undefined) {
        this.selectedBlockName.textContent = `${name} (${currentItem.durability}/${currentItem.maxDurability || def.maxDurability})`;
      } else {
        this.selectedBlockName.textContent = `${name} (${currentItem.count})`;
      }
    } else {
      this.selectedBlockName.textContent = 'Vazio';
    }
  }

  renderDurability(durTrack, durFill, item) {
    if (!durTrack || !durFill) return;

    const def = getItemOrBlockDef(item.id);
    if (def?.isTool && item.durability !== undefined) {
      const max = item.maxDurability || def.maxDurability || 60;
      const ratio = Math.max(0, Math.min(1, item.durability / max));

      durTrack.classList.remove('hidden');
      durFill.style.width = `${ratio * 100}%`;

      if (ratio > 0.5) {
        durFill.style.backgroundColor = '#22c55e'; // Verde
      } else if (ratio > 0.25) {
        durFill.style.backgroundColor = '#eab308'; // Amarelo
      } else {
        durFill.style.backgroundColor = '#ef4444'; // Vermelho
      }
    } else {
      durTrack.classList.add('hidden');
    }
  }

  selectHotbarSlot(index) {
    if (index < 0 || index >= 9 || !this.game.inventory) return;
    this.game.inventory.selectedHotbarIndex = index;
    this.updateHotbar();
  }

  selectNextHotbarSlot() {
    if (!this.game.inventory) return;
    let next = (this.game.inventory.selectedHotbarIndex + 1) % 9;
    this.selectHotbarSlot(next);
  }

  selectPrevHotbarSlot() {
    if (!this.game.inventory) return;
    let prev = (this.game.inventory.selectedHotbarIndex - 1 + 9) % 9;
    this.selectHotbarSlot(prev);
  }

  // ===========================================================================
  // CONSTRUÇÃO E ATUALIZAÇÃO DO INVENTÁRIO (36 SLOTS + CRAFTING 2x2)
  // ===========================================================================
  buildInventoryDOM() {
    const mainGrid = document.getElementById('inv-main-grid');
    const hotbarGrid = document.getElementById('inv-hotbar-grid');
    const craftGrid = document.getElementById('inv-craft-grid');
    const craftOutput = document.getElementById('inv-craft-output');

    if (mainGrid && hotbarGrid) {
      mainGrid.innerHTML = '';
      hotbarGrid.innerHTML = '';

      // Slots 9 a 35: Mochila principal (3 linhas de 9 = 27 slots)
      for (let i = 9; i < 36; i++) {
        const slotEl = this.createInventorySlotElement(i);
        mainGrid.appendChild(slotEl);
      }

      // Slots 0 a 8: Linha da Hotbar no inventário (1 linha de 9)
      for (let i = 0; i < 9; i++) {
        const slotEl = this.createInventorySlotElement(i);
        hotbarGrid.appendChild(slotEl);
      }
    }

    // Grade 2x2 de Crafting no Inventário
    if (craftGrid) {
      craftGrid.innerHTML = '';
      for (let i = 0; i < 4; i++) {
        const slotEl = document.createElement('div');
        slotEl.className = 'inv-slot craft-slot';
        slotEl.dataset.craftIndex = i;

        const imgEl = document.createElement('img');
        imgEl.className = 'slot-icon';
        imgEl.alt = 'Ingrediente';

        const countEl = document.createElement('span');
        countEl.className = 'slot-count';

        slotEl.appendChild(imgEl);
        slotEl.appendChild(countEl);

        slotEl.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.cursorItemEl) {
            this.cursorItemEl.style.left = `${e.clientX}px`;
            this.cursorItemEl.style.top = `${e.clientY}px`;
          }

          if (e.button === 0) {
            this.game.crafting.handleGridLeftClick(i, false);
          } else if (e.button === 2) {
            this.game.crafting.handleGridRightClick(i, false);
          }

          this.updateCraftingGrids();
          this.updateCursorItem();
        });

        craftGrid.appendChild(slotEl);
      }
    }

    // Slot de Resultado (Output) 2x2
    if (craftOutput) {
      craftOutput.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.button === 0) {
          this.game.crafting.handleOutputClick(false);
          this.updateCraftingGrids();
          this.updateInventory();
          this.updateHotbar();
          this.updateCursorItem();
        }
      });
    }
  }

  // ===========================================================================
  // CONSTRUÇÃO E ATUALIZAÇÃO DA BANCADA DE TRABALHO (CRAFTING 3x3)
  // ===========================================================================
  buildCraftingTableDOM() {
    const tableCraftGrid = document.getElementById('table-craft-grid');
    const tableCraftOutput = document.getElementById('table-craft-output');
    const tableMainGrid = document.getElementById('table-main-grid');
    const tableHotbarGrid = document.getElementById('table-hotbar-grid');

    if (tableCraftGrid) {
      tableCraftGrid.innerHTML = '';
      for (let i = 0; i < 9; i++) {
        const slotEl = document.createElement('div');
        slotEl.className = 'inv-slot craft-slot';
        slotEl.dataset.tableCraftIndex = i;

        const imgEl = document.createElement('img');
        imgEl.className = 'slot-icon';
        imgEl.alt = 'Ingrediente';

        const countEl = document.createElement('span');
        countEl.className = 'slot-count';

        slotEl.appendChild(imgEl);
        slotEl.appendChild(countEl);

        slotEl.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.cursorItemEl) {
            this.cursorItemEl.style.left = `${e.clientX}px`;
            this.cursorItemEl.style.top = `${e.clientY}px`;
          }

          if (e.button === 0) {
            this.game.crafting.handleGridLeftClick(i, true);
          } else if (e.button === 2) {
            this.game.crafting.handleGridRightClick(i, true);
          }

          this.updateCraftingGrids();
          this.updateCursorItem();
        });

        tableCraftGrid.appendChild(slotEl);
      }
    }

    if (tableCraftOutput) {
      tableCraftOutput.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.button === 0) {
          this.game.crafting.handleOutputClick(true);
          this.updateCraftingGrids();
          this.updateInventory();
          this.updateHotbar();
          this.updateCursorItem();
        }
      });
    }

    // Espelho da mochila e da hotbar na tela da bancada
    if (tableMainGrid && tableHotbarGrid) {
      tableMainGrid.innerHTML = '';
      tableHotbarGrid.innerHTML = '';

      for (let i = 9; i < 36; i++) {
        const slotEl = this.createInventorySlotElement(i);
        tableMainGrid.appendChild(slotEl);
      }

      for (let i = 0; i < 9; i++) {
        const slotEl = this.createInventorySlotElement(i);
        tableHotbarGrid.appendChild(slotEl);
      }
    }
  }

  // ===========================================================================
  // CONSTRUÇÃO E GERENCIAMENTO DO INVENTÁRIO CRIATIVO (Requisitos 27 a 29)
  // ===========================================================================
  buildCreativeInventoryDOM() {
    // Botão de fechar (X)
    document.getElementById('btn-close-creative-inv')?.addEventListener('click', () => {
      this.game.closeInventory();
    });

    // Abas de categorias
    const tabBlocks = document.getElementById('tab-creative-blocks');
    const tabTools = document.getElementById('tab-creative-tools');
    const tabItems = document.getElementById('tab-creative-items');

    const switchTab = (tabName, clickedBtn) => {
      this.currentCreativeTab = tabName;
      document.querySelectorAll('.btn-creative-tab').forEach(b => b.classList.remove('active'));
      clickedBtn?.classList.add('active');
      this.renderCreativeCatalog(tabName);
    };

    tabBlocks?.addEventListener('click', () => switchTab('blocks', tabBlocks));
    tabTools?.addEventListener('click', () => switchTab('tools', tabTools));
    tabItems?.addEventListener('click', () => switchTab('items', tabItems));

    // Constrói os slots da Hotbar no rodapé do inventário criativo
    if (this.creativeHotbarGrid) {
      this.creativeHotbarGrid.innerHTML = '';
      for (let i = 0; i < 9; i++) {
        const slotEl = this.createInventorySlotElement(i);
        this.creativeHotbarGrid.appendChild(slotEl);
      }
    }
  }

  // Renderiza o catálogo de itens da categoria escolhida
  renderCreativeCatalog(category = 'blocks') {
    if (!this.creativeCatalogGrid) return;
    this.creativeCatalogGrid.innerHTML = '';

    let items = [];
    if (category === 'blocks') {
      items = [
        BLOCK_GRASS, BLOCK_DIRT, BLOCK_STONE, BLOCK_SAND, BLOCK_WOOD,
        BLOCK_LEAVES, BLOCK_PLANKS, BLOCK_BRICKS, BLOCK_GLASS,
        BLOCK_COAL_ORE, BLOCK_IRON_ORE, BLOCK_CRAFTING_TABLE, BLOCK_FURNACE
      ];
    } else if (category === 'tools') {
      items = [
        ITEM_WOODEN_PICKAXE, ITEM_STONE_PICKAXE, ITEM_IRON_PICKAXE,
        ITEM_WOODEN_AXE, ITEM_STONE_AXE, ITEM_IRON_AXE,
        ITEM_WOODEN_SHOVEL, ITEM_STONE_SHOVEL, ITEM_IRON_SHOVEL,
        ITEM_WOODEN_SWORD, ITEM_STONE_SWORD, ITEM_IRON_SWORD
      ];
    } else if (category === 'items') {
      items = [
        ITEM_COAL, ITEM_IRON_INGOT, ITEM_STICK, ITEM_PORKCHOP
      ];
    }

    items.forEach(id => {
      const slotEl = document.createElement('div');
      slotEl.className = 'inv-slot creative-catalog-slot';
      slotEl.title = getItemOrBlockName(id);

      const imgEl = document.createElement('img');
      imgEl.className = 'slot-icon';
      imgEl.src = getItemOrBlockIcon(id);
      imgEl.style.display = 'block';

      slotEl.appendChild(imgEl);

      // Clique no catálogo dá o item diretamente ao jogador (Requisito 29)
      slotEl.addEventListener('click', () => {
        const def = getItemOrBlockDef(id);
        const count = (def && def.isTool) ? 1 : 64;

        this.game.inventory.addItem(id, count);
        if (this.game.player) {
          this.game.player.playSound('place');
        }

        this.updateHotbar();
        this.updateInventory();
        this.showToast(`Adicionado: ${getItemOrBlockName(id)}`);
      });

      this.creativeCatalogGrid.appendChild(slotEl);
    });
  }

  showCreativeInventory() {
    this.hideAllMenus();
    this.game.state = 'CREATIVE_INVENTORY';
    this.renderCreativeCatalog(this.currentCreativeTab || 'blocks');
    this.updateInventory();
    this.updateHotbar();

    if (this.hotbarWrapperEl) this.hotbarWrapperEl.classList.remove('hidden');
    if (this.creativeInventoryOverlayEl) this.creativeInventoryOverlayEl.classList.remove('hidden');
  }

  createInventorySlotElement(index) {
    const slotEl = document.createElement('div');
    slotEl.className = 'inv-slot';
    slotEl.dataset.slotIndex = index;

    const imgEl = document.createElement('img');
    imgEl.className = 'slot-icon';
    imgEl.alt = 'Item';

    const countEl = document.createElement('span');
    countEl.className = 'slot-count';

    // Barra de durabilidade
    const durTrack = document.createElement('div');
    durTrack.className = 'slot-durability-track hidden';
    const durFill = document.createElement('div');
    durFill.className = 'slot-durability-fill';
    durTrack.appendChild(durFill);

    slotEl.appendChild(imgEl);
    slotEl.appendChild(countEl);
    slotEl.appendChild(durTrack);

    // Eventos de clique com botão esquerdo e direito
    slotEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Posiciona o elemento flutuante imediatamente sob o cursor
      if (this.cursorItemEl) {
        this.cursorItemEl.style.left = `${e.clientX}px`;
        this.cursorItemEl.style.top = `${e.clientY}px`;
      }

      if (e.button === 0) {
        this.game.inventory.handleSlotLeftClick(index);
      } else if (e.button === 2) {
        this.game.inventory.handleSlotRightClick(index);
      }

      this.updateInventory();
      this.updateHotbar();
      this.updateCursorItem();
    });

    return slotEl;
  }

  updateInventory() {
    if (!this.game.inventory) return;

    // Atualiza slots no inventário pessoal e na bancada de trabalho
    const allSlots = document.querySelectorAll('.inventory-window .inv-slot[data-slot-index]');
    allSlots.forEach(slotEl => {
      const idx = parseInt(slotEl.dataset.slotIndex, 10);
      const item = this.game.inventory.slots[idx];
      const imgEl = slotEl.querySelector('.slot-icon');
      const countEl = slotEl.querySelector('.slot-count');
      const durTrack = slotEl.querySelector('.slot-durability-track');
      const durFill = slotEl.querySelector('.slot-durability-fill');

      if (item && item.count > 0) {
        imgEl.src = getItemOrBlockIcon(item.id);
        imgEl.style.display = 'block';
        countEl.textContent = item.count > 1 ? String(item.count) : '';
        this.renderDurability(durTrack, durFill, item);
      } else {
        imgEl.style.display = 'none';
        countEl.textContent = '';
        if (durTrack) durTrack.classList.add('hidden');
      }
    });

    this.updateCraftingGrids();
  }

  updateCraftingGrids() {
    if (!this.game.crafting) return;

    // 1. Grade 2x2 do inventário
    const invGridSlots = document.querySelectorAll('#inv-craft-grid .craft-slot');
    invGridSlots.forEach((slotEl, idx) => {
      const item = this.game.crafting.invGrid[idx];
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
    });

    const invOutputEl = document.getElementById('inv-craft-output');
    if (invOutputEl) {
      const outItem = this.game.crafting.invOutput;
      const imgEl = invOutputEl.querySelector('.slot-icon');
      const countEl = invOutputEl.querySelector('.slot-count');
      if (outItem && outItem.count > 0) {
        imgEl.src = getItemOrBlockIcon(outItem.id);
        imgEl.style.display = 'block';
        countEl.textContent = outItem.count > 1 ? String(outItem.count) : '';
        invOutputEl.classList.add('has-result');
      } else {
        imgEl.style.display = 'none';
        countEl.textContent = '';
        invOutputEl.classList.remove('has-result');
      }
    }

    // 2. Grade 3x3 da Bancada de Trabalho
    const tableGridSlots = document.querySelectorAll('#table-craft-grid .craft-slot');
    tableGridSlots.forEach((slotEl, idx) => {
      const item = this.game.crafting.tableGrid[idx];
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
    });

    const tableOutputEl = document.getElementById('table-craft-output');
    if (tableOutputEl) {
      const outItem = this.game.crafting.tableOutput;
      const imgEl = tableOutputEl.querySelector('.slot-icon');
      const countEl = tableOutputEl.querySelector('.slot-count');
      if (outItem && outItem.count > 0) {
        imgEl.src = getItemOrBlockIcon(outItem.id);
        imgEl.style.display = 'block';
        countEl.textContent = outItem.count > 1 ? String(outItem.count) : '';
        tableOutputEl.classList.add('has-result');
      } else {
        imgEl.style.display = 'none';
        countEl.textContent = '';
        tableOutputEl.classList.remove('has-result');
      }
    }
  }

  initInventoryMouseEvents() {
    window.addEventListener('mousemove', (e) => {
      if ((this.game.state === 'INVENTORY' || this.game.state === 'CRAFTING_TABLE') && this.cursorItemEl) {
        this.cursorItemEl.style.left = `${e.clientX}px`;
        this.cursorItemEl.style.top = `${e.clientY}px`;
      }
    });
  }

  updateCursorItem() {
    if (!this.cursorItemEl) return;
    const item = this.game.inventory?.cursorItem;

    if (item && item.count > 0) {
      const imgEl = this.cursorItemEl.querySelector('.cursor-item-icon');
      const countEl = this.cursorItemEl.querySelector('.cursor-item-count');
      imgEl.src = getItemOrBlockIcon(item.id);
      countEl.textContent = item.count > 1 ? String(item.count) : '';
      this.cursorItemEl.classList.remove('hidden');
    } else {
      this.cursorItemEl.classList.add('hidden');
    }
  }

  // Atualização visual da barra de progresso de mineração
  updateMiningProgress(progress) {
    if (!this.miningProgressContainer || !this.miningProgressBar) return;

    if (progress > 0 && progress < 1.0) {
      this.miningProgressContainer.classList.remove('hidden');
      const pct = Math.min(100, Math.round(progress * 100));
      this.miningProgressBar.style.width = `${pct}%`;
    } else {
      this.miningProgressContainer.classList.add('hidden');
      this.miningProgressBar.style.width = '0%';
    }
  }

  // ===========================================================================
  // GERENCIAMENTO DE MENUS E NAVEGAÇÃO
  // ===========================================================================
  initMenuEvents() {
    // Menu Principal: JOGAR -> Vai para o Menu de Mundos
    document.getElementById('btn-main-play')?.addEventListener('click', () => {
      this.showWorldsScreen();
    });

    // Menu Principal: MUNDOS -> Vai para o Menu de Mundos
    document.getElementById('btn-main-worlds')?.addEventListener('click', () => {
      this.showWorldsScreen();
    });

    // Menu Principal: CONFIGURAÇÕES
    document.getElementById('btn-main-settings')?.addEventListener('click', () => {
      this.showSettingsScreen();
    });

    // Tela de Mundos: ENTRAR NO MUNDO SELECIONADO
    document.getElementById('btn-worlds-play-selected')?.addEventListener('click', () => {
      if (!this.selectedWorldId) return;
      this.game.worldManager.loadWorld(this.selectedWorldId);
      this.game.enterGame();
    });

    // Tela de Mundos: CRIAR NOVO MUNDO
    document.getElementById('btn-open-create-world')?.addEventListener('click', () => {
      this.showCreateWorldScreen();
    });

    // Tela de Mundos: VOLTAR AO MENU PRINCIPAL
    document.getElementById('btn-worlds-back')?.addEventListener('click', () => {
      this.showMainMenu();
    });

    // Seletores de Modo de Jogo na Tela de Criação
    const btnModeSurvival = document.getElementById('btn-mode-survival');
    const btnModeCreative = document.getElementById('btn-mode-creative');
    const hintText = document.getElementById('mode-hint-text');

    btnModeSurvival?.addEventListener('click', () => {
      this.selectedMode = 'survival';
      btnModeSurvival.classList.add('active');
      btnModeCreative?.classList.remove('active');
      if (hintText) {
        hintText.textContent = 'Sobrevivência: Colete recursos, use ferramentas, gerencie sua vida e crie itens para progredir.';
      }
    });

    btnModeCreative?.addEventListener('click', () => {
      this.selectedMode = 'creative';
      btnModeCreative.classList.add('active');
      btnModeSurvival?.classList.remove('active');
      if (hintText) {
        hintText.textContent = 'Criativo: Voo livre (duplo espaço), blocos infinitos, quebra instantânea e sem dano.';
      }
    });

    // Tela de Criação: GERAR SEED ALEATÓRIA
    document.getElementById('btn-random-seed')?.addEventListener('click', () => {
      const seedInput = document.getElementById('input-world-seed');
      if (seedInput) {
        seedInput.value = Math.floor(Math.random() * 899999 + 100000);
      }
    });

    // Tela de Criação: CRIAR MUNDO (Confirmar)
    const handleConfirmCreateWorld = () => {
      const btn = document.getElementById('btn-confirm-create-world');
      if (btn && btn.disabled) return;
      if (btn) {
        btn.disabled = true;
        setTimeout(() => { btn.disabled = false; }, 600);
      }

      const nameInput = document.getElementById('input-world-name');
      const seedInput = document.getElementById('input-world-seed');

      const name = nameInput ? nameInput.value : '';
      const seed = seedInput ? seedInput.value : '';

      this.game.worldManager.createNewWorldAndEnter(name, seed, this.selectedMode);
    };

    document.getElementById('btn-confirm-create-world')?.addEventListener('click', handleConfirmCreateWorld);

    // Suporte à tecla Enter nos campos de criação de mundo
    document.getElementById('input-world-name')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleConfirmCreateWorld();
    });
    document.getElementById('input-world-seed')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleConfirmCreateWorld();
    });

    // Tela de Criação: CANCELAR
    document.getElementById('btn-cancel-create-world')?.addEventListener('click', () => {
      this.showWorldsScreen();
    });

    // Tela de Pausa: CONTINUAR
    document.getElementById('btn-pause-resume')?.addEventListener('click', () => {
      this.game.resumeGame();
    });

    // Tela de Pausa: SALVAR E VOLTAR AO MENU
    document.getElementById('btn-pause-menu')?.addEventListener('click', () => {
      this.game.worldManager.exitWorldToMenu();
    });

    // Tela de Configurações: FECHAR
    document.getElementById('btn-settings-close')?.addEventListener('click', () => {
      this.hideAllMenus();
      this.showMainMenu();
    });

    // Botão de fechar inventário (X)
    document.getElementById('btn-close-inventory')?.addEventListener('click', () => {
      this.game.closeInventory();
    });

    // Botão de fechar bancada de trabalho (X)
    document.getElementById('btn-close-crafting-table')?.addEventListener('click', () => {
      this.game.closeCraftingTable();
    });
  }

  hideAllMenus() {
    this.mainMenuEl?.classList.add('hidden');
    this.worldsMenuEl?.classList.add('hidden');
    this.createWorldMenuEl?.classList.add('hidden');
    this.pauseMenuEl?.classList.add('hidden');
    this.inventoryOverlayEl?.classList.add('hidden');
    this.craftingTableOverlayEl?.classList.add('hidden');
    this.furnaceOverlayEl?.classList.add('hidden');
    this.creativeInventoryOverlayEl?.classList.add('hidden');
    this.deathScreenEl?.classList.add('hidden');
    this.settingsMenuEl?.classList.add('hidden');

    this.crosshairEl?.classList.add('hidden');
    this.topHudEl?.classList.add('hidden');
    this.hotbarWrapperEl?.classList.add('hidden');
    this.cursorItemEl?.classList.add('hidden');
    this.updateMiningProgress(0);
  }

  showMainMenu() {
    this.hideAllMenus();
    this.mainMenuEl?.classList.remove('hidden');
  }

  showWorldsScreen() {
    this.hideAllMenus();
    this.renderWorldsList();
    this.worldsMenuEl?.classList.remove('hidden');
  }

  showCreateWorldScreen() {
    this.hideAllMenus();
    const nameInput = document.getElementById('input-world-name');
    const seedInput = document.getElementById('input-world-seed');
    const worlds = SaveSystem.getWorlds();

    if (nameInput) nameInput.value = `Mundo ${worlds.length + 1}`;
    if (seedInput) seedInput.value = Math.floor(Math.random() * 899999 + 100000);

    // Reseta modo padrão para sobrevivência
    this.selectedMode = 'survival';
    document.getElementById('btn-mode-survival')?.classList.add('active');
    document.getElementById('btn-mode-creative')?.classList.remove('active');
    const hintText = document.getElementById('mode-hint-text');
    if (hintText) {
      hintText.textContent = 'Sobrevivência: Colete recursos, use ferramentas, gerencie sua vida e crie itens para progredir.';
    }

    this.createWorldMenuEl?.classList.remove('hidden');
  }

  showPauseMenu() {
    this.hideAllMenus();
    this.pauseMenuEl?.classList.remove('hidden');
  }

  showInventory() {
    // No modo Criativo abre o Catálogo Criativo especial (Requisitos 27 a 29)
    if (this.game.gameMode === 'creative') {
      this.showCreativeInventory();
      return;
    }

    this.hideAllMenus();
    this.updateInventory();
    this.updateHotbar();
    this.updateCursorItem();

    // Mantém o HUD visível de fundo
    this.hotbarWrapperEl?.classList.remove('hidden');
    this.inventoryOverlayEl?.classList.remove('hidden');
  }

  showCraftingTable() {
    this.hideAllMenus();
    this.updateInventory();
    this.updateHotbar();
    this.updateCursorItem();

    // Mantém o HUD visível de fundo
    this.hotbarWrapperEl?.classList.remove('hidden');
    this.craftingTableOverlayEl?.classList.remove('hidden');
  }

  showSettingsScreen() {
    this.hideAllMenus();
    this.settingsMenuEl?.classList.remove('hidden');
  }

  showInGameHUD() {
    this.hideAllMenus();
    this.crosshairEl?.classList.remove('hidden');
    this.topHudEl?.classList.remove('hidden');
    this.hotbarWrapperEl?.classList.remove('hidden');

    if (this.game.health) {
      this.game.health.updateHeartsUI();
    }
  }

  // Renderiza a lista de mundos salvos dinamicamente
  // Renderiza a lista de mundos salvos dinamicamente
  renderWorldsList() {
    const listContainer = document.getElementById('worlds-list-container');
    const playSelectedBtn = document.getElementById('btn-worlds-play-selected');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    const worlds = SaveSystem.getWorlds();

    if (worlds.length === 0) {
      this.selectedWorldId = null;
      if (playSelectedBtn) playSelectedBtn.disabled = true;
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'worlds-empty-msg';
      emptyMsg.textContent = 'Nenhum mundo encontrado. Crie um novo mundo para começar!';
      listContainer.appendChild(emptyMsg);
      return;
    }

    // Se nenhum mundo estiver selecionado ou o selecionado foi excluído, seleciona o primeiro
    if (!this.selectedWorldId || !worlds.some(w => w.id === this.selectedWorldId)) {
      this.selectedWorldId = worlds[0].id;
    }
    if (playSelectedBtn) playSelectedBtn.disabled = !this.selectedWorldId;

    worlds.forEach((world) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'world-item-card' + (world.id === this.selectedWorldId ? ' selected' : '');
      itemEl.dataset.worldId = world.id;

      const infoDiv = document.createElement('div');
      infoDiv.className = 'world-info';

      const nameEl = document.createElement('div');
      nameEl.className = 'world-name';
      nameEl.textContent = world.name;

      const detailsEl = document.createElement('div');
      detailsEl.className = 'world-details';
      const dateStr = new Date(world.lastPlayed || world.createdAt).toLocaleDateString();
      const modeLabel = world.mode === 'creative' ? '🎨 Criativo' : '⚔️ Sobrevivência';
      detailsEl.textContent = `${modeLabel} • Seed: ${world.seed} • Jogado em: ${dateStr}`;

      infoDiv.appendChild(nameEl);
      infoDiv.appendChild(detailsEl);

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'world-actions';

      // Botão Entrar
      const enterBtn = document.createElement('button');
      enterBtn.className = 'btn-world-action btn-enter';
      enterBtn.textContent = 'ENTRAR';
      enterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedWorldId = world.id;
        this.game.worldManager.loadWorld(world.id);
        this.game.enterGame();
      });

      // Botão Excluir
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-world-action btn-delete';
      deleteBtn.textContent = 'EXCLUIR';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Tem certeza de que deseja excluir o mundo "${world.name}"?`)) {
          SaveSystem.deleteWorld(world.id);
          this.renderWorldsList();
        }
      });

      actionsDiv.appendChild(enterBtn);
      actionsDiv.appendChild(deleteBtn);

      itemEl.appendChild(infoDiv);
      itemEl.appendChild(actionsDiv);

      // Clique no card seleciona o mundo
      itemEl.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete')) return;
        this.selectedWorldId = world.id;
        this.updateSelectedWorldCardUI();
      });

      // Duplo clique entra diretamente no mundo
      itemEl.addEventListener('dblclick', () => {
        this.selectedWorldId = world.id;
        this.game.worldManager.loadWorld(world.id);
        this.game.enterGame();
      });

      listContainer.appendChild(itemEl);
    });
  }

  updateSelectedWorldCardUI() {
    const playSelectedBtn = document.getElementById('btn-worlds-play-selected');
    if (playSelectedBtn) {
      playSelectedBtn.disabled = !this.selectedWorldId;
    }

    const cards = document.querySelectorAll('#worlds-list-container .world-item-card');
    cards.forEach(card => {
      if (card.dataset.worldId === this.selectedWorldId) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });
  }

  // Notificação toast na tela
  showToast(message, duration = 2500) {
    if (!this.toastEl) return;
    this.toastEl.textContent = message;
    this.toastEl.classList.add('visible');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastEl.classList.remove('visible');
    }, duration);
  }

  onWorldLoaded() {
    this.updateHotbar();
    this.updateInventory();
    if (this.game.health) {
      this.game.health.updateHeartsUI();
    }
  }

  // Atualização por quadro (Coordenadas, Bioma, Voo)
  update() {
    if (!this.game.player) return;

    const p = this.game.player.position;
    if (this.coordsEl) {
      this.coordsEl.textContent = `XYZ: ${p.x.toFixed(1)} / ${p.y.toFixed(1)} / ${p.z.toFixed(1)}`;
    }

    if (this.biomeEl && this.game.world) {
      const biome = this.game.world.getBiome(Math.floor(p.x), Math.floor(p.z));
      const biomeLabels = {
        'PLAINS': 'Planície',
        'FOREST': 'Floresta',
        'DESERT': 'Deserto',
        'MOUNTAIN': 'Montanha'
      };
      this.biomeEl.textContent = `Bioma: ${biomeLabels[biome] || biome}`;
    }

    if (this.flyBadgeEl) {
      // Voo apenas no modo criativo
      if (this.game.gameMode === 'creative' && this.game.player.isFlying) {
        this.flyBadgeEl.classList.remove('hidden');
      } else {
        this.flyBadgeEl.classList.add('hidden');
      }
    }

    if (this.hudDayEl && this.game.worldTime) {
      const isDay = this.game.worldTime.isDay;
      const icon = isDay ? '☀️' : '🌙';
      const phase = this.game.worldTime.phaseName;
      this.hudDayEl.textContent = `${icon} Dia ${this.game.worldTime.currentDay} (${phase})`;
    }
  }
}
