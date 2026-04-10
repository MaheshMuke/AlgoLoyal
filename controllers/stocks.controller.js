import {
  getLiveMarketData,
  getTopMoversData,
  getMarketSummary,
} from "../services/angel.service.js";

export async function renderHome(req, res) {
  const stocks = await getLiveMarketData();
  const market = getMarketSummary(stocks);

  res.render("index", {
    pageTitle: "AlgoLoyal | Market Dashboard",
    stocks,
    market,
    currentPath: req.path,
  });
}

export async function renderTopMovers(req, res) {
  const topMovers = await getTopMoversData();

  res.render("top-movers", {
    pageTitle: "AlgoLoyal | Top Movers",
    topMovers,
    currentPath: req.path,
  });
}

export async function apiLiveStocks(req, res) {
  const stocks = await getLiveMarketData();

  res.json({
    updatedAt: new Date().toISOString(),
    stocks,
    market: getMarketSummary(stocks),
  });
}

export async function apiTopMovers(req, res) {
  const topMovers = await getTopMoversData();

  res.json({
    updatedAt: new Date().toISOString(),
    topMovers,
  });
}
