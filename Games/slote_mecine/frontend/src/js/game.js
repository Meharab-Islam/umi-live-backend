// ═══════════════════════════════════════════════════════════════
//  CHINESE LIVE STREAMING FRUIT SLOT MACHINE - CLIENT ENGINE
//  Real-time Socket.IO, Web Audio Synthesizer, Flutter WebView Bridge
// ═══════════════════════════════════════════════════════════════

import { io } from 'socket.io-client';

// ─── Fruit Configuration (8 outer slots, clockwise) ───────────
// 0: Lemon (5x)       [Top-Left]
// 1: Raspberry (5x)   [Top-Center]
// 2: Kiwi (5x)        [Top-Right]
// 3: Plum (5x)        [Mid-Right]
// 4: Strawberry (10x) [Bottom-Right]
// 5: Banana (10x)     [Bottom-Center]
// 6: Watermelon (20x) [Bottom-Left]
// 7: Cherry (45x)     [Mid-Left]
const CLOCKWISE_FRUITS = [
  { index: 0, id: 'lemon',      name: 'Lemon',      mult: 5,  icon: "images/fruits/lemon.png'      },
  { index: 1, id: 'raspberry',  name: 'Raspberry',  mult: 5,  icon: "images/fruits/raspberry.png'  },
  { index: 2, id: 'kiwi',       name: 'Kiwi',       mult: 5,  icon: "images/fruits/kiwi.png'       },
  { index: 3, id: 'plum',       name: 'Plum',       mult: 5,  icon: "images/fruits/plum.png'       },
  { index: 4, id: 'strawberry', name: 'Strawberry', mult: 10, icon: "images/fruits/strawberry.png' },
  { index: 5, id: 'banana',     name: 'Banana',     mult: 10, icon: "images/fruits/banana.png'     },
  { index: 6, id: 'watermelon', name: 'Watermelon', mult: 20, icon: "images/fruits/watermelon.png' },
  { index: 7, id: 'cherry',     name: 'Cherry',     mult: 45, icon: "images/fruits/cherry.png'     },
];

const FRUIT_AURA_COLORS = {
  0: '#fbbf24', // Lemon (gold)
  1: '#f43f5e', // Raspberry (vivid pink)
  2: '#84cc16', // Kiwi (bright lime)
  3: '#a855f7', // Plum (neon purple)
  4: '#ef4444', // Strawberry (ruby red)
  5: '#eab308', // Banana (amber yellow)
  6: '#10b981', // Watermelon (emerald neon)
  7: '#dc2626', // Cherry (crimson super jackpot)
};

const CHIP_DENOMINATIONS = [
  { amount: 100,   label: '100',  svg: 'images/chips/chip-50k.svg'  },
  { amount: 500,   label: '500',  svg: 'images/chips/chip-100k.svg' },
  { amount: 1000,  label: '1K',   svg: 'images/chips/chip-500k.svg' },
  { amount: 5000,  label: '5K',   svg: 'images/chips/chip-1m.svg'   },
];

// ─── Game State ───────────────────────────────────────────────
let state = {
  playerId: null,
  username: 'Player',
  balance: 0,
  todayWin: 0,
  jackpot: 0,
  roundNumber: 1,
  phase: 'betting', // 'betting' | 'spinning' | 'result'
  countdown: 15,
  selectedChip: 100,
  userBets: {}, // { [fruitIndex]: totalBetAmount }
  lastRoundBets: {}, // For auto-betting
  isAuto: false,
  isMuted: false,
  currentRunnerPos: 0,
  isSpinning: false,
  pendingHistory: null,
  socket: null,
};

// ─── Web Audio API Sound Synthesizer ──────────────────────────
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

const Sound = {
  chip() {
    if (state.isMuted) return;
    try {
      initAudio();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch (e) {}
  },

  tick(freq = 600) {
    if (state.isMuted) return;
    try {
      initAudio();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.04);
    } catch (e) {}
  },

  lever() {
    if (state.isMuted) return;
    try {
      initAudio();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(80, audioCtx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {}
  },

  win() {
    if (state.isMuted) return;
    try {
      initAudio();
      if (!audioCtx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0.35, audioCtx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.1 + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + i * 0.1);
        osc.stop(audioCtx.currentTime + i * 0.1 + 0.4);
      });
    } catch (e) {}
  }
};

// ─── Format Numbers (e.g. 1,887,773,133) ──────────────────────
function fmt(num) {
  return (num || 0).toLocaleString('en-US');
}

function fmtCompact(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
  return num.toString();
}

// ─── Flutter WebView PostMessage & Channel ─────────────────────
function notifyFlutter(event, data = {}) {
  const payload = JSON.stringify({ event, ...data, timestamp: Date.now() });

  // 1. Flutter JavascriptChannel
  if (window.FlutterSlotBridge && window.FlutterSlotBridge.postMessage) {
    window.FlutterSlotBridge.postMessage(payload);
  }
  if (window.FlutterChannel && window.FlutterChannel.postMessage) {
    window.FlutterChannel.postMessage(payload);
  }
  // 2. Flutter InAppWebView JavaScript Handler
  if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
    window.flutter_inappwebview.callHandler('onGameEvent', payload);
  }
  // 3. Android Web Interface
  if (window.AndroidBridge && window.AndroidBridge.postMessage) {
    window.AndroidBridge.postMessage(payload);
  }
  // 4. Standard window postMessage
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(payload, '*');
  }
}

// ─── DOM References ───────────────────────────────────────────
let dom = {};

function cacheDom() {
  dom = {
    loading:         document.getElementById('loading-screen'),
    roundNumber:     document.getElementById('round-number'),
    jackpotCounter:  document.getElementById('jackpot-counter'),
    countdownVal:    document.getElementById('countdown-val'),
    phaseLabel:      document.getElementById('phase-label'),
    balanceValue:    document.getElementById('balance-value'),
    todayWinValue:   document.getElementById('today-win-value'),
    neonCursor:      document.getElementById('neon-cursor'),
    resultList:      document.getElementById('result-history-list'),
    slotLever:       document.getElementById('slot-lever'),
    miniReel1:       document.getElementById('mini-reel-1'),
    miniReel2:       document.getElementById('mini-reel-2'),
    miniReel3:       document.getElementById('mini-reel-3'),
    autoBtn:         document.getElementById('auto-btn'),
    autoBtnText:     document.getElementById('auto-btn-text'),
    soundBtn:        document.getElementById('sound-btn'),
    soundIcon:       document.getElementById('sound-icon'),
    helpBtn:         document.getElementById('help-btn'),
    mineBtn:         document.getElementById('mine-btn'),
    powerBtn:        document.getElementById('power-btn'),
    pingBadge:       document.getElementById('ping-badge'),
    pingText:        document.getElementById('ping-text'),
    // Modals
    winModal:        document.getElementById('win-modal'),
    winCounter:      document.getElementById('win-counter'),
    winMultPill:     document.getElementById('win-multiplier-pill'),
    collectBtn:      document.getElementById('collect-btn'),
    rulesModal:      document.getElementById('rules-modal'),
    closeRulesBtn:   document.getElementById('close-rules-btn'),
    rechargeModal:   document.getElementById('recharge-modal'),
    closeRecharge:   document.getElementById('close-recharge-btn'),
    modalBalance:    document.getElementById('modal-balance-text'),
    coinsLayer:      document.getElementById('coins-layer'),
    toastStack:      document.getElementById('toast-stack'),
    // Dynamic Center Fruit Showcase & Clock Wrap
    centerClockWrap:     document.getElementById('center-clock-wrap'),
    centerFruitShowcase: document.getElementById('center-fruit-showcase'),
    centerShowcaseAura:  document.getElementById('center-showcase-aura'),
    centerShowcaseImg:   document.getElementById('center-showcase-img'),
    centerBadgeName:     document.getElementById('center-badge-name'),
    centerBadgeMult:     document.getElementById('center-badge-mult'),
  };
}

// ─── Initialize Engine ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  parseUrlParams();
  setupEventListeners();
  updateUI();
  updateNeonRunnerPosition(state.currentRunnerPos);
  connectSocket();

  // Hide loader after brief warm-up
  setTimeout(() => {
    if (dom.loading) dom.loading.classList.add('hidden');
  }, 1200);
});

// ─── URL Parameters for Flutter Integration ───────────────────
function parseUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);

  if (urlParams.get('playerId') || urlParams.get('player_id')) {
    state.playerId = urlParams.get('playerId') || urlParams.get('player_id');
  }
  if (urlParams.get('username')) {
    state.username = urlParams.get('username');
  }
  if (urlParams.get('balance')) {
    state.balance = parseInt(urlParams.get('balance')) || state.balance;
  }
  if (urlParams.get('muted') === 'true') {
    state.isMuted = true;
    if (dom.soundIcon) dom.soundIcon.textContent = '🔇';
  }

  // Allow Flutter to pass messages via postMessage
  window.addEventListener('message', (e) => {
    try {
      const msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      if (!msg) return;
      if (msg.type === 'set_balance') {
        state.balance = parseInt(msg.balance);
        updateUI();
      } else if (msg.type === 'bet') {
        placeBetOnFruit(msg.fruitIndex, msg.amount || state.selectedChip);
      }
    } catch (err) {}
  });

  // Expose global bridge for Flutter JavascriptChannel
  window.LiveSlotGame = {
    setBalance: (amt) => { state.balance = parseInt(amt); updateUI(); },
    placeBet: (fruitIndex, amount) => placeBetOnFruit(fruitIndex, amount),
    getState: () => ({ ...state }),
    toggleMute: () => toggleSound(),
  };
}

// ─── Socket.IO Connection ─────────────────────────────────────
function connectSocket() {
  const urlParams = new URLSearchParams(window.location.search);
  const isCustomServer = Boolean(urlParams.get('server'));
  const host = urlParams.get('server') || window.location.origin;
  const socketPath = isCustomServer ? '/socket.io/' : '/games/socket/slote_mecine/';

  const socket = io(host, {
    path: socketPath,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
  });
  state.socket = socket;

  socket.on('connect', () => {
    console.log('Connected to Fruit Slot Server');
    socket.emit('join_game', {
      playerId: state.playerId,
      username: state.username,
      externalBalance: state.balance,
    });
    if (dom.pingText) dom.pingText.textContent = '120ms';
  });

  socket.on('game_state', (data) => {
    state.roundNumber = data.roundNumber;
    state.jackpot     = data.jackpot;
    state.phase       = data.phase;
    state.countdown   = data.countdown;
    if (data.gameConfig?.chipDenominations) {
      updateChipButtons(data.gameConfig.chipDenominations);
    }
    if (data.fruits) {
      updateFruitMultipliers(data.fruits);
    }
    updateUI();
    if (data.phase === 'spinning') {
      state.pendingHistory = data.history || [];
    } else {
      renderHistory(data.history || []);
    }
    if (data.miniReels) updateMiniReels(data.miniReels);

    // Sync active chips on fruits for late joiners!
    if (Array.isArray(data.fruitPoolBets)) {
      clearAllFruitChips();
      data.fruitPoolBets.forEach((poolBet, fIdx) => {
        if (poolBet > 0) {
          const chipCounts = Math.min(4, Math.max(1, Math.floor(poolBet / 100000)));
          for (let c = 0; c < chipCounts; c++) {
            addVisualChipToFruit(fIdx, poolBet);
          }
        }
      });
    }

    // Late joiner handling when joining mid-spin or during result
    if (data.phase === 'spinning') {
      state.isSpinning = true;
      if (dom.phaseLabel) dom.phaseLabel.textContent = 'SPINNING';
      if (dom.countdownVal) dom.countdownVal.textContent = '00';
      startMiniReelsSpin();
      updateCenterFruitShowcase(state.currentRunnerPos, false);

      const elapsed = data.spinElapsedMs || (data.spinStartTime > 0 ? (Date.now() - data.spinStartTime) : 0);
      const remainingMs = Math.max(0, (data.spinDurationMs || 4200) - elapsed);

      if (remainingMs > 600) {
        runRouletteWheel(data.winningIndex, remainingMs, () => {
          stopMiniReels(data.miniReels, data.reelMultiplier);
        });
      } else {
        updateNeonRunnerPosition(data.winningIndex);
        finalizeWinner(data.winningIndex);
        stopMiniReels(data.miniReels, data.reelMultiplier);
      }
    } else if (data.phase === 'result') {
      if (data.winningIndex !== undefined && data.winningIndex !== null) {
        updateNeonRunnerPosition(data.winningIndex);
        finalizeWinner(data.winningIndex);
      }
      if (dom.phaseLabel) dom.phaseLabel.textContent = 'RESULT';
    } else if (data.phase === 'paused' || data.isPaused) {
      if (dom.phaseLabel) dom.phaseLabel.textContent = 'PAUSED';
    } else {
      resetCenterToClock();
    }
  });

  socket.on('config_update', (data) => {
    if (data?.gameConfig?.chipDenominations) {
      updateChipButtons(data.gameConfig.chipDenominations);
    }
    if (data?.fruits) {
      updateFruitMultipliers(data.fruits);
    }
  });

  socket.on('player_joined', (data) => {
    if (data.success && data.player) {
      state.balance  = parseInt(data.player.balance);
      state.todayWin = parseInt(data.player.todayWin);
      updateUI();
    }
  });

  socket.on('timer_tick', (data) => {
    state.countdown   = data.countdown;
    state.jackpot     = data.jackpot;
    state.roundNumber = data.roundNumber;
    state.phase       = data.phase;

    if (dom.countdownVal) {
      dom.countdownVal.textContent = state.countdown.toString().padStart(2, '0');
    }
    if (dom.phaseLabel) {
      dom.phaseLabel.textContent = data.isPaused ? 'PAUSED' : (state.phase === 'spinning' ? 'SPINNING' : 'BETTING');
    }
    if (dom.jackpotCounter) {
      dom.jackpotCounter.textContent = fmt(state.jackpot);
    }

    if (state.countdown <= 3 && state.countdown > 0 && !data.isPaused) {
      Sound.tick(880);
    }
  });

  socket.on('round_spin', (data) => {
    state.phase = 'spinning';
    state.isSpinning = true;
    state.pendingHistory = null;
    if (dom.phaseLabel) dom.phaseLabel.textContent = 'SPINNING';
    if (dom.countdownVal) dom.countdownVal.textContent = '00';

    notifyFlutter('round_spin', data);

    // 1. Pull slot lever
    pullSlotLever();

    // 2. Start mini reels spin
    startMiniReelsSpin();

    // 3. Show center spotlight fruit showcase
    updateCenterFruitShowcase(state.currentRunnerPos, false);

    // 4. Start running light roulette animation
    runRouletteWheel(data.winningIndex, data.spinDurationMs || 4200, () => {
      // Stopped on winner!
      stopMiniReels(data.miniReels, data.reelMultiplier);
    });
  });

  socket.on('round_result', (data) => {
    state.pendingHistory = data.history || [];
    notifyFlutter('round_result', data);
    // Only update history if roulette wheel has already finished spinning and showed result!
    if (!state.isSpinning) {
      setTimeout(() => {
        if (state.pendingHistory) {
          renderHistory(state.pendingHistory);
          state.pendingHistory = null;
        }
      }, 1500);
    }
  });

  socket.on('round_payout', (data) => {
    state.balance  = data.balance;
    state.todayWin = data.todayWin;
    updateUI();

    if (data.isWin && data.winAmount > 0) {
      const modalDelay = state.isSpinning ? 2000 : 800;
      setTimeout(() => {
        showWinModal(data.winningFruit.displayName, data.multiplier, data.winAmount);
        spawnCoinsShower();
        Sound.win();
        notifyFlutter('win', {
          amount: data.winAmount,
          fruit: data.winningFruit.name,
          balance: data.balance,
        });
      }, modalDelay);
    }
  });

  socket.on('round_start', (data) => {
    state.roundNumber = data.roundNumber;
    state.jackpot     = data.jackpot;
    state.countdown   = data.countdown;
    state.phase       = 'betting';
    state.isSpinning  = false;

    notifyFlutter('round_start', data);

    // Flush any pending history before starting new round
    if (state.pendingHistory) {
      renderHistory(state.pendingHistory);
      state.pendingHistory = null;
    }

    // Reset center showcase back to clock mode
    resetCenterToClock();

    // Clear chips and user bets for new round
    clearAllFruitChips();

    // Handle Auto-Betting
    if (state.isAuto && Object.keys(state.lastRoundBets).length > 0) {
      for (const [fruitIdx, betAmt] of Object.entries(state.lastRoundBets)) {
        placeBetOnFruit(parseInt(fruitIdx), parseInt(betAmt));
      }
    }

    updateUI();
  });

  socket.on('room_bet', (data) => {
    // Add visual chip to fruit cell from room
    addVisualChipToFruit(data.fruitIndex, data.amount);
    if (data.jackpot) {
      state.jackpot = data.jackpot;
      if (dom.jackpotCounter) dom.jackpotCounter.textContent = fmt(state.jackpot);
    }
    Sound.chip();
    notifyFlutter('room_bet', data);
  });

  socket.on('admin_announcement', (data) => {
    showToast(`📢 Admin: ${data.message}`, 'toast-admin');
    Sound.lever();
    notifyFlutter('announcement', data);
  });

  socket.on('bet_success', (data) => {
    state.balance  = data.newBalance;
    state.todayWin = data.todayWin;
    updateUI();
    notifyFlutter('bet_placed', {
      fruitIndex: data.fruitIndex,
      amount: data.amount,
      balance: state.balance,
    });
  });

  socket.on('bet_error', (data) => {
    showToast(data.message, 'toast-error');
    notifyFlutter('bet_error', data);
  });

  socket.on('balance_updated', (data) => {
    state.balance = data.balance;
    updateUI();
    notifyFlutter('balance_updated', data);
  });

  socket.on('webhook_event', (payload) => {
    notifyFlutter('webhook_event', payload);
  });
}

// ─── Placing Bets ─────────────────────────────────────────────
function placeBetOnFruit(fruitIndex, amount) {
  initAudio();
  if (state.isSpinning || state.phase !== 'betting') {
    showToast('Wait for next round to bet!', 'toast-error');
    return;
  }

  const betAmount = amount || state.selectedChip;
  if (state.balance < betAmount) {
    showToast('Insufficient coins! Recharge wallet.', 'toast-error');
    return;
  }

  // Deduct balance locally for instant feedback
  state.balance -= betAmount;
  state.userBets[fruitIndex] = (state.userBets[fruitIndex] || 0) + betAmount;
  state.lastRoundBets[fruitIndex] = state.userBets[fruitIndex];

  // Visuals & Sound
  Sound.chip();
  addVisualChipToFruit(fruitIndex, betAmount);
  updateUserBetBadge(fruitIndex, state.userBets[fruitIndex]);
  updateUI();

  // Send to socket
  if (state.socket) {
    state.socket.emit('place_bet', {
      playerId: state.playerId,
      fruitIndex,
      amount: betAmount,
    });
  }
}

function addVisualChipToFruit(fruitIndex, amount) {
  const chipArea = document.getElementById(`chips-${fruitIndex}`);
  if (!chipArea) return;

  const chipImg = document.createElement('img');
  chipImg.className = 'placed-chip-token';

  if (amount >= 1000000) chipImg.src = "images/chips/chip-1m.svg';
  else if (amount >= 500000) chipImg.src = "images/chips/chip-500k.svg';
  else if (amount >= 100000) chipImg.src = "images/chips/chip-100k.svg';
  else chipImg.src = "images/chips/chip-50k.svg';

  // Limit visual chips to 6 to prevent DOM bloat
  if (chipArea.children.length > 5) {
    chipArea.removeChild(chipArea.firstChild);
  }
  chipArea.appendChild(chipImg);
}

function updateUserBetBadge(fruitIndex, total) {
  const badge = document.getElementById(`user-bet-${fruitIndex}`);
  if (!badge) return;
  badge.textContent = fmtCompact(total);
  badge.classList.remove('hidden');
}

function clearAllFruitChips() {
  state.userBets = {};
  for (let i = 0; i < 8; i++) {
    const chipArea = document.getElementById(`chips-${i}`);
    if (chipArea) chipArea.innerHTML = '';
    const badge = document.getElementById(`user-bet-${i}`);
    if (badge) badge.classList.add('hidden');
    const cell = document.getElementById(`cell-${i}`);
    if (cell) cell.classList.remove('winning-flash', 'active-demo');
  }
}

// ─── Roulette Wheel Spin Animation ────────────────────────────
function runRouletteWheel(winningIndex, durationMs, onFinished) {
  const steps = 8;
  let currentPos = state.currentRunnerPos;
  let interval = 50; // Initial speed (ms)
  let elapsed = 0;
  const startTime = Date.now();

  // Highlight cursor active
  if (dom.neonCursor) dom.neonCursor.classList.add('active');

  function step() {
    elapsed = Date.now() - startTime;
    currentPos = (currentPos + 1) % steps;
    state.currentRunnerPos = currentPos;

    updateNeonRunnerPosition(currentPos);
    Sound.tick(400 + currentPos * 50);

    const remainingTime = durationMs - elapsed;

    if (remainingTime <= 0 && currentPos === winningIndex) {
      // Landed on winner!
      state.isSpinning = false;
      state.phase = 'result';
      finalizeWinner(winningIndex);
      if (onFinished) onFinished();

      // Show result on the wheel and center FIRST! Update history list 1.5s AFTER result is shown
      setTimeout(() => {
        if (state.pendingHistory) {
          renderHistory(state.pendingHistory);
          state.pendingHistory = null;
        }
      }, 1500);
      return;
    }

    // Dynamic easing: fast in middle, decelerating near end
    if (remainingTime < 1800) {
      interval = Math.min(380, interval * 1.15);
    } else {
      interval = Math.max(40, interval * 0.95);
    }

    setTimeout(step, interval);
  }

  step();
}

function updateCenterFruitShowcase(posIndex, isWinner = false) {
  if (!dom.centerFruitShowcase || !dom.centerShowcaseImg) return;

  const fruit = CLOCKWISE_FRUITS.find(f => f.index === posIndex) || CLOCKWISE_FRUITS[posIndex];
  if (!fruit) return;

  if (dom.centerClockWrap) dom.centerClockWrap.classList.add('hidden');
  dom.centerFruitShowcase.classList.remove('hidden');

  // ONLY display fruit image — absolutely NO text or labels (even after winning)
  dom.centerShowcaseImg.src = fruit.icon;
  dom.centerShowcaseImg.alt = '';

  const color = FRUIT_AURA_COLORS[fruit.index] || '#facc15';
  if (dom.centerShowcaseAura) {
    dom.centerShowcaseAura.style.background = `radial-gradient(circle, ${color} 0%, transparent 70%)`;
    dom.centerShowcaseAura.style.boxShadow = `0 0 24px ${color}`;
  }

  // Trigger pop animation on change
  dom.centerShowcaseImg.classList.remove('pop-tick');
  void dom.centerShowcaseImg.offsetWidth;
  dom.centerShowcaseImg.classList.add('pop-tick');

  if (isWinner) {
    dom.centerFruitShowcase.classList.add('winner-lock');
  } else {
    dom.centerFruitShowcase.classList.remove('winner-lock');
  }
}

function resetCenterToClock() {
  if (dom.centerClockWrap) dom.centerClockWrap.classList.remove('hidden');
  if (dom.centerFruitShowcase) {
    dom.centerFruitShowcase.classList.add('hidden');
    dom.centerFruitShowcase.classList.remove('winner-lock');
  }
}

function updateNeonRunnerPosition(posIndex) {
  // Grid layout positions for 0..7
  // 0: [row 1, col 1]  (Lemon)
  // 1: [row 1, col 2]  (Raspberry)
  // 2: [row 1, col 3]  (Kiwi)
  // 3: [row 2, col 3]  (Plum)
  // 4: [row 3, col 3]  (Strawberry)
  // 5: [row 3, col 2]  (Banana)
  // 6: [row 3, col 1]  (Watermelon)
  // 7: [row 2, col 1]  (Cherry)
  const posMap = [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
    { row: 1, col: 2 },
    { row: 2, col: 2 },
    { row: 2, col: 1 },
    { row: 2, col: 0 },
    { row: 1, col: 0 },
  ];

  const pos = posMap[posIndex] || posMap[0];
  if (dom.neonCursor) {
    dom.neonCursor.style.top = `${pos.row * 33.333}%`;
    dom.neonCursor.style.left = `${pos.col * 33.333}%`;
    dom.neonCursor.classList.add('active');
  }

  // Remove previous selection styling
  document.querySelectorAll('.fruit-cell').forEach(c => c.classList.remove('selected-runner'));
  const cell = document.getElementById(`cell-${posIndex}`);
  if (cell) cell.classList.add('selected-runner');

  // Center display dynamically showcases current fruit during spin & result!
  if (state.phase === 'spinning' || state.phase === 'result') {
    updateCenterFruitShowcase(posIndex, state.phase === 'result');
  }
}

function finalizeWinner(winningIndex) {
  const winnerCell = document.getElementById(`cell-${winningIndex}`);
  if (winnerCell) {
    winnerCell.classList.add('winning-flash');
  }
  // Lock winner with golden fanfare in center showcase!
  updateCenterFruitShowcase(winningIndex, true);
}

// ─── Slot Lever & Mini Reels ──────────────────────────────────
function pullSlotLever() {
  Sound.lever();
  if (dom.slotLever) {
    dom.slotLever.classList.add('pull-active');
    setTimeout(() => {
      dom.slotLever.classList.remove('pull-active');
    }, 400);
  }
}

function startMiniReelsSpin() {
  [dom.miniReel1, dom.miniReel2, dom.miniReel3].forEach(reel => {
    if (reel) reel.classList.add('spinning');
  });
}

function stopMiniReels(reels = [2, 2, 2], multiplier = 2) {
  [dom.miniReel1, dom.miniReel2, dom.miniReel3].forEach((reel, i) => {
    if (reel) {
      reel.classList.remove('spinning');
      const val = reels[i] || multiplier;
      reel.querySelector('.reel-val').textContent = `×${val}`;
    }
  });
}

function updateMiniReels(reels = [2, 2, 2]) {
  [dom.miniReel1, dom.miniReel2, dom.miniReel3].forEach((reel, i) => {
    if (reel && reels[i]) {
      reel.querySelector('.reel-val').textContent = `×${reels[i]}`;
    }
  });
}

// ─── Result History Row ───────────────────────────────────────
function renderHistory(historyList) {
  if (!dom.resultList) return;
  dom.resultList.innerHTML = '';

  historyList.forEach((item, index) => {
    const isNew = index === 0;
    const pill = document.createElement('div');
    pill.className = `result-pill-item${isNew ? ' is-new-result' : ''}`;

    const fruit = CLOCKWISE_FRUITS.find(f => f.index === item.fruitId) || CLOCKWISE_FRUITS[item.fruitId] || CLOCKWISE_FRUITS[0];
    const img = document.createElement('img');
    img.src = fruit.icon;
    img.alt = fruit.name;
    pill.appendChild(img);

    dom.resultList.appendChild(pill);
  });
}

// ─── Win Celebration Modal & Coins Shower ─────────────────────
function showWinModal(fruitName, mult, amount) {
  if (dom.winCounter) dom.winCounter.textContent = `+${fmt(amount)}`;
  if (dom.winMultPill) dom.winMultPill.textContent = `${fruitName} (Total ×${mult})`;
  if (dom.winModal) dom.winModal.classList.add('open');
}

function spawnCoinsShower() {
  if (!dom.coinsLayer) return;
  for (let i = 0; i < 28; i++) {
    const coin = document.createElement('div');
    coin.className = 'coin-shower-item';
    coin.textContent = '🪙';
    coin.style.left = `${Math.random() * 95}vw`;
    coin.style.animationDelay = `${Math.random() * 0.8}s`;
    coin.style.animationDuration = `${1.2 + Math.random() * 0.8}s`;
    dom.coinsLayer.appendChild(coin);
    setTimeout(() => coin.remove(), 2500);
  }
}

// ─── Event Listeners ──────────────────────────────────────────
function setupEventListeners() {
  // 1. Fruit Cell Clicks (Place Bet)
  CLOCKWISE_FRUITS.forEach(fruit => {
    const cell = document.getElementById(`cell-${fruit.index}`);
    if (cell) {
      cell.addEventListener('click', () => {
        placeBetOnFruit(fruit.index, state.selectedChip);
      });
    }
  });

  // 2. Chip Selector Columns
  document.querySelectorAll('.chip-column').forEach(col => {
    col.addEventListener('click', () => {
      const amt = parseInt(col.dataset.amount) || state.selectedChip;
      selectChip(amt, col);
    });
  });

  // 3. Auto Button Toggle
  if (dom.autoBtn) {
    dom.autoBtn.addEventListener('click', toggleAuto);
  }

  // 4. Sound Button
  if (dom.soundBtn) {
    dom.soundBtn.addEventListener('click', toggleSound);
  }

  // 5. Help / Rules Modal
  if (dom.helpBtn) {
    dom.helpBtn.addEventListener('click', () => {
      if (dom.rulesModal) dom.rulesModal.classList.add('open');
    });
  }
  if (dom.closeRulesBtn) {
    dom.closeRulesBtn.addEventListener('click', () => {
      if (dom.rulesModal) dom.rulesModal.classList.remove('open');
    });
  }

  // 6. Mine / Recharge Modal
  if (dom.mineBtn) {
    dom.mineBtn.addEventListener('click', () => {
      if (dom.modalBalance) dom.modalBalance.textContent = fmt(state.balance);
      if (dom.rechargeModal) dom.rechargeModal.classList.add('open');
    });
  }
  if (dom.closeRecharge) {
    dom.closeRecharge.addEventListener('click', () => {
      if (dom.rechargeModal) dom.rechargeModal.classList.remove('open');
    });
  }

  // Quick Add Coins
  document.querySelectorAll('.quick-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const add = parseInt(btn.dataset.add) || 1000000;
      state.balance += add;
      updateUI();
      if (dom.modalBalance) dom.modalBalance.textContent = fmt(state.balance);
      showToast(`+${fmt(add)} Coins Added!`, 'toast-win');
      Sound.win();
      if (state.socket) {
        state.socket.emit('recharge_coins', { playerId: state.playerId, amount: add });
      }
      notifyFlutter('balance_recharged', { balance: state.balance, added: add });
    });
  });

  // 7. Collect Win Button
  if (dom.collectBtn) {
    dom.collectBtn.addEventListener('click', () => {
      if (dom.winModal) dom.winModal.classList.remove('open');
    });
  }

  // 8. Slot Lever Manual Pull
  if (dom.slotLever) {
    dom.slotLever.addEventListener('click', pullSlotLever);
  }

  // 9. Power Button (Exit / Back)
  if (dom.powerBtn) {
    dom.powerBtn.addEventListener('click', () => {
      notifyFlutter('exit_game');
      showToast('Exit triggered', 'toast-win');
    });
  }
}

