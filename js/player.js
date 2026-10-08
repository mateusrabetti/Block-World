// =============================================================================
// js/player.js - Jogador em Primeira Pessoa, Voo, Câmera, Quebra e Colocação
// =============================================================================

class Player {
  constructor(camera, world, physics, scene, inventory) {
    this.camera = camera;
    this.world = world;
    this.physics = physics;
    this.scene = scene;
    this.inventory = inventory;

    // Posição no mundo (centro do mapa 192x192)
    this.position = { x: 96.5, y: 24.0, z: 96.5 };
    this.velocity = { x: 0, y: 0, z: 0 };

    // Orientação da visão
    this.yaw = -Math.PI / 4;
    this.pitch = -0.15;
    this.mouseSensitivity = 0.0022;

    // Configurações de velocidade
    this.walkSpeed = 4.8;
    this.sprintSpeed = 7.2;
    this.flySpeed = 10.5;
    this.flyVerticalSpeed = 7.5;
    this.accelGround = 18.0;
    this.accelAir = 5.0;

    // Modo de Voo
    this.isFlying = false;

    // Alvo atual do raycast
    this.targetBlock = null;

    // Câmera
    this.camera.rotation.order = 'YXZ';

    // Caixa de seleção aramada do bloco olhado
    this.initSelectionBox();

    // Áudio procedural Web Audio API
    this.initAudio();

    // Braço em primeira pessoa
    this.arm = new FirstPersonArm(window.game, this.camera);

    // Sincroniza a câmera
    this.updateCamera();
  }

  // Define um novo mundo para o jogador
  setWorld(world) {
    this.world = world;
    this.targetBlock = null;
    if (this.selectionBox) {
      this.selectionBox.visible = false;
    }
  }

  // Atualiza posição e orientação da câmera
  updateCamera() {
    this.camera.position.set(
      this.position.x,
      this.position.y + this.physics.eyeHeight,
      this.position.z
    );
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0;
  }

  // Alterna o modo de voo (apenas disponível no Modo Criativo)
  toggleFlight() {
    if (window.game && window.game.gameMode !== 'creative') {
      this.isFlying = false;
      return;
    }
    this.isFlying = !this.isFlying;
    this.velocity.y = 0;
    this.playSound('fly');
  }

  // Encontra posição segura de spawn sobre o terreno em terra firme
  findSpawnPosition() {
    if (!this.world) return;
    const startX = Math.floor(this.position.x || (this.world.sizeX / 2));
    const startZ = Math.floor(this.position.z || (this.world.sizeZ / 2));
    let bestX = startX;
    let bestZ = startZ;
    let bestY = 20;
    let foundSafe = false;

    // Busca em espiral um ponto de terra firme acima do nível da água com espaço livre
    const maxRadius = 36;
    for (let r = 0; r <= maxRadius && !foundSafe; r++) {
      for (let dx = -r; dx <= r && !foundSafe; dx++) {
        for (let dz = -r; dz <= r && !foundSafe; dz++) {
          if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
          const tx = startX + dx;
          const tz = startZ + dz;
          if (tx < 6 || tx >= this.world.sizeX - 6 || tz < 6 || tz >= this.world.sizeZ - 6) continue;

          for (let y = this.world.sizeY - 4; y >= 14; y--) {
            if (this.world.isSolid(tx, y, tz) &&
                !this.world.isSolid(tx, y + 1, tz) &&
                !this.world.isSolid(tx, y + 2, tz) &&
                !this.world.isLiquid(tx, y + 1, tz)) {
              bestX = tx;
              bestZ = tz;
              bestY = y;
              foundSafe = true;
              break;
            }
          }
        }
      }
    }

    if (!foundSafe) {
      // Fallback: busca a coluna mais alta com bloco sólido
      for (let y = this.world.sizeY - 4; y >= 1; y--) {
        if (this.world.isSolid(startX, y, startZ) && !this.world.isSolid(startX, y + 1, startZ)) {
          bestX = startX;
          bestZ = startZ;
          bestY = y;
          foundSafe = true;
          break;
        }
      }
    }

    this.position.x = bestX + 0.5;
    this.position.z = bestZ + 0.5;
    this.position.y = bestY + 1.05;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.velocity.z = 0;
  }

  // Restaura estado salvo do jogador
  restoreState(state) {
    if (!state || state.x === undefined || state.y === undefined || state.z === undefined) {
      this.findSpawnPosition();
    } else {
      this.position.x = state.x;
      this.position.y = state.y;
      this.position.z = state.z;
    }

    if (state) {
      if (state.yaw !== undefined) this.yaw = state.yaw;
      if (state.pitch !== undefined) this.pitch = state.pitch;
      if (state.isFlying !== undefined) this.isFlying = state.isFlying;
      else this.isFlying = false;
    }

    // Regra absoluta: sobrevivência não possui voo
    if (window.game && window.game.gameMode !== 'creative') {
      this.isFlying = false;
    }

    this.velocity.x = 0;
    this.velocity.y = 0;
    this.velocity.z = 0;

    // Se a posição restaurada colide com blocos (ou está enterrada), encontra spawn seguro
    if (this.world && this.physics && this.physics.hasCollisionAt(this.position, this.world)) {
      this.findSpawnPosition();
    }

    if (this.selectionBox) {
      this.selectionBox.visible = false;
    }

    this.updateCamera();
  }

