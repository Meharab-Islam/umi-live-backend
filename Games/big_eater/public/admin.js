/* ══════════════════════════════════════════════════════════
   Big Eater — Master Game Admin Controller Logic (admin.js)
   ══════════════════════════════════════════════════════════ */
'use strict';

const urlParams = new URLSearchParams(window.location.search);
const secretFromUrl = urlParams.get('secret') || urlParams.get('key') || '';
const tokenFromUrl = urlParams.get('token') || localStorage.getItem('umi_admin_token') || '';
const serverPort = urlParams.get('port') || '5061';

const defaultSecret = secretFromUrl || localStorage.getItem('be_admin_key') || 'bigeater888';
if (defaultSecret) {
  localStorage.setItem('be_admin_key', defaultSecret);
}

// Connect to Big Eater dedicated socket server
const isCustomServer = Boolean(urlParams.get('server'));
const socketHost = urlParams.get('server') || window.location.origin;
const socketPath = isCustomServer ? '/socket.io/' : '/games/socket/big_eater/';
const socket = io(socketHost, {
  path: socketPath,
  transports: ['websocket', 'polling'],
});

const S = {
  authKey: defaultSecret,
  authToken: tokenFromUrl,
  isAuthenticated: false,
  state: null,
  activeTab: 'tab-rig',
  players: [],
  rounds: [],
  schedules: [],
  armedSpecialEvent: null,
};

// ── DOM References ──
const q = id => document.getElementById(id);
const qs = sel => document.querySelector(sel);
const qsa = sel => document.querySelectorAll(sel);

// ── Notification Toast ──
let toastTimer = null;
function showToast(msg, duration = 3000) {
  const toast = q('admin-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ── Authentication ──
function submitAuth() {
  const key = q('auth-key')?.value?.trim() || S.authKey;
  if (!key) return;
  socket.emit('admin:auth', { secret: key, token: S.authToken });
}

function performAutoAuth() {
  const key = S.authKey || 'bigeater888';
  socket.emit('admin:auth', { secret: key, token: S.authToken });
}

socket.on('connect', () => {
  performAutoAuth();
});

socket.on('admin:authSuccess', ({ message }) => {
  S.isAuthenticated = true;
  S.authKey = q('auth-key')?.value?.trim() || S.authKey;
  localStorage.setItem('be_admin_key', S.authKey);
  const overlay = q('auth-overlay');
  if (overlay) overlay.style.display = 'none';
  showToast('⚡ Connected to Game Master Core (SSO Verified)');
  fetchInitialData();
});

socket.on('admin:authFail', ({ message }) => {
  const overlay = q('auth-overlay');
  if (overlay) overlay.style.display = 'flex';
  const err = q('auth-error');
  if (err) {
    err.textContent = message || 'Invalid Admin Key';
    err.style.display = 'block';
  }
});

// Auto-login on DOM load
window.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  performAutoAuth();
});

function fetchInitialData() {
  socket.emit('admin:fetchPlayers', { limit: 50 });
  socket.emit('admin:fetchRounds', { limit: 30 });
  socket.emit('admin:fetchStats');
  socket.emit('admin:fetchSchedules');
}

const TAB_META = {
  'tab-rig': {
    title: 'Outcome & Winner Rigging',
    desc: 'Directly decide which food wins the round, or set intelligent automated casino win/loss algorithms.'
  },
  'tab-scheduler': {
    title: 'Daily Time Scheduler & Drops',
    desc: 'Automate high-engagement drop events at specific daily hours (e.g. 11:00 AM All Vegetables).'
  },
  'tab-matrix': {
    title: 'Live Bet Exposure Matrix',
    desc: 'Real-time calculation of house exposure and net profit/loss for all 8 possible winning outcomes.'
  },
  'tab-players': {
    title: 'Player Accounts & Balances',
    desc: 'Monitor connected players, view wager histories, and adjust player balances directly.'
  },
  'tab-odds': {
    title: 'Odds, Multipliers & Economy',
    desc: 'Fine-tune food multipliers, random weight distributions, dynamic chips, and webhooks.'
  },
  'tab-history': {
    title: 'Financial Audit & Round History',
    desc: 'Historical audit of rounds, wagering volume, payouts, and house profitability.'
  },
  'tab-docs': {
    title: 'App Integration Guide & API',
    desc: 'Complete developer guide, Flutter webview integration, and HMAC-verified webhook code.'
  }
};

// ── Tab Navigation ──
function setupTabs() {
  qsa('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      qsa('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      qsa('.tab-pane').forEach(p => p.classList.remove('active'));
      const pane = q(tabId);
      if (pane) pane.classList.add('active');
      S.activeTab = tabId;

      if (TAB_META[tabId]) {
        const titleEl = q('page-title');
        const descEl = q('page-desc');
        if (titleEl) titleEl.textContent = TAB_META[tabId].title;
        if (descEl) descEl.textContent = TAB_META[tabId].desc;
      }

      if (tabId === 'tab-players') socket.emit('admin:fetchPlayers', { limit: 50 });
      if (tabId === 'tab-history') socket.emit('admin:fetchRounds', { limit: 30 });
      if (tabId === 'tab-scheduler') socket.emit('admin:fetchSchedules');
      if (tabId === 'tab-matrix' && S.state) renderMatrixTab(S.state);
      if (tabId === 'tab-rig' && S.state) renderRigTab(S.state);

      // Auto close mobile drawer
      toggleSidebar(false);
    });
  });

  // Start synchronized live clocks
  setInterval(updateLiveClocks, 1000);
}

let serverTimeOffsetMs = 0;
let activeServerTimezone = 'Asia/Dhaka';

function updateLiveClocks() {
  const serverNow = new Date(Date.now() + serverTimeOffsetMs);
  try {
    const timeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: activeServerTimezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(serverNow);

    const clock1 = q('sidebar-live-clock');
    if (clock1) clock1.textContent = timeStr;

    const clock2 = q('server-live-clock');
    if (clock2) clock2.textContent = timeStr;

    const hint = q('sched-server-time-hint');
    if (hint) hint.textContent = `Server Time: ${timeStr} (${activeServerTimezone})`;

    const tzLabel = q('clock-tz');
    if (tzLabel) tzLabel.textContent = `${activeServerTimezone} (Server Clock)`;
  } catch (e) {
    const fallback = serverNow.toTimeString().split(' ')[0];
    if (q('sidebar-live-clock')) q('sidebar-live-clock').textContent = fallback;
    if (q('server-live-clock')) q('server-live-clock').textContent = fallback;
  }
}

// ── Live Game State Receiver ──
socket.on('admin:liveState', (data) => {
  S.state = data;
  if (data.serverTimestamp) serverTimeOffsetMs = data.serverTimestamp - Date.now();
  if (data.timezone) activeServerTimezone = data.timezone;
  populateFoodOptions();
  renderHeaderStatus(data);
  renderRigTab(data);
  renderMatrixTab(data);
  renderOddsTab(data);
  renderSchedulerTab(data);
});

