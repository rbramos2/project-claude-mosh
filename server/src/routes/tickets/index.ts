import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/requireAuth";
import prisma from "../../lib/prisma";

export const ticketsRouter = Router();

const sortSchema = z.object({
  sortBy: z.enum(["subject", "clientEmail", "status", "createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

ticketsRouter.get("/", requireAuth, async (req, res) => {
  const result = sortSchema.safeParse(req.query);
  const { sortBy, sortOrder } = result.success ? result.data : { sortBy: "createdAt" as const, sortOrder: "desc" as const };

  const tickets = await prisma.ticket.findMany({
    orderBy: { [sortBy]: sortOrder },
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
