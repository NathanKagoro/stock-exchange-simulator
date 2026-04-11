// Sets up Express app
// Middleware, routes, error handling

const express = require("express");
const cors = require("cors");
const marketRoutes = require("./routes/marketRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_request, response) => {
	response.json({ status: "ok" });
});

app.use("/market", marketRoutes);
app.use("/portfolio", portfolioRoutes);
app.use("/recommendations", recommendationRoutes);

app.use((error, _request, response, _next) => {
	response.status(500).json({
		message: error.message || "Unexpected server error.",
	});
});

module.exports = app;
