// routes/testimonial.routes.js
import express from 'express';
import {
  createTestimonial,
  getTestimonials,
  getTestimonialById,
  updateTestimonial,
  deleteTestimonial
} from '../controllers/testimonials.controller.js';

const router = express.Router();

router.post('/create', createTestimonial);
router.get('/get', getTestimonials);
router.get('/get/:id', getTestimonialById);
router.put('/update/:id', updateTestimonial);
router.delete('/delete/:id', deleteTestimonial);

export default router;
