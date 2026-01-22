import "dotenv/config";
import { connectDb } from "./config/db.js";
import { buildApp } from "./app.js";

const PORT = process.env.PORT || 4000;

await connectDb();

const app = buildApp();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
