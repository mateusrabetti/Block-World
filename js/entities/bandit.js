// =============================================================================
// js/entities/bandit.js - Monstro Hostil Noturno: Bandido Voxel Humanoide
// =============================================================================

class Bandit extends Entity {
  constructor(x, y, z, game) {
    super(x, y, z, game);

    this.maxHealth = 15;
    this.health = 15;

    this.width = 0.6;
    this.height = 1.8;
    this.halfWidth = this.width / 2;

    // IA Hostil e Perseguição
    this.detectRange = 22.0;   // Raio de visão para perseguir o jogador
    this.attackRange = 1.65;   // Distância máxima para deferir golpe
    this.attackCooldown = 1.2; // 1.2s entre ataques sucessivos
    this.attackTimer = 0;
    this.moveSpeed = 2.4;
    this.walkAnimTime = 0;

    // Partes articuladas do modelo humanoide
    this.leftArm = null;
    this.rightArm = null;
    this.leftLeg = null;
    this.rightLeg = null;

    this.buildModel();
  }

  buildModel() {
    // Skin preta e sombria com máscara/capuz
    const blackColor = 0x18181b;     // Preto escuro quase carvão
    const darkGrayColor = 0x27272a;  // Cinza escuro para detalhes de roupas
    const redEyeColor = 0xef4444;    // Olhos vermelhos ameaçadores

    const matBlack = new THREE.MeshLambertMaterial({ color: blackColor });
    const matDarkGray = new THREE.MeshLambertMaterial({ color: darkGrayColor });
    const matRedEyes = new THREE.MeshBasicMaterial({ color: redEyeColor });

    // 1. Tronco / Corpo humanoide
    const torsoGeom = new THREE.BoxGeometry(0.52, 0.72, 0.28);
    const torsoMesh = new THREE.Mesh(torsoGeom, matBlack);
    torsoMesh.position.set(0, 1.05, 0);
    this.mesh.add(torsoMesh);

    // 2. Cabeça com olhos vermelhos brilhantes
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.62, 0);

    const headGeom = new THREE.BoxGeometry(0.44, 0.44, 0.44);
    const headMesh = new THREE.Mesh(headGeom, matDarkGray);
    headGroup.add(headMesh);

    // Olhos vermelhos ameaçadores da noite
    const eyeGeom = new THREE.BoxGeometry(0.08, 0.05, 0.02);
    const leftEye = new THREE.Mesh(eyeGeom, matRedEyes);
    leftEye.position.set(-0.11, 0.04, 0.225);
    const rightEye = new THREE.Mesh(eyeGeom, matRedEyes);
    rightEye.position.set(0.11, 0.04, 0.225);
    headGroup.add(leftEye);
    headGroup.add(rightEye);

    this.mesh.add(headGroup);

