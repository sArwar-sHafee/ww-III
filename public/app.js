const SESSION_KEY = 'wwiii_session_v2';
const state = {
  roomId: null,
  playerId: null,
  reconnectToken: null,
  meta: null,
  game: null,
  tab: 'dashboard',
  lastStateAt: 0,
  pollTimer: null,
  es: null,
  connection: 'idle',
  notice: null,
  noticeTimer: null,
  lastTabSignature: null,
  forceTabRefresh: false,
  unitDrafts: {},
  tradeDrafts: {},
  tradeAutoFlags: {},
  selectedScoutTarget: 'economy',
  selectedMissile: 'ballistic_missile',
  selectedMissileTarget: 'economy',
  missileDraft: 1,
  selectedAssaultTarget: 'economy',
  warRoomDraft: {},
  lockUiActive: false,
  selectedResource: null
};

const DEFAULT_API_ORIGIN = 'https://ww-iii.onrender.com';
const API_ORIGIN = window.WWIII_API_ORIGIN || (window.location.hostname.endsWith('.vercel.app') ? DEFAULT_API_ORIGIN : '');
const DEFAULT_RESOURCE_CAPACITY = 999999;
const POPULATION_NUTRITION_PER_YEAR = 0.25;
const emojis = {
  credits: '💳',
  people: '👥',
  economy: '💹',
  buildings: '🏗️',
  research_center: '🔬',
  nutrition: '🍲', lumber: '🪵', steel: '🔩', copper: '🥉', alloy: '🪙', oil: '🛢️', magnet: '🧲', electricity: '⚡', glass: '🪟', polymer: '♻️', concrete: '🧱', silicon: '💾', uranium: '☢️',
  farm: '🌾', lumber_camp: '🪓', steel_mill: '🏭', copper_mine: '🥉', alloy_quarry: '⛏️', oil_rig: '🛢️', magnet_extractor: '🧲', power_plant: '⚡', glassworks: '🪟', polymer_plant: '🧪', concrete_plant: '🧱', silicon_refinery: '🖥️', uranium_mine: '☢️',
  shelter: '🏠', barracks: '🏕️', factory: '🏭', radar_station: '📡', dry_dock: '⚓', airfield: '🛫',
  anti_missile_battery: '🛡️', land_mine: '💣',
  infantry: '🪖', special_force: '🎖️', tank: '🛞', war_ship: '🚢', submarine: '🚤', fighter_zed: '🛩️', attack_helicopter: '🚁', combat_drone: '🤖', ballistic_missile: '🚀', cruise_missile: '☄️', scout_drone: '🛰️', anti_tank_squad: '🧨', naval_strike_missile: '🧿', air_defence_gun: '🎯', border_guard: '🛂'
};
const tabs = ['dashboard', 'economy', 'supports', 'trade', 'research', 'defences', 'military', 'defence_room', 'war_room', 'opponent_intel', 'help'];
const tabLabels = {
  dashboard: 'Dashboard',
  economy: 'Economy',
  supports: 'Construction',
  trade: 'Trade',
  research: 'Research',
  defences: 'Defence',
  military: 'Military',
  defence_room: 'Guardrail',
  war_room: 'War Room',
  opponent_intel: 'Opponent Intel',
  help: 'Help'
};

const SOURCE_CODE_URL = 'https://github.com/sArwar-sHafee/ww-III';
const DOC_FILES = [
  'docs/architecture/system-overview.md',
  'docs/components/building-system.md',
  'docs/components/combat-system.md',
  'docs/components/game-loop.md',
  'docs/components/networking.md',
  'docs/components/persistence.md',
  'docs/components/population-system.md',
  'docs/components/research-system.md',
  'docs/components/resource-system.md',
  'docs/components/scouting-system.md',
  'docs/components/ui-system.md',
  'docs/components/unit-system.md',
  'docs/data/events.md',
  'docs/data/state-model.md',
  'docs/data/tick-order.md',
  'docs/economy/capacity-and-loss.md',
  'docs/economy/production.md',
  'docs/economy/resources.md',
  'docs/rules/victory-conditions.md',
  'docs/rules/attack-impact-calculation.md',
  'docs/rules/war-condition.md',
  'docs/rules/war-room.md',
  'docs/ui/emoji-map.md'
];

const eventsEl = document.getElementById('events');
const chatEl = document.getElementById('chat');
const tabContent = document.getElementById('tabContent');
const tabsEl = document.getElementById('tabs');
const roomInfoEl = document.getElementById('roomInfo');
const joinFlowEl = document.getElementById('joinFlow');
const roomInputEl = document.getElementById('roomInput');
const statusBannerEl = document.getElementById('statusBanner');
const setupEl = document.getElementById('setup');
const gameLayoutEl = document.getElementById('gameLayout');
const nameEl = document.getElementById('name');
const chatInputEl = document.getElementById('chatInput');
const sidebarContentEl = document.getElementById('sidebarContent');

