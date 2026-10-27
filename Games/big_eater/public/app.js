/* ════════════════════════════════════════════════════════
   Big Eater — app.js
   Socket.io realtime client · Multi-slot Betting · Result Screen
════════════════════════════════════════════════════════ */
'use strict';

// ─── Session ──────────────────────────────────────────────────────────────────
const SESSION_KEY = 'be_session_id';
const AMOUNT_KEY  = 'be_bet_amount';
const SOUND_KEY   = 'be_sound';

function getSession() {
  try {
    const params = new URLSearchParams(window.location.search);
    const customId =
      params.get('id') ||
      params.get('userId') ||
      params.get('sessionId') ||
      params.get('uid') ||
      params.get('playerId') ||
      params.get('player_id') ||
      localStorage.getItem('umi_user_id');
    if (customId && customId.trim().length > 0) {
      const cleanId = customId.trim();
      localStorage.setItem(SESSION_KEY, cleanId);
      return cleanId;
    }
  } catch (_) {}

  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function getPlayerMeta() {
  let name = null;
  let avatar = null;
  let balance = null;
  try {
    const params = new URLSearchParams(window.location.search);
    const customName = params.get('name') || params.get('username') || params.get('displayName');
    if (customName && customName.trim()) {
      name = customName.trim().slice(0, 30);
      localStorage.setItem('be_player_name', name);
    }
    const customAvatar = params.get('avatar') || params.get('avatarUrl') || params.get('photo');
    if (customAvatar && customAvatar.trim()) {
      avatar = customAvatar.trim();
      localStorage.setItem('be_player_avatar', avatar);
    }
    const customBal = params.get('balance') || params.get('coins') || params.get('wallet');
    if (customBal !== null && !isNaN(Number(customBal))) {
      balance = Math.max(0, parseInt(customBal, 10));
    }
  } catch (_) {}

  if (!name) name = localStorage.getItem('be_player_name') || 'Player';
  if (!avatar) avatar = localStorage.getItem('be_player_avatar') || '😎';

  return { name, avatar, balance };
}

const SESSION_ID = getSession();

// ─── State ────────────────────────────────────────────────────────────────────
const S = {
  balance:            0,
  todayProfit:        0,
  selectedAmt:        parseInt(localStorage.getItem(AMOUNT_KEY)) || 50000,
  bets:               {},       // { [foodId]: amount } — multi-bet across all 8 foods!
  foods:              [],
  roundNumber:        0,
  phase:              'betting',
  remaining:          15,
  soundOn:            localStorage.getItem(SOUND_KEY) !== 'off',
  lastPersonalResult: null,
  history:            [],
  chipAmounts:        [500, 5000, 50000, 100000],
};

// ─── DOM helpers ──────────────────────────────────────────────────────────────
const q  = id  => document.getElementById(id);
const qs = sel => document.querySelector(sel);

const DOM = {
  roundText:         q('round-text'),
  timerVal:          q('timer-val'),
  timerPill:         qs('.timer-pill-wrap'),
  timerFoodL:        q('timer-food-l'),
  timerFoodR:        q('timer-food-r'),
  foodGrid:          q('food-grid'),
  balanceNum:        q('balance-num'),
  profitsVal:        q('profits-val'),
  historyScroll:     q('history-scroll'),
  onlineCount:       q('online-count'),
  rechargeBtn:       q('recharge-btn'),
  soundBtn:          q('sound-btn'),
  toast:             q('toast'),
  playerProfilePill:   q('player-profile-pill'),
  playerProfileAvatar: q('player-profile-avatar'),
  playerProfileName:   q('player-profile-name'),

  // Rules and History modals
  ruleBtn:           q('rule-btn'),
  ruleModal:         q('rule-modal'),
  ruleModalClose:    q('rule-modal-close'),
  recordsBtn:        q('records-btn'),
  historyChartBtn:   q('history-chart-btn'),
  historyModal:      q('history-modal'),
  historyModalClose: q('history-modal-close'),
  historyStatsGrid:  q('history-stats-grid'),
  historyListItems:  q('history-list-items'),
  trendStrip:          q('trend-strip'),
  trendStripWrapper:   q('trend-strip-wrapper'),
  trendFoodsCol:       q('trend-foods-col'),
  trendGraphViewport:  q('trend-graph-viewport'),
  trendGraphInner:     q('trend-graph-inner'),
  trendGraphGrid:      q('trend-graph-grid'),
  trendLineSvg:        q('trend-line-svg'),
  trendPolyline:       q('trend-polyline'),

  // Result screen overlay (Gamified)
  rsOverlay:          q('rs-overlay'),
  rsConfettiCanvas:   q('rs-confetti-canvas'),
  rsDrawingText:      q('rs-drawing-text'),
  rsFlyFood:          q('rs-fly-food'),
  rsWinnerPill:       q('rs-winner-pill'),
  rsWinnerName:       q('rs-winner-name'),
  rsWinnerMult:       q('rs-winner-mult'),
  rsEmotionBox:       q('rs-emotion-box'),
  rsEmotion:          q('rs-emotion'),
  rsTearDrop:         q('rs-tear-drop'),
  rsWinCrown:         q('rs-win-crown'),
  rsCd:               q('rs-cd'),
  rsResultCard:       q('rs-result-card'),
  rsResultLabel:      q('rs-result-label'),
  rsResultFood:       q('rs-result-food-icon'),
  rsCardMultBadge:    q('rs-card-mult-badge'),
  rsResultMsg:        q('rs-result-msg'),
  rsWinCallout:       q('rs-win-callout'),
  rsWinAmt:           q('rs-win-amt'),
  rsWinnersBox:       q('rs-winners-box'),
  rsWinners:          q('rs-winners'),
  rsContinueBtn:      q('rs-continue-btn'),
  rsContinueProgress: q('rs-continue-progress'),

  // Splash Loading Screen
  splashScreen:      q('splash-screen'),
  splashStatus:      q('splash-status'),
  splashBar:         q('splash-bar'),
};

// ─── Splash Loading Controller (Shown on every app launch) ─────────────────────
let splashProgress = 0;
let splashDone = false;
let splashInterval = null;

function updateSplash(val) {
  splashProgress = Math.min(100, Math.max(splashProgress, val));
  if (DOM.splashBar) DOM.splashBar.style.width = `${splashProgress}%`;
  if (DOM.splashStatus) DOM.splashStatus.textContent = `Loading... ${splashProgress}%`;

  if (splashProgress >= 100 && !splashDone) {
    splashDone = true;
    if (splashInterval) clearInterval(splashInterval);
    if (DOM.splashScreen) {
      DOM.splashScreen.classList.add('fade-out');
      setTimeout(() => { if (DOM.splashScreen) DOM.splashScreen.style.display = 'none'; }, 180);
    }
  }
}

// Snappy progress progression
splashInterval = setInterval(() => {
  if (splashProgress < 90) {
    const inc = Math.floor(Math.random() * 15) + 12;
    updateSplash(splashProgress + inc);
  }
}, 30);

function finishSplash() {
  updateSplash(100);
}

// ─── Formatting ───────────────────────────────────────────────────────────────
const fmt  = n => Math.abs(n >= 0 ? n : -n).toLocaleString();
const pad4 = n => String(n).padStart(4, '0');

function formatChipAmount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(0) + 'K';
  return String(n);
}

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, dur = 2400) {
  DOM.toast.textContent = msg;
  DOM.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => DOM.toast.classList.remove('show'), dur);
}

