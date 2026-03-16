import http from 'http';
import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

const YEAR_MS = 30_000;
const STARTING_RESOURCES = { nutrition: 50, lumber: 30, steel: 20, alloy: 10, oil: 0, magnet: 0, electricity: 0, glass: 0, plastic: 0, concrete: 0, silicon: 0 };
const RESOURCE_KEYS = Object.keys(STARTING_RESOURCES);

const BUILDINGS = {
  farm: { name: 'Farm', cost: { lumber: 15, steel: 10 }, buildTime: 2, capacity: { nutrition: 200 }, production: { nutrition: 4 }, category: 'economy' },
  lumber_camp: { name: 'Lumber Camp', cost: { lumber: 10, steel: 5 }, buildTime: 1, capacity: { lumber: 150 }, production: { lumber: 3 }, category: 'economy' },
  steel_mill: { name: 'Steel Mill', cost: { lumber: 20, steel: 10 }, buildTime: 2, capacity: { steel: 100 }, production: { steel: 2 }, category: 'economy' },
  alloy_quarry: { name: 'Alloy Quarry', cost: { lumber: 25, steel: 15 }, buildTime: 2, capacity: { alloy: 80 }, production: { alloy: 1 }, category: 'economy' },
  oil_rig: { name: 'Oil Rig', cost: { steel: 30, alloy: 20 }, buildTime: 3, capacity: { oil: 100 }, production: { oil: 2 }, requires: ['electricity'], category: 'economy' },
  magnet_extractor: { name: 'Magnet Extractor', cost: { steel: 40, alloy: 15, oil: 10 }, buildTime: 3, capacity: { magnet: 60 }, production: { magnet: 1 }, requires: ['advanced_mining'], category: 'economy' },
  power_plant: { name: 'Power Plant', cost: { steel: 25, oil: 15 }, buildTime: 2, capacity: { electricity: 80 }, production: { electricity: 3 }, upkeep: { oil: 1 }, requires: ['electricity'], category: 'economy' },
  glassworks: { name: 'Glassworks', cost: { lumber: 15, steel: 10 }, buildTime: 2, capacity: { glass: 120 }, production: { glass: 2 }, requires: ['industrial_furnaces'], category: 'economy' },
  plastics_plant: { name: 'Plastics Plant', cost: { steel: 10, oil: 15, electricity: 5 }, buildTime: 2, capacity: { plastic: 120 }, production: { plastic: 2 }, requires: ['plastics'], category: 'economy' },
  concrete_plant: { name: 'Concrete Plant', cost: { lumber: 20, steel: 10, electricity: 5 }, buildTime: 2, capacity: { concrete: 180 }, production: { concrete: 3 }, requires: ['industrial_materials'], category: 'economy' },
  silicon_refinery: { name: 'Silicon Refinery', cost: { steel: 20, alloy: 10, electricity: 5 }, buildTime: 3, capacity: { silicon: 80 }, production: { silicon: 1 }, requires: ['advanced_mining'], category: 'economy' },
  house: { name: 'House', cost: { lumber: 20, steel: 10 }, buildTime: 1, category: 'support' },
  barracks: { name: 'Barracks', cost: { lumber: 30, steel: 20 }, buildTime: 2, category: 'support' },
  factory: { name: 'Factory', cost: { steel: 40, alloy: 25, oil: 10 }, buildTime: 3, requires: ['electricity'], category: 'support' },
  radar_station: { name: 'Radar Station', cost: { steel: 20, alloy: 15, magnet: 10 }, buildTime: 2, requires: ['advanced_scouting'], category: 'support' },
  missile_silo: { name: 'Missile Silo', cost: { steel: 35, oil: 20, alloy: 15 }, buildTime: 3, requires: ['guided_missiles'], category: 'military' },
  anti_missile_battery: { name: 'Anti-Missile Battery', cost: { steel: 30, oil: 15, magnet: 10 }, buildTime: 2, requires: ['guided_missiles'], category: 'military' },
  wall: { name: 'Wall', cost: { lumber: 50, steel: 30 }, buildTime: 2, category: 'military' }
};

