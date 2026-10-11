const upstoxHistoryService = require("./upstox-history.service");

const getHistoricalCandles = async (req, res) => {
  const { symbol } = req.params;
  const {
    from,
    to,
    unit = "days",
    interval = "1",
  } = req.query;

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!from || !to || !datePattern.test(from) || !datePattern.test(to)) {
    return res.status(400).json({
      success: false,
      message: "Provide valid from and to dates in YYYY-MM-DD format",
    });
  }

  if (from > to) {
    return res.status(400).json({
      success: false,
      message: "'from' date must be before or equal to 'to' date",
    });
  }

  const candles = await upstoxHistoryService.getHistoricalCandles({
    symbol,
    unit,
    interval,
    fromDate: from,
    toDate: to,
  });

  return res.status(200).json({
    success: true,
    source: "upstox",
    data: {
      symbol: symbol.toUpperCase(),
      unit,
      interval,
      from,
      to,
      candles,
    },
  });
};

module.exports = { getHistoricalCandles };