// models/testimonial.model.js
import mongoose from 'mongoose';

const { Schema } = mongoose;

const testimonialSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: false,
    },
  },
  { timestamps: true, versionKey: false }
);

export const Testimonial = mongoose.model('Testimonial', testimonialSchema);
