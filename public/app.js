const state = { roomId: null, playerId: null, meta: null, game: null, tab: 'dashboard' };
const DEFAULT_API_ORIGIN = 'https://ww-iii.onrender.com';
const API_ORIGIN = window.WWIII_API_ORIGIN || (window.location.hostname.endsWith('.vercel.app') ? DEFAULT_API_ORIGIN : '');
const emojis = {
  nutrition: '🍲', lumber: '🪵', steel: '🔩', alloy: '🪙', oil: '🛢️', magnet: '🧲', electricity: '⚡', glass: '🪟', plastic: '♻️', concrete: '🧱', silicon: '💾',
  shipyard: '⚓', airfield: '🛫', war_ship: '🚢', fighter_zed: '✈️', soldier: '🪖', tank: '🛞', scout_drone: '🛰️'
};
const tabs = ['dashboard', 'economy', 'buildings', 'military', 'research', 'war_room'];

const topBar = document.getElementById('topBar');
const eventsEl = document.getElementById('events');
const chatEl = document.getElementById('chat');
const intelEl = document.getElementById('intel');
const tabContent = document.getElementById('tabContent');
const tabsEl = document.getElementById('tabs');
const roomInfoEl = document.getElementById('roomInfo');
const joinFlowEl = document.getElementById('joinFlow');
const roomInputEl = document.getElementById('roomInput');

