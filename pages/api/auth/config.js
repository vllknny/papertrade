export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const googleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );

  return res.status(200).json({
    googleConfigured,
    nextAuthUrl: process.env.NEXTAUTH_URL || "http://localhost:3000",
  });
}