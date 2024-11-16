import mongoose from "mongoose";

const { Schema } = mongoose;

const amenitySchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    iconUrl: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

amenitySchema.index({ title: 1 });

export const Amenity = mongoose.model("Amenity", amenitySchema);