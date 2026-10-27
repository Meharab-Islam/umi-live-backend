# 🎰 Chinese Live Streaming Fruit Slot Machine (水果老虎机)

A real-time multiplayer casino fruit slot machine game built for Live Streaming Apps (Poppo Live, Uplive, Bigo Live, Tango, etc.) to be embedded inside Flutter WebView bottom sheets or browser apps.

---

## 📸 Design & Architecture Highlights
- **100% Visual Fidelity**: Exactly matches classic live-stream fruit roulette machines:
  - 3D Metallic arcade purple cabinet frame with side neon running LED chaser tubes.
  - Giant 3D Golden **JACKPOT** marquee with angelic wings, red ribbon plaque, and live rolling counter.
  - Three mini multiplier reels `[x2] [x2] [x2]` with animated 3D slot pull lever handle.
  - 3x3 Outer Roulette Fruit Grid with 8 betting fruit options:
    - 🍋 Lemon (5×)
    - 🍇 Raspberry (5×)
    - 🥝 Kiwi (5×)
    - 🫐 Plum (5×)
    - 🍓 Strawberry (10×)
    - 🍌 Banana (10×)
    - 🍉 Watermelon (20×)
    - 🍒 Cherry (45× Super Jackpot)
  - Center 7-segment digital LED countdown clock (`01`) with perimeter LED bulbs.
  - 4 Denominations: `50K`, `100K` (active glowing), `500K`, `1M` with illuminated 3D arcade buttons.
  - Bottom action pills: "Mine 🪙 3,256,751 >", "Today Win 🪙 1,500,000", and "Auto" bet toggle.
  - Max width 450px, responsive on all mobile screens without horizontal scroll.
  - Zero-latency Web Audio API sound synthesizer (coin drops, clicks, roulette ticks, fanfare).

---

## 🚀 Quick Start (Local Development)

### 1. Start Backend:
```bash
cd backend
npm install
node server.js
# Runs on http://localhost:3001
```

### 2. Start Frontend:
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

---

## 🐳 Docker Production Deployment

Run everything (MySQL 8.0, Node.js Backend, Frontend Vite, and Nginx Reverse Proxy) in a single command:

```bash
docker compose up -d --build
```

Access points:
- **Game URL**: `http://localhost/` (or port 8080)
- **API & Health**: `http://localhost/health`
- **Socket.IO Gateway**: `ws://localhost/socket.io/`

---

## 📱 Flutter Live Streaming WebView Bottom Sheet Integration

### Open the Game in Flutter:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_slot_bottom_sheet.dart';

// In your Live Stream Host / Viewer Screen:
void openFruitSlotGame(BuildContext context) {
  showLiveFruitSlotSheet(
    context: context,
    gameUrl: "https://your-domain.com", // Or http://10.0.2.2:3000 for Android emulator
    playerId: "user_9918",
    username: "Alex",
    initialBalance: 5000000,
    onUserWin: (winAmount, fruit) {
      print("🎉 Player won $winAmount on $fruit!");
      // Trigger live stream gift animations or notify audience!
    },
    onUserBet: (betAmount, fruit) {
      print("💰 Player bet $betAmount on $fruit");
    },
    onBalanceChanged: (newBalance) {
      print("👛 Updated Balance: $newBalance");
    },
  );
}
```

---

## 📡 Real-time Webhooks & External Backend Engine

The game engine provides full outgoing webhooks with cryptographic HMAC-SHA256 signature verification, plus bidirectional synchronization REST APIs for external mobile apps (Flutter, React Native, Swift, Kotlin) and custom backends (Node.js, Go, Python, PHP, Java).

### 🛡️ Outgoing Webhook Security Headers
Every webhook HTTP POST sent to your external server contains:
- `Content-Type: application/json`
- `X-Webhook-Event`: The event name (`round_start`, `bet_placed`, `spin_start`, `round_complete`, `player_balance_updated`, `config_updated`, `test_ping`)
- `X-Webhook-Delivery`: Unique UUID for delivery deduplication
- `X-Webhook-Timestamp`: Unix millisecond timestamp
- `X-Webhook-Signature`: `sha256=<hex_digest>` (HMAC-SHA256 generated with your webhook secret)
- `X-Slot-Signature`: Raw hex digest

### 1. Register External Webhook Endpoints
You can register multiple endpoints directly via **Admin Panel UI** (`http://localhost/admin`) or REST API:

```http
POST /api/webhook/register
Content-Type: application/json

{
  "name": "Live Streaming Backend",
  "url": "https://api.yourlivestream.com/webhook/slot-events",
  "secret": "your_secure_secret_key",
  "events": ["round_start", "bet_placed", "spin_start", "round_complete", "player_balance_updated", "config_updated"]
}
```

