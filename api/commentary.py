from http.server import BaseHTTPRequestHandler
import json
import anthropic
import os


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length)) if length else {}

        symbol = body.get("symbol", "AAPL")
        name = body.get("name", symbol)
        date_str = body.get("date", "2010-01-01")
        price = body.get("price", 0)
        sector = body.get("sector", "Technology")

        try:
            year = date_str[:4]
            month_names = ["Jan","Feb","Mar","Apr","May","Jun",
                           "Jul","Aug","Sep","Oct","Nov","Dec"]
            month = month_names[int(date_str[5:7]) - 1]

            client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

            prompt = f"""You are a financial analyst in {month} {year}. The current date is {date_str}.

A paper trader is researching {name} ({symbol}), currently trading at ${price:.2f}.
Sector: {sector}

Write a concise analyst note (3-4 sentences) AS IF you are living in {month} {year}. 
Include:
1. What's happening in the world / market environment at this time
2. Key factors affecting this stock or sector RIGHT NOW (in {year})
3. One realistic risk and one opportunity relevant to this period

IMPORTANT: Only reference events, news, and market conditions that actually existed before or during {date_str}. Do not reference future events. Be historically accurate.

Keep it punchy, like a real analyst note. No disclaimers."""

            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=400,
                messages=[{"role": "user", "content": prompt}]
            )

            commentary = message.content[0].text.strip()

            self._respond(200, {
                "commentary": commentary,
                "period": f"{month} {year}"
            })

        except Exception as e:
            self._respond(500, {"error": str(e)})

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

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
