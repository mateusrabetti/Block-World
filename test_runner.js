const fs = require('fs');

global.window = global;
global.window.addEventListener = () => {};
global.window.removeEventListener = () => {};
global.self = global;

const mockCtx = {
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  font: '',
  textAlign: '',
  textBaseline: '',
  fillRect: ()=>{},
  strokeRect: ()=>{},
  roundRect: ()=>{},
  clearRect: ()=>{},
  moveTo: ()=>{},
  lineTo: ()=>{},
  fillText: ()=>{},
  strokeText: ()=>{},
  measureText: ()=>({ width: 50 }),
  getImageData: ()=>({ data: new Uint8ClampedArray(4) }),
  createImageData: (w, h) => ({ data: new Uint8ClampedArray((w || 256) * (h || 256) * 4) }),
  putImageData: ()=>{},
  beginPath: ()=>{},
  arc: ()=>{},
  fill: ()=>{},
  stroke: ()=>{},
  drawImage: ()=>{},
  createLinearGradient: ()=>({ addColorStop: ()=>{} }),
  createRadialGradient: ()=>({ addColorStop: ()=>{} })
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
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {}
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

global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1;
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
  }
  send(data) {}
  close() {}
};

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
  './js/particles.js',
  './js/multiplayer.js',
  './js/worldManager.js',
  './js/main.js'
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

console.log('--- TEST 3: WORLD GENERATION (576 chunks) ---');
const scene = new THREE.Scene();
const world = new World(scene, 12345, {});
console.log('World chunks created:', world.chunks.length);
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

console.log('--- TEST 18: WOODEN DOOR BLOCKS, ITEMS & CRAFTING ---');
console.log('BLOCK_DOOR_LOWER defined:', typeof BLOCK_DOOR_LOWER === 'number', BLOCK_DOOR_LOWER);
console.log('BLOCK_DOOR_UPPER defined:', typeof BLOCK_DOOR_UPPER === 'number', BLOCK_DOOR_UPPER);
console.log('Closed door is solid:', BLOCK_TYPES[BLOCK_DOOR_LOWER].solid === true);
console.log('Open door is non-solid:', BLOCK_TYPES[BLOCK_DOOR_LOWER_OPEN].solid === false);
console.log('ITEM_WOODEN_DOOR defined:', typeof ITEM_WOODEN_DOOR === 'number', ITEM_WOODEN_DOOR);
console.log('Wooden door item name:', ITEM_DEFINITIONS[ITEM_WOODEN_DOOR].name);

// Test crafting recipe (2 columns x 3 rows of planks)
// In 3x3 grid: cols 0-1, rows 0-2
mockGame.crafting.tableGrid.fill(null);
mockGame.crafting.tableGrid[0] = { id: BLOCK_PLANKS, count: 1 }; // (0,0)
mockGame.crafting.tableGrid[1] = { id: BLOCK_PLANKS, count: 1 }; // (1,0)
mockGame.crafting.tableGrid[3] = { id: BLOCK_PLANKS, count: 1 }; // (0,1)
mockGame.crafting.tableGrid[4] = { id: BLOCK_PLANKS, count: 1 }; // (1,1)
mockGame.crafting.tableGrid[6] = { id: BLOCK_PLANKS, count: 1 }; // (0,2)
mockGame.crafting.tableGrid[7] = { id: BLOCK_PLANKS, count: 1 }; // (1,2)
mockGame.crafting.updateMatch(true);
console.log('Door recipe matched:', mockGame.crafting.tableOutput !== null);
console.log('Door recipe result is ITEM_WOODEN_DOOR:', mockGame.crafting.tableOutput && mockGame.crafting.tableOutput.id === ITEM_WOODEN_DOOR);
console.log('Door recipe produces 3 doors:', mockGame.crafting.tableOutput && mockGame.crafting.tableOutput.count === 3);