    // 3. Braços articulados
    const armGeom = new THREE.BoxGeometry(0.20, 0.68, 0.20);

    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.36, 1.34, 0);
    const lArmMesh = new THREE.Mesh(armGeom, matBlack);
    lArmMesh.position.set(0, -0.30, 0);
    this.leftArm.add(lArmMesh);
    this.mesh.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.36, 1.34, 0);
    const rArmMesh = new THREE.Mesh(armGeom, matBlack);
    rArmMesh.position.set(0, -0.30, 0);
    this.rightArm.add(rArmMesh);
    this.mesh.add(this.rightArm);

    // 4. Pernas articuladas
    const legGeom = new THREE.BoxGeometry(0.22, 0.68, 0.22);

    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.14, 0.68, 0);
    const lLegMesh = new THREE.Mesh(legGeom, matBlack);
    lLegMesh.position.set(0, -0.34, 0);
    this.leftLeg.add(lLegMesh);
    this.mesh.add(this.leftLeg);

    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.14, 0.68, 0);
    const rLegMesh = new THREE.Mesh(legGeom, matBlack);
    rLegMesh.position.set(0, -0.34, 0);
    this.rightLeg.add(rLegMesh);
    this.mesh.add(this.rightLeg);
  }

  update(dt) {
    super.update(dt);
    if (this.isDead) return;

    // Regra: Bandidos desaparecem na transição para o dia (Requisito 57)
    if (this.game.worldTime && this.game.worldTime.isDay) {
      this.despawnAtDawn();
      return;
    }

    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
    }

    const player = this.game.player;
    if (!player) return;

    // Vetor em direção ao jogador
    const dx = player.position.x - this.position.x;
    const dy = player.position.y - this.position.y;
    const dz = player.position.z - this.position.z;
    const distHoriz = Math.sqrt(dx * dx + dz * dz);
    const totalDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Persegue o jogador se estiver dentro do raio de detecção
    if (distHoriz < this.detectRange && Math.abs(dy) < 8) {
      // Rotaciona na direção do jogador
      this.yaw = Math.atan2(dx, dz);

      if (distHoriz > this.attackRange) {
        // Anda na direção do jogador
        this.walkAnimTime += dt * 9.0;
        const dirX = dx / distHoriz;
        const dirZ = dz / distHoriz;

        this.velocity.x = dirX * this.moveSpeed;
        this.velocity.z = dirZ * this.moveSpeed;

        // Pula obstáculo de 1 bloco de altura se estiver colidindo à frente
        if (this.onGround) {
          const nextX = this.position.x + dirX * 0.45;
          const nextZ = this.position.z + dirZ * 0.45;
          const bx = Math.floor(nextX);
          const by = Math.floor(this.position.y);
          const bz = Math.floor(nextZ);
          if (this.game.world && this.game.world.isSolid(bx, by, bz) && !this.game.world.isSolid(bx, by + 1, bz) && !this.game.world.isSolid(bx, by + 2, bz)) {
            this.velocity.y = 5.6;
          }
        }
      } else {
        // Parado ao alcance de ataque
        this.velocity.x = 0;
        this.velocity.z = 0;

        // Ataque do Bandido: exatamente 3 de dano (Requisito 55) com cooldown (Requisito 56)
        if (this.attackTimer <= 0) {
          this.performAttack(player);
          this.attackTimer = this.attackCooldown;
        }
      }
    } else {
      // Fora de alcance: parado
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    // Animação de caminhada de braços e pernas
    if (Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.z) > 0.1) {
      const legAngle = Math.sin(this.walkAnimTime) * 0.6;
      if (this.leftLeg) this.leftLeg.rotation.x = legAngle;
      if (this.rightLeg) this.rightLeg.rotation.x = -legAngle;
      if (this.leftArm) this.leftArm.rotation.x = -legAngle * 0.7;
      if (this.rightArm) this.rightArm.rotation.x = legAngle * 0.7;
    } else {
      if (this.leftLeg) this.leftLeg.rotation.x *= Math.pow(0.1, dt);
      if (this.rightLeg) this.rightLeg.rotation.x *= Math.pow(0.1, dt);
      if (this.leftArm) this.leftArm.rotation.x *= Math.pow(0.1, dt);
      if (this.rightArm) this.rightArm.rotation.x *= Math.pow(0.1, dt);
    }

    // Física e colisão
    this.updatePhysics(dt);

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.yaw;
  }

  // Executa o ataque ao jogador
  performAttack(player) {
    // Animação de soco rápido com o braço direito
    if (this.rightArm) {
      this.rightArm.rotation.x = -1.2;
      setTimeout(() => {
        if (this.rightArm) this.rightArm.rotation.x = 0;
      }, 180);
    }

    // Causa exatamente 3 de dano (1 coração e meio)
    if (this.game.health) {
      this.game.health.takeDamage(3, 'bandit');
    }
  }

  // Desaparece ao amanhecer com efeito suave
  despawnAtDawn() {
    this.isDead = true;
    this.dispose();
  }
}

window.Bandit = Bandit;
