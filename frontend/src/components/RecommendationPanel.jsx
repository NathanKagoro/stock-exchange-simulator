// Displays AI-generated buy/sell recommendations
// Fetches predictions from backend ML service

export function RecommendationPanel({ recommendations, onSelect }) {
	return (
		<section className="glass-card recommendations-panel">
			<div className="panel-header">
				<div>
					<p className="eyebrow">AI Guidance</p>
					<h2>Recommendations</h2>
				</div>
			</div>
			<div className="recommendation-list">
				{/* Kept intentionally short so the side panel remains compact. */}
				{recommendations.map((recommendation) => (
					<button
						key={`${recommendation.ticker}-${recommendation.action}`}
						type="button"
						className="recommendation-item"
						onClick={() => onSelect(recommendation.ticker)}
					>
						<div>
							<strong>
								{recommendation.action.toUpperCase()} {recommendation.ticker}
							</strong>
							<p>{recommendation.reason}</p>
						</div>
						<span className="pill pill--neutral">{recommendation.confidence}%</span>
					</button>
				))}
			</div>
		</section>
	);
}
