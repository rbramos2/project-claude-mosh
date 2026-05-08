import express from "express";
import cors from "cors";
import helmet from "helmet";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { router } from "./routes";

const app = express();

app.use(helmet());

const allowedOrigins = process.env.TRUSTED_ORIGINS?.split(",") ?? [
  "http://localhost:5173",
  "http://localhost:5174",
];
app.use(cors({ origin: allowedOrigins, credentials: true }));

app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json());
app.use("/api", router);

export { app };
