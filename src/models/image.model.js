
import mongoose from "mongoose";

const { Schema } = mongoose;

const imageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  image: {
    type: Buffer,
    required: true,
  },
  contentType: {
    type: String,
    required: true,
  },
  // other metadata fields
});

export const Image = mongoose.model("Image", imageSchema);
