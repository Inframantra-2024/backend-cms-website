import mongoose from "mongoose";

const { Schema } = mongoose;

const stateSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    priorityOrder: {
      type: Number,
    },
    cities: [
      {
        type: Schema.Types.ObjectId,
        ref: "City",
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

stateSchema.index({ name: 1 }, { unique: true });

export const State = mongoose.model("State", stateSchema);
