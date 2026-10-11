const express = require("express");

const marketController =
  require("./market.controller");

const asyncHandler =
  require("../../utils/async-handler");

  const upstoxAuthController =
  require("./upstox-auth.controller");

  const upstoxHistoryController =
  require("./upstox-history.controller");

const router = express.Router();


router.get(
  "/",
  asyncHandler(
    marketController.getMarketState
  )
);

router.get(
  "/upstox/auth",
  asyncHandler(
    upstoxAuthController.startAuthorization
  )
);

router.get(
  "/upstox/callback",
  asyncHandler(
    upstoxAuthController.handleCallback
  )
);

router.get(
  "/upstox/:symbol/candles",
  asyncHandler(upstoxHistoryController.getHistoricalCandles)
);

router.get(
  "/:symbol/candles",
  asyncHandler(
    marketController.getHistoricalCandles
  )
);


module.exports = router;