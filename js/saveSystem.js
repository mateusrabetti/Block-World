// =============================================================================
// js/saveSystem.js - Sistema de Salvamento e Gerenciamento em localStorage
// =============================================================================

const STORAGE_KEY_WORLDS = 'BW_WORLDS_LIST_V2';
const STORAGE_PREFIX_DATA = 'BW_WORLD_DATA_V2_';

class SaveSystem {
  /**
   * Obtém a lista de metadados de todos os mundos salvos
   */
  static getWorlds() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_WORLDS);
      if (!data) return [];
      const list = JSON.parse(data);
      return Array.isArray(list) ? list : [];
    } catch (e) {
      console.warn('Erro ao carregar lista de mundos:', e);
      return [];
    }
  }

  /**
   * Salva a lista de metadados de mundos
   */
  static saveWorldsList(list) {
    try {
      localStorage.setItem(STORAGE_KEY_WORLDS, JSON.stringify(list));
    } catch (e) {
      console.warn('Erro ao salvar lista de mundos:', e);
    }
  }

  /**
   * Cria um novo registro de mundo
   */
  static createWorld(name, seed, mode = 'survival') {
    const worlds = this.getWorlds();

    // Se nome não for informado, cria padrão "Mundo N"
    const worldName = (name && name.trim().length > 0) ? name.trim() : `Mundo ${worlds.length + 1}`;

    // Se seed não for informada, gera uma aleatória
    const worldSeed = (seed !== undefined && seed !== null && String(seed).trim().length > 0)
      ? String(seed).trim()
      : Math.floor(Math.random() * 899999 + 100000);

    const worldMode = mode === 'creative' ? 'creative' : 'survival';
    const worldId = 'world_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    const meta = {
      id: worldId,
      name: worldName,
      seed: worldSeed,
      mode: worldMode,
      createdAt: Date.now(),
      lastPlayed: Date.now()
    };

    // Dados iniciais completos do mundo
    const worldData = {
      ...meta,
      mode: worldMode,
      health: 20,
      player: {
        x: 64.5,
        y: 18.0,
        z: 64.5,
        yaw: -Math.PI / 4,
        pitch: -0.15,
        isFlying: false
      },
      inventory: null, // Será preenchido com starter kit no primeiro carregamento
      selectedHotbarIndex: 0,
      modifiedBlocks: {}
    };

    // Salva metadados
    worlds.unshift(meta);
    this.saveWorldsList(worlds);

    // Salva dados do mundo
    try {
      localStorage.setItem(STORAGE_PREFIX_DATA + worldId, JSON.stringify(worldData));
    } catch (e) {
      console.error('Erro ao salvar novo mundo:', e);
    }

    return worldData;
  }

  /**
   * Carrega os dados de um mundo específico pelo ID
   */
  static loadWorld(worldId) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX_DATA + worldId);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error('Erro ao carregar mundo:', e);
      return null;
    }
  }

  /**
   * Salva os dados completos de um mundo (blocos modificados, jogador, inventário)
   */
  static saveWorld(worldData) {
    if (!worldData || !worldData.id) return false;

    try {
      worldData.lastPlayed = Date.now();
      localStorage.setItem(STORAGE_PREFIX_DATA + worldData.id, JSON.stringify(worldData));

      // Atualiza também o timestamp na lista de mundos
      const worlds = this.getWorlds();
      const meta = worlds.find(w => w.id === worldData.id);
      if (meta) {
        meta.lastPlayed = worldData.lastPlayed;
        meta.name = worldData.name;
        meta.seed = worldData.seed;
        meta.mode = worldData.mode || 'survival';
        // Coloca o mundo mais recentemente jogado no topo
        const filtered = worlds.filter(w => w.id !== worldData.id);
        filtered.unshift(meta);
        this.saveWorldsList(filtered);
      }
      return true;
    } catch (e) {
      console.error('Erro ao salvar progresso do mundo no localStorage:', e);
      return false;
    }
  }

  /**
   * Exclui um mundo permanentemente
   */
  static deleteWorld(worldId) {
    try {
      localStorage.removeItem(STORAGE_PREFIX_DATA + worldId);
      const worlds = this.getWorlds().filter(w => w.id !== worldId);
      this.saveWorldsList(worlds);
      return true;
    } catch (e) {
      console.error('Erro ao excluir mundo:', e);
      return false;
    }
  }

  /**
   * Garante que haja pelo menos um mundo para começar caso esteja vazio
   */
  static ensureDefaultWorld() {
    const worlds = this.getWorlds();
    if (worlds.length === 0) {
      return this.createWorld('Mundo Inicial', 839201, 'survival');
    }
    return null;
  }
}
