// =============================================================================
// js/world.js - Gerenciamento do Mundo 128x32x128, Chunks, Raycasting DDA
// =============================================================================

class World {
  constructor(scene, seed = 12345, savedModifiedBlocks = null) {
    this.scene = scene;
    this.seed = seed;

    // Dimensões do mundo: 128 x 32 x 128 blocos
    this.sizeX = 128;
    this.sizeY = 32;
    this.sizeZ = 128;

    // Grid de Chunks: 8 x 8 = 64 chunks (cada chunk 16x32x16)
    this.numChunksX = this.sizeX / CHUNK_SIZE_X; // 8
    this.numChunksZ = this.sizeZ / CHUNK_SIZE_Z; // 8

    this.chunks = new Array(this.numChunksX * this.numChunksZ);

    // Dicionário de blocos modificados pelo jogador para persistência compacta
    this.modifiedBlocks = savedModifiedBlocks ? { ...savedModifiedBlocks } : {};

    // Gerador de terreno procedural com seed
    this.terrain = new TerrainGenerator(this.seed);

    // Inicializa a estrutura de chunks e adiciona à cena
    this.initChunks();

    // Gera o terreno procedural
    this.generateTerrain();

    // Aplica as modificações salvas do jogador
    this.applyModifiedBlocks();

    // Constrói as malhas visuais de todos os chunks
    this.buildAllChunkMeshes();
  }

  getChunkIndex(cx, cz) {
    if (cx < 0 || cx >= this.numChunksX || cz < 0 || cz >= this.numChunksZ) return -1;
    return cx + cz * this.numChunksX;
  }

  getChunk(cx, cz) {
    const idx = this.getChunkIndex(cx, cz);
    return idx !== -1 ? this.chunks[idx] : null;
  }

  initChunks() {
    for (let cx = 0; cx < this.numChunksX; cx++) {
      for (let cz = 0; cz < this.numChunksZ; cz++) {
        const chunk = new Chunk(cx, cz, this);
        this.chunks[this.getChunkIndex(cx, cz)] = chunk;
        this.scene.add(chunk.group);
      }
    }
  }

  inBounds(x, y, z) {
    return x >= 0 && x < this.sizeX && y >= 0 && y < this.sizeY && z >= 0 && z < this.sizeZ;
  }

  getBlock(x, y, z) {
    if (!this.inBounds(x, y, z)) {
      if (y < 0) return BLOCK_STONE; // Chão base para não cair no infinito
      return BLOCK_AIR;
    }
    const cx = Math.floor(x / CHUNK_SIZE_X);
    const cz = Math.floor(z / CHUNK_SIZE_Z);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return BLOCK_AIR;

    const lx = x & 15;
    const lz = z & 15;
    return chunk.getLocalBlock(lx, y, lz);
  }

  setBlock(x, y, z, type, recordModification = true) {
    if (!this.inBounds(x, y, z)) return false;
    if (y === 0) return false; // Bedrock inquebrável

    const cx = Math.floor(x / CHUNK_SIZE_X);
    const cz = Math.floor(z / CHUNK_SIZE_Z);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return false;

    const lx = x & 15;
    const lz = z & 15;

    chunk.setLocalBlock(lx, y, lz, type);

    if (recordModification) {
      this.modifiedBlocks[`${x},${y},${z}`] = type;
    }

    // Rebuild do chunk atual
    chunk.rebuildMesh();

    // Se estiver na borda do chunk, reconstrói o chunk vizinho correspondente para atualizar face culling
    if (lx === 0 && cx > 0) {
      const neighbor = this.getChunk(cx - 1, cz);
      if (neighbor) { neighbor.markDirty(); neighbor.rebuildMesh(); }
    }
    if (lx === 15 && cx < this.numChunksX - 1) {
      const neighbor = this.getChunk(cx + 1, cz);
      if (neighbor) { neighbor.markDirty(); neighbor.rebuildMesh(); }
    }
    if (lz === 0 && cz > 0) {
      const neighbor = this.getChunk(cx, cz - 1);
      if (neighbor) { neighbor.markDirty(); neighbor.rebuildMesh(); }
    }
    if (lz === 15 && cz < this.numChunksZ - 1) {
      const neighbor = this.getChunk(cx, cz + 1);
      if (neighbor) { neighbor.markDirty(); neighbor.rebuildMesh(); }
    }

    return true;
  }

  isSolid(x, y, z) {
    if (y < 0) return true;
    if (!this.inBounds(x, y, z)) return false;
    const type = this.getBlock(x, y, z);
    return type !== BLOCK_AIR && BLOCK_TYPES[type]?.solid === true;
  }

