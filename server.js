import http from 'http';
import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');
const SSE_HEARTBEAT_MS = 15_000;

const TICK_MS = 1000;
const TICKS_PER_YEAR = 60;
const TICKS_PER_MONTH = 5;
const TRADE_FEE = 1;
const STARTING_RESOURCES = { nutrition: 5000, lumber: 3000, steel: 3000, alloy: 2000, oil: 2000, magnet: 1500, electricity: 2000, glass: 1500, polymer: 1500, concrete: 1500, silicon: 1500 };
const RESOURCE_KEYS = Object.keys(STARTING_RESOURCES);
const TRADE_DELAY_MONTHS = 3;
const TRADE_DELAY_TICKS = TRADE_DELAY_MONTHS * TICKS_PER_MONTH;
const TRADE_PRICES = Object.fromEntries(RESOURCE_KEYS.map((resource) => [resource, 1]));
const STARTING_POPULATION = 100;
const STARTING_POPULATION_MAX = 100;
const STARTING_CREDITS = 500;

const BUILDINGS = {
  farm: { name: 'Farm', cost: { lumber: 15, steel: 10 }, buildTime: 2, capacity: { nutrition: 200 }, production: { nutrition: 4 }, category: 'economy' },
  lumber_camp: { name: 'Lumber Camp', cost: { lumber: 10, steel: 5 }, buildTime: 1, capacity: { lumber: 150 }, production: { lumber: 3 }, category: 'economy' },
  steel_mill: { name: 'Steel Mill', cost: { lumber: 20, steel: 10 }, buildTime: 2, capacity: { steel: 100 }, production: { steel: 2 }, category: 'economy' },
  alloy_quarry: { name: 'Alloy Quarry', cost: { lumber: 25, steel: 15 }, buildTime: 2, capacity: { alloy: 80 }, production: { alloy: 1 }, category: 'economy' },
  oil_rig: { name: 'Oil Rig', cost: { steel: 30, alloy: 20 }, buildTime: 3, capacity: { oil: 100 }, production: { oil: 2 }, requires: ['electricity'], category: 'economy' },
  magnet_extractor: { name: 'Magnet Extractor', cost: { steel: 40, alloy: 15, oil: 10 }, buildTime: 3, capacity: { magnet: 60 }, production: { magnet: 1 }, requires: ['advanced_mining'], category: 'economy' },
  power_plant: { name: 'Power Plant', cost: { steel: 25, oil: 15 }, buildTime: 2, capacity: { electricity: 80 }, production: { electricity: 3 }, upkeep: { oil: 1 }, requires: ['electricity'], category: 'economy' },
  glassworks: { name: 'Glassworks', cost: { lumber: 15, steel: 10 }, buildTime: 2, capacity: { glass: 120 }, production: { glass: 2 }, requires: ['industrial_furnaces'], category: 'economy' },
  polymer_plant: { name: 'Polymer Plant', cost: { steel: 10, oil: 15, electricity: 5 }, buildTime: 2, capacity: { polymer: 120 }, production: { polymer: 2 }, requires: ['polymer'], category: 'economy' },
  concrete_plant: { name: 'Concrete Plant', cost: { lumber: 20, steel: 10, electricity: 5 }, buildTime: 2, capacity: { concrete: 180 }, production: { concrete: 3 }, requires: ['industrial_materials'], category: 'economy' },
  silicon_refinery: { name: 'Silicon Refinery', cost: { steel: 20, alloy: 10, electricity: 5 }, buildTime: 3, capacity: { silicon: 80 }, production: { silicon: 1 }, requires: ['advanced_mining'], category: 'economy' },
  shelter: { name: 'Shelter', cost: { lumber: 20, steel: 10 }, buildTime: 1, category: 'support' },
  barracks: { name: 'Barracks', cost: { lumber: 30, steel: 20 }, buildTime: 2, category: 'support' },
  factory: { name: 'Factory', cost: { steel: 40, alloy: 25, oil: 10 }, buildTime: 3, requires: ['electricity'], category: 'support' },
  radar_station: { name: 'Radar Station', cost: { steel: 20, alloy: 15, magnet: 10 }, buildTime: 2, requires: ['advanced_scouting'], category: 'support' },
  anti_missile_battery: {
    name: 'Anti-Missile Battery',
    cost: { steel: 30, oil: 15, magnet: 10 },
    buildTime: 2,
    requires: ['guided_missiles'],
    category: 'military',
    defenceAssignable: true,
    defense: 24,
    combatWeight: 24,
    missileIntercept: [['ballistic_missile', 0.5], ['cruise_missile', 1]]
  },
  land_mine: {
    name: 'Land Mine',
    cost: { lumber: 50, steel: 30 },
    buildTime: 2,
    category: 'military',
    defenceAssignable: true,
    defense: 18,
    combatWeight: 18,
    combatProfile: [['tank', 1], ['infantry', 4], ['special_force', 4], ['anti_tank_squad', 2], ['attack_helicopter', 0.2]]
  },
  dry_dock: { name: 'Dry Dock', cost: { lumber: 50, steel: 40, concrete: 20 }, buildTime: 3, category: 'support' },
  airfield: { name: 'Airfield', cost: { steel: 60, alloy: 30, concrete: 40 }, buildTime: 3, category: 'support' }
};

const UNITS = {
  infantry: {
    name: 'Infantry',
    section: 'military',
    cost: { nutrition: 8, steel: 4 },
    upkeep: { nutrition: 0.5 },
    attack: 10,
    defense: 5,
    combatWeight: 10,
    requiresBuilding: 'barracks',
    assault: true,
    defenceAssignable: true,
    combatProfile: [['tank', 0.2], ['special_force', 1], ['infantry', 1], ['anti_tank_squad', 0.6], ['land_mine', 0.2], ['anti_missile_battery', 0.2]]
  },
  special_force: {
    name: 'Special Force',
    section: 'military',
    cost: { nutrition: 10, steel: 8, electricity: 2 },
    upkeep: { nutrition: 1, electricity: 0.5 },
    attack: 22,
    defense: 14,
    combatWeight: 22,
    requiresTech: 'advanced_scouting',
    requiresBuilding: 'barracks',
    assault: true,
    defenceAssignable: true,
    combatProfile: [['tank', 0.3], ['special_force', 1], ['infantry', 2], ['anti_tank_squad', 1], ['land_mine', 0.5], ['anti_missile_battery', 0.4]]
  },
  tank: {
    name: 'Tank',
    section: 'military',
    cost: { steel: 12, oil: 8 },
    upkeep: { nutrition: 1, oil: 0.5 },
    attack: 25,
    defense: 12,
    combatWeight: 28,
    requiresTech: 'tanks',
    requiresBuilding: 'barracks',
    assault: true,
    defenceAssignable: true,
    combatProfile: [['tank', 1], ['anti_tank_squad', 1], ['special_force', 5], ['infantry', 5], ['land_mine', 1], ['anti_missile_battery', 1]]
  },
  war_ship: {
    name: 'War Ship',
    section: 'military',
    cost: { steel: 50, alloy: 30, oil: 20 },
    upkeep: { nutrition: 2, oil: 1 },
    attack: 50,
    defense: 25,
    combatWeight: 52,
    requiresTech: 'naval_warfare',
    requiresBuilding: 'dry_dock',
    assault: true,
    defenceAssignable: true,
    combatProfile: [['war_ship', 1], ['submarine', 0.5], ['naval_strike_missile', 0.5], ['tank', 0.8], ['anti_missile_battery', 0.7], ['infantry', 3]]
  },
  submarine: {
    name: 'Submarine',
    section: 'military',
    cost: { steel: 60, alloy: 35, oil: 25 },
    upkeep: { nutrition: 2, oil: 1.5 },
    attack: 80,
    defense: 40,
    combatWeight: 78,
    requiresTech: 'naval_warfare',
    requiresBuilding: 'dry_dock',
    assault: true,
    defenceAssignable: true,
    combatProfile: [['war_ship', 1.2], ['submarine', 1], ['naval_strike_missile', 0.7], ['tank', 1], ['anti_missile_battery', 0.8]]
  },
  fighter_zed: {
    name: 'Fighter Zed',
    section: 'military',
    cost: { alloy: 40, oil: 20, silicon: 10 },
    upkeep: { nutrition: 1, oil: 2 },
    attack: 40,
    defense: 20,
    combatWeight: 42,
    requiresTech: 'aerial_warfare',
    requiresBuilding: 'airfield',
    assault: true,
    defenceAssignable: true,
    combatProfile: [['fighter_zed', 1], ['attack_helicopter', 1.5], ['combat_drone', 4], ['scout_drone', 6], ['air_defence_gun', 0.4], ['war_ship', 0.4], ['tank', 0.4], ['infantry', 2]]
  },
  attack_helicopter: {
    name: 'Attack Helicopter',
    section: 'military',
    cost: { steel: 20, alloy: 25, oil: 15 },
    upkeep: { nutrition: 1, oil: 1.5 },
    attack: 60,
    defense: 30,
    combatWeight: 58,
    requiresTech: 'aerial_warfare',
    requiresBuilding: 'airfield',
    assault: true,
    defenceAssignable: true,
    combatProfile: [['tank', 1.2], ['anti_tank_squad', 1], ['infantry', 4], ['special_force', 4], ['air_defence_gun', 0.4], ['land_mine', 1], ['war_ship', 0.4]]
  },
  combat_drone: {
    name: 'Combat Drone',
    section: 'military',
    cost: { alloy: 15, electricity: 10, silicon: 8 },
    upkeep: { electricity: 1, oil: 0.5 },
    attack: 35,
    defense: 18,
    combatWeight: 32,
    requiresTech: 'advanced_scouting',
    requiresBuilding: 'airfield',
    assault: true,
    defenceAssignable: true,
    combatProfile: [['infantry', 2], ['special_force', 2], ['tank', 0.3], ['combat_drone', 1], ['scout_drone', 2], ['fighter_zed', 0.4], ['attack_helicopter', 0.5], ['air_defence_gun', 0.25], ['anti_missile_battery', 0.2]]
  },
  ballistic_missile: {
    name: 'Ballistic Missile',
    section: 'military',
    cost: { steel: 20, alloy: 20, oil: 12 },
    attack: 160,
    requiresTech: 'missile_silo',
    missile: true,
    missileIntegrity: 1.5,
    strike: {
      economy: { buildingLosses: 4, resourcePct: 0.15 },
      buildings: { buildingLosses: 3, populationLoss: 6 },
      research_center: { delayMonths: 12, disableCount: 2, disableYears: 2 }
    }
  },
  cruise_missile: {
    name: 'Cruise Missile',
    section: 'military',
    cost: { steel: 14, alloy: 12, oil: 10 },
    attack: 110,
    requiresTech: 'missile_silo',
    missile: true,
    missileIntegrity: 1,
    strike: {
      economy: { buildingLosses: 2, resourcePct: 0.08 },
      buildings: { buildingLosses: 2, populationLoss: 3 },
      research_center: { delayMonths: 6, disableCount: 1, disableYears: 1 }
    }
  },
  scout_drone: { name: 'Scout Drone', section: 'military', cost: { oil: 5, electricity: 3 }, upkeep: { electricity: 1 }, requiresBuilding: 'radar_station' },
  anti_tank_squad: {
    name: 'Anti-Tank Squad',
    section: 'defence',
    cost: { nutrition: 6, steel: 8 },
    upkeep: { nutrition: 0.5 },
    defense: 18,
    combatWeight: 18,
    requiresTech: 'tanks',
    requiresBuilding: 'barracks',
    defenceAssignable: true,
    combatProfile: [['tank', 1.2], ['attack_helicopter', 0.2], ['infantry', 0.5], ['special_force', 0.5], ['land_mine', 0.3]]
  },
  naval_strike_missile: {
    name: 'Naval Strike Missile',
    section: 'defence',
    cost: { steel: 18, alloy: 15, oil: 10 },
    defense: 45,
    combatWeight: 45,
    requiresTech: 'guided_missiles',
    requiresBuilding: 'dry_dock',
    defenceAssignable: true,
    combatProfile: [['war_ship', 1.5], ['submarine', 1], ['tank', 0.5], ['anti_missile_battery', 0.5]]
  },
  air_defence_gun: {
    name: 'Air Defence Gun',
    section: 'defence',
    cost: { steel: 16, alloy: 8, electricity: 6 },
    upkeep: { electricity: 0.5 },
    defense: 28,
    combatWeight: 28,
    requiresTech: 'guided_missiles',
    requiresBuilding: 'airfield',
    defenceAssignable: true,
    combatProfile: [['fighter_zed', 1.2], ['attack_helicopter', 1.2], ['combat_drone', 4], ['scout_drone', 6]]
  }
};

