// =============================================================================
// js/multiplayer.js - Sistema Multiplayer LAN, Sincronização 3D e PvP Minecraft 1.8
// =============================================================================

/**
 * Representação visual 3D e física de outro jogador na sessão LAN.
 */
class RemotePlayer {
  constructor(id, name, position, sceneOrGame) {
    this.id = id;
    this.name = name || 'Jogador';
    this.scene = (sceneOrGame && typeof sceneOrGame.add === 'function') ? sceneOrGame : (sceneOrGame && sceneOrGame.scene ? sceneOrGame.scene : null);

    this.position = new THREE.Vector3(position?.x || 96, position?.y || 24, position?.z || 96);
    this.targetPosition = this.position.clone();
    this.velocity = new THREE.Vector3(0, 0, 0);

    this.yaw = 0;
    this.targetYaw = 0;
    this.pitch = 0;

    this.isSneaking = false;
    this.isSprinting = false;
    this.isFlying = false;
    this.isSwinging = false;
    this.heldItemId = null;
    this.currentRenderedItemId = null;

    this.health = 20;
    this.maxHealth = 20;
    this.invulnerableTimer = 0; // i-frames (500ms)
    this.knockbackTimer = 0; // Impede que pacotes de posição anulem o knockback
    this.hurtTimer = 0;

    this.animTime = Math.random() * 10;

    // Grupo Three.js do modelo do jogador
    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    // Constrói modelo 3D Voxel do jogador
    this.buildPlayerModel();

    // Constrói Nametag flutuante 3D com barra de vida acima da cabeça
    this.buildNametag();

    if (this.scene) {
      this.scene.add(this.group);
    }
  }

  buildPlayerModel() {
    this.modelRoot = new THREE.Group();
    this.group.add(this.modelRoot);

    const skinColor = 0xe09b67;
    const shirtColor = 0x0ea5e9;
    const pantsColor = 0x1e3a8a;
    const hairColor = 0x4a2e18;
    const eyeWhite = 0xffffff;
    const eyePupil = 0x2563eb;

    // 1. CABEÇA (0.45 x 0.45 x 0.45)
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.45, 0);

