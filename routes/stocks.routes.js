import express from "express";
import {
  renderHome,
  renderTopMovers,
  apiLiveStocks,
  apiTopMovers,
} from "../controllers/stocks.controller.js";

const router = express.Router();

router.get("/", renderHome);
router.get("/top-movers", renderTopMovers);

router.get("/api/stocks", apiLiveStocks);
router.get("/api/top-movers", apiTopMovers);

export default router;
