import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/requireAuth";
import prisma from "../lib/prisma";
import { auth } from "../lib/auth";
import { Role } from "../generated/prisma/enums";

export const usersRouter = Router();

const roleEnum = z.enum(["admin", "agent"]);

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  email: z.email({ message: "Valid email is required" }),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: roleEnum.default("agent"),
});

const patchRoleSchema = z.object({
  role: roleEnum,
});

usersRouter.get("/", requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(users);
});

usersRouter.post("/", requireAdmin, async (req, res) => {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid input";
    res.status(400).json({ error: message });
    return;
  }

  const { name, email, password, role } = result.data;

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
      name,
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
  const session = (req as any).session;

  if (id === session.user.id) {
    res.status(400).json({ error: "Cannot change your own role" });
    return;
  }

  const result = patchRoleSchema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid input";
    res.status(400).json({ error: message });
    return;
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role: result.data.role as Role, updatedAt: new Date() },
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
