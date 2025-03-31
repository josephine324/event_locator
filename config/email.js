const nodemailer = require('nodemailer');

// Replace with your email service credentials
const transporter = nodemailer.createTransport({
  service: 'gmail', // Or use 'smtp' with host/port for other providers
  auth: {
    user: 'j.mutesi@alustudent.com', // Your email address
    pass: 'xlvvaxqngljvuyhu'     // Gmail App Password (not regular password)
  }
});

module.exports = transporter;