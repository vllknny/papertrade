// pages/api/stock.js
// Fetches historical OHLCV + company profile from Yahoo Finance (no key needed)

export default async function handler(req, res) {
  const { symbol = "AAPL", date } = req.query;
  const sym = symbol.toUpperCase();

  try {
    const simDate = date ? new Date(date) : new Date();
    const today   = new Date();
    const isLive  = !date || (today - simDate) < 2 * 86_400_000; // within 2 days = live

    const endDate = new Date(simDate);
    endDate.setDate(endDate.getDate() + 2);
    const startDate = new Date(simDate);
    startDate.setDate(startDate.getDate() - 60);

    const toUnix = (d) => Math.floor(d.getTime() / 1000);

    // ── Chart data
    const chartUrl =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}` +
      `?period1=${toUnix(startDate)}&period2=${toUnix(endDate)}` +
      `&interval=1d&events=history&includeAdjustedClose=true`;

    const yahooRes = await fetch(chartUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PaperTradeBot/1.0)",
        Accept: "application/json",
      },
    });

    if (!yahooRes.ok) {
      const txt = await yahooRes.text();
      return res.status(502).json({ error: `Yahoo Finance error ${yahooRes.status}: ${txt.slice(0, 200)}` });
    }

    const json   = await yahooRes.json();
    const result = json?.chart?.result?.[0];

    if (!result) {
      return res.status(404).json({ error: `No data found for ${sym}` });
    }

    const timestamps = result.timestamps || result.timestamp || [];
    const quotes     = result.indicators?.quote?.[0] || {};
    const closes     = quotes.close  || [];
    const opens      = quotes.open   || [];
    const highs      = quotes.high   || [];
    const lows       = quotes.low    || [];
    const volumes    = quotes.volume || [];

    if (timestamps.length === 0) {
      return res.status(404).json({ error: `No trading data for ${sym} in this date range` });
    }

    const chart = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] == null) continue;
      chart.push({
        date:   new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
        close:  +closes[i].toFixed(2),
        open:   +(opens[i]   ?? closes[i]).toFixed(2),
        high:   +(highs[i]   ?? closes[i]).toFixed(2),
        low:    +(lows[i]    ?? closes[i]).toFixed(2),
        volume: volumes[i] ?? 0,
      });
    }

    if (chart.length === 0) {
      return res.status(404).json({ error: `No valid candles for ${sym}` });
    }

    const last = chart[chart.length - 1];
    const meta = result.meta || {};
    const name = meta.longName || meta.shortName || sym;

    // ── Company profile via Yahoo Finance v10 quoteSummary
    let companyInfo = {};
    try {
      const profileUrl =
        `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}` +
        `?modules=assetProfile,summaryDetail,defaultKeyStatistics,financialData`;

      const profileRes = await fetch(profileUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; PaperTradeBot/1.0)",
          Accept: "application/json",
        },
      });

      if (profileRes.ok) {
        const profileJson = await profileRes.json();
        const s = profileJson?.quoteSummary?.result?.[0] || {};
        const ap = s.assetProfile      || {};
        const sd = s.summaryDetail     || {};
        const ks = s.defaultKeyStatistics || {};
        const fd = s.financialData     || {};

        const fmt = (v) => v?.raw ?? v ?? null;
        const fmtB = (v) => {
          const n = v?.raw ?? v;
          if (!n) return null;
          if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
          if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
          if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
          return `$${n.toLocaleString()}`;
        };
        const fmtPct = (v) => {
          const n = v?.raw ?? v;
          if (n == null) return null;
          return `${(n * 100).toFixed(2)}%`;
        };

        companyInfo = {
          sector:        ap.sector        || null,
          industry:      ap.industry      || null,
          description:   ap.longBusinessSummary || null,
          website:       ap.website       || null,
          employees:     ap.fullTimeEmployees ? ap.fullTimeEmployees.toLocaleString() : null,
          country:       ap.country       || null,
          marketCap:     fmtB(sd.marketCap),
          peRatio:       fmt(sd.trailingPE)  != null ? (+fmt(sd.trailingPE)).toFixed(1) : null,
          pbRatio:       fmt(ks.priceToBook) != null ? (+fmt(ks.priceToBook)).toFixed(2) : null,
          dividendYield: fmtPct(sd.dividendYield),
          beta:          fmt(sd.beta)     != null ? (+fmt(sd.beta)).toFixed(2) : null,
          eps:           fmt(ks.trailingEps) != null ? `$${(+fmt(ks.trailingEps)).toFixed(2)}` : null,
          revenue:       fmtB(fd.totalRevenue),
          grossMargin:   fmtPct(fd.grossMargins),
          debtToEquity:  fmt(fd.debtToEquity) != null ? (+fmt(fd.debtToEquity)).toFixed(2) : null,
          returnOnEquity: fmtPct(fd.returnOnEquity),
          fiftyTwoWeekHigh: fmt(sd.fiftyTwoWeekHigh) != null ? `$${(+fmt(sd.fiftyTwoWeekHigh)).toFixed(2)}` : null,
          fiftyTwoWeekLow:  fmt(sd.fiftyTwoWeekLow)  != null ? `$${(+fmt(sd.fiftyTwoWeekLow)).toFixed(2)}`  : null,
          avgVolume:     sd.averageVolume?.raw ? `${(sd.averageVolume.raw / 1e6).toFixed(1)}M` : null,
          isLive,
        };
      }
    } catch (_) {
      // profile fetch failed — continue without it
    }

    return res.status(200).json({
      symbol: sym,
      price:  (isLive && meta.regularMarketPrice) ? meta.regularMarketPrice : last.close,
      date:   last.date,
      name,
      chart,
      isLive,
      ...companyInfo,
    });
  } catch (err) {
    console.error("Stock API error:", err);
    return res.status(500).json({ error: err.message });
  }
}