async function api(path, body) {
  const res = await fetch(`${API_ORIGIN}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  }

  const text = (await res.text()).trim();
  const snippet = text.slice(0, 160) || 'empty response';
  throw new Error(`Unexpected server response (${res.status}) for ${path}: ${snippet}`);
}

function setNotice(message, type = 'info') {
  clearTimeout(state.noticeTimer);
  state.notice = message ? { message, type } : null;
  if (message && (type === 'success' || type === 'info')) {
    state.noticeTimer = setTimeout(() => {
      state.notice = null;
      renderStatusBanner();
    }, 3500);
  }
  renderStatusBanner();
}

function waitForNextPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function saveSession() {
  if (!state.roomId || !state.playerId || !state.reconnectToken) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    roomId: state.roomId,
    playerId: state.playerId,
    reconnectToken: state.reconnectToken,
    name: nameEl.value.trim()
  }));
}

function clearSession() {
  clearTimeout(state.noticeTimer);
  localStorage.removeItem(SESSION_KEY);
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch (_) {
    return null;
  }
}

function closeStream() {
  if (state.es) state.es.close();
  state.es = null;
}

async function ensureMeta() {
  if (!state.meta) state.meta = await api('/api/meta');
}

function getPhaseLabel() {
  const phase = state.game?.phase;
  if (phase === 'waiting') return 'Waiting for opponent';
  if (phase === 'countdown') return 'Match starts soon';
  if (phase === 'finished') return state.game?.winner === state.playerId ? 'Victory' : 'Defeat';
  return 'Live match';
}

function getCountdownSeconds() {
  if (!state.game) return 0;
  const targetTime = state.game.phase === 'active' ? state.game.yearEndsAt : state.game.tickEndsAt;
  if (!targetTime) return 0;
  return Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));
}

function getStatusCountdownMessage() {
  return `Opponent connected. Match starts in ${getCountdownSeconds()}s.`;
}

function getDashboardSummary() {
  if (!state.game) return '';
  if (state.game.phase === 'countdown') return `Match begins in ${getCountdownSeconds()} seconds.`;
  if (state.game.phase === 'waiting') return 'Share the room code and wait for your opponent to connect.';
  if (state.game.phase === 'finished') return 'The match has ended.';
  return 'Queue actions before the next year resolves.';
}

function getWarConditionLabel() {
  return state.game?.warCondition?.label || '';
}

function getWarConditionDescription() {
  return state.game?.warCondition?.description || '';
}

function getSidebarCountdownLabel() {
  return state.game?.phase === 'countdown' ? `${getCountdownSeconds()}s to start` : `${getCountdownSeconds()}s`;
}

function getConnectionLabel() {
  if (state.connection === 'live') return 'Live sync';
  if (state.connection === 'polling') return 'Reconnecting';
  if (state.connection === 'restoring') return 'Restoring session';
  return 'Offline';
}

function getTargetBuckets() {
  return Object.entries(state.meta?.targetBuckets || {});
}

function getTargetLabel(bucket) {
  return state.meta?.targetBuckets?.[bucket]?.label || bucket.replace(/_/g, ' ');
}

function getTargetIcon(bucket) {
  return state.meta?.targetBuckets?.[bucket]?.emoji || emojis[bucket] || '';
}

function getForcedViewLock() {
  const forcedView = state.game?.you?.forcedView;
  if (forcedView?.tab !== 'opponent_intel') return null;
  if (!forcedView.lockedUntil || forcedView.lockedUntil <= Date.now()) return null;
  return forcedView;
}

function getForcedViewSeconds() {
  const forcedView = getForcedViewLock();
  if (!forcedView) return 0;
  return Math.max(0, Math.ceil((forcedView.lockedUntil - Date.now()) / 1000));
}

function escapeAttr(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function preserveScrollPosition(container, renderFn) {
  if (!container) {
    renderFn();
    return;
  }

  const { scrollTop, scrollLeft } = container;
  renderFn();
  requestAnimationFrame(() => {
    container.scrollTop = scrollTop;
    container.scrollLeft = scrollLeft;
  });
}

function formatAmount(value) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}

function renderStatusBanner() {
  const parts = [];
  const phase = state.game?.phase;

  if (state.roomId && !state.game) parts.push({ type: 'info', message: `Connecting to room ${state.roomId}...` });
  if (state.game) {
    if (phase === 'waiting') parts.push({ type: 'info', message: `Room ${state.roomId} created. Share the 4-digit code with your opponent.` });
    if (phase === 'countdown') parts.push({ type: 'warn', message: getStatusCountdownMessage(), id: 'statusCountdown' });
    if (phase === 'finished') parts.push({ type: state.game.winner === state.playerId ? 'success' : 'error', message: getPhaseLabel() });
    if (state.connection !== 'live') parts.push({ type: 'warn', message: getConnectionLabel() });
    if (getForcedViewLock()) parts.push({ type: 'error', message: `Opponent Intel locked for ${getForcedViewSeconds()}s.`, id: 'forcedViewCountdown' });
  }
  if (state.notice) parts.push(state.notice);

  if (!parts.length) {
    statusBannerEl.className = 'status hidden';
    statusBannerEl.textContent = '';
    return;
  }

  const tone = parts.some((part) => part.type === 'error') ? 'error'
    : parts.some((part) => part.type === 'warn') ? 'warn'
    : parts.some((part) => part.type === 'success') ? 'success'
    : 'info';

  statusBannerEl.className = `status ${tone}`;
  statusBannerEl.innerHTML = parts.map((part) => `<div${part.id ? ` id="${part.id}"` : ''}>${part.message}</div>`).join('');
}

function getResourceCapacity(resourceKey, buildings) {
  let capacity = DEFAULT_RESOURCE_CAPACITY;
  for (const [id, count] of Object.entries(buildings || {})) {
    const cap = state.meta.buildings[id]?.capacity?.[resourceKey];
    if (cap) capacity += cap * count;
  }
  return capacity;
}

function formatDelta(value) {
  return `${value >= 0 ? '+' : ''}${Math.floor(value)}`;
}

function formatSigned(value) {
  const numeric = Number(value || 0);
  const sign = numeric >= 0 ? '+' : '-';
  return `${sign}${formatAmount(Math.abs(numeric))}`;
}

function ticksToMonths(ticks) {
  return Math.max(1, Math.ceil(ticks / (state.meta?.ticksPerMonth || 5)));
}

function flooredResources(resources = {}) {
  return Object.fromEntries(Object.entries(resources).map(([key, value]) => [key, Math.floor(value)]));
}

function getTabSignature(game) {
  if (!game) return '';
  const { you, opponent, phase, winner, year } = game;

  if (state.tab === 'dashboard') {
    return JSON.stringify({
      phase,
      winner,
      opponent: opponent?.name || '',
      pending: you.pending,
      connection: state.connection,
      credits: you.credits,
      population: you.population,
      populationMax: you.populationMax,
      warCondition: game.warCondition
    });
  }

  if (state.tab === 'trade') {
    return JSON.stringify({
      phase,
      credits: you.credits,
      buildings: you.buildings,
      resources: flooredResources(you.resources),
      tradeOrders: (you.tradeOrders || []).map((order) => ({
        id: order.id,
        resource: order.resource,
        mode: order.mode,
        amount: order.amount
      })),
      autoTrades: you.autoTrades
    });
  }

  if (state.tab === 'economy' || state.tab === 'supports') {
    return JSON.stringify({
      phase,
      credits: you.credits,
      buildings: you.buildings,
      buildingQueues: you.buildingQueues,
      research: you.research.completed,
      resources: flooredResources(you.resources)
    });
  }

  if (state.tab === 'military') {
    return JSON.stringify({
      phase,
      units: you.units,
      buildings: you.buildings,
      buildingQueues: you.buildingQueues,
      research: you.research.completed,
      researchDisabled: you.research.disabledUntil,
      resources: flooredResources(you.resources)
    });
  }

  if (state.tab === 'defences') {
    return JSON.stringify({
      phase,
      buildings: you.buildings,
      units: you.units,
      buildingQueues: you.buildingQueues,
      research: you.research.completed,
      researchDisabled: you.research.disabledUntil,
      resources: flooredResources(you.resources)
    });
  }

  if (state.tab === 'research') {
    return JSON.stringify({
      phase,
      year,
      active: you.research.active,
      completed: you.research.completed,
      disabledUntil: you.research.disabledUntil,
      researchLockUntil: you.researchLockUntil,
      resources: flooredResources(you.resources)
    });
  }

  if (state.tab === 'war_room') {
    return JSON.stringify({
      phase,
      year,
      pending: you.pending,
      units: you.units,
      defenceAssignments: you.defenceAssignments,
      research: you.research.completed,
      researchDisabled: you.research.disabledUntil,
      cooldown: you.scoutCooldownUntil
    });
  }

  if (state.tab === 'defence_room') {
    return JSON.stringify({
      phase,
      units: you.units,
      buildings: you.buildings,
      assignments: you.defenceAssignments
    });
  }

  if (state.tab === 'opponent_intel') {
    return JSON.stringify({
      phase,
      intel: you.opponentIntelLog,
      forcedView: you.forcedView
    });
  }

  return JSON.stringify({ phase, year });
}

function updateWarRoomDraft(field, value) {
  const max = getAttackAvailableCount(field);
  state.warRoomDraft[field] = Math.max(0, Math.min(Number(value || 0), max));
}

function getEntity(id) {
  return state.meta?.units?.[id] || state.meta?.buildings?.[id] || null;
}

function getDefenceAssignableUnits() {
  return Object.entries(state.meta?.units || {}).filter(([, unit]) => unit.defenceAssignable);
}

function getDefenceAssignableBuildings() {
  return Object.entries(state.meta?.buildings || {}).filter(([, building]) => building.defenceAssignable);
}

function getBucketAssignments(bucket) {
  return state.game?.you?.defenceAssignments?.[bucket] || {};
}

function getAssignedCount(id, excludeBucket = null) {
  return Object.entries(state.game?.you?.defenceAssignments || {}).reduce((sum, [bucket, assignments]) => (
    bucket === excludeBucket ? sum : sum + (assignments?.[id] || 0)
  ), 0);
}

function getAttackAvailableCount(id) {
  return Math.max(0, (state.game?.you?.units?.[id] || 0) - getAssignedCount(id));
}

function getDefenceAssignableAvailableCount(id, bucket) {
  const you = state.game?.you;
  const owned = Object.hasOwn(you?.units || {}, id) ? (you?.units?.[id] || 0) : (you?.buildings?.[id] || 0);
  return Math.max(0, owned - getAssignedCount(id, bucket));
}

function formatCombatProfile(entries = []) {
  return entries.map(([target, value]) => `${emojis[target] || ''} x ${formatAmount(value)}`).join(' | ');
}

function formatDestroyedBy(entries = []) {
  return entries.map(([source, value]) => `${emojis[source] || ''} : ${formatAmount(value)}`).join(' | ');
}

function formatMissileIntercept(entries = []) {
  return entries.map(([target, value]) => `${emojis[target] || ''} x ${formatAmount(value)}`).join(' | ');
}

function getCombatCapabilityLine(entity, label = 'Can destroy') {
  const lines = [];
  if (entity?.combatProfile?.length) lines.push(`${label} ${formatCombatProfile(entity.combatProfile)}`);
  if (entity?.missileIntercept?.length) lines.push(`Missile shield ${formatMissileIntercept(entity.missileIntercept)}`);
  return lines.join(' | ');
}

function getDestroyedByLine(unitId) {
  const sources = [];
  for (const [id, unit] of Object.entries(state.meta?.units || {})) {
    if (unit.section !== 'defence' || !unit.combatProfile?.length) continue;
    for (const [targetId, value] of unit.combatProfile) {
      if (targetId === unitId) sources.push([id, value]);
    }
  }
  for (const [id, building] of Object.entries(state.meta?.buildings || {})) {
    if (!building.defenceAssignable || !building.combatProfile?.length) continue;
    for (const [targetId, value] of building.combatProfile) {
      if (targetId === unitId) sources.push([id, value]);
    }
  }
  return sources.length ? `Destroyed by ${formatDestroyedBy(sources)}` : '';
}

function getResourceConsumptionDetails(resource) {
  const you = state.game?.you;
  if (!you) return [];
  if (resource === 'credits') return [];
  const rows = [];
  if (resource === 'nutrition' && you.population > 0) rows.push(`${emojis.people} ${formatSigned(-you.population * POPULATION_NUTRITION_PER_YEAR)}`);
  for (const [id, building] of Object.entries(state.meta?.buildings || {})) {
    const count = you.buildings?.[id] || 0;
    const value = building.upkeep?.[resource];
    if (count > 0 && value > 0) rows.push(`${emojis[id] || ''} ${formatSigned(-count * value)}`);
  }
  for (const [id, unit] of Object.entries(state.meta?.units || {})) {
    const count = you.units?.[id] || 0;
    const value = unit.upkeep?.[resource];
    if (count > 0 && value > 0) rows.push(`${emojis[id] || ''} ${formatSigned(-count * value)}`);
  }
  return rows;
}

function getResourceGenerationDetails(resource) {
  const you = state.game?.you;
  if (!you) return [];
  if (resource === 'credits') return [];
  const rows = [];
  for (const [id, building] of Object.entries(state.meta?.buildings || {})) {
    const count = you.buildings?.[id] || 0;
    const value = building.production?.[resource];
    if (count > 0 && value > 0) rows.push(`${emojis[id] || ''} ${formatSigned(count * value)}`);
  }
  return rows;
}

function getResourceTradeDetails(resource) {
  if (resource === 'credits') {
    const { earned, spent } = getCreditsTradeFlow();
    const parts = [];
    if (earned > 0) parts.push(`+${earned}/yr`);
    if (spent > 0) parts.push(`-${spent}/yr`);
    return parts.length ? parts.join(', ') : 'None';
  }
  const auto = state.game?.you?.autoTrades?.[resource];
  if (!auto) return 'None';
  const signed = auto.mode === 'buy' ? `+${auto.amount}` : `-${auto.amount}`;
  return `${auto.mode} ${auto.amount}/yr (${signed})`;
}

function getResourceTradeDelta(resource) {
  if (resource === 'credits') return getCreditsNetPerYear();
  const auto = state.game?.you?.autoTrades?.[resource];
  if (!auto) return 0;
  return auto.mode === 'buy' ? auto.amount : -auto.amount;
}

function getResourceDetailTooltip(resource) {
  if (resource === 'credits') {
    const earned = state.game?.you?.population || 0;
    const trade = getResourceTradeDetails('credits');
    return [`Earnings: +${earned}/yr`, `Trade: ${trade}`].join('\n');
  }
  const generation = getResourceGenerationDetails(resource);
  const consumption = getResourceConsumptionDetails(resource);
  const trade = getResourceTradeDetails(resource);
  const lines = [
    'Generation:',
    ...(generation.length ? generation : ['None']),
    'Consumption:',
    ...(consumption.length ? consumption : ['None']),
    `Trade: ${trade}`
  ];
  return lines.join('\n');
}

function getResourceDetailHtml(resource) {
  if (resource === 'credits') {
    const earned = state.game?.you?.population || 0;
    const trade = getResourceTradeDetails('credits');
    return `
      <div class="resource-detail-block">
        <div class="small"><b>${emojis.credits} credits</b></div>
        <div class="small">Earnings: +${earned}/yr</div>
        <div class="small">Trade: ${trade}</div>
      </div>
    `;
  }
  const generation = getResourceGenerationDetails(resource);
  const consumption = getResourceConsumptionDetails(resource);
  const trade = getResourceTradeDetails(resource);
  return `
    <div class="resource-detail-block">
      <div class="small"><b>${emojis[resource] || ''} ${resource}</b></div>
      <div class="small">Generation: ${generation.length ? generation.join(', ') : 'None'}</div>
      <div class="small">Consumption: ${consumption.length ? consumption.join(', ') : 'None'}</div>
      <div class="small">Trade: ${trade}</div>
    </div>
  `;
}

function getTradeUnitPrice(resource) {
  return state.meta?.tradePrices?.[resource] || 1;
}

function getTradeFeeRate(autoMode) {
  if (autoMode) return state.meta?.tradeFeeAutoRate ?? 0.1;
  return state.meta?.tradeFeeManualRate ?? 0.2;
}

function getTradeFeeLabel(rate) {
  return `${Math.round(rate * 100)}%`;
}

function getAutoTradeCancelFee() {
  return state.meta?.autoTradeCancelFee ?? 20;
}

function getTradeSubtotal(resource, amount) {
  return amount * getTradeUnitPrice(resource);
}

function getTradeFeeAmount(resource, amount, autoMode) {
  const subtotal = getTradeSubtotal(resource, amount);
  const feeRate = getTradeFeeRate(autoMode);
  if (subtotal <= 0 || feeRate <= 0) return 0;
  return Math.ceil(subtotal * feeRate);
}

function getTradeBuyCost(resource, amount, autoMode) {
  return getTradeSubtotal(resource, amount) + getTradeFeeAmount(resource, amount, autoMode);
}

function getTradeSellReturn(resource, amount, autoMode) {
  return Math.max(0, getTradeSubtotal(resource, amount) - getTradeFeeAmount(resource, amount, autoMode));
}

function getTradeBuyMaxByCredits(resource, credits, autoMode) {
  if (credits <= 0) return 0;
  const unitPrice = getTradeUnitPrice(resource);
  let low = 0;
  let high = Math.max(0, Math.floor(credits / Math.max(1, unitPrice)));

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    if (getTradeBuyCost(resource, mid, autoMode) <= credits) low = mid;
    else high = mid - 1;
  }

  return low;
}

function getCreditsNetPerYear() {
  const you = state.game?.you;
  if (!you) return 0;
  let net = you.population || 0;
  for (const resource of state.meta?.resources || []) {
    const trade = you.autoTrades?.[resource];
    if (!trade) continue;
    if (trade.mode === 'buy') net -= getTradeBuyCost(resource, trade.amount, true);
    else net += getTradeSellReturn(resource, trade.amount, true);
  }
  return Math.floor(net);
}

function getCreditsTradeFlow() {
  const you = state.game?.you;
  if (!you) return { earned: 0, spent: 0 };
  let earned = 0;
  let spent = 0;
  for (const resource of state.meta?.resources || []) {
    const trade = you.autoTrades?.[resource];
    if (!trade) continue;
    if (trade.mode === 'buy') {
      spent += getTradeBuyCost(resource, trade.amount, true);
    } else {
      earned += getTradeSellReturn(resource, trade.amount, true);
    }
  }
  return { earned: Math.floor(earned), spent: Math.floor(spent) };
}

function formatCreditsNetPerYear() {
  const net = getCreditsNetPerYear();
  return `${net >= 0 ? '+' : ''}${net}/yr`;
}

function isTradeAutoMode(resource) {
  if (state.game?.you?.autoTrades?.[resource]) return true;
  if (typeof state.tradeAutoFlags[resource] === 'boolean') return state.tradeAutoFlags[resource];
  return false;
}

function getTradeCardState(resource) {
  const you = state.game?.you;
  const stock = Math.floor(you?.resources?.[resource] || 0);
  const credits = Math.floor(you?.credits || 0);
  const price = getTradeUnitPrice(resource);
  const autoMode = isTradeAutoMode(resource);
  const feeRate = getTradeFeeRate(autoMode);
  const capacity = getResourceCapacity(resource, you?.buildings || {});
  const freeSpace = Number.isFinite(capacity) ? Math.max(0, Math.floor(capacity - stock)) : Infinity;
  const buyMaxByCredits = getTradeBuyMaxByCredits(resource, credits, autoMode);
  const buyMax = Math.max(0, Math.min(buyMaxByCredits, freeSpace));
  const sellMax = stock;
  const autoTrade = you?.autoTrades?.[resource] || null;
  const sliderMax = Math.max(0, buyMax, sellMax, autoTrade?.amount || 0);
  const rawDraft = Math.floor(Number(state.tradeDrafts[resource]));
  const fallbackDraft = autoTrade?.amount || (sliderMax > 0 ? 1 : 0);
  const amount = sliderMax > 0
    ? Math.max(1, Math.min(Number.isFinite(rawDraft) && rawDraft >= 1 ? rawDraft : fallbackDraft, sliderMax))
    : 0;

  state.tradeDrafts[resource] = amount;

  const phaseActive = state.game?.phase === 'active';
  const buyDisabled = !phaseActive || amount < 1 || amount > buyMax;
  const cancelFee = getAutoTradeCancelFee();
  const cancelDisabled = !phaseActive || credits < cancelFee;
  const sellDisabled = !phaseActive || amount < 1 || amount > sellMax;
  const feeAmount = amount > 0 ? getTradeFeeAmount(resource, amount, autoMode) : 0;

  return {
    amount,
    autoTrade,
    buyCost: amount > 0 ? getTradeBuyCost(resource, amount, autoMode) : 0,
    buyDisabled,
    buyMax,
    capacity,
    cancelDisabled,
    cancelFee,
    feeAmount,
    feeRate,
    phaseActive,
    price,
    sellDisabled,
    sellMax,
    sellReturn: amount > 0 ? getTradeSellReturn(resource, amount, autoMode) : 0,
    sliderMax,
    stock
  };
}

function setTradeDraft(resource, value) {
  const { sliderMax } = getTradeCardState(resource);
  if (sliderMax <= 0) {
    state.tradeDrafts[resource] = 0;
    return;
  }
  const next = Math.floor(Number(value));
  state.tradeDrafts[resource] = Math.max(1, Math.min(Number.isFinite(next) ? next : 1, sliderMax));
}

function adjustTradeDraft(resource, delta) {
  const current = getTradeCardState(resource).amount;
  setTradeDraft(resource, current + delta);
}

function getTradeReason(kind, tradeState) {
  if (!tradeState.phaseActive) return 'Match not active';
  if (tradeState.amount < 1) return 'Choose an amount';
  if (kind === 'buy' && tradeState.amount > tradeState.buyMax) return `Buy max ${tradeState.buyMax}`;
  if (kind === 'sell' && tradeState.amount > tradeState.sellMax) return `Sell max ${tradeState.sellMax}`;
  return '';
}

function getTradeOrderLabel(order) {
  const months = ticksToMonths(order.ticksRemaining);
  return `${order.mode === 'buy' ? 'Buy' : 'Sell'} ${order.amount} ${order.resource} settles in ${months} month${months === 1 ? '' : 's'}.`;
}

function updateTradeCardPreview(resource) {
  if (state.tab !== 'trade') return;

  const tradeState = getTradeCardState(resource);
  const autoMode = isTradeAutoMode(resource);
  const autoTradeLocked = autoMode && Boolean(tradeState.autoTrade);
  const actionDisabledReason = autoTradeLocked ? 'Cancel trade to change it' : '';
  const buyLabel = autoMode ? 'Auto Buy' : 'Buy';
  const sellLabel = autoMode ? 'Auto Sell' : 'Sell';
  const cancelTitle = tradeState.cancelDisabled ? `Need ${tradeState.cancelFee} credits to cancel` : `Costs ${tradeState.cancelFee} credits to cancel`;

  const sliderEl = tabContent.querySelector(`[data-trade-slider="${resource}"]`);
  if (sliderEl) {
    sliderEl.max = String(tradeState.sliderMax);
    sliderEl.value = String(tradeState.amount);
    sliderEl.disabled = autoTradeLocked || tradeState.sliderMax < 1;
  }

  const amountEl = tabContent.querySelector(`[data-trade-amount="${resource}"]`);
  if (amountEl) amountEl.textContent = `Amount: ${tradeState.amount}`;

  const limitsEl = tabContent.querySelector(`[data-trade-limits="${resource}"]`);
  if (limitsEl) limitsEl.textContent = `Buy max: ${tradeState.buyMax} | Sell max: ${tradeState.sellMax}`;

  const rateEl = tabContent.querySelector(`[data-trade-rate="${resource}"]`);
  if (rateEl) rateEl.textContent = `Rate: ${tradeState.price} credit${tradeState.price === 1 ? '' : 's'} per unit | Fee: ${getTradeFeeLabel(tradeState.feeRate)} ${autoMode ? 'auto' : 'manual'}`;

  const totalsEl = tabContent.querySelector(`[data-trade-totals="${resource}"]`);
  if (totalsEl) totalsEl.textContent = `Buy total: ${tradeState.buyCost} | Sell return: ${tradeState.sellReturn} | Fee now: ${tradeState.feeAmount}`;

  const decreaseBtn = tabContent.querySelector(`[data-trade-decrease="${resource}"]`);
  if (decreaseBtn) decreaseBtn.disabled = autoTradeLocked || tradeState.amount <= 1;

  const increaseBtn = tabContent.querySelector(`[data-trade-increase="${resource}"]`);
  if (increaseBtn) increaseBtn.disabled = autoTradeLocked || tradeState.amount >= tradeState.sliderMax;

  const buyBtn = tabContent.querySelector(`[data-trade-buy="${resource}"]`);
  if (buyBtn) {
    buyBtn.textContent = buyLabel;
    buyBtn.disabled = autoTradeLocked || tradeState.buyDisabled;
    buyBtn.title = actionDisabledReason || getTradeReason('buy', tradeState);
  }

  const sellBtn = tabContent.querySelector(`[data-trade-sell="${resource}"]`);
  if (sellBtn) {
    sellBtn.textContent = sellLabel;
    sellBtn.disabled = autoTradeLocked || tradeState.sellDisabled;
    sellBtn.title = actionDisabledReason || getTradeReason('sell', tradeState);
  }

  const cancelBtn = tabContent.querySelector(`[data-trade-cancel-auto="${resource}"]`);
  if (cancelBtn) {
    cancelBtn.disabled = tradeState.cancelDisabled;
    cancelBtn.title = cancelTitle;
  }
}

function bindTradeControls() {
  tabContent.querySelectorAll('[data-trade-slider]').forEach((input) => {
    input.addEventListener('input', (event) => {
      const resource = event.target.dataset.tradeSlider;
      setTradeDraft(resource, event.target.value);
      updateTradeCardPreview(resource);
    });
  });

  tabContent.querySelectorAll('[data-trade-auto-toggle]').forEach((input) => {
    input.addEventListener('change', (event) => {
      const resource = event.target.dataset.tradeAutoToggle;
      state.tradeAutoFlags[resource] = event.target.checked;
      renderTrade();
    });
  });

  tabContent.querySelectorAll('[data-trade-decrease]').forEach((button) => {
    button.addEventListener('click', () => {
      const resource = button.dataset.tradeDecrease;
      adjustTradeDraft(resource, -1);
      updateTradeCardPreview(resource);
    });
  });

  tabContent.querySelectorAll('[data-trade-increase]').forEach((button) => {
    button.addEventListener('click', () => {
      const resource = button.dataset.tradeIncrease;
      adjustTradeDraft(resource, 1);
      updateTradeCardPreview(resource);
    });
  });

  tabContent.querySelectorAll('[data-trade-buy]').forEach((button) => {
    button.addEventListener('click', () => {
      const resource = button.dataset.tradeBuy;
      const { amount } = getTradeCardState(resource);
      const action = isTradeAutoMode(resource) ? 'set_auto_trade' : 'trade';
      sendAction(action, { resource, mode: 'buy', amount });
    });
  });

  tabContent.querySelectorAll('[data-trade-sell]').forEach((button) => {
    button.addEventListener('click', () => {
      const resource = button.dataset.tradeSell;
      const { amount } = getTradeCardState(resource);
      const action = isTradeAutoMode(resource) ? 'set_auto_trade' : 'trade';
      sendAction(action, { resource, mode: 'sell', amount });
    });
  });

  tabContent.querySelectorAll('[data-trade-cancel-auto]').forEach((button) => {
    button.addEventListener('click', () => sendAction('cancel_auto_trade', { resource: button.dataset.tradeCancelAuto }));
  });
}

function getUnitDraft(id) {
  return Math.max(1, Number(state.unitDrafts[id] || 1));
}

function getPendingMissileCount(id) {
  return (state.game?.you?.pending || [])
    .filter((action) => action.type === 'missile' && action.missileId === id)
    .reduce((sum, action) => sum + Math.max(1, Math.floor(Number(action.amount || 1))), 0);
}

function getAvailableMissileStock(id = state.selectedMissile) {
  if (!id || !state.game?.you) return 0;
  return Math.max(0, (state.game.you.units?.[id] || 0) - getPendingMissileCount(id));
}

function getMissileDraft() {
  const available = getAvailableMissileStock(state.selectedMissile);
  const raw = Math.max(0, Math.floor(Number(state.missileDraft || 1)));
  if (available <= 0) return 0;
  return Math.min(available, Math.max(1, raw));
}

function adjustUnitDraft(id, delta) {
  state.unitDrafts[id] = Math.max(1, getUnitDraft(id) + delta);
  state.forceTabRefresh = true;
  renderAll();
}

function adjustMissileDraft(delta) {
  const available = getAvailableMissileStock(state.selectedMissile);
  const next = getMissileDraft() + delta;
  state.missileDraft = available <= 0 ? 0 : Math.min(available, Math.max(1, next));
  state.forceTabRefresh = true;
  renderAll();
}

function adjustWarRoomDraft(field, delta) {
  updateWarRoomDraft(field, state.warRoomDraft[field] + delta);
  state.forceTabRefresh = true;
  renderAll();
}

function getAssaultUnits() {
  return Object.entries(state.meta?.units || {}).filter(([, unit]) => unit.assault);
}

function getMilitaryUnits() {
  return Object.entries(state.meta?.units || {}).filter(([, unit]) => unit.section === 'military');
}

function getDefenceUnits() {
  return Object.entries(state.meta?.units || {}).filter(([, unit]) => unit.section === 'defence');
}

function getResourceStateClass(value, net) {
  if (value <= 0 && net < 0) return 'red blink';
  if (net < 0) return 'red';
  if (value <= 0) return 'yellow';
  return '';
}

function renderEvents() {
  const events = [...(state.game?.you.eventLog || [])].map((event) => ({
    cls: event.type || '',
    text: `[Y${event.year}] ${event.message}`
  }));

  eventsEl.innerHTML = events.map((event) => `<li class="${event.cls}">${event.text}</li>`).join('');
}

function renderChat() {
  chatEl.innerHTML = (state.game?.you.chat || []).map((message) => `<div>[Y${message.year}] <b>${message.from}</b>: ${message.text}</div>`).join('');
  chatEl.scrollTop = chatEl.scrollHeight;
}

function costLine(cost) {
  return Object.entries(cost).map(([key, value]) => `${emojis[key] || ''}${key}:${value}`).join(', ');
}

function productionLine(building) {
  const entries = [];
  for (const [key, value] of Object.entries(building.production || {})) entries.push(`${emojis[key] || ''}${key}: ${value}/year`);
  return entries.join(', ');
}

function techLabel(id) {
  return state.meta?.research?.[id]?.name || id.replace(/_/g, ' ');
}

function hasTechOnline(id) {
  if (!state.game?.you) return false;
  const disabledUntil = state.game.you.research?.disabledUntil?.[id] || -1;
  return state.game.you.research?.completed?.includes(id)
    && state.game.year >= disabledUntil
    && getResearchDisabledMonthsRemaining(id) <= 0;
}

function getMissingCost(cost, amount = 1) {
  const resources = state.game?.you.resources || {};
  return Object.entries(cost)
    .filter(([key, value]) => (resources[key] ?? 0) < value * amount)
    .map(([key, value]) => `${key} ${value * amount}`);
}

function upkeepLine(entity) {
  if (!entity?.upkeep) return '';
  const entries = Object.entries(entity.upkeep).map(([key, value]) => `${emojis[key] || ''}${key}: -${value}/year`);
  return entries.length ? `Upkeep: ${entries.join(', ')}` : '';
}

function battlePointLine(entity) {
  return entity?.combatWeight ? `Battle Point: ${entity.combatWeight}` : '';
}

function getResearchDisabledMonthsRemaining(id) {
  const untilTick = state.game?.you?.research?.disabledUntilTick?.[id] || -1;
  const currentTick = state.game?.ticks || 0;
  const remainingTicks = Math.max(0, untilTick - currentTick);
  if (remainingTicks <= 0) return 0;
  return Math.ceil(remainingTicks / (state.meta?.ticksPerMonth || 5));
}

function getBuildCardState(id) {
  const you = state.game.you;
  const building = state.meta.buildings[id];
  const inQueue = you.buildingQueues.find((queue) => queue.id === id);
  const reasons = [];
  if (state.game.phase !== 'active') reasons.push('Match not active');
  if (inQueue) reasons.push('Building in Progress');
  if (building.requires && !building.requires.every((tech) => hasTechOnline(tech))) reasons.push(`Needs ${building.requires.map(techLabel).join(', ')}`);
  const missing = getMissingCost(building.cost);
  if (missing.length) reasons.push(`Missing ${missing.join(', ')}`);
  return { disabled: reasons.length > 0, reasons, inQueue };
}

function getUnitCardState(id, amount = 1) {
  const you = state.game.you;
  const unit = state.meta.units[id];
  const reasons = [];
  if (state.game.phase !== 'active') reasons.push('Match not active');
  if (unit.requiresBuilding && you.buildings[unit.requiresBuilding] <= 0) reasons.push(`Needs ${state.meta.buildings[unit.requiresBuilding]?.name || unit.requiresBuilding.replace(/_/g, ' ')}`);
  if (unit.requiresTech && !hasTechOnline(unit.requiresTech)) reasons.push(`Needs ${techLabel(unit.requiresTech)}`);
  const missing = getMissingCost(unit.cost, amount);
  if (missing.length) reasons.push(`Missing ${missing.join(', ')}`);
  return { disabled: reasons.length > 0, reasons };
}

function getResearchCardState(id) {
  const you = state.game.you;
  const tech = state.meta.research[id];
  const reasons = [];
  const isCurrent = you.research.active?.id === id;
  const disabledMonths = getResearchDisabledMonthsRemaining(id);
  if (state.game.phase !== 'active') reasons.push('Match not active');
  if (state.game.year < (you.researchLockUntil || -1)) reasons.push(`Research locked until Year ${you.researchLockUntil}`);
  if (you.research.completed.includes(id)) reasons.push('Completed');
  if (you.research.active && !isCurrent) reasons.push('Research in progress');
  if (disabledMonths > 0) reasons.push(`Disabled for ${disabledMonths} more months`);
  if (tech.minYear && state.game.year < tech.minYear) reasons.push(`Available Year ${tech.minYear}`);
  if (tech.prereq && !hasTechOnline(tech.prereq)) reasons.push(`Needs ${techLabel(tech.prereq)}`);
  const missing = getMissingCost(tech.cost);
  if (missing.length && !isCurrent) reasons.push(`Missing ${missing.join(', ')}`);
  return { disabled: reasons.length > 0, reasons, isCurrent, disabledMonths };
}

function getQuickActionState(type, missileId = state.selectedMissile, amount = getMissileDraft()) {
  const you = state.game.you;
  const reasons = [];
  if (state.game.phase !== 'active') reasons.push('Match not active');
  if (type === 'scout') {
    if (you.units.scout_drone <= 0) reasons.push('Need scout drone');
    if (state.game.year < you.scoutCooldownUntil) reasons.push(`Cooldown until Year ${you.scoutCooldownUntil}`);
  }
  if (type === 'missile') {
    const missile = state.meta.units[missileId];
    const available = getAvailableMissileStock(missileId);
    if (!hasTechOnline('missile_silo')) reasons.push('Missile Silo offline');
    if (!missile?.missile) reasons.push('Choose a missile type');
    if (available <= 0) reasons.push(`Need ${missile?.name || 'missile stock'}`);
    if (amount > available) reasons.push(`Need ${amount} ${missile?.name || 'missile stock'}`);
  }
  if (type === 'nuclear') {
    if (!hasTechOnline('nuclear_technology')) reasons.push('Nuclear Technology offline');
  }
  return { disabled: reasons.length > 0, reasons };
}

function actionBtn(label, cb, options = {}) {
  const id = `btn_${Math.random().toString(36).slice(2)}`;
  if (!options.disabled) {
    setTimeout(() => document.getElementById(id)?.addEventListener('click', cb));
  }
  return `<button type="button" id="${id}" ${options.disabled ? 'disabled' : ''} title="${options.title || ''}">${label}</button>`;
}

function renderReasons(reasons) {
  return reasons.length ? `<div class="small warning">${reasons.join(' • ')}</div>` : '';
}

function formatPendingAction(action) {
  if (action.type === 'missile') {
    const amount = Math.max(1, Math.floor(Number(action.amount || 1)));
    return `${state.meta.units[action.missileId]?.name || 'Missile'} x${amount} strike -> ${getTargetLabel(action.targetBucket)}`;
  }
  if (action.type === 'scout') return `Scout -> ${getTargetLabel(action.targetBucket)}`;
  if (action.type === 'assault') {
    const forces = getAssaultUnits().map(([id]) => id)
      .map((key) => action.committedUnits?.[key] ? `${emojis[key]}${action.committedUnits[key]}` : '')
      .filter(Boolean)
      .join(' ');
    return `${getTargetLabel(action.targetBucket)} assault ${forces || '(no forces)'}`;
  }
  return action.type;
}

function renderPendingActions() {
  const pending = state.game?.you.pending || [];
  const items = pending.length ? pending.map((action, index) => `
    <div class="pending-item">
      <span>${index + 1}. ${formatPendingAction(action)}</span>
      ${actionBtn('Cancel', () => sendAction('cancel_pending', { index }))}
    </div>
  `).join('') : '<div class="small">No queued actions.</div>';
  return `<div class="panel inset"><h3>Queued Actions</h3>${items}</div>`;
}

function renderDashboard() {
  const you = state.game.you;
  const opponent = state.game.opponent?.name || 'Waiting...';
  const roomCode = `<b>${state.game.roomId}</b>`;
  const warConditionLabel = getWarConditionLabel();
  const warConditionDescription = getWarConditionDescription();

  tabContent.innerHTML = `
    <h3>Dashboard</h3>
    <div class="summary-grid">
      <div class="card">
        <b>Command Status</b>
        <div class="small">Room: ${roomCode}</div>
        <div class="small">You: ${you.name}</div>
        <div class="small">Opponent: ${opponent}</div>
        <div class="small">💳 Credits: ${you.credits}</div>
        <div class="small">Phase: ${getPhaseLabel()}</div>
        ${warConditionLabel ? `<div class="small">War Condition: ${warConditionLabel}</div>` : ''}
        ${warConditionDescription ? `<div class="small">${warConditionDescription}</div>` : ''}
        <div class="small" id="dashboardSummary">${getDashboardSummary()}</div>
      </div>
      <div class="card">
        <b>Connection</b>
        <div class="small">${getConnectionLabel()}</div>
        <div class="small">Session recovery is enabled in this browser.</div>
        <div class="small">Chat remains available before the match starts.</div>
        ${actionBtn('Surrender', () => sendAction('chat', { text: '/surrender' }), { disabled: state.game.phase === 'finished', title: state.game.phase === 'finished' ? 'Match already finished' : 'Surrender the current match' })}
      </div>
    </div>
    ${renderPendingActions()}
  `;
}

function renderEconomyOrSupports() {
  const you = state.game.you;
  const ids = Object.keys(state.meta.buildings).filter((id) => state.tab === 'economy'
    ? state.meta.buildings[id].category === 'economy'
    : state.meta.buildings[id].category === 'support');
  tabContent.innerHTML = `<h3>${state.tab === 'economy' ? 'Economy' : 'Construction'}</h3><div class="action-grid">` + ids.map((id) => {
    const building = state.meta.buildings[id];
    const cardState = getBuildCardState(id);
    const label = cardState.inQueue ? `Building... (${ticksToMonths(cardState.inQueue.ticksRemaining)} months)` : 'Build';
    return `<div class="card">
      <b>${emojis[id] || ''} ${building.name}</b>
      <div class="small">Owned: ${you.buildings[id]} | Build time: ${building.buildTime} months</div>
      <div class="small">Cost: ${costLine(building.cost)}</div>
      ${upkeepLine(building) ? `<div class="small">${upkeepLine(building)}</div>` : ''}
      ${productionLine(building) ? `<div class="small">Output: ${productionLine(building)}</div>` : ''}
      ${renderReasons(cardState.reasons)}
      ${actionBtn(label, () => sendAction('build', { id }), { disabled: cardState.disabled, title: cardState.reasons.join(' | ') })}
    </div>`;
  }).join('') + '</div>';
}

function renderMilitary() {
  const you = state.game.you;
  const unitsHtml = getMilitaryUnits().map(([id, unit]) => {
    const unitState = getUnitCardState(id);
    const attackAvailable = getAttackAvailableCount(id);
    const destroyedBy = getDestroyedByLine(id);
    return `<div class="card">
      <b>${emojis[id] || ''} ${unit.name}</b>
      <div class="small">Owned: ${you.units[id]}${unit.assault ? ` | Free for assault: ${attackAvailable}` : ''}</div>
      ${battlePointLine(unit) ? `<div class="small">${battlePointLine(unit)}</div>` : ''}
      <div class="small">Cost: ${costLine(unit.cost)}</div>
      ${upkeepLine(unit) ? `<div class="small">${upkeepLine(unit)}</div>` : ''}
      ${unit.missile ? `<div class="small">Missile payload</div>` : ''}
      ${destroyedBy ? `<div class="small">${destroyedBy}</div>` : ''}
      ${renderReasons(unitState.reasons)}
      <div class="row stepper">
        ${actionBtn('-', () => adjustUnitDraft(id, -1))}
        <input id="amt_${id}" value="${getUnitDraft(id)}" type="number" min="1" readonly />
        ${actionBtn('+', () => adjustUnitDraft(id, 1))}
        ${actionBtn('Train', () => sendAction('train', { id, amount: getUnitDraft(id) }), { disabled: unitState.disabled, title: unitState.reasons.join(' | ') })}
      </div>
    </div>`;
  }).join('');
  tabContent.innerHTML = `
    <div class="panel inset">
      <h3>Military Units</h3>
      <div class="action-grid">${unitsHtml}</div>
    </div>
  `;
}

function renderDefences() {
  const you = state.game.you;
  const defenceBuildings = ['anti_missile_battery', 'land_mine'].map((id) => {
    const building = state.meta.buildings[id];
    const cardState = getBuildCardState(id);
    const label = cardState.inQueue ? `Building... (${ticksToMonths(cardState.inQueue.ticksRemaining)} months)` : 'Build';
    return `<div class="card">
      <b>${emojis[id] || ''} ${building.name}</b>
      <div class="small">Owned: ${you.buildings[id]} | Build time: ${building.buildTime} months</div>
      ${battlePointLine(building) ? `<div class="small">${battlePointLine(building)}</div>` : ''}
      <div class="small">Cost: ${costLine(building.cost)}</div>
      ${upkeepLine(building) ? `<div class="small">${upkeepLine(building)}</div>` : ''}
      ${getCombatCapabilityLine(building, 'Can destroy') ? `<div class="small">${getCombatCapabilityLine(building, 'Can destroy')}</div>` : ''}
      ${productionLine(building) ? `<div class="small">Output: ${productionLine(building)}</div>` : ''}
      ${renderReasons(cardState.reasons)}
      ${actionBtn(label, () => sendAction('build', { id }), { disabled: cardState.disabled, title: cardState.reasons.join(' | ') })}
    </div>`;
  }).join('');

  const defenceUnits = getDefenceUnits().map(([id, unit]) => {
    const unitState = getUnitCardState(id);
    return `<div class="card">
      <b>${emojis[id] || ''} ${unit.name}</b>
      <div class="small">Owned: ${you.units[id]}</div>
      ${battlePointLine(unit) ? `<div class="small">${battlePointLine(unit)}</div>` : ''}
      <div class="small">Cost: ${costLine(unit.cost)}</div>
      ${upkeepLine(unit) ? `<div class="small">${upkeepLine(unit)}</div>` : ''}
      ${getCombatCapabilityLine(unit, 'Can destroy') ? `<div class="small">${getCombatCapabilityLine(unit, 'Can destroy')}</div>` : ''}
      ${renderReasons(unitState.reasons)}
      <div class="row stepper">
        ${actionBtn('-', () => adjustUnitDraft(id, -1))}
        <input id="amt_${id}" value="${getUnitDraft(id)}" type="number" min="1" readonly />
        ${actionBtn('+', () => adjustUnitDraft(id, 1))}
        ${actionBtn('Train', () => sendAction('train', { id, amount: getUnitDraft(id) }), { disabled: unitState.disabled, title: unitState.reasons.join(' | ') })}
      </div>
    </div>`;
  }).join('');

  tabContent.innerHTML = `
    <div class="panel inset">
      <h3>Defence</h3>
      <div class="action-grid">${defenceBuildings}${defenceUnits}</div>
    </div>
  `;
}

function renderTrade() {
  const you = state.game.you;
  const rows = state.meta.resources.map((resource) => {
    const tradeState = getTradeCardState(resource);
    const autoMode = isTradeAutoMode(resource);
    const autoTradeLocked = autoMode && Boolean(tradeState.autoTrade);
    const orders = (you.tradeOrders || []).filter((order) => order.resource === resource);
    const buyLabel = autoMode ? 'Auto Buy' : 'Buy';
    const sellLabel = autoMode ? 'Auto Sell' : 'Sell';
    const actionDisabledReason = autoTradeLocked ? 'Cancel trade to change it' : '';
    const cancelTitle = tradeState.cancelDisabled ? `Need ${tradeState.cancelFee} credits to cancel` : `Costs ${tradeState.cancelFee} credits to cancel`;

    return `<div class="card trade-card">
      <b>${emojis[resource] || ''} ${resource}</b>
      <div class="small">Stock: ${tradeState.stock} | Credits: ${you.credits}</div>
      <div class="small" data-trade-rate="${resource}">Rate: ${tradeState.price} credit${tradeState.price === 1 ? '' : 's'} per unit | Fee: ${getTradeFeeLabel(tradeState.feeRate)} ${autoMode ? 'auto' : 'manual'}</div>
      <label class="small trade-auto-toggle">
        <input type="checkbox" data-trade-auto-toggle="${resource}" ${autoMode ? 'checked' : ''} ${tradeState.autoTrade ? 'disabled' : ''} />
        Trade
      </label>
      <div class="row trade-amount-row">
        <input class="trade-slider" data-trade-slider="${resource}" type="range" min="0" max="${tradeState.sliderMax}" step="1" value="${tradeState.amount}" ${(autoTradeLocked || tradeState.sliderMax < 1) ? 'disabled' : ''} />
      </div>
      <div class="row trade-stepper">
        <button type="button" data-trade-decrease="${resource}" ${(autoTradeLocked || tradeState.amount <= 1) ? 'disabled' : ''}>-</button>
        <div class="small trade-amount-display" data-trade-amount="${resource}">Amount: ${tradeState.amount}</div>
        <button type="button" data-trade-increase="${resource}" ${(autoTradeLocked || tradeState.amount >= tradeState.sliderMax) ? 'disabled' : ''}>+</button>
      </div>
      <div class="small" data-trade-totals="${resource}">Buy total: ${tradeState.buyCost} | Sell return: ${tradeState.sellReturn} | Fee now: ${tradeState.feeAmount}</div>
      <div class="small" data-trade-limits="${resource}">Buy max: ${tradeState.buyMax} | Sell max: ${tradeState.sellMax}</div>
      ${tradeState.autoTrade ? `<div class="small">🔁 Trade active: ${tradeState.autoTrade.mode} ${tradeState.autoTrade.amount} ${resource}/yr</div>` : ''}
      ${orders.length ? `<div class="trade-order-list">${orders.map((order) => `<div class="small" data-trade-order-id="${order.id}">${getTradeOrderLabel(order)}</div>`).join('')}</div>` : ''}
      <div class="row trade-actions">
        <button type="button" data-trade-buy="${resource}" ${autoTradeLocked || tradeState.buyDisabled ? 'disabled' : ''} title="${actionDisabledReason || getTradeReason('buy', tradeState)}">${buyLabel}</button>
        <button type="button" data-trade-sell="${resource}" ${autoTradeLocked || tradeState.sellDisabled ? 'disabled' : ''} title="${actionDisabledReason || getTradeReason('sell', tradeState)}">${sellLabel}</button>
        ${tradeState.autoTrade ? `<button type="button" data-trade-cancel-auto="${resource}" ${tradeState.cancelDisabled ? 'disabled' : ''} title="${cancelTitle}">Cancel Trade (-${tradeState.cancelFee})</button>` : ''}
      </div>
    </div>`;
  }).join('');

  tabContent.innerHTML = `
    <h3>Trade</h3>
    <div class="small">Population generates credits at year end. Manual trades reserve the selected amount now and settle after ${state.meta.tradeDelayMonths || 3} months.</div>
    <div class="small">Manual trade fee: ${getTradeFeeLabel(state.meta?.tradeFeeManualRate ?? 0.2)} of trade value. Auto trade fee: ${getTradeFeeLabel(state.meta?.tradeFeeAutoRate ?? 0.1)} of trade value.</div>
    <div class="small">Auto trade cancel fee: ${getAutoTradeCancelFee()} credits.</div>
    <div class="small">Treasury: ${you.credits} credits</div>
    <div class="action-grid">${rows}</div>
  `;

  bindTradeControls();
}

function renderTargetOptions(selected) {
  return getTargetBuckets().map(([bucket, config]) => `<option value="${bucket}" ${selected === bucket ? 'selected' : ''}>${config.label}</option>`).join('');
}

function adjustDefenceAssignment(bucket, id, delta) {
  const currentAssignments = { ...getBucketAssignments(bucket) };
  const current = currentAssignments[id] || 0;
  const max = current + getDefenceAssignableAvailableCount(id, bucket);
  const next = Math.max(0, Math.min(current + delta, max));
  if (next === current) return;
  currentAssignments[id] = next;
  sendAction('set_defence_assignment', { bucket, assignments: currentAssignments });
}

function renderDefenceAssignmentRows(bucket, entries) {
  return entries.map(([id, entity]) => {
    const assigned = getBucketAssignments(bucket)[id] || 0;
    const available = getDefenceAssignableAvailableCount(id, bucket);
    return `<div class="row stepper assignment-row">
      <span class="assignment-icon">${emojis[id] || ''}</span>
      ${actionBtn('-', () => adjustDefenceAssignment(bucket, id, -1), { disabled: assigned <= 0, title: assigned <= 0 ? 'Nothing assigned' : '' })}
      <input type="number" value="${assigned}" min="0" readonly />
      ${actionBtn('+', () => adjustDefenceAssignment(bucket, id, 1), { disabled: available <= 0, title: available <= 0 ? 'No free stock left' : '' })}
      <span class="small">${entity.name} | Free ${available}</span>
    </div>`;
  }).join('');
}

function renderDefenceRoom() {
  const buildingEntries = getDefenceAssignableBuildings();
  const unitEntries = getDefenceAssignableUnits();
  tabContent.innerHTML = `
    <h3>Guardrail</h3>
    <div class="small">Assign defence assets into Economy, Buildings, or Research Center. Only assigned defences will respond to attacks on that bucket.</div>
    <div class="defence-room-grid">
      ${getTargetBuckets().map(([bucket, config]) => `
        <div class="panel inset">
          <h3>${getTargetIcon(bucket)} ${config.label}</h3>
          <div class="small">Only assets assigned here will fight when this bucket is attacked.</div>
          <div class="assignment-group">
            <div class="small">Defence structures</div>
            ${renderDefenceAssignmentRows(bucket, buildingEntries)}
          </div>
          <div class="assignment-group">
            <div class="small">Defence units</div>
            ${renderDefenceAssignmentRows(bucket, unitEntries)}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderOpponentIntel() {
  const logs = state.game?.you?.opponentIntelLog || [];
  const forcedView = getForcedViewLock();
  tabContent.innerHTML = `
    <h3>Opponent Intel</h3>
    <div class="small">${forcedView ? `Window locked for ${getForcedViewSeconds()}s while you review the attack report.` : 'Scout reports and war reports stay here for the whole match.'}</div>
    <div class="intel-log">
      ${logs.length ? logs.map((entry) => `
        <div class="intel-entry ${entry.tone || ''}">
          <div class="intel-head">
            <b>${getTargetIcon(entry.bucket)} ${entry.title}</b>
            <span class="small">Y${entry.year}</span>
          </div>
          ${entry.summary ? `<div class="small">${entry.summary}</div>` : ''}
          ${entry.details?.length ? `<ul>${entry.details.map((detail) => `<li>${detail}</li>`).join('')}</ul>` : ''}
        </div>
      `).join('') : '<div class="small">No intel reports yet.</div>'}
    </div>
  `;
}

function renderHelp() {
  const groupOrder = ['architecture', 'components', 'data', 'economy', 'rules', 'ui'];
  const groupedDocs = DOC_FILES.reduce((acc, path) => {
    const rel = path.replace(/^docs\//, '');
    const [group, ...rest] = rel.split('/');
    if (!group) return acc;
    acc[group] = acc[group] || [];
    acc[group].push(rest.join('/'));
    return acc;
  }, {});
  const docLinks = groupOrder
    .filter((group) => groupedDocs[group]?.length)
    .map((group) => {
      const title = group[0].toUpperCase() + group.slice(1);
      const items = groupedDocs[group].map((file) => {
        const label = file.replace(/\.md$/i, '');
        const name = label.split('-').map((part) => {
          if (!part) return part;
          const lower = part.toLowerCase();
          if (['ui', 'api', 'sse', 'id'].includes(lower)) return lower.toUpperCase();
          return part[0].toUpperCase() + part.slice(1);
        }).join(' ');
        const pagePath = `${group}/${label}.html`;
        const displayUrl = `sarwar-shafee.github.io/ww-III/${pagePath}`;
        const href = `https://${displayUrl}`;
        return `
          <li>
            <div class="doc-name"> ${name}</div>
            <a class="doc-url" href="${href}" target="_blank" rel="noreferrer">${displayUrl}</a>
          </li>
        `;
      }).join('');
      return `
        <div class="doc-group">
          <div class="doc-group-title">${title}</div>
          <ul class="doc-links">${items}</ul>
        </div>
      `;
    }).join('');
  tabContent.innerHTML = `
    <h3>Help</h3>
    <div class="panel inset">
      ${state.selectedResource ? `<div class="help-resource">${getResourceDetailHtml(state.selectedResource)}</div>` : ''}
      <div class="help-title">Gameplay</div>
      <div class="small"><b>Source code</b> <a class="doc-url source-code-link" href="${SOURCE_CODE_URL}" target="_blank" rel="noreferrer">${SOURCE_CODE_URL}</a></div>
      <div class="doc-sections">${docLinks}</div>
    </div>
  `;
}

