import mongoose from "mongoose";

const searchOptionSchema = new mongoose.Schema(
  {
    searchList: {
      locality: [
        {
          type: String,
          unique: true,
          required: true,
        },
      ],
      subLocality: [
        {
          type: String,
          unique: true,
          required: true,
        },
      ],
      property: [
        {
          type: String,
          unique: true,
          required: true,
        },
      ],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const SearchOptions = mongoose.model(
  "Search Options",
  searchOptionSchema
);
