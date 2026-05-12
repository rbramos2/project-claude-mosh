import { RequestHandler } from "express";
import prisma from "../../lib/prisma";
import { auth } from "../../lib/auth";
import { updateUserSchema } from "./schemas";

export const updateUser: RequestHandler = async (req, res) => {
  const id = req.params.id as string;

  const result = updateUserSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const { name, email, password } = result.data;

  const target = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (email !== target.email) {
    const conflict = await prisma.user.findUnique({ where: { email } });
    if (conflict) {
      res.status(409).json({ error: "A user with this email already exists" });
      return;
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: { name, email, updatedAt: new Date() },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  if (password) {
    const ctx = await auth.$context;
    const hashedPassword = await ctx.password.hash(password);
    await prisma.account.updateMany({
      where: { userId: id, providerId: "credential" },
      data: { password: hashedPassword, updatedAt: new Date() },
    });
  }

  res.json(user);
};
