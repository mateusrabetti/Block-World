// =============================================================================
// js/arm.js - Braço em Primeira Pessoa, Exibição de Itens e Animações Dinâmicas
// =============================================================================

class FirstPersonArm {
  constructor(game, camera) {
    this.game = game;
    this.camera = camera;

    // Estado da animação
    this.animTime = 0;
    this.swingProgress = 0; // 0.0 a 1.0 (golpe/ataque/mineração)
    this.isSwinging = false;
    this.punchProgress = 0; // 0.0 a 1.0 (colocação de bloco)
    this.isPunching = false;

    // Cache do item atualmente na mão para evitar recriação desnecessária
    this.currentHeldItemId = null;

    // Grupo raiz do braço fixado na câmera
    this.armRoot = new THREE.Group();
    // Posição canônica do braço direito na tela (canto inferior direito)
    this.basePosition = new THREE.Vector3(0.32, -0.26, -0.38);
    this.baseRotation = new THREE.Euler(-0.15, 0.35, -0.18, 'YXZ');
    this.armRoot.position.copy(this.basePosition);
    this.armRoot.rotation.copy(this.baseRotation);

    // Constrói o modelo voxel do braço
    this.initArmMesh();

    // Contêiner para o item segurado pela mão (na extremidade frontal do braço)
    this.itemContainer = new THREE.Group();
    this.itemContainer.position.set(0, 0.03, -0.20);
    this.armRoot.add(this.itemContainer);

    // Iluminação suave dedicada de preenchimento (Viewmodel Fill Light)
    // Garante que o braço, blocos e ferramentas estejam sempre bem iluminados e nunca fiquem pretos
    this.viewmodelLight = new THREE.PointLight(0xfff8ee, 0.65, 3.5);
    this.viewmodelLight.position.set(0.15, 0.20, -0.15);
    this.viewmodelLight.castShadow = false;
    this.armRoot.add(this.viewmodelLight);

    // Adiciona à câmera para que se mova 100% sincronizado com a visão
    this.camera.add(this.armRoot);
  }

