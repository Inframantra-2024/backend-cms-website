import express from 'express';

import {
    getCityStateLocalitySubLocalityAmenities
} from '../controllers/aggregate.controller.js';

const router = express.Router();


router.get('/', getCityStateLocalitySubLocalityAmenities)

export default router;