function renderSidebar() {
  const you = state.game.you;
  const creditsRow = (() => {
    const value = Math.floor(you.credits || 0);
    const net = getCreditsNetPerYear();
    const cls = getResourceStateClass(value, net);
    const tooltip = escapeAttr(getResourceDetailTooltip('credits'));
    return `<tr class="${cls} resource-row" data-resource-row="credits" title="${tooltip}"><td title="${tooltip}">${emojis.credits} credits</td><td>${value}</td><td>${formatDelta(net)}</td></tr>`;
  })();
  const resourceRows = state.meta.resources.map((resource) => {
    const value = Math.floor(you.resources[resource]);
    const net = (you.net?.[resource] ?? 0) + getResourceTradeDelta(resource);
    const cls = getResourceStateClass(value, net);
    const tooltip = escapeAttr(getResourceDetailTooltip(resource));
    return `<tr class="${cls} resource-row" data-resource-row="${resource}" title="${tooltip}"><td title="${tooltip}">${emojis[resource] || ''} ${resource}</td><td>${value}</td><td>${formatDelta(net)}</td></tr>`;
  }).join('');

  const buildingRows = Object.entries(state.meta.buildings)
    .filter(([, building]) => building.category !== 'military')
    .map(([id, building]) => `
    <tr><td>${emojis[id] || ''} ${building.name}</td><td>${building.category}</td><td>${you.buildings[id]}</td></tr>
  `).join('');

  const defenceRows = [
    ...['anti_missile_battery', 'land_mine'].map((id) => `<tr><td>${emojis[id] || ''} ${state.meta.buildings[id].name}</td><td>${you.buildings[id]}</td></tr>`),
    ...getDefenceUnits().map(([id, unit]) => `<tr><td>${emojis[id] || ''} ${unit.name}</td><td>${you.units[id]}</td></tr>`)
  ].join('');

  const unitRows = Object.entries(state.meta.units)
    .filter(([, unit]) => unit.section !== 'defence')
    .map(([id, unit]) => `
    <tr><td>${emojis[id] || ''} ${unit.name}</td><td>${you.units[id]}</td></tr>
  `).join('');

  preserveScrollPosition(sidebarContentEl, () => {
    sidebarContentEl.innerHTML = `
      <h3>Command Summary</h3>
      <div class="small">📅 Year ${state.game.year}, Month ${state.game.month}</div>
      <div class="small">👥 Population ${you.population}/${you.populationMax}</div>
      <div class="small" id="sidebarCountdown">⏱️ Tick ${getSidebarCountdownLabel()}</div>
      <div class="split-panels">
        <div class="panel inset">
          <h3>Resources</h3>
          <table class="data-table">
            <thead><tr><th>Resource</th><th>Total</th><th>Net</th></tr></thead>
            <tbody>${creditsRow}${resourceRows}</tbody>
          </table>
        </div>
        <div class="panel inset">
          <h3>Buildings</h3>
          <table class="data-table">
            <thead><tr><th>Item</th><th>Category</th><th>Owned</th></tr></thead>
            <tbody>${buildingRows}</tbody>
          </table>
        </div>
        <div class="panel inset">
          <h3>Units</h3>
          <table class="data-table">
            <thead><tr><th>Unit</th><th>Owned</th></tr></thead>
            <tbody>${unitRows}</tbody>
          </table>
        </div>
        <div class="panel inset">
          <h3>Defences</h3>
          <table class="data-table">
            <thead><tr><th>Defence</th><th>Owned</th></tr></thead>
            <tbody>${defenceRows}</tbody>
          </table>
        </div>
      </div>
    `;
  });

  sidebarContentEl.querySelectorAll('[data-resource-row]').forEach((row) => {
    row.addEventListener('click', () => {
      state.selectedResource = row.dataset.resourceRow;
      state.tab = 'help';
      state.forceTabRefresh = true;
      renderAll();
    });
  });
}

