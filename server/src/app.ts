import express, { type Application } from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes.ts";
import { errorHandler } from "./common/middleware.ts";

dotenv.config();

export const app: Application = express();

app.use(express.json());

const allowedOrigin = process.env.CLIENT_ORIGIN || "*";
app.use(cors({ origin: allowedOrigin, credentials: true }));

app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

app.use("/api", routes);

app.use(errorHandler);
