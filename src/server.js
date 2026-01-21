import "dotenv/config";
import { connectDb } from "./config/db.js";
import { buildApp } from "./app.js";

const PORT = process.env.PORT || 4000;

await connectDb();

const app = buildApp();
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
