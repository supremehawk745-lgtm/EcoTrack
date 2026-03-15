const express = require('express');
const { z } = require('zod');
const nodemailer = require('nodemailer');
const Report = require('../models/Report');

const router = express.Router();

const reportSchema = z.object({
  imageUrl: z.string().min(10, "Image data is required"),
  description: z.string().min(1, "Description is required"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const encouragementMessages = [
  "Every small step counts towards a cleaner environment!",
  "Thank you for being an eco-warrior!",
  "Your report helps make the world a better place.",
  "Great job spotting that! We're on it.",
  "Together, we can heal the planet.",
];

// Email Transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmailNotification = async (report) => {
  const mailOptions = {
    from: `"EcoTrack System" <${process.env.SMTP_USER}>`,
    to: process.env.OFFICIAL_EMAIL,
    subject: "New Pollution Report Detected",
    text: `A new pollution report has been submitted.\n\nDescription: ${report.description}\nLocation: https://www.google.com/maps?q=${report.latitude},${report.longitude}\nTimestamp: ${report.timestamp}`,
    html: `
      <h2>New Pollution Report</h2>
      <p><strong>Description:</strong> ${report.description}</p>
      <p><strong>Location:</strong> <a href="https://www.google.com/maps?q=${report.latitude},${report.longitude}">View on Google Maps</a> (${report.latitude}, ${report.longitude})</p>
      <p><strong>Timestamp:</strong> ${report.timestamp}</p>
      <p><strong>Image Preview:</strong></p>
      <img src="${report.imageUrl}" alt="Pollution Image" width="400" />
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Notification email sent successfully');
  } catch (error) {
    console.error('Error sending notification email:', error);
    // We don't want to fail the request if email fails, but we should log it
  }
};

// POST /report - Create a new pollution report
router.post('/report', async (req, res) => {
  try {
    // Validate request body
    const validatedData = reportSchema.parse(req.body);

    const newReport = new Report(validatedData);
    const savedReport = await newReport.save();

    // Trigger email notification asynchronously
    sendEmailNotification(savedReport);

    res.status(201).json(savedReport);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Error saving report:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /reports - Fetch all reports
router.get('/reports', async (req, res) => {
  try {
    const reports = await Report.find().sort({ timestamp: -1 });
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /encouragement - Fetch a random encouragement message
router.get('/encouragement', (req, res) => {
  const randomIndex = Math.floor(Math.random() * encouragementMessages.length);
  res.json({ message: encouragementMessages[randomIndex] });
});

module.exports = router;