socket.on('admin:tick', (data) => {
  S.state = data;
  if (data.serverTimestamp) serverTimeOffsetMs = data.serverTimestamp - Date.now();
  if (data.timezone) activeServerTimezone = data.timezone;
  renderHeaderStatus(data);
  const prog = q('countdown-progress-text');
  if (prog) {
    prog.textContent = data.isPaused
      ? `⏸️ GAME PAUSED (Round #${data.roundNumber})`
      : `${data.phase.toUpperCase()} PHASE — ${data.remaining}s remaining`;
  }
  if (S.activeTab === 'tab-matrix') renderMatrixTab(data);
  if (S.activeTab === 'tab-rig' || S.activeTab === 'dashboard') renderRigTab(data);
  if (S.activeTab === 'tab-scheduler') renderSchedulerTab(data);
});

// ── Mobile Sidebar Drawer Toggle ──
function toggleSidebar(forceState) {
  const sidebar = q('admin-sidebar');
  const overlay = q('sidebar-overlay');
  if (!sidebar) return;
  const isShow = typeof forceState === 'boolean' ? forceState : !sidebar.classList.contains('show');
  if (isShow) {
    sidebar.classList.add('show');
    if (overlay) overlay.classList.add('show');
  } else {
    sidebar.classList.remove('show');
    if (overlay) overlay.classList.remove('show');
  }
}

// ── Render Header & Sidebar Status Metrics ──
function renderHeaderStatus(data) {
  const roundEl = q('pill-round');
  if (roundEl) roundEl.textContent = `Round #${data.roundNumber}`;
  const phaseEl = q('pill-phase');
  if (phaseEl) phaseEl.textContent = data.isPaused ? 'PAUSED' : data.phase.toUpperCase();
  const timerEl = q('pill-timer');
  if (timerEl) timerEl.textContent = `${data.remaining}s`;
  const playersEl = q('pill-players');
  if (playersEl) playersEl.textContent = data.onlinePlayers;
  const modeEl = q('pill-mode');
  if (modeEl) modeEl.textContent = data.mode.toUpperCase();

  const topbarMode = q('topbar-mode-text');
  if (topbarMode) topbarMode.textContent = data.mode.toUpperCase();

  const topbarRound = q('topbar-round-text');
  if (topbarRound) topbarRound.textContent = `#${data.roundNumber}`;

  const topbarBettors = q('topbar-bettors-text');
  if (topbarBettors) {
    const pCount = Array.isArray(data.participants) ? data.participants.length : (data.totalPlayersBetting || 0);
    topbarBettors.textContent = `${pCount} ${pCount === 1 ? 'Bettor' : 'Bettors'}`;
  }

  const topbarPool = q('topbar-pool-text');
  if (topbarPool) {
    topbarPool.textContent = `${(data.totalVolume || 0).toLocaleString()} Coins`;
  }

  // Progress Bar Animation
  const fill = q('sidebar-progress-fill');
  if (fill) {
    const total = data.phase === 'revealing' ? (data.cooldownDuration || 8) : (data.roundDuration || 15);
    const pct = Math.max(0, Math.min(100, (data.remaining / total) * 100));
    fill.style.width = `${pct}%`;
    if (data.isPaused) {
      fill.style.backgroundColor = 'var(--warning)';
    } else if (data.phase === 'revealing') {
      fill.style.backgroundColor = 'var(--danger)';
    } else if (data.remaining <= 5) {
      fill.style.backgroundColor = 'var(--warning)';
    } else {
      fill.style.backgroundColor = 'var(--success)';
    }
  }

  const phaseWrap = q('pill-phase-wrap');
  if (phaseWrap) {
    phaseWrap.className = 'sidebar-live-card';
    if (data.isPaused) phaseWrap.classList.add('paused');
    else if (data.phase === 'revealing') phaseWrap.classList.add('revealing');
  }

  // Pause button icon/text
  const pauseBtn = q('btn-pause');
  const pauseText = q('btn-pause-text');
  const pauseIcon = q('btn-pause-icon');
  if (pauseBtn) {
    if (data.isPaused) {
      pauseBtn.className = 'btn btn-primary btn-sm btn-block';
      if (pauseIcon) pauseIcon.textContent = '▶️';
      if (pauseText) pauseText.textContent = 'Resume';
    } else {
      pauseBtn.className = 'btn btn-warning btn-sm btn-block';
      if (pauseIcon) pauseIcon.textContent = '⏸️';
      if (pauseText) pauseText.textContent = 'Pause';
    }
  }

  // Auto clear check
  const autoClearCheck = q('check-auto-clear');
  if (autoClearCheck) autoClearCheck.checked = !!data.autoClearRig;
}

