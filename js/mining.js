// =============================================================================
// js/mining.js - Sistema de Mineração, Tempo de Quebra, Eficiência e Drops
// =============================================================================

class MiningSystem {
  constructor(game) {
    this.game = game;

    // Estado atual da mineração
    this.isMining = false;
    this.targetKey = null;
    this.targetPos = null;
    this.blockType = BLOCK_AIR;
    this.progress = 0; // 0.0 a 1.0
    this.breakTime = 1.0;
    this.lastHitSoundTime = 0;
  }

  // Inicia mineração em um bloco
  startMining(targetBlock) {
    if (!targetBlock || !targetBlock.block) return;
    const { x, y, z } = targetBlock.block;

    // Bedrock inquebrável
    if (y === 0) return;

    const blockType = this.game.world.getBlock(x, y, z);
    const def = BLOCK_TYPES[blockType];
    if (!def || !def.breakable) return;

    const key = `${x},${y},${z}`;

    if (this.targetKey !== key) {
      this.targetKey = key;
      this.targetPos = { x, y, z };
      this.blockType = blockType;
      this.progress = 0;
      this.breakTime = this.calculateBreakTime(blockType);
      this.lastHitSoundTime = performance.now();
    }

    this.isMining = true;
  }

  // Interrompe a mineração
  stopMining() {
    this.isMining = false;
    this.targetKey = null;
    this.targetPos = null;
    this.progress = 0;
    if (this.game.ui) {
      this.game.ui.updateMiningProgress(0);
    }
  }

  // Calcula o tempo em segundos para quebrar o bloco
  calculateBreakTime(blockType) {
    const def = BLOCK_TYPES[blockType];
    if (!def) return 1.0;

    const hardness = (def.hardness !== undefined) ? def.hardness : 1.5;
    const heldItem = this.game.inventory.getSelectedHotbarItem();
    const toolDef = heldItem ? getItemOrBlockDef(heldItem.id) : null;

    const isTool = toolDef && toolDef.isTool;
    const matchesTool = isTool && toolDef.toolType === def.preferredTool;
    const reqLevel = def.requiredHarvestLevel || 0;
    const hasLevel = isTool && (toolDef.harvestLevel || 0) >= reqLevel;

    // 1. Se o bloco exige ferramenta e o jogador não a possui
    if (reqLevel > 0 && !hasLevel) {
      // Mineração extremamente demorada (penalidade alta)
      return Math.max(3.5, hardness * 4.0);
    }

    // 2. Se está usando a ferramenta adequada com tier correto
    if (matchesTool) {
      const speed = toolDef.speed || 2.0;
      return Math.max(0.18, (hardness * 1.5) / speed);
    }

    // 3. Quebra com a mão ou ferramenta incompatível
    return Math.max(0.25, hardness * 1.6);
  }

  // Atualização a cada quadro (chamada quando o botão esquerdo está pressionado)
  update(dt) {
    if (!this.isMining || !this.targetPos) return;

    // Verifica se o jogador ainda está mirando no mesmo bloco
    const currentTarget = this.game.player.targetBlock;
    if (!currentTarget || !currentTarget.block) {
      this.stopMining();
      return;
    }

    const { x, y, z } = currentTarget.block;
    const key = `${x},${y},${z}`;

    if (key !== this.targetKey) {
      // Mudou de bloco alvo: reinicia no novo bloco
      this.startMining(currentTarget);
      return;
    }

    // Efeito sonoro rítmico de batida
    const now = performance.now();
    if (now - this.lastHitSoundTime > 220) {
      this.playHitSound();
      this.lastHitSoundTime = now;
    }

    // Incrementa progresso
    this.progress += dt / this.breakTime;

    if (this.game.ui) {
      this.game.ui.updateMiningProgress(this.progress);
    }

    // Bloco quebrado!
    if (this.progress >= 1.0) {
      this.completeBreak();
    }
  }

  // Conclui a quebra do bloco
  completeBreak() {
    if (!this.targetPos) return;
    const { x, y, z } = this.targetPos;

    const blockType = this.game.world.getBlock(x, y, z);
    const def = BLOCK_TYPES[blockType];

    // Remove o bloco do mundo
    this.game.world.setBlock(x, y, z, BLOCK_AIR);

    // Toca som de quebra
    if (this.game.player) {
      this.game.player.playSound('break');
    }

    // Calcula e adiciona os drops ao inventário
    this.handleDrops(blockType, def);

    // Consome durabilidade da ferramenta utilizada
    this.consumeToolDurability();

    // Finaliza mineração
    this.stopMining();

    if (this.game.player) {
      this.game.player.updateTargetBlock();
    }
    if (this.game.ui) {
      this.game.ui.updateHotbar();
    }
  }

  // Sistema de drops dos blocos
  handleDrops(blockType, def) {
    if (!def) return;

    const heldItem = this.game.inventory.getSelectedHotbarItem();
    const toolDef = heldItem ? getItemOrBlockDef(heldItem.id) : null;
    const isTool = toolDef && toolDef.isTool;
    const reqLevel = def.requiredHarvestLevel || 0;
    const hasLevel = isTool && (toolDef.harvestLevel || 0) >= reqLevel;

    // Se exige ferramenta e não possui o nível necessário, o bloco não dropa
    if (reqLevel > 0 && !hasLevel) {
      if (this.game.ui) {
        this.game.ui.showToast('Ferramenta inadequada! O minério foi destruído.');
      }
      return;
    }

    // Regras específicas de drops:
    if (blockType === BLOCK_COAL_ORE) {
      // Minério de Carvão dropa Carvão (Item)
      this.game.inventory.addItem(ITEM_COAL, 1);
    } else if (blockType === BLOCK_LEAVES) {
      // Folhas: chance de graveto ou folhas
      const rand = Math.random();
      if (rand < 0.35) {
        this.game.inventory.addItem(ITEM_STICK, 1);
      } else if (rand < 0.6) {
        this.game.inventory.addItem(BLOCK_LEAVES, 1);
      }
    } else if (blockType === BLOCK_STONE) {
      // Pedra exige picareta para dropar
      this.game.inventory.addItem(BLOCK_STONE, 1);
    } else if (blockType === BLOCK_IRON_ORE) {
      // Minério de Ferro dropa o minério para ser processado
      this.game.inventory.addItem(BLOCK_IRON_ORE, 1);
    } else if (def.dropItem !== null && def.dropItem !== undefined) {
      this.game.inventory.addItem(def.dropItem, 1);
    }
  }

  // Redução de durabilidade da ferramenta
  consumeToolDurability() {
    const heldItem = this.game.inventory.getSelectedHotbarItem();
    if (!heldItem) return;

    const toolDef = getItemOrBlockDef(heldItem.id);
    if (!toolDef || !toolDef.isTool) return;

    if (heldItem.durability === undefined) {
      heldItem.durability = toolDef.maxDurability || 60;
    }

    heldItem.durability -= 1;

    // Se quebrou
    if (heldItem.durability <= 0) {
      this.game.inventory.slots[this.game.inventory.selectedHotbarIndex] = null;
      if (this.game.ui) {
        this.game.ui.showToast(`Sua ${toolDef.name} quebrou!`);
      }
      if (this.game.player) {
        this.game.player.playSound('break');
      }
    }
  }

  playHitSound() {
    if (!this.game.player || !this.game.player.audioCtx) return;
    try {
      const ctx = this.game.player.audioCtx;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.05);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }
}
