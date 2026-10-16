# ⚡ Umi Live - Backend & Admin Console

Full-stack production-ready live streaming backend API and real-time admin management console built with **Docker**, **Node.js (Express + Socket.IO)**, **React (Vite)**, and **MySQL 8.0**.

---

## 🏗️ Architecture Overview

```text
umi_backend/
├── docker-compose.yml          # Orchestrates MySQL, Node.js Backend, and React Admin Panel
├── .env / .env.example         # Root environment configurations
├── backend/                    # Node.js + Express + Socket.IO + MySQL
│   ├── Dockerfile
│   ├── src/
│   │   ├── server.js           # Server entrypoint with auto-retry DB connection
│   │   ├── config/             # MySQL pool and JWT authentication
│   │   ├── controllers/        # Auth, Live Rooms, Gifts, Wallets, Admin operations
│   │   ├── routes/             # REST endpoints (/api/auth, /api/live, /api/admin, etc.)
│   │   ├── sockets/            # Socket.IO real-time engine (chat, viewer count, gifts)
│   │   └── db/
│   │       ├── schema.sql      # MySQL schema (users, live_rooms, gifts, withdrawals, etc.)
│   │       └── init.js         # Auto database creation & seed migrations
└── admin-panel/                # React (Vite) Admin Console
    ├── Dockerfile              # Multi-stage production Nginx build
    ├── nginx.conf              # SPA routing and reverse proxy
    └── src/
        ├── components/         # Sidebar, Header, StatCard, Modals
        ├── pages/              # Dashboard, LiveStreams, Users, Gifts, Withdrawals, Settings
        └── api.js              # Centralized API client & JWT persistence
```

---

## 🚀 Quick Start with Docker (Recommended)

Make sure Docker Desktop or container engine is running, then run:

```bash
docker compose up --build -d
```

Services will automatically start:
- 🌐 **Admin Panel**: [http://localhost:3000](http://localhost:3000)
- 🚀 **Backend API**: [http://localhost:5050](http://localhost:5050)
- 🗄️ **MySQL Database**: `localhost:3306` (Database: `umi_live`)

To view container logs:
```bash
docker compose logs -f
```

To stop containers:
```bash
docker compose down
```

---

## 🔑 Default Admin & Seed Credentials

The database is automatically pre-seeded on first run:

| Role | Email / User ID | Password | Coins | Diamonds |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `admin` (or `admin@umi.live`) | `admin123` | 100,000 | 50,000 |
| **Demo Host 1** | `nila_live` | `user123` | 5,000 | 18,500 |
| **Demo Host 2** | `rohan_gaming` | `user123` | 8,200 | 24,600 |
| **Demo User** | `tanvir_fan` | `user123` | 25,000 | 450 |

---

## 💻 Running Locally (Without Docker)

If you wish to run the services directly on your machine:

### 1. Start MySQL
Ensure MySQL is running on port 3306 with credentials matching `.env`:
- User: `umi_user` (or `root`)
- Password: `umi_password`
- Database: `umi_live`

### 2. Start Backend
```bash
cd backend
npm install
npm run seed
npm start
```
*(Backend runs on http://localhost:5050)*

### 3. Start React Admin Panel
```bash
cd admin-panel
npm install
npm run dev
```
*(Admin panel runs on http://localhost:5173)*

---

## 📡 API Endpoints Summary

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Create user / broadcaster account
- `POST /api/auth/login` - Authenticate user / admin (returns JWT)
- `GET /api/auth/me` - Current user profile (Bearer token)

### Live Streaming Rooms (`/api/live`)
- `GET /api/live` - List active rooms (category & search filters)
- `GET /api/live/:roomId` - Stream room details & host profile
- `POST /api/live/start` - Broadcaster creates a live room
- `POST /api/live/:roomId/end` - Host terminates live stream

### Virtual Gift Economy (`/api/gifts`)
- `GET /api/gifts` - Available gifts list (rose, heart, car, rocket, dragon, etc.)
- `POST /api/gifts/send` - Send gift in room (atomically deducts user coins, credits host diamonds)

### Wallet & Payouts (`/api/wallet`)
- `GET /api/wallet/balance` - User coin & diamond balances
- `GET /api/wallet/packages` - Available coin purchase packages
- `POST /api/wallet/purchase` - Top-up coins
- `POST /api/wallet/withdraw` - Host submits cashout request (diamonds to USD)
- `GET /api/wallet/transactions` - Financial history

### Admin Console (`/api/admin`) *(Protected: Requires admin role)*
- `GET /api/admin/stats` - High-level metrics, active streams radar & recent gifts
- `GET /api/admin/users` - Paginated user directory with role & ban filters
- `PATCH /api/admin/users/:id` - Ban/unban user or change roles
- `POST /api/admin/users/:id/balance` - Add or deduct coins/diamonds
- `GET /api/admin/streams` - Active & past stream rooms
- `POST /api/admin/streams/:roomId/terminate` - Force close stream for community violations
- `GET /api/admin/gifts` - View all gifts
- `POST /api/admin/gifts` - Create new virtual gift
- `PUT /api/admin/gifts/:id` - Edit gift parameters
- `DELETE /api/admin/gifts/:id` - Delete gift
- `GET /api/admin/withdrawals` - List host payout requests
- `POST /api/admin/withdrawals/:id/process` - Approve or reject payout (auto-refunds on decline)
- `GET /api/admin/settings` - System configurations
- `PUT /api/admin/settings/:key` - Update configuration

### Socket.IO Real-Time Events
- `join-room` / `leave-room` - Real-time presence tracking
- `viewer-count-update` - Live room audience count broadcast
- `send-chat` / `new-chat` - Real-time stream chat messages
- `gift-sent` / `gift-broadcast` - Broadcast animated gift events
- `terminate-stream` - Admin force-closure notification
