// =============================================================================
// js/time.js - Sistema Central de Tempo do Mundo, Ciclo Dia/Noite, Sol, Lua e Estrelas
// =============================================================================

class WorldTime {
  constructor(game) {
    this.game = game;

    // Ciclo de 30 minutos no total (1800 segundos):
    // 15 minutos (900s) de DIA + 15 minutos (900s) de NOITE
    this.cycleDuration = 1800.0;
    this.dayDuration = 900.0;

    // Tempo atual em segundos [0 a 1800)
    // Começa às 180s (início da manhã clara)
    this.timeOfDay = 180.0;
    this.currentDay = 1;

    // Multiplicador de velocidade de tempo (1.0 = normal, ajustável para testes)
    this.timeSpeed = 1.0;

    // Referências de iluminação da cena
    this.sunLight = null;
    this.ambientLight = null;
    this.hemiLight = null;

    // Objetos celestes 3D
    this.celestialGroup = new THREE.Group();
    this.sunMesh = null;
    this.moonMesh = null;
    this.starPoints = null;

    this.initCelestialObjects();
  }

  // Inicializa o Sol, a Lua e o Campo de Estrelas na cena Three.js
  initCelestialObjects() {
    if (!this.game.scene) return;

    // Procura luzes existentes na cena ou cria novas
    this.game.scene.traverse((obj) => {
      if (obj.isDirectionalLight) this.sunLight = obj;
      else if (obj.isAmbientLight) this.ambientLight = obj;
      else if (obj.isHemisphereLight) this.hemiLight = obj;
    });

    if (!this.sunLight) {
      this.sunLight = new THREE.DirectionalLight(0xfff7e6, 0.9);
      this.game.scene.add(this.sunLight);
    }
    if (!this.ambientLight) {
      this.ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
      this.game.scene.add(this.ambientLight);
    }

    // 1. Sol (Cubo brilhante dourado/amarelado estilizado voxel)
    const sunGeom = new THREE.BoxGeometry(10, 10, 10);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff4b8 });
    this.sunMesh = new THREE.Mesh(sunGeom, sunMat);
    this.celestialGroup.add(this.sunMesh);

    // 2. Lua (Cubo brilhante prateado/azulado estilizado voxel)
    const moonGeom = new THREE.BoxGeometry(8, 8, 8);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xe6f0fa });
    this.moonMesh = new THREE.Mesh(moonGeom, moonMat);
    this.celestialGroup.add(this.moonMesh);

    // 3. Estrelas cintilantes visíveis à noite (450 pontos na abóbada celeste)
    const starGeom = new THREE.BufferGeometry();
    const starPositions = [];
    const starCount = 450;
    const starRadius = 135;

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      // Mantém a maior parte das estrelas acima do horizonte
      if (Math.sin(phi) > -0.1) {
        starPositions.push(
          starRadius * Math.sin(phi) * Math.cos(theta),
          starRadius * Math.cos(phi),
          starRadius * Math.sin(phi) * Math.sin(theta)
        );
      }
    }

    starGeom.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    this.starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.6,
      transparent: true,
      opacity: 0.0
    });
    this.starPoints = new THREE.Points(starGeom, this.starMaterial);
    this.celestialGroup.add(this.starPoints);

    this.game.scene.add(this.celestialGroup);
  }

  // Verifica se está de dia (0s a 900s)
  get isDay() {
    return this.timeOfDay < this.dayDuration;
  }

  // Retorna a fase do dia formatada em texto
  get phaseName() {
    const t = this.timeOfDay;
    if (t < 120) return 'Amanhecer';
    if (t < 780) return 'Dia';
    if (t < 900) return 'Entardecer';
    if (t < 1050) return 'Anoitecer';
    if (t < 1650) return 'Noite';
    return 'Madrugada';
  }

  // Atualização por quadro no loop do jogo
  update(dt) {
    if (this.game.state !== 'PLAYING') return;

    // Avança o tempo
    this.timeOfDay += dt * this.timeSpeed;

    // Quando atinge 1800s (30 minutos), completa o ciclo e incrementa o dia
    if (this.timeOfDay >= this.cycleDuration) {
      this.timeOfDay -= this.cycleDuration;
      this.currentDay += 1;
      if (this.game.ui) {
        this.game.ui.showToast(`🌅 Início do Dia ${this.currentDay}!`);
      }
    }

    this.updateLightingAndSky();
  }

  // Atualiza cores do céu, névoa, luzes solares, posição da lua e estrelas
  updateLightingAndSky() {
    if (!this.game.scene) return;

    const t = this.timeOfDay;
    const progress = t / this.cycleDuration; // 0.0 a 1.0

    // Ângulo de rotação orbital solar (0 a 2*PI)
    const angle = progress * Math.PI * 2;

    // Posição centralizada no jogador para que o céu acompanhe o mundo
    const px = this.game.player ? this.game.player.position.x : 96;
    const pz = this.game.player ? this.game.player.position.z : 96;
    const py = this.game.player ? this.game.player.position.y : 24;

    this.celestialGroup.position.set(px, py, pz);

    // Órbita circular do Sol e da Lua em torno do zênite
    const orbitRadius = 120;
    const sunX = Math.cos(angle) * orbitRadius;
    const sunY = Math.sin(angle) * orbitRadius;
    const sunZ = Math.sin(angle * 0.5) * 30; // inclinação suave

    if (this.sunMesh) {
      this.sunMesh.position.set(sunX, sunY, sunZ);
      this.sunMesh.visible = sunY > -10;
    }

    if (this.moonMesh) {
      // Lua diametralmente oposta ao sol
      this.moonMesh.position.set(-sunX, -sunY, -sunZ);
      this.moonMesh.visible = -sunY > -10;
    }

    // Interpolação suave de cores e intensidades
    let skyColor = new THREE.Color(0x7db4f5);
    let sunLightColor = new THREE.Color(0xfff7e6);
    let ambientColor = new THREE.Color(0xffffff);
    let sunIntensity = 0.9;
    let ambientIntensity = 0.35;
    let starOpacity = 0.0;

    // Definição das 4 fases principais de transição suave
    // 0..120: Amanhecer (Madrugada -> Dia)
    // 120..780: Pleno Dia
    // 780..900: Entardecer (Dia -> Noite)
    // 900..1050: Crepúsculo noturno
    // 1050..1650: Plena Noite
    // 1650..1800: Alvorada matinal
    if (t >= 120 && t < 780) {
      // PLENO DIA
      skyColor.setHex(0x7db4f5);
      sunLightColor.setHex(0xfff7e6);
      ambientColor.setHex(0xffffff);
      sunIntensity = 0.95;
      ambientIntensity = 0.38;
      starOpacity = 0.0;
    } else if (t >= 780 && t < 900) {
      // ENTARDECER (Pôr do Sol)
      const factor = (t - 780) / 120; // 0.0 a 1.0
      skyColor.lerpColors(new THREE.Color(0x7db4f5), new THREE.Color(0xd9652a), factor);
      sunLightColor.lerpColors(new THREE.Color(0xfff7e6), new THREE.Color(0xff7733), factor);
      ambientColor.lerpColors(new THREE.Color(0xffffff), new THREE.Color(0xd9956a), factor);
      sunIntensity = THREE.MathUtils.lerp(0.95, 0.45, factor);
      ambientIntensity = THREE.MathUtils.lerp(0.38, 0.22, factor);
      starOpacity = factor * 0.5;
    } else if (t >= 900 && t < 1050) {
      // CREPÚSCULO (Anoitecer)
      const factor = (t - 900) / 150;
      skyColor.lerpColors(new THREE.Color(0xd9652a), new THREE.Color(0x0c1222), factor);
      sunLightColor.lerpColors(new THREE.Color(0xff7733), new THREE.Color(0x384c7a), factor);
      ambientColor.lerpColors(new THREE.Color(0xd9956a), new THREE.Color(0x22304d), factor);
      sunIntensity = THREE.MathUtils.lerp(0.45, 0.22, factor);
      ambientIntensity = THREE.MathUtils.lerp(0.22, 0.14, factor);
      starOpacity = THREE.MathUtils.lerp(0.5, 0.95, factor);
    } else if (t >= 1050 && t < 1650) {
      // PLENA NOITE
      skyColor.setHex(0x0a0f1d);
      sunLightColor.setHex(0x425d99); // Luz prateada-azulada da lua
      ambientColor.setHex(0x1e2a42);
      sunIntensity = 0.22;
      ambientIntensity = 0.13;
      starOpacity = 0.95;
    } else if (t >= 1650 && t < 1800) {
      // MADRUGADA / ALVORADA
      const factor = (t - 1650) / 150;
      skyColor.lerpColors(new THREE.Color(0x0a0f1d), new THREE.Color(0xcc6033), factor);
      sunLightColor.lerpColors(new THREE.Color(0x425d99), new THREE.Color(0xff8844), factor);
      ambientColor.lerpColors(new THREE.Color(0x1e2a42), new THREE.Color(0xb37050), factor);
      sunIntensity = THREE.MathUtils.lerp(0.22, 0.5, factor);
      ambientIntensity = THREE.MathUtils.lerp(0.13, 0.24, factor);
      starOpacity = THREE.MathUtils.lerp(0.95, 0.4, factor);
    } else {
      // 0..120: AMANHECER (Alvorada -> Pleno Dia)
      const factor = t / 120;
      skyColor.lerpColors(new THREE.Color(0xcc6033), new THREE.Color(0x7db4f5), factor);
      sunLightColor.lerpColors(new THREE.Color(0xff8844), new THREE.Color(0xfff7e6), factor);
      ambientColor.lerpColors(new THREE.Color(0xb37050), new THREE.Color(0xffffff), factor);
      sunIntensity = THREE.MathUtils.lerp(0.5, 0.95, factor);
      ambientIntensity = THREE.MathUtils.lerp(0.24, 0.38, factor);
      starOpacity = THREE.MathUtils.lerp(0.4, 0.0, factor);
    }

    // Aplica na cena do Three.js
    this.game.scene.background = skyColor;
    if (this.game.scene.fog) {
      this.game.scene.fog.color = skyColor;
    }

    // Luz Direcional (Sol / Lua)
    if (this.sunLight) {
      if (sunY >= 0) {
        // Sol está acima do horizonte
        this.sunLight.position.set(px + sunX, py + sunY, pz + sunZ);
      } else {
        // Lua está acima do horizonte iluminando o mundo à noite
        this.sunLight.position.set(px - sunX, py - sunY, pz - sunZ);
      }
      this.sunLight.color = sunLightColor;
      this.sunLight.intensity = sunIntensity;
    }

    // Luz Ambiente
    if (this.ambientLight) {
      this.ambientLight.color = ambientColor;
      this.ambientLight.intensity = ambientIntensity;
    }

    // Estrelas
    if (this.starMaterial) {
      this.starMaterial.opacity = starOpacity;
    }
  }

  // Atalho de teste para alternar rapidamente entre dia e noite (Requisito 71)
  toggleDayNight() {
    if (this.isDay) {
      this.timeOfDay = 1100.0; // Pula para a noite
      if (this.game.ui) this.game.ui.showToast('🌙 Modo Noite ativado (Debug)');
    } else {
      this.timeOfDay = 200.0; // Pula para o dia
      if (this.game.ui) this.game.ui.showToast('☀️ Modo Dia ativado (Debug)');
    }
    this.updateLightingAndSky();
  }

  // Avança o tempo em X segundos
  fastForward(seconds) {
    this.timeOfDay = (this.timeOfDay + seconds) % this.cycleDuration;
    this.updateLightingAndSky();
  }

  // Define tempo e dia específicos
  setTime(time, day = 1) {
    this.timeOfDay = (typeof time === 'number') ? (time % this.cycleDuration) : 180.0;
    this.currentDay = Math.max(1, day | 0);
    this.updateLightingAndSky();
  }

  // Serialização para salvamento no saveSystem
  serialize() {
    return {
      timeOfDay: this.timeOfDay,
      currentDay: this.currentDay
    };
  }

  // Desserialização
  deserialize(data) {
    if (!data) return;
    if (data.timeOfDay !== undefined) this.timeOfDay = Number(data.timeOfDay) % this.cycleDuration;
    if (data.currentDay !== undefined) this.currentDay = Math.max(1, Number(data.currentDay) | 0);
    this.updateLightingAndSky();
  }
}

window.WorldTime = WorldTime;
