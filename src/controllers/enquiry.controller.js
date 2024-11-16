import { projectEnquiry } from "../models/projectEnquiry.model.js";
import { sendMail } from '../utils/nodemailer.js'
import Joi from 'joi';
import ejs from 'ejs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url'
import { log } from "console";
import axios from 'axios';

import { contactEnquiry } from "../models/conatct.model.js";

// Manually construct __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const verifyCaptcha = async (token) => {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify`, null, {
    params: {
      secret: secretKey,
      response: token,
    },
  });
  return response.data.success;
};

// Project Enquiry
export const createEnquiry = async (req, res) => {
  let enquiry = req.body || {};
  enquiry.active = true;

  try {
    const { captchaToken } = req.body;

    // Verify CAPTCHA token
    if (!captchaToken) {
      return res.status(400).json({ error: 'CAPTCHA token is missing' });
    }

    const isCaptchaValid = await verifyCaptcha(captchaToken);
    if (!isCaptchaValid) {
      // console.log('Invalid CAPTCHA');
      return res.status(400).json({ error: 'Invalid CAPTCHA' });
    }
    // Remove captchaToken before validation
    delete enquiry.captchaToken;

    // Validation schema (excluding captchaToken)
    const schema = Joi.object({
      projectName: Joi.string().required(),
      name: Joi.string().required(),
      phoneNumber: Joi.string().required(),
      email: Joi.string().email().required(),
      configuration: Joi.string(),
      active: Joi.boolean()
    });

    // Validate the request body excluding captchaToken
    const { error } = schema.validate(enquiry);
    if (error) return res.status(400).json({ error });

    // Create a new contact document
    const contact = new projectEnquiry(enquiry);
    await contact.save();

    if (contact.name) {
      // Fetch the saved enquiry
      const enq = await projectEnquiry.findById(contact._id);
      // Prepare email template
      const compiled = ejs.compile(fs.readFileSync(path.resolve(__dirname, '../docs/email_templates/projectEnquiry.ejs'), 'utf8'));
      const dataToCompile = {
        name: enq.name,
        email: enq.email,
        phone: enq.phoneNumber,
        configuration: enq.configuration,
        projectName: enq.projectName
      };

      // Send email
      await sendMail([process.env.ENQUIRY_MAIL], `You have new Project Enquiry ${dataToCompile.projectName}`, compiled(dataToCompile));
      await createLead(enquiry);
    }

    // Send success response
    return res.status(201).json({
      status: 'success',
      result: contact
    });
  } catch (error) {
    // Handle errors
    return res.status(500).json({ message: 'Error submitting enquiry', error: error.message });
  }
}


async function createLead(enquiry) {
  // const enq2 = await ProjectEnquiryModel.findById(enquiry._id).populate('project');
  // let enq = await ProjectEnquiryModel.find({_id:enquiry._id}).populate('project','_id name');
  // Example: Hit an API endpoint to create a lead
  const leadData = {
      LeadName: enquiry.name,
      Campaign: "Organic",
      Source: "",
      Subsource: "",
      LeadEmail: enquiry.email,
      LeadPhoneNo: enquiry.phoneNumber,
      Message: `This is ${enquiry.projectName} Lead`,
      ProjectName: `${enquiry.projectName}`,
  };

  // Call your lead creation API endpoint using fetch or any HTTP library
  const response = await fetch([process.env.API_URL], {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify(leadData),
  });

  const responseData = await response.json();

  // Handle the response data as needed
  // console.log('Lead creation response:', responseData, leadData );
}


// contact Enquiry
export const createContactEnquiry = async (req, res) => {
  let enquiry = req.body || {};
  enquiry.active = true;

  try {
    // Validation schema
    const schema = Joi.object({
      name: Joi.string().required(),
      phoneNumber: Joi.number().required(),
      email: Joi.string().email().required(),
      active: Joi.boolean()
    });

    // Validate the request body
    const { error } = schema.validate(enquiry);
    if (error) return res.status(400).json({ error });

    // Create a new contact document
    const contact = new contactEnquiry(enquiry);
    await contact.save();

    if (contact.name) {
      // Fetch the saved enquiry
      const enq = await contactEnquiry.findById(contact._id);
      // Prepare email template
      const compiled = ejs.compile(fs.readFileSync(path.resolve(__dirname, '../docs/email_templates/contactEnquiry.ejs'), 'utf8'));
      const dataToCompile = {
        name: enq.name,
        email: enq.email,
        phone: enq.phoneNumber,
      };

      // Send email
      await sendMail([process.env.ENQUIRY_MAIL], `You have new Contact Enquiry ${dataToCompile.name}`, compiled(dataToCompile));
      await createContact(enquiry);
    }
    
    // console.log(enquiry);
    // Send success response
    return res.status(201).json({
      status: 'success',
      result: contact
    });
  } catch (error) {
    // Handle errors
    return res.status(500).json({ message: 'Error submitting Contact enquiry', error: error.message });
  }
}

async function createContact(enquiry) {
  // Example: Hit an API endpoint to create a lead
  const leadData = {
    LeadName: enquiry.name,
    Campaign: "Organic",
    Source: "",
    Subsource: "",
    LeadEmail: enquiry.email,
    LeadPhoneNo: enquiry.phoneNumber,
    Message: "This is Contact Us Enquiry Lead",
    ProjectName: "Contact Us Enquiry",
  };

  // Call your lead creation API endpoint using fetch or any HTTP library
  const response = await fetch([process.env.API_URL], {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Add any other headers as needed
    },
    body: JSON.stringify(leadData),
  });

  const responseData = await response.json();

  // Handle the response data as needed
  // console.log('Lead creation response:', responseData);
}