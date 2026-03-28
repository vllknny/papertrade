// pages/api/search.js
// Works in Next.js dev server AND Vercel (falls back to Python api/search.py on Vercel)

const POPULAR = {
  AAPL: "Apple Inc.", MSFT: "Microsoft Corporation", GOOGL: "Alphabet Inc.",
  AMZN: "Amazon.com Inc.", META: "Meta Platforms Inc.", TSLA: "Tesla Inc.",
  NVDA: "NVIDIA Corporation", JPM: "JPMorgan Chase & Co.", V: "Visa Inc.",
  JNJ: "Johnson & Johnson", WMT: "Walmart Inc.", PG: "Procter & Gamble Co.",
  MA: "Mastercard Incorporated", UNH: "UnitedHealth Group", HD: "The Home Depot",
  BAC: "Bank of America Corp", DIS: "The Walt Disney Company", ADBE: "Adobe Inc.",
  NFLX: "Netflix Inc.", CRM: "Salesforce Inc.", INTC: "Intel Corporation",
  AMD: "Advanced Micro Devices", PYPL: "PayPal Holdings", UBER: "Uber Technologies",
  SPOT: "Spotify Technology", SNAP: "Snap Inc.", IBM: "International Business Machines",
  GE: "General Electric Co.", F: "Ford Motor Company", GM: "General Motors",
  BA: "Boeing Co.", GS: "Goldman Sachs Group", MS: "Morgan Stanley",
  C: "Citigroup Inc.", XOM: "Exxon Mobil Corporation", CVX: "Chevron Corporation",
  KO: "The Coca-Cola Company", PEP: "PepsiCo Inc.", MCD: "McDonald's Corp",
  SBUX: "Starbucks Corporation", NKE: "Nike Inc.", AMGN: "Amgen Inc.",
  GILD: "Gilead Sciences", PFE: "Pfizer Inc.", MRNA: "Moderna Inc.",
  SPY: "SPDR S&P 500 ETF", QQQ: "Invesco QQQ Trust", IWM: "iShares Russell 2000",
  BABA: "Alibaba Group", TSM: "Taiwan Semiconductor", ORCL: "Oracle Corporation",
  CSCO: "Cisco Systems", QCOM: "Qualcomm Incorporated", TXN: "Texas Instruments",
};

export default function handler(req, res) {
  const q = (req.query.q || "").toUpperCase().trim();
  const results = [];

  if (q) {
    for (const [symbol, name] of Object.entries(POPULAR)) {
      if (symbol.includes(q) || name.toUpperCase().includes(q)) {
        results.push({ symbol, name });
      }
      if (results.length >= 8) break;
    }
    // If exact match not in list, add it so user can try any ticker
    if (results.length === 0) {
      results.push({ symbol: q, name: `(search for ${q})` });
    }
  } else {
    for (const [symbol, name] of Object.entries(POPULAR)) {
      results.push({ symbol, name });
      if (results.length >= 12) break;
    }
  }

  res.status(200).json({ results });
}
