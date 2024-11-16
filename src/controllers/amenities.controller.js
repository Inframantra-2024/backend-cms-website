import { asyncHandler } from "../utils/asyncHandler.js";
import { Amenity } from "../models/amenities.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const addAmenity = asyncHandler(async (req, res) => {
    const { title, iconUrl } = req.body;

    if (!title || !iconUrl) {
        throw new ApiError(400, "Title and icon URL are required");
    }

    const existingAmenity = await Amenity.findOne({ title });
    if (existingAmenity) {
        throw new ApiError(400, "Amenity already exists");
    }

    const amenity = new Amenity({ title, iconUrl });

    await amenity.save();

    return res
        .status(201)
        .json(new ApiResponse(201, amenity, "Amenity added successfully"));
});

export const bulkAddAmenities = asyncHandler(async (req, res) => {
    const { amenities } = req.body;

    if (!amenities || !Array.isArray(amenities) || amenities.length === 0) {
        throw new ApiError(400, "An array of amenities is required");
    }

    const invalidAmenities = amenities.filter(
        (amenity) => !amenity.title || !amenity.iconUrl
    );
    if (invalidAmenities.length > 0) {
        throw new ApiError(400, "Each amenity must have a title and icon URL");
    }

    const titles = amenities.map((amenity) => amenity.title);
    const duplicateTitles = titles.filter(
        (title, index) => titles.indexOf(title) !== index
    );
    if (duplicateTitles.length > 0) {
        throw new ApiError(
            400,
            `Duplicate amenity titles found: ${duplicateTitles.join(", ")}`
        );
    }

    const createdAmenities = await Amenity.insertMany(amenities);

    return res
        .status(201)
        .json(
            new ApiResponse(201, createdAmenities, "Amenities added successfully")
        );
});


export const getAllAmenities = asyncHandler(async (req, res) => {
    const amenities = await Amenity.find();
    return res.status(200).json(new ApiResponse(200, amenities, 'Amenities retrieved successfully'));
});

// Get a single amenity by ID
export const getAmenityById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const amenity = await Amenity.findById(id);

    if (!amenity) {
        throw new ApiError(404, 'Amenity not found');
    }

    return res.status(200).json(new ApiResponse(200, amenity, 'Amenity retrieved successfully'));
});

// Update an amenity by ID
export const updateAmenityById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, iconUrl } = req.body;

    const amenity = await Amenity.findByIdAndUpdate(
        id,
        { title, iconUrl },
        { new: true, runValidators: true }
    );

    if (!amenity) {
        throw new ApiError(404, 'Amenity not found');
    }

    return res.status(200).json(new ApiResponse(200, amenity, 'Amenity updated successfully'));
});

// Delete an amenity by ID
export const deleteAmenityById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const amenity = await Amenity.findByIdAndDelete(id);

    if (!amenity) {
        throw new ApiError(404, 'Amenity not found');
    }

    return res.status(200).json(new ApiResponse(200, null, 'Amenity deleted successfully'));
});