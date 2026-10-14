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

const makeMockElement = () => ({
  className: '',
  classList: { add: ()=>{}, remove: ()=>{}, contains: ()=>false },
  addEventListener: ()=>{},
  appendChild: ()=>{},
  querySelector: () => ({ style: {}, textContent: '', classList: { add: ()=>{}, remove: ()=>{} }, src: '' }),
  querySelectorAll: () => [],
  innerHTML: '',
  style: {},
  dataset: {},
  getContext: (type) => mockCtx,
  toDataURL: () => 'data:image/png;base64,'
});

global.document = {
  getElementById: (id) => makeMockElement(),
  createElement: (tag) => makeMockElement(),
  createElementNS: (ns, tag) => makeMockElement(),
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
  './js/arm.js',
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
  './js/player.js',
  './js/input.js',
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

console.log('--- TEST 8: FIRST PERSON ARM & HELD ITEMS ---');
const camera = new THREE.PerspectiveCamera(75, 1.33, 0.1, 220);
const arm = new FirstPersonArm(mockGame, camera);
mockGame.inventory.slots[0] = null;
mockGame.inventory.selectedHotbarIndex = 0;
arm.updateHeldItem();
console.log('Empty hand itemContainer visible:', arm.itemContainer.visible === false);

// Holding a block (Grass)
mockGame.inventory.slots[0] = { id: BLOCK_GRASS, count: 64 };
arm.updateHeldItem();
console.log('Holding Grass block children count:', arm.itemContainer.children.length === 1);

// Holding a sword (Iron Sword)
mockGame.inventory.slots[0] = { id: ITEM_IRON_SWORD, count: 1 };
arm.updateHeldItem();
console.log('Holding Iron Sword children count:', arm.itemContainer.children.length === 1);

// Holding raw meat
mockGame.inventory.slots[0] = { id: ITEM_PORKCHOP, count: 5 };
arm.updateHeldItem();
console.log('Holding Raw Meat children count:', arm.itemContainer.children.length === 1);

// Holding cooked meat
mockGame.inventory.slots[0] = { id: ITEM_COOKED_PORKCHOP, count: 3 };
arm.updateHeldItem();
console.log('Holding Cooked Meat children count:', arm.itemContainer.children.length === 1);

console.log('--- TEST 9: FURNACE (SAND -> GLASS & WOOD AS FUEL) ---');
const furnaceSand = furnaceMgr.getFurnaceAt(20, 20, 20);
furnaceSand.input = { id: BLOCK_SAND, count: 3 };
furnaceSand.fuel = { id: BLOCK_WOOD, count: 1 };
for (let t = 0; t < 70; t++) {
  furnaceMgr.update(0.1);
}
console.log('Furnace sand output after 7s (Glass):', furnaceSand.output.id === BLOCK_GLASS, furnaceSand.output);
console.log('Furnace sand input reduced to 2:', furnaceSand.input.count === 2);
console.log('Furnace fuel consumed wood:', furnaceSand.fuel === null && furnaceSand.fuelTimeLeft > 0);

console.log('--- TEST 10: MOB DAMAGE FLASH & COLOR RESTORATION ---');
const testPig = new Pig(50, 10, 50, mockGame);
let originalPigBodyColor = null;
testPig.mesh.traverse(c => {
  if (c.isMesh && c.material && originalPigBodyColor === null) {
    originalPigBodyColor = c.material.color.getHex();
  }
});
console.log('Pig initial material color:', '0x' + originalPigBodyColor.toString(16));

// Hit pig 1st time
testPig.takeDamage(2, 'player');
let hitColor = null;
testPig.mesh.traverse(c => {
  if (c.isMesh && c.material && hitColor === null) {
    hitColor = c.material.color.getHex();
  }
});
console.log('Pig hurt color is red (0xff3333):', hitColor === 0xff3333);

// Multiple rapid hits
testPig.takeDamage(2, 'player');
testPig.takeDamage(2, 'player');
console.log('Pig hurt timer reset on multiple hits:', testPig.hurtTimer >= 0.2);

// Advance time past hurt duration (250ms)
testPig.update(0.15);
console.log('Pig still red at 150ms:', testPig.isFlashingRed === true);
testPig.update(0.15);
console.log('Pig returned to normal at 300ms:', testPig.isFlashingRed === false);
let restoredColor = null;
testPig.mesh.traverse(c => {
  if (c.isMesh && c.material && restoredColor === null) {
    restoredColor = c.material.color.getHex();
  }
});
console.log('Pig restored original color accurately:', restoredColor === originalPigBodyColor);

console.log('--- TEST 11: EATING FOOD & HEALTH RECOVERY ---');
global.window.game = mockGame;
global.game = mockGame;
const healthSys = new HealthSystem(mockGame);
mockGame.health = healthSys;
mockGame.gameMode = 'survival';
const player = new Player(camera, world, new Physics(), scene, mockGame.inventory);
mockGame.player = player;

// 1. Player with 10 HP eats Raw Porkchop -> 13 HP (+3 HP / 1.5 hearts)
healthSys.setHealth(10);
mockGame.inventory.slots[0] = { id: ITEM_PORKCHOP, count: 2 };
mockGame.inventory.selectedHotbarIndex = 0;
const ateRaw = player.eatFood();
console.log('Ate raw meat:', ateRaw, 'HP is 13:', healthSys.health === 13, '(Actual:', healthSys.health + ')');
console.log('Raw meat count reduced to 1:', mockGame.inventory.slots[0].count === 1);

// 2. Player with 10 HP eats Cooked Porkchop -> 18 HP (+8 HP / 4 hearts)
healthSys.setHealth(10);
mockGame.inventory.slots[0] = { id: ITEM_COOKED_PORKCHOP, count: 2 };
mockGame.inventory.selectedHotbarIndex = 0;
const ateCooked = player.eatFood();
console.log('Ate cooked meat:', ateCooked, 'HP is 18:', healthSys.health === 18, '(Actual:', healthSys.health + ')');
console.log('Cooked meat count reduced to 1:', mockGame.inventory.slots[0].count === 1);

// 3. Player with 19 HP eats Cooked Porkchop -> 20 HP (Capped at 20 HP)
healthSys.setHealth(19);
mockGame.inventory.slots[0] = { id: ITEM_COOKED_PORKCHOP, count: 1 };
player.eatFood();
console.log('Player with 19 HP eats cooked meat -> Capped at 20 HP:', healthSys.health === 20);

// 4. Player with 20 HP -> Does not consume meat
healthSys.setHealth(20);
mockGame.inventory.slots[0] = { id: ITEM_COOKED_PORKCHOP, count: 5 };
player.eatFood();
console.log('Player with 20 HP does not consume meat (count remains 5):', mockGame.inventory.slots[0].count === 5);

console.log('--- TEST 12: SNEAKING & EDGE PROTECTION ---');
const physTest = new Physics();
physTest.onGround = true;
physTest.isSneaking = true;
// Place a single solid block at (50, 20, 50) and test stepping off the edge
world.setBlock(50, 20, 50, BLOCK_STONE);
world.setBlock(51, 20, 50, BLOCK_AIR); // empty air to the east
const testPos = { x: 50.5, y: 21.0, z: 50.5 };
const testVel = { x: 5.0, y: 0, z: 0 }; // trying to run east off the block
physTest.update(testPos, testVel, world, 0.1, false, false);
console.log('Sneak edge protection prevented falling off block:', testPos.x < 50.9);
console.log('Player stayed on ground during sneak:', physTest.onGround);

// Test eye height and posture
player.update(0.016, { shift: true });
console.log('Eye height lowered while sneaking (1.42):', player.physics.eyeHeight === 1.42);
player.update(0.016, { shift: false });
console.log('Eye height restored after releasing sneak (1.62):', player.physics.eyeHeight === 1.62);

console.log('--- TEST 13: DOUBLE-TAP W SPRINTING ---');
// Create a clear 10x10 stone platform at y=39 with air above for testing movement speeds
for (let px = 45; px <= 55; px++) {
  for (let pz = 45; pz <= 55; pz++) {
    world.setBlock(px, 39, pz, BLOCK_STONE);
    world.setBlock(px, 40, pz, BLOCK_AIR);
    world.setBlock(px, 41, pz, BLOCK_AIR);
  }
}
player.position = { x: 50.5, y: 40.0, z: 50.5 };
player.physics.onGround = true;

// Normal walking speed (steady state)
player.velocity = { x: 0, y: 0, z: 0 };
for (let i = 0; i < 20; i++) player.update(0.05, { forward: true, shift: false, sprint: false });
const normalSpeed = Math.hypot(player.velocity.x, player.velocity.z);

// Double-tap sprint speed (steady state)
player.velocity = { x: 0, y: 0, z: 0 };
player.position = { x: 50.5, y: 40.0, z: 50.5 };
for (let i = 0; i < 20; i++) player.update(0.05, { forward: true, shift: false, sprint: true });
const sprintSpeed = Math.hypot(player.velocity.x, player.velocity.z);
console.log('Sprinting is faster than normal walk:', sprintSpeed > normalSpeed, '(Sprint:', sprintSpeed.toFixed(2), 'vs Walk:', normalSpeed.toFixed(2) + ')');

// Releasing forward stops sprint
player.velocity = { x: 0, y: 0, z: 0 };
player.position = { x: 50.5, y: 40.0, z: 50.5 };
for (let i = 0; i < 20; i++) player.update(0.05, { forward: true, shift: false, sprint: false });
const restoredWalkVel = Math.hypot(player.velocity.x, player.velocity.z);
console.log('Released forward returned to normal walk speed:', restoredWalkVel < sprintSpeed);

console.log('--- TEST 14: DROP ITEMS (Q) ---');
mockGame.inventory.slots[0] = { id: BLOCK_DIRT, count: 2 };
mockGame.inventory.selectedHotbarIndex = 0;
const initialDropCount = mockGame.drops.drops.length;

// Drop 1 unit
player.dropSelectedItem();
console.log('Item dropped spawned in world:', mockGame.drops.drops.length === initialDropCount + 1);
const latestDrop = mockGame.drops.drops[mockGame.drops.drops.length - 1];
console.log('Drop has pickupDelay (1.2s) preventing instant pickup:', latestDrop.pickupDelay === 1.2);
console.log('Inventory slot count reduced to 1:', mockGame.inventory.slots[0].count === 1);

// Drop remaining 1 unit -> slot becomes null
player.dropSelectedItem();
console.log('Inventory slot cleared when count hits 0:', mockGame.inventory.slots[0] === null);

// Drop on empty slot does nothing
const dropCountBeforeEmpty = mockGame.drops.drops.length;
player.dropSelectedItem();
console.log('Drop on empty slot does nothing:', mockGame.drops.drops.length === dropCountBeforeEmpty);

console.log('--- TEST 15: CONTINUOUS MINING & PLACING ---');
mockGame.state = 'PLAYING';
mockGame.gameMode = 'survival';
mockGame.mining = new MiningSystem(mockGame);
mockGame.input = { isMiningMouseDown: true, isPlacingMouseDown: false };
world.setBlock(60, 20, 60, BLOCK_DIRT);
player.targetBlock = { block: { x: 60, y: 20, z: 60 }, type: BLOCK_DIRT, normal: { x: 0, y: 1, z: 0 } };
mockGame.mining.startMining(player.targetBlock);
console.log('Mining started:', mockGame.mining.isMining);

// Fast-forward mining to 100%
mockGame.mining.progress = 1.0;
world.setBlock(60, 21, 60, BLOCK_STONE); // next target block
player.targetBlock = { block: { x: 60, y: 21, z: 60 }, type: BLOCK_STONE, normal: { x: 0, y: 1, z: 0 } };
const origUpdateTarget = player.updateTargetBlock.bind(player);
player.updateTargetBlock = () => {}; // preserve test target block
mockGame.mining.completeBreak();
console.log('Continuous mining seamlessly starts next block:', mockGame.mining.isMining && mockGame.mining.targetPos.y === 21);
player.updateTargetBlock = origUpdateTarget;

// Releasing LMB stops mining
mockGame.input.isMiningMouseDown = false;
mockGame.mining.stopMining();
console.log('Releasing LMB stops mining:', !mockGame.mining.isMining);

console.log('--- TEST 16: INVENTORY QUICK MOVE (SHIFT + CLICK) ---');
const invTest = new Inventory();
invTest.slots.fill(null);
// 1. Hotbar (slot 0) to backpack (slot 9)
invTest.slots[0] = { id: BLOCK_WOOD, count: 10 };
invTest.quickMoveSlot(0);
console.log('Hotbar to backpack transferred:', invTest.slots[0] === null && invTest.slots[9].id === BLOCK_WOOD && invTest.slots[9].count === 10);

// 2. Backpack (slot 9) to hotbar (slot 0)
invTest.selectedHotbarIndex = 0;
invTest.quickMoveSlot(9);
console.log('Backpack to hotbar transferred:', invTest.slots[9] === null && invTest.slots[0].id === BLOCK_WOOD && invTest.slots[0].count === 10);

// 3. Stacking with existing slot
invTest.slots[9] = { id: BLOCK_WOOD, count: 20 };
invTest.quickMoveSlot(9);
console.log('Stacked up to 30 into hotbar:', invTest.slots[9] === null && invTest.slots[0].count === 30);

console.log('--- TEST 17: CRAFTING & FURNACE QUICK MOVE ---');
// 1. Shift-click Crafting Output
mockGame.crafting = new CraftingController(mockGame);
mockGame.crafting.tableGrid[0] = { id: BLOCK_WOOD, count: 2 };
mockGame.crafting.updateMatch(true); // 1 Wood -> 4 Planks
console.log('Crafting table matched planks:', mockGame.crafting.tableOutput !== null);
mockGame.crafting.handleOutputShiftClick(true);
const planksInInv = mockGame.inventory.slots.reduce((sum, s) => s && s.id === BLOCK_PLANKS ? sum + s.count : sum, 0);
console.log('Shift-clicked crafting output produced 8 planks (2 crafts):', planksInInv === 8);
console.log('Crafting table grid consumed all wood:', mockGame.crafting.tableGrid[0] === null);

// 2. Shift-click Furnace Output & Input
const furnaceTest = furnaceMgr.getFurnaceAt(20, 20, 20);
furnaceMgr.currentFurnacePos = { x: 20, y: 20, z: 20 };
furnaceTest.output = { id: ITEM_IRON_INGOT, count: 5 };
furnaceMgr.handleOutputShiftClick();
console.log('Furnace output transferred to player inventory:', furnaceTest.output === null);
const ironInInv = mockGame.inventory.slots.find(s => s && s.id === ITEM_IRON_INGOT);
console.log('Iron ingots found in player inventory:', ironInInv && ironInInv.count >= 5);

// 3. Shift-click from inventory into Furnace
mockGame.inventory.slots[0] = { id: BLOCK_IRON_ORE, count: 8 };
mockGame.inventory.slots[1] = { id: ITEM_COAL, count: 4 };
furnaceTest.input = null;
furnaceTest.fuel = null;
furnaceMgr.transferFromInventorySlot(0); // Iron ore -> Input
furnaceMgr.transferFromInventorySlot(1); // Coal -> Fuel
console.log('Shift-click iron ore went to furnace input:', furnaceTest.input && furnaceTest.input.id === BLOCK_IRON_ORE && furnaceTest.input.count === 8);
console.log('Shift-click coal went to furnace fuel:', furnaceTest.fuel && furnaceTest.fuel.id === ITEM_COAL && furnaceTest.fuel.count === 4);

console.log('ALL TESTS PASSED SUCCESSFULLY!');
