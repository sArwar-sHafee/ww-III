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
  anti_missile_battery: { name: 'Anti-Missile Battery', cost: { steel: 30, oil: 15, magnet: 10 }, buildTime: 2, requires: ['guided_missiles'], category: 'military' },
  land_mine: { name: 'Land Mine', cost: { lumber: 50, steel: 30 }, buildTime: 2, category: 'military' },
  dry_dock: { name: 'Dry Dock', cost: { lumber: 50, steel: 40, concrete: 20 }, buildTime: 3, category: 'support' },
  airfield: { name: 'Airfield', cost: { steel: 60, alloy: 30, concrete: 40 }, buildTime: 3, category: 'support' }
};

const UNITS = {
  infantry: { name: 'Infantry', section: 'military', cost: { nutrition: 8, steel: 4 }, upkeep: { nutrition: 0.5 }, attack: 10, defense: 5, requiresBuilding: 'barracks', assault: true },
  special_force: { name: 'Special Force', section: 'military', cost: { nutrition: 10, steel: 8, electricity: 2 }, upkeep: { nutrition: 1, electricity: 0.5 }, attack: 22, defense: 14, requiresTech: 'advanced_scouting', requiresBuilding: 'barracks', assault: true },
  tank: { name: 'Tank', section: 'military', cost: { steel: 12, oil: 8 }, upkeep: { nutrition: 1, oil: 0.5 }, attack: 25, defense: 12, requiresTech: 'tanks', requiresBuilding: 'barracks', assault: true },
  war_ship: { name: 'War Ship', section: 'military', cost: { steel: 50, alloy: 30, oil: 20 }, upkeep: { nutrition: 2, oil: 1 }, attack: 50, defense: 25, requiresTech: 'naval_warfare', requiresBuilding: 'dry_dock', assault: true },
  submarine: { name: 'Submarine', section: 'military', cost: { steel: 60, alloy: 35, oil: 25 }, upkeep: { nutrition: 2, oil: 1.5 }, attack: 80, defense: 40, requiresTech: 'naval_warfare', requiresBuilding: 'dry_dock', assault: true },
  fighter_zed: { name: 'Fighter Zed', section: 'military', cost: { alloy: 40, oil: 20, silicon: 10 }, upkeep: { nutrition: 1, oil: 2 }, attack: 40, defense: 20, requiresTech: 'aerial_warfare', requiresBuilding: 'airfield', assault: true },
  attack_helicopter: { name: 'Attack Helicopter', section: 'military', cost: { steel: 20, alloy: 25, oil: 15 }, upkeep: { nutrition: 1, oil: 1.5 }, attack: 60, defense: 30, requiresTech: 'aerial_warfare', requiresBuilding: 'airfield', assault: true },
  combat_drone: { name: 'Combat Drone', section: 'military', cost: { alloy: 15, electricity: 10, silicon: 8 }, upkeep: { electricity: 1, oil: 0.5 }, attack: 35, defense: 18, requiresTech: 'advanced_scouting', requiresBuilding: 'airfield', assault: true },
  ballistic_missile: { name: 'Ballistic Missile', section: 'military', cost: { steel: 20, alloy: 20, oil: 12 }, attack: 160, requiresTech: 'missile_silo', missile: true },
  cruise_missile: { name: 'Cruise Missile', section: 'military', cost: { steel: 14, alloy: 12, oil: 10 }, attack: 110, requiresTech: 'missile_silo', missile: true },
  scout_drone: { name: 'Scout Drone', section: 'military', cost: { oil: 5, electricity: 3 }, upkeep: { electricity: 1 }, requiresBuilding: 'radar_station' },
  anti_tank_squad: { name: 'Anti-Tank Squad', section: 'defence', cost: { nutrition: 6, steel: 8 }, upkeep: { nutrition: 0.5 }, defense: 18, requiresTech: 'tanks', requiresBuilding: 'barracks' },
  naval_strike_missile: { name: 'Naval Strike Missile', section: 'defence', cost: { steel: 18, alloy: 15, oil: 10 }, defense: 45, requiresTech: 'guided_missiles', requiresBuilding: 'dry_dock' },
  air_defence_gun: { name: 'Air Defence Gun', section: 'defence', cost: { steel: 16, alloy: 8, electricity: 6 }, upkeep: { electricity: 0.5 }, defense: 28, requiresTech: 'guided_missiles', requiresBuilding: 'airfield' }
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
    research: { completed: [...STARTING_RESEARCH], active: null },
    eventLog: [],
    chat: [],
    pending: [],
    tradeOrders: [],
    autoTrades: Object.fromEntries(RESOURCE_KEYS.map((resource) => [resource, null])),
    scoutCooldownUntil: -1,
    scoutIntel: null,
    zeroYears: 0,
    disconnected: false
  };
}

