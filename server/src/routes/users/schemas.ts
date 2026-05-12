import { z } from "zod";
import { Role } from "../../generated/prisma/enums";

export const roleEnum = z.enum(Object.values(Role) as [Role, ...Role[]]);

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  email: z.email({ message: "Valid email is required" }),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: roleEnum.default("agent"),
});

export const patchRoleSchema = z.object({
  role: roleEnum,
});
