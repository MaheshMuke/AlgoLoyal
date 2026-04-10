const view = document.body.dataset.view;
let pollTickCount = 0;
let currentSearchQuery = "";
let dashboardInFlight = false;
let moversInFlight = false;

function initRefreshDebug() {
	const debug = document.getElementById("refreshDebug");
	if (!debug) return;

	const currentLoads = Number(sessionStorage.getItem("algoloyal_page_loads") || "0") + 1;
	sessionStorage.setItem("algoloyal_page_loads", String(currentLoads));

	const render = () => {
		debug.textContent = `Loads: ${currentLoads} | Polls: ${pollTickCount}`;
	};

	render();
	return render;
}

function initReloadDiagnostics() {
	window.addEventListener("beforeunload", () => {
		console.log("PAGE IS RELOADING");
	});

	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "hidden") {
			console.log("TAB HIDDEN: polling paused");
		} else {
			console.log("TAB VISIBLE: polling resumed");
		}
	});
}

const formatNumber = (value) =>
	new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);

async function fetchJson(url) {
	const response = await fetch(url, { headers: { Accept: "application/json" } });
	if (!response.ok) {
		throw new Error(`Request failed: ${response.status}`);
	}
	return response.json();
}

function createTickerText(stocks) {
	const chips = stocks.map((stock) => {
		const sign = stock.change >= 0 ? "+" : "";
		const cls = stock.change >= 0 ? "up" : "down";
		return `<span class="market-chip"><strong>${stock.symbol}</strong> ${stock.price} <span class="${cls}">${sign}${stock.changePercent}%</span></span>`;
	});

	return [...chips, ...chips].join("");
}

function updateKpis(market) {
	const advancers = document.getElementById("advancersCount");
	const decliners = document.getElementById("declinersCount");
	const avgMove = document.getElementById("avgMove");
	const totalVolume = document.getElementById("totalVolume");

	if (!advancers || !decliners || !avgMove || !totalVolume) return;

	advancers.textContent = market.advancers;
	decliners.textContent = market.decliners;
	avgMove.textContent = `${market.avgMove}%`;
	totalVolume.textContent = formatNumber(market.totalVolume);
}

function createStockRowMarkup(stock) {
	const sign = stock.change >= 0 ? "+" : "";
	const cls = stock.change >= 0 ? "up" : "down";

	return `
		<td><strong>${stock.symbol}</strong><small>${stock.name}</small></td>
		<td>${stock.price}</td>
		<td class="${cls}">${sign}${stock.change} (${stock.changePercent}%)</td>
		<td>${formatNumber(stock.volume)}</td>
	`;
}

function patchStockRowCells(row, stock) {
	const cells = row.cells;
	if (cells.length < 4) {
		row.innerHTML = createStockRowMarkup(stock).trim();
		return;
	}

	const sign = stock.change >= 0 ? "+" : "";
	const cls = stock.change >= 0 ? "up" : "down";

	if (cells[1].textContent !== String(stock.price)) {
		cells[1].textContent = String(stock.price);
	}

	const nextChange = `${sign}${stock.change} (${stock.changePercent}%)`;
	if (cells[2].textContent !== nextChange) {
		cells[2].textContent = nextChange;
	}
	cells[2].className = cls;

	const nextVolume = formatNumber(stock.volume);
	if (cells[3].textContent !== nextVolume) {
		cells[3].textContent = nextVolume;
	}
}

function updateStocksTable(stocks) {
	const body = document.getElementById("stocksTableBody");
	if (!body) return;

	const rowMap = new Map();
	Array.from(body.querySelectorAll("tr[data-symbol]")).forEach((row) => {
		rowMap.set(row.dataset.symbol, row);
	});

	const nextSymbols = new Set(stocks.map((stock) => stock.symbol));

	stocks.forEach((stock) => {
		const existingRow = rowMap.get(stock.symbol);

		if (!existingRow) {
			const row = document.createElement("tr");
			row.dataset.symbol = stock.symbol;
			row.dataset.search = `${stock.symbol} ${stock.name}`.toLowerCase();
			row.innerHTML = createStockRowMarkup(stock).trim();
			body.appendChild(row);

			return;
		}

		patchStockRowCells(existingRow, stock);
	});

	Array.from(body.querySelectorAll("tr[data-symbol]")).forEach((row) => {
		if (!nextSymbols.has(row.dataset.symbol)) {
			row.remove();
		}
	});

	if (currentSearchQuery) {
		applyCurrentSearchFilter();
	}
}

function applyCurrentSearchFilter() {
	const input = document.getElementById("searchInput");
	const body = document.getElementById("stocksTableBody");
	if (!input || !body) return;

	const q = currentSearchQuery;
	const rows = Array.from(body.querySelectorAll("tr"));

	rows.forEach((row) => {
		const text = row.dataset.search || row.textContent.toLowerCase();
		row.style.display = text.includes(q) ? "" : "none";
	});
}

function bindSearch() {
	const input = document.getElementById("searchInput");
	const body = document.getElementById("stocksTableBody");
	if (!input || !body) return;

	input.addEventListener("input", () => {
		currentSearchQuery = input.value.trim().toLowerCase();
		applyCurrentSearchFilter();
	});
}

function createMoverCardMarkup(stock) {
	const sign = stock.changePercent >= 0 ? "+" : "";
	const trendClass = stock.changePercent >= 0 ? "up" : "down";

	return `
		<header>
			<h3>${stock.symbol}</h3>
			<span>${stock.sector}</span>
		</header>
		<p class="mover-name">${stock.name}</p>
		<div class="mover-main">
			<strong>${stock.price}</strong>
			<p class="${trendClass}">${sign}${stock.changePercent}%</p>
		</div>
		<footer><small>Vol: ${formatNumber(stock.volume)}</small></footer>
	`;
}

