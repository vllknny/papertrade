// pages/api/stock.js
// Fetches historical OHLCV data from Yahoo Finance's public API (no key needed)

export default async function handler(req, res) {
  const { symbol = "AAPL", date } = req.query;
  const sym = symbol.toUpperCase();

  try {
    const simDate = date ? new Date(date) : new Date();
    // Add 2 days buffer for weekends/holidays
    const endDate = new Date(simDate);
    endDate.setDate(endDate.getDate() + 2);
    // Go back 60 days for chart data
    const startDate = new Date(simDate);
    startDate.setDate(startDate.getDate() - 60);

    const toUnix = (d) => Math.floor(d.getTime() / 1000);

    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}` +
      `?period1=${toUnix(startDate)}&period2=${toUnix(endDate)}` +
      `&interval=1d&events=history&includeAdjustedClose=true`;

    const yahooRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PaperTradeBot/1.0)",
        Accept: "application/json",
      },
    });

    if (!yahooRes.ok) {
      const txt = await yahooRes.text();
      return res.status(502).json({ error: `Yahoo Finance error ${yahooRes.status}: ${txt.slice(0, 200)}` });
    }

    const json = await yahooRes.json();
    const result = json?.chart?.result?.[0];

    if (!result) {
      return res.status(404).json({ error: `No data found for ${sym}` });
    }

    const timestamps = result.timestamps || result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const closes = quotes.close || [];
    const opens = quotes.open || [];
    const highs = quotes.high || [];
    const lows = quotes.low || [];
    const volumes = quotes.volume || [];

    if (timestamps.length === 0) {
      return res.status(404).json({ error: `No trading data for ${sym} in this date range` });
    }

    // Build chart array, filtering out null candles
    const chart = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] == null) continue;
      chart.push({
        date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
        close: +closes[i].toFixed(2),
        open: +(opens[i] ?? closes[i]).toFixed(2),
        high: +(highs[i] ?? closes[i]).toFixed(2),
        low: +(lows[i] ?? closes[i]).toFixed(2),
        volume: volumes[i] ?? 0,
      });
    }

    if (chart.length === 0) {
      return res.status(404).json({ error: `No valid candles for ${sym}` });
    }

    const last = chart[chart.length - 1];

    // Grab company meta
    const meta = result.meta || {};
    const name = meta.longName || meta.shortName || sym;

    return res.status(200).json({
      symbol: sym,
      price: last.close,
      date: last.date,
      name,
      sector: "—",        // Yahoo v8 chart endpoint doesn't return sector; keep simple
      industry: "—",
      chart,
    });
  } catch (err) {
    console.error("Stock API error:", err);
    return res.status(500).json({ error: err.message });
  }
}