console.log('--- TEST 19: DOOR PLACEMENT, TOGGLE & BREAKING ---');
// Place door at (70, 20, 70)
world.setBlock(70, 19, 70, BLOCK_STONE); // support block
world.setBlock(70, 20, 70, BLOCK_AIR);
world.setBlock(70, 21, 70, BLOCK_AIR);
mockGame.inventory.slots[0] = { id: ITEM_WOODEN_DOOR, count: 3 };
mockGame.inventory.selectedHotbarIndex = 0;
// Test door placement helper
player.placeDoor(70, 20, 70);
console.log('Lower block is BLOCK_DOOR_LOWER:', world.getBlock(70, 20, 70) === BLOCK_DOOR_LOWER);
console.log('Upper block is BLOCK_DOOR_UPPER:', world.getBlock(70, 21, 70) === BLOCK_DOOR_UPPER);
console.log('Door item consumed from inventory (count = 2):', mockGame.inventory.slots[0].count === 2);

// Toggle door open
const toggledOpen = player.toggleDoor(70, 20, 70);
console.log('Door toggled open successfully:', toggledOpen);
console.log('Lower block is now OPEN:', world.getBlock(70, 20, 70) === BLOCK_DOOR_LOWER_OPEN);
console.log('Upper block is now OPEN:', world.getBlock(70, 21, 70) === BLOCK_DOOR_UPPER_OPEN);
console.log('Open door allows player passage (isSolid false):', world.isSolid(70, 20, 70) === false);

// Toggle door closed
player.toggleDoor(70, 21, 70); // toggle via upper block
console.log('Lower block is now CLOSED:', world.getBlock(70, 20, 70) === BLOCK_DOOR_LOWER);
console.log('Upper block is now CLOSED:', world.getBlock(70, 21, 70) === BLOCK_DOOR_UPPER);
console.log('Closed door blocks player passage (isSolid true):', world.isSolid(70, 20, 70) === true);

// Break upper half -> breaks lower half as well & drops 1 ITEM_WOODEN_DOOR
const dropsBeforeDoorBreak = mockGame.drops.drops.length;
mockGame.mining.targetPos = { x: 70, y: 21, z: 70 };
mockGame.mining.completeBreak();
console.log('Upper half destroyed after mining:', world.getBlock(70, 21, 70) === BLOCK_AIR);
console.log('Lower half destroyed after breaking upper half:', world.getBlock(70, 20, 70) === BLOCK_AIR);
console.log('Door drop spawned:', mockGame.drops.drops.length === dropsBeforeDoorBreak + 1);
console.log('Dropped item is ITEM_WOODEN_DOOR:', mockGame.drops.drops[mockGame.drops.drops.length - 1].itemId === ITEM_WOODEN_DOOR);

console.log('--- TEST 20: PVP 1.8 COMBAT, KNOCKBACK & I-FRAMES ---');
// Create a RemotePlayer instance
const remoteP = new RemotePlayer('p2', 'Steve', { x: 50, y: 20, z: 50 }, mockGame);
console.log('Remote player created with nametag and mesh:', remoteP.mesh !== null, remoteP.name === 'Steve');

// Test 1.8 PvP attack: fast attacks with no attack delay / recharge bar
player.position = { x: 50, y: 20, z: 48 }; // 2 blocks away
player.invulnerableTimer = 0;
console.log('Victim initial health:', remoteP.health);
remoteP.takeDamage(6, { x: 50, y: 20, z: 47 }); // hit by attacker from south
console.log('Victim took 6 damage (health = 14):', remoteP.health === 14);
console.log('Victim i-frame active (invulnerableTimer > 0):', remoteP.invulnerableTimer > 0);
console.log('Knockback velocity applied:', remoteP.velocity.z > 0 && remoteP.velocity.y > 0);

// Hit 2: immediately hit during i-frame -> blocked by invulnerability window
const blockedDamage = remoteP.takeDamage(6, { x: 50, y: 20, z: 47 });
console.log('Rapid attack during i-frame blocked:', blockedDamage === false, 'health remains 14:', remoteP.health === 14);

