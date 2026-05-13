import { Router } from "express";
import { gmailWebhook } from "./gmail";

export const webhookRouter = Router();

webhookRouter.post("/gmail", gmailWebhook);
