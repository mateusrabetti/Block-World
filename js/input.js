// =============================================================================
// js/input.js - Captura de Teclado, Mouse, Pointer Lock, Controles Customizáveis
// =============================================================================

const DEFAULT_KEY_BINDINGS = {
  forward: 'KeyW',
  backward: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  jump: 'Space',
  sneak: 'ShiftLeft',
  sprint: 'ControlLeft',
  inventory: 'KeyE',
  drop: 'KeyQ',
  attack: 'Mouse0',
  place: 'Mouse2',
  interact: 'Mouse2',
  hotbar1: 'Digit1',
  hotbar2: 'Digit2',
  hotbar3: 'Digit3',
  hotbar4: 'Digit4',
  hotbar5: 'Digit5',
  hotbar6: 'Digit6',
  hotbar7: 'Digit7',
  hotbar8: 'Digit8',
  hotbar9: 'Digit9',
  pause: 'Escape'
};

const ACTION_DESCRIPTIONS = {
  forward: 'Andar para frente',
  backward: 'Andar para trás',
  left: 'Andar para a esquerda',
  right: 'Andar para a direita',
  jump: 'Pular',
  sneak: 'Agachar',
  sprint: 'Correr',
  inventory: 'Abrir inventário',
  drop: 'Dropar item',
  attack: 'Atacar ou quebrar blocos',
  place: 'Colocar blocos ou usar itens',
  interact: 'Interagir com portas / blocos',
  hotbar1: 'Espaço 1 da barra rápida',
  hotbar2: 'Espaço 2 da barra rápida',
  hotbar3: 'Espaço 3 da barra rápida',
  hotbar4: 'Espaço 4 da barra rápida',
  hotbar5: 'Espaço 5 da barra rápida',
  hotbar6: 'Espaço 6 da barra rápida',
  hotbar7: 'Espaço 7 da barra rápida',
  hotbar8: 'Espaço 8 da barra rápida',
  hotbar9: 'Espaço 9 da barra rápida',
  pause: 'Pausar o jogo'
};

function formatKeyCode(code) {
  if (!code) return 'Nenhum';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
  if (code === 'Space') return 'Espaço';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl';
  if (code === 'AltLeft' || code === 'AltRight') return 'Alt';
  if (code === 'Escape') return 'ESC';
  if (code === 'Mouse0') return 'Botão Esquerdo';
  if (code === 'Mouse1') return 'Botão do Meio';
  if (code === 'Mouse2') return 'Botão Direito';
  if (code === 'ArrowUp') return 'Seta Cima';
  if (code === 'ArrowDown') return 'Seta Baixo';
  if (code === 'ArrowLeft') return 'Seta Esquerda';
  if (code === 'ArrowRight') return 'Seta Direita';
  return code;
}

class Input {
  constructor(game) {
    this.game = game;

    // Estado das teclas de movimentação
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      shift: false,
      sprint: false
    };

    // Carrega mapeamento de controles personalizado
    this.rebindingAction = null;
    this.loadKeyBindings();

    this.isPointerLocked = false;

    // Detecção de duplo pulo para voo
    this.lastSpacePress = 0;
    this.doubleTapThreshold = 320; // 320ms entre toques

    // Detecção de duplo toque no W para corrida (Sprint)
    this.lastForwardPress = 0;
    this.sprintDoubleTapThreshold = 280; // 280ms entre toques

    // Controle de segurar botões do mouse (Mineração e Colocação contínuas)
    this.isMiningMouseDown = false;
    this.isPlacingMouseDown = false;
    this.lastPlaceTime = 0;
    this.placeInterval = 220; // ms de intervalo entre colocações sucessivas
    this.lastCreativeBreakTime = 0;

