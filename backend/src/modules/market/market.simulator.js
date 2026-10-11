const Stock = require("../stocks/stock.model");

const {
  saveMarketState,
} = require("./market.repository");

const {
  emitPriceUpdated,
} = require("../../events/market.events");

const {
  redisClient,
  isRedisReady,
} = require("../../config/redis");

/* =========================================================
   MARKET CONFIG
========================================================= */

const TICK_INTERVAL_MS = 1500;

/*
  Maximum price movement per tick.

  0.06% every 1.5 seconds gives the chart
  enough movement without becoming crazy.
*/
const MAX_STEP_PERCENT = 0.06;

const CANDLE_INTERVAL_SECONDS = 60;
const MAX_CANDLES = 240;

/* =========================================================
   CANDLE STORAGE
========================================================= */

const candleHistory = new Map();

/* =========================================================
   DUMMY NSE / BSE STOCKS
========================================================= */

const DUMMY_STOCKS = [
  {
    symbol: "NIFTY50",
    name: "NIFTY 50",
    exchange: "NSE",
    currentPrice: 25340,
    previousClose: 25128.7,
  },

  {
    symbol: "SENSEX",
    name: "SENSEX",
    exchange: "BSE",
    currentPrice: 82540,
    previousClose: 82031,
  },

  {
    symbol: "BANKNIFTY",
    name: "BANK NIFTY",
    exchange: "NSE",
    currentPrice: 56220,
    previousClose: 56417.5,
  },

  {
    symbol: "RELIANCE",
    name: "Reliance Industries",
    exchange: "NSE",
    currentPrice: 2948.6,
    previousClose: 2938.2,
  },

  {
    symbol: "TCS",
    name: "Tata Consultancy Services",
    exchange: "NSE",
    currentPrice: 4126.35,
    previousClose: 4114.8,
  },

  {
    symbol: "INFY",
    name: "Infosys",
    exchange: "NSE",
    currentPrice: 1684.7,
    previousClose: 1691.25,
  },

  {
    symbol: "HDFCBANK",
    name: "HDFC Bank",
    exchange: "NSE",
    currentPrice: 1762.4,
    previousClose: 1756.9,
  },

  {
    symbol: "ICICIBANK",
    name: "ICICI Bank",
    exchange: "NSE",
    currentPrice: 1289.75,
    previousClose: 1284.1,
  },

  {
    symbol: "SBIN",
    name: "State Bank of India",
    exchange: "NSE",
    currentPrice: 862.3,
    previousClose: 858.65,
  },

  {
    symbol: "ITC",
    name: "ITC",
    exchange: "NSE",
    currentPrice: 472.85,
    previousClose: 474.2,
  },

  {
    symbol: "WIPRO",
    name: "Wipro",
    exchange: "NSE",
    currentPrice: 542.6,
    previousClose: 540.45,
  },

  {
    symbol: "BHARTIARTL",
    name: "Bharti Airtel",
    exchange: "NSE",
    currentPrice: 1668.2,
    previousClose: 1661.7,
  },

  {
    symbol: "TATAMOTORS",
    name: "Tata Motors",
    exchange: "NSE",
    currentPrice: 984.15,
    previousClose: 978.5,
  },
].map((stock) => ({
  ...stock,

  dayOpen: stock.currentPrice,

  dayHigh: stock.currentPrice,

  dayLow: stock.currentPrice,

  volume: 100000,

  isActive: true,
}));

/* =========================================================
   MARKET STATE
========================================================= */

const marketState = new Map();

let isTickRunning = false;

let tickNumber = 0;

/* =========================================================
   SAFE REDIS MARKET PERSISTENCE
========================================================= */

/*
  Redis is used as a persistence/cache layer for live market data.

  Important:
  A temporary Redis disconnect should NOT stop the market
  simulator or crash the backend.

  Socket.IO still receives live prices even when Redis is
  temporarily unavailable.
*/

let redisWarningShown = false;

const saveMarketStateSafely = async (stock) => {
  if (!redisClient.isOpen || !isRedisReady()) {
    if (!redisWarningShown) {
      console.warn(
        "⚠️ Redis is not ready. Market persistence temporarily paused."
      );

      redisWarningShown = true;
    }

    return;
  }

  try {
    await saveMarketState(stock);

    redisWarningShown = false;
  } catch (error) {
    console.warn(
      `⚠️ Redis market update failed for ${stock.symbol}: ${error.message}`
    );

    /*
      Do not throw.

      The market simulator must continue running even if
      Redis temporarily resets the connection.
    */
  }
};

/* =========================================================
   CANDLE TIME
========================================================= */

const getCandleTime = (
  timestamp = Date.now()
) => {
  return (
    Math.floor(
      timestamp / 1000 / CANDLE_INTERVAL_SECONDS
    ) * CANDLE_INTERVAL_SECONDS
  );
};

