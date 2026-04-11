// Starts the backend server
// Entry point for Node app

const app = require("./app");

const PORT = process.env.PORT || 4000;

// Keep startup minimal so tests and scripts can import app.js without side effects.
app.listen(PORT, () => {
	console.log(`Stock simulator backend listening on port ${PORT}`);
});
