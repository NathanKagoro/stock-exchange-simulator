// API endpoints:
// GET /market/prices
// GET /market/tickers

const express = require("express");
const marketController = require("../controllers/marketController");

const router = express.Router();

// Replay controls are nested under /market to keep frontend API calls grouped.
router.get("/state", marketController.getMarketState);
router.get("/tickers", marketController.getTickers);
router.get("/prices", marketController.getPrices);
router.post("/simulation/advance", marketController.advanceSimulation);
router.post("/simulation/jump", marketController.jumpToDate);
router.post("/simulation/reset", marketController.resetSimulation);

module.exports = router;
