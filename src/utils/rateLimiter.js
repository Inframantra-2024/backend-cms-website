// const rateLimit = require('express-rate-limit');

import rateLimit from 'express-rate-limit';

// Create a rate limiter function
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs: windowMs,
    max: max,
    message: message || 'Too many requests from this IP, please try again later',
  });
};

export default  createRateLimiter;
