// developer.controller.js
import { Developer } from "../models/developer.model.js";
import { Property } from "../models/property.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
// import { saveImageToMongo } from "./image.controller.js";
import { Image } from "../models/image.model.js";

import multer from 'multer';

// Setup multer for handling multipart/form-data
const storage = multer.memoryStorage();
const upload = multer({ storage }).single('developerImg');

// Controller to create a developer
export const createDeveloper = asyncHandler(async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json(new ApiError(400, "Error uploading image"));
    }

    const { name, description, totalProperties } = req.body;
    const developerImg = req.file;

    if (!name || !developerImg || !description || !totalProperties) {
      throw new ApiError(400, "Name, developer image, description, and total properties are required");
    }

    try {
      // Call the saveImageToMongo function to save the image to MongoDB
      // const savedImage = await saveImageToMongo(developerImg.buffer, developerImg.mimetype, name);

      // Check if a developer with the same name already exists
      const existingDeveloper = await Developer.findOne({ name });

      if (existingDeveloper) {
        throw new ApiError(400, "Developer with the same name already exists");
      }

      const developer = new Developer({ name, developerImg: 'GHJK', description, totalProperties });
      await developer.save();

      return res.status(201).json(new ApiResponse(201, developer, "Developer created successfully"));
    } catch (error) {
      console.error('Error creating developer:', error);
      throw new ApiError(500, "Error creating developer");
    }
  });
});


export const getDevelopers = asyncHandler(async (req, res) => {
  try {
    const developers = await Developer.find();


    return res.status(200).json(new ApiResponse(200, developers, "Developers retrieved successfully"));
  } catch (error) {
    console.error('Error fetching developers:', error);
    throw new ApiError(500, "Error fetching developers");
  }
});

export const getDeveloperById = asyncHandler(async (req, res) => {
  const { developerId } = req.params;
  const developer = await Developer.findById(developerId);
  
  if (!developer) {
    throw new ApiError(404, "Developer not found");
  }
  
  return res.status(200).json(new ApiResponse(200, developer, "Developer retrieved successfully"));
});

export const updateDeveloper = asyncHandler(async (req, res) => {
  const { developerId } = req.params;
  const updateData = req.body;
  
  const developer = await Developer.findById(developerId);
  
  if (!developer) {
    throw new ApiError(404, "Developer not found");
  }
  
  Object.keys(updateData).forEach((key) => {
    developer[key] = updateData[key];
  });
  
  await developer.save();
  
  return res.status(200).json(new ApiResponse(200, developer, "Developer updated successfully"));
});

export const deleteDeveloper = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const developer = await Developer.findById(id);
  
  if (!developer) {
    throw new ApiError(404, "Developer not found");
  }
  
  await Developer.findByIdAndDelete(id);
  
  return res.status(200).json(new ApiResponse(200, null, "Developer deleted successfully"));
});
