# 📈 PaperTrade Simulator

A historical paper trading simulator with AI-powered market commentary. Travel back to any date after 2000 and trade with real historical prices — the AI analyst only knows what was knowable at that point in time.

## Features

- 🕰️ **Time Travel** — Set any simulation date from 2000 to present
- 📊 **Real Historical Data** — Live prices from Yahoo Finance (yfinance)
- 🤖 **AI Market Analyst** — Period-accurate commentary via Claude (Anthropic API)
- 💼 **Portfolio Tracking** — Full P&L, positions, market value
- 🔍 **Stock Search** — Search any ticker or company name
- 📈 **Price Charts** — 30-day rolling chart for the selected period
- 📋 **Trade History** — Full log of all simulated trades

## Tech Stack

- **Frontend**: Next.js 14 + React + Recharts
- **Backend**: Python serverless functions (Vercel)
- **Data**: `yfinance` (Yahoo Finance API — free, no key needed)
- **AI**: Anthropic Claude (claude-sonnet-4-20250514)
- **Deploy**: Vercel

---

## Local Development

### Prerequisites
- Node.js 18+
- Python 3.12+
- An [Anthropic API key](https://console.anthropic.com)

### Setup

```bash
# 1. Clone / enter the project
cd papertrade-simulator

# 2. Install JS dependencies
npm install

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Set your API key
cp .env.local.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# 5. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### `.env.local` example
```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Deploying to Vercel

### Option A: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel

# Set your secret
vercel env add ANTHROPIC_API_KEY
# Paste your key when prompted

vercel --prod
```

### Option B: GitHub + Vercel Dashboard

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Import Project → select your repo
3. In **Environment Variables**, add:
   - `ANTHROPIC_API_KEY` = your key
4. Deploy!

Vercel automatically detects Next.js and the Python API routes.

---

## Project Structure

```
papertrade-simulator/
├── api/
│   ├── stock.py        # Fetches historical stock prices via yfinance
│   ├── search.py       # Stock symbol search
│   └── commentary.py   # AI analyst commentary via Anthropic
├── pages/
│   ├── _app.jsx        # Next.js app shell
│   └── index.jsx       # Main trading dashboard
├── vercel.json         # Vercel config (Python runtime)
├── requirements.txt    # Python deps
├── package.json        # JS deps
└── next.config.js
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/stock?symbol=AAPL&date=2010-01-15` | GET | Historical price + chart data |
| `/api/search?q=apple` | GET | Search tickers/names |
| `/api/commentary` | POST | AI analyst note for given stock+date |

### Commentary POST body
```json
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "date": "2010-06-15",
  "price": 274.98,
  "sector": "Technology"
}
```

---

## Notes

- **No real money** — This is a pure simulator with no brokerage connection
- **Yahoo Finance** — Free, no API key needed; rate limits apply for heavy usage
- **AI accuracy** — The model is instructed to only reference events before the sim date, but results vary; treat as entertainment/education
- **Data availability** — Some tickers may not have data for all historical dates

## License

MIT — use freely for learning, hackathons, or personal projects.