// ─── Balance UI ───────────────────────────────────────────────────────────────
function setBalance(bal, profit) {
  if (bal !== undefined) {
    S.balance = bal;
    DOM.balanceNum.textContent = fmt(bal);
    DOM.balanceNum.style.transform = 'scale(1.18)';
    setTimeout(() => DOM.balanceNum.style.transform = '', 280);
  }
  if (profit !== undefined) {
    S.todayProfit = profit;
    DOM.profitsVal.textContent = (profit >= 0 ? '' : '-') + fmt(profit);
    DOM.profitsVal.className = 'profits-val' + (profit > 0 ? ' pos' : profit < 0 ? ' neg' : '');
  }
}

function renderAvatarHtml(avatar, fallback = '😎') {
  if (!avatar) return fallback;
  if (typeof avatar === 'string' && (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('/') || avatar.includes('.png') || avatar.includes('.jpg') || avatar.includes('.jpeg') || avatar.includes('.webp') || avatar.includes('.gif'))) {
    return `<img src="${avatar}" alt="avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.outerHTML='${fallback}'"/>`;
  }
  return avatar;
}

// Early sync from URL / storage meta (instant render without waiting for socket handshake)
const initialMeta = getPlayerMeta();
if (initialMeta.balance !== null) {
  setBalance(initialMeta.balance, 0);
} else {
  setBalance(S.balance, 0);
}
if (DOM.playerProfilePill) {
  if (DOM.playerProfileAvatar) DOM.playerProfileAvatar.innerHTML = renderAvatarHtml(initialMeta.avatar, '😎');
  if (DOM.playerProfileName) DOM.playerProfileName.textContent = initialMeta.name || 'Player';
  DOM.playerProfilePill.style.display = 'inline-flex';
}

// ─── Sound ────────────────────────────────────────────────────────────────────
let audioCtx = null;
function getAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) {}
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Global mobile webview unlock on any user tap/touch gesture
const unlockAudio = () => {
  const ctx = getAudio();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
};
document.addEventListener('click', unlockAudio, { passive: true });
document.addEventListener('touchstart', unlockAudio, { passive: true });
document.addEventListener('pointerdown', unlockAudio, { passive: true });

function playNote(freq, type, vol, dur, delay = 0) {
  if (!S.soundOn) return;
  try {
    const ctx = getAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    osc.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime + delay;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t); osc.stop(t + dur + 0.01);
  } catch (_) {}
}

function playTick()    { playNote(900, 'sine', 0.06, 0.08); }
function playBet()     { playNote(700, 'sine', 0.12, 0.12); }
function playWin()     { [523, 659, 784, 1047].forEach((f, i) => playNote(f, 'sine', 0.14, 0.25, i * 0.11)); }
function playJackpotFanfare() {
  if (!S.soundOn) return;
  const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
  notes.forEach((f, i) => playNote(f, 'triangle', 0.16, 0.35, i * 0.09));
  setTimeout(() => {
    [1046.50, 1318.51, 1567.98, 2093.00].forEach((f, i) => playNote(f, 'sine', 0.18, 0.45, i * 0.1));
  }, 550);
}
function playLose()    { playNote(160, 'sawtooth', 0.1, 0.45); }
function playRecharge(){ [440, 550, 660].forEach((f, i) => playNote(f, 'sine', 0.1, 0.15, i * 0.08)); }
function playChipSelect() {
  playNote(880, 'triangle', 0.14, 0.05);
  setTimeout(() => playNote(1250, 'sine', 0.1, 0.04), 25);
  if (navigator.vibrate) try { navigator.vibrate(10); } catch (_) {}
}

const SOUND_SVGS = {
  on: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`,
  off: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`
};

function updateSoundBtnUI() {
  if (DOM.soundBtn) DOM.soundBtn.innerHTML = S.soundOn ? SOUND_SVGS.on : SOUND_SVGS.off;
}

// Sound toggle button
if (DOM.soundBtn) {
  DOM.soundBtn.addEventListener('click', () => {
    const ctx = getAudio();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    S.soundOn = !S.soundOn;
    localStorage.setItem(SOUND_KEY, S.soundOn ? 'on' : 'off');
    updateSoundBtnUI();
    if (S.soundOn) playNote(880, 'sine', 0.15, 0.15);
    showToast(S.soundOn ? '🎵 Sound ON' : '🔇 Sound OFF');
  });
  updateSoundBtnUI();
}

// ─── Food Grid (8 Slots) ──────────────────────────────────────────────────────
function renderGrid() {
  DOM.foodGrid.innerHTML = '';
  S.foods.forEach(food => {
    const li = document.createElement('li');
    li.className = 'food-item';
    li.id        = `fi-${food.id}`;
    li.setAttribute('role', 'button');
    li.setAttribute('tabindex', '0');
    li.setAttribute('aria-label', `${food.name}, win ${food.multiplier}X`);

    li.innerHTML = `
      <div class="food-circle-outer">
        <div class="food-circle" id="fc-${food.id}">${food.emoji}</div>
        <span class="bet-chip-badge" id="bcb-${food.id}"></span>
      </div>
      <span class="win-label">win ${food.multiplier}X</span>
    `;

    li.addEventListener('click', () => onFoodTap(food.id));
    li.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFoodTap(food.id); }
    });
    DOM.foodGrid.appendChild(li);
  });
  restoreSelectionUI();
}

function renderRulesOdds(foods) {
  const container = q('rule-odds-grid');
  if (!container || !Array.isArray(foods) || !foods.length) return;
  container.innerHTML = foods.map(f => {
    const isMeat = [0, 1, 2, 3].includes(f.id);
    return `
      <div class="rule-odd-card ${isMeat ? 'meat' : 'veg'}">
        <span class="odd-food">${f.emoji} ${f.name}</span>
        <span class="odd-val">${f.multiplier}X</span>
      </div>
    `;
  }).join('');
}

