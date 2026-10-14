// =============================================================================
// js/input.js - Captura de Teclado, Mouse, Pointer Lock e Detecção de Duplo Pulo
// =============================================================================

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

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Ignora se estiver digitando em campos de texto (como nome/seed do mundo)
      if (e.target.tagName === 'INPUT') return;

      // Tecla 'E': Abre / Fecha Inventário, Catálogo Criativo, Bancada ou Fornalha
      if (e.code === 'KeyE') {
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

      // Tecla 'Escape': Fecha menus abertos ou pausa
      if (e.code === 'Escape') {
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

      // Tecla 'Q': Largar item selecionado na mão (Requisito 3)
      if (e.code === 'KeyQ') {
        if (this.game.state === 'PLAYING') {
          e.preventDefault();
          this.game.player.dropSelectedItem();
        }
        return;
      }

      // Se não estiver jogando, ignora teclas de movimentação
      if (this.game.state !== 'PLAYING') return;

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          if (!e.repeat) {
            const now = performance.now();
            if (now - this.lastForwardPress < this.sprintDoubleTapThreshold && now - this.lastForwardPress > 40) {
              this.keys.sprint = true;
            }
            this.lastForwardPress = now;
          }
          this.keys.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true;
          break;
        case 'Space':
          this.keys.jump = true;
          e.preventDefault();

          // Ignora repetição automática do sistema operacional ao segurar Espaço
          if (e.repeat) break;

          // Detecção de Duplo Toque no Espaço para Ativar/Desativar Voo (Apenas modo CRIATIVO)
          if (this.game.gameMode === 'creative') {
            const now = performance.now();
            if (now - this.lastSpacePress < this.doubleTapThreshold) {
              this.game.player.toggleFlight();
              this.lastSpacePress = 0;
            } else {
              this.lastSpacePress = now;
            }
          }
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.shift = true;
          break;

        // Seleção rápida da Hotbar pelos números 1 a 9 e teclado numérico
        case 'Digit1': case 'Numpad1': this.game.ui.selectHotbarSlot(0); break;
        case 'Digit2': case 'Numpad2': this.game.ui.selectHotbarSlot(1); break;
        case 'Digit3': case 'Numpad3': this.game.ui.selectHotbarSlot(2); break;
        case 'Digit4': case 'Numpad4': this.game.ui.selectHotbarSlot(3); break;
        case 'Digit5': case 'Numpad5': this.game.ui.selectHotbarSlot(4); break;
        case 'Digit6': case 'Numpad6': this.game.ui.selectHotbarSlot(5); break;
        case 'Digit7': case 'Numpad7': this.game.ui.selectHotbarSlot(6); break;
        case 'Digit8': case 'Numpad8': this.game.ui.selectHotbarSlot(7); break;
        case 'Digit9': case 'Numpad9': this.game.ui.selectHotbarSlot(8); break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = false;
          this.keys.sprint = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
        case 'Space':
          this.keys.jump = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.shift = false;
          break;
      }
    });
  }

  initMouse() {
    // Rotação da câmera pelo mouse quando bloqueado
    window.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked || this.game.state !== 'PLAYING') return;
      this.game.player.handleMouseMove(e.movementX || 0, e.movementY || 0);
    });

    // Cliques para quebrar e posicionar blocos
    window.addEventListener('mousedown', (e) => {
      if (!this.isPointerLocked || this.game.state !== 'PLAYING') return;

      if (e.button === 0) {
        this.isMiningMouseDown = true;

        // Balanço do braço sempre ao clicar botão esquerdo
        if (this.game.player && this.game.player.arm) {
          this.game.player.arm.triggerSwing();
        }

        // 1. Tenta atacar entidade em foco primeiro (Requisitos 38 e 39)
        const hitEntity = this.game.player.attackTargetOrEntity();
        if (hitEntity) {
          return;
        }

        // 2. Se não acertou entidade: Quebra Bloco (Instantâneo no Criativo, Mineração progressiva no Sobrevivência)
        if (this.game.gameMode === 'creative') {
          this.game.player.breakBlock();
          this.lastCreativeBreakTime = performance.now();
          this.game.ui.updateHotbar();
        } else {
          if (this.game.mining) {
            this.game.mining.startMining(this.game.player.targetBlock);
          }
        }
      } else if (e.button === 2) {
        this.isPlacingMouseDown = true;
        this.lastPlaceTime = performance.now();

        // Botão Direito: Primeiro tenta comer alimento se estiver segurando comida
        const ate = this.game.player.eatFood();
        if (!ate) {
          // Se não comeu, posiciona bloco ou interage (ex: Bancada ou Fornalha)
          this.game.player.placeBlock();
        }
        this.game.ui.updateHotbar();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMiningMouseDown = false;
        // Soltou botão de quebra: encerra mineração
        if (this.game.mining) {
          this.game.mining.stopMining();
        }
      } else if (e.button === 2) {
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
    const handleLockChange = () => {
      const isLocked = document.pointerLockElement === document.body ||
                       document.pointerLockElement === document.getElementById('canvas-container') ||
                       (this.game.renderer && document.pointerLockElement === this.game.renderer.domElement);
      const wasLocked = this.isPointerLocked;
      this.isPointerLocked = !!isLocked;

      if (this.isPointerLocked) {
        // Se travou o mouse, entra no jogo
        if (this.game.state !== 'PLAYING' && this.game.state !== 'DEAD' && this.game.state !== 'INVENTORY' && this.game.state !== 'CRAFTING_TABLE') {
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
          this.game.player.placeBlock();
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
