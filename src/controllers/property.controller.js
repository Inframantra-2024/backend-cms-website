import { State } from "../models/state.model.js";
import { City } from "../models/city.model.js";
import { Locality } from "../models/locality.model.js";
import { SubLocality } from "../models/subLocality.model.js";
import { Property } from "../models/property.model.js";
import { Developer } from '../models/developer.model.js'
import { Amenity } from "../models/amenities.model.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ObjectId } from 'mongodb';


import s3Client from "../s3.js";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { SearchQuery } from '../models/searchQuery.model.js'


const checkMissingFields = (propertyData) => {
    const requiredFields = ['name', 'priority'];
    const missingFields = [];

    requiredFields.forEach(field => {
        if (!propertyData[field]) {
            missingFields.push(field);
        }
    });

    if (missingFields.length > 0) {
        throw new ApiError(400, `Missing required fields in propertyData: ${missingFields.join(', ')}`);
    }
};

const validatePropertyData = (propertyData) => {
    const { featured, exclusive, priority, } = propertyData;
    const carpetArea = propertyData.floorPlan.carpetArea;
    const superArea = propertyData.floorPlan.superArea;

    if (featured !== undefined && typeof featured !== 'boolean') {
        throw new ApiError(400, "Featured must be a boolean value");
    }

    if (exclusive !== undefined && typeof exclusive !== 'boolean') {
        throw new ApiError(400, "Exclusive must be a boolean value");
    }

    if (featured && exclusive) {
        throw new ApiError(400, "Featured and exclusive cannot both be true");
    }

    const validPriorities = ['HIGH', 'MEDIUM', 'LOW'];
    if (!validPriorities.includes(priority)) {
        throw new ApiError(400, "Priority must be HIGH, MEDIUM, or LOW");
    }
    // Delete keys based on conditions
    if (featured) {
        delete propertyData.exclusive;
    }
    if (exclusive) {
        delete propertyData.featured;
    }

    if (superArea) {
        delete propertyData.carpetArea;
    }
    if (carpetArea) {
        delete propertyData.superArea;
    }
};

const convertPriceToNumber = (priceStr) => {
    if (!priceStr || typeof priceStr !== 'string') {
        throw new Error('Invalid price string');
    }

    // Trim and convert the string to lowercase for easier parsing
    priceStr = priceStr.replace(/₹/g, '').trim().toLowerCase();
    // priceStr = priceStr.trim().toLowerCase();

    // Define conversion multipliers
    const multipliers = {
        'cr': 1e7, // 1 Crore = 10,000,000
        'cr*': 1e7,
        'crore': 1e7,
        'lakh': 1e5, // 1 Lakh = 100,000
        'lakhs': 1e5,
        'k': 1e3, // 1 Thousand = 1,000
        'thousand': 1e3,
        'th': 1e3,
        '': 1 // Default multiplier if no suffix
    };

    // Regular expression to extract numeric value and suffix
    const match = priceStr.match(/^([\d.,]+)\s*(cr\*?|crore|lakh|lakhs|k|thousand)?$/);

    if (!match) {
        console.error('Price string format is incorrect:', priceStr); // Log the erroneous format
        throw new Error('Price string format is incorrect');
    }

    let value = parseFloat(match[1].replace(/,/g, '')); // Remove commas and parse number
    const suffix = match[2].trim(); // Extract suffix

    // Apply the correct multiplier
    const multiplier = multipliers[suffix] || multipliers[''];

    return value * multiplier;
};


