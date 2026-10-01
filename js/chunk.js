// =============================================================================
// js/chunk.js - Gerenciamento de Chunk Voxel e Geração Otimizada de Malhas
// =============================================================================

const CHUNK_SIZE_X = 16;
const CHUNK_SIZE_Y = 32;
const CHUNK_SIZE_Z = 16;

class Chunk {
  constructor(cx, cz, world) {
    this.cx = cx;
    this.cz = cz;
    this.world = world;

    this.worldX = cx * CHUNK_SIZE_X;
    this.worldZ = cz * CHUNK_SIZE_Z;

    // Dados dos blocos (16 x 32 x 16 = 8192 bytes)
    this.data = new Uint8Array(CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z);

    this.isDirty = true;

    // Grupo Three.js que conterá as malhas deste chunk
    this.group = new THREE.Group();
    this.group.position.set(this.worldX, 0, this.worldZ);

    this.opaqueMesh = null;
    this.transparentMesh = null;
  }

  // Índice linear local
  getIndex(lx, ly, lz) {
    return lx + lz * CHUNK_SIZE_X + ly * (CHUNK_SIZE_X * CHUNK_SIZE_Z);
  }

  inLocalBounds(lx, ly, lz) {
    return lx >= 0 && lx < CHUNK_SIZE_X && ly >= 0 && ly < CHUNK_SIZE_Y && lz >= 0 && lz < CHUNK_SIZE_Z;
  }

  getLocalBlock(lx, ly, lz) {
    if (!this.inLocalBounds(lx, ly, lz)) return BLOCK_AIR;
    return this.data[this.getIndex(lx, ly, lz)];
  }

  markDirty() {
    this.isDirty = true;
  }

  setLocalBlock(lx, ly, lz, type) {
    if (!this.inLocalBounds(lx, ly, lz)) return false;
    this.data[this.getIndex(lx, ly, lz)] = type;
    this.isDirty = true;
    return true;
  }

