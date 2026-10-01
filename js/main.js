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
    this.crafting = new CraftingController(this);
    this.mining = new MiningSystem(this);
    this.physics = new Physics();
    this.player = new Player(this.camera, null, this.physics, this.scene, this.inventory);
    this.health = new HealthSystem(this);
    this.worldManager = new WorldManager(this);
    this.ui = new UI(this);
    this.input = new Input(this);

    // Ajusta o redimensionamento da janela
    window.addEventListener('resize', () => this.onWindowResize());

    // Mostra o Menu Principal na inicialização
    this.ui.showMainMenu();

    // Inicia o loop de renderização contínua
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    // 1. Cena
    this.scene = new THREE.Scene();

    // Céu azul e névoa atmosférica estendida para o mundo de 128x128
    const skyColor = new THREE.Color(0x7db4f5);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.Fog(skyColor, 40, 85);

    // 2. Câmera
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 150);

    // 3. Renderizador WebGL
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const container = document.getElementById('canvas-container');
    container.appendChild(this.renderer.domElement);
  }

  initLights() {
    // Luz ambiente suave
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(ambientLight);

    // Luz hemisférica (céu e chão)
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x543d2b, 0.45);
    hemiLight.position.set(0, 60, 0);
    this.scene.add(hemiLight);

    // Luz solar direcional com ângulo natural
    const sunLight = new THREE.DirectionalLight(0xfff7e6, 0.9);
    sunLight.position.set(45, 60, 30);
    this.scene.add(sunLight);
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

  // Abre a tela de inventário
  openInventory() {
    this.state = 'INVENTORY';
    this.input.exitPointerLock();
    this.ui.showInventory();
  }

  // Fecha o inventário e retorna ao jogo
  closeInventory() {
    if (this.crafting) {
      this.crafting.returnGridItems(false);
    }
    if (this.inventory) {
      this.inventory.returnCursorItem();
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

    if (this.state === 'PLAYING' && this.world) {
      this.player.update(dt, this.input.keys);

      // Atualiza mineração progressiva
      if (this.mining) {
        this.mining.update(dt);
      }

      // Atualiza saúde e dano de queda
      if (this.health) {
        this.health.update(dt);
      }

      this.ui.update();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Inicializa a aplicação
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
