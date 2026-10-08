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

    // Grupo Three.js da entidade
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  // Recebe dano de qualquer fonte
  takeDamage(amount, source = 'generic') {
    if (this.isDead || amount <= 0) return;

    this.health = Math.max(0, this.health - amount);
    this.hurtTimer = 0.18; // Pisca vermelho por 180ms

    // Feedback sonoro de acerto
    this.playHitSound();

    // Aplica knockback suave empurrando a entidade para trás
    if (this.game.player) {
      const dx = this.position.x - this.game.player.position.x;
      const dz = this.position.z - this.game.player.position.z;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      this.velocity.x += (dx / len) * 3.5;
      this.velocity.z += (dz / len) * 3.5;
      this.velocity.y += 2.0;
    }

    if (this.health <= 0) {
      this.die();
    }
  }

  // Pisca em vermelho ao sofrer dano
  updateHurtEffect(dt) {
    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
      const isRed = this.hurtTimer > 0;
      this.setFlashRed(isRed);
    }
  }

  setFlashRed(isRed) {
    this.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        if (isRed) {
          if (!child._origColor) child._origColor = child.material.color.getHex();
          child.material.color.setHex(0xff3333);
        } else if (child._origColor !== undefined) {
          child.material.color.setHex(child._origColor);
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