const UNITS = {
  soldier: { name: 'Soldier', cost: { nutrition: 8, steel: 4 }, upkeep: { nutrition: 0.5 }, attack: 10, requiresBuilding: 'barracks' },
  tank: { name: 'Tank', cost: { steel: 12, oil: 8 }, upkeep: { nutrition: 1, oil: 0.5 }, attack: 25, requiresTech: 'tanks', requiresBuilding: 'barracks' },
  scout_drone: { name: 'Scout Drone', cost: { oil: 5, electricity: 3 }, upkeep: { electricity: 1 }, requiresBuilding: 'radar_station' }
};

const RESEARCH = {
  basic_tools: { name: 'Basic Tools', cost: { alloy: 15 }, years: 2, minYear: 3 },
  electricity: { name: 'Electricity', cost: { alloy: 25, magnet: 5 }, years: 3, prereq: 'basic_tools' },
  guided_missiles: { name: 'Guided Missiles', cost: { alloy: 30, magnet: 10 }, years: 3, prereq: 'basic_tools' },
  industrial_furnaces: { name: 'Industrial Furnaces', cost: { alloy: 20, steel: 5 }, years: 2, prereq: 'basic_tools' },
  advanced_mining: { name: 'Advanced Mining', cost: { alloy: 35, magnet: 15 }, years: 3, prereq: 'electricity' },
  tanks: { name: 'Tanks', cost: { alloy: 40, magnet: 20 }, years: 4, prereq: 'guided_missiles' },
  advanced_scouting: { name: 'Advanced Scouting', cost: { alloy: 25, magnet: 10 }, years: 2, prereq: 'industrial_furnaces' },
  plastics: { name: 'Plastics', cost: { alloy: 30, oil: 10 }, years: 3, prereq: 'electricity' },
  industrial_materials: { name: 'Industrial Materials', cost: { alloy: 20, steel: 5, electricity: 5 }, years: 2, prereq: 'industrial_furnaces' },
  nuclear_technology: { name: 'Nuclear Technology', cost: { alloy: 100, magnet: 50, electricity: 30 }, years: 5, prereq: 'advanced_mining' }
};

const rooms = new Map();

function createPlayer(playerId, name) {
  return {
    playerId,
    name,
    population: 10,
    populationMax: 10,
    resources: { ...STARTING_RESOURCES },
    buildings: Object.fromEntries(Object.keys(BUILDINGS).map((k) => [k, 0])),
    buildingQueues: [],
    units: { soldier: 0, tank: 0, scout_drone: 0 },
    research: { completed: [], active: null },
    eventLog: [],
    chat: [],
    pending: [],
    scoutCooldownUntil: -1,
    scoutIntel: null,
    zeroYears: 0,
    disconnected: false
  };
}

