import mongoose from "mongoose";

const DataSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  }
});

const CitySchema = new mongoose.Schema({
  city: {
    type: String,
    required: true
  },
  data: [DataSchema]
});

const SearchQuerySchema = new mongoose.Schema({
  city: [CitySchema]
});

export const SearchQuery = mongoose.model("SearchQuery", SearchQuerySchema);