function refreshLiveCountdowns() {
  if (!state.game) return;
  const lockActive = Boolean(getForcedViewLock());

  if (lockActive !== state.lockUiActive) {
    state.lockUiActive = lockActive;
    renderStatusBanner();
    drawTabs();
    if (state.tab === 'opponent_intel') renderTab();
  }

  const sidebarCountdownEl = document.getElementById('sidebarCountdown');
  if (sidebarCountdownEl) sidebarCountdownEl.textContent = `⏱️ Tick ${getSidebarCountdownLabel()}`;

  const dashboardSummaryEl = document.getElementById('dashboardSummary');
  if (dashboardSummaryEl) dashboardSummaryEl.textContent = getDashboardSummary();

  const statusCountdownEl = document.getElementById('statusCountdown');
  if (statusCountdownEl) statusCountdownEl.textContent = getStatusCountdownMessage();

  const forcedViewCountdownEl = document.getElementById('forcedViewCountdown');
  if (forcedViewCountdownEl && lockActive) forcedViewCountdownEl.textContent = `Opponent Intel locked for ${getForcedViewSeconds()}s.`;

  if (state.tab === 'trade') {
    const ordersById = Object.fromEntries((state.game.you.tradeOrders || []).map((order) => [order.id, order]));
    document.querySelectorAll('[data-trade-order-id]').forEach((el) => {
      const order = ordersById[el.dataset.tradeOrderId];
      if (order) el.textContent = getTradeOrderLabel(order);
    });
  }
}