/* =========================================================
   RANDOM MARKET MOVEMENT
========================================================= */

/*
  Generates a random percentage movement.

  Example:

  +0.031%
  -0.047%
  +0.012%
  -0.055%

  Unlike the previous deterministic pattern,
  these movements do NOT cancel out every 5 ticks.
*/

const getRandomMovement = () => {
  const random =
    Math.random() * 2 - 1;

  return (
    random * MAX_STEP_PERCENT
  );
};

/* =========================================================
   INITIAL HISTORICAL CANDLES
========================================================= */

const createInitialCandles = (
  stock
) => {
  const candles = [];

  const now = Date.now();

  let price =
    Number(stock.currentPrice);

  for (
    let i = 120;
    i >= 0;
    i--
  ) {
    const time =
      getCandleTime(
        now -
        i *
          CANDLE_INTERVAL_SECONDS *
          1000
      );

    /*
      Random historical movement.

      This creates a more natural-looking
      market path instead of a mathematical
      repeating pattern.
    */

    const movement =
      (
        (Math.random() * 2 - 1) *
        0.35
      ) / 100;

    const open =
      price;

    const close =
      Number(
        (
          price *
          (1 + movement)
        ).toFixed(2)
      );

    /*
      Candle high.

      Slight random extension above
      open/close.
    */

    const high =
      Number(
        (
          Math.max(
            open,
            close
          ) *
          (
            1 +
            Math.random() *
              0.002
          )
        ).toFixed(2)
      );

    /*
      Candle low.

      Slight random extension below
      open/close.
    */

    const low =
      Number(
        (
          Math.min(
            open,
            close
          ) *
          (
            1 -
            Math.random() *
              0.002
          )
        ).toFixed(2)
      );

    candles.push({
      time,

      open:
        Number(
          open.toFixed(2)
        ),

      high,

      low,

      close,

      volume:
        10000 +
        Math.floor(
          Math.random() * 40000
        ),
    });

    /*
      Next candle starts from
      previous candle close.
    */

    price = close;
  }

  candleHistory.set(
    stock.symbol,

    candles.slice(
      -MAX_CANDLES
    )
  );
};

/* =========================================================
   UPDATE CURRENT CANDLE
========================================================= */

const updateCandle = (
  stock
) => {
  const symbol =
    stock.symbol;

  if (
    !candleHistory.has(
      symbol
    )
  ) {
    createInitialCandles(
      stock
    );
  }

  const candles =
    candleHistory.get(
      symbol
    );

  const time =
    getCandleTime();

  let currentCandle =
    candles[
      candles.length - 1
    ];

  /* -------------------------------------------------------
     CREATE NEW 1-MINUTE CANDLE
  ------------------------------------------------------- */

  if (
    !currentCandle ||
    currentCandle.time !== time
  ) {
    const price =
      Number(
        stock.currentPrice.toFixed(2)
      );

    currentCandle = {
      time,

      open: price,

      high: price,

      low: price,

      close: price,

      volume: 0,
    };

    candles.push(
      currentCandle
    );

    if (
      candles.length >
      MAX_CANDLES
    ) {
      candles.shift();
    }
  }

  /* -------------------------------------------------------
     UPDATE CURRENT CANDLE
  ------------------------------------------------------- */

  const price =
    Number(
      stock.currentPrice.toFixed(2)
    );

  currentCandle.close =
    price;

  currentCandle.high =
    Number(
      Math.max(
        currentCandle.high,
        price
      ).toFixed(2)
    );

  currentCandle.low =
    Number(
      Math.min(
        currentCandle.low,
        price
      ).toFixed(2)
    );

  /*
    Variable volume.

    Real markets don't trade exactly
    the same number of shares every tick.
  */

  currentCandle.volume +=
    50 +
    Math.floor(
      Math.random() * 250
    );

  candleHistory.set(
    symbol,
    candles
  );
};

/* =========================================================
   HISTORICAL CANDLES API
========================================================= */

const getHistoricalCandles = (
  symbol,
  range = "1D"
) => {
  const candles =
    candleHistory.get(
      symbol.toUpperCase()
    );

  if (!candles) {
    return [];
  }

  const limits = {
    "1D": 78,
    "1W": 120,
    "1M": 240,
    "3M": 240,
    "1Y": 240,
    "ALL": 240,
  };

  const limit =
    limits[range] || 78;

  return candles.slice(
    -limit
  );
};

/* =========================================================
   MARKET PAYLOAD
========================================================= */

