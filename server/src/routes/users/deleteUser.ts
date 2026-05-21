import { RequestHandler } from "express";
import prisma from "../../lib/prisma";
import { Role } from "../../generated/prisma/enums";

export const deleteUser: RequestHandler = async (req, res) => {
  const id = req.params.id as string;
  const session = (req as any).session;

  if (id === session.user.id) {
    res.status(400).json({ error: "Cannot delete your own account" });
    return;
  }

  const target = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (target.role === Role.admin) {
    const adminCount = await prisma.user.count({
      where: { role: Role.admin, deletedAt: null },
    });
    if (adminCount <= 1) {
      res.status(400).json({ error: "Cannot delete the last admin" });
      return;
    }
  }

  await prisma.$transaction([
    prisma.ticket.updateMany({
      where: { assignedToId: id },
      data: { assignedToId: null },
    }),
    prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
  ]);

  res.status(204).end();
};
