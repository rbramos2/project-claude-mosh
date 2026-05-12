import { RequestHandler } from "express";
import prisma from "../../lib/prisma";
import { patchRoleSchema } from "./schemas";

export const updateRole: RequestHandler = async (req, res) => {
  const id = req.params.id as string;
  const session = (req as any).session;

  if (id === session.user.id) {
    res.status(400).json({ error: "Cannot change your own role" });
    return;
  }

  const result = patchRoleSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role: result.data.role, updatedAt: new Date() },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  res.json(user);
};