const RESEARCH = {
  basic_tools: { name: 'Basic Tools', cost: { alloy: 15 }, years: 2, minYear: 3 },
  electricity: { name: 'Electricity', cost: { alloy: 25, magnet: 5 }, years: 3, prereq: 'basic_tools' },
  guided_missiles: { name: 'Guided Missiles', cost: { alloy: 30, magnet: 10 }, years: 3, prereq: 'basic_tools' },
  missile_silo: { name: 'Missile Silo', cost: { alloy: 45, magnet: 20, steel: 10 }, years: 4, prereq: 'guided_missiles' },
  industrial_furnaces: { name: 'Industrial Furnaces', cost: { alloy: 20, steel: 5 }, years: 2, prereq: 'basic_tools' },
  advanced_mining: { name: 'Advanced Mining', cost: { alloy: 35, magnet: 15 }, years: 3, prereq: 'electricity' },
  tanks: { name: 'Tank Technology', cost: { alloy: 40, magnet: 20 }, years: 4, prereq: 'guided_missiles' },
  naval_warfare: { name: 'Naval Warfare', cost: { alloy: 40, magnet: 20 }, years: 4, prereq: 'basic_tools' },
  aerial_warfare: { name: 'Aerial Warfare', cost: { alloy: 50, silicon: 20 }, years: 4, prereq: 'electricity' },
  advanced_scouting: { name: 'Advanced Scouting', cost: { alloy: 25, magnet: 10 }, years: 2, prereq: 'industrial_furnaces' },
  polymer: { name: 'Polymer', cost: { alloy: 30, oil: 10 }, years: 3, prereq: 'electricity' },
  industrial_materials: { name: 'Industrial Materials', cost: { alloy: 20, steel: 5, electricity: 5 }, years: 2, prereq: 'industrial_furnaces' },
  nuclear_technology: { name: 'Nuclear Technology', cost: { alloy: 100, magnet: 50, electricity: 30 }, years: 5, prereq: 'advanced_mining' }
};

const TARGET_BUCKETS = {
  economy: { label: 'Economy', emoji: '💹' },
  buildings: { label: 'Buildings', emoji: '🏗️' },
  research_center: { label: 'Research Center', emoji: '🧠' }
};
const TARGET_BUCKET_KEYS = Object.keys(TARGET_BUCKETS);
const ECONOMY_BUILDING_IDS = Object.entries(BUILDINGS).filter(([, cfg]) => cfg.category === 'economy').map(([id]) => id);
const SUPPORT_BUILDING_IDS = Object.entries(BUILDINGS).filter(([, cfg]) => cfg.category === 'support').map(([id]) => id);
const DEFENCE_BUILDING_IDS = Object.entries(BUILDINGS).filter(([, cfg]) => cfg.defenceAssignable).map(([id]) => id);
const DEFENCE_ASSIGNABLE_UNIT_IDS = Object.entries(UNITS).filter(([, unit]) => unit.defenceAssignable).map(([id]) => id);
const DEFENCE_ASSIGNABLE_IDS = [...DEFENCE_BUILDING_IDS, ...DEFENCE_ASSIGNABLE_UNIT_IDS];
const RESEARCH_DISRUPTION_PRIORITY = [
  'nuclear_technology',
  'missile_silo',
  'aerial_warfare',
  'naval_warfare',
  'tanks',
  'advanced_scouting',
  'guided_missiles',
  'industrial_materials',
  'polymer',
  'advanced_mining',
  'electricity',
  'basic_tools',
  'industrial_furnaces'
];

const STARTING_BUILDINGS = {
  farm: 8,
  lumber_camp: 6,
  steel_mill: 6,
  alloy_quarry: 5,
  oil_rig: 4,
  magnet_extractor: 4,
  power_plant: 5,
  glassworks: 3,
  polymer_plant: 3,
  concrete_plant: 3,
  silicon_refinery: 3,
  shelter: 10,
  barracks: 3,
  factory: 2,
  radar_station: 2,
  anti_missile_battery: 1,
  land_mine: 1,
  dry_dock: 1,
  airfield: 1
};

const STARTING_UNITS = {
  infantry: 50,
  special_force: 20,
  tank: 30,
  war_ship: 20,
  fighter_zed: 20,
  attack_helicopter: 12,
  combat_drone: 20,
  ballistic_missile: 10,
  cruise_missile: 12,
  submarine: 8,
  scout_drone: 20,
  anti_tank_squad: 18,
  naval_strike_missile: 10,
  air_defence_gun: 12
};

const STARTING_RESEARCH = Object.keys(RESEARCH);

const rooms = new Map();

function createEmptyDefenceAssignments() {
  return Object.fromEntries(TARGET_BUCKET_KEYS.map((bucket) => [
    bucket,
    Object.fromEntries(DEFENCE_ASSIGNABLE_IDS.map((id) => [id, 0]))
  ]));
}

function createScoutIntelAssignments() {
  return Object.fromEntries(TARGET_BUCKET_KEYS.map((bucket) => [bucket, -1]));
}

