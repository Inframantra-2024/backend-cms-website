import mongoose from "mongoose";

const { Schema } = mongoose;

const citySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    cityImages: [
      {
        type: String,
        imageUrl: String,
      },
    ],
    rera: {
      type: Number,
    },
    priorityOrder: {
      type: Number,
    },
    state: {
      type: Schema.Types.ObjectId,
      ref: "State",
      required: true,
    },
    localities: [
      {
        type: Schema.Types.ObjectId,
        ref: "Locality",
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

citySchema.index({ name: 1 }, { unique: true });

export const City = mongoose.model("City", citySchema);
