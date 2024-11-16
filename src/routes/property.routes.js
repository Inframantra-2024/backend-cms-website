import express from "express";
import {
  createProperty,
  getPropertyById,
  deleteProperty,
  updateProperty,
  getPropertyByName,
  searchControllerId,
  searchController,
  getPropertiesByLocation,
  getPropertiesByIds,
  getAllFeaturedProperties,
  getPropertyBySlug,
  getPropertiesByCity,
  searchControllerNames,
  getAllProjectNamesAndIds,
  getSearchOptionsData,
  getAllProjectsData,
  getPropertySlug,
  getPropertiesByLocationNew,
  getLocationData,
  getAllPropertySlugs
  // getPropertyHomePage
} from "../controllers/property.controller.js";

const router = express.Router();

router.post("/add", createProperty)
       .get('/get', getAllProjectNamesAndIds)
      //  .get('/getHome', getPropertyHomePage)
       .get('/getSearch', getSearchOptionsData)
      .put('/update/:propertyId', updateProperty)
      .delete('/delete/:id', deleteProperty)
      .post('/searchId', searchControllerId)
      .post('/searchName', searchControllerNames)
      .post('/search', searchController)
      .post('/location',getPropertiesByLocation)
      .get('/name/:name',getPropertyByName)
       .get('/get/:id', getPropertyById)
       .post('/wishlist/ids',getPropertiesByIds)
       .get('/featured-properties',getAllFeaturedProperties)
       .get('/slug/:slug', getPropertyBySlug)
       .get('/getProjects', getAllProjectsData)
       .get('/listing', getPropertiesByCity)
       .get('/projectList', getPropertySlug)
       .get('/listing', getPropertiesByLocationNew)
       .get('/locationData', getLocationData)
       .get('/slugList', getAllPropertySlugs)



export default router;