async function api(path, body) {
  const res = await fetch(`${API_ORIGIN}${path}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
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

async function ensureMeta() {
  if (!state.meta) state.meta = await api('/api/meta');
}

function renderTopBar() {
  if (!state.game || !state.meta) return;
  const you = state.game.you;
  const items = [`Year ${state.game.year}, Month ${state.game.month}`, `Population ${you.population}/${you.populationMax}`];
  for (const r of state.meta.resources) {
    const value = Math.floor(you.resources[r]);
    const net = you.net?.[r] ?? 0;
    let cls = '';
    if (net < 0) cls = 'yellow';
    else if (value <= 0) cls = 'red';
    items.push(`<span class="${cls}">${emojis[r]} ${r}: ${value} (${net >=0?'+':''}${Math.floor(net)})</span>`);
  }
  const secLeft = Math.max(0, Math.floor((state.game.tickEndsAt - Date.now()) / 1000));
  topBar.innerHTML = `${items.join(' | ')} | Tick: ${secLeft}s`;
}

function renderEvents() {
  eventsEl.innerHTML = (state.game?.you.eventLog || []).map((e) => `<li class="${e.type || ''}">[Y${e.year}] ${e.message}</li>`).join('');
}

function renderChat() {
  chatEl.innerHTML = (state.game?.you.chat || []).map((m) => `<div>[Y${m.year}] <b>${m.from}</b>: ${m.text}</div>`).join('');
}

function renderIntel() {
  const intel = state.game?.opponent?.intel;
  if (!intel?.known) {
    intelEl.textContent = 'No active scouting intel.';
    return;
  }
  intelEl.textContent = `Intel expires Y${intel.expiresAt}\n\nBuildings:\n${JSON.stringify(intel.buildings, null, 2)}\n\nApprox Resources:\n${JSON.stringify(intel.resources, null, 2)}`;
}

function costLine(cost) {
  return Object.entries(cost).map(([k, v]) => `${emojis[k] || ''}${k}:${v}`).join(', ');
}

function actionBtn(label, cb, disabled = false) {
  const id = `btn_${Math.random().toString(36).slice(2)}`;
  if (!disabled) setTimeout(() => document.getElementById(id)?.addEventListener('click', cb));
  return `<button id="${id}" ${disabled ? 'disabled' : ''}>${label}</button>`;
}

function renderTab() {
  const you = state.game?.you;
  if (!you) return;
  if (state.tab === 'dashboard') {
    tabContent.innerHTML = `<h3>Dashboard</h3>
      <p>Room: <b>${state.game.roomId}</b> | You: ${you.name} | Opponent: ${state.game.opponent?.name || 'Waiting...'}</p>`;
    return;
  }

  if (state.tab === 'economy' || state.tab === 'buildings') {
    const ids = Object.keys(state.meta.buildings).filter((k) => state.tab === 'economy' ? state.meta.buildings[k].category === 'economy' : true);
    tabContent.innerHTML = `<h3>${state.tab === 'economy' ? 'Economy' : 'Buildings'}</h3><div class='action-grid'>` + ids.map((id) => {
      const b = state.meta.buildings[id];
      const inQueue = you.buildingQueues.find((q) => q.id === id);
      const label = inQueue ? `Building... (${Math.ceil(inQueue.ticksRemaining / 5)}m)` : 'Build';
      return `<div class='card'><b>${b.name}</b><div class='small'>Owned: ${you.buildings[id]} | Build time: ${b.buildTime * 12}m</div><div class='small'>Cost: ${costLine(b.cost)}</div>${actionBtn(label, () => sendAction('build', { id }), !!inQueue)}</div>`;
    }).join('') + '</div>';
    return;
  }

  if (state.tab === 'military') {
    tabContent.innerHTML = `<h3>Military</h3><div class='action-grid'>` + Object.entries(state.meta.units).map(([id, u]) =>
      `<div class='card'><b>${emojis[id] || ''} ${u.name}</b><div class='small'>Owned: ${you.units[id]}</div><div class='small'>Cost: ${costLine(u.cost)}</div><div class='row'><input id='amt_${id}' value='1' type='number' min='1'/>${actionBtn('Train', () => sendAction('train', { id, amount: Number(document.getElementById(`amt_${id}`).value || 1) }))}</div></div>`
    ).join('') + `</div>
      <h4>War Room Quick Actions</h4>
      <div class='row'>${actionBtn('Queue Scout', () => sendAction('scout', {}))}
      <select id='missileTarget'><option value='economy'>Economy</option><option value='military'>Military</option><option value='support'>Population Centers</option></select>
      ${actionBtn('Queue Missile', () => sendAction('missile', { target: document.getElementById('missileTarget').value }))}</div>
      <div class='row' title='Commit: Soldier, Tank, War Ship, Fighter Zed'>🪖<input id='ass_soldier' style='width:50px' type='number' value='5' min='0'/> 🛞<input id='ass_tank' style='width:50px' type='number' value='0' min='0'/> 🚢<input id='ass_war_ship' style='width:50px' type='number' value='0' min='0'/> ✈️<input id='ass_fighter_zed' style='width:50px' type='number' value='0' min='0'/>${actionBtn('Queue Assault', () => sendAction('assault', { soldier: Number(document.getElementById('ass_soldier').value), tank: Number(document.getElementById('ass_tank').value), war_ship: Number(document.getElementById('ass_war_ship').value), fighter_zed: Number(document.getElementById('ass_fighter_zed').value) }))}</div>`;
    return;
  }

  if (state.tab === 'research') {
    const active = you.research.active;
    tabContent.innerHTML = `<h3>Research</h3><div class='small'>Active: ${active ? `${state.meta.research[active.id].name} (${Math.ceil(active.ticksRemaining / 5)}m)` : 'None'}</div><div class='action-grid'>` +
      Object.entries(state.meta.research).map(([id, r]) => {
        const isCurrent = active?.id === id;
        const label = isCurrent ? `Researching... (${Math.ceil(active.ticksRemaining / 5)}m)` : 'Start';
        return `<div class='card'><b>${r.name}</b><div class='small'>Cost: ${costLine(r.cost)} | ${r.years * 12}m</div><div class='small'>Completed: ${you.research.completed.includes(id) ? 'Yes' : 'No'}</div>${actionBtn(label, () => sendAction('research', { id }), !!isCurrent || you.research.completed.includes(id))}</div>`;
      }).join('') + '</div>';
    return;
  }

  if (state.tab === 'war_room') {
    tabContent.innerHTML = `<h3>War Room</h3>
    <p>Queue actions now. All resolve at end of year.</p>
    <div class='row'>${actionBtn('Launch Scout', () => sendAction('scout', {}))}</div>
    <div class='row'><select id='wrTarget'><option value='economy'>Economy</option><option value='military'>Military</option><option value='support'>Population Centers</option></select>${actionBtn('Launch Missile', () => sendAction('missile', { target: document.getElementById('wrTarget').value }))}</div>
    <div class='row' title='Commit: Soldier, Tank, War Ship, Fighter Zed'>🪖<input id='wr_soldier' style='width:50px' type='number' value='10' min='0'/> 🛞<input id='wr_tank' style='width:50px' type='number' value='1' min='0'/> 🚢<input id='wr_war_ship' style='width:50px' type='number' value='0' min='0'/> ✈️<input id='wr_fighter_zed' style='width:50px' type='number' value='0' min='0'/>${actionBtn('Commit Assault', () => sendAction('assault', { soldier: Number(document.getElementById('wr_soldier').value), tank: Number(document.getElementById('wr_tank').value), war_ship: Number(document.getElementById('wr_war_ship').value), fighter_zed: Number(document.getElementById('wr_fighter_zed').value) }))}</div>`;
  }
}

async function sendAction(type, payload) {
  try {
    await api('/api/action', { roomId: state.roomId, playerId: state.playerId, type, payload });
  } catch (e) {
    // Errors are now logged to the Event Log via server-side appendEvent
  }
}

function drawTabs() {
  tabsEl.innerHTML = tabs.map((t) => `<button class='tab ${state.tab === t ? 'active' : ''}' data-tab='${t}'>${t.replace('_', ' ')}</button>`).join('');
  tabsEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { state.tab = b.dataset.tab; drawTabs(); renderTab(); }));
}

function renderAll() {
  if (!state.game) return;
  document.getElementById('gameLayout').classList.remove('hidden');
  renderTopBar();
  renderEvents();
  renderChat();
  renderIntel();
  drawTabs();
  renderTab();
  if (state.game.winner) {
    const won = state.game.winner === state.playerId;
    alert(won ? 'Victory!' : 'Defeat!');
  }
}

function applyGameState(game) {
  state.game = game;
  state.lastStateAt = Date.now();
  if (!state.game?.opponent?.name) {
    roomInfoEl.textContent = `Room ${state.roomId}. Share this 4-digit code with your opponent.`;
  } else {
    document.getElementById('setup').classList.add('hidden');
    roomInfoEl.textContent = '';
  }
  renderAll();
}

function startPollingFallback() {
  clearInterval(state.pollTimer);
  state.pollTimer = setInterval(async () => {
    if (!state.roomId || !state.playerId) return;
    if (Date.now() - state.lastStateAt < 4_000) return;
    try {
      const game = await api(`/api/state?roomId=${state.roomId}&playerId=${state.playerId}`);
      applyGameState(game);
    } catch (_) {}
  }, 2_000);
}

async function connectStream() {
  const es = new EventSource(`${API_ORIGIN}/api/stream?roomId=${state.roomId}&playerId=${state.playerId}`);
  es.addEventListener('state', (evt) => {
    applyGameState(JSON.parse(evt.data));
  });
  startPollingFallback();
}

document.getElementById('createBtn').addEventListener('click', async () => {
  try {
    state.meta = await api('/api/meta');
    const name = document.getElementById('name').value;
    const data = await api('/api/room/create', { name });
    state.roomId = data.roomId;
    state.playerId = data.playerId;
    joinFlowEl.classList.add('hidden');
    roomInfoEl.textContent = `Game created! Your 4-digit code is ${state.roomId}.`;
    connectStream();
  } catch (e) {
    alert(e.message);
  }
});

document.getElementById('joinBtn').addEventListener('click', () => {
  joinFlowEl.classList.toggle('hidden');
  if (!joinFlowEl.classList.contains('hidden')) roomInputEl.focus();
});

document.getElementById('joinConfirmBtn').addEventListener('click', async () => {
  try {
    state.meta = await api('/api/meta');
    const name = document.getElementById('name').value;
    const roomId = roomInputEl.value.trim();
    if (!/^\d{4}$/.test(roomId)) {
      alert('Please enter a valid 4-digit room code.');
      return;
    }
    const data = await api('/api/room/join', { roomId, name });
    state.roomId = data.roomId;
    state.playerId = data.playerId;
    roomInfoEl.textContent = `Joined room ${state.roomId}.`;
    connectStream();
  } catch (e) {
    alert(e.message);
  }
});

roomInputEl.addEventListener('keydown', (evt) => {
  if (evt.key === 'Enter') document.getElementById('joinConfirmBtn').click();
});

document.getElementById('sendChat').addEventListener('click', async () => {
  const text = document.getElementById('chatInput').value;
  document.getElementById('chatInput').value = '';
  await sendAction('chat', { text });
});

setInterval(() => state.game && renderTopBar(), 1000);
