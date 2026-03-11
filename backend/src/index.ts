import "dotenv/config";
import express from "express";
import cors from "cors";
import { errorHandler } from "./middleware/errorHandler";
import { authenticate } from "./middleware/auth";
import authRoutes from "./routes/auth";
import searchRoutes from "./routes/search";
import creditsRoutes from "./routes/credits";
import { startPriceCheckCron } from "./workers/priceCheckWorker";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/search", authenticate, searchRoutes);
app.use("/api/credits", authenticate, creditsRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startPriceCheckCron();
});
