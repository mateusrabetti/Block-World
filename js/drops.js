// =============================================================================
// js/drops.js - Sistema Central de Drops 3D no Mundo, Física, Atração e Coleta
// =============================================================================

class ItemDrop {
  constructor(x, y, z, itemId, count = 1, durability = undefined, manager) {
    this.manager = manager;
    this.itemId = itemId;
    this.count = count;
    this.durability = durability;

    this.position = new THREE.Vector3(x, y, z);
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 1.8,
      2.8 + Math.random() * 1.2,
      (Math.random() - 0.5) * 1.8
    );

    this.onGround = false;
    this.age = 0;
    this.baseY = y;
    this.hoverTime = Math.random() * Math.PI;

    this.isAttracting = false;

    // Constrói a malha visual 3D do drop no Three.js
    this.mesh = this.createDropMesh();
    this.mesh.position.copy(this.position);
    this.manager.scene.add(this.mesh);
  }

  createDropMesh() {
    const group = new THREE.Group();

    // Se for bloco, cria um cubo em miniatura (0.28m) com texturas do atlas
    if (!isItem(this.itemId)) {
      const geom = new THREE.BoxGeometry(0.28, 0.28, 0.28);
      const def = BLOCK_TYPES[this.itemId];
      const isTrans = def && (def.transparent || def.isLiquid);
      const mat = isTrans ? BLOCK_MATERIAL_TRANSPARENT.clone() : BLOCK_MATERIAL_OPAQUE.clone();

      // Ajusta UVs para cada face do cubinho do drop
      if (def && def.tiles) {
        const uvs = [];
        for (let f = 0; f < 6; f++) {
          const tileIdx = def.tiles[f];
          const { uMin, uMax, vMin, vMax } = getTileUVs(tileIdx);
          uvs.push(uMin, vMax, uMax, vMax, uMin, vMin, uMax, vMin);
        }
        geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      }

      const cubeMesh = new THREE.Mesh(geom, mat);
      group.add(cubeMesh);
    } else {
      // Se for item/ferramenta, cria um plano duplo com o ícone procedural recortado
      const geom = new THREE.PlaneGeometry(0.35, 0.35);
      const iconUrl = getItemOrBlockIcon(this.itemId);
      const texture = new THREE.TextureLoader().load(iconUrl);
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;

      const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.1,
        side: THREE.DoubleSide
      });

      const planeMesh = new THREE.Mesh(geom, mat);
      group.add(planeMesh);
    }

    return group;
  }

  update(dt, player, world) {
    this.age += dt;
    this.hoverTime += dt * 3.2;

    const playerPos = player.position;
    const playerTargetY = playerPos.y + 0.8;
    const dx = playerPos.x - this.position.x;
    const dy = playerTargetY - this.position.y;
    const dz = playerPos.z - this.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // 1. Atração magnética quando o jogador se aproxima (< 2.8m)
    if (dist < 2.8) {
      this.isAttracting = true;
      const speed = Math.max(5.5, 12.0 - dist * 2.2);
      this.position.x += (dx / dist) * speed * dt;
      this.position.y += (dy / dist) * speed * dt;
      this.position.z += (dz / dist) * speed * dt;
      this.velocity.set(0, 0, 0);

      // 2. Coleta quando encosta no jogador (< 0.75m)
      if (dist < 0.75) {
        this.attemptPickup(player);
      }
    } else {
      this.isAttracting = false;

      // Física de queda se ainda não estiver no chão
      if (!this.onGround) {
        this.velocity.y -= 16.0 * dt;
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
        this.position.z += this.velocity.z * dt;

        // Amortecimento horizontal
        this.velocity.x *= Math.pow(0.2, dt);
        this.velocity.z *= Math.pow(0.2, dt);

        // Colisão com blocos sólidos abaixo
        const blockX = Math.floor(this.position.x);
        const blockY = Math.floor(this.position.y - 0.15);
        const blockZ = Math.floor(this.position.z);

        if (world && world.isSolid(blockX, blockY, blockZ)) {
          this.position.y = blockY + 1.0 + 0.18;
          this.baseY = this.position.y;
          this.onGround = true;
          this.velocity.set(0, 0, 0);
        }
      } else {
        // Flutuação suave (levitação) e rotação no chão
        this.position.y = this.baseY + Math.sin(this.hoverTime) * 0.05;
      }
    }

    // Rotação visual contínua
    this.mesh.rotation.y += dt * 2.2;
    this.mesh.position.copy(this.position);
  }

  // Tenta coletar o item para o inventário
  attemptPickup(player) {
    if (!player || !player.inventory) return;

    // Verifica espaço no inventário
    const unplaced = player.inventory.addItem(this.itemId, this.count, this.durability);

    if (unplaced < this.count) {
      // Coletou pelo menos parte do stack!
      const collectedAmount = this.count - unplaced;
      this.count = unplaced;

      // Som crocante de coleta
      this.playPickupSound();

      if (window.game && window.game.ui) {
        window.game.ui.updateHotbar();
        window.game.ui.updateInventory();
      }

      // Se coletou tudo, remove o drop do mundo
      if (this.count <= 0) {
        this.dispose();
        this.manager.removeDrop(this);
      }
    }
    // Se unplaced === this.count (inventário cheio), o drop NÃO é destruído e permanece no chão!
  }

  playPickupSound() {
    if (!window.game || !window.game.player || !window.game.player.audioCtx) return;
    try {
      const ctx = window.game.player.audioCtx;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(840, now + 0.06);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {}
  }

  dispose() {
    if (this.mesh) {
      this.manager.scene.remove(this.mesh);
      this.mesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
      });
      this.mesh = null;
    }
  }
}

class DropManager {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.drops = [];
  }

  spawnDrop(x, y, z, itemId, count = 1, durability = undefined) {
    if (!itemId || count <= 0) return;
    const drop = new ItemDrop(x, y, z, itemId, count, durability, this);
    this.drops.push(drop);
    return drop;
  }

  removeDrop(drop) {
    const idx = this.drops.indexOf(drop);
    if (idx !== -1) {
      this.drops.splice(idx, 1);
    }
  }

  update(dt) {
    if (!this.game.player || !this.game.world) return;
    const player = this.game.player;
    const world = this.game.world;

    for (let i = this.drops.length - 1; i >= 0; i--) {
      this.drops[i].update(dt, player, world);
    }
  }

  clearAll() {
    for (let i = 0; i < this.drops.length; i++) {
      this.drops[i].dispose();
    }
    this.drops = [];
  }
}

window.ItemDrop = ItemDrop;
window.DropManager = DropManager;