export const createProperty = asyncHandler(async (req, res) => {
    const { stateName, cityName, localityName, subLocalityName, propertyData } = req.body;

    // Validate required fields
    if (!stateName || !cityName || !propertyData || !localityName || !subLocalityName) {
        throw new ApiError(400, "State name, city name, locality name, sub locality name and property data are required");
    }

    // Fetch or create state
    let state = await State.findOne({ name: stateName });
    if (!state) {
        state = new State({ name: stateName });
        await state.save();
    }

    // Fetch or create city
    let city = await City.findOne({ name: cityName, state: state._id });
    if (!city) {
        city = new City({ name: cityName, state: state._id });
        await city.save();
        state.cities.push(city._id);
        await state.save();
    }

    // Fetch or create locality
    let locality = await Locality.findOne({ name: localityName, city: city._id });
    if (!locality) {
        locality = new Locality({ name: localityName, city: city._id });
        await locality.save();
        city.localities.push(locality._id);
        await city.save();
    }

    // Fetch or create sub locality
    let subLocality = await SubLocality.findOne({ name: subLocalityName, locality: locality._id });
    if (!subLocality) {
        subLocality = new SubLocality({ name: subLocalityName, locality: locality._id });
        await subLocality.save();
        locality.subLocalities.push(subLocality._id);
        await locality.save();
    }

    // Validate and check for missing fields in propertyData
    if (!propertyData.name) {
        throw new ApiError(400, "Property name is required");
    }
    if (!propertyData.developer) {
        throw new ApiError(400, "Developer is required");
    }

    // Check if property name already exists
    let propertyName = await Property.findOne({ name: propertyData.name });
    if (propertyName) {
        throw new ApiError(400, "Property name exists, duplicate cannot be saved");
    }

    try {
        // Create the property
        const property = new Property({
            ...propertyData,
            state: state._id,
            city: city._id,
            locality: locality._id,
            subLocality: subLocality ? subLocality._id : undefined,

        });

        // Generate the folder name dynamically based on the property name without spaces
        const projectName = propertyData.name.replace(/\s+/g, '').toLowerCase();
        const propertiesFolder = `properties/${projectName}/`;
        const cdnEndpoint = "https://inframantra.blr1.cdn.digitaloceanspaces.com";

        // Fetch images from the properties folder
        const propertyImagesParams = {
            Bucket: "inframantra",
            Prefix: propertiesFolder,
            MaxKeys: 10,
        };
        const propertyImagesData = await s3Client.send(new ListObjectsV2Command(propertyImagesParams));
        const propertyFiles = propertyImagesData.Contents || [];
        const propertyFilteredFiles = propertyFiles.filter(file => file.Key.endsWith('.avif'));

        // Map fetched images to imageGallery schema and add to the property
        const imageGallery = propertyFilteredFiles.map((file) => ({
            url: `${cdnEndpoint}/${file.Key}`,
            title: propertyData.name, // Use property name as title
        }));

        // Assign imageGallery to property
        property.imageGallery = imageGallery;

        // Fetch floor plans based on configurations
        const floorPlans = propertyData.floorPlan || [];
        const floorPlanFolder = `floorPlan/${projectName}/`;
        const floorPlanFilesParams = {
            Bucket: "inframantra",
            Prefix: `${floorPlanFolder}`,
            MaxKeys: 10,
        };
        const floorPlanFilesData = await s3Client.send(new ListObjectsV2Command(floorPlanFilesParams));
        const floorPlanFiles = floorPlanFilesData.Contents || [];
        const filteredFloorPlanFiles = floorPlanFiles.filter(file => file.Key.endsWith('.avif'));

        // Assign floor images to floor plans
        for (const plan of floorPlans) {
            const configKey = plan.configuration.replace(/\s+/g, '').toLowerCase() + '.avif';
            const matchingFile = filteredFloorPlanFiles.find(file => file.Key.includes(configKey));
            if (matchingFile) {
                plan.floorImg = `${cdnEndpoint}/${matchingFile.Key}`;
            } else {
                plan.floorImg = ''; // Assign a vacant string if no matching file is found
            }
        }

        // Fetch brochures
        const brochureFolder = `brochure/${projectName}`;
        const brochureParams = {
            Bucket: "inframantra",
            Prefix: `${brochureFolder}`,
            MaxKeys: 10,
        };
        const brochureFilesData = await s3Client.send(new ListObjectsV2Command(brochureParams));
        const brochureFiles = brochureFilesData.Contents || [];
        const filteredBrochureFiles = brochureFiles.filter(file => file.Key.endsWith('.pdf'));

        // Fetch property logo
        const propertyLogoFolder = `propertyLogo/${projectName}`;
        const propertyLogoParams = {
            Bucket: "inframantra",
            Prefix: `${propertyLogoFolder}`,
            MaxKeys: 10,
        };
        const propertyLogoFilesData = await s3Client.send(new ListObjectsV2Command(propertyLogoParams));
        const propertyLogoFiles = propertyLogoFilesData.Contents || [];
        const filteredPropertyLogoFiles = propertyLogoFiles.filter(file => file.Key.endsWith('.avif'));

        // Assign brochures and property logo
        property.propertyLogo = filteredPropertyLogoFiles.map(file => `${cdnEndpoint}/${file.Key}`);
        property.brochure = filteredBrochureFiles.map(file => `${cdnEndpoint}/${file.Key}`);
        property.floorPlan = floorPlans;
        const developer = await Developer.findById(propertyData.developer);
        // Save the property
        console.log("developer",developer)
        // property.developer = developer._id;
        await property.save();

        // Update relationships with subLocality, locality, city, and state
        if (subLocality) {
            subLocality.properties.push(property._id);
            await subLocality.save();
        }
        locality.properties.push(property._id);
        await locality.save();
        city.properties.push(property._id);
        await city.save();
        state.properties.push(property._id);
        await state.save();

        // Associate property with developer
        if (propertyData.developer) {
            const developer = await Developer.findById(propertyData.developer);
            if (developer && !developer.properties.includes(property._id)) {
                developer.properties.push(property._id);
                await developer.save();
            }
        }

        // Respond with success
        return res.status(201).json({
            status: 201,
            data: property,
            message: "Property created successfully",
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            throw new ApiError(400, error.message);
        }
        console.error('Error creating property:', error);
        throw new ApiError(500, 'An error occurred while creating the property');
    }
});

export const getAllProjectNamesAndIds = asyncHandler(async (req, res) => {
    try {
        // Query to get all project names and their _id fields
        const projects = await Property.find().populate('locality', 'name _id')
        .populate('city', "name _id")
        .populate('state', 'name _id')
        .populate('subLocality', 'name _id')
        .populate('developer');

        // Return the results
        return res.status(200).json({
            status: 200,
            data: projects,
            message: "Project names and IDs fetched successfully",
        });
    } catch (error) {
        console.error('Error fetching project names and IDs:', error);
        throw new ApiError(500, 'An error occurred while fetching the project names and IDs');
    }
});

export const getSearchOptionsData = asyncHandler(async (req, res) => {
    try {
        // Fetch all properties with their related state, city, locality, and sublocality data
        const projects = await Property.find()
            .populate('locality', 'name _id')
            .populate('city', "name _id")
            .populate('state', 'name _id')
            .populate('subLocality', 'name _id')
            .populate('developer');

        // Structure the data into the desired format
        const searchOptionsData = {};

        projects.forEach(project => {
            // Check if city data exists
            if (project.city && project.city.name) {
                const cityName = project.city.name;

                if (!searchOptionsData[cityName]) {
                    searchOptionsData[cityName] = [];
                }

                // Add the property
                searchOptionsData[cityName].push({
                    title: project.name,
                    type: "property",
                });

                // Add the sublocality, if it exists
                if (project.subLocality && project.subLocality.name) {
                    searchOptionsData[cityName].push({
                        title: project.subLocality.name,
                        type: "subLocality",
                    });
                }

                // Add the locality, if it exists
                if (project.locality && project.locality.name) {
                    searchOptionsData[cityName].push({
                        title: project.locality.name,
                        type: "locality",
                    });
                }
            }
        });

        // Return the results
        return res.status(200).json({
            status: 200,
            data: searchOptionsData,
            message: "Search options data fetched successfully",
        });
    } catch (error) {
        console.error('Error fetching search options data:', error);
        throw new ApiError(500, 'An error occurred while fetching the search options data');
    }
});

export const getAllProjectsData = asyncHandler(async (req, res) => {
    try {
        // Fetch all properties with their related state, city, locality, and sublocality data
        const projects = await Property.find()
            .populate('locality', 'name _id')
            .populate('city', "name _id")
            .populate('state', 'name _id')
            .populate('subLocality', 'name _id')
            .populate('developer');

        // Initialize an array to hold all project names and types
        const allProjects = [];

        projects.forEach(project => {
            // Add the property
            allProjects.push({
                title: project.name,
                type: "property",
            });

            // Add the sublocality, if it exists
            // if (project.subLocality && project.subLocality.name) {
            //     allProjects.push({
            //         title: project.subLocality.name,
            //         type: "subLocality",
            //     });
            // }

            // Add the locality, if it exists
            if (project.locality && project.locality.name) {
                allProjects.push({
                    title: project.locality.name,
                    type: "locality",
                });
            }
        });

        // Return the results
        return res.status(200).json({
            status: 200,
            data: allProjects,
            message: "All projects data fetched successfully",
        });
    } catch (error) {
        console.error('Error fetching all projects data:', error);
        throw new ApiError(500, 'An error occurred while fetching the projects data');
    }
});



export const getPropertyById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        const property = await Property.findById(id)
            .populate('locality', 'name _id')
            .populate('city', "name _id")
            .populate('state', 'name _id')
            .populate('subLocality', 'name _id')
            .populate('developer');

        if (!property) {
            throw new ApiError(404, `Property with ID ${id} not found`);
        }

        // Check the length of exclusiveAmenities
        let { exclusiveAmenities, amenities } = property.toObject();

        // Filter out null values
        exclusiveAmenities = exclusiveAmenities.filter(a => a !== null);
        amenities = amenities.filter(a => a !== null);

        if (exclusiveAmenities.length < 6) {
            // Calculate how many more amenities are needed
            const additionalAmenitiesNeeded = 6 - exclusiveAmenities.length;

            // Filter amenities to exclude ones already in exclusiveAmenities
            const exclusiveAmenitiesIds = exclusiveAmenities.map(a => a._id.toString());
            const additionalAmenities = amenities.filter(a => !exclusiveAmenitiesIds.includes(a._id.toString()))
                                                 .slice(0, additionalAmenitiesNeeded);

            // Add additional amenities to exclusiveAmenities
            exclusiveAmenities = [...exclusiveAmenities, ...additionalAmenities];

            // Remove the added amenities from the amenities array
            const additionalAmenitiesIds = additionalAmenities.map(a => a._id.toString());
            amenities = amenities.filter(a => !additionalAmenitiesIds.includes(a._id.toString()));
        }

        // Return the property data with updated exclusiveAmenities and amenities
        return res.status(200).json({
            status: 200,
            data: {
                ...property.toObject(),
                exclusiveAmenities,
                amenities,
            },
            message: `Property with ID ${id} found`,
        });
    } catch (error) {
        console.error('Error fetching property:', error);
        throw new ApiError(500, 'An error occurred while fetching the property');
    }
});


