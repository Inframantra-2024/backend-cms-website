import express from "express";

import { createEnquiry, createContactEnquiry } from '../controllers/enquiry.controller.js';
import createRateLimiter from "../utils/rateLimiter.js";

const enquiryLimiter = createRateLimiter(1 * 60 * 1000, 5, 'Too many requests from this IP, please try again after a minute');

const router = express.Router();

router.post("/project", enquiryLimiter, createEnquiry)
       .post('/contact', enquiryLimiter, createContactEnquiry)


export default router;