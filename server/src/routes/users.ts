import { Router } from "express";
import { requireAdmin } from "../middleware/requireAuth";
import prisma from "../lib/prisma";
import { auth } from "../lib/auth";
import { Role } from "../generated/prisma/enums";

export const usersRouter = Router();

usersRouter.get("/", requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(users);
});

usersRouter.post("/", requireAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Valid email is required" });
    return;
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  if (role !== "admin" && role !== "agent") {
    res.status(400).json({ error: "Role must be admin or agent" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "A user with this email already exists" });
    return;
  }

  const ctx = await auth.$context;
  const hashedPassword = await ctx.password.hash(password);
  const genId = (model: string) => (ctx.generateId({ model }) as string) || crypto.randomUUID();
  const now = new Date();

  const user = await prisma.user.create({
    data: {
      id: genId("user"),
      name: name.trim(),
      email,
      emailVerified: true,
      role: role as Role,
      createdAt: now,
      updatedAt: now,
      accounts: {
        create: {
          id: genId("account"),
          accountId: email,
          providerId: "credential",
          password: hashedPassword,
          createdAt: now,
          updatedAt: now,
        },
      },
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  res.status(201).json(user);
});

usersRouter.patch("/:id/role", requireAdmin, async (req, res) => {
  const id = req.params.id as string;
  const { role } = req.body;
  const session = (req as any).session;

  if (id === session.user.id) {
    res.status(400).json({ error: "Cannot change your own role" });
    return;
  }
  if (role !== "admin" && role !== "agent") {
    res.status(400).json({ error: "Role must be admin or agent" });
    return;
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role: role as Role, updatedAt: new Date() },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  res.json(user);
});

usersRouter.delete("/:id", requireAdmin, async (req, res) => {
  const id = req.params.id as string;
  const session = (req as any).session;

  if (id === session.user.id) {
    res.status(400).json({ error: "Cannot delete your own account" });
    return;
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await prisma.user.delete({ where: { id } });
  res.status(204).end();
});
