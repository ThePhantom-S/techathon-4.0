<div align="center">

<img src="https://img.shields.io/badge/CashShock-FinTech%20SME%20Forecaster-FF6B35?style=for-the-badge&logo=lightning&logoColor=white" alt="CashShock Badge" />

# ⚡ FlowShield — SME Cash Flow Predictor

### *AI-Powered Liquidity Intelligence for Small & Medium Enterprises*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

<br/>

> **FlowShield** forecasts future liquidity, identifies the probability and timing of cash-floor breaches, explains the principal financial drivers, stress-tests adverse conditions, and recommends financially feasible actions — all powered by a **deterministic Monte Carlo simulation engine** (not LLM guesswork).

<br/>

[🚀 Live Demo](#-quick-start) · [📖 Documentation](#-architecture) · [🐳 Docker Setup](#-docker--database) · [🔌 API Reference](#-api-reference)

---

</div>

## 📸 Screenshots

| Dashboard — Liquidity Analytics | Decision Simulator — 3D Twin |
|:---:|:---:|
| Real-time breach probability gauge, working capital diagnostics, and 90-day liquidity forecast with Monte Carlo confidence bands | Interactive 3D financial twin with event propagation cascade and counterfactual scenario explorer |

---

## 🎯 Problem Statement

Small businesses frequently encounter unexpected cash shortages because **cash receipts and payments occur at different times**. Future collections, expenses, inventory purchases, and supplier payments are uncertain.

**FlowShield** solves this by providing:

- 📉 **7/30/60/90-day liquidity horizon snapshots** with confidence envelopes
- 🎲 **Monte Carlo breach probability** — 500 simulation runs per forecast
- 🧮 **Working Capital Diagnostics** — DSO, DIO, DPO, and CCC metrics
- ⚡ **Real-time stress testing** — simulate supplier delays, customer advances, procurement cuts
- 🏦 **Live ERP sync** — Zoho Books and QuickBooks OAuth integration
- 🗃️ **Persistent database** — PostgreSQL + Docker with automatic JSON fallback

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FlowShield Platform                             │
│                                                                        │
│  ┌───────────────────────────────────────────────────────────────┐    │
│  │                      Frontend (React 19)                       │    │
│  │                                                                │    │
│  │  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐  │    │
│  │  │Dashboard │  │   Decision   │  │   Data Management      │  │    │
│  │  │Analytics │  │   Simulator  │  │   (CSV + Connectors)   │  │    │
│  │  └────┬─────┘  └──────┬───────┘  └───────────┬────────────┘  │    │
│  │       │               │                        │               │    │
│  │  ┌────▼───────────────▼────────────────────────▼───────────┐  │    │
│  │  │              Simulation Engine  (calculator.ts)           │  │    │
│  │  │   • Monte Carlo (500 runs)  • Cash Roll-Forward Model     │  │    │
│  │  │   • DSO/DIO/DPO/CCC         • Counterfactual Analysis    │  │    │
│  │  │   • P10/P50/P90 percentiles • AR Invoice Risk Profiles   │  │    │
│  │  └────────────────────────────┬──────────────────────────────┘  │    │
│  └───────────────────────────────┼──────────────────────────────┘    │
│                                  │ HTTP / REST                        │
│  ┌───────────────────────────────▼──────────────────────────────┐    │
│  │                    Backend (Express + tsx)                     │    │
│  │                                                                │    │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │    │
│  │  │  /api/      │  │ /api/connect/│  │   AI Explanation   │  │    │
│  │  │  financials │  │  zoho        │  │   (Groq / Gemini)  │  │    │
│  │  │  /import    │  │  quickbooks  │  │                    │  │    │
│  │  │  /reset     │  │  demo        │  │                    │  │    │
│  │  └──────┬──────┘  └──────┬───────┘  └────────────────────┘  │    │
│  └─────────┼────────────────┼──────────────────────────────────┘    │
│            │                │                                         │
│  ┌─────────▼────────┐  ┌────▼──────────────────────────────────┐   │
│  │   PostgreSQL 16  │  │      External ERP APIs                 │   │
│  │   Docker :5433   │  │  Zoho Books API  |  QuickBooks Online  │   │
│  │   + JSON Fallback│  │  India OAuth     |  Sandbox OAuth      │   │
│  └──────────────────┘  └────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
CSV Upload / ERP Connect
        │
        ▼
  ┌─────────────┐    parse     ┌──────────────────┐
  │  csvParser  │────────────▶│  Transaction[]   │
  │   .ts       │             │  Payable[]        │
  └─────────────┘             │  Expense[]        │
                               └────────┬─────────┘
                                        │
                               ┌────────▼─────────┐
                               │ runSimulation     │
                               │ Engine()          │
                               │                   │
                               │  ① Cash Roll-Fwd  │
                               │  ② Monte Carlo×500│
                               │  ③ DSO/DIO/DPO    │
                               │  ④ Horizon Snaps  │
                               │  ⑤ Counterfactuals│
                               └────────┬─────────┘
                                        │
                   ┌────────────────────┼──────────────────────┐
                   ▼                    ▼                       ▼
         BreachProbability      WorkingCapital          HorizonCards
            Gauge (SVG)           Panel                (7/30/60/90d)
                   │                    │                       │
                   └────────────────────┴───────────────────────┘
                                        │
                               LiquidityChart
                           (Confidence Bands + Breach)
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | ≥ 18 | Required |
| **npm** | ≥ 9 | Comes with Node |
| **Docker Desktop** | ≥ 4.x | For PostgreSQL container |
| **Git** | Any | For cloning |

### 1. Clone the Repository

```bash
git clone https://github.com/Jacksonfio/Flowshield.git
cd Flowshield
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```env
# AI Explanation APIs (optional — app works without them)
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
OPENROUTER_API_KEY=your_openrouter_key

# Database (auto-configured for Docker)
DB_HOST=127.0.0.1
DB_PORT=5433
DB_USER=cashshock_user
DB_PASSWORD=cashshock_password
DB_NAME=cashshock_db

# Zoho Books (optional — for live accounting sync)
# ZOHO_CLIENT_ID=
# ZOHO_CLIENT_SECRET=
# ZOHO_ORG_ID=
# ZOHO_REFRESH_TOKEN=

# WhatsApp Cloud API (optional — enables Liquidity Alert & Briefing)
# The access token is a SECRET — it is read server-side only and is never
# exposed to the browser, logged, stored in the DB, or committed to Git.
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=1281259995072776
WHATSAPP_BUSINESS_ACCOUNT_ID=1065939626408167
WHATSAPP_API_VERSION=v21.0
WHATSAPP_RECIPIENT_PHONE=7200905774
WHATSAPP_ENABLED=true
```

### 4. Start PostgreSQL Database via Docker

```bash
docker compose up -d
```

This spins up a PostgreSQL 16 container and auto-seeds the **Shakti Electronics** demo dataset.

> **Note:** If port `5432` is already in use, FlowShield maps to `5433` by default. You can inspect the database in Docker Desktop → `cashshock-db` → **Exec** tab → run `psql -U cashshock_user -d cashshock_db`.

### 5. Start the Development Server

```bash
npm run dev
```

Open **http://localhost:3000** in your browser. 🎉

---

## 🐳 Docker & Database

### Container Overview

```yaml
Container Name:  cashshock-db
Image:           postgres:16-alpine
Host Port:       5433
Database:        cashshock_db
Username:        cashshock_user
Password:        cashshock_password
```

### Database Schema

```sql
┌──────────────────┐   ┌──────────────────────────┐
│  configuration   │   │       transactions         │
│──────────────────│   │──────────────────────────  │
│  id (PK)         │   │  id (PK)                   │
│  current_cash    │   │  date                      │
│  cash_floor      │   │  customer                  │
│  forecast_weights│   │  invoice_amount             │
│  supplier_delay  │   │  expected_payment_date      │
└──────────────────┘   │  collection_probability     │
                        │  status (PENDING/DELAYED)   │
                        └──────────────────────────┘

┌──────────────────┐   ┌──────────────────────────┐
│     payables     │   │         expenses           │
│──────────────────│   │──────────────────────────  │
│  id (PK)         │   │  id (PK)                   │
│  supplier        │   │  date                      │
│  amount          │   │  category                  │
│  due_date        │   │  amount                    │
│  category        │   └──────────────────────────┘
│  status (DUE/..) │
└──────────────────┘   ┌──────────────────────────┐
                        │        audit_logs          │
                        │──────────────────────────  │
                        │  id (SERIAL PK)            │
                        │  timestamp                 │
                        │  action                    │
                        │  details                   │
                        └──────────────────────────┘

WhatsApp notifications are stored in a dedicated `whatsapp_notifications`
table (safe metadata only — no tokens): id, business_id, phone_number,
alert_type, risk_level, breach_probability, message_id, sent_at, status,
error_message, created_at.
```

### Docker Commands

```bash
# Start database container
docker compose up -d

# Check container health
docker ps

# Inspect database (CLI)
docker exec -it cashshock-db psql -U cashshock_user -d cashshock_db

# Stop container
docker compose down

# Wipe and restart fresh
docker compose down -v && docker compose up -d
```

### Resilient Fallback

If PostgreSQL is unavailable, FlowShield **automatically falls back** to a local JSON store (`cashshock_local_db.json`). All reads, writes, and resets work identically — ensuring zero-crash demos.

---

## 🔌 API Reference

### Database / Financial APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/financials` | Load all financial data from database |
| `POST` | `/api/settings` | Save cash floor / delay configuration |
| `POST` | `/api/import` | Bulk import parsed CSV data |
| `POST` | `/api/reset` | Reset to Shakti Electronics baseline |

### Accounting Connectors

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/connect/zoho` | OAuth sync — Zoho Books India |
| `POST` | `/api/connect/quickbooks` | OAuth sync — QuickBooks Online |
| `POST` | `/api/connect/demo` | Load sandbox demo dataset |

### Simulation & Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/simulate/shock` | Run supplier delay stress test |
| `POST` | `/api/simulate/decision` | Evaluate a specific scenario decision |
| `GET` | `/api/business/summary` | Cached liquidity summary |
| `GET` | `/api/audit/:forecastId` | Calculation audit trail |

### AI Explanation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/explain` | Natural-language explanation of forecast drivers |
| `POST` | `/api/voice/intent` | Parse voice input to financial intent |

### Liquidity Alert & Briefing (WhatsApp)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/notifications/whatsapp/status` | Safe integration status + alert preferences (never returns secrets) |
| `POST` | `/api/notifications/whatsapp/test` | Send a simple WhatsApp connectivity test message |
| `POST` | `/api/notifications/whatsapp/send` | Send the latest verified liquidity brief (engine-calculated figures) |
| `POST` | `/api/notifications/whatsapp/settings` | Update automatic alert preferences (threshold + toggles) |
| `POST` | `/api/notifications/whatsapp/evaluate` | Evaluate alert rules against current risk and send due alerts (deduplicated) |

---

## 📲 WhatsApp Liquidity Alert & Briefing

FlowShield can push the owner's verified financial position, 30/90-day forecast, liquidity risk, top drivers, and recommended action to WhatsApp using the official **Meta WhatsApp Cloud API**.

```
React Frontend
      ↓
FlowShield Express Backend
      ↓
Financial Engine (deterministic forecast / risk / decisions)
      ↓
WhatsApp Service  (src/services/whatsapp.ts)
      ↓
Meta WhatsApp Cloud API  →  WhatsApp recipient
```

**Configuration (server-side only):**

| Variable | Purpose |
|----------|---------|
| `WHATSAPP_ACCESS_TOKEN` | Meta WhatsApp Cloud API token (**secret — backend only**) |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID for the sending number |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | WhatsApp Business Account ID (metadata only) |
| `WHATSAPP_API_VERSION` | Graph API version (e.g. `v21.0`; empty defaults to `v21.0`) |
| `WHATSAPP_RECIPIENT_PHONE` | Destination phone number in international/E.164 form |
| `WHATSAPP_ENABLED` | `true`/`false` master switch |

**Security rules:** the access token must remain server-side. It is read via
`process.env.WHATSAPP_ACCESS_TOKEN`, is never sent to the React/Vite frontend,
never logged, never stored in the database, and never returned from an API.
WhatsApp is a **notification channel only** — FlowShield never moves money
through WhatsApp and never gives the integration payment authority.

**Verified numbers only:** every figure in a liquidity brief comes from the
FlowShield deterministic engine (`getFinancials` + `runSimulationEngine`). No
LLM and no service code invents financial values.

**Audit trail:** each send is recorded in the `whatsapp_notifications` table
(alert type, business, risk level, breach probability, Meta message ID,
timestamp, status, failure reason) and mirrored into `audit_logs`. Access
tokens are never persisted.

**Test it locally:**

```bash
# 1. Connectivity test
curl -X POST http://localhost:3000/api/notifications/whatsapp/test

# 2. Send the verified liquidity brief
curl -X POST http://localhost:3000/api/notifications/whatsapp/send

# 3. Inspect safe status
curl http://localhost:3000/api/notifications/whatsapp/status
```

---

## 🧮 Simulation Engine

The heart of FlowShield is a **purely deterministic, auditable simulation engine** in [`src/engine/calculator.ts`](./src/engine/calculator.ts).

### Cash Roll-Forward Model

```
Day[t+1] = Day[t]
         + Σ(Collections arriving on day t × collection_probability)
         − Σ(Payables due on day t)
         − Σ(Expenses on day t)
         + Inventory_Liquidation(t)
```

### Monte Carlo Simulation

```
For each run (n = 1 to 500):
  1. Sample collection timing with ±variability
  2. Sample supplier delay with σ = 3 days
  3. Apply demand shock with 5% probability
  4. Record minimum cash balance reached

Output:
  breachProbability = runs_where_min_cash < cash_floor / 500
  p10Cash = 10th percentile minimum cash
  p50Cash = median minimum cash
  p90Cash = 90th percentile minimum cash
```

### Working Capital Metrics

```
DSO (Days Sales Outstanding)   = AR Balance / (Annual Revenue / 365)
DIO (Days Inventory Outstanding) = Inventory Value / (COGS / 365)
DPO (Days Payable Outstanding)   = AP Balance / (COGS / 365)
CCC (Cash Conversion Cycle)      = DIO + DSO - DPO
```

---

## 📁 Project Structure

```
flowshield/
├── 🐳 docker-compose.yml          # PostgreSQL container definition
├── ⚙️  server.ts                   # Express API server
├── 📄 .env.example                # Environment variable template
│
├── src/
│   ├── 🧠 engine/
│   │   ├── calculator.ts          # Core simulation engine (Monte Carlo)
│   │   ├── csvParser.ts           # Multi-format CSV ingestion engine
│   │   └── sampleData.ts          # Shakti Electronics demo dataset
│   │
│   ├── 🗃️  db/
│   │   ├── index.ts               # PostgreSQL pool + JSON fallback manager
│   │   └── schema.sql             # Table DDL definitions
│   │
│   ├── 🎨 components/
│   │   ├── DashboardAnalytics.tsx # Main analytics dashboard
│   │   ├── LiquidityChart.tsx     # 90-day forecast chart with bands
│   │   ├── BreachProbabilityGauge.tsx # SVG Monte Carlo gauge
│   │   ├── WorkingCapitalPanel.tsx   # DSO/DIO/DPO/CCC diagnostics
│   │   ├── HorizonCards.tsx       # 7/30/60/90d liquidity snapshots
│   │   ├── RecommendationEngine.tsx  # Ranked action cards
│   │   ├── FinancialDecisionTwin.tsx # 3D scenario simulator
│   │   ├── BusinessConnectorModal.tsx # ERP connector (Zoho/QB forms)
│   │   └── DataManagementView.tsx    # CSV upload and data tables
│   │
│   ├── 🔧 context/
│   │   └── ThemeContext.tsx        # Dark/Light mode state
│   │
│   └── 📐 types.ts                # Shared TypeScript interfaces
│
└── 📖 README.md
```

---

## 🔌 Live ERP Integrations

### Zoho Books (India)

1. Go to [Zoho API Console](https://api-console.zoho.in/) → Create a **Server-based App**
2. Add scopes: `ZohoBooks.invoices.READ`, `ZohoBooks.bills.READ`, `ZohoBooks.bankaccounts.READ`
3. Generate a **Refresh Token** using the OAuth flow
4. Click **Connect Business Data** → **Zoho Books Connector** in the app
5. Enter your **Client ID**, **Client Secret**, **Organization ID**, and **Refresh Token**

### QuickBooks Online

1. Go to [Intuit Developer Portal](https://developer.intuit.com/) → Create an app
2. Generate a **Sandbox Access Token** from the OAuth Playground
3. Find your **Company/Realm ID** in the QuickBooks Sandbox portal
4. Click **Connect Business Data** → **QuickBooks Online** in the app
5. Enter your credentials and click **Authorize & Pull Live Sync**

---

## 📊 CSV Import Format

FlowShield auto-detects and parses two CSV formats:

### Format 1: Standard Bank Statement

```csv
Date,Description,Debit,Credit,Balance
2026-10-15,Customer Payment TechCorp,,420000,1660000
2026-10-16,Supplier Payment Global Components,1800000,,
```

### Format 2: CashShock Native Format

```csv
type,date,entity,amount,status,category,extra
transaction,2026-10-15,TechCorp Industries,420000,DELAYED,Collection,0.9
payable,2026-10-16,Global Components,1800000,CRITICAL,Procurement,30
expense,2026-10-05,Staff Payroll,220000,CONFIRMED,OPEX,
```

Download sample templates from the **Data Management** tab inside the app.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 + TypeScript | UI Framework |
| **Build Tool** | Vite 6 | Development server + bundler |
| **Styling** | Tailwind CSS 4 | Utility-first CSS |
| **Charts** | Recharts 3 | Liquidity timeline |
| **3D Rendering** | Three.js | Financial Decision Twin |
| **Animations** | Motion (Framer) | Micro-animations |
| **Icons** | Lucide React | Icon system |
| **Backend** | Express 4 + tsx | REST API server |
| **Database** | PostgreSQL 16 | Persistent financial store |
| **Container** | Docker Compose | Database environment |
| **AI/LLM** | Google Gemini + Groq | Optional explanations |
| **ERP APIs** | Zoho Books + QuickBooks | Live accounting sync |

---

## 🔒 Security Model

- **Zero Transaction Authority** — FlowShield only reads data, never initiates payments or moves funds
- **Zero Credential Storage** — OAuth tokens are used immediately and never stored in plaintext
- **Read-Only OAuth Scopes** — Only requests the minimum invoice/bill/account-balance read permissions
- **Deterministic Engine** — All forecasts are calculable and auditable without LLM involvement
- **Environment Variables** — All secrets managed via `.env`, never committed to Git

---

## 🧪 Development Scripts

```bash
npm run dev       # Start development server (frontend + backend)
npm run build     # Production build (Vite + Express bundle)
npm run start     # Start production server
npm run lint      # TypeScript type check (0 errors required)
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

<div align="center">

**Built for the FinTech Hackathon 2026**

*Forecasting · Financial Planning · Risk Management*

[![GitHub Stars](https://img.shields.io/github/stars/Jacksonfio/Flowshield?style=social)](https://github.com/Jacksonfio/Flowshield)

</div>
