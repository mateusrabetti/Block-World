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
    this.basePosition = new THREE.Vector3(0.32, -0.28, -0.52);
    this.baseRotation = new THREE.Euler(-0.25, -0.35, 0.12, 'YXZ');
    this.armRoot.position.copy(this.basePosition);
    this.armRoot.rotation.copy(this.baseRotation);

    // Constrói o modelo voxel do braço
    this.initArmMesh();

    // Contêiner para o item segurado pela mão
    this.itemContainer = new THREE.Group();
    this.itemContainer.position.set(0, -0.15, 0.16);
    this.armRoot.add(this.itemContainer);

    // Adiciona à câmera para que se mova 100% sincronizado com a visão
    this.camera.add(this.armRoot);
  }

  initArmMesh() {
    // Grupo do braço
    this.armMeshGroup = new THREE.Group();

    // 1. Manga da camisa (azul-celeste / ciano clássico voxel)
    const sleeveGeom = new THREE.BoxGeometry(0.12, 0.18, 0.12);
    const sleeveMat = new THREE.MeshLambertMaterial({ color: 0x0ea5e9 });
    const sleeveMesh = new THREE.Mesh(sleeveGeom, sleeveMat);
    sleeveMesh.position.set(0, 0.08, 0);
    this.armMeshGroup.add(sleeveMesh);

    // 2. Antebraço e mão (tom de pele humanoide)
    const skinGeom = new THREE.BoxGeometry(0.108, 0.22, 0.108);
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xe09b67 });
    const skinMesh = new THREE.Mesh(skinGeom, skinMat);
    skinMesh.position.set(0, -0.10, 0);
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
      // Mão vazia: braço fica ligeiramente mais inclinado
      this.itemContainer.visible = false;
      return;
    }

    this.itemContainer.visible = true;

    // Se for bloco: cria um cubo miniatura (0.16m) texturizado
    if (!isItem(itemId)) {
      const blockGeom = new THREE.BoxGeometry(0.16, 0.16, 0.16);
      const def = BLOCK_TYPES[itemId];
      const isTrans = def && (def.transparent || def.isLiquid);
      const mat = isTrans ? BLOCK_MATERIAL_TRANSPARENT.clone() : BLOCK_MATERIAL_OPAQUE.clone();

      if (def && def.tiles) {
        const uvs = [];
        for (let f = 0; f < 6; f++) {
          const tileIdx = def.tiles[f];
          const { uMin, uMax, vMin, vMax } = getTileUVs(tileIdx);
          uvs.push(uMin, vMax, uMax, vMax, uMin, vMin, uMax, vMin);
        }
        blockGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      }

      const blockMesh = new THREE.Mesh(blockGeom, mat);
      blockMesh.rotation.set(0.3, 0.6, -0.2);
      this.itemContainer.add(blockMesh);
    } else {
      // Se for ferramenta ou espada: cria modelo 3D correspondente
      const toolMesh = this.createToolMesh(itemId);
      if (toolMesh) {
        this.itemContainer.add(toolMesh);
      }
    }
  }

  // Constrói modelo 3D para espadas e ferramentas
  createToolMesh(itemId) {
    const group = new THREE.Group();
    const def = getItemOrBlockDef(itemId);
    if (!def) return group;

    // Cor da lâmina/cabeça
    let headColor = 0xa57843; // madeira
    if (def.material === 'stone') headColor = 0x828588; // pedra
    else if (def.material === 'iron') headColor = 0xd9e1e8; // ferro brilhante

    // 1. Cabo de madeira longo
    const handleGeom = new THREE.BoxGeometry(0.024, 0.32, 0.024);
    const handleMat = new THREE.MeshLambertMaterial({ color: 0x6e4726 });
    const handle = new THREE.Mesh(handleGeom, handleMat);
    handle.position.set(0, 0.08, 0);
    group.add(handle);

    if (def.isWeapon) {
      // ESPADA
      // Guarda / Cruzeta
      const guardGeom = new THREE.BoxGeometry(0.12, 0.028, 0.038);
      const guardMat = new THREE.MeshLambertMaterial({ color: def.material === 'iron' ? 0x99a1a6 : headColor });
      const guard = new THREE.Mesh(guardGeom, guardMat);
      guard.position.set(0, 0.16, 0);
      group.add(guard);

      // Lâmina afiada longa com ponta
      const bladeGeom = new THREE.BoxGeometry(0.052, 0.36, 0.018);
      const bladeMat = new THREE.MeshLambertMaterial({ color: headColor });
      const blade = new THREE.Mesh(bladeGeom, bladeMat);
      blade.position.set(0, 0.35, 0);
      group.add(blade);

      // Orientação de empunhadura da espada
      group.rotation.set(0.6, -0.4, 0.3);
      group.position.set(0.02, 0.02, 0.04);
    } else if (def.toolType === 'pickaxe') {
      // PICARETA
      const headGeom = new THREE.BoxGeometry(0.24, 0.042, 0.032);
      const headMat = new THREE.MeshLambertMaterial({ color: headColor });
      const head = new THREE.Mesh(headGeom, headMat);
      head.position.set(0, 0.24, 0);
      group.add(head);

      group.rotation.set(0.4, -0.5, 0.2);
    } else if (def.toolType === 'axe') {
      // MACHADO
      const headGeom = new THREE.BoxGeometry(0.13, 0.11, 0.032);
      const headMat = new THREE.MeshLambertMaterial({ color: headColor });
      const head = new THREE.Mesh(headGeom, headMat);
      head.position.set(0.04, 0.22, 0);
      group.add(head);

      group.rotation.set(0.4, -0.5, 0.2);
    } else if (def.toolType === 'shovel') {
      // PÁ
      const headGeom = new THREE.BoxGeometry(0.075, 0.12, 0.022);
      const headMat = new THREE.MeshLambertMaterial({ color: headColor });
      const head = new THREE.Mesh(headGeom, headMat);
      head.position.set(0, 0.24, 0);
      group.add(head);

      group.rotation.set(0.4, -0.5, 0.2);
    } else {
      // Outros itens (carne, lingote, carvão): plano 2D com ícone estilizado
      const planeGeom = new THREE.PlaneGeometry(0.22, 0.22);
      const iconUrl = getItemOrBlockIcon(itemId);
      const texture = new THREE.TextureLoader().load(iconUrl);
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      const planeMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
      });
      const plane = new THREE.Mesh(planeGeom, planeMat);
      plane.rotation.set(0.2, 0.5, 0);
      group.add(plane);
    }

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

      // Arco suave senoidal de corte
      const sinCurve = Math.sin(this.swingProgress * Math.PI);
      swingRotX = sinCurve * 0.95;
      swingRotY = -sinCurve * 0.45;
      swingRotZ = sinCurve * 0.35;
      swingPosZ = -sinCurve * 0.08;
      swingPosY = sinCurve * 0.04;
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
