// React application entry point

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/theme.css";

class RootErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = { error: null };
	}

	static getDerivedStateFromError(error) {
		return { error };
	}

	componentDidCatch(error) {
		console.error("Stock simulator render failure:", error);
	}

	render() {
		if (this.state.error) {
			return (
				<div className="runtime-error-shell">
					<div className="runtime-error-panel glass-card">
						<p className="eyebrow">Render Error</p>
						<h1>The app failed to render.</h1>
						<p>{this.state.error.message}</p>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

const rootElement = document.getElementById("root");

ReactDOM.createRoot(rootElement).render(
	<React.StrictMode>
		<RootErrorBoundary>
			<BrowserRouter>
				<App />
			</BrowserRouter>
		</RootErrorBoundary>
	</React.StrictMode>
);
