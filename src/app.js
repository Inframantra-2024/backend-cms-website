import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';


import propertyRoutes from './routes/property.routes.js'
import testimonialRoutes from './routes/testimonials.routes.js'
import developerRoutes from './routes/developer.routes.js'
import enquiryRoutes from './routes/enqiury.routes.js'
import amenityRoutes from "./routes/amenities.routes.js";
import userRoutes from './routes/user.routes.js';

import masterRoutes from './routes/aggregate.routes.js'
import pdfRoutes from './routes/pdf.routes.js';
import morgan from 'morgan'; // Import morgan

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(morgan('dev')); 

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use('/api/v1/property', propertyRoutes);
app.use('/api/v1/testimonials', testimonialRoutes);
app.use('/api/v1/developer', developerRoutes);
app.use('/api/v1/enquiry', enquiryRoutes);
app.use("/api/v1/amenity", amenityRoutes);
app.use('/api/v2/admin', userRoutes);


app.use('/api/v1/master', masterRoutes);
app.use('/api/v1/pdf', pdfRoutes);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Default route for the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname,  'index.html'));
});


// Proxy setup for the PDF file


// Error handler
app.use((err, req, res, next) => {
    res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      message: err.message,
    });
  });
  
  export { app };
  