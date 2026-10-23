// =============================================================================
// js/time.js - Sistema Central de Tempo do Mundo, Ciclo Dia/Noite, Sol, Lua e Estrelas
// =============================================================================

function generateCloudTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  if (!canvas || !canvas.getContext) return null;
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx || !ctx.createImageData) return null;

  ctx.clearRect(0, 0, 512, 512);
  const imgData = ctx.createImageData(512, 512);
  const data = imgData.data;

  // Ruído fractal perfeitamente periódico (toroidal) em 512x512 para nuvens cumulus volumétricas sem nenhuma costura
  for (let x = 0; x < 512; x++) {
    for (let y = 0; y < 512; y++) {
      const idx = (x + y * 512) * 4;
      const nx = (x / 512) * Math.PI * 2;
      const ny = (y / 512) * Math.PI * 2;

      // Oitavas com harmônicos inteiros estritos (garantia matemática de continuidade e periodicidade em x e y)
      let n = Math.sin(nx * 1) * Math.cos(ny * 1) * 0.38;
      n += (Math.sin(nx * 2 + 0.8) * Math.cos(ny * 2 + 1.2) + Math.cos(nx * 3 - ny * 2)) * 0.26;
      n += (Math.sin(nx * 4 + 1.6) * Math.cos(ny * 4 + 0.5) + Math.sin(nx * 6 - ny * 4)) * 0.16;
      n += (Math.sin(nx * 8 + 2.1) * Math.cos(ny * 8 + 1.4)) * 0.08;
      n += (Math.sin(nx * 16) * Math.cos(ny * 16)) * 0.04;

      // Forma billow suave: eleva os topos e suaviza as bases dos aglomerados cumulus
      const billow = Math.abs(n);
      const density = THREE.MathUtils.smoothstep(billow, 0.14, 0.65);

      if (density <= 0.005) {
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = 0;
        continue;
      }

      // Shading volumétrico da nuvem:
      // Cristas superiores e núcleo denso: branco radiante com calor suave
      // Base e sombras internas: suave cinza-lavanda / ardósia suave
      const lightFactor = THREE.MathUtils.smoothstep(density, 0.20, 0.95);
      const r = Math.floor(THREE.MathUtils.lerp(185, 255, lightFactor));
      const g = Math.floor(THREE.MathUtils.lerp(195, 255, lightFactor));
      const b = Math.floor(THREE.MathUtils.lerp(215, 255, lightFactor));
      const a = Math.floor(density * 240);

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = a;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.0, 2.0);
  return texture;
}

// Textura da Lua estilizada do Minecraft com crateras pixeladas (Imagem 2)
function generateMoonTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  if (!canvas || !canvas.getContext) return null;
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Base azul-clara lunar brilhante
  ctx.fillStyle = '#e2f4ff';
  ctx.fillRect(0, 0, 64, 64);

  // Borda brilhante interna suave
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(2, 2, 60, 60);

  // Crateras e mares lunares pixelados característicos do estilo Minecraft (Imagem 2)
  const darkCraters = [
    [8, 12, 16, 12],
    [12, 8, 8, 20],
    [32, 16, 16, 16],
    [40, 12, 12, 24],
    [16, 36, 16, 16],
    [12, 40, 24, 8],
    [36, 40, 16, 12],
    [44, 36, 12, 16]
  ];

  ctx.fillStyle = '#78a2c0';
  for (const [cx, cy, cw, ch] of darkCraters) {
    ctx.fillRect(cx, cy, cw, ch);
  }

  // Bolsões profundos mais escuros das crateras
  const deepPockets = [
    [12, 16, 8, 6],
    [36, 20, 8, 8],
    [20, 40, 8, 6],
    [40, 42, 8, 6]
  ];
  ctx.fillStyle = '#476e8a';
  for (const [dx, dy, dw, dh] of deepPockets) {
    ctx.fillRect(dx, dy, dw, dh);
  }

  // Realces cintilantes de borda de cratera
  ctx.fillStyle = '#f0f9ff';
  ctx.fillRect(10, 10, 6, 2);
  ctx.fillRect(34, 14, 6, 2);
  ctx.fillRect(14, 34, 6, 2);
  ctx.fillRect(38, 38, 6, 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

// Textura do Sol estilizada do Minecraft com anéis quentes e borda dourada
function generateSunTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  if (!canvas || !canvas.getContext) return null;
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Moldura externa âmbar/dourada quente característica do Minecraft
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 0, 64, 64);

  // 2. Halo interno dourado radiante
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(2, 2, 60, 60);

  // 3. Disco principal âmbar claro
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(5, 5, 54, 54);

  // 4. Corpo central quente do sol (ivory / creme radiante, preservando saturação sem estourar em branco puro)
  ctx.fillStyle = '#fffbeb';
  ctx.fillRect(8, 8, 48, 48);

  // 5. Núcleo central brilhante
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(18, 18, 28, 28);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