function renderResearch() {
  const you = state.game.you;
  tabContent.innerHTML = `<h3>Research</h3>
    <div class="small">Active: ${you.research.active ? `${state.meta.research[you.research.active.id].name} (${ticksToMonths(you.research.active.ticksRemaining)} months left)` : 'None'}</div>
    <div class="small">${state.game.year < (you.researchLockUntil || -1) ? `Research Center disrupted until Year ${you.researchLockUntil}.` : 'Research Center online.'}</div>
    <div class="action-grid">` +
    Object.entries(state.meta.research).map(([id, tech]) => {
      const cardState = getResearchCardState(id);
      const progress = cardState.isCurrent ? Math.max(0, 100 - Math.floor((you.research.active.ticksRemaining / (tech.years * (state.meta?.ticksPerMonth || 5))) * 100)) : (you.research.completed.includes(id) ? 100 : 0);
      const label = cardState.isCurrent ? `Researching... ${progress}%` : 'Start';
      return `<div class="card">
        <b>${tech.name}</b>
        <div class="small">Cost: ${costLine(tech.cost)} | 🕒 ${tech.years} months</div>
        <div class="small">Progress: ${progress}%</div>
        ${cardState.disabledMonths > 0 ? `<div class="small warning">Disabled for ${cardState.disabledMonths} more months</div>` : ''}
        <div class="progress"><span style="width:${progress}%"></span></div>
        ${renderReasons(cardState.reasons)}
        ${actionBtn(label, () => sendAction('research', { id }), { disabled: cardState.disabled, title: cardState.reasons.join(' | ') })}
      </div>`;
    }).join('') + '</div>';
}

