// =============================================================================
// js/health.js - Sistema de Vida (20 HP, 10 Corações), Dano de Queda e Morte
// =============================================================================

class HealthSystem {
  constructor(game) {
    this.game = game;

    this.maxHealth = 20;
    this.health = 20;
    this.isDead = false;

    // Rastreamento para dano de queda
    this.peakFallY = 0;
    this.wasInAir = false;

    // Elementos da UI de corações e tela de morte
    this.initDOM();
  }

  initDOM() {
    this.heartsContainer = document.getElementById('hud-hearts');
    this.damageOverlay = document.getElementById('damage-overlay');
    this.deathScreen = document.getElementById('screen-death');

    // Botões da tela de morte
    document.getElementById('btn-death-respawn')?.addEventListener('click', () => {
      this.respawn();
    });

    document.getElementById('btn-death-menu')?.addEventListener('click', () => {
      this.exitToMenuFromDeath();
    });
  }

  // Define vida inicial ou restaurada do save
  setHealth(hp) {
    this.health = Math.max(0, Math.min(this.maxHealth, (hp !== undefined ? hp : 20)));
    this.isDead = this.health <= 0;
    this.updateHeartsUI();
  }

  // Função central de dano
  takeDamage(amount, source = 'generic') {
    // Modo Criativo nunca recebe dano nem morre
    if (this.game.gameMode === 'creative') return;
    if (this.isDead || amount <= 0) return;

    this.health = Math.max(0, this.health - amount);
    this.updateHeartsUI();

    // Efeito visual de dano (flash vermelho)
    this.triggerDamageFlash();

    // Efeito sonoro de dano
    this.playHurtSound();

    // Verifica se morreu
    if (this.health <= 0) {
      this.die(source);
    }
  }

  // Cura vida (para mecânicas futuras)
  heal(amount) {
    if (this.isDead || amount <= 0) return;
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.updateHeartsUI();
  }

  // Atualização física e monitoramento de queda por quadro
  update(dt) {
    if (this.game.gameMode === 'creative' || this.isDead) {
      this.wasInAir = false;
      return;
    }

    const player = this.game.player;
    if (!player) return;

    const posY = player.position.y;
    const onGround = player.physics.onGround;
    const inWater = player.physics.inWater;
    const isFlying = player.isFlying;

    // Se estiver na água ou voando, amortece e anula queda
    if (inWater || isFlying) {
      this.wasInAir = false;
      this.peakFallY = posY;
      return;
    }

    if (!onGround) {
      // Jogador está no ar
      if (!this.wasInAir) {
        this.wasInAir = true;
        this.peakFallY = posY;
      } else {
        // Acompanha a maior altura atingida antes de descer
        if (posY > this.peakFallY) {
          this.peakFallY = posY;
        }
      }
    } else {
      // Jogador acabou de aterrissar no chão
      if (this.wasInAir) {
        const fallDistance = this.peakFallY - posY;

        // Dano de queda se cair mais de 3.5 blocos de altura
        if (fallDistance > 3.5) {
          const damage = Math.floor(fallDistance - 3.0);
          if (damage > 0) {
            this.takeDamage(damage, 'fall');
          }
        }

        this.wasInAir = false;
        this.peakFallY = posY;
      } else {
        this.peakFallY = posY;
      }
    }
  }

  // Tela de morte
  die(source = 'generic') {
    this.isDead = true;

    // Para qualquer movimento
    if (this.game.player) {
      this.game.player.velocity.x = 0;
      this.game.player.velocity.y = 0;
      this.game.player.velocity.z = 0;
    }

    // Interrompe mineração
    if (this.game.mining) {
      this.game.mining.stopMining();
    }

    // Altera estado do jogo e libera mouse
    this.game.state = 'DEAD';
    this.game.input.exitPointerLock();

    // Mensagem de causa da morte
    const reasonEl = document.getElementById('death-reason');
    if (reasonEl) {
      if (source === 'fall') {
        reasonEl.textContent = 'Você caiu de um lugar muito alto!';
      } else {
        reasonEl.textContent = 'Sua jornada terminou aqui.';
      }
    }

    // Mostra tela de morte
    if (this.deathScreen) {
      this.deathScreen.classList.remove('hidden');
    }
  }

  // Renascer (Respawn)
  respawn() {
    this.health = this.maxHealth;
    this.isDead = false;

    if (this.deathScreen) {
      this.deathScreen.classList.add('hidden');
    }

    // Teleporta o jogador para posição segura do terreno
    if (this.game.player) {
      this.game.player.findSpawnPosition();
    }

    this.updateHeartsUI();

    // Re-entra no jogo ativo
    this.game.enterGame();
  }

  // Sair para o menu a partir da morte
  exitToMenuFromDeath() {
    if (this.deathScreen) {
      this.deathScreen.classList.add('hidden');
    }
    this.health = this.maxHealth;
    this.isDead = false;

    // Salva o mundo com vida cheia e sai
    this.game.worldManager.exitWorldToMenu();
  }

  // Atualização gráfica dos 10 corações
  updateHeartsUI() {
    if (!this.heartsContainer) return;

    // No modo Criativo, oculta os corações da tela
    if (this.game.gameMode === 'creative') {
      this.heartsContainer.style.display = 'none';
      return;
    }

    this.heartsContainer.style.display = 'flex';
    this.heartsContainer.innerHTML = '';

    const totalHearts = 10;
    const currentHP = this.health;

    for (let i = 0; i < totalHearts; i++) {
      const heartValue = (i + 1) * 2;
      const heartEl = document.createElement('div');
      heartEl.className = 'hud-heart';

      if (currentHP >= heartValue) {
        // Coração Cheio (2 HP)
        heartEl.innerHTML = `
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#ef4444" stroke="#991b1b" stroke-width="1.5">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>`;
      } else if (currentHP === heartValue - 1) {
        // Meio Coração (1 HP)
        heartEl.innerHTML = `
          <svg viewBox="0 0 24 24" width="20" height="20">
            <defs>
              <linearGradient id="halfHeartGrad_${i}" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="50%" stop-color="#ef4444" />
                <stop offset="50%" stop-color="#1e293b" />
              </linearGradient>
            </defs>
            <path fill="url(#halfHeartGrad_${i})" stroke="#991b1b" stroke-width="1.5" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>`;
      } else {
        // Coração Vazio (0 HP)
        heartEl.innerHTML = `
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#1e293b" stroke="#475569" stroke-width="1.5">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>`;
      }

      this.heartsContainer.appendChild(heartEl);
    }
  }

  // Flash vermelho de dano na tela
  triggerDamageFlash() {
    if (!this.damageOverlay) return;
    this.damageOverlay.classList.remove('damage-flash');
    // Força reflow para reiniciar animação
    void this.damageOverlay.offsetWidth;
    this.damageOverlay.classList.add('damage-flash');
  }

  // Som de dano procedural (Web Audio API)
  playHurtSound() {
    if (!this.game.player || !this.game.player.audioCtx) return;
    try {
      const ctx = this.game.player.audioCtx;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {}
  }
}
