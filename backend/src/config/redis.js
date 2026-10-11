
const { createClient } = require("redis");
const logger = require("./logger");

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error("Redis reconnect attempts exceeded");
        return new Error("Redis reconnect failed");
      }
      return Math.min(retries * 500, 5000);
    },
  },
});

redisClient.on("error", (err) => {
  logger.error("Redis error", { error: err.message });
});

redisClient.on("connect", () => {
  logger.info("Redis connecting");
});

redisClient.on("ready", () => {
  logger.info("Redis ready");
});

redisClient.on("reconnecting", () => {
  logger.warn("Redis reconnecting");
});

redisClient.on("end", () => {
  logger.warn("Redis connection closed");
});

const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  await redisClient.ping();
  logger.info("Redis connected successfully");
};

const isRedisReady = () => redisClient.isReady;

const closeRedis = async () => {
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
  logger.info("Redis disconnected");
};

module.exports = {
  redisClient,
  connectRedis,
  isRedisReady,
  closeRedis,
};