// =============================================================================
// js/terrain.js - Gerador Procedural com Seed, Biomas Ricos, Relevo 3D e Cavernas
// =============================================================================

class TerrainGenerator {
  constructor(seed = 12345) {
    this.seed = this.parseSeed(seed);
    this.initNoise();
  }

  parseSeed(seed) {
    if (typeof seed === 'number' && !isNaN(seed)) {
      return seed | 0;
    }
    const num = Number(seed);
    if (!isNaN(num) && isFinite(num) && String(seed).trim() !== '') {
      return (num | 0);
    }
    const str = String(seed || '12345');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  initNoise() {
    // Gerador determinístico Mulberry32
    let s = this.seed;
    const rng = () => {
      let t = s += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // Tabela de permutação para 2D e 3D Perlin Noise
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  // Gradiente 2D
  grad2D(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  // Gradiente 3D para cavernas
  grad3D(hash, x, y, z) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  // 2D Perlin Noise (-1.0 a 1.0)
  noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.perm[this.perm[X] + Y];
    const ab = this.perm[this.perm[X] + Y + 1];
    const ba = this.perm[this.perm[X + 1] + Y];
    const bb = this.perm[this.perm[X + 1] + Y + 1];

    const x1 = this.grad2D(aa, xf, yf) * (1 - u) + this.grad2D(ba, xf - 1, yf) * u;
    const x2 = this.grad2D(ab, xf, yf - 1) * (1 - u) + this.grad2D(bb, xf - 1, yf - 1) * u;

    return x1 * (1 - v) + x2 * v;
  }

  // 3D Perlin Noise (-1.0 a 1.0) para geração tridimensional de cavernas
  noise3D(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);

    const u = this.fade(xf);
    const v = this.fade(yf);
    const w = this.fade(zf);

    const a = this.perm[X] + Y;
    const aa = this.perm[a] + Z;
    const ab = this.perm[a + 1] + Z;
    const b = this.perm[X + 1] + Y;
    const ba = this.perm[b] + Z;
    const bb = this.perm[b + 1] + Z;

    const c00 = this.grad3D(this.perm[aa], xf, yf, zf) * (1 - u) + this.grad3D(this.perm[ba], xf - 1, yf, zf) * u;
    const c01 = this.grad3D(this.perm[ab], xf, yf - 1, zf) * (1 - u) + this.grad3D(this.perm[bb], xf - 1, yf - 1, zf) * u;
    const c10 = this.grad3D(this.perm[aa + 1], xf, yf, zf - 1) * (1 - u) + this.grad3D(this.perm[ba + 1], xf - 1, yf, zf - 1) * u;
    const c11 = this.grad3D(this.perm[ab + 1], xf, yf - 1, zf - 1) * (1 - u) + this.grad3D(this.perm[bb + 1], xf - 1, yf - 1, zf - 1) * u;

    const c0 = c00 * (1 - v) + c01 * v;
    const c1 = c10 * (1 - v) + c11 * v;

    return c0 * (1 - w) + c1 * w;
  }

  // Ruído fractal (múltiplas oitavas)
  fractalNoise(x, z, octaves = 4, persistence = 0.5, scale = 0.015) {
    let total = 0;
    let freq = scale;
    let amp = 1;
    let maxAmp = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * freq, z * freq) * amp;
      maxAmp += amp;
      amp *= persistence;
      freq *= 2;
    }
    return total / maxAmp;
  }

  // Determina o bioma na coordenada (x, z)
  getBiome(x, z) {
    // Ruído de bioma suave com transições amplas
    const b = this.noise2D(x * 0.007 + 73.1, z * 0.007 + 149.3);

    if (b < -0.28) {
      return 'DESERT';     // Areia, dunas, sem árvores
    } else if (b < 0.10) {
      return 'PLAINS';     // Grama, terreno aberto, poucas árvores
    } else if (b < 0.38) {
      return 'FOREST';     // Colinas, muitas árvores
    } else {
      return 'MOUNTAIN';   // Terreno montanhoso elevado, picos de pedra
    }
  }

  // Altura base do terreno na coordenada (x, z) com relevo rico e variado
  getHeight(x, z) {
    const biome = this.getBiome(x, z);

    // Ruído base continental suave
    const base = this.fractalNoise(x, z, 4, 0.5, 0.012);

    // Relevo fino e ondulações médias
    const midDetail = this.noise2D(x * 0.03, z * 0.03) * 1.5;
    const fineDetail = this.noise2D(x * 0.08, z * 0.08) * 0.8;

    let height = 18 + base * 6 + midDetail + fineDetail;

    if (biome === 'DESERT') {
      // Dunas sinuosas com cristas suaves e depressões secas
      const dunes = Math.sin(x * 0.06 + base * 2) * 2.2 + Math.cos(z * 0.06 - base * 2) * 1.8;
      height = 17 + (base * 4) + dunes + fineDetail * 0.5;
    } else if (biome === 'PLAINS') {
      // Planície suave com colinas onduladas e vales calmos
      height = 18 + base * 4 + midDetail * 0.6 + fineDetail * 0.4;
    } else if (biome === 'FOREST') {
      // Terreno irregular, colinas florestadas e encostas
      const hillNoise = Math.max(0, this.noise2D(x * 0.025 + 40, z * 0.025 + 80)) * 5.0;
      height = 20 + base * 5 + hillNoise + fineDetail;
    } else if (biome === 'MOUNTAIN') {
      // Montanhas imponentes: picos pontiagudos, encostas rochosas íngremes e vales profundos
      const ridgeNoise = 1.0 - Math.abs(this.fractalNoise(x + 120, z + 80, 4, 0.55, 0.018));
      const mBase = Math.max(0, this.fractalNoise(x + 50, z + 50, 4, 0.6, 0.015));
      height = 24 + (mBase * 14) + (ridgeNoise * 10) + midDetail;
    }

    // Limites de segurança para altura (nível do mar é 16, mundo vai até 48)
    return Math.max(4, Math.min(44, Math.round(height)));
  }

  /**
   * Determina se uma posição subterrânea (x, y, z) faz parte de uma caverna procedural.
   * Cria túneis sinuosos (worms), corredores, salões subterrâneos e entradas naturais.
   */
  isCave(x, y, z, groundHeight, biome) {
    // Não perfurar a camada de bedrock (y <= 1)
    if (y <= 1) return false;

    // Cavernas só existem abaixo do topo do terreno (com exceção de entradas em montanhas)
    if (y >= groundHeight) return false;

    // Não cavar diretamente abaixo da água para não drenar lagoas
    if (groundHeight <= 17 && y >= groundHeight - 2) return false;

    // Escala para os túneis de caverna (worms tridimensionais)
    const scale = 0.048;
    const n1 = this.noise3D(x * scale, y * (scale * 1.25), z * scale);
    const n2 = this.noise3D((x + 128.5) * scale, (y + 64.2) * (scale * 1.25), (z + 128.5) * scale);

    // Distância radial no espaço de ruído para formar tubos 3D
    const tunnelDist = n1 * n1 + n2 * n2;

    // Salões e câmaras maiores usando ruído de baixa frequência
    const roomNoise = this.noise3D(x * 0.028 + 200, y * 0.035, z * 0.028 + 200);
    const isBigChamber = (roomNoise > 0.58 && y < groundHeight - 4);

    // Limiar de túnel padrão (quanto menor, mais estreito)
    let threshold = 0.038;

    // Regiões profundas (Y: 2 a 14) têm cavernas mais amplas e interconectadas
    if (y <= 14) {
      threshold = 0.046;
    }

    // Cavernas próximas à superfície:
    // Em montanhas e colinas altas, permite que túneis quebrem na encosta criando ENTRADAS NATURAIS!
    if (y >= groundHeight - 3) {
      if (biome === 'MOUNTAIN' && groundHeight > 25) {
        // Entrada de caverna natural nas montanhas
        return tunnelDist < 0.032;
      } else if (biome === 'FOREST' && groundHeight > 23 && y === groundHeight - 1) {
        // Raras aberturas em colinas florestadas
        return tunnelDist < 0.022;
      }
      return false; // Mantém a superfície selada em planícies e desertos
    }

    return (tunnelDist < threshold) || isBigChamber;
  }

  // Pseudo-aleatório local determinístico para veios de minérios e árvores
  localHash(x, y, z, offset = 0) {
    const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + (this.seed + offset) * 0.01) * 43758.5453;
    return n - Math.floor(n);
  }
}
