// =============================================================================
// js/entities/pig.js - Animal Passivo: Porco Voxel 3D com Olhos, Focinho e Pernas
// =============================================================================

class Pig extends Entity {
  constructor(x, y, z, game) {
    super(x, y, z, game);

    this.maxHealth = 10;
    this.health = 10;

    this.width = 0.8;
    this.height = 0.85;
    this.halfWidth = this.width / 2;

    // Inteligência Artificial (Wander / Passeio)
    this.stateTimer = 1.0 + Math.random() * 2.5;
    this.isWalking = false;
    this.moveSpeed = 1.6;
    this.walkAnimTime = Math.random() * 10;

    // Partes articuladas do modelo
    this.legs = [];
    this.head = null;

    this.buildModel();
  }

  buildModel() {
    const pinkColor = 0xf59ea0;      // Rosa principal do porco
    const darkPinkColor = 0xe07278;  // Rosa escuro para focinho e orelhas
    const hoofColor = 0x5a3e36;      // Casco escuro

    const matPink = new THREE.MeshLambertMaterial({ color: pinkColor });
    const matDarkPink = new THREE.MeshLambertMaterial({ color: darkPinkColor });
    const matHoof = new THREE.MeshLambertMaterial({ color: hoofColor });
    const matWhite = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const matBlack = new THREE.MeshLambertMaterial({ color: 0x111111 });

    // 1. Corpo principal retangular
    const bodyGeom = new THREE.BoxGeometry(0.72, 0.54, 1.05);
    const bodyMesh = new THREE.Mesh(bodyGeom, matPink);
    bodyMesh.position.set(0, 0.45, 0);
    this.mesh.add(bodyMesh);

    // 2. Cabeça com orelhas, olhos e focinho
    this.head = new THREE.Group();
    this.head.position.set(0, 0.56, 0.58);

    const headGeom = new THREE.BoxGeometry(0.48, 0.44, 0.46);
    const headMesh = new THREE.Mesh(headGeom, matPink);
    this.head.add(headMesh);

    // Focinho 3D saliente à frente
    const snoutGeom = new THREE.BoxGeometry(0.26, 0.16, 0.14);
    const snoutMesh = new THREE.Mesh(snoutGeom, matDarkPink);
    snoutMesh.position.set(0, -0.06, 0.28);
    this.head.add(snoutMesh);

    // Narinas do focinho
    const nostrilGeom = new THREE.BoxGeometry(0.045, 0.06, 0.02);
    const nostrilL = new THREE.Mesh(nostrilGeom, matBlack);
    nostrilL.position.set(-0.06, -0.06, 0.355);
    const nostrilR = new THREE.Mesh(nostrilGeom, matBlack);
    nostrilR.position.set(0.06, -0.06, 0.355);
    this.head.add(nostrilL);
    this.head.add(nostrilR);

    // Olhos visíveis (Branco + Pupila Preta)
    const eyeWhiteGeom = new THREE.BoxGeometry(0.09, 0.08, 0.02);
    const eyePupilGeom = new THREE.BoxGeometry(0.045, 0.08, 0.025);

    // Olho Esquerdo
    const eyeWhiteL = new THREE.Mesh(eyeWhiteGeom, matWhite);
    eyeWhiteL.position.set(-0.21, 0.08, 0.235);
    const eyePupilL = new THREE.Mesh(eyePupilGeom, matBlack);
    eyePupilL.position.set(-0.23, 0.08, 0.24);
    this.head.add(eyeWhiteL);
    this.head.add(eyePupilL);

    // Olho Direito
    const eyeWhiteR = new THREE.Mesh(eyeWhiteGeom, matWhite);
    eyeWhiteR.position.set(0.21, 0.08, 0.235);
    const eyePupilR = new THREE.Mesh(eyePupilGeom, matBlack);
    eyePupilR.position.set(0.23, 0.08, 0.24);
    this.head.add(eyeWhiteR);
    this.head.add(eyePupilR);

    // Orelhas
    const earGeom = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const earL = new THREE.Mesh(earGeom, matDarkPink);
    earL.position.set(-0.24, 0.22, 0.08);
    const earR = new THREE.Mesh(earGeom, matDarkPink);
    earR.position.set(0.24, 0.22, 0.08);
    this.head.add(earL);
    this.head.add(earR);

    this.mesh.add(this.head);

    // 3. Quatro Pernas com cascos
    const legPositions = [
      [-0.24, 0.20, 0.35],  // Dianteira Esquerda
      [0.24, 0.20, 0.35],   // Dianteira Direita
      [-0.24, 0.20, -0.35], // Traseira Esquerda
      [0.24, 0.20, -0.35]   // Traseira Direita
    ];

    for (let i = 0; i < 4; i++) {
      const legGroup = new THREE.Group();
      legGroup.position.set(legPositions[i][0], legPositions[i][1], legPositions[i][2]);

      const legGeom = new THREE.BoxGeometry(0.18, 0.38, 0.18);
      const legMesh = new THREE.Mesh(legGeom, matPink);
      legMesh.position.set(0, -0.06, 0);
      legGroup.add(legMesh);

      const hoofGeom = new THREE.BoxGeometry(0.182, 0.08, 0.182);
      const hoofMesh = new THREE.Mesh(hoofGeom, matHoof);
      hoofMesh.position.set(0, -0.21, 0);
      legGroup.add(hoofMesh);

      this.mesh.add(legGroup);
      this.legs.push(legGroup);
    }
  }