function createPlayer(playerId, name) {
  return {
    playerId,
    reconnectToken: randomUUID(),
    name,
    population: STARTING_POPULATION,
    populationMax: STARTING_POPULATION_MAX,
    credits: STARTING_CREDITS,
    resources: { ...STARTING_RESOURCES },
    buildings: Object.fromEntries(Object.keys(BUILDINGS).map((k) => [k, STARTING_BUILDINGS[k] || 0])),
    buildingQueues: [],
    units: { ...STARTING_UNITS },
    research: { completed: [...STARTING_RESEARCH], active: null, disabledUntil: {} },
    eventLog: [],
    chat: [],
    pending: [],
    tradeOrders: [],
    autoTrades: Object.fromEntries(RESOURCE_KEYS.map((resource) => [resource, null])),
    scoutCooldownUntil: -1,
    scoutIntelUntil: createScoutIntelAssignments(),
    opponentIntelLog: [],
    defenceAssignments: createEmptyDefenceAssignments(),
    forcedView: null,
    researchLockUntil: -1,
    zeroYears: 0,
    disconnected: false
  };
}

function getBucketLabel(bucket) {
  return TARGET_BUCKETS[bucket]?.label || bucket;
}

function isValidTargetBucket(bucket) {
  return TARGET_BUCKET_KEYS.includes(bucket);
}

function hasActiveScoutIntel(player, bucket, year) {
  if (!isValidTargetBucket(bucket)) return false;
  return year < (player.scoutIntelUntil?.[bucket] ?? -1);
}

function getAttackImpactModifier(player, bucket, year) {
  return hasActiveScoutIntel(player, bucket, year) ? 1 : 0.8;
}

function describeAttackImpactModifier(modifier) {
  return modifier >= 1
    ? 'Attack efficiency: 100% (active scout intel)'
    : 'Attack efficiency: 80% (no active scout intel)';
}

function scaleImpactValue(value, modifier) {
  const numeric = Math.max(0, Number(value || 0));
  if (numeric <= 0 || modifier <= 0) return 0;
  if (modifier >= 1) return Math.ceil(numeric * modifier);
  return Math.max(1, Math.floor(numeric * modifier));
}

function scaleBucketImpact(impact = {}, modifier = 1) {
  return {
    buildingLosses: scaleImpactValue(impact.buildingLosses, modifier),
    resourcePct: (impact.resourcePct || 0) * modifier,
    lootPct: (impact.lootPct || 0) * modifier,
    populationLoss: scaleImpactValue(impact.populationLoss, modifier),
    delayMonths: scaleImpactValue(impact.delayMonths, modifier),
    disableCount: scaleImpactValue(impact.disableCount, modifier),
    disableYears: scaleImpactValue(impact.disableYears, modifier)
  };
}

function getBucketBuildingIds(bucket) {
  if (bucket === 'economy') return ECONOMY_BUILDING_IDS;
  if (bucket === 'buildings') return SUPPORT_BUILDING_IDS;
  return [];
}

function appendIntel(player, year, entry) {
  player.opponentIntelLog.unshift({
    id: randomUUID(),
    year,
    tone: entry.tone || 'info',
    bucket: entry.bucket || null,
    title: entry.title,
    summary: entry.summary || '',
    details: Array.isArray(entry.details) ? entry.details : []
  });
}

function hasResearch(player, techId, year) {
  return player.research.completed.includes(techId) && year >= (player.research.disabledUntil?.[techId] || -1);
}

function getResearchDisableYear(player, techId) {
  return player.research.disabledUntil?.[techId] || -1;
}

function getRoomPhase(room) {
  if (room.winner) return 'finished';
  if (room.playerOrder.length < 2) return 'waiting';
  if (room.ticks === 0 && Date.now() < room.tickEndsAt) return 'countdown';
  return 'active';
}

function playerHasPendingAction(player, types) {
  return (player?.pending || []).some((action) => types.includes(action.type));
}

function isPlayerCritical(player) {
  if (!player) return false;
  const populationThreshold = Math.max(10, Math.ceil(player.populationMax * 0.25));
  return player.population <= populationThreshold || player.zeroYears >= 3;
}

function getWarCondition(room) {
  const phase = getRoomPhase(room);
  const players = room.playerOrder.map((id) => room.players[id]).filter(Boolean);

  if (phase === 'finished') {
    return {
      code: 'finished',
      label: 'War Ended',
      description: `Victory condition met. ${room.players[room.winner]?.name || 'A player'} won the match.`
    };
  }

  if (phase === 'waiting') {
    return {
      code: 'standby',
      label: 'Standby',
      description: 'The room is not full yet, so war actions are unavailable.'
    };
  }

  if (phase === 'countdown') {
    return {
      code: 'mobilizing',
      label: 'Mobilizing',
      description: 'Both players are connected and the match countdown is running.'
    };
  }

  if (players.some(isPlayerCritical)) {
    return {
      code: 'critical',
      label: 'Critical',
      description: 'At least one faction is close to collapse from low population or prolonged resource exhaustion.'
    };
  }

  return {
    code: 'active',
    label: '',
    description: ''
  };
}

function getYearEndsAt(room) {
  const phase = getRoomPhase(room);
  if (phase !== 'active') return room.tickEndsAt;
  const ticksIntoYear = room.ticks % TICKS_PER_YEAR;
  const ticksLeftInYear = ticksIntoYear === 0 ? TICKS_PER_YEAR : TICKS_PER_YEAR - ticksIntoYear;
  return Date.now() + ticksLeftInYear * TICK_MS;
}

function appendEvent(player, year, message, type = 'info') {
  player.eventLog.unshift({ year, message, type });
  player.eventLog = player.eventLog.slice(0, 10);
}

function canAfford(resources, cost) {
  return Object.entries(cost).every(([k, v]) => (resources[k] ?? 0) >= v);
}

function payCost(resources, cost) {
  for (const [k, v] of Object.entries(cost)) resources[k] -= v;
}

function addResourceDelta(deltas, key, value) {
  deltas[key] = (deltas[key] || 0) + value;
}

function getPlayerCapacity(player) {
  const capacity = Object.fromEntries(RESOURCE_KEYS.map((k) => [k, 999999]));
  for (const [id, count] of Object.entries(player.buildings)) {
    const cfg = BUILDINGS[id];
    if (!cfg?.capacity || count <= 0) continue;
    for (const [rk, rv] of Object.entries(cfg.capacity)) capacity[rk] = (capacity[rk] || 0) + rv * count;
  }
  return capacity;
}

function getTradeUnitPrice(resource) {
  return TRADE_PRICES[resource] || 1;
}

function getTradeBuyCost(resource, amount) {
  return amount * getTradeUnitPrice(resource) + TRADE_FEE;
}

function getTradeSellRevenue(resource, amount) {
  return Math.max(0, amount * getTradeUnitPrice(resource) - TRADE_FEE);
}

function getEntityConfig(id) {
  return UNITS[id] || BUILDINGS[id] || null;
}

function getOwnedAssetCount(player, id) {
  if (Object.hasOwn(player.units, id)) return player.units[id] || 0;
  if (Object.hasOwn(player.buildings, id)) return player.buildings[id] || 0;
  return 0;
}

function getBucketAssignments(player, bucket) {
  return player.defenceAssignments?.[bucket] || {};
}

function getAssignedCount(player, id, excludeBucket = null) {
  let total = 0;
  for (const bucket of TARGET_BUCKET_KEYS) {
    if (bucket === excludeBucket) continue;
    total += player.defenceAssignments?.[bucket]?.[id] || 0;
  }
  return total;
}

function normalizeDefenceAssignments(player, bucket, assignments = {}) {
  const normalized = {};
  for (const id of DEFENCE_ASSIGNABLE_IDS) {
    const available = Math.max(0, getOwnedAssetCount(player, id) - getAssignedCount(player, id, bucket));
    const requested = Math.max(0, Math.floor(Number(assignments[id] || 0)));
    normalized[id] = Math.min(requested, available);
  }
  return normalized;
}

function rebalanceDefenceAssignments(player) {
  for (const bucket of TARGET_BUCKET_KEYS) {
    player.defenceAssignments[bucket] = normalizeDefenceAssignments(player, bucket, player.defenceAssignments[bucket]);
  }
}

function getAvailableAttackUnitCount(player, id) {
  return Math.max(0, (player.units[id] || 0) - getAssignedCount(player, id));
}

function getPendingMissileReservations(player, missileId) {
  return (player.pending || []).filter((action) => action.type === 'missile' && action.missileId === missileId).length;
}

function getPendingScoutReservations(player) {
  return (player.pending || []).filter((action) => action.type === 'scout').length;
}

function getPendingAssaultReservations(player, unitId) {
  return (player.pending || [])
    .filter((action) => action.type === 'assault')
    .reduce((sum, action) => sum + (action.committedUnits?.[unitId] || 0), 0);
}

function clonePositiveRoster(roster = {}) {
  return Object.fromEntries(
    Object.entries(roster)
      .map(([id, count]) => [id, Math.max(0, Math.floor(count || 0))])
      .filter(([, count]) => count > 0)
  );
}

function hasCombatants(roster = {}) {
  return Object.values(roster).some((count) => count > 0);
}

function getCombatProfile(id) {
  return getEntityConfig(id)?.combatProfile || [];
}