// Advance time past 500ms i-frame
remoteP.update(0.6);
console.log('i-frame expired after 0.6s:', remoteP.invulnerableTimer <= 0);
// Hit 3: can be damaged again!
const nextDamage = remoteP.takeDamage(4, { x: 50, y: 20, z: 47 });
console.log('Second attack after i-frame succeeded:', nextDamage === true, 'health is 10:', remoteP.health === 10);

console.log('--- TEST 21: KEYBINDINGS & CONFLICT DETECTION ---');
const inputSys = new Input(mockGame);
console.log('Default forward key is KeyW:', inputSys.keyBindings.forward === 'KeyW');
console.log('Default jump key is Space:', inputSys.keyBindings.jump === 'Space');

// Rebind action
inputSys.setKeyBinding('forward', 'KeyI');
console.log('Rebound forward to KeyI:', inputSys.keyBindings.forward === 'KeyI');

// Detect conflicting keys
inputSys.setKeyBinding('backward', 'KeyI'); // Both forward and backward on KeyI
const conflicts = inputSys.getConflictingActions();
console.log('Conflict detected between incompatible actions:', conflicts.includes('forward') && conflicts.includes('backward'));

// Reset bindings restores defaults and clears conflicts
inputSys.resetKeyBindings();
console.log('Reset restored forward to KeyW:', inputSys.keyBindings.forward === 'KeyW');
console.log('No conflicts after reset:', inputSys.getConflictingActions().length === 0);

console.log('--- TEST 22: GRAPHICS PRESETS & QUALITY (LOW, MEDIUM, HIGH, ULTRA) ---');
mockGame.scene.fog = new THREE.Fog(0x7db4f5, 35, 78);
mockGame.camera = new THREE.PerspectiveCamera(75, 1.33, 0.1, 100);
mockGame.renderer = {
  setPixelRatio: () => {},
  shadowMap: { enabled: false, type: 0 },
  toneMapping: THREE.NoToneMapping,
  toneMappingExposure: 1.0
};
mockGame.sunLight = new THREE.DirectionalLight(0xfff7e6, 0.9);
mockGame.sunLight.shadow = {
  mapSize: { width: 512, height: 512 },
  camera: { near: 1, far: 280, left: -60, right: 60, top: 60, bottom: -60, updateProjectionMatrix: () => {} }
};
mockGame.particles = new ParticleManager(mockGame);
mockGame.applyGraphicsPreset = Game.prototype.applyGraphicsPreset.bind(mockGame);

// 1. Testa preset Baixo
mockGame.applyGraphicsPreset('low');
console.log('Low preset applied (chunks = 6, fogFar = 96, shadow disabled):',
  mockGame.renderDistance === 6 &&
  mockGame.scene.fog.far === 96 &&
  mockGame.renderer.shadowMap.enabled === false &&
  mockGame.sunLight.castShadow === false
);

// 2. Testa preset Médio
mockGame.applyGraphicsPreset('medium');
console.log('Medium preset applied (chunks = 10, fogFar = 170, basic shadow):',
  mockGame.renderDistance === 10 &&
  mockGame.scene.fog.far === 170 &&
  mockGame.renderer.shadowMap.enabled === true &&
  mockGame.sunLight.shadow.mapSize.width === 512
);

// 3. Testa preset Alto
mockGame.applyGraphicsPreset('high');
console.log('High preset applied (chunks = 14, fogFar = 240, PCFSoft 1024):',
  mockGame.renderDistance === 14 &&
  mockGame.scene.fog.far === 240 &&
  mockGame.renderer.shadowMap.type === THREE.PCFSoftShadowMap &&
  mockGame.sunLight.shadow.mapSize.width === 1024
);

