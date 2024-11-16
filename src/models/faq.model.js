import mongoose from 'mongoose';

const { Schema } = mongoose;

const faqSchema = new Schema(
  {
    question: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'FaqCategory',
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
);

export const Faq = mongoose.model('Faq', faqSchema);
