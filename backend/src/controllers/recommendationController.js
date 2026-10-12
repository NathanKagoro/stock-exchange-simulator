// Calls ML service to generate recommendations
// Sends them to frontend

const recommendationService = require("../services/recommendationService");

function getRecommendations(request, response) {
	response.json(recommendationService.getRecommendationsForSession(request.sessionId));
}

module.exports = {
	getRecommendations,
};
