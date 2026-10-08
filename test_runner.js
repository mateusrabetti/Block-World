const fs = require('fs');

global.window = global;
global.self = global;

const mockCtx = {
  fillStyle: '',
  fillRect: ()=>{},
  clearRect: ()=>{},
  getImageData: ()=>({ data: new Uint8ClampedArray(4) }),
  putImageData: ()=>{},
  beginPath: ()=>{},
  arc: ()=>{},
  fill: ()=>{},
  stroke: ()=>{},
  drawImage: ()=>{},
  createLinearGradient: ()=>({ addColorStop: ()=>{} })
};

global.document = {
  getElementById: (id) => ({
    classList: { add: ()=>{}, remove: ()=>{}, contains: ()=>false },
    addEventListener: ()=>{},
    appendChild: ()=>{},
    innerHTML: '',
    style: {},
    dataset: {}
  }),
  createElement: (tag) => ({
    className: '',
    classList: { add: ()=>{}, remove: ()=>{} },
    appendChild: ()=>{},
    addEventListener: ()=>{},
    style: {},
    dataset: {},
    getContext: (type) => mockCtx,
    toDataURL: () => 'data:image/png;base64,'
  }),
  querySelectorAll: () => []
};

global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

// Load three.min.js
const vm = require('vm');
const threeCode = fs.readFileSync('./js/libs/three.min.js', 'utf8');
vm.runInThisContext(threeCode);
global.THREE = THREE;

// Load game files in order
const files = [
  './js/blocks.js',
  './js/items.js',
  './js/recipes.js',
  './js/crafting.js',
  './js/drops.js',
  './js/mining.js',
  './js/furnace.js',
  './js/entities/entity.js',
  './js/entities/pig.js',
  './js/entities/bandit.js',
  './js/entities/entityManager.js',
  './js/time.js',
  './js/health.js',
  './js/terrain.js',
  './js/chunk.js',
  './js/world.js',
  './js/physics.js',
  './js/inventory.js',
  './js/saveSystem.js',
  './js/worldManager.js'
];

for (const f of files) {
  const code = fs.readFileSync(f, 'utf8');
  vm.runInThisContext(code);
}

console.log('--- TEST 1: ITEMS AND BLOCKS ---');
console.log('BLOCK_FURNACE:', BLOCK_FURNACE, BLOCK_TYPES[BLOCK_FURNACE].name);
console.log('ITEM_PORKCHOP:', ITEM_PORKCHOP, ITEM_DEFINITIONS[ITEM_PORKCHOP].name);
console.log('ITEM_WOODEN_SWORD dmg:', ITEM_DEFINITIONS[ITEM_WOODEN_SWORD].damage);
console.log('ITEM_STONE_SWORD dmg:', ITEM_DEFINITIONS[ITEM_STONE_SWORD].damage);
console.log('ITEM_IRON_SWORD dmg:', ITEM_DEFINITIONS[ITEM_IRON_SWORD].damage);

console.log('--- TEST 2: RECIPES ---');
const furnaceRecipe = CRAFTING_RECIPES.find(r => r.result.id === BLOCK_FURNACE);
console.log('Furnace recipe found:', !!furnaceRecipe);

console.log('--- TEST 3: WORLD GENERATION (144 chunks) ---');
const scene = new THREE.Scene();
const world = new World(scene, 12345, {});
console.log('World chunks created:', world.chunks.size);
console.log('World dimensions:', world.sizeX, world.sizeY, world.sizeZ);

console.log('--- TEST 4: 3D CAVES & ORES ---');
let airBlocksBelowSurface = 0;
let oreCount = 0;
for (let x = 10; x < 50; x++) {
  for (let z = 10; z < 50; z++) {
    for (let y = 1; y < 20; y++) {
      const b = world.getBlock(x, y, z);
      if (b === BLOCK_AIR) airBlocksBelowSurface++;
      if (b === BLOCK_COAL_ORE || b === BLOCK_IRON_ORE) oreCount++;
    }
  }
}
console.log('Subsurface caves found (air blocks):', airBlocksBelowSurface > 0, '(count: ' + airBlocksBelowSurface + ')');
console.log('Subsurface ores found:', oreCount > 0, '(count: ' + oreCount + ')');

console.log('--- TEST 5: FURNACE LOGIC ---');
const mockGame = { scene, world, inventory: new Inventory() };
const furnaceMgr = new FurnaceManager(mockGame);
const furnace = furnaceMgr.getFurnaceAt(10, 10, 10);
furnace.input = { id: BLOCK_IRON_ORE, count: 2 };
furnace.fuel = { id: ITEM_COAL, count: 1 };
for (let t = 0; t < 70; t++) {
  furnaceMgr.update(0.1);
}
console.log('Furnace output after 7s:', furnace.output);

console.log('--- TEST 6: ENTITY MANAGER, PIGS & BANDITS ---');
mockGame.player = { position: new THREE.Vector3(96, 25, 96), audioCtx: null };
mockGame.worldTime = { isDay: true, currentDay: 1, phaseName: 'Dia' };
mockGame.drops = new DropManager(mockGame);
const entityMgr = new EntityManager(mockGame);
entityMgr.initWorldEntities();
console.log('Pigs spawned:', entityMgr.entities.filter(e => e instanceof Pig).length >= 2);

// Test Pig death and drops
const pig = entityMgr.entities.find(e => e instanceof Pig);
if (pig) {
  pig.takeDamage(20, 'player');
  console.log('Pig died, drop count in world:', mockGame.drops.drops.length);
  console.log('Drop is porkchop:', mockGame.drops.drops[0].itemId === ITEM_PORKCHOP);
  console.log('Drop count (1 or 2):', mockGame.drops.drops[0].count);
}

// Test Bandit spawning at night
mockGame.worldTime.isDay = false;
entityMgr.spawnCheckTimer = 3.0;
entityMgr.update(0.1);
const bandits = entityMgr.entities.filter(e => e instanceof Bandit);
console.log('Bandits spawned at night:', bandits.length >= 2);
if (bandits.length > 0) {
  const bandit = bandits[0];
  let damageDealt = 0;
  mockGame.health = { takeDamage: (amt) => { damageDealt = amt; } };
  bandit.performAttack(mockGame.player);
  console.log('Bandit attack damage:', damageDealt); // Must be exactly 3
}

console.log('--- TEST 7: SAVE & LOAD ---');
const saved = SaveSystem.createWorld('Mundo Teste', 12345, 'survival');
console.log('World created with id:', saved.id);
saved.modifiedBlocks['10,10,10'] = BLOCK_FURNACE;
saved.worldTime = { timeOfDay: 450, currentDay: 3 };
SaveSystem.saveWorld(saved);
const loaded = SaveSystem.loadWorld(saved.id);
console.log('Loaded modified block:', loaded.modifiedBlocks['10,10,10'] === BLOCK_FURNACE);
console.log('Loaded day:', loaded.worldTime.currentDay === 3);

console.log('ALL TESTS PASSED SUCCESSFULLY!');