function renderWarRoom() {
  state.missileDraft = getMissileDraft();
  const scoutState = getQuickActionState('scout');
  const missileState = getQuickActionState('missile', state.selectedMissile, getMissileDraft());
  const nuclearState = getQuickActionState('nuclear');
  const missileAvailable = getAvailableMissileStock(state.selectedMissile);
  const assaultRows = getAssaultUnits().map(([id, unit]) => {
    updateWarRoomDraft(id, state.warRoomDraft[id] || 0);
    const freeCount = getAttackAvailableCount(id);
    return `<div class="row stepper">${emojis[id] || ''}${actionBtn('-', () => adjustWarRoomDraft(id, -1), { disabled: (state.warRoomDraft[id] || 0) <= 0 })}<input id="wr_${id}" type="number" value="${state.warRoomDraft[id]}" min="0" readonly />${actionBtn('+', () => adjustWarRoomDraft(id, 1), { disabled: freeCount <= (state.warRoomDraft[id] || 0), title: freeCount <= (state.warRoomDraft[id] || 0) ? 'No more free stock' : '' })}<span class="small">${unit.name} | Free ${freeCount}</span></div>`;
  }).join('');
  const assaultPayload = Object.fromEntries(getAssaultUnits().map(([id]) => [id, state.warRoomDraft[id] || 0]).filter(([, count]) => count > 0));
  tabContent.innerHTML = `<h3>War Room</h3>
    <p>Queue actions now. All attacks resolve when the current year ends.</p>
    <div class="small">Scout the same target bucket first for 100% attack impact. Attacks without active scout intel land at 80% impact.</div>
    ${renderPendingActions()}
    <div class="card">
      ${renderReasons(scoutState.reasons)}
      <div class="row">
        <select id="wrScoutTarget">${renderTargetOptions(state.selectedScoutTarget)}</select>
        ${actionBtn('Launch Scout', () => {
          state.selectedScoutTarget = document.getElementById('wrScoutTarget').value;
          sendAction('scout', { targetBucket: state.selectedScoutTarget });
        }, { disabled: scoutState.disabled, title: scoutState.reasons.join(' | ') })}
      </div>
      ${renderReasons(missileState.reasons)}
      <div class="row">
        <select id="wrMissile">
          ${getMilitaryUnits().filter(([, unit]) => unit.missile).map(([id, unit]) => `<option value="${id}" ${state.selectedMissile === id ? 'selected' : ''}>${unit.name}</option>`).join('')}
        </select>
        <select id="wrMissileTarget">${renderTargetOptions(state.selectedMissileTarget)}</select>
        ${actionBtn('Launch Missile', () => {
          state.selectedMissile = document.getElementById('wrMissile').value;
          state.selectedMissileTarget = document.getElementById('wrMissileTarget').value;
          sendAction('missile', { missileId: state.selectedMissile, targetBucket: state.selectedMissileTarget, amount: getMissileDraft() });
        }, { disabled: missileState.disabled, title: missileState.reasons.join(' | ') })}
      </div>
      <div class="row stepper">
        ${actionBtn('-', () => adjustMissileDraft(-1), { disabled: getMissileDraft() <= 1 })}
        <input id="wrMissileAmt" type="number" value="${getMissileDraft()}" min="0" readonly />
        ${actionBtn('+', () => adjustMissileDraft(1), { disabled: missileAvailable <= 0 || getMissileDraft() >= missileAvailable, title: missileAvailable <= 0 ? 'No missile stock available' : (getMissileDraft() >= missileAvailable ? 'Reached available stock' : '') })}
        <span class="small">Missiles per launch | Available ${missileAvailable}</span>
      </div>
      ${renderReasons(nuclearState.reasons)}
      <div class="row">
        ${actionBtn('Launch Nuclear Missile', () => {
          sendAction('nuclear_strike', {});
        }, { disabled: nuclearState.disabled, title: nuclearState.reasons.join(' | ') })}
      </div>
      <div class="small"><b>Ground Assault</b></div>
      <div class="row">
        <select id="wrAssaultTarget">${renderTargetOptions(state.selectedAssaultTarget)}</select>
        <span class="small">Choose the bucket once, then commit assault.</span>
      </div>
      <div class="war-room-grid" title="Commit assault units">
        ${assaultRows}
        ${actionBtn('Commit Assault', () => {
          state.selectedAssaultTarget = document.getElementById('wrAssaultTarget').value;
          sendAction('assault', { targetBucket: state.selectedAssaultTarget, committedUnits: assaultPayload });
        }, { disabled: state.game.phase !== 'active' || !Object.keys(assaultPayload).length, title: state.game.phase !== 'active' ? 'Match not active' : (!Object.keys(assaultPayload).length ? 'Choose at least one unit' : '') })}
      </div>
    </div>`;
  document.getElementById('wrMissile')?.addEventListener('change', (event) => {
    state.selectedMissile = event.target.value;
    state.missileDraft = getMissileDraft();
    state.forceTabRefresh = true;
    renderAll();
  });
  document.getElementById('wrScoutTarget')?.addEventListener('change', (event) => {
    state.selectedScoutTarget = event.target.value;
  });
  document.getElementById('wrMissileTarget')?.addEventListener('change', (event) => {
    state.selectedMissileTarget = event.target.value;
  });
  document.getElementById('wrAssaultTarget')?.addEventListener('change', (event) => {
    state.selectedAssaultTarget = event.target.value;
  });
}