function patchMoverCard(card, stock) {
	const title = card.querySelector("h3");
	const sector = card.querySelector("header span");
	const name = card.querySelector(".mover-name");
	const price = card.querySelector(".mover-main strong");
	const change = card.querySelector(".mover-main p");
	const volume = card.querySelector("footer small");

	if (title) title.textContent = stock.symbol;
	if (sector) sector.textContent = stock.sector;
	if (name) name.textContent = stock.name;
	if (price) price.textContent = String(stock.price);

	const sign = stock.changePercent >= 0 ? "+" : "";
	const trendClass = stock.changePercent >= 0 ? "up" : "down";
	if (change) {
		change.textContent = `${sign}${stock.changePercent}%`;
		change.className = trendClass;
	}

	if (volume) {
		volume.textContent = `Vol: ${formatNumber(stock.volume)}`;
	}
}

function renderMoversCards(topMovers) {
	const grid = document.getElementById("moversGrid");
	if (!grid) return;

	const cardMap = new Map();
	Array.from(grid.querySelectorAll("article[data-symbol]")).forEach((card) => {
		cardMap.set(card.dataset.symbol, card);
	});

	topMovers.forEach((stock) => {
		const existingCard = cardMap.get(stock.symbol);
		const cardClass = stock.changePercent >= 0 ? "is-up" : "is-down";

		if (!existingCard) {
			const card = document.createElement("article");
			card.dataset.symbol = stock.symbol;
			card.className = `glass-card mover-card ${cardClass}`;
			card.innerHTML = createMoverCardMarkup(stock).trim();
			grid.appendChild(card);

			return;
		}

		existingCard.className = `glass-card mover-card ${cardClass}`;
		patchMoverCard(existingCard, stock);
	});

	Array.from(grid.querySelectorAll("article[data-symbol]")).forEach((card) => {
		if (!topMovers.some((stock) => stock.symbol === card.dataset.symbol)) {
			card.remove();
		}
	});
}

function pulseLiveButton() {
	// Avoid continuous JS-driven animation loops to reduce RAF violations.
}

function initializeChart() {
	const canvas = document.getElementById("marketChart");
	if (!canvas || !window.Chart) return null;

	return new window.Chart(canvas, {
		type: "line",
		data: {
			labels: [],
			datasets: [
				{
					label: "Average % Move",
					data: [],
					borderColor: "#2bd9b2",
					borderWidth: 2,
					tension: 0.35,
					fill: true,
					backgroundColor: "rgba(43, 217, 178, 0.15)",
					pointRadius: 0,
				},
			],
		},
		options: {
			animation: false,
			responsive: true,
			maintainAspectRatio: false,
			plugins: { legend: { display: false } },
			scales: {
				x: {
					ticks: { color: "#9fb7cb", maxTicksLimit: 8 },
					grid: { color: "rgba(255,255,255,0.08)" },
				},
				y: {
					ticks: { color: "#9fb7cb" },
					grid: { color: "rgba(255,255,255,0.08)" },
				},
			},
		},
	});
}

function pushChartPoint(chart, value) {
	if (!chart) return;

	chart.data.labels.push(new Date().toLocaleTimeString());
	chart.data.datasets[0].data.push(value);

	if (chart.data.labels.length > 18) {
		chart.data.labels.shift();
		chart.data.datasets[0].data.shift();
	}

	chart.update("none");
}

async function updateDashboardStockPricesOnly() {
	const payload = await fetchJson("/api/stocks");
	updateStocksTable(payload.stocks);
	pollTickCount += 1;
}

async function updateMovers() {
	const payload = await fetchJson("/api/top-movers");
	renderMoversCards(payload.topMovers);
	pollTickCount += 1;
}

function init() {
	const refreshDebugRender = initRefreshDebug();
	initReloadDiagnostics();
	pulseLiveButton();

	if (view === "dashboard") {
		initializeChart();
		bindSearch();

		dashboardInFlight = true;
		updateDashboardStockPricesOnly()
			.then(() => {
				if (refreshDebugRender) refreshDebugRender();
			})
			.finally(() => {
				dashboardInFlight = false;
			})
			.catch(() => {});

		const refreshNow = document.getElementById("refreshNow");
		if (refreshNow) {
			refreshNow.addEventListener("click", () => {
				if (dashboardInFlight) return;
				dashboardInFlight = true;

				updateDashboardStockPricesOnly()
					.then(() => {
						if (refreshDebugRender) refreshDebugRender();
					})
					.finally(() => {
						dashboardInFlight = false;
					})
					.catch(() => {});
			});
		}

		setInterval(() => {
			if (document.hidden || dashboardInFlight) return;
			dashboardInFlight = true;

			updateDashboardStockPricesOnly()
				.then(() => {
					if (refreshDebugRender) refreshDebugRender();
				})
				.finally(() => {
					dashboardInFlight = false;
				})
				.catch(() => {});
		}, 4500);
	}

	if (view === "movers") {
		moversInFlight = true;
		updateMovers()
			.then(() => {
				if (refreshDebugRender) refreshDebugRender();
			})
			.finally(() => {
				moversInFlight = false;
			})
			.catch(() => {});

		setInterval(() => {
			if (document.hidden || moversInFlight) return;
			moversInFlight = true;

			updateMovers()
				.then(() => {
					if (refreshDebugRender) refreshDebugRender();
				})
				.finally(() => {
					moversInFlight = false;
				})
				.catch(() => {});
		}, 5000);
	}
}

init();
