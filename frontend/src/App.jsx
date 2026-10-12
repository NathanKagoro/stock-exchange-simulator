// App shell: header, routes, replay bar, keyboard shortcuts and toasts.
// All simulation runs in the browser (see src/engine); there is no backend.

import { useEffect } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { MarketPage } from "./pages/MarketPage";
import { PortfolioPage } from "./pages/PortfolioPage";
import { SimulationControls } from "./components/SimulationControls";
import { actions, startPlaybackLoop, useAppStore } from "./state/store";

function isTypingTarget(target) {
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable) return true;
	const tag = target.tagName;
	if (tag === "TEXTAREA" || tag === "SELECT") return true;
	if (tag === "INPUT") {
		const type = target.getAttribute("type") ?? "text";
		// Range sliders handle arrows themselves; text-like inputs need Space and arrows.
		return type !== "checkbox" && type !== "radio" && type !== "button";
	}
	return false;
}

function useKeyboardShortcuts() {
	useEffect(() => {
		const onKeyDown = (event) => {
			if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
			if (isTypingTarget(event.target)) return;
			if (event.code === "Space" || event.key === " ") {
				// Let a focused button activate itself with Space instead of toggling playback.
				if (event.target instanceof HTMLButtonElement) return;
				event.preventDefault();
				actions.togglePlay();
			} else if (event.key === "ArrowRight") {
				event.preventDefault();
				actions.pause();
				actions.step(1);
			} else if (event.key === "ArrowLeft") {
				event.preventDefault();
				actions.pause();
				actions.step(-1);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);
}

function Toast() {
	const toast = useAppStore((s) => s.toast);
	return (
		<div className="toast-region" role="status" aria-live="polite">
			{toast ? (
				<div className={`toast toast--${toast.kind}`} key={toast.id}>
					<span>{toast.message}</span>
					<button type="button" className="toast__close" onClick={actions.dismissToast} aria-label="Dismiss">
						×
					</button>
				</div>
			) : null}
		</div>
	);
}

function LoadingState() {
	return (
		<div className="loading-state glass-card" role="status">
			<span className="spinner" aria-hidden="true" /> Loading 2015 prices…
		</div>
	);
}

export default function App() {
	const navigate = useNavigate();
	const status = useAppStore((s) => s.status);
	const error = useAppStore((s) => s.error);

	useEffect(() => {
		document.body.setAttribute("data-app-mounted", "true");
		actions.init();
		return startPlaybackLoop();
	}, []);

	useKeyboardShortcuts();

	const goTrade = (ticker) => {
		actions.selectTicker(ticker);
		navigate("/portfolio");
		requestAnimationFrame(() => {
			const panel = document.getElementById("trade");
			panel?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
			panel?.querySelector("input[inputmode=numeric]")?.focus({ preventScroll: true });
		});
	};

	return (
		<div className="app-shell">
			<div className="background-orb background-orb--left" aria-hidden="true" />
			<div className="background-orb background-orb--right" aria-hidden="true" />
			<a className="skip-link" href="#main">
				Skip to content
			</a>
			<header className="app-header">
				<div className="app-header__title">
					<a className="home-link" href="https://nathankagoro.com">
						← nathankagoro.com
					</a>
					<p className="eyebrow">London Stock Exchange replay</p>
					<h1>What if you traded 2015–2025 with hindsight?</h1>
				</div>
				<nav className="nav-tabs" aria-label="Sections">
					<NavLink to="/portfolio">Portfolio</NavLink>
					<NavLink to="/market">Market</NavLink>
				</nav>
			</header>
			<SimulationControls />
			{error ? (
				<div className="error-banner" role="alert">
					<strong>Something went wrong.</strong> {error}
				</div>
			) : null}
			<main id="main">
				{status === "loading" ? <LoadingState /> : null}
				{status === "ready" ? (
					<Routes>
						<Route path="/portfolio" element={<PortfolioPage onTrade={goTrade} />} />
						<Route path="/market" element={<MarketPage onTrade={goTrade} />} />
						<Route path="*" element={<Navigate to="/portfolio" replace />} />
					</Routes>
				) : null}
			</main>
			<footer className="app-footer">
				<p>
					Daily closes from the London Stock Exchange, 2015–2025, quoted in pence and shown here in pounds. Prices
					replay locally in your browser; trades are saved on this device only. Not investment advice.
				</p>
				<p className="kbd-hint">
					<kbd>Space</kbd> play/pause · <kbd>←</kbd>
					<kbd>→</kbd> step a day
				</p>
			</footer>
			<Toast />
		</div>
	);
}