export const updateProperty = asyncHandler(async (req, res) => {
    const { propertyId } = req.params;
    const { stateName, cityName, localityName, subLocalityName, propertyData } = req.body;
    console.log(propertyId);
    if (!stateName || !cityName || !propertyData || !localityName || !subLocalityName) {
        throw new ApiError(400, "State name, city name, locality name, sub locality name and property data are required");
    }

    let state = await State.findOne({ name: stateName });
    if (!state) {
        state = new State({ name: stateName });
        await state.save();
        console.log('State saved:', state);
    }

    let city = await City.findOne({ name: cityName, state: state._id });
    if (!city) {
        city = new City({ name: cityName, state: state._id });
        await city.save();
        state.cities.push(city._id);
        await state.save();
        console.log('City saved:', city);
    }

    let locality = await Locality.findOne({ name: localityName, city: city._id });
    if (!locality) {
        locality = new Locality({ name: localityName, city: city._id });
        await locality.save();
        city.localities.push(locality._id);
        await city.save();
        console.log('Locality saved:', locality);
    }

    let subLocality = null;
    if (subLocalityName) {
        subLocality = await SubLocality.findOne({ name: subLocalityName, locality: locality._id });
        if (!subLocality) {
            subLocality = new SubLocality({ name: subLocalityName, locality: locality._id });
            await subLocality.save();
            locality.subLocalities.push(subLocality._id);
            await locality.save();
            console.log('SubLocality saved:', subLocality);
        }
    }
    try {
        // console.log(propertyId);
        const property = await Property.findOne({_id: propertyId});
        // console.log(property.name)
        if (!property) {
            throw new ApiError(404, "Property not found");
        }

        // Filter out 'name' from the propertyData object
        const { name, ...updatedData } = propertyData;

        // Update property with new data and references, excluding 'name'
        Object.keys(updatedData).forEach((key) => {
            property[key] = updatedData[key];
        });
        // // Update property with new data and references
        // Object.keys(propertyData).forEach((key) => {
        //     property[key] = propertyData[key];
        // });

        property.state = state._id;
        property.city = city._id;
        property.locality = locality._id;
        property.subLocality = subLocality ? subLocality._id : undefined;

        await property.save();
        // console.log('Property updated:', property);

        return res.status(200).json({
            status: 200,
            data: property,
            message: "Property updated successfully",
        });
    } catch (error) {
        console.error('Error updating property:', error);
        throw new ApiError(500, 'An error occurred while updating the property', error);
    }
});