function getItem(id) { return document.getElementById(`fi-${id}`); }

function updateFoodBetBadge(foodId, total) {
  const el    = getItem(foodId);
  const badge = document.getElementById(`bcb-${foodId}`);
  if (!el || !badge) return;
  if (total > 0) {
    el.classList.add('has-bet');
    badge.innerHTML = `<span class="chip-coin" aria-hidden="true">🟡</span><span>${fmt(total)}</span>`;
    badge.classList.add('show');
  } else {
    el.classList.remove('has-bet');
    badge.innerHTML = '';
    badge.classList.remove('show');
  }
}

function restoreSelectionUI() {
  for (const [foodId, amount] of Object.entries(S.bets)) {
    updateFoodBetBadge(foodId, amount);
  }
}

// ─── Roulette Spin Controller (Cycles through all items before landing on winner) ──
let activeSpinTimeout = null;
const ROULETTE_ORDER = [0, 1, 2, 3, 7, 6, 5, 4]; // Clockwise perimeter around 2x4 bread slice

function clearSpinHighlight() {
  if (activeSpinTimeout) {
    clearTimeout(activeSpinTimeout);
    activeSpinTimeout = null;
  }
  ROULETTE_ORDER.forEach(id => {
    const el = getItem(id);
    if (el) el.classList.remove('roulette-active');
  });
}

function runRouletteSpin(winnerId, onComplete, specialEvent = null, winnerIds = null) {
  clearSpinHighlight();

  let targetId = winnerId;
  // If winnerId is a combo/virtual ID (e.g. 8 for Pizza, 9 for Salad),
  // pick a food from winnerIds to land on so the pointer stops on the food slice
  if (Array.isArray(winnerIds) && winnerIds.length > 0 && !ROULETTE_ORDER.includes(winnerId)) {
    targetId = winnerIds[winnerIds.length - 1];
  }

  let targetIdx = ROULETTE_ORDER.indexOf(targetId);
  if (targetIdx === -1) targetIdx = 0;

  // Spin through ALL 8 items (at least 2 full cycles) + steps to winner
  const totalSteps = (ROULETTE_ORDER.length * 2) + targetIdx;
  let currentStep = 0;

  function step() {
    // Remove highlight from previous item
    const prevFoodId = ROULETTE_ORDER[(currentStep - 1 + ROULETTE_ORDER.length) % ROULETTE_ORDER.length];
    const prevEl = getItem(prevFoodId);
    if (prevEl) prevEl.classList.remove('roulette-active');

    if (currentStep >= totalSteps) {
      // Landed on winner(s)
      if (Array.isArray(winnerIds) && winnerIds.length > 1) {
        winnerIds.forEach(id => {
          const el = getItem(id);
          if (el) el.classList.add('roulette-active');
        });
      } else {
        const finalEl = getItem(targetId);
        if (finalEl) finalEl.classList.add('roulette-active');
      }
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    const currentFoodId = ROULETTE_ORDER[currentStep % ROULETTE_ORDER.length];
    const currentEl = getItem(currentFoodId);
    if (currentEl) {
      currentEl.classList.add('roulette-active');
    }

    // Play spinning audio tick with escalating pitch
    const pitch = 640 + ((currentStep % ROULETTE_ORDER.length) * 45);
    playNote(pitch, 'sine', 0.1, 0.06);

    currentStep++;

    // Slower, suspenseful momentum deceleration (clear, visible rolling through each item)
    const remaining = totalSteps - currentStep;
    let delay = 135;
    if (remaining <= 10) {
      if (remaining > 7)      delay = 180;
      else if (remaining > 5) delay = 240;
      else if (remaining > 3) delay = 320;
      else if (remaining > 1) delay = 430;
      else if (remaining === 1) delay = 580; // Final dramatic suspense before landing!
    }

    activeSpinTimeout = setTimeout(step, delay);
  }

  step();
}

function clearAllStates() {
  clearSpinHighlight();
  S.foods.forEach(f => {
    const el = getItem(f.id);
    if (el) el.className = 'food-item';
    const badge = document.getElementById(`bcb-${f.id}`);
    if (badge) {
      badge.textContent = '';
      badge.classList.remove('show');
    }
  });
}

function markWinner(winnerId, winnerIds = null) {
  const winSet = new Set(Array.isArray(winnerIds) && winnerIds.length > 0 ? winnerIds.map(Number) : [Number(winnerId)]);
  S.foods.forEach(f => {
    const el = getItem(f.id);
    if (!el) return;
    if (winSet.has(f.id)) {
      el.classList.add('winner');
      el.classList.remove('loser');
    } else {
      el.classList.add('loser');
      el.classList.remove('winner');
    }
  });
}

function updateBetStats(stats) {
  // Unused: prevents unwanted "1" count badges from appearing on food items
}

// ─── Food Tap (Betting on any of the 8 foods) ─────────────────────────────────
function onFoodTap(foodId) {
  if (S.phase !== 'betting')     { showToast('⏳ Wait for next round'); return; }
  if (S.remaining <= 2)          { showToast('⏰ Too late!'); return; }
  if (S.balance < S.selectedAmt) { showToast('💸 Not enough balance!'); return; }

  // Interactive feedback
  playBet();
  const el = getItem(foodId);
  if (el) {
    el.classList.add('has-bet');
    const outer = el.querySelector('.food-circle-outer');
    if (outer) {
      outer.style.transform = 'scale(0.92)';
      setTimeout(() => outer.style.transform = '', 150);
    }
  }

  socket.emit('bet:place', { foodId, amount: S.selectedAmt });
}

// ─── Timer UI ─────────────────────────────────────────────────────────────────
let lastTickSec = -1;

function updateTimer(remaining) {
  S.remaining = remaining;
  DOM.timerVal.textContent = remaining > 0 ? `${remaining}s` : '...';

  DOM.timerPill.classList.remove('urgent', 'revealing');
  if (S.phase === 'revealing') {
    DOM.timerPill.classList.add('revealing');
  } else if (remaining <= 3 && remaining > 0) {
    DOM.timerPill.classList.add('urgent');
    if (remaining !== lastTickSec) playTick();
  }
  lastTickSec = remaining;
}

// ─── History ──────────────────────────────────────────────────────────────────
function renderHistory(history) {
  S.history = history || [];
  if (DOM.historyScroll) {
    DOM.historyScroll.innerHTML = '';
    S.history.slice(0, 11).forEach(h => {
      const food = (S.foods && S.foods.find(f => f.id === h.winner_id)) || TREND_FOOD_LIST.find(f => f.id === h.winner_id);
      if (!food) return;
      const div = document.createElement('div');
      div.className = 'history-icon';
      div.textContent = food.emoji;
      div.title = `Round ${h.round_number}: ${food.name}`;
      DOM.historyScroll.appendChild(div);
    });
  }

  // Real-time synchronization: Update Trend Modal immediately if open on screen!
  if (DOM.historyModal && DOM.historyModal.style.display !== 'none') {
    renderHistoryModalContent();
  }
}



// ─── Bet Amount Selection ─────────────────────────────────────────────────────
function formatChipBtn(amt) {
  if (amt >= 1000000) return (amt / 1000000) + 'M';
  if (amt >= 1000) return fmt(amt);
  return String(amt);
}

function renderBetAmountButtons(chipAmounts) {
  if (!Array.isArray(chipAmounts) || chipAmounts.length === 0) return;
  S.chipAmounts = chipAmounts;
  const container = document.querySelector('.bet-amounts');
  if (!container) return;

  if (!S.chipAmounts.includes(S.selectedAmt)) {
    S.selectedAmt = S.chipAmounts[0];
    localStorage.setItem(AMOUNT_KEY, S.selectedAmt);
  }

  container.innerHTML = '';
  container.style.gridTemplateColumns = `repeat(${S.chipAmounts.length}, 1fr)`;

  S.chipAmounts.forEach(amt => {
    const btn = document.createElement('button');
    btn.className = `amount-btn ${amt === S.selectedAmt ? 'active' : ''}`;
    btn.dataset.amount = String(amt);
    btn.id = `amt-${amt}`;
    btn.innerHTML = `<span class="chip-inner"><span class="chip-coin-icon">🟡</span><span class="chip-val">${formatChipBtn(amt)}</span></span>`;

    btn.addEventListener('click', () => {
      playChipSelect();
      S.selectedAmt = amt;
      localStorage.setItem(AMOUNT_KEY, amt);
      container.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showToast(`💰 Bet amount: ${fmt(amt)} 🟡`);
    });

    container.appendChild(btn);
  });

  const ruleChip = q('rule-chip-text');
  if (ruleChip) {
    ruleChip.innerHTML = `1. Choose your chip amount (${S.chipAmounts.map(fmt).join(', ')}).`;
  }
}

// Initial render of bet buttons
renderBetAmountButtons(S.chipAmounts);

// ─── Recharge (Guarded) ────────────────────────────────────────────────────────
if (DOM.rechargeBtn) {
  DOM.rechargeBtn.addEventListener('click', () => {
    if (window.BigEaterHost && typeof window.BigEaterHost.onRecharge === 'function') {
      window.BigEaterHost.onRecharge();
      return;
    }
    if (window.FlutterChannel && typeof window.FlutterChannel.postMessage === 'function') {
      window.FlutterChannel.postMessage(JSON.stringify({ event: 'recharge', currentBalance: S.balance }));
      return;
    }
    if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
      window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'recharge', currentBalance: S.balance }));
      return;
    }
  });
}

