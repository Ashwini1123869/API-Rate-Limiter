const express = require("express");
const Redis = require("redis");

const app = express();
const PORT = 5000;

// Redis client
const redisClient = Redis.createClient({
  url: "redis://127.0.0.1:6379",
});

redisClient.connect().catch(console.error);

const rateLimiter = async (req, res, next) => {
  const ip = req.ip;
  const limit = 3;
  const window = 4; 

  const requests = await redisClient.incr(ip);

  if (requests === 1) {
    await redisClient.expire(ip, window);
  }

  if (requests > limit) {
    return res.status(429).json({
      message: "Too many requests",
      try_after_seconds: window,
    });
  }

  next();
};

app.use(rateLimiter);

app.get("/", (req, res) => res.send("Welcome to API"));

app.get("/status", (req, res) =>
  res.send(["Success", "Fail", "Pending"])
);

app.get("/languages", (req, res) =>
  res.send(["Java", "Python", "JS"])
);

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
