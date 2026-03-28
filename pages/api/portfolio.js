// pages/api/portfolio.js
// REST endpoint for saving / loading a user's portfolio.
// GET  /api/portfolio          → fetch active portfolio for the session user
// POST /api/portfolio          → upsert portfolio state (date, cash, positions, trades)

import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { prisma } from "../../lib/prisma";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: "Unauthenticated" });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: "User not found" });

  // ── GET ────────────────────────────────────────────────────────────────────
  if (req.method === "GET") {
    const portfolio = await prisma.portfolio.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { positions: true, trades: { orderBy: { createdAt: "desc" } } },
    });
    return res.status(200).json({ portfolio: portfolio ?? null });
  }

  // ── POST ───────────────────────────────────────────────────────────────────
  if (req.method === "POST") {
    const { simDate, cash, positions = [], trades = [] } = req.body;

    // Upsert the portfolio row
    const portfolio = await prisma.portfolio.upsert({
      where: {
        // Use the first portfolio for this user (create if missing)
        id: (
          await prisma.portfolio.findFirst({ where: { userId: user.id }, select: { id: true } })
        )?.id ?? "new",
      },
      update: { simDate, cash, updatedAt: new Date() },
      create: { userId: user.id, simDate, cash },
    });

    // Sync positions: delete all then re-insert
    await prisma.position.deleteMany({ where: { portfolioId: portfolio.id } });
    if (positions.length > 0) {
      await prisma.position.createMany({
        data: positions.map((p) => ({
          portfolioId: portfolio.id,
          symbol: p.symbol,
          name: p.name,
          shares: p.shares,
          avgCost: p.avgCost,
        })),
      });
    }

    // Append any new trades (deduplicated by checking existing count)
    const existingCount = await prisma.trade.count({ where: { portfolioId: portfolio.id } });
    const newTrades = trades.slice(0, trades.length - existingCount);
    if (newTrades.length > 0) {
      await prisma.trade.createMany({
        data: newTrades.map((t) => ({
          portfolioId: portfolio.id,
          userId: user.id,
          date: t.date,
          symbol: t.symbol,
          action: t.action,
          shares: t.shares,
          price: t.price,
          total: t.total,
        })),
      });
    }

    return res.status(200).json({ ok: true, portfolioId: portfolio.id });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
