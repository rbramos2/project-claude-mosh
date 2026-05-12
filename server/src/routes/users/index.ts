import { Router } from "express";
import { requireAdmin } from "../../middleware/requireAuth";
import { listUsers } from "./list";
import { createUser } from "./create";
import { updateRole } from "./updateRole";
import { deleteUser } from "./deleteUser";

export const usersRouter = Router();

usersRouter.get("/", requireAdmin, listUsers);
usersRouter.post("/", requireAdmin, createUser);
usersRouter.patch("/:id/role", requireAdmin, updateRole);
usersRouter.delete("/:id", requireAdmin, deleteUser);