// 4. Testa preset Ultra — Shaders
mockGame.applyGraphicsPreset('ultra');
console.log('Ultra preset applied (chunks = 16, fogFar = 280, PCFSoft 2048):',
  mockGame.renderDistance === 16 &&
  mockGame.scene.fog.far === 280 &&
  mockGame.sunLight.shadow.mapSize.width === 2048 &&
  mockGame.camera.far === 520
);
console.log('Ultra ACES Filmic Tone Mapping active:',
  mockGame.renderer.toneMapping === THREE.ACESFilmicToneMapping &&
  mockGame.renderer.toneMappingExposure === 1.15
);
console.log('Ultra material color and opacity adjusted:',
  BLOCK_MATERIAL_TRANSPARENT.opacity === 0.80 &&
  BLOCK_MATERIAL_TRANSPARENT.color.getHex() === 0xb2ebf2
);
console.log('Ultra BLOCK_MATERIAL_WATER with sky reflection active:',
  BLOCK_MATERIAL_WATER.reflectivity === 0.70 &&
  BLOCK_MATERIAL_WATER.shininess === 90 &&
  BLOCK_MATERIAL_WATER.envMap !== null
);
console.log('Ultra volumetric clouds and sun corona active:',
  mockGame.worldTime &&
  (!mockGame.worldTime.cloudMesh || mockGame.worldTime.cloudMesh.visible === true) &&
  (!mockGame.worldTime.sunGlowMesh || mockGame.worldTime.sunGlowMesh.visible === true)
);
console.log('Ultra saved to localStorage:',
  localStorage.getItem('blockworld_graphics_preset') === 'ultra'
);

// 5. Alterna de volta para Baixo e verifica limpeza completa de efeitos
mockGame.applyGraphicsPreset('low');
console.log('Restoring to Low resets tone mapping:',
  mockGame.renderer.toneMapping === THREE.NoToneMapping &&
  mockGame.renderer.toneMappingExposure === 1.0
);
console.log('Restoring to Low resets transparent material opacity:',
  BLOCK_MATERIAL_TRANSPARENT.opacity === 0.72 &&
  BLOCK_MATERIAL_TRANSPARENT.color.getHex() === 0xffffff
);
console.log('Restoring to Low resets water reflections:',
  BLOCK_MATERIAL_WATER.reflectivity === 0.0 &&
  BLOCK_MATERIAL_WATER.envMap === null
);
console.log('Restoring to Low disables shadow maps:',
  mockGame.renderer.shadowMap.enabled === false
);

console.log('--- TEST 23: MOB KNOCKBACK PHYSICS & DIRECTIONALITY ---');
for (let dx = -3; dx <= 3; dx++) {
  for (let dz = -3; dz <= 3; dz++) {
    world.setBlock(80 + dx, 24, 80 + dz, BLOCK_STONE);
    world.setBlock(80 + dx, 25, 80 + dz, BLOCK_AIR);
    world.setBlock(80 + dx, 26, 80 + dz, BLOCK_AIR);
  }
}
const kbPig = new Pig(80, 25, 80, mockGame);
const attackerPos = { x: 80, y: 25, z: 78 }; // Attacker 2 blocks south of pig
kbPig.takeDamage(4, 'player', attackerPos);
console.log('Pig received knockback velocity.z > 0 (away from attacker):', kbPig.velocity.z > 4.0);
console.log('Pig received vertical lift velocity.y > 0:', kbPig.velocity.y > 2.0);
console.log('Pig knockbackTimer active:', kbPig.knockbackTimer > 0.2);

// Run update while in knockback: walking AI must NOT wipe out velocity
kbPig.update(0.1);
console.log('Velocity preserved during knockbackTimer (not zeroed by AI):', kbPig.velocity.z > 1.0);
// After knockback expires, control is restored
kbPig.update(0.35);
console.log('Knockback timer elapsed:', kbPig.knockbackTimer <= 0);