// ─── RESULT SCREEN MODAL (Fancy, Gamified & Interactive) ───────────────────────────
let resultCountdownTimer = null;
let resultAutoCloseTimer = null;
let confettiAnimId = null;

function launchConfetti(durationMs = 3000) {
  const canvas = DOM.rsConfettiCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth || 390;
  canvas.height = canvas.offsetHeight || 640;

  const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#ffe66d', '#1dd1a1', '#ff9ff3', '#54a0ff'];
  const particles = [];
  const count = 52;

  for (let i = 0; i < count; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() * 60 - 30),
      y: canvas.height * 0.32,
      vx: (Math.random() - 0.5) * 9,
      vy: -(Math.random() * 8 + 5),
      size: Math.random() * 7 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 14,
      gravity: 0.24,
      shape: Math.random() > 0.4 ? 'rect' : 'circle',
    });
  }

  const startTime = Date.now();
  cancelAnimationFrame(confettiAnimId);

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const elapsed = Date.now() - startTime;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.rotSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    if (elapsed < durationMs) {
      confettiAnimId = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  confettiAnimId = requestAnimationFrame(draw);
}

function animateWinAmount(targetAmt, durationMs = 650) {
  if (!DOM.rsWinAmt) return;
  const start = 0;
  const startTime = performance.now();

  function updateNumber(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / durationMs);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (targetAmt - start) * ease);
    DOM.rsWinAmt.textContent = `+${fmt(current)}`;

    if (progress < 1) {
      requestAnimationFrame(updateNumber);
    } else {
      DOM.rsWinAmt.textContent = `+${fmt(targetAmt)}`;
    }
  }

  requestAnimationFrame(updateNumber);
}