function getCombatWeight(id) {
  const entity = getEntityConfig(id);
  return entity?.combatWeight || entity?.attack || entity?.defense || 0;
}

function getCombatScore(roster = {}) {
  return Object.entries(roster).reduce((sum, [id, count]) => sum + count * getCombatWeight(id), 0);
}

function resolveCombatWave(sourceRoster, targetRoster) {
  const kills = {};
  for (const [attackerId, count] of Object.entries(sourceRoster)) {
    let available = count;
    for (const [targetId, ratio] of getCombatProfile(attackerId)) {
      if (available <= 0 || ratio <= 0) break;
      const remaining = (targetRoster[targetId] || 0) - (kills[targetId] || 0);
      if (remaining <= 0) continue;
      const potential = Math.floor(available * ratio);
      if (potential <= 0) continue;
      const actual = Math.min(remaining, potential);
      if (actual <= 0) continue;
      kills[targetId] = (kills[targetId] || 0) + actual;
      available = Math.max(0, available - Math.ceil(actual / ratio));
    }
  }
  return kills;
}

function applyRosterLosses(roster, kills) {
  const losses = {};
  for (const [id, count] of Object.entries(kills || {})) {
    const actual = Math.min(roster[id] || 0, count);
    if (actual <= 0) continue;
    roster[id] -= actual;
    if (roster[id] <= 0) delete roster[id];
    losses[id] = actual;
  }
  return losses;
}

function getRosterLosses(initialRoster, finalRoster) {
  const losses = {};
  for (const [id, count] of Object.entries(initialRoster)) {
    const lost = count - (finalRoster[id] || 0);
    if (lost > 0) losses[id] = lost;
  }
  return losses;
}

function simulateCombat(attackerRoster, defenderRoster) {
  const attackers = clonePositiveRoster(attackerRoster);
  const defenders = clonePositiveRoster(defenderRoster);
  let rounds = 0;

  while (rounds < 6 && hasCombatants(attackers) && hasCombatants(defenders)) {
    rounds += 1;
    const defenderKills = resolveCombatWave(attackers, defenders);
    const attackerKills = resolveCombatWave(defenders, attackers);
    const actualDefenderLosses = applyRosterLosses(defenders, defenderKills);
    const actualAttackerLosses = applyRosterLosses(attackers, attackerKills);
    if (!Object.keys(actualDefenderLosses).length && !Object.keys(actualAttackerLosses).length) break;
  }

  const attackerScore = getCombatScore(attackers);
  const defenderScore = getCombatScore(defenders);
  const attackerWon = hasCombatants(attackers) && (!hasCombatants(defenders) || attackerScore > defenderScore);

  return {
    attackerWon,
    attackersRemaining: attackers,
    defendersRemaining: defenders,
    attackerLosses: getRosterLosses(attackerRoster, attackers),
    defenderLosses: getRosterLosses(defenderRoster, defenders),
    attackerScore,
    defenderScore
  };
}

function setForcedIntelView(player, reason) {
  const lockedUntil = Date.now() + 15_000;
  player.forcedView = {
    tab: 'opponent_intel',
    lockedUntil,
    reason
  };
}

function getMissileInterceptScore(player, bucket, missileId) {
  let score = 0;
  for (const [id, count] of Object.entries(getBucketAssignments(player, bucket))) {
    if (!count) continue;
    const intercept = getEntityConfig(id)?.missileIntercept || [];
    for (const [targetId, value] of intercept) {
      if (targetId === missileId) score += value * count;
    }
  }
  return score;
}

function removeBuildings(player, ids, amount) {
  const losses = {};
  let remaining = Math.max(0, Math.floor(amount || 0));
  while (remaining > 0) {
    const target = ids
      .filter((id) => (player.buildings[id] || 0) > 0)
      .sort((a, b) => (player.buildings[b] - player.buildings[a]) || a.localeCompare(b))[0];
    if (!target) break;
    losses[target] = (losses[target] || 0) + 1;
    player.buildings[target] -= 1;
    if (target === 'shelter') {
      player.populationMax = Math.max(0, player.populationMax - 5);
      player.population = Math.min(player.population, player.populationMax);
    }
    remaining -= 1;
  }
  return losses;
}

function summarizeCountMap(losses, labelSource) {
  return Object.entries(losses || {})
    .filter(([, count]) => count > 0)
    .map(([id, count]) => `${labelSource[id]?.name || id}: -${count}`);
}

function applyEconomyImpact(attacker, defender, { buildingLosses = 0, resourcePct = 0, lootPct = 0 }) {
  const details = [];
  const losses = removeBuildings(defender, ECONOMY_BUILDING_IDS, buildingLosses);
  details.push(...summarizeCountMap(losses, BUILDINGS));

  if (lootPct > 0) {
    const targetResource = [...RESOURCE_KEYS]
      .sort((a, b) => (defender.resources[b] - defender.resources[a]) || a.localeCompare(b))[0];
    const amount = targetResource ? Math.floor(defender.resources[targetResource] * lootPct) : 0;
    if (targetResource && amount > 0) {
      defender.resources[targetResource] -= amount;
      attacker.resources[targetResource] += amount;
      details.push(`Looted ${amount} ${targetResource}`);
    }
  } else if (resourcePct > 0) {
    const targets = [...RESOURCE_KEYS]
      .filter((resource) => defender.resources[resource] > 0)
      .sort((a, b) => (defender.resources[b] - defender.resources[a]) || a.localeCompare(b))
      .slice(0, 2);
    for (const resource of targets) {
      const amount = Math.floor(defender.resources[resource] * resourcePct);
      if (amount <= 0) continue;
      defender.resources[resource] -= amount;
      details.push(`${resource}: -${amount}`);
    }
  }

  return details.length ? details : ['Economy defences absorbed most of the impact.'];
}

function applyBuildingsImpact(defender, { buildingLosses = 0, populationLoss = 0 }) {
  const details = [];
  const losses = removeBuildings(defender, SUPPORT_BUILDING_IDS, buildingLosses);
  details.push(...summarizeCountMap(losses, BUILDINGS));
  if (populationLoss > 0) {
    defender.population = Math.max(0, defender.population - populationLoss);
    details.push(`Population: -${populationLoss}`);
  }
  return details.length ? details : ['Buildings held under pressure.'];
}

function applyResearchCenterImpact(room, defender, { delayMonths = 0, disableCount = 0, disableYears = 0 }) {
  const details = [];

  if (delayMonths > 0 && defender.research.active) {
    defender.research.active.ticksRemaining += delayMonths * TICKS_PER_MONTH;
    details.push(`${RESEARCH[defender.research.active.id]?.name || defender.research.active.id} delayed ${delayMonths} months`);
  }

  const untilYear = disableYears > 0 ? room.year + disableYears : room.year;
  const candidates = RESEARCH_DISRUPTION_PRIORITY
    .filter((techId) => defender.research.completed.includes(techId))
    .sort((a, b) => (getResearchDisableYear(defender, a) - getResearchDisableYear(defender, b)) || a.localeCompare(b))
    .slice(0, disableCount);

  for (const techId of candidates) {
    defender.research.disabledUntil[techId] = Math.max(getResearchDisableYear(defender, techId), untilYear);
    details.push(`${RESEARCH[techId]?.name || techId} disabled until Year ${defender.research.disabledUntil[techId]}`);
  }

  if (disableYears > 0) {
    defender.researchLockUntil = Math.max(defender.researchLockUntil, untilYear);
    details.push(`New research blocked until Year ${defender.researchLockUntil}`);
  }

  return details.length ? details : ['Research Center stayed online.'];
}

function formatDefenderAssignments(player, bucket) {
  return DEFENCE_ASSIGNABLE_IDS
    .filter((id) => (player.defenceAssignments?.[bucket]?.[id] || 0) > 0)
    .map((id) => `${getEntityConfig(id)?.name || id} x${player.defenceAssignments[bucket][id]}`);
}

function buildScoutReport(room, opponent, bucket) {
  const details = [];
  if (bucket === 'economy') {
    details.push(...ECONOMY_BUILDING_IDS.filter((id) => opponent.buildings[id] > 0).map((id) => `${BUILDINGS[id].name}: ${opponent.buildings[id]}`));
    details.push(...RESOURCE_KEYS.filter((resource) => opponent.resources[resource] > 0).map((resource) => `${resource}: ${Math.floor(opponent.resources[resource])}`));
  } else if (bucket === 'buildings') {
    details.push(...SUPPORT_BUILDING_IDS.filter((id) => opponent.buildings[id] > 0).map((id) => `${BUILDINGS[id].name}: ${opponent.buildings[id]}`));
  } else if (bucket === 'research_center') {
    if (opponent.research.active) {
      details.push(`Active research: ${RESEARCH[opponent.research.active.id]?.name || opponent.research.active.id} (${Math.ceil(opponent.research.active.ticksRemaining / TICKS_PER_MONTH)} months left)`);
    } else {
      details.push('Active research: none');
    }
    details.push(opponent.researchLockUntil > room.year ? `Research lock until Year ${opponent.researchLockUntil}` : 'Research lock: none');
    details.push(...opponent.research.completed.map((techId) => {
      const disabledUntil = getResearchDisableYear(opponent, techId);
      return disabledUntil > room.year
        ? `${RESEARCH[techId]?.name || techId}: disabled until Year ${disabledUntil}`
        : `${RESEARCH[techId]?.name || techId}: online`;
    }));
  }

  const defenders = formatDefenderAssignments(opponent, bucket);
  if (defenders.length) details.push(`Defenders: ${defenders.join(', ')}`);
  return details.length ? details : ['No meaningful signature detected.'];
}

