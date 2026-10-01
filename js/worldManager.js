// =============================================================================
// js/worldManager.js - Orquestrador do Ciclo de Vida dos Mundos (Carregar, Salvar, Alternar)
// =============================================================================

class WorldManager {
  constructor(game) {
    this.game = game;
    this.currentWorldData = null;
    this.autoSaveTimer = null;

    // Inicia auto-salvamento periódico a cada 20 segundos
    this.initAutoSave();
  }

  initAutoSave() {
    this.autoSaveTimer = setInterval(() => {
      if (this.game.state === 'PLAYING' && this.currentWorldData) {
        this.saveCurrentWorld(false);
      }
    }, 20000);
  }

  /**
   * Carrega e inicia um mundo pelo seu ID (ou objeto de dados)
   */
  loadWorld(worldDataOrId) {
    let data = null;
    if (typeof worldDataOrId === 'string') {
      data = SaveSystem.loadWorld(worldDataOrId);
    } else {
      data = worldDataOrId;
    }

    if (!data) {
      console.error('Falha ao obter dados do mundo.');
      return false;
    }

    // Se já havia um mundo aberto, salva e descarta anteriores
    if (this.game.world) {
      this.saveCurrentWorld(false);
      this.game.world.dispose();
      this.game.world = null;
    }

    this.currentWorldData = data;
    if (this.game.ui) {
      this.game.ui.selectedWorldId = data.id;
    }

    // Define modo de jogo central no Game
    this.game.gameMode = data.mode === 'creative' ? 'creative' : 'survival';

    // 1. Inicializa o novo World com a seed e as modificações salvas
    const seed = data.seed || 12345;
    const modifiedBlocks = data.modifiedBlocks || {};
    this.game.world = new World(this.game.scene, seed, modifiedBlocks);

    // 2. Conecta o mundo ao jogador e restaura posição / rotação
    const playerData = data.player ? { ...data.player } : null;
    if (this.game.gameMode === 'survival' && playerData) {
      playerData.isFlying = false; // Voo terminantemente desativado no modo sobrevivência
    }
    this.game.player.setWorld(this.game.world);
    this.game.player.restoreState(playerData);

    // 3. Restaura o inventário salvo ou kit inicial baseado no modo
    if (data.inventory && Array.isArray(data.inventory)) {
      this.game.inventory.deserialize(data.inventory);
    } else {
      this.game.inventory.giveStarterKit(this.game.gameMode);
    }

    // 4. Restaura slot ativo da Hotbar
    const hotbarIdx = (typeof data.selectedHotbarIndex === 'number') ? data.selectedHotbarIndex : 0;
    this.game.inventory.selectedHotbarIndex = hotbarIdx;

    // 5. Restaura sistema de vida do jogador
    if (this.game.health) {
      this.game.health.setHealth(data.health !== undefined ? data.health : 20);
    }

    // 6. Atualiza a UI para o novo mundo
    this.game.ui.onWorldLoaded();

    return true;
  }

  /**
   * Salva o estado atual do mundo aberto
   */
  saveCurrentWorld(showNotification = false) {
    if (!this.currentWorldData || !this.game.world || !this.game.player) return;

    this.currentWorldData.mode = this.game.gameMode;
    this.currentWorldData.health = this.game.health ? this.game.health.health : 20;

    this.currentWorldData.player = {
      x: this.game.player.position.x,
      y: this.game.player.position.y,
      z: this.game.player.position.z,
      yaw: this.game.player.yaw,
      pitch: this.game.player.pitch,
      isFlying: this.game.gameMode === 'creative' ? this.game.player.isFlying : false
    };

    this.currentWorldData.inventory = this.game.inventory.serialize();
    this.currentWorldData.selectedHotbarIndex = this.game.inventory.selectedHotbarIndex;
    this.currentWorldData.modifiedBlocks = this.game.world.modifiedBlocks;

    SaveSystem.saveWorld(this.currentWorldData);

    if (showNotification && this.game.ui) {
      this.game.ui.showToast('Mundo salvo com sucesso!');
    }
  }

  /**
   * Cria um novo mundo e entra nele imediatamente
   */
  createNewWorldAndEnter(name, seed, mode = 'survival') {
    const newWorldData = SaveSystem.createWorld(name, seed, mode);
    if (this.game.ui) {
      this.game.ui.selectedWorldId = newWorldData.id;
    }
    this.loadWorld(newWorldData);
    this.game.enterGame();
  }

  /**
   * Sai do mundo atual e retorna para o menu de mundos
   */
  exitWorldToMenu() {
    const exitedId = this.currentWorldData ? this.currentWorldData.id : null;
    this.saveCurrentWorld(true);

    if (this.game.world) {
      this.game.world.dispose();
      this.game.world = null;
    }
    this.currentWorldData = null;

    if (this.game.ui && exitedId) {
      this.game.ui.selectedWorldId = exitedId;
    }

    // Retorna ao menu
    this.game.showWorldsMenu();
  }
}
