// Sets up Express app
// Middleware, routes, error handling

const express = require("express");
const cors = require("cors");
const marketRoutes = require("./routes/marketRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");

const app = express();

// JSON-only API; no server-side rendered views are used in this project.
app.use(cors());
app.use(express.json());

app.use((request, _response, next) => {
	const providedSessionId = request.headers["x-session-id"];
	request.sessionId =
		typeof providedSessionId === "string" && providedSessionId.trim().length > 0
			? providedSessionId.trim()
			: "default";
	next();
});

app.get("/health", (_request, response) => {
	response.json({ status: "ok" });
});

app.use("/market", marketRoutes);
app.use("/portfolio", portfolioRoutes);
app.use("/recommendations", recommendationRoutes);

// Support both direct backend paths and /api-prefixed paths used by static hosts.
app.use("/api/market", marketRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/recommendations", recommendationRoutes);

// Final safety net so route handlers can keep focused error handling.
app.use((error, _request, response, _next) => {
	response.status(500).json({
		message: error.message || "Unexpected server error.",
	});
});

module.exports = app;