function applyBucketImpact(room, attacker, defender, bucket, impact) {
  if (bucket === 'economy') return applyEconomyImpact(attacker, defender, impact);
  if (bucket === 'buildings') return applyBuildingsImpact(defender, impact);
  return applyResearchCenterImpact(room, defender, impact);
}

function getReservedIncomingTradeAmount(player, resource) {
  return player.tradeOrders
    .filter((order) => order.mode === 'buy' && order.resource === resource)
    .reduce((sum, order) => sum + order.amount, 0);
}

function settleTradeOrder(room, player, order) {
  if (order.mode === 'buy') {
    const capacity = getPlayerCapacity(player)[order.resource];
    const freeSpace = Math.max(0, capacity - player.resources[order.resource]);
    const delivered = Math.min(order.amount, freeSpace);
    const refunded = order.amount - delivered;

    if (delivered > 0) {
      player.resources[order.resource] += delivered;
      appendEvent(player, room.year, `📦 Trade arrived: bought ${delivered} ${order.resource}`);
    }

    if (refunded > 0) {
      const refundCredits = refunded * getTradeUnitPrice(order.resource);
      player.credits += refundCredits;
      appendEvent(player, room.year, `⚠️ Trade overflow: refunded ${refundCredits} credits for ${refunded} ${order.resource}`, 'warn');
    }
    return;
  }

  const revenue = getTradeSellRevenue(order.resource, order.amount);
  player.credits += revenue;
  appendEvent(player, room.year, `💳 Trade settled: sold ${order.amount} ${order.resource} for ${revenue} credits`);
}

function resolveAutoTrades(room, player) {
  for (const resource of RESOURCE_KEYS) {
    const config = player.autoTrades[resource];
    if (!config) continue;

    if (config.mode === 'buy') {
      const cost = getTradeBuyCost(resource, config.amount);
      const capacity = getPlayerCapacity(player)[resource];
      const reservedIncoming = getReservedIncomingTradeAmount(player, resource);
      if (player.credits < cost) {
        appendEvent(player, room.year, `🔁 Auto trade skipped: not enough credits to buy ${config.amount} ${resource}`, 'warn');
        continue;
      }
      if (player.resources[resource] + reservedIncoming + config.amount > capacity) {
        appendEvent(player, room.year, `🔁 Auto trade skipped: storage full for ${resource}`, 'warn');
        continue;
      }
      player.credits -= cost;
      player.resources[resource] += config.amount;
      appendEvent(player, room.year, `🔁 Auto bought ${config.amount} ${resource} for ${cost} credits`);
      continue;
    }

    if ((player.resources[resource] ?? 0) < config.amount) {
      appendEvent(player, room.year, `🔁 Auto trade skipped: not enough ${resource} to sell ${config.amount}`, 'warn');
      continue;
    }

    const revenue = getTradeSellRevenue(resource, config.amount);
    player.resources[resource] -= config.amount;
    player.credits += revenue;
    appendEvent(player, room.year, `🔁 Auto sold ${config.amount} ${resource} for ${revenue} credits`);
  }
}

function getAssaultUnitIds() {
  return Object.entries(UNITS).filter(([, unit]) => unit.assault).map(([id]) => id);
}

function getDefenceUnitIds() {
  return Object.entries(UNITS).filter(([, unit]) => unit.defense).map(([id]) => id);
}

function resolveScoutAction(room, player, opponent, action) {
  const bucket = isValidTargetBucket(action.targetBucket) ? action.targetBucket : 'economy';
  if (player.units.scout_drone <= 0 || room.year < player.scoutCooldownUntil) return;
  player.scoutCooldownUntil = room.year + 1;
  player.scoutIntelUntil[bucket] = Math.max(player.scoutIntelUntil[bucket] || -1, room.year + 2);
  const details = buildScoutReport(room, opponent, bucket);
  appendIntel(player, room.year, {
    tone: 'error',
    bucket,
    title: `${getBucketLabel(bucket)} scout report`,
    summary: `Scout completed on ${getBucketLabel(bucket)}.`,
    details
  });
  appendEvent(player, room.year, `🛰️ Scout completed on ${getBucketLabel(bucket)}. See Opponent Intel.`, 'error');
  appendEvent(opponent, room.year, `👁️ Scout detected over ${getBucketLabel(bucket)}.`, 'error blink');
}

function resolveMissileAction(room, player, opponent, action) {
  const missile = UNITS[action.missileId];
  const bucket = isValidTargetBucket(action.targetBucket) ? action.targetBucket : 'economy';
  if (!missile?.missile || !hasResearch(player, 'missile_silo', room.year) || player.units[action.missileId] <= 0) return;

  player.units[action.missileId] -= 1;
  const interceptScore = getMissileInterceptScore(opponent, bucket, action.missileId);
  const integrity = missile.missileIntegrity || 1;
  const effectiveness = Math.max(0, 1 - Math.min(interceptScore, integrity) / integrity);

  if (effectiveness <= 0) {
    appendEvent(player, room.year, `🛡️ ${missile.name} intercepted over ${getBucketLabel(bucket)}`);
    appendEvent(opponent, room.year, `🛡️ ${missile.name} intercepted over ${getBucketLabel(bucket)}`);
    appendIntel(player, room.year, {
      tone: 'warn',
      bucket,
      title: `${missile.name} intercepted`,
      summary: `${getBucketLabel(bucket)} held the incoming missile.`,
      details: formatDefenderAssignments(opponent, bucket)
    });
    appendIntel(opponent, room.year, {
      tone: 'error',
      bucket,
      title: `${missile.name} intercepted`,
      summary: `Assigned air defence stopped a strike on ${getBucketLabel(bucket)}.`,
      details: formatDefenderAssignments(opponent, bucket)
    });
    setForcedIntelView(opponent, `${missile.name} intercepted over ${getBucketLabel(bucket)}`);
    return;
  }

  const strike = missile.strike?.[bucket] || {};
  const attackModifier = getAttackImpactModifier(player, bucket, room.year);
  const scaledImpact = scaleBucketImpact(strike, effectiveness * attackModifier);
  const details = [
    describeAttackImpactModifier(attackModifier),
    ...applyBucketImpact(room, player, opponent, bucket, scaledImpact)
  ];

  appendEvent(player, room.year, `💥 ${missile.name} struck ${getBucketLabel(bucket)}`);
  appendEvent(opponent, room.year, `💥 Incoming ${missile.name} hit ${getBucketLabel(bucket)}. See Opponent Intel.`, 'error');
  appendIntel(player, room.year, {
    tone: 'error',
    bucket,
    title: `${missile.name} strike confirmed`,
    summary: `${getBucketLabel(bucket)} took deterministic missile damage.`,
    details
  });
  appendIntel(opponent, room.year, {
    tone: 'error',
    bucket,
    title: `${missile.name} impact report`,
    summary: `${getBucketLabel(bucket)} was struck.`,
    details
  });
  setForcedIntelView(opponent, `${missile.name} hit ${getBucketLabel(bucket)}`);
}

function buildDefenderRoster(player, bucket) {
  return clonePositiveRoster(getBucketAssignments(player, bucket));
}

function buildCommittedAssaultRoster(player, committedUnits = {}) {
  const roster = {};
  for (const id of getAssaultUnitIds()) {
    const requested = Math.max(0, Math.floor(Number(committedUnits[id] || 0)));
    const available = Math.max(0, getAvailableAttackUnitCount(player, id));
    if (requested > 0 && available > 0) roster[id] = Math.min(requested, available);
  }
  return clonePositiveRoster(roster);
}

