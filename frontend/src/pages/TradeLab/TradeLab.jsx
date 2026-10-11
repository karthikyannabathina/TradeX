
import { useEffect, useRef, useState } from "react";
import * as LightweightCharts from "lightweight-charts";
import "./TradeLab.css";

const stocks = [
  "TCS",
  "RELIANCE",
  "INFY",
  "HDFCBANK",
  "ICICIBANK",
  "SBIN",
];

const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"}/market`;

function toChartData(candles) {
  const uniqueCandles = new Map();

  for (const candle of candles) {
    const date = String(candle.time || candle.timestamp || "").slice(0, 10);
    const [year, month, day] = date.split("-").map(Number);

    const open = Number(candle.open);
    const high = Number(candle.high);
    const low = Number(candle.low);
    const close = Number(candle.close);

    if (
      !year ||
      !month ||
      !day ||
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close) ||
      high < low
    ) {
      continue;
    }

    uniqueCandles.set(date, {
      time: { year, month, day },
      open,
      high,
      low,
      close,
    });
  }

  return [...uniqueCandles.entries()]
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([, candle]) => candle);
}

export default function TradeLab() {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const candlesRef = useRef([]);

  const [symbol, setSymbol] = useState("TCS");
  const [fromDate, setFromDate] = useState("2026-09-01");
  const [toDate, setToDate] = useState("2026-09-10");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [quantity, setQuantity] = useState(10);

  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [simulation, setSimulation] = useState(null);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const chart = LightweightCharts.createChart(container, {
      width: container.clientWidth || 800,
      height: 380,
      layout: {
        background: { color: "#0b1220" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      rightPriceScale: {
        visible: true,
        borderColor: "#334155",
        autoScale: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: "#334155",
        timeVisible: false,
        rightOffset: 3,
        fixLeftEdge: true,
        barSpacing: 18,
        minBarSpacing: 5,
      },
      crosshair: {
        vertLine: { color: "#64748b" },
        horzLine: { color: "#64748b" },
      },
    });

    const candleOptions = {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
    };

    const candleSeries = chart.addCandlestickSeries
      ? chart.addCandlestickSeries(candleOptions)
      : chart.addSeries(
          LightweightCharts.CandlestickSeries,
          candleOptions
        );

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    const resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;

      if (width > 0) {
        chart.applyOptions({ width });

        if (candlesRef.current.length > 0) {
          chart.timeScale().fitContent();
          candleSeries.priceScale().applyOptions({
            autoScale: true,
          });
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    candlesRef.current = candles;

    const chart = chartRef.current;
    const series = candleSeriesRef.current;

    if (!chart || !series) return;

    const chartData = toChartData(candles);

    if (chartData.length === 0) {
      series.setData([]);
      return;
    }

    series.setData(chartData);

series.priceScale().applyOptions({
  autoScale: true,
  scaleMargins: {
    top: 0.1,
    bottom: 0.1,
  },
});

chart.timeScale().fitContent();
  }, [candles]);

  const loadCandles = async () => {
    if (!fromDate || !toDate || fromDate > toDate) {
      setError("Please select a valid date range.");
      return;
    }

    setLoading(true);
    setError("");
    setCandles([]);
    setSimulation(null);

    try {
      const params = new URLSearchParams({
        unit: "days",
        interval: "1",
        from: fromDate,
        to: toDate,
      });

      const response = await fetch(
  `${API_URL}/upstox/${symbol}/candles?${params}`,
  { cache: "no-store" }
);

      const result = await response.json();
      console.log("Historical candle API:", result);

      if (!response.ok || !result.success) {
        throw new Error(
          result.error?.message ||
            result.message ||
            "Unable to load historical candles."
        );
      }

      const loadedCandles = result.data?.candles || [];
      console.log("Upstox candle response:", loadedCandles);
      const validCandles = toChartData(loadedCandles);

      if (validCandles.length === 0) {
        throw new Error("No valid candles found for this date range.");
      }

      setCandles(
        validCandles.map((candle) => ({
          time: [
            candle.time.year,
            String(candle.time.month).padStart(2, "0"),
            String(candle.time.day).padStart(2, "0"),
          ].join("-"),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        }))
      );
    } catch (err) {
      setError(err.message || "Failed to load historical candles.");
    } finally {
      setLoading(false);
    }
  };

  const simulateTrade = () => {
    const entry = Number(entryPrice);
    const stop = Number(stopLoss);
    const qty = Number(quantity);

    if (!candles.length) {
      setError("Load historical candles first.");
      return;
    }

    if (!Number.isFinite(entry) || entry <= 0) {
      setError("Enter a valid entry price.");
      return;
    }

    if (!Number.isFinite(stop) || stop <= 0 || stop >= entry) {
      setError("For a BUY trade, stop-loss must be below entry price.");
      return;
    }

    if (!Number.isInteger(qty) || qty <= 0) {
      setError("Enter a valid whole-number quantity.");
      return;
    }

    const orderedCandles = [...candles].sort((a, b) =>
      a.time.localeCompare(b.time)
    );

    const stopCandle = orderedCandles.find(
      (candle) => Number(candle.low) <= stop
    );

    const lastCandle = orderedCandles[orderedCandles.length - 1];
    const exitPrice = stopCandle ? stop : Number(lastCandle.close);
    const pnl = (exitPrice - entry) * qty;

    setSimulation({
      entry,
      stop,
      quantity: qty,
      exitPrice,
      pnl,
      exitReason: stopCandle ? "Stop-loss hit" : "Last candle close",
      exitTime: stopCandle ? stopCandle.time : lastCandle.time,
    });

    setError("");
  };

  return (
    <div className="trade-lab">
      <header className="trade-lab-header">
        <div>
          <span className="trade-lab-eyebrow">TRADING WORKSPACE</span>
          <h1>Trade Lab</h1>
          <p>Explore historical data and test your trading decisions.</p>
        </div>
        <span className="trade-lab-badge">What-if simulator</span>
      </header>

      <section className="trade-lab-filters">
        <label>
          <span>Stock</span>
          <select
            value={symbol}
            onChange={(e) => {
              setSymbol(e.target.value);
              setCandles([]);
              setSimulation(null);
              setError("");
            }}
          >
            {stocks.map((stock) => (
              <option key={stock} value={stock}>
                {stock}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>From</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </label>

        <label>
          <span>To</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </label>

        <button
          className="trade-lab-load"
          onClick={loadCandles}
          disabled={loading}
        >
          {loading ? "Loading..." : "Load candles"}
        </button>
      </section>

      {error && (
        <div className="trade-lab-error" role="alert">
          {error}
        </div>
      )}

      <div className="trade-lab-grid">
        <section className="trade-lab-panel trade-lab-chart">
          <div className="trade-lab-panel-heading">
            <div>
              <h2>{symbol}</h2>
              <span>Historical candlestick chart</span>
            </div>
            <span className="trade-lab-market-tag">UPSTOX DATA</span>
          </div>

          {loading && (
            <p className="trade-lab-chart-status">
              Loading historical candles...
            </p>
          )}

          {!loading && candles.length === 0 && (
            <div className="trade-lab-chart-placeholder">
              <div className="trade-lab-chart-icon">⌁</div>
              <h3>Historical chart</h3>
              <p>Choose a stock and date range, then load candles.</p>
            </div>
          )}

          <div
            ref={chartContainerRef}
            className="trade-lab-chart-canvas"
            style={{ display: candles.length ? "block" : "none" }}
          />

          {candles.length > 0 && (
            <div className="trade-lab-chart-summary">
              <span>{candles.length} candles loaded</span>
              <span>First close: ₹{candles[0].close}</span>
              <span>
                Latest close: ₹{candles[candles.length - 1].close}
              </span>
            </div>
          )}
        </section>

        <section className="trade-lab-panel trade-lab-controls">
          <div className="trade-lab-panel-heading">
            <div>
              <h2>What-if scenario</h2>
              <span>Adjust your trade parameters</span>
            </div>
          </div>

          <label>
            <span>Entry price (₹)</span>
            <input
              type="number"
              min="0"
              step="0.05"
              placeholder="Enter entry price"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
            />
          </label>

          <label>
            <span>Stop-loss (₹)</span>
            <input
              type="number"
              min="0"
              step="0.05"
              placeholder="Enter stop-loss"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
            />
          </label>

          <label>
            <span>Quantity</span>
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>

          <button
            className="trade-lab-simulate"
            onClick={simulateTrade}
            disabled={loading || candles.length === 0}
          >
            Simulate trade
          </button>

          <p className="trade-lab-note">
            Simulation assumes a BUY trade and uses the loaded candles.
          </p>

          {simulation && (
            <div className="trade-lab-results">
              <h3>Simulation result</h3>

              <div className="trade-lab-result-row">
                <span>Entry price</span>
                <strong>₹{simulation.entry.toFixed(2)}</strong>
              </div>

              <div className="trade-lab-result-row">
                <span>Exit price</span>
                <strong>₹{simulation.exitPrice.toFixed(2)}</strong>
              </div>

              <div className="trade-lab-result-row">
                <span>Quantity</span>
                <strong>{simulation.quantity}</strong>
              </div>

              <div className="trade-lab-result-row">
                <span>Exit reason</span>
                <strong>{simulation.exitReason}</strong>
              </div>

              <div className="trade-lab-result-row">
                <span>Exit time</span>
                <strong>{simulation.exitTime}</strong>
              </div>

              <div className="trade-lab-result-pnl">
                <span>Hypothetical P&amp;L</span>
                <strong className={simulation.pnl >= 0 ? "profit" : "loss"}>
                  {simulation.pnl >= 0 ? "+" : "-"}₹
                  {Math.abs(simulation.pnl).toFixed(2)}
                </strong>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}