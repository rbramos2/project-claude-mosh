import { Router } from "express";
import { usersRouter } from "./users";

export const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/users", usersRouter);
