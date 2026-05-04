import cors from "cors";
import express, { type Request, type Response } from "express";
import { incrementHelloVisits } from "./db.js";

const app = express();
const PORT: number = Number(process.env.PORT) || 3000;

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  })
);

app.get("/api/hello", (_req: Request, res: Response) => {
  const visits: number = incrementHelloVisits();
  res.json({
    message: "Hello from Dashing",
    visits,
  });
});

app.listen(PORT, () => {
  console.log(`Dashing API listening on http://localhost:${PORT}`);
});