  initArmMesh() {
    // Grupo do braço
    this.armMeshGroup = new THREE.Group();

    // 1. Manga da camisa (azul-celeste / ciano clássico voxel, na base/ombro perto da câmera)
    const sleeveGeom = new THREE.BoxGeometry(0.115, 0.115, 0.16);
    const sleeveMat = new THREE.MeshLambertMaterial({ color: 0x0ea5e9 });
    const sleeveMesh = new THREE.Mesh(sleeveGeom, sleeveMat);
    sleeveMesh.position.set(0, 0, 0.07);
    sleeveMesh.castShadow = false;
    sleeveMesh.receiveShadow = false;
    this.armMeshGroup.add(sleeveMesh);

    // 2. Antebraço e mão (tom de pele humanoide, estendendo para frente)
    const skinGeom = new THREE.BoxGeometry(0.10, 0.10, 0.20);
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xe09b67 });
    const skinMesh = new THREE.Mesh(skinGeom, skinMat);
    skinMesh.position.set(0, 0, -0.10);
    skinMesh.castShadow = false;
    skinMesh.receiveShadow = false;
    this.armMeshGroup.add(skinMesh);

    this.armRoot.add(this.armMeshGroup);
  }

  // Atualiza o item exibido na mão direita baseado na hotbar
  updateHeldItem() {
    if (!this.game.inventory) return;

    const hotbarItem = this.game.inventory.getSelectedHotbarItem();
    const itemId = (hotbarItem && hotbarItem.count > 0) ? hotbarItem.id : null;

    if (itemId === this.currentHeldItemId) return;
    this.currentHeldItemId = itemId;

    // Limpa modelo do item anterior
    while (this.itemContainer.children.length > 0) {
      const child = this.itemContainer.children[0];
      this.itemContainer.remove(child);
      child.traverse((c) => {
        if (c.geometry) c.geometry.dispose();
      });
    }

    if (itemId === null) {
      // Mão vazia: esconde contêiner de itens
      this.itemContainer.visible = false;
      return;
    }

    this.itemContainer.visible = true;

    // Se for bloco: cria um cubo miniatura (0.22m) perfeitamente texturizado e orientado
    if (!isItem(itemId)) {
      const blockMesh = this.createBlockMesh(itemId);
      if (blockMesh) {
        this.itemContainer.add(blockMesh);
      }
    } else {
      // Se for ferramenta ou espada: cria modelo 3D correspondente
      const toolMesh = this.createToolMesh(itemId);
      if (toolMesh) {
        this.itemContainer.add(toolMesh);
      }
    }
  }

  // Cria malha do bloco na mão com materiais dedicados, escala proporcional e iluminação consistente
  createBlockMesh(itemId) {
    const def = (typeof BLOCK_TYPES !== 'undefined') ? BLOCK_TYPES[itemId] : null;
    if (!def) return null;

    // Escala proporcional de bloco na mão (0.22m) - visível, sólido e sem deformações
    const blockGeom = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    const isTrans = !!(def.transparent || def.isLiquid);
    const isWater = (itemId === (typeof BLOCK_WATER !== 'undefined' ? BLOCK_WATER : 12));

    // Buffer de cores de vértices com 1.0 (branco puro) para prevenir bugs com shaders que esperam vertexColors
    const colors = new Float32Array(24 * 3).fill(1.0);
    blockGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    let mat;
    if (isWater && typeof BLOCK_MATERIAL_WATER !== 'undefined') {
      mat = new THREE.MeshPhongMaterial({
        color: 0x245878,
        specular: 0x90e0ef,
        shininess: 90,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
        side: THREE.DoubleSide
      });
    } else if (isTrans) {
      const atlas = (typeof atlasTexture !== 'undefined') ? atlasTexture : ((typeof BLOCK_MATERIAL_TRANSPARENT !== 'undefined') ? BLOCK_MATERIAL_TRANSPARENT.map : null);
      mat = new THREE.MeshLambertMaterial({
        map: atlas,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        side: THREE.DoubleSide,
        vertexColors: false
      });
    } else {
      const atlas = (typeof atlasTexture !== 'undefined') ? atlasTexture : ((typeof BLOCK_MATERIAL_OPAQUE !== 'undefined') ? BLOCK_MATERIAL_OPAQUE.map : null);
      mat = new THREE.MeshLambertMaterial({
        map: atlas,
        transparent: false,
        alphaTest: 0.5,
        vertexColors: false
      });
    }

    if (def.tiles && typeof getTileUVs === 'function') {
      const uvs = [];
      for (let f = 0; f < 6; f++) {
        const tileIdx = (def.tiles[f] !== undefined) ? def.tiles[f] : (def.iconTile || 0);
        const { uMin, uMax, vMin, vMax } = getTileUVs(tileIdx);
        // Ordem canônica dos vértices por face no BoxGeometry do Three.js:
        // (0,1)->(uMin, vMax), (1,1)->(uMax, vMax), (0,0)->(uMin, vMin), (1,0)->(uMax, vMin)
        uvs.push(uMin, vMax, uMax, vMax, uMin, vMin, uMax, vMin);
      }
      blockGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    }

    blockGeom.computeVertexNormals();

    const blockMesh = new THREE.Mesh(blockGeom, mat);
    blockMesh.castShadow = false;
    blockMesh.receiveShadow = false;

    // Posição canônica na mão: visão isométrica natural mostrando topo (+Y), frente (+Z) e lateral (+X)
    blockMesh.position.set(0.02, 0.08, -0.05);
    blockMesh.rotation.set(0.28, 0.58, -0.14);

    return blockMesh;
  }

  // Constrói modelo 3D estilizado e reconhecível para espadas, ferramentas e itens
  createToolMesh(itemId) {
    const group = new THREE.Group();
    const def = getItemOrBlockDef(itemId);
    if (!def) return group;

    // Cores específicas de acordo com o material (Madeira, Pedra, Ferro)
    let headColor = 0xa57843;      // madeira
    let edgeHighlight = 0xc7985c;
    let guardColor = 0x6e4726;

    if (def.material === 'stone') {
      headColor = 0x828588;       // pedra cinzelada
      edgeHighlight = 0xa3a8ac;
      guardColor = 0x5a5c5e;
    } else if (def.material === 'iron') {
      headColor = 0xe2e8f0;       // ferro prateado brilhante
      edgeHighlight = 0xffffff;
      guardColor = 0x94a3b8;
    }

    if (itemId === ITEM_WOODEN_DOOR) {
      // -------------------------------------------------------------
      // PORTA DE MADEIRA (Miniatura 3D elegante na mão)
      // -------------------------------------------------------------
      const doorMat = new THREE.MeshLambertMaterial({ color: 0x855b38 });
      const frameMat = new THREE.MeshLambertMaterial({ color: 0x59381e });
      const windowMat = new THREE.MeshLambertMaterial({ color: 0x537d99 });
      const handleMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

      // Placa principal da porta
      const doorPlate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.02), doorMat);
      doorPlate.position.set(0, 0.14, 0);
      group.add(doorPlate);

      // Moldura externa
      const frameGeom = new THREE.BoxGeometry(0.15, 0.29, 0.024);
      const frame = new THREE.Mesh(frameGeom, frameMat);
      frame.position.set(0, 0.14, 0);
      group.add(frame);

      // Janelas superiores vazadas
      const win1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.026), windowMat);
      win1.position.set(-0.035, 0.21, 0);
      group.add(win1);
      const win2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.026), windowMat);
      win2.position.set(0.035, 0.21, 0);
      group.add(win2);

      // Maçaneta de ferro
      const doorKnob = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.035), handleMat);
      doorKnob.position.set(0.05, 0.11, 0);
      group.add(doorKnob);

      group.position.set(0, 0.04, 0);
      group.rotation.set(-0.35, 0.45, -0.25);
      return group;
    }

    // Cabo de madeira de carvalho reforçado
    const handleGeom = new THREE.BoxGeometry(0.026, 0.30, 0.026);
    const handleMat = new THREE.MeshLambertMaterial({ color: 0x5c381e });
    const handle = new THREE.Mesh(handleGeom, handleMat);
    handle.position.set(0, 0.10, 0);
    group.add(handle);

    // Pomo na extremidade inferior do cabo
    const pommelGeom = new THREE.BoxGeometry(0.036, 0.032, 0.036);
    const pommelMat = new THREE.MeshLambertMaterial({ color: guardColor });
    const pommel = new THREE.Mesh(pommelGeom, pommelMat);
    pommel.position.set(0, -0.04, 0);
    group.add(pommel);

    if (def.isWeapon) {
      // -------------------------------------------------------------
      // ESPADA (Visual Minecraft 1.8 com lâmina alongada, cruzeta e ponta)
      // -------------------------------------------------------------
      // Guarda / Cruzeta perpendicular
      const guardGeom = new THREE.BoxGeometry(0.14, 0.030, 0.042);
      const guardMat = new THREE.MeshLambertMaterial({ color: guardColor });
      const guard = new THREE.Mesh(guardGeom, guardMat);
      guard.position.set(0, 0.18, 0);
      group.add(guard);

      // Lâmina principal alongada
      const bladeGeom = new THREE.BoxGeometry(0.054, 0.38, 0.020);
      const bladeMat = new THREE.MeshLambertMaterial({ color: headColor });
      const blade = new THREE.Mesh(bladeGeom, bladeMat);
      blade.position.set(0, 0.38, 0);
      group.add(blade);

      // Ponta afilada da espada
      const tipGeom = new THREE.BoxGeometry(0.038, 0.06, 0.018);
      const tipMat = new THREE.MeshLambertMaterial({ color: edgeHighlight });
      const tip = new THREE.Mesh(tipGeom, tipMat);
      tip.position.set(0, 0.58, 0);
      group.add(tip);

      group.position.set(0, 0.02, 0);
      group.rotation.set(-0.45, 0.38, -0.28);
    } else if (def.toolType === 'pickaxe') {
      // -------------------------------------------------------------
      // PICARETA (Cabeça em arco duplo com pontas afiladas)
      // -------------------------------------------------------------
      // Encaixe central no topo do cabo
      const socketGeom = new THREE.BoxGeometry(0.042, 0.045, 0.042);
      const socket = new THREE.Mesh(socketGeom, new THREE.MeshLambertMaterial({ color: guardColor }));
      socket.position.set(0, 0.25, 0);
      group.add(socket);

      // Barra superior curvada
      const pickHeadGeom = new THREE.BoxGeometry(0.24, 0.044, 0.034);
      const headMat = new THREE.MeshLambertMaterial({ color: headColor });
      const head = new THREE.Mesh(pickHeadGeom, headMat);
      head.position.set(0, 0.26, 0);
      group.add(head);

      // Ponta esquerda afiada descendo
      const tipLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.045, 0.032), new THREE.MeshLambertMaterial({ color: edgeHighlight }));
      tipLeft.position.set(-0.13, 0.24, 0);
      group.add(tipLeft);

      // Ponta direita afiada descendo
      const tipRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.045, 0.032), new THREE.MeshLambertMaterial({ color: edgeHighlight }));
      tipRight.position.set(0.13, 0.24, 0);
      group.add(tipRight);

      group.position.set(0, 0.02, 0);
      group.rotation.set(-0.45, 0.38, -0.28);
    } else if (def.toolType === 'axe') {
      // -------------------------------------------------------------
      // MACHADO (Lâmina larga com corte afiado frontal e queixo)
      // -------------------------------------------------------------
      const axeMat = new THREE.MeshLambertMaterial({ color: headColor });
      const edgeMat = new THREE.MeshLambertMaterial({ color: edgeHighlight });

      // Bloco principal da lâmina
      const mainBlade = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.034), axeMat);
      mainBlade.position.set(0.045, 0.21, 0);
      group.add(mainBlade);

      // Fio de corte estendido e mais afiado na frente
      const cuttingEdge = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.14, 0.022), edgeMat);
      cuttingEdge.position.set(0.105, 0.21, 0);
      group.add(cuttingEdge);

      // Encaixe posterior do machado
      const axePoll = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.036), new THREE.MeshLambertMaterial({ color: guardColor }));
      axePoll.position.set(-0.03, 0.24, 0);
      group.add(axePoll);

      group.position.set(0, 0.02, 0);
      group.rotation.set(-0.45, 0.38, -0.28);
    } else if (def.toolType === 'shovel') {
      // -------------------------------------------------------------
      // PÁ (Encaixe e lâmina de pá côncava)
      // -------------------------------------------------------------
      const socket = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.04, 0.036), new THREE.MeshLambertMaterial({ color: guardColor }));
      socket.position.set(0, 0.25, 0);
      group.add(socket);

      // Lâmina da pá
      const spade = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.12, 0.024), new THREE.MeshLambertMaterial({ color: headColor }));
      spade.position.set(0, 0.32, 0);
      group.add(spade);

      // Borda afiada de corte da pá
      const spadeEdge = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.025, 0.016), new THREE.MeshLambertMaterial({ color: edgeHighlight }));
      spadeEdge.position.set(0, 0.385, 0);
      group.add(spadeEdge);

      group.position.set(0, 0.02, 0);
      group.rotation.set(-0.45, 0.38, -0.28);
    } else if (itemId === ITEM_IRON_INGOT) {
      // -------------------------------------------------------------
      // LINGOTE DE FERRO (Modelo 3D chanfrado com reflexo metálico)
      // -------------------------------------------------------------
      const ingotMat = new THREE.MeshLambertMaterial({ color: 0xd9e1e8 });
      const ingot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.08), ingotMat);
      ingot.position.set(0, 0.06, -0.02);
      ingot.rotation.set(0.2, 0.4, -0.1);
      group.add(ingot);
      return group;
    } else {
      // Outros itens (carne crua, carne assada, carvão, graveto): renderização volumétrica com sprite 2D de alta definição
      const planeGeom = new THREE.PlaneGeometry(0.22, 0.22);
      let texture;
      if (typeof itemIcons !== 'undefined' && itemIcons[itemId]) {
        texture = new THREE.CanvasTexture(itemIcons[itemId]);
      } else {
        const iconUrl = getItemOrBlockIcon(itemId);
        texture = new THREE.TextureLoader().load(iconUrl);
      }
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      const planeMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.1,
        side: THREE.DoubleSide
      });
      const plane = new THREE.Mesh(planeGeom, planeMat);
      plane.position.set(0, 0.07, -0.02);
      plane.rotation.set(0.1, 0.35, 0);
      group.add(plane);
    }

    group.traverse((c) => {
      if (c.isMesh) {
        c.castShadow = false;
        c.receiveShadow = false;
      }
    });

    return group;
  }


  // Dispara animação de ataque / golpe / quebra
  triggerSwing() {
    this.isSwinging = true;
    this.swingProgress = 0;
  }

  // Dispara animação de colocação de bloco
  triggerPunch() {
    this.isPunching = true;
    this.punchProgress = 0;
  }

  // Atualização contínua a cada quadro
  update(dt, isMoving, isMining) {
    this.updateHeldItem();

    this.animTime += dt;

    // 1. Balanço de respiração sutil (Idle)
    const breathOffset = Math.sin(this.animTime * 2.2) * 0.004;

    // 2. Balanço natural ao caminhar (Walk Bobbing)
    let walkX = 0;
    let walkY = 0;
    if (isMoving) {
      walkX = Math.cos(this.animTime * 7.5) * 0.016;
      walkY = Math.sin(this.animTime * 15.0) * 0.014;
    }

    // 3. Golpe contínuo se estiver minerando
    if (isMining && !this.isSwinging) {
      this.triggerSwing();
    }

    // 4. Animação de Swing (Ataque / Quebra)
    let swingRotX = 0;
    let swingRotY = 0;
    let swingRotZ = 0;
    let swingPosX = 0;
    let swingPosY = 0;
    let swingPosZ = 0;

    if (this.isSwinging) {
      const swingDuration = 0.22;
      this.swingProgress += dt / swingDuration;

      if (this.swingProgress >= 1.0) {
        this.swingProgress = 0;
        this.isSwinging = isMining; // Continua se estiver minerando
      }

      // Arco suave senoidal de corte para frente e para baixo
      const sinCurve = Math.sin(this.swingProgress * Math.PI);
      swingRotX = -sinCurve * 0.65;
      swingRotY = sinCurve * 0.45;
      swingRotZ = -sinCurve * 0.35;
      swingPosZ = -sinCurve * 0.08;
      swingPosY = -sinCurve * 0.04;
    }

    // 5. Animação de Colocação (Punch)
    if (this.isPunching) {
      const punchDuration = 0.16;
      this.punchProgress += dt / punchDuration;

      if (this.punchProgress >= 1.0) {
        this.punchProgress = 0;
        this.isPunching = false;
      }

      const pCurve = Math.sin(this.punchProgress * Math.PI);
      swingPosZ -= pCurve * 0.07;
      swingRotX += pCurve * 0.25;
    }

    // Aplica posições e rotações compostas
    this.armRoot.position.set(
      this.basePosition.x + walkX + swingPosX,
      this.basePosition.y + breathOffset + walkY + swingPosY,
      this.basePosition.z + swingPosZ
    );

    this.armRoot.rotation.set(
      this.baseRotation.x + swingRotX,
      this.baseRotation.y + swingRotY,
      this.baseRotation.z + swingRotZ
    );
  }
}

window.FirstPersonArm = FirstPersonArm;