  // Dropar Carne de Porco ao morrer (100% de pelo menos 1, com chance de 2)
  dropItems() {
    if (!this.game.drops) return;

    // 1 carne garantida (100%), chance de 50% de dropar uma segunda carne
    const meatCount = Math.random() < 0.5 ? 2 : 1;

    this.game.drops.spawnDrop(
      this.position.x,
      this.position.y + 0.3,
      this.position.z,
      ITEM_PORKCHOP,
      meatCount
    );

    if (this.game.ui) {
      this.game.ui.showToast(`O porco dropou ${meatCount} carne(s)!`);
    }
  }

  update(dt) {
    super.update(dt);
    if (this.isDead) return;

    // Atualização da IA Simples de Perambulação
    this.stateTimer -= dt;
    if (this.stateTimer <= 0) {
      if (this.isWalking) {
        // Para para descansar
        this.isWalking = false;
        this.stateTimer = 1.5 + Math.random() * 3.0;
        this.velocity.x = 0;
        this.velocity.z = 0;
      } else {
        // Começa a andar em direção aleatória
        this.isWalking = true;
        this.stateTimer = 2.0 + Math.random() * 4.0;
        this.yaw += (Math.random() - 0.5) * Math.PI;
      }
    }

    if (this.isWalking) {
      this.walkAnimTime += dt * 8.5;
      const fwdX = Math.sin(this.yaw);
      const fwdZ = Math.cos(this.yaw);

      this.velocity.x = fwdX * this.moveSpeed;
      this.velocity.z = fwdZ * this.moveSpeed;

      // Pulinho automático para subir 1 bloco de altura se estiver preso
      if (this.onGround) {
        const nextX = this.position.x + fwdX * 0.4;
        const nextZ = this.position.z + fwdZ * 0.4;
        const bx = Math.floor(nextX);
        const by = Math.floor(this.position.y);
        const bz = Math.floor(nextZ);
        if (this.game.world && this.game.world.isSolid(bx, by, bz) && !this.game.world.isSolid(bx, by + 1, bz)) {
          this.velocity.y = 5.2;
        }
      }

      // Animação das 4 pernas alternadas
      if (this.legs.length === 4) {
        const legAngle = Math.sin(this.walkAnimTime) * 0.55;
        this.legs[0].rotation.x = legAngle;
        this.legs[1].rotation.x = -legAngle;
        this.legs[2].rotation.x = -legAngle;
        this.legs[3].rotation.x = legAngle;
      }
    } else {
      // Reseta pernas suavemente para posição de repouso
      this.legs.forEach(leg => {
        leg.rotation.x *= Math.pow(0.1, dt);
      });
    }

    // Física e colisão
    this.updatePhysics(dt);

    // Sincroniza posição e rotação do modelo 3D
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.yaw;
  }
}

window.Pig = Pig;
