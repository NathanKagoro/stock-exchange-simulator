// Main app router
// Handles navigation between MarketPage and PortfolioPage

import { useEffect } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { MarketPage } from "./pages/MarketPage";
import { PortfolioPage } from "./pages/PortfolioPage";
import { SimulationControls } from "./components/SimulationControls";
import { useAppStore } from "./state/store";

export default function App() {
	const navigate = useNavigate();
	const {
		error,
		initialize,
		loading,
		marketSeries,
		marketStocks,
		portfolio,
		recommendations,
		selectedTicker,
		selectTicker,
		simulation,
		setPlayback,
		setSpeed,
		advanceSimulation,
		jumpToIndex,
		resetSimulation,
		executeTrade,
	} = useAppStore();

	useEffect(() => {
		// Hide static fallback only after React has mounted successfully.
		document.body.setAttribute("data-app-mounted", "true");
		const fallbackElement = document.getElementById("boot-fallback");
		if (fallbackElement) {
			fallbackElement.setAttribute("aria-hidden", "true");
		}

		return () => {
			document.body.removeAttribute("data-app-mounted");
			if (fallbackElement) {
				fallbackElement.removeAttribute("aria-hidden");
			}
		};
	}, []);

	useEffect(() => {
		initialize();
	}, [initialize]);

	useEffect(() => {
		// Starts simulation polling loop only while replay is actively playing.
		if (!simulation.isPlaying || simulation.isAtEnd) {
			return undefined;
		}

		const intervalMs = Math.max(180, Math.floor(900 / simulation.speed));
		const stepsPerTick = Math.max(1, Math.floor(simulation.speed));
		let cancelled = false;
		let timerId;

		const tick = async () => {
			if (cancelled) {
				return;
			}

			await advanceSimulation(stepsPerTick);

			if (!cancelled) {
				timerId = window.setTimeout(tick, intervalMs);
			}
		};

		timerId = window.setTimeout(tick, intervalMs);

		return () => {
			cancelled = true;
			if (timerId) {
				window.clearTimeout(timerId);
			}
		};
	}, [advanceSimulation, simulation.isAtEnd, simulation.isPlaying, simulation.speed]);

	const handleTradeTicker = (ticker) => {
		selectTicker(ticker);
		navigate("/portfolio");
	};

	const handleTrade = async (side, quantity) => {
		await executeTrade(side, { ticker: selectedTicker, quantity });
	};

	return (
		<div className="app-shell">
			<div className="background-orb background-orb--left" />
			<div className="background-orb background-orb--right" />
			<header className="app-header">
				<div>
					<p className="eyebrow">London Stock Exchange Replay</p>
					<h1>What if you traded in 2015 with hindsight?</h1>
				</div>
				<nav className="nav-tabs">
					<NavLink to="/portfolio">Portfolio</NavLink>
					<NavLink to="/market">Market</NavLink>
				</nav>
			</header>
			<SimulationControls
				currentIndex={simulation.currentIndex}
				totalDays={simulation.totalDays}
				currentDate={simulation.currentDate}
				speed={simulation.speed}
				isPlaying={simulation.isPlaying}
				onToggle={() => setPlayback(!simulation.isPlaying)}
				onAdvance={advanceSimulation}
				onReset={resetSimulation}
				onSpeedChange={setSpeed}
				onJump={jumpToIndex}
			/>
			{error ? (
				<div className="error-banner glass-card" role="alert">
					<p className="eyebrow">Request Error</p>
					<pre>{error}</pre>
				</div>
			) : null}
			{loading ? <div className="loading-state">Loading historical replay...</div> : null}
			{!loading ? (
				<Routes>
					<Route
						path="/portfolio"
						element={
							<PortfolioPage
								portfolio={portfolio}
								marketStocks={marketStocks}
								selectedTicker={selectedTicker}
								onSelectTicker={selectTicker}
								onTrade={handleTrade}
								recommendations={recommendations}
							/>
						}
					/>
					<Route
						path="/market"
						element={
							<MarketPage
								marketStocks={marketStocks}
								marketSeries={marketSeries}
								selectedTicker={selectedTicker}
								simulation={simulation}
								onSelectTicker={selectTicker}
								onTradeTicker={handleTradeTicker}
							/>
						}
					/>
					<Route path="*" element={<Navigate to="/portfolio" replace />} />
				</Routes>
			) : null}
		</div>
	);
}
