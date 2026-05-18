import { Router } from "express";
import { usersRouter } from "./users";
import { ticketsRouter } from "./tickets";
import { requireAuth } from "../middleware/requireAuth";
import prisma from "../lib/prisma";

export const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/agents", requireAuth, async (_req, res) => {
  const agents = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  res.json(agents);
});

router.use("/users", usersRouter);
router.use("/tickets", ticketsRouter);