function resolveAssaultAction(room, player, opponent, action) {
  const bucket = isValidTargetBucket(action.targetBucket) ? action.targetBucket : 'economy';
  const committed = buildCommittedAssaultRoster(player, action.committedUnits);
  if (!hasCombatants(committed)) return;

  const defenders = buildDefenderRoster(opponent, bucket);
  const battle = simulateCombat(committed, defenders);

  for (const [id, lost] of Object.entries(battle.attackerLosses)) {
    player.units[id] = Math.max(0, player.units[id] - lost);
  }
  for (const [id, lost] of Object.entries(battle.defenderLosses)) {
    if (opponent.defenceAssignments?.[bucket]?.[id]) {
      opponent.defenceAssignments[bucket][id] = Math.max(0, opponent.defenceAssignments[bucket][id] - lost);
    }
    if (Object.hasOwn(opponent.units, id)) opponent.units[id] = Math.max(0, opponent.units[id] - lost);
    if (Object.hasOwn(opponent.buildings, id)) opponent.buildings[id] = Math.max(0, opponent.buildings[id] - lost);
  }
  rebalanceDefenceAssignments(opponent);

  const battleDetails = [
    ...summarizeCountMap(battle.attackerLosses, { ...UNITS, ...BUILDINGS }).map((line) => `Attacker ${line}`),
    ...summarizeCountMap(battle.defenderLosses, { ...UNITS, ...BUILDINGS }).map((line) => `Defender ${line}`)
  ];

  if (battle.attackerWon) {
    const survivorScore = Math.max(1, Math.ceil(getCombatScore(battle.attackersRemaining) / 120));
    const attackModifier = getAttackImpactModifier(player, bucket, room.year);
    const baseImpact = bucket === 'economy'
      ? { buildingLosses: Math.min(4, survivorScore), lootPct: Math.min(0.18, 0.06 + survivorScore * 0.02) }
      : bucket === 'buildings'
        ? { buildingLosses: Math.min(4, Math.max(1, survivorScore)), populationLoss: Math.min(8, survivorScore * 2) }
        : { delayMonths: Math.max(3, survivorScore * 3), disableCount: Math.min(2, survivorScore), disableYears: survivorScore >= 2 ? 2 : 1 };
    const impact = scaleBucketImpact(baseImpact, attackModifier);
    const impactDetails = [
      describeAttackImpactModifier(attackModifier),
      ...applyBucketImpact(room, player, opponent, bucket, impact)
    ];
    appendEvent(player, room.year, `⚔️ Assault breached ${getBucketLabel(bucket)}`);
    appendEvent(opponent, room.year, `⚔️ ${getBucketLabel(bucket)} was breached. See Opponent Intel.`, 'error');
    appendIntel(player, room.year, {
      tone: 'error',
      bucket,
      title: `${getBucketLabel(bucket)} assault won`,
      summary: 'Committed forces broke through the assigned defence.',
      details: [...battleDetails, ...impactDetails]
    });
    appendIntel(opponent, room.year, {
      tone: 'error',
      bucket,
      title: `${getBucketLabel(bucket)} assault loss`,
      summary: 'Assigned defence was overrun.',
      details: [...battleDetails, ...impactDetails]
    });
    setForcedIntelView(opponent, `${getBucketLabel(bucket)} breached`);
    return;
  }

  appendEvent(player, room.year, `⚔️ Assault repelled at ${getBucketLabel(bucket)}`);
  appendEvent(opponent, room.year, `⚔️ ${getBucketLabel(bucket)} held the assault. See Opponent Intel.`, 'info');
  appendIntel(player, room.year, {
    tone: 'warn',
    bucket,
    title: `${getBucketLabel(bucket)} assault failed`,
    summary: 'Assigned defenders held the bucket.',
    details: battleDetails.length ? battleDetails : ['No major casualties recorded.']
  });
  appendIntel(opponent, room.year, {
    tone: 'info',
    bucket,
    title: `${getBucketLabel(bucket)} defended`,
    summary: 'Assigned defenders held the bucket.',
    details: battleDetails.length ? battleDetails : ['No major casualties recorded.']
  });
  setForcedIntelView(opponent, `${getBucketLabel(bucket)} defended`);
}

function createRoom() {
  let id;
  do id = String(Math.floor(1000 + Math.random() * 9000)); while (rooms.has(id));
  const room = { roomId: id, year: 0, month: 1, ticks: 0, tickEndsAt: Date.now() + TICK_MS, players: {}, playerOrder: [], winner: null };
  rooms.set(id, room);
  return room;
}

function resolveTick(room) {
  if (room.winner || room.playerOrder.length < 2) return;
  room.ticks += 1;
  const isYearEnd = room.ticks % TICKS_PER_YEAR === 0;
  const isMonthEnd = room.ticks % TICKS_PER_MONTH === 0;

  if (isMonthEnd) {
    room.month += 1;
    if (room.month > 12) {
      room.month = 1;
      room.year += 1;
    }
  }

  for (const playerId of room.playerOrder) {
    const p = room.players[playerId];
    const deltas = Object.fromEntries(RESOURCE_KEYS.map((k) => [k, 0]));
    const settledTradeOrders = [];

    // Resolve build/research queues every tick
    p.buildingQueues.forEach((q) => q.ticksRemaining--);
    const completed = p.buildingQueues.filter((q) => q.ticksRemaining <= 0);
    p.buildingQueues = p.buildingQueues.filter((q) => q.ticksRemaining > 0);
    for (const item of completed) {
      p.buildings[item.id]++;
      if (item.id === 'shelter') p.populationMax += 5;
      appendEvent(p, room.year, `✅ ${BUILDINGS[item.id].name} completed`);
    }
    if (p.research.active) {
      p.research.active.ticksRemaining--;
      if (p.research.active.ticksRemaining <= 0) {
        p.research.completed.push(p.research.active.id);
        appendEvent(p, room.year, `✅ Research completed: ${RESEARCH[p.research.active.id].name}`);
        p.research.active = null;
      }
    }

    p.tradeOrders.forEach((order) => order.ticksRemaining--);
    for (const order of p.tradeOrders) {
      if (order.ticksRemaining <= 0) settledTradeOrders.push(order);
    }
    p.tradeOrders = p.tradeOrders.filter((order) => order.ticksRemaining > 0);

    // Resources tick (1/60th of yearly value)
    const tickScale = 1 / TICKS_PER_YEAR;

    // 1 population nutrition consumption
    addResourceDelta(deltas, 'nutrition', -0.8 * p.population * tickScale);

    // 2 building production
    const toolBonus = hasResearch(p, 'basic_tools', room.year) ? 1.2 : 1;
    const factoryBonus = p.buildings.factory > 0 ? 1.2 : 1;
    for (const [id, cfg] of Object.entries(BUILDINGS)) {
      const count = p.buildings[id];
      if (!count || !cfg.production) continue;
      for (const [rk, rv] of Object.entries(cfg.production)) {
        addResourceDelta(deltas, rk, rv * count * toolBonus * factoryBonus * tickScale);
      }
      if (cfg.upkeep) {
        for (const [rk, rv] of Object.entries(cfg.upkeep)) addResourceDelta(deltas, rk, -rv * count * tickScale);
      }
    }

    // 3 unit upkeep
    for (const [id, unit] of Object.entries(UNITS)) {
      const count = p.units[id];
      if (!count || !unit.upkeep) continue;
      for (const [rk, rv] of Object.entries(unit.upkeep)) addResourceDelta(deltas, rk, -rv * count * tickScale);
    }

    // queued actions resolve at year end
    if (isYearEnd) {
      const opponent = room.players[room.playerOrder.find((x) => x !== playerId)];
      for (const action of p.pending) {
        if (action.type === 'missile') resolveMissileAction(room, p, opponent, action);
        if (action.type === 'scout') resolveScoutAction(room, p, opponent, action);
        if (action.type === 'assault') resolveAssaultAction(room, p, opponent, action);
      }
    }

    // 5 apply resource deltas + capacity
    const capacity = getPlayerCapacity(p);
    p.net = {};
    for (const key of RESOURCE_KEYS) {
      p.net[key] = deltas[key] * TICKS_PER_YEAR; // Show yearly net in UI
      const next = p.resources[key] + deltas[key];
      p.resources[key] = Math.max(0, Math.min(next, capacity[key]));
    }

    for (const order of settledTradeOrders) settleTradeOrder(room, p, order);

    // 6 population growth or starvation at year end
    if (isYearEnd) {
      if (p.resources.nutrition <= 0 && p.population > 0) {
        const starvationLoss = Math.min(p.population, Math.max(1, Math.ceil(p.population * 0.1)));
        p.population -= starvationLoss;
        appendEvent(p, room.year, `☠️ Population starvation: -${starvationLoss}`);
      }
      const surplus = p.resources.nutrition - p.population * 10;
      if (surplus > 10 && p.population < p.populationMax) {
        const growth = Math.floor(0.2 * p.population);
        if (growth > 0) {
          p.population = Math.min(p.populationMax, p.population + growth);
          appendEvent(p, room.year, `👶 Population growth: +${growth}`);
        }
      }
      p.credits += p.population;
      appendEvent(p, room.year, `💳 Treasury income: +${p.population} credits`);
      resolveAutoTrades(room, p);
    }

    if (isYearEnd) {
      const anyRes = RESOURCE_KEYS.some((k) => p.resources[k] > 0);
      p.zeroYears = anyRes ? 0 : p.zeroYears + 1;
      p.pending = [];
    }
  }

  const [a, b] = room.playerOrder.map((id) => room.players[id]);
  if (a.population <= 0) room.winner = b.playerId;
  if (b.population <= 0) room.winner = a.playerId;
  if (a.zeroYears >= 5) room.winner = b.playerId;
  if (b.zeroYears >= 5) room.winner = a.playerId;

  room.tickEndsAt = Date.now() + TICK_MS;
  broadcastRoom(room);
}

