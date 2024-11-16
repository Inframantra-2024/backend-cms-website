import express from 'express';
import {  createUser, updateUser, userloginAuth } from '../controllers/user.controller.js';

const router = express.Router();

// User routes
// router.get('/users', getAllUsers);
// router.get('/users/:id', getUserById);
router.post('/createUser', createUser);
router.put('/updateUser/:id', updateUser);
router.post("/login", userloginAuth)
// router.delete('/users/:id', deleteUser);

export default router;
