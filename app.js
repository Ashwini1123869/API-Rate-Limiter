const express = require("express");
const Redis = require("redis");

const app = express();
const PORT = 5000;

// Serve static files
app.use(express.static("public"));

// Redis client
const redisClient = Redis.createClient({
  url: "redis://127.0.0.1:6379",
});

redisClient.connect().catch(console.error);

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

const rateLimiter = async (req, res, next) => {
  const ip = req.ip || "unknown";
  const limit = 3;
  const window = 4;

  try {
    const requests = await redisClient.incr(ip);
    console.log(`RateLimit Check: ${ip} -> ${requests}/${limit}`);

    if (requests === 1) {
      await redisClient.expire(ip, window);
    }

    if (requests > limit) {
      console.warn(`RateLimit Exceeded for ${ip}`);
      return res.status(429).json({
        message: "Too many requests",
        try_after_seconds: window,
      });
    }

    next();
  } catch (err) {
    console.error("Redis Error in RateLimiter:", err);
    // If Redis is down, we might want to let the request through or fail gracefully.
    // For now, let's just pass the error to Express.
    next(err);
  }
};

app.use(rateLimiter);

app.get("/welcome", (req, res) => res.json({ message: "Welcome to API" }));

app.get("/status", (req, res) =>
  res.send(["Success", "Fail", "Pending"])
);

app.get("/api-summary", (req, res) =>
  res.json({
    status: "Healthy",
    version: "2.1.0",
    region: "Asia-South (Mumbai)",
    active_connections: 42
  })
);

// Global Error Handler (Always return JSON)
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);
  res.status(500).json({
    message: "Internal Server Error",
    error: err.message,
    tip: "Check if Redis is running and the server was restarted."
  });
});

app.listen(PORT, () => {
  console.log("-----------------------------------------");
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log("-----------------------------------------");
});
