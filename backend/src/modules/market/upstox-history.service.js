const { getUpstoxAccessToken } = require("./upstox-auth.controller");

const UPSTOX_HISTORY_URL =
  "https://api.upstox.com/v3/historical-candle";

const INSTRUMENT_KEYS = {
  TCS: "NSE_EQ|INE467B01029",
  RELIANCE: "NSE_EQ|INE002A01018",
  INFY: "NSE_EQ|INE009A01021",
  HDFCBANK: "NSE_EQ|INE040A01034",
  ICICIBANK: "NSE_EQ|INE090A01021",
  SBIN: "NSE_EQ|INE062A01020",
};

const getHistoricalCandles = async ({
  symbol,
  unit = "minutes",
  interval = "1",
  fromDate,
  toDate,
}) => {
  const accessToken = getUpstoxAccessToken();

  if (!accessToken) {
    const error = new Error("Upstox is not connected. Authorize first.");
    error.statusCode = 401;
    throw error;
  }

  const instrumentKey = INSTRUMENT_KEYS[symbol.toUpperCase()];

  if (!instrumentKey) {
    const error = new Error("Unsupported stock symbol");
    error.statusCode = 400;
    throw error;
  }

  const url = [
    UPSTOX_HISTORY_URL,
    encodeURIComponent(instrumentKey),
    unit,
    interval,
    toDate,
    fromDate,
  ].join("/");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const result = await response.json();

  if (!response.ok || result.status !== "success") {
    const error = new Error(
      result.errors?.[0]?.message || "Failed to fetch historical candles"
    );
    error.statusCode = response.status === 401 ? 401 : 502;
    throw error;
  }

  return (result.data?.candles || []).map((candle) => ({
    time: candle[0],
    open: candle[1],
    high: candle[2],
    low: candle[3],
    close: candle[4],
    volume: candle[5],
    openInterest: candle[6],
  }));
};

module.exports = { getHistoricalCandles };