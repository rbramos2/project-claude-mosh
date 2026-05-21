import { z } from "zod";
import { Role } from "../../generated/prisma/enums";

export const roleEnum = z.enum(Object.values(Role) as [Role, ...Role[]]);

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or fewer").trim(),
  email: z.string().max(254).pipe(z.email({ message: "Valid email is required" })),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be 128 characters or fewer"),
  role: roleEnum.default("agent"),
});

export const patchRoleSchema = z.object({
  role: roleEnum,
});

export const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or fewer").trim(),
  email: z.string().max(254).pipe(z.email({ message: "Valid email is required" })),
  password: z.union([
    z.literal(""),
    z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be 128 characters or fewer"),
  ]).optional(),
});
