import "dotenv/config";
import { auth } from "./lib/auth";
import prisma from "./lib/prisma";
import { Role } from "./generated/prisma/enums";

const email = process.env.SEED_AGENT_EMAIL;
const password = process.env.SEED_AGENT_PASSWORD;
const name = process.env.SEED_AGENT_NAME ?? "Agent";

if (!email || !password) {
  console.error("SEED_AGENT_EMAIL and SEED_AGENT_PASSWORD must be set");
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
    role: Role.agent,
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

console.log(`Agent user seeded: ${email}`);
await prisma.$disconnect();
