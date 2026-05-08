import "dotenv/config";
import { app } from "./app";

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret.length < 32 || secret === "12345" || secret.startsWith("CHANGE_ME")) {
  console.error("FATAL: BETTER_AUTH_SECRET is missing or too weak. Generate with: openssl rand -base64 32");
  process.exit(1);
}

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