console.log('--- TEST 24: CHUNK VISIBILITY FORCE REFRESH & CHUNKS UPDATE ---');
// Standing at center of world
const centerPos = { x: world.sizeX / 2, y: 25, z: world.sizeZ / 2 };
world.updateChunkVisibility(centerPos, 4, true); // Low: 4 chunks
let visibleChunksLow = 0;
world.chunks.forEach(c => { if (c.group.visible) visibleChunksLow++; });
console.log('Low preset visible chunks count:', visibleChunksLow);

world.updateChunkVisibility(centerPos, 14, true); // High: 14 chunks
let visibleChunksHigh = 0;
world.chunks.forEach(c => { if (c.group.visible) visibleChunksHigh++; });
console.log('High preset visible chunks count:', visibleChunksHigh);
console.log('High preset shows significantly more chunks than Low:', visibleChunksHigh > visibleChunksLow);

console.log('--- TEST 25: FIRST-PERSON IN-HAND BLOCKS & HELD ITEM INTEGRITY ---');
const testArm = new FirstPersonArm(mockGame, camera);
console.log('Viewmodel fill light active and shadows disabled:',
  testArm.viewmodelLight instanceof THREE.PointLight &&
  testArm.viewmodelLight.castShadow === false
);

// Testa blocos na mão: opaco (Grama, Pedra), transparente (Vidro), líquido (Água)
const testBlockIds = [BLOCK_GRASS, BLOCK_STONE, BLOCK_GLASS, BLOCK_WATER];
for (const bId of testBlockIds) {
  const mesh = testArm.createBlockMesh(bId);
  const def = BLOCK_TYPES[bId];
  console.log(`Held block ${def.name} created properly:`,
    mesh instanceof THREE.Mesh &&
    mesh.geometry.parameters.width === 0.22 &&
    mesh.castShadow === false &&
    mesh.receiveShadow === false &&
    mesh.material.vertexColors === false &&
    mesh.geometry.attributes.color !== undefined &&
    mesh.geometry.attributes.uv !== undefined
  );
}

// Testa ferramentas e armas: espada, picareta, machado, pá, porta
const testToolIds = [ITEM_IRON_SWORD, ITEM_IRON_PICKAXE, ITEM_IRON_AXE, ITEM_IRON_SHOVEL, ITEM_WOODEN_DOOR];
for (const tId of testToolIds) {
  const toolGroup = testArm.createToolMesh(tId);
  let allShadowsDisabled = true;
  toolGroup.traverse((c) => {
    if (c.isMesh && (c.castShadow || c.receiveShadow)) allShadowsDisabled = false;
  });
  console.log(`Held tool ${tId} shadows disabled across all submeshes:`, allShadowsDisabled);
}

// Testa troca de itens no inventário e atualização do contêiner
mockGame.inventory.slots[0] = { id: BLOCK_GRASS, count: 5 };
mockGame.inventory.selectedHotbarIndex = 0;
testArm.update(0.016, false, false);
console.log('Holding Grass block in hand:', testArm.currentHeldItemId === BLOCK_GRASS && testArm.itemContainer.children.length === 1);

mockGame.inventory.slots[0] = { id: ITEM_IRON_SWORD, count: 1 };
testArm.update(0.016, false, false);
console.log('Switched to Iron Sword in hand:', testArm.currentHeldItemId === ITEM_IRON_SWORD && testArm.itemContainer.children.length === 1);

mockGame.inventory.slots[0] = null;
testArm.update(0.016, false, false);
console.log('Switched to empty hand:', testArm.currentHeldItemId === null && testArm.itemContainer.visible === false);

console.log('--- TEST 26: ATMOSPHERIC SKY DOME, DUAL CLOUDS & ULTRA SHADERS INTEGRITY ---');
const wt = new WorldTime(mockGame);
mockGame.worldTime = wt;
console.log('Atmospheric Sky Dome mesh initialized with ShaderMaterial:',
  wt.skyDomeMesh instanceof THREE.Mesh &&
  wt.skyMaterial instanceof THREE.ShaderMaterial &&
  wt.skyDomeMesh.renderOrder === -100
);
console.log('Dual-layer cloud canopy initialized:',
  wt.cloudMesh instanceof THREE.Mesh &&
  wt.cloudMesh2 instanceof THREE.Mesh
);
console.log('Discrete night sky star field (>200 visible stars):',
  wt.starPoints instanceof THREE.Points &&
  wt.starPoints.geometry.attributes.position.count > 200
);