export const deleteProperty = async (req, res, next) => {
    const { id } = req.params; // Get property ID from request parameters

    try {
        // Find the property by ID and delete it
        const deletedProperty = await Property.findByIdAndDelete(id);

        if (!deletedProperty) {
            throw new ApiError(404, 'Property not found');
        }

        res.status(200).json({
            status: 200,
            data: {},
            message: 'Property deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting property:', error);
        next(new ApiError(400, 'Error deleting property'));
    }
};



export const getAllProperties = asyncHandler(async (req, res) => {
    try {
        const { city } = req.body;
        const limit = parseInt(req.body.limit) || 10;
        const page = parseInt(req.body.page) || 1;
        const skip = (page - 1) * limit;

        if (!city) {
            return res.status(400).json(new ApiResponse(400, {}, "City name selection is required To Fetch the Data"));
        }

        let docs = await Property.find()
            .populate('city', 'name')
            .populate('state', 'name')
            .populate('locality', 'name')
            .populate('subLocality', 'name')
            .populate('developer');

       
        const filteredDocs = docs.filter(doc => doc.city.name.toLowerCase() === city.toLowerCase());

       
        const sortedDocs = filteredDocs.sort((a, b) => {
            const priorityOrder = { exclusive: 1, featured: 2, HIGH: 3, MEDIUM: 4, LOW: 5 };

            const aPriority = a.exclusive ? 1 : a.featured ? 2 : priorityOrder[a.priority] || 6;
            const bPriority = b.exclusive ? 1 : b.featured ? 2 : priorityOrder[b.priority] || 6;

            return aPriority - bPriority;
        });

        // Apply limit and skip
        const properties = sortedDocs.slice(skip, skip + limit);
        const total = filteredDocs.length;

        return res.status(200).json(new ApiResponse(200, {
            properties,
            total,
            page,
            limit
        }, "Properties retrieved and grouped by city successfully"));
    } catch (error) {
        return res.status(500).json(new ApiResponse(500, {}, `Error retrieving properties: ${error.message}`));
    }
});



// export const getAllProperties = asyncHandler(async (req, res) => {
//     try {
        
//         const limit = parseInt(req.query.limit) || 10;
//         const page = parseInt(req.query.page) || 1;
//         const skip = (page - 1) * limit;

//         let docs = await Property.find()
//             .populate('city', 'name')
//             .populate('state', 'name')
//             .populate('locality', 'name')
//             .populate('subLocality', 'name')
//             .sort();

//         // Group properties by city
//         const groupedByCity = docs.reduce((acc, doc) => {
//             const cityName = doc.city.name;
//             if (!acc[cityName]) {
//                 acc[cityName] = [];
//             }
//             acc[cityName].push(doc);
//             return acc;
//         }, {});

//         // Apply limit to each city group
//         const limitedGroupedByCity = Object.fromEntries(
//             Object.entries(groupedByCity).map(([city, properties]) => [
//                 city,
//                 properties.slice(skip, skip + limit) // Apply skip and limit
//             ])
//         );

//         // Calculate the total number of properties after applying the limit
//         const total = Object.values(limitedGroupedByCity).reduce((sum, properties) => sum + properties.length, 0);

//         return res.status(200).json(new ApiResponse(200, {
//             City: limitedGroupedByCity,
//             total,
//             page,
//             limit
//         }, "Properties retrieved and grouped by city successfully"));
//     } catch (error) {
//         return res.status(500).json(new ApiResponse(500, {}, `Error retrieving properties: ${error.message}`));
//     }
// });




const convertPriceToNumber1 = (priceStr) => {
    if (!priceStr || typeof priceStr !== 'string') {
        throw new Error('Invalid price string');
    }

    // Trim and convert the string to lowercase for easier parsing
    priceStr = priceStr.trim().toLowerCase();

    // Define conversion multipliers
    const multipliers = {
        'cr': 1e7, // 1 Crore = 10,000,000
        'cr*': 1e7,
        'crore': 1e7,
        'lakh': 1e5, // 1 Lakh = 100,000
        'lakhs': 1e5,
        'k': 1e3, // 1 Thousand = 1,000
        'thousand': 1e3,
        'th': 1e3,
        '': 1 // Default multiplier if no suffix
    };

    // Check for a range format (e.g., "₹2 Cr - ₹7 Cr")
    const rangeMatch = priceStr.match(/^([\d.,]+)\s*(\w*)\s*,\s*([\d.,]+)\s*(\w*)$/);
    if (rangeMatch) {
        const minPrice = parseFloat(rangeMatch[1].replace(/,/g, ''));
        const minSuffix = rangeMatch[2].trim();
        const maxPrice = parseFloat(rangeMatch[3].replace(/,/g, ''));
        const maxSuffix = rangeMatch[4].trim();
        
        const minMultiplier = multipliers[minSuffix] || multipliers[''];
        const maxMultiplier = multipliers[maxSuffix] || multipliers[''];

        return {
            min: minPrice * minMultiplier,
            max: maxPrice * maxMultiplier
        };
    }

    // Regular expression to extract numeric value and suffix
    const match = priceStr.match(/^₹\s*([\d.,]+)\s*(\w*)$/);
    if (!match) {
        console.error('Price string format is incorrect:', priceStr); // Log the erroneous format
        throw new Error('Price string format is incorrect');
    }

    let value = parseFloat(match[1].replace(/,/g, '')); // Remove commas and parse number
    const suffix = match[2].trim(); // Extract suffix

    // Apply the correct multiplier
    const multiplier = multipliers[suffix] || multipliers[''];

    return value * multiplier;
};


export const searchControllerNames = asyncHandler(async (req, res) => {
    try {
        const { names } = req.body.names;

        // Validate names
        if (!Array.isArray(names) || names.length === 0) {
            return res.status(400).json({ error: 'Invalid or missing names array' });
        }

        // Fetch IDs corresponding to the names provided
        const propertyId = await Property.find({ name: { $in: names } }).select('_id').exec();
        const cityIds = await City.find({ name: { $in: names } }).select('_id').exec();
        const localityIds = await Locality.find({ name: { $in: names } }).select('_id').exec();
        const subLocalityIds = await SubLocality.find({ name: { $in: names } }).select('_id').exec();
        const stateIds = await State.find({ name: { $in: names } }).select('_id').exec();

        // Extract the IDs from the results
        const propertyIdArray = propertyId.map(property => property._id);
        const cityIdArray = cityIds.map(city => city._id);
        const localityIdArray = localityIds.map(locality => locality._id);
        const subLocalityIdArray = subLocalityIds.map(subLocality => subLocality._id);
        const stateIdArray = stateIds.map(state => state._id);

        // Create the query to check for matching IDs in any of the specified fields
        let query = {
            $or: [
                { _id: { $in: propertyIdArray } },
                { city: { $in: cityIdArray } },
                { locality: { $in: localityIdArray } },
                { subLocality: { $in: subLocalityIdArray } },
                { state: { $in: stateIdArray } }
            ],
        };

        // Fetch properties
        let docs = await Property.find(query)
        .populate('locality', 'name _id')
        .populate('city', 'name _id')
        .populate('state', 'name _id')
        .populate('subLocality', 'name _id')
        .populate('developer');;

        // Check if any documents are found
        if (!docs || docs.length === 0) {
            return res.status(200).json(new ApiResponse(200, [], "No properties found matching the criteria."));
        }

        let productsCount = docs.length;
        let record = {
            projectList: docs,
            productCount: productsCount
        };

        return res.status(200).json(new ApiResponse(200, record, "Properties retrieved successfully"));
    } catch (error) {
        console.log("Error: ", error);  // Log any errors
        return res.status(500).json({ error: 'An error occurred while retrieving properties.' });
    }
});


export const searchControllerId = asyncHandler(async (req, res) => {
    try {
        const { ids } = req.body;

        // Validate IDs
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Invalid or missing IDs array' });
        }

        // Create the query to check for matching IDs in any of the specified fields
        let query = {
            $or: [
                { _id: { $in: ids.map(id => new ObjectId(id)) } },
                { subLocality: { $in: ids.map(id => new ObjectId(id)) } },
                { locality: { $in: ids.map(id => new ObjectId(id)) } },
                { city: { $in: ids.map(id => new ObjectId(id)) } },
                { state: { $in: ids.map(id => new ObjectId(id)) } }
            ],
        };

        // console.log("Constructed Query: ", query);  // Log the query for debugging

        // Fetch properties
        let docs = await Property.find(query);

        // Check if any documents are found
        if (!docs || docs.length === 0) {
            return res.status(200).json(new ApiResponse(200, [], "No properties found matching the criteria."));
        }

        // Order the results according to the order of IDs provided in the input
        docs.sort((a, b) => ids.indexOf(a._id.toString()) - ids.indexOf(b._id.toString()));

        let productsCount = docs.length;
        let record = {
            projectList: docs,
            productCount: productsCount
        };

        return res.status(200).json(new ApiResponse(200, record, "Properties retrieved successfully"));
    } catch (error) {
        console.log("Error: ", error);  // Log any errors
        return res.status(500).json({ error: 'An error occurred while retrieving properties.' });
    }
});


