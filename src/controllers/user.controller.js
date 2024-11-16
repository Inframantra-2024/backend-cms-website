import { User } from "../models/user.model.js";
import { Role } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import bcrypt from "bcryptjs";


// Create new user
export const createUser = async (req, res) => {
    const { email, phoneNumber, userName, password, role, firstName, lastName, file, coverPhoto, registerDevices, customFields } = req.body;
  
    const newUser = new User({
      email,
      phoneNumber,
      userName,
      password,
      role,
      firstName,
      lastName,
    });
  
    try {
      const savedUser = await newUser.save();
      res.status(201).json(savedUser);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  };
  
  // Update user
  export const updateUser = async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      Object.assign(user, req.body);
  
      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
      }
  
      const updatedUser = await user.save();
      res.json(updatedUser);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  };

 export  const userloginAuth = asyncHandler(async (req, res) => {
    const { userName, password } = req.body;
    try{
  
    const existingUser = await User.findOne({ userName });
    if (!existingUser) {
      throw new ApiError(404, 'Username Not Registered');
    }
    const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);
    if (!isPasswordCorrect) {
      throw new ApiError(401, 'Incorrect Password Entered');
    }
    const userCredentials = {
      name: existingUser._id,
    //   roles: existingUser.roles,
    };
    return res
      .status(200)
      .json(new ApiResponse(200, userCredentials, 'User Logged In Successfully'));
    }catch(error){
      return res.status(error.statusCode).json(new ApiResponse(error.statusCode, error.message));
    }
  }
);