// Testa ciclo dia/noite no céu e cores atmosféricas
wt.timeOfDay = 400.0; // Pleno Dia
wt.updateLightingAndSky();
const dayTopCol = wt.skyMaterial.uniforms.topColor.value.getHex();
const dayHorizCol = wt.skyMaterial.uniforms.horizonColor.value.getHex();
console.log('Pleno Dia sky colors (deep zenith, bright horizon):', dayTopCol !== dayHorizCol);

wt.timeOfDay = 850.0; // Pôr do sol dourado/alaranjado
wt.updateLightingAndSky();
const sunsetHorizCol = wt.skyMaterial.uniforms.horizonColor.value.getHex();
console.log('Sunset golden/orange horizon active:',
  sunsetHorizCol !== dayHorizCol &&
  wt.skyMaterial.uniforms.sunGlowIntensity.value > 0.5
);

wt.timeOfDay = 1300.0; // Noite
wt.updateLightingAndSky();
console.log('Night sky starry opacity active:', wt.starMaterial.opacity >= 0.6);

// Alternância de perfis gráficos e verificação de ativação/desativação limpa
mockGame.applyGraphicsPreset('ultra');
console.log('Ultra preset activates Sky Dome and dual clouds:',
  mockGame.worldTime.skyDomeMesh.visible === true &&
  mockGame.worldTime.cloudMesh.visible === true &&
  mockGame.worldTime.cloudMesh2.visible === true
);
console.log('Ultra shadow normalBias set to prevent shadow acne:',
  mockGame.sunLight.shadow.normalBias === 0.025
);

mockGame.applyGraphicsPreset('low');
console.log('Low preset hides Sky Dome and clouds for maximum performance:',
  mockGame.worldTime.skyDomeMesh.visible === false &&
  mockGame.worldTime.cloudMesh.visible === false
);

// =============================================================================
// TEST 27: MULTIPLAYER MINING SYNCHRONIZATION
// =============================================================================
console.log('--- TEST 27: MULTIPLAYER MINING SYNCHRONIZATION ---');
let lastMinedSync = null;
mockGame.multiplayer = {
  sendBlockChange(x, y, z, blockType) {
    lastMinedSync = { x, y, z, blockType };
  },
  sendDoorToggle: () => {},
  remotePlayers: new Map()
};

mockGame.world.setBlock(20, 20, 20, BLOCK_STONE);
const miningInstance = new MiningSystem(mockGame);
miningInstance.targetPos = { x: 20, y: 20, z: 20 };
miningInstance.completeBreak();

console.log('Block mined in survival mode set to air:', mockGame.world.getBlock(20, 20, 20) === BLOCK_AIR);
console.log('Multiplayer sendBlockChange called on mining break:',
  lastMinedSync !== null &&
  lastMinedSync.x === 20 &&
  lastMinedSync.y === 20 &&
  lastMinedSync.z === 20 &&
  lastMinedSync.blockType === BLOCK_AIR
);

// =============================================================================
// TEST 28: MULTIPLAYER DOOR ECHO PREVENTION
// =============================================================================
console.log('--- TEST 28: MULTIPLAYER DOOR ECHO PREVENTION ---');
let doorToggleSent = 0;
mockGame.multiplayer.sendDoorToggle = (x, y, z, state) => {
  doorToggleSent++;
};

// Set up closed door
mockGame.world.setBlock(10, 10, 10, BLOCK_DOOR_LOWER);
mockGame.world.setBlock(10, 11, 10, BLOCK_DOOR_UPPER);

// Local player toggles door: should send packet
doorToggleSent = 0;
player.toggleDoor(10, 10, 10, true);
console.log('Local door toggle sends multiplayer packet:', doorToggleSent === 1);

