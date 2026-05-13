import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import prisma from "../../lib/prisma";

export const ticketsRouter = Router();

ticketsRouter.get("/", requireAuth, async (_req, res) => {
  const tickets = await prisma.ticket.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      subject: true,
      status: true,
      clientEmail: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });
  res.json(tickets);
});
