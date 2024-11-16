import { City } from '../models/city.model.js';
import { State } from '../models/state.model.js';
import { Locality } from '../models/locality.model.js';
import { SubLocality } from '../models/subLocality.model.js';
import { Amenity } from '../models/amenities.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Controller function to get city, state, locality, sub-locality, and amenities
export const getCityStateLocalitySubLocalityAmenities = asyncHandler(async (req, res) => {
    const cities = await City.find();
    const states = await State.find();
    const localities = await Locality.find();
    const subLocalities = await SubLocality.find();
    const amenities = await Amenity.find();

    const data = {
        cities: cities.map(city => ({ id: city._id, name: city.name })),
        states: states.map(state => ({ id: state._id, name: state.name })),
        localities: localities.map(locality => ({ id: locality._id, name: locality.name })),
        subLocalities: subLocalities.map(subLocality => ({ id: subLocality._id, name: subLocality.name })),
        amenities: amenities.map(amenity => 
            ({ 
                id: amenity._id, 
                title: amenity.title,
                imgUrl: amenity.iconUrl
            })),
    };

    return res.status(200).json(new ApiResponse(200, data, 'City, state, locality, sub-locality, and amenities retrieved successfully'));
});