function showResultScreen({ roundNumber, winnerId, winnerFood, winnerIds, specialEvent, specialTitle, topWinners, personal }) {
  const isSpecial = !!specialEvent;
  const isVeggies = specialEvent === 'all_vegetables';
  const isPizza = specialEvent === 'pizza_fire';

  if (DOM.rsDrawingText) {
    if (isVeggies) DOM.rsDrawingText.textContent = `🥗 ALL VEGETABLES FEAST`;
    else if (isPizza) DOM.rsDrawingText.textContent = `🔥 PIZZA FIRE (MEAT & FISH)`;
    else if (specialTitle) DOM.rsDrawingText.textContent = `⭐ ${specialTitle.toUpperCase()}`;
    else DOM.rsDrawingText.textContent = `ROUND ${pad4(roundNumber)} WINNER`;
  }

  DOM.rsFlyFood.textContent = winnerFood.emoji;
  if (DOM.rsWinnerName) {
    if (isVeggies) DOM.rsWinnerName.textContent = 'All 4 Vegetables Win!';
    else if (isPizza) DOM.rsWinnerName.textContent = 'All Meat & Fish Win!';
    else DOM.rsWinnerName.textContent = winnerFood.name;
  }
  if (DOM.rsWinnerMult) {
    DOM.rsWinnerMult.textContent = isSpecial ? 'ALL HIT!' : `${winnerFood.multiplier}X`;
  }

  if (DOM.rsResultLabel) DOM.rsResultLabel.textContent = isSpecial ? `Special Drop Round #${pad4(roundNumber)}:` : `The ${pad4(roundNumber)} round's results:`;
  if (DOM.rsResultFood) DOM.rsResultFood.textContent = winnerFood.emoji;
  if (DOM.rsCardMultBadge) DOM.rsCardMultBadge.textContent = isSpecial ? 'COMBO' : `${winnerFood.multiplier}X`;

  const hasBet = personal && personal.totalBet > 0;
  const won    = personal && personal.won;

  // Reset emotion classes
  if (DOM.rsEmotionBox) DOM.rsEmotionBox.className = 'rs-outcome-banner';

  if (won) {
    playJackpotFanfare();
    if (DOM.rsEmotionBox) DOM.rsEmotionBox.classList.add('win');
    DOM.rsEmotion.textContent = '🤩';

    if (isSpecial) {
      const wonItemsList = Array.isArray(personal.wonItems) && personal.wonItems.length > 0
        ? `<div style="margin-top:6px; font-size:12px; opacity:0.95; line-height:1.4;">${personal.wonItems.map(w => `<span style="display:inline-block; margin:2px 4px; padding:2px 6px; background:rgba(0,0,0,0.3); border-radius:6px;">${w.emoji} ${w.name} (${w.multiplier}X): +${fmt(w.winAmount)}</span>`).join('')}</div>`
        : '';
      DOM.rsResultMsg.innerHTML = `🎉 <strong>SPECIAL EVENT WINNER!</strong><br><strong>${specialTitle || winnerFood.name}</strong>${wonItemsList}`;
    } else {
      DOM.rsResultMsg.innerHTML = `🎉 <strong>YOU WON BIG!</strong><br>Won at <strong>${winnerFood.name} (${winnerFood.multiplier}X)</strong>`;
    }
    DOM.rsResultMsg.className = 'rs-result-msg win';

    if (DOM.rsWinCallout) DOM.rsWinCallout.style.display = 'flex';
    animateWinAmount(personal.winAmount);
    launchConfetti(3200);
  } else if (hasBet) {
    playLose();
    if (DOM.rsEmotionBox) DOM.rsEmotionBox.classList.add('loss');
    DOM.rsEmotion.textContent = '😰';
    if (isSpecial) {
      DOM.rsResultMsg.innerHTML = `Special Event Round Finished!<br><strong>${specialTitle || winnerFood.name}</strong><br>Next round is your lucky one! 🍀`;
    } else {
      DOM.rsResultMsg.innerHTML = `Hard luck this round!<br><strong>Next round is your lucky one! 🍀</strong>`;
    }
    DOM.rsResultMsg.className = 'rs-result-msg';
    if (DOM.rsWinCallout) DOM.rsWinCallout.style.display = 'none';
  } else {
    DOM.rsEmotion.textContent = isVeggies ? '🥗' : isPizza ? '🍕' : '😋';
    if (isSpecial) {
      DOM.rsResultMsg.innerHTML = `Special Event Finished: <strong>${specialTitle || winnerFood.name}</strong><br><strong>Place chips now to win up to 45X!</strong>`;
    } else {
      DOM.rsResultMsg.innerHTML = `Round ${pad4(roundNumber)} finished!<br><strong>Place chips now to win up to 45X!</strong>`;
    }
    DOM.rsResultMsg.className = 'rs-result-msg';
    if (DOM.rsWinCallout) DOM.rsWinCallout.style.display = 'none';
  }

  // Render Top 3 Winners in Podium Order [Rank 2, Rank 1, Rank 3]
  renderTopWinnersPodium(topWinners);

  // Display overlay
  DOM.rsOverlay.style.display = 'flex';
  DOM.rsOverlay.setAttribute('aria-hidden', 'false');

  // Countdown timer inside badge (starts at 3s)
  let cd = 3;
  DOM.rsCd.textContent = `${cd}s`;
  if (DOM.rsContinueProgress) DOM.rsContinueProgress.style.width = '0%';

  clearInterval(resultCountdownTimer);
  const totalMs = 3800;
  const startTime = Date.now();

  resultCountdownTimer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const pct = Math.min(100, (elapsed / totalMs) * 100);
    if (DOM.rsContinueProgress) DOM.rsContinueProgress.style.width = `${pct}%`;

    const remainingSec = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
    DOM.rsCd.textContent = `${remainingSec}s`;

    if (elapsed >= totalMs) {
      clearInterval(resultCountdownTimer);
      closeResult();
    }
  }, 40);

  // Auto-close overlay fallback
  clearTimeout(resultAutoCloseTimer);
  resultAutoCloseTimer = setTimeout(closeResult, totalMs + 150);
}

function closeResult() {
  DOM.rsOverlay.style.display = 'none';
  DOM.rsOverlay.setAttribute('aria-hidden', 'true');
  clearInterval(resultCountdownTimer);
  clearTimeout(resultAutoCloseTimer);
  cancelAnimationFrame(confettiAnimId);
  if (DOM.rsConfettiCanvas) {
    const ctx = DOM.rsConfettiCanvas.getContext('2d');
    ctx.clearRect(0, 0, DOM.rsConfettiCanvas.width, DOM.rsConfettiCanvas.height);
  }
}

// Close button on result screen topbar & backdrop click
const rsBackBtn = qs('.rs-back-btn');
if (rsBackBtn) rsBackBtn.addEventListener('click', closeResult);

DOM.rsOverlay.addEventListener('click', e => {
  if (e.target === DOM.rsOverlay) {
    closeResult();
  }
});
if (DOM.rsContinueBtn) DOM.rsContinueBtn.addEventListener('click', closeResult);

// Topbar Back Button (Sends close/back action to mobile app WebView host)
const topbarBackBtn = qs('.topbar .back-btn');
if (topbarBackBtn) {
  topbarBackBtn.addEventListener('click', () => {
    if (window.BigEaterHost && typeof window.BigEaterHost.onBack === 'function') {
      window.BigEaterHost.onBack();
    } else if (window.FlutterChannel && typeof window.FlutterChannel.postMessage === 'function') {
      window.FlutterChannel.postMessage(JSON.stringify({ event: 'close' }));
    } else if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
      window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'close' }));
    } else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.bigEater) {
      window.webkit.messageHandlers.bigEater.postMessage({ event: 'close' });
    } else if (window.AndroidBridge && typeof window.AndroidBridge.postMessage === 'function') {
      window.AndroidBridge.postMessage(JSON.stringify({ event: 'close' }));
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'BIG_EATER_CLOSE' }, '*');
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      showToast('Exit game');
    }
  });
}

// ─── Rules & History Modals ───────────────────────────────────────────────────
function openRuleModal() {
  if (!DOM.ruleModal) return;
  DOM.ruleModal.style.display = 'flex';
  DOM.ruleModal.setAttribute('aria-hidden', 'false');
  playClick();
}

function closeRuleModal() {
  if (!DOM.ruleModal) return;
  DOM.ruleModal.style.display = 'none';
  DOM.ruleModal.setAttribute('aria-hidden', 'true');
}

