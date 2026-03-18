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
  selectedMissile: 'ballistic_missile',
  warRoomDraft: {}
};

const DEFAULT_API_ORIGIN = 'https://ww-iii.onrender.com';
const API_ORIGIN = window.WWIII_API_ORIGIN || (window.location.hostname.endsWith('.vercel.app') ? DEFAULT_API_ORIGIN : '');
const emojis = {
  credits: '💳',
  nutrition: '🍲', lumber: '🪵', steel: '🔩', alloy: '🪙', oil: '🛢️', magnet: '🧲', electricity: '⚡', glass: '🪟', polymer: '♻️', concrete: '🧱', silicon: '💾',
  farm: '🌾', lumber_camp: '🪓', steel_mill: '🏭', alloy_quarry: '⛏️', oil_rig: '🛢️', magnet_extractor: '🧲', power_plant: '⚡', glassworks: '🪟', polymer_plant: '🧪', concrete_plant: '🧱', silicon_refinery: '💾',
  shelter: '🏠', barracks: '🪖', factory: '🏭', radar_station: '📡', dry_dock: '⚓', airfield: '🛫',
  anti_missile_battery: '🛡️', land_mine: '💣',
  infantry: '🪖', special_force: '🎖️', tank: '🛞', war_ship: '🚢', submarine: '🚤', fighter_zed: '🛩️', attack_helicopter: '🚁', combat_drone: '🤖', ballistic_missile: '🚀', cruise_missile: '🛰️', scout_drone: '📡', anti_tank_squad: '🧨', naval_strike_missile: '🚀', air_defence_gun: '🎯'
};
const tabs = ['dashboard', 'economy', 'trade', 'supports', 'military', 'defences', 'research', 'war_room'];
const tabLabels = {
  dashboard: 'Dashboard',
  economy: 'Economy',
  trade: 'Trade',
  supports: 'Supports',
  military: 'Military',
  defences: 'Defences',
  research: 'Research',
  war_room: 'War Room'
};

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

function getConnectionLabel() {
  if (state.connection === 'live') return 'Live sync';
  if (state.connection === 'polling') return 'Reconnecting';
  if (state.connection === 'restoring') return 'Restoring session';
  return 'Offline';
}

function renderStatusBanner() {
  const parts = [];
  const phase = state.game?.phase;

  if (state.roomId && !state.game) parts.push({ type: 'info', message: `Connecting to room ${state.roomId}...` });
  if (state.game) {
    if (phase === 'waiting') parts.push({ type: 'info', message: `Room ${state.roomId} created. Share the 4-digit code with your opponent.` });
    if (phase === 'countdown') parts.push({ type: 'warn', message: `Opponent connected. Match starts in ${getCountdownSeconds()}s.` });
    if (phase === 'finished') parts.push({ type: state.game.winner === state.playerId ? 'success' : 'error', message: getPhaseLabel() });
    if (state.connection !== 'live') parts.push({ type: 'warn', message: getConnectionLabel() });
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
  statusBannerEl.innerHTML = parts.map((part) => `<div>${part.message}</div>`).join('');
}

function getResourceCapacity(resourceKey, buildings) {
  let capacity = Infinity;
  for (const [id, count] of Object.entries(buildings || {})) {
    const cap = state.meta.buildings[id]?.capacity?.[resourceKey];
    if (cap) capacity = Number.isFinite(capacity) ? capacity + cap * count : cap * count;
  }
  return capacity;
}

function formatDelta(value) {
  return `${value >= 0 ? '+' : ''}${Math.floor(value)}`;
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
      connection: state.connection
    });
  }

  if (state.tab === 'economy' || state.tab === 'supports' || state.tab === 'trade') {
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
      resources: flooredResources(you.resources)
    });
  }

  if (state.tab === 'defences') {
    return JSON.stringify({
      phase,
      buildings: you.buildings,
      buildingQueues: you.buildingQueues,
      research: you.research.completed,
      resources: flooredResources(you.resources)
    });
  }

  if (state.tab === 'research') {
    return JSON.stringify({
      phase,
      year,
      active: you.research.active,
      completed: you.research.completed,
      resources: flooredResources(you.resources)
    });
  }

  if (state.tab === 'war_room') {
    return JSON.stringify({
      phase,
      year,
      pending: you.pending,
      units: you.units,
      research: you.research.completed,
      cooldown: you.scoutCooldownUntil,
      resources: flooredResources(you.resources)
    });
  }

  return JSON.stringify({ phase, year });
}

