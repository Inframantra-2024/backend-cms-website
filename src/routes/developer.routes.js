// developerRoutes.js
import express from "express";
import {
  createDeveloper,
  getDevelopers,
  getDeveloperById,
  updateDeveloper,
  deleteDeveloper
} from "../controllers/developer.controller.js";

const router = express.Router();

router.post('/add', createDeveloper)
      .get('/', getDevelopers)
      .get('/:developerId', getDeveloperById)
      .put('/update/:developerId', updateDeveloper)
      .delete('/delete/:id', deleteDeveloper);

export default router;