function appendEvent(player, year, message) {
  player.eventLog.unshift({ year, message });
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

function createRoom() {
  let id;
  do id = String(Math.floor(1000 + Math.random() * 9000)); while (rooms.has(id));
  const room = { roomId: id, year: 0, tickEndsAt: Date.now() + YEAR_MS, players: {}, playerOrder: [], winner: null };
  rooms.set(id, room);
  return room;
}

function resolveTick(room) {
  if (room.winner || room.playerOrder.length < 2) return;
  room.year += 1;

  for (const playerId of room.playerOrder) {
    const p = room.players[playerId];
    const deltas = Object.fromEntries(RESOURCE_KEYS.map((k) => [k, 0]));

    // Resolve build/research queues first from previous years
    p.buildingQueues.forEach((q) => q.yearsRemaining--);
    const completed = p.buildingQueues.filter((q) => q.yearsRemaining <= 0);
    p.buildingQueues = p.buildingQueues.filter((q) => q.yearsRemaining > 0);
    for (const item of completed) {
      p.buildings[item.id]++;
      if (item.id === 'house') p.populationMax += 5;
      appendEvent(p, room.year, `✅ ${BUILDINGS[item.id].name} completed`);
    }
    if (p.research.active) {
      p.research.active.yearsRemaining--;
      if (p.research.active.yearsRemaining <= 0) {
        p.research.completed.push(p.research.active.id);
        appendEvent(p, room.year, `✅ Research completed: ${RESEARCH[p.research.active.id].name}`);
        p.research.active = null;
      }
    }

    // 1 population nutrition consumption
    addResourceDelta(deltas, 'nutrition', -0.8 * p.population);

    // 2 building production
    const toolBonus = p.research.completed.includes('basic_tools') ? 1.2 : 1;
    const factoryBonus = p.buildings.factory > 0 ? 1.2 : 1;
    for (const [id, cfg] of Object.entries(BUILDINGS)) {
      const count = p.buildings[id];
      if (!count || !cfg.production) continue;
      for (const [rk, rv] of Object.entries(cfg.production)) {
        addResourceDelta(deltas, rk, rv * count * toolBonus * factoryBonus);
      }
      if (cfg.upkeep) {
        for (const [rk, rv] of Object.entries(cfg.upkeep)) addResourceDelta(deltas, rk, -rv * count);
      }
    }

    // 3 unit upkeep
    for (const [id, unit] of Object.entries(UNITS)) {
      const count = p.units[id];
      if (!count || !unit.upkeep) continue;
      for (const [rk, rv] of Object.entries(unit.upkeep)) addResourceDelta(deltas, rk, -rv * count);
    }

    // queued actions resolve
    const opponent = room.players[room.playerOrder.find((x) => x !== playerId)];
    for (const action of p.pending) {
      if (action.type === 'missile' && p.buildings.missile_silo > 0 && canAfford(p.resources, { steel: 8, oil: 6, electricity: 3 })) {
        payCost(p.resources, { steel: 8, oil: 6, electricity: 3 });
        const interceptionChance = 0.35 * opponent.buildings.anti_missile_battery;
        if (Math.random() < interceptionChance) {
          appendEvent(p, room.year, '🛡️ Missile intercepted');
          appendEvent(opponent, room.year, '🛡️ You intercepted an incoming missile');
        } else {
          const damage = 0.2 + Math.random() * 0.15;
          const categoryBuildings = Object.entries(BUILDINGS).filter(([, c]) => c.category === action.target && opponent.buildings).map(([k]) => k);
          for (const bid of categoryBuildings) {
            const lost = Math.floor(opponent.buildings[bid] * damage);
            opponent.buildings[bid] = Math.max(0, opponent.buildings[bid] - lost);
          }
          if (action.target === 'support') opponent.population = Math.max(0, opponent.population - Math.ceil(opponent.population * damage * 0.3));
          appendEvent(p, room.year, '💥 Missile hit target');
          appendEvent(opponent, room.year, '💥 Incoming missile damaged your base');
        }
      }
      if (action.type === 'scout' && p.units.scout_drone > 0 && room.year >= p.scoutCooldownUntil) {
        p.scoutCooldownUntil = room.year + 1;
        p.scoutIntel = { expiresAt: room.year + 2, seenYear: room.year };
        appendEvent(p, room.year, '🛰️ Scout launched');
        appendEvent(opponent, room.year, '👁️ Scout detected');
      }
      if (action.type === 'assault') {
        const soldiers = Math.min(action.soldiers || 0, p.units.soldier);
        const tanks = Math.min(action.tanks || 0, p.units.tank);
        const atk = soldiers * 10 + tanks * 25;
        const def = opponent.units.soldier * 5 + opponent.units.tank * 12 + (opponent.buildings.wall > 0 ? 100 : 0);
        if (atk > 0) {
          const attackerWon = atk > def;
          const atkLoss = attackerWon ? 0.3 : 0.7;
          const defLoss = attackerWon ? 0.7 : 0.3;
          p.units.soldier -= Math.floor(soldiers * atkLoss);
          p.units.tank -= Math.floor(tanks * atkLoss);
          opponent.units.soldier = Math.max(0, opponent.units.soldier - Math.floor(opponent.units.soldier * defLoss));
          opponent.units.tank = Math.max(0, opponent.units.tank - Math.floor(opponent.units.tank * defLoss));
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

    // 5 apply resource deltas + capacity
    const capacity = Object.fromEntries(RESOURCE_KEYS.map((k) => [k, 999999]));
    for (const [id, count] of Object.entries(p.buildings)) {
      const cfg = BUILDINGS[id];
      if (!cfg?.capacity || count <= 0) continue;
      for (const [rk, rv] of Object.entries(cfg.capacity)) capacity[rk] = (capacity[rk] || 0) + rv * count;
    }
    p.net = {};
    for (const key of RESOURCE_KEYS) {
      p.net[key] = Math.floor(deltas[key]);
      const next = p.resources[key] + Math.floor(deltas[key]);
      p.resources[key] = Math.max(0, Math.min(next, capacity[key]));
    }

    // 6 population growth or starvation
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

    const anyRes = RESOURCE_KEYS.some((k) => p.resources[k] > 0);
    p.zeroYears = anyRes ? 0 : p.zeroYears + 1;
    p.pending = [];
  }

  const [a, b] = room.playerOrder.map((id) => room.players[id]);
  if (a.population <= 0) room.winner = b.playerId;
  if (b.population <= 0) room.winner = a.playerId;
  if (a.zeroYears >= 5) room.winner = b.playerId;
  if (b.zeroYears >= 5) room.winner = a.playerId;

  room.tickEndsAt = Date.now() + YEAR_MS;
  broadcastRoom(room);
}

function stripStateFor(room, playerId) {
  const self = room.players[playerId];
  const otherId = room.playerOrder.find((x) => x !== playerId);
  const opp = room.players[otherId];
  let intel = { known: false };
  if (self.scoutIntel && self.scoutIntel.expiresAt >= room.year) {
    const approx = {};
    for (const [k, v] of Object.entries(opp.resources)) {
      const variance = Math.floor(v * 0.1);
      approx[k] = Math.max(0, v + (Math.random() < 0.5 ? -variance : variance));
    }
    intel = { known: true, buildings: opp.buildings, resources: approx, expiresAt: self.scoutIntel.expiresAt };
  }
  return {
    roomId: room.roomId,
    year: room.year,
    tickEndsAt: room.tickEndsAt,
    winner: room.winner,
    you: self,
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
    sendSSE(player.sse, stripStateFor(room, id));
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

function writeJson(res, status, data) {
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

    if (url.pathname === '/api/room/create' && req.method === 'POST') {
      const { name } = await parseBody(req);
      const room = createRoom();
      const playerId = randomUUID();
      room.players[playerId] = createPlayer(playerId, name || 'Player 1');
      room.playerOrder.push(playerId);
      return writeJson(res, 200, { roomId: room.roomId, playerId });
    }

    if (url.pathname === '/api/room/join' && req.method === 'POST') {
      const { roomId, name } = await parseBody(req);
      const room = rooms.get(roomId);
      if (!room || room.playerOrder.length >= 2) return writeJson(res, 400, { error: 'Room unavailable' });
      const playerId = randomUUID();
      room.players[playerId] = createPlayer(playerId, name || 'Player 2');
      room.playerOrder.push(playerId);
      room.tickEndsAt = Date.now() + 10_000;
      appendEvent(room.players[room.playerOrder[0]], room.year, 'Opponent joined. 10s countdown started.');
      appendEvent(room.players[room.playerOrder[1]], room.year, 'Joined room. 10s countdown started.');
      broadcastRoom(room);
      return writeJson(res, 200, { roomId, playerId });
    }

    if (url.pathname === '/api/stream' && req.method === 'GET') {
      const room = rooms.get(url.searchParams.get('roomId'));
      const playerId = url.searchParams.get('playerId');
      if (!room || !room.players[playerId]) return writeJson(res, 404, { error: 'Not found' });
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      room.players[playerId].sse = res;
      sendSSE(res, stripStateFor(room, playerId));
      req.on('close', () => {
        if (room.players[playerId]) room.players[playerId].sse = null;
      });
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
        if (cfg.requires && !cfg.requires.every((x) => p.research.completed.includes(x))) return writeJson(res, 400, { error: 'Research missing' });
        if (!canAfford(p.resources, cfg.cost)) return writeJson(res, 400, { error: 'Insufficient resources' });
        payCost(p.resources, cfg.cost);
        p.buildingQueues.push({ id: payload.id, yearsRemaining: cfg.buildTime });
        appendEvent(p, room.year, `🏗️ Started ${cfg.name}`);
      } else if (type === 'train') {
        const unit = UNITS[payload.id];
        if (!unit) return writeJson(res, 400, { error: 'Invalid unit' });
        if (unit.requiresBuilding && p.buildings[unit.requiresBuilding] <= 0) return writeJson(res, 400, { error: 'Required building missing' });
        if (unit.requiresTech && !p.research.completed.includes(unit.requiresTech)) return writeJson(res, 400, { error: 'Research missing' });
        const amount = Math.max(1, Number(payload.amount || 1));
        const totalCost = Object.fromEntries(Object.entries(unit.cost).map(([k, v]) => [k, v * amount]));
        if (!canAfford(p.resources, totalCost)) return writeJson(res, 400, { error: 'Insufficient resources' });
        payCost(p.resources, totalCost);
        p.units[payload.id] += amount;
        appendEvent(p, room.year, `🪖 Trained ${amount} ${unit.name}`);
      } else if (type === 'research') {
        const tech = RESEARCH[payload.id];
        if (!tech) return writeJson(res, 400, { error: 'Invalid tech' });
        if (p.research.active) return writeJson(res, 400, { error: 'Research in progress' });
        if (p.research.completed.includes(payload.id)) return writeJson(res, 400, { error: 'Already researched' });
        if (tech.minYear && room.year < tech.minYear) return writeJson(res, 400, { error: 'Not available yet' });
        if (tech.prereq && !p.research.completed.includes(tech.prereq)) return writeJson(res, 400, { error: 'Prerequisite missing' });
        if (!canAfford(p.resources, tech.cost)) return writeJson(res, 400, { error: 'Insufficient resources' });
        payCost(p.resources, tech.cost);
        p.research.active = { id: payload.id, yearsRemaining: tech.years };
        appendEvent(p, room.year, `🧠 Started research: ${tech.name}`);
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
      } else {
        queueAction(room, p, { type, ...payload });
      }

      broadcastRoom(room);
      return writeJson(res, 200, { ok: true });
    }

    if (url.pathname === '/api/meta' && req.method === 'GET') {
      return writeJson(res, 200, { buildings: BUILDINGS, units: UNITS, research: RESEARCH, resources: RESOURCE_KEYS, yearMs: YEAR_MS });
    }

    let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
    const resolved = path.join(publicDir, filePath);
    const data = await readFile(resolved);
    const ext = path.extname(resolved);
    const ctype = ext === '.css' ? 'text/css' : ext === '.js' ? 'text/javascript' : 'text/html';
    res.writeHead(200, { 'Content-Type': ctype });
    res.end(data);
  } catch {
    writeJson(res, 500, { error: 'Server error' });
  }
});

setInterval(() => {
  for (const room of rooms.values()) {
    if (Date.now() >= room.tickEndsAt && room.playerOrder.length === 2) resolveTick(room);
  }
}, 500);

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`ww-III running on http://localhost:${port}`);
});