function updateWarRoomDraft(field, value) {
  const max = state.game?.you?.units?.[field] ?? Infinity;
  state.warRoomDraft[field] = Math.max(0, Math.min(Number(value || 0), max));
}

function getTradeDraft(resource) {
  return Math.max(1, Number(state.tradeDrafts[resource] || 1));
}

function adjustTradeDraft(resource, delta) {
  state.tradeDrafts[resource] = Math.max(1, getTradeDraft(resource) + delta);
  state.forceTabRefresh = true;
  renderAll();
}

function getUnitDraft(id) {
  return Math.max(1, Number(state.unitDrafts[id] || 1));
}

function adjustUnitDraft(id, delta) {
  state.unitDrafts[id] = Math.max(1, getUnitDraft(id) + delta);
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

  const intel = state.game?.opponent?.intel;
  if (intel?.known) {
    events.unshift({ cls: 'error blink', text: `[INTEL] Expires Year ${intel.expiresAt}` });
    for (const [key, value] of Object.entries(intel.buildings || {}).filter(([, amount]) => amount > 0)) {
      events.unshift({ cls: 'error blink', text: `[INTEL] ${emojis[key] || ''} ${key.replace(/_/g, ' ')}: ${value}` });
    }
    for (const [key, value] of Object.entries(intel.resources || {}).filter(([, amount]) => amount > 0)) {
      events.unshift({ cls: 'error blink', text: `[INTEL] ${emojis[key] || ''} ${key}: ${Math.floor(value)}` });
    }
  }

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
  for (const [key, value] of Object.entries(building.upkeep || {})) entries.push(`${emojis[key] || ''}${key}: -${value}/year`);
  return entries.join(', ');
}

function techLabel(id) {
  return state.meta?.research?.[id]?.name || id.replace(/_/g, ' ');
}

function getMissingCost(cost, amount = 1) {
  const resources = state.game?.you.resources || {};
  return Object.entries(cost)
    .filter(([key, value]) => (resources[key] ?? 0) < value * amount)
    .map(([key, value]) => `${key} ${value * amount}`);
}

function getBuildCardState(id) {
  const you = state.game.you;
  const building = state.meta.buildings[id];
  const inQueue = you.buildingQueues.find((queue) => queue.id === id);
  const reasons = [];
  if (state.game.phase !== 'active') reasons.push('Match not active');
  if (inQueue) reasons.push('Already building');
  if (building.requires && !building.requires.every((tech) => you.research.completed.includes(tech))) reasons.push(`Needs ${building.requires.map(techLabel).join(', ')}`);
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
  if (unit.requiresTech && !you.research.completed.includes(unit.requiresTech)) reasons.push(`Needs ${techLabel(unit.requiresTech)}`);
  const missing = getMissingCost(unit.cost, amount);
  if (missing.length) reasons.push(`Missing ${missing.join(', ')}`);
  return { disabled: reasons.length > 0, reasons };
}

function getResearchCardState(id) {
  const you = state.game.you;
  const tech = state.meta.research[id];
  const reasons = [];
  const isCurrent = you.research.active?.id === id;
  if (state.game.phase !== 'active') reasons.push('Match not active');
  if (you.research.completed.includes(id)) reasons.push('Completed');
  if (you.research.active && !isCurrent) reasons.push('Research in progress');
  if (tech.minYear && state.game.year < tech.minYear) reasons.push(`Available Year ${tech.minYear}`);
  if (tech.prereq && !you.research.completed.includes(tech.prereq)) reasons.push(`Needs ${techLabel(tech.prereq)}`);
  const missing = getMissingCost(tech.cost);
  if (missing.length && !isCurrent) reasons.push(`Missing ${missing.join(', ')}`);
  return { disabled: reasons.length > 0, reasons, isCurrent };
}