  isLiquid(x, y, z) {
    if (!this.inBounds(x, y, z)) return false;
    const type = this.getBlock(x, y, z);
    return BLOCK_TYPES[type]?.isLiquid === true;
  }

  getBiome(x, z) {
    return this.terrain.getBiome(x, z);
  }

  // Gera terreno procedural para todo o mundo
  generateTerrain() {
    const seaLevel = 10;
    const potentialTrees = [];

    for (let x = 0; x < this.sizeX; x++) {
      const cx = Math.floor(x / CHUNK_SIZE_X);
      const lx = x & 15;

      for (let z = 0; z < this.sizeZ; z++) {
        const cz = Math.floor(z / CHUNK_SIZE_Z);
        const lz = z & 15;
        const chunk = this.getChunk(cx, cz);

        const groundHeight = this.terrain.getHeight(x, z);
        const biome = this.terrain.getBiome(x, z);

        for (let y = 0; y < this.sizeY; y++) {
          let block = BLOCK_AIR;

          if (y === 0) {
            // Camada 0: Bedrock inquebrável
            block = BLOCK_STONE;
          } else if (y < groundHeight) {
            // Subsolo
            if (y < groundHeight - 3) {
              // Pedra com veios de minérios
              block = BLOCK_STONE;

              // Minério de ferro (mais profundo, Y: 1 a 12)
              if (y <= 12 && this.terrain.localHash(x, y, z, 101) < 0.02) {
                block = BLOCK_IRON_ORE;
              }
              // Minério de carvão (Y: 2 a 20)
              else if (y <= 20 && this.terrain.localHash(x, y, z, 202) < 0.035) {
                block = BLOCK_COAL_ORE;
              }
            } else {
              // Camadas próximas à superfície
              if (biome === 'DESERT') {
                block = BLOCK_SAND;
              } else if (groundHeight <= seaLevel + 1) {
                block = BLOCK_SAND; // Praia perto da água
              } else {
                block = BLOCK_DIRT;
              }
            }
          } else if (y === groundHeight) {
            // Superfície
            if (biome === 'DESERT') {
              block = BLOCK_SAND;
            } else if (biome === 'MOUNTAIN' && groundHeight > 20) {
              block = BLOCK_STONE; // Picos rochosos expostos
            } else if (groundHeight <= seaLevel + 1) {
              block = BLOCK_SAND; // Praia na linha da água
            } else {
              block = BLOCK_GRASS;
            }
          } else if (y <= seaLevel && y > groundHeight) {
            // Água até o nível do mar
            block = BLOCK_WATER;
          }

          chunk.setLocalBlock(lx, y, lz, block);
        }

        // Verifica candidatos para geração de árvores
        if (groundHeight > seaLevel + 1 && groundHeight + 6 < this.sizeY) {
          const isGrass = chunk.getLocalBlock(lx, groundHeight, lz) === BLOCK_GRASS;
          if (isGrass) {
            if (biome === 'FOREST' && this.terrain.localHash(x, 0, z, 303) < 0.04) {
              potentialTrees.push({ x, y: groundHeight, z });
            } else if (biome === 'PLAINS' && this.terrain.localHash(x, 0, z, 303) < 0.008) {
              potentialTrees.push({ x, y: groundHeight, z });
            }
          }
        }
      }
    }

    // Filtra árvores para manter distância natural de pelo menos 4 blocos
    const filteredTrees = [];
    for (const tree of potentialTrees) {
      let tooClose = false;
      for (const existing of filteredTrees) {
        const dx = tree.x - existing.x;
        const dz = tree.z - existing.z;
        if (dx * dx + dz * dz < 16) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) {
        filteredTrees.push(tree);
      }
    }

    // Cria as árvores filtradas
    for (const tree of filteredTrees) {
      this.createTree(tree.x, tree.y, tree.z);
    }
  }

  // Gera uma árvore com tronco de madeira e copa de folhas
  createTree(x, groundY, z) {
    // Evita árvores nas bordas externas do mapa
    if (x < 3 || x >= this.sizeX - 3 || z < 3 || z >= this.sizeZ - 3) return;

    const trunkHeight = 4 + Math.floor(this.terrain.localHash(x, groundY, z, 404) * 2); // 4 ou 5 blocos

    // Tronco
    for (let ty = 1; ty <= trunkHeight; ty++) {
      const y = groundY + ty;
      if (y < this.sizeY) {
        this.rawSetBlock(x, y, z, BLOCK_WOOD);
      }
    }

    // Copa de folhas (esfera/cubo aparado)
    const leafBase = groundY + trunkHeight - 1;
    for (let lx = -2; lx <= 2; lx++) {
      for (let lz = -2; lz <= 2; lz++) {
        for (let ly = 0; ly <= 2; ly++) {
          const tx = x + lx;
          const ty = leafBase + ly;
          const tz = z + lz;

          // Arredonda cantos da copa
          if (Math.abs(lx) === 2 && Math.abs(lz) === 2 && ly >= 1) continue;

          if (this.inBounds(tx, ty, tz)) {
            const current = this.getBlock(tx, ty, tz);
            if (current === BLOCK_AIR) {
              this.rawSetBlock(tx, ty, tz, BLOCK_LEAVES);
            }
          }
        }
      }
    }
  }

