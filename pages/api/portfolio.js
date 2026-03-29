import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { prisma } from "../../lib/prisma";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "Unauthenticated" });
  
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: "User not found" });

  if (req.method === "GET") {
    const portfolios = await prisma.portfolio.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        positions: true,
        trades: { orderBy: { createdAt: "desc" } }
      }
    });
    return res.status(200).json({ portfolios });
  }

  if (req.method === "POST") {
    const { name, simDate, startingCash } = req.body;
    const portfolio = await prisma.portfolio.create({
      data: {
        userId: user.id,
        name: name || "New Portfolio",
        simDate: simDate || "2000-01-01",
        startingCash: startingCash ?? 100000,
        cash: startingCash ?? 100000
      }
    });
    return res.status(200).json({ portfolio });
  }

  if (req.method === "PUT") {
    const { id, name, simDate, cash, positions, trades } = req.body;
    if (!id) return res.status(400).json({ error: "Missing portfolio ID" });
    
    const existing = await prisma.portfolio.findFirst({ where: { id, userId: user.id } });
    if (!existing) return res.status(404).json({ error: "Portfolio not found" });

    const dataToUpdate = { updatedAt: new Date() };
    if (name !== undefined) dataToUpdate.name = name;
    if (simDate !== undefined) dataToUpdate.simDate = simDate;
    if (cash !== undefined) dataToUpdate.cash = cash;

    await prisma.portfolio.update({
       where: { id },
       data: dataToUpdate
    });

    if (positions) {
      await prisma.position.deleteMany({ where: { portfolioId: id } });
      if (positions.length > 0) {
        await prisma.position.createMany({
          data: positions.map(p => ({
            portfolioId: id,
            symbol: p.symbol,
            name: p.name,
            shares: p.shares,
            avgCost: p.avgCost
          }))
        });
      }
    }

    if (trades) {
      const existingCount = await prisma.trade.count({ where: { portfolioId: id } });
      const diff = trades.length - existingCount;
      if (diff > 0) {
        const newTrades = trades.slice(0, diff);
        await prisma.trade.createMany({
          data: newTrades.map(t => ({
            portfolioId: id,
            userId: user.id,
            date: t.date,
            symbol: t.symbol,
            action: t.action,
            shares: t.shares,
            price: t.price,
            total: t.total
          }))
        });
      }
    }

    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Missing ID" });
    await prisma.portfolio.deleteMany({
      where: { id, userId: user.id }
    });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