    this.initKeyboard();
    this.initMouse();
    this.initPointerLock();
    this.initCanvasClick();
  }

  loadKeyBindings() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('blockworld_controls_v2');
        if (saved) {
          this.keyBindings = Object.assign({}, DEFAULT_KEY_BINDINGS, JSON.parse(saved));
          return;
        }
      }
    } catch (e) {}
    this.keyBindings = Object.assign({}, DEFAULT_KEY_BINDINGS);
  }

  saveKeyBindings() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('blockworld_controls_v2', JSON.stringify(this.keyBindings));
      }
    } catch (e) {}
  }

  resetKeyBindings() {
    this.keyBindings = Object.assign({}, DEFAULT_KEY_BINDINGS);
    this.saveKeyBindings();
  }

  setKeyBinding(action, code) {
    if (action in DEFAULT_KEY_BINDINGS) {
      this.keyBindings[action] = code;
      this.saveKeyBindings();
      return true;
    }
    return false;
  }

  isKeyBoundTo(action, code) {
    return this.keyBindings && this.keyBindings[action] === code;
  }

  getConflictingActions(specificAction = null) {
    if (specificAction) {
      const code = this.keyBindings[specificAction];
      if (!code) return [];
      const conflicts = [];
      for (const other in this.keyBindings) {
        if (other !== specificAction && this.keyBindings[other] === code) {
          if ((specificAction === 'place' && other === 'interact') || (specificAction === 'interact' && other === 'place')) {
            continue;
          }
          conflicts.push(other);
        }
      }
      return conflicts;
    }

    const allConflicts = new Set();
    const actions = Object.keys(this.keyBindings);
    for (let i = 0; i < actions.length; i++) {
      for (let j = i + 1; j < actions.length; j++) {
        const a = actions[i];
        const b = actions[j];
        if (this.keyBindings[a] === this.keyBindings[b]) {
          if ((a === 'place' && b === 'interact') || (a === 'interact' && b === 'place')) continue;
          allConflicts.add(a);
          allConflicts.add(b);
        }
      }
    }
    return Array.from(allConflicts);
  }

  initKeyboard() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e) => {
      // Se estiver no processo de reatribuição de tecla na tela de Controles
      if (this.rebindingAction) {
        e.preventDefault();
        e.stopPropagation();
        const action = this.rebindingAction;
        this.keyBindings[action] = e.code;
        this.saveKeyBindings();
        this.rebindingAction = null;
        if (this.game.ui && typeof this.game.ui.renderControlsList === 'function') {
          this.game.ui.renderControlsList();
        }
        return;
      }

      // Ignora se estiver digitando em campos de texto (como nome/seed do mundo)
      if (e.target.tagName === 'INPUT') return;

      // Abrir / Fechar Inventário
      if (this.isKeyBoundTo('inventory', e.code) || (e.code === 'KeyE' && !this.keyBindings.inventory)) {
        e.preventDefault();
        if (this.game.state === 'PLAYING') {
          this.game.openInventory();
        } else if (this.game.state === 'INVENTORY' || this.game.state === 'CREATIVE_INVENTORY') {
          this.game.closeInventory();
        } else if (this.game.state === 'CRAFTING_TABLE') {
          this.game.closeCraftingTable();
        } else if (this.game.state === 'FURNACE') {
          if (this.game.furnace) this.game.furnace.closeUI();
        }
        return;
      }

      // Pausar jogo / Fechar telas abertas (ESC ou tecla customizada)
      if (e.code === 'Escape' || this.isKeyBoundTo('pause', e.code)) {
        if (this.game.state === 'INVENTORY' || this.game.state === 'CREATIVE_INVENTORY') {
          e.preventDefault();
          this.game.closeInventory();
          return;
        } else if (this.game.state === 'CRAFTING_TABLE') {
          e.preventDefault();
          this.game.closeCraftingTable();
          return;
        } else if (this.game.state === 'FURNACE') {
          e.preventDefault();
          if (this.game.furnace) this.game.furnace.closeUI();
          return;
        } else if (this.game.state === 'PLAYING') {
          e.preventDefault();
          this.game.pauseGame();
          return;
        } else if (this.game.state === 'PAUSED') {
          e.preventDefault();
          this.game.resumeGame();
          return;
        }
      }

      // Dropar item selecionado
      if (this.isKeyBoundTo('drop', e.code) || e.code === 'KeyQ') {
        if (this.game.state === 'PLAYING') {
          e.preventDefault();
          this.game.player.dropSelectedItem();
        }
        return;
      }

      // Se não estiver jogando, ignora movimentação (garante que teclas não funcionam por trás dos menus)
      if (this.game.state !== 'PLAYING') return;

      // Movimentação
      if (this.isKeyBoundTo('forward', e.code) || e.code === 'KeyW' || e.code === 'ArrowUp') {
        if (!e.repeat) {
          const now = performance.now();
          if (now - this.lastForwardPress < this.sprintDoubleTapThreshold && now - this.lastForwardPress > 40) {
            this.keys.sprint = true;
          }
          this.lastForwardPress = now;
        }
        this.keys.forward = true;
      } else if (this.isKeyBoundTo('backward', e.code) || e.code === 'KeyS' || e.code === 'ArrowDown') {
        this.keys.backward = true;
      } else if (this.isKeyBoundTo('left', e.code) || e.code === 'KeyA' || e.code === 'ArrowLeft') {
        this.keys.left = true;
      } else if (this.isKeyBoundTo('right', e.code) || e.code === 'KeyD' || e.code === 'ArrowRight') {
        this.keys.right = true;
      } else if (this.isKeyBoundTo('jump', e.code) || e.code === 'Space') {
        this.keys.jump = true;
        e.preventDefault();
        if (!e.repeat && this.game.gameMode === 'creative') {
          const now = performance.now();
          if (now - this.lastSpacePress < this.doubleTapThreshold) {
            this.game.player.toggleFlight();
            this.lastSpacePress = 0;
          } else {
            this.lastSpacePress = now;
          }
        }
      } else if (this.isKeyBoundTo('sneak', e.code) || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.keys.shift = true;
      } else if (this.isKeyBoundTo('sprint', e.code) || e.code === 'ControlLeft') {
        this.keys.sprint = true;
      }

      // Hotbar 1 a 9
      for (let i = 0; i < 9; i++) {
        if (this.isKeyBoundTo('hotbar' + (i + 1), e.code) || e.code === 'Digit' + (i + 1) || e.code === 'Numpad' + (i + 1)) {
          this.game.ui.selectHotbarSlot(i);
          break;
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.isKeyBoundTo('forward', e.code) || e.code === 'KeyW' || e.code === 'ArrowUp') {
        this.keys.forward = false;
        this.keys.sprint = false;
      } else if (this.isKeyBoundTo('backward', e.code) || e.code === 'KeyS' || e.code === 'ArrowDown') {
        this.keys.backward = false;
      } else if (this.isKeyBoundTo('left', e.code) || e.code === 'KeyA' || e.code === 'ArrowLeft') {
        this.keys.left = false;
      } else if (this.isKeyBoundTo('right', e.code) || e.code === 'KeyD' || e.code === 'ArrowRight') {
        this.keys.right = false;
      } else if (this.isKeyBoundTo('jump', e.code) || e.code === 'Space') {
        this.keys.jump = false;
      } else if (this.isKeyBoundTo('sneak', e.code) || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.keys.shift = false;
      } else if (this.isKeyBoundTo('sprint', e.code) || e.code === 'ControlLeft') {
        this.keys.sprint = false;
      }
    });
  }

  initMouse() {
    if (typeof window === 'undefined') return;

    // Rotação da câmera pelo mouse quando bloqueado
    window.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked || this.game.state !== 'PLAYING') return;
      this.game.player.handleMouseMove(e.movementX || 0, e.movementY || 0);
    });

    // Cliques para quebrar e posicionar blocos
    window.addEventListener('mousedown', (e) => {
      // Se estiver reatribuindo controle para botão do mouse
      if (this.rebindingAction) {
        e.preventDefault();
        e.stopPropagation();
        const action = this.rebindingAction;
        this.keyBindings[action] = 'Mouse' + e.button;
        this.saveKeyBindings();
        this.rebindingAction = null;
        if (this.game.ui && typeof this.game.ui.renderControlsList === 'function') {
          this.game.ui.renderControlsList();
        }
        return;
      }

      if (!this.isPointerLocked || this.game.state !== 'PLAYING') return;

      const isAttackBtn = this.isKeyBoundTo('attack', 'Mouse' + e.button) || e.button === 0;
      const isPlaceBtn = this.isKeyBoundTo('place', 'Mouse' + e.button) || this.isKeyBoundTo('interact', 'Mouse' + e.button) || e.button === 2;

      if (isAttackBtn) {
        this.isMiningMouseDown = true;

        // Balanço do braço sempre ao clicar botão de ataque
        if (this.game.player && this.game.player.arm) {
          this.game.player.arm.triggerSwing();
        }

        // 1. Tenta atacar entidade ou jogador em foco primeiro (PvP 1.8 e Mobs)
        const hitEntity = this.game.player.attackTargetOrEntity();
        if (hitEntity) {
          return;
        }

        // 2. Se não acertou entidade: Quebra Bloco
        if (this.game.gameMode === 'creative') {
          this.game.player.breakBlock();
          this.lastCreativeBreakTime = performance.now();
          this.game.ui.updateHotbar();
        } else {
          if (this.game.mining) {
            this.game.mining.startMining(this.game.player.targetBlock);
          }
        }
      } else if (isPlaceBtn) {
        this.isPlacingMouseDown = true;
        this.lastPlaceTime = performance.now();

        // Botão Direito / Usar: Primeiro tenta comer alimento se estiver segurando comida
        const ate = this.game.player.eatFood();
        if (!ate) {
          // Se não comeu, posiciona bloco ou interage (Porta, Bancada ou Fornalha)
          this.game.player.placeBlock();
        }
        this.game.ui.updateHotbar();
      }
    });

    window.addEventListener('mouseup', (e) => {
      const isAttackBtn = this.isKeyBoundTo('attack', 'Mouse' + e.button) || e.button === 0;
      const isPlaceBtn = this.isKeyBoundTo('place', 'Mouse' + e.button) || this.isKeyBoundTo('interact', 'Mouse' + e.button) || e.button === 2;

      if (isAttackBtn) {
        this.isMiningMouseDown = false;
        if (this.game.mining) {
          this.game.mining.stopMining();
        }
      } else if (isPlaceBtn) {
        this.isPlacingMouseDown = false;
      }
    });

    // Scroll do mouse para alternar item selecionado na Hotbar
    window.addEventListener('wheel', (e) => {
      if (!this.isPointerLocked || this.game.state !== 'PLAYING') return;
      if (e.deltaY > 0) {
        this.game.ui.selectNextHotbarSlot();
      } else if (e.deltaY < 0) {
        this.game.ui.selectPrevHotbarSlot();
      }
    });

    // Desativa menu de contexto padrão do botão direito
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  initPointerLock() {
    if (typeof document === 'undefined') return;

    const handleLockChange = () => {
      const isLocked = document.pointerLockElement === document.body ||
                       document.pointerLockElement === document.getElementById('canvas-container') ||
                       (this.game.renderer && document.pointerLockElement === this.game.renderer.domElement);
      const wasLocked = this.isPointerLocked;
      this.isPointerLocked = !!isLocked;

      if (this.isPointerLocked) {
        // Se travou o mouse, só entra no jogo se um mundo estiver realmente ativo
        if (this.game.world && this.game.state !== 'PLAYING' && this.game.state !== 'DEAD' &&
            this.game.state !== 'INVENTORY' && this.game.state !== 'CRAFTING_TABLE' && this.game.state !== 'FURNACE') {
          this.game.state = 'PLAYING';
          this.game.ui.showInGameHUD();
        }
      } else {
        // Se destravou o mouse:
        this.resetKeys();
        if (this.game.mining) {
          this.game.mining.stopMining();
        }

        // Só pausa o jogo se o mouse ESTAVA realmente travado e o usuário destravou (ex: ESC)
        if (wasLocked && this.game.state === 'PLAYING') {
          this.game.pauseGame();
        }
      }
    };

    document.addEventListener('pointerlockchange', handleLockChange);
    document.addEventListener('mozpointerlockchange', handleLockChange);
    document.addEventListener('webkitpointerlockchange', handleLockChange);


    document.addEventListener('pointerlockerror', () => {
      this.isPointerLocked = false;
    });
  }

  initCanvasClick() {
    const canvasContainer = document.getElementById('canvas-container');
    canvasContainer?.addEventListener('click', () => {
      if (this.game.state === 'PLAYING' && !this.isPointerLocked) {
        this.requestPointerLock();
      }
    });
  }

  requestPointerLock() {
    try {
      const el = (this.game.renderer && this.game.renderer.domElement) || document.body;
      const fn = el.requestPointerLock || el.mozRequestPointerLock || el.webkitRequestPointerLock;
      if (fn) {
        const promise = fn.call(el);
        if (promise && typeof promise.catch === 'function') {
          promise.catch(() => {});
        }
      }
    } catch (e) {
      // Ignora erro de requisição em ambientes restritos
    }
  }

  exitPointerLock() {
    try {
      if (document.pointerLockElement) {
        const fn = document.exitPointerLock || document.mozExitPointerLock || document.webkitExitPointerLock;
        if (fn) {
          const promise = fn.call(document);
          if (promise && typeof promise.catch === 'function') {
            promise.catch(() => {});
          }
        }
      }
    } catch (e) {
      // Ignora erro ao sair de pointer lock
    }
    this.isPointerLocked = false;
  }

  resetKeys() {
    this.keys.forward = false;
    this.keys.backward = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.jump = false;
    this.keys.shift = false;
    this.keys.sprint = false;
    this.isMiningMouseDown = false;
    this.isPlacingMouseDown = false;
  }

  // Atualização contínua de ações do mouse enquanto botões são mantidos pressionados
  update(dt) {
    if (!this.isPointerLocked || this.game.state !== 'PLAYING') return;

    const now = performance.now();

    // 1. Colocação contínua de blocos segurando o botão direito (Requisito 5)
    if (this.isPlacingMouseDown) {
      if (now - this.lastPlaceTime >= this.placeInterval) {
        this.lastPlaceTime = now;
        const ate = this.game.player.eatFood();
        if (!ate) {
          this.game.player.placeBlock(true);
        }
        if (this.game.ui) {
          this.game.ui.updateHotbar();
        }
      }
    }

    // 2. Quebra contínua no Modo Criativo segurando o botão esquerdo (Requisito 4)
    if (this.isMiningMouseDown && this.game.gameMode === 'creative') {
      if (now - this.lastCreativeBreakTime >= 200) {
        this.lastCreativeBreakTime = now;
        if (this.game.player.targetBlock) {
          this.game.player.breakBlock();
          if (this.game.player.arm) {
            this.game.player.arm.triggerSwing();
          }
          if (this.game.ui) {
            this.game.ui.updateHotbar();
          }
        }
      }
    }
  }
}