    const headMat = new THREE.MeshLambertMaterial({ color: skinColor });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), headMat);
    this.headGroup.add(head);

    // Cabelo voxel
    const hairMat = new THREE.MeshLambertMaterial({ color: hairColor });
    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.12, 0.47), hairMat);
    hairTop.position.set(0, 0.20, 0);
    this.headGroup.add(hairTop);

    // Olhos
    const eyeMat = new THREE.MeshBasicMaterial({ color: eyeWhite });
    const pupilMat = new THREE.MeshBasicMaterial({ color: eyePupil });

    const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.02), eyeMat);
    leftEye.position.set(-0.11, 0.02, 0.23);
    const leftPupil = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.022), pupilMat);
    leftPupil.position.set(-0.09, 0.02, 0.23);
    this.headGroup.add(leftEye);
    this.headGroup.add(leftPupil);

    const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.02), eyeMat);
    rightEye.position.set(0.11, 0.02, 0.23);
    const rightPupil = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.022), pupilMat);
    rightPupil.position.set(0.09, 0.02, 0.23);
    this.headGroup.add(rightEye);
    this.headGroup.add(rightPupil);

    this.modelRoot.add(this.headGroup);

    // 2. TRONCO / CORPO (0.45 x 0.60 x 0.24)
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.set(0, 0.90, 0);

    const shirtMat = new THREE.MeshLambertMaterial({ color: shirtColor });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.60, 0.24), shirtMat);
    this.torsoGroup.add(torso);
    this.modelRoot.add(this.torsoGroup);

    // 3. BRAÇO ESQUERDO
    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(-0.32, 1.15, 0);

    const armSleeveL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.20, 0.20), shirtMat);
    armSleeveL.position.set(0, -0.08, 0);
    this.leftArmGroup.add(armSleeveL);

    const armSkinL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.40, 0.18), headMat);
    armSkinL.position.set(0, -0.36, 0);
    this.leftArmGroup.add(armSkinL);

    this.modelRoot.add(this.leftArmGroup);

    // 4. BRAÇO DIREITO (Segura arma/ferramenta/bloco)
    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(0.32, 1.15, 0);

    const armSleeveR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.20, 0.20), shirtMat);
    armSleeveR.position.set(0, -0.08, 0);
    this.rightArmGroup.add(armSleeveR);

    const armSkinR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.40, 0.18), headMat);
    armSkinR.position.set(0, -0.36, 0);
    this.rightArmGroup.add(armSkinR);

    // Contêiner do item empunhado na mão direita
    this.heldItemContainer = new THREE.Group();
    this.heldItemContainer.position.set(0, -0.52, 0.08);
    this.rightArmGroup.add(this.heldItemContainer);

    this.modelRoot.add(this.rightArmGroup);

    // 5. PERNA ESQUERDA
    this.leftLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(-0.12, 0.60, 0);

    const pantsMat = new THREE.MeshLambertMaterial({ color: pantsColor });
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.60, 0.22), pantsMat);
    legL.position.set(0, -0.30, 0);
    this.leftLegGroup.add(legL);
    this.modelRoot.add(this.leftLegGroup);

    // 6. PERNA DIREITA
    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(0.12, 0.60, 0);

    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.60, 0.22), pantsMat);
    legR.position.set(0, -0.30, 0);
    this.rightLegGroup.add(legR);
    this.modelRoot.add(this.rightLegGroup);

    // Memoriza materiais para efeito de dano (flash vermelho)
    this.cachedMaterials = [];
    this.modelRoot.traverse((c) => {
      if (c.isMesh && c.material) {
        c.castShadow = true;
        c.receiveShadow = true;
        this.cachedMaterials.push({
          mesh: c,
          originalColor: c.material.color.getHex()
        });
      }
    });
  }

  buildNametag() {
    this.nametagCanvas = document.createElement('canvas');
    this.nametagCanvas.width = 256;
    this.nametagCanvas.height = 64;
    this.nametagCtx = this.nametagCanvas.getContext('2d');

    this.nametagTexture = new THREE.CanvasTexture(this.nametagCanvas);
    this.nametagTexture.magFilter = THREE.LinearFilter;
    this.nametagTexture.minFilter = THREE.LinearFilter;

    const spriteMat = new THREE.SpriteMaterial({
      map: this.nametagTexture,
      transparent: true,
      depthTest: false
    });

    this.nametagSprite = new THREE.Sprite(spriteMat);
    this.nametagSprite.position.set(0, 1.95, 0);
    this.nametagSprite.scale.set(1.4, 0.35, 1);
    this.group.add(this.nametagSprite);

    this.updateNametagVisual();
  }

  updateNametagVisual() {
    if (!this.nametagCtx) return;
    const ctx = this.nametagCtx;
    ctx.clearRect(0, 0, 256, 64);

    // Pílula escura de fundo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(8, 6, 240, 52, 10);
    } else {
      ctx.rect(8, 6, 240, 52);
    }
    ctx.fill();

    // Nome do jogador
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(this.name, 128, 10);

    // Barra de Vida
    const hpPct = Math.max(0, Math.min(1.0, this.health / this.maxHealth));
    const barW = 180;
    const barH = 8;
    const barX = (256 - barW) / 2;
    const barY = 38;

    ctx.fillStyle = '#450a0a';
    ctx.fillRect(barX, barY, barW, barH);

    ctx.fillStyle = hpPct > 0.4 ? '#22c55e' : (hpPct > 0.2 ? '#f59e0b' : '#ef4444');
    ctx.fillRect(barX, barY, barW * hpPct, barH);

    // Borda da barra
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    this.nametagTexture.needsUpdate = true;
  }

  // Atualiza item empunhado na mão direita do outro jogador
  updateHeldItem(itemId) {
    if (this.currentRenderedItemId === itemId) return;
    this.currentRenderedItemId = itemId;
    this.heldItemId = itemId;

    while (this.heldItemContainer.children.length > 0) {
      const child = this.heldItemContainer.children[0];
      this.heldItemContainer.remove(child);
      if (child.geometry) child.geometry.dispose();
    }

    if (!itemId) return;

    if (itemId >= 100) {
      // Espada / Ferramenta
      const def = getItemOrBlockDef(itemId);
      if (def) {
        let headColor = 0xa57843;
        if (def.material === 'stone') headColor = 0x828588;
        else if (def.material === 'iron') headColor = 0xe2e8f0;

        const toolGroup = new THREE.Group();
        const handle = new THREE.Mesh(
          new THREE.BoxGeometry(0.03, 0.28, 0.03),
          new THREE.MeshLambertMaterial({ color: 0x5c381e })
        );
        handle.position.set(0, 0.12, 0);
        toolGroup.add(handle);

        if (def.isWeapon) {
          const blade = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.36, 0.02),
            new THREE.MeshLambertMaterial({ color: headColor })
          );
          blade.position.set(0, 0.34, 0);
          toolGroup.add(blade);

          const guard = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.03, 0.04),
            new THREE.MeshLambertMaterial({ color: 0x6e4726 })
          );
          guard.position.set(0, 0.16, 0);
          toolGroup.add(guard);
        } else {
          const head = new THREE.Mesh(
            new THREE.BoxGeometry(0.20, 0.05, 0.04),
            new THREE.MeshLambertMaterial({ color: headColor })
          );
          head.position.set(0, 0.24, 0);
          toolGroup.add(head);
        }

        toolGroup.rotation.x = Math.PI / 2.2;
        this.heldItemContainer.add(toolGroup);
      }
    } else {
      // Bloco miniatura
      const blockDef = BLOCK_TYPES[itemId];
      if (blockDef) {
        const blockMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.18, 0.18),
          new THREE.MeshLambertMaterial({ color: 0x855b38 })
        );
        blockMesh.position.set(0, 0.08, 0);
        this.heldItemContainer.add(blockMesh);
      }
    }
  }

  // Recebe golpe / dano PvP (Estilo Minecraft 1.8 com 500ms de i-frames e knockback)
  takeDamage(amount, attackerPos = null) {
    if (this.invulnerableTimer > 0) return false;

    this.health = Math.max(0, this.health - amount);
    this.invulnerableTimer = 0.5; // Janela curta de 500ms invulnerável após dano
    this.hurtTimer = 0.22;
    this.setFlashRed(true);
    this.updateNametagVisual();

    if (attackerPos) {
      const dx = this.position.x - attackerPos.x;
      const dz = this.position.z - attackerPos.z;
      const len = Math.hypot(dx, dz) || 1;
      const kbHoriz = 5.0;
      const kbVert = 3.6;
      this.applyKnockback((dx / len) * kbHoriz, kbVert, (dz / len) * kbHoriz);
    }
    return true;
  }

  setFlashRed(isRed) {
    for (const item of this.cachedMaterials) {
      if (item.mesh && item.mesh.material) {
        if (isRed) {
          item.mesh.material.color.setHex(0xff3333);
        } else {
          item.mesh.material.color.setHex(item.originalColor);
        }
      }
    }
  }

  applyKnockback(kbX, kbY, kbZ) {
    this.knockbackTimer = 0.35;
    this.velocity.x = Math.max(-16, Math.min(16, this.velocity.x * 0.2 + kbX));
    this.velocity.y = Math.max(this.velocity.y, 0) + (kbY || 3.8);
    this.velocity.z = Math.max(-16, Math.min(16, this.velocity.z * 0.2 + kbZ));
    this.targetPosition.x += kbX * 0.35;
    this.targetPosition.y += (kbY || 3.8) * 0.25;
    this.targetPosition.z += kbZ * 0.35;
  }

  // Atualização por quadro com interpolação suave
  update(dt) {
    if (this.knockbackTimer > 0) {
      this.knockbackTimer -= dt;
    }

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
      if (this.invulnerableTimer < 0) this.invulnerableTimer = 0;
    }

    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
      if (this.hurtTimer <= 0) {
        this.hurtTimer = 0;
        this.setFlashRed(false);
      }
    }

    // 1. Interpolação suave de posição (Lerp)
    const lerpFactor = Math.min(1.0, 14.0 * dt);
    this.position.lerp(this.targetPosition, lerpFactor);

    // Integração de velocidade de knockback
    if (this.velocity.lengthSq() > 0.01) {
      this.position.x += this.velocity.x * dt;
      this.position.y += this.velocity.y * dt;
      this.position.z += this.velocity.z * dt;
      this.velocity.multiplyScalar(Math.max(0, 1 - 8 * dt));
    }

    this.group.position.copy(this.position);

    // 2. Interpolação de rotação (Yaw)
    this.yaw += (this.targetYaw - this.yaw) * lerpFactor;
    this.modelRoot.rotation.y = this.yaw + Math.PI; // Trás/Frente alinhados

    // Pitch da cabeça
    if (this.headGroup) {
      this.headGroup.rotation.x = this.pitch;
    }

    // 3. Postura de Agachamento (Sneak)
    if (this.isSneaking) {
      this.modelRoot.position.y = -0.15;
      if (this.torsoGroup) this.torsoGroup.rotation.x = 0.20;
      if (this.headGroup) this.headGroup.position.set(0, 1.35, 0.08);
    } else {
      this.modelRoot.position.y = 0;
      if (this.torsoGroup) this.torsoGroup.rotation.x = 0;
      if (this.headGroup) this.headGroup.position.set(0, 1.45, 0);
    }

    // 4. Animação de caminhada / corrida
    const horizDist = Math.sqrt(
      Math.pow(this.targetPosition.x - this.position.x, 2) +
      Math.pow(this.targetPosition.z - this.position.z, 2)
    );
    const isMoving = horizDist > 0.005;

    if (isMoving) {
      const speedMult = this.isSprinting ? 14 : 9;
      this.animTime += dt * speedMult;
      const legAngle = Math.sin(this.animTime) * 0.55;

      if (this.leftLegGroup) this.leftLegGroup.rotation.x = -legAngle;
      if (this.rightLegGroup) this.rightLegGroup.rotation.x = legAngle;

      if (this.leftArmGroup) this.leftArmGroup.rotation.x = legAngle;
      if (this.rightArmGroup && !this.isSwinging) {
        this.rightArmGroup.rotation.x = -legAngle;
      }
    } else {
      // Repouso suave
      if (this.leftLegGroup) this.leftLegGroup.rotation.x *= 0.8;
      if (this.rightLegGroup) this.rightLegGroup.rotation.x *= 0.8;
      if (this.leftArmGroup) this.leftArmGroup.rotation.x *= 0.8;
      if (this.rightArmGroup && !this.isSwinging) this.rightArmGroup.rotation.x *= 0.8;
    }

    // 5. Animação de ataque / golpe
    if (this.isSwinging && this.rightArmGroup) {
      this.rightArmGroup.rotation.x = -Math.PI / 2.5 + Math.sin(performance.now() * 0.02) * 0.3;
    }
  }

  // Verifica se o raio da mira atinge este jogador
  checkRayIntersection(rayOrigin, rayDir, maxDistance = 3.5) {
    const eye = new THREE.Vector3(rayOrigin.x, rayOrigin.y, rayOrigin.z);
    const dir = new THREE.Vector3(rayDir.x, rayDir.y, rayDir.z).normalize();

    // Caixa delimitadora do jogador
    const center = new THREE.Vector3(this.position.x, this.position.y + 0.9, this.position.z);
    const toCenter = center.clone().sub(eye);
    const projDist = toCenter.dot(dir);

    if (projDist > 0 && projDist <= maxDistance) {
      const closestPoint = eye.clone().add(dir.clone().multiplyScalar(projDist));
      const dist = closestPoint.distanceTo(center);
      // Raio do cilindro do corpo (~0.45m)
      if (dist <= 0.55) {
        return projDist;
      }
    }
    return null;
  }

  dispose() {
    this.scene.remove(this.group);
    if (this.nametagTexture) this.nametagTexture.dispose();
  }
}

