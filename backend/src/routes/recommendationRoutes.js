// API endpoint:
// GET /recommendations

const express = require("express");
const recommendationController = require("../controllers/recommendationController");

const router = express.Router();

// Single endpoint for recommendation panel polling.
router.get("/", recommendationController.getRecommendations);

module.exports = router;
