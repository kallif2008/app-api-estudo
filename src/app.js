import "dotenv/config";
import express from "express";
import router from "./routes/index.js";
import { connectDatabase } from "./config/database.js";

const app = express();
router(app);

const port = Number(process.env.PORT) || 5000;

await connectDatabase();

app.listen(port, () => {
  console.log(`Server running at ${port}`);
});

export default app;
