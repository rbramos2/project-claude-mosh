import { RequestHandler } from "express";
import prisma from "../../lib/prisma";
import { auth } from "../../lib/auth";
import { createUserSchema } from "./schemas";

export const createUser: RequestHandler = async (req, res) => {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0]?.message ?? "Invalid input" });
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
      role,
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
};