function getQuickActionState(type, missileId = state.selectedMissile) {
  const you = state.game.you;
  const reasons = [];
  if (state.game.phase !== 'active') reasons.push('Match not active');
  if (type === 'scout') {
    if (you.units.scout_drone <= 0) reasons.push('Need scout drone');
    if (state.game.year < you.scoutCooldownUntil) reasons.push(`Cooldown until Year ${you.scoutCooldownUntil}`);
  }
  if (type === 'missile') {
    const missile = state.meta.units[missileId];
    if (!you.research.completed.includes('missile_silo')) reasons.push('Needs Missile Silo research');
    if (!missile?.missile) reasons.push('Choose a missile type');
    if ((you.units[missileId] || 0) <= 0) reasons.push(`Need ${missile?.name || 'missile stock'}`);
  }
  return { disabled: reasons.length > 0, reasons };
}

function actionBtn(label, cb, options = {}) {
  const id = `btn_${Math.random().toString(36).slice(2)}`;
  if (!options.disabled) {
    setTimeout(() => document.getElementById(id)?.addEventListener('click', cb));
  }
  return `<button id="${id}" ${options.disabled ? 'disabled' : ''} title="${options.title || ''}">${label}</button>`;
}

function renderReasons(reasons) {
  return reasons.length ? `<div class="small warning">${reasons.join(' • ')}</div>` : '';
}