const toMarketPayload = (
  stock
) => {
  const price =
    Number(
      stock.currentPrice.toFixed(2)
    );

  const previousPrice =
    Number(
      stock.previousClose.toFixed(2)
    );

  const change =
    Number(
      (
        price -
        previousPrice
      ).toFixed(2)
    );

  const changePercent =
    previousPrice
      ? Number(
          (
            (
              change /
              previousPrice
            ) *
            100
          ).toFixed(2)
        )
      : 0;

  return {
    symbol:
      stock.symbol,

    name:
      stock.name,

    exchange:
      stock.exchange,

    price,

    previousPrice,

    change,

    changePercent,

    timestamp:
      new Date().toISOString(),

    ltp:
      price,

    open:
      stock.dayOpen,

    prevClose:
      previousPrice,

    high:
      stock.dayHigh,

    low:
      stock.dayLow,

    currentPrice:
      price,

    previousClose:
      previousPrice,

    dayOpen:
      stock.dayOpen,

    dayHigh:
      stock.dayHigh,

    dayLow:
      stock.dayLow,

    volume:
      stock.volume,
  };
};

/* =========================================================
   ENSURE DUMMY STOCKS
========================================================= */

const ensureDummyStocks = async (
  stocks
) => {
  const existingSymbols =
    new Set(
      stocks.map(
        (stock) =>
          stock.symbol
      )
    );

  const missingStocks =
    DUMMY_STOCKS.filter(
      (stock) =>
        !existingSymbols.has(
          stock.symbol
        )
    );

  if (
    missingStocks.length > 0
  ) {
    await Stock.insertMany(
      missingStocks,
      {
        ordered: false,
      }
    );
  }

  return [
    ...stocks,
    ...missingStocks,
  ];
};

/* =========================================================
   INITIALIZE MARKET
========================================================= */

const initializeMarket =
  async () => {
    const existingStocks =
      await Stock.find({
        isActive: true,
      });

    const stocks =
      await ensureDummyStocks(
        existingStocks
      );

    for (
      const stock of stocks
    ) {
      marketState.set(
        stock.symbol,
        {
          symbol:
            stock.symbol,

          name:
            stock.name,

          exchange:
            stock.exchange,

          currentPrice:
            stock.currentPrice,

          previousClose:
            stock.previousClose,

          dayOpen:
            stock.dayOpen,

          dayHigh:
            stock.dayHigh,

          dayLow:
            stock.dayLow,

          volume:
            stock.volume,
        }
      );

      createInitialCandles(
        stock
      );
    }

    console.log(
      `📈 Market initialized with ${marketState.size} stocks`
    );
  };

/* =========================================================
   MARKET TICK
========================================================= */

const tick = async () => {
  if (
    isTickRunning
  ) {
    return;
  }

  isTickRunning = true;

  tickNumber += 1;

  try {
    for (
      const stock of marketState.values()
    ) {
      /*
        IMPORTANT:

        Old code used:

        -2
        -1
         0
        +1
        +2

        That caused the chart to repeatedly
        return to the same price.

        Now we use random movement.
      */

      const movementPercent =
        getRandomMovement();

      const newPrice =
        Number(
          Math.max(
            0.01,

            stock.currentPrice *
              (
                1 +
                movementPercent /
                  100
              )
          ).toFixed(2)
        );

      stock.currentPrice =
        newPrice;

      /* ---------------------------------------------------
         DAY HIGH
      --------------------------------------------------- */

      if (
        newPrice >
        stock.dayHigh
      ) {
        stock.dayHigh =
          newPrice;
      }

      /* ---------------------------------------------------
         DAY LOW
      --------------------------------------------------- */

      if (
        newPrice <
        stock.dayLow
      ) {
        stock.dayLow =
          newPrice;
      }

      /* ---------------------------------------------------
         MARKET VOLUME
      --------------------------------------------------- */

      stock.volume +=
        50 +
        Math.floor(
          Math.random() * 250
        );

      /* ---------------------------------------------------
         CANDLE
      --------------------------------------------------- */

      updateCandle(
        stock
      );

      /* ---------------------------------------------------
         REDIS
      --------------------------------------------------- */

      /*
        Redis persistence is deliberately isolated
        from the live market loop.

        If Redis temporarily disconnects, the market
        price and Socket.IO updates continue normally.
      */

      await saveMarketStateSafely(
        stock
      );

      /* ---------------------------------------------------
         SOCKET.IO
      --------------------------------------------------- */

      emitPriceUpdated(
        toMarketPayload(
          stock
        )
      );
    }
  } finally {
    isTickRunning =
      false;
  }
};

/* =========================================================
   START SIMULATOR
========================================================= */

const startMarketSimulator =
  () => {
    setInterval(
      tick,
      TICK_INTERVAL_MS
    );

    console.log(
      `📊 Market simulator started (${marketState.size} stocks)`
    );
  };

/* =========================================================
   GET MARKET STATE
========================================================= */

const getMarketState =
  () => {
    return Array.from(
      marketState.values()
    ).map(
      toMarketPayload
    );
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  initializeMarket,

  startMarketSimulator,

  getMarketState,

  getHistoricalCandles,

};