import mongoose from "mongoose";

const { Schema } = mongoose;

const subLocalitySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    subLocalityImages: [
      {
        type: String,
        imageUrl: String,
      },
    ],
    priorityOrder: {
      type: Number,
    },
    locality: {
      type: Schema.Types.ObjectId,
      ref: "Locality",
      required: true,
    },
    properties: [
      {
        type: Schema.Types.ObjectId,
        ref: "Property",
      },
    ],
  },
  { timestamps: true, versionKey: false }
);

subLocalitySchema.index({ name: 1, locality: 1 });

export const SubLocality = mongoose.model("SubLocality", subLocalitySchema);
