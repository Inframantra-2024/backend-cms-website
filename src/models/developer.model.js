import mongoose from "mongoose";

const { Schema } = mongoose;

const developerSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  properties: [
    {
      type: String,
      required: true,
    },
  ],
  developerImg: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  totalProperties: {
    type: Number,
    required: true,
  },
  
},{
  timestamps: true,
  versionKey: false,
});

developerSchema.index({ name: 1 });

export const Developer = mongoose.model("Developer", developerSchema);
