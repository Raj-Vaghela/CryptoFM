# Crypto FM — Agentic AI Cryptocurrency Radio

## 1) Overview
Crypto FM is an agentic AI system that continuously ingests cryptocurrency market signals, generates human-quality market analysis with Gemini, and streams a British DJ–style audio broadcast via Google Cloud Text-to-Speech (TTS) to a vintage-styled web UI.

- Hackathon: Encode AI London 2025
- Roles: Data aggregation, agentic analysis, TTS streaming, web UI
- Key APIs: CoinGecko, Whale Alert, CryptoPanic, Google Gemini, Google Cloud TTS

## 2) System Architecture
Components and responsibilities:
- Data API Server (`data-api-server.js`)
  - Aggregates global market, top/trending, and detailed coin data (CoinGecko)
  - Ingests whale transactions (Whale Alert)
  - Fetches news (CoinGecko/CryptoPanic)
  - Generates simulated exchange flows (`exchange-flow.js`)
  - Stores latest snapshot in-memory and logs everything to `logs/`
  - Exposes REST endpoints consumed by agents and UI
- Data Logger (`server.js`)
  - Headless continuous logging with heartbeats, memory telemetry, and robust error capture
- Voice Service (`voice-server.js`, `voice-management.js`)
  - Manages a script queue and segment lifecycle (pending -> ready -> spoken)
  - Generates MP3s via Google Cloud TTS and streams audio directly at `/api/stream-audio/:segmentId`
  - Periodic script ingestion from `scripts/full-script.txt`, automated cleanup/retention
- Analyst Agent (`data-analyst-agent.js`)
  - Pulls latest data from the Data API
  - Prompts Gemini 2.0 Flash to produce a professional Markdown market report
  - Saves timestamped reports to `reports/` and updates `latest-report.md`
- CLI Broadcaster (`radio.js`)
  - Terminal-driven “DJ” that can run markets/whales/news/track/interval/coindata flows
- Operator Utilities
  - `agent-control.js`: menu-style launcher and config checker
  - `monitor.js`: process monitor with auto-restart
  - `exchange-flow.js`: simulated inflow/outflow analytics
- Frontend UI (`public/`)
  - Vintage radio interface with custom volume slider, status LEDs, scrolling ticker
  - Autoplays streamed segments and shows connection state

## 3) Data Flow (Happy Path)
1. Data API Server fetches global market, top/trending, and detailed coin data from CoinGecko with quota-aware rate-limiting.
2. Whale Alert transactions and news (CoinGecko/CryptoPanic) are ingested; simulated exchange flows are generated.
3. Analyst Agent polls the Data API and generates a structured Markdown report with Gemini; files written to `reports/`.
4. Voice Service ingests new script text from `scripts/full-script.txt`, enqueues as segments, generates TTS and streams to the browser.
5. Web UI requests `/api/next-segment` or streams directly via `/api/stream-audio/:segmentId`, updates status LEDs, and autoplays.

## 4) External Integrations
- CoinGecko: markets, trending, top coins, and per-coin details (with conservative request limits)
- Whale Alert: high-value transfers (>$1M)
- CryptoPanic: news fallback when CoinGecko news is unavailable
- Google Cloud TTS: British/US voices, MP3 output; streaming and file-based generation
- Google Gemini 2.0 Flash: analyst report creation via `@google/generative-ai`

## 5) API Reference (Selected)
Data API (`data-api-server.js` on API_PORT):
- GET `/health` – health check
- GET `/api/status` – snapshot metadata + availability
- GET `/api/data/all` – aggregate of all datasets
- GET `/api/data/market-global|top-coins|trending-coins|detailed-coins|whale-transactions|crypto-news|exchange-flows`
- POST `/api/actions/fetch` – start a background fetch cycle

Voice API (`voice-server.js` on VOICE_PORT):
- GET `/api/check-new-segments` – process `full-script.txt`, detect new segment
- GET `/api/next-segment` – returns next segment; generates audio if needed
- POST `/api/mark-spoken/:id` – finalize lifecycle state
- POST `/api/regenerate-audio/:id` – force TTS regeneration
- POST `/api/cleanup` – retention cleanup
- GET `/api/status` – voice system diagnostics
- GET `/api/stream-audio/:segmentId` – stream TTS audio

## 6) Rate Limiting & Resilience
- CoinGecko: minute-window counters, minimum inter-call spacing (3–6s), sequential orchestration, and 429 cool-off.
- Error handling: retries/backoff, structured error logs with stack traces, graceful shutdowns on signals.
- Observability: heartbeats, memory telemetry, status logs; monitor with auto-restart.

## 7) TTS Pipeline
- Segment queue persisted in `scripts/queue.json`
- Generation modes: file-based MP3 and on-demand streaming
- Lifecycle: `pending -> ready -> spoken` with timestamps; daily cleanup of aged spoken segments
- Frontend audio autostart with retry/backoff and status indicators

## 8) Analyst Agent & Prompting
- Depth-limited serialization of large JSON to control token costs
- Breaking news triage (keyword-based) + structured report sections
- Retry loop with exponential backoff and 429-aware delays

## 9) Frontend UX
- Vintage radio theme with responsive layout
- Custom touch/mouse-enabled horizontal volume slider
- LIVE indicator LEDs (playing/paused/error/disconnected)
- Ticker tape for dynamic highlights

## 10) Setup & Running
Prerequisites: Node.js v16+, npm, API keys (.env)

Install
```bash
npm install
```

Run everything
```bash
npm run start:all
```

Run services individually
```bash
npm run api
npm run voice
npm run analyst
npm run start:logger
npm run start:monitor
```

Access
- Voice/UI: `http://localhost:${VOICE_PORT or 3001}`
- Data API: `http://localhost:${API_PORT or 3000}`

## 11) Directory Highlights
- `public/` – UI files (`index.html`, `app.js`, `style.css`)
- `reports/` – Gemini-generated Markdown reports
- `scripts/` – TTS queue, current/spoken audio, `full-script.txt`
- `logs/` – persisted fetch cycles, system, coin and status logs

## 12) Security & Configuration
Environment variables
- `COINGECKO_API_KEY`, `WHALE_ALERT_API_KEY`, `CRYPTO_PANIC_API_KEY`, `GOOGLE_CLOUD_TTS_API_KEY`, `GEMINI_API_KEY`
Notes
- Do not commit `.env` or keys; remove any hardcoded defaults before publishing

## 13) Known Limitations
- Some data sources (e.g., exchange flows) are simulated due to paid API constraints
- Overlapping `/api/status` naming across services requires port clarity in docs
- In-memory cache in the API server; consider persistence for durability

## 14) Future Work
- Auth and rate limiting on public endpoints; per-client quotas
- Persistent database cache with TTL; metrics dashboard and structured JSON logs
- Expand agentic behaviors (automated storyboarding of segments; contextual continuity across broadcasts)
- WebSocket push for live updates and typed SDK for the frontend

## 15) Credits
- Google Cloud Text-to-Speech, Google Gemini
- CoinGecko, Whale Alert, CryptoPanic
- Bootstrap, jQuery