function formatPendingAction(action) {
  if (action.type === 'missile') return `${state.meta.units[action.missileId]?.name || 'Missile'} strike -> ${action.target}`;
  if (action.type === 'scout') return 'Scout mission';
  if (action.type === 'assault') {
    const forces = getAssaultUnits().map(([id]) => id)
      .map((key) => action[key] ? `${emojis[key]}${action[key]}` : '')
      .filter(Boolean)
      .join(' ');
    return `Assault ${forces || '(no forces)'}`;
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
  const summary = state.game.phase === 'countdown'
    ? `Match begins in ${getCountdownSeconds()} seconds.`
    : state.game.phase === 'waiting'
      ? 'Share the room code and wait for your opponent to connect.'
      : state.game.phase === 'finished'
        ? 'The match has ended.'
        : 'Queue actions before the next year resolves.';

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
        <div class="small">${summary}</div>
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
  tabContent.innerHTML = `<h3>${state.tab === 'economy' ? 'Economy' : 'Supports'}</h3><div class="action-grid">` + ids.map((id) => {
    const building = state.meta.buildings[id];
    const cardState = getBuildCardState(id);
    const label = cardState.inQueue ? `Building... (${ticksToMonths(cardState.inQueue.ticksRemaining)} months)` : 'Build';
    return `<div class="card">
      <b>${emojis[id] || ''} ${building.name}</b>
      <div class="small">Owned: ${you.buildings[id]} | Build time: ${building.buildTime} months</div>
      <div class="small">Cost: ${costLine(building.cost)}</div>
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
    return `<div class="card">
      <b>${emojis[id] || ''} ${unit.name}</b>
      <div class="small">Owned: ${you.units[id]}</div>
      <div class="small">Cost: ${costLine(unit.cost)}</div>
      <div class="small">${unit.missile ? 'Missile payload' : `Attack ${unit.attack || 0}${unit.defense ? ` | Defence ${unit.defense}` : ''}`}</div>
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
      <div class="small">Cost: ${costLine(building.cost)}</div>
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
      <div class="small">Cost: ${costLine(unit.cost)}</div>
      <div class="small">Defence ${unit.defense || 0}</div>
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
      <h3>Defences</h3>
      <div class="action-grid">${defenceBuildings}${defenceUnits}</div>
    </div>
  `;
}

function renderTrade() {
  const you = state.game.you;
  const rows = state.meta.resources.map((resource) => {
    const amount = getTradeDraft(resource);
    const buyCost = amount + (state.meta.tradeFee || 1);
    const sellReturn = Math.max(0, amount - (state.meta.tradeFee || 1));
    const buyDisabled = state.game.phase !== 'active' || you.credits < buyCost;
    const sellDisabled = state.game.phase !== 'active' || (you.resources[resource] || 0) < amount;
    return `<div class="card">
      <b>${emojis[resource] || ''} ${resource}</b>
      <div class="small">Stock: ${Math.floor(you.resources[resource] || 0)} | Credits: ${you.credits}</div>
      <div class="small">Rate: 1 credit per unit + ${state.meta.tradeFee || 1} credit trade fee</div>
      <div class="row stepper">
        ${actionBtn('-', () => adjustTradeDraft(resource, -1))}
        <input id="trade_${resource}" value="${amount}" type="number" min="1" readonly />
        ${actionBtn('+', () => adjustTradeDraft(resource, 1))}
      </div>
      <div class="row">
        ${actionBtn(`Buy (${buyCost})`, () => sendAction('trade', { mode: 'buy', resource, amount }), { disabled: buyDisabled, title: buyDisabled ? 'Not enough credits or match inactive' : '' })}
        ${actionBtn(`Sell (+${sellReturn})`, () => sendAction('trade', { mode: 'sell', resource, amount }), { disabled: sellDisabled, title: sellDisabled ? 'Not enough stock or match inactive' : '' })}
      </div>
    </div>`;
  }).join('');

  tabContent.innerHTML = `
    <h3>Trade</h3>
    <div class="small">Population generates credits at year end. Each trade uses a 1-credit fee on top of the buy or sell amount.</div>
    <div class="small">Treasury: ${you.credits} credits</div>
    <div class="action-grid">${rows}</div>
  `;
}

function renderSidebar() {
  const you = state.game.you;
  const countdown = state.game.phase === 'countdown' ? `${getCountdownSeconds()}s to start` : `${getCountdownSeconds()}s`;
  const resourceRows = state.meta.resources.map((resource) => {
    const value = Math.floor(you.resources[resource]);
    const net = you.net?.[resource] ?? 0;
    const cls = getResourceStateClass(value, net);
    return `<tr class="${cls}"><td>${emojis[resource] || ''} ${resource}</td><td>${value}</td><td>${formatDelta(net)}</td></tr>`;
  }).join('');

  const buildingRows = Object.entries(state.meta.buildings).map(([id, building]) => `
    <tr><td>${emojis[id] || ''} ${building.name}</td><td>${building.category}</td><td>${you.buildings[id]}</td></tr>
  `).join('');

  const defenceRows = [
    ...['anti_missile_battery', 'land_mine'].map((id) => `<tr><td>${emojis[id] || ''} ${state.meta.buildings[id].name}</td><td>${you.buildings[id]}</td></tr>`),
    ...getDefenceUnits().map(([id, unit]) => `<tr><td>${emojis[id] || ''} ${unit.name}</td><td>${you.units[id]}</td></tr>`)
  ].join('');

  const unitRows = Object.entries(state.meta.units).map(([id, unit]) => `
    <tr><td>${emojis[id] || ''} ${unit.name}</td><td>${you.units[id]}</td></tr>
  `).join('');

  sidebarContentEl.innerHTML = `
    <h3>Command Summary</h3>
    <div class="small">📅 Year ${state.game.year}, Month ${state.game.month}</div>
    <div class="small">⏱️ ${countdown}</div>
    <div class="small">👥 Population ${you.population}/${you.populationMax}</div>
    <div class="small">💳 Credits ${you.credits}</div>
    <div class="small">🎯 ${getPhaseLabel()}</div>
    <div class="split-panels">
      <div class="panel inset">
        <h3>Resources</h3>
        <table class="data-table">
          <thead><tr><th>Resource</th><th>Total</th><th>Net</th></tr></thead>
          <tbody>${resourceRows}</tbody>
        </table>
      </div>
      <div class="panel inset">
        <h3>Supports</h3>
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
}

function renderResearch() {
  const you = state.game.you;
  tabContent.innerHTML = `<h3>Research</h3>
    <div class="small">Active: ${you.research.active ? `${state.meta.research[you.research.active.id].name} (${ticksToMonths(you.research.active.ticksRemaining)} months left)` : 'None'}</div>
    <div class="action-grid">` +
    Object.entries(state.meta.research).map(([id, tech]) => {
      const cardState = getResearchCardState(id);
      const progress = cardState.isCurrent ? Math.max(0, 100 - Math.floor((you.research.active.ticksRemaining / (tech.years * (state.meta?.ticksPerMonth || 5))) * 100)) : (you.research.completed.includes(id) ? 100 : 0);
      const label = cardState.isCurrent ? `Researching... ${progress}%` : 'Start';
      return `<div class="card">
        <b>${tech.name}</b>
        <div class="small">Cost: ${costLine(tech.cost)} | 🕒 ${tech.years} months</div>
        <div class="small">Progress: ${progress}%</div>
        <div class="progress"><span style="width:${progress}%"></span></div>
        ${renderReasons(cardState.reasons)}
        ${actionBtn(label, () => sendAction('research', { id }), { disabled: cardState.disabled, title: cardState.reasons.join(' | ') })}
      </div>`;
    }).join('') + '</div>';
}

function renderWarRoom() {
  const scoutState = getQuickActionState('scout');
  const missileState = getQuickActionState('missile', state.selectedMissile);
  const assaultRows = getAssaultUnits().map(([id, unit]) => {
    updateWarRoomDraft(id, state.warRoomDraft[id] || 0);
    return `<div class="row stepper">${emojis[id] || ''}${actionBtn('-', () => adjustWarRoomDraft(id, -1))}<input id="wr_${id}" type="number" value="${state.warRoomDraft[id]}" min="0" readonly />${actionBtn('+', () => adjustWarRoomDraft(id, 1))}<span class="small">${unit.name}</span></div>`;
  }).join('');
  tabContent.innerHTML = `<h3>War Room</h3>
    <p>Queue actions now. All attacks resolve when the current year ends.</p>
    ${renderPendingActions()}
    <div class="card">
      ${renderReasons(scoutState.reasons)}
      <div class="row">${actionBtn('Launch Scout', () => sendAction('scout', {}), { disabled: scoutState.disabled, title: scoutState.reasons.join(' | ') })}</div>
      ${renderReasons(missileState.reasons)}
      <div class="row">
        <select id="wrMissile">
          ${getMilitaryUnits().filter(([, unit]) => unit.missile).map(([id, unit]) => `<option value="${id}" ${state.selectedMissile === id ? 'selected' : ''}>${unit.name}</option>`).join('')}
        </select>
        <select id="wrTarget">
          <option value="economy">Economy</option>
          <option value="military">Military</option>
          <option value="support">Supports</option>
        </select>
        ${actionBtn('Launch Missile', () => {
          state.selectedMissile = document.getElementById('wrMissile').value;
          sendAction('missile', { missileId: state.selectedMissile, target: document.getElementById('wrTarget').value });
        }, { disabled: missileState.disabled, title: missileState.reasons.join(' | ') })}
      </div>
      <div class="war-room-grid" title="Commit assault units">
        ${assaultRows}
        ${actionBtn('Commit Assault', () => sendAction('assault', Object.fromEntries(getAssaultUnits().map(([id]) => [id, state.warRoomDraft[id] || 0]))), { disabled: state.game.phase !== 'active', title: state.game.phase !== 'active' ? 'Match not active' : '' })}
      </div>
    </div>`;
  document.getElementById('wrMissile')?.addEventListener('change', (event) => {
    state.selectedMissile = event.target.value;
    state.forceTabRefresh = true;
    renderAll();
  });
}

function renderTab() {
  if (!state.game?.you) return;
  if (state.tab === 'dashboard') return renderDashboard();
  if (state.tab === 'economy' || state.tab === 'supports') return renderEconomyOrSupports();
  if (state.tab === 'trade') return renderTrade();
  if (state.tab === 'military') return renderMilitary();
  if (state.tab === 'defences') return renderDefences();
  if (state.tab === 'research') return renderResearch();
  if (state.tab === 'war_room') return renderWarRoom();
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
  tabsEl.innerHTML = tabs.map((tab) => `<button class="tab ${state.tab === tab ? 'active' : ''}" data-tab="${tab}">${tabLabels[tab] || tab.replace('_', ' ')}</button>`).join('');
  tabsEl.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
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
    renderTab();
    state.lastTabSignature = nextSignature;
    state.forceTabRefresh = false;
  }
}

function applyGameState(game) {
  state.game = game;
  state.lastStateAt = Date.now();
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
    await ensureMeta();
    const name = nameEl.value.trim() || 'Commander';
    const data = await api('/api/room/create', { name });
    state.roomId = data.roomId;
    state.playerId = data.playerId;
    state.reconnectToken = data.reconnectToken;
    joinFlowEl.classList.add('hidden');
    roomInfoEl.textContent = '';
    saveSession();
    connectStream();
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

setInterval(() => state.game && renderSidebar(), 1000);

ensureMeta().then(() => restoreSession());