export const searchController = asyncHandler(async (req, res) => {
    try {
        const {
            city,
            propertyType,
            subType,
            priceRange
        } = req.body;

        const limit = parseInt(req.body.limit) || 10;
        const page = parseInt(req.body.page) || 1;
        const skip = (page - 1) * limit;
        let query = {};

        // Default city to Gurgaon if not provided
        const cityToQuery = city || 'Gurgaon';

        // Query to get properties based on the city
        let cityDoc;
        if (ObjectId.isValid(cityToQuery)) {
            query.city = new ObjectId(cityToQuery);
        } else {
            cityDoc = await City.findOne({ name: new RegExp('^' + cityToQuery + '$', 'i') });
            if (cityDoc) {
                query.city = cityDoc._id;
            } else {
                return res.status(200).json(new ApiResponse(200, [], `No properties found for the city ${cityToQuery}.`));
            }
        }

        // Fetch properties for the city
        let cityDocs = await Property.find({ city: cityDoc._id }).limit(limit).skip(skip).populate('locality', 'name _id')
        .populate('city', "name _id")
        .populate('state', 'name _id')
        .populate('subLocality', 'name _id')
        .populate('developer');;
        if (cityDocs.length === 0) {
            return res.status(200).json(new ApiResponse(200, [], `No properties found for the city ${cityToQuery}.`));
        }

        let finalDocs = [...cityDocs];

        // Stage 2: Match PropertyType
        if (propertyType) {
            finalDocs = finalDocs.filter(doc => doc.propertyType && doc.propertyType.title === propertyType.title);
            if (finalDocs.length === 0) {
                return res.status(200).json(new ApiResponse(200, [], "No properties found for the specified Property Type."));
            }
        }

        // Stage 3: Match SubType
        if (subType) {
            const subTypes = Array.isArray(subType) ? subType : [subType];
            finalDocs = finalDocs.filter(doc => doc.propertyType && doc.propertyType.subType && subTypes.some(st => doc.propertyType.subType.includes(st)));
            if (finalDocs.length === 0) {
                return res.status(200).json(new ApiResponse(200, [], "No properties found for the specified subType."));
            }
        }

        // Stage 4: Match Price Range
        if (Array.isArray(priceRange) && priceRange.length === 2) {
            const [minPrice, maxPrice] = priceRange;
            finalDocs = finalDocs.filter(doc => doc.priceInFigure >= minPrice && doc.priceInFigure <= maxPrice);
            if (finalDocs.length === 0) {
                return res.status(200).json(new ApiResponse(200, [], "No properties found within the specified price range."));
            }
        }

        // Paginate the finalDocs
        const paginatedDocs = finalDocs.slice(skip, skip + limit);
        let productsCount = finalDocs.length;
        let record = {
            projectList: paginatedDocs,
            productCount: productsCount
        };

        return res.status(200).json(new ApiResponse(200, record, `Properties retrieved successfully for ${cityDoc.name}.`));

    } catch (error) {
        console.log("Error: ", error);
        return res.status(500).json({ error: 'An error occurred while retrieving properties.' });
    }
});

export const getAllFeaturedProperties = asyncHandler(async (req, res) => {
    try {
        const cities = await City.find().populate({
            path: 'properties',
            populate: [
                { path: 'subLocality', select: 'name' },
                { path: 'locality', select: 'name' },
                { path: 'city', select: 'name' },
                { path: 'state', select: 'name' }
            ]
        });

        if (!cities || cities.length === 0) {
            return res.status(404).json(new ApiError(404, 'No cities found'));
        }

        const priorityOrder = { HIGH: 1, MEDIUM: 2, LOW: 3 };

        const featuredPropertiesData = cities.map(city => {
            let properties = city.properties;

            // Find exclusive properties
            const exclusiveProperties = properties.filter(property => property.exclusive);
            // console.log(`Exclusive properties in city ${city.name}:`, exclusiveProperties.length);

            let selectedProperties = [];

            if (exclusiveProperties.length > 0) {
                selectedProperties = exclusiveProperties;
            }

            if (selectedProperties.length < 4) {
                const additionalProperties = properties
                    .filter(property => property.featured && !property.exclusive)
                    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
                    .slice(0, 4 - selectedProperties.length);

                selectedProperties = [...selectedProperties, ...additionalProperties];
            }

            const formattedProperties = selectedProperties.map(property => ({
                id: property._id,
                slug: property.slug,
                title: property.name,
                location: property.locality.name,
                subLocality: property.subLocality.name,
                description: property.description.join(' '),
                amenities: property.amenities,
                numericInsights: [
                    {
                        title: 'Starting Price',
                        value: property.startingPrice,
                    },
                    {
                        title: 'Sq feet',
                        value: property.area,
                    },
                    {
                        title: 'Configurations',
                        value: property.configuration,
                    },
                ],
                images: property.imageGallery,
                exclusive: property.exclusive,
            }));

            return {
                city: city.name,
                properties: formattedProperties,
                total: formattedProperties.length
            };
        });

        return res.status(200).json({
            status: 200,
            data: featuredPropertiesData,
            message: 'Featured properties retrieved successfully ! Done',
        });
    } catch (error) {
        console.error('Error fetching properties:', error);
        return res.status(500).json(new ApiError(500, `Error fetching properties: ${error.message}`));
    }
});


