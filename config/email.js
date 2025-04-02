const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: 'j.mutesi@alustudent.com', 
    pass: 'xlvvaxqngljvuyhu'     
  }
});

module.exports = transporter;