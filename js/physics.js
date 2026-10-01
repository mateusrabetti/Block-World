// =============================================================================
// js/physics.js - Motor de Física, Gravidade, Colisão AABB, Voo e Água
// =============================================================================

class Physics {
  constructor() {
    // Parâmetros físicos ajustados para movimentação voxel clássica
    this.gravity = 26.0;        // Força da gravidade (m/s²)
    this.maxFallSpeed = 35.0;    // Velocidade terminal de queda
    this.jumpSpeed = 8.6;        // Impulso do pulo

    // Dimensões da caixa delimitadora (AABB) do jogador
    this.width = 0.6;
    this.halfWidth = this.width / 2; // 0.3m para cada lado
    this.height = 1.8;               // 1.8m de altura total
    this.eyeHeight = 1.62;           // Altura dos olhos da câmera

    this.onGround = false;
    this.inWater = false;
  }

  /**
   * Verifica se a AABB do jogador sobrepõe algum bloco sólido na posição especificada
   */
  hasCollisionAt(pos, world) {
    const eps = 0.001;
    const minX = Math.floor(pos.x - this.halfWidth + eps);
    const maxX = Math.floor(pos.x + this.halfWidth - eps);
    const minY = Math.floor(pos.y + eps);
    const maxY = Math.floor(pos.y + this.height - eps);
    const minZ = Math.floor(pos.z - this.halfWidth + eps);
    const maxZ = Math.floor(pos.z + this.halfWidth - eps);

    // Paredes invisíveis nos limites do mundo
    if (pos.x - this.halfWidth < 0 || pos.x + this.halfWidth > world.sizeX ||
        pos.z - this.halfWidth < 0 || pos.z + this.halfWidth > world.sizeZ) {
      return true;
    }

    // Limite inferior do mundo
    if (pos.y < 0) return true;

    // Limite superior do mundo
    if (pos.y + this.height > world.sizeY + 10) return true;

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (world.isSolid(x, y, z)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Verifica se o corpo do jogador está dentro ou tocando água
   */
  checkInWater(pos, world) {
    const eps = 0.05;
    const minX = Math.floor(pos.x - this.halfWidth + eps);
    const maxX = Math.floor(pos.x + this.halfWidth - eps);
    const minY = Math.floor(pos.y + eps);
    const maxY = Math.floor(pos.y + this.height - eps);
    const minZ = Math.floor(pos.z - this.halfWidth + eps);
    const maxZ = Math.floor(pos.z + this.halfWidth - eps);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (world.isLiquid(x, y, z)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Atualização física com resolução de colisão eixo por eixo (X, Z, Y).
   * Suporta modo caminhada, modo de voo e física de nado em água.
   */
  update(pos, vel, world, dt, isFlying = false, inputJump = false) {
    // Detecta se está na água
    this.inWater = this.checkInWater(pos, world);

    // 1. Aplicação de gravidade ou dinâmica de voo / água
    if (isFlying) {
      // Voo: sem gravidade, amortecimento suave de velocidade vertical se soltar
      // A velocidade vertical é controlada diretamente pelo jogador em player.js
    } else if (this.inWater) {
      // Água: afundamento lento e nado suave
      if (inputJump) {
        vel.y = 4.0; // Nado para cima
      } else {
        vel.y = Math.max(vel.y - 8.0 * dt, -2.5); // Afundamento suave
      }
    } else {
      // Gravidade normal de caminhada
      vel.y -= this.gravity * dt;
      if (vel.y < -this.maxFallSpeed) {
        vel.y = -this.maxFallSpeed;
      }
    }

    // 2. Movimento e Resolução no Eixo X
    const oldX = pos.x;
    const dx = vel.x * dt;
    if (dx !== 0) {
      pos.x += dx;
      if (this.hasCollisionAt(pos, world)) {
        if (dx > 0) {
          pos.x = Math.floor(pos.x + this.halfWidth) - this.halfWidth - 0.0001;
        } else {
          pos.x = Math.floor(pos.x - this.halfWidth) + 1 + this.halfWidth + 0.0001;
        }
        if (this.hasCollisionAt(pos, world)) {
          pos.x = oldX;
        }
        vel.x = 0;
      }
    }

    // 3. Movimento e Resolução no Eixo Z
    const oldZ = pos.z;
    const dz = vel.z * dt;
    if (dz !== 0) {
      pos.z += dz;
      if (this.hasCollisionAt(pos, world)) {
        if (dz > 0) {
          pos.z = Math.floor(pos.z + this.halfWidth) - this.halfWidth - 0.0001;
        } else {
          pos.z = Math.floor(pos.z - this.halfWidth) + 1 + this.halfWidth + 0.0001;
        }
        if (this.hasCollisionAt(pos, world)) {
          pos.z = oldZ;
        }
        vel.z = 0;
      }
    }

    // 4. Movimento e Resolução no Eixo Y
    const oldY = pos.y;
    const dy = vel.y * dt;
    this.onGround = false;

    if (dy !== 0) {
      pos.y += dy;
      if (this.hasCollisionAt(pos, world)) {
        if (dy < 0) {
          // Aterrissou sobre um bloco sólido (anti-tunneling com snap seguro)
          pos.y = Math.ceil(pos.y);
          while (this.hasCollisionAt(pos, world) && pos.y < oldY + 1.5) {
            pos.y += 1.0;
          }
          if (this.hasCollisionAt(pos, world)) {
            pos.y = oldY;
          }
          vel.y = 0;
          this.onGround = true;
        } else {
          // Bateu a cabeça no teto
          pos.y = Math.floor(pos.y + this.height) - this.height - 0.0001;
          while (this.hasCollisionAt(pos, world) && pos.y > oldY - 1.5) {
            pos.y -= 1.0;
          }
          if (this.hasCollisionAt(pos, world)) {
            pos.y = oldY;
          }
          vel.y = 0;
        }
      }
    }

    // 5. Estabilização no chão se não estiver voando e descendo
    if (!isFlying && !this.inWater && !this.onGround && vel.y <= 0) {
      const probePos = { x: pos.x, y: pos.y - 0.05, z: pos.z };
      if (this.hasCollisionAt(probePos, world)) {
        this.onGround = true;
        vel.y = 0;
      }
    }

    // Proteção contra saída dos limites horizontais do mundo
    pos.x = Math.max(this.halfWidth + 0.01, Math.min(world.sizeX - this.halfWidth - 0.01, pos.x));
    pos.z = Math.max(this.halfWidth + 0.01, Math.min(world.sizeZ - this.halfWidth - 0.01, pos.z));

    if (pos.y < 1.0) {
      pos.y = 1.0;
      vel.y = 0;
      this.onGround = true;
    }
  }

  /**
   * Impede colocação de bloco dentro do corpo do jogador
   */
  overlapsPlayer(bx, by, bz, playerPos) {
    const pMinX = playerPos.x - this.halfWidth;
    const pMaxX = playerPos.x + this.halfWidth;
    const pMinY = playerPos.y;
    const pMaxY = playerPos.y + this.height;
    const pMinZ = playerPos.z - this.halfWidth;
    const pMaxZ = playerPos.z + this.halfWidth;

    const bMinX = bx;
    const bMaxX = bx + 1.0;
    const bMinY = by;
    const bMaxY = by + 1.0;
    const bMinZ = bz;
    const bMaxZ = bz + 1.0;

    return (
      pMaxX > bMinX && pMinX < bMaxX &&
      pMaxY > bMinY && pMinY < bMaxY &&
      pMaxZ > bMinZ && pMinZ < bMaxZ
    );
  }
}
