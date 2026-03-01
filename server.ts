import express from "express";
import { createServer as createViteServer } from "vite";
import healthRouter from "./server/routes/health.js";
import complexesRouter from "./server/routes/complexes.js";
import buildingsRouter from "./server/routes/buildings.js";
import unitsRouter from "./server/routes/units.js";
import contractsRouter from "./server/routes/contracts.js";
import seedRouter from "./server/routes/seed.js";
import { supabase } from "./server/db.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.use("/api/health", healthRouter);
  app.use("/api/complexes", complexesRouter);
  app.use("/api/buildings", buildingsRouter);
  app.use("/api/units", unitsRouter);
  app.use("/api/contracts", contractsRouter);
  app.use("/api/seed", seedRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
