// =============================================================================
// js/main.js - Inicialização do Motor 3D Three.js, Gerenciador de Estados e Loop
// =============================================================================

class Game {
  constructor() {
    window.game = this;
    this.clock = new THREE.Clock();

    // Estado do jogo: 'MENU', 'PLAYING', 'PAUSED', 'INVENTORY', 'CRAFTING_TABLE', 'DEAD'
    this.state = 'MENU';
    this.gameMode = 'survival'; // 'survival' ou 'creative'

    this.world = null;

    // 1. Inicializa motor 3D Three.js
    this.initThree();
    this.initLights();

    // 2. Garante que exista ao menos um mundo padrão no localStorage
    SaveSystem.ensureDefaultWorld();

    // 3. Inicializa os subsistemas modulares
    this.inventory = new Inventory();
    this.drops = new DropManager(this);
    this.crafting = new CraftingController(this);
    this.mining = new MiningSystem(this);
    this.furnace = new FurnaceManager(this);
    this.physics = new Physics();
    this.player = new Player(this.camera, null, this.physics, this.scene, this.inventory);
    this.health = new HealthSystem(this);
    this.worldTime = new WorldTime(this);
    this.entityManager = new EntityManager(this);
    this.worldManager = new WorldManager(this);
    this.ui = new UI(this);
    this.input = new Input(this);
    this.multiplayer = new MultiplayerManager(this);
    this.particles = (typeof ParticleManager !== 'undefined') ? new ParticleManager(this) : null;

    // Configurações Gráficas (Baixo, Médio, Alto, Ultra — Shaders)
    this.renderDistance = 10;
    this.graphicsPreset = 'medium';
    this.graphicsQuality = 'medium';
    try {
      if (typeof localStorage !== 'undefined') {
        const savedPreset = localStorage.getItem('blockworld_graphics_preset');
        if (savedPreset) {
          this.graphicsPreset = savedPreset;
          this.graphicsQuality = savedPreset;
        }
      }
    } catch (e) {}
    this.applyGraphicsPreset(this.graphicsPreset, false);

    // Ajusta o redimensionamento da janela
    window.addEventListener('resize', () => this.onWindowResize());

    // Mostra o Menu Principal na inicialização
    this.ui.showMainMenu();

    // Inicia o loop de renderização contínua
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  // Aplica opções gráficas em tempo real (Baixo, Médio, Alto, Ultra — Shaders) com alterações reais
  applyGraphicsPreset(preset, save = true) {
    this.graphicsPreset = preset;
    this.graphicsQuality = preset;

    if (preset === 'low') {
      // Baixo: 6 chunks de raio (96 blocos), névoa fechada otimizada, sem sombras, máximo FPS
      this.renderDistance = 6;
      if (this.scene && this.scene.fog) {
        this.scene.fog.near = 30;
        this.scene.fog.far = 96;
      }
      if (this.camera) {
        this.camera.far = 340;
        this.camera.updateProjectionMatrix();
      }
      if (this.renderer) {
        this.renderer.setPixelRatio(1.0);
        this.renderer.shadowMap.enabled = false;
        this.renderer.toneMapping = THREE.NoToneMapping;
        this.renderer.toneMappingExposure = 1.0;
      }
      if (this.sunLight) {
        this.sunLight.castShadow = false;
      }
    } else if (preset === 'ultra') {
      // Ultra — Shaders: 16 chunks (256 blocos de raio dobrados), sombras dinâmicas de 2048px com filtro PCFSoft,
      // Tone mapping ACES Filmic com exposição cinematográfica, água translúcida ondulante animada,
      // névoa atmosférica e iluminação aprimorada inspirada no Complementary Shaders
      this.renderDistance = 16;
      if (this.scene && this.scene.fog) {
        this.scene.fog.near = 170;
        this.scene.fog.far = 280;
      }
      if (this.camera) {
        this.camera.far = 520;
        this.camera.updateProjectionMatrix();
      }
      if (this.renderer && typeof window !== 'undefined') {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
      }
      if (this.sunLight) {
        this.sunLight.castShadow = true;
        if (this.sunLight.shadow) {
          this.sunLight.shadow.mapSize.width = 2048;
          this.sunLight.shadow.mapSize.height = 2048;
          this.sunLight.shadow.bias = -0.0004;
          this.sunLight.shadow.normalBias = 0.025;
          this.sunLight.shadow.radius = 2.0;
          this.sunLight.shadow.camera.near = 1.0;
          this.sunLight.shadow.camera.far = 280;
          this.sunLight.shadow.camera.left = -60;
          this.sunLight.shadow.camera.right = 60;
          this.sunLight.shadow.camera.top = 60;
          this.sunLight.shadow.camera.bottom = -60;
          if (this.sunLight.shadow.camera.updateProjectionMatrix) {
            this.sunLight.shadow.camera.updateProjectionMatrix();
          }
        }
      }
    } else if (preset === 'high') {
      // Alto: 14 chunks de raio (224 blocos dobrados), névoa distante ampla, sombras suaves, nitidez máxima
      this.renderDistance = 14;
      if (this.scene && this.scene.fog) {
        this.scene.fog.near = 140;
        this.scene.fog.far = 240;
      }
      if (this.camera) {
        this.camera.far = 460;
        this.camera.updateProjectionMatrix();
      }
      if (this.renderer && typeof window !== 'undefined') {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.NoToneMapping;
        this.renderer.toneMappingExposure = 1.0;
      }
      if (this.sunLight) {
        this.sunLight.castShadow = true;
        if (this.sunLight.shadow) {
          this.sunLight.shadow.mapSize.width = 1024;
          this.sunLight.shadow.mapSize.height = 1024;
          this.sunLight.shadow.bias = -0.0005;
          this.sunLight.shadow.normalBias = 0.02;
          this.sunLight.shadow.radius = 1.0;
          this.sunLight.shadow.camera.near = 1.0;
          this.sunLight.shadow.camera.far = 280;
          this.sunLight.shadow.camera.left = -60;
          this.sunLight.shadow.camera.right = 60;
          this.sunLight.shadow.camera.top = 60;
          this.sunLight.shadow.camera.bottom = -60;
          if (this.sunLight.shadow.camera.updateProjectionMatrix) {
            this.sunLight.shadow.camera.updateProjectionMatrix();
          }
        }
      }
    } else {
      // Médio: 10 chunks de raio (160 blocos dobrados), equilíbrio ótimo visual e de performance
      this.renderDistance = 10;
      if (this.scene && this.scene.fog) {
        this.scene.fog.near = 70;
        this.scene.fog.far = 170;
      }
      if (this.camera) {
        this.camera.far = 380;
        this.camera.updateProjectionMatrix();
      }
      if (this.renderer && typeof window !== 'undefined') {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        this.renderer.toneMapping = THREE.NoToneMapping;
        this.renderer.toneMappingExposure = 1.0;
      }
      if (this.sunLight) {
        this.sunLight.castShadow = true;
        if (this.sunLight.shadow) {
          this.sunLight.shadow.mapSize.width = 512;
          this.sunLight.shadow.mapSize.height = 512;
          this.sunLight.shadow.bias = 0;
          this.sunLight.shadow.normalBias = 0.01;
          this.sunLight.shadow.radius = 1.0;
        }
      }
    }

    // Efeitos específicos de materiais (Água com reflexos do céu/nuvens e Superfícies)
    if (typeof BLOCK_MATERIAL_WATER !== 'undefined') {
      if (preset === 'ultra') {
        BLOCK_MATERIAL_WATER.color.setHex(0x245878);
        BLOCK_MATERIAL_WATER.specular.setHex(0x90e0ef);
        BLOCK_MATERIAL_WATER.shininess = 90;
        BLOCK_MATERIAL_WATER.reflectivity = 0.70;
        BLOCK_MATERIAL_WATER.opacity = 0.78;
        if (typeof waterSkyTexture !== 'undefined') BLOCK_MATERIAL_WATER.envMap = waterSkyTexture;
      } else if (preset === 'high') {
        BLOCK_MATERIAL_WATER.color.setHex(0x1d709e);
        BLOCK_MATERIAL_WATER.specular.setHex(0x60a0c0);
        BLOCK_MATERIAL_WATER.shininess = 40;
        BLOCK_MATERIAL_WATER.reflectivity = 0.35;
        BLOCK_MATERIAL_WATER.opacity = 0.75;
        if (typeof waterSkyTexture !== 'undefined') BLOCK_MATERIAL_WATER.envMap = waterSkyTexture;
      } else {
        BLOCK_MATERIAL_WATER.color.setHex(0x1e88e5);
        BLOCK_MATERIAL_WATER.specular.setHex(0x000000);
        BLOCK_MATERIAL_WATER.shininess = 0;
        BLOCK_MATERIAL_WATER.reflectivity = 0.0;
        BLOCK_MATERIAL_WATER.envMap = null;
        BLOCK_MATERIAL_WATER.opacity = preset === 'medium' ? 0.72 : 0.70;
      }
    }

    if (preset === 'ultra') {
      if (typeof BLOCK_MATERIAL_TRANSPARENT !== 'undefined') {
        BLOCK_MATERIAL_TRANSPARENT.opacity = 0.80;
        BLOCK_MATERIAL_TRANSPARENT.color.setHex(0xb2ebf2);
      }
    } else {
      if (typeof resetWaterTile === 'function') {
        resetWaterTile();
      }
      if (typeof BLOCK_MATERIAL_TRANSPARENT !== 'undefined') {
        BLOCK_MATERIAL_TRANSPARENT.opacity = 0.72;
        BLOCK_MATERIAL_TRANSPARENT.color.setHex(0xffffff);
      }
    }

    // Gerencia nuvens volumétricas, abóbada atmosférica, halo solar/lunar e raios atmosféricos
    if (this.worldTime) {
      const showClouds = (preset === 'ultra' || preset === 'high' || preset === 'medium');
      if (this.worldTime.cloudMesh) this.worldTime.cloudMesh.visible = showClouds;
      if (this.worldTime.cloudMesh2) this.worldTime.cloudMesh2.visible = (preset === 'ultra');
      if (this.worldTime.skyDomeMesh) this.worldTime.skyDomeMesh.visible = (preset !== 'low');
      if (this.worldTime.sunGlowMesh) this.worldTime.sunGlowMesh.visible = (preset === 'ultra' || preset === 'high');
      if (this.worldTime.moonGlowMesh) this.worldTime.moonGlowMesh.visible = (preset === 'ultra' || preset === 'high');
      if (this.worldTime.sunBeamsGroup) this.worldTime.sunBeamsGroup.visible = (preset === 'ultra');
      if (this.worldTime.moonBeamsGroup) this.worldTime.moonBeamsGroup.visible = (preset === 'ultra');
    }

    // Gerencia sombras recebidas pelos chunks de terreno
    const enableTerrainShadows = (preset === 'ultra' || preset === 'high');
    if (this.world && this.world.chunks) {
      for (const chunk of this.world.chunks.values()) {
        if (chunk.opaqueMesh) {
          chunk.opaqueMesh.receiveShadow = enableTerrainShadows;
        }
      }
    }

    // Força atualização imediata da visibilidade dos chunks ao redor do jogador
    if (this.world && this.player) {
      this.world.updateChunkVisibility(this.player.position, this.renderDistance, true);
    }

    // Ajusta efeitos e densidade de partículas
    if (this.particles) {
      this.particles.applyPreset(preset);
    }

    if (save) {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('blockworld_graphics_preset', preset);
        }
      } catch (e) {}
    }
  }


  initThree() {
    // 1. Cena
    this.scene = new THREE.Scene();

    // Céu azul e névoa atmosférica estendida
    const skyColor = new THREE.Color(0x7db4f5);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.Fog(skyColor, 70, 170);

    // 2. Câmera com alcance ampliado para suportar visão dobrada
    const aspect = typeof window !== 'undefined' ? (window.innerWidth / window.innerHeight) : 1.33;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 400);
    this.scene.add(this.camera);

    // 3. Renderizador WebGL
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance'
    });
    if (typeof window !== 'undefined') {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.shadowMap.enabled = true;

      const container = document.getElementById('canvas-container');
      if (container) {
        container.appendChild(this.renderer.domElement);
      }
    }
  }

  initLights() {
    // Luz ambiente suave
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.40);
    this.scene.add(this.ambientLight);

    // Luz hemisférica (céu e chão)
    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x543d2b, 0.45);
    this.hemiLight.position.set(0, 60, 0);
    this.scene.add(this.hemiLight);

    // Luz solar direcional com ângulo natural e suporte a sombras
    this.sunLight = new THREE.DirectionalLight(0xfff7e6, 0.9);
    this.sunLight.position.set(45, 60, 30);
    this.sunLight.castShadow = true;
    if (this.sunLight.shadow) {
      this.sunLight.shadow.mapSize.width = 1024;
      this.sunLight.shadow.mapSize.height = 1024;
      this.sunLight.shadow.camera.near = 1.0;
      this.sunLight.shadow.camera.far = 280;
      this.sunLight.shadow.camera.left = -60;
      this.sunLight.shadow.camera.right = 60;
      this.sunLight.shadow.camera.top = 60;
      this.sunLight.shadow.camera.bottom = -60;
      this.sunLight.shadow.bias = -0.0005;
      this.sunLight.shadow.normalBias = 0.02;
      this.sunLight.shadow.radius = 1.0;
    }
    this.scene.add(this.sunLight);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Entra no jogo ativo com bloqueio do ponteiro
  enterGame() {
    this.state = 'PLAYING';
    this.input.requestPointerLock();
    this.ui.showInGameHUD();
  }

  // Resume o jogo a partir da tela de pausa
  resumeGame() {
    this.enterGame();
  }

  // Pausa o jogo
  pauseGame() {
    this.state = 'PAUSED';
    this.input.exitPointerLock();
    this.ui.showPauseMenu();
  }

  // Abre a tela de inventário (Criativo ou Sobrevivência)
  openInventory() {
    if (this.gameMode === 'creative') {
      this.state = 'CREATIVE_INVENTORY';
      this.input.exitPointerLock();
      this.ui.showCreativeInventory();
      return;
    }

    this.state = 'INVENTORY';
    this.input.exitPointerLock();
    this.ui.showInventory();
  }

  // Fecha o inventário / fornalha e retorna ao jogo
  closeInventory() {
    if (this.crafting) {
      this.crafting.returnGridItems(false);
    }
    if (this.inventory) {
      this.inventory.returnCursorItem();
    }
    if (this.furnace && this.furnace.currentFurnacePos) {
      this.furnace.closeUI();
      return;
    }
    this.enterGame();
  }

  // Abre a tela da Bancada de Trabalho 3x3
  openCraftingTable() {
    this.state = 'CRAFTING_TABLE';
    this.input.exitPointerLock();
    this.ui.showCraftingTable();
  }

  // Fecha a Bancada de Trabalho e retorna ao jogo
  closeCraftingTable() {
    if (this.crafting) {
      this.crafting.returnGridItems(true);
    }
    if (this.inventory) {
      this.inventory.returnCursorItem();
    }
    this.enterGame();
  }

  // Retorna à tela de mundos
  showWorldsMenu() {
    this.state = 'MENU';
    this.input.exitPointerLock();
    this.ui.showWorldsScreen();
  }

  // Loop de renderização e atualização física
  animate() {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.world) {
      // Processamento suave de chunks em segundo plano sem travar taxa de quadros
      if (this.world.processMeshQueue) {
        this.world.processMeshQueue(3);
      }

      if (this.state === 'PLAYING') {
        // Atualiza ciclo dia/noite e iluminação
        if (this.worldTime) {
          this.worldTime.update(dt);
        }

        // Atualiza jogador e física
        this.player.update(dt, this.input.keys);

        // Atualiza ações contínuas de input (segurar botões)
        if (this.input) {
          this.input.update(dt);
        }

        // Atualiza mineração progressiva
        if (this.mining) {
          this.mining.update(dt);
        }

        // Atualiza saúde e dano de queda
        if (this.health) {
          this.health.update(dt);
        }

        // Atualiza drops no mundo
        if (this.drops) {
          this.drops.update(dt);
        }

        // Atualiza processamento das fornalhas
        if (this.furnace) {
          this.furnace.update(dt);
        }

        // Atualiza entidades vivas (porcos e bandidos)
        if (this.entityManager) {
          this.entityManager.update(dt);
        }

        // Atualiza multiplayer e outros jogadores na sessão LAN
        if (this.multiplayer) {
          this.multiplayer.update(dt);
        }

        // Atualiza partículas e efeitos visuais
        if (this.particles) {
          this.particles.update(dt);
        }

        this.ui.update();
      } else if (
        this.state === 'INVENTORY' ||
        this.state === 'CREATIVE_INVENTORY' ||
        this.state === 'CRAFTING_TABLE' ||
        this.state === 'FURNACE' ||
        this.state === 'PAUSED'
      ) {
        // Continua rodando processos de fundo enquanto menus estão abertos
        if (this.worldTime) this.worldTime.update(dt);
        if (this.furnace) this.furnace.update(dt);
        if (this.drops) this.drops.update(dt);
        if (this.entityManager) this.entityManager.update(dt);
        if (this.multiplayer) this.multiplayer.update(dt);
        this.ui.update();
      }
    }

    // Atualiza animação de shaders de água se no preset Ultra
    if (this.graphicsPreset === 'ultra' && typeof updateWaterShimmer === 'function') {
      updateWaterShimmer(performance.now() * 0.001);
    }

    this.renderer.render(this.scene, this.camera);

  }
}

// Inicializa a aplicação
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
