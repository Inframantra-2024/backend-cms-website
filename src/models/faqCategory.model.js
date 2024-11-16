import mongoose from 'mongoose';

const { Schema } = mongoose;

const faqCategorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
    },
  },
  { timestamps: true, versionKey: false }
);

export const FaqCategory = mongoose.model('FaqCategory', faqCategorySchema);