export const getPropertiesByLocation = asyncHandler(async (req, res) => {
    try {
    const { type, name, limit = 10, page = 1 } = req.body;
    const skip = (page - 1) * limit;

    if (!type || !name) {
      return res.status(400).json(new ApiResponse(400, {}, "Type and name are required to fetch properties"));
    }

    let properties = [];

    if (type === 'city') {
      const cityDoc = await City.findOne({ name }).populate({
        path: 'properties',
        populate: [
          { path: 'subLocality', select: 'name' },
          { path: 'locality', select: 'name' },
          { path: 'city', select: 'name' },
          { path: 'state', select: 'name' }
        ]
      });
      if (!cityDoc) {
        return res.status(404).json(new ApiResponse(404, {}, "City not found"));
      }
      properties = cityDoc.properties;
    } else if (type === 'locality') {
      const localityDoc = await Locality.findOne({ name }).populate({
        path: 'properties',
        populate: [
          { path: 'subLocality', select: 'name' },
          { path: 'locality', select: 'name' },
          { path: 'city', select: 'name' },
          { path: 'state', select: 'name' }
        ]
      });
      if (!localityDoc) {
        return res.status(404).json(new ApiResponse(404, {}, "Locality not found"));
      }
      properties = localityDoc.properties;
    } else if (type === 'subLocality') {
      const subLocalityDoc = await SubLocality.findOne({ name }).populate({
        path: 'properties',
        populate: [
          { path: 'subLocality', select: 'name' },
          { path: 'locality', select: 'name' },
          { path: 'city', select: 'name' },
          { path: 'state', select: 'name' }
        ]
      });
      if (!subLocalityDoc) {
        return res.status(404).json(new ApiResponse(404, {}, "Sub Locality not found"));
      }
      properties = subLocalityDoc.properties;
    } else if (type === 'state') {
      const stateDoc = await State.findOne({ name }).populate({
        path: 'properties',
        populate: [
          { path: 'subLocality', select: 'name' },
          { path: 'locality', select: 'name' },
          { path: 'city', select: 'name' },
          { path: 'state', select: 'name' }
        ]
      });
      if (!stateDoc) {
        return res.status(404).json(new ApiResponse(404, {}, "State not found"));
      }
      properties = stateDoc.properties;
    } else {
      return res.status(400).json(new ApiResponse(400, {}, "Invalid type"));
    }

    // Sort properties based on priority
    const priorityOrder = { exclusive: 1, featured: 2, HIGH: 3, MEDIUM: 4, LOW: 5 };
    properties = properties.sort((a, b) => {
      const aPriority = a.exclusive ? 1 : a.featured ? 2 : priorityOrder[a.priority] || 6;
      const bPriority = b.exclusive ? 1 : b.featured ? 2 : priorityOrder[b.priority] || 6;
      return aPriority - bPriority;
    });

    // Apply limit and skip
    const paginatedProperties = properties.slice(skip, skip + limit);
    const total = properties.length;

    return res.status(200).json(new ApiResponse(200, {
      properties: paginatedProperties,
      total,
      page,
      limit
    }, "Properties retrieved successfully"));
  } catch (error) {
    console.error('Error retrieving properties:', error);
    return res.status(500).json(new ApiResponse(500, {}, `Error retrieving properties: ${error.message}`));
  }
});

export const getPropertyByName = asyncHandler(async (req, res) => {
    const { name } = req.params;

    const formattedName = name.replace(/-/g, ' ');

    try {
        const property = await Property.findOne({ name: formattedName })
            .populate('locality', 'name _id')
            .populate('city', 'name _id')
            .populate('state', 'name _id')
            .populate('subLocality', 'name _id')
            .populate('developer');

        if (!property) {
            throw new ApiError(404, `Property with name "${formattedName}" not found`);
        }

        let { exclusiveAmenities, amenities } = property.toObject();

        // Filter out null values
        exclusiveAmenities = exclusiveAmenities.filter(a => a !== null);
        amenities = amenities.filter(a => a !== null);

        if (exclusiveAmenities.length < 6) {
            // Calculate how many more amenities are needed
            const additionalAmenitiesNeeded = 6 - exclusiveAmenities.length;

            // Filter amenities to exclude ones already in exclusiveAmenities
            const exclusiveAmenitiesIds = exclusiveAmenities.map(a => a._id.toString());
            const additionalAmenities = amenities.filter(a => !exclusiveAmenitiesIds.includes(a._id.toString()))
                                                 .slice(0, additionalAmenitiesNeeded);

            // Add additional amenities to exclusiveAmenities
            exclusiveAmenities = [...exclusiveAmenities, ...additionalAmenities];

            // Remove the added amenities from the amenities array
            const additionalAmenitiesIds = additionalAmenities.map(a => a._id.toString());
            amenities = amenities.filter(a => !additionalAmenitiesIds.includes(a._id.toString()));
        }

        // Return the property data with updated exclusiveAmenities and amenities
        return res.status(200).json({
            status: 200,
            data: {
                ...property.toObject(),
                exclusiveAmenities,
                amenities,
            },
            message: `Property with name "${formattedName}" found`,
        });
    } catch (error) {
        console.error('Error fetching property:', error);
        throw new ApiError(500, 'An error occurred while fetching the property');
    }
});

export const getPropertiesByIds = asyncHandler(async (req, res) => {
    const { ids } = req.body; 

    const idArray = Array.isArray(ids) ? ids : [ids];

    if (!idArray || idArray.length === 0) {
        throw new ApiError(400, 'Invalid or missing IDs');
    }

    try {
        const properties = await Property.find({ _id: { $in: idArray } })
            .populate('locality', 'name _id')
            .populate('city', "name _id")
            .populate('state', 'name _id')
            .populate('subLocality', 'name _id')
            .populate('developer');

        if (properties.length === 0) {
            throw new ApiError(404, 'No properties found for the given IDs');
        }

        const formattedProperties = properties.map(property => {
            let { exclusiveAmenities, amenities } = property.toObject();

            // Filter out null values
            exclusiveAmenities = exclusiveAmenities.filter(a => a !== null);
            amenities = amenities.filter(a => a !== null);

            if (exclusiveAmenities.length < 6) {
                // Calculate how many more amenities are needed
                const additionalAmenitiesNeeded = 6 - exclusiveAmenities.length;

                // Filter amenities to exclude ones already in exclusiveAmenities
                const exclusiveAmenitiesIds = exclusiveAmenities.map(a => a._id.toString());
                const additionalAmenities = amenities.filter(a => !exclusiveAmenitiesIds.includes(a._id.toString()))
                                                     .slice(0, additionalAmenitiesNeeded);

                // Add additional amenities to exclusiveAmenities
                exclusiveAmenities = [...exclusiveAmenities, ...additionalAmenities];

                // Remove the added amenities from the amenities array
                const additionalAmenitiesIds = additionalAmenities.map(a => a._id.toString());
                amenities = amenities.filter(a => !additionalAmenitiesIds.includes(a._id.toString()));
            }

            return {
                ...property.toObject(),
                exclusiveAmenities,
                amenities,
            };
        });

        return res.status(200).json({
            status: 200,
            data: formattedProperties,
            message: 'Properties found',
        });
    } catch (error) {
        console.error('Error fetching properties:', error);
        throw new ApiError(500, 'An error occurred while fetching the properties');
    }
});