#### Other Webhook Management APIs:
- `GET /api/webhook/list` — List all registered endpoints, delivery success/fail counts, and last status
- `POST /api/webhook/toggle` — Pause/resume dispatching (`{"id": "wh_xxx", "isActive": false}`)
- `POST /api/webhook/test` — Send a test ping packet (`{"id": "wh_xxx"}`)
- `POST /api/webhook/unregister` — Remove an endpoint (`{"id": "wh_xxx"}`)
- `GET /api/webhook/docs` — Full machine-readable OpenAPI-style JSON documentation

---

### 2. Supported Outgoing Webhook Events & Payloads

#### ① `round_start` (Countdown Begins):
```json
{
  "event": "round_start",
  "roundNumber": 2166,
  "jackpot": 1887773133,
  "countdown": 12,
  "fruitPoolBets": [120000, 200000, 90000, 160000, 280000, 140000, 80000, 40000],
  "fruits": [
    {"name": "Lemon", "multiplier": 5},
    {"name": "Raspberry", "multiplier": 5},
    {"name": "Kiwi", "multiplier": 5},
    {"name": "Plum", "multiplier": 5},
    {"name": "Strawberry", "multiplier": 10},
    {"name": "Banana", "multiplier": 10},
    {"name": "Watermelon", "multiplier": 20},
    {"name": "Cherry", "multiplier": 45}
  ],
  "timestamp": 1728123450000
}
```

#### ② `bet_placed` (Player Bid Placed):
```json
{
  "event": "bet_placed",
  "playerId": "user_9918",
  "username": "Alex",
  "fruitIndex": 7,
  "fruitName": "Cherry",
  "amount": 100000,
  "balance": 4900000,
  "totalPool": 1030000,
  "roundNumber": 2166,
  "timestamp": 1728123455100
}
```

#### ③ `spin_start` (Wheel Spinning):
```json
{
  "event": "spin_start",
  "roundNumber": 2166,
  "targetFruitIndex": 4,
  "targetFruit": "Strawberry",
  "targetPosition": 12,
  "multiplier": 10,
  "miniReels": [2, 2, 2],
  "reelMultiplier": 8,
  "totalMultiplier": 80,
  "totalBets": 1030000,
  "totalPayout": 800000,
  "timestamp": 1728123462000
}
```

#### ④ `round_complete` (Results & Payouts):
```json
{
  "event": "round_complete",
  "roundNumber": 2166,
  "winningFruit": "Strawberry",
  "winningIndex": 4,
  "multiplier": 10,
  "reelMultiplier": 8,
  "totalMultiplier": 80,
  "jackpot": 1887778133,
  "totalBets": 1030000,
  "totalPayout": 800000,
  "playerResults": [
    {
      "playerId": "user_9918",
      "username": "Alex",
      "betOnWinner": 100000,
      "totalBet": 100000,
      "winAmount": 8000000,
      "isWin": true,
      "balance": 12900000,
      "todayWin": 8000000
    }
  ],
  "timestamp": 1728123470000
}
```

#### ⑤ `player_balance_updated` (Balance Change):
```json
{
  "event": "player_balance_updated",
  "playerId": "user_9918",
  "username": "Alex",
  "previousBalance": 4900000,
  "newBalance": 12900000,
  "delta": 8000000,
  "reason": "round_win",
  "timestamp": 1728123470100
}
```

---

### 3. Incoming REST APIs for Your App & Backend

#### 👛 Set / Sync Player Balance:
```http
POST /api/webhook/user/sync-balance
Content-Type: application/json

{
  "playerId": "user_9918",
  "balance": 10000000,
  "username": "Alex",
  "reason": "deposit_or_daily_bonus"
}
```

#### 🪙 Add / Deduct Player Coins:
```http
POST /api/webhook/user/add-coins
Content-Type: application/json

{
  "playerId": "user_9918",
  "amount": 500000,
  "reason": "stream_gift_reward"
}
```

#### 🎲 Remote Bet Placement (from App Native UI):
```http
POST /api/webhook/player/bet
Content-Type: application/json

{
  "playerId": "user_9918",
  "fruitIndex": 7,
  "amount": 100000
}
```

#### 📊 Fetch State & History:
- `GET /api/game/state` — Live phase, countdown, pool bets, jackpot, player stats
- `GET /api/game/history` — Recent round outcomes with multipliers and winning fruits

---

### 4. Direct Flutter / App WebView JavaScript Bridge
When embedding in a WebView (e.g. Flutter `flutter_inappwebview` or `webview_flutter`), the game automatically forwards all events directly to your native app via JavaScript Channel `FlutterSlotChannel`:

```dart
// Flutter InAppWebView setup:
InAppWebView(
  initialUrlRequest: URLRequest(url: WebUri('https://your-slot-game.com/?playerId=$userId')),
  onWebViewCreated: (controller) {
    controller.addJavaScriptHandler(
      handlerName: 'FlutterSlotChannel',
      callback: (args) {
        final event = args[0]['event'];
        final data = args[0]['data'];
        print('📱 Native Flutter received: $event -> $data');
        
        if (event == 'round_result' && data['isWin'] == true) {
          // Trigger floating stream celebration & gifts!
        }
      },
    );
  },
)
```

