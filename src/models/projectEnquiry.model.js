import mongoose from "mongoose";

const { Schema } = mongoose;

const projectEnquirySchema = new Schema({
    projectName: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    configuration: { type: String, required: false }
}, { timestamps: true, versionKey: false });


projectEnquirySchema.index({name: 1})

//   module.exports = mongoose.model('Contact', contactSchema);

export const projectEnquiry = mongoose.model("projectEnquiry", projectEnquirySchema);