function getRoomPhase(room) {
  if (room.winner) return 'finished';
  if (room.playerOrder.length < 2) return 'waiting';
  if (room.ticks === 0 && Date.now() < room.tickEndsAt) return 'countdown';
  return 'active';
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

function getMissileDamage(unitId) {
  if (unitId === 'ballistic_missile') return 0.25 + Math.random() * 0.15;
  if (unitId === 'cruise_missile') return 0.18 + Math.random() * 0.12;
  return 0;
}

function getAssaultUnitIds() {
  return Object.entries(UNITS).filter(([, unit]) => unit.assault).map(([id]) => id);
}

function getDefenceUnitIds() {
  return Object.entries(UNITS).filter(([, unit]) => unit.defense).map(([id]) => id);
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
    const toolBonus = p.research.completed.includes('basic_tools') ? 1.2 : 1;
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
        if (action.type === 'missile' && p.research.completed.includes('missile_silo') && UNITS[action.missileId]?.missile && p.units[action.missileId] > 0) {
          p.units[action.missileId] -= 1;
          const interceptionChance = 0.35 * opponent.buildings.anti_missile_battery;
          if (Math.random() < interceptionChance) {
            appendEvent(p, room.year, `🛡️ ${UNITS[action.missileId].name} intercepted`);
            appendEvent(opponent, room.year, '🛡️ You intercepted an incoming missile');
          } else {
            const damage = getMissileDamage(action.missileId);
            const categoryBuildings = Object.entries(BUILDINGS).filter(([, c]) => c.category === action.target && opponent.buildings).map(([k]) => k);
            for (const bid of categoryBuildings) {
              const lost = Math.floor(opponent.buildings[bid] * damage);
              opponent.buildings[bid] = Math.max(0, opponent.buildings[bid] - lost);
            }
            if (action.target === 'support') opponent.population = Math.max(0, opponent.population - Math.ceil(opponent.population * damage * 0.3));
            appendEvent(p, room.year, `💥 ${UNITS[action.missileId].name} hit target`);
            appendEvent(opponent, room.year, `💥 Incoming ${UNITS[action.missileId].name} damaged your base`);
          }
        }
        if (action.type === 'scout' && p.units.scout_drone > 0 && room.year >= p.scoutCooldownUntil) {
          p.scoutCooldownUntil = room.year + 1;
          p.scoutIntel = { expiresAt: room.year + 2, seenYear: room.year };
          appendEvent(p, room.year, '🛰️ Scout launched');
          appendEvent(opponent, room.year, '👁️ Scout detected');
        }
        if (action.type === 'assault') {
          const committed = Object.fromEntries(getAssaultUnitIds().map((id) => [id, Math.min(action[id] || 0, p.units[id])]));
          const atk = Object.entries(committed).reduce((sum, [id, count]) => sum + count * (UNITS[id].attack || 0), 0);
          const def = getDefenceUnitIds().reduce((sum, id) => sum + (opponent.units[id] || 0) * (UNITS[id].defense || 0), 0) + opponent.buildings.land_mine * 80;
          if (atk > 0) {
            const attackerWon = atk > def;
            const atkLoss = attackerWon ? 0.3 : 0.7;
            const defLoss = attackerWon ? 0.7 : 0.3;
            for (const [id, count] of Object.entries(committed)) {
              p.units[id] -= Math.floor(count * atkLoss);
            }
            for (const id of getDefenceUnitIds()) {
              opponent.units[id] = Math.max(0, opponent.units[id] - Math.floor(opponent.units[id] * defLoss));
            }
            if (attackerWon) {
              const lootResource = RESOURCE_KEYS[Math.floor(Math.random() * RESOURCE_KEYS.length)];
              const pct = 0.1 + Math.random() * 0.1;
              const amount = Math.floor(opponent.resources[lootResource] * pct);
              opponent.resources[lootResource] -= amount;
              p.resources[lootResource] += amount;
              appendEvent(p, room.year, `⚔️ Assault won, looted ${amount} ${lootResource}`);
              appendEvent(opponent, room.year, `⚔️ You lost an assault and ${amount} ${lootResource}`);
            } else {
              appendEvent(p, room.year, '⚔️ Assault failed');
              appendEvent(opponent, room.year, '⚔️ You defended an assault');
            }
          }
        }
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
        p.population -= 1;
        appendEvent(p, room.year, '☠️ Population starvation: -1');
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
  let intel = { known: false };
  if (opp && p.scoutIntel && p.scoutIntel.expiresAt >= room.year) {
    const approx = {};
    for (const [k, v] of Object.entries(opp.resources)) {
      const variance = Math.floor(v * 0.1);
      approx[k] = Math.max(0, v + (Math.random() < 0.5 ? -variance : variance));
    }
    intel = { known: true, buildings: opp.buildings, resources: approx, expiresAt: p.scoutIntel.expiresAt };
  }
  return {
    roomId: room.roomId,
    year: room.year,
    month: room.month,
    phase: getRoomPhase(room),
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
      scoutIntel: p.scoutIntel,
      zeroYears: p.zeroYears,
      net: p.net
    },
    opponent: { name: opp?.name, intel }
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
  appendEvent(player, room.year, `Queued action: ${action.type}`);
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
      if (type === 'build') {
        const cfg = BUILDINGS[payload.id];
        if (!cfg) return writeJson(res, 400, { error: 'Invalid building' });
        if (cfg.requires && !cfg.requires.every((x) => p.research.completed.includes(x))) {
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
        p.buildingQueues.push({ id: payload.id, ticksRemaining: cfg.buildTime * TICKS_PER_MONTH });
        appendEvent(p, room.year, `🏗️ Started ${cfg.name}`);
      } else if (type === 'train') {
        const unit = UNITS[payload.id];
        if (!unit) return writeJson(res, 400, { error: 'Invalid unit' });
        if (unit.requiresBuilding && p.buildings[unit.requiresBuilding] <= 0) {
          appendEvent(p, room.year, `❌ Training failed: Required building missing for ${unit.name}`, 'error');
          broadcastRoom(room);
          return writeJson(res, 400, { error: 'Required building missing' });
        }
        if (unit.requiresTech && !p.research.completed.includes(unit.requiresTech)) {
          appendEvent(p, room.year, `❌ Training failed: Research missing for ${unit.name}`, 'error');
          broadcastRoom(room);
          return writeJson(res, 400, { error: 'Research missing' });
        }
        const amount = Math.max(1, Number(payload.amount || 1));
        const totalCost = Object.fromEntries(Object.entries(unit.cost).map(([k, v]) => [k, v * amount]));
        if (!canAfford(p.resources, totalCost)) {
          appendEvent(p, room.year, `❌ Training failed: Insufficient resources for ${amount} ${unit.name}`, 'error');
          broadcastRoom(room);
          return writeJson(res, 400, { error: 'Insufficient resources' });
        }
        payCost(p.resources, totalCost);
        p.units[payload.id] += amount;
        appendEvent(p, room.year, `🪖 Trained ${amount} ${unit.name}`);
      } else if (type === 'research') {
        const tech = RESEARCH[payload.id];
        if (!tech) return writeJson(res, 400, { error: 'Invalid tech' });
        if (p.research.active) return writeJson(res, 400, { error: 'Research in progress' });
        if (p.research.completed.includes(payload.id)) return writeJson(res, 400, { error: 'Already researched' });
        if (tech.minYear && room.year < tech.minYear) return writeJson(res, 400, { error: 'Not available yet' });
        if (tech.prereq && !p.research.completed.includes(tech.prereq)) {
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
        p.research.active = { id: payload.id, ticksRemaining: tech.years * TICKS_PER_MONTH };
        appendEvent(p, room.year, `🧠 Started research: ${tech.name}`);
      } else if (type === 'trade') {
        const resource = payload.resource;
        const amount = Math.floor(Number(payload.amount || 0));
        const mode = payload.mode === 'sell' ? 'sell' : 'buy';
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
        const resource = payload.resource;
        const amount = Math.floor(Number(payload.amount || 0));
        const mode = payload.mode === 'sell' ? 'sell' : 'buy';
        if (!RESOURCE_KEYS.includes(resource)) return writeJson(res, 400, { error: 'Invalid resource' });
        if (!Number.isInteger(amount) || amount < 1) return writeJson(res, 400, { error: 'Invalid amount' });
        p.autoTrades[resource] = { mode, amount };
        appendEvent(p, room.year, `🔁 Auto trade set: ${mode} ${amount} ${resource} every year`);
      } else if (type === 'cancel_auto_trade') {
        const resource = payload.resource;
        if (!RESOURCE_KEYS.includes(resource)) return writeJson(res, 400, { error: 'Invalid resource' });
        if (!p.autoTrades[resource]) return writeJson(res, 400, { error: 'No auto trade set' });
        p.autoTrades[resource] = null;
        appendEvent(p, room.year, `🛑 Auto trade cancelled for ${resource}`);
      } else if (type === 'chat') {
        const msg = String(payload.text || '').slice(0, 240);
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
        const index = Number(payload.index);
        if (!Number.isInteger(index) || index < 0 || index >= p.pending.length) {
          return writeJson(res, 400, { error: 'Invalid pending action' });
        }
        const [removed] = p.pending.splice(index, 1);
        appendEvent(p, room.year, `Cancelled queued action: ${removed.type}`);
      } else {
        queueAction(room, p, { type, ...payload });
      }

      broadcastRoom(room);
      return writeJson(res, 200, { ok: true });
    }

    if (url.pathname === '/api/meta' && req.method === 'GET') {
      return writeJson(res, 200, {
        buildings: BUILDINGS,
        units: UNITS,
        research: RESEARCH,
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
