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

  const user = await prisma.user.upsert({
    where: { email: session.user.email },
    update: {
      name: session.user.name || undefined,
      image: session.user.image || undefined,
    },
    create: {
      email: session.user.email,
      name: session.user.name || null,
      image: session.user.image || null,
    },
  });

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

    if (!simDate || typeof cash !== "number") {
      return res.status(400).json({ error: "Invalid payload" });
    }

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

    await prisma.$transaction(async (tx) => {
      // Sync positions: replace all for the active portfolio.
      await tx.position.deleteMany({ where: { portfolioId: portfolio.id } });
      if (positions.length > 0) {
        await tx.position.createMany({
          data: positions.map((p) => ({
            portfolioId: portfolio.id,
            symbol: p.symbol,
            name: p.name,
            shares: Number(p.shares),
            avgCost: Number(p.avgCost),
          })),
        });
      }

      // Keep trade history aligned with client state.
      await tx.trade.deleteMany({ where: { portfolioId: portfolio.id } });
      if (trades.length > 0) {
        await tx.trade.createMany({
          data: trades.map((t) => ({
            portfolioId: portfolio.id,
            userId: user.id,
            date: t.date,
            symbol: t.symbol,
            action: t.action,
            shares: Number(t.shares),
            price: Number(t.price),
            total: Number(t.total),
          })),
        });
      }
    });

    return res.status(200).json({ ok: true, portfolioId: portfolio.id });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