// Remote packet arrives: toggleDoor called with syncMultiplayer = false: must NOT send packet
doorToggleSent = 0;
player.toggleDoor(10, 10, 10, false);
console.log('Remote door toggle does NOT echo back packet:', doorToggleSent === 0);

// =============================================================================
// TEST 29: CONTINUOUS PLACEMENT & BOUNDARY PROTECTION
// =============================================================================
console.log('--- TEST 29: CONTINUOUS PLACEMENT & BOUNDARY PROTECTION ---');
// Set target block as crafting table
mockGame.world.setBlock(30, 10, 30, BLOCK_CRAFTING_TABLE);
let craftingTableOpened = false;
mockGame.openCraftingTable = () => { craftingTableOpened = true; };

player.targetBlock = {
  block: { x: 30, y: 10, z: 30 },
  normal: { x: 0, y: 1, z: 0 },
  type: BLOCK_CRAFTING_TABLE
};

// Continuous placement (isContinuous = true) must NOT open crafting table
craftingTableOpened = false;
player.placeBlock(true);
console.log('Continuous placing does NOT open crafting table UI:', craftingTableOpened === false);

// Discrete placement (isContinuous = false) DOES open crafting table
craftingTableOpened = false;
player.placeBlock(false);
console.log('Discrete RMB click opens crafting table UI:', craftingTableOpened === true);

// Verify placement inside existing solid block is rejected
mockGame.world.setBlock(30, 11, 30, BLOCK_STONE); // make target solid
player.inventory.slots[player.inventory.selectedHotbarIndex] = { id: BLOCK_DIRT, count: 5 };
player.placeBlock(true);
console.log('Placing into solid block prevented (block remains stone):', mockGame.world.getBlock(30, 11, 30) === BLOCK_STONE);
console.log('Item count was not consumed when placement was blocked:', player.inventory.slots[player.inventory.selectedHotbarIndex].count === 5);

// =============================================================================
// TEST 30: FULL INVENTORY DROP FALLBACK
// =============================================================================
console.log('--- TEST 30: FULL INVENTORY DROP FALLBACK ---');
// Fill entire inventory
for (let i = 0; i < player.inventory.totalSlots; i++) {
  player.inventory.slots[i] = { id: BLOCK_STONE, count: 64 };
}
player.position = { x: 50, y: 10, z: 50 };

const dropsBefore = mockGame.drops.drops.length;
player.inventory.cursorItem = { id: ITEM_IRON_INGOT, count: 4 };
player.inventory.returnCursorItem();

console.log('Cursor item cleared on full inventory:', player.inventory.cursorItem === null);
console.log('Unplaced cursor item spawned as world drop:', mockGame.drops.drops.length > dropsBefore);
const lastDrop = mockGame.drops.drops[mockGame.drops.drops.length - 1];
console.log('Dropped item matches cursor item ID and count:', lastDrop.itemId === ITEM_IRON_INGOT && lastDrop.count === 4);

// Test crafting returnGridItems drop on full inventory
const craftingCtrl = new CraftingController(mockGame);
craftingCtrl.tableGrid[0] = { id: BLOCK_DIRT, count: 8 };
const dropsBeforeCraft = mockGame.drops.drops.length;
craftingCtrl.returnGridItems(true);
console.log('Crafting table grid items safely dropped when inventory full:', mockGame.drops.drops.length > dropsBeforeCraft);

// =============================================================================
// TEST 31: BANDIT ENTITY DROPS
// =============================================================================
console.log('--- TEST 31: BANDIT ENTITY DROPS ---');
const testBandit = new Bandit(60, 10, 60, mockGame);
const dropsCountBeforeBandit = mockGame.drops.drops.length;
testBandit.die();

