// API endpoints:
// POST /portfolio/buy
// POST /portfolio/sell
// GET /portfolio

const express = require("express");
const portfolioController = require("../controllers/portfolioController");

const router = express.Router();

router.get("/", portfolioController.getPortfolio);
router.post("/buy", portfolioController.buyStock);
router.post("/sell", portfolioController.sellStock);

module.exports = router;