function renderTab(options = {}) {
  if (!state.game?.you) return;
  const renderActiveTab = () => {
    if (state.tab === 'dashboard') return renderDashboard();
    if (state.tab === 'economy' || state.tab === 'supports') return renderEconomyOrSupports();
    if (state.tab === 'trade') return renderTrade();
    if (state.tab === 'military') return renderMilitary();
    if (state.tab === 'defences') return renderDefences();
    if (state.tab === 'research') return renderResearch();
    if (state.tab === 'war_room') return renderWarRoom();
    if (state.tab === 'defence_room') return renderDefenceRoom();
    if (state.tab === 'opponent_intel') return renderOpponentIntel();
    if (state.tab === 'help') return renderHelp();
  };

  if (options.preserveScroll) {
    preserveScrollPosition(tabContent, renderActiveTab);
    return;
  }

  renderActiveTab();
}

async function sendAction(type, payload) {
  try {
    await api('/api/action', { roomId: state.roomId, playerId: state.playerId, type, payload });
    state.forceTabRefresh = true;
    setNotice(null);
  } catch (error) {
    setNotice(error.message, 'error');
  }
}

function drawTabs() {
  const forcedView = getForcedViewLock();
  tabsEl.innerHTML = tabs.map((tab) => `<button class="tab ${state.tab === tab ? 'active' : ''}" data-tab="${tab}" ${forcedView && tab !== 'opponent_intel' ? 'disabled' : ''}>${tabLabels[tab] || tab.replace('_', ' ')}</button>`).join('');
  tabsEl.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      if (getForcedViewLock() && button.dataset.tab !== 'opponent_intel') {
        setNotice(`Opponent Intel locked for ${getForcedViewSeconds()}s.`, 'warn');
        return;
      }
      state.tab = button.dataset.tab;
      state.lastTabSignature = null;
      state.forceTabRefresh = true;
      setNotice(null);
      drawTabs();
      renderTab();
    });
  });
}