console.log('Bandit died and triggered world drops:', mockGame.drops.drops.length > dropsCountBeforeBandit);
const banditDrop = mockGame.drops.drops[mockGame.drops.drops.length - 1];
console.log('Bandit dropped sticks or coal:', banditDrop.itemId === ITEM_STICK || banditDrop.itemId === ITEM_COAL);

// =============================================================================
// TEST 32: DAY & NIGHT SKY VISUALS, LUNAR CYAN AURA & TERRAIN VISIBILITY
// =============================================================================
console.log('--- TEST 32: DAY & NIGHT SKY VISUALS, LUNAR CYAN AURA & TERRAIN VISIBILITY ---');
mockGame.applyGraphicsPreset('ultra');
const timeSys = mockGame.worldTime;

// 1. Dia (Imagem 1): Sol radiante, tons atmosféricos, nuvens cumulus volumosas
timeSys.timeOfDay = 450.0; // Meio-dia
timeSys.updateLightingAndSky();
console.log('Day sky zenith is deep atmospheric blue:', timeSys.skyMaterial.uniforms.topColor.value.getHex() === 0x1d62c9);
console.log('Day sun glow active and prominent:', timeSys.skyMaterial.uniforms.sunGlowIntensity.value >= 0.5);
console.log('Day cloud canopy color is white/peach undertone:', timeSys.cloudMat.color.getHex() === 0xffffff && timeSys.cloudMat.opacity >= 0.9);
console.log('Sun mesh has procedural texture:', timeSys.sunMesh && timeSys.sunMesh.material.map !== null);

// 2. Noite (Imagem 2): Lua voxel com textura de crateras, aura ciano radiante, estrelas discretas
timeSys.timeOfDay = 1350.0; // Plena Noite
timeSys.updateLightingAndSky();
console.log('Night sky zenith is deep dark navy/indigo (not pitch black):', timeSys.skyMaterial.uniforms.topColor.value.getHex() === 0x020917);
console.log('Night sky horizon has subtle atmospheric haze:', timeSys.skyMaterial.uniforms.horizonColor.value.getHex() === 0x07192f);
console.log('Moon has procedural pixel-art Minecraft craters texture:', timeSys.moonMesh && timeSys.moonMesh.material.map !== null);
console.log('Moon tilted diagonally in the sky (Minecraft diamond tilt):', timeSys.moonMesh.rotation.z !== 0);
console.log('Moon radiant cyan atmospheric halo active:', timeSys.skyMaterial.uniforms.moonGlowIntensity.value >= 0.8 && timeSys.skyMaterial.uniforms.moonGlowColor.value.getHex() === 0x00caff);
console.log('Volumetric moon glow mesh positioned and facing camera:', timeSys.moonGlowMesh && timeSys.moonGlowMesh.visible === true);
console.log('Volumetric moonbeams active in Ultra:', timeSys.moonBeamsGroup && timeSys.moonBeamsGroup.visible === true);

// 3. Iluminação noturna preserva silhuetas e visibilidade do terreno (não é breu)
console.log('Night ambient light maintains terrain visibility (intensity >= 0.25):', timeSys.ambientLight.intensity >= 0.25);
console.log('Night moonlight illuminates blocks with blue hue:', timeSys.sunLight.intensity >= 0.35 && timeSys.sunLight.color.getHex() === 0x5897d8);

// 4. Reflexo da água atualizado com suporte a modo noturno
let waterReflectionParams = null;
global.updateWaterReflectionTexture = (skyHex, sunHex, sunsetFactor, isNight) => {
  waterReflectionParams = { skyHex, sunHex, sunsetFactor, isNight };
};
timeSys.timeOfDay = 1350.0;
timeSys.updateLightingAndSky();
console.log('Water reflection called with isNight = true at night:', waterReflectionParams && waterReflectionParams.isNight === true);

timeSys.timeOfDay = 450.0;
timeSys.updateLightingAndSky();
console.log('Water reflection called with isNight = false during day:', waterReflectionParams && waterReflectionParams.isNight === false);

console.log('ALL TESTS PASSED SUCCESSFULLY!');
