// =============================================================================
// js/entities/entityManager.js - Gerenciador Central de Entidades Vivas (Porcos e Bandidos)
// =============================================================================

class EntityManager {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;

    this.entities = [];

    // Temporizador para verificações e spawn periódicos
    this.spawnCheckTimer = 0;

    // Regras obrigatórias de contagem mínima
    this.minPigs = 2;
    this.minBanditsNight = 2;
  }

  // Adiciona entidade à lista ativa
  addEntity(entity) {
    if (entity) {
      this.entities.push(entity);
    }
    return entity;
  }

  // Gera o spawn inicial no mundo (Garante ao menos 2 porcos imediatamente)
  initWorldEntities() {
    this.clearAll();

    // Garante no mínimo 2 porcos no mundo
    let pigsSpawned = 0;
    for (let attempts = 0; attempts < 40 && pigsSpawned < this.minPigs; attempts++) {
      const pos = this.findSafeSpawnNear(
        this.game.player ? this.game.player.position.x : 96,
        this.game.player ? this.game.player.position.z : 96,
        8, 32, 'grass'
      );
      if (pos) {
        this.addEntity(new Pig(pos.x, pos.y, pos.z, this.game));
        pigsSpawned++;
      }
    }
  }

  // Atualização por quadro
  update(dt) {
    if (!this.game.world || !this.game.player) return;

    const playerPos = this.game.player.position;
    const isNight = this.game.worldTime ? !this.game.worldTime.isDay : false;

    // Atualiza todas as entidades e remove as mortas
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const entity = this.entities[i];

      if (entity.isDead) {
        entity.dispose();
        this.entities.splice(i, 1);
        continue;
      }

      // Culling de processamento para entidades muito distantes (> 65 blocos)
      const distSq = entity.position.distanceToSquared(playerPos);
      if (distSq < 65 * 65) {
        entity.update(dt);
      }
    }

    // Verificação periódica de regras de spawn a cada 2.5 segundos
    this.spawnCheckTimer += dt;
    if (this.spawnCheckTimer >= 2.5) {
      this.spawnCheckTimer = 0;
      this.maintainEntityCounts(isNight, playerPos);
    }
  }

  // Mantém a quantidade mínima exigida de Porcos e Bandidos
  maintainEntityCounts(isNight, playerPos) {
    let pigCount = 0;
    let banditCount = 0;

    this.entities.forEach(e => {
      if (!e.isDead) {
        if (e instanceof Pig) pigCount++;
        else if (e instanceof Bandit) banditCount++;
      }
    });

    // 1. Garante ao menos 2 porcos
    if (pigCount < this.minPigs) {
      const pos = this.findSafeSpawnNear(playerPos.x, playerPos.z, 12, 35, 'grass');
      if (pos) {
        this.addEntity(new Pig(pos.x, pos.y, pos.z, this.game));
      }
    }

    // 2. Garante ao menos 2 bandidos durante a noite
    if (isNight) {
      if (banditCount < this.minBanditsNight) {
        const pos = this.findSafeSpawnNear(playerPos.x, playerPos.z, 15, 38, 'solid');
        if (pos) {
          this.addEntity(new Bandit(pos.x, pos.y, pos.z, this.game));
        }
      }
    }
  }

  // Encontra posição segura de spawn sobre bloco sólido com 2 blocos de ar acima
  findSafeSpawnNear(centerX, centerZ, minRadius, maxRadius, surfaceReq = 'solid') {
    const world = this.game.world;
    if (!world) return null;

    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = minRadius + Math.random() * (maxRadius - minRadius);
      const tx = Math.floor(centerX + Math.cos(angle) * dist);
      const tz = Math.floor(centerZ + Math.sin(angle) * dist);

      if (tx < 4 || tx >= world.sizeX - 4 || tz < 4 || tz >= world.sizeZ - 4) continue;

      // Busca altura da coluna de cima para baixo
      for (let y = world.sizeY - 4; y >= 6; y--) {
        const groundBlock = world.getBlock(tx, y, tz);
        const air1 = world.getBlock(tx, y + 1, tz);
        const air2 = world.getBlock(tx, y + 2, tz);

        if (air1 === BLOCK_AIR && air2 === BLOCK_AIR && groundBlock !== BLOCK_AIR && groundBlock !== BLOCK_WATER) {
          if (surfaceReq === 'grass' && groundBlock !== BLOCK_GRASS) {
            continue; // Exige grama para porcos
          }
          return { x: tx + 0.5, y: y + 1.05, z: tz + 0.5 };
        }
      }
    }
    return null;
  }

  /**
   * Raycast de combate: detecta se a mira do jogador intersecta alguma entidade à frente
   * Alcance padrão: 3.2 metros (Requisito 39)
   */
  findEntityInCrosshair(rayOrigin, rayDir, maxDistance = 3.2) {
    let closestEntity = null;
    let closestDist = maxDistance;

    const eyePos = new THREE.Vector3(rayOrigin.x, rayOrigin.y, rayOrigin.z);
    const dir = new THREE.Vector3(rayDir.x, rayDir.y, rayDir.z).normalize();

    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      if (e.isDead) continue;

      // Centro do corpo da entidade
      const targetCenter = new THREE.Vector3(
        e.position.x,
        e.position.y + e.height * 0.5,
        e.position.z
      );

      // Vetor da câmera até o centro da entidade
      const toEntity = targetCenter.clone().sub(eyePos);
      const projDist = toEntity.dot(dir);

      // Deve estar na frente da câmera e dentro do alcance
      if (projDist > 0 && projDist <= maxDistance) {
        // Ponto mais próximo no raio de visão
        const closestPointOnRay = eyePos.clone().add(dir.clone().multiplyScalar(projDist));
        const lateralDist = closestPointOnRay.distanceTo(targetCenter);

        // Raio de colisão da entidade (~0.55m)
        const hitRadius = Math.max(e.halfWidth, e.height * 0.45);
        if (lateralDist <= hitRadius && projDist < closestDist) {
          closestDist = projDist;
          closestEntity = e;
        }
      }
    }

    return closestEntity;
  }

  clearAll() {
    for (let i = 0; i < this.entities.length; i++) {
      this.entities[i].dispose();
    }
    this.entities = [];
  }
}

window.EntityManager = EntityManager;
