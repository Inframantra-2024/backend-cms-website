// controllers/testimonial.controller.js
import { Testimonial } from '../models/testimonials.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Create a new testimonial
export const createTestimonial = asyncHandler(async (req, res) => {
  const { name, description, image } = req.body;

  const newTestimonial = new Testimonial({ name, description, image });
  const savedTestimonial = await newTestimonial.save();

  return res.status(201).json(new ApiResponse(201, savedTestimonial, 'Testimonial created successfully'));
});

// Get all testimonials
export const getTestimonials = asyncHandler(async (req, res) => {
  const testimonials = await Testimonial.find();
  return res.status(200).json(new ApiResponse(200, testimonials, 'Testimonials fetched successfully'));
});

// Get a single testimonial by ID
export const getTestimonialById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const testimonial = await Testimonial.findById(id);
  if (!testimonial) {
    throw new ApiError(404, 'Testimonial not found');
  }

  return res.status(200).json(new ApiResponse(200, testimonial, 'Testimonial fetched successfully'));
});



// Update a testimonial by ID
export const updateTestimonial = async (req, res) => {
  const { id } = req.params;
  const { name, description, image } = req.body;

  try {
    // Find the testimonial by ID
    let testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({ message: 'Testimonial not found' });
    }

    // Update the testimonial fields only if new values are provided
    if (name !== undefined) {
      testimonial.name = name;
    }
    if (description !== undefined) {
      testimonial.description = description;
    }
    if (image !== undefined) {
      testimonial.image = image;
    }

    // Save the updated testimonial
    testimonial = await testimonial.save();

    return res.status(200).json({ success: true, data: testimonial, message: 'Testimonial updated successfully' });
  } catch (error) {
    console.error('Error updating testimonial:', error);
    return res.status(500).json({ success: false, message: 'Error updating testimonial', error: error.message });
  }
};



// Delete a testimonial by ID
export const deleteTestimonial = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deletedTestimonial = await Testimonial.findByIdAndDelete(id);

  if (!deletedTestimonial) {
    throw new ApiError(404, 'Testimonial not found');
  }

  return res.status(200).json(new ApiResponse(200, null, 'Testimonial deleted successfully'));
});