  /**
   * Reconstrói as malhas do chunk com Face Culling agressivo.
   * Só cria faces voltadas para ar, líquidos ou blocos transparentes.
   */
  rebuildMesh() {
    if (!this.isDirty) return;
    this.isDirty = false;

    // Limpa malhas anteriores
    if (this.opaqueMesh) {
      this.group.remove(this.opaqueMesh);
      if (this.opaqueMesh.geometry) this.opaqueMesh.geometry.dispose();
      this.opaqueMesh = null;
    }
    if (this.transparentMesh) {
      this.group.remove(this.transparentMesh);
      if (this.transparentMesh.geometry) this.transparentMesh.geometry.dispose();
      this.transparentMesh = null;
    }

    // Buffers para malhas opacas e transparentes
    const opaqueBuffers = { positions: [], normals: [], uvs: [], indices: [] };
    const transBuffers = { positions: [], normals: [], uvs: [], indices: [] };

    // Definição das 6 faces: [+X, -X, +Y, -Y, +Z, -Z]
    const FACE_DIRS = [
      { dir: [1, 0, 0], faceIdx: 0, norm: [1, 0, 0] },   // +X
      { dir: [-1, 0, 0], faceIdx: 1, norm: [-1, 0, 0] },  // -X
      { dir: [0, 1, 0], faceIdx: 2, norm: [0, 1, 0] },   // +Y
      { dir: [0, -1, 0], faceIdx: 3, norm: [0, -1, 0] },  // -Y
      { dir: [0, 0, 1], faceIdx: 4, norm: [0, 0, 1] },   // +Z
      { dir: [0, 0, -1], faceIdx: 5, norm: [0, 0, -1] }   // -Z
    ];

    // Vértices relativos para cada face (posições unitárias)
    const FACE_VERTS = [
      // +X
      [
        [1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]
      ],
      // -X
      [
        [0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]
      ],
      // +Y (Topo)
      [
        [0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]
      ],
      // -Y (Baixo)
      [
        [0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]
      ],
      // +Z
      [
        [1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]
      ],
      // -Z
      [
        [0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]
      ]
    ];

    for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
      const wx = this.worldX + lx;
      for (let ly = 0; ly < CHUNK_SIZE_Y; ly++) {
        const wy = ly;
        for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
          const wz = this.worldZ + lz;

          const blockId = this.data[this.getIndex(lx, ly, lz)];
          if (blockId === BLOCK_AIR) continue;

          const blockDef = BLOCK_TYPES[blockId];
          if (!blockDef) continue;

          const isTrans = blockDef.transparent || blockDef.isLiquid;
          const targetBuf = isTrans ? transBuffers : opaqueBuffers;

          // Itera pelas 6 faces
          for (let f = 0; f < 6; f++) {
            const { dir, faceIdx, norm } = FACE_DIRS[f];
            const nwx = wx + dir[0];
            const nwy = wy + dir[1];
            const nwz = wz + dir[2];

            // Obter bloco vizinho do mundo
            const neighborId = this.world.getBlock(nwx, nwy, nwz);
            const neighborDef = BLOCK_TYPES[neighborId];

            let shouldRenderFace = false;

            if (blockDef.isLiquid) {
              // Água: só renderiza faces que não encostam em outra água
              if (neighborId !== BLOCK_WATER) {
                if (faceIdx === 2) {
                  // Face superior: visível se acima não for água
                  shouldRenderFace = true;
                } else {
                  // Laterais e fundo: visíveis se vizinho for ar ou bloco transparente
                  if (neighborId === BLOCK_AIR || (neighborDef && neighborDef.transparent)) {
                    shouldRenderFace = true;
                  }
                }
              }
            } else if (blockDef.transparent) {
              // Bloco transparente (como Vidro): renderiza se vizinho for diferente
              if (neighborId !== blockId) {
                shouldRenderFace = true;
              }
            } else {
              // Bloco opaco: renderiza se vizinho for ar, transparente ou líquido
              if (neighborId === BLOCK_AIR || !neighborDef || neighborDef.transparent || neighborDef.isLiquid) {
                shouldRenderFace = true;
              }
            }

            if (!shouldRenderFace) continue;

            // UVs da face no Texture Atlas
            const tileIdx = blockDef.tiles ? blockDef.tiles[faceIdx] : 0;
            const { uMin, uMax, vMin, vMax } = getTileUVs(tileIdx);

            const vertIdxOffset = targetBuf.positions.length / 3;
            const fVerts = FACE_VERTS[f];

            // Posições dos 4 vértices
            for (let v = 0; v < 4; v++) {
              targetBuf.positions.push(
                lx + fVerts[v][0],
                ly + fVerts[v][1],
                lz + fVerts[v][2]
              );
              targetBuf.normals.push(norm[0], norm[1], norm[2]);
            }

            // UVs correspondentes aos 4 vértices
            targetBuf.uvs.push(
              uMin, vMin, // v0
              uMin, vMax, // v1
              uMax, vMax, // v2
              uMax, vMin  // v3
            );

            // 2 Triângulos por face
            targetBuf.indices.push(
              vertIdxOffset,
              vertIdxOffset + 1,
              vertIdxOffset + 2,
              vertIdxOffset,
              vertIdxOffset + 2,
              vertIdxOffset + 3
            );
          }
        }
      }
    }

    // Cria a malha opaca se houver vértices
    if (opaqueBuffers.positions.length > 0) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(opaqueBuffers.positions, 3));
      geom.setAttribute('normal', new THREE.Float32BufferAttribute(opaqueBuffers.normals, 3));
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(opaqueBuffers.uvs, 2));
      geom.setIndex(opaqueBuffers.indices);

      this.opaqueMesh = new THREE.Mesh(geom, BLOCK_MATERIAL_OPAQUE);
      this.opaqueMesh.castShadow = false;
      this.opaqueMesh.receiveShadow = false;
      this.group.add(this.opaqueMesh);
    }

    // Cria a malha transparente se houver vértices
    if (transBuffers.positions.length > 0) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(transBuffers.positions, 3));
      geom.setAttribute('normal', new THREE.Float32BufferAttribute(transBuffers.normals, 3));
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(transBuffers.uvs, 2));
      geom.setIndex(transBuffers.indices);

      this.transparentMesh = new THREE.Mesh(geom, BLOCK_MATERIAL_TRANSPARENT);
      this.transparentMesh.castShadow = false;
      this.transparentMesh.receiveShadow = false;
      this.group.add(this.transparentMesh);
    }
  }

  dispose() {
    if (this.opaqueMesh) {
      this.group.remove(this.opaqueMesh);
      if (this.opaqueMesh.geometry) this.opaqueMesh.geometry.dispose();
      this.opaqueMesh = null;
    }
    if (this.transparentMesh) {
      this.group.remove(this.transparentMesh);
      if (this.transparentMesh.geometry) this.transparentMesh.geometry.dispose();
      this.transparentMesh = null;
    }
  }
}
