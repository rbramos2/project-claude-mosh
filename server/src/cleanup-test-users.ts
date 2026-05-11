import "dotenv/config";
import prisma from "./lib/prisma";

const keepEmails = [
  process.env.SEED_ADMIN_EMAIL!,
  process.env.SEED_AGENT_EMAIL!,
].filter(Boolean);

await prisma.user.deleteMany({
  where: { email: { notIn: keepEmails } },
});

console.log("Test users cleaned up");
await prisma.$disconnect();
