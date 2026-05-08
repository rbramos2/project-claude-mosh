import "dotenv/config";
import { auth } from "./lib/auth";
import prisma from "./lib/prisma";
import { Role } from "./generated/prisma";

const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
const name = process.env.SEED_ADMIN_NAME ?? "Admin";

if (!email || !password) {
  console.error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set");
  process.exit(1);
}

const ctx = await auth.$context;
const hashedPassword = await ctx.password.hash(password);
const id = ctx.generateId({ model: "user" }) || crypto.randomUUID();
const now = new Date();

await prisma.user.upsert({
  where: { email },
  update: {},
  create: {
    id,
    name,
    email,
    emailVerified: true,
    role: Role.admin,
    createdAt: now,
    updatedAt: now,
    accounts: {
      create: {
        id: ctx.generateId({ model: "account" }) || crypto.randomUUID(),
        accountId: email,
        providerId: "credential",
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
      },
    },
  },
});

console.log(`Admin user seeded: ${email}`);
await prisma.$disconnect();
