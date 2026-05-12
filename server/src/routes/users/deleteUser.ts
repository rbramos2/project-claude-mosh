import { RequestHandler } from "express";
import prisma from "../../lib/prisma";

export const deleteUser: RequestHandler = async (req, res) => {
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
};