/**
 * Gerenciador de Rede Multiplayer em LAN.
 */
class MultiplayerManager {
  constructor(game) {
    this.game = game;
    this.ws = null;
    this.status = 'DISCONNECTED'; // 'DISCONNECTED', 'CONNECTING', 'CONNECTED'
    this.isHost = false;
    this.myId = null;
    this.myName = 'Jogador';

    this.remotePlayers = new Map();
    this.lastSendTime = 0;
    this.sendInterval = 40; // ms (25 updates por segundo)

    // Referência global
    window.multiplayer = this;
  }

  // Inicia sessão como Anfitrião (Host)
  hostSession(worldName, seed, gameMode, modifiedBlocks = {}, serverAddress = null) {
    this.isHost = true;
    this.myName = 'Anfitrião';
    const address = serverAddress || (typeof window !== 'undefined' ? window.location.host : 'localhost:8080') || 'localhost:8080';
    this.connect(address, {
      role: 'host',
      worldName: worldName || 'Mundo LAN',
      seed: seed || 12345,
      gameMode: gameMode || 'survival',
      modifiedBlocks: modifiedBlocks || {}
    });
  }

  // Entra em uma sessão existente como Cliente
  joinSession(hostAddress, playerName) {
    this.isHost = false;
    this.myName = playerName || ('Jogador_' + Math.floor(Math.random() * 900 + 100));
    this.connect(hostAddress, {
      role: 'client',
      name: this.myName
    });
  }