function selectChip(amount, colElement) {
  initAudio();
  Sound.chip();
  state.selectedChip = amount;

  document.querySelectorAll('.chip-column').forEach(c => {
    c.classList.remove('active-chip');
    const btn = c.querySelector('.arcade-push-btn');
    if (btn) {
      btn.className = 'arcade-push-btn blue-btn';
    }
  });

  if (colElement) {
    colElement.classList.add('active-chip');
    const btn = colElement.querySelector('.arcade-push-btn');
    if (btn) {
      btn.className = 'arcade-push-btn red-active-btn';
    }
  }
}

function updateChipButtons(chips) {
  if (!chips || !Array.isArray(chips)) return;
  const cols = document.querySelectorAll('.chip-column');
  cols.forEach((col, idx) => {
    const chip = chips[idx];
    if (chip && col) {
      col.dataset.amount = chip.amount;
      const lbl = col.querySelector('.chip-label');
      if (lbl) lbl.textContent = chip.label;
      col.setAttribute('aria-label', `Bid ${chip.label}`);
    }
  });
  const validAmounts = chips.map(c => c.amount);
  if (!validAmounts.includes(state.selectedChip)) {
    const defaultCol = cols[1] || cols[0];
    if (defaultCol) {
      selectChip(parseInt(defaultCol.dataset.amount), defaultCol);
    }
  }
}

