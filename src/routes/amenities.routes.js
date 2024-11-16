import express from "express";
import {
  addAmenity,
  bulkAddAmenities,getAllAmenities
} from "../controllers/amenities.controller.js";

const router = express.Router();

router.post("/add", addAmenity)
      .post("/bulk-add", bulkAddAmenities)
      .get('/', getAllAmenities);

export default router;