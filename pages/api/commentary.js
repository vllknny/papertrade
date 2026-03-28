// pages/api/commentary.js
// Returns static period-flavored commentary based on the sim date — no API key needed

const ERA_NOTES = [
  {
    range: [2000, 2002],
    market: "The dot-com bubble has burst. Nasdaq is down over 70% from its peak and sentiment is deeply negative. The Fed is cutting rates aggressively to stabilize the economy.",
    risk: "Ongoing valuation compression as speculative tech unwinds.",
    opp: "Profitable, cash-generating businesses are being thrown out with the bathwater — selective value plays emerging.",
  },
  {
    range: [2003, 2006],
    market: "Markets are recovering from the dot-com crash. Low interest rates and a housing boom are fueling consumer spending. Corporate earnings are rebounding strongly.",
    risk: "Rising energy prices and early signs of housing market excess.",
    opp: "Cyclical recovery trade is well underway; financials and industrials leading.",
  },
  {
    range: [2007, 2007],
    market: "Cracks are appearing in subprime mortgage lending. Credit markets are tightening and Bear Stearns hedge funds have blown up. Equity markets are near all-time highs but volatility is picking up.",
    risk: "Contagion from subprime into broader credit markets is the primary tail risk.",
    opp: "Defensive sectors — healthcare, consumer staples — offer relative safety.",
  },
  {
    range: [2008, 2009],
    market: "The global financial crisis is in full swing. Lehman Brothers has collapsed, credit markets are frozen, and the S&P 500 has shed nearly 50% from its peak. The Fed and Treasury are in full crisis mode.",
    risk: "Systemic risk remains elevated — counterparty exposure is unknowable.",
    opp: "Generational buying opportunity emerging for those with dry powder and a 3–5 year horizon.",
  },
  {
    range: [2010, 2012],
    market: "Post-crisis recovery is underway but uneven. The Fed's QE program is suppressing yields and pushing investors into risk assets. European sovereign debt crisis is the dominant macro overhang.",
    risk: "Euro-area contagion and a potential double-dip in housing.",
    opp: "US large-caps are cheap relative to history; dividend payers particularly attractive.",
  },
  {
    range: [2013, 2015],
    market: "The 'Taper Tantrum' of 2013 rattled bonds but equities have shrugged it off. US growth is solid, unemployment is falling, and the bull market is broadening. Fed is winding down QE.",
    risk: "Rate normalization timeline and emerging market capital outflows.",
    opp: "Technology sector is seeing renewed earnings growth as mobile and cloud adoption accelerates.",
  },
  {
    range: [2016, 2017],
    market: "Post-Brexit volatility quickly faded. Trump's election has triggered a 'reflation trade' — financials, industrials, and small caps surging on expectations of deregulation and fiscal stimulus.",
    risk: "Policy uncertainty and stretched valuations in momentum names.",
    opp: "Financials benefiting from rate normalization and deregulation expectations.",
  },
  {
    range: [2018, 2019],
    market: "US-China trade war is the dominant narrative. Tariff escalation is weighing on global supply chains and corporate confidence. The Fed raised rates four times in 2018 before pivoting dovish in 2019.",
    risk: "Trade war escalation and slowing global growth, particularly in manufacturing.",
    opp: "Domestic-focused US companies largely insulated from tariff risk.",
  },
  {
    range: [2020, 2020],
    market: "COVID-19 has triggered the fastest bear market in history — the S&P fell 34% in 33 days. The Fed cut rates to zero and launched unlimited QE. Fiscal stimulus is massive and unprecedented.",
    risk: "Pandemic trajectory and economic scarring from unemployment shock.",
    opp: "Digital transformation is 5 years ahead of schedule — remote work, e-commerce, and cloud infrastructure are structural winners.",
  },
  {
    range: [2021, 2021],
    market: "Vaccine rollout and reopening euphoria are driving a massive cyclical rotation. Meme stocks, SPACs, and crypto are signaling speculative excess. Inflation is ticking up but the Fed calls it transitory.",
    risk: "'Transitory' inflation narrative may be wrong — supply chain disruptions are proving sticky.",
    opp: "Reopening plays — travel, hospitality, live events — still have meaningful upside.",
  },
  {
    range: [2022, 2022],
    market: "The Fed is hiking rates at the fastest pace since the 1980s to fight 40-year-high inflation. Both stocks and bonds are selling off simultaneously. Russia's invasion of Ukraine has spiked energy and food prices globally.",
    risk: "Hard landing scenario is rising in probability as the yield curve inverts deeply.",
    opp: "Energy sector is printing cash; commodity producers and value stocks holding up relatively well.",
  },
  {
    range: [2023, 2024],
    market: "AI mania is driving a narrow rally led by Nvidia and the 'Magnificent 7.' The Fed has paused hiking but rates remain at 22-year highs. Soft landing hopes are growing despite an inverted yield curve.",
    risk: "Concentration risk — the S&P 500's returns are driven by fewer than 10 names.",
    opp: "Generative AI infrastructure buildout is creating multi-year capex tailwinds for semiconductors and data centers.",
  },
];

function getEraNote(year) {
  return ERA_NOTES.find(({ range }) => year >= range[0] && year <= range[1]) || ERA_NOTES[ERA_NOTES.length - 1];
}

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { symbol = "AAPL", name = "Apple", date = "2010-01-01", price = 0 } = req.body;

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const d = new Date(date);
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();

  const era = getEraNote(year);

  const commentary =
    `${era.market} ` +
    `${name} (${symbol}) is trading at $${(+price).toFixed(2)} as of ${month} ${year}. ` +
    `Key risk: ${era.risk} ` +
    `Opportunity: ${era.opp}`;

  return res.status(200).json({ commentary, period: `${month} ${year}` });
}