export const getPropertyBySlug = asyncHandler(async (req, res) => {
    const { slug } = req.params; 

    if (!slug) {
        throw new ApiError(400, 'Invalid or missing slug');
    }

    try {
        const property = await Property.findOne({ slug })
            .populate('locality', 'name _id')
            .populate('city', "name _id")
            .populate('state', 'name _id')
            .populate('subLocality', 'name _id')
            .populate('developer');

        if (!property) {
            throw new ApiError(404, 'No property found for the given slug');
        }

        let { exclusiveAmenities, amenities } = property.toObject();

        // Filter out null values
        exclusiveAmenities = exclusiveAmenities.filter(a => a !== null);
        amenities = amenities.filter(a => a !== null);

        if (exclusiveAmenities.length < 6) {
            // Calculate how many more amenities are needed
            const additionalAmenitiesNeeded = 6 - exclusiveAmenities.length;

            // Filter amenities to exclude ones already in exclusiveAmenities
            const exclusiveAmenitiesIds = exclusiveAmenities.map(a => a._id.toString());
            const additionalAmenities = amenities.filter(a => !exclusiveAmenitiesIds.includes(a._id.toString()))
                                                 .slice(0, additionalAmenitiesNeeded);

            // Add additional amenities to exclusiveAmenities
            exclusiveAmenities = [...exclusiveAmenities, ...additionalAmenities];

            // Remove the added amenities from the amenities array
            const additionalAmenitiesIds = additionalAmenities.map(a => a._id.toString());
            amenities = amenities.filter(a => !additionalAmenitiesIds.includes(a._id.toString()));
        }

        const formattedProperty = {
            ...property.toObject(),
            exclusiveAmenities,
            amenities,
        };

        return res.status(200).json({
            status: 200,
            data: formattedProperty,
            message: 'Property Fetched Successfully by Slug',
        });
    } catch (error) {
        console.error('Error fetching property:', error);
        throw new ApiError(500, 'An error occurred while fetching the property by Slug');
    }
});

export const getAllPropertySlugs = asyncHandler(async (req, res) => {
    try {
        const properties = await Property.find({}, { slug: 1 }); // Only fetch slugs
        if (!properties || properties.length === 0) {
            throw new ApiError(404, 'No properties found');
        }

        // Map properties to the desired format
        const slugs = properties.map(property => ({ slug: property.slug }));

        return res.status(200).json({
            status: 'SUCCESS!',
            result: slugs, // Return the slugs in the desired format
            message: 'Slugs fetched successfully',
        });
    } catch (error) {
        console.error('Error fetching property slugs:', error);
        throw new ApiError(500, 'An error occurred while fetching the property slugs');
    }
});


export const getPropertiesByCity = async (req, res) => {
    try {
      const { name } = req.query;
  
      // Validate the input
      if (!name) {
        return res.status(400).json({ message: 'City name is required' });
      }
  
      // Build the query object
      const query = {
        name: {
          $regex: new RegExp(name, 'i') // 'i' for case-insensitive
        }
      };
  
      // Fetch properties from the database
      const cities = await City.find(query)
    .populate({
        path: 'properties',
        populate: [
            {
                path: 'city',
                select: 'name _id' // Select only the name and _id fields
            },
            {
                path: 'locality',
                select: 'name _id' // Select only the name and _id fields
            },
            {
                path: 'subLocality', // Add this to populate sublocality
                select: 'name _id' // Select only the name and _id fields
            }
        ]
    })
    .populate('localities');
  
      // Check if any cities are found
      if (cities.length === 0) {
        return res.status(404).json({ message: 'No properties found for the specified city' });
      }
  
      // Calculate the total number of properties
      const total = cities.reduce((total, city) => total + city.properties.length, 0);
  
      res.status(200).json({
        status: 200,
        data: { total, cities},
        message: 'Property found',
      });
    } catch (error) {
      console.error('Error fetching properties:', error); // Log the error for debugging
      res.status(500).json({ message: 'Error fetching properties', error: error.message });
    }
};

export const getPropertySlug = asyncHandler(async (req, res) => {
    try {
        const properties = await Property.find({}, 'slug'); // Fetch only the slug field
        const result = properties.map(property => ({ slug: property.slug }));
        res.json({ status: 'SUCCESS!', result });
      } catch (err) {
        res.status(500).json({ message: 'Server Error' });
      }
});