function renderAll() {
  renderStatusBanner();
  if (!state.game) return;
  gameLayoutEl.classList.remove('hidden');
  renderEvents();
  renderChat();
  renderSidebar();
  const nextSignature = getTabSignature(state.game);
  if (!tabsEl.children.length) drawTabs();
  if (state.forceTabRefresh || state.lastTabSignature !== nextSignature) {
    renderTab({ preserveScroll: state.lastTabSignature !== null });
    state.lastTabSignature = nextSignature;
    state.forceTabRefresh = false;
  }
}

function applyGameState(game) {
  state.game = game;
  state.lastStateAt = Date.now();
  if (getForcedViewLock()) {
    state.tab = 'opponent_intel';
    state.lastTabSignature = null;
    state.forceTabRefresh = true;
  }
  if (!tabs.includes(state.tab)) state.tab = tabs[0];
  if (game?.you?.name) nameEl.value = game.you.name;
  if (state.game?.phase === 'finished') {
    clearSession();
    setupEl.classList.remove('hidden');
    state.lastTabSignature = null;
    state.forceTabRefresh = true;
  } else {
    saveSession();
  }
  roomInfoEl.textContent = '';
  if (state.game?.phase !== 'finished' && state.game?.opponent?.name) {
    setupEl.classList.add('hidden');
  }
  renderAll();
}

function startPollingFallback() {
  clearInterval(state.pollTimer);
  state.pollTimer = setInterval(async () => {
    if (!state.roomId || !state.playerId) return;
    if (Date.now() - state.lastStateAt < 4_000) return;
    try {
      state.connection = state.connection === 'live' ? 'live' : 'polling';
      const game = await api(`/api/state?roomId=${state.roomId}&playerId=${state.playerId}`);
      applyGameState(game);
      renderStatusBanner();
    } catch (_) {
      state.connection = 'offline';
      renderStatusBanner();
    }
  }, 2_000);
}

function connectStream() {
  closeStream();
  state.connection = 'polling';
  renderStatusBanner();
  const es = new EventSource(`${API_ORIGIN}/api/stream?roomId=${state.roomId}&playerId=${state.playerId}`);
  state.es = es;
  es.addEventListener('state', (event) => {
    state.connection = 'live';
    applyGameState(JSON.parse(event.data));
    renderStatusBanner();
  });
  es.addEventListener('error', () => {
    state.connection = 'polling';
    renderStatusBanner();
  });
  startPollingFallback();
}

async function restoreSession() {
  const session = readSession();
  if (!session?.roomId || !session?.reconnectToken) return;
  state.connection = 'restoring';
  renderStatusBanner();
  try {
    await ensureMeta();
    const data = await api('/api/room/reconnect', { roomId: session.roomId, reconnectToken: session.reconnectToken });
    state.roomId = data.roomId;
    state.playerId = data.playerId;
    state.reconnectToken = data.reconnectToken;
    if (session.name) nameEl.value = session.name;
    setupEl.classList.add('hidden');
    connectStream();
    setNotice('Session restored.', 'success');
  } catch (_) {
    clearSession();
    state.connection = 'idle';
    renderStatusBanner();
  }
}

document.getElementById('createBtn').addEventListener('click', async () => {
  try {
    const name = nameEl.value.trim() || 'Commander';
    setNotice('Creating game... please wait.', 'warn');
    await waitForNextPaint();
    await ensureMeta();
    const data = await api('/api/room/create', { name });
    state.roomId = data.roomId;
    state.playerId = data.playerId;
    state.reconnectToken = data.reconnectToken;
    joinFlowEl.classList.add('hidden');
    roomInfoEl.textContent = '';
    saveSession();
    connectStream();
    setNotice(null);
  } catch (error) {
    setNotice(error.message, 'error');
  }
});

document.getElementById('joinBtn').addEventListener('click', () => {
  joinFlowEl.classList.toggle('hidden');
  if (!joinFlowEl.classList.contains('hidden')) roomInputEl.focus();
});

document.getElementById('joinConfirmBtn').addEventListener('click', async () => {
  try {
    await ensureMeta();
    const name = nameEl.value.trim() || 'Commander';
    const roomId = roomInputEl.value.trim();
    if (!/^\d{4}$/.test(roomId)) {
      setNotice('Please enter a valid 4-digit room code.', 'error');
      return;
    }
    const data = await api('/api/room/join', { roomId, name });
    state.roomId = data.roomId;
    state.playerId = data.playerId;
    state.reconnectToken = data.reconnectToken;
    roomInfoEl.textContent = '';
    saveSession();
    connectStream();
  } catch (error) {
    setNotice(error.message, 'error');
  }
});

roomInputEl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') document.getElementById('joinConfirmBtn').click();
});

document.getElementById('sendChat').addEventListener('click', async () => {
  const text = chatInputEl.value.trim();
  if (!text) return;
  chatInputEl.value = '';
  await sendAction('chat', { text });
});

chatInputEl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    document.getElementById('sendChat').click();
  }
});

setInterval(() => refreshLiveCountdowns(), 1000);

ensureMeta().then(() => restoreSession());
