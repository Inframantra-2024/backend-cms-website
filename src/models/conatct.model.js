import mongoose from "mongoose";

const { Schema } = mongoose;

const contactSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true },
}, { timestamps: true, versionKey: false });

contactSchema.index({name: 1})

//   module.exports = mongoose.model('Contact', contactSchema);

export const contactEnquiry = mongoose.model("contactEnquiry", contactSchema);