function stripStateFor(room, playerId) {
  const p = room.players[playerId];
  const otherId = room.playerOrder.find((x) => x !== playerId);
  const opp = room.players[otherId];
  return {
    roomId: room.roomId,
    year: room.year,
    month: room.month,
    phase: getRoomPhase(room),
    warCondition: getWarCondition(room),
    tickEndsAt: room.tickEndsAt,
    yearEndsAt: getYearEndsAt(room),
    winner: room.winner,
    you: {
      playerId: p.playerId,
      name: p.name,
      population: p.population,
      populationMax: p.populationMax,
      credits: p.credits,
      resources: p.resources,
      buildings: p.buildings,
      buildingQueues: p.buildingQueues,
      units: p.units,
      research: p.research,
      eventLog: p.eventLog,
      chat: p.chat,
      pending: p.pending,
      tradeOrders: p.tradeOrders,
      autoTrades: p.autoTrades,
      scoutCooldownUntil: p.scoutCooldownUntil,
      opponentIntelLog: p.opponentIntelLog,
      defenceAssignments: p.defenceAssignments,
      forcedView: p.forcedView,
      researchLockUntil: p.researchLockUntil,
      zeroYears: p.zeroYears,
      net: p.net
    },
    opponent: { name: opp?.name }
  };
}

function sendSSE(client, data) {
  client.write(`event: state\n`);
  client.write(`data: ${JSON.stringify(data)}\n\n`);
}