function generateRadialGlowTexture(coreColor, haloColor, outerColor = 'rgba(0, 0, 0, 0)') {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  if (!canvas || !canvas.getContext) return null;
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx || !ctx.createRadialGradient) return null;

  const rad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  rad.addColorStop(0.0, coreColor);
  rad.addColorStop(0.28, haloColor);
  rad.addColorStop(0.65, outerColor);
  rad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

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

    // Nuvens e Efeitos Atmosféricos Ultra (Inspirados no Complementary Shaders)
    this.cloudMesh = null;
    this.cloudMat = null;
    this.cloudTexture = null;
    this.cloudMesh2 = null;
    this.cloudMat2 = null;
    this.cloudTexture2 = null;
    this.skyDomeMesh = null;
    this.skyMaterial = null;
    this.sunGlowMesh = null;
    this.sunBeamsGroup = null;
    this.moonGlowMesh = null;
    this.moonBeamsGroup = null;

    this.initCelestialObjects();
  }

  // Inicializa o Sol, a Lua, a Abóbada Celeste Atmosférica e o Campo de Estrelas na cena Three.js
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

    // 0. Abóbada Celeste Atmosférica (Gradiente Zênite -> Horizonte + Coroas Solar e Lunar)
    const domeGeom = new THREE.SphereGeometry(260, 32, 16);
    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x1d62c9) },
        horizonColor: { value: new THREE.Color(0x8ec2ec) },
        sunGlowColor: { value: new THREE.Color(0xffeaad) },
        sunPosition: { value: new THREE.Vector3(0, 1, 0) },
        sunGlowIntensity: { value: 0.55 },
        moonGlowColor: { value: new THREE.Color(0x00caff) },
        moonPosition: { value: new THREE.Vector3(0, -1, 0) },
        moonGlowIntensity: { value: 0.0 },
        offset: { value: 0.04 },
        exponent: { value: 0.85 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 sunGlowColor;
        uniform vec3 sunPosition;
        uniform float sunGlowIntensity;
        uniform vec3 moonGlowColor;
        uniform vec3 moonPosition;
        uniform float moonGlowIntensity;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;

        void main() {
          vec3 dir = normalize(vWorldPosition);
          float h = max(0.0, dir.y + offset);
          float factor = pow(h, exponent);
          vec3 sky = mix(horizonColor, topColor, factor);

          // 1. Difusão Solar Atmosférica Suave (sem estourar o azul do céu)
          if (sunGlowIntensity > 0.005) {
            float sunDot = max(0.0, dot(dir, normalize(sunPosition)));
            float sunCorona = pow(sunDot, 36.0) * sunGlowIntensity * 0.45;
            float sunAtmosphere = pow(sunDot, 6.0) * sunGlowIntensity * 0.18 * (1.0 - h * 0.35);
            sky += sunGlowColor * (sunCorona + sunAtmosphere);
          }

          // 2. Difusão Lunar Volumétrica Mística (Noite)
          if (moonGlowIntensity > 0.005) {
            float moonDot = max(0.0, dot(dir, normalize(moonPosition)));
            float moonCorona = pow(moonDot, 40.0) * moonGlowIntensity * 0.65;
            float moonAtmosphere = pow(moonDot, 8.0) * moonGlowIntensity * 0.22 * (1.0 - h * 0.30);
            sky += moonGlowColor * (moonCorona + moonAtmosphere);
          }

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false
    });
    this.skyDomeMesh = new THREE.Mesh(domeGeom, this.skyMaterial);
    this.skyDomeMesh.renderOrder = -100;
    this.celestialGroup.add(this.skyDomeMesh);

    // 1. Sol (Cubo voxel estilizado do Minecraft orientado para o observador com bordas quentes)
    const sunGeom = new THREE.BoxGeometry(13, 13, 2);
    const sunTex = generateSunTexture();
    const sunMat = sunTex ? new THREE.MeshBasicMaterial({ map: sunTex }) : new THREE.MeshBasicMaterial({ color: 0xfff4b8 });
    this.sunMesh = new THREE.Mesh(sunGeom, sunMat);
    this.celestialGroup.add(this.sunMesh);

    // 2. Lua (Cubo voxel estilizado do Minecraft com crateras pixeladas detalhadas e rotação diamante)
    const moonGeom = new THREE.BoxGeometry(11, 11, 2);
    const moonTex = generateMoonTexture();
    const moonMat = moonTex ? new THREE.MeshBasicMaterial({ map: moonTex }) : new THREE.MeshBasicMaterial({ color: 0xe6f0fa });
    this.moonMesh = new THREE.Mesh(moonGeom, moonMat);
    this.moonMesh.rotation.z = 0.38;
    this.moonMesh.rotation.x = 0.15;
    this.celestialGroup.add(this.moonMesh);

    // 3. Estrelas cintilantes visíveis à noite (650 pontos discretos com depthWrite falso)
    const starGeom = new THREE.BufferGeometry();
    const starPositions = [];
    const starCount = 650;
    const starRadius = 145;

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      if (Math.sin(phi) > 0.05) {
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
      size: 1.5,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });
    this.starPoints = new THREE.Points(starGeom, this.starMaterial);
    this.starPoints.visible = false;
    this.celestialGroup.add(this.starPoints);

    // 4. Halo Solar Suave e Integrado (Ultra Shaders)
    const sunGlowTex = generateRadialGlowTexture('rgba(255, 235, 175, 0.55)', 'rgba(255, 195, 110, 0.20)', 'rgba(255, 160, 60, 0.0)');
    if (sunGlowTex) {
      const glowGeom = new THREE.PlaneGeometry(38, 38);
      this.sunGlowMat = new THREE.MeshBasicMaterial({
        map: sunGlowTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.45,
        side: THREE.DoubleSide
      });
      this.sunGlowMesh = new THREE.Mesh(glowGeom, this.sunGlowMat);
      this.celestialGroup.add(this.sunGlowMesh);
    }

    // Raios solares atmosféricos suaves e radiais sem planos cortantes
    this.sunBeamsGroup = new THREE.Group();
    if (typeof document !== 'undefined') {
      const bCanvas = document.createElement('canvas');
      if (bCanvas && bCanvas.getContext) {
        bCanvas.width = 64;
        bCanvas.height = 128;
        const bctx = bCanvas.getContext('2d');
        if (bctx && bctx.createImageData) {
          const bImg = bctx.createImageData(64, 128);
          const bData = bImg.data;
          for (let y = 0; y < 128; y++) {
            const v = y / 128.0;
            const lengthFade = Math.pow(Math.max(0.0, 1.0 - v), 1.6);
            for (let x = 0; x < 64; x++) {
              const u = (x - 32) / 32.0;
              const widthFade = Math.max(0.0, 1.0 - u * u);
              const alpha = Math.floor(lengthFade * widthFade * 80);
              const idx = (x + y * 64) * 4;
              bData[idx] = 255;
              bData[idx + 1] = Math.floor(THREE.MathUtils.lerp(235, 190, v));
              bData[idx + 2] = Math.floor(THREE.MathUtils.lerp(160, 80, v));
              bData[idx + 3] = alpha;
            }
          }
          bctx.putImageData(bImg, 0, 0);
          const beamTex = new THREE.CanvasTexture(bCanvas);
          const beamGeom = new THREE.PlaneGeometry(16, 70);

          for (let i = 0; i < 6; i++) {
            const bMat = new THREE.MeshBasicMaterial({
              map: beamTex,
              transparent: true,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              opacity: 0.045,
              side: THREE.DoubleSide
            });
            const beamMesh = new THREE.Mesh(beamGeom, bMat);
            beamMesh.rotation.z = (i / 6) * Math.PI * 2;
            beamMesh.position.set(0, 0, 0);
            this.sunBeamsGroup.add(beamMesh);
          }
        }
      }
    }
    this.celestialGroup.add(this.sunBeamsGroup);

    // 5. Halo Lunar Ciano Místico e Raios de Luar (Ultra Shaders)
    const moonGlowTex = generateRadialGlowTexture('rgba(180, 235, 255, 0.60)', 'rgba(20, 160, 225, 0.20)', 'rgba(2, 60, 130, 0.0)');
    if (moonGlowTex) {
      const mGlowGeom = new THREE.PlaneGeometry(38, 38);
      this.moonGlowMat = new THREE.MeshBasicMaterial({
        map: moonGlowTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.40,
        side: THREE.DoubleSide
      });
      this.moonGlowMesh = new THREE.Mesh(mGlowGeom, this.moonGlowMat);
      this.celestialGroup.add(this.moonGlowMesh);
    }

    // Raios de luar suaves e radiais
    this.moonBeamsGroup = new THREE.Group();
    if (typeof document !== 'undefined') {
      const mbCanvas = document.createElement('canvas');
      if (mbCanvas && mbCanvas.getContext) {
        mbCanvas.width = 64;
        mbCanvas.height = 128;
        const mbctx = mbCanvas.getContext('2d');
        if (mbctx && mbctx.createImageData) {
          const mbImg = mbctx.createImageData(64, 128);
          const mbData = mbImg.data;
          for (let y = 0; y < 128; y++) {
            const v = y / 128.0;
            const lengthFade = Math.pow(Math.max(0.0, 1.0 - v), 1.6);
            for (let x = 0; x < 64; x++) {
              const u = (x - 32) / 32.0;
              const widthFade = Math.max(0.0, 1.0 - u * u);
              const alpha = Math.floor(lengthFade * widthFade * 75);
              const idx = (x + y * 64) * 4;
              mbData[idx] = 160;
              mbData[idx + 1] = Math.floor(THREE.MathUtils.lerp(225, 175, v));
              mbData[idx + 2] = 255;
              mbData[idx + 3] = alpha;
            }
          }
          mbctx.putImageData(mbImg, 0, 0);
          const mBeamTex = new THREE.CanvasTexture(mbCanvas);
          const mBeamGeom = new THREE.PlaneGeometry(16, 75);

          for (let i = 0; i < 6; i++) {
            const mbMat = new THREE.MeshBasicMaterial({
              map: mBeamTex,
              transparent: true,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              opacity: 0.035,
              side: THREE.DoubleSide
            });
            const mBeamMesh = new THREE.Mesh(mBeamGeom, mbMat);
            mBeamMesh.rotation.z = (i / 6) * Math.PI * 2;
            mBeamMesh.position.set(0, 0, 0);
            this.moonBeamsGroup.add(mBeamMesh);
          }
        }
      }
    }
    this.celestialGroup.add(this.moonBeamsGroup);

    // 6. Dossel de Nuvens Cumulus Volumétricas com Curvatura Natural no Horizonte
    const cloudTex = generateCloudTexture();
    if (cloudTex) {
      this.cloudTexture = cloudTex;

      // Geometria subdividida suave (48x48) com curvatura natural acompanhando o horizonte
      const cloudGeom = new THREE.PlaneGeometry(1800, 1800, 48, 48);
      const posAttr = cloudGeom.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vy = posAttr.getY(i);
        const r = Math.hypot(vx, vy);
        const drop = Math.pow(Math.min(1.0, r / 900), 2.2) * 45;
        posAttr.setZ(i, -drop);
      }
      cloudGeom.computeVertexNormals();

      this.cloudMat = new THREE.MeshBasicMaterial({
        map: cloudTex,
        transparent: true,
        opacity: 0.94,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      this.cloudMesh = new THREE.Mesh(cloudGeom, this.cloudMat);
      this.cloudMesh.rotation.x = Math.PI / 2;
      this.cloudMesh.position.set(0, 115, 0);
      this.game.scene.add(this.cloudMesh);

      // Camada secundária superior sutil para paralaxe e profundidade atmosférica
      const cloudTex2 = cloudTex.clone();
      cloudTex2.repeat.set(1.5, 1.5);
      this.cloudTexture2 = cloudTex2;
      this.cloudMat2 = new THREE.MeshBasicMaterial({
        map: cloudTex2,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      this.cloudMesh2 = new THREE.Mesh(cloudGeom, this.cloudMat2);
      this.cloudMesh2.rotation.x = Math.PI / 2;
      this.cloudMesh2.position.set(0, 138, 0);
      this.game.scene.add(this.cloudMesh2);
    }

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

    // Deslocamento contínuo das nuvens com o vento em diferentes velocidades (paralaxe)
    if (this.cloudTexture) {
      this.cloudTexture.offset.x += dt * 0.0008;
      this.cloudTexture.offset.y += dt * 0.0004;
    }
    if (this.cloudTexture2) {
      this.cloudTexture2.offset.x += dt * 0.0005;
      this.cloudTexture2.offset.y += dt * 0.0002;
    }
    if (this.cloudMesh && this.game.player) {
      this.cloudMesh.position.x = this.game.player.position.x;
      this.cloudMesh.position.z = this.game.player.position.z;
    }
    if (this.cloudMesh2 && this.game.player) {
      this.cloudMesh2.position.x = this.game.player.position.x;
      this.cloudMesh2.position.z = this.game.player.position.z;
    }

    this.updateLightingAndSky();
  }

  // Atualiza cores do céu, abóbada atmosférica, névoa, luzes solares, posição da lua e estrelas
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
      this.sunMesh.lookAt(px, py, pz);
    }

    if (this.moonMesh) {
      // Lua diametralmente oposta ao sol orientada com diamante Minecraft
      this.moonMesh.position.set(-sunX, -sunY, -sunZ);
      this.moonMesh.visible = -sunY > -10;
      this.moonMesh.lookAt(px, py, pz);
      this.moonMesh.rotateZ(0.38);
    }

    const isUltra = !!(this.game && (this.game.graphicsPreset === 'ultra' || this.game.graphicsQuality === 'ultra'));

    // Cores celestes atmosféricas
    let zenithColor = new THREE.Color(0x1d62c9);
    let horizonColor = new THREE.Color(0x8ec2ec);
    let sunLightColor = new THREE.Color(0xfff9ea);
    let ambientColor = new THREE.Color(0xebf3fc);
    let sunGlowColor = new THREE.Color(0xffeaad);
    let sunGlowIntensity = 0.55;
    let moonGlowColor = new THREE.Color(0x00caff);
    let moonGlowIntensity = 0.0;
    let sunIntensity = 0.95;
    let ambientIntensity = 0.38;
    let starOpacity = 0.0;

    // Definição das fases de transição suave do ciclo dia/noite
    if (t >= 120 && t < 780) {
      // PLENO DIA: Céu azul natural equilibrado com horizonte límpido
      zenithColor.setHex(isUltra ? 0x1d62c9 : 0x2563eb);
      horizonColor.setHex(isUltra ? 0x8ec2ec : 0x98c6ea);
      sunLightColor.setHex(isUltra ? 0xfff9ea : 0xfff7e6);
      ambientColor.setHex(isUltra ? 0xebf3fc : 0xffffff);
      sunGlowColor.setHex(0xffeaad);
      sunGlowIntensity = isUltra ? 0.55 : 0.25;
      moonGlowIntensity = 0.0;
      sunIntensity = isUltra ? 1.08 : 0.95;
      ambientIntensity = isUltra ? 0.42 : 0.38;
      starOpacity = 0.0;
    } else if (t >= 780 && t < 900) {
      // ENTARDECER (Pôr do Sol cinematográfico com tons dourados, alaranjados e rosados)
      const factor = (t - 780) / 120; // 0.0 a 1.0

      const dayZenith = isUltra ? new THREE.Color(0x1d62c9) : new THREE.Color(0x2563eb);
      const sunsetZenith = isUltra ? new THREE.Color(0x243b6c) : new THREE.Color(0x2b4280);
      zenithColor.lerpColors(dayZenith, sunsetZenith, factor);

      const dayHoriz = isUltra ? new THREE.Color(0x8ec2ec) : new THREE.Color(0x98c6ea);
      const sunsetHoriz = isUltra ? new THREE.Color(0xfb8c38) : new THREE.Color(0xf97316);
      horizonColor.lerpColors(dayHoriz, sunsetHoriz, factor);

      const daySun = isUltra ? new THREE.Color(0xfff9ea) : new THREE.Color(0xfff7e6);
      const sunsetSun = isUltra ? new THREE.Color(0xff7a29) : new THREE.Color(0xff8833);
      sunLightColor.lerpColors(daySun, sunsetSun, factor);

      const dayAmb = isUltra ? new THREE.Color(0xebf3fc) : new THREE.Color(0xffffff);
      const sunsetAmb = isUltra ? new THREE.Color(0xffaf82) : new THREE.Color(0xfca5a5);
      ambientColor.lerpColors(dayAmb, sunsetAmb, factor);

      sunGlowColor.lerpColors(new THREE.Color(0xffeaad), new THREE.Color(0xff8c20), factor);
      sunGlowIntensity = THREE.MathUtils.lerp(0.55, 0.95, factor);
      moonGlowIntensity = 0.0;
      sunIntensity = THREE.MathUtils.lerp(isUltra ? 1.08 : 0.95, 0.52, factor);
      ambientIntensity = THREE.MathUtils.lerp(isUltra ? 0.42 : 0.38, 0.26, factor);
      starOpacity = factor * 0.35;
    } else if (t >= 900 && t < 1050) {
      // CREPÚSCULO (Anoitecer: violeta, lavanda e transição suave para azul marinho)
      const factor = (t - 900) / 150;

      const sunsetZenith = isUltra ? new THREE.Color(0x243b6c) : new THREE.Color(0x2b4280);
      const nightZenith = isUltra ? new THREE.Color(0x020917) : new THREE.Color(0x050f24);
      zenithColor.lerpColors(sunsetZenith, nightZenith, factor);

      const sunsetHoriz = isUltra ? new THREE.Color(0xfb8c38) : new THREE.Color(0xf97316);
      const nightHoriz = isUltra ? new THREE.Color(0x07192f) : new THREE.Color(0x09203e);
      horizonColor.lerpColors(sunsetHoriz, nightHoriz, factor);

      const sunsetSun = isUltra ? new THREE.Color(0xff7a29) : new THREE.Color(0xff8833);
      const nightSun = isUltra ? new THREE.Color(0x5897d8) : new THREE.Color(0x3d568c);
      sunLightColor.lerpColors(sunsetSun, nightSun, factor);

      const sunsetAmb = isUltra ? new THREE.Color(0xffaf82) : new THREE.Color(0xfca5a5);
      const nightAmb = isUltra ? new THREE.Color(0x182844) : new THREE.Color(0x1a2640);
      ambientColor.lerpColors(sunsetAmb, nightAmb, factor);

      sunGlowColor.lerpColors(new THREE.Color(0xff8c20), new THREE.Color(0x101a2c), factor);
      sunGlowIntensity = THREE.MathUtils.lerp(0.95, 0.0, factor);
      moonGlowColor = new THREE.Color(0x00caff);
      moonGlowIntensity = THREE.MathUtils.lerp(0.0, isUltra ? 0.95 : 0.50, factor);
      sunIntensity = THREE.MathUtils.lerp(0.52, isUltra ? 0.42 : 0.30, factor);
      ambientIntensity = THREE.MathUtils.lerp(0.26, isUltra ? 0.28 : 0.22, factor);
      starOpacity = THREE.MathUtils.lerp(0.35, 0.65, factor);
    } else if (t >= 1050 && t < 1650) {
      // PLENA NOITE: Céu azul-escuro profundo, aura ciano radiante na lua e terreno visível (Imagem 2)
      zenithColor.setHex(isUltra ? 0x020917 : 0x050f24);
      horizonColor.setHex(isUltra ? 0x07192f : 0x09203e);
      sunLightColor.setHex(isUltra ? 0x5897d8 : 0x3d568c);
      ambientColor.setHex(isUltra ? 0x182844 : 0x1a2640);
      sunGlowColor.setHex(0x101a2c);
      sunGlowIntensity = 0.0;
      moonGlowColor.setHex(0x00caff);
      moonGlowIntensity = isUltra ? 0.95 : 0.50;
      sunIntensity = isUltra ? 0.42 : 0.30;
      ambientIntensity = isUltra ? 0.28 : 0.22;
      starOpacity = 0.65;
    } else if (t >= 1650 && t < 1800) {
      // MADRUGADA / ALVORADA: Tons de pêssego, alaranjado e dourado matinal
      const factor = (t - 1650) / 150;

      const nightZenith = isUltra ? new THREE.Color(0x020917) : new THREE.Color(0x050f24);
      const dawnZenith = isUltra ? new THREE.Color(0x183060) : new THREE.Color(0x1d386e);
      zenithColor.lerpColors(nightZenith, dawnZenith, factor);

      const nightHoriz = isUltra ? new THREE.Color(0x07192f) : new THREE.Color(0x09203e);
      const dawnHoriz = isUltra ? new THREE.Color(0xf59e0b) : new THREE.Color(0xec4899);
      horizonColor.lerpColors(nightHoriz, dawnHoriz, factor);

      const nightSun = isUltra ? new THREE.Color(0x5897d8) : new THREE.Color(0x3d568c);
      const dawnSun = isUltra ? new THREE.Color(0xffa726) : new THREE.Color(0xff8844);
      sunLightColor.lerpColors(nightSun, dawnSun, factor);

      const nightAmb = isUltra ? new THREE.Color(0x182844) : new THREE.Color(0x1a2640);
      const dawnAmb = isUltra ? new THREE.Color(0xd97736) : new THREE.Color(0xb37050);
      ambientColor.lerpColors(nightAmb, dawnAmb, factor);

      sunGlowColor.lerpColors(new THREE.Color(0x101a2c), new THREE.Color(0xffaa44), factor);
      moonGlowIntensity = THREE.MathUtils.lerp(isUltra ? 0.95 : 0.50, 0.0, factor);
      sunGlowIntensity = THREE.MathUtils.lerp(0.0, 0.65, factor);
      sunIntensity = THREE.MathUtils.lerp(isUltra ? 0.42 : 0.30, 0.55, factor);
      ambientIntensity = THREE.MathUtils.lerp(isUltra ? 0.28 : 0.22, 0.28, factor);
      starOpacity = THREE.MathUtils.lerp(0.65, 0.25, factor);
    } else {
      // 0..120: AMANHECER (Alvorada -> Pleno Dia)
      const factor = t / 120;

      const dawnZenith = isUltra ? new THREE.Color(0x183060) : new THREE.Color(0x1d386e);
      const dayZenith = isUltra ? new THREE.Color(0x1d62c9) : new THREE.Color(0x2563eb);
      zenithColor.lerpColors(dawnZenith, dayZenith, factor);

      const dawnHoriz = isUltra ? new THREE.Color(0xf59e0b) : new THREE.Color(0xec4899);
      const dayHoriz = isUltra ? new THREE.Color(0x8ec2ec) : new THREE.Color(0x98c6ea);
      horizonColor.lerpColors(dawnHoriz, dayHoriz, factor);

      const dawnSun = isUltra ? new THREE.Color(0xffa726) : new THREE.Color(0xff8844);
      const daySun = isUltra ? new THREE.Color(0xfff9ea) : new THREE.Color(0xfff7e6);
      sunLightColor.lerpColors(dawnSun, daySun, factor);

      const dawnAmb = isUltra ? new THREE.Color(0xd97736) : new THREE.Color(0xb37050);
      const dayAmb = isUltra ? new THREE.Color(0xebf3fc) : new THREE.Color(0xffffff);
      ambientColor.lerpColors(dawnAmb, dayAmb, factor);

      sunGlowColor.lerpColors(new THREE.Color(0xffaa44), new THREE.Color(0xffeaad), factor);
      moonGlowIntensity = 0.0;
      sunGlowIntensity = THREE.MathUtils.lerp(0.65, 0.55, factor);
      sunIntensity = THREE.MathUtils.lerp(0.55, isUltra ? 1.08 : 0.95, factor);
      ambientIntensity = THREE.MathUtils.lerp(0.28, isUltra ? 0.42 : 0.38, factor);
      starOpacity = THREE.MathUtils.lerp(0.25, 0.0, factor);
    }

    // Atualiza Uniforms da Abóbada Celeste Atmosférica (ShaderMaterial)
    if (this.skyMaterial && this.skyMaterial.uniforms) {
      this.skyMaterial.uniforms.topColor.value.copy(zenithColor);
      this.skyMaterial.uniforms.horizonColor.value.copy(horizonColor);
      this.skyMaterial.uniforms.sunGlowColor.value.copy(sunGlowColor);
      this.skyMaterial.uniforms.sunGlowIntensity.value = sunGlowIntensity;
      if (this.sunMesh) {
        this.skyMaterial.uniforms.sunPosition.value.copy(this.sunMesh.position);
      }
      if (this.moonMesh && this.skyMaterial.uniforms.moonPosition) {
        this.skyMaterial.uniforms.moonPosition.value.copy(this.moonMesh.position);
      }
      if (this.skyMaterial.uniforms.moonGlowColor) {
        this.skyMaterial.uniforms.moonGlowColor.value.copy(moonGlowColor);
      }
      if (this.skyMaterial.uniforms.moonGlowIntensity) {
        this.skyMaterial.uniforms.moonGlowIntensity.value = moonGlowIntensity;
      }
    }

    // Aplica na cena do Three.js: fundo e névoa atmosférica de horizonte integrados
    this.game.scene.background = horizonColor;
    if (this.game.scene.fog) {
      this.game.scene.fog.color.copy(horizonColor);
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

      if (this.sunLight.target) {
        this.sunLight.target.position.set(px, py, pz);
        if (!this.sunLight.target.parent) {
          this.game.scene.add(this.sunLight.target);
        }
      }
    }

    // Luz Ambiente
    if (this.ambientLight) {
      this.ambientLight.color = ambientColor;
      this.ambientLight.intensity = ambientIntensity;
    }

    // Luz Hemisférica
    if (this.hemiLight) {
      if (isUltra) {
        if (t >= 120 && t < 780) {
          this.hemiLight.color.setHex(0xa0cfff);
          this.hemiLight.groundColor.setHex(0x524032);
          this.hemiLight.intensity = 0.52;
        } else if (t >= 780 && t < 900) {
          this.hemiLight.color.setHex(0xff7043);
          this.hemiLight.groundColor.setHex(0x42281a);
          this.hemiLight.intensity = 0.42;
        } else {
          this.hemiLight.color.setHex(0x1a406c);
          this.hemiLight.groundColor.setHex(0x0c1626);
          this.hemiLight.intensity = 0.32;
        }
      } else {
        this.hemiLight.color.setHex(0x87ceeb);
        this.hemiLight.groundColor.setHex(0x543d2b);
        this.hemiLight.intensity = 0.45;
      }
    }

    // Estrelas discretas ativas somente quando visíveis (depthWrite desativado)
    if (this.starMaterial) {
      this.starMaterial.opacity = starOpacity;
    }
    if (this.starPoints) {
      this.starPoints.visible = (starOpacity > 0.02);
    }

    // Posiciona e orienta Halo e Raios no Sol e na Lua
    if (this.sunGlowMesh && this.sunMesh) {
      this.sunGlowMesh.position.copy(this.sunMesh.position);
      this.sunGlowMesh.visible = this.sunMesh.visible;
      this.sunGlowMesh.lookAt(px, py, pz);
    }
    if (this.sunBeamsGroup && this.sunMesh) {
      this.sunBeamsGroup.position.copy(this.sunMesh.position);
      this.sunBeamsGroup.visible = this.sunMesh.visible && isUltra;
      this.sunBeamsGroup.lookAt(px, py, pz);
      this.sunBeamsGroup.rotateZ(t * 0.02);
    }
    if (this.moonGlowMesh && this.moonMesh) {
      this.moonGlowMesh.position.copy(this.moonMesh.position);
      this.moonGlowMesh.visible = this.moonMesh.visible && isUltra;
      this.moonGlowMesh.lookAt(px, py, pz);
    }
    if (this.moonBeamsGroup && this.moonMesh) {
      this.moonBeamsGroup.position.copy(this.moonMesh.position);
      this.moonBeamsGroup.visible = this.moonMesh.visible && isUltra;
      this.moonBeamsGroup.lookAt(px, py, pz);
      this.moonBeamsGroup.rotateZ(t * 0.015);
    }

    // Atualiza cor e iluminação das nuvens conforme o ciclo solar (Inspirado no Complementary Shaders)
    if (this.cloudMat) {
      if (t >= 120 && t < 780) {
        // Pleno Dia: nuvens cumulus brancas volumétricas
        this.cloudMat.color.setHex(0xffffff);
        this.cloudMat.opacity = isUltra ? 0.94 : 0.70;
        if (this.cloudMat2) {
          this.cloudMat2.color.setHex(0xf4f8ff);
          this.cloudMat2.opacity = isUltra ? 0.22 : 0.0;
        }
      } else if (t >= 780 && t < 900) {
        // Pôr do sol: nuvens douradas e alaranjadas
        this.cloudMat.color.setHex(isUltra ? 0xffbf80 : 0xfca5a5);
        this.cloudMat.opacity = isUltra ? 0.95 : 0.72;
        if (this.cloudMat2) {
          this.cloudMat2.color.setHex(isUltra ? 0xff9148 : 0xf87171);
          this.cloudMat2.opacity = isUltra ? 0.25 : 0.0;
        }
      } else if (t >= 900 && t < 1050) {
        // Crepúsculo: violeta/lavanda e púrpura suave
        this.cloudMat.color.setHex(0x765588);
        this.cloudMat.opacity = 0.84;
        if (this.cloudMat2) {
          this.cloudMat2.color.setHex(0x553965);
          this.cloudMat2.opacity = isUltra ? 0.20 : 0.0;
        }
      } else if (t >= 1050 && t < 1650) {
        // Noite: ardósia prateado escuro iluminado pela lua
        this.cloudMat.color.setHex(0x132238);
        this.cloudMat.opacity = 0.72;
        if (this.cloudMat2) {
          this.cloudMat2.color.setHex(0x0c1727);
          this.cloudMat2.opacity = isUltra ? 0.18 : 0.0;
        }
      } else {
        // Alvorada: pêssego, dourado e blush suave
        this.cloudMat.color.setHex(0xffcb90);
        this.cloudMat.opacity = 0.88;
        if (this.cloudMat2) {
          this.cloudMat2.color.setHex(0xffa660);
          this.cloudMat2.opacity = isUltra ? 0.22 : 0.0;
        }
      }
    }

    // Atualiza reflexo do céu, sol/lua e nuvens na água
    if (typeof updateWaterReflectionTexture === 'function') {
      const isSunset = (t >= 780 && t < 1050) || (t >= 1650 && t < 1800);
      const sunsetFactor = isSunset ? (t >= 780 && t < 1050 ? (t - 780) / 270 : (1800 - t) / 150) : 0.0;
      const isNight = !this.isDay;
      updateWaterReflectionTexture(horizonColor.getHex(), sunLightColor.getHex(), sunsetFactor, isNight);
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