// ── Render Tab 1: Rig & Winner Control ──
function renderRigTab(data) {
  // Update Mode Cards active state
  qsa('.mode-card').forEach(card => {
    const m = card.getAttribute('data-mode');
    if (m === data.mode) card.classList.add('active');
    else card.classList.remove('active');
  });

  // Rig Status Text
  const targetText = q('rig-target-text');
  if (data.armedSpecialEvent) {
    targetText.innerHTML = `⚡ <strong>ARMED SPECIAL COMBO: ${data.armedSpecialEvent.name || data.armedSpecialEvent.type} (All targets win!)</strong>`;
  } else if (data.mode === 'manual' && data.forcedWinnerId !== null) {
    const f = data.foods[data.forcedWinnerId];
    targetText.innerHTML = `🎯 FORCED WINNER: <strong>${f.emoji} ${f.name} (${f.multiplier}X)</strong>`;
  } else if (data.mode === 'house_profit') {
    targetText.innerHTML = `💰 <strong>MAX HOUSE PROFIT ALGORITHM (Lowest Payout Wins)</strong>`;
  } else if (data.mode === 'player_favor') {
    targetText.innerHTML = `🎁 <strong>PLAYER BONANZA MODE (Highest Payout Wins)</strong>`;
  } else {
    targetText.innerHTML = `🎲 <strong>AUTO (Natural Probability Weights)</strong>`;
  }

  // Armed Special Event Banner (Tab 1)
  const armedRigEl = q('armed-event-status');
  const armedRigText = q('armed-event-text');
  if (armedRigEl && armedRigText) {
    if (data.armedSpecialEvent) {
      armedRigEl.style.display = 'flex';
      armedRigText.innerHTML = `⚡ <strong>ARMED FOR NEXT ROUND:</strong> ${data.armedSpecialEvent.name || data.armedSpecialEvent.type}`;
    } else {
      armedRigEl.style.display = 'none';
    }
  }

  // Current Round Live Metric Summary Cards
  if (q('dash-round-title')) q('dash-round-title').textContent = `Round #${data.roundNumber}`;
  if (q('dash-phase-text')) {
    q('dash-phase-text').textContent = data.isPaused
      ? `PAUSED (Round #${data.roundNumber})`
      : `${data.phase.toUpperCase()} (${data.remaining}s)`;
  }
  if (q('dash-participants-count')) {
    const pCount = Array.isArray(data.participants) ? data.participants.length : (data.totalPlayersBetting || 0);
    q('dash-participants-count').textContent = `${pCount} ${pCount === 1 ? 'Player' : 'Players'}`;
  }
  if (q('dash-total-pool')) {
    q('dash-total-pool').textContent = `${(data.totalVolume || 0).toLocaleString()} COINS`;
  }
  if (q('dash-top-option')) {
    const sortedFoods = [...(data.outcomes || [])].sort((a, b) => b.wagered - a.wagered);
    if (sortedFoods.length > 0 && sortedFoods[0].wagered > 0) {
      const topF = sortedFoods[0];
      q('dash-top-option').innerHTML = `<strong>${topF.emoji} ${topF.name}</strong> <span style="font-size:11px; color:#94a3b8;">(${topF.bettorCount} bettors / ${topF.wagered.toLocaleString()} coins)</span>`;
    } else {
      q('dash-top-option').textContent = 'None yet';
    }
  }
  if (q('dash-top-bettor')) {
    if (Array.isArray(data.participants) && data.participants.length > 0) {
      const topP = data.participants[0];
      q('dash-top-bettor').innerHTML = `<strong>${topP.avatar} ${topP.name}</strong> <span style="font-size:11px; color:#94a3b8;">(${topP.totalBet.toLocaleString()} coins)</span>`;
    } else {
      q('dash-top-bettor').textContent = 'None yet';
    }
  }

  // Current Round Participants & Option Bids Table
  const pBody = q('dash-participants-table-body');
  if (pBody) {
    if (!Array.isArray(data.participants) || data.participants.length === 0) {
      pBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted" style="padding: 24px;">
            ⏳ Waiting for players to place bids in Round #${data.roundNumber}...
          </td>
        </tr>
      `;
    } else {
      const totalPool = data.totalVolume || 0;
      pBody.innerHTML = data.participants.map(p => {
        const sharePct = totalPool > 0 ? ((p.totalBet / totalPool) * 100).toFixed(1) : '0.0';
        const chipsHtml = (p.items || []).map(item => `
          <span class="dash-food-chip" title="${item.foodName} (${item.multiplier}X)">
            <span class="chip-emoji">${item.foodEmoji}</span>
            <span class="chip-name">${item.foodName}</span>
            <span class="chip-mult">${item.multiplier}X</span>:
            <span class="chip-amt">${item.amount.toLocaleString()} coins</span>
          </span>
        `).join('');

        return `
          <tr>
            <td>
              <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:24px; line-height:1;">${p.avatar}</span>
                <div>
                  <div style="font-weight:700; color:var(--text-main); font-size:13.5px;">${p.name}</div>
                  <div style="font-size:11px; color:#94a3b8; font-family:var(--font-mono);">${p.sessionId}</div>
                </div>
              </div>
            </td>
            <td>
              <strong class="font-mono text-gold" style="font-size:14px; font-weight:800;">
                ${p.totalBet.toLocaleString()} coins
              </strong>
            </td>
            <td>
              <div class="dash-food-chips-wrap">
                ${chipsHtml || '<span class="text-muted" style="font-size:11px;">No active bets</span>'}
              </div>
            </td>
            <td>
              <div style="min-width:90px;">
                <div style="display:flex; justify-content:space-between; font-size:11.5px; font-weight:700;">
                  <span>${sharePct}%</span>
                </div>
                <div style="height:5px; background:#e2e8f0; border-radius:3px; margin-top:3px; overflow:hidden;">
                  <div style="height:100%; width:${sharePct}%; background:var(--primary); border-radius:3px;"></div>
                </div>
              </div>
            </td>
            <td class="font-mono" style="font-size:13px; color:var(--text-secondary);">
              ${(p.balance || 0).toLocaleString()} coins
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // Current Round Phase Pill styling
  const phasePill = q('dash-phase-pill');
  if (phasePill) {
    if (data.isPaused) {
      phasePill.style.background = '#fef3c7';
      phasePill.style.color = '#b45309';
      phasePill.style.borderColor = '#fde68a';
    } else if (data.phase === 'revealing') {
      phasePill.style.background = '#fee2e2';
      phasePill.style.color = '#dc2626';
      phasePill.style.borderColor = '#fca5a5';
    } else {
      phasePill.style.background = '#ecfdf5';
      phasePill.style.color = '#059669';
      phasePill.style.borderColor = '#a7f3d0';
    }
  }

  // Quick 8-Option Live Exposure Strip
  const stripGrid = q('dash-options-strip-grid');
  const stripTotalBets = q('dash-options-total-bets');
  if (stripGrid && Array.isArray(data.outcomes)) {
    let totalBetsPlacedCount = 0;
    const totalVolume = data.totalVolume || 0;
    stripGrid.innerHTML = data.outcomes.map(f => {
      totalBetsPlacedCount += (f.bettorCount || 0);
      const isTarget = (data.mode === 'manual' || data.forcedWinnerId !== null) && data.forcedWinnerId === f.id;
      const share = totalVolume > 0 ? ((f.wagered / totalVolume) * 100).toFixed(1) : '0.0';
      return `
        <div class="option-strip-card ${isTarget ? 'strip-target' : ''}" onclick="setRiggedWinner(${f.id})" title="Click to force ${f.name} to win">
          <div class="option-strip-left">
            <span class="option-strip-emoji">${f.emoji}</span>
            <div class="option-strip-info">
              <span class="option-strip-title">
                ${f.name} <span class="option-strip-mult">${f.multiplier}X</span>
              </span>
              <span class="option-strip-bettors">👥 ${f.bettorCount} ${f.bettorCount === 1 ? 'bettor' : 'bettors'}</span>
            </div>
          </div>
          <div class="option-strip-right">
            <span class="option-strip-amount">${(f.wagered || 0).toLocaleString()}</span>
            <span class="option-strip-pct">${share}% pool</span>
          </div>
        </div>
      `;
    }).join('');

    if (stripTotalBets) {
      stripTotalBets.textContent = `${totalBetsPlacedCount} Total Bets Placed (${totalVolume.toLocaleString()} Coins)`;
    }
  }

  // 8-Food Cards Grid
  const grid = q('foods-rig-grid');
  if (!grid || !data.outcomes) return;

  grid.innerHTML = data.outcomes.map(f => {
    const isTarget = (data.mode === 'manual' || data.forcedWinnerId !== null) && data.forcedWinnerId === f.id;
    const profitClass = f.houseProfit >= 0 ? 'profit-green' : 'loss-red';
    const profitSign = f.houseProfit >= 0 ? '+' : '';

    const bettorsHtml = f.bettors && f.bettors.length > 0
      ? `<div class="bettor-tags-row">
          ${f.bettors.map(b => `
            <span class="bettor-pill" title="Player: ${b.name} (${b.sessionId})">
              <span class="bettor-av">${b.avatar}</span>
              <span class="bettor-nm">${b.name}</span>:
              <strong class="font-mono">${b.amount.toLocaleString()}</strong>
            </span>
          `).join('')}
        </div>`
      : `<span style="color:#94a3b8; font-size:11px; font-style:italic;">No bids on this option yet</span>`;

    return `
      <div class="food-rig-card ${isTarget ? 'rigged-target' : ''}">
        <div class="food-rig-top">
          <span class="food-rig-emoji">${f.emoji}</span>
          <div class="food-rig-title">
            <div class="food-rig-name">${f.name}</div>
            <span class="food-rig-mult">${f.multiplier}X Multiplier</span>
          </div>
        </div>

        <div class="food-rig-stats">
          <div class="rig-stat-row">
            <span class="lbl">Bets Placed:</span>
            <span class="val">${f.bettorCount} bets</span>
          </div>
          <div class="rig-stat-row">
            <span class="lbl">Wagered Pool:</span>
            <span class="val">${f.wagered.toLocaleString()} coins</span>
          </div>
          <div class="rig-stat-row">
            <span class="lbl">Potential Payout:</span>
            <span class="val">${f.potentialPayout.toLocaleString()} coins</span>
          </div>
          <div class="rig-stat-row">
            <span class="lbl">House Net P&L:</span>
            <span class="val ${profitClass}">${profitSign}${f.houseProfit.toLocaleString()}</span>
          </div>
        </div>

        <div class="food-bettors-box">
          <div class="food-bettors-header">
            <span>👥 Bettors on this Option:</span>
            <strong>${f.bettorCount} ${f.bettorCount === 1 ? 'Player' : 'Players'}</strong>
          </div>
          ${bettorsHtml}
        </div>

        <button class="btn ${isTarget ? 'btn-warning' : 'btn-primary'} btn-sm food-rig-btn"
                onclick="setRiggedWinner(${f.id})">
          ${isTarget ? '⭐ Rigged to Win' : `🎯 Force ${f.name} to Win`}
        </button>
      </div>
    `;
  }).join('');
}

// ── Render Tab 2: Live Bet Matrix ──
function renderMatrixTab(data) {
  if (!data.outcomes) return;
  q('matrix-total-pool').textContent = `${data.totalVolume.toLocaleString()} COINS`;
  q('matrix-bettor-count').textContent = `${data.totalPlayersBetting} Players Active`;

  // Determine safest pick (highest house profit)
  const sorted = [...data.outcomes].sort((a, b) => b.houseProfit - a.houseProfit);
  if (sorted.length > 0) {
    const safest = sorted[0];
    const sign = safest.houseProfit >= 0 ? '+' : '';
    q('matrix-safest-pick').textContent = `${safest.emoji} ${safest.name} (${sign}${safest.houseProfit.toLocaleString()} coins)`;
  }

  const tbody = q('matrix-table-body');
  if (!tbody) return;

  const totalPool = data.totalVolume || 0;

  tbody.innerHTML = data.outcomes.map(f => {
    const isTarget = data.forcedWinnerId === f.id;
    const profitClass = f.houseProfit >= 0 ? 'text-green' : 'text-red';
    const profitSign = f.houseProfit >= 0 ? '+' : '';
    const sharePct = totalPool > 0 ? ((f.wagered / totalPool) * 100).toFixed(1) : '0.0';
    const safetyBadge = f.houseProfit >= 0
      ? `<span class="badge badge-active" style="font-size:10.5px;">🟢 Safe Profit</span>`
      : `<span class="badge badge-inactive" style="font-size:10.5px; color:var(--danger); background:var(--danger-light); border:1px solid var(--danger-border);">🔴 House Risk</span>`;

    return `
      <tr class="${isTarget ? 'table-highlight' : ''}">
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:22px; line-height:1;">${f.emoji}</span>
            <div>
              <strong style="color:var(--text-main); font-size:13.5px;">${f.name}</strong>
              <div style="margin-top:2px;">${safetyBadge}</div>
            </div>
          </div>
        </td>
        <td><span class="food-rig-mult">${f.multiplier}X Multiplier</span></td>
        <td>
          <strong style="font-size:14px; color:var(--primary);">${f.bettorCount} ${f.bettorCount === 1 ? 'Player' : 'Players'}</strong>
          ${f.bettors && f.bettors.length > 0
            ? `<div style="display:flex; flex-wrap:wrap; gap:3px; margin-top:4px;">
                ${f.bettors.slice(0, 3).map(b => `
                  <span class="bettor-pill" style="font-size:10px; padding:1px 5px;">
                    ${b.avatar} ${b.name}: <strong>${b.amount.toLocaleString()}</strong>
                  </span>
                `).join('')}
                ${f.bettors.length > 3 ? `<small style="color:#94a3b8; font-size:10px;">+${f.bettors.length - 3} more</small>` : ''}
              </div>`
            : ''
          }
        </td>
        <td>
          <div style="min-width:140px;">
            <div style="display:flex; justify-content:space-between; align-items:baseline;">
              <span class="font-mono" style="font-weight:700; color:var(--text-main);">${f.wagered.toLocaleString()} coins</span>
              <small style="color:var(--text-muted); font-size:11px;">${sharePct}%</small>
            </div>
            <div style="height:5px; background:#e2e8f0; border-radius:3px; margin-top:4px; overflow:hidden;">
              <div style="height:100%; width:${sharePct}%; background:var(--primary); border-radius:3px; transition:width 0.3s ease;"></div>
            </div>
          </div>
        </td>
        <td class="font-mono text-gold" style="font-weight:700; font-size:13.5px;">${f.potentialPayout.toLocaleString()} coins</td>
        <td class="font-mono ${profitClass}" style="font-size:14px; font-weight:800;">
          ${profitSign}${f.houseProfit.toLocaleString()} coins
        </td>
        <td>
          <button class="btn ${isTarget ? 'btn-primary' : 'btn-outline'} btn-xs" onclick="setRiggedWinner(${f.id})" style="font-weight:700;">
            ${isTarget ? '⭐ Rigged' : '🎯 Rig Winner'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ── Render Tab 4: Odds & Economy ──
function renderOddsTab(data) {
  if (q('cfg-round-duration') && document.activeElement !== q('cfg-round-duration')) {
    q('cfg-round-duration').value = data.roundDuration;
  }
  if (q('cfg-cooldown-duration') && document.activeElement !== q('cfg-cooldown-duration')) {
    q('cfg-cooldown-duration').value = data.cooldownDuration;
  }

  if (data.chipAmounts && Array.isArray(data.chipAmounts)) {
    if (q('cfg-chip-1') && document.activeElement !== q('cfg-chip-1')) q('cfg-chip-1').value = data.chipAmounts[0] || 500;
    if (q('cfg-chip-2') && document.activeElement !== q('cfg-chip-2')) q('cfg-chip-2').value = data.chipAmounts[1] || 5000;
    if (q('cfg-chip-3') && document.activeElement !== q('cfg-chip-3')) q('cfg-chip-3').value = data.chipAmounts[2] || 50000;
    if (q('cfg-chip-4') && document.activeElement !== q('cfg-chip-4')) q('cfg-chip-4').value = data.chipAmounts[3] || 100000;
  }

  if (q('cfg-webhook-url') && document.activeElement !== q('cfg-webhook-url')) {
    q('cfg-webhook-url').value = data.webhookUrl || '';
  }
  if (q('cfg-webhook-secret') && document.activeElement !== q('cfg-webhook-secret')) {
    q('cfg-webhook-secret').value = data.webhookSecret || '';
  }

  const tbody = q('odds-table-body');
  if (!tbody || !data.foods) return;

  // IMPORTANT: Do NOT destroy DOM or reset inputs if user is currently editing inside the table!
  const isEditingTable = tbody.contains(document.activeElement);
  if (isEditingTable) {
    return;
  }

  // If table already has rows rendered, update values non-destructively without recreating elements
  const existingRows = tbody.querySelectorAll('tr');
  if (existingRows.length === data.foods.length) {
    const totalWeight = data.foods.reduce((acc, f) => acc + f.weight, 0);
    data.foods.forEach(f => {
      const multInput = q(`mult-${f.id}`);
      const weightInput = q(`weight-${f.id}`);
      const pctCell = q(`pct-${f.id}`);
      if (multInput && document.activeElement !== multInput) multInput.value = f.multiplier;
      if (weightInput && document.activeElement !== weightInput) weightInput.value = f.weight;
      if (pctCell) {
        const pct = totalWeight > 0 ? ((f.weight / totalWeight) * 100).toFixed(1) : 0;
        pctCell.textContent = `${pct}%`;
      }
    });
    return;
  }

  const totalWeight = data.foods.reduce((acc, f) => acc + f.weight, 0);

  tbody.innerHTML = data.foods.map(f => {
    const pct = totalWeight > 0 ? ((f.weight / totalWeight) * 100).toFixed(1) : 0;
    return `
      <tr>
        <td><strong>${f.emoji} ${f.name}</strong></td>
        <td>
          <input type="number" class="table-input" id="mult-${f.id}" value="${f.multiplier}" min="1" max="500" oninput="recalcProbabilities()" />
        </td>
        <td>
          <input type="number" class="table-input" id="weight-${f.id}" value="${f.weight}" min="1" max="200" oninput="recalcProbabilities()" />
        </td>
        <td class="font-mono text-gold" id="pct-${f.id}">${pct}%</td>
        <td>
          <button class="btn btn-primary btn-xs" onclick="saveFoodConfig(${f.id})">Save</button>
        </td>
      </tr>
    `;
  }).join('');
}

function recalcProbabilities() {
  if (!S.state || !S.state.foods) return;
  let totalWeight = 0;
  S.state.foods.forEach(f => {
    const w = parseInt(q(`weight-${f.id}`)?.value) || 0;
    totalWeight += w;
  });
  S.state.foods.forEach(f => {
    const w = parseInt(q(`weight-${f.id}`)?.value) || 0;
    const pct = totalWeight > 0 ? ((w / totalWeight) * 100).toFixed(1) : '0.0';
    const cell = q(`pct-${f.id}`);
    if (cell) cell.textContent = `${pct}%`;
  });
}

function saveFoodConfig(foodId) {
  const mult = parseInt(q(`mult-${foodId}`)?.value);
  const weight = parseInt(q(`weight-${foodId}`)?.value);
  if (isNaN(mult) || mult <= 0) {
    showToast('⚠️ Please enter a valid multiplier');
    return;
  }
  if (isNaN(weight) || weight <= 0) {
    showToast('⚠️ Please enter a valid weight');
    return;
  }
  socket.emit('admin:updateFood', { foodId, multiplier: mult, weight });
  showToast(`✅ Food #${foodId} Updated Live`);
}

function saveAllFoodsConfig() {
  if (!S.state || !S.state.foods) return;
  const updates = [];
  for (const f of S.state.foods) {
    const mult = parseInt(q(`mult-${f.id}`)?.value);
    const weight = parseInt(q(`weight-${f.id}`)?.value);
    if (isNaN(mult) || mult <= 0 || isNaN(weight) || weight <= 0) {
      showToast(`⚠️ Invalid values for ${f.name}`);
      return;
    }
    updates.push({ id: f.id, multiplier: mult, weight });
  }

  socket.emit('admin:updateAllFoods', { foods: updates });
  showToast('💾 All Food Multipliers & Weights Updated Live!');
}

// ── Admin Actions ──
function setRiggedWinner(foodId) {
  const autoClear = q('check-auto-clear')?.checked ?? false;
  socket.emit('admin:setWinner', { foodId, autoClear });
  showToast(`🎯 Rigged next winner to Food #${foodId}`);
}

function clearRig() {
  socket.emit('admin:setWinner', { foodId: null, autoClear: false });
  socket.emit('admin:setMode', { mode: 'auto' });
  showToast('🎲 Cleared rig — Auto Random Mode restored');
}

function setMode(mode) {
  socket.emit('admin:setMode', { mode });
  showToast(`Switched Game Mode to: ${mode.toUpperCase()}`);
}

function toggleAutoClear(val) {
  if (S.state && S.state.forcedWinnerId !== null) {
    socket.emit('admin:setWinner', { foodId: S.state.forcedWinnerId, autoClear: val });
  }
}

function forceDraw() {
  socket.emit('admin:forceDraw');
  showToast('⚡ Instant Draw Triggered!');
}

function togglePause() {
  socket.emit('admin:togglePause');
  showToast('Toggled Game Pause');
}

function saveTimers() {
  const roundDuration = parseInt(q('cfg-round-duration').value) || 15;
  const cooldownDuration = parseInt(q('cfg-cooldown-duration').value) || 8;
  socket.emit('admin:updateTimers', { roundDuration, cooldownDuration });
  showToast('⏱️ Timers Updated Live');
}

function saveChipAmounts() {
  const c1 = parseInt(q('cfg-chip-1')?.value) || 500;
  const c2 = parseInt(q('cfg-chip-2')?.value) || 5000;
  const c3 = parseInt(q('cfg-chip-3')?.value) || 50000;
  const c4 = parseInt(q('cfg-chip-4')?.value) || 100000;
  const chipAmounts = [c1, c2, c3, c4].filter(n => n > 0);
  if (chipAmounts.length < 2) {
    showToast('⚠️ Please provide at least 2 valid chip amounts');
    return;
  }
  socket.emit('admin:updateChips', { chipAmounts });
  showToast('🪙 Bid / Chip amounts updated live!');
}

function applyChipPreset(preset) {
  const presets = {
    low: [100, 500, 2000, 5000],
    standard: [500, 5000, 50000, 100000],
    high: [5000, 20000, 100000, 500000],
    whale: [50000, 200000, 1000000, 5000000],
  };
  const list = presets[preset] || presets.standard;
  if (q('cfg-chip-1')) q('cfg-chip-1').value = list[0];
  if (q('cfg-chip-2')) q('cfg-chip-2').value = list[1];
  if (q('cfg-chip-3')) q('cfg-chip-3').value = list[2];
  if (q('cfg-chip-4')) q('cfg-chip-4').value = list[3];
  saveChipAmounts();
}

function saveWebhookSettings() {
  const webhookUrl = (q('cfg-webhook-url')?.value || '').trim();
  const webhookSecret = (q('cfg-webhook-secret')?.value || '').trim();
  socket.emit('admin:updateWebhook', { webhookUrl, webhookSecret });
  showToast('🔗 Webhook settings saved!');
}

function testWebhookPing() {
  const statusEl = q('webhook-test-status');
  if (statusEl) {
    statusEl.style.color = '#ffaa00';
    statusEl.textContent = '⏳ Sending test webhook ping...';
  }
  socket.emit('admin:testWebhook');
}

socket.on('admin:testWebhookResult', ({ success, message, status }) => {
  const statusEl = q('webhook-test-status');
  if (statusEl) {
    statusEl.style.color = success ? '#34c759' : '#ff4444';
    statusEl.textContent = (success ? '✅ ' : '❌ ') + message + (status ? ` [HTTP ${status}]` : '');
  }
});

// ── Tab 3: Players Controller ──
function fetchPlayers() {
  socket.emit('admin:fetchPlayers', { limit: 50 });
}

S.playerFilter = 'all';

socket.on('admin:playersList', (players) => {
  S.players = players || [];
  filterPlayers();
});

function setPlayerFilter(filterType) {
  S.playerFilter = filterType;
  qsa('.player-filter-chips .filter-chip').forEach(b => b.classList.remove('active'));
  const activeBtn = q(`filter-chip-${filterType === 'high_balance' ? 'high' : filterType}`);
  if (activeBtn) activeBtn.classList.add('active');
  filterPlayers();
}

function filterPlayers() {
  const query = (q('player-search')?.value || '').toLowerCase().trim();
  let list = S.players || [];

  if (S.playerFilter === 'bettors') {
    list = list.filter(p => (p.total_bets || 0) > 0);
  } else if (S.playerFilter === 'winners') {
    list = list.filter(p => (p.today_profit || 0) > 0);
  } else if (S.playerFilter === 'high_balance') {
    list = list.filter(p => (p.balance || 0) >= 50000);
  }

  if (query) {
    list = list.filter(p => p.session_id.toLowerCase().includes(query));
  }

  const badge = q('player-count-badge');
  if (badge) {
    badge.textContent = `${list.length} of ${(S.players || []).length} Players`;
  }

  renderPlayersTable(list);
}

function renderPlayersTable(players) {
  const tbody = q('players-table-body');
  if (!tbody) return;

  if (players.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 24px; color:var(--text-muted);">No player accounts matching criteria</td></tr>';
    return;
  }

  tbody.innerHTML = players.map(p => {
    const profitClass = p.today_profit >= 0 ? 'text-green' : 'text-red';
    const profitSign = p.today_profit >= 0 ? '+' : '';
    const winRate = p.total_bets > 0 ? ((p.total_wins / p.total_bets) * 100).toFixed(0) : 0;

    return `
      <tr>
        <td class="font-mono"><strong>${p.session_id}</strong></td>
        <td class="font-mono text-gold" style="font-weight:700;">${p.balance.toLocaleString()} coins</td>
        <td class="font-mono ${profitClass}" style="font-weight:700;">${profitSign}${p.today_profit.toLocaleString()}</td>
        <td class="font-mono">${p.total_bets}</td>
        <td class="font-mono">${p.total_wins} (${winRate}%)</td>
        <td class="font-mono" style="font-size:11.5px; color:var(--text-muted);">${p.updated_at || 'Recently'}</td>
        <td>
          <div style="display:flex; gap:4px; align-items:center;">
            <button class="btn btn-secondary btn-xs" onclick="adjustBalance('${p.session_id}', 10000)">+10K</button>
            <button class="btn btn-secondary btn-xs" onclick="adjustBalance('${p.session_id}', 50000)">+50K</button>
            <button class="btn btn-secondary btn-xs" onclick="adjustBalance('${p.session_id}', -10000)">-10K</button>
            <button class="btn btn-primary btn-xs" onclick="promptSetBalance('${p.session_id}', ${p.balance})">Set</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function adjustBalance(sessionId, addAmount) {
  socket.emit('admin:adjustBalance', { sessionId, addAmount });
  showToast(`Updated balance for ${sessionId}`);
}

function promptSetBalance(sessionId, current) {
  const val = prompt(`Set exact balance for ${sessionId}:`, current);
  if (val !== null && !isNaN(parseInt(val))) {
    socket.emit('admin:adjustBalance', { sessionId, newBalance: parseInt(val) });
    showToast(`Set balance to ${parseInt(val).toLocaleString()} for ${sessionId}`);
  }
}

// ── Tab 5: Rounds & History ──
function fetchRounds() {
  socket.emit('admin:fetchRounds', { limit: 30 });
  socket.emit('admin:fetchStats');
}

socket.on('admin:statsSummary', (stats) => {
  if (!stats) return;
  q('stat-total-volume').textContent = `${(stats.total_volume || 0).toLocaleString()} COINS`;
  q('stat-total-payout').textContent = `${(stats.total_payout || 0).toLocaleString()} COINS`;
  const net = (stats.total_volume || 0) - (stats.total_payout || 0);
  const sign = net >= 0 ? '+' : '';
  const netEl = q('stat-net-revenue');
  netEl.textContent = `${sign}${net.toLocaleString()} COINS`;
  netEl.className = net >= 0 ? 'stat-val text-green' : 'stat-val text-red';

  const margin = stats.total_volume > 0 ? ((net / stats.total_volume) * 100).toFixed(1) : 0;
  q('stat-margin-pct').textContent = `${margin}%`;
});

socket.on('admin:roundsList', (rounds) => {
  S.rounds = rounds;
  renderHistoryTable(rounds);
});

function renderHistoryTable(rounds) {
  const tbody = q('history-table-body');
  if (!tbody) return;

  if (rounds.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">No historical rounds recorded yet</td></tr>';
    return;
  }

  tbody.innerHTML = rounds.map(r => {
    const f = S.state?.foods?.[r.winner_id] || { emoji: '🍽️', name: `Food #${r.winner_id}` };
    const net = (r.total_volume || 0) - (r.total_payout || 0);
    const profitClass = net >= 0 ? 'text-green' : 'text-red';
    const profitSign = net >= 0 ? '+' : '';

    return `
      <tr>
        <td class="font-mono"><strong>#${r.round_number}</strong></td>
        <td><strong>${f.emoji} ${f.name}</strong></td>
        <td class="font-mono">${r.total_bets || 0}</td>
        <td class="font-mono">${(r.total_volume || 0).toLocaleString()}</td>
        <td class="font-mono text-gold">${(r.total_payout || 0).toLocaleString()}</td>
        <td class="font-mono ${profitClass}"><strong>${profitSign}${net.toLocaleString()}</strong></td>
        <td class="font-mono" style="font-size:11px; color:#94a3b8">${r.ended_at || 'Live'}</td>
      </tr>
    `;
  }).join('');
}

function confirmResetHistory() {
  if (confirm('⚠️ Are you sure you want to clear all bets history? This cannot be undone.')) {
    socket.emit('admin:resetHistory');
  }
}

socket.on('admin:historyResetDone', () => {
  showToast('🧹 Bet History Cleared');
});

// ── Tab 6: Integration Docs Helpers ──
function copySnippet(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const text = el.innerText || el.textContent;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('📋 Copied to clipboard!');
    }).catch(() => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast('📋 Copied to clipboard!');
}

function switchToTab(tabId) {
  const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  if (btn) btn.click();
}

// ─── Tab: Time Scheduler & Special Drops ─────────────────────────────────────
function populateFoodOptions() {
  const foods = (S.state && Array.isArray(S.state.foods) && S.state.foods.length > 0)
    ? S.state.foods
    : [
        { id: 0, name: 'Sausage', emoji: '🌭', multiplier: 15 },
        { id: 1, name: 'Chicken', emoji: '🍗', multiplier: 20 },
        { id: 2, name: 'Shrimp', emoji: '🍤', multiplier: 25 },
        { id: 3, name: 'Steak', emoji: '🥩', multiplier: 45 },
        { id: 4, name: 'Tomato', emoji: '🍅', multiplier: 5 },
        { id: 5, name: 'Radish', emoji: '🥕', multiplier: 5 },
        { id: 6, name: 'Mushroom', emoji: '🍄', multiplier: 5 },
        { id: 7, name: 'Corn', emoji: '🌽', multiplier: 5 },
      ];

  const sel = q('sched-target-food');
  if (sel) {
    const prevVal = sel.value;
    sel.innerHTML = foods.map(f =>
      `<option value="${f.id}">${f.emoji} ${f.name} (${f.multiplier}X)</option>`
    ).join('');
    if (prevVal !== '' && foods.some(f => String(f.id) === String(prevVal))) {
      sel.value = prevVal;
    }
  }

  const comboContainer = qs('.custom-combo-checkboxes');
  if (comboContainer) {
    const checkedValues = new Set(
      Array.from(qsa('input[name="custom_combo_food"]:checked')).map(c => c.value)
    );
    comboContainer.innerHTML = foods.map(f => `
      <label>
        <input type="checkbox" name="custom_combo_food" value="${f.id}" ${checkedValues.has(String(f.id)) ? 'checked' : ''}>
        ${f.emoji} ${f.name} (${f.multiplier}X)
      </label>
    `).join('');
  }
}

function setQuickSchedTime(addMinutes) {
  const targetMs = Date.now() + serverTimeOffsetMs + (addMinutes * 60 * 1000);
  const targetDate = new Date(targetMs);
  try {
    const timeFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: activeServerTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const formatted = timeFormatter.format(targetDate);
    const input = q('sched-time');
    if (input) {
      input.value = formatted;
      showToast(`⏰ Scheduled time set to ${formatted} (+${addMinutes}m from server clock)`);
    }
  } catch (e) {
    const hours = String(targetDate.getHours()).padStart(2, '0');
    const mins = String(targetDate.getMinutes()).padStart(2, '0');
    const input = q('sched-time');
    if (input) input.value = `${hours}:${mins}`;
  }
}

socket.on('admin:schedulesList', ({ schedules, armedEvent, serverTime, timezone, serverTimestamp }) => {
  if (Array.isArray(schedules)) {
    S.schedules = schedules;
    renderSchedulesTable(schedules);
  }
  renderArmedStatus(armedEvent);
  if (serverTimestamp) {
    serverTimeOffsetMs = serverTimestamp - Date.now();
  }
  if (timezone) {
    activeServerTimezone = timezone;
    const tzEl = q('clock-tz');
    if (tzEl) tzEl.textContent = `${timezone} (Server Clock)`;
    const sel = q('sched-tz-select');
    if (sel && sel.value !== timezone) sel.value = timezone;
  }
  updateLiveClocks();
  populateFoodOptions();
});

function renderSchedulerTab(data) {
  if (!data) return;
  if (data.serverTimestamp) {
    serverTimeOffsetMs = data.serverTimestamp - Date.now();
  }
  if (data.timezone) {
    activeServerTimezone = data.timezone;
    const tzEl = q('clock-tz');
    if (tzEl) tzEl.textContent = `${data.timezone} (Server Clock)`;
    const sel = q('sched-tz-select');
    if (sel && sel.value !== data.timezone) sel.value = data.timezone;
  }
  updateLiveClocks();
  renderArmedStatus(data.armedSpecialEvent);
  if (Array.isArray(data.schedules)) {
    S.schedules = data.schedules;
    renderSchedulesTable(data.schedules);
  }
}

function renderArmedStatus(armedEvent) {
  S.armedSpecialEvent = armedEvent;

  // Banner in Rig Tab
  const armedRigEl = q('armed-event-status');
  const armedRigText = q('armed-event-text');
  if (armedRigEl && armedRigText) {
    if (armedEvent) {
      armedRigEl.style.display = 'flex';
      armedRigText.innerHTML = `⚡ <strong>ARMED FOR NEXT ROUND:</strong> ${armedEvent.name || armedEvent.type}`;
    } else {
      armedRigEl.style.display = 'none';
    }
  }

  // Banner in Scheduler Tab
  const armedSchedEl = q('sched-armed-banner');
  const armedSchedName = q('sched-armed-name');
  if (armedSchedEl && armedSchedName) {
    if (armedEvent) {
      armedSchedEl.style.display = 'flex';
      armedSchedName.innerHTML = `<strong>${armedEvent.name || armedEvent.type}</strong>`;
    } else {
      armedSchedEl.style.display = 'none';
    }
  }
}

function onScheduleTypeChange(type) {
  const singleGrp = q('sched-single-food-group');
  const customGrp = q('sched-custom-combo-group');
  if (singleGrp) singleGrp.style.display = (type === 'single_food') ? 'block' : 'none';
  if (customGrp) customGrp.style.display = (type === 'custom_combo') ? 'block' : 'none';
}

function submitAddSchedule() {
  const timeInput = q('sched-time').value.trim();
  const nameInput = q('sched-name').value.trim();
  const typeInput = q('sched-type').value;
  const repeatDaily = q('sched-repeat').checked;

  if (!timeInput) {
    showToast('⚠️ Please enter a drop time (e.g. 11:00)');
    return;
  }

  let targetFoodId = null;
  let customFoodIds = [];

  if (typeInput === 'single_food') {
    targetFoodId = parseInt(q('sched-target-food').value, 10);
  } else if (typeInput === 'custom_combo') {
    const checked = qsa('input[name="custom_combo_food"]:checked');
    customFoodIds = Array.from(checked).map(c => parseInt(c.value, 10));
    if (customFoodIds.length === 0) {
      showToast('⚠️ Please select at least 1 food for the custom combo');
      return;
    }
  }

  // Auto-generate name if empty
  let generatedName = nameInput;
  if (!generatedName) {
    if (typeInput === 'all_vegetables') {
      generatedName = `${timeInput} All Vegetables Drop`;
    } else if (typeInput === 'pizza_fire') {
      generatedName = `${timeInput} Pizza Fire Drop`;
    } else if (typeInput === 'single_food') {
      const f = (S.state?.foods || [])[targetFoodId] || { name: 'Food ' + targetFoodId, emoji: '🎯' };
      generatedName = `${timeInput} ${f.emoji} ${f.name} Drop`;
    } else if (typeInput === 'custom_combo') {
      generatedName = `${timeInput} Custom Combo Drop`;
    } else {
      generatedName = `${timeInput} Special Drop`;
    }
  }

  socket.emit('admin:addSchedule', {
    time: timeInput,
    name: generatedName,
    type: typeInput,
    targetFoodId,
    customFoodIds,
    repeatDaily,
    enabled: true,
  });

  showToast(`✅ Scheduled drop "${generatedName}" added for ${timeInput}!`);
  q('sched-name').value = '';
}

function deleteSchedule(id) {
  if (confirm('Are you sure you want to delete this scheduled drop?')) {
    socket.emit('admin:deleteSchedule', { id });
    showToast('🗑️ Scheduled drop deleted');
  }
}

function toggleSchedule(id, enabled) {
  socket.emit('admin:toggleSchedule', { id, enabled });
  showToast(enabled ? '✅ Schedule activated' : '⏸️ Schedule disabled');
}

function resetScheduleTrigger(id) {
  socket.emit('admin:resetScheduleTrigger', { id });
  showToast('🔄 Drop trigger reset! Schedule is ready to fire today again.');
}

function editSchedule(id) {
  const item = (S.schedules || []).find(s => s.id === id);
  if (!item) return;

  if (q('sched-time')) q('sched-time').value = item.time;
  if (q('sched-name')) q('sched-name').value = item.name;
  if (q('sched-type')) {
    q('sched-type').value = item.type;
    onScheduleTypeChange(item.type);
  }
  if (item.type === 'single_food' && item.targetFoodId !== null && q('sched-target-food')) {
    q('sched-target-food').value = item.targetFoodId;
  }
  if (item.type === 'custom_combo' && Array.isArray(item.customFoodIds)) {
    qsa('input[name="custom_combo_food"]').forEach(cb => {
      cb.checked = item.customFoodIds.includes(parseInt(cb.value, 10));
    });
  }
  if (q('sched-repeat')) q('sched-repeat').checked = !!item.repeatDaily;

  const formCard = qs('.scheduler-form-card');
  if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast(`✏️ Loaded "${item.name}" into form. Modify and re-add or delete the old one.`);
}

function armSpecialEvent(type, targetFoodId = null, customFoodIds = [], name = null) {
  socket.emit('admin:armSpecialEvent', {
    type,
    targetFoodId,
    customFoodIds,
    name,
  });
  const label = type === 'all_vegetables' ? '🥗 All Vegetables Feast' : type === 'pizza_fire' ? '🔥 Pizza Fire' : type;
  showToast(`⚡ Armed: "${label}" will drop NEXT ROUND!`);
}

function disarmSpecialEvent() {
  socket.emit('admin:armSpecialEvent', { type: null });
  showToast('❌ Armed special drop canceled');
}

function armScheduleForTest(id) {
  const item = (S.schedules || []).find(s => s.id === id);
  if (!item) return;
  socket.emit('admin:armSpecialEvent', {
    type: item.type,
    targetFoodId: item.targetFoodId,
    customFoodIds: item.customFoodIds,
    name: `${item.name} (Test Trigger)`,
  });
  showToast(`⚡ Test Armed: "${item.name}" will drop NEXT ROUND!`);
}

function changeTimezone(tz) {
  socket.emit('admin:setTimezone', { timezone: tz });
  showToast(`🕒 Timezone updated to ${tz}`);
}

function renderSchedulesTable(schedules) {
  const tbody = q('schedules-table-body');
  if (!tbody) return;

  if (!Array.isArray(schedules) || schedules.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted" style="padding:28px;">
          No scheduled drop events configured yet. Add your first scheduled drop above!
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = schedules.map(s => {
    let outcomeHtml = '';
    if (s.type === 'all_vegetables') {
      outcomeHtml = `<span class="sched-badge veg">🥗 All 4 Vegetables (Tomato, Radish, Mushroom, Corn)</span>`;
    } else if (s.type === 'pizza_fire') {
      outcomeHtml = `<span class="sched-badge pizza">🔥 Pizza Fire (Sausage, Chicken, Shrimp, Steak)</span>`;
    } else if (s.type === 'single_food') {
      const f = (S.state?.foods || [])[s.targetFoodId] || { name: 'Food ' + s.targetFoodId, emoji: '🍽️', multiplier: '' };
      outcomeHtml = `<span class="sched-badge single">${f.emoji} ${f.name} (${f.multiplier}X)</span>`;
    } else if (s.type === 'custom_combo') {
      const names = (s.customFoodIds || []).map(id => {
        const f = (S.state?.foods || [])[id];
        return f ? `${f.emoji} ${f.name}` : `#${id}`;
      }).join(', ');
      outcomeHtml = `<span class="sched-badge custom">🎲 Custom Combo: ${names || 'None'}</span>`;
    } else {
      outcomeHtml = `<span class="sched-badge">${s.type}</span>`;
    }

    const repeatHtml = s.repeatDaily
      ? `<span class="repeat-tag daily">🔁 Daily (${s.time})</span>`
      : `<span class="repeat-tag once">1️⃣ Once Today</span>`;

    let lastTriggeredHtml = '';
    if (s.lastTriggeredDate) {
      lastTriggeredHtml = `
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="text-green" style="font-weight:700;">✓ ${s.lastTriggeredDate}</span>
          <button class="btn btn-outline btn-xs" onclick="resetScheduleTrigger('${s.id}')" title="Reset trigger to allow firing again today" style="padding:2px 6px; font-size:11px;">
            🔄 Reset
          </button>
        </div>
      `;
    } else {
      lastTriggeredHtml = `<span class="text-dim" style="font-style:italic;">⏳ Pending</span>`;
    }

    const statusBadge = s.enabled
      ? `<span class="status-pill status-active">Active</span>`
      : `<span class="status-pill status-paused">Disabled</span>`;

    return `
      <tr class="${s.enabled ? '' : 'row-disabled'}">
        <td class="font-mono text-gold" style="font-size:15px; font-weight:800; white-space:nowrap;">
          ⏰ ${s.time}
        </td>
        <td>
          <div style="font-weight:700; color:var(--text-main);">${s.name}</div>
          <div style="font-size:11px; color:#94a3b8; font-family:var(--font-mono);">${s.id}</div>
        </td>
        <td>${outcomeHtml}</td>
        <td>${repeatHtml}</td>
        <td>${lastTriggeredHtml}</td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <label class="switch-toggle" title="Toggle active/inactive">
              <input type="checkbox" ${s.enabled ? 'checked' : ''} onchange="toggleSchedule('${s.id}', this.checked)">
              <span class="switch-slider"></span>
            </label>
            ${statusBadge}
          </div>
        </td>
        <td>
          <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
            <button class="btn btn-warning btn-xs" onclick="armScheduleForTest('${s.id}')" title="Test drop immediately in next round">
              ⚡ Test Next Round
            </button>
            <button class="btn btn-outline btn-xs" onclick="editSchedule('${s.id}')" title="Edit this schedule in form">
              ✏️ Edit
            </button>
            <button class="btn btn-danger btn-xs" onclick="deleteSchedule('${s.id}')" title="Delete this schedule">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}