function openHistoryModal() {
  if (!DOM.historyModal) return;
  DOM.historyModal.style.display = 'flex';
  DOM.historyModal.setAttribute('aria-hidden', 'false');
  renderHistoryModalContent();
  playClick();
}

function closeHistoryModal() {
  if (!DOM.historyModal) return;
  DOM.historyModal.style.display = 'none';
  DOM.historyModal.setAttribute('aria-hidden', 'true');
}

// ─── Trend Details Modal Controller (Exact Reference Replica) ────────────────
const TREND_FOOD_LIST = [
  { id: 0, name: 'Sausage',  emoji: '🍖' },
  { id: 1, name: 'Chicken',  emoji: '🍗' },
  { id: 2, name: 'Shrimp',   emoji: '🦐' },
  { id: 3, name: 'Steak',    emoji: '🥩' },
  { id: 4, name: 'Tomato',   emoji: '🍅' },
  { id: 5, name: 'Radish',   emoji: '🌸' },
  { id: 6, name: 'Mushroom', emoji: '🍄' },
  { id: 7, name: 'Corn',     emoji: '🌽' },
  { id: 8, name: 'Pizza',    emoji: '🍕', isSpecial: 'pizza' },
  { id: 9, name: 'Salad',    emoji: '🥗', isSpecial: 'salad' },
];

function getNormalizedHistory() {
  const currentRound = S.roundNumber || 388;
  const history = Array.isArray(S.history) ? [...S.history] : [];
  
  // Sort descending (newest first)
  history.sort((a, b) => (b.round_number || 0) - (a.round_number || 0));

  // Ensure at least 15 valid rounds for accurate 9-column matrix and 10-badge strip
  const defaultWinners = [5, 3, 7, 7, 7, 0, 0, 1, 3, 6, 2, 4, 1, 0, 5];
  while (history.length < 15) {
    const idx = history.length;
    const lastRound = history.length > 0 ? history[history.length - 1].round_number - 1 : (currentRound - 1);
    history.push({
      round_number: lastRound,
      winner_id: defaultWinners[idx % defaultWinners.length],
    });
  }
  return history;
}

function enableDragToSlide(el) {
  if (!el || el.dataset.dragEnabled) return;
  el.dataset.dragEnabled = 'true';
  let isDown = false;
  let startX;
  let scrollLeft;

  el.addEventListener('mousedown', (e) => {
    isDown = true;
    el.classList.add('is-dragging');
    startX = e.pageX - el.offsetLeft;
    scrollLeft = el.scrollLeft;
  });

  el.addEventListener('mouseleave', () => {
    isDown = false;
    el.classList.remove('is-dragging');
  });

  el.addEventListener('mouseup', () => {
    isDown = false;
    el.classList.remove('is-dragging');
  });

  el.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.4;
    el.scrollLeft = scrollLeft - walk;
  });
}

function renderHistoryModalContent() {
  if (!DOM.trendStrip || !DOM.trendGraphGrid) return;

  const stripWrapper = document.getElementById('trend-strip-wrapper');
  const graphViewport = document.getElementById('trend-graph-viewport');
  const prevStripScroll = stripWrapper ? stripWrapper.scrollLeft : 0;
  const prevGraphScroll = graphViewport ? graphViewport.scrollLeft : 0;

  const history = getNormalizedHistory();
  const numMatrixCols = 16;
  const cols = history.slice(0, numMatrixCols); // 16 columns for horizontal sliding

  // 1. Render Top Winning Sequence Strip (Up to 30 past badges: 1st Orange, next 29 Green)
  DOM.trendStrip.innerHTML = '';
  const stripRounds = history.slice(0, 30);
  stripRounds.forEach((round, idx) => {
    const food = TREND_FOOD_LIST.find(f => f.id === round.winner_id) || TREND_FOOD_LIST[0];
    const badge = document.createElement('div');
    badge.className = `trend-badge ${idx === 0 ? 'is-newest' : 'is-past'}`;
    badge.title = `Round ${round.round_number}: ${food.name}`;
    badge.textContent = food.emoji;
    DOM.trendStrip.appendChild(badge);
  });

  // Enable drag and swipe sliding on strip wrapper & preserve scroll
  if (stripWrapper) {
    enableDragToSlide(stripWrapper);
    if (prevStripScroll > 0) {
      stripWrapper.scrollLeft = prevStripScroll;
    }
  }

  // 2. Render Left Fixed Column: 10 Food Option Badges (Stationary — does not slide)
  const foodsCol = document.getElementById('trend-foods-col') || DOM.trendFoodsCol;
  if (foodsCol) {
    foodsCol.innerHTML = '';
    const spacer = document.createElement('div');
    spacer.className = 'trend-food-spacer';
    foodsCol.appendChild(spacer);

    TREND_FOOD_LIST.forEach(food => {
      const badge = document.createElement('div');
      badge.className = 'trend-food-badge';
      badge.textContent = food.emoji;
      badge.title = food.name;
      foodsCol.appendChild(badge);
    });
  }

  // 3. Render Trend Graph Grid: Headers + 10 food rows (Slides smoothly)
  DOM.trendGraphGrid.innerHTML = '';
  DOM.trendGraphGrid.style.setProperty('--matrix-cols', cols.length);

  // Top Header Row: Round Numbers
  cols.forEach(col => {
    const th = document.createElement('div');
    th.className = 'trend-header-cell';
    th.textContent = col.round_number;
    DOM.trendGraphGrid.appendChild(th);
  });

  // Calculate miss counts for each food across displayed columns
  const baseSeeds = [5, 7, 14, 1, 13, 10, 10, 2];

  TREND_FOOD_LIST.forEach((food) => {
    // Columns 0 to N: Either Win Node or Miss Count
    cols.forEach((col, colIdx) => {
      const cell = document.createElement('div');
      cell.className = 'trend-cell';

      if (food.isSpecial === 'pizza') {
        cell.classList.add('special-pizza');
        cell.textContent = '500+';
      } else if (food.isSpecial === 'salad') {
        cell.textContent = String(58 - colIdx);
      } else {
        if (col.winner_id === food.id) {
          const winNode = document.createElement('div');
          winNode.className = `trend-win-node ${colIdx === 0 ? 'is-newest' : 'is-past'}`;
          winNode.dataset.col = String(colIdx);
          winNode.textContent = food.emoji;
          cell.appendChild(winNode);
        } else {
          let miss = 1;
          let found = false;
          for (let k = colIdx + 1; k < history.length; k++) {
            if (history[k].winner_id === food.id) {
              found = true;
              break;
            }
            miss++;
          }
          if (!found) {
            miss += (baseSeeds[food.id] || 3) - 1;
          }
          cell.textContent = String(miss);
        }
      }
      DOM.trendGraphGrid.appendChild(cell);
    });
  });

  // Enable drag and swipe sliding on graph viewport & preserve scroll
  if (graphViewport) {
    enableDragToSlide(graphViewport);
    if (prevGraphScroll > 0) {
      graphViewport.scrollLeft = prevGraphScroll;
    }
  }

  // 4. Connect Trend Nodes with Green SVG Polyline
  requestAnimationFrame(updateTrendPolyline);
  setTimeout(updateTrendPolyline, 60);
}

