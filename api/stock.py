from http.server import BaseHTTPRequestHandler
import json
import yfinance as yf
from datetime import datetime, timedelta


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        from urllib.parse import urlparse, parse_qs
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        symbol = params.get("symbol", ["AAPL"])[0].upper()
        sim_date_str = params.get("date", [None])[0]

        try:
            if sim_date_str:
                sim_date = datetime.strptime(sim_date_str, "%Y-%m-%d")
            else:
                sim_date = datetime.now()

            # Fetch a 30-day window ending at sim_date
            end_date = sim_date + timedelta(days=1)
            start_date = sim_date - timedelta(days=60)

            ticker = yf.Ticker(symbol)
            hist = ticker.history(start=start_date.strftime("%Y-%m-%d"),
                                  end=end_date.strftime("%Y-%m-%d"))

            if hist.empty:
                self._respond(404, {"error": f"No data found for {symbol}"})
                return

            # Get the last available trading day on or before sim_date
            last_row = hist.iloc[-1]
            price = round(float(last_row["Close"]), 2)
            actual_date = hist.index[-1].strftime("%Y-%m-%d")

            # Build 30-day price history for chart
            chart_data = []
            for ts, row in hist.iterrows():
                chart_data.append({
                    "date": ts.strftime("%Y-%m-%d"),
                    "close": round(float(row["Close"]), 2),
                    "open": round(float(row["Open"]), 2),
                    "high": round(float(row["High"]), 2),
                    "low": round(float(row["Low"]), 2),
                    "volume": int(row["Volume"])
                })

            # Basic info
            info = {}
            try:
                raw_info = ticker.info
                info = {
                    "name": raw_info.get("longName", symbol),
                    "sector": raw_info.get("sector", "Unknown"),
                    "industry": raw_info.get("industry", "Unknown"),
                }
            except Exception:
                info = {"name": symbol, "sector": "Unknown", "industry": "Unknown"}

            self._respond(200, {
                "symbol": symbol,
                "price": price,
                "date": actual_date,
                "name": info.get("name", symbol),
                "sector": info.get("sector", "Unknown"),
                "industry": info.get("industry", "Unknown"),
                "chart": chart_data
            })

        except Exception as e:
            self._respond(500, {"error": str(e)})

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
