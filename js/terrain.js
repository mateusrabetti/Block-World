// =============================================================================
// js/terrain.js - Gerador Procedural com Seed, Biomas, Árvores e Minérios
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

    // Tabela de permutação para 2D Perlin Noise
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

  // Gradiente suave para Perlin Noise
  grad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  // 2D Perlin Noise retornando valor entre -1.0 e 1.0
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

    const x1 = this.grad(aa, xf, yf) * (1 - u) + this.grad(ba, xf - 1, yf) * u;
    const x2 = this.grad(ab, xf, yf - 1) * (1 - u) + this.grad(bb, xf - 1, yf - 1) * u;

    return x1 * (1 - v) + x2 * v;
  }

  // Ruído fractal (múltiplas oitavas)
  fractalNoise(x, z, octaves = 4, persistence = 0.5, scale = 0.02) {
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
    // Ruído de bioma em grande escala
    const b = this.noise2D(x * 0.008 + 100, z * 0.008 + 100);

    if (b < -0.28) {
      return 'DESERT';     // Areia, sem árvores
    } else if (b < 0.12) {
      return 'PLAINS';     // Grama, poucas árvores, terreno suave
    } else if (b < 0.42) {
      return 'FOREST';     // Grama, muitas árvores
    } else {
      return 'MOUNTAIN';   // Pedra alta, picos
    }
  }

  // Altura base do terreno na coordenada (x, z)
  getHeight(x, z) {
    const biome = this.getBiome(x, z);

    // Ruído base suave
    const base = this.fractalNoise(x, z, 3, 0.5, 0.015);

    // Ruído fino de relevo
    const detail = this.noise2D(x * 0.06, z * 0.06) * 0.8;

    let height = 12 + base * 5 + detail;

    if (biome === 'DESERT') {
      // Dunas suaves
      const dunes = Math.sin(x * 0.08) * 1.5 + Math.cos(z * 0.08) * 1.5;
      height = 11 + (base * 2.5) + dunes;
    } else if (biome === 'PLAINS') {
      // Planície suave
      height = 12 + base * 3 + detail * 0.5;
    } else if (biome === 'FOREST') {
      // Pequenas colinas
      height = 13 + base * 4 + detail;
    } else if (biome === 'MOUNTAIN') {
      // Montanhas mais altas
      const mBase = Math.max(0, this.fractalNoise(x + 50, z + 50, 4, 0.55, 0.025));
      height = 15 + mBase * 12 + detail;
    }

    return Math.max(3, Math.min(28, Math.round(height)));
  }

  // Pseudo-aleatório local determinístico para veios de minérios e árvores
  localHash(x, y, z, offset = 0) {
    const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + (this.seed + offset) * 0.01) * 43758.5453;
    return n - Math.floor(n);
  }
}