function updateTrendPolyline() {
  const inner = document.getElementById('trend-graph-inner');
  if (!DOM.trendPolyline || !inner || !DOM.trendLineSvg) return;
  const innerRect = inner.getBoundingClientRect();
  if (innerRect.width === 0 || innerRect.height === 0) return;

  const points = [];
  const totalCols = DOM.trendGraphGrid ? DOM.trendGraphGrid.querySelectorAll('.trend-header-cell').length : 16;
  for (let c = 0; c < totalCols; c++) {
    const node = inner.querySelector(`.trend-win-node[data-col="${c}"]`);
    if (node) {
      const nodeRect = node.getBoundingClientRect();
      const x = nodeRect.left + (nodeRect.width / 2) - innerRect.left;
      const y = nodeRect.top + (nodeRect.height / 2) - innerRect.top;
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
  }

  DOM.trendLineSvg.setAttribute('viewBox', `0 0 ${innerRect.width} ${innerRect.height}`);
  DOM.trendPolyline.setAttribute('points', points.join(' '));
}

window.addEventListener('resize', () => {
  if (DOM.historyModal && DOM.historyModal.style.display !== 'none') {
    updateTrendPolyline();
  }
});

// Connect Modal Event Listeners
if (DOM.ruleBtn) DOM.ruleBtn.addEventListener('click', openRuleModal);
if (DOM.ruleModalClose) DOM.ruleModalClose.addEventListener('click', closeRuleModal);
if (DOM.ruleModal) {
  DOM.ruleModal.addEventListener('click', e => {
    if (e.target === DOM.ruleModal) closeRuleModal();
  });
}

if (DOM.recordsBtn) DOM.recordsBtn.addEventListener('click', openHistoryModal);
if (DOM.historyChartBtn) DOM.historyChartBtn.addEventListener('click', openHistoryModal);
if (DOM.historyModalClose) DOM.historyModalClose.addEventListener('click', closeHistoryModal);
if (DOM.historyModal) {
  DOM.historyModal.addEventListener('click', e => {
    if (e.target === DOM.historyModal) closeHistoryModal();
  });
}

// Podium render: Only real winners who placed bets and won
function renderTopWinnersPodium(topWinners) {
  if (DOM.rsWinners) DOM.rsWinners.innerHTML = '';
  const winnersBox = DOM.rsWinnersBox || (DOM.rsWinners ? DOM.rsWinners.closest('.rs-winners-box') : null);

  if (!Array.isArray(topWinners) || topWinners.length === 0) {
    if (winnersBox) winnersBox.style.display = 'none';
    return;
  }

  if (winnersBox) winnersBox.style.display = 'flex';

  let podium = [];
  if (topWinners.length === 1) {
    // 1 winner: center card with crown
    podium = [
      { ...topWinners[0], rankClass: 'rank1', badgeNum: '1', hasCrown: true }
    ];
  } else if (topWinners.length === 2) {
    // 2 winners: Rank 1 first, Rank 2 next
    const r1 = topWinners.find(w => w.rank === 1) || topWinners[0];
    const r2 = topWinners.find(w => w.rank === 2) || topWinners[1];
    podium = [
      { ...r1, rankClass: 'rank1', badgeNum: '1', hasCrown: true },
      { ...r2, rankClass: 'rank2', badgeNum: '2', hasCrown: false }
    ];
  } else {
    // 3 or more winners: Olympic podium [Rank 2 on Left, Rank 1 in Center, Rank 3 on Right]
    const r1 = topWinners.find(w => w.rank === 1) || topWinners[0];
    const r2 = topWinners.find(w => w.rank === 2) || topWinners[1];
    const r3 = topWinners.find(w => w.rank === 3) || topWinners[2];

    podium = [
      { ...r2, rankClass: 'rank2', badgeNum: '2', hasCrown: false },
      { ...r1, rankClass: 'rank1', badgeNum: '1', hasCrown: true  },
      { ...r3, rankClass: 'rank3', badgeNum: '3', hasCrown: false },
    ];
  }

  podium.forEach(p => {
    const card = document.createElement('div');
    card.className = `rs-winner-card ${p.rankClass}`;
    card.innerHTML = `
      <div class="rs-winner-name ${p.rankClass}">${p.displayName || p.name || 'Player'}</div>
      <div class="rs-avatar-wrap">
        ${p.hasCrown ? '<span class="rs-crown" aria-hidden="true">👑</span>' : ''}
        <div class="rs-avatar">${renderAvatarHtml(p.avatar, '😎')}</div>
        <div class="rs-rank-badge">${p.badgeNum}</div>
      </div>
      <div class="rs-winner-coins">
        <span>🟡</span>
        <span>${fmt(p.winAmount || 0)}</span>
      </div>
    `;
    DOM.rsWinners.appendChild(card);
  });
}

// ════════════════════════════════════════════════════════
//   SOCKET.IO REALTIME EVENTS
// ════════════════════════════════════════════════════════
const urlParams = new URLSearchParams(window.location.search);
const isCustomServer = Boolean(urlParams.get('server'));
const socketHost = urlParams.get('server') || window.location.origin;
const socketPath = isCustomServer ? '/socket.io/' : '/games/socket/big_eater/';

const socket = io(socketHost, {
  path: socketPath,
  transports: ['websocket', 'polling'],
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

// Safety timer: Never let the player get stuck indefinitely on the loading splash screen
setTimeout(() => {
  if (!splashDone) {
    console.log('[Big Eater] Finishing splash screen via fallback timer');
    finishSplash();
  }
}, 3200);

// ── Connected ──
socket.on('connect', () => {
  console.log('🔌 Connected:', socket.id);
  const meta = getPlayerMeta();
  socket.emit('player:join', {
    sessionId: SESSION_ID,
    name: meta.name,
    avatar: meta.avatar,
    balance: meta.balance,
  });
});

socket.on('disconnect', reason => {
  showToast('⚠️ Connection lost... reconnecting');
  console.warn('Disconnected:', reason);
});

socket.on('connect_error', () => {
  showToast('⚠️ Server unreachable, retrying...');
});

// ── Initial State ──
socket.on('player:state', ({ player, game, foods, history, chipAmounts }) => {
  S.foods       = foods;
  S.roundNumber = game.roundNumber;
  S.phase       = game.phase;
  S.remaining   = game.remaining;

  setBalance(player.balance, player.today_profit);
  if (DOM.playerProfilePill) {
    if (DOM.playerProfileAvatar) DOM.playerProfileAvatar.innerHTML = renderAvatarHtml(player.avatar, '😎');
    if (DOM.playerProfileName) DOM.playerProfileName.textContent = player.name || 'Player';
    DOM.playerProfilePill.style.display = 'inline-flex';
  }
  renderGrid();
  renderRulesOdds(foods);
  renderHistory(history);
  if (Array.isArray(chipAmounts)) renderBetAmountButtons(chipAmounts);

  DOM.roundText.textContent = `Round ${pad4(game.roundNumber)}`;
  updateTimer(game.remaining);

  if (game.phase === 'revealing') {
    DOM.timerPill.classList.add('revealing');
    if (game.winnerId !== null) markWinner(game.winnerId);
  }

  updateBetStats(game.betStats);
  finishSplash();
});

// ── Realtime Chip / Bid Amounts Update ──
socket.on('game:chipsUpdate', ({ chipAmounts }) => {
  if (Array.isArray(chipAmounts) && chipAmounts.length > 0) {
    renderBetAmountButtons(chipAmounts);
    showToast('🪙 Bet amounts updated!');
  }
});

// ── Round Start ──
socket.on('round:start', ({ roundNumber, remaining, foods, history, chipAmounts }) => {
  S.roundNumber        = roundNumber;
  S.phase              = 'betting';
  S.remaining          = remaining;
  S.bets               = {};
  S.lastPersonalResult = null;

  if (Array.isArray(foods) && foods.length > 0) {
    S.foods = foods;
    renderGrid();
    renderRulesOdds(foods);
  }

  if (Array.isArray(chipAmounts) && chipAmounts.length > 0) {
    renderBetAmountButtons(chipAmounts);
  }

  // Real-time history sync: update bottom strip + trend modal if open
  if (Array.isArray(history) && history.length > 0) {
    renderHistory(history);
  }

  DOM.roundText.textContent = `Round ${pad4(roundNumber)}`;
  DOM.timerPill.classList.remove('urgent', 'revealing');
  clearAllStates();
  closeResult();
  updateTimer(remaining);
  lastTickSec = -1;
});

// ── Tick ──
socket.on('round:tick', ({ remaining }) => {
  updateTimer(remaining);
});

// ── Realtime Admin Config Update ──
socket.on('game:configUpdate', ({ foods }) => {
  if (Array.isArray(foods) && foods.length > 0) {
    S.foods = foods;
    renderGrid();
    renderRulesOdds(foods);
    showToast('⚙️ Food multipliers updated live!');
  }
});

// ── Realtime Winning History Update ──
socket.on('history:update', ({ history }) => {
  if (Array.isArray(history)) {
    renderHistory(history);
  }
});

// ── Realtime Admin Pause / Resume ──
socket.on('game:pauseState', ({ isPaused }) => {
  if (isPaused) {
    DOM.timerVal.textContent = '⏸️';
    DOM.timerPill.classList.add('urgent');
    showToast('⏸️ Game paused by Admin');
  } else {
    DOM.timerPill.classList.remove('urgent');
    showToast('▶️ Game resumed');
  }
});

// ── Round Result ──
socket.on('round:result', ({ roundNumber, winnerId, winnerFood, winnerIds, specialEvent, specialTitle, history, topWinners }) => {
  S.phase = 'revealing';
  updateTimer(0);
  DOM.timerPill.classList.add('revealing');

  // Immediately persist history & live-update bottom winning strip and Trend Popup
  if (Array.isArray(history) && history.length > 0) {
    S.history = history;
    renderHistory(history);
  }

  // Spin through all items one by one before landing on the winning food!
  runRouletteSpin(winnerId, () => {
    markWinner(winnerId, winnerIds);
    renderHistory(history);
    playWin();

    // Present the result screen after brief dramatic celebration on board
    setTimeout(() => {
      showResultScreen({
        roundNumber,
        winnerId,
        winnerFood: winnerFood || S.foods[winnerId],
        winnerIds,
        specialEvent,
        specialTitle,
        topWinners: topWinners || [],
        personal:   S.lastPersonalResult,
      });
    }, 750);
  }, specialEvent, winnerIds);
});

// ── Personal Result ──
socket.on('player:result', data => {
  S.lastPersonalResult = data;
  setBalance(data.balance, data.todayProfit);

  // Mobile App In-App WebView Bridge (Flutter / React Native)
  if (window.FlutterChannel && typeof window.FlutterChannel.postMessage === 'function') {
    window.FlutterChannel.postMessage(JSON.stringify({
      event: 'round:result',
      roundNumber: data.roundNumber,
      won: data.won,
      winAmount: data.winAmount,
      totalBet: data.totalBet,
      netProfit: data.netProfit,
      winnerFood: data.winnerFood,
      balance: data.balance,
      todayProfit: data.todayProfit,
    }));
  }
});

// ── Bet Confirmed (Multi-bet support across all 8 foods) ──
socket.on('bet:confirmed', ({ foodId, amount, foodTotal, playerBets, balance }) => {
  S.bets         = playerBets || S.bets;
  S.bets[foodId] = foodTotal;
  S.balance      = balance;
  DOM.balanceNum.textContent = fmt(balance);

  updateFoodBetBadge(foodId, foodTotal);

  const food = S.foods.find(f => f.id === foodId);
  showToast(`✅ ${food?.emoji} ${food?.name} +${fmt(amount)} 🟡`);

  // Mobile App In-App WebView Bridge (Flutter / React Native)
  if (window.FlutterChannel && typeof window.FlutterChannel.postMessage === 'function') {
    window.FlutterChannel.postMessage(JSON.stringify({
      event: 'bet:placed',
      foodId,
      foodName: food?.name,
      amount,
      foodTotal,
      balance,
      roundNumber: S.roundNumber,
    }));
  }
});

// ── Bet Error ──
socket.on('bet:error', ({ message }) => {
  showToast('❌ ' + message);
});

// ── Bet Stats ──
socket.on('round:betStats', stats => {
  updateBetStats(stats);
});

// ── Recharge / Balance Update ──
socket.on('player:update', ({ balance, todayProfit }) => {
  setBalance(balance, todayProfit ?? S.todayProfit);
  showToast('💰 +5,000 coins added!');
  playRecharge();
});

// ── Online count ──
socket.on('stats:players', ({ count }) => {
  DOM.onlineCount.textContent = count;
});