  connect(address, handshakeData) {
    if (this.ws) {
      this.disconnect();
    }

    this.status = 'CONNECTING';
    const cleanAddr = address.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '');
    const wsUrl = `ws://${cleanAddr}`;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (err) {
      console.warn('Falha ao instanciar WebSocket:', err);
      this.onConnectionFailed('Não foi possível conectar ao servidor LAN.');
      return;
    }

    this.ws.onopen = () => {
      this.status = 'CONNECTED';
      this.send({
        type: 'join',
        ...handshakeData
      });

      if (this.game.ui) {
        this.game.ui.showToast(`Conectado à sessão LAN como ${this.myName}!`);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch (err) {
        console.error('Erro ao processar mensagem do servidor:', err);
      }
    };

    this.ws.onerror = (err) => {
      console.warn('Erro de conexão WebSocket:', err);
    };

    this.ws.onclose = () => {
      const wasConnected = (this.status === 'CONNECTED');
      this.status = 'DISCONNECTED';
      this.cleanupRemotePlayers();

      if (wasConnected && this.game.state === 'PLAYING') {
        if (!this.isHost) {
          if (this.game.ui) {
            this.game.ui.showToast('Conexão com a sessão LAN encerrada.');
          }
          this.game.worldManager.exitWorldToMenu();
        }
      }
    };
  }

