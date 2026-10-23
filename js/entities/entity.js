// =============================================================================
// js/entities/entity.js - Classe Base Abstrata para Entidades Voxel Vivas
// =============================================================================

class Entity {
  constructor(x, y, z, game) {
    this.game = game;
    this.scene = game.scene;

    this.position = new THREE.Vector3(x, y, z);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.yaw = Math.random() * Math.PI * 2;

    this.maxHealth = 10;
    this.health = 10;
    this.isDead = false;

    // Dimensões AABB
    this.width = 0.6;
    this.height = 1.0;
    this.halfWidth = this.width / 2;

    this.onGround = false;
    this.hurtTimer = 0; // Timer para efeito visual de piscar em vermelho ao receber dano
    this.isFlashingRed = false;
    this.knockbackTimer = 0; // Impede a IA do mob de anular o impulso do golpe

    // Grupo Three.js da entidade
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  // Memoriza cores originais de cada material de forma independente
  cacheOriginalColors() {
    if (!this.mesh) return;
    this.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of mats) {
          if (!mat || !mat.color) continue;
          if (mat._originalColor === undefined) {
            mat._originalColor = mat.color.getHex();
          }
        }
      }
    });
  }

  // Recebe dano de qualquer fonte com knockback clássico inspirado no Minecraft
  takeDamage(amount, source = 'generic', attackerPos = null) {
    // Evita dano duplo/repetido no mesmo golpe (i-frames para entidades)
    if (this.isDead || amount <= 0 || this.hurtTimer > 0.08) return;

    this.health = Math.max(0, this.health - amount);
    this.hurtTimer = 0.22; // Pisca vermelho por 220ms
    this.setFlashRed(true);

    // Feedback sonoro de acerto
    this.playHitSound();

    // Aplica knockback direcionado empurrando a entidade para longe do atacante
    const attacker = attackerPos || (this.game && this.game.player ? this.game.player.position : null);
    if (attacker) {
      const dx = this.position.x - attacker.x;
      const dz = this.position.z - attacker.z;
      const len = Math.hypot(dx, dz) || 1;

      // Força de knockback estilo Minecraft (~7.5 horizontal + leve elevação vertical)
      const kbHoriz = 7.5;
      const kbVert = 4.2;

      // Limita velocidades para evitar acumulação infinita ou atravessar blocos
      this.velocity.x = Math.max(-14, Math.min(14, (dx / len) * kbHoriz));
      this.velocity.z = Math.max(-14, Math.min(14, (dz / len) * kbHoriz));
      this.velocity.y = Math.min(Math.max(this.velocity.y, 0) + kbVert, 7.5);
      this.onGround = false;
      this.knockbackTimer = 0.35; // 350ms onde a IA do mob não anula o impulso
    }

    if (this.health <= 0) {
      this.die();
    }
  }

  // Pisca em vermelho ao sofrer dano e restaura cor original pontualmente
  updateHurtEffect(dt) {
    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
      if (this.hurtTimer <= 0) {
        this.hurtTimer = 0;
        this.setFlashRed(false);
      }
    }
  }

  setFlashRed(isRed) {
    if (this.isFlashingRed === isRed) return;
    this.isFlashingRed = isRed;

    if (!this.mesh) return;
    this.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of mats) {
          if (!mat || !mat.color) continue;
          if (isRed) {
            if (mat._originalColor === undefined) {
              const hex = mat.color.getHex();
              if (hex !== 0xff3333) {
                mat._originalColor = hex;
              }
            }
            mat.color.setHex(0xff3333);
          } else if (mat._originalColor !== undefined) {
            mat.color.setHex(mat._originalColor);
          }
        }
      }
    });
  }

  playHitSound() {
    if (!this.game.player || !this.game.player.audioCtx) return;
    try {
      const ctx = this.game.player.audioCtx;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  }

  // Morte da entidade
  die() {
    this.isDead = true;
    this.setFlashRed(false);
    this.dropItems();
    this.dispose();
  }

  // Sobrescrito nas subclasses (drop de carne no porco, etc.)
  dropItems() {}

  // Física de colisão simples com o terreno voxel
  updatePhysics(dt) {
    const world = this.game.world;
    if (!world) return;

    // Gravidade
    this.velocity.y -= 22.0 * dt;
    if (this.velocity.y < -30.0) this.velocity.y = -30.0;

    // Movimento Eixo X
    this.position.x += this.velocity.x * dt;
    if (this.checkCollision(this.position.x, this.position.y, this.position.z, world)) {
      this.position.x -= this.velocity.x * dt;
      this.velocity.x = 0;
    }

    // Movimento Eixo Z
    this.position.z += this.velocity.z * dt;
    if (this.checkCollision(this.position.x, this.position.y, this.position.z, world)) {
      this.position.z -= this.velocity.z * dt;
      this.velocity.z = 0;
    }

    // Movimento Eixo Y
    this.onGround = false;
    this.position.y += this.velocity.y * dt;
    if (this.checkCollision(this.position.x, this.position.y, this.position.z, world)) {
      if (this.velocity.y < 0) {
        this.position.y = Math.ceil(this.position.y);
        while (this.checkCollision(this.position.x, this.position.y, this.position.z, world)) {
          this.position.y += 0.5;
        }
        this.onGround = true;
      }
      this.velocity.y = 0;
    }

    // Amortecimento horizontal
    this.velocity.x *= Math.pow(0.1, dt);
    this.velocity.z *= Math.pow(0.1, dt);
  }

  checkCollision(px, py, pz, world) {
    const minX = Math.floor(px - this.halfWidth);
    const maxX = Math.floor(px + this.halfWidth);
    const minY = Math.floor(py);
    const maxY = Math.floor(py + this.height);
    const minZ = Math.floor(pz - this.halfWidth);
    const maxZ = Math.floor(pz + this.halfWidth);

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

  update(dt) {
    this.updateHurtEffect(dt);
  }

  dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.traverse((c) => {
        if (c.geometry) c.geometry.dispose();
      });
      this.mesh = null;
    }
  }
}

window.Entity = Entity;