function broadcastRoom(room) {
  for (const id of room.playerOrder) {
    const player = room.players[id];
    if (!player?.sse) continue;
    try {
      sendSSE(player.sse, stripStateFor(room, id));
    } catch (e) {
      player.sse = null;
    }
  }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); }
    });
  });
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function writeJson(res, status, data) {
  setCorsHeaders(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function queueAction(room, player, action) {
  player.pending.push(action);
  if (action.type === 'scout') {
    appendEvent(player, room.year, `Queued scout on ${getBucketLabel(action.targetBucket)}`);
  } else if (action.type === 'missile') {
    appendEvent(player, room.year, `Queued ${UNITS[action.missileId]?.name || 'missile'} on ${getBucketLabel(action.targetBucket)}`);
  } else if (action.type === 'assault') {
    appendEvent(player, room.year, `Queued assault on ${getBucketLabel(action.targetBucket)}`);
  } else {
    appendEvent(player, room.year, `Queued action: ${action.type}`);
  }
  broadcastRoom(room);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'OPTIONS') {
      setCorsHeaders(res);
      res.writeHead(204);
      res.end();
      return;
    }

    if (url.pathname === '/api/room/create' && req.method === 'POST') {
      const { name } = await parseBody(req);
      const room = createRoom();
      const playerId = randomUUID();
      room.players[playerId] = createPlayer(playerId, name || 'Player 1');
      room.playerOrder.push(playerId);
      return writeJson(res, 200, { roomId: room.roomId, playerId, reconnectToken: room.players[playerId].reconnectToken });
    }

    if (url.pathname === '/api/room/join' && req.method === 'POST') {
      const { roomId, name } = await parseBody(req);
      const room = rooms.get(roomId);
      if (!room) return writeJson(res, 400, { error: 'Room not found' });

      if (room.playerOrder.length >= 2) return writeJson(res, 400, { error: 'Room full' });

      const playerId = randomUUID();
      room.players[playerId] = createPlayer(playerId, name || 'Player 2');
      room.playerOrder.push(playerId);
      room.tickEndsAt = Date.now() + 10_000;
      appendEvent(room.players[room.playerOrder[0]], room.year, 'Opponent joined. 10s countdown started.');
      appendEvent(room.players[room.playerOrder[1]], room.year, 'Joined room. 10s countdown started.');
      broadcastRoom(room);
      return writeJson(res, 200, { roomId, playerId, reconnectToken: room.players[playerId].reconnectToken });
    }

    if (url.pathname === '/api/room/reconnect' && req.method === 'POST') {
      const { roomId, reconnectToken } = await parseBody(req);
      const room = rooms.get(roomId);
      if (!room) return writeJson(res, 404, { error: 'Room not found' });
      const player = Object.values(room.players).find((entry) => entry.reconnectToken === reconnectToken);
      if (!player) return writeJson(res, 403, { error: 'Reconnect failed' });
      return writeJson(res, 200, { roomId, playerId: player.playerId, reconnectToken: player.reconnectToken });
    }

    if (url.pathname === '/api/state' && req.method === 'GET') {
      const room = rooms.get(url.searchParams.get('roomId'));
      const playerId = url.searchParams.get('playerId');
      if (!room || !room.players[playerId]) return writeJson(res, 404, { error: 'Not found' });
      return writeJson(res, 200, stripStateFor(room, playerId));
    }

    if (url.pathname === '/api/stream' && req.method === 'GET') {
      const room = rooms.get(url.searchParams.get('roomId'));
      const playerId = url.searchParams.get('playerId');
      if (!room || !room.players[playerId]) return writeJson(res, 404, { error: 'Not found' });
      setCorsHeaders(res);
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      });
      if (room.players[playerId].sse && room.players[playerId].sse !== res) {
        try { room.players[playerId].sse.end(); } catch (e) {}
      }
      room.players[playerId].sse = res;
      sendSSE(res, stripStateFor(room, playerId));

      const heartbeat = setInterval(() => {
        if (!res.writableEnded) res.write(': ping\n\n');
      }, SSE_HEARTBEAT_MS);

      req.on('close', () => {
        clearInterval(heartbeat);
        if (room.players[playerId]) room.players[playerId].sse = null;
      });
      return;
    }

    if (url.pathname === '/healthz' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
      return;
    }

    if (url.pathname === '/api/action' && req.method === 'POST') {
      const { roomId, playerId, type, payload } = await parseBody(req);
      const room = rooms.get(roomId);
      if (!room || !room.players[playerId]) return writeJson(res, 404, { error: 'Not found' });
      const p = room.players[playerId];
      const actionPayload = payload || {};
      if (type === 'build') {
        const cfg = BUILDINGS[actionPayload.id];
        if (!cfg) return writeJson(res, 400, { error: 'Invalid building' });
        if (cfg.requires && !cfg.requires.every((x) => hasResearch(p, x, room.year))) {
          appendEvent(p, room.year, `❌ Build failed: Research missing for ${cfg.name}`, 'error');
          broadcastRoom(room);
          return writeJson(res, 400, { error: 'Research missing' });
        }
        if (!canAfford(p.resources, cfg.cost)) {
          appendEvent(p, room.year, `❌ Build failed: Insufficient resources for ${cfg.name}`, 'error');
          broadcastRoom(room);
          return writeJson(res, 400, { error: 'Insufficient resources' });
        }
        payCost(p.resources, cfg.cost);
        p.buildingQueues.push({ id: actionPayload.id, ticksRemaining: cfg.buildTime * TICKS_PER_MONTH });
        appendEvent(p, room.year, `🏗️ Started ${cfg.name}`);
      } else if (type === 'train') {
        const unit = UNITS[actionPayload.id];
        if (!unit) return writeJson(res, 400, { error: 'Invalid unit' });
        if (unit.requiresBuilding && p.buildings[unit.requiresBuilding] <= 0) {
          appendEvent(p, room.year, `❌ Training failed: Required building missing for ${unit.name}`, 'error');
          broadcastRoom(room);
          return writeJson(res, 400, { error: 'Required building missing' });
        }
        if (unit.requiresTech && !hasResearch(p, unit.requiresTech, room.year)) {
          appendEvent(p, room.year, `❌ Training failed: Research missing for ${unit.name}`, 'error');
          broadcastRoom(room);
          return writeJson(res, 400, { error: 'Research missing' });
        }
        const amount = Math.max(1, Number(actionPayload.amount || 1));
        const totalCost = Object.fromEntries(Object.entries(unit.cost).map(([k, v]) => [k, v * amount]));
        if (!canAfford(p.resources, totalCost)) {
          appendEvent(p, room.year, `❌ Training failed: Insufficient resources for ${amount} ${unit.name}`, 'error');
          broadcastRoom(room);
          return writeJson(res, 400, { error: 'Insufficient resources' });
        }
        payCost(p.resources, totalCost);
        p.units[actionPayload.id] += amount;
        appendEvent(p, room.year, `🪖 Trained ${amount} ${unit.name}`);
      } else if (type === 'research') {
        const tech = RESEARCH[actionPayload.id];
        if (!tech) return writeJson(res, 400, { error: 'Invalid tech' });
        if (p.research.active) return writeJson(res, 400, { error: 'Research in progress' });
        if (p.research.completed.includes(actionPayload.id)) return writeJson(res, 400, { error: 'Already researched' });
        if (room.year < p.researchLockUntil) return writeJson(res, 400, { error: `Research locked until Year ${p.researchLockUntil}` });
        if (tech.minYear && room.year < tech.minYear) return writeJson(res, 400, { error: 'Not available yet' });
        if (tech.prereq && !hasResearch(p, tech.prereq, room.year)) {
          appendEvent(p, room.year, `❌ Research failed: Prerequisite missing for ${tech.name}`, 'error');
          broadcastRoom(room);
          return writeJson(res, 400, { error: 'Prerequisite missing' });
        }
        if (!canAfford(p.resources, tech.cost)) {
          appendEvent(p, room.year, `❌ Research failed: Insufficient resources for ${tech.name}`, 'error');
          broadcastRoom(room);
          return writeJson(res, 400, { error: 'Insufficient resources' });
        }
        payCost(p.resources, tech.cost);
        p.research.active = { id: actionPayload.id, ticksRemaining: tech.years * TICKS_PER_MONTH };
        appendEvent(p, room.year, `🧠 Started research: ${tech.name}`);
      } else if (type === 'trade') {
        const resource = actionPayload.resource;
        const amount = Math.floor(Number(actionPayload.amount || 0));
        const mode = actionPayload.mode === 'sell' ? 'sell' : 'buy';
        if (!RESOURCE_KEYS.includes(resource)) return writeJson(res, 400, { error: 'Invalid resource' });
        if (!Number.isInteger(amount) || amount < 1) return writeJson(res, 400, { error: 'Invalid amount' });
        if (mode === 'buy') {
          const cost = getTradeBuyCost(resource, amount);
          const capacity = getPlayerCapacity(p)[resource];
          const reservedIncoming = getReservedIncomingTradeAmount(p, resource);
          if (p.credits < cost) return writeJson(res, 400, { error: 'Not enough credits' });
          if (p.resources[resource] + reservedIncoming + amount > capacity) return writeJson(res, 400, { error: 'Storage full' });
          p.credits -= cost;
          p.tradeOrders.push({ id: randomUUID(), mode, resource, amount, ticksRemaining: TRADE_DELAY_TICKS });
          appendEvent(p, room.year, `📦 Buy order placed: ${amount} ${resource} arriving in ${TRADE_DELAY_MONTHS} months for ${cost} credits`);
        } else {
          if ((p.resources[resource] ?? 0) < amount) return writeJson(res, 400, { error: 'Not enough resource to sell' });
          p.resources[resource] -= amount;
          p.tradeOrders.push({ id: randomUUID(), mode, resource, amount, ticksRemaining: TRADE_DELAY_TICKS });
          appendEvent(p, room.year, `📦 Sell order placed: ${amount} ${resource} settles in ${TRADE_DELAY_MONTHS} months`);
        }
      } else if (type === 'set_auto_trade') {
        const resource = actionPayload.resource;
        const amount = Math.floor(Number(actionPayload.amount || 0));
        const mode = actionPayload.mode === 'sell' ? 'sell' : 'buy';
        if (!RESOURCE_KEYS.includes(resource)) return writeJson(res, 400, { error: 'Invalid resource' });
        if (!Number.isInteger(amount) || amount < 1) return writeJson(res, 400, { error: 'Invalid amount' });
        p.autoTrades[resource] = { mode, amount };
        appendEvent(p, room.year, `🔁 Auto trade set: ${mode} ${amount} ${resource} every year`);
      } else if (type === 'cancel_auto_trade') {
        const resource = actionPayload.resource;
        if (!RESOURCE_KEYS.includes(resource)) return writeJson(res, 400, { error: 'Invalid resource' });
        if (!p.autoTrades[resource]) return writeJson(res, 400, { error: 'No auto trade set' });
        p.autoTrades[resource] = null;
        appendEvent(p, room.year, `🛑 Auto trade cancelled for ${resource}`);
      } else if (type === 'chat') {
        const msg = String(actionPayload.text || '').slice(0, 240);
        if (!msg) return writeJson(res, 400, { error: 'Empty message' });
        if (msg === '/surrender') {
          room.winner = room.playerOrder.find((id) => id !== playerId);
          appendEvent(p, room.year, '🏳️ You surrendered');
        } else {
          p.chat.push({ from: p.name, text: msg, year: room.year });
          p.chat = p.chat.slice(-20);
          const opponent = room.players[room.playerOrder.find((id) => id !== playerId)];
          if (opponent) {
            opponent.chat.push({ from: p.name, text: msg, year: room.year });
            opponent.chat = opponent.chat.slice(-20);
          }
        }
      } else if (type === 'cancel_pending') {
        const index = Number(actionPayload.index);
        if (!Number.isInteger(index) || index < 0 || index >= p.pending.length) {
          return writeJson(res, 400, { error: 'Invalid pending action' });
        }
        const [removed] = p.pending.splice(index, 1);
        appendEvent(p, room.year, `Cancelled queued action: ${removed.type}`);
      } else if (type === 'set_defence_assignment') {
        const bucket = actionPayload.bucket;
        if (!isValidTargetBucket(bucket)) return writeJson(res, 400, { error: 'Invalid target bucket' });
        p.defenceAssignments[bucket] = normalizeDefenceAssignments(p, bucket, actionPayload.assignments);
        rebalanceDefenceAssignments(p);
        appendEvent(p, room.year, `🛡️ Defence assignment updated for ${getBucketLabel(bucket)}`);
      } else if (type === 'scout') {
        const bucket = actionPayload.targetBucket;
        if (!isValidTargetBucket(bucket)) return writeJson(res, 400, { error: 'Invalid target bucket' });
        if (p.units.scout_drone - getPendingScoutReservations(p) <= 0) return writeJson(res, 400, { error: 'Need scout drone' });
        if (room.year < p.scoutCooldownUntil) return writeJson(res, 400, { error: `Cooldown until Year ${p.scoutCooldownUntil}` });
        queueAction(room, p, { type: 'scout', targetBucket: bucket });
      } else if (type === 'missile') {
        const missileId = actionPayload.missileId;
        const bucket = actionPayload.targetBucket;
        if (!isValidTargetBucket(bucket)) return writeJson(res, 400, { error: 'Invalid target bucket' });
        if (!UNITS[missileId]?.missile) return writeJson(res, 400, { error: 'Invalid missile' });
        if (!hasResearch(p, 'missile_silo', room.year)) return writeJson(res, 400, { error: 'Missile Silo offline' });
        if ((p.units[missileId] || 0) - getPendingMissileReservations(p, missileId) <= 0) {
          return writeJson(res, 400, { error: 'Not enough missile stock' });
        }
        queueAction(room, p, { type: 'missile', missileId, targetBucket: bucket });
      } else if (type === 'assault') {
        const bucket = actionPayload.targetBucket;
        if (!isValidTargetBucket(bucket)) return writeJson(res, 400, { error: 'Invalid target bucket' });
        if (p.pending.some((action) => action.type === 'assault')) return writeJson(res, 400, { error: 'Only one assault can be queued each year' });
        const committedUnits = {};
        for (const id of getAssaultUnitIds()) {
          const requested = Math.max(0, Math.floor(Number(actionPayload.committedUnits?.[id] || 0)));
          if (!requested) continue;
          const available = Math.max(0, getAvailableAttackUnitCount(p, id) - getPendingAssaultReservations(p, id));
          if (requested > available) {
            return writeJson(res, 400, { error: `Not enough available ${UNITS[id].name}` });
          }
          committedUnits[id] = requested;
        }
        if (!Object.keys(committedUnits).length) return writeJson(res, 400, { error: 'Choose at least one assault unit' });
        queueAction(room, p, { type: 'assault', targetBucket: bucket, committedUnits });
      } else {
        queueAction(room, p, { type, ...actionPayload });
      }

      broadcastRoom(room);
      return writeJson(res, 200, { ok: true });
    }

    if (url.pathname === '/api/meta' && req.method === 'GET') {
      return writeJson(res, 200, {
        buildings: BUILDINGS,
        units: UNITS,
        research: RESEARCH,
        targetBuckets: TARGET_BUCKETS,
        resources: RESOURCE_KEYS,
        tickMs: TICK_MS,
        ticksPerMonth: TICKS_PER_MONTH,
        ticksPerYear: TICKS_PER_YEAR,
        tradeFee: TRADE_FEE,
        tradeDelayMonths: TRADE_DELAY_MONTHS,
        tradePrices: TRADE_PRICES
      });
    }

    let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
    const resolved = path.join(publicDir, filePath);
    const data = await readFile(resolved);
    const ext = path.extname(resolved);
    const ctype = ext === '.css' ? 'text/css' : ext === '.js' ? 'text/javascript' : 'text/html';
    res.writeHead(200, { 'Content-Type': ctype });
    res.end(data);
  } catch (e) {
    console.error('Server Error:', e);
    if (res.writableEnded || res.headersSent) return;
    writeJson(res, 500, { error: 'Server error' });
  }
});

// Main Game Loop
setInterval(() => {
  for (const room of rooms.values()) {
    if (Date.now() >= room.tickEndsAt && room.playerOrder.length === 2) resolveTick(room);
  }
}, 500);

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`ww-III running on http://localhost:${port}`);
});