  // Define bloco direto sem notificar / marcar dirty individualmente durante geração inicial
  rawSetBlock(x, y, z, type) {
    if (!this.inBounds(x, y, z)) return;
    const cx = Math.floor(x / CHUNK_SIZE_X);
    const cz = Math.floor(z / CHUNK_SIZE_Z);
    const chunk = this.getChunk(cx, cz);
    if (chunk) {
      chunk.setLocalBlock(x & 15, y, z & 15, type);
    }
  }

  // Aplica as modificações de blocos salvas no localStorage
  applyModifiedBlocks() {
    if (!this.modifiedBlocks) return;
    for (const key of Object.keys(this.modifiedBlocks)) {
      const parts = key.split(',');
      if (parts.length === 3) {
        const x = parseInt(parts[0], 10);
        const y = parseInt(parts[1], 10);
        const z = parseInt(parts[2], 10);
        const type = this.modifiedBlocks[key];
        this.rawSetBlock(x, y, z, type);
      }
    }
  }

  // Constrói todas as malhas dos chunks
  buildAllChunkMeshes() {
    for (let i = 0; i < this.chunks.length; i++) {
      this.chunks[i].rebuildMesh();
    }
  }

  /**
   * Algoritmo DDA Voxel Traversal para Raycasting de precisão.
   * Permite mirar e quebrar blocos sob a água atravessando a água.
   */
  raycast(origin, direction, maxDistance = 5.0) {
    const px = origin.x;
    const py = origin.y;
    const pz = origin.z;

    let x = Math.floor(px);
    let y = Math.floor(py);
    let z = Math.floor(pz);

    const stepX = direction.x > 0 ? 1 : (direction.x < 0 ? -1 : 0);
    const stepY = direction.y > 0 ? 1 : (direction.y < 0 ? -1 : 0);
    const stepZ = direction.z > 0 ? 1 : (direction.z < 0 ? -1 : 0);

    const tDeltaX = stepX !== 0 ? Math.abs(1 / direction.x) : Infinity;
    const tDeltaY = stepY !== 0 ? Math.abs(1 / direction.y) : Infinity;
    const tDeltaZ = stepZ !== 0 ? Math.abs(1 / direction.z) : Infinity;

    let tMaxX = stepX > 0 ? (x + 1 - px) * tDeltaX : (px - x) * tDeltaX;
    let tMaxY = stepY > 0 ? (y + 1 - py) * tDeltaY : (py - y) * tDeltaY;
    let tMaxZ = stepZ > 0 ? (z + 1 - pz) * tDeltaZ : (pz - z) * tDeltaZ;

    let normal = { x: 0, y: 0, z: 0 };
    let distance = 0;

    while (distance <= maxDistance) {
      if (this.inBounds(x, y, z)) {
        const block = this.getBlock(x, y, z);
        // Não mira na água para que o jogador possa mirar nos blocos embaixo d'água
        if (block !== BLOCK_AIR && block !== BLOCK_WATER) {
          return {
            hit: true,
            block: { x, y, z },
            normal: normal,
            type: block,
            distance: distance
          };
        }
      }

      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          x += stepX;
          distance = tMaxX;
          tMaxX += tDeltaX;
          normal = { x: -stepX, y: 0, z: 0 };
        } else {
          z += stepZ;
          distance = tMaxZ;
          tMaxZ += tDeltaZ;
          normal = { x: 0, y: 0, z: -stepZ };
        }
      } else {
        if (tMaxY < tMaxZ) {
          y += stepY;
          distance = tMaxY;
          tMaxY += tDeltaY;
          normal = { x: 0, y: -stepY, z: 0 };
        } else {
          z += stepZ;
          distance = tMaxZ;
          tMaxZ += tDeltaZ;
          normal = { x: 0, y: 0, z: -stepZ };
        }
      }
    }

    return null;
  }

  // Remove malhas da cena ao trocar de mundo
  dispose() {
    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];
      if (chunk) {
        this.scene.remove(chunk.group);
        chunk.dispose();
      }
    }
    this.chunks = [];
  }
}