  disconnect() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
    this.status = 'DISCONNECTED';
    this.cleanupRemotePlayers();
  }

  cleanupRemotePlayers() {
    this.remotePlayers.forEach(p => p.dispose());
    this.remotePlayers.clear();
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  onConnectionFailed(msg) {
    this.status = 'DISCONNECTED';
    if (this.game.ui) {
      this.game.ui.showToast(msg);
    }
  }

  // Processamento de mensagens recebidas
  handleMessage(msg) {
    switch (msg.type) {
      case 'init':
        this.myId = msg.yourId;
        break;

      case 'init_world':
        // Cliente recebendo os dados do mundo compartilhado do host
        if (!this.isHost) {
          const worldData = {
            id: 'lan_world_' + Date.now(),
            name: msg.worldName || 'Mundo LAN',
            seed: msg.seed || 12345,
            mode: msg.gameMode || 'survival',
            modifiedBlocks: msg.modifiedBlocks || {},
            health: 20
          };
          this.game.worldManager.loadWorld(worldData);
          this.game.enterGame();

          if (this.game.ui) {
            this.game.ui.showToast(`Mundo compartilhado carregado! Seed: ${msg.seed}`);
          }
        }
        break;

      case 'player_joined':
        if (msg.id !== this.myId && !this.remotePlayers.has(msg.id)) {
          const remoteP = new RemotePlayer(msg.id, msg.name, msg.position, this.game.scene);
          this.remotePlayers.set(msg.id, remoteP);
          if (this.game.ui) {
            this.game.ui.showToast(`${msg.name} entrou no mundo!`);
          }
        }
        break;

      case 'player_left':
        if (this.remotePlayers.has(msg.id)) {
          const p = this.remotePlayers.get(msg.id);
          const name = p.name;
          p.dispose();
          this.remotePlayers.delete(msg.id);
          if (this.game.ui) {
            this.game.ui.showToast(`${name} saiu da partida.`);
          }
        }
        break;

      case 'player_update':
        if (msg.id !== this.myId && this.remotePlayers.has(msg.id)) {
          const p = this.remotePlayers.get(msg.id);
          // Não anula o knockback em andamento com pacote de posição antigo
          if (p.knockbackTimer <= 0) {
            p.targetPosition.set(msg.x, msg.y, msg.z);
          }
          p.targetYaw = msg.yaw;
          p.pitch = msg.pitch;
          p.isSneaking = !!msg.isSneaking;
          p.isSprinting = !!msg.isSprinting;
          p.isFlying = !!msg.isFlying;
          p.isSwinging = !!msg.isSwinging;
          p.health = msg.health !== undefined ? msg.health : p.health;
          p.updateHeldItem(msg.heldItemId);
        }
        break;

      case 'block_change':
        // Alteração de bloco compartilhada
        if (this.game.world) {
          this.game.world.setBlock(msg.x, msg.y, msg.z, msg.blockType, true);
        }
        break;

      case 'door_toggle':
        if (this.game.player) {
          this.game.player.toggleDoor(msg.x, msg.y, msg.z, false);
        }
        break;

      case 'pvp_attack_request':
        // Host é autoridade para validar o ataque
        if (this.isHost) {
          this.handleHostPvPValidation(msg);
        }
        break;

      case 'player_damaged':
        this.handlePlayerDamaged(msg);
        break;

      case 'host_closed':
        if (!this.isHost) {
          if (this.game.ui) {
            this.game.ui.showToast('O anfitrião encerrou a sessão LAN.');
          }
          this.game.worldManager.exitWorldToMenu();
        }
        break;
    }
  }

  // Host valida autoritariamente dano, alcance e i-frames do PvP 1.8
  handleHostPvPValidation(msg) {
    const { attackerId, targetId, damage, isSprinting, attackerYaw, attackerPos } = msg;

    let targetIsHost = (targetId === this.myId);
    let target = targetIsHost ? this.game.player : this.remotePlayers.get(targetId);
    if (!target) return;

    // Janela de invulnerabilidade (i-frames: ~500ms)
    if (target.invulnerableTimer > 0) return;

    // Modo criativo não recebe dano
    if (this.game.gameMode === 'creative') return;

    target.invulnerableTimer = 0.5;

    // Cálculo do knockback direcionado relativo atacante -> alvo
    let dirX = 0;
    let dirZ = 0;

    let aPos = attackerPos;
    if (!aPos && attackerId === this.myId && this.game.player) {
      aPos = this.game.player.position;
    } else if (!aPos && this.remotePlayers.has(attackerId)) {
      aPos = this.remotePlayers.get(attackerId).position;
    }

    const tPos = target.position;
    if (aPos && tPos) {
      const dx = tPos.x - aPos.x;
      const dz = tPos.z - aPos.z;
      const len = Math.hypot(dx, dz);
      if (len > 0.001) {
        dirX = dx / len;
        dirZ = dz / len;
      }
    }

    if (dirX === 0 && dirZ === 0) {
      dirX = -Math.sin(attackerYaw || 0);
      dirZ = -Math.cos(attackerYaw || 0);
    }

    // Knockback estilo Minecraft 1.8 com bônus de corrida
    const horizKb = isSprinting ? 8.2 : 6.0;
    const kbX = dirX * horizKb;
    const kbZ = dirZ * horizKb;
    const kbY = 3.8;

    // Broadcast para todos os clientes
    this.send({
      type: 'player_damaged',
      targetId: targetId,
      damage: damage,
      kb: { x: kbX, y: kbY, z: kbZ },
      attackerId: attackerId
    });

    // Se o host é a vítima, aplica dano imediatamente
    if (targetIsHost) {
      if (this.game.health) {
        this.game.health.takeDamage(damage, 'pvp');
      }
      this.game.player.applyKnockback(kbX, kbY, kbZ);
    }
  }

  // Aplicação do resultado de dano validado
  handlePlayerDamaged(msg) {
    const { targetId, damage, kb } = msg;

    if (targetId === this.myId) {
      // O jogador local foi atingido
      if (this.game.health) {
        this.game.health.takeDamage(damage, 'pvp');
      }
      if (this.game.player && kb) {
        this.game.player.applyKnockback(kb.x, kb.y, kb.z);
      }
    } else if (this.remotePlayers.has(targetId)) {
      // Outro jogador foi atingido
      const p = this.remotePlayers.get(targetId);
      p.takeDamage(damage);
      if (kb) {
        p.applyKnockback(kb.x, kb.y, kb.z);
      }
    }
  }

  // Envia ataque de PvP para validação no Host
  sendAttack(targetId, damage, isSprinting, yaw, attackerPos = null) {
    const aPos = attackerPos ? { x: attackerPos.x, y: attackerPos.y, z: attackerPos.z } : null;
    if (this.isHost) {
      // Se for host, processa diretamente
      this.handleHostPvPValidation({
        attackerId: this.myId,
        targetId: targetId,
        damage: damage,
        isSprinting: isSprinting,
        attackerYaw: yaw,
        attackerPos: aPos
      });
    } else {
      // Cliente envia requisição para o host
      this.send({
        type: 'pvp_attack_request',
        targetId: targetId,
        damage: damage,
        isSprinting: isSprinting,
        attackerYaw: yaw,
        attackerPos: aPos
      });
    }
  }

  sendBlockChange(x, y, z, blockType) {
    this.send({
      type: 'block_change',
      x: x,
      y: y,
      z: z,
      blockType: blockType
    });
  }

  sendDoorToggle(x, y, z, isOpen) {
    this.send({
      type: 'door_toggle',
      x: x,
      y: y,
      z: z,
      isOpen: isOpen
    });
  }

  sendHealthUpdate(health) {
    this.send({
      type: 'health_update',
      health: health
    });
  }

  // Busca outro jogador no alcance da mira para PvP
  findPlayerInCrosshair(rayOrigin, rayDir, maxDistance = 3.5) {
    let closestPlayer = null;
    let closestDist = maxDistance;

    for (const [id, player] of this.remotePlayers) {
      const dist = player.checkRayIntersection(rayOrigin, rayDir, maxDistance);
      if (dist !== null && dist < closestDist) {
        closestDist = dist;
        closestPlayer = player;
      }
    }
    return closestPlayer;
  }

  // Loop de atualização contínua a cada quadro
  update(dt) {
    // 1. Atualiza modelos 3D dos outros jogadores
    for (const [id, player] of this.remotePlayers) {
      player.update(dt);
    }

    // 2. Transmite dados de posição do jogador local (25Hz)
    if (this.status === 'CONNECTED' && this.game.player && this.game.state === 'PLAYING') {
      const now = performance.now();
      if (now - this.lastSendTime >= this.sendInterval) {
        this.lastSendTime = now;
        const p = this.game.player;
        const held = this.game.inventory ? this.game.inventory.getSelectedHotbarItem() : null;

        this.send({
          type: 'player_update',
          x: p.position.x,
          y: p.position.y,
          z: p.position.z,
          yaw: p.yaw,
          pitch: p.pitch,
          isSneaking: !!(p.physics && p.physics.isSneaking),
          isSprinting: !!(this.game.input && this.game.input.keys.sprint),
          isFlying: !!p.isFlying,
          isSwinging: !!(p.arm && p.arm.isSwinging),
          heldItemId: (held && held.count > 0) ? held.id : null,
          health: this.game.health ? this.game.health.health : 20
        });
      }
    }
  }
}

window.RemotePlayer = RemotePlayer;
window.MultiplayerManager = MultiplayerManager;
