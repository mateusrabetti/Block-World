// =============================================================================
// js/particles.js - Sistema de Partículas e Efeitos Visuais Escaláveis por Preset
// =============================================================================

class ParticleManager {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;

    // Partículas ativas
    this.particles = [];
    this.maxParticles = 120;

    // Partículas ambientais (Ativas apenas no modo Alto)
    this.ambientGroup = null;
    this.ambientParticles = [];

    // Densidade de partículas conforme o preset ativo (low, medium, high)
    this.preset = game.graphicsPreset || 'medium';

    this.initParticleMeshes();
  }

  initParticleMeshes() {
    if (!this.scene) return;

    // Grupo para partículas dinâmicas (quebra de bloco e acertos de combate)
    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);

    // Geometria compartilhada para pequenos cubos de debris
    this.debrisGeom = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    this.sparkGeom = new THREE.BoxGeometry(0.08, 0.08, 0.08);

    // Cores representativas para partículas de quebra de bloco
    this.blockColors = {
      1: 0x5b8c32,  // Grama
      2: 0x866043,  // Terra
      3: 0x7a7a7a,  // Pedra
      4: 0x6e5138,  // Tronco de Madeira
      5: 0x3d7020,  // Folhas
      6: 0xd6c585,  // Areia
      7: 0x9c7a4f,  // Tábuas
      8: 0x383838,  // Carvão Minério
      9: 0xd4f1f9,  // Vidro
      10: 0xb59b82, // Ferro Minério
      14: 0x505050, // Fornalha
      15: 0x8c6747  // Porta
    };

    this.applyPreset(this.preset);
  }

  applyPreset(preset) {
    this.preset = preset;

    // Gerencia partículas ambientais (Ativas no Alto e Ultra)
    if (preset === 'ultra' || preset === 'high') {
      this.initAmbientParticles(preset === 'ultra');
    } else {
      this.removeAmbientParticles();
    }
  }

  // Desativa partículas cúbicas espalhadas pelo céu
  initAmbientParticles(isUltra = false) {
    this.removeAmbientParticles();
  }

  removeAmbientParticles() {
    if (this.ambientGroup && this.scene) {
      this.scene.remove(this.ambientGroup);
      this.ambientGroup = null;
      this.ambientParticles = [];
    }
  }

  // Gera partículas ao quebrar um bloco (escala com Baixo/Médio/Alto/Ultra)
  spawnBlockBreakParticles(x, y, z, blockType) {
    if (this.preset === 'low') {
      // Baixo: apenas 3 partículas simples
      this.createDebrisBurst(x + 0.5, y + 0.5, z + 0.5, blockType, 3);
    } else if (this.preset === 'ultra') {
      // Ultra: 18 partículas completas
      this.createDebrisBurst(x + 0.5, y + 0.5, z + 0.5, blockType, 18);
    } else if (this.preset === 'high') {
      // Alto: 14 partículas completas com velocidade
      this.createDebrisBurst(x + 0.5, y + 0.5, z + 0.5, blockType, 14);
    } else {
      // Médio: 7 partículas moderadas
      this.createDebrisBurst(x + 0.5, y + 0.5, z + 0.5, blockType, 7);
    }
  }

  createDebrisBurst(px, py, pz, blockType, count) {
    if (!this.particleGroup) return;

    const color = this.blockColors[blockType] || 0x888888;
    const mat = new THREE.MeshLambertMaterial({ color: color });

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.recycleOldestParticle();
      }

      const mesh = new THREE.Mesh(this.debrisGeom, mat);
      mesh.position.set(
        px + (Math.random() - 0.5) * 0.5,
        py + (Math.random() - 0.5) * 0.5,
        pz + (Math.random() - 0.5) * 0.5
      );

      const vx = (Math.random() - 0.5) * 4.5;
      const vy = Math.random() * 4.0 + 1.2;
      const vz = (Math.random() - 0.5) * 4.5;

      this.particleGroup.add(mesh);
      this.particles.push({
        mesh: mesh,
        vx: vx,
        vy: vy,
        vz: vz,
        life: 0.55 + Math.random() * 0.2,
        maxLife: 0.75,
        gravity: 16.0
      });
    }
  }

  // Gera partículas de faíscas ao atingir mob ou jogador (Crítico / Knockback)
  spawnHitSparks(pos, countOverride = null) {
    if (!this.particleGroup || !pos) return;

    let count = (this.preset === 'low') ? 3 : (this.preset === 'ultra' ? 16 : (this.preset === 'high' ? 12 : 6));
    if (countOverride !== null) count = countOverride;

    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffd700 }); // Dourado crítico

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.recycleOldestParticle();
      }

      const mesh = new THREE.Mesh(this.sparkGeom, sparkMat);
      mesh.position.set(
        pos.x + (Math.random() - 0.5) * 0.4,
        pos.y + (Math.random() - 0.5) * 0.4 + 0.5,
        pos.z + (Math.random() - 0.5) * 0.4
      );

      const vx = (Math.random() - 0.5) * 6.0;
      const vy = Math.random() * 4.5 + 1.0;
      const vz = (Math.random() - 0.5) * 6.0;

      this.particleGroup.add(mesh);
      this.particles.push({
        mesh: mesh,
        vx: vx,
        vy: vy,
        vz: vz,
        life: 0.38 + Math.random() * 0.15,
        maxLife: 0.50,
        gravity: 12.0
      });
    }
  }

  recycleOldestParticle() {
    if (this.particles.length === 0) return;
    const old = this.particles.shift();
    if (old && old.mesh && this.particleGroup) {
      this.particleGroup.remove(old.mesh);
    }
  }

  // Atualização por quadro
  update(dt) {
    // 1. Atualiza partículas ativas de blocos e combate
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        if (this.particleGroup && p.mesh) {
          this.particleGroup.remove(p.mesh);
        }
        this.particles.splice(i, 1);
        continue;
      }

      p.vy -= p.gravity * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;

      // Escala decrescente ao morrer
      const scale = Math.max(0.1, p.life / p.maxLife);
      p.mesh.scale.set(scale, scale, scale);
    }

    // 2. Atualiza partículas ambientais flutuantes (se ativo no modo Alto ou Ultra)
    if (this.ambientGroup && this.ambientParticles.length > 0 && this.game.player) {
      const playerPos = this.game.player.position;
      const time = performance.now() * 0.001;

      // No modo Ultra, adapta dinamicamente para poeira solar dourada de dia e vaga-lumes ciano-esmeralda à noite
      if (this.preset === 'ultra' && this.ambientMat && this.game.worldTime) {
        if (this.game.worldTime.isDay) {
          this.ambientMat.color.setHex(0xffe277);
          this.ambientMat.opacity = 0.75 + Math.sin(time * 2.0) * 0.15;
        } else {
          this.ambientMat.color.setHex(0x5eead4);
          this.ambientMat.opacity = 0.65 + Math.sin(time * 3.0) * 0.25;
        }
      }

      for (const ap of this.ambientParticles) {
        ap.phase += dt * 1.5;
        const targetX = playerPos.x + ap.offsetX + Math.sin(time + ap.phase) * 1.2;
        const targetY = playerPos.y + ap.offsetY + Math.cos(time * 0.8 + ap.phase) * 0.6;
        const targetZ = playerPos.z + ap.offsetZ + Math.sin(time * 0.6 + ap.phase) * 1.2;

        ap.mesh.position.set(targetX, targetY, targetZ);
      }
    }
  }
}

if (typeof window !== 'undefined') {
  window.ParticleManager = ParticleManager;
}
