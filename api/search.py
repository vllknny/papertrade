from http.server import BaseHTTPRequestHandler
import json
import yfinance as yf


# Common popular tickers with their names for quick lookup
POPULAR = {
    "AAPL": "Apple Inc.", "MSFT": "Microsoft Corporation", "GOOGL": "Alphabet Inc.",
    "AMZN": "Amazon.com Inc.", "META": "Meta Platforms Inc.", "TSLA": "Tesla Inc.",
    "NVDA": "NVIDIA Corporation", "JPM": "JPMorgan Chase & Co.", "V": "Visa Inc.",
    "JNJ": "Johnson & Johnson", "WMT": "Walmart Inc.", "PG": "Procter & Gamble Co.",
    "MA": "Mastercard Incorporated", "UNH": "UnitedHealth Group", "HD": "The Home Depot",
    "BAC": "Bank of America Corp", "DIS": "The Walt Disney Company", "ADBE": "Adobe Inc.",
    "NFLX": "Netflix Inc.", "CRM": "Salesforce Inc.", "INTC": "Intel Corporation",
    "AMD": "Advanced Micro Devices", "PYPL": "PayPal Holdings", "UBER": "Uber Technologies",
    "SPOT": "Spotify Technology", "SNAP": "Snap Inc.", "TWTR": "Twitter Inc.",
    "IBM": "International Business Machines", "GE": "General Electric Co.",
    "F": "Ford Motor Company", "GM": "General Motors", "BA": "Boeing Co.",
    "GS": "Goldman Sachs Group", "MS": "Morgan Stanley", "C": "Citigroup Inc.",
    "XOM": "Exxon Mobil Corporation", "CVX": "Chevron Corporation",
    "KO": "The Coca-Cola Company", "PEP": "PepsiCo Inc.", "MCD": "McDonald's Corp",
    "SBUX": "Starbucks Corporation", "NKE": "Nike Inc.", "AMGN": "Amgen Inc.",
    "GILD": "Gilead Sciences", "PFE": "Pfizer Inc.", "MRNA": "Moderna Inc.",
    "SPY": "SPDR S&P 500 ETF", "QQQ": "Invesco QQQ Trust", "IWM": "iShares Russell 2000"
}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        from urllib.parse import urlparse, parse_qs
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        query = params.get("q", [""])[0].upper().strip()

        results = []

        if query:
            # First check popular tickers
            for ticker, name in POPULAR.items():
                if query in ticker or query.lower() in name.lower():
                    results.append({"symbol": ticker, "name": name})
                if len(results) >= 8:
                    break

            # If not enough results, try yfinance search
            if len(results) < 3:
                try:
                    t = yf.Ticker(query)
                    info = t.info
                    if info and info.get("longName"):
                        entry = {"symbol": query, "name": info.get("longName", query)}
                        if not any(r["symbol"] == query for r in results):
                            results.insert(0, entry)
                except Exception:
                    pass

        else:
            # Return popular tickers as defaults
            for ticker, name in list(POPULAR.items())[:12]:
                results.append({"symbol": ticker, "name": name})

        self._respond(200, {"results": results[:10]})

    def _respond(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass
