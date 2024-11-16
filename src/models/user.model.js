import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import uniqueValidator from "mongoose-unique-validator";

// Define the Role Schema
const roleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: {
    type: String,
    required: true,
    unique: true,
    index: true,
    enum: ['SUPER_ADMIN', 'PROFESSIONAL', 'USER', 'CONTENT_MANAGER'],
  },
  isAdmin: { type: Boolean, default: false },
  description: { type: String, default: "" },
  privileges: { type: Object },
  active: { type: Boolean, default: true },
}, { timestamps: true, versionKey: false });

roleSchema.plugin(uniqueValidator, { message: 'Duplicate Entry {PATH}' });

roleSchema.pre('save', async function (next) { next(); });

export const Role = mongoose.model('Role', roleSchema);

// Define the User Schema
const userSchema = new mongoose.Schema(
  {
    email: { type: String },
    phoneNumber: { type: Number },
    userName: { type: String },
    password: { type: String },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    firstName: { type: String },
    lastName: { type: String },
    file: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
    coverPhoto: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
    registerDevices: [{ type: Object }],
    active: { type: Boolean, default: true },
    firstLogin: { type: Boolean, default: true },
    online: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customFields: { type: Object, default: {} }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.plugin(uniqueValidator, { message: "Duplicate Entry {PATH}" });

userSchema.pre("save", async function (next) {
  if (this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Custom method to verify password
userSchema.methods.isValidPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

export const User = mongoose.model("User", userSchema);