  // Inicializa contorno aramado preto ao focar em um bloco
  initSelectionBox() {
    const geom = new THREE.BoxGeometry(1.004, 1.004, 1.004);
    const edges = new THREE.EdgesGeometry(geom);
    const mat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    this.selectionBox = new THREE.LineSegments(edges, mat);
    this.selectionBox.visible = false;
    this.scene.add(this.selectionBox);
  }

  // Efeitos sonoros procedurais leves (Web Audio API)
  initAudio() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = AudioCtx ? new AudioCtx() : null;
    } catch (e) {
      this.audioCtx = null;
    }
  }

  playSound(type) {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    if (type === 'break') {
      // Pop crocante ao quebrar
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'place') {
      // Som firme ao posicionar
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.07);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
      osc.start(now);
      osc.stop(now + 0.07);
    } else if (type === 'jump') {
      // Pulo suave
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.1);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'fly') {
      // Tom agudo indicando alternância de modo de voo
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.14);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.14);
    }
  }

  // Rotação da câmera pelo mouse
  handleMouseMove(deltaX, deltaY) {
    this.yaw -= deltaX * this.mouseSensitivity;
    this.pitch -= deltaY * this.mouseSensitivity;

    const maxPitch = Math.PI / 2 - 0.02;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
  }

  // Atualização por quadro (física, câmera e mira)
  update(dt, inputKeys) {
    if (window.game && window.game.gameMode !== 'creative') {
      this.isFlying = false;
    }

    // 1. Processa movimentação horizontal
    let moveForward = 0;
    let moveRight = 0;

    if (inputKeys.forward) moveForward += 1;
    if (inputKeys.backward) moveForward -= 1;
    if (inputKeys.right) moveRight += 1;
    if (inputKeys.left) moveRight -= 1;

    const fwdX = -Math.sin(this.yaw);
    const fwdZ = -Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);

    let moveX = fwdX * moveForward + rightX * moveRight;
    let moveZ = fwdZ * moveForward + rightZ * moveRight;

    const moveLen = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (moveLen > 0.001) {
      moveX /= moveLen;
      moveZ /= moveLen;
    }

    if (this.isFlying) {
      // ==========================================
      // MOVIMENTO EM MODO VOO
      // ==========================================
      const speed = this.flySpeed;
      this.velocity.x = moveX * speed;
      this.velocity.z = moveZ * speed;

      // Subir com Espaço, descer com Shift
      if (inputKeys.jump) {
        this.velocity.y = this.flyVerticalSpeed;
      } else if (inputKeys.shift) {
        this.velocity.y = -this.flyVerticalSpeed;
      } else {
        // Amortecimento vertical suave
        this.velocity.y *= Math.pow(0.05, dt);
        if (Math.abs(this.velocity.y) < 0.1) this.velocity.y = 0;
      }
    } else {
      // ==========================================
      // MOVIMENTO TERRESTRE NORMAL
      // ==========================================
      const isSprinting = inputKeys.shift && !this.physics.inWater;
      const speed = isSprinting ? this.sprintSpeed : this.walkSpeed;
      const targetVelX = moveX * speed;
      const targetVelZ = moveZ * speed;

      const accel = this.physics.onGround ? this.accelGround : this.accelAir;
      const lerpFactor = Math.min(1.0, accel * dt);
      this.velocity.x += (targetVelX - this.velocity.x) * lerpFactor;
      this.velocity.z += (targetVelZ - this.velocity.z) * lerpFactor;

      // Pulo normal
      if (inputKeys.jump && this.physics.onGround) {
        this.velocity.y = this.physics.jumpSpeed;
        this.physics.onGround = false;
        this.playSound('jump');
      }
    }

    // 2. Atualiza a física com resolução de colisão AABB
    this.physics.update(
      this.position,
      this.velocity,
      this.world,
      dt,
      this.isFlying,
      inputKeys.jump
    );

    // 3. Atualiza câmera para os olhos do jogador
    this.updateCamera();

    // 4. Raycasting para detecção do bloco em foco
    this.updateTargetBlock();

    // 5. Culling de Chunks por distância do jogador (Otimização para 144 chunks)
    if (this.world) {
      this.world.updateChunkVisibility(this.position, 6);
    }

    // 6. Atualiza o braço em primeira pessoa e suas animações
    if (this.arm) {
      const isMoving = Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.z) > 0.1;
      const isMining = window.game && window.game.mining && window.game.mining.isMining;
      this.arm.update(dt, isMoving, isMining);
    }
  }

  // Raycast de combate: ataca entidade em foco à frente (Requisitos 38, 39, 40)
  attackTargetOrEntity() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);

    // Busca entidade à frente (< 3.2m)
    const entity = window.game.entityManager ? window.game.entityManager.findEntityInCrosshair(this.camera.position, dir, 3.2) : null;

    if (entity) {
      const heldItem = this.inventory.getSelectedHotbarItem();
      const def = heldItem ? getItemOrBlockDef(heldItem.id) : null;

      // Cálculo de dano conforme requisitos 40 e 58:
      // Madeira = 4, Pedra = 5, Ferro = 6, Ferramentas = 2..4, Mão = 1
      let damage = 1;
      if (def && def.damage) {
        damage = def.damage;
      }

      entity.takeDamage(damage, 'player');

      // Animação de corte/ataque do braço
      if (this.arm) {
        this.arm.triggerSwing();
      }

      // Reduz durabilidade da espada / ferramenta
      if (heldItem && def?.isTool && window.game.mining) {
        window.game.mining.consumeToolDurability();
      }

      return true; // Acertou entidade
    }

    return false; // Nenhuma entidade atingida
  }

  // Atualiza bloco sob a mira
  updateTargetBlock() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);

    this.targetBlock = this.world.raycast(this.camera.position, dir, 5.0);

    if (this.targetBlock) {
      const { x, y, z } = this.targetBlock.block;
      this.selectionBox.position.set(x + 0.5, y + 0.5, z + 0.5);
      this.selectionBox.visible = true;
    } else {
      this.selectionBox.visible = false;
    }
  }

  // Ação de Quebrar Bloco (Clique Esquerdo)
  breakBlock() {
    if (!this.targetBlock) return;

    const { x, y, z } = this.targetBlock.block;
    if (y === 0) return; // Bedrock inquebrável

    const blockType = this.world.getBlock(x, y, z);
    const def = BLOCK_TYPES[blockType];
    if (!def || !def.breakable) return;

    // Se estiver quebrando uma fornalha, remove seus dados e gera drops internos
    if (blockType === BLOCK_FURNACE && window.game.furnace) {
      window.game.furnace.removeFurnaceAt(x, y, z);
    }

    // Altera no mundo
    this.world.setBlock(x, y, z, BLOCK_AIR);
    this.playSound('break');

    if (this.arm) {
      this.arm.triggerSwing();
    }

    // Drops 3D no modo sobrevivência
    if (window.game && window.game.gameMode === 'survival') {
      if (window.game.mining) {
        window.game.mining.handleDrops(blockType, def, { x: x + 0.5, y: y + 0.5, z: z + 0.5 });
      } else if (def.dropItem !== null && def.dropItem !== undefined) {
        this.inventory.addItem(def.dropItem, 1);
      }
    }

    this.updateTargetBlock();
  }

  // Ação de Colocar Bloco ou Interagir (Clique Direito)
  placeBlock() {
    if (!this.targetBlock) return;

    // 1. Interação com a Fornalha: abre a interface de fundição (Requisito 21)
    if (this.targetBlock.type === BLOCK_FURNACE) {
      if (window.game && window.game.furnace) {
        window.game.furnace.openUI(
          this.targetBlock.block.x,
          this.targetBlock.block.y,
          this.targetBlock.block.z
        );
        return;
      }
    }

    // 2. Interação com a Bancada de Trabalho: abre a grade 3x3 de crafting
    if (this.targetBlock.type === BLOCK_CRAFTING_TABLE) {
      if (window.game && typeof window.game.openCraftingTable === 'function') {
        window.game.openCraftingTable();
        return;
      }
    }

    // 3. Obtém o item atualmente selecionado na Hotbar
    const hotbarItem = this.inventory.getSelectedHotbarItem();
    if (!hotbarItem || hotbarItem.count <= 0) return;

    // Itens (ferramentas, gravetos, lingotes, etc.) não são blocos colocáveis
    if (isItem(hotbarItem.id)) return;

    const target = this.targetBlock.block;
    const normal = this.targetBlock.normal;

    const placeX = target.x + normal.x;
    const placeY = target.y + normal.y;
    const placeZ = target.z + normal.z;

    // 4. Limites do mundo
    if (!this.world.inBounds(placeX, placeY, placeZ)) return;

    // 5. Não sobrepor o corpo do jogador
    if (this.physics.overlapsPlayer(placeX, placeY, placeZ, this.position)) {
      return;
    }

    // 6. Posiciona o bloco no mundo
    const placed = this.world.setBlock(placeX, placeY, placeZ, hotbarItem.id);
    if (placed) {
      this.playSound('place');

      if (this.arm) {
        this.arm.triggerPunch();
      }

      // Consome 1 unidade apenas no modo Sobrevivência
      if (window.game && window.game.gameMode !== 'creative') {
        this.inventory.consumeSelectedItem();
      }
      this.updateTargetBlock();
    }
  }
}
