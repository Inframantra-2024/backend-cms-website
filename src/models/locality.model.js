import mongoose from "mongoose";

const { Schema } = mongoose;

const localitySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    priorityOrder: {
      type: Number,
    },
    city: {
      type: Schema.Types.ObjectId,
      ref: "City",
    },
    subLocalities: [
      {
        type: Schema.Types.ObjectId,
        ref: "SubLocality",
      },
    ],
    properties: [
      {
        type: Schema.Types.ObjectId,
        ref: "Property",
      },
    ],
  },
  { timestamps: true, versionKey: false }
);

localitySchema.index({ name: 1, city: 1 });

export const Locality = mongoose.model("Locality", localitySchema);
