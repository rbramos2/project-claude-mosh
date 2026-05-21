import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/requireAuth";
import prisma from "../../lib/prisma";

export const ticketsRouter = Router();

const PAGE_SIZE = 10;

const querySchema = z.object({
  sortBy: z.enum(["subject", "clientEmail", "status", "createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  status: z.enum(["open", "pending", "closed"]).optional(),
  category: z.enum(["billing", "technical", "account", "feature_request", "general"]).optional(),
  assignedTo: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
});

const assigneeSelect = { select: { id: true, name: true } } as const;

const ticketSelect = {
  id: true,
  subject: true,
  status: true,
  category: true,
  clientEmail: true,
  assignedTo: assigneeSelect,
  createdAt: true,
  updatedAt: true,
  _count: { select: { messages: true } },
} as const;

ticketsRouter.get("/", requireAuth, async (req, res) => {
  const result = querySchema.safeParse(req.query);
  const { sortBy, sortOrder, status, category, assignedTo, search, page } = result.success
    ? result.data
    : { sortBy: "createdAt" as const, sortOrder: "desc" as const, status: undefined, category: undefined, assignedTo: undefined, search: undefined, page: 1 };

  const where = {
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(assignedTo === "unassigned"
      ? { assignedToId: null }
      : assignedTo
        ? { assignedToId: assignedTo }
        : {}),
    ...(search
      ? {
          OR: [
            { subject: { contains: search, mode: "insensitive" as const } },
            { clientEmail: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [tickets, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: ticketSelect,
    }),
    prisma.ticket.count({ where }),
  ]);

  res.json({ tickets, total, page, pageSize: PAGE_SIZE });
});

ticketsRouter.get("/:id", requireAuth, async (req, res) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: String(req.params.id) },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      assignedTo: { select: { id: true, name: true } },
    },
  });
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  res.json(ticket);
});

const patchSchema = z.object({
  status: z.enum(["open", "pending", "closed"]).optional(),
  category: z.enum(["billing", "technical", "account", "feature_request", "general"]).optional(),
});

ticketsRouter.patch("/:id", requireAuth, async (req, res) => {
  const result = patchSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.issues[0]?.message ?? "Invalid input" });

  const { status, category } = result.data;
  if (!status && !category) return res.status(400).json({ error: "Nothing to update" });

  const ticket = await prisma.ticket.update({
    where: { id: String(req.params.id) },
    data: { ...(status ? { status } : {}), ...(category ? { category } : {}) },
    select: { id: true, status: true, category: true },
  });
  res.json(ticket);
});

const replySchema = z.object({
  body: z.string().min(1, "Reply body is required").max(5000, "Reply must be 5000 characters or fewer"),
});

ticketsRouter.post("/:id/messages", requireAuth, async (req, res) => {
  const result = replySchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.issues[0]?.message ?? "Invalid input" });

  const session = (req as any).session;
  const ticket = await prisma.ticket.findUnique({ where: { id: String(req.params.id) } });
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const message = await prisma.message.create({
    data: {
      ticketId: ticket.id,
      body: result.data.body,
      sender: session.user.name,
      senderType: "agent",
      direction: "outbound",
    },
  });

  res.status(201).json(message);
});

ticketsRouter.patch("/:id/assign", requireAuth, async (req, res) => {
  const session = (req as any).session;
  const isAdmin = session.user.role === "admin";
  const { userId } = z.object({ userId: z.string().nullable() }).parse(req.body);

  if (!isAdmin) {
    if (userId === null || userId !== session.user.id) {
      return res.status(403).json({ error: "Agents can only assign tickets to themselves" });
    }
    const current = await prisma.ticket.findUnique({
      where: { id: String(req.params.id) },
      select: { assignedToId: true },
    });
    if (!current) return res.status(404).json({ error: "Ticket not found" });
    if (current.assignedToId !== null) {
      return res.status(403).json({ error: "Ticket is already assigned" });
    }
  } else {
    if (userId !== null) {
      const agent = await prisma.user.findUnique({ where: { id: userId } });
      if (!agent || agent.deletedAt) return res.status(400).json({ error: "User not found" });
    }
  }

  const ticket = await prisma.ticket.update({
    where: { id: String(req.params.id) },
    data: { assignedToId: userId },
    select: { id: true, assignedTo: assigneeSelect },
  });
  res.json(ticket);
});