function updateFruitMultipliers(fruits) {
  if (!fruits || !Array.isArray(fruits)) return;
  fruits.forEach(f => {
    if (CLOCKWISE_FRUITS[f.index]) {
      CLOCKWISE_FRUITS[f.index].mult = f.multiplier;
    }
    const cell = document.getElementById(`cell-${f.index}`);
    if (cell) {
      const multLabel = cell.querySelector('.fruit-mult-label');
      if (multLabel) {
        multLabel.textContent = `${f.multiplier} times`;
      }
    }
  });
}

function toggleAuto() {
  initAudio();
  state.isAuto = !state.isAuto;
  if (dom.autoBtn) {
    if (state.isAuto) {
      dom.autoBtn.classList.add('auto-active');
      showToast('🤖 Auto-bet Enabled!', 'toast-win');
    } else {
      dom.autoBtn.classList.remove('auto-active');
      showToast('Auto-bet Disabled');
    }
  }
}

function toggleSound() {
  initAudio();
  state.isMuted = !state.isMuted;
  if (dom.soundIcon) {
    dom.soundIcon.textContent = state.isMuted ? '🔇' : '🔊';
  }
  showToast(state.isMuted ? 'Sound Muted' : 'Sound On');
}

function updateUI() {
  if (dom.roundNumber)    dom.roundNumber.textContent = state.roundNumber;
  if (dom.jackpotCounter) dom.jackpotCounter.textContent = fmt(state.jackpot);
  if (dom.balanceValue)   dom.balanceValue.textContent = fmt(state.balance);
  if (dom.todayWinValue)  dom.todayWinValue.textContent = fmt(state.todayWin);
}

function showToast(message, extraClass = '') {
  if (!dom.toastStack) return;
  const toast = document.createElement('div');
  toast.className = `toast-item ${extraClass}`;
  toast.textContent = message;
  dom.toastStack.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
