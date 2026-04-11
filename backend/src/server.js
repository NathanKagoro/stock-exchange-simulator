// Starts the backend server
// Entry point for Node app

const app = require("./app");

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
	console.log(`Stock simulator backend listening on port ${PORT}`);
});