export const getPropertiesByLocationNew = asyncHandler(async (req, res) => {
    try {
        const { type, name, limit = 10, page = 1 } = req.body;
        const skip = (page - 1) * limit;

        if (!type || !name) {
            return res.status(400).json(new ApiResponse(400, {}, "Type and name are required to fetch properties"));
        }

        let query = { active: true }; // Base query to find active properties

        // Determine the query based on the type
        if (type === 'city') {
            const cityDoc = await City.findOne({ name }).populate('properties');
            if (!cityDoc) {
                return res.status(404).json(new ApiResponse(404, {}, "City not found"));
            }
            query._id = { $in: cityDoc.properties };
        } else if (type === 'locality') {
            const localityDoc = await Locality.findOne({ name }).populate('properties');
            if (!localityDoc) {
                return res.status(404).json(new ApiResponse(404, {}, "Locality not found"));
            }
            query._id = { $in: localityDoc.properties };
        } else if (type === 'subLocality') {
            const subLocalityDoc = await SubLocality.findOne({ name }).populate('properties');
            if (!subLocalityDoc) {
                return res.status(404).json(new ApiResponse(404, {}, "Sub Locality not found"));
            }
            query._id = { $in: subLocalityDoc.properties };
        } else if (type === 'state') {
            const stateDoc = await State.findOne({ name }).populate('properties');
            if (!stateDoc) {
                return res.status(404).json(new ApiResponse(404, {}, "State not found"));
            }
            query._id = { $in: stateDoc.properties };
        } else {
            return res.status(400).json(new ApiResponse(400, {}, "Invalid type"));
        }

        // Fetch properties from the PropertyModel based on the constructed query
        const totalProperties = await PropertyModel.countDocuments(query);
        let properties = await PropertyModel.find(query)
            .populate({
                path: 'subLocality',
                select: 'name'
            })
            .populate({
                path: 'locality',
                select: 'name'
            })
            .populate({
                path: 'city',
                select: 'name'
            })
            .populate({
                path: 'state',
                select: 'name'
            });

        // Sort properties based on priority
        const priorityOrder = { exclusive: 1, featured: 2, HIGH: 3, MEDIUM: 4, LOW: 5 };
        properties = properties.sort((a, b) => {
            const aPriority = a.exclusive ? 1 : a.featured ? 2 : priorityOrder[a.priority] || 6;
            const bPriority = b.exclusive ? 1 : b.featured ? 2 : priorityOrder[b.priority] || 6;
            return aPriority - bPriority;
        });

        // Apply limit and skip for pagination
        const paginatedProperties = properties.slice(skip, skip + limit);

        return res.status(200).json(new ApiResponse(200, {
            properties: paginatedProperties,
            total: totalProperties,
            page,
            limit
        }, "Properties retrieved successfully"));
    } catch (error) {
        console.error('Error retrieving properties:', error);
        return res.status(500).json(new ApiResponse(500, {}, `Error retrieving properties: ${error.message}`));
    }
});

export const getLocationData = async (req, res) => {
    try {
        const cities = await City.find();
        const localities = await Locality.find().populate('city');
        const subLocalities = await SubLocality.find().populate('locality');

        const data = {
            cities: cities.map(city => ({
                type: 'city',
                name: city.name
            })),
            localities: localities.map(locality => ({
                type: 'locality',
                name: locality.name
            })),
            subLocalities: subLocalities.map(subLocality => ({
                type: 'subLocality',
                name: subLocality.name
            }))
        };

        // Flatten the data into the required format
        const result = [].concat(data.cities, data.localities, data.subLocalities);

        res.json({ data: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


//   fetch('https://inframantra.blr1.cdn.digitaloceanspaces.com/brochure/geraislandofjoy/geraislandofjoy.pdf', {
//     method: 'GET',
//     mode: 'cors'
// })
// .then(response => response.blob())
// .then(blob => {
//     console.log('PDF fetched successfully');
// })
// .catch(error => {
//     console.error('CORS error:', error);
// });





// export const searchController = asyncHandler(async (req, res) => {
//     try {
//         const limit = parseInt(req.query && req.query.limit ? req.query.limit : '10');
//         const pagination = parseInt(req.query && req.query.pagination ? req.query.pagination : 0);
//         let query = { ...req.query };

//         delete query.limit;
//         delete query.pagination;
        
//         Object.keys(query).forEach(key => {
//             if (!query[key]) {
//                 delete query[key];
//             }
//         });

//         // query.active = true;
//         if (query.city) {
//             if (ObjectId.isValid(query.city)) {
//                 query.city = new ObjectId(query.city);
//             } else {
//                 // Assume city is a name, find the corresponding ObjectId
//                 const city = await City.findOne({ name: new RegExp('^' + query.city + '$', 'i') });
//                 if (city) {
//                     query.city = city._id;
//                 } else {
//                     // If city not found, return empty results
//                     return res.status(200).json(new ApiResponse(200, [], "No properties found for the specified city."));
//                 }
//             }
//         }

//         // Check if propertyType parameter is present
//         // Check if propertyType.title is explicitly present in the query
//         if (query['propertyType.title']) {
//             query['propertyType.title'] = query['propertyType.title'];
//             delete query.propertyType;  // Remove propertyType from the query if propertyType.title is present
//         } else if (query.propertyType) {
//             // If propertyType is a simple string, set it for title
//             query['propertyType.title'] = query.propertyType;
//             delete query.propertyType;  // Remove propertyType from the query
//         }

//         // Handle propertyType.subType if provided
//         if (query['propertyType.subType']) {
//             const subTypes = Array.isArray(query['propertyType.subType']) ? query['propertyType.subType'] : [query['propertyType.subType']];
//             query['propertyType.subType'] = { $in: subTypes };
//             delete query.subType;
//         } else if (query.subType) {
//             const subTypes = Array.isArray(query.subType) ? query.subType : [query.subType];
//             query['propertyType.subType'] = { $in: subTypes };
//             delete query.subType;
//         }
//         if (query.name) {
//             query.name = new RegExp(query.name, 'i'); // Case-insensitive partial match
//         }
//         if (query.price) {
//             const priceInFigure = convertPriceToNumber(query.price);
//             query.priceInFigure = { $lte: priceInFigure };
//             delete query.price;
//         }

//         // Check if search query is present
//         if (query.search) {
//             const decodedSearchQuery = decodeURIComponent(query.search);
//             const regexPattern = new RegExp('.*' + decodedSearchQuery.replace(/ /g, '.*') + '.*', 'i');
//             query['$or'] = [
//                 { name: regexPattern },
//                 { city: { $in: City.map(e => new ObjectId(e._id)) } }  // Ensure City is correctly imported or defined
//             ];
//         }

//         console.log("Query: ", query);  // Log the query to see what is being sent to MongoDB

//         let productsCount = await Property.countDocuments(query);
//         let record = {};
//         let docs = await Property.find(query).limit(limit).skip(pagination * limit);

//        record.projectList = docs;
//        record.productCount= productsCount;

//         // Log the number of documents found
//         console.log("Products Count: ", productsCount);  
//         // console.log("Docs: ", docs);  // Log the documents fetched
     
//         return res
//             .status(200)
//             .json(new ApiResponse(200, record,  "Properties retrieved by City, Type and Price successfully"));

//     } catch (error) {
//         console.log("Error: ", error);  // Log any errors
//         return res.status(500).json({ error: 'An error occurred while retrieving properties.' });
//     }
// });