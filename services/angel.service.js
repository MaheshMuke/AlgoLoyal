import { getExternalMarketFeed } from "../config/angel.js";

const seedStocks = [
  { symbol: "NSE:RELIANCE", name: "Reliance Industries", sector: "Energy", price: 2920.2 },
  { symbol: "NSE:TCS", name: "Tata Consultancy Services", sector: "IT", price: 3896.3 },
  { symbol: "NSE:HDFCBANK", name: "HDFC Bank", sector: "Banking", price: 1749.6 },
  { symbol: "NSE:INFY", name: "Infosys", sector: "IT", price: 1498.8 },
  { symbol: "NSE:ICICIBANK", name: "ICICI Bank", sector: "Banking", price: 1164.45 },
  { symbol: "NSE:SBIN", name: "State Bank of India", sector: "Banking", price: 842.9 },
  { symbol: "NSE:LT", name: "Larsen & Toubro", sector: "Infrastructure", price: 3611.35 },
  { symbol: "NSE:BAJFINANCE", name: "Bajaj Finance", sector: "Finance", price: 7418.1 },
  { symbol: "NSE:BHARTIARTL", name: "Bharti Airtel", sector: "Telecom", price: 1512.95 },
  { symbol: "NSE:ITC", name: "ITC", sector: "FMCG", price: 431.25 },
  { symbol: "NSE:ADANIENT", name: "Adani Enterprises", sector: "Diversified", price: 3122.55 },
  { symbol: "NSE:ASIANPAINT", name: "Asian Paints", sector: "Consumer", price: 2853.45 },
];

const state = new Map(
  seedStocks.map((stock) => [
    stock.symbol,
    {
      ...stock,
      previousClose: stock.price * (0.985 + Math.random() * 0.03),
      dayHigh: stock.price,
      dayLow: stock.price,
      volume: Math.floor(250000 + Math.random() * 1200000),
      history: Array.from({ length: 24 }, () => stock.price),
    },
  ])
);

function to2(value) {
  return Number(value.toFixed(2));
}

function tickStock(liveStock) {
  const drift = (Math.random() - 0.5) * 0.025;
  const momentum = ((liveStock.price - liveStock.previousClose) / liveStock.previousClose) * 0.1;
  const nextPrice = Math.max(1, liveStock.price * (1 + drift + momentum));

  liveStock.price = to2(nextPrice);
  liveStock.dayHigh = to2(Math.max(liveStock.dayHigh, liveStock.price));
  liveStock.dayLow = to2(Math.min(liveStock.dayLow, liveStock.price));
  liveStock.volume += Math.floor(5000 + Math.random() * 42000);

  liveStock.history.push(liveStock.price);
  if (liveStock.history.length > 30) {
    liveStock.history.shift();
  }

  const change = liveStock.price - liveStock.previousClose;
  const changePercent = (change / liveStock.previousClose) * 100;

  return {
    symbol: liveStock.symbol,
    name: liveStock.name,
    sector: liveStock.sector,
    price: liveStock.price,
    previousClose: to2(liveStock.previousClose),
    dayHigh: liveStock.dayHigh,
    dayLow: liveStock.dayLow,
    volume: liveStock.volume,
    change: to2(change),
    changePercent: to2(changePercent),
    trend: change >= 0 ? "up" : "down",
    sparkline: [...liveStock.history],
  };
}

function normalizeExternalRow(row) {
  if (!row || !row.symbol || !row.name || typeof row.price !== "number") {
    return null;
  }

  const previousClose =
    typeof row.previousClose === "number" && row.previousClose > 0
      ? row.previousClose
      : row.price;

  const change = row.price - previousClose;
  const changePercent = previousClose ? (change / previousClose) * 100 : 0;

  return {
    symbol: row.symbol,
    name: row.name,
    sector: row.sector || "Unknown",
    price: to2(row.price),
    previousClose: to2(previousClose),
    dayHigh: to2(row.dayHigh ?? row.price),
    dayLow: to2(row.dayLow ?? row.price),
    volume: Math.max(0, Number(row.volume || 0)),
    change: to2(change),
    changePercent: to2(changePercent),
    trend: change >= 0 ? "up" : "down",
    sparkline: Array.isArray(row.sparkline) && row.sparkline.length
      ? row.sparkline.map((v) => to2(Number(v)))
      : [to2(row.price)],
  };
}

async function getExternalOrNull() {
  const feed = await getExternalMarketFeed();

  if (!Array.isArray(feed) || !feed.length) {
    return null;
  }

  const normalized = feed
    .map(normalizeExternalRow)
    .filter(Boolean);

  return normalized.length ? normalized : null;
}

export async function getLiveMarketData() {
  const external = await getExternalOrNull();
  if (external) {
    return external;
  }

  return Array.from(state.values()).map((stock) => tickStock(stock));
}

export async function getTopMoversData(limit = 8) {
  const stocks = await getLiveMarketData();

  return [...stocks]
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, limit);
}

export function getMarketSummary(stocks) {
  const advancers = stocks.filter((s) => s.change >= 0).length;
  const decliners = stocks.length - advancers;

  const avgMove =
    stocks.reduce((sum, s) => sum + s.changePercent, 0) / (stocks.length || 1);

  const totalVolume = stocks.reduce((sum, s) => sum + s.volume, 0);

  return {
    advancers,
    decliners,
    avgMove: to2(avgMove),
    totalVolume,
  };
}
