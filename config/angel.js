import dotenv from "dotenv";

dotenv.config();

// Placeholder hook for your real-time provider integration.
// Return an array of stock objects to override the simulator.
export async function getExternalMarketFeed() {
	if (process.env.USE_EXTERNAL_FEED !== "true") {
		return null;
	}

	// TODO: Plug your Angel/other broker implementation here.
	// Shape expected:
	// [{ symbol, name, price, previousClose, dayHigh, dayLow, volume, sparkline }]
	return null